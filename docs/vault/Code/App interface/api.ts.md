---
type: code
tags: [code, app, typescript, interface]
fichier: app/src/lib/api.ts
lignes: 1387
lignes: 1485
maj: 2026-11-11
---
# api.ts

Le **pont unique** entre l'interface React et le moteur Rust : un objet `api` dont chaque fonction appelle une commande Tauri (`invoke`) ou écoute un événement (`listen`). Hors de Tauri (navigateur, `npm run window`), le même objet est remplacé par un **simulateur** complet qui ne touche à rien. Fiche parente : [[Code de l'app (interface)]]. Côté Rust : [[lib.rs]] (enregistre les commandes). Fonctionnement d'ensemble : [[Architecture de l'app]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Aucune page n'appelle `invoke` directement : toutes passent par `api` (seule exception, le compte, qui a son propre pont [[accountApi.ts]], bâti sur le même modèle).
- Le front n'a **aucun accès réseau** (CSP `connect-src ipc:`, voir [[Configuration Tauri]]) : tout ce qui parle à un serveur (licence, test réseau, Rago Route) passe par une commande Rust de cette liste.
- Le fichier fait trois choses : il déclare les **types** échangés avec Rust (miroir des structures `serde` en `camelCase`), il définit `tauriApi` (vraie app) et `mockApi` (démo), puis exporte `api = isTauri ? tauriApi : mockApi`.
- Il dépend de [[catalog.ts]] (le simulateur lit `tweaks` pour savoir si une variante est un retour arrière) et des types de [[netopt.ts]] (`NetAction`, `NetLine`, `NetOptions`, `NetOutcome`, `NetState`).

## Ce que le fichier expose

