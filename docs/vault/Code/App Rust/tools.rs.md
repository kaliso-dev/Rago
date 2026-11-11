---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/tools.rs
lignes: 997
maj: 2026-11-11
---
# tools.rs

Page **Outils** : nettoyage des fichiers inutiles, désinstallation des applis préinstallées ou sponsorisées, pilotes et fabricant du PC, programmes lancés avec Windows, mode d'alimentation, cache DNS et raccourcis vers les réglages de Windows. Natif, **hors catalogue** : le nettoyage supprime pour de bon et ne s'annule pas. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Page Outils]].

Statut : nettoyage, applis et pilotes CONFIRMÉS (code de `staging`, 10/11). La zone `launchers`, les applis au démarrage, les modes d'alimentation, le cache DNS et les raccourcis viennent de la **PR #90** (11/11, ouverte vers `staging`, pas encore fusionnée) : CONFIRMÉS dans le code de la branche, **jamais testés sur Windows**. Créé le 21/10. Désinstallation des applis gratuite depuis la 1.2.2 (commentaire de [[lib.rs]]).

## Rôle et place dans l'ensemble
Appelé par les commandes `tools_scan`, `tools_clean`, `tools_apps`, `tools_remove_apps`, `tools_drivers`, et depuis la PR #90 `tools_startup`, `tools_set_startup`, `tools_power_plans`, `tools_set_power_plan`, `tools_flush_dns`, `tools_open` de [[lib.rs]] (toutes dans `spawn_blocking`, sauf `tools_open`, qui lance le programme sans l'attendre). `tools_windows_update` (ouvrir les mises à jour facultatives de Windows) est dans [[lib.rs]] seulement. L'âge du pilote graphique sert aussi à l'[[Analyse du PC]]. PowerShell et les programmes cachés passent par [[shell.rs]] ; `steam_root` lit le registre par [[reg.rs]] ; le GUID d'un mode d'alimentation est lu par `parse_scheme` de [[session.rs]].

## Ce que le fichier expose

### Nettoyage
| Élément | Description |
|---|---|
| `AREAS` | `temp`, `windows_temp`, `update`, `crash`, `browsers`, `discord`, `launchers`, `shaders`, `recycle` (ordre affiché) |
| `struct Area {id, bytes, files}` | taille d'une zone |
| `struct Cleaned {bytes, files, skipped}` | `skipped` : fichiers en cours d'utilisation, laissés en place |
| `enum Target { Dir, File }` | contenu d'un dossier (pas le dossier) ou un fichier |
| `targets(id)` | chemins d'une zone (voir plus bas) |
| `measure(targets)`, `clean(targets)` | mesurer, supprimer |
| `scan() -> Vec<Area>` | toutes les zones |
| `clean_areas(ids) -> Cleaned` | vide les zones demandées (seulement des id de `AREAS`) |

