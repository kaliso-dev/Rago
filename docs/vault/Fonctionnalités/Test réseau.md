---
type: fonctionnalité
tags: [fonctionnalité, app, réseau, gratuit, 1.2]
version_app: 1.2.1
maj: 2026-11-23
---
# Test réseau

Onglet « Test réseau » de la page Réseau (avec Optimisations et [[Packet Optimizer]]). RAG-50 étape 0. Code : [[nettest.rs]], [[mcping.rs]], [[icmp.rs]], [[netshare.rs]], page [[NetTest.tsx]] (détail dans « Code » plus bas). **Gratuit. Ne change rien sur le PC.** Aussi ouvert par la tuile « Tester ma connexion » de la [[Page Outils]] (PR #90 du 11/11, dans `staging` par la PR #92).

- **Serveurs testés** :
  - Minecraft : Hypixel (Amérique du Nord), Minemen Club (PvP, Europe) → ping/pong du protocole Minecraft, 8 essais (même ping que dans le jeu).
  - Régions des serveurs de jeu : Paris, Francfort, Londres, Espagne (Madrid), Stockholm, Est des États-Unis (Virginie) → temps d'ouverture d'une connexion TCP.
  - Internet : Cloudflare le plus proche (`one.one.one.one`) → ping ICMP, ou temps d'ouverture TCP si l'écho ne répond pas.
  - **Ton serveur** (23/11, PR #123, refonte v5) : le joueur tape une adresse (« hypixel.net », « play.tonserveur.fr », « 1.1.1.1 », avec `:port` si besoin). L'app essaie le ping de Minecraft, puis l'écho ICMP, puis l'ouverture d'une connexion. Gardé sur le PC (`rago.netCustom`) et **jamais envoyé au serveur Rago**.
  - Le « Diagnostic avancé » (n'importe quel serveur, outils du moteur du [[Packet Optimizer]]) est retiré de cet onglet le 23/11 : la maquette v5 ne l'a pas. Ses outils sont dans la rangée « tools » du Packet Optimizer, toujours gratuits.
- **Mesure** : 40 essais en 10 s par serveur (Minecraft : 8 essais espacés de 1,4 s, car les proxys Minecraft refusent plus de 3 connexions en 4 s) ; tous les serveurs en même temps ; en TCP et Minecraft, un essai au moins 2 fois la médiane et 200 ms au-dessus compte comme perdu (paquet renvoyé par Windows) ; moyenne, médiane, meilleur, pire, gigue, paquets perdus, pics ; courbe en direct ; note globale. Conseil si gigue ou pertes : câble plutôt que Wi-Fi, puis Packet Optimizer.
- **Écran v5** (23/11, PR #123, fusionnée dans `staging`, jamais testé sur Windows) : note en grand (great / good / fair / poor ; en français top / bonne / moyenne / mauvaise) avec ping, gigue et pertes ; graphe « imprimé » de la maquette avec repères de temps ; liste des serveurs avec barre du ping ; écran « tu es hors ligne » quand le ping en direct de la page ne revient plus ou qu'aucun serveur n'est trouvé. Seuils de la note changés : « mauvaise » à partir de 5 % de pertes (avant : 2 %) ou 15 ms de gigue ; « top » jusqu'à 2,5 % de pertes (avant : aucune perte), 40 ms et 5 ms de gigue ; « bonne » jusqu'à 80 ms et 10 ms. Un essai perdu sur 40 arrive sur une bonne ligne. Serveur choisi par défaut : Paris (avant : Hypixel).
- **Outils réseau** (dans le [[Packet Optimizer]] depuis le 23/11, gratuits) : stabilité (100 pings, « stable » si pertes ≤ 1 %, gigue ≤ 5 ms et écart p95-minimum ≤ 25 ms), bufferbloat (ping pendant 2 téléchargements de 100 Mo depuis `speed.cloudflare.com`, confirmation demandée, note A+ à F), MTU, état actuel.
- **Envoi au serveur** (depuis la [[Version 1.2.1]], choix de Sofiene du 29/10, écrit dans la politique de confidentialité) : à chaque test, sans le demander, les chiffres de chaque serveur, la version de l'app et un identifiant anonyme du PC. Le serveur en déduit ville, région, pays et fournisseur (DB-IP) puis **oublie l'adresse IP**. Rien n'est envoyé hors ligne (que des erreurs DNS). Le serveur tapé par le joueur n'est jamais envoyé (23/11). Sert au [[Proxy]]. Message affiché : « Les résultats partent chez Rago avec ta ville et ton fournisseur d'accès, jamais ton adresse IP ».

Liens : [[Barre en jeu]], [[Serveur de licences]].

## Code
- [[nettest.rs]] : cibles, essais, calcul des chiffres ; [[mcping.rs]] : ping Minecraft ; [[icmp.rs]] : écho ICMP ; [[netshare.rs]] : envoi des chiffres au serveur (`POST /api/v1/network/report`).
- Outils réseau (onglet Packet Optimizer) : [[netopt.rs]] (lancement du moteur) et [[common.ps1]] (`Do-Quality`, `Do-Loaded`, `Do-Mtu`), affichés par [[NetTools.tsx]].
- Commande `net_test` de [[lib.rs]] ; page [[NetTest.tsx]].
