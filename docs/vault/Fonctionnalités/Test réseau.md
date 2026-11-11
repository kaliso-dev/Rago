---
type: fonctionnalité
tags: [fonctionnalité, app, réseau, gratuit, 1.2]
version_app: 1.2.1
maj: 2026-11-11
---
# Test réseau

Onglet « Test réseau » de la page Réseau (avec Optimisations et [[Packet Optimizer]]). RAG-50 étape 0. Code : [[nettest.rs]], [[mcping.rs]], [[icmp.rs]], [[netshare.rs]], page [[NetTest.tsx]] ; Diagnostic avancé : [[netopt.rs]] et [[common.ps1]] (détail dans « Code » plus bas). **Gratuit. Ne change rien sur le PC.** Aussi ouvert par la tuile « Tester ma connexion » de la [[Page Outils]] (PR #90 du 11/11, dans `staging` par la PR #92).

- **Serveurs testés** :
  - Minecraft : Hypixel (Amérique du Nord), Minemen Club (PvP, Europe) → ping/pong du protocole Minecraft, 8 essais (même ping que dans le jeu).
  - Régions des serveurs de jeu : Paris, Francfort, Londres, Espagne (Madrid), Stockholm, Est des États-Unis (Virginie) → temps d'ouverture d'une connexion TCP.
  - Internet : Cloudflare le plus proche (`one.one.one.one`) → ping ICMP, ou temps d'ouverture TCP si l'écho ne répond pas.
  - **Diagnostic avancé** : n'importe quel serveur (ex. `hypixel.net`, `1.1.1.1` pour la ligne seule). Ce n'est pas `nettest.rs` : ce sont les outils du moteur PowerShell du [[Packet Optimizer]] (actions `quality`, `loaded`, `mtu`), qui ne changent rien et restent gratuits.
- **Mesure** : 40 essais en 10 s par serveur (Minecraft : 8 essais espacés de 1,4 s, car les proxys Minecraft refusent plus de 3 connexions en 4 s) ; tous les serveurs en même temps ; en TCP et Minecraft, un essai au moins 2 fois la médiane et 200 ms au-dessus compte comme perdu (paquet renvoyé par Windows) ; moyenne, médiane, meilleur, pire, gigue, paquets perdus, pics ; courbe en direct ; note globale (Excellente / Bonne / Ping élevé / Instable). Conseil si gigue ou pertes : câble plutôt que Wi-Fi, puis Packet Optimizer.
- **Outils du Diagnostic avancé** : stabilité (100 pings, « stable » si pertes ≤ 1 %, gigue ≤ 5 ms et écart p95-minimum ≤ 25 ms), bufferbloat (ping pendant 2 téléchargements de 100 Mo depuis `speed.cloudflare.com`, confirmation demandée, note A+ à F), MTU. « État actuel » est dans l'onglet [[Packet Optimizer]] (visible avec Premium seulement sur `staging`).
- **Envoi au serveur** (depuis la [[Version 1.2.1]], choix de Sofiene du 29/10, écrit dans la politique de confidentialité) : à chaque test, sans le demander, les chiffres de chaque serveur, la version de l'app et un identifiant anonyme du PC. Le serveur en déduit ville, région, pays et fournisseur (DB-IP) puis **oublie l'adresse IP**. Rien n'est envoyé hors ligne (que des erreurs DNS) ni pour un test demandé par [[Rago OS]] par le pont. Sert au [[Proxy]]. Message affiché : « Les résultats partent chez Rago avec ta ville et ton fournisseur d'accès, jamais ton adresse IP ».

Liens : [[Barre en jeu]], [[Serveur de licences]].

## Code
- [[nettest.rs]] : cibles, essais, calcul des chiffres ; [[mcping.rs]] : ping Minecraft ; [[icmp.rs]] : écho ICMP ; [[netshare.rs]] : envoi des chiffres au serveur (`POST /api/v1/network/report`).
- Diagnostic avancé : [[netopt.rs]] (lancement du moteur) et [[common.ps1]] (`Do-Quality`, `Do-Loaded`, `Do-Mtu`).
- Commande `net_test` de [[lib.rs]] et du pont [[bridge.rs]] ; page [[NetTest.tsx]].
