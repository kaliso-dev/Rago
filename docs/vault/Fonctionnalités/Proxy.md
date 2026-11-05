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
- Un joueur dans un centre de données à Londres (UXHOST) a 170 ms vers Hypixel : un serveur loué peut router plus mal qu'une box. D'où le test avant l'achat.

## Recommandation d'achat (04/11, en attente de Sofiene)
Document : « Proxys Minecraft Rago : quoi acheter » (https://claude.ai/artifact/Et2sE49sDo7QKJgeTELUqj).
1. Test d'une journée : 6 serveurs **Vultr** à l'heure (Francfort, Paris, Londres, Madrid, Mumbai, New Jersey), script `proxy/mcping.py` + `proxy/test-proxy.sh` dans le dossier du projet ; ~1 $. Script jamais essayé contre un vrai serveur Minecraft.
2. Lancement : 2 proxys (Francfort + Mumbai ou Delhi), Vultr 1 vCPU / 1 Go, 5 $ par mois chacun (1 To de trafic).
3. Prix relevés le 04/11 : Vultr 5 $/mois (0,007 $/h) ; Hetzner dès 5,99 € HT/mois, pas d'Inde ; OVHcloud VPS-1 3,81 € HT (à vérifier) ; DigitalOcean 6 $/mois.
- **Choix pour le lancement (05/11, recommandé à Sofiene, en attente de son achat)** : **OVHcloud VPS-1** à Francfort + Mumbai, 4,57 € TTC par mois chacun (2 vCPU, 4 Go, trafic illimité, anti-DDoS inclus). Vultr = plan B (villes absentes chez OVHcloud, test à l'heure) ; son anti-DDoS est payant et limité à 11 villes, sans Mumbai. À VÉRIFIER à la commande : Francfort et Mumbai proposés pour le VPS, facture au mois sans engagement.
- Rien n'est acheté ; Sofiene achète lui-même. Compte Vultr sans doute au nom d'un majeur (À VÉRIFIER).
- À VÉRIFIER : Hypixel exige-t-il le nom `mc.hypixel.net` dans la connexion ? Que fait Hypixel de nombreux joueurs derrière une même adresse ?
- À DÉCIDER : proxy gratuit, Premium ou option payante (question q51).
- Code (après accord) : sur `staging`, sans toucher à la 1.3.0 en test ; relais local dans l'app + petit relais TCP avec jeton sur chaque proxy.
