---
type: code
tags: [code, app, react, page, reseau, rago-route]
fichier: app/src/pages/RouteTab.tsx
lignes: 301
maj: 2026-11-10
---
# RouteTab.tsx

L'onglet **« Rago Route »** de la page Réseau. Il sert à allumer ou éteindre le tunnel anti-lag vers les serveurs Rago, et à choisir une 2e connexion de secours (4G du téléphone, 2e box). Il aide aussi à brancher le téléphone et montre les trajets et les chiffres en direct. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Proxy|Rago Route]]. Côté Rust : [[route.rs]] (et le jeton dans [[license.rs]]).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Affiché par [[Network.tsx]] quand l'onglet est `route`.
- **Dans tous les exe depuis le commit `a190565` (10/11)**. Avant, l'onglet n'existait que dans l'exe de test. Seul le bouton « Copier un jeton pour le Mac » reste réservé à l'exe de test (`VITE_RAGO_SERVER === "staging"`).
- Badge **« Bêta »** à côté du titre.
- **Premium** : les serveurs Rago refusent toute partie sans un jeton signé par le serveur de licences. La commande `route_start` demande ce jeton ([[lib.rs]], `lic.route_token()`) avant d'allumer quoi que ce soit.
- Le texte de la page parle de **Minecraft** : le joueur ajoute `localhost` (Hypixel) ou `localhost:25566` (Minemen) comme serveur dans le jeu.

## Ce que le fichier expose
- `RouteTab()` : l'onglet.
- Composants internes :
  - `PhoneCheckBox` : diagnostic du partage de connexion USB ;
  - `PathRow` : un trajet ;
  - `Stat` : un chiffre.
- Fonction interne : `errorKey(e)`.
- Constantes internes : `STAGING`, `ITUNES` (page de téléchargement d'iTunes sur le site d'Apple).

## Fonctionnement détaillé

### Lecture de l'état
- `api.routeStatus()` (commande `route_status`) **toutes les secondes**. On y lit :
  - l'état : allumé ou non, partie en cours ;
  - les trajets ;
  - le ping de la sortie ;
  - les paquets sauvés et réparés ;
  - les renvois ;
  - le retard du moteur, des deux côtés ;
  - une erreur éventuelle.
- `api.routeLinks()` (commande `route_links`) **toutes les 3 secondes** : les 2e connexions vues par Windows (téléphone en USB, en Wi-Fi ou en Bluetooth, 2e box). Sans téléphone, le moteur ajoute un diagnostic (`check`).

### Carte principale
- **Verdict** :
  - « Rago Route est éteint » ;
  - « Prêt : lance Minecraft » (allumé) ;
  - « Ta partie passe par Rago Route » (une partie passe par le tunnel).
  - La pastille passe au vert en partie.
- **Sous-titre** :
  - éteint : l'explication (plusieurs trajets à la fois ; si un trajet perd un paquet, un autre l'apporte) ;
  - allumé : « Dans Minecraft, ajoute ce serveur… », avec les deux adresses `localhost` et `localhost:25566`.
- **Sans Premium** (`locked` : licence lue, pas Premium, tunnel éteint) :
  - le texte `route.premium` ;
  - le bouton « Passer Premium » (`setUpsell("plan")`, [[Upsell.tsx]]).
  - Si le tunnel tourne déjà, on peut toujours l'éteindre.
- **2e connexion**, seulement tunnel éteint et compte Premium :
  - un interrupteur par connexion trouvée : « Ajouter la 4G du téléphone » (avec le coût, environ 70 à 90 Mo par heure de jeu) ou « Ajouter la connexion « {nom} » » ;
  - **un téléphone est pris tout seul** tant que le joueur n'a rien choisi ;
  - le choix est retenu sur ce PC dans `rago.route.link` (nom de la carte, `""` = aucune).
