---
type: fonctionnalité
tags: [fonctionnalité, produit, en-cours]
maj: 2026-11-01
---
# Proxy

Linear RAG-50 : nouveau produit, d'abord en Europe, à intégrer à l'app. Consigne du 17/10 : « à moindre coût voir gratuitement », sinon mis de côté.

- **Données en prod depuis le 29/10** : chaque [[Test réseau]] envoie ville, fournisseur, ping, gigue et pertes vers Hypixel, Minemen EU, Cloudflare et 6 villes candidates (Paris, Francfort, Londres, Stockholm, Madrid, Virginie). Admin : `/admin/reseau` ([[Serveur de licences]], `network.js`, `geo.js`).
- **Ce qui manque** (analyse du 29/10) : 1) le trajet proxy → serveur de jeu, mesuré depuis chaque ville (le plus important, sans toucher à l'app) ; 2) tester les vraies adresses de l'hébergeur choisi (les villes sont mesurées sur Amazon) ; 3) traceroute (nouvelle version d'app) ; 4) Wi-Fi ou câble (nouvelle version) ; 5) volume de mesures.
- Hypixel passe par Cloudflare : un proxy n'aide que si le trajet du fournisseur jusqu'à Cloudflare est mauvais.
- À ne pas confondre avec le [[Packet Optimizer]], qui ne change pas la route.
- **Statut (Sofiene, 01/11)** : « pas maintenant » pour le point 1. Le Proxy n'est pas abandonné : la collecte continue en prod, rien d'autre ne se lance sans sa demande ([[Prochaines étapes]]).
