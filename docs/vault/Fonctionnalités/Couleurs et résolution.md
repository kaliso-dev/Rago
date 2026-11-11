---
type: fonctionnalité
tags: [fonctionnalité, app, jeux, couleurs, résolution, premium]
version_app: pas encore dans une version
maj: 2026-11-11
---
# Couleurs et résolution

Page « Couleurs et résolution » de l'app (groupe « En jeu », sous Jeux) : la saturation, la luminosité et la résolution **propres à chaque jeu**, posées seulement pendant la partie. Demandée par Sofiene le 11/11 : fonctionnalités 1 (« custom saturation ») et 2 (« custom resolution ») de son message, voir [[Décisions]]. Ticket [[Linear]] RAG-95. Retour à [[Projet]].

**Statut (11/11)** : PR #93 vers `staging` (branche `claude/project-thread-7n0ikn`), ouverte le 11/11 au matin à la demande de Sofiene : « Push toutes les modification vers stagging pour que je puisse test la version test ». Elle part dans la branche d'intégration des 6 nouveautés du 11/11 (PR #92) pour une build de test. Pas encore dans une version. **Jamais testé sur Windows** ([[Règles de travail]]). CONFIRMÉ (GitHub, 11/11).

## Ce que voit le joueur
- Choix du jeu parmi ceux de la [[Bibliothèque de jeux]] (Minecraft Java : une seule entrée pour tous ses launchers, comme dans Jeux). Depuis Jeux, une puce sur la fiche du jeu (« Saturation 55 % · 1440×1080 », ou « Couleurs et résolution » quand rien n'est réglé) ouvre la page sur ce jeu.
- **Couleurs** (interrupteur) : saturation de 50 à 100 % (l'échelle du Digital Vibrance du panneau NVIDIA ; 50 % = Windows ; sur une carte AMD la valeur AMD est affichée à côté, par exemple « saturation AMD 140 ») ; en dépliant « Luminosité, contraste, gamma » : luminosité et contraste de −30 à +30, gamma de 0,70 à 1,50. Boutons « Aperçu 5 s » (sur l'écran principal, prolongé tant qu'on bouge un curseur) et « Valeurs de Windows ». Allumées pour la première fois à 70 % (50 % si l'écran n'a pas de saturation).
- **Résolution** (interrupteur) : 1440×1080, 1280×960, 1024×768 (4:3), 1280×1024 (5:4), 1680×1050 (16:10), 1650×1080, 1720×1080 et 1750×1080 (étirées de Fortnite), ou toute autre résolution de l'écran ; « Étirée » ou « Bandes noires ». Une résolution que l'écran ne propose pas est marquée « À créer », avec la marche à suivre (panneau NVIDIA ou AMD Software). Pour Valorant, CS2 et Fortnite : « Écrire aussi dans les réglages du jeu » (activé d'office). Allumée pour la première fois sur la plus jouée par les pros du jeu : 1440×1080 (Valorant), 1280×960 (CS2), 1650×1080 (Fortnite), 1440×1080 pour les autres jeux.
- **Réglages des pros** : 22 joueurs (5 Valorant, 13 CS2, 4 Fortnite) avec leur saturation, leur résolution, ce qu'ils règlent sur leur écran ou dans le jeu (affiché seulement, jamais appliqué), la source et sa date. « Importer » met leurs couleurs et leur résolution sur le jeu choisi, en un clic. Un pro qui joue à 50 % garde les couleurs de Windows ; un pro dont la saturation n'est pas publiée laisse les couleurs du joueur.
- Bandeau d'état en haut : ce qui est posé en ce moment, et la dernière erreur (pilote qui refuse la saturation, Windows qui refuse la rampe, écran qui refuse la résolution, fichier du jeu en lecture seule, introuvable ou impossible à écrire). Une erreur disparaît dès que l'essai suivant du même genre marche.

## Gratuit ou Premium
**Décision de Sofiene (11/11)**, carte « Saturation, résolution et presets des pros : gratuits ou Premium ? », choix « Presets des pros en Premium » : les réglages à la main sont gratuits ; l'import en un clic d'un pro est Premium (cadenas et fenêtre Premium dans la page, et refus `premium:no_license` par le moteur, comme pour les autres réglages Premium). Un pro importé reste appliqué si Premium s'arrête.

## Comment ça marche
- **Couleurs** : posées seulement quand **le jeu est au premier plan**, sur l'écran où est sa fenêtre (regard toutes les 250 ms tant qu'un jeu à couleurs tourne) ; rendues dès qu'il ne l'est plus (Alt+Tab, fin de partie). C'est le fonctionnement de VibranceGUI. Saturation par la bibliothèque du pilote NVIDIA (NVAPI) ou AMD (ADL), chargée seulement depuis `System32` ; luminosité, contraste et gamma par la rampe gamma de Windows.
- **Résolution** : posée sur l'écran principal **au lancement depuis Rago** (avant que le jeu démarre ; il a 150 s pour démarrer) ou dès que le jeu est vu lancé (4 s au plus), rendue à la fin de la partie. Le changement est temporaire : jamais écrit dans les réglages d'affichage de Windows. Changée ou retirée en pleine partie, elle s'applique tout de suite. Une résolution refusée par l'écran n'est pas réessayée avant la partie suivante.
- **Fichiers des jeux** (si l'option est cochée, jeu fermé seulement) : seulement les clés de résolution et de mode plein écran **déjà présentes** ; valeurs d'avant gardées et remises quand on retire la résolution ; réécrites à la fin de chaque partie (le jeu réécrit son fichier en quittant). Valorant : `GameUserSettings.ini` de chaque compte (`%LOCALAPPDATA%\VALORANT\Saved\Config\…\Windows\`) ; Fortnite : `GameUserSettings.ini` (`%LOCALAPPDATA%\FortniteGame\Saved\Config\WindowsClient\`) ; CS2 : `cs2_video.txt` de chaque compte Steam (`userdata\<id>\730\local\cfg\`). Un fichier en lecture seule n'est pas touché.
- **Partage avec les presets graphiques par jeu** (RAG-92, module `gamecfg.rs` d'un autre fil, convenu le 11/11) : cette fonctionnalité écrit seulement la résolution et le mode d'affichage ; l'autre seulement les réglages graphiques, et jamais l'attribut lecture seule. Celui des deux qui est fusionné en second peut mettre en commun leurs lecteurs de `.ini`.
- **Sécurité** : ce qui va être changé est noté avant dans `display-restore.json` ; tout est remis au lancement suivant après un plantage, à la fermeture de l'app et à la désinstallation ([[Remise à zéro]]). Profils dans `display.json`.
- Rago Optimizer doit rester ouvert ou près de l'horloge pendant la partie ([[Arrière-plan et démarrage]]).

## Limites connues
- Pas de saturation sur une carte Intel ni sur un écran de portable branché à la puce Intel (luminosité, contraste et gamma marchent ; la page le dit).
- HDR : la rampe gamma et la saturation peuvent être ignorées par Windows (À VÉRIFIER sur Windows, [[Questions ouvertes]]).
- Étirée : encore des bandes noires si le panneau NVIDIA ou AMD ne met pas l'échelle « Plein écran » par le GPU (aide dans la page).

## Le marché (analyse du 11/11)
- **VibranceGUI** (gratuit, open source, très utilisé) : un niveau de Digital Vibrance par jeu, posé quand le jeu est au premier plan, Windows rendu au Alt+Tab ; NVIDIA et AMD ; ni résolution ni presets de pros. Rago reprend ce fonctionnement et y ajoute luminosité, contraste, gamma, la résolution et les pros ; même correspondance des niveaux NVIDIA que VibranceGUI (0 à 63 pour 50 à 100 %).
- **CS2** (csdb.gg, 816 pros, 09/11/2026) : 78 % jouent en 4:3 (61 % en 1280×960, 10 % en 1024×768), 11 % en 1920×1080 ; 90 % des 4:3 sont étirés.
- **Valorant** (prosettings.net) : 13 pros sur 14 relevés jouent en 1920×1080 ; exception kaajak (1440×1080 étirée, saturation 55 %) ; la plupart laissent la saturation à 50 % (Demon1, Derke, Less, aspas) et règlent plutôt leur écran (ZOWIE : Color Vibrance 10 à 12) ; TenZ à 100 % (specs.gg).
- **Fortnite** : environ 80 % des pros en 1920×1080, mais une saturation plus haute (Bugha 75 %, Peterbot 70 %, Veno 70 %, Malibuca 65 %) ; la communauté joue aussi en étiré 1440, 1650, 1720 ou 1750×1080.
- Concurrent pour la résolution : TrueStretch (dépôt GitHub, seulement lu, rien téléchargé) fait la même chose que Rago.
- Les réglages des pros sont dans [[pros.json]] (`app/src/data/pros.json`, relevé du 11/11, sources prosettings.net et specs.gg) : à revérifier avant chaque sortie, les pros changent souvent. Quelques saturations de pros CS2 viennent de pages lues en résumé : À VÉRIFIER ([[Questions ouvertes]]).

## Code
- Moteur : nouveau module [[display.rs]] ; commandes `display_info`, `display_profiles`, `display_state`, `display_set_profile`, `display_preview` et événement `display:state` dans [[lib.rs]] ; la résolution est posée par `game_launch` ; jeux en cours lus dans [[games.rs]] ; remise à la désinstallation par [[reset.rs]]. Voir [[Architecture de l'app]].
- Interface : nouvelle page [[Display.tsx]], réglages des pros dans [[pros.json]], puce dans [[Games.tsx]], entrée de [[Sidebar.tsx]], démo dans [[api.ts]] (`?amd` et `?intel` pour voir une carte AMD ou un écran sans saturation).
