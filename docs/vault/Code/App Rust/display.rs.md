---
type: code
tags: [code, app, rust, couleurs, résolution]
fichier: app/src-tauri/src/display.rs
lignes: 1560
maj: 2026-11-11
---
# display.rs

Les **couleurs et la résolution par jeu** côté Rust : saturation (Digital Vibrance NVIDIA, saturation AMD), luminosité, contraste et gamma posés quand le jeu est au premier plan, résolution étirée posée le temps de la partie, et résolution écrite dans les fichiers de réglages de Valorant, Fortnite et CS2. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Couleurs et résolution]] (Linear RAG-95).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 11/11 : PR #93 fusionnée par la PR #92). **Jamais testé sur Windows** : les appels aux pilotes et à Windows sont seulement compilés (`cargo check` pour Windows), les tests tournent sous Linux.

## Rôle et place dans l'ensemble
- Créé dans le `setup` de [[lib.rs]] : `Display::new(data_dir)` remet tout de suite ce qu'un plantage a laissé, puis `display.spawn(…)` lance le fil qui regarde le jeu au premier plan (il émet `display:state`). Géré par `app.manage` (`Arc<display::Display>`).
- Appelé par le **fil des jeux** de [[lib.rs]] toutes les 4 s (`tick(library.running_dirs(), minecraft)`), par la commande `game_launch` (`prepare` avant le lancement, `cancel_prepare` s'il échoue), par les 5 commandes `display_*`, par `RunEvent::Exit` (`shutdown`) et par [[reset.rs]] à la désinstallation (`undo_all`).
- Jeux lancés et leur dossier : [[games.rs]] (`Library::running_dirs`) ; Minecraft Java reconnu à son exe (`session::minecraft_exe`, [[session.rs]]) ; `AppData\Local` de chaque compte du PC : `games::local_dirs` ; dossier de Steam : [[reg.rs]].
- Interface : [[Display.tsx]] (la page), [[Games.tsx]] (puce sur la fiche du jeu) ; réglages des pros : [[pros.json]].
- Historique : créé le 11/11/2026 à la demande de Sofiene (« custom saturation » et « custom resolution »), sur le modèle de VibranceGUI.

## Ce que le fichier expose
- Constantes : `VIBRANCE_WINDOWS` = 50 (niveau de Windows), `MINECRAFT` = `"mc:java"`. Internes : `LAUNCH_GRACE` 150 s, `PREVIEW_MAX` 8 s, `WATCH_EVERY` 250 ms.
- `Colors` (`camelCase`) : `vibrance` 50 à 100 (% du panneau NVIDIA), `brightness` et `contrast` −30 à +30, `gamma` × 100 de 70 à 150 ; `clamped()` (bornes de l'interface) ; `needs_ramp()` (luminosité, contraste ou gamma changés).
- `Resolution` : `width`, `height`, `stretch` (étirée, sinon bandes noires), `gameFile` (aussi écrite dans le fichier du jeu).
- `Profile` : `colors?`, `resolution?`, `pro?` (id du pro importé, pour l'affichage). Un profil sans rien est retiré ; un pro importé qui joue avec les couleurs de Windows et la résolution native garde son profil.
- `State` (événement `display:state`) : `colors` (jeu dont les couleurs sont posées, `"preview"` pendant un aperçu), `resolution` (jeu dont la résolution est posée), `error`.
- `GameFile` (`Valorant`, `Fortnite`, `Cs2`) : `of(id)` (`riot:valorant`, `epic:fortnite` sans tenir compte de la casse, `steam:730`), `values(r)` (clés et valeurs à écrire).
- Fonctions pures, testées sous Linux : `cs2_aspect`, `nvidia_level`, `amd_value`, `ramp`, `patch_ini`, `patch_kv`, `patch_file`, `owner`, `profile_key`, `unique_modes`.
- `Display` : `new`, `profiles`, `state`, `set_profile(id, profile?)`, `preview(colors?)`, `prepare(id)`, `cancel_prepare(id)`, `tick(running, minecraft)`, `spawn(emit)`, `shutdown()`.
- `undo_all(data_dir)` (désinstallation) ; `info()` → `Info { vibrance: "nvidia" | "amd" | null, monitor: Monitor { device, name, width, height, hz, modes } }` (écran principal, ses résolutions de la plus grande à la plus petite, 640×480 au moins).
- Commandes Tauri (dans [[lib.rs]]) : `display_info`, `display_profiles`, `display_state`, `display_set_profile(id, profile?)`, `display_preview(colors?)`. `display_set_profile` refuse `premium:no_license` quand le profil porte un `pro` **nouveau** et que la licence n'est pas active (décision de Sofiene du 11/11 : import des pros en Premium, réglage à la main gratuit).

## Fonctionnement détaillé

### Profils (`set_profile`)
- Clé : l'id du jeu dans la bibliothèque ; tous les launchers de Minecraft Java partagent `mc:java` (`profile_key`), Minecraft Bedrock garde `mc:bedrock`.
- Valeurs bornées (`clamped`) ; résolution ignorée hors de 640×480 à 16384×16384. `display.json` réécrit (effacé quand il n'y a plus rien).
- Jeu fermé et résolution changée : écrite dans le fichier du jeu si `gameFile`, sinon (résolution retirée ou option décochée) valeurs d'avant remises.
- En pleine partie : une résolution changée ou retirée est rendue et la nouvelle posée tout de suite ; des couleurs changées pendant qu'elles sont posées sont reposées.

### Couleurs (fil lancé par `spawn`)
- Le fil dort (réveil toutes les 5 s ou à la demande) tant qu'aucun jeu lancé n'a de couleurs, sans aperçu et sans rien de posé. Sinon il regarde **toutes les 250 ms** la fenêtre au premier plan (`foreground` : exe et écran de la fenêtre ; jamais la fenêtre de Rago).
- Jeu au premier plan (`owner` : exe dans le dossier d'un jeu lancé, ou `javaw.exe`/`java.exe` pour Minecraft Java) avec des couleurs : elles sont posées sur **l'écran de sa fenêtre**. Jeu quitté (Alt+Tab, fin de partie) ou passé sur un autre écran : les couleurs d'avant sont remises. C'est le fonctionnement de VibranceGUI.
- **Saturation** (`vibrance` différent de 50) : `vibrance_get` essaie NVIDIA puis AMD. NVIDIA : `nvidia_level` (niveaux 0 à 63 du pilote, table de VibranceGUI : 51 % = 1, 52 % = 3, 75 % = 32, 100 % = 63). AMD : `amd_value` (valeur par défaut du pilote à 50 %, son maximum à 100 % ; 100 à 200 en général). Ni NVIDIA ni AMD derrière l'écran : rien, sans erreur (la page le dit).
- **Luminosité, contraste, gamma** : rampe gamma de Windows (`GetDeviceGammaRamp`, `SetDeviceGammaRamp`, 3 × 256 valeurs), `v = (x^(1/g) − 0,5) × (1 + contraste/100) + 0,5 + luminosité/200`, bornée de 0 à 1. Toutes les cartes.
- **Aperçu** (`preview`) : les couleurs sur l'écran principal, à la place du jeu ; fini par l'interface (`null`) ou tout seul après 8 s.

### Résolution
- Posée sur **l'écran principal**, une à la fois : la première partie lancée qui en a une la garde jusqu'à sa fin.
- `prepare` (lancement depuis Rago) : fichier du jeu écrit (jeu fermé, `gameFile`), puis résolution posée tout de suite ; le jeu a **150 s** pour apparaître, sinon elle est rendue. `cancel_prepare` la rend si le lancement échoue.
- `tick` (toutes les 4 s) : pose la résolution d'un jeu vu lancé (aussi lancé hors de Rago), la rend à la fin de la partie, et réécrit la résolution dans le fichier du jeu qui vient de se fermer (le jeu réécrit le sien en quittant).
- `mode_set` : fréquence la plus haute que l'écran propose pour cette résolution (celle d'aujourd'hui si possible) ; échelle demandée au pilote (`DMDFO_STRETCH` étirée, `DMDFO_CENTER` bandes noires) ; essai `CDS_TEST`, puis sans l'échelle si le pilote la refuse ; enfin `CDS_FULLSCREEN` : changement **temporaire**, jamais écrit dans le registre (Windows rend le mode tout seul si l'app se ferme). Une résolution que l'écran ne propose pas est refusée.
- Refusée : erreur `mode`, et pas de nouvel essai pour ce jeu avant sa partie suivante (`res_refused`).
- `mode_reset` : `ChangeDisplaySettingsExW` sans mode, Windows reprend celui du registre.

### Fichiers des jeux
| Jeu | Fichier | Clés écrites (seulement si elles sont déjà là) |
|---|---|---|
| Valorant | `GameUserSettings.ini` de chaque compte Riot : `%LOCALAPPDATA%\VALORANT\Saved\Config\<compte>\Windows\`, section `[/Script/ShooterGame.ShooterGameUserSettings]` | `ResolutionSizeX/Y`, `LastUserConfirmedResolutionSizeX/Y`, `FullscreenMode`, `LastConfirmedFullscreenMode`, `PreferredFullscreenMode` (0 = plein écran), `bShouldLetterbox`, `bLastConfirmedShouldLetterbox` (`False` = étirée, `True` = bandes noires) |
| Fortnite | `%LOCALAPPDATA%\FortniteGame\Saved\Config\WindowsClient\GameUserSettings.ini`, section `[/Script/FortniteGame.FortGameUserSettings]` | `ResolutionSizeX/Y`, `LastUserConfirmedResolutionSizeX/Y`, `DesiredScreenWidth/Height`, `LastUserConfirmedDesiredScreenWidth/Height`, les trois `…FullscreenMode` à 0 |
| CS2 | `cs2_video.txt` de chaque compte Steam : `<Steam>\userdata\<id>\730\local\cfg\` (Steam trouvé par `HKCU\Software\Valve\Steam` `SteamPath` et `HKLM\SOFTWARE\WOW6432Node\Valve\Steam` `InstallPath`) | `setting.defaultres`, `setting.defaultresheight`, `setting.aspectratiomode` (0 = 4:3 et 5:4, 1 = 16:9, 2 = 16:10 ; `cs2_aspect`), `setting.fullscreen` à 1 |

- `%LOCALAPPDATA%` de **chaque compte** du PC : Rago tourne en administrateur, parfois élevé avec un autre compte que celui du joueur.
- `patch_ini` et `patch_kv` (format KeyValues de Valve) ne changent que les clés **déjà présentes** (sans tenir compte de la casse) et gardent tout le reste tel quel (ordre, autres sections, fins de ligne) : aucune clé ajoutée, un fichier d'une autre version du jeu reste lisible.
- Valeurs d'avant Rago gardées **une fois** par fichier dans `display.json` (`originals`), jamais remplacées par celles de Rago ; remises quand la résolution est retirée (`put_back_game_file`) et à la désinstallation.
- Jamais pendant que le jeu tourne. Fichier en lecture seule : pas touché (`file:read_only`) ; aucun fichier trouvé : `file:missing` ; écriture refusée : `file:write`.
- Partage avec `gamecfg.rs` (presets graphiques par jeu, RAG-92, autre fil, convenu le 11/11) : ce module écrit seulement la résolution et le mode d'affichage, `gamecfg.rs` seulement les réglages graphiques. Celui des deux qui est fusionné en second peut mettre en commun les lecteurs de `.ini`.

### Remise comme avant
- Tout changement de pilote, de rampe ou de mode est noté dans `display-restore.json` **avant** d'être fait. `undo` remet tout ; ce que le pilote refuse (pas encore prêt juste après le démarrage de Windows) reste noté pour la fois suivante.
- Démarrage (`Display::new`) : remet ce qu'un plantage a laissé.
- Fermeture de l'app (`RunEvent::Exit`, `shutdown`) : couleurs et résolution rendues, plus rien n'est posé ensuite (`closed`). Les fichiers des jeux gardent la résolution choisie (le profil reste).
- Désinstallation (`undo_all`, appelé par [[reset.rs]]) : couleurs, rampes, résolution, valeurs d'avant dans les fichiers des jeux ; profils effacés.

### Erreurs (`State.error`)
`vibrance` (le pilote refuse la saturation), `ramp` (Windows refuse la rampe), `mode` (l'écran refuse la résolution), `file:read_only`, `file:missing`, `file:write`. Trois familles : couleurs (`vibrance`, `ramp`), `mode`, fichiers (`file:*`). Un essai réussi efface seulement la dernière erreur **de sa famille** (`State::outcome`) : une saturation réussie n'efface pas une erreur de fichier.

## Données touchées
- `<data>\display.json` : profils par jeu et valeurs d'avant des fichiers des jeux. `<data>\display-restore.json` : niveaux de couleur, rampes et écrans à remettre.
- Pilotes : `nvapi64.dll` (NVAPI par `nvapi_QueryInterface` : initialisation, écran NVIDIA associé, `GetDVCInfo`, `SetDVCLevel`) et `atiadlxx.dll` (ADL : `ADL_Display_Color_Get`/`Set`, saturation), chargées **seulement depuis `System32`** (`LoadLibraryExW` avec `LOAD_LIBRARY_SEARCH_SYSTEM32`, jamais une DLL du dossier courant).
- Rampe gamma des écrans touchés ; mode d'affichage de l'écran principal (temporaire) ; fichiers de réglages de Valorant, Fortnite et CS2.
- Lus : fenêtre au premier plan et son processus, registre de Steam ([[reg.rs]]), liste des écrans (`EnumDisplayDevicesW`, `EnumDisplaySettingsW`).
- Événement `display:state` (émis par le fil de regard, le fil des jeux, `game_launch` et `display_set_profile`).

## Erreurs et cas limites
- Hors Windows, le module `win` est une coquille vide (tests sous Linux).
- Carte Intel, ou écran de portable relié à la puce Intel : pas de saturation ; luminosité, contraste et gamma marchent.
- HDR : Windows peut ignorer la rampe gamma et la saturation. À VÉRIFIER sur Windows ([[Questions ouvertes]]).
- Étirée : encore des bandes noires si le panneau NVIDIA ou AMD ne met pas l'échelle par le GPU (aide dans la page).
- Rago fermé (ni ouvert ni près de l'horloge) : rien n'est posé ([[Arrière-plan et démarrage]]).

## Liens avec le reste
- Appelle [[games.rs]] (`local_dirs`), [[session.rs]] (`minecraft_exe`), [[reg.rs]] ; appelé par [[lib.rs]] et [[reset.rs]].
- Interface : [[Display.tsx]], [[Games.tsx]], [[api.ts]] ; données : [[pros.json]] ; fonctionnalité : [[Couleurs et résolution]].

## Tests
11 tests dans le fichier :
- `maps_vibrance_like_vibrancegui` : 50 % = 0, 51 % = 1, 52 % = 3, 56 % = 8, 75 % = 32, 100 % = 63 ; AMD 50 % = 100, 75 % = 150, 100 % = 200.
- `a_success_clears_only_its_own_error` : une erreur de saturation effacée par une saturation réussie, pas par un fichier écrit.
- `windows_ramp_is_identity` : couleurs de Windows = rampe neutre ; plus clair au milieu, bords inchangés.
- `clamps_to_safe_values` ; `patches_only_existing_resolution_keys_of_valorant` (clés présentes seulement, `\r\n` gardés, autres sections intactes, valeurs d'avant, rien à refaire la 2e fois) ; `patches_cs2_video_file` (et `cs2_aspect`).
- `knows_which_games_have_a_settings_file`, `finds_the_game_in_front`, `keeps_profiles_and_cleans_up`, `sets_nothing_once_the_app_closes`, `sorts_modes_biggest_first`.

## À savoir avant de modifier
- Toute écriture dans les pilotes, la rampe ou le mode d'affichage passe par `display-restore.json` **avant** le changement : sinon un plantage laisse le joueur avec des couleurs ou une résolution qu'il ne sait pas remettre.
- Ne jamais écrire le fichier d'un jeu pendant qu'il tourne, ni ajouter une clé qui n'y est pas.
- Ne jamais charger une DLL de pilote ailleurs que dans `System32` (l'app est administrateur).
- Les niveaux NVIDIA suivent ceux de VibranceGUI : les pourcentages affichés par Rago sont ceux du panneau NVIDIA.
- Nouvelle fonction Windows : la feature `windows-sys` dans [[Cargo.toml]] (`Win32_UI_ColorSystem` pour la rampe, `Win32_System_Memory` pour la mémoire demandée par ADL).
