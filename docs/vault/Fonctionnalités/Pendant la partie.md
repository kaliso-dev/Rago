---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.4.1
maj: 2026-11-27
---
# Pendant la partie

Ce que l'app fait automatiquement le temps d'une partie, puis défait ([[session.rs]], repris du `.bat` GAME V1 de Sofiene). Les quatre options sont **activées par défaut** et gratuites ; une partie = un jeu de la [[Bibliothèque de jeux]] ou Minecraft (Java d'un launcher Minecraft, ou Bedrock) en cours, regardé toutes les 4 s. Marche tant que Rago est ouvert ou près de l'horloge ([[Arrière-plan et démarrage]]). Chaque option se coupe dans les [[Paramètres de l'app]] (« Pendant la partie »).

- **Carte graphique performante pour les jeux** : sur un PC à deux cartes ou plus (NVIDIA, AMD ou Intel ; portables gamers), chaque jeu vu en partie reçoit « Performances élevées » dans Paramètres > Affichage > Graphiques de Windows, seulement s'il n'a pas déjà un choix. Effet au lancement suivant du jeu, et ça reste. Couper l'option retire ceux que Rago a écrits. Un PC à une seule carte : rien à faire.
- **Mode Performances élevées le temps de jouer** : seulement depuis Équilibré ou Économie d'énergie, sur secteur, sans stratégie d'entreprise, **jamais sur un Ryzen X3D à deux CCD** (7900X3D, 7950X3D, 9900X3D, 9950X3D, 7945HX3D ; AMD y veut Équilibré). Un PC sans plan Performances élevées (veille moderne) n'est pas changé. Le mode d'avant est noté sur le disque et rendu à la fin de la partie (ou au lancement suivant si l'app a été fermée), sauf si le joueur a changé de mode entre-temps.
- **Jeu en priorité supérieure à la normale** (ajouté le 11/11 en « Haute », PR #89, en prod dans la [[Version 1.3.0]] depuis le 22/11 **en « Haute »** ; passé en « Supérieure à la normale » dans `staging` par la PR #155 du 27/11, décision de Sofiene « oui on l'ajoute » (q109), **pas encore en prod, jamais testé sur Windows** ; cause : la « Haute » faisait saccader le stream Discord, [[Bugs et incidents]]) : chaque processus du jeu en cours passe en priorité « Supérieure à la normale » (jamais « Haute » ni « Temps réel ») et Windows ne le bride plus quand sa fenêtre n'est pas au premier plan (EcoQoS coupé). Seulement depuis la priorité Normale ou déjà Supérieure à la normale (posée par la priorité par jeu ou le [[Packet Optimizer]]) : un choix du joueur n'est pas touché. Rien n'est écrit sur le disque, ça disparaît avec le processus ; un jeu relancé est repris. Couper l'option rend la priorité d'avant aux processus encore lancés. Un jeu protégé par son anti-triche peut refuser (il est alors laissé tel quel). Demandé par Sofiene le 11/11 (« à chaque fois qu'on optimise un jeu il faut que ça mette le jeu en haute priorité et en performance maximale avec la carte graphique »), ramené à « Supérieure à la normale » sur son choix du 13/11 confirmé le 27/11. Différent du réglage « Priorité avancée par jeu » (`pri_game`, 16 jeux, écrit dans le registre, voir [[Tweaks Latence]]), qui reste et écrit lui aussi « Supérieure à la normale » (6) ; les PC déjà réglés en « Haute » (3) par Rago sont ramenés à 6 au lancement de l'app ([[Réparations au lancement]]).
- **Vérifications au lancement d'un jeu** : batterie, téléchargements en fond (qBittorrent, µTorrent, BitTorrent, Transmission, Deluge, Tixati, Internet Download Manager), synchronisation (OneDrive, Dropbox, Google Drive, MEGA, iCloud), logiciel d'enregistrement (OBS Studio, Streamlabs). Signalés dans la [[Barre en jeu]] et la [[Bibliothèque de jeux]]. **Rien n'est fermé.**
  - **Conseils au lancement du jeu** (PR #91 du 11/11, jamais testé sur Windows) : l'option devient « Conseils au lancement d'un jeu » et signale aussi les réglages en jeu conseillés par les pros pour 8 jeux, les applis qui prennent beaucoup de processeur ou de mémoire, l'écran sous sa meilleure fréquence, Game DVR, Wallpaper Engine et Medal, avec un rappel de 12 s en haut à gauche au lancement. Détail : [[Conseils au lancement du jeu]].

Liens : [[Mode jeu]] (réglage séparé, dans le catalogue), [[Packet Optimizer]] (mode compétitif).

Désinstallation : le mode d'alimentation est rendu et les choix de carte graphique écrits par Rago sont retirés ([[Remise à zéro]]).

## Code
- [[session.rs]] : les trois options, `session.json` (ce qui est à défaire), commandes `session_state` et `session_set_prefs`, événement `games:session`.
- [[lib.rs]] : boucle de fond toutes les 4 s ; [[games.rs]] : jeux en cours ; [[background.rs]] : options (`game_gpu`, `game_power`, `game_checks`, `game_priority`).

## Ce qui n'est pas fait (carte graphique « performance maximale »)
- Sur un PC à **une seule** carte, Windows n'a rien à choisir : l'option carte graphique ne sert pas. La gestion d'énergie NVIDIA au maximum existe en réglage manuel (« PowerMizer en performance », `nv_powermizer`, [[Tweaks Carte graphique]]), pas réglée automatiquement par jeu : il faudrait passer par le profil du pilote NVIDIA (NVAPI), pas fait (11/11).
- Interface : `SessionCard.tsx` (carte des paramètres, vérifications dans [[Overlay.tsx]] ; plus sur la page « Jeux » depuis le 23/11).
- [[tips.rs]] (PR #91) : moteur des [[Conseils au lancement du jeu]].
