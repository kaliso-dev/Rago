---
type: code
tags: [code, app, rust, barre-en-jeu, réseau, ping]
fichier: app/src-tauri/src/gameping.rs
lignes: 408
maj: 2026-11-10
---
# gameping.rs

Le **ping du jeu en cours** affiché par la barre en jeu : ping du protocole Minecraft pour Minecraft Java, aller-retour TCP mesuré par Windows ou écho ICMP vers le serveur UDP pour les autres jeux. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Barre en jeu]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Un `GamePing` (dans un `Mutex`) vit dans [[overlay.rs]] ; `Overlay::live()` appelle `read(pid, minecraft)` à chaque rafraîchissement de la barre ou de la pastille (commande `overlay_live`).
- S'appuie sur [[flows.rs]] (quel est le serveur de la partie), [[icmp.rs]] (écho, dernier routeur) et [[mcping.rs]] (ping du protocole Minecraft).
- Historique : créé avec la barre le 17/10 (`6d5bf29`), vrai ping Minecraft le 21/10 (`4677faf`), serveur choisi par le trafic et écho UDP le 25/10 (`79535fa`).

## Ce que le fichier expose

- `Ping { ms: u32, estimate: bool }` : `estimate` = le serveur ne répond pas à l'écho, mesuré jusqu'au dernier routeur avant lui.
- `Conn { local, local_port, remote, remote_port }` (valeurs brutes de Windows, ordre réseau) avec `remote_ip()`, `port()`, `server()`.
- `pick(conns, current) -> Option<Conn>` : choisit la connexion TCP du serveur de jeu.
- `GamePing::read(pid, minecraft) -> Option<Ping>` (Windows ; `None` ailleurs).

## Fonctionnement détaillé

### Choix de la méthode (`read`)

Un nouveau `pid` remet tout à zéro. Puis :
1. **Pas Minecraft** : `flows::server(pid)` ([[flows.rs]]) :
   - `Nothing` (menu, salon, hors ligne) → pas de ping.
   - Serveur **UDP** → écho ICMP (`udp`).
   - Serveur **TCP** → la connexion TCP correspondante (`GetExtendedTcpTable`), mesure Windows activée (`SetPerTcpConnectionEStats`, `TcpConnectionEstatsPath`), puis aller-retour lissé `SmoothedRtt` (`GetPerTcpConnectionEStats`). Aucun paquet envoyé au serveur.
   - `Off` (journal du noyau illisible) → continue comme pour un jeu TCP classique, ci-dessous.
2. Sinon, `pick` parmi les connexions TCP établies du processus : jamais la machine elle-même (bouclage), ni une adresse nulle, ni les ports `80`, `443`, `8080` (comptes, skins, launcher) ; le port `25565` d'abord ; la connexion déjà suivie est gardée tant qu'elle existe.
3. **Minecraft Java** : `minecraft(conn)` ; si le serveur ne répond pas au ping du jeu (3 échecs d'affilée sans valeur), retour à l'aller-retour TCP de Windows.

### Minecraft (`minecraft`)

- Un ping de protocole ([[mcping.rs]]) **toutes les 3 s** (`MC_EVERY`), délai **2 s** (`MC_TIMEOUT`), dans un fil à part (un seul à la fois). Le nom envoyé dans la poignée de main est celui d'un serveur connu à cette adresse (`mcping::host_for`), sinon l'adresse.
- C'est le ping que le serveur affiche : Hypixel est derrière Cloudflare, l'aller-retour TCP ne va que jusqu'au Cloudflare le plus proche.
- Une mesure perdue garde la valeur précédente ; trois d'affilée l'effacent. Premier appel : pas encore de valeur.

### UDP (`udp`)

- Un écho ICMP **toutes les 2 s** (`UDP_EVERY`), délai **1 s**, dans un fil à part ; valeur affichée = **médiane des 5 dernières** mesures (un écho en retard ne fait pas sauter l'affichage).
- Trois échos perdus d'affilée : les mesures sont effacées, et une seule fois par serveur, `icmp::last_hop` cherche le dernier routeur public qui répond (comme `tracert`) ; les mesures suivantes visent ce routeur et `estimate` devient vrai (à une ou deux ms près, routeur du centre de données).
- Un changement de serveur remet les mesures à zéro.

## Données touchées

- Lecture des tables TCP de Windows et des statistiques étendues TCP (activées par connexion ; droits administrateur, que l'app a).
- Réseau : connexions TCP de ping Minecraft vers le serveur du joueur, échos ICMP vers le serveur UDP ou un routeur.

## Erreurs et cas limites

- Minecraft **par Rago Route** : le jeu est connecté à `127.0.0.1`, que `pick` écarte (bouclage) ; aucune autre connexion ne convient, donc pas de ping affiché pendant une partie par Rago Route. À VÉRIFIER (déduit du code, pas observé) ; l'onglet Rago Route affiche de son côté le ping de la sortie ([[route.rs]]).
- Un serveur Minecraft non classique (pas de réponse d'état) → aller-retour TCP faute de mieux.

## Liens avec le reste

- Appelé par [[overlay.rs]] ; appelle [[flows.rs]], [[icmp.rs]], [[mcping.rs]].
- Fonctionnalités : [[Barre en jeu]], [[Pendant la partie]].

## Tests

- `picks_the_game_server` : le web (443) et le bouclage sont écartés, le port 25565 passe devant, la connexion suivie est gardée.
- `udp_ping_shows_the_median` : médiane de `[31, 30, 95, 29, 30]` = 30.
- `minecraft_ping_comes_from_the_game_protocol` : faux serveur local ; pas de valeur au premier appel, puis une valeur.

## À savoir avant de modifier

- Ne jamais envoyer de paquets au serveur d'un jeu non Minecraft autres que l'écho ICMP : la mesure TCP réutilise ce que Windows mesure déjà.
- Les mesures tournent dans des fils à part pour ne jamais bloquer la barre (`busy` empêche d'en lancer deux).
