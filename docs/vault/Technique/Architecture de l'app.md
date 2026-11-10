---
type: technique
tags: [technique, app, architecture]
version_app: 1.3.0
maj: 2026-11-10
---
# Architecture de l'app

Comment le code de l'app Windows (`app/`) est organisé, état de `staging` (1.3.0) au 10/11. Résumé produit et liste des écrans : [[App Windows]]. Porte d'entrée : [[Reprendre le développement]].

## 1. Deux moitiés qui ne se parlent que par IPC
- **Moteur Rust** (`app/src-tauri/`, crate `rago-hub`, lib `rago_hub_lib`) : tout ce qui touche Windows, le réseau et le disque. Tourne **en administrateur** (`app.manifest`, `requireAdministrator`).
- **Interface React** (`app/src/`) : affichée par WebView2. **Aucun accès réseau** : la CSP de `tauri.conf.json` n'autorise que `connect-src ipc: http://ipc.localhost`. Elle appelle le moteur par `invoke("<commande>", args)` et écoute ses événements par `listen("<événement>")`.
- Point d'appel unique côté interface : `app/src/lib/api.ts`. Hors Tauri (`isTauri` faux : navigateur, `npm run window`), le même objet `api` bascule sur un **simulateur** (réglages, infos PC, licence et compte simulés en `localStorage` : `rago.demoApplied`, `rago.demoLicense`, `rago.demoAccount`…). Toute commande ajoutée doit l'être aux deux.

