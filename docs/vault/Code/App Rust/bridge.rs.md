---
type: code
tags: [code, app, rust, rago-os, pont]
fichier: app/src-tauri/src/bridge.rs
lignes: 206
maj: 2026-11-10
---
# bridge.rs

Le **pont avec Rago OS** : un canal nommé Windows local par lequel Rago OS (le bureau Rago, un autre programme) lit l'état de Rago Optimizer et lui demande des actions sans que le joueur ouvre l'app. Fiche parente : [[Code de l'app (Rust)]] et [[Architecture de l'app]]. Projet : [[Rago OS]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Le fichier ne contient que le **transport** ; la liste des commandes est `bridge_handler` dans [[lib.rs]], décrite ici aussi parce qu'elle forme le contrat avec Rago OS.

## Rôle et place dans l'ensemble

- Rago Optimizer tourne avec les droits administrateur, Rago OS sans : le pont est la seule porte, et il ne fait **que ce que le joueur peut déjà faire dans l'app**, avec les mêmes règles (Premium, lot déjà en cours, remise de fin de licence).
- Lancé au démarrage de l'app par `bridge::serve(bridge_handler(app.handle().clone()))` dans le `setup` de [[lib.rs]].
- Ajouté le 07/11 (`4c05107`, avec le Mode jeu total de [[boost.rs]]) ; commandes Rago Route ajoutées le 09/11 (`2d18b13`).

## Ce que le fichier expose

- `type Handler = Arc<dyn Fn(Value) -> Result<Value, String> + Send + Sync>` : la fonction qui répond à une demande.
- `pipe_name() -> String` : `\\.\pipe\<IDENTIFIER>.bridge`, où `IDENTIFIER` vient de la variable de compilation `RAGO_IDENTIFIER` (`reset::IDENTIFIER`) : `gg.rago.optimizer.bridge` pour l'app de production, `gg.rago.optimizer.staging.bridge` pour l'exe de test. Les deux apps peuvent donc tourner côte à côte.
- `client_allowed(exe_path) -> bool` : vrai seulement si le nom de l'exe (insensible à la casse) est `ragoos.exe` ou `rago-os.exe` (développement).
- `answer(handler, line) -> Vec<u8>` : une ligne JSON en entrée, une ligne JSON terminée par `\n` en sortie.
- `serve(handler)` : lance le serveur du canal sur son propre fil (Windows seulement ; ne fait rien ailleurs).

## Fonctionnement détaillé

### Transport

1. `CreateNamedPipeW` avec `PIPE_ACCESS_DUPLEX`, `PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS` (refusé aux autres PC), instances illimitées, tampons de 64 Kio.
2. Sécurité : descripteur SDDL `D:(A;;GA;;;SY)(A;;GA;;;BA)(A;;GRGW;;;IU)` : tout pour le système et les administrateurs, lecture et écriture pour les utilisateurs de la session ouverte (interactifs). Si la conversion échoue : message `[bridge] descripteur de sécurité refusé` et le pont ne démarre pas.
3. Si la création échoue (canal déjà pris par un autre Rago Optimizer, ou refusé) : nouvel essai après **2 s**, puis toutes les **30 s** après 5 échecs. L'app n'est jamais bloquée.
4. `ConnectNamedPipe` attend un client ; chaque client est servi par **un fil à lui**, le temps d'une demande. **Une seule demande par connexion.**
5. Le fil identifie l'exe client (`GetNamedPipeClientProcessId`, `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION)`, `QueryFullProcessImageNameW`). Ce n'est pas une signature : ça écarte seulement les programmes qui ne se font pas passer pour Rago OS.
6. Lit une ligne (jusqu'au `\n`, par blocs de 4 096 octets, au plus **64 Kio** ; l'erreur `234` `ERROR_MORE_DATA` est tolérée). Une ligne vide ou trop longue n'a pas de réponse.
7. Répond : `answer(...)` si le client est autorisé, sinon `{"ok":false,"error":"client_refused"}`. Puis `FlushFileBuffers`, `DisconnectNamedPipe`, `CloseHandle` (à la fin du fil, par `Drop`).

### Format

- Demande : `{"cmd": "<commande>", ...arguments}` sur une ligne.
- Réponse : `{"ok": true, "data": ...}` ou `{"ok": false, "error": "<code>"}` sur une ligne. JSON invalide ou sans `cmd` texte : `bad_request`. Échec d'encodage : `encode`.

### Commandes (`bridge_handler` dans [[lib.rs]])

Si l'état de l'app n'est pas encore prêt : erreur `starting`. Commande inconnue : `unknown_command`.

| Commande | Arguments | Réponse / effet |
|---|---|---|
| `hello` | — | `{app: "Rago Optimizer", version, bridge: 1}` |
| `status` | — | `version`, `license: {state, plan, expiresAt}` (l'offre seulement : ni e-mail ni clé), `applied` (nombre de réglages appliqués), `running` (lot en cours), `gameMode` (`game_mode` appliqué et pas `off`), `boost` (état de [[boost.rs]]), `playing` ([[session.rs]]), `update` (version prête), `lastNetTest` (`{at, results}` du dernier test réseau de l'app ou de Rago OS) |
| `live` | — | `{game, live, fpsAvailable}` de la barre en jeu ([[overlay.rs]]) |
| `stats` | — | dernières mesures du PC (`stats.rs`) |
| `clean_ram` | — | nettoyage de la mémoire (`memory.rs`), en gardant les dossiers des jeux de la bibliothèque |
| `net_test` | `ids` (facultatif) | mesures [[nettest.rs]] en parallèle ; par défaut `hypixel`, `paris`, `internet` ; ids inconnus ignorés, **6 au plus** ; le résultat est gardé pour `status.lastNetTest`. Il n'est **pas** envoyé au serveur ([[netshare.rs]] n'est pas appelé). |
| `games` | — | liste de la bibliothèque ([[games.rs]]) |
| `game_launch` | `id` | lance le jeu (erreur `id` sans argument) |
| `presets` | — | presets du catalogue (`id`, nom et description en français, `match`, nombre de réglages) |
| `tweaks` | — | tous les réglages proposables (`BRIDGE_TWEAKS`, plus de 150 : `kind` `tweak` ou `action`, sans les réglages natifs à paramètres comme OptiFine ou le profil NVIDIA), avec `applied`, `variant`, `locked` (selon l'offre, `catalog::allowed`), `confirm` (l'avertissement que l'app montre) |
| `tweak` | `id`, `on`, `variant` (facultatif) | applique ou annule un réglage par le même moteur que l'app (`start_tweaks`) ; erreurs `unknown_tweak`, `on`, `unknown_variant`, `not_a_switch` (une action ne s'éteint pas), `not_applied` ; rend l'identifiant du lot |
| `open` | `page`, `tweak` (facultatifs) | montre la fenêtre principale et envoie l'événement `app:goto` (`page#tweak`) |
| `game_mode` | `on` | applique `game_mode` en variante `on`, ou l'annule (variante `off`) — voir [[Mode jeu]] |
| `boost` | `on` | Mode jeu total ([[boost.rs]]) ; allumer sans licence active → `premium_required:boost` |
| `route` | — | état de Rago Route ([[route.rs]] `Status`) + `available: true` + `premium` (licence active) |
| `route_servers` | — | sonde des sorties et relais (`probe_servers`) : `[{city, role, rttMs, gamePingMs}]` |
| `route_start` | `second` (nom de carte) ou `phone: true` | même règle que l'onglet : jeton Premium (`premium:<code>` sinon), 2e connexion, renouvellement du jeton ; rend l'état |
| `route_stop` | — | éteint Rago Route |

