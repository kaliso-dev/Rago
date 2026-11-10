---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/tools.rs
lignes: 579
maj: 2026-11-10
---
# tools.rs

Page **Outils** : nettoyage des fichiers inutiles, désinstallation des applis préinstallées ou sponsorisées, liste des pilotes et du fabricant du PC. Natif, **hors catalogue** : le nettoyage supprime pour de bon et ne s'annule pas. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Page Outils]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 21/10. Désinstallation des applis gratuite depuis la 1.2.2 (commentaire de [[lib.rs]]).

## Rôle et place dans l'ensemble
Appelé par les commandes `tools_scan`, `tools_clean`, `tools_apps`, `tools_remove_apps`, `tools_drivers` de [[lib.rs]] (toutes dans `spawn_blocking`). `tools_windows_update` (ouvrir les mises à jour facultatives de Windows) est dans [[lib.rs]] seulement. L'âge du pilote graphique sert aussi à l'[[Analyse du PC]]. PowerShell passe par [[shell.rs]].

## Ce que le fichier expose

### Nettoyage
| Élément | Description |
|---|---|
| `AREAS` | `temp`, `windows_temp`, `update`, `crash`, `browsers`, `discord`, `shaders`, `recycle` (ordre affiché) |
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
| `shaders` | `%LOCALAPPDATA%\NVIDIA\DXCache`, `NVIDIA\GLCache`, `D3DSCache`, `AMD\DxCache`, `AMD\DxcCache`, `AMD\GLCache`, `AMD\VkCache`, `%ProgramData%\NVIDIA Corporation\NV_Cache` |
| `recycle` | corbeille de tous les disques : `SHQueryRecycleBinW` / `SHEmptyRecycleBinW` (sans confirmation, sans son ni barre) ; déjà vide (`E_UNEXPECTED`) n'est pas une erreur |

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

## Fonctionnement détaillé
- `collect` : parcourt chaque dossier une seule fois, **sans suivre les liens** (attribut `FILE_ATTRIBUTE_REPARSE_POINT` 0x400 : liens symboliques et jonctions, qui pourraient mener hors de la zone), et saute au premier niveau les dossiers dont le nom commence par `rago` (`ours` : scripts et ressources de l'app).
- `clean` : supprime chaque fichier ; s'il est en lecture seule, retire l'attribut et réessaie ; un fichier ouvert est compté dans `skipped`. Puis supprime les dossiers vidés, du plus profond au plus haut ; ceux qui gardent un fichier restent.
- Les variables d'environnement vides ou relatives ne donnent aucun chemin (`env_dir`) : jamais le dossier courant.

## Tests
`cleans_files_but_not_links_or_our_folders`, `every_area_has_targets_or_is_the_recycle_bin`, `finds_bloat_among_installed_packages` (jamais Store, GamingApp, XboxGamingOverlay, Photos, Calculatrice), `reads_drivers_and_the_board_maker`.

## À savoir avant de modifier
- Ajouter une zone : vérifier qu'elle ne touche rien que le vérificateur RBW regarde, et qu'elle ne contient ni historique ni mot de passe.
- Ajouter une appli à `BLOAT` : jamais une appli dont un jeu ou Windows a besoin.
