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

## Lancement sur OVHcloud (décidé par Sofiene le 05/11)
Sofiene, 05/11 : « refait moi le document pour ovh cloud et je veux pas ta journée de test là je veux tout config maintenant ».
Document : « Proxys Minecraft Rago sur OVHcloud » (https://claude.ai/artifact/Et2sE49sDo7QKJgeTELUqj).
- **2 VPS-1 OVHcloud** (2 vCPU, 4 Go, trafic illimité, anti-DDoS inclus), sans engagement : **Francfort** (sinon Strasbourg) et **Mumbai**. 3,81 € HT soit 4,57 € TTC par mois chacun (prix de Mumbai à vérifier au panier). Sofiene commande lui-même ; rien acheté au 05/11.
- Vultr écarté : anti-DDoS payant et limité à 11 villes, sans Mumbai ; reste le plan B pour une ville absente chez OVHcloud.
- **Logiciel** : `proxy/` du dépôt (copie dans le dossier du projet) : `relay.py` (relais TCP Python sans dépendance ; port 25565 → `mc.hypixel.net`, 25566 → `eu.minemen.club` ; réécrit le nom du serveur dans le handshake ; TCP_NODELAY ; 8 connexions max par IP ; journal sans IP), `mcping.py` (ping Minecraft), `install.sh` (généré par `fabriquer-install.py` : service systemd `rago-proxy`, BBR, pare-feu ufw SSH + 25565 + 25566, ping vers Hypixel et Minemen à la fin). Testé sur un faux serveur Minecraft ; **jamais testé sur un vrai VPS ni contre Hypixel**.
- Les joueurs utilisent le proxy en ajoutant `IP` (Hypixel) ou `IP:25566` (Minemen) dans Minecraft, sans nouvelle version de l'app.
- Proxy **ouvert à tous** pour l'instant (pas de jeton) ; jeton prévu avec l'intégration dans l'app.
- Ensuite (après les mesures des VPS) : test réseau qui mesure les proxys, trajet proxy → Hypixel connu du serveur de licences, proposition du meilleur proxy si gain ≥ 10 ms ; sur `staging`, sans toucher à la 1.3.0 en test.
- À VÉRIFIER : que fait Hypixel de nombreux joueurs derrière une même adresse ? Compte OVHcloud au nom d'un majeur ?
- À DÉCIDER : proxy gratuit, Premium ou option payante (question q51).