## Données touchées

- Le canal nommé local. Aucun fichier. Les commandes appellent le reste de l'app (moteur des réglages, bibliothèque, Rago Route…).
- Événement Tauri émis (par `open`) : `app:goto` vers la fenêtre `main`.

## Erreurs et cas limites

- Le commentaire de tête dit « la réponse part dans les 30 s (test réseau compris) », mais **aucun délai n'est imposé dans le code** : une commande longue (`net_test`, `route_start` qui attend le serveur de licences) tient la connexion jusqu'à sa fin. À VÉRIFIER : intention (limite côté Rago OS ?) ou oubli.
- Un deuxième Rago Optimizer de la même édition ne peut pas créer le canal : il réessaie en boucle sans gêner l'app.

## Liens avec le reste

- Commandes : [[lib.rs]] ; état et actions : [[route.rs]], [[boost.rs]], [[overlay.rs]], [[session.rs]], [[nettest.rs]], [[games.rs]].
- Contrat côté Rago OS : [[Rago OS]] (note du projet). Rago Route de bout en bout : [[Code de Rago Route]].

## Tests

- `seul_rago_os_peut_parler_au_pont` : `RagoOS.exe` et `rago-os.exe` acceptés ; `cmd.exe`, `RagoOS.exe.bat` et le vide refusés.
- `reponse_en_une_ligne` : réponse `ok`, `unknown_command`, `bad_request` (JSON invalide ou sans `cmd`).
- Dans [[lib.rs]] : `reglages_proposes_a_rago_os` (plus de 150 réglages, aucun natif, `game_mode` présent, `mc_optifine` et `nv_profile` absents).

## À savoir avant de modifier

- Ne jamais faire passer par le pont un identifiant, une clé ou un e-mail (règle écrite dans l'en-tête du fichier).
- Toute nouvelle commande doit appliquer **les mêmes règles** que le bouton de l'app (Premium, lot en cours) : passer par les mêmes fonctions (`start_tweaks`, `route::turn_on`…), pas par un raccourci.
- Changer le format de réponse casse Rago OS : `bridge: 1` dans `hello` sert de version du contrat.
