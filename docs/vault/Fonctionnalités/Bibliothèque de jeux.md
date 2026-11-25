---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.2.1
maj: 2026-11-25
---
# Bibliothèque de jeux

Page « Jeux » (groupe « En jeu »). RAG-57. Code : [[games.rs]], [[icon.rs]], page [[Games.tsx]] (détail dans « Code » plus bas).

- **Jeux trouvés automatiquement** dans Steam, Epic Games, Riot, Battle.net, Ubisoft Connect, l'app Xbox, Roblox et les launchers Minecraft (officiel, Lunar, Badlion, Feather, Prism, Modrinth, CurseForge), cherchés dans tous les comptes du PC. « Ajouter un jeu » : choisir son programme à la main. « Chercher à nouveau les jeux ». Filtres : Tous, Minecraft, Jeux de tir, Autres.
- **Images** : depuis le 23/11, l'app embarque une cover verticale, une grande illustration, une vignette paysage et une capture en jeu pour les 16 jeux qui ont un preset ([[Maquettes v5 dans l'app (s5)]]) ; droits d'utilisation à vérifier avant la prod. Les autres jeux gardent l'image officielle : d'abord celle que le launcher a déjà sur le PC (cache Steam, catalogue Epic), sinon la boutique officielle ; copiée une fois dans `art\`.
- **Launchers** : la puce du launcher sur chaque vignette (« riot client », « steam »…) l'ouvre, **sans droits administrateur**. La rangée des launchers en haut de page (16 launchers avec leur icône) a été retirée le 23/11 avec la maquette v5 ; un launcher sans jeu trouvé ne s'ouvre donc plus depuis Rago.
- **Minecraft Java : une seule vignette** ; quand plusieurs launchers sont installés, la puce du launcher sur l'illustration du jeu en tête change de launcher à chaque clic, et le choix est retenu.
- **Chaque jeu reçoit un preset** : le preset de son jeu s'il est reconnu (ex. Valorant → « Valorant »), modifiable ou « Sans preset ». Depuis le 23/11 il se choisit dans une fenêtre à covers verticales ([[PresetPicker.tsx]], demande de Sofiene). Voir [[Presets]].
- **Optimiser et jouer** (Premium) : applique les tweaks du preset puis lance le jeu par son launcher, **avec les droits de la session Windows** (jamais en administrateur). **Les tweaks restent allumés après la partie** ; « Les retirer » depuis la page. « Jouer » / « Jouer sans optimiser » lance seulement.
- **Graphismes du jeu** : dans la case « in-game graphics » de Valorant, Fortnite, CS2, Apex, Marvel Rivals et The Finals, trois niveaux Performance, Équilibré, Qualité écrits dans les réglages du jeu, comme OptiFine. Voir [[Graphismes des jeux]].
- « En cours » / « Dernière partie » : processus lancés depuis le dossier du jeu, regardés toutes les 4 s.
- **Réglages conseillés** (PR #91 du 11/11) : dans la [[Barre en jeu]] seulement depuis le 23/11 (plus sous le jeu en avant) : les réglages à changer dans le jeu que conseillent les pros (VALORANT, Fortnite, Counter-Strike 2, Apex Legends, PUBG, League of Legends, Marvel Rivals, THE FINALS), à cocher « fait ». Voir [[Conseils au lancement du jeu]].
- « Retirer de la bibliothèque » (deux clics) ne désinstalle rien.
- **Couleurs et résolution** (codée le 11/11, en prod avec la 1.3.0 depuis le 22/11) : les cases « resolution » (« 1280×960 », « stretched ») et « saturation » (« 100 % », « windows is 50% ») du jeu en tête ouvrent la page [[Couleurs et résolution]] sur ce jeu ; lancé depuis Jeux, le jeu démarre déjà dans sa résolution.

Liens : [[Barre en jeu]], [[Pendant la partie]], [[Problèmes joueurs]] (curseur perdu après Optimiser et jouer).

## Code
- [[gamecfg.rs]], [[graphics.ts]] et `useGraphics` dans [[Games.tsx]] : graphismes des jeux.
- [[games.rs]] : détection par launcher (Steam, Epic, Riot, Battle.net, Ubisoft, Xbox, Roblox, Minecraft), comptes Windows multiples, 15 launchers, lancement sans droits administrateur (jeton de l'Explorateur), images dans `art\`, suivi des parties (`games.json`).
- [[icon.rs]] (icône PNG d'un exe : logos des launchers et des jeux), [[session.rs]] (ce que l'app fait pendant la partie), [[lib.rs]] (boucle de fond toutes les 4 s, événements `games:running` et `games:session`).
- [[GameTips.tsx]] et [[tips.ts]] (PR #91) : réglages conseillés sous le jeu en avant.
- Couleurs et résolution : [[display.rs]] (`game_launch` y pose la résolution avant le lancement), [[Display.tsx]] ; cases du jeu en tête dans [[Games.tsx]].
