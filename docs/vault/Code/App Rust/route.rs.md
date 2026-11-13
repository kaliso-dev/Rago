---
type: code
tags: [code, app, rust, rago-route, réseau]
fichier: app/src-tauri/src/route.rs
lignes: 2228
maj: 2026-11-10
---
# route.rs

Le moteur de **Rago Route** côté PC du joueur : un tunnel UDP chiffré, multi-trajets, avec renvois rapides et paquets de secours, entre le jeu Minecraft (qui se connecte à `localhost`) et la sortie Rago de Paris. Fiche parente : [[Code de Rago Route]] (et [[Infrastructure Rago Route]]). Fonctionnalité : [[Proxy]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Le fichier est le **port en Rust du client** du prototype [[rago-route.py]] : même protocole, octet pour octet, pour parler aux mêmes serveurs sans les changer.

## Rôle et place dans l'ensemble

- Le joueur Premium clique « Allumer » dans l'onglet Rago Route ([[RouteTab.tsx]]) . [[lib.rs]] demande un **jeton Rago Route** au serveur de licences (`License::route_token()` dans [[license.rs]], route `POST /api/v1/route/token`, voir [[API du serveur]]) puis appelle `route::turn_on(token, second)`.
- `turn_on` choisit la sortie (`pick_exit`), ouvre les ports locaux `25565` (Hypixel) et `25566` (Minemen) sur `127.0.0.1`, ouvre un socket UDP par trajet et lance le fil moteur.
- Le joueur met `localhost` (ou `localhost:25566`) comme adresse de serveur dans Minecraft. Chaque connexion TCP du jeu devient une **session** du tunnel. La sortie ([[rago-route.py]] en mode `sortie`, sur le VPS de Paris) ouvre la vraie connexion TCP vers Hypixel ou Minemen et réécrit le nom du serveur dans le handshake.
- Le jeu n'est jamais modifié : le fichier ne fait que transporter des octets. Rien n'est stocké ni envoyé ailleurs qu'aux serveurs Rago.
- Historique (git) : moteur Rust et onglet de l'exe de test le 07/11 (`342d09e`), jeton Premium le 08/11 (`7ba0250`), protocole 2 chiffré + FEC le 08/11 (`83f4913`), 4G du téléphone le 08/11 (`85dd530`), liste des sorties le 08/11 (`05f34bd`), 2e connexion au choix et diagnostic du partage USB/Bluetooth le 10/11 (`3ce03b7`, `f3b9c9c`, `4d514c7`). Dans tous les exe depuis la [[Version 1.3.0]].

## Ce que le fichier expose

Constantes publiques :
- `ROUTE_PORT: u16 = 25600` : port UDP des sorties et relais Rago.
- `LOCAL_PORTS: [(u16, u8); 2] = [(25565, 0), (25566, 1)]` : port local d'écoute du jeu et index de la cible connu de la sortie (`0` Hypixel, `1` Minemen).
- `EXIT_PARIS`, `RELAY_FRANKFURT` : adresses IPv4 fixes (écrites dans le code, non recopiées ici) de la sortie Vultr Paris et du relais Vultr Frankfurt, port `25600`.
- `EXITS: &[(&str, SocketAddrV4)] = [("Paris", EXIT_PARIS)]` et `RELAYS = [("Frankfurt", RELAY_FRANKFURT)]`. **Une nouvelle sortie ou un nouveau relais se déclare ici ET dans `SORTIES_RAGO` de [[rago-route.py]]** (le relais ne fait suivre que vers les sorties Rago ; voir [[CLAUDE.md (proxy)]]).

Fonctions publiques :
- `start(cfg: Config) -> Result<Running, String>` : démarre un moteur (utilisé par `turn_on` et les tests).
- `turn_on(token: &str, second: Option<String>) -> Result<Status, String>` : pose le jeton (`set_token`), puis, si aucun moteur ne tourne, `start(Config { exit: pick_exit(EXITS), second, ..Default })`. Un seul lancement à la fois (`slot()`, un `Mutex<Option<Running>>` global). Si un moteur tourne déjà, seul le jeton change. Renvoie l'état.
- `turn_off()` : arrête le moteur (3 `CLOSE` par session, attend les fils, rend la minuterie Windows). Appelé par la commande `route_stop` et à la fermeture de l'app ([[lib.rs]]).
- `current() -> Status` : état courant (défaut si rien ne tourne).
- `set_token(t)` : remplace le jeton (les prochaines connexions du jeu l'utilisent) et oublie un refus (`REFUSED = false`).
- `pick_exit(exits) -> SocketAddrV4` : choix de la sortie (voir plus bas).
- `links() -> LinksView` : 2e connexions possibles et diagnostic du téléphone, pour l'onglet (commande `route_links`). Appelle aussi `keep_wifi` (13/11, pas encore sur `staging`) : dès qu'un téléphone partage sa 4G, passe la règle de Windows `fMinimizeConnections` à 0 (HKLM\SOFTWARE\Policies\Microsoft\Windows\WcmSvc\GroupPolicy, service WcmSvc relancé si elle change, une fois par lancement) et donne la métrique `PHONE_METRIC` = 4000 à la carte du téléphone, pour que Windows ne coupe plus le Wi-Fi et reste dessus. Fonctions pures testées : `phones_to_demote`, `keep_wifi_script` (test `keep_wifi_with_phone`). Rien n'est remis comme avant à l'arrêt ; jamais testé sur Windows.
- `nics()`, `links_of(&[Nic])`, `is_phone_hotspot(Ipv4Addr)`, `is_cellular(desc, if_type)`, `phone_check_of(usb, adapters, links, apple_net_driver)` : détection des cartes réseau et des téléphones (publiques pour les tests).

Types sérialisés vers le front (`camelCase`) :
- `Status` : `running`, `error` (`"token"` quand la sortie a refusé le jeton), `playing` (une session est ouverte), `paths: PathView[]`, `saved`, `repaired`, `packets`, `resendsHere`, `resendsExit`, `exitPingMs`, `lagHereMs`, `lagExitMs`, `ports` (`[25565, 25566]`).
- `PathView` : `kind` (`"direct"`, `"relay"`, `"phone"` ou `"second"`), `via` (ville), `rttMs` (arrondi au dixième, absent si le trajet est mort), `alive`, `lossPct`, `firstPct`, `mb`.
- `Link { name, phone }`, `LinksView { links, check: Option<PhoneCheck> }`, `PhoneCheck { phone: "iphone" | "android" | null, steps: Step[], why, details: string[] }`, `Step { code, ok }`.
- `Config` (non sérialisé) : `exit`, `relays`, `no_direct`, `rate` (octets/s par connexion du jeu, défaut `30 × 125 000` = 30 Mbit/s), `port_offset` (tests), `test_loss` (pertes simulées par trajet), `test_cut` (coupure simulée), `second` (nom de la 2e carte).

Commandes Tauri qui l'utilisent (dans [[lib.rs]]) : `route_start(second)`, `route_stop`, `route_status`, `route_links`, `route_token`.

## Fonctionnement détaillé

### Format des paquets (protocole 2)

En-tête commun de 20 octets (`HEADER`) : magie `RR` (2), version `2` (1), type (1), identifiant de session `sid` (16 octets aléatoires du système, `new_sid()` par `getrandom`). Entiers en gros-boutiste.

| Type | Nom | Sens | Contenu après l'en-tête |
|---|---|---|---|
| 1 | `OPEN` | joueur → sortie | clé publique X25519 jetable du joueur (32), en clair |
| 10 | `HELLO` | sortie → joueur | clé publique X25519 de la sortie (32), puis ping Minecraft de la sortie vers chaque cible (u16 par cible), en clair |
| 11 | `AUTH` | joueur → sortie | clé publique du joueur (32) en clair, puis scellé : octet de cible + jeton Rago Route |
| 2 | `OPEN_OK` | sortie → joueur | scellé, vide : la sortie est connectée au serveur de jeu |
| 9 | `REFUSE` | sortie → joueur | scellé : jeton refusé |
| 3 | `DATA` | les deux sens | scellé : numéro (u32), horodatage d'envoi en ms (u32), octets du jeu (≤ 1 150) |
| 4 | `ACK` | les deux sens | scellé : tout reçu avant ce numéro (u32), bits des 64 suivants (u64), horodatage renvoyé (u32) |
| 12 | `FEC` | les deux sens | scellé : premier numéro (u32), nombre (u8), horodatage (u32), XOR des longueurs (u16), XOR des données |
| 5 | `PING` | joueur → sortie | scellé : horodatage (u32), numéro du trajet (u8) |
| 6 | `PONG` | sortie → joueur | scellé : le PING renvoyé, puis ping MC de la sortie (u16), retard de la sortie (u16), renvois de la sortie (u32) |
| 7 | `CLOSE` | les deux sens | scellé, vide |
| 8 | `FWD` | joueur → relais | `sid` à zéro ; IPv4 (4) + port (2) de la sortie, puis le paquet complet à faire suivre |

« Scellé » = `trajet (u8) + compteur (u64)` (9 octets, `SEAL_HEAD`), puis le chiffré ChaCha20-Poly1305 avec son étiquette de 16 octets (`TAG`).

### Chiffrement

- À chaque connexion du jeu : une clé `x25519_dalek::EphemeralSecret` jetable. L'`OPEN` porte sa partie publique.
- `session_keys(secret, ours, exit_pub, sid)` : Diffie-Hellman ; refus si l'échange n'est pas « contributif » (`was_contributory()`, clé de la sortie invalide) ; HKDF-SHA256 avec `sel = sid` et `info = "rago-route 2" + clé publique joueur + clé publique sortie`, 64 octets : les 32 premiers pour le sens joueur → sortie (`tx`), les 32 suivants pour sortie → joueur (`rx`).
- `Dir` (un sens) : un compteur par trajet (`sent[16]`, jamais deux fois le même nonce), une fenêtre anti-rejeu par trajet (`seen[16]`). Nonce de 12 octets = 3 zéros + les 9 octets `trajet + compteur`. Données associées (AAD) = en-tête de 20 octets (+ la clé publique pour l'`AUTH`) + les 9 octets `trajet + compteur` : l'en-tête est donc signé avec le reste ; un paquet modifié, forgé ou rejoué est ignoré sans bruit.
- `Replay` : le plus haut compteur reçu et les 1 024 précédents (`REPLAY_WORDS = 16` mots de 64 bits). Un compteur plus vieux que 1 024 ou déjà vu est refusé. Une copie arrivée tard par un trajet lent n'est pas un rejeu, puisque chaque trajet a sa fenêtre.

### Ouverture d'une session

1. Le jeu se connecte à `127.0.0.1:25565` (ou `25566`). Le fil `rago-route-local` (accept non bloquant, pause de 15 ms) envoie `Event::Accept` au moteur.
2. Le moteur crée la `Session` (nouveau `sid`, clé jetable, `Sender_` et `Receiver_`), règle le socket du jeu (`nodelay`, délai d'écriture 3 s) et lance un fil `rago-route-jeu` qui lit le jeu par blocs de 64 Kio.
3. Tant que la sortie n'a pas répondu, `OPEN` part par **tous** les trajets, renvoyé toutes les **200 ms** (`tick`).
4. Au premier `HELLO` reçu : clés de session, puis tout de suite `AUTH` (cible + jeton scellés) par tous les trajets, lui aussi renvoyé toutes les 200 ms tant que la session n'est pas ouverte. Les octets du jeu reçus entre-temps attendent dans `sender.waiting`.
5. `OPEN_OK` : la session est ouverte, les octets en attente partent.
6. `REFUSE` (avant l'ouverture) : `REFUSED = true`, la session est fermée (le jeu voit la connexion se couper) et `Status.error` vaut `"token"` ; l'onglet affiche `route.err.token`.

### Envoi fiable (`Sender_`)

- Découpe le flux du jeu en morceaux de **1 150 octets** au plus (`MAX_CHUNK`, tient sous la MTU même en 4G), numérotés à partir de 0. Au plus **2 048 paquets en vol** (`WINDOW`).
- **Débit limité par seau à jetons** : départ à 64 Kio, plafond 256 Kio, rempli à `rate` octets/s (30 Mbit/s par défaut) ; chaque paquet coûte `taille + 40`.
- Chaque paquet `DATA` part **par tous les trajets à la fois** (`send_all`), chiffré pour chacun : la première copie arrivée gagne.
- **Paquets de secours (FEC)** : pour 4 paquets neufs (`FEC_K`), un paquet `FEC` = XOR des 4 (et de leurs longueurs). Un groupe incomplet d'au moins 2 paquets part après **15 ms** (`FEC_WAIT_MS`). Un paquet seul n'a pas de secours.
- **Délai de renvoi** `rto(sends)` : base 200 ms sans mesure, sinon `max(srtt + 30, 1,5 × srtt, srtt + 4 × rttvar)`, doublé à chaque renvoi, plafonné à **1 000 ms**.
- **Aller-retour** : mesuré seulement sur la première confirmation qui renvoie un horodatage donné, s'il est entre 0 et 5 000 ms ; moyenne `srtt = 7/8 srtt + 1/8 mesure`, `rttvar = 3/4 rttvar + 1/4 |écart|`.
- **Renvoi rapide** : un paquet est « dépassé » si (jamais renvoyé et un numéro plus grand déjà confirmé) ou (parti avant l'horodatage du dernier paquet arrivé de l'autre côté, `marker`). Il est renvoyé dès que son âge dépasse `srtt + max(srtt/4, 5)` ms (marge pour l'écart entre trajets).
- **Sondes** : si rien ne revient, au plus **2 paquets** (`MAX_PROBES`) parmi les plus anciens sont renvoyés quand `min(âge, silence) > min(base × 2^(envois−1), 1000)`.
- **Reprise après coupure** (`restart`) : au premier `PONG` qui revient alors que tous les trajets étaient morts, les 2 plus anciens paquets en vol repartent tout de suite.
- **Programme figé** : `Clock::beat()` mesure le retard de réveil du moteur ; au-delà de **20 ms** (`FROZEN_MS`), ce tour-là ne déclare aucune perte (jamais deux tours de suite).

### Réception (`Receiver_`)

- Remet les paquets dans l'ordre, ignore les doublons et ce qui dépasse `attendu + 4 096` (2 × `WINDOW`), livre au jeu ce qui est contigu.
- Garde les 512 derniers paquets reçus (`recent`, coupé à 256) pour réparer par FEC : un `FEC` refait le paquet **s'il en manque exactement un** dans le groupe ; il est compté dans `repaired`.
- Confirmation (`ACK`) à chaque paquet neuf, ou au plus toutes les **20 ms** pour un doublon ; elle part par tous les trajets.

### Trajets

- `direct` : socket UDP vers la sortie ; `relay` : vers le relais de Frankfurt, chaque paquet emballé dans un `FWD` (adresse de la sortie + paquet) ; `phone` ou `second` : socket collé à la 2e carte (`IP_UNICAST_IF`), direct vers la sortie.
- Avec une 2e connexion choisie, les trajets `direct` et `relay` sont collés à la carte principale (`main_nic`), même si Windows préfère la 2e pour Internet.
- Un trajet est **vivant** si un `PONG` est revenu depuis moins de **2 s**. Aller-retour du trajet : moyenne `0,8 × ancien + 0,2 × nouveau`.
- `PING` par trajet toutes les **500 ms**, ou toutes les **50 ms** quand plus aucun trajet ne répond (pour repartir dès que le réseau revient). Le ping est envoyé dans la session qui a reçu le plus de paquets (la partie en cours).
- Le `PONG` rapporte aussi le ping Minecraft mesuré par la sortie (`exitPingMs`), son pire retard de moteur et ses renvois.
- Chaque socket UDP a des tampons de 1 Mio (`SO_RCVBUF`/`SO_SNDBUF`) pour absorber une rafale (chargement des chunks). Un fil `rago-route-udp` par trajet lit avec un délai de 250 ms et un tampon de 4 096 octets ; les erreurs (y compris le « port injoignable » de Windows) sont ignorées.

### Statistiques affichées

- Toutes les 100 ms, pour les paquets arrivés il y a plus d'1 s : par quels trajets ils sont venus. Un trajet absent compte une perte (`lossPct`) ; un paquet que le **meilleur** trajet (vivant, plus petit aller-retour) n'a pas apporté compte dans `saved` (« rattrapé par un autre trajet »).
- `firstPct` : part des paquets arrivés en premier par ce trajet. `mb` : Mo reçus par ce trajet.
- L'état (`view()`) est recopié toutes les **500 ms** ; `lagHereMs` est le pire retard du moteur sur les 5 dernières secondes (pour qu'un pic reste visible).

### Fils

Un fil moteur `rago-route` (toutes les décisions, à chaque paquet ou toutes les **5 ms**, `TICK`), un `rago-route-udp` par trajet, un `rago-route-local` par port local, un `rago-route-jeu` par connexion du jeu. Ils parlent au moteur par **un seul canal** (`mpsc`) : pas de verrou dans le chemin des paquets. Le moteur traite jusqu'à 1 000 événements d'affilée. Pendant que Rago Route tourne, la minuterie Windows passe à 1 ms (`timeBeginPeriod(1)`), sinon les ticks de 5 ms dureraient 15,6 ms.

### Choix de la sortie (`pick_exit`)

Avec une seule sortie (cas actuel : Paris), elle est prise directement. Avec plusieurs : 3 tours d'`OPEN` (clé aléatoire, `sid` commun dont les octets 14 et 15 portent l'index et le tour), 200 ms par tour (600 ms au plus), sans ouvrir de session. Score = aller-retour + ping Minecraft lu dans le `HELLO` (octets 32 à 34 du corps), ou + 500 si le ping est inconnu. La plus petite gagne ; aucune réponse : la première de la liste. Rien n'est envoyé au serveur de jeu, aucun jeton.

### Cartes réseau et téléphone (Windows)

- `win::scan()` : `GetAdaptersAddresses` (IPv4, passerelles incluses ; tampon de 32 Kio, 3 essais si l'erreur est `111`, tampon trop petit). Donne les `Nic` actives (nom, IPv4 hors lien local, index, `cellular`, `gateway`, métrique) et toutes les `Adapter` (même déconnectées).
- `is_cellular` : type d'interface `243` ou `244` (haut débit mobile) ou description contenant `remote ndis`, `rndis`, `apple mobile device ethernet`, `iphone`, `android`, `usb tethering`, `mobile broadband`, `personal area network` (partage Bluetooth).
- `is_phone_hotspot` : passerelle `172.20.10.1` (tous les iPhone) ou `192.168.43.1` (beaucoup d'Android) ; les Android récents qui tirent une adresse au hasard ne sont pas reconnus mais restent proposés comme 2e connexion.
- `main_nic` : la carte avec passerelle de plus petite métrique, hors 2e connexion et, s'il y a mieux, hors téléphone. `links_of` : toutes les autres cartes avec passerelle, téléphones d'abord ; vide s'il n'y a qu'une connexion à Internet.
- `phone_check_of` (affiché seulement quand aucun téléphone ne partage encore) : déroule les étapes jusqu'à la première ratée.
  - iPhone = appareil USB `VID 05AC` et `PID 0x1290` à `0x12AF`. Étapes : `usb` → `apple_usb` (service `usbaapl*` sans problème de pilote) → `apple_net` (pilote `netaapl*` présent dans `%SystemRoot%\System32\DriverStore\FileRepository`, ou carte « Apple Mobile Device Ethernet ») → `share` (carte connectée, sinon `why = share_iphone`) → `internet` (carte avec passerelle).
  - Android = un des 16 fabricants de `ANDROID_VIDS` (Samsung, Google, Xiaomi, OnePlus, Huawei, Motorola, Oppo/Realme, Sony, LG, HTC, Vivo, Asus, ZTE, Lenovo, Nothing, Honor), sauf un disque du même fabricant (classe `diskdrive`/`scsiadapter`, service `usbstor`/`uaspstor`), ou classe `wpd`/`androidusbdeviceclass`. Étapes : `usb` → `share` (`share_android`) → `internet`.
  - Aucun téléphone : une étape `usb` ratée.
  - `details` : identifiants USB **sans numéro de série** (coupés après `VID&PID`), classe, service, cartes concernées, présence du pilote `netaapl` ; l'onglet propose de les copier pour le support.
- `win::usb_devices()` : `CM_Get_Device_ID_ListW` filtré sur l'énumérateur `USB` (présents seulement), classe et service par `CM_Get_DevNode_Registry_PropertyW`, problème par `CM_Get_DevNode_Status` (`DN_HAS_PROBLEM`).

## Données touchées

- Réseau : TCP local `127.0.0.1:25565` et `:25566` ; UDP vers la sortie et le relais sur le port `25600`.
- Aucun fichier, aucune clé de registre. Le jeton est gardé en mémoire (`token()`, un `Mutex<String>`).
- Minuterie système Windows (`timeBeginPeriod(1)` / `timeEndPeriod(1)`).

## Erreurs et cas limites

- `start` renvoie `"port:25565"` (port déjà pris : autre Rago Route, serveur local), `"listen:<port>:<erreur>"`, `"udp:<erreur>"`, `"no path"`. Les erreurs du jeton viennent de [[lib.rs]] sous la forme `"premium:<code>"` (`no_license`, `revoked`, `route_closed`, `network`, `rate_limited`…), traduites par [[RouteTab.tsx]].
- Si la 2e carte choisie n'a plus de passerelle au démarrage, elle est ignorée en silence (pas de trajet `phone`/`second`).
- Un trajet en panne n'arrête rien : les autres prennent le relais (`send_on` ignore l'erreur d'envoi).
- Un jeton refusé pendant que Rago Route tourne : les sessions déjà ouvertes continuent ; seules les nouvelles connexions échouent jusqu'au prochain `set_token`.
- Pendant une coupure réseau, la sortie garde la connexion au serveur de jeu 60 s (côté [[rago-route.py]]).

## Liens avec le reste

- Appelé par [[lib.rs]] (commandes `route_*`, arrêt de l'app) ; le renouvellement du jeton (`keep_route_token` : vérifie toutes les 30 s, nouveau jeton après 2 h, nouvel essai 5 min plus tard en cas d'échec, un seul fil) est dans [[lib.rs]].
- Jeton : [[license.rs]] → `POST /api/v1/route/token` du [[Serveur de licences]] (voir [[Code de Rago Route]]).
- Interface : [[RouteTab.tsx]] (lit `route_status` toutes les secondes et `route_links` toutes les 3 s).
- Serveurs : [[rago-route.py]] (même protocole, rôles `sortie` et `relais`), installés par [[install.sh]].

## Tests

11 tests unitaires (`cargo test`) : `sealed_packets_refuse_replay_and_tampering` (rejeu, octet modifié, mauvais en-tête refusés), `replay_window_slides`, `fec_repairs_one_lost_packet`, `header_roundtrip`, `receiver_orders_and_acks`, `sender_chunks_and_confirms`, `sender_fast_resend_when_overtaken`, `phones_are_recognised`, `phone_check` (iPhone sans pilote, sans partage, Samsung, SSD Samsung pris pour un disque…), `second_links`, `diff_wraps`. Les mesures réelles (tunnel contre direct, coupures, 4G) sont dans [[Proxy]].

## À savoir avant de modifier

- **Le protocole doit rester identique à [[rago-route.py]]** : tout changement de format se fait des deux côtés, avec une nouvelle `VERSION`, et la sortie doit être réinstallée par Sofiene ([[fabriquer-install.py]] puis [[install.sh]]).
- Ne jamais réutiliser un nonce : chaque trajet a son compteur ; ne pas partager un `Dir` entre deux sessions.
- Ajouter une sortie ou un relais : `EXITS`/`RELAYS` ici **et** `SORTIES_RAGO` dans [[rago-route.py]] (sinon le relais refuse de faire suivre).
- Les ports `25565`/`25566` sont fixes ; un serveur Minecraft local sur le PC empêche le démarrage (`port:25565`).
- Décision de Sofiene citée en tête du fichier : « OK let's go » (07/11/2026). Le fichier ne contient aucune condition « exe de test » : depuis la 1.3.0, Rago Route est dans tous les exe, réservé au Premium par le jeton. Seul le bouton « copier le jeton » de [[RouteTab.tsx]] reste réservé à l'exe de test (`VITE_RAGO_SERVER === "staging"`).
- Le serveur de licences de **test** ne donne de jeton qu'aux comptes de `ROUTE_TESTERS` (erreur `route_closed`) : une carte de test ne doit pas ouvrir les vrais serveurs.