### Constantes et fonctions
- `isTauri` : `true` quand `"__TAURI_INTERNALS__" in window` (fenêtre de l'app). C'est le seul test qui décide vraie app ou démo, partout dans le front (aussi dans [[accountApi.ts]], [[RouteTab.tsx]], [[Settings.tsx]]…).
- `asLicenseError(err)` : transforme n'importe quelle erreur rejetée par une commande de licence en `LicenseError { code, message, buyUrl }` ; code par défaut `"server_error"`.
- `api: Api` : l'objet à utiliser partout.
- `copyText(text)` (interne, exposé comme `api.copyText`) : essaie `navigator.clipboard.writeText` ; si la page n'a pas le focus (WebView2 refuse), retombe sur l'ancienne méthode (`textarea` caché + `document.execCommand("copy")`) ; lève `Error("clipboard")` si les deux échouent. Même code en vraie app et en démo.

### Types exportés (miroirs de Rust)
| Type | Contenu | Module Rust d'origine |
|---|---|---|
| `SystemInfo`, `Gpu` | OS, build, Win11, nom du PC, CPU (nom, marque, cœurs, threads), RAM (Go et palier `ramTier`), cartes graphiques, carte réseau (`adapter`, `adapterDesc`, `linkSpeed`), `isAdmin`, `hasWmic`, `minecraftDir`, `resources` (outils livrés) | [[system.rs]] |
| `HistoryEntry` | `id`, `variant`, `ts`, `ok`, `code`, `durationMs`, `undo?` | [[history.rs]] |
| `AppliedView` | réglage appliqué : `backup` (état d'avant sauvegardé, sinon appliqué avant 1.1.6), `drift` (Windows a remis une valeur), `windowsValues?` (RBW Mod « Désactivé ») | [[backup.rs]] |
| `LiveStats` | `ready`, `ram`, `cpu`, `gpu` en %, `ramUsed`, `ramTotal` en octets ; `null` = mesure absente sur ce PC | [[stats.rs]] |
| `Cleaned` | octets libérés : `standby`, `trimmed`, nombre d'`apps` réduites | [[memory.rs]] |
| `ReportParts`, `SupportReport` | parties du rapport (`pc`, `tweaks`, `history`, `logs`, `network`) ; rapport écrit (`path`, `name`, `size`, `text`) | [[report.rs]] |
| `Game`, `Launcher` | jeu (`id` du type `steam:730`, `epic:Fortnite`, `riot:valorant`, `mc:lunar`, `manual:…`, `launcher`, `client`, `kind` minecraft/shooter/other, `installDir`, `lastPlayed`, `running`) ; launcher (`id`, `name`, `minecraft`, `running`) | [[games.rs]] |
| `RouteLink`, `RouteStep`, `RouteWhy`, `RouteCheck`, `RouteLinks`, `RoutePath`, `RouteStatus` | Rago Route : 2e connexions, diagnostic du partage du téléphone, trajets (`direct`, `relay`, `phone`, `second`) avec `rttMs`, `lossPct`, `firstPct`, `mb` ; compteurs `saved`, `repaired`, `packets`, `resendsHere`, `resendsExit`, `exitPingMs`, `lagHereMs`, `lagExitMs`, `ports` | [[route.rs]] |
| `NetMeasure`, `NetSample` | mesure du test réseau (`ping` moyenne, `median`, `best`, `worst`, `jitter`, `loss` 0–1, `lost`, `samples`, `spikes`, `series`, `method` mc/tcp/icmp, `error` `dns`/`timeout`) ; un essai en direct (`i`, `n`, `ms`) | [[nettest.rs]] |
| `UpdateReady` | `version`, `notes` | [[update.rs]] |
| `BackgroundPrefs`, `BackgroundState` | préférences (`tray`, `autostart`, `autostartChosen?`, `overlay`, `shortcut`, `pin`, `lang`, `gameGpu`, `gamePower`, `gameChecks`, `gamePriority`) ; état (`autostart` réel, `shortcutTaken`, `fpsAvailable`) | [[background.rs]] |
| `SessionCheck`, `SessionState` | pendant la partie : `playing`, `power`, `gpuGames`, `checks` (`battery`, `download`, `sync`, `record` + applis), `multiGpu`, `x3d` | [[session.rs]] |
| `DisplayColors`, `DisplayResolution`, `DisplayProfile`, `DisplayMonitor`, `DisplayInfo`, `DisplayState` | couleurs et résolution par jeu (ajout du 11/11, branche `claude/project-thread-7n0ikn`) : `vibrance` 50–100, `brightness` et `contrast` −30 à +30, `gamma` × 100 ; `width`, `height`, `stretch`, `gameFile` ; profil `colors`, `resolution`, `pro` ; écran principal (`device`, `name`, `width`, `height`, `hz`, `modes`) et `vibrance` `nvidia`/`amd`/`null` ; état posé (`colors`, `resolution`, `error`) | [[display.rs]] |
| `OverlayMode`, `OverlayInfo`, `OverlayLive` | barre en jeu : mode `hidden`/`panel`/`pill`, jeu, raccourci, épingle, `fpsAvailable`, `shortcutTaken`, `passive` ; mesures `fps`, `ping`, `pingEstimate?` | [[overlay.rs]], [[fps.rs]] |
| `RbwCheck` | une ligne du vérificateur Ranked Bedwars : `name`, `kind` service/setting, `ok`, `state`, `start` | [[rbw.rs]] |
| `CleanAreaId`, `CleanArea`, `CleanResult`, `BloatApp`, `Driver`, `DriversInfo` | page Outils : zones `temp`, `windows_temp`, `update`, `crash`, `browsers`, `discord`, `shaders`, `recycle` ; applis préinstallées (nom en/fr) ; pilotes `gpu`/`network`/`audio` avec date `AAAA-MM-JJ` ; fabricant et modèle de la carte mère | [[tools.rs]] |
| `MatchSummary`, `AnalysisFacts` | « Analyze my PC » : écran (`refresh`, `refreshMax`), `processes`, mémoire (`memSpeed`, `memRated`), `wired`, `gameDvr`, `notifications`, `powerScheme` (GUID), applis de fond, dernière partie suivie (`minutes`, `fps`, `low1`, `stuttersPerMin`) | [[analysis.rs]] |
| `MinecraftStatus` | `dirExists`, `optifineFile`, `backups` | [[minecraft.rs]] |
| `RunItem` | un élément d'un lot : `id`, `variant?`, `params?`, `undo?` | [[runner.rs]] |
| `LicenseState`, `LicenseStatus`, `LoginResult`, `LicenseError` | état `active`/`none`/`expired`/`unconfigured`, e-mail, offre, indice de clé, échéance, `needsRefresh`, `deviceName` ; connexion `activationRequired` ou `active` | [[license.rs]] |
| `ItemStatus`, `ItemEvent`, `LogEvent`, `DoneEvent`, `ResetDone` | événements d'un lot (statut par élément, ligne de journal, fin avec `ok`, `failed`, `skipped`, `restoreFailed`, `cancelled`, `logFile`) ; remise à zéro en arrière-plan (`ok`, `failed`) | [[runner.rs]], [[reset.rs]] |

### L'interface `Api` : 88 membres, 71 commandes Tauri, 13 événements
Chaque ligne : nom dans `api` → commande Rust (paramètres) → ce que fait le simulateur.

**Système et moteur des tweaks**
| Fonction | Commande | Simulateur |
|---|---|---|
| `systemInfo(refresh?)` | `get_system_info { refresh }` | 500 ms puis un PC type : Windows 11 Pro 24H2 build 26100, Ryzen 7 7800X3D 8 cœurs/16 threads, 32 Go, RTX 4070, Ethernet Realtek 2.5GbE à 1 Gbps, admin, **pas de WMIC**, dossier `.minecraft`, outils NVIDIA livrés |
| `runTweaks(items)` | `run_tweaks { items }` → renvoie un `runId` | joue le lot (voir plus bas), émet `run:item`, `run:log`, `run:done` |
| `cancelRun()` | `cancel_run` | lève un drapeau qui arrête la boucle |
| `isRunning()` | `is_running` | drapeau `mockRunning` |
| `history()` / `clearHistory()` | `get_history` / `clear_history` | tableau en mémoire (perdu au rechargement) |
| `applied()` | `get_applied` | carte `mockApplied`, gardée dans `localStorage` `rago.demoApplied` |
| `undoAllPlan()` | `undo_all_plan` | réglages appliqués, du plus récent au plus ancien (puis par id) |
| `signOutPlan()` | `sign_out_plan` | même liste |
| `takeRepairNotice()` | `take_repair_notice` | `true` si `localStorage` `rago.demoRepair` = `1` |
| `liveStats()` | `live_stats` | `ready: false` la première seconde, puis RAM 38–64 %, CPU 3–60 %, GPU 0–75 % qui dérivent au hasard ; GPU `null` si `rago.demoNoGpu` = `1` ; RAM totale 32 Gio |
| `openTaskManager()` | `open_task_manager` | message console |
| `cleanRam(trim)` | `clean_ram { trim }` | 900 ms, 1,2 à 2,8 Gio de cache vidé ; avec `trim`, 0,4 Gio et 7 applis |
| `minecraftStatus(dir?)` | `minecraft_status { dir }` | dossier présent, fichier OptiFine présent, 1 sauvegarde |
| `minecraftRestore(dir?)` | `minecraft_restore { dir }` | texte fixe |
| `rbwStatus()` | `rbw_status` | 12 services et 6 réglages ; `SysMain`, `PcaSvc` et `Prefetch` sont KO tant que `rbw_mode` n'est pas appliqué en variante `on` |
| `restartPc()` | `restart_pc` | rien |
| `openFolder(kind)` | `open_folder { kind }` (`logs`, `resources`, `data`) | rien |
| `pickFolder(title)` | plugin `@tauri-apps/plugin-dialog` `open({ directory: true })` (pas de commande maison) | renvoie un chemin `.minecraft` factice |
| `openUrl(url)` | plugin `@tauri-apps/plugin-opener` `openUrl` | `window.open(url, "_blank", "noopener")` |

**Page Outils et analyse**
| Fonction | Commande | Simulateur |
|---|---|---|
| `toolsScan()` | `tools_scan` | 900 ms, 8 zones (environ 7,4 Gio au total, la plus grosse `update` 2 630 Mio) |
| `toolsClean(areas)` | `tools_clean { areas }` | 1,4 s ; vide les zones choisies, garde 8 % de `browsers` (navigateur ouvert) et compte 37 fichiers laissés |
| `toolsApps()` | `tools_apps` | 700 ms, 12 applis (Actualités, Météo, Teams, Candy Crush, TikTok…) |
| `toolsRemoveApps(ids)` | `tools_remove_apps { ids }` → applis encore installées | 1,6 s, retire les ids. Le commentaire de l'interface dit encore « Premium » : c'est faux depuis la 1.3.0, la suppression est gratuite (voir [[Tools.tsx]]) |
| `toolsDrivers()` | `tools_drivers` | 1,1 s, 3 pilotes (carte graphique 08/2024, réseau 10/2023, audio 09/2021) et une carte mère ASUS |
| `toolsWindowsUpdate()` | `tools_windows_update` | rien |
| `analysisFacts()` | `analysis_facts` | 1,5 s ; écran à 60 Hz sur 144 possibles, 212 processus, mémoire à 4 800 sur 6 000 MT/s, Wi-Fi, Game DVR et notifications actifs, plan Équilibré, OneDrive en fond, dernière partie de 24 min à 312 FPS (1 % bas 128, 3,4 saccades/min) |

**Partage et support**
| Fonction | Commande | Simulateur |
|---|---|---|
| `supportReport(parts)` | `support_report { parts }` | 700 ms ; texte de démo par parties, nom `rago-report-AAAA-MM-JJ-HHMM.txt` (UTC) |
| `showReport(name)` | `show_report { name }` | console |
| `savePresetFile(code, fileName, title)` | dialogue `save` (filtre « Rago preset », `.rago`), ajoute `.rago` si absent, puis `save_preset_file { path, code }` ; `false` si fermé | téléchargement d'un fichier par un lien `blob:` |
| `openPresetFile(title)` | dialogue `open` (`.rago`) puis `read_preset_file { path }` ; `null` si fermé | champ `<input type="file" accept=".rago">` |
| `copyText(text)` | voir plus haut | idem |

**Réseau**
| Fonction | Commande | Simulateur |
|---|---|---|
| `netTest(ids)` | `net_test { ids }` | par serveur : 40 essais (8 pour `hypixel` et `minemen`), un toutes les 250 ms (1,4 s pour Minecraft, 8 ms avec `?fastnet`) ; ping de base Hypixel 92, Minemen 21, Paris 9, Frankfurt 17, London 14, Stockholm 33, Madrid 28, Virginia 86, Internet 7 ; un pic tous les 13 essais ; Virginia perd l'essai 17 ; calcule moyenne, médiane, meilleur, pire, gigue, pertes, pics (au-dessus de médiane + max(15, médiane/2)) ; émet `nettest:sample` et `nettest:measure` |
| `onNetMeasure(cb)` / `onNetSample(cb)` | événements `nettest:measure` / `nettest:sample` | bus local |
| `netOptState()` | `netopt_state` | `{ applied, backup, busy }` en mémoire |
| `netOptRun(action, options?)` | `netopt_run { action, options }` | `apply` : 11 titres de sections avec lignes `ok`/`warn`/`info` (préfixes `!` et `..`) et une ligne `progress` par section ; `restore`/`defaults` : 4 titres ; `detect` : Ethernet Intel I225-V 1 Gbps ; `quality`, `loaded`, `mtu`, `status` : barre de progression puis résultat type (note `A` pour `loaded`) |
| `onNetOptLine(cb)` | événement `netopt:line` | bus local |
| `routeStart(second?)` | `route_start { second }` ; erreur `port:25565` si le port est pris | 500 ms, allume ; avec `second`, ajoute un trajet téléphone |
| `routeLinks()` | `route_links` (`null` hors Windows) | un téléphone « Ethernet 2 » ; avec `?why=usb`, `apple_usb`, `apple_net`, `share_iphone`, `share_android` ou `internet`, aucun téléphone et le diagnostic jusqu'à l'étape ratée |
| `routeStop()` / `routeStatus()` | `route_stop` / `route_status` | partie « en cours » 3 s après l'allumage ; trajets direct Paris ≈ 17 ms, relais Frankfurt ≈ 38 ms, téléphone ≈ 55 ms ; 140 paquets/s ; ping de sortie 93 ms ; ports 25565 et 25566 |
| `routeToken()` | `route_token` (jeton de 6 h pour le script du Mac ; erreurs `premium:no_license`, `premium:route_closed`…) | `"demo.route.token"` |

**Bibliothèque de jeux**
| Fonction | Commande | Simulateur |
|---|---|---|
| `gamesList(refresh)` | `games_list { refresh }` | 7 jeux (3 Minecraft : Lunar, Badlion, launcher officiel ; VALORANT, CS2, Fortnite, Rocket League), triés par dernière partie ; avec `?playing`, le premier est « en cours » |
| `gameArt(id)` | `game_art { id }` → `data:` URL | `null` (tuiles au nom du jeu) |
| `gameLaunch(id)` | `game_launch { id }` | 500 ms, met à jour `lastPlayed` |
| `gameAdd(title)` | dialogue `open` (filtre « Program », `.exe`) puis `game_add { path }` → id | `null` |
| `gameRemove(id)` / `gamesUnhide()` | `game_remove { id }` / `games_unhide` | retire / rien |
| `launchersList(refresh)` | `launchers_list { refresh }` | 8 launchers (Steam lancé, Epic, Riot, Battle.net, Minecraft Launcher, Lunar, Badlion, Xbox) |
| `launcherLaunch(id)` / `launcherIcon(id)` | `launcher_launch` / `launcher_icon` | marque lancé / lit `window.__launcherIcons[id]` (fourni par les scripts de captures), sinon `null` |
| `presetIcons()` | `preset_icons` → logos par clé de jeu | `window.__presetIcons` ou `{}` |
| `onGamesRunning(cb)` | événement `games:running` | bus local |

**Mise à jour, arrière-plan, partie, barre en jeu**
| Fonction | Commande | Simulateur |
|---|---|---|
| `updateReady()` / `onUpdateReady(cb)` | `update_ready` / événement `update:ready` | une 1.2.1 en attente avec `?update` |
| `updateStatus()` | `update_status` (date de la dernière recherche) | `null` |
| `updateInstall()` | `update_install` (l'app se ferme) | 1,2 s puis recharge la page |
| `backgroundGet()` / `backgroundSet(prefs)` | `background_get` / `background_set { prefs }` ; erreurs `shortcut` et `autostart:…` | préférences par défaut : zone de notification oui, lancement avec Windows oui, barre oui, `Alt+X`, pas épinglée, langue `fr`, les 3 options de partie oui ; `backgroundSet` vérifie le raccourci par l'expression `^((Ctrl|Alt|Shift|Super)\+)*(F\d{1,2}|[A-Z0-9]|[A-Za-z]+)$` et ne change pas les 3 options de partie (comme le vrai `background_set`) |
| `sessionState()` / `sessionSetPrefs(gpu, power, checks, priority)` / `onSession(cb)` | `session_state` / `session_set_prefs` / événement `games:session` | partie en cours avec `?playing` ou dans `overlay.html` ; vérifications OneDrive et OBS ; 2 jeux sur la carte performante ; `multiGpu: true` |
| `sessionState()` / `sessionSetPrefs(gpu, power, checks)` / `onSession(cb)` | `session_state` / `session_set_prefs` / événement `games:session` | partie en cours avec `?playing` ou dans `overlay.html` ; vérifications OneDrive et OBS ; 2 jeux sur la carte performante ; `multiGpu: true` |
| `displayInfo()` / `displayProfiles()` / `displayState()` | `display_info` / `display_profiles` / `display_state` | carte NVIDIA (`?amd` : AMD, `?intel` : pas de saturation), écran « ZOWIE XL LCD » 1920×1080 à 240 Hz avec 10 résolutions ; profils gardés dans `localStorage` `rago.demoDisplay` ; rien de posé |
| `displaySetProfile(id, profile)` / `displayPreview(colors)` / `onDisplayState(cb)` | `display_set_profile { id, profile }` / `display_preview { colors }` / événement `display:state` | enregistre (clé `mc:java` pour Minecraft Java) ; refuse `premium:no_license` pour un pro nouveau sans licence de démo, comme le vrai moteur ; l'aperçu émet `display:state` avec `colors: "preview"` |
| `overlayInfo()` | `overlay_info` | mode `panel` (`pill` avec `?pill`), jeu « Minecraft », `passive` avec `?passive` |
| `overlayLive()` | `overlay_live` | FPS 238–252, ping 21–25, `pingEstimate` avec `?estimate` |
| `overlayClose()` / `overlaySetPin(pin)` / `overlayOpenApp(page?)` | `overlay_close` / `overlay_set_pin` / `overlay_open_app { page }` | rien / note l'épingle / rien |
| `onOverlayMode(cb)` / `onGoto(cb)` | événements `overlay:mode` / `app:goto` | bus local |

**Licence**
| Fonction | Commande | Simulateur |
|---|---|---|
| `licenseStatus()` | `license_status` | Premium actif si une adresse de démo est gardée (`rago.demoLicense`), échéance dans 30 jours, appareil `PC-DEMO` |
| `licenseLogin(email, password)` | `license_login` | 800 ms ; sans `@` ou mot de passe de moins de 4 caractères : `invalid_credentials` ; adresse qui commence par `other` : `bound_to_other_device` ; par `free` : `no_license` (avec lien `…/#pricing`) ; sinon `activationRequired` |
| `licenseLinkStart(provider)` | `license_link_start { provider }` (`google` ou `discord`) | code de démo à 4 lettres |
| `licenseLinkPoll(linkId, pollToken)` | `license_link_poll` ; `null` tant que ce n'est pas confirmé | `null` pendant 5 s, puis `activationRequired` avec une adresse de démo |
| `licenseActivate()` | `license_activate` | 900 ms, passe Premium et l'écrit dans `rago.demoLicense` ; sans connexion en attente : `invalid_token` |
| `licenseRefresh()` | `license_refresh` | si `rago.demoSim` = `revoked` : perd Premium, lance la remise à zéro simulée et lève `revoked` |
| `licenseSignOut()` | `license_sign_out` | efface `rago.demoLicense`, remise à zéro simulée |

**Événements du lot et fenêtre**
| Fonction | Événement / action | Simulateur |
|---|---|---|
| `onItem`, `onLog`, `onDone`, `onReset` | `run:item`, `run:log`, `run:done`, `reset:done` | bus local |
| `window.minimize/toggleMaximize/close` | `getCurrentWindow()` de `@tauri-apps/api/window`, importé à la demande | ne font rien |

Les **12 événements** écoutés par l'interface sont donc : `run:item`, `run:log`, `run:done`, `reset:done`, `netopt:line`, `nettest:sample`, `nettest:measure`, `games:running`, `games:session`, `update:ready`, `overlay:mode`, `app:goto`.

## Fonctionnement détaillé

### Vraie app (`tauriApi`)
- Chaque fonction est une ligne `invoke("nom_de_commande", { paramètres })`. Les noms de paramètres sont en `camelCase` côté JS (`linkId`, `pollToken`) ; Tauri les convertit pour Rust.
- Les plugins `@tauri-apps/plugin-dialog` et `@tauri-apps/plugin-opener` et le module `@tauri-apps/api/window` sont chargés par `import()` dynamique : ils ne pèsent rien tant qu'on ne s'en sert pas, et ils ne cassent pas la démo (jamais appelés hors Tauri).
- Les erreurs des commandes arrivent comme des rejets de promesse : soit une chaîne (`"premium_required"`, `"free_slots:…"`, `"shortcut"`…), soit un objet `{ code, message, buyUrl }` pour la licence. [[store.tsx]] traduit ces codes en textes.

### Simulateur (`mockApi`)
- Un `EventTarget` local (`bus`) remplace les événements Tauri : `emit(name, detail)` envoie un `CustomEvent`, `on(name, cb)` renvoie une fonction de désinscription comme `listen`.
- **Lot de tweaks simulé** (`runTweaks`) : un `runId` `demo-<horodatage>` est renvoyé tout de suite, puis une boucle asynchrone traite chaque élément : statut `running`, 2 à 5 lignes de journal tirées de `MOCK_LINES` (120 à 340 ms chacune), statut `ok`. Elle imite trois règles du vrai moteur [[runner.rs]] :
  1. avec `rago.demoRestoreFail` = `1`, l'élément `rst_point` échoue (« System Restore is turned off… ») et tous les éléments suivants qui ne sont pas des annulations (ni `rst_open`, ni `app_settings`) passent en `skipped` ;
  2. une variante marquée `revert` dans le catalogue sur un réglage déjà appliqué est notée comme une annulation, **sauf** pour `rbw_mode` (son « Désactivé » lance un script complet) ;
  3. `rbw_mode` appliqué est noté `windowsValues: true` et `backup: false`.
  Le lot se termine par `run:done` avec un faux chemin de journal.
- **Persistance de la démo** dans le `localStorage` du navigateur : `rago.demoApplied` (réglages appliqués), `rago.demoLicense` (adresse Premium), `rago.demoDisplay` (couleurs et résolution par jeu). Les autres réglages de démo sont des interrupteurs à poser à la main dans la console : `rago.demoRestoreFail`, `rago.demoRepair`, `rago.demoNoGpu`, `rago.demoSim` = `revoked`.
- **Paramètres d'adresse de démo** : `?why=<étape>` (diagnostic Rago Route), `?playing` (partie en cours), `?fastnet` (test réseau rapide), `?update` (mise à jour prête), `?pill`, `?passive`, `?estimate` (barre en jeu, avec `overlay.html`), `?amd`, `?intel` (page Couleurs et résolution : carte AMD, écran sans saturation).
- **Remise à zéro simulée** (`mockReset`) : 1,5 s après une déconnexion ou un abonnement révoqué, vide les réglages appliqués et émet `reset:done`.

## Données touchées
- Vraie app : rien directement ; tout passe par les commandes Rust.
- Démo : `localStorage` (`rago.demoApplied`, `rago.demoLicense`, `rago.demoDisplay`, et les interrupteurs ci-dessus), presse-papiers, téléchargements de fichiers `.rago`.

## Erreurs et cas limites
- Chaque accès à `localStorage` est dans un `try/catch` (navigateur sans stockage).
- `copyText` peut lever `Error("clipboard")` : les appelants affichent alors un message d'échec.
- `savePresetFile` en vraie app ajoute l'extension `.rago` si le joueur l'a effacée du nom.
- `asLicenseError` ne lève jamais : un rejet inconnu devient `server_error`.

## Liens avec le reste
- Appelé par : [[store.tsx]] (lots, licence, historique, événements), toutes les pages ([[Dashboard.tsx]], [[Games.tsx]], [[Display.tsx]], [[Tools.tsx]], [[NetOpt.tsx]], [[NetTest.tsx]], [[RouteTab.tsx]], [[Settings.tsx]], [[Share.tsx]], [[Analysis.tsx]]), les composants ([[LicenseGate.tsx]], [[LiveStatsCard.tsx]], [[BackgroundCard.tsx]], [[SessionCard.tsx]], [[RbwStatus.tsx]], [[UpdateCard.tsx]], [[TitleBar.tsx]], [[ResetToast.tsx]]) et la barre en jeu [[Overlay.tsx]].
- Côté Rust : commandes déclarées dans [[lib.rs]], qui délègue aux modules cités dans le tableau des types.
- Fonctionnalités : [[Moteur des tweaks]], [[Licence dans l'app]], [[Barre en jeu]], [[Couleurs et résolution]], [[Proxy|Rago Route]], [[Test réseau]], [[Packet Optimizer]], [[Page Outils]].

## Tests
Aucun test automatique côté front. Le simulateur sert de banc d'essai manuel avec `npm run window` (voir [[Configuration du front (Vite, npm)]] et [[Développer et tester]]).

## À savoir avant de modifier
- **Ajouter une commande** : (1) la commande dans le module Rust et son enregistrement dans [[lib.rs]] ; (2) la signature dans `interface Api` ; (3) la ligne dans `tauriApi` ; (4) une version simulée dans `mockApi` (TypeScript refuse de compiler sinon, `mockApi` étant typé `Api`).
- Les types doivent rester identiques aux structures Rust (`serde(rename_all = "camelCase")`) : un champ renommé d'un seul côté donne `undefined` sans erreur.
- Le simulateur doit **imiter les règles du moteur** (annulations, point de restauration raté, RBW Mod) : sinon la démo et les captures d'écran mentent.
- Le commentaire « Premium » sur `toolsRemoveApps` est périmé (À CORRIGER dans le code, sans conséquence).
