---
type: code
tags: [code, app, rust, jeux, bibliothèque]
fichier: app/src-tauri/src/games.rs
lignes: 1941
lignes: 1936
maj: 2026-11-11
---
# games.rs

La **bibliothèque de jeux** côté Rust : détection des jeux installés par chaque launcher, des launchers eux-mêmes, image officielle de chaque jeu, lancement sans droits d'administrateur, et suivi des jeux en cours. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Bibliothèque de jeux]] (Linear RAG-57).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Ajouts du 11/11 pour [[Couleurs et résolution]] (`running_dirs`, `local_dirs` ouverte au reste du code) : branche `claude/project-thread-7n0ikn`.

## Rôle et place dans l'ensemble

- Créée au démarrage dans [[lib.rs]] (`Library::new(data_dir)`), partagée (`Arc`) entre les commandes Tauri, la boucle de fond, la barre en jeu ([[overlay.rs]]), la session de jeu ([[session.rs]]), le nettoyage de la RAM (`memory.rs`) et le pont ([[bridge.rs]]).
- Interface : [[Games.tsx]] (page Jeux) appelle les commandes ci-dessous.
- **Boucle de fond** (dans le `setup` de [[lib.rs]]) : toutes les **4 s**, `process_paths()` puis `Library::poll` ; si la liste des jeux lancés change, événement `games:running` (liste des identifiants). La même boucle passe les exes des jeux à [[session.rs]] (événement `games:session`) et éteint le Mode jeu total de [[boost.rs]] après **5 tours sans jeu** (environ 20 s).

## Ce que le fichier expose

