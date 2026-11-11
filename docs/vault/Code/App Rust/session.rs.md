---
type: code
tags: [code, app, rust, jeux, alimentation, carte-graphique]
fichier: app/src-tauri/src/session.rs
lignes: 519
maj: 2026-11-11
---
# session.rs

Ce que l'app fait **le temps d'une partie**, puis défait : carte graphique performante pour les jeux, mode Performances élevées, vérifications (conseils). Repris du `.bat` GAME V1 de Sofiene. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Pendant la partie]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Créé au démarrage par [[lib.rs]] (`Session::new`), puis appelé par la **boucle de fond toutes les 4 s** : [[games.rs]] donne les processus et les exes de jeu en cours, `minecraft_exe` ajoute le Java de Minecraft, `tick` reçoit `playing` et renvoie l'état quand il change (événement `games:session`).
- Chaque option se coupe dans les paramètres (`Prefs` de [[background.rs]] : `game_gpu`, `game_power`, `game_checks`, **toutes activées par défaut**). Commandes : `session_state`, `session_set_prefs(gpu, power, checks)` (prise en compte au passage suivant, 4 s au plus).
- Interface : `SessionCard.tsx` (carte des paramètres) et ses vérifications affichées dans [[Games.tsx]] et la barre en jeu ([[Overlay.tsx]]).
- `dual_ccd_x3d` sert aussi au mode Compétitif du [[Packet Optimizer]] ([[netopt.rs]], [[apply.ps1]]).
- `undo_all` est appelée par la désinstallation ([[reset.rs]]).

## Ce que le fichier expose

