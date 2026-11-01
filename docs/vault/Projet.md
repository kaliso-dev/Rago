---
type: index
tags: [index]
maj: 2026-11-01
---
# Rago Optimizer : le projet

> **Nouveau Claude ? Lis cette note, puis [[État actuel]], puis [[Règles de travail]]. Avant de finir une tâche, suis [[Mettre à jour le vault]].**

Rago Optimizer est une app Windows (10 et 11, 64 bits) qui applique des réglages système (« tweaks ») pour les joueurs, d'abord **Minecraft PvP** (Bedwars, Ranked Bedwars « RBW », Lunar Client), et depuis la [[Version 1.2.0]] une quinzaine de jeux compétitifs. Elle remplace l'ancien `.bat` « Rago Hub v5.2 » vendu sur Discord. Slogan : **« Every millisecond counts. »**

Décideur : [[Personnes et services|Sofiene]]. Lancement public : samedi 10/10/2026 à 15:00 (Paris). Modèle : app gratuite + Premium par abonnement, voir [[Offres et prix]].

## Les trois briques
| Brique | Note | Où |
|---|---|---|
| App Windows (Tauri 2 + React + Rust) | [[App Windows]] | `app/` |
| Site de vente rago-optimizer.com | [[Site]] | `site/`, `netlify/` |
| Serveur de comptes et licences account.rago-optimizer.com | [[Serveur de licences]] | `licensing/` |

Vue d'ensemble technique : [[Architecture]].

## Carte du vault
- **Pilotage** : [[État actuel]] · [[Prochaines étapes]] · [[Questions ouvertes]] · [[Journal]]
- **Règles** : [[Règles de travail]] · [[Décisions]] · [[Clés et secrets]] · [[Mettre à jour le vault]]
- **Versions** : [[Historique des versions]] · [[Version 1.1.10]] · [[Versions 1.1.11 à 1.1.13]] · [[Version 1.1.14]] · [[Version 1.2.0]] · [[Version 1.2.1]]
- **Fonctionnalités** : [[Barre en jeu]] · [[Packet Optimizer]] · [[Test réseau]] · [[Bibliothèque de jeux]] · [[Presets]] · [[Page Outils]] · [[RBW Mod]] · [[Mode jeu]] · [[Mise à jour automatique]] · [[Remise à zéro]] · [[Catalogue des tweaks]] · [[Rago OS]] · [[Proxy]]
- **Technique** : [[Architecture]] · [[App Windows]] · [[Serveur de licences]] · [[Site]] · [[Branches et environnements]] · [[Publier une version]] · [[Connexion Google et Discord]]
- **Design** : [[Charte graphique]] · [[Voix et ton]] · [[Refonte glass]]
- **Marketing** : [[Marketing]] · [[Discord]] · [[Bot communauté Discord]] · [[Partenaires et créateurs]] · [[Promotions et affiliation]] · [[Vidéos Milli]] · [[Trailer 1.2]] · [[Vidéos YouTube]] · [[Plan de visibilité]]
- **Suivi** : [[Bugs et incidents]] · [[Problèmes joueurs]] · [[Linear]] · [[Personnes et services]] · [[Sources]]

## Statuts utilisés dans les notes
CONFIRMÉ (vérifié dans une source primaire : code, git, réponse HTTP) · DÉCIDÉ (décision datée de Sofiene) · OBSERVÉ (lu dans un fil ou Linear, non revérifié) · À VÉRIFIER · À DÉCIDER · OBSOLÈTE. **La décision la plus récente de Sofiene prime.**
