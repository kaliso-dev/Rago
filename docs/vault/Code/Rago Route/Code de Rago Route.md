---
type: carte
tags: [code, carte, rago-route]
maj: 2026-11-10
---
# Code de Rago Route

Carte du code de **Rago Route**, le tunnel anti-lag pour Minecraft Java, de bout en bout : l'app Windows ([[route.rs]] + [[RouteTab.tsx]]), le [[Serveur de licences]] qui délivre le jeton, et les serveurs Rago (`proxy/`). Fonctionnalité, historique et mesures : [[Proxy]]. Serveurs et ajout d'une sortie : [[Infrastructure Rago Route]]. Carte de tout le moteur Rust : [[Code de l'app (Rust)]].

État CONFIRMÉ (code de `staging`, 10/11). Les adresses IP des serveurs ne sont pas recopiées ici : elles sont dans `EXITS`/`RELAYS` de `route.rs` et `SORTIES_RAGO` de `rago-route.py`.

## Les notes de code

### App Windows
| Note | Fichier | Rôle en une ligne |
|---|---|---|
| [[route.rs]] | `app/src-tauri/src/route.rs` | moteur du tunnel côté joueur : ports locaux, trajets, chiffrement, renvois, FEC, choix de la sortie, 2e connexion, diagnostic du téléphone |
| [[lib.rs]] | `app/src-tauri/src/lib.rs` | commandes Tauri `route_start`, `route_stop`, `route_status`, `route_links`, `route_token`, renouvellement du jeton (`keep_route_token`), arrêt à la fermeture |
| [[license.rs]] | `app/src-tauri/src/license.rs` | `route_token()` : demande le jeton au serveur avec le jeton de licence de ce PC |
| [[RouteTab.tsx]] | `app/src/pages/RouteTab.tsx` | onglet Réseau > Rago Route : bouton, choix de la 2e connexion, diagnostic du téléphone, trajets et compteurs |

### Serveurs (`proxy/`)
| Note | Fichier | Rôle en une ligne |
|---|---|---|
| [[rago-route.py]] | `proxy/rago-route.py` | sortie et relais (mode `sortie`, sur les VPS) et client de test (mode `client`, Mac) |
| [[mcping.py]] | `proxy/mcping.py` | ping Minecraft en ligne de commande, lancé à la fin de l'installation |
| [[fabriquer-install.py]] | `proxy/fabriquer-install.py` | génère `install.sh` à partir des deux scripts |
| [[install.sh]] | `proxy/install.sh` (généré) | installe ou met à jour un VPS : paquets, réglages réseau, service `rago-route`, pare-feu |
| [[CLAUDE.md (proxy)]] | `proxy/CLAUDE.md` | consignes du dossier pour Claude |

### Serveur de licences
- `POST /api/v1/route/token` dans `licensing/src/app.js` (section « Rago Route (2026-11-08) »), signature par `signToken` de `licensing/src/tokens.js`, liste `ROUTE_TESTERS` lue par `licensing/src/config.js` (`routeTesters`). Voir [[API du serveur]] et [[Architecture du serveur]].

## Comment les pièces s'enchaînent

```
  Joueur Premium clique « Allumer » (RouteTab.tsx)
                     |
                     v
        lib.rs  route_start(second) ── license.rs route_token() ──HTTPS──> Serveur de licences
                     |                                            POST /api/v1/route/token
                     |  <── {route_token (6 h), expires_at} ───────────────┘
                     v
        route.rs turn_on(token, second) : pick_exit, start()
                     |
   Minecraft ──TCP──> 127.0.0.1:25565 (Hypixel) / :25566 (Minemen)
                     |
           moteur route.rs (fil « rago-route », tick 5 ms)
           ├── trajet direct ──────────UDP 25600──────────────┐
           ├── trajet relais ──UDP 25600 (FWD)──> relais Frankfurt ──UDP 25600──┤
           └── trajet 2e connexion (téléphone / 2e box) ──UDP 25600──────────────┤
                                                                               v
                                            sortie Paris (rago-route.py sortie)
                                            vérifie le jeton (clés publiques du serveur)
                                            réécrit le handshake ──TCP──> mc.hypixel.net:25565
                                                                     ou eu.minemen.club:25565
```

- Chaque paquet part par **tous** les trajets ; la première copie arrivée gagne, des deux côtés (la sortie renvoie vers toutes les adresses du joueur vues depuis moins de 3 s).
- [[RouteTab.tsx]] lit `route_status` toutes les **1 s** et `route_links` toutes les **3 s** ; le moteur recopie son état toutes les **500 ms**.
- [[lib.rs]] renouvelle le jeton toutes les **2 h** tant que Rago Route tourne (le jeton dure 6 h ; nouvel essai 5 min plus tard en cas d'échec).

## Ports et adresses

| Quoi | Valeur |
|---|---|
| Port local du jeu (Hypixel, cible 0) | TCP `127.0.0.1:25565` |
| Port local du jeu (Minemen, cible 1) | TCP `127.0.0.1:25566` |
| Sorties et relais Rago | UDP `25600` (`ROUTE_PORT` / `PORT_ROUTE`) |
| Cibles vues de la sortie | `mc.hypixel.net:25565`, `eu.minemen.club:25565` |
| Clés publiques du serveur de licences | HTTPS `/api/v1/public-key?format=pem` (prod et test) |
| Pare-feu des VPS | SSH + `25600/udp` seulement |

## Format des messages (protocole 2)

En-tête de 20 octets : `"RR"` (2) + version `2` (1) + type (1) + identifiant de session (16). Ensuite, sauf pour `OPEN`, `HELLO` et `FWD`, un bloc **scellé** : trajet (u8) + compteur (u64) + chiffré ChaCha20-Poly1305 + étiquette (16).

| N° | Type | Contenu |
|---|---|---|
| 1 | `OPEN` | clé publique X25519 du joueur (en clair) |
| 10 | `HELLO` | clé publique X25519 de la sortie + ping Minecraft de la sortie par cible (u16 chacun, en clair) |
| 11 | `AUTH` | clé publique du joueur (en clair) + scellé(octet de cible + jeton) |
| 2 | `OPEN_OK` | scellé, vide |
| 9 | `REFUSE` / `REFUS` | scellé, vide : jeton refusé ou 8 sessions déjà ouvertes avec cette licence |
| 3 | `DATA` | scellé(numéro u32, horodatage ms u32, ≤ 1 150 octets du jeu) |
| 4 | `ACK` | scellé(tout reçu avant u32, 64 bits suivants u64, horodatage renvoyé u32) |
| 12 | `FEC` | scellé(premier n° u32, nombre u8, horodatage u32, XOR des longueurs u16, XOR des données) |
| 5 | `PING` | scellé(horodatage u32, n° de trajet u8) |
| 6 | `PONG` | scellé(PING + ping MC de la sortie u16 + retard de la sortie u16 + renvois de la sortie u32) |
| 7 | `CLOSE` | scellé, vide (envoyé 3 fois) |
| 8 | `FWD` | session à zéro ; IPv4 (4) + port (2) de la sortie + paquet complet à faire suivre |

## Chiffrement et accès

- Une clé X25519 **jetable par connexion du jeu** côté joueur ; côté sortie, une clé changée toutes les heures (l'ancienne reste acceptée).
- HKDF-SHA256 (`salt` = identifiant de session, `info` = `"rago-route 2"` + clé du joueur + clé de la sortie) → 64 octets : 32 pour chaque sens.
- Nonce = 3 zéros + trajet + compteur ; un compteur par trajet et par sens ; fenêtre anti-rejeu de 1 024 par trajet. L'en-tête est authentifié (AAD).
- **Jeton Rago Route** : format JWT à trois parties, en-tête `{alg: "EdDSA", typ: "JWT", kid}`, corps `{typ: "route", lic, iat, exp}` (identifiant de licence seulement, aucune donnée personnelle), signé avec la **même clé** que les licences (aucune clé nouvelle ou changée ; voir [[Clés et secrets]]).
- Côté app, `License::route_token()` ([[license.rs]]) n'appelle le serveur que si la licence de ce PC est active (sinon `no_license`) et renvoie `server_error` si la réponse n'a pas de champ `route_token`.
- Côté serveur de licences, `POST /api/v1/route/token` : jeton de licence de l'app en `Authorization: Bearer` (vérifié `typ: license`) ; au plus **60 demandes par heure et par licence** (`rate_limited`) ; licence et compte cohérents, sinon `invalid_token` ; compte banni → `account_banned` ; licence non active → `revoked` (avec `reason: subscription_ended` et un lien d'achat quand l'abonnement est fini) ; `token_version` changée (appareil libéré ou relié) → `invalid_token` ; sur le serveur de **test**, compte absent de `ROUTE_TESTERS` → `route_closed` (403, « Rago Route isn't open to this account yet. »). Durée : `min(6 h, fin de validité du jeton de licence)`. Réponse `{route_token, expires_at}`.
- Côté sortie : vérification hors ligne avec les clés publiques (prod et test) relues toutes les heures ; 50 ouvertures par seconde et par adresse IP ; 8 sessions par licence ; 500 sessions au total.

## États

- **App** (`Status`) : éteint → `running` (onglet « prêt », orbe `good`) → `playing` (une session ouverte, orbe `great`). `error = "token"` quand la sortie a refusé le jeton ; erreurs de démarrage `premium:<code>`, `port:25565`, `listen:…`, `udp:…`, `no path`.
- **Session côté joueur** : créée à la connexion du jeu → `OPEN` toutes les 200 ms → `HELLO` reçu (clés) → `AUTH` toutes les 200 ms → `OPEN_OK` (ouverte) → fin du jeu et tout confirmé → 3 `CLOSE`. `REFUSE` avant l'ouverture → fermée.
- **Session côté sortie** : `AUTH` valable → connexion TCP au serveur de jeu (10 s) → échanges → fermeture par `CLOSE`, fin du serveur, ou **60 s** sans nouvelles du joueur.
- **Trajet** : vivant si un `PONG` est revenu depuis moins de 2 s ; ping toutes les 500 ms, toutes les 50 ms quand tous sont morts (app Windows).

## Versions du protocole

| Version | Date | Ce qui change |
|---|---|---|
| ancien proxy `relay.py` | 05/11 → 08/11 | simple relais TCP ouvert sur 25565/25566, ouvert à tous ; **retiré le 08/11** par [[install.sh]] |
| 1 | 06/11 → 08/11 | tunnel UDP multi-trajets en clair, renvoi rapide ; jeton Premium ajouté le 08/11 (`7ba0250`) |
| 2 | depuis le 08/11 (`83f4913`) | X25519 + ChaCha20-Poly1305, compteurs par trajet, anti-rejeu, FEC, `HELLO`/`AUTH`, `REFUSE` chiffré ; puis ping de la sortie dans le `HELLO` pour choisir la sortie (`05f34bd`). Une app v2 ne parle pas à une sortie v1. Paris et Frankfurt réinstallés le 09/11. |

## Tests faits (résumé ; détail dans [[Proxy]])

- **Unitaires** : 11 tests dans [[route.rs]] (`cargo test --manifest-path app/src-tauri/Cargo.toml`). Aucun test automatique pour [[rago-route.py]].
- **Labo Linux** (07/11 et 08/11) : moteur Rust contre sortie et relais Python ; 20 Mo intacts avec 20 % de pertes sur chaque trajet ; coupure de 8 s tenue ; jetons expiré, falsifié ou absent refusés ; choix entre une sortie muette et une vivante en 623 ms.
- **Mac de Sofiene** (client Python, 06/11 au 07/11) : tunnel légèrement meilleur que le direct (≈ 107–110 ms contre 113–115 ms) ; 4G de l'iPhone en secours ; coupure du Wi-Fi de 30 s tenue (la 4G du moment était mauvaise).
- **PC Windows de Sofiene** (exe de test) : premier essai le 07/11 au soir (direct vers Paris 13 ms, Frankfurt 35 ms, sortie → Hypixel 91 ms) ; partie sur Hypixel le 09/11 avec le protocole 2 (« c'est bon »).
- **Pas encore fait** : partage de connexion d'un téléphone sur un vrai PC Windows (l'iPhone n'a pas été vu le 09/11), un exe de production.

## À savoir avant de modifier

- Le protocole est écrit **deux fois** (Rust et Python) : tout changement se fait des deux côtés, avec une nouvelle version.
- Nouvelle sortie ou relais : `EXITS`/`RELAYS` dans [[route.rs]] **et** `SORTIES_RAGO` dans [[rago-route.py]], puis [[fabriquer-install.py]], puis Sofiene relance [[install.sh]] sur tous les serveurs, puis nouvelle version de l'app (les adresses sont compilées dedans).
- Rago Route est dans tous les exe depuis la [[Version 1.3.0]] et réservé au Premium par le jeton ; le serveur de test ne donne de jeton qu'aux comptes de `ROUTE_TESTERS`.