## 2. Démarrage (`run()` dans `lib.rs`)
1. `instance::acquire` : mutex nommé `Local\<identifiant>.instance`. Une deuxième fenêtre ramène la première au premier plan et s'arrête.
2. Argument `--reset-tweaks` (lancé par le désinstallateur, `installer/hooks.nsh`) : `reset::uninstall()` remet tous les réglages sans fenêtre, puis quitte (15 min au plus).
3. Plugins Tauri : `dialog`, `opener`, `updater`, `global-shortcut` (raccourci de la [[Barre en jeu]], Alt+X par défaut).
4. `setup` : vide `run\` (scripts temporaires) ; charge `history.json` et `applied.json` (chiffrés) ; `repair::at_startup` ([[Réparations au lancement]]) ; bibliothèque de jeux ; `Background` (argument `--background` = lancé avec Windows, fenêtre cachée) ; `Session` ; `Boost` (Mode jeu total de [[Rago OS]]).
5. **Fil de fond toutes les 4 s** : liste les processus, détecte les jeux (bibliothèque + `javaw.exe` Minecraft), émet `games:running` et `games:session`, applique ce que l'app fait pendant la partie ([[Pendant la partie]]), rend le Mode jeu total après ~20 s sans jeu.
6. Icône près de l'horloge et tâche planifiée de démarrage ([[Arrière-plan et démarrage]]) ; fenêtre de la barre en jeu (`overlay.html`) surveillée.
7. `update::watch` : cherche une mise à jour au lancement puis toutes les 4 h ([[Mise à jour automatique]]).
8. État partagé `AppState` (runner, history, ledger, license, account, reset, system, stats, library, updates, dossiers).
9. `reset_after_license` : reprend une [[Remise à zéro]] interrompue ou due à une fin de licence.
10. `bridge::serve` : ouvre le canal nommé pour [[Rago OS]].
11. À la sortie (`RunEvent::Exit`) : `flows::shutdown()` (session ETW) et `route::turn_off()` (Rago Route).

Fermeture de la fenêtre principale : cachée si une remise est en cours ou si le mode arrière-plan est actif ; sinon une mise à jour prête s'installe ; `Destroyed` quitte l'app. La barre en jeu n'est jamais fermée, seulement cachée.

## 3. Modules Rust (`app/src-tauri/src/`)
| Domaine | Fichiers | Notes du vault |
|---|---|---|
| Commandes et démarrage | `lib.rs` (≈1 550 lignes : toutes les `#[tauri::command]`, `bridge_handler`), `main.rs` | — |
| Réglages | `catalog.rs` (scripts embarqués, plan gratuit, `over_free_slots`), `runner.rs` (un lot à la fois, `.cmd` dans `run\`, journal `logs\run-<ms>.log`), `backup.rs` (`applied.json`, état d'avant), `history.rs`, `seal.rs` (chiffrement), `assets.rs` (plan d'alimentation `LowLatency.pow`, profil NVIDIA `.nip`, chiffrés dans l'exe), `reg.rs`, `shell.rs` | [[Moteur des tweaks]], [[Catalogue des tweaks]] |
| Remise et réparations | `reset.rs`, `repair.rs`, `instance.rs` | [[Remise à zéro]], [[Réparations au lancement]] |
| Licence et compte | `license.rs` (contrat `/api/v1`, jeton EdDSA vérifié hors ligne, empreinte PC, lien navigateur Google/Discord, jeton Rago Route), `account.rs` (avis, photo, nom, abonnement) | [[Licence dans l'app]], [[Abonnement dans l'app]] |
| PC et outils | `system.rs`, `stats.rs`, `memory.rs`, `analysis.rs` (1.3.0), `tools.rs`, `minecraft.rs` (OptiFine), `rbw.rs` | [[Analyse du PC]], [[Page Outils]], [[RBW Mod]] |
| En jeu | `overlay.rs`, `fps.rs` (PresentMon), `gameping.rs`, `mcping.rs`, `flows.rs` (ETW, ping des jeux UDP), `session.rs`, `background.rs` | [[Barre en jeu]], [[Pendant la partie]], [[Arrière-plan et démarrage]] |
| Jeux | `games.rs` (launchers Steam, Epic, Riot, Battle.net, Ubisoft, Xbox, Roblox, launchers Minecraft), `icon.rs` | [[Bibliothèque de jeux]] |
| Réseau | `netopt.rs` + `src-tauri/netopt/*.ps1` (moteur PowerShell chiffré), `nettest.rs`, `icmp.rs`, `netshare.rs`, `route.rs` (Rago Route, ≈1 900 lignes) | [[Packet Optimizer]], [[Test réseau]], [[Infrastructure Rago Route]] |
| Support | `report.rs` (rapport anonymisé dans `reports\`) | [[Partage et support]] |
| Mise à jour | `update.rs` | [[Mise à jour automatique]] |
| Rago OS | `bridge.rs` (canal nommé), `boost.rs` (Mode jeu total : services Windows arrêtés le temps d'une partie, notés dans `boost.json`) | [[Rago OS]] |

### Commandes exposées à l'interface (`generate_handler!`, 76 au 10/11)
- Système et outils : `get_system_info`, `rbw_status`, `tools_scan`, `tools_clean`, `tools_apps`, `tools_remove_apps`, `tools_drivers`, `tools_windows_update`, `live_stats`, `clean_ram`, `open_task_manager`, `restart_pc`, `open_folder`, `analysis_facts`.
- Réglages : `run_tweaks`, `cancel_run`, `is_running`, `get_history`, `clear_history`, `get_applied`, `undo_all_plan`, `sign_out_plan`, `take_repair_notice`, `minecraft_status`, `minecraft_restore`, `save_preset_file`, `read_preset_file`.
- Réseau : `net_test`, `netopt_state`, `netopt_run`, `route_start`, `route_stop`, `route_status`, `route_token`, `route_phone`.
- Jeux : `games_list`, `game_art`, `game_launch`, `game_add`, `game_remove`, `games_unhide`, `launchers_list`, `launcher_launch`, `launcher_icon`, `preset_icons`.
- Barre en jeu et arrière-plan : `overlay_info`, `overlay_live`, `overlay_close`, `overlay_set_pin`, `overlay_open_app`, `background_get`, `background_set`, `session_state`, `session_set_prefs`.
- Mise à jour : `update_ready`, `update_status`, `update_install`.
- Licence et compte : `license_status`, `license_login`, `license_link_start`, `license_link_poll`, `license_activate`, `license_refresh`, `license_sign_out`, `account_me`, `account_login`, `account_sign_out`, `account_save_review`, `account_delete_review`, `account_set_name`, `account_set_photo`, `account_remove_photo`, `account_subscription`, `plans_info`.
- Support : `support_report`, `show_report`.

### Événements émis vers l'interface
`run:item`, `run:log`, `run:done` (lot de réglages), `reset:done`, `netopt:line`, `nettest:sample`, `nettest:measure`, `games:running`, `games:session`.

## 4. Interface React (`app/src/`)
- `main.tsx` → `App.tsx` : barre de titre maison (`decorations: false`), `Sidebar`, page courante, `ApplyBar` (barre « Apply » des changements en attente), `RunOverlay` (suivi d'un lot), fenêtres `Upsell`, `ReviewPrompt`, `ReviewDialog`, `ConfirmDialog`, `SearchPalette`, `ResetToast`, `Splash`.
- **Pas de routeur** : la page courante est un état du store (`page`). Pages : `dashboard`, `analysis`, modules du catalogue (`network`, `latency`, `gpu`, `windows`, `hitreg`, `minecraft`, `rbw`, `gamemode`, `expert`, `restore`) rendus par `ModulePage`, onglets réseau (`Network` : optimisations, `NetOpt`, `NetTest`, `RouteTab` dans l'exe de test), `tools`, `games`, `share`, `settings`.
- Barre latérale (`components/Sidebar.tsx`) : groupe sans titre (Tableau de bord, Analyse), « Optimiser » (network, latency, gpu, windows, tools), « En jeu » (hitreg, minecraft, rbw, gamemode, games), « Avancé » (expert, restore), puis Paramètres.
- **Store** (`lib/store.tsx`, contexte React) : réglages choisis, appliqués, licence, langue, upsell, page. Constantes du plan gratuit lues dans `data/free.json` (`FREE`, `FREE_SLOTS` = 30, `FREE_REVERTS`).
- Catalogue : `lib/catalog.ts` lit `data/catalog.json` (modules → sections → tweaks → variantes, presets, retirés).
- Textes : `lib/i18n.ts` (≈2 100 lignes, clés EN et FR ; anglais par défaut, tutoiement en français).
- Barre en jeu : deuxième page Vite `overlay.html` → `src/overlay/Overlay.tsx`, fenêtre `overlay` avec sa propre capability (`capabilities/overlay.json`, `core:default` seulement).
- Styles dans `src/styles/`, polices Geist embarquées (`src/assets/fonts`), animations `motion`, icônes `lucide-react`.

## 5. Ce qui est figé à la compilation
| Variable (CI) | Lue par | Effet |
|---|---|---|
| `RAGO_API_BASE` | `license.rs` (`option_env!`) | adresse de l'API ; absente en release = app non reliée (gratuit seulement) |
| `RAGO_LICENSE_PUBKEY` | `license.rs` | clé publique Ed25519 qui valide les jetons ; `build.rs` **refuse la clé de test** en release |
| `RAGO_SCRIPTS_SECRET` | `build.rs` / `embed_scripts.rs` | chiffre les scripts Premium avec `HMAC-SHA256(secret, "rago-scripts-v1|<version>")` ; release connectée sans lui = build refusé |
| `VITE_SITE_URL`, `VITE_ACCOUNT_URL`, `VITE_SUPPORT_URL`, `VITE_RAGO_SERVER=staging` | interface | liens Premium, compte, Discord ; `staging` affiche le bandeau de test, la recherche de mise à jour des Paramètres et le bouton qui copie le jeton Rago Route |
| `plugins.updater.pubkey` (de `RAGO_UPDATER_PUBKEY`) | `update.rs` | sans elle, pas de mise à jour automatique |
| `identifier` (`tauri.conf.json`, fusionné avec `tauri.staging.conf.json` pour l'exe de test) | `build.rs` → `RAGO_IDENTIFIER` | dossier `%APPDATA%\<identifiant>`, nom du canal nommé, `server_name()` = `staging` ou `production` |

**Chiffrement des scripts** (`seal.rs`, `embed_scripts.rs`) : aucune commande n'est en clair dans l'exe. Deux paquets : gratuit + retours arrière (clé reconstruite dans le binaire, `seal::offline_key(version)`) et Premium (clé `scripts_key` envoyée par le serveur à une licence active, gardée DPAPI dans `scripts.bin`). Flux HMAC-SHA256 en mode compteur + étiquette HMAC. La version de l'app fait partie de la clé : `app_version` envoyé au serveur doit être exactement celui de `Cargo.toml`.

## 6. Fichiers sur le PC du joueur
- `%LOCALAPPDATA%\Rago\` : `license.bin` (jeton), `scripts.bin` (clé des scripts Premium), `account.bin` (jeton de compte), tous chiffrés DPAPI.
- `%APPDATA%\gg.rago.optimizer\` (staging : `gg.rago.optimizer.staging`) : `applied.json` et `history.json` (chiffrés), `background.json`, `boost.json`, `reset-pending.json`, `backup\*.reg`, `logs\` (journaux des lots, à demander au joueur), `run\` (scripts temporaires, vidé), `art\` (images des jeux), `reports\`.
- Installé : `Program Files\Rago Optimizer\` avec `resources\` (`nvidiaProfileInspector.exe`, `PresentMon.exe` ajouté par la CI).

## 7. Sécurité et garde-fous
- Jeton de licence vérifié hors ligne (signature, `exp`, empreinte « 2 sur 3 »), rafraîchi quand il reste moins de 7 jours ; requêtes HTTP `ureq` avec 15 s de délai.
- Plan gratuit revérifié par le moteur avant chaque lot (73 réglages gratuits, 30 actifs à la fois en 1.3.0).
- Jeux lancés avec le jeton de l'Explorateur, jamais en administrateur (`games.rs`).
- Pont Rago OS : canal refusé aux autres PC, limité à la session ouverte, client qui doit s'appeler `RagoOS.exe`, demandes de 64 Ko au plus ; les commandes Rago Route du pont marchent dans tous les exe (1.3.0).

## 8. Tests et commandes
`cargo test --manifest-path src-tauri/Cargo.toml` (tests du moteur, aussi lancés par la CI sur Windows), `npm run build` (TypeScript + Vite), `npm run window` (démo navigateur), `npm run tauri dev` (Windows, terminal administrateur, serveur `localhost:8787`). Voir [[Développer et tester]] et [[CI GitHub Actions]].
