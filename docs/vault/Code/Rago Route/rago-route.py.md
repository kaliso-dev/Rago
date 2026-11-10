---
type: code
tags: [code, rago-route, serveur, python]
fichier: proxy/rago-route.py
lignes: 1510
maj: 2026-11-10
---
# rago-route.py

Le programme Python de Rago Route : **sortie et relais** sur les serveurs Rago (mode `sortie`), et **client de test** pour le Mac ou un PC (mode `client`). Fiche parente : [[Code de Rago Route]] et [[Infrastructure Rago Route]]. Fonctionnalité : [[Proxy]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Les adresses IP des serveurs écrites dans le code ne sont pas recopiées ici.

## Rôle et place dans l'ensemble

- C'était le prototype du 06/11 ; il reste **le seul code des serveurs**. Le client Windows de l'app est son port en Rust, [[route.rs]], qui parle le même protocole octet pour octet.
- Sur chaque VPS (Paris, Frankfurt), il tourne comme service systemd `rago-route` sous l'utilisateur `rago-proxy`, lancé par `python3 -I /opt/rago-proxy/rago-route.py sortie` (voir [[install.sh]]). Le même mode `sortie` fait **à la fois sortie et relais** : il ouvre des sessions vers le serveur de jeu et fait suivre les paquets `FWD` vers une autre sortie Rago.
- Le mode `client` sert aux essais sur le Mac de Sofiene (option `--telephone` pour la 4G de l'iPhone) avec un jeton copié depuis l'exe de test (`--jeton`).
- Il n'est jamais copié à la main sur un serveur : [[fabriquer-install.py]] l'emballe dans [[install.sh]], que Sofiene colle sur le VPS.
- Dépendance unique : la bibliothèque `cryptography` (`python3-cryptography` sur les serveurs, `pip3 install cryptography` sur Mac). Sans elle, le programme s'arrête avec un message.

## Ce que le fichier expose

Ligne de commande (`principal()`, `argparse`) :
- `sortie` : `--port` (défaut `25600`), `--debit` (Mbit/s par joueur, défaut **50**), `--cle-url` (répétable, remplace les adresses des clés publiques), `--fichier-cles` (défaut `/var/lib/rago-route/cles.json`), `--sortie-rago` (répétable, remplace la liste des sorties vers lesquelles un relais fait suivre), `--sans-jeton` (tests seulement, refusé sans `RAGO_TEST_LOCAL=1`).
- `client` : `--sortie` (obligatoire), `--via` (répétable : un trajet par ce relais), `--interface` (répétable : un trajet par cette interface, ex. `en5`), `--telephone` (Mac : trouve et vérifie la 4G de l'iPhone branché en USB), `--sans-direct`, `--debit` (Mbit/s, défaut **30**), `--perte-test` (répétable, pertes simulées par trajet), `--decalage` (décale les ports locaux), `--sans-comparer`, `--sans-anti-veille`, `--jeton`.
- Variables d'environnement (tests seulement) : `RAGO_TEST_LOCAL=1` (accepte le bouclage local, autorise `--sans-jeton`), `RAGO_CIBLE_TEST=hôte:port` (remplace Hypixel et Minemen), `RAGO_COUPURE_TEST=début,durée[,0+1]` (coupe tous les trajets ou certains), `RAGO_LOG` (niveau de journal, défaut `INFO`).

Constantes (mêmes valeurs que [[route.rs]]) : `VERSION = 2`, `MAGIC = b"RR"`, `PORT_ROUTE = 25600`, types `T_OPEN` 1 … `T_FEC` 12 (le refus s'appelle `T_REFUS` ici), structures `ENTETE ">2sBB16s"`, `DATA ">II"`, `ACK ">IQI"`, `PING ">IB"`, `PONG_INFOS ">HHI"`, `FWD ">4sH"`, `CHIFFRE ">BQ"`, `FEC ">IBIH"`, `FEC_K = 4`, `FEC_ATTENTE = 15` ms, `FENETRE_REJEU = 1024`, `TAILLE_MAX = 1150` (1 257 octets avec chiffrement et relais, sous la MTU), `FENETRE = 2048`, `SONDES_MAX = 2`, `TICK = 0.005`, `RETARD_FIGE = 20` ms, `SESSION_MAX_SILENCE = 60` s.
- `CIBLES = {0: ("mc.hypixel.net", 25565), 1: ("eu.minemen.club", 25565)}` et `PORTS_LOCAUX = {25565: 0, 25566: 1}`.
- `CLES_URLS` : la route publique `/api/v1/public-key?format=pem` du serveur de licences de production et de celui de test (les deux sont acceptés).
- `SORTIES_RAGO` : l'ensemble des adresses IPv4 des sorties Rago (aujourd'hui Paris seulement). **À tenir identique à `EXITS` de [[route.rs]].**
- `SESSIONS_PAR_LICENCE = 8`, `ADRESSE_ACTIVE = 3.0` s.

## Fonctionnement détaillé

### Pièces communes

- `paquet`, `lire_entete` : en-tête de 20 octets ; un paquet d'une autre magie ou d'une autre version est ignoré (les sorties de la version 1 ne comprennent plus le client 2).
- `cles_session(prive, pub_autre, sid, pub_joueur, pub_sortie)` : X25519 puis HKDF-SHA256 (`salt = sid`, `info = "rago-route 2" + pub_joueur + pub_sortie`, 64 octets) ; `ValueError` si la clé reçue est invalide. Les 32 premiers octets chiffrent le sens joueur → sortie.
- `Sens` : ChaCha20-Poly1305, un compteur par trajet (`compteurs`), une fenêtre anti-rejeu de 1 024 par trajet (`recus`). Nonce = 3 zéros + `trajet (u8) + compteur (u64)`. Données associées = en-tête (+ clé publique du joueur pour l'`AUTH`) + ces 9 octets. `ouvrir` rend `None` pour un paquet trop court, d'un trajet ≥ 16, rejoué ou modifié.
- `Reecriture` / `reecrire_handshake` : dans le **premier paquet** du flux du jeu (handshake Minecraft), remplace le nom et le port du serveur par ceux de la cible (`mc.hypixel.net:25565` ou `eu.minemen.club:25565`), garde la version du protocole et l'état demandé. Un ancien ping (premier octet `0xFE`, avant 1.7) passe tel quel. Ensuite tout passe sans être lu (le flux Minecraft est chiffré entre le jeu et le serveur après la connexion).
- `ping_minecraft(hote, port, nom, delai=5, interface)` : ping « status » Minecraft (protocole 47, handshake état 1, requête de statut, puis ping/pong mesuré), en ms, ou `None`.
- `Prise` : socket UDP non bloquant, tampons de 1 Mio, **lu en entier à chaque réveil** (jusqu'à 1 000 datagrammes) parce qu'asyncio n'en lit qu'un par tour ; les erreurs d'envoi sont ignorées (le paquet sera renvoyé si besoin).
- `Horloge` : retard de réveil du programme ; « figé » au-delà de 20 ms, jamais deux tours de suite ; `recent()` = pire retard de la seconde en cours et de la précédente (envoyé au client dans le `PONG`).
- `Emetteur` et `Recepteur` : même logique que `Sender_` et `Receiver_` de [[route.rs]] (seau à jetons 64 Kio → 256 Kio, coût `taille + 40`, FEC XOR 1 pour 4, renvoi rapide sur l'horodatage renvoyé, sondes, `rto` plafonné à 1 s, réparation d'un seul paquet manquant par groupe).

### Accès : le jeton Rago Route (`Cles`)

- Au démarrage, lit la copie des clés dans `--fichier-cles` (liste de clés hexadécimales, JSON). Puis `tenir_a_jour()` relit **toutes les heures** chaque URL de `CLES_URLS` (délai 10 s), convertit le PEM SPKI Ed25519 en 32 octets bruts (`cle_depuis_pem` vérifie le préfixe DER `302a300506032b6570032100` et la longueur 44), et réécrit le fichier. Si une seule URL répond, les anciennes clés sont gardées en plus.
- `licence(jeton)` : jeton au format JWT à trois parties base64url. Refusé si `alg` n'est pas `EdDSA`, si `typ` n'est pas `route`, si `lic` n'est pas une chaîne, si `exp` est passé, ou si aucune clé ne valide la signature Ed25519 de `tête.corps`. Le résultat est mis en cache (`vus`, vidé des jetons expirés au-delà de 10 000), car un même `AUTH` arrive par chaque trajet. Rend l'identifiant de licence.
- Le jeton est fabriqué par le [[Serveur de licences]] (`POST /api/v1/route/token`, voir [[Code de Rago Route]]).

### Sortie (`Sortie.datagram_received`)

Pour chaque datagramme reçu sur le port `25600` :
1. **`FWD` (rôle de relais)** : lit l'adresse et le port de la sortie visée. Refusé si le port n'est pas `25600` (hors tests), si l'adresse n'est pas une IPv4 publique (`ip_publique`), si le paquet intérieur n'est pas un paquet Rago ou est lui-même un `FWD`, ou si l'adresse n'est pas dans `SORTIES_RAGO`. Sinon, retient `sid → (adresse du joueur, adresse de la sortie, heure)` et envoie le paquet intérieur à la sortie. Le relais ne voit que des octets chiffrés.
2. **Réponse d'une sortie à un relais** : si le `sid` est connu dans la table du relais et que l'expéditeur est cette sortie, le paquet repart vers le joueur. Les entrées de relais muettes depuis 60 s sont effacées.
3. **Session connue** : `dechiffrer` puis `recu`. Un paquet qui ne s'ouvre pas est ignoré sans réponse.
4. Au-delà de **500 sessions**, tout nouveau paquet est ignoré.
5. **`OPEN`** (≥ 32 octets) : rien n'est gardé ; la sortie répond `HELLO` = sa clé publique X25519 + le ping Minecraft qu'elle mesure vers chaque cible (u16 en ms, `0` = inconnu, dans l'ordre des index). L'app s'en sert pour choisir la meilleure sortie.
6. **`AUTH`** (≥ 32 + 9 + 17 octets) et au plus **50 ouvertures par seconde et par adresse IP** (`_autoriser`, un relais en porte plusieurs joueurs) : `_ouvrir` essaie la clé X25519 actuelle puis la précédente ; si aucune n'ouvre le paquet, il est ignoré. Le clair = octet de cible (0 ou 1) + jeton. Jeton invalide, ou déjà **8 sessions** ouvertes avec la même licence → `REFUS` chiffré, sans session. Sinon création de `SessionSortie` et réponse `OPEN_OK`.
7. La clé X25519 de la sortie change **toutes les heures** ; l'ancienne reste valable pour les ouvertures en cours.

### Session côté sortie (`SessionSortie`)

- Ouvre la connexion TCP vers la cible (délai 10 s, `TCP_NODELAY`), lit le serveur par blocs de 64 Kio et pousse dans l'`Emetteur`. Les octets du joueur reçus avant la connexion attendent.
- Retient jusqu'à **16 adresses** du joueur (une par trajet ; au-delà, oublie les 8 plus anciennes) avec un numéro de trajet pour le chiffrement. Chaque paquet vers le joueur part vers **toutes les adresses vues depuis moins de 3 s** (le multi-trajets marche aussi dans ce sens).
- `PING` → `PONG` = le `PING` + ping Minecraft de la cible vu de la sortie + pire retard récent de la sortie + renvois de la sortie vers ce joueur.
- Le joueur revient après plus d'1 s de silence : `relancer()` renvoie tout de suite les plus anciens paquets.
- Fermeture : serveur de jeu fermé et tout envoyé (3 `CLOSE`), `CLOSE` du joueur, ou **60 s sans nouvelles du joueur** (la connexion au serveur survit à une coupure du Wi-Fi jusque-là).
- `mesurer_cibles()` : ping Minecraft de chaque cible toutes les **5 s** si quelqu'un y joue, sinon toutes les **60 s**.

### Client (Mac ou PC de test)

- `Client.preparer()` : un trajet `direct` vers `--sortie`, un par `--via` (emballé en `FWD`), un par `--interface`, et la 4G de l'iPhone avec `--telephone`. `lier_interface` colle un socket à une interface (`IP_BOUND_IF` = 25 sur Mac, `SO_BINDTODEVICE` sur Linux, `IP_UNICASTIF` = 31 sur Windows).
- `preparer_telephone` (Mac seulement) : `networksetup -listallhardwareports`, `ipconfig getifaddr`, `route -n get` ; si le Mac passe déjà par l'iPhone, garde le câble puis le Wi-Fi pour les autres trajets ; vérifie la 4G par `ping -c 4 -b <interface>` vers la sortie ; messages d'aide en 4 étapes si l'iPhone ne partage pas.
- `garder_eveille_mac()` : appelle `NSProcessInfo beginActivityWithOptions` par `ctypes` pour que macOS ne ralentisse pas le programme quand le Terminal passe derrière Minecraft (App Nap).
- Écoute `127.0.0.1:25565` (Hypixel) et `:25566` (Minemen) ; `PING` toutes les 0,5 s, affichage toutes les 5 s (par trajet : aller-retour, pertes, part arrivée en premier, Mo reçus ; puis sauvés, réparés, renvois, ping de la sortie, retard du programme). `comparer()` toutes les 15 s pendant une partie : ping Minecraft par le tunnel et en direct au même moment.
- Un `REFUS` affiche : « La sortie refuse l'accès : il faut un jeton Rago Route valable (--jeton, compte Premium, 6 h). »

## Données touchées

- Réseau : UDP `25600` (entrée), TCP sortant vers `mc.hypixel.net:25565` et `eu.minemen.club:25565`, HTTPS vers la route `/api/v1/public-key` du serveur de licences.
- Disque : `/var/lib/rago-route/cles.json` (copie des clés publiques, rien de secret ; dossier créé par `StateDirectory=rago-route` du service).
- Journal systemd : « clés publiques du serveur de licences : N », « nouvelle session … vers … », « licence …xxxxxx : trop de sessions à la fois » (6 derniers caractères de la licence seulement), « joueur silencieux depuis 60 s ».

## Erreurs et cas limites

- Tout paquet invalide est **ignoré sans réponse** (pas d'oracle pour un attaquant).
- Si le serveur de licences ne répond pas, la sortie continue avec les clés du fichier ; sans aucune clé, tout jeton est refusé.
- Un jeton est accepté jusqu'à son `exp`, même si la licence est révoquée entre-temps (vérification hors ligne) : la durée courte (6 h au plus) limite ce cas.

## Liens avec le reste

- Client Windows : [[route.rs]] (même protocole). Interface : [[RouteTab.tsx]].
- Jeton : [[license.rs]] et le [[Serveur de licences]] ; clé publique : [[Clés et secrets]] (on ne touche jamais aux clés de signature).
- Installation : [[fabriquer-install.py]] → [[install.sh]] ; ping de contrôle : [[mcping.py]] ; règles du dossier : [[CLAUDE.md (proxy)]].
- Historique des essais et mesures : [[Proxy]] ; serveurs : [[Infrastructure Rago Route]].

## Tests

Pas de tests automatiques dans le dépôt pour ce fichier. Les essais se font en local avec `RAGO_TEST_LOCAL=1` (`--sans-jeton`, `RAGO_CIBLE_TEST`, `RAGO_COUPURE_TEST`, `--perte-test`) et en réel depuis le Mac (journal dans [[Proxy]]).

## À savoir avant de modifier

- Après **toute** modification : `python3 proxy/fabriquer-install.py` pour régénérer [[install.sh]], puis Sofiene le relance sur chaque VPS. Vérifié le 10/11 : `install.sh` contient exactement le `rago-route.py` et le `mcping.py` actuels.
- Le protocole doit rester identique à [[route.rs]] ; changer le format oblige à changer `VERSION` des deux côtés.
- `SORTIES_RAGO` et `EXITS`/`RELAYS` de [[route.rs]] vont ensemble.
- Ne jamais lancer une sortie publique avec `--sans-jeton` : elle laisserait n'importe qui passer par le serveur (c'est la raison du retrait de l'ancien `relay.py` le 08/11).