| Zone | Ce qui est vidé |
|---|---|
| `temp` | `%TEMP%`, **seulement si le dossier s'appelle Temp ou Tmp** et a au moins 3 composants (`temp_like`) : une variable `TEMP` mal réglée (« C:\ ») ne vide jamais un disque |
| `windows_temp` | `%SystemRoot%\Temp` |
| `update` | `%SystemRoot%\SoftwareDistribution\Download` |
| `crash` | `%LOCALAPPDATA%\CrashDumps`, `…\Microsoft\Windows\WER\ReportArchive` et `ReportQueue` (dans `%LOCALAPPDATA%` et `%ProgramData%`), `%SystemRoot%\Minidump`, fichier `%SystemRoot%\MEMORY.DMP` |
| `browsers` | pour Chrome, Edge, Brave, Vivaldi : `Cache`, `Code Cache`, `GPUCache` de chaque profil (dossier qui contient `Preferences`) + `ShaderCache`, `GrShaderCache` ; Opera et Opera GX : `Cache` ; Firefox : `cache2` de chaque profil. **Jamais** l'historique, les mots de passe ni les cookies |
| `discord` | `Cache`, `Code Cache`, `GPUCache` de `discord`, `discordptb`, `discordcanary` (`%APPDATA%`) |
| `launchers` (PR #90) | pages web des launchers (boutique, actus, pubs), recréées au besoin : `%LOCALAPPDATA%\Steam\htmlcache`, chaque dossier dont le nom commence par `webcache` dans `%LOCALAPPDATA%\EpicGamesLauncher\Saved` (`webcache`, `webcache_4147`… selon la version d'Epic), `appcache\httpcache` du dossier d'installation de Steam. **Jamais** les jeux, `librarycache` (images de la bibliothèque Steam) ni les réglages |
| `shaders` | `%LOCALAPPDATA%\NVIDIA\DXCache`, `NVIDIA\GLCache`, `D3DSCache`, `AMD\DxCache`, `AMD\DxcCache`, `AMD\GLCache`, `AMD\VkCache`, `%ProgramData%\NVIDIA Corporation\NV_Cache` |
| `recycle` | corbeille de tous les disques : `SHQueryRecycleBinW` / `SHEmptyRecycleBinW` (sans confirmation, sans son ni barre) ; déjà vide (`E_UNEXPECTED`) n'est pas une erreur |

`steam_root()` (Windows seulement) : `SteamPath` de `HKCU\Software\Valve\Steam`, sinon `InstallPath` de `HKLM\SOFTWARE\WOW6432Node\Valve\Steam`, barres `/` remplacées par `\`, gardé **seulement s'il est absolu** (même lecture que la bibliothèque de jeux, [[games.rs]]).

**Jamais** Prefetch, les journaux de Windows ni les dossiers de Minecraft : le vérificateur de screenshare de Ranked Bedwars les regarde, et les vider passerait pour un effacement de traces ([[RBW Mod]]).

### Applis
| Élément | Description |
|---|---|
| `BLOAT` | **38** paquets `(nom du paquet, nom anglais, nom français)` : actualités, météo, Bing, astuces, Solitaire, Office, Hub de commentaires, Cartes, Contacts, Films et TV, Skype, To Do, Power Automate, Clipchamp, Cortana, Teams personnel (2 noms), Outlook (nouveau), Courrier et Calendrier, Réalité mixte, Visionneuse 3D, OneNote pour Windows 10, Enregistreur vocal, Lien avec le téléphone, Copilot, Dev Home, Family Safety, Candy Crush (2), Spotify, Disney+, TikTok, Facebook, Instagram, Netflix, Prime Video, LinkedIn |
| `struct App {id, name: Names {en, fr}}` | une appli trouvée |
| `bloat_in(installés)` | paquets de `BLOAT` parmi les installés (sans tenir compte de la casse) |
| `apps()` | `Get-AppxPackage \| Select-Object -ExpandProperty Name`, puis `bloat_in` |
| `remove_apps(ids)` | seulement des noms de `BLOAT` : `Get-AppxPackage -Name <n> \| Remove-AppxPackage` pour le compte Windows courant ; renvoie celles encore là |

**Jamais** dans la liste : le Store, Xbox et la Game Bar (Game Pass, captures), Photos, la calculatrice, le bloc-notes, Paint, l'outil Capture, la caméra. Une appli retirée se réinstalle depuis le Microsoft Store.

### Pilotes
| Élément | Description |
|---|---|
| `struct Driver {kind, name, version, date, provider}` | `kind` ∈ `gpu`, `network`, `audio` ; `date` au format AAAA-MM-JJ |
| `struct Drivers {drivers, maker, model}` | fabricant et modèle à chercher pour les pilotes de chipset et de son |
| `parse_drivers(json)` | lecture testée hors Windows |
| `drivers()` | script PowerShell : `Win32_PnPSignedDriver` des classes `DISPLAY`, `NET`, `MEDIA` ; `Win32_BaseBoard` et `Win32_ComputerSystem` |

`parse_drivers` retire les cartes virtuelles et les pilotes génériques (nom contenant virtual, vpn, tap, npcap, loopback, wan miniport, hyper-v, vmware, virtualbox, bluetooth, streaming, broadcast, remote ndis, kernel debug, wi-fi direct, ou fournisseur « Microsoft »), les doublons, et trie GPU puis réseau puis son. Fabricant : celui du PC si c'est un portable de marque (Lenovo, HP, Dell, Acer, Asus, MSI, Gigabyte, Razer, Samsung, Huawei, Microsoft), sinon celui de la carte mère ; « To Be Filled By O.E.M. », « System manufacturer », « Default string » ne comptent pas.

### Applis au démarrage (PR #90)
| Élément | Description |
|---|---|
| `struct StartupApp {id, name, publisher, command, scope, enabled, keep}` | `id` = « source\|nom » (seul moyen de désigner une entrée) ; `scope` = `user` (ce compte) ou `machine` (tous les comptes) ; `keep` = ne se coupe pas depuis Rago |
| `STARTUP_SOURCES` | où chaque source garde son état, comme le Gestionnaire des tâches (`…\Explorer\StartupApproved\…`) : `hkcu` → `HKCU:\…\StartupApproved\Run`, `hklm` → `HKLM:\…\StartupApproved\Run`, `hklm32` → `HKLM:\…\StartupApproved\Run32`, `startup` → `HKCU:\…\StartupApproved\StartupFolder`, `commonstartup` → `HKLM:\…\StartupApproved\StartupFolder` |
| `STARTUP_LIST` | script PowerShell : valeurs des clés `Run` de `HKCU`, de `HKLM` et de `HKLM\SOFTWARE\WOW6432Node` ; fichiers des dossiers Démarrage du compte et de tous les comptes (sauf `desktop.ini` ; cible des raccourcis `.lnk` par `WScript.Shell`) ; pour chacun, description et éditeur de l'exe (`VersionInfo`) et premier octet de l'état `StartupApproved` |
| `STARTUP_KEEP` | 37 mots qui gardent une entrée : sécurité de Windows et antivirus (securityhealth, windows security, windowsdefender, windows defender, msascui, avast, avgui, avira, bitdefender, kaspersky, norton, mcafee, eset, malwarebytes, sophos, trend micro, f-secure, webroot), son (rtkaud, rthdvcpl, ravcpl, realtek, nahimic, maxxaudio, dolby), pavé tactile (synaptics, syntp, elantech, etdctrl), anti-cheat (vgtray, vanguard, faceit, easyanticheat, battleye) et Rago (rago optimizer, rago-optimizer, rago hub), cherchés dans le nom, la commande, la description et l'éditeur ; plus tout nom qui commence par « rago » |
| `parse_startup(json)` | lecture testée hors Windows : tableau ou objet seul ; source inconnue, nom vide ou contenant « \| » écartés ; doublons (même id sans tenir compte de la casse) écartés ; **activée si le premier octet est pair ou absent** (2, 6), coupée s'il est impair (3, 7) ; tri par nom |
| `startup()` | la liste (vide si PowerShell échoue) |
| `set_startup(id, enabled)` | seulement une entrée de la liste actuelle ; refuse de couper une entrée `keep` ; écrit l'état puis relit la liste et renvoie `Err("Windows refused the change")` si l'état n'a pas changé |

Nom affiché (`startup_name`) : le nom de l'entrée ou du raccourci sans « .lnk », sauf s'il ressemble à un identifiant (pas d'espace et un point, une accolade ou un tiret bas, par exemple « com.squirrel.Teams.Teams ») et que l'exe a une description (« Microsoft Teams »).

Écriture (`startup_script`) : la même valeur binaire que le Gestionnaire des tâches dans la clé `StartupApproved` de la source : `02 00 00 00 00 00 00 00 00 00 00 00` pour activée, `03 00 00 00` suivi de la date (FILETIME) pour coupée. La clé est créée seulement si elle n'existe pas (`New-Item -Force` sur une clé existante l'aurait vidée). **Rien n'est supprimé** : la valeur `Run` ou le raccourci restent, l'entrée se rallume ici ou dans le Gestionnaire des tâches ; effet au prochain démarrage de Windows. Le nom vient du registre ou du disque : il n'est **jamais collé dans le script**, il passe en base64 UTF-16 (`ps_text`).

Pas listées : les applis du Microsoft Store qui démarrent seules (tâches de démarrage des paquets), les tâches planifiées et les services.

### Mode d'alimentation (PR #90)
| Élément | Description |
|---|---|
| `struct PowerPlan {guid, name, active}` | `name` : nom donné par Windows, dans sa langue |
| `POWER_PLANS` | `Get-CimInstance -Namespace root\cimv2\power -ClassName Win32_PowerPlan` (noms en UTF-8 quelle que soit la langue) |
| `parse_power_plans(json)` | GUID tiré de `InstanceID` par `parse_scheme`, en minuscules ; nom vide → le GUID ; doublons écartés |
| `parse_powercfg_list(sortie)` | repli sans WMI : `powercfg /list`, nom entre parenthèses (les parenthèses du nom sont gardées : « Rago (Low Latency) »), actif si la ligne finit par `*` |
| `power_plans()` | WMI, sinon `powercfg.exe /list` |
| `set_power_plan(guid)` | seulement un GUID de la liste : `powercfg.exe /setactive <guid>`, puis relit ; `Err("Windows refused the change")` si le mode n'est pas actif (mode imposé par une stratégie d'entreprise ou d'école) |

### Cache DNS (PR #90)
`flush_dns()` : `ipconfig.exe /flushdns` (caché) ; erreur si le code de sortie n'est pas 0.

### Raccourcis vers les réglages de Windows (PR #90)
`PANELS` : **liste fermée** de 10 `(id, programme, argument)` ; l'app tourne en administrateur, l'interface ne choisit jamais le programme lancé. `open_panel(id)` refuse tout id absent de la liste.

| id | Ouvre |
|---|---|
| `graphics` | `explorer.exe ms-settings:display-advancedgraphics` (carte graphique par jeu, planification GPU) |
| `display` | `explorer.exe ms-settings:display-advanced` (fréquence de l'écran) |
| `gamemode` | `explorer.exe ms-settings:gaming-gamemode` |
| `sound` | `control.exe mmsys.cpl` |
| `mouse` | `control.exe main.cpl` |
| `network` | `control.exe ncpa.cpl` |
| `power` | `control.exe powercfg.cpl` |
| `devices` | `mmc.exe devmgmt.msc` |
| `visual` | `SystemPropertiesPerformance.exe` (effets visuels, mémoire virtuelle) |
| `taskmgr` | `taskmgr.exe` |

## Fonctionnement détaillé
- `collect` : parcourt chaque dossier une seule fois, **sans suivre les liens** (attribut `FILE_ATTRIBUTE_REPARSE_POINT` 0x400 : liens symboliques et jonctions, qui pourraient mener hors de la zone), et saute au premier niveau les dossiers dont le nom commence par `rago` (`ours` : scripts et ressources de l'app).
- `clean` : supprime chaque fichier ; s'il est en lecture seule, retire l'attribut et réessaie ; un fichier ouvert est compté dans `skipped`. Puis supprime les dossiers vidés, du plus profond au plus haut ; ceux qui gardent un fichier restent.
- Les variables d'environnement vides ou relatives ne donnent aucun chemin (`env_dir`) : jamais le dossier courant.
- Pendant une partie, l'option « mode performances » de [[Pendant la partie]] ([[session.rs]]) peut passer d'Équilibré ou d'Économie d'énergie à Performances élevées, et remet le mode d'avant à la fin **seulement si Performances élevées est toujours actif** : un mode choisi dans la page Outils pendant la partie est gardé.

## Tests
`cleans_files_but_not_links_or_our_folders`, `every_area_has_targets_or_is_the_recycle_bin`, `finds_bloat_among_installed_packages` (jamais Store, GamingApp, XboxGamingOverlay, Photos, Calculatrice), `reads_drivers_and_the_board_maker`, et depuis la PR #90 : `reads_startup_entries_like_task_manager` (états 2, 3, 6, 7 et absent ; noms d'identifiant remplacés ; Vanguard, Realtek et SecurityHealth gardés ; source inconnue, « \| » et doublons écartés ; objet seul), `startup_script_never_pastes_the_name` (un nom piégé avec apostrophes et `Remove-Item` ressort intact après décodage ; chaque source de `STARTUP_SOURCES` est lue par `STARTUP_LIST`), `reads_power_plans_in_any_language` (WMI et `powercfg /list` en anglais et en français), `opens_only_known_panels`. 8 tests au total (passés le 11/11 hors Windows, dans un crate de test à part : `cargo test` de l'app ne se compile pas sous Linux).

## À savoir avant de modifier
- Ajouter une zone : vérifier qu'elle ne touche rien que le vérificateur RBW regarde, et qu'elle ne contient ni historique, ni mot de passe, ni connexion à un compte (les caches de l'EA app, de Battle.net et du Riot Client n'ont pas été ajoutés : chemins non confirmés, [[Page Outils]]).
- Ajouter une appli à `BLOAT` : jamais une appli dont un jeu ou Windows a besoin.
- Ajouter un mot à `STARTUP_KEEP` plutôt que d'en retirer : couper un pilote audio ou un anti-cheat casse le son ou le jeu au prochain démarrage.
- Ajouter un raccourci : seulement un programme de Windows avec un argument fixe, dans `PANELS`, avec `tools.panel.<id>` et `tools.panel.<id>.hint` dans [[i18n.ts]] et une ligne dans `PANELS` de [[Tools.tsx]].