- GUIDs des plans : `BALANCED` (Utilisation normale), `POWER_SAVER` (Économie d'énergie), `HIGH` (Performances élevées).
- `State { playing, power, gpuGames, checks, multiGpu, x3d }` (`multiGpu` = `None` tant que ce n'est pas vérifié) ; `Check { id, apps }` avec `id` = `battery`, `download`, `sync` ou `record`.
- `minecraft_exe(chemin)` : `Minecraft.Windows.exe` (Bedrock), ou `javaw.exe`/`java.exe` dont le chemin contient un dossier de launcher Minecraft : `\.minecraft\`, `\minecraft launcher\`, `microsoft.4297127d64ec6` (Store), `\.lunarclient\`, `badlion`, `feather`, `prismlauncher`, `modrinth`, `curseforge`, `multimc`, `tlauncher`, `atlauncher`, `gdlauncher`. Un autre programme Java n'est pas Minecraft.
- `dual_ccd_x3d(nom du processeur)` : `7900X3D`, `7950X3D`, `9900X3D`, `9950X3D`, `7945HX3D` (un seul des deux CCD a le cache 3D). Un 7800X3D n'en fait pas partie.
- `wants_gpu(chemin)` : un `.exe` dont le nom ne contient pas `unins`, `crash`, `report`, `setup`, `redist`, `vc_redist`, `dxsetup`.
- `parse_scheme(texte)` : premier GUID de la sortie de `powercfg /getactivescheme` (quelle que soit la langue de Windows).
- `checks(processus, sur batterie)` : listes d'applis repérées par leur exe :
  - téléchargement : qBittorrent, µTorrent, BitTorrent, Transmission, Deluge, Tixati, Internet Download Manager ;
  - synchronisation : OneDrive, Dropbox, Google Drive, MEGA, iCloud ;
  - enregistrement : OBS Studio (`obs64.exe`, `obs32.exe`), Streamlabs.
- `Session::new`, `state`, `tick`, `undo_all(data_dir)`.

## Fonctionnement détaillé

### Mode Performances élevées (`game_power`)
1. Une seule tentative par partie (`tried`). Rien si : Ryzen X3D à deux CCD, PC **sur batterie**, mode imposé par une stratégie (`HKLM\SOFTWARE\Policies\Microsoft\Power\PowerSettings\ActivePowerScheme` présent : PC d'entreprise ou d'école), ou mode actif autre qu'Utilisation normale ou Économie d'énergie (le joueur a déjà choisi Performances élevées, Ultimate ou un plan Rago).
2. Le mode d'avant et le mode mis sont **écrits dans `session.json` avant le changement** (si l'app est fermée pendant la partie, le lancement suivant rend le mode).
3. `powercfg /setactive` Performances élevées, puis vérification. Si le plan n'existe pas (PC en veille moderne, qui n'a qu'Utilisation normale), la note est effacée.
4. Fin de partie, option coupée, ou lancement suivant de l'app : le mode d'avant est remis **seulement si le mode actif est encore celui que Rago a mis** (un changement du joueur est respecté).

### Carte graphique performante (`game_gpu`)
- Pendant une partie, chaque nouvel exe de jeu (`wants_gpu`, regardé une fois) reçoit `GpuPreference=2;` dans `HKCU\Software\Microsoft\DirectX\UserGpuPreferences` (le choix « Performances élevées » de Paramètres > Affichage > Graphiques), **seulement** sur un PC à deux cartes ou plus et si l'exe n'a pas déjà un choix.
- Nombre de cartes : `Win32_VideoController` par PowerShell, en ne comptant que NVIDIA, AMD et Intel (`system::vendor_of`) ; vérifié une fois.
- Les exes écrits sont notés dans `session.json` (`gpu`) ; ils restent après la partie (l'effet vaut au lancement suivant du jeu).
- Option coupée : chaque choix écrit par Rago est supprimé **s'il vaut toujours `GpuPreference=2;`**.

### Vérifications (`game_checks`)
Pendant une partie seulement : `battery` si le PC est sur batterie (`GetSystemPowerStatus`), puis `download`, `sync`, `record` avec les applis trouvées. Des conseils : **rien n'est fermé**.

### Conseils au lancement du jeu (PR #91, 11/11, pas encore dans `staging`, jamais testé sur Windows)
- L'option `game_checks` commande aussi les [[Conseils au lancement du jeu]] ; le moteur est dans [[tips.rs]].
- `checks` repère en plus `wallpaper` (Wallpaper Engine : `wallpaper32.exe` et `wallpaper64.exe`, une seule appli) et Medal (`medal.exe`, dans `record`) ; le test `lists_background_apps_to_check` le vérifie (Medal, Wallpaper Engine sans doublon).
- `State` gagne `game` (clé du jeu à conseils : `tips::game_of` sur les **exes des jeux en cours**, même option coupée) et `tipsLeft` (ses réglages pas encore cochés « fait »). `Check.id` peut aussi valoir `wallpaper`, `refresh`, `gamedvr`, `cpu`, `ram` ; pour `refresh`, `apps` = fréquence actuelle puis la plus haute (Hz).
- `tick(playing, exes, procs, prefs, hogs)` : `hogs` = applis gourmandes mesurées par la boucle des jeux de [[lib.rs]] (`tips::Hogs`). Pendant une partie, option active, la liste = `checks` + écran et Game DVR (`tips::pc_checks`, relus tous les 15 tours, soit 1 min : `PC_EVERY`) + `hogs`. Sans partie ou option coupée : liste vide, écran et Game DVR oubliés.
- `Session` garde les réglages cochés (`tips::Done`, fichier `tips-done.json`) : `tips_done()`, `tips_mark(id, fait)` (renvoie la liste cochée et l'état, `tipsLeft` recalculé), `has_advice(prefs)` (partie en cours, option active, et un réglage pas coché ou un point à vérifier) pour le rappel de [[overlay.rs]].
- `file_of` devient `pub(crate)` (utilisé par [[tips.rs]]).

### `undo_all` (désinstallation)
Rend le mode d'alimentation (même règle) et retire les choix de carte graphique écrits par Rago.

## Données touchées

- Fichier `session.json` du dossier de données (`power` : mode d'avant et mode mis ; `gpu` : exes modifiés) ; supprimé quand il n'y a plus rien à défaire.
- Registre : `HKCU\Software\Microsoft\DirectX\UserGpuPreferences` (lecture et écriture), nom du processeur (`HKLM\HARDWARE\DESCRIPTION\System\CentralProcessor\0\ProcessorNameString`), stratégie d'alimentation (lecture).
- Plan d'alimentation actif (`powercfg.exe`).

## Erreurs et cas limites

- Hors Windows, rien n'est changé (fonctions vides), ce qui permet les tests.
- Un verrou empoisonné est repris tel quel (`PoisonError::into_inner`).
- Le mode Performances élevées n'est pas remis si le joueur a changé de mode pendant la partie : Rago ne remet que ce qu'il a lui-même mis.

## Liens avec le reste

- Appelé par [[lib.rs]] (boucle de fond, commandes) et [[reset.rs]] (`undo_all`) ; utilise [[background.rs]] (`Prefs`), [[reg.rs]], [[shell.rs]], [[system.rs]] (`vendor_of`).
- Utilisé par [[netopt.rs]] (`dual_ccd_x3d`). Données des jeux : [[games.rs]].
- Fonctionnalités : [[Pendant la partie]], [[Paramètres de l'app]], [[Arrière-plan et démarrage]] (marche tant que Rago est ouvert ou près de l'horloge).

## Tests

- `reads_the_active_scheme_in_any_language` : sorties de `powercfg` en français et en anglais ; « Accès refusé. » → rien.
- `recognizes_minecraft_and_skips_helpers` : Java de Lunar et du launcher officiel, Bedrock du Store reconnus ; un JDK seul non ; `cs2.exe` mérite la carte, pas un désinstalleur ni `CrashReportClient.exe`.
- `spots_dual_ccd_x3d_only` : 7950X3D et 9900X3D oui ; 7800X3D et un Intel non.
- `lists_background_apps_to_check` : batterie, qBittorrent, OBS → `battery`, `download`, `record`.
- `keeps_nothing_on_disk_once_undone` : une partie qui commence et finit ne laisse pas de `session.json`.
- `follows_the_tips_of_the_game_being_played` (PR #91) : VALORANT reconnu, réglages à faire, `has_advice` vrai ; cocher `valorant.highlight` en enlève un ; option coupée → `has_advice` faux ; fin de partie → plus de jeu.

## À savoir avant de modifier

- Toujours **noter avant de changer** (fichier écrit avant `powercfg`) : c'est ce qui permet de tout rendre après une fermeture brutale.
- Ne jamais forcer Performances élevées sur un Ryzen X3D à deux CCD (AMD demande Utilisation normale pour garder le jeu sur le cache 3D).
- Ne rien fermer : les vérifications restent des conseils (choix du `.bat` GAME V1).
