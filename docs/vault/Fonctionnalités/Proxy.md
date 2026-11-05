---
type: fonctionnalité
tags: [fonctionnalité, produit, en-cours]
maj: 2026-11-04
---
# Proxy

Linear RAG-50 : nouveau produit, d'abord en Europe, à intégrer à l'app. Consigne du 17/10 : « à moindre coût voir gratuitement », sinon mis de côté.

- **Données en prod depuis le 29/10** : chaque [[Test réseau]] envoie ville, fournisseur, ping, gigue et pertes vers Hypixel, Minemen EU, Cloudflare et 6 villes candidates (Paris, Francfort, Londres, Stockholm, Madrid, Virginie). Admin : `/admin/reseau` ([[Serveur de licences]], `network.js`, `geo.js`).
- **Ce qui manque** (analyse du 29/10) : 1) le trajet proxy → serveur de jeu, mesuré depuis chaque ville (le plus important, sans toucher à l'app) ; 2) tester les vraies adresses de l'hébergeur choisi (les villes sont mesurées sur Amazon) ; 3) traceroute (nouvelle version d'app) ; 4) Wi-Fi ou câble (nouvelle version) ; 5) volume de mesures.
- Hypixel passe par Cloudflare : un proxy n'aide que si le trajet du fournisseur jusqu'à Cloudflare est mauvais.
- À ne pas confondre avec le [[Packet Optimizer]], qui ne change pas la route.
- **Relancé par Sofiene le 04/11** (« maintenant je veux qu'on développe les proxy ») : après le test réseau, l'app analyse la meilleure route vers Hypixel (et les autres serveurs Minecraft) et propose le meilleur proxy. Fil « Développer les proxys Minecraft ».

## Analyse du 04/11 (667 mesures, 41 PC, 29/10 au 04/11)
- `mc.hypixel.net` = `172.65.197.160`, plage **Cloudflare Spectrum** (CONFIRMÉ, DNS du 04/11) : le joueur entre chez Cloudflare près de chez lui ; serveurs d'Hypixel aux États-Unis (centre probable, À VÉRIFIER).
- Trajet ville → Hypixel **estimé** (joueurs à moins de 30 ms d'une ville, pas mesuré depuis un serveur loué) : Virginie ~12 ms, Madrid 78, Londres 87, Francfort 88, Paris 91, Stockholm 100.
- Gain réaliste estimé d'un proxy vers Hypixel : **Inde ~70 ms** (Airtel, Jio), Bangladesh ~35, Europe 0 à 20, Amérique du Nord et Asie de l'Est 0 ou pire. Minemen (Europe) : déjà 15 à 46 ms en Europe, pas de gain.
- Un joueur dans un centre de données à Londres (UXHOST) a 170 ms vers Hypixel : un serveur loué peut router plus mal qu'une box. D'où le ping vers Hypixel mesuré par `install.sh` dès l'installation.

## Lancement sur Vultr (Sofiene, 05/11)
Sofiene, 05/11 : « je veux tout config maintenant » (pas de journée de test). OVHcloud écarté le même jour (VPS-1 indisponible, VPS-2 à 7 € proposé seulement en Amérique du Nord).
Document : « Proxys Minecraft Rago sur Vultr » (https://claude.ai/artifact/Et2sE49sDo7QKJgeTELUqj).
- **2 serveurs Vultr** Cloud Compute Regular Performance (1 vCPU, 1 Go, 25 Go, 1 To de trafic), Ubuntu 24.04 : **Frankfurt** (`rago-frankfurt`) et **Mumbai** (`rago-mumbai`). 5 $ par mois chacun hors taxes, facturés à l'heure (0,007 $/h). Sans l'option anti-DDoS (payante, 11 villes seulement, pas Mumbai). Sofiene commande lui-même ; rien acheté au 05/11 (À VÉRIFIER au prochain message).
- **Installés et en marche le 05/11** (sortie d'`install.sh` envoyée par Sofiene) : `rago-frankfurt` = `45.63.119.34`, `rago-mumbai` = `65.20.95.153` (adresses publiques, pas secrètes). CONFIRMÉ (Sofiene).
- **Mesuré depuis les serveurs (05/11)** : Frankfurt → Hypixel **99,6 ms** (estimation : 88), → Minemen 1,5 ms ; Mumbai → Hypixel **239 ms** (meilleur 210), → Minemen 126 ms.
- **Ce que ça donne pour les joueurs des tests** (joueur → Frankfurt mesuré sur Amazon + 99,6) : **pire pour presque toute l'Europe** (−4 à −27 ms vers Hypixel) ; gain seulement pour l'Inde (Airtel +46 ms, Jio +58 ms, BSNL +6) et le Bangladesh (Sylhet +19). Mumbai n'apporte rien de plus que Frankfurt pour l'Inde (~20-40 ms jusqu'à Mumbai + 239).
- **New York et Chicago installés le 05/11** : `rago-newyork` = `173.199.127.77` (→ Hypixel 20,7 ms, → Minemen 88 ms) ; `rago-chicago` = `45.63.69.40` (→ Hypixel **4,8 ms**, → Minemen 112 ms). Les serveurs d'Hypixel sont donc à Chicago ou tout près (CONFIRMÉ par la mesure). Mumbai : destruction conseillée le 05/11 (faite ? À VÉRIFIER).
- **Mesure de Sofiene depuis son Mac en France (05/11, `mcping.py`)** : direct `mc.hypixel.net` **104,8 ms** ; via Chicago 112,1 ; via New York 111,2 ; via Frankfurt 126,6. **Pour lui, aucun proxy ne fait mieux que le direct** : Cloudflare donne déjà la meilleure route depuis l'Europe. Un proxy n'aide que les fournisseurs mal reliés à Cloudflare (Inde, Bangladesh, cas comme UXHOST).
- **« Rago Route » (idée du 05/11, Premium, Sofiene enthousiaste : « c'est incroyable », prototype pas encore lancé)** : un tunnel entre l'app et le serveur de Chicago qui regroupe 1) choix automatique de la route, 2) double trajet anti-lag, 3) réparation instantanée des pertes (un paquet de secours tous les 4, ~25 % de données en plus), 4) connexion qui survit aux coupures de quelques secondes (session gardée à Chicago), 5) deux connexions à la fois (box + 4G du téléphone). But : supprimer pics, pertes et déconnexions (34 des 88 mesures Hypixel ont pertes, pics ou gigue ≥ 10 ms), pas baisser le ping moyen.
- Détail de l'idée de départ : « double trajet anti-lag » : l'app envoie chaque paquet par la route directe et par un proxy, le serveur de Chicago garde le premier arrivé ; ne baisse pas le ping moyen mais supprime les pics dus aux pertes (comme ExitLag ou Mudfish). Autres choix proposés : choix automatique du proxy seulement, diagnostic chez le joueur (Wi-Fi, bufferbloat), tout arrêter. New York : destruction conseillée (Chicago fait aussi bien).
- **Plan du 05/11** (demandé par Sofiene : « fait le plan parfait ») : détruire Mumbai ; essayer New Jersey et Chicago (1 h), garder la ville américaine la plus proche d'Hypixel ; comparaison en jeu par Sofiene et quelques joueurs ; puis dans l'app, ping Minecraft en direct et **à travers** chaque proxy, proxy proposé seulement s'il gagne ≥ 10 ms ; chaque proxy mesure son trajet vers Hypixel toutes les 5 min ; jeton ensuite. Cible : 2 serveurs, ~10 $/mois. 
- Installation : `scp install.sh root@IP:`, `ssh root@IP`, `sh install.sh` (utilisateur `root` chez Vultr).
- **Logiciel** : `proxy/` du dépôt (copie dans le dossier du projet) : `relay.py` (relais TCP Python sans dépendance ; port 25565 → `mc.hypixel.net`, 25566 → `eu.minemen.club` ; réécrit le nom du serveur dans le handshake ; TCP_NODELAY ; 8 connexions max par IP ; journal sans IP), `mcping.py` (ping Minecraft), `install.sh` (généré par `fabriquer-install.py` : service systemd `rago-proxy`, BBR, pare-feu ufw SSH + 25565 + 25566, ping vers Hypixel et Minemen à la fin). Testé sur un faux serveur Minecraft ; **jamais testé sur un vrai VPS ni contre Hypixel**.
- Les joueurs utilisent le proxy en ajoutant `IP` (Hypixel) ou `IP:25566` (Minemen) dans Minecraft, sans nouvelle version de l'app.
- Proxy **ouvert à tous** pour l'instant (pas de jeton) ; jeton prévu avec l'intégration dans l'app.
- Ensuite (après les mesures des VPS) : test réseau qui mesure les proxys, trajet proxy → Hypixel connu du serveur de licences, proposition du meilleur proxy si gain ≥ 10 ms ; sur `staging`, sans toucher à la 1.3.0 en test.
- À VÉRIFIER : que fait Hypixel de nombreux joueurs derrière une même adresse ? (Conditions Vultr : avoir l'âge légal pour signer un contrat.)
- À DÉCIDER : proxy gratuit, Premium ou option payante (question q51).
