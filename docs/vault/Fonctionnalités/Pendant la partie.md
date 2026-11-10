---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.2.1
maj: 2026-11-10
---
# Pendant la partie

Ce que l'app fait automatiquement le temps d'une partie, puis défait ([[session.rs]], repris du `.bat` GAME V1 de Sofiene). Les trois options sont **activées par défaut** et gratuites ; une partie = un jeu de la [[Bibliothèque de jeux]] ou Minecraft (Java d'un launcher Minecraft, ou Bedrock) en cours, regardé toutes les 4 s. Marche tant que Rago est ouvert ou près de l'horloge ([[Arrière-plan et démarrage]]). Chaque option se coupe dans les [[Paramètres de l'app]] (« Pendant la partie »).

- **Carte graphique performante pour les jeux** : sur un PC à deux cartes ou plus (NVIDIA, AMD ou Intel ; portables gamers), chaque jeu vu en partie reçoit « Performances élevées » dans Paramètres > Affichage > Graphiques de Windows, seulement s'il n'a pas déjà un choix. Effet au lancement suivant du jeu, et ça reste. Couper l'option retire ceux que Rago a écrits. Un PC à une seule carte : rien à faire.
- **Mode Performances élevées le temps de jouer** : seulement depuis Équilibré ou Économie d'énergie, sur secteur, sans stratégie d'entreprise, **jamais sur un Ryzen X3D à deux CCD** (7900X3D, 7950X3D, 9900X3D, 9950X3D, 7945HX3D ; AMD y veut Équilibré). Un PC sans plan Performances élevées (veille moderne) n'est pas changé. Le mode d'avant est noté sur le disque et rendu à la fin de la partie (ou au lancement suivant si l'app a été fermée), sauf si le joueur a changé de mode entre-temps.
- **Vérifications au lancement d'un jeu** : batterie, téléchargements en fond (qBittorrent, µTorrent, BitTorrent, Transmission, Deluge, Tixati, Internet Download Manager), synchronisation (OneDrive, Dropbox, Google Drive, MEGA, iCloud), logiciel d'enregistrement (OBS Studio, Streamlabs). Signalés dans la [[Barre en jeu]] et la [[Bibliothèque de jeux]]. **Rien n'est fermé.**

Liens : [[Mode jeu]] (réglage séparé, dans le catalogue), [[Packet Optimizer]] (mode compétitif).

Désinstallation : le mode d'alimentation est rendu et les choix de carte graphique écrits par Rago sont retirés ([[Remise à zéro]]).

## Code
- [[session.rs]] : les trois options, `session.json` (ce qui est à défaire), commandes `session_state` et `session_set_prefs`, événement `games:session`.
- [[lib.rs]] : boucle de fond toutes les 4 s ; [[games.rs]] : jeux en cours ; [[background.rs]] : options (`game_gpu`, `game_power`, `game_checks`).
- Interface : `SessionCard.tsx` (carte des paramètres, vérifications dans [[Games.tsx]] et [[Overlay.tsx]]).