### Types
- `Game` (sérialisé `camelCase`) : `id` (`steam:730`, `epic:<AppName>`, `riot:valorant`, `bnet:<uid>`, `ubi:<id>`, `xbox:<famille>`, `roblox:player`/`roblox:store`, `mc:<launcher>`, `manual:<8 hex>`), `name`, `launcher` (`steam`, `epic`, `riot`, `battlenet`, `ubisoft`, `xbox`, `roblox`, `minecraft`, `manual`), `client` (nom du launcher Minecraft), `kind` (`minecraft`, `shooter` ou `other`), `installDir`, `lastPlayed` (ms), `running`. Champs internes : `launch` (`Url`, `Exe {path, args}`, `AppsFolder`, `None`) et `art` (sources d'image dans l'ordre d'essai).
- `Launcher` : `id`, `name`, `minecraft`, `running` (+ `exe` et `launch` internes).
- `Library` : l'objet partagé. Fichier `games.json` et dossier `art\` dans le dossier de données de l'app.

### Méthodes de `Library` (et commandes Tauri de [[lib.rs]])
| Méthode | Commande | Rôle |
|---|---|---|
| `list(refresh)` | `games_list(refresh)` | jeux détectés + ajoutés à la main − masqués ; triés par dernière partie puis par nom |
| `art(id)` | `game_art(id)` | image officielle en `data:` URL, copiée dans `art\` à la première demande |
| `launch(id)` | `game_launch(id)` | lance le jeu et note la dernière partie |
| `launchers(refresh)` | `launchers_list(refresh)` | launchers installés, avec ceux ouverts en ce moment |
| `launch_launcher(id)` | `launcher_launch(id)` | ouvre un launcher |
| `launcher_icon(id)` | `launcher_icon(id)` | icône de l'exe (PNG 128 px par `icon.rs`), gardée dans `art\launcher-<id>.png` |
| `preset_icons()` | `preset_icons` | logos des jeux des presets (variantes de `pri_game`) trouvés sur le PC |
| `add(exe)` | `game_add(path)` | ajoute un `.exe` choisi par le joueur |
| `remove(id)` | `game_remove(id)` | oublie un jeu ajouté, masque un jeu détecté (rien n'est désinstallé), efface son image |
| `unhide_all()` | `games_unhide` | réaffiche les jeux masqués |
| `poll(procs)` | (boucle de fond) | jeux lancés ; rend la liste quand elle change |
| `install_dirs()` | — | dossiers des jeux, jamais touchés par « Nettoyer » la RAM |
| `name_for(exe)` | — | nom du jeu dont le dossier contient cet exe (barre en jeu) |
| `playing()`, `game_exes(procs)` | — | un jeu de la bibliothèque tourne ; ses exes (pas ceux des launchers Minecraft) |
| `running_dirs()` | — | jeux lancés (d'après le dernier `poll`) et leur dossier en minuscules terminé par `\` : [[display.rs]] y reconnaît le jeu au premier plan |

Fonctions publiques testables hors Windows : `normalize`, `parse_vdf`/`Vdf`, `steam_libraries`, `steam_app`, `EpicItem`, `epic_images`, `yaml_value`, `publisher_id`, `xml_attr`, `gaming_root`, `detect`, `detect_launchers`, `launchers_seen`, `launcher_running`, `process_paths`.

## Fonctionnement détaillé

### Détection des jeux (`detect`, Windows)

Ordre : Steam, Epic, Riot, Battle.net, Ubisoft, Xbox, Roblox, Minecraft. Ensuite, un même jeu vu par deux launchers (même nom normalisé : lettres et chiffres en minuscules) n'est gardé qu'une fois, le premier trouvé (sauf les entrées Minecraft).

- **Steam** : dossier lu dans `HKCU\Software\Valve\Steam\SteamPath` (ou `HKLM\SOFTWARE\WOW6432Node\Valve\Steam\InstallPath`) ; bibliothèques dans `steamapps\libraryfolders.vdf` (format VDF lu par `parse_vdf`) ; chaque `appmanifest_*.acf` dont `StateFlags` a le bit **4** (entièrement installé). Outils exclus : identifiants `228980`, `250820`, `431960`, `1070560`, `1391110`, `1628350`, `1493710`, `2180100`, noms commençant par `proton`, `steam linux runtime`, `steamvr`, ou contenant `redistributable`, `dedicated server`, ` sdk`, `soundtrack`, `wallpaper engine`, `benchmark`. Lancement `steam://rungameid/<id>`. Images : cache local `appcache\librarycache` (`header.jpg`, `library_header.jpg`, `capsule_616x353.jpg`, `library_hero.jpg`, ancien et nouveau format), puis l'en-tête donné par l'API de la boutique, puis les deux CDN de Steam.
- **Epic** : `%ProgramData%\Epic\EpicGamesLauncher\Data\Manifests\*.item` (JSON). Jeu complet seulement (pas `bIsIncompleteInstall`, pas un DLC, catégorie `games`). Lancement `com.epicgames.launcher://apps/<namespace>%3A<itemId>%3A<appName>?action=launch&silent=true`. Image : `Catalog\catcache.bin` (JSON en base64), type préféré `DieselGameBox`, puis `OfferImageWide`, `DieselStoreFrontWide`, `Featured`, `DieselGameBoxTall`, `Thumbnail`, redimensionnée en 1280×720.
- **Riot** : client dans `%ProgramData%\Riot Games\RiotClientInstalls.json` (`rc_default` ou `rc_live`) ; jeux connus `valorant`, `league_of_legends`, `bacon` (Legends of Runeterra) ; dossier dans `Metadata\<produit>.live\<produit>.live.product_settings.yaml` (`product_install_full_path`). Lancement : `RiotClientServices.exe --launch-product=<produit> --launch-patchline=live`. Images : adresses fixes de l'Epic Games Store (relevées le 17/10/2026), puis la page du jeu sur l'Epic Games Store.
- **Battle.net** : entrées « Programmes et fonctionnalités » dont la commande de désinstallation contient `--uid=` et `battle.net` ; lancement `Battle.net.exe --exec="launch <code>"` avec 16 codes connus (`prometheus` → `Pro` pour Overwatch, `fenris` → `Fen`, `osi` → `OSI`, `wow` → `WoW`, `wow_classic` → `WoWC`, `hs_beta` → `WTCG`, `heroes` → `Hero`, `diablo3` → `D3`, `s2`, `s1`, `auks`, `odin`, `zeus`, `lazarus` → `LAZR`, `fore`, `viper` → `VIPR`).
- **Ubisoft** : `HKLM\SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs\<id>\InstallDir`, nom pris dans l'entrée `Uplay Install <id>` ; lancement `uplay://launch/<id>/0`.
- **Xbox** : fichier `.GamingRoot` à la racine de chaque disque `C:` à `Z:` (en-tête `RGBX`, chemins UTF-16) ; dans chaque dossier, `Content\MicrosoftGame.config` (`Identity Name` et `Publisher`, `Executable Id`, `ShellVisuals DefaultDisplayName`) ; famille du paquet = `<Name>_<publisher_id>` (SHA-256 de l'éditeur en UTF-16, 8 premiers octets en base 32 de Crockford, 13 caractères). Lancement `shell:AppsFolder\<famille>!<app>`. Images : logos carrés du jeu, ou la page Steam de même nom.
- **Roblox** : `Roblox\Versions\version-*\RobloxPlayerBeta.exe` le plus récent (dans `%LOCALAPPDATA%`, `Program Files (x86)` ou `Program Files`) ; dossier du jeu = `Versions` (pour suivre les mises à jour hebdomadaires) ; sinon l'app du Microsoft Store (`ROBLOXCORPORATION.ROBLOX_…!App`).
- **Minecraft** : chaque launcher Minecraft trouvé devient un jeu « Minecraft » (`mc:official`, `mc:lunar`, `mc:badlion`, `mc:feather`, `mc:prism`, `mc:modrinth`, `mc:curseforge`) avec le nom du launcher en sous-titre et l'image de minecraft.net ; plus le launcher du Microsoft Store (`mc:store`, paquet `Microsoft.4297127D64EC6`).
- **Ajoutés à la main** : identifiant `manual:` + 4 premiers octets du SHA-256 du chemin en minuscules ; nom = nom de l'exe ; image cherchée sur la boutique Steam par le nom.
- Genre (`kind`) : `minecraft` si le nom contient « minecraft », `shooter` si le nom contient un des 24 jeux de tir connus (`valorant`, `counterstrike`, `fortnite`, `apexlegends`, `callofduty`, `rainbowsix`, `thefinals`, `marvelrivals`…), sinon `other`.

### Comptes Windows multiples

Rago tourne en administrateur, parfois élevé avec un autre compte que celui du joueur. `local_dirs()` (`pub(crate)`, aussi utilisée par [[display.rs]] pour les fichiers de réglages de Valorant et Fortnite) ajoute donc le `AppData\Local` de chaque compte de `HKLM\…\ProfileList` (SID `S-1-5-21-…`), et `uninstall_entries()` lit `Uninstall` dans `HKLM`, `HKLM\…\WOW6432Node`, `HKCU` et `HKU\<SID>` de chaque compte ouvert.

### Launchers (`detect_launchers`)

15 définitions (`LAUNCHER_DEFS`) : Steam, Epic Games, Riot Client, Battle.net, EA app, Ubisoft Connect, GOG Galaxy, Rockstar Games, Minecraft Launcher, Lunar Client, Badlion Client, Feather Client, Prism Launcher, Modrinth App, CurseForge (les 7 derniers sont des launchers Minecraft). Recherche dans l'ordre : chemin propre au launcher (registre de Steam, fichier de Riot, registre d'Ubisoft et de GOG), chemins habituels (dans chaque compte pour `%LOCALAPPDATA%`), « Programmes et fonctionnalités » (nom, puis exe dans le dossier ou exe de l'icône), puis l'exe **vu ouvert une fois** (`remembered`). S'y ajoutent les apps du Microsoft Store : Xbox (`Microsoft.GamingApp`) et le launcher Minecraft du Store s'il n'est pas installé autrement. Un launcher est « ouvert » si un processus tourne depuis le dossier même de son exe (pas ses sous-dossiers, où Steam range les jeux).

`remember_launchers` : un launcher Minecraft ouvert que la détection n'a pas trouvé (installé ailleurs) est retenu dans `games.json` (`launchers`) et les caches sont vidés pour qu'il apparaisse tout de suite.

### Lancement sans droits d'administrateur

`start(launch)` → `launch::unelevated(program, args, cwd)`. Si l'app est élevée (`shell::is_elevated()`), le jeu est lancé avec le **jeton de l'Explorateur** : `GetShellWindow` → processus de l'Explorateur → `OpenProcessToken` → `DuplicateTokenEx` (jeton primaire) → `CreateProcessWithTokenW`. Une adresse (`steam://`, `uplay://`…) et une app du Store passent par `explorer.exe`. Sans Explorateur ou si le jeton est refusé : lancement direct. `command_line` met les arguments entre guillemets selon les règles de Windows. Un exe disparu rend `not_found`.

### Images (`art`)

1. Fichier `art\<id nettoyé>.jpg|png|webp` déjà là → `data:` URL.
2. Fichier `art\<id>.none` de moins de **24 h** → rien (pas de nouvelle tentative avant demain).
3. Sinon, chaque source dans l'ordre : fichier local (≤ 6 Mio, `MAX_ART`), adresse HTTPS, en-tête de la boutique Steam (`/api/appdetails`), recherche Steam par nom (`/api/storesearch/`, nom identique ou suivi seulement d'un numéro, ex. « Overwatch 2 »), page Epic (`store-content-ipv4.ak.epicgames.com`). Seuls les vrais JPEG, PNG ou WebP (octets de tête) sont gardés.
4. Rien trouvé → `art\<id>.none`.
Réseau : `ureq` avec TLS de Windows (`NativeTls` ; le TLS par défaut de ureq n'est pas compilé et paniquerait, ce qui ferme l'app), délai global **12 s**, agent `RagoOptimizer/<version>`, JSON limité à 2 Mio.

### Logos des presets (`preset_icons`)

16 clés (`minecraft`, `fortnite`, `valorant`, `cs2`, `apex`, `gta`, `pubg`, `roblox`, `r6`, `overwatch`, `rivals`, `finals`, `tarkov`, `rl`, `lol`, `bedrock`) avec leurs exes connus (`PRESET_EXES`). **PR #91** (11/11, pas encore dans `staging`) : `preset_key(nom d'exe)` donne la clé d'un exe (« valorant.exe » → `valorant`) pour les [[Conseils au lancement du jeu]] ([[tips.rs]]) ; `preset_keys()` (tests) les liste toutes. Les icônes déjà dans `art\preset-<clé>.png` sont rendues ; les manquantes sont cherchées **une fois par lancement de l'app** dans les dossiers des jeux (6 niveaux, 40 000 entrées au plus par recherche).

### Jeux en cours (`poll`)

Un jeu tourne si un processus a son exe dans le dossier du jeu (comparaison en minuscules, dossier terminé par `\`, dossiers de moins de 5 caractères ignorés). Quand la liste change, la dernière partie (`played`) des jeux qui démarrent **ou s'arrêtent** est notée et `games.json` est réécrit. `process_paths()` : `CreateToolhelp32Snapshot` + `QueryFullProcessImageNameW` (processus 0 à 4 du système ignorés).

## Données touchées

- `games.json` (dossier de données de l'app) : `manual` (jeux ajoutés), `hidden` (masqués), `played` (id → ms), `launchers` (launchers Minecraft vus ouverts). Écrit par fichier temporaire `games.json.tmp` puis renommage.
- `art\` : images des jeux, `launcher-<id>.png`, `preset-<clé>.png`, marqueurs `.none`.
- Lecture seule : registre (Steam, Ubisoft, GOG, Uninstall, ProfileList, paquets du Store), fichiers des launchers.
- Réseau : boutiques Steam et Epic, CDN, minecraft.net (images seulement, sans clé).
- Événement émis par la boucle de [[lib.rs]] : `games:running`.

## Erreurs et cas limites

- `launch` : `Unknown game`, `not_found` (exe disparu), `Nothing to launch`. `add` : `Not a program` (pas un `.exe` existant). `launch_launcher` : `Unknown launcher`.
- Hors Windows, `detect` et `detect_launchers` rendent des listes vides.
- Une image introuvable (ou pas de réseau) n'est pas redemandée avant 24 h : supprimer `art\<id>.none` pour forcer un nouvel essai.

## Liens avec le reste

- Commandes et boucle : [[lib.rs]] ; interface : [[Games.tsx]] ; icônes d'exe : `icon.rs` ; registre : `reg.rs` ; élévation : `shell.rs`.
- Utilisée par [[overlay.rs]] (`name_for`), [[session.rs]] (`game_exes`, `playing`), [[boost.rs]] (arrêt automatique), [[bridge.rs]] (`games`, `game_launch`), `memory.rs` (`install_dirs`), [[display.rs]] (`running_dirs`, `local_dirs`).
- Fonctionnalités : [[Bibliothèque de jeux]], [[Pendant la partie]], [[Presets]].

## Tests

11 tests : `reads_steam_libraries_and_manifests`, `reads_epic_manifest_and_catalog`, `reads_riot_xbox_and_uninstall_values`, `finds_the_current_roblox_version`, `sorts_games_by_kind`, `quotes_command_lines`, `images_download_over_https_without_crashing` (vérifie le TLS natif), `notes_running_games_and_last_played`, `launchers_are_recognized`, `preset_games_are_found_in_their_folder`, `minecraft_launchers_are_found_open_and_in_other_accounts`.

## À savoir avant de modifier

- **Jamais lancer un jeu en administrateur** : toujours passer par `launch::unelevated`.
- Aucune image n'est livrée avec l'app (droits d'auteur) : seulement les images officielles déjà sur le PC ou sur les boutiques officielles.
- L'identifiant `mc:official` garde le nom d'avant la 1.2.0 (`mc_key`) pour ne pas perdre la dernière partie des joueurs.
- Ne pas compiler `ureq` avec `rustls` : l'app est en `panic = "abort"` et se fermerait.