- **Diagnostic du téléphone** (`PhoneCheckBox`), quand aucun partage ne marche :
  - le titre dit iPhone, Android ou aucun téléphone ;
  - 5 étapes cochées ou non :
    - `usb` : téléphone vu par le port USB ;
    - `apple_usb` : pilote USB d'Apple ;
    - `apple_net` : pilote de partage d'Apple ;
    - `share` : partage activé ;
    - `internet` : Internet par le téléphone ;
  - l'explication de la **première** étape ratée (`route.why.*`, par exemple : câble qui ne fait que charger, « Se fier », « Partage via USB ») ;
  - le lien **« Télécharger iTunes (site d'Apple) »** si un pilote d'Apple manque ;
  - « Copier les détails » (texte technique à envoyer au support).
- **Bouton** « Allumer Rago Route » / « Éteindre Rago Route » :
  - `api.routeStart(connexion choisie ou null)` ou `api.routeStop()` ;
  - grisé tant que la licence n'est pas encore lue (`license === null`).
- **Copier un jeton pour le Mac** (exe de test et Premium seulement) : `api.routeToken()`, un jeton de 6 h à coller après `--jeton` dans le script d'essai du Mac.

### Messages d'erreur (`errorKey`)

| Erreur reçue | Texte |
|---|---|
| `port:…` | le port 25565 est déjà pris (un serveur Minecraft ou un autre programme) |
| `udp:…` | impossible d'ouvrir la connexion réseau |
| `premium:no_license` | réservé aux comptes Premium |
| `premium:route_closed` | « Rago Route n'est pas encore ouvert à ce compte. » |
| `premium:network` | serveur Rago injoignable pour vérifier le Premium |
| `premium:rate_limited` | trop d'essais d'un coup |
| autre `premium:…` | Premium pas vérifié, reconnecter le compte |
| état `error === "token"` (tunnel allumé) | la sortie a refusé le jeton : le Premium n'est plus valable |
| autre | « Rago Route n'a pas pu démarrer ({e}). » |

### Carte « Trajets » (tunnel allumé)
- **Une ligne par trajet** (`PathRow`) :
  - le nom : « Direct vers {ville} », « Par {ville} » (relais), « 4G du téléphone vers {ville} » ou « 2e connexion vers {ville} » ;
  - la part des paquets arrivés en premier ;
  - les pertes ;
  - les Mo reçus ;
  - le ping, ou « coupé ».
- **Chiffres** : « Sortie → serveur », « Paquets sauvés », « Paquets réparés », « Renvois » (les deux côtés), « Retard du moteur » (en orange au-delà de 50 ms).
- Avant la connexion de Minecraft : « Les chiffres arrivent dès que Minecraft est connecté par Rago Route. ».

## Données touchées
- `localStorage` : `rago.route.link`.
- Côté moteur : le tunnel et son jeton. Le jeton est renouvelé toutes les 2 h tant que le tunnel tourne (`keep_route_token` dans [[lib.rs]]).

## Erreurs et cas limites
- Les erreurs de lecture de l'état et des connexions sont ignorées : l'écran garde la dernière valeur.
- Si le stockage est indisponible, le choix de la 2e connexion n'est pas retenu.

## Simulateur
Avec `npm run window`, [[api.ts]] simule un tunnel (`mockRoute`) : allumer et éteindre, une 2e connexion de démo, des trajets et des chiffres plausibles.

## Liens avec le reste
- Fonctionnalité : [[Proxy|Rago Route]]. Infrastructure : [[Infrastructure Rago Route]]. Code du serveur de sortie : [[Code de Rago Route]].
- Moteur : [[route.rs]] (tunnel, trajets, diagnostic du téléphone), [[license.rs]] (jeton), [[lib.rs]] (commandes `route_*`).
- Textes : clés `route.*` de [[i18n.ts]]. Styles : section « Rago Route » de `features.css` ([[Styles de l'app (CSS)]]). Son commentaire de section parle encore de l'« exe de test » : en retard sur le code.

## À savoir avant de modifier
- Une nouvelle erreur du moteur ou du serveur de licences : l'ajouter dans `errorKey` et dans [[i18n.ts]], sinon elle tombe dans « n'a pas pu démarrer ».
- Le bouton du jeton pour le Mac ne doit jamais sortir de l'exe de test.
