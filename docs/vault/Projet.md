---
type: index
tags: [index]
maj: 2026-11-11
---
# Rago Optimizer : le projet

> **Nouveau Claude ? Lis cette note, puis [[État actuel]], puis [[Règles de travail]].**
> **Règle n°1 : ce vault doit correspondre en tout point à l'état actuel du projet. Avant de finir une tâche, suis [[Mettre à jour le vault]] : mets à jour, supprime ce qui est abandonné, demande en cas de doute.**

Rago Optimizer est une app Windows (10 et 11, 64 bits) qui applique des réglages système (« tweaks ») pour les joueurs, d'abord **Minecraft PvP** (Bedwars, Ranked Bedwars « RBW », Lunar Client), et depuis la [[Version 1.2.0]] une quinzaine de jeux compétitifs. Elle remplace l'ancien `.bat` « Rago Hub v5.2 » vendu sur Discord. Slogan : **« Every millisecond counts. »**

Décideur : [[Personnes et services|Sofiene]]. Lancement public : samedi 10/10/2026 à 15:00 (Paris). Modèle : app gratuite + Premium par abonnement, voir [[Offres et prix]].

## Les trois briques
| Brique | Note | Où |
|---|---|---|
| App Windows (Tauri 2 + React + Rust) | [[App Windows]] | `app/` |
| Site de vente rago-optimizer.com | [[Site]] | `site/`, `netlify/` |
| Serveur de comptes et licences account.rago-optimizer.com | [[Serveur de licences]] | `licensing/` |

Vue d'ensemble technique : [[Architecture]]. **Pour coder ou dépanner : commencer par [[Reprendre le développement]].**

## Carte du vault
- **Pilotage** : [[État actuel]] · [[Prochaines étapes]] · [[Questions ouvertes]] · [[Journal]]
- **Règles** : [[Règles de travail]] · [[Décisions]] · [[Clés et secrets]] · [[Mettre à jour le vault]]
- **Versions** : [[Historique des versions]] · [[Version 1.1.10]] · [[Versions 1.1.11 à 1.1.13]] · [[Version 1.1.14]] · [[Version 1.2.0]] · [[Version 1.2.1]] · [[Version 1.3.0]]
- **App, écran par écran** : [[Tableau de bord]] · [[Analyse du PC]] · [[Abonnement dans l'app]] · [[Barre en jeu]] · [[Packet Optimizer]] · [[Test réseau]] · [[Bibliothèque de jeux]] · [[Presets]] · [[Page Outils]] · [[RBW Mod]] · [[Mode jeu]] · [[Partage et support]] · [[Paramètres de l'app]] · [[Licence dans l'app]]
- **App, fonctionnement** : [[Moteur des tweaks]] · [[Remise à zéro]] · [[Réparations au lancement]] · [[Pendant la partie]] · [[Conseils au lancement du jeu]] · [[Arrière-plan et démarrage]] · [[Mise à jour automatique]]
- **Tweaks (générés depuis le code)** : [[Catalogue des tweaks]] · [[Tweaks Réseau]] · [[Tweaks Latence]] · [[Tweaks Carte graphique]] · [[Tweaks Windows]] · [[Tweaks Hitreg]] · [[Tweaks Minecraft]] · [[Tweaks RBW Mod]] · [[Tweaks Mode jeu]] · [[Tweaks Mode expert]] · [[Tweaks Restaurer]] · [[Tweaks Presets]] · [[Tweaks retirés]]
- **En cours ou en attente** : [[Proxy]] · [[Bot communauté Discord]]
- **Autres projets** : [[Rago OS]] (bureau Windows, extension de l'app), [[Client Minecraft Rago]]
- **Technique** : [[Reprendre le développement]] · [[Architecture]] · [[Développer et tester]] · [[Branches et environnements]] · [[Publier une version]]
  - App : [[App Windows]] · [[Architecture de l'app]]
  - Serveur : [[Serveur de licences]] · [[Tableau de bord admin]] · [[Architecture du serveur]] · [[API du serveur]] · [[Paiements Stripe]] · [[Connexion Google et Discord]]
  - Hébergement et CI : [[Supabase]] · [[Railway]] · [[Netlify]] · [[CI GitHub Actions]] · [[Variables d'environnement]] · [[Clés et secrets]]
  - Site : [[Site]] · Rago Route : [[Infrastructure Rago Route]]
  - Outil : [[Cerveau du vault]] (ce vault en graphe dans l'admin, avec un lecteur pour chaque fichier)
- **Code, une note par fichier** (dossier `Code/`) : [[Code de l'app (Rust)]] · [[Code de l'app (interface)]] · [[Code du générateur de catalogue]] · [[Code du serveur]] (et ses tables) · [[Code du site]] · [[Code de Rago Route]] · [[Code de la CI et du dépôt]] (avec [[Branches du dépôt]])
- **Design** : [[Charte graphique]] · [[Voix et ton]] · [[Refonte glass]]
- **Marketing** : [[Marketing]] · [[Discord]] · [[Partenaires et créateurs]] · [[Promotions et affiliation]] · [[Vidéos YouTube]] · [[Étude de marché de novembre 2026]] · [[Logo création d'Adam]]
- **Suivi** : [[Ventes Stripe]] · [[Conformité juridique]] · [[Bugs et incidents]] · [[Problèmes joueurs]] · [[Historique des problèmes]] · [[Linear]] · [[Personnes et services]] · [[Sources]]
- **Historique** (pour comprendre d'où vient une chose, pas pour décider) : [[Chronologie du projet]] · [[Pull requests]] · [[Fils du projet]] · [[Synthèse de reprise du 15-10]] · [[Documents de la 1.2.0]]

## Statuts utilisés dans les notes
CONFIRMÉ (vérifié dans une source primaire : code, git, réponse HTTP) · DÉCIDÉ (décision datée de Sofiene) · OBSERVÉ (lu dans un fil ou Linear, non revérifié) · À VÉRIFIER · À DÉCIDER · OBSOLÈTE. **La décision la plus récente de Sofiene prime.**
