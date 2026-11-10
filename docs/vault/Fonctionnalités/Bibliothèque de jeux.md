---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.2.1
maj: 2026-11-10
---
# Bibliothèque de jeux

Page « Jeux » (groupe « En jeu »). RAG-57. Code : [[games.rs]], [[icon.rs]], page [[Games.tsx]] (détail dans « Code » plus bas).

- **Jeux trouvés automatiquement** dans Steam, Epic Games, Riot, Battle.net, Ubisoft Connect, l'app Xbox, Roblox et les launchers Minecraft (officiel, Lunar, Badlion, Feather, Prism, Modrinth, CurseForge), cherchés dans tous les comptes du PC. « Ajouter un jeu » : choisir son programme à la main. « Chercher à nouveau les jeux ». Filtres : Tous, Minecraft, Jeux de tir, Autres.
- **Image officielle** de chaque jeu : d'abord celle que le launcher a déjà sur le PC (cache Steam, catalogue Epic), sinon la boutique officielle ; copiée une fois dans `art\`. Aucune image livrée avec l'app.
- **Launchers** (en haut) : Steam, Epic, Riot, Battle.net, EA, Ubisoft, GOG, Rockstar, Minecraft Launcher, Lunar, Badlion, Feather, Prism, Modrinth, CurseForge, Xbox, avec leur vraie icône ; un clic les ouvre, **sans droits administrateur**.
- **Minecraft Java : une seule tuile** ; « Lancer avec » propose Lunar, le launcher officiel… et retient le choix.
- **Chaque jeu reçoit un preset** : le preset de son jeu s'il est reconnu (ex. Valorant → « Valorant »), modifiable ou « Sans preset ». Voir [[Presets]].
- **Optimiser et jouer** (Premium) : applique les tweaks du preset puis lance le jeu par son launcher, **avec les droits de la session Windows** (jamais en administrateur). **Les tweaks restent allumés après la partie** ; « Les retirer » depuis la page. « Jouer » / « Jouer sans optimiser » lance seulement.
- « En cours » / « Dernière partie » : processus lancés depuis le dossier du jeu, regardés toutes les 4 s.
- « Retirer de la bibliothèque » (deux clics) ne désinstalle rien.

Liens : [[Barre en jeu]], [[Pendant la partie]], [[Problèmes joueurs]] (curseur perdu après Optimiser et jouer).

## Code
- [[games.rs]] : détection par launcher (Steam, Epic, Riot, Battle.net, Ubisoft, Xbox, Roblox, Minecraft), comptes Windows multiples, 15 launchers, lancement sans droits administrateur (jeton de l'Explorateur), images dans `art\`, suivi des parties (`games.json`).
- [[icon.rs]] (icône PNG d'un exe : logos des launchers et des jeux), [[session.rs]] (ce que l'app fait pendant la partie), [[lib.rs]] (boucle de fond toutes les 4 s, événements `games:running` et `games:session`), [[bridge.rs]] (commandes `games` et `game_launch` pour [[Rago OS]]).
