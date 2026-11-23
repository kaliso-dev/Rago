---
type: code
tags: [code, app, react, page, reseau, rago-route]
fichier: app/src/pages/RouteTab.tsx
lignes: 365
maj: 2026-11-23
---
# RouteTab.tsx

L'onglet **« Rago Route »** de la page Réseau, refait le 23/11 à l'identique de la maquette v5 `app-network-route-pi.html` (PR #123). Il sert à allumer ou éteindre le tunnel anti-lag vers les serveurs Rago, montre les trajets sur un schéma et quatre chiffres, et propose les trajets de secours (4G du téléphone, 2e connexion), avec un diagnostic du téléphone. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Proxy|Rago Route]]. Côté Rust : [[route.rs]] (et le jeton dans [[license.rs]]).

Tout ce qui suit est CONFIRMÉ (code de la PR #123 du 23/11, commit `c0d27dd`, vers `staging`). Jamais testé sur Windows.

## Rôle et place dans l'ensemble
- Affiché par [[Network.tsx]] quand l'onglet est `route`.
- **Dans tous les exe depuis le commit `a190565` (10/11)**. Seul le bouton « Copier un jeton pour le Mac » reste réservé à l'exe de test (`VITE_RAGO_SERVER === "staging"`).
- Puce **« bêta »** en haut à gauche.
- **Premium avec l'option Rago Route** (3 $ par mois en plus, 13/11) : la sortie refuse toute partie sans un jeton signé par le serveur de licences, qui n'en donne qu'avec l'option. La commande `route_start` demande ce jeton ([[lib.rs]]) avant d'allumer quoi que ce soit.
- Le texte parle de **Minecraft** : le joueur rejoint `localhost` (Hypixel) ou `localhost:25566` (Minemen) dans le jeu.

## Ce que le fichier expose
- `RouteTab()` : l'onglet.
- Composants internes : `Backup` (un trajet de secours) et `PhoneCheck` (diagnostic du partage de connexion).
- Fonction interne : `errorKey(e)`.
- Constantes internes : `STAGING`, `SLOTS` et `LINES` (les trois places et les trois courbes du schéma, repère de 822 × 350 de la maquette), `PACKETS`, `ITUNES`.

## Fonctionnement détaillé

### Lecture de l'état
- `api.routeStatus()` (commande `route_status`) **toutes les secondes** : allumé ou non, partie en cours, trajets, ping de la sortie, paquets sauvés et réparés, renvois, retard du moteur, erreur éventuelle.
- `api.routeLinks()` (commande `route_links`) **toutes les 3 secondes** : les 2e connexions vues par Windows. Sans téléphone qui partage, le moteur ajoute un diagnostic (`check`).

### Carte principale (`route`)
- À gauche, l'**état** :
  - grand **« on »** ou **« off »** ;
  - sous-titre : « Allume-le, puis rejoins localhost dans Minecraft. », « Prêt : rejoins localhost dans Minecraft. » ou « Minecraft passe par Rago Route. » ;
  - allumé : « rejoindre dans minecraft » avec l'adresse `localhost` et un bouton pour la copier, puis la ligne « Minemen : localhost:25566 » (ajoutée le 23/11, absente de la maquette) ;
  - le bouton :
    - sans Premium (licence lue, tunnel éteint) : « Premium » avec un cadenas, qui ouvre l'offre ([[Upsell.tsx]]) ;
    - Premium sans l'option (`premium:route_option`) : « Ajouter Rago Route », qui ouvre la page d'achat de l'option (`{ACCOUNT_URL}/buy/route`) ;
    - sinon « turn on » / « turn off » (`api.routeStart(connexion choisie ou null)` ou `api.routeStop()`), grisé tant que la licence n'est pas lue ;
  - « Copier un jeton pour le Mac » (exe de test et Premium seulement) : `api.routeToken()`.
- À droite, le **schéma des trajets** : « ton pc » → trois trajets → « rago / sortie de paris » → ping de la sortie → « hypixel / serveur ».
  - En haut le trajet direct, au milieu le relais (« via frankfurt »), en bas le secours (4G du téléphone ou 2e connexion).
  - Chaque trajet affiche « premier {n} % » (part des paquets arrivés en premier) ou « coupé ». Le trajet en tête est en rouge plein, les autres actifs en rouge léger, les coupés en gris.
  - Pendant une partie, de petits paquets avancent le long des trajets actifs (immobiles si Windows demande moins d'animations).
  - Un trajet absent montre sa place vide (« direct · paris », « via frankfurt », « + 4g du téléphone »).
  - Le serveur au bout est toujours écrit « hypixel » (OBSERVÉ : la maquette fait de même ; une partie sur Minemen passe aussi par là).

### Les quatre chiffres
- « paquets sauvés », « paquets refaits », « renvois » (les deux côtés additionnés), « délai du moteur » (le plus grand des deux côtés, en ms). Tirets quand le tunnel est éteint.
- Allumé sans partie : « Les chiffres arrivent dès que Minecraft est connecté par Rago Route. » (`route.waiting`).

### « trajets de secours »
- Deux tuiles (`Backup`) : **4g du téléphone** (« environ 80 Mo par heure », sinon « branche ton téléphone en USB ») et **2e connexion** (« prend le relais si la tienne coupe », sinon « aucune autre connexion trouvée »).
- Une tuile est pâlie tant que Windows ne voit pas la connexion. Un clic l'ajoute (« ajouté ») ou la retire pour le prochain démarrage. Tunnel allumé : grisées, « Éteins Rago Route pour changer les trajets de secours. ».
- **Un téléphone est pris tout seul** tant que le joueur n'a rien choisi. Le choix est retenu sur ce PC dans `rago.route.link` (nom de la carte, `""` = aucune).
- **Diagnostic du téléphone** (`PhoneCheck`), tunnel éteint, quand le moteur en envoie un : titre iPhone, Android ou aucun téléphone ; les étapes cochées ou non (`usb`, `apple_usb`, `apple_net`, `share`, `internet`) ; l'explication de la première étape ratée (`route.why.*`) ; le bouton vers l'installeur d'iTunes si un pilote d'Apple manque ; « Copier les détails ».

### Messages d'erreur (`errorKey`)
| Erreur reçue | Texte |
|---|---|
| `port:…` | le port 25565 est déjà pris |
| `udp:…` | impossible d'ouvrir la connexion réseau |
| `premium:no_license` | réservé aux comptes Premium |
| `premium:route_closed` | Rago Route n'est pas encore ouvert à ce compte |
| `premium:route_option` | il faut l'option Rago Route (et le bouton d'achat remplace « turn on ») |
| `premium:network` | serveur Rago injoignable pour vérifier le Premium |
| `premium:rate_limited` | trop d'essais d'un coup |
| autre `premium:…` | Premium pas vérifié, reconnecter le compte |
| état `error === "token"` (tunnel allumé) | la sortie a refusé le jeton |
| autre | « Rago Route n'a pas pu démarrer ({e}). » |

## Données touchées
- `localStorage` : `rago.route.link`.
- Côté moteur : le tunnel et son jeton, renouvelé toutes les 2 h tant que le tunnel tourne (`keep_route_token` dans [[lib.rs]]).

## Erreurs et cas limites
- Les erreurs de lecture de l'état et des connexions sont ignorées : l'écran garde la dernière valeur.
- Si le stockage est indisponible, le choix de la 2e connexion n'est pas retenu.

## Simulateur
Avec `npm run window`, [[api.ts]] simule un tunnel (`mockRoute`) : allumer et éteindre, une 2e connexion de démo, des trajets et des chiffres plausibles.

## Historique utile
- 23/11 (PR #123) : le verdict en phrase, la carte « Trajets » en lignes et les interrupteurs de 2e connexion sont remplacés par l'état on/off, le schéma, les quatre chiffres et les deux tuiles de secours de la maquette.

## Liens avec le reste
- Fonctionnalité : [[Proxy|Rago Route]]. Infrastructure : [[Infrastructure Rago Route]]. Code du serveur de sortie : [[Code de Rago Route]].
- Moteur : [[route.rs]], [[license.rs]] (jeton), [[lib.rs]] (commandes `route_*`).
- Textes : `s5.rt.*` et `route.*` de [[i18n.ts]]. Styles : `s5/pages/net.css` et `s5/pages/module.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Une nouvelle erreur du moteur ou du serveur de licences : l'ajouter dans `errorKey` et dans [[i18n.ts]], sinon elle tombe dans « n'a pas pu démarrer ».
- Le bouton du jeton pour le Mac ne doit jamais sortir de l'exe de test.
