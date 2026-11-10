---
type: code
tags: [code, app, rust, réseau, packet-optimizer, premium]
fichier: app/src-tauri/src/netopt.rs
lignes: 731
maj: 2026-11-10
---
# netopt.rs

Le **Packet Optimizer** (ancien « Network Optimizer ») côté Rust : transforme les curseurs de la page en valeurs exactes de Windows (`compute`), assemble le moteur PowerShell chiffré, le lance, lit ses lignes et garde la dernière application. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Packet Optimizer]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Portage de `network_optimizer.bat` v2 de Sofiene (22/10/2026) ; noms et réglages experts refaits le 27/10 (`b4caa2c`).

## Rôle et place dans l'ensemble

- **Aucun réglage ne raccourcit la route : le ping ne baisse pas.** Ce qui change, c'est la façon dont Windows envoie, reçoit, confirme et renvoie les paquets (tampons de la carte, reprise TCP après une perte, délai des ACK, marquage QoS, économies d'énergie, trafic de fond).
- Commandes Tauri dans [[lib.rs]] : `netopt_state` (état) et `netopt_run(action, options)` (lignes envoyées par l'événement `netopt:line`, résultat final en retour). Interface : [[NetOpt.tsx]] (et `lib/netopt.ts`).
- Moteur : trois scripts [[common.ps1]] (partie gratuite : remettre, valeurs de Windows, tests), [[apply.ps1]] (partie **Premium** : appliquer) et [[main.ps1]] (point d'entrée). Ils sont **chiffrés dans l'exe** par `embed_scripts.rs` comme les autres scripts : `{"netopt": common.ps1, "netopt.main": main.ps1}` dans la partie gratuite, `{"netopt.apply": apply.ps1}` dans la partie Premium (voir `seal.rs` et `catalog.rs`, et [[Moteur des tweaks]]).
- À la désinstallation ou à la fin de licence, [[lib.rs]] appelle `put_back` (remise des valeurs d'avant) avec les autres réglages ([[Remise à zéro]]).

## Ce que le fichier expose

### `Options` (choix de la page, les `O_*` du .bat ; `camelCase`, valeurs par défaut = profil Équilibré, fibre)
| Champ | Sens | Défaut |
|---|---|---|
| `smart` | priorité au trafic du jeu (marque QoS sur Minecraft, gros téléchargeurs en fond) | `true` |
| `latency` | 0 = latence la plus basse (tampons coupés), 100 = Windows | 50 |
| `responsiveness` | 0 = Windows, 100 = renvoi le plus rapide | 60 |
| `tuning` | fenêtre de réception : 0 auto (selon la ligne), 1 normal, 2 restricted, 3 highly restricted, 4 disabled, 5 experimental, 6 laisser | 0 |
| `line` | 1 fibre, 2 câble, 3 VDSL, 4 ADSL, 5 Wi-Fi, 6 4G/5G, 7 satellite | 1 |
| `stable` | ligne stable | `true` |
| `competitive` | performances de Windows pour le jeu | `false` |
| `mtuMode`, `mtu` | 0 laisser, 1 automatique, 2 valeur ; valeur 576–1500 | 1, 1500 |
| `delay` | 0 = ACK immédiat, 100 = Windows | 30 |
| `priority` | force du marquage QoS (0 aucun … 100 CS6) | 60 |
| `congestion` | 0 laisser, 1 CUBIC, 2 NewReno, 3 CTCP, 4 DCTCP, 5 BBR2 | 0 |
| `priorityMode` | priorité processeur Haute pour Minecraft | `false` |
| `powerSaving` | couper les économies d'énergie de la carte | `true` |
| `wifi` | Wi-Fi à pleine puissance | `false` |
| `bgGuard` | Windows Update ne partage plus vers d'autres PC | `false` |
| `target` | serveur des tests et du MTU automatique | `1.1.1.1` |
| `preset` | profil choisi (affichage) | `balanced` |
| `expert` | valeurs exactes : `minRto`, `initialRto`, `icw`, `ackFrequency`, `ackTimeout`, `dscp`, `timestamps`, `ecn`, `interruptModeration` (vides : suivent les curseurs) | — |

- `sanitized()` ramène tout dans ses bornes (`:sanitize` du .bat) : `latency`, `responsiveness`, `delay`, `priority` ≤ 100 ; `tuning` ≤ 6 ; `line` 1–7 ; `mtuMode` ≤ 2 ; `mtu` 576–1500 ; `congestion` ≤ 5 ; `preset` 24 caractères alphanumériques ou `_` ; experts : `minRto` 20–300, `initialRto` 300–3000, `icw` 2–64, `ackFrequency` 1–255, `ackTimeout` 10–600, `dscp` ≤ 63. Une cible invalide redevient `1.1.1.1`.
- `valid_target(t)` : 1 à 253 caractères, commence par une lettre ou un chiffre, seulement lettres, chiffres, `.`, `:`, `-`. La cible passe au moteur **par une variable d'environnement, jamais dans le texte du script** (pas d'injection).

### `compute(options) -> Values` (les `C_*` du .bat, mêmes formules et arrondis entiers)
- **Latence** : `agr = 100 − latency`. Limitation réseau multimédia coupée si `agr ≥ 1` ; RSC coupé si ≥ 20 ; regroupement de paquets coupé si ≥ 40 ; contrôle de flux coupé si ≥ 50 ; LSO coupé si ≥ 60 ; modération des interruptions : `2` (coupée) si ≥ 85, `1` (taux minimal, Intel `ITR`) si ≥ 60, sinon `0` (pilote). La valeur experte `interruptModeration` force `0` (vrai) ou `2` (faux).
- **Réactivité** `r` : `min_rto = (300 − r × 28 / 10) / 10 × 10`, `initial_rto = (1000 − r × 7) / 10 × 10`, avec un plancher selon la ligne : fibre 20/300, câble 30/300, VDSL 40/600, ADSL 60/1000, Wi-Fi 60/600, 4G/5G 100/1000, satellite 120/1000 ; ligne instable : au moins 120 et 1000. `system_responsiveness = 20 − r / 10`. Horodatages TCP et résilience RTT activés si la ligne n'est pas stable.
- **Fenêtre de réception** en auto : câble et satellite → `restricted`, VDSL et 4G → `highlyrestricted`, ADSL → `disabled`, sinon `normal`.
- **Délai** `d` : fréquence d'ACK 2 si `d ≥ 50` sinon 1 ; délai d'ACK `(10 + d × 30 / 100) / 10 × 10` ms ; `TcpDelAckTicks` 2 si `d ≥ 75`, 1 si ≥ 50, sinon 0 ; Nagle coupé (`TCPNoDelay`) si `d < 50`.
- `icw` seulement en valeur experte (arrondi pair). Congestion selon `CONGESTION = [keep, cubic, newreno, ctcp, dctcp, bbr2]`.
- `dscp_of(priority)` : 0 → 0 ; 1–19 → 32 (CS4) ; 20–39 → 34 (AF41) ; 40–59 → 40 (CS5) ; 60–89 → 46 (EF) ; 90–100 → 48 (CS6, file « voix » du Wi-Fi).

### Actions
`Action` : `apply`, `restore`, `defaults`, `quality`, `loaded`, `mtu`, `detect`, `status`. Seules `apply`, `restore`, `defaults` changent Windows (`changes()`) ; délai maximal **240 s** pour elles (la carte qui redémarre attend jusqu'à 45 s), **90 s** pour les tests.

### Autres
- `Line { action, tag, text, step, total }` (tags `ok`, `warn`, `fail`, `info`, `title`, `progress`), `Outcome { code, ok, warn, fail, result }`, `Saved { options, at, ok, warn, fail }`, `State { applied, backup, busy }`.
- `script(action, premium)`, `dir(data_dir)`, `saved`, `applied`, `state`, `run(...)`, `put_back(data_dir, run_dir)`.

## Fonctionnement détaillé

1. `netopt_run` ([[lib.rs]]) : action inconnue → `unknown action` ; action qui change Windows pendant un lot de réglages ou une remise → `busy` ; `apply` sans licence active → `premium_required:netopt` ; partie Premium du moteur introuvable → `premium_scripts_unavailable`. Les options sont `sanitized()`. Pour `apply`, `x3d` = Ryzen X3D à deux CCD (`session::dual_ccd_x3d`) : le mode Compétitif n'y change pas le plan d'alimentation.
2. `run` : **une action à la fois** (`BUSY`, sinon `busy`) ; une action qui change Windows prend aussi le verrou des lots de réglages (`runner::exclusive`).
3. `script` : `common.ps1` + (`apply.ps1` pour `apply` seulement) + `main.ps1`, séparés par `\r\n`. Écrit dans `run\netopt-<pid>-<ms>.ps1` avec un **BOM UTF-8** (PowerShell 5.1 lirait sinon le fichier dans la page de code du système), lancé puis supprimé.
4. `launch` : `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File <script>` caché, avec les variables `RN_DIR` (dossier `netopt\`), `RN_ACTION`, les 20 `C_*` (`C_TUNE`, `C_IRTO`, `C_TS`, `C_NONSACK`, `C_ECN`, `C_CCP`, `C_MINRTO`, `C_ACKTO`, `C_ACKFREQ`, `C_ICW`, `C_DELACK`, `C_NODELAY`, `C_NTI`, `C_SYSRESP`, `C_RSC`, `C_PCF`, `C_FC`, `C_LSO`, `C_IM`, `C_DSCP`), les 9 `O_*` (`O_SMART`, `O_WIFI`, `O_NPS`, `O_MTUMODE`, `O_MTU`, `O_TARGET`, `O_PMODE`, `O_COMP`, `O_BGUARD`) et `RN_X3D`. Un fil de garde tue le moteur (`taskkill /PID … /T /F`) au-delà du délai (pilote bloqué).
5. Lecture de la sortie ligne par ligne, protocole `@@NO|<tag>|<texte>` : `OK` → ok, `!` → warn, `X` → fail, `..` → info, `#` → titre, `%|i|n` → progression, `=|<json>` → résultat d'un test, `sum|ok|warn|fail` → comptes finaux. Le reste (sortie de `netsh`) est ignoré. Un message peut contenir `|`.
6. Fin : `apply` réussi (code 0) → `netopt\applied.json` ; `restore` ou `defaults` réussi → `applied.json` supprimé.
7. `put_back` : si `applied.json` existe, `restore` (si `snapshot.json` existe) sinon `defaults`, sans fenêtre et **sans licence** (partie gratuite du moteur). Rend `None` si rien n'était appliqué par Rago.

## Données touchées

- Dossier `netopt\` des données de l'app : `snapshot.json` (valeurs d'avant la première application, écrit par [[apply.ps1]]), `snapshot-restored-<date>.json` (sauvegarde archivée après une remise), `log.txt` (journal du moteur, effacé au-delà de 1 Mo), `applied.json` (dernière application).
- Fichier temporaire `run\netopt-*.ps1`.
- Windows (par le moteur) : TCP global et modèle `internet` (`netsh`), registre (multimédia, ACK par interface, IFEO de Minecraft, QoS, Game DVR, Delivery Optimization), réglages avancés et gestion d'énergie des cartes réseau, MTU, stratégies QoS, plan d'alimentation. Détail dans [[common.ps1]] et [[apply.ps1]].
- Événement : `netopt:line`.

## Erreurs et cas limites

- Appliquer **coupe la connexion quelques secondes** (redémarrage de la carte réseau).
- Le preset Minecraft PvP du catalogue (`ping_packets: hitreg`) réécrit une partie des mêmes valeurs : les deux se marchent dessus (problème connu du 29/10, voir [[Packet Optimizer]]).
- Moteur introuvable dans l'app : « The network engine is missing from the app ».

## Liens avec le reste

- Appelé par [[lib.rs]] ; utilise `catalog.rs` (`plain_engine`, `premium`), `shell.rs`, `runner.rs` (`exclusive`), `history.rs` (`now_ms`), [[session.rs]] (`dual_ccd_x3d`).
- Moteur : [[main.ps1]], [[common.ps1]], [[apply.ps1]]. Interface : [[NetOpt.tsx]]. Fonctionnalités : [[Packet Optimizer]], [[Test réseau]] (outils de diagnostic).

## Tests

`sliders_match_the_bat` (Équilibré 50 → RTO 650/160, réactivité 100 → 20/300 sur fibre, 60/1000 en ADSL, 120/1000 instable…), `latency_turns_buffers_off_one_by_one`, `tuning_follows_the_line_on_auto`, `expert_values_win_and_stay_in_range`, `target_is_a_plain_address` (refuse `x;calc`, `$(calc)`, `é.fr`…), `engine_lines_are_read`, `apply_needs_the_premium_part` (sans partie Premium : `premium_scripts_unavailable` ; `Do-Apply` et `Take-Snapshot` absents de la partie gratuite), `engine_gets_every_variable_it_reads` (chaque variable lue par les scripts est bien passée, plus de 30), `engine_text_is_safe_to_run_hidden` (scripts en ASCII, sans `Write-Host`, `Read-Host`, `pause`, `shutdown`, `Restart-Computer`).

## À savoir avant de modifier

- Toute nouvelle variable lue par un script doit être ajoutée à `env()` (le test `engine_gets_every_variable_it_reads` le vérifie).
- Les scripts doivent rester en **ASCII** et ne jamais attendre une saisie ni ouvrir de fenêtre (ils tournent cachés).
- Appliquer est Premium **deux fois** : refus dans `netopt_run` et absence de `apply.ps1` dans la partie gratuite. Remettre et tester restent gratuits (remise après fin de licence).
- Les formules doivent rester celles du `.bat` de Sofiene (tests de référence).
