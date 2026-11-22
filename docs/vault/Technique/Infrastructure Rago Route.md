---
type: technique
tags: [technique, rago-route, proxy, serveurs]
maj: 2026-11-10
---
# Infrastructure Rago Route

Partie technique de Rago Route (tunnel anti-lag pour Minecraft Java), état de `staging` au 10/11. Historique, mesures et décisions : [[Proxy]]. Rago Route est **en bêta**, réservé au Premium : sur `staging`, l'onglet est dans **tous les exe** depuis la PR #76 (sortie 1.3.0) ; pas encore en prod (l'app 1.3.0 n'est pas sortie et le serveur de prod n'a pas encore la route du jeton).

## Les pièces
| Pièce | Où | Rôle |
|---|---|---|
| Client Windows | `app/src-tauri/src/route.rs` (Rust, 2 228 lignes), onglet `app/src/pages/RouteTab.tsx` | ouvre `localhost:25565` (Hypixel) et `localhost:25566` (Minemen) pour le jeu, envoie chaque paquet par tous les trajets |
| Client prototype | `proxy/rago-route.py client …` (Python, Mac de Sofiene) | même protocole, options `--sortie`, `--via`, `--interface`, `--telephone`, `--jeton`, `--perte-test` |
| Sortie et relais | `proxy/rago-route.py sortie` sur les VPS | sortie : se connecte au serveur de jeu ; relais : fait suivre seulement vers les sorties de `SORTIES_RAGO` |
| Installation des VPS | `proxy/install.sh`, **généré** par `python3 proxy/fabriquer-install.py` (embarque `rago-route.py` et `mcping.py`) | un seul fichier à coller sur un VPS Ubuntu : `sudo sh install.sh` |
| Ping Minecraft | `proxy/mcping.py` | `python3 mcping.py mc.hypixel.net [port] [essais]` |
| Jeton d'accès | serveur, `POST /api/v1/route/token` | jeton `typ: route` de 6 h pour une licence Premium active ([[API du serveur]]) |

## Serveurs (Vultr, commandés par Sofiene)
| Nom | Rôle | Adresse publique | Port |
|---|---|---|---|
| `rago-paris` | sortie | `217.69.12.94` | UDP 25600 |
| `rago-frankfurt` | relais (deuxième trajet vers Paris) | `209.250.233.192` | UDP 25600 |

Cloud Compute Regular Performance (1 vCPU, 1 Go), Ubuntu 24.04, 5 $ par mois chacun ; réinstallés le 09/11 avec le protocole 2. Les autres serveurs essayés (Chicago, New York, Mumbai, ancien Frankfurt) sont supprimés.

`install.sh` fait : mise à jour, `python3`, `python3-cryptography`, `ufw`, mises à jour automatiques ; retire l'ancien proxy `relay.py` (TCP 25565/25566, ouvert à tous, abandonné le 08/11) ; copie les scripts dans `/opt/rago-proxy/` ; réglages réseau `/etc/sysctl.d/90-rago-proxy.conf` ; service systemd `rago-route` (`python3 -I /opt/rago-proxy/rago-route.py sortie`) ; pare-feu : SSH et `25600/udp` seulement ; affiche l'état et le ping vers Hypixel et Minemen. Logs : `journalctl -u rago-route`.

## Protocole (version 2, 08/11)
- UDP, paquets préfixés `RR`, version 2 ; types : OPEN, OPEN_OK, DATA, ACK, PING, PONG, CLOSE, FWD (relais), REFUSE, HELLO, AUTH, FEC.
- À chaque connexion du jeu : échange de clés **X25519** jetables, puis tout est **chiffré et signé (ChaCha20-Poly1305)** : jeton, nom du serveur, pseudo du handshake, confirmations. Un compteur par trajet sert de nonce, avec fenêtre anti-rejeu. Le relais ne voit que du chiffré.
- **Jeton** : la sortie le vérifie hors ligne avec les clés publiques du serveur de **prod et de staging** (`/api/v1/public-key?format=pem`, relues toutes les heures, gardées sur disque si le serveur ne répond pas) ; 8 connexions à la fois par licence.
- Chaque paquet part par **tous les trajets** (direct, relais, 4G du téléphone) ; la première copie gagne ; renvoi rapide sur l'horodatage des confirmations ; **paquets de secours** : un XOR pour 4 paquets répare une perte sans renvoi.
- La sortie garde la connexion au serveur de jeu **60 s** sans nouvelles du joueur (coupure Wi-Fi) et réécrit le nom du serveur dans le handshake. Le flux du jeu n'est jamais lu ni modifié (pas de triche).
- Côté Rust : un fil moteur (décisions toutes les 5 ms), un fil par trajet UDP, par port local et par connexion du jeu, reliés par un canal (pas de verrou). Tampons UDP d'1 Mo, minuterie Windows à 1 ms. `pick_exit` choisit la sortie la plus rapide quand il y en a plusieurs.

## Ajouter une sortie ou un relais
1. Sofiene commande le VPS et lance `install.sh`.
2. Ajouter l'adresse dans `EXITS` ou `RELAYS` de `route.rs`, **et** dans `SORTIES_RAGO` de `rago-route.py` pour une sortie ; régénérer `install.sh` (`python3 proxy/fabriquer-install.py`) et le relancer sur **tous** les relais.
3. Nouvelle version de l'app (exe de test d'abord, puis prod) : les adresses sont compilées dans l'app, un changement d'adresse demande une nouvelle version.

## Accès sur staging
`POST /api/v1/route/token` ne répond sur staging qu'aux e-mails de `ROUTE_TESTERS` (sinon `route_closed`), parce que les sorties acceptent aussi les jetons de staging : une carte de test ne doit pas ouvrir les vrais serveurs. Valeur réelle : À VÉRIFIER (q55). Depuis la PR #76 (1.3.0), les commandes Rago Route de l'app n'ont **plus de condition « exe de test »** : c'est le serveur qui ouvre ou refuse le jeton. Seul le bouton « copier le jeton » de l'onglet reste réservé à l'exe de test (`VITE_RAGO_SERVER === "staging"`).

## Tester
`cargo test --manifest-path app/src-tauri/Cargo.toml` (tests de `route.rs`), `cargo check --target x86_64-pc-windows-msvc` pour la compilation Windows ; tests en labo contre les serveurs Python sur Linux (variable `RAGO_CIBLE_TEST=hôte:port` pour viser un faux serveur de jeu), décrits dans [[Proxy]].

## Code
Carte de bout en bout (chemin des paquets, format des messages, chiffrement, états, versions, tests) : [[Code de Rago Route]].
- App : [[route.rs]] (client et protocole), [[RouteTab.tsx]] (onglet), [[license.rs]] (`route_token`), [[lib.rs]] (commandes `route_*`, renouvellement du jeton).
- Serveurs : [[rago-route.py]] (sortie, relais, client prototype), [[mcping.py]], [[fabriquer-install.py]], [[install.sh]], consignes [[CLAUDE.md (proxy)]].
