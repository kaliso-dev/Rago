---
type: code
tags: [code, app, rust]
fichier: app/src-tauri/src/lib.rs
lignes: 1767
maj: 2026-11-11
---
# lib.rs

Point d'entrée de toute l'app côté Rust : il déclare les 42 modules, construit l'état partagé `AppState`, enregistre les **93 commandes Tauri** que l'interface React appelle, lance les fils permanents au démarrage (`run()`) et répond au pont de [[Rago OS]]. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnement d'ensemble : [[Architecture de l'app]], [[App Windows]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`). Fichier créé le 07/10 (1.1.5), 37 commits depuis : c'est le fichier le plus modifié du cœur.

Ajouts du 11/11 pour [[Couleurs et résolution]] (module `display`, 5 commandes `display_*`, résolution posée par `game_launch`, fil des jeux, `RunEvent::Exit`) : PR #93. Aussi le 11/11 : `gamecfg` et 3 commandes `graphics_*` (PR #94), `tips` et `tips_done`, `tips_mark` (PR #91), 6 commandes `tools_*` (PR #90), la priorité haute du jeu dans le fil des jeux (PR #89). Tout est dans `staging` depuis la PR #92, **jamais testé sur Windows**.

## Rôle et place dans l'ensemble
- `main.rs` ([[main.rs]]) n'appelle que `rago_hub_lib::run()`, défini ici.
- Les modules métier ne connaissent pas Tauri (sauf [[overlay.rs]], [[background.rs]] et [[update.rs]], qui reçoivent un `AppHandle`) : `lib.rs` fait le lien entre eux et l'interface. Chaque commande lourde passe par `tauri::async_runtime::spawn_blocking` pour ne pas bloquer le fil de l'interface (PowerShell, réseau, registre).
- Les règles de l'offre (Premium, places du plan gratuit, remise en cours) sont vérifiées **ici**, dans `start_tweaks`, pas dans le moteur ([[runner.rs]]).
- Le front n'a aucun accès réseau (CSP `connect-src ipc:`, voir [[Configuration Tauri]]) : tout appel au serveur passe par une commande de ce fichier, puis [[license.rs]] ou [[account.rs]].

## Ce que le fichier expose

### État partagé
`struct AppState` (géré par `app.manage`, lu par `State<'_, AppState>`) :

| Champ | Type | Rôle |
|---|---|---|
| `runner` | `Arc<Runner>` | moteur des lots, un seul à la fois ([[runner.rs]]) |
| `history` | `Arc<History>` | historique chiffré ([[history.rs]]) |
| `ledger` | `Arc<Mutex<Ledger>>` | réglages appliqués + état d'avant, `applied.json` ([[backup.rs]]) |
| `license` | `Arc<License>` | licence, empreinte du PC, appels serveur ([[license.rs]]) |
| `account` | `Arc<Account>` | compte : nom public, photo, avis ([[account.rs]]) |
| `reset` | `Arc<Reset>` | remise de fin de licence ([[reset.rs]]) |
| `system` | `Arc<Mutex<Option<SystemInfo>>>` | cache de la sonde matérielle ([[system.rs]]) |
| `stats` | `stats::Sampler` | RAM, processeur, carte graphique en direct ([[stats.rs]]) |
| `library` | `Arc<games::Library>` | bibliothèque de jeux ([[games.rs]]) |
| `updates` | `Arc<update::Updates>` | mise à jour téléchargée ([[update.rs]]) |
| `resource_dir` | `PathBuf` | `<dossier d'installation>\resources` |
| `data_dir` | `PathBuf` | `%APPDATA%\gg.rago.optimizer` (staging : `gg.rago.optimizer.staging`) |
| `repaired` | `AtomicBool` | vrai si [[repair.rs]] a supprimé une valeur à ce lancement |

Sont aussi gérés à part (par `app.manage`) : `Arc<Background>` ([[background.rs]]), `Arc<overlay::Overlay>` ([[overlay.rs]]), `Arc<session::Session>` ([[session.rs]]), `Arc<display::Display>` ([[display.rs]]), `Arc<boost::Boost>` ([[boost.rs]]).

Méthodes : `AppState::system(refresh)` (sonde mise en cache par `probe_cached`) et `AppState::context(app, premium)`, qui fabrique le `runner::Context` d'un lot : `logs_dir = data_dir\logs`, `run_dir = data_dir\run`, `backup_dir = data_dir\backup`, `adapter` = carte réseau active de la sonde, `stop_when = None`. Quand `app` est `None` (remise à zéro), aucun événement n'est émis.

### Fonctions internes importantes
- `keep_undo(ledger, bundle)` (`pub(crate)`, aussi utilisée par [[reset.rs]]) : remplit dans `applied.json` l'annulation des réglages qui n'en ont pas encore (appliqués avant 1.1.6), via `Ledger::fill_undo` et `catalog::undo_of`, puis enregistre. Ainsi l'annulation reste utilisable après une déconnexion.
- `start_tweaks(app, state, items)` : lance un lot avec les règles de l'offre (détail plus bas). Appelée par `run_tweaks` et par le pont (`tweak`, `game_mode`).
- `reset_after_license(app, bundle)` : remise de fin de licence en arrière-plan (détail plus bas).
- `keep_route_token(lic)` : renouvelle le jeton de Rago Route (détail plus bas).
- `quit(app)` : action « Quitter » du menu de l'icône près de l'horloge.
- `server_name()` : `"staging"` si `RAGO_IDENTIFIER` (posé par [[build.rs]]) finit par `.staging`, sinon `"production"`. Sert au rapport de support.
- `now_ms()`, `minecraft_dir(dir)` (par défaut `%APPDATA%\.minecraft`, erreur `"Minecraft folder not set"`), `preset_path(path)`.
- `bridge_presets()`, `BRIDGE_TWEAKS`, `bridge_handler(app)` : le pont avec Rago OS.
- `pub fn run()` : le démarrage.

### Les 93 commandes Tauri
Ordre de `generate_handler!`. Côté interface, chaque commande est appelée par `invoke("<nom>")` depuis `app/src/lib/api.ts`. Les erreurs sont des `String`, sauf les commandes de licence et de compte qui renvoient un `license::ApiError {code, message, buy_url}`.

**Système, RBW, Outils** ([[Page Outils]], [[RBW Mod]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `get_system_info` | `refresh?: bool` → `SystemInfo` | sonde du PC ([[system.rs]]), en cache sauf `refresh = true` |
| `rbw_status` | → `Vec<rbw::Check>` | ce que lit le vérificateur de Ranked Bedwars ([[rbw.rs]]) |
| `tools_scan` | → `Vec<tools::Area>` | place prise par chaque zone du nettoyage ([[tools.rs]]) |
| `tools_clean` | `areas: Vec<String>` → `tools::Cleaned` | vide les zones cochées |
| `tools_apps` | → `Vec<tools::App>` | applis préinstallées ou sponsorisées présentes |
| `tools_remove_apps` | `ids` → `Vec<tools::App>` | les désinstalle (gratuit depuis 1.2.2), renvoie celles encore là |
| `tools_drivers` | → `tools::Drivers` | pilotes graphiques, réseau, son et fabricant |
| `tools_windows_update` | → `()` | ouvre `ms-settings:windowsupdate-optionalupdates` par `explorer.exe` |
| `tools_startup` | → `Vec<tools::StartupApp>` | programmes lancés avec Windows, comme le Gestionnaire des tâches (PR #90) |
| `tools_set_startup` | `id, enabled` → `Vec<tools::StartupApp>` | active ou coupe une entrée de la liste (même valeur `StartupApproved` que le Gestionnaire des tâches), renvoie la liste à jour ; refuse de couper une entrée gardée (PR #90) |
| `tools_power_plans` | → `Vec<tools::PowerPlan>` | modes d'alimentation de Windows et mode actif (PR #90) |
| `tools_set_power_plan` | `guid` → `Vec<tools::PowerPlan>` | `powercfg /setactive` sur un mode de la liste, renvoie la liste à jour (PR #90) |
| `tools_flush_dns` | → `()` | `ipconfig /flushdns` (PR #90) |
| `tools_open` | `id` → `()` | ouvre un réglage de Windows de la liste fermée `tools::PANELS` ; comme `tools_windows_update`, sans `spawn_blocking` (le programme est lancé sans l'attendre) (PR #90) |

**Moteur des tweaks** ([[Moteur des tweaks]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `run_tweaks` | `items: Vec<RunItem>` → id du lot `run-<ms>` | `start_tweaks` ; la suite arrive par `run:item`, `run:log`, `run:done` |
| `cancel_run` | → `()` | `Runner::cancel` (tue `cmd.exe` et ses enfants) |
| `is_running` | → `bool` | un lot tourne |
| `get_history` / `clear_history` | → `Vec<history::Entry>` / `()` | historique ([[history.rs]]) |
| `get_applied` | → `Vec<AppliedView>` | `keep_undo`, puis `Ledger::views` avec `Sys::read` : chaque réglage appliqué et s'il a « dérivé » (Windows a changé une valeur depuis) |
| `undo_all_plan` | → `Vec<String>` | « Tout annuler » du [[Tableau de bord]] : `reset::targets(All)`, le dernier appliqué en premier |
| `sign_out_plan` | → `Vec<String>` | réglages que la déconnexion remettra : `keep_undo` puis `targets(LicenseEnd)` |
| `take_repair_notice` | → `bool` | vrai une seule fois si [[repair.rs]] a supprimé une valeur (RAG-67) ; l'interface demande alors de **redémarrer** (pas « Arrêter » : le démarrage rapide garde le noyau) |

**Tableau de bord, RAM, réseau** ([[Tableau de bord]], [[Test réseau]], [[Packet Optimizer]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `live_stats` | → `LiveStats` | demandée chaque seconde par le tableau de bord ([[stats.rs]]) |
| `clean_ram` | `trim: bool` → `memory::Cleaned` | bouton « Nettoyer » ([[memory.rs]]) ; les dossiers des jeux de la bibliothèque (`library.install_dirs()`) ne sont jamais touchés |
| `net_test` | `ids: Vec<String>` → `Vec<Measure>` | voir plus bas |
| `netopt_state` | → `netopt::State` | état du [[Packet Optimizer]] ([[netopt.rs]]) |
| `netopt_run` | `action`, `options?` → `netopt::Outcome` | voir plus bas |

**Bibliothèque de jeux** ([[Bibliothèque de jeux]], [[games.rs]])
`games_list(refresh)`, `game_art(id)` (image en `data:` URL, gardée dans `art\`), `game_launch(id)` (pose d'abord la résolution du jeu et l'écrit dans son fichier de réglages, `display.prepare` ; `cancel_prepare` si le lancement échoue ; émet `display:state`), `launchers_list(refresh)`, `launcher_launch(id)`, `launcher_icon(id)` (`data:` URL tirée de l'exe), `preset_icons()` (logo des jeux des [[Presets]] installés, par clé de jeu), `game_add(path)` → id, `game_remove(id)`, `games_unhide()`.

**Mise à jour** ([[Mise à jour automatique]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `update_ready` | → `Option<Ready>` | mise à jour téléchargée et vérifiée (`null` : rien) |
| `update_status` | → `Option<String>` | résultat de la dernière recherche, affiché dans [[Paramètres de l'app]] de l'exe de test |
| `update_install` | → `()` | erreur `"busy"` si un lot ou une remise tourne ; sinon `install(true)` : installe et rouvre l'app |

**Arrière-plan, partie, barre en jeu** ([[Arrière-plan et démarrage]], [[Pendant la partie]], [[Barre en jeu]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `background_get` | → `BackgroundState` | `{prefs, autostart (la tâche existe), shortcutTaken, fpsAvailable}` |
| `background_set` | `prefs` → `BackgroundState` | voir plus bas |
| `session_state` | → `session::State` | mode d'alimentation, carte graphique, vérifications pendant la partie |
| `session_set_prefs` | `gpu, power, checks, priority?` → `Prefs` | enregistre les 4 options (`priority` absent = inchangé) « pendant la partie » ; prises en compte au prochain tour du fil des jeux (4 s au plus) |
| `tips_done` | → `Vec<String>` | réglages en jeu cochés « fait » ([[Conseils au lancement du jeu]]) |
| `mouse_apps` | → `Vec<mouse::MouseApp>` | logiciels lancés entre la souris et le jeu ([[Page Souris]], [[mouse.rs]]), lecture seule, dans un fil à part (`spawn_blocking`) ; PR #96 |
| `tips_mark` | `id, done` → `Vec<String>` | coche ou décoche un réglage en jeu (`Session::tips_mark`), puis émet `tips:done` (la liste) et `games:session` (l'état, `tipsLeft` recalculé) |
| `overlay_info` / `overlay_live` | → `Info` / `Live` | état de la barre en jeu |
| `overlay_close` | → `()` | ferme la barre |
| `overlay_set_pin` | `pin: bool` | garde la barre épinglée (champ `pin` des préférences) |
| `overlay_open_app` | `page?` | ferme la barre, `show_main`, puis émet `app:goto` vers la fenêtre `main` (`premium` : l'offre Premium) |
| `open_task_manager` | → `()` | lance `taskmgr.exe` (Rago ne ferme aucun processus) |

**Couleurs et résolution** ([[Couleurs et résolution]], [[display.rs]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `display_info` | → `display::Info` | qui fait la saturation sur l'écran principal (`nvidia`, `amd` ou rien), l'écran et ses résolutions |
| `display_profiles` | → profils par jeu | couleurs et résolution enregistrées (`mc:java` pour Minecraft Java) |
| `display_state` | → `display::State` | ce qui est posé en ce moment, dernière erreur |
| `display_set_profile` | `id, profile?` → `display::State` | enregistre ou retire (`profile` absent) ; erreur `premium:no_license` si le profil porte un pro **nouveau** sans licence active (import des pros en Premium, Sofiene 11/11) ; émet `display:state` |
| `display_preview` | `colors?` | aperçu des couleurs sur l'écran principal (rendu tout seul après 8 s) ; absent : fin de l'aperçu |

**Minecraft, PC, dossiers, support** ([[Partage et support]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `minecraft_status` / `minecraft_restore` | `dir?` | état et restauration d'`optionsof.txt` ([[minecraft.rs]]) |
| `graphics_status` | `game` → `gamecfg::Status` | fichiers de réglages du jeu trouvés, en lecture seule, niveau actuel, copie d'avant, jeu en cours ([[gamecfg.rs]]) |
| `graphics_apply` | `game, level` → `gamecfg::Outcome` | écrit Performance, Équilibré ou Qualité ; erreurs `running`, `not_found`, `locked`, `unknown_format`, `unknown_game`, `unknown_level` |
| `graphics_restore` | `game` → nombre de fichiers remis | remet les copies `.rago-original` ; erreurs `running`, `no_backup`, `locked` |
| `restart_pc` | → `()` | `shutdown.exe /r /t 5 /c "Rago Optimizer: restarting to apply your tweaks"` (fenêtre cachée, [[shell.rs]]) |
| `open_folder` | `kind: logs \| resources \| data` | ouvre seulement ces dossiers dans l'Explorateur (l'app est administrateur : `explorer.exe` sur un chemin quelconque pourrait lancer un programme) ; sinon `"Unknown folder"` |
| `support_report` | `parts` → `report::Report` | voir plus bas |
| `show_report` | `name` | montre un rapport sélectionné (`explorer /select,`) ; le nom doit commencer par `rago-report-`, finir par `.txt`, sans `/`, `\`, `:` ni `..`, et exister dans `reports\`, sinon `"Unknown report"` |
| `save_preset_file` | `path, code` | écrit un fichier `.rago` ; le code doit commencer par `RAGO` et faire au plus `PRESET_FILE_MAX` = 64 Ko ; erreurs `"Not a .rago file"`, `"Not a preset code"` |
| `read_preset_file` | `path` → code | lit un `.rago` de 64 Ko au plus (`"File too large"`), retire le BOM UTF-8 et les espaces |

**Licence** ([[Licence dans l'app]], [[Connexion Google et Discord]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `license_status` | → `Status` | état local (hors ligne) |
| `license_login` | `email, password` → `LoginResult` | e-mail nettoyé (`trim`), puis `/auth/login` |
| `license_link_start` | `provider` → `Link` | `/auth/app-link/start`, puis ouvre `url?p=google` ou `?p=discord` dans le navigateur par le plugin opener ; tout autre `provider` ouvre l'URL sans `p` |
| `license_link_poll` | `link_id, poll_token` → `Option<LoginResult>` | `null` tant que le joueur n'a pas confirmé dans le navigateur |
| `license_activate` | → `Status` | lie la licence à ce PC |
| `license_refresh` | → `Status` | voir plus bas |
| `license_sign_out` | → `()` | voir plus bas |

**Compte et abonnement** ([[Abonnement dans l'app]]) : `account_me`, `account_login(email, password)`, `account_sign_out`, `account_save_review(rating: u8, comment, name?)`, `account_delete_review`, `account_set_name(name)`, `account_set_photo(data)` (image en base64), `account_remove_photo`, `account_subscription(action?)` (`cancel`, `resume` ou rien pour lire), `plans_info` (prix et durée d'essai, GET `/plans`). Toutes passent par `with_account`, qui lance la fonction de [[account.rs]] dans `spawn_blocking` ; une panique devient `ApiError("server_error")`.

**Analyse** ([[Analyse du PC]]) : `analysis_facts` → JSON = `analysis::facts()` ([[analysis.rs]]) + champ `lastMatch` (dernière partie suivie par la [[Barre en jeu]]).

**Rago Route** ([[Proxy]], [[route.rs]])
| Commande | Arguments → retour | Ce qu'elle fait |
|---|---|---|
| `route_start` | `second?` → `route::Status` | demande un jeton (`license.route_token()`), `route::turn_on(token, second)`, puis `keep_route_token` ; erreurs `premium:<code>` (`no_license`, `revoked`, `route_closed`, `network`…), `port:25565`, `udp:…`, `listen:…` |
| `route_stop` | → `()` | `route::turn_off` |
| `route_status` | → `Status` | état en direct (recopié deux fois par seconde par le moteur) |
| `route_token` | → jeton | jeton seul (6 h), pour le script Mac des essais (`--jeton`) |
| `route_links` | → `Option<LinksView>` | 2e connexions possibles (téléphone USB ou Wi-Fi, 2e box) |

## Fonctionnement détaillé

### `start_tweaks` : les règles de l'offre
Contrôles, dans cet ordre :
1. liste vide → `"No tweak selected"` ;
2. `reset.is_running()` → `"reset_running"` (une remise de fin de licence tourne sans rien à l'écran) ;
3. `premium` = licence `"active"`. Pour chaque élément qui **n'est pas une annulation** (`undo = false`), `catalog::allowed(id, variant, premium)` doit être vrai, sinon `premium_required:<id>`. Annuler reste toujours possible sans licence ;
4. sans Premium : `catalog::over_free_slots(réglages appliqués, items)` ; s'il renvoie `Some(max)` → `free_slots:<max>` (30 places, voir [[catalog.rs]]) ;
5. `needs_premium` = un élément appliqué qui n'est ni dans le paquet gratuit (`is_plain`) ni natif (`runner::is_native`). Le paquet Premium est ouvert si une licence active a la clé (`license.scripts_key()` puis `catalog::premium`). S'il en faut un et qu'il manque → `premium_scripts_unavailable` ;
6. `keep_undo`, puis `runner.start(context(Some(app), bundle), items)`.

### `reset_after_license` : la remise de fin de licence
Lancée dans un fil à chaque démarrage (`bundle = None`), après `license_refresh` qui perd le jeton, et après `license_sign_out`. Voir [[Remise à zéro]] et [[reset.rs]].
1. `due()` = `reset.noting(|| reset::due(data_dir, état de licence, ledger))`. Si rien n'est dû et qu'aucune remise ne tourne : retour immédiat (cas normal de chaque lancement ; les lots ne sont pas bloqués).
2. `reset.begin()` ; s'il renvoie faux, une remise tourne déjà et refera un tour.
3. Boucle : tant que `due()` est vrai, prend `reset::targets(ledger, LicenseEnd, bundle)` pas encore essayés (ensemble `tried` : un échec n'est essayé qu'une fois). Les lance avec `Runner::default().run_now` et un contexte sans fenêtre dont `stop_when` = « la licence est redevenue active » (reconnexion pendant la remise : elle s'arrête après le réglage en cours).
4. Plus rien à lancer : `netopt::put_back` (le Packet Optimizer revient à ses valeurs d'avant ; compte 1 réussite ou 1 échec), puis `Pending::remove`.
5. `reset.end()` renvoie `Some(quit)` quand plus aucun tour n'est demandé.
6. Si `ok + failed > 0`, émet `reset:done {ok, failed}` (petit message en bas à droite).
7. Si `quit` (la fenêtre avait été fermée pendant la remise) et que la fenêtre `main` n'est pas visible : `app.exit(0)`.

### `license_refresh` et `license_sign_out`
- `license_refresh` : ouvre le paquet Premium tant qu'il est là, `keep_undo`, puis dans `reset.noting` appelle `lic.refresh()`. Si l'erreur `drops_token()` (`invalid_token`, `bound_to_other_device`, `revoked`), écrit `reset::Pending::new(code)` **avant** de lancer `reset_after_license(bundle)`. L'interface (`store.tsx`) l'appelle au démarrage puis toutes les 24 h quand l'état est actif ou expiré.
- `license_sign_out` : `keep_undo`, puis dans `noting` : `Pending::new("signed_out").save` puis `lic.sign_out()` ; enfin `reset_after_license(bundle)`. L'interface repasse en gratuit tout de suite.

### `net_test`
Garde seulement les id connus de `nettest::TARGETS`, 16 au plus. Un fil par serveur (`std::thread::scope`), chaque essai émis en `nettest:sample`, chaque serveur fini en `nettest:measure`. Le résultat va dans `LAST_NET_TEST` (lu par le pont), puis `netshare::send(machine_guid ou nom du PC, version, résultats)` l'envoie au serveur ([[netshare.rs]]).

### `netopt_run`
`Action::parse(action)` sinon `"unknown action"`. Une action qui change Windows (`changes()`) pendant un lot ou une remise → `"busy"`. `Apply` exige Premium (`premium_required:netopt`) et le paquet ouvert (`premium_scripts_unavailable`). Les options passent par `sanitized()`. `x3d = session::dual_ccd_x3d(cpu_name)` : jamais « Performances élevées » sur un Ryzen X3D à deux CCD. Chaque ligne du moteur est émise en `netopt:line`.

### `background_set`
Raccourci nettoyé puis validé par `parse::<Shortcut>()` (sinon erreur `"shortcut"`). Langue forcée à `en` ou `fr`. `autostart_chosen` devient vrai dès que le joueur a changé l'option. Les options de partie (`game_gpu`, `game_power`, `game_checks`, `game_priority`) sont gardées de l'ancienne copie (réglées à part par `session_set_prefs`). Si l'option de démarrage a changé ou ne correspond plus à la tâche réelle : `background::set_autostart` (erreur `autostart:<e>`). Puis `save` et `sync_tray(keeps_running() || started_hidden, lang, quit)`.

### `support_report`
Construit un `report::Input` : version (`CARGO_PKG_VERSION`), serveur (`server_name()`), offre réduite à `"Premium"`, `"Premium, to renew"` ou `"Free"` (ni e-mail ni clé), dernière recherche de mise à jour, sonde, réglages appliqués (`views`), historique, `logs\`. Puis `report::mask` remplace le nom du compte (`USERNAME`), le nom du dossier de profil (différent pour un compte Microsoft), `COMPUTERNAME` et le `hostname`. Écrit par `report::write(data_dir\reports)` ([[report.rs]]). Rien n'est envoyé.

### `keep_route_token`
Un seul fil à la fois (`static ON: AtomicBool`). Tant que `route::current().running`, il dort 30 s par 30 s. Au bout de 2 h, il demande un nouveau jeton (valable 6 h) et le pose par `route::set_token`. Après un échec, il repart à 2 h − 300 s : nouvel essai 5 min plus tard.

### `quit` (menu de l'icône)
Si `reset.hold_exit()` (remise en cours) : cache la fenêtre et ne quitte pas. Sinon, si une mise à jour est prête et qu'aucun lot ne tourne : `install(false)` (sans rouvrir). Puis `app.exit(0)`.

### `run()` : le démarrage
1. `uninstall` = un argument vaut `--reset-tweaks` (`reset::UNINSTALL_ARG`). `instance::acquire(UNINSTALL_WAIT = 30 s ou 0)`. Si `!lock.starts(uninstall)` : `instance::show_other()` met l'autre fenêtre au premier plan, et ce processus s'arrête sans rien charger ([[instance.rs]]).
2. Désinstallation : `reset::uninstall()` puis retour (aucune fenêtre).
3. Plugins : `dialog`, `opener`, `updater`, `global-shortcut` (son gestionnaire appelle `overlay::on_shortcut` à l'appui).
4. `setup` :
   - `resource_dir = resource_dir()\resources` ; `data_dir = app_data_dir()` (repli `%TEMP%\RagoOptimizer`) ;
   - supprime `data_dir\run\` (scripts en clair laissés par un arrêt brutal) et le dossier de repli `%SystemRoot%\Temp\<identifiant>` ([[assets.rs]]) ;
   - `History::load(history.json)` ; `Ledger::load(applied.json)`. S'il n'existait pas : `import_history` puis `save` ; s'il est encore en clair (`needs_migration`) : `save` le réécrit chiffré ;
   - `repair::at_startup` (RAG-67) ; le résultat remplit `repaired` ;
   - `games::Library::new` ; `started_hidden` = argument `--background` ; `Background::load` ; `Session::new` ; `Display::new` (remet ce qu'un plantage a laissé) et `display.spawn` (fil qui regarde le jeu au premier plan, émet `display:state`) ; `Boost::new` (relance ce qu'une partie interrompue a laissé arrêté) ;
   - **fil des jeux** (toutes les 4 s) : `library.list(false)` une fois, puis en boucle `games::process_paths()`, `library.poll` → `games:running` si changement, exes des jeux + `javaw` de Minecraft (`session::minecraft_exe`), `session.tick(playing, exes, procs, prefs, hogs)` → `games:session` si changement (`hogs` : pendant une partie, option `game_checks` active, `tips::Hogs::tick(exes)` mesure les applis gourmandes, [[tips.rs]], gardé dans ce fil car les compteurs de Windows ne changent pas de fil ; sinon `reset` et liste vide), `display.tick(library.running_dirs(), minecraft)` → `display:state` si changement. Après 5 tours sans jeu (≈ 20 s) avec le Mode jeu total actif : `boost.off()` ;
   - `sync_tray` ; si `prefs.autostart` et pas en debug, crée la tâche de démarrage dans un fil si elle manque ;
   - `Overlay::new` (avec la `Session`, pour le rappel des conseils) + `overlay::watch` (fil `rago-overlay`) ; `manage` de `background`, `overlay`, `session`, `display`, `boost` ;
   - `show_main` si pas lancé caché ;
   - `License::new()`, `Updates::default()`, `update::watch(app, updates, machine_guid ou nom du PC)` ;
   - `manage(AppState)` ;
   - `instance::on_show_request` : quand un 2e lancement demande la fenêtre, `reset.keep_open()` puis `show`, `unminimize`, `set_focus` ;
   - `reset_after_license(None)` ; `bridge::serve(bridge_handler)` ([[bridge.rs]]).
5. `on_window_event` :
   - fenêtre `overlay` : `CloseRequested` est empêché puis `overlay.close` (Alt+F4 ne la détruit jamais) ; `Focused(false)` → `on_blur` ;
   - fenêtre `main`, `CloseRequested` : remise en cours → cache ; sinon mode arrière-plan (`hides_on_close`) → cache ; sinon, mise à jour prête et aucun lot → `install(false)` ;
   - `main` `Destroyed` → `exit(0)`, même si la barre en jeu cachée existe.
6. `RunEvent::Exit` : `flows::shutdown()` (session ETW du ping des jeux, [[flows.rs]]), `route::turn_off()` et `display.shutdown()` (couleurs et résolution d'un jeu en cours rendues, [[display.rs]]).

### Le pont avec Rago OS (résumé)
`bridge_handler` répond aux demandes JSON reçues par [[bridge.rs]] (`{"cmd": …}`), avec **les mêmes règles** que l'interface. Commandes : `hello` (`bridge: 1`), `status` (offre seulement, nombre de réglages appliqués, lot en cours, `gameMode`, boost, partie en cours, mise à jour, dernier test réseau), `live`, `stats`, `clean_ram` (sans réduction des applis), `net_test` (6 serveurs au plus, par défaut `hypixel`, `paris`, `internet`), `games`, `game_launch`, `presets` (noms en français), `tweaks` (tout `BRIDGE_TWEAKS` avec `applied`, `variant`, `locked`), `tweak` (allume ou éteint un réglage par `start_tweaks` ; erreurs `unknown_tweak`, `unknown_variant`, `not_a_switch`, `not_applied`), `open` (montre l'app et émet `app:goto`, éventuellement `page#tweak`), `game_mode` (réglage `game_mode` on/off), `boost` (Premium, `premium_required:boost`), `route`, `route_servers`, `route_start` (`second` ou `phone: true`), `route_stop`. Sinon `unknown_command` ; avant la fin du démarrage, `starting`.

`BRIDGE_TWEAKS` (`LazyLock`) lit `app/src/data/catalog.json` inclus à la compilation : réglages de type `tweak` ou `action`, sans les natifs (`mc_optifine`, `nv_profile`, `rst_point`) ni ceux marqués `native`, avec nom français et anglais, risque, redémarrage, avertissement `confirm`, variantes.

## Données touchées
- Disque : suppression de `run\` et du dossier de repli au démarrage ; fichiers `.rago` choisis par le joueur ; `reports\`.
- Événements émis ici : `reset:done`, `nettest:sample`, `nettest:measure`, `netopt:line`, `games:running`, `games:session`, `display:state`, `app:goto`, `tips:done`. Les autres (`run:*`, `update:ready`, `overlay:mode`, `overlay:nudge`) viennent de [[runner.rs]], [[update.rs]] et [[overlay.rs]].
- `static LAST_NET_TEST: Mutex<Option<(u64, Vec<Measure>)>>` : dernier test réseau (app ou Rago OS), pour que Rago OS l'affiche sans relancer 10 s de mesures.

## Erreurs et cas limites
- Une panique dans un `spawn_blocking` devient le texte de l'erreur (commandes `String`) ou `server_error` (licence, compte).
- Les verrous du pont utilisent `unwrap_or_else(PoisonError::into_inner)` : un fil qui a paniqué ne bloque pas Rago OS. Les commandes de l'interface utilisent `unwrap()`.
- `quit` et la fermeture n'installent jamais une mise à jour pendant un lot.

## Tests
Un test dans le fichier : `bridge_tests::reglages_proposes_a_rago_os` (plus de 150 réglages, aucun natif, `game_mode` présent, `mc_optifine` et `nv_profile` absents, `defaultVariant` toujours dans les variantes). Le reste est testé dans chaque module : `cargo test --manifest-path src-tauri/Cargo.toml` ([[Développer et tester]]).

## À savoir avant de modifier
- Ajouter une commande : l'écrire avec `#[tauri::command]`, l'ajouter à `generate_handler!`, puis à `app/src/lib/api.ts`. La commande n'a besoin d'aucune permission dans `capabilities/` (ce sont des commandes de l'app, pas de plugin).
- Toute nouvelle façon de lancer des réglages doit passer par `start_tweaks` pour garder les règles de l'offre.
- Une action qui change Windows doit refuser pendant un lot ou une remise (`"busy"`), comme `netopt_run` et `update_install`.
- Ne jamais faire passer l'e-mail ou la clé par le pont ni dans le rapport : seulement l'offre.
- Le nombre de commandes (93) est cité dans [[Architecture de l'app]] : le mettre à jour si on en ajoute.
