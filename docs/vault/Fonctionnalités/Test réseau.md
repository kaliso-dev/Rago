---
type: fonctionnalité
tags: [fonctionnalité, app, réseau, gratuit, 1.2]
version_app: 1.2.1
maj: 2026-10-31
---
# Test réseau

Onglet « Test réseau » de la page Réseau (avec Optimisations et [[Packet Optimizer]]). RAG-50 étape 0. Code : `nettest.rs`, `mcping.rs`, `icmp.rs`, `netshare.rs`, page `NetTest.tsx`. **Gratuit. Ne change rien sur le PC.**

- **Serveurs testés** :
  - Minecraft : Hypixel (Amérique du Nord), Minemen Club (PvP, Europe) → ping/pong du protocole Minecraft, 8 essais (même ping que dans le jeu).
  - Régions des serveurs de jeu : Paris, Francfort, Londres, Espagne (Madrid), Stockholm, Est des États-Unis (Virginie) → temps d'ouverture d'une connexion TCP.
  - Internet : Cloudflare le plus proche → ping ICMP.
  - **Diagnostic avancé** : n'importe quel serveur (ex. `hypixel.net`, `1.1.1.1` pour la ligne seule).
- **Mesure** : 40 essais en 10 s par serveur ; moyenne, médiane, meilleur, pire, gigue, paquets perdus, pics ; courbe en direct ; note globale (Excellente / Bonne / Ping élevé / Instable). Conseil si gigue ou pertes : câble plutôt que Wi-Fi, puis Packet Optimizer.
- **Outils** (partagés avec le Packet Optimizer) : stabilité, bufferbloat, MTU, état actuel.
- **Envoi au serveur** (depuis la [[Version 1.2.1]], choix de Sofiene du 29/10, écrit dans la politique de confidentialité) : à chaque test, sans le demander, les chiffres de chaque serveur, la version de l'app et un identifiant anonyme du PC. Le serveur en déduit ville, région, pays et fournisseur (DB-IP) puis **oublie l'adresse IP**. Sert au [[Proxy]]. Message affiché : « Les résultats partent chez Rago avec ta ville et ton fournisseur d'accès, jamais ton adresse IP ».

Liens : [[Barre en jeu]], [[Serveur de licences]].
