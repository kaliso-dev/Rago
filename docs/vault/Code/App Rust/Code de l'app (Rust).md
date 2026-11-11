---
type: code
tags: [code, app, rust, carte]
fichier: app/src-tauri/
lignes: 23 431 (43 fichiers .rs de src/), plus build.rs 66, embed_scripts.rs 98, netopt/*.ps1 932
maj: 2026-11-11
---
# Code de l'app (Rust)

Carte du **cœur Rust de Rago Optimizer** (`app/src-tauri/`) : chaque module en une ligne, qui appelle qui, l'état partagé, les fils qui tournent en permanence, les événements envoyés à l'interface, les fichiers écrits sur disque et les clés de registre que l'app touche elle-même. Une note par fichier détaille le reste. Vue d'ensemble : [[Architecture de l'app]], [[App Windows]]. Interface React : [[Code de l'app (interface)]]. Scripts des réglages : [[Code du générateur de catalogue]].

Tout est CONFIRMÉ (code de `staging`, 11/11 : les 6 fonctionnalités de la PR #92 fusionnées, dont [[display.rs]], [[gamecfg.rs]], [[tips.rs]] et la page Outils ; pas encore testées sur Windows par Sofiene).

## Comment lire ce code
- Point d'entrée : [[main.rs]] appelle `run()` de [[lib.rs]], qui déclare les **42 modules**, crée l'état partagé et enregistre les **92 commandes** que l'interface appelle par `invoke` ([[api.ts]]).
- L'interface n'a **aucun accès réseau** (CSP, [[Configuration Tauri]]) : tout appel au serveur passe par une commande Rust.
- L'app tourne **en administrateur** (`app.manifest`) : presque tous les réglages écrivent dans `HKLM`, les services ou le BCD.
- Les scripts des réglages ne sont **jamais en clair** dans l'exe : chiffrés à la compilation ([[build.rs]], [[embed_scripts.rs]], [[seal.rs]]), le paquet Premium s'ouvre avec la clé donnée par le serveur à une licence active ([[license.rs]]).
- Tests : `cd app && cargo test --manifest-path src-tauri/Cargo.toml` ([[Développer et tester]]).

## Les modules, par domaine
### Démarrage, fenêtre et vie de l'app
| Module | Lignes | Rôle |
|---|---|---|
| [[main.rs]] | 6 | lance `rago_hub_lib::run()`, sans console en release |
| [[lib.rs]] | 1 767 | état partagé, 93 commandes, démarrage (`run()`), réponses au pont de Rago OS |
| [[instance.rs]] | 283 | une seule instance : mutex Windows, réveil de la fenêtre déjà ouverte, attente de la désinstallation |
| [[background.rs]] | 294 | préférences d'arrière-plan, icône près de l'horloge, tâche planifiée de lancement avec Windows |
| [[icon.rs]] | 189 | extrait l'icône d'un exe en PNG (bibliothèque de jeux) |
| [[update.rs]] | 202 | mise à jour signée : vérifie toutes les 4 h, télécharge, installe à la fermeture |
| [[repair.rs]] | 298 | [[Réparations au lancement]] : ce qu'une ancienne version a laissé (RAG-67 écran bleu, RAG-68 annulation faussée) |

### Moteur des réglages
| Module | Lignes | Rôle |
|---|---|---|
| [[catalog.rs]] | 1 405 | ouvre les paquets de scripts, règles du plan gratuit, cherche script, relevé et annulation |
| [[runner.rs]] | 995 | lance un lot de réglages un par un (relevé, script, annulation), journal et événements |
| [[backup.rs]] | 1 347 | relève et remet l'état d'avant (registre, BCD, tâches, alimentation), `applied.json` chiffré |
| [[history.rs]] | 292 | historique chiffré des réglages lancés (`history.json`) |
| [[reset.rs]] | 522 | remise à zéro : fin de licence, désinstallation (`--reset-tweaks`) |
| [[seal.rs]] | 156 | chiffrement des scripts et des fichiers natifs (HMAC-SHA256), clés hors ligne et par version |
| [[assets.rs]] | 139 | déchiffre `LowLatency.pow` et `extremelatencylow.nip` dans un dossier temporaire (`%RAGO_RES%`) |
| [[shell.rs]] | 65 | lance un programme sans fenêtre, droits administrateur |
| [[reg.rs]] | 110 | lecture du registre (vue 64 bits), une seule écriture |
| [[minecraft.rs]] | 185 | préréglages OptiFine (`optionsof.txt`, copie gardée avant d'écrire) |
| [[rbw.rs]] | 178 | état de ce que lit le vérificateur de Ranked Bedwars (lecture seule, [[RBW Mod]]) |

### Licence et compte
| Module | Lignes | Rôle |
|---|---|---|
| [[license.rs]] | 691 | licence : empreinte du PC, connexion (mot de passe ou navigateur), activation, jeton signé vérifié hors ligne, clé des scripts, coffre DPAPI |
| [[account.rs]] | 326 | compte : nom public, photo, avis, abonnement, prix des offres ([[Abonnement dans l'app]]) |

### Le PC
| Module | Lignes | Rôle |
|---|---|---|
| [[system.rs]] | 171 | sonde du matériel : Windows, processeur, RAM, cartes graphiques, carte réseau active, droits administrateur |
| [[stats.rs]] | 339 | RAM, processeur et carte graphique en direct (compteurs PDH) |
| [[memory.rs]] | 290 | bouton « Nettoyer » de la RAM (liste standby, réduction des applis en option) |
| [[analysis.rs]] | 169 | réglages de jeu de Windows lus pour l'[[Analyse du PC]] |
| [[tools.rs]] | 997 | [[Page Outils]] : nettoyage des fichiers inutiles (9 zones), applis préinstallées (38 paquets), pilotes ; PR #90 : applis au démarrage, modes d'alimentation, cache DNS, raccourcis vers 10 réglages de Windows |

### Jeux et parties
| Module | Lignes | Rôle |
|---|---|---|
| [[games.rs]] | 1 948 | bibliothèque de jeux : jeux et launchers installés, images, lancement, jeux en cours |
| [[gamecfg.rs]] | 1 071 | [[Graphismes des jeux]] : Performance, Équilibré, Qualité écrits dans les réglages de 6 jeux, copie d'origine gardée |
| [[overlay.rs]] | 805 | barre en jeu : jeu au premier plan, raccourci Alt+X, fenêtre de la barre, rappel des conseils |
| [[display.rs]] | 1 560 | [[Couleurs et résolution]] : saturation (NVIDIA, AMD), luminosité, contraste et gamma quand le jeu est au premier plan, résolution étirée le temps de la partie, résolution dans les fichiers de Valorant, Fortnite et CS2 |
| [[session.rs]] | 665 | [[Pendant la partie]] : carte graphique performante, plan d'alimentation, jeu en priorité haute, défait après ; vérifications et conseils |
| [[mouse.rs]] | 107 | [[Page Souris]] : logiciels de remappage, de macro, de clic automatique ou du fabricant lancés (lecture seule) |
| [[tips.rs]] | 416 | [[Conseils au lancement du jeu]] : jeu à conseils, réglages cochés, applis gourmandes, écran, Game DVR |
| [[boost.rs]] | 224 | Mode jeu total demandé par Rago OS : services non essentiels arrêtés puis relancés |
| [[fps.rs]] | 286 | FPS du jeu par PresentMon, résumé de la dernière partie |
| [[flows.rs]] | 382 | serveur du jeu en cours trouvé dans le journal réseau du noyau (ETW) |
| [[gameping.rs]] | 408 | ping du jeu en cours (Minecraft, TCP ou ICMP) |

### Réseau
| Module | Lignes | Rôle |
|---|---|---|
| [[netopt.rs]] | 731 | [[Packet Optimizer]] : valeurs calculées, moteur PowerShell chiffré (`netopt/*.ps1` : [[main.ps1]], [[common.ps1]], [[apply.ps1]]) |
| [[nettest.rs]] | 248 | [[Test réseau]] : ping, gigue, pertes vers des serveurs de jeu et des régions |
| [[icmp.rs]] | 150 | ping ICMP de Windows, dernier routeur qui répond |
| [[mcping.rs]] | 165 | ping d'un serveur Minecraft (Server List Ping) |
| [[netshare.rs]] | 92 | envoie les chiffres d'un test réseau au serveur |
| [[route.rs]] | 2 228 | Rago Route côté PC : tunnel UDP chiffré vers la sortie de Paris ([[Proxy]]) |

### Support et Rago OS
| Module | Lignes | Rôle |
|---|---|---|
| [[report.rs]] | 435 | rapport pour le support, données personnelles masquées ([[Partage et support]]) |
| [[bridge.rs]] | 206 | canal nommé local avec [[Rago OS]] |

### Compilation, données et configuration
- [[build.rs]] (66 lignes) et [[embed_scripts.rs]] (98) : refus de la clé de test en release, chiffrement des scripts et des fichiers natifs, identifiant de l'app, manifeste Windows.
- [[Scripts embarqués (JSON)]] : `scripts.json`, `probes.json`, `undo.json`.
- [[Cargo.toml]] : dépendances et profil release. [[Configuration Tauri]] : `tauri.conf.json`, permissions, manifeste, ressources. [[Installateur NSIS]] : remise à zéro à la désinstallation.

## Qui appelle qui
Relevé des `crate::<module>::` dans `src/` (hors simples constantes et tests) :

```
main.rs ─► lib.rs ─► tous les modules (commandes, run(), pont)

Réglages     runner ─► catalog, backup, history, assets, shell, minecraft, repair, reset
             catalog ─► seal, assets, backup (type Undo), shell
             backup  ─► catalog, history, license (chiffrement DPAPI), seal, shell
             reset   ─► runner, backup, catalog, history, license, netopt (put_back),
                        session (undo_all), display (undo_all), minecraft, repair, system, assets
             repair  ─► backup, catalog, history, shell
Licence      license ─► history, shell          account ─► license
PC           system ─► assets, shell   tools ─► shell   analysis ─► games, session, shell
Jeux         games ─► icon, reg, shell
             overlay ─► games, fps, gameping, background, session
             display ─► games, session, reg
             session ─► reg, shell, system, background, tips
             tips ─► games, analysis, memory, stats, reg, session
             gameping ─► flows, icmp, mcping        flows ─► icmp     fps ─► shell
Réseau       netopt ─► catalog, runner, seal, history, shell
             nettest ─► icmp, mcping     netshare ─► account, license, nettest, update
Fond         update ─► license, history, report     background ─► shell
             instance, bridge, assets ─► reset (identifiant de l'app)
Support      report ─► backup, history, system

Sans dépendance interne : shell, reg, seal, icmp, mcping, icon, memory, stats, boost, route
```

Seuls [[overlay.rs]], [[background.rs]] et [[update.rs]] reçoivent un `AppHandle` de Tauri ; [[runner.rs]] émet ses événements par une fonction passée en paramètre, ce qui permet de le tester sans fenêtre.

## L'état partagé
`AppState` (détail dans [[lib.rs]]) : `runner`, `history`, `ledger` (`applied.json`), `license`, `account`, `reset`, `system` (cache de la sonde), `stats`, `library` (jeux), `updates`, `resource_dir`, `data_dir`, `repaired`. Gérés à part : `Background`, `Overlay`, `Session`, `Display`, `Boost`.

## Les fils qui tournent
| Fil | Lancé par | Rythme | Rôle |
|---|---|---|---|
| fil des jeux | `run()` de [[lib.rs]] | 4 s | jeux en cours, [[session.rs]], applis gourmandes pendant la partie ([[tips.rs]]), résolution des jeux ([[display.rs]]), fin du Mode jeu total après ≈ 20 s sans jeu |
| fil des couleurs | [[display.rs]] (`spawn`) | 250 ms tant qu'un jeu lancé a des couleurs (sinon endormi) | couleurs du jeu au premier plan, aperçu |
| `rago-overlay` | [[overlay.rs]] | 700 ms | jeu au premier plan, barre en jeu |
| `rago-stats` | [[stats.rs]] | 1 s | mesures en direct ; s'arrête 5 s après la dernière demande |
| `update::watch` | [[update.rs]] | 4 h (30 min après un échec) | cherche une mise à jour ; s'arrête une fois la mise à jour téléchargée |
| `on_show_request` | [[instance.rs]] | à la demande | montre la fenêtre quand on relance l'app |
| `bridge::serve` + un fil par client | [[bridge.rs]] | à la demande | pont avec Rago OS |
| `keep_route_token` | [[lib.rs]] | 30 s, renouvelle toutes les 2 h | jeton de Rago Route tant que le tunnel tourne |
| `rago-route`, `rago-route-udp`, `rago-route-local`, `rago-route-jeu` | [[route.rs]] | tant que le tunnel tourne | moteur du tunnel |
| `rago-flows`, `rago-flows-idle` | [[flows.rs]] | 5 s, arrêt après 30 s sans usage | journal réseau ETW |
| `rago-fps` | [[fps.rs]] | pendant une partie | PresentMon |
| fil du lot | [[runner.rs]] | un lot à la fois | réglages lancés |
| garde-fou de désinstallation | [[reset.rs]] | 15 min au plus | la désinstallation ne reste jamais bloquée |
| création de la tâche de démarrage | [[lib.rs]] / [[background.rs]] | une fois | si `autostart` et la tâche manque |

## Les événements envoyés à l'interface
| Événement | Émis par | Contenu |
|---|---|---|
| `run:item`, `run:log`, `run:done` | [[runner.rs]] | état de chaque réglage d'un lot, lignes du journal, fin du lot |
| `reset:done` | [[lib.rs]] | fin de la remise de fin de licence (`ok`, `failed`) |
| `netopt:line` | [[lib.rs]] | lignes du moteur du [[Packet Optimizer]] |
| `nettest:sample`, `nettest:measure` | [[lib.rs]] | essais et résultats du [[Test réseau]] |
| `games:running`, `games:session` | [[lib.rs]] | jeux en cours, état de [[Pendant la partie]] |
| `app:goto` | [[lib.rs]] | page à ouvrir (demande de Rago OS ou de la barre en jeu) |
| `update:ready` | [[update.rs]] | mise à jour téléchargée |
| `overlay:mode` | [[overlay.rs]] | mode de la barre en jeu (panneau, pastille) |
| `overlay:nudge` | [[overlay.rs]] | rappel des conseils dans la pastille commencé ou fini |
| `tips:done` | [[lib.rs]] | réglages en jeu cochés « fait » |
| `display:state` | [[lib.rs]] (fil des jeux, fil des couleurs de [[display.rs]], `game_launch`, `display_set_profile`) | couleurs et résolution posées en ce moment, dernière erreur |

Ils sont écoutés par [[store.tsx]] et les pages de l'interface.

## Les fichiers sur disque
`<data>` = `%APPDATA%\gg.rago.optimizer` (exe de test : `gg.rago.optimizer.staging` ; repli si Windows ne le donne pas : `%TEMP%\RagoOptimizer`).

| Chemin | Écrit par | Contenu |
|---|---|---|
| `<data>\applied.json` (+ `.tmp`, `.bad-*`) | [[backup.rs]] | réglages appliqués et état d'avant, chiffré (DPAPI) |
| `<data>\history.json` (+ `.tmp`, `.bad-*`) | [[history.rs]] | historique des lots, chiffré |
| `<data>\background.json` | [[background.rs]] | préférences d'arrière-plan et de partie |
| `<data>\rago-autostart.xml` | [[background.rs]] | XML de la tâche planifiée, effacé après `schtasks` |
| `<data>\reset-pending.json` | [[reset.rs]] | remise de fin de licence à reprendre |
| `<data>\games.json`, `<data>\art\` | [[games.rs]] | jeux ajoutés à la main, images des jeux |
| `<data>\overlay-games.json`, `<data>\last-match.json` | [[overlay.rs]], [[fps.rs]] | jeux de la barre, résumé de la dernière partie |
| `<data>\session.json` | [[session.rs]] | ce que l'app a changé le temps d'une partie |
| `<data>\tips-done.json` | [[tips.rs]] | réglages en jeu cochés « fait » |
| `<data>\display.json`, `<data>\display-restore.json` | [[display.rs]] | couleurs et résolution par jeu, valeurs d'avant Rago des fichiers des jeux ; ce qu'il faut remettre (couleurs, rampes, résolution) |
| `<data>\boost.json` | [[boost.rs]] | services arrêtés par le Mode jeu total |
| `<data>\netopt\` (`applied.json`, `snapshot.json`) | [[netopt.rs]] | dernière application du Packet Optimizer et valeurs d'avant |
| `<data>\reports\rago-report-AAAA-MM-JJ-HHMM.txt` | [[report.rs]] | rapports pour le support (les 10 derniers) |
| `<data>\logs\run-<ms>.log`, `reset-<ms>.log`, `repairs.log` | [[runner.rs]], [[reset.rs]], [[repair.rs]] | journaux |
| `<data>\backup\<empreinte>.reg` | [[backup.rs]] | exports de clés entières avant leur suppression |
| `<data>\run\` (`*.cmd`, `res-<pid>-<ms>\`, `nvidia-defaults.nip`) | [[runner.rs]], [[assets.rs]] | scripts et fichiers natifs en clair le temps d'un lot ; vidé au démarrage |
| `%SystemRoot%\Temp\<identifiant>\` | [[assets.rs]] | repli des fichiers natifs ; vidé au démarrage |
| `%LOCALAPPDATA%\Rago\license.bin`, `scripts.bin` | [[license.rs]] | jeton de licence et clé des scripts, chiffrés (DPAPI) |
| `%LOCALAPPDATA%\Rago\account.bin` | [[account.rs]] | compte en cache, chiffré |
| `optionsof.txt.rago-<horodatage>(.bak, .none)` à côté d'`optionsof.txt` | [[minecraft.rs]] | copie avant les préréglages OptiFine |
| `<fichier de réglages du jeu>.rago-original` (GameUserSettings.ini, cs2_video.txt, videoconfig.txt) | [[gamecfg.rs]] | copie avant les graphismes des jeux |

À VÉRIFIER : `%LOCALAPPDATA%\Rago\` n'a pas de suffixe staging, alors que `<data>` en a un : l'exe de test et le vrai partagent donc la licence et le compte (voir [[license.rs]]).

## Le registre et les objets Windows que l'app touche elle-même
En dehors des scripts des réglages ([[Scripts embarqués (JSON)]]) :
- **Écrit** : `HKCU\Software\Microsoft\DirectX\UserGpuPreferences` (carte graphique performante par jeu, [[session.rs]]) ; `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore` `SystemRestorePointCreationFrequency` = 0 (point de restauration, [[runner.rs]]) ; `CoalescingTimerInterval` supprimé de 8 clés (`Session Manager\kernel`, `Executive`, `Memory Management`…, [[repair.rs]]).
- **Lu** : `HKLM\SOFTWARE\Microsoft\Cryptography` `MachineGuid` (empreinte, [[license.rs]]) ; `HKLM\SYSTEM\Select` `Current` et `…\Control\Power` `HibernateEnabled` ([[backup.rs]]) ; `GameConfigStore`, `GameDVR`, `PushNotifications` ([[analysis.rs]] ; les deux premiers aussi par [[tips.rs]] pendant une partie) ; clés des launchers et `Uninstall` ([[games.rs]]) ; clés lues par le vérificateur RBW ([[rbw.rs]]).
- **Pilotes, écran et fichiers des jeux** ([[display.rs]]) : saturation NVIDIA (NVAPI) et AMD (ADL), rampe gamma, mode d'affichage temporaire (jamais écrit dans le registre), clés de résolution des fichiers de réglages de Valorant, Fortnite et CS2 ; lit `HKCU\Software\Valve\Steam` `SteamPath` et `HKLM\SOFTWARE\WOW6432Node\Valve\Steam` `InstallPath`.
- **Tâche planifiée** « Rago Optimizer » (ou « Rago Optimizer Staging ») : lancement avec Windows ([[background.rs]]), supprimée à la désinstallation ([[Installateur NSIS]]).
- **Objets nommés** : `Local\<identifiant>.instance` et `Local\<identifiant>.show` ([[instance.rs]]) ; canal `\\.\pipe\<identifiant>.bridge` ([[bridge.rs]]) ; session ETW « Rago-GamePing » ([[flows.rs]]) ; session PresentMon « RagoOptimizerFps » ([[fps.rs]]).

## À savoir avant de modifier
- Ajouter une commande : la fonction dans le module, `#[tauri::command]` dans [[lib.rs]], l'enregistrer dans `generate_handler!`, puis l'appel dans [[api.ts]]. Une commande de plugin demande aussi une permission dans `capabilities/` ([[Configuration Tauri]]).
- Ajouter une fonction Windows : la feature `windows-sys` dans [[Cargo.toml]] ; seule la CI Windows le verra.
- Toute écriture dans le système doit pouvoir être défaite : sauvegarde par [[backup.rs]], et prise en compte par [[reset.rs]] (fin de licence, désinstallation).
