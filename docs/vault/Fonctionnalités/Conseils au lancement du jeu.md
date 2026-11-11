---
type: fonctionnalité
tags: [fonctionnalité, app, gratuit, jeux]
version_app: aucune (PR #91, pas fusionnée)
maj: 2026-11-11
---
# Conseils au lancement du jeu

**Statut : codé le 11/11 dans la PR #91 (brouillon, vers `staging`, branche `claude/project-thread-g3od2h`), pas fusionnée ; jamais essayé sur un PC Windows avec un jeu (la CI Windows de la PR passe).** Linear RAG-94. C'est la feature 4 (« Tips ») de la liste de Sofiene du 11/11, faite à part pour ne pas retarder la sortie de la [[Version 1.3.0]]. Elle prolonge les vérifications de [[Pendant la partie]] et s'affiche dans la [[Barre en jeu]] et la [[Bibliothèque de jeux]]. Gratuite.

Demande de Sofiene (11/11) : « Il faut que pour chaque jeux ca analyse et detect si le joueur pourrait appliquer un settings ou une option sur son pc sur son app ou sur son jeux qui pourrait l'aider, par exemple je sais que sur valo ya un settings qui permet de mieux voir le contour de l'ennemi, ou sur fortnite un settings enelve le delay quand tu build […] fait une liste des option et settings important a activer ou pas qu'on pourras signaler au jouer quand son jeu sera lancer. Et biensur au dela du jeu il faut que ca detect par exemple si j'ai one drive obs en arriere plan ca notifi le joueur que ca prend des perf » ([[Décisions]]).

**Rien n'est changé ni fermé** : Rago signale, le joueur décide. Rago ne lit pas les fichiers de réglages des jeux : il ne sait donc pas si un réglage en jeu est déjà fait, c'est le joueur qui le coche.

## Ce que voit le joueur
- **Rappel au lancement du jeu** : quand le jeu est au premier plan depuis 10 s et que Rago a quelque chose à signaler (un réglage en jeu pas encore coché ou un point à vérifier), la pastille en haut à gauche s'élargit pendant **12 s** : « 9 conseils pour VALORANT · Alt+X pour voir » (le nombre compte les réglages pas faits et les points à vérifier), ou « 2 points à vérifier » pour un jeu sans réglages conseillés (ou quand tous sont cochés). Une seule fois par lancement du jeu, entre 10 s et 2 min 10 s après son arrivée au premier plan (pas en pleine partie), jamais par-dessus un plein écran exclusif, et seulement si la barre en jeu est activée. Comme la pastille FPS/ping, elle ne prend ni le focus ni les clics ; ouvrir la barre arrête le rappel. Si le joueur ne garde pas la pastille FPS/ping à l'écran, elle disparaît après le rappel.
- **Barre en jeu** (Alt+X) : sous les points à vérifier, le bloc « Réglages conseillés pour VALORANT » montre les 3 premiers réglages pas faits ; « Voir les N autres réglages » montre le reste. Le bloc défile à part (258 px au plus) : la liste des réglages en pleine partie garde sa place.
- **Bibliothèque** : sous le jeu en avant (la grande carte), le même bloc avec tous les réglages et une phrase d'explication ; ouvert quand le jeu tourne, replié sinon. Pas pour Minecraft, qui a ses propres réglages dans Rago ([[Tweaks Minecraft]]).
- **Chaque réglage** : son nom dans le jeu, en anglais comme dans les menus du jeu et les guides (« Enemy Highlight Color »), la valeur conseillée (« Yellow (Deuteranopia) »), une catégorie (Visibilité, Latence, FPS, Construction, Visée) et une phrase qui dit pourquoi. Une case « Marquer comme fait » : un réglage coché n'est plus rappelé et ne compte plus dans le rappel ; « Voir les faits (n) » le remontre. En bas : « D'après ProSettings, Hone… », chaque source s'ouvre dans le navigateur.
- **Points à vérifier** (liste « À vérifier » de [[Pendant la partie]], gardée) : batterie, téléchargements, synchronisation (OneDrive…), enregistrement (OBS…), plus ce que la PR #91 ajoute (détail plus bas).

## L'option
L'option « Vérifications au lancement d'un jeu » des [[Paramètres de l'app]] (champ `game_checks`, activée par défaut) s'appelle maintenant **« Conseils au lancement d'un jeu »** et commande le rappel, les points à vérifier et la mesure des applis. Coupée : plus de rappel ni de mesure, mais les réglages conseillés restent visibles dans la barre en jeu et la bibliothèque.

## Les réglages en jeu conseillés : 65 réglages, 8 jeux
Choisis d'après les réglages des joueurs pros et des guides de 2025-2026 (fichier `app/src/data/tips.json`, [[tips.json]]). Les jeux sont ceux qui ont un preset dans l'app et des sources sérieuses.

| Jeu | Réglages | Sources (date de la page lue) |
|---|---|---|
| VALORANT | 9 | ProSettings (18/05/2026), Hone (14/08/2026), Evetech (22/01/2026) |
| Fortnite | 8 | Evetech (05/2026), NoPing (02/10/2026), Esports.net (04/2025) |
| Counter-Strike 2 | 9 | CSDB (13/07/2026) |
| Apex Legends | 8 | EA, aide officielle (08/2026), ProSettings (25/06/2025) |
| PUBG | 8 | ProSettings (23/06/2026) |
| League of Legends | 6 | ProSettings (13/01/2025) |
| Marvel Rivals | 8 | ProSettings (11/04/2025) |
| THE FINALS | 9 | ProSettings (13/01/2025) |

- **VALORANT** : Enemy Highlight Color → Yellow (Deuteranopia) (le contour des ennemis dont parlait Sofiene) ; NVIDIA Reflex Low Latency → On + Boost ; Raw Input Buffer → On ; VSync → Off ; Material Quality · Detail Quality → Low ; Vignette · Bloom · Distortion → Off ; Cast Shadows → Off ; Network Buffering → Minimum (Moderate si la connexion est instable) ; Display Mode → Fullscreen.
- **Fortnite** : Rendering Mode → Performance ; **Turbo Building → On** (le délai de construction dont parlait Sofiene) ; Edit Hold Time → 0 à 0,1 ; Confirm Edit on Release → On ; NVIDIA Reflex → On + Boost (On sur une RTX 20) ; V-Sync · Motion Blur → Off ; Visualize Sound Effects → On ; 3D Resolution → 100 %.
- **Counter-Strike 2** : Boost Player Contrast → Enabled ; NVIDIA Reflex → Enabled + Boost (AMD : Anti-Lag 2) ; Wait for Vertical Sync → Disabled ; Global Shadow Quality → Medium ou High ; Multisampling Anti-Aliasing Mode → CMAA2 ou None ; Shader Detail · Particle Detail → Low ; Ambient Occlusion → Disabled ; FidelityFX Super Resolution → Disabled (Highest Quality) ; Display Mode → Fullscreen.
- **Apex Legends** : V-Sync → Disabled ; NVIDIA Reflex → Enabled + Boost (Enabled si les FPS chutent) ; Adaptive Resolution FPS Target → 0 ; Field of View → 110 ; FOV Ability Scaling → Disabled ; Ambient Occlusion Quality · Volumetric Lighting → Disabled ; Sun Shadow Coverage · Sun Shadow Detail → Low ; Display Mode → Full Screen.
- **PUBG** : Anti-Aliasing → Medium ; Post-Processing → Low ; Textures → Medium ; Shadows · Effects · Foliage → Very Low ; Render Scale → 100 ; V-Sync · Motion Blur → Off ; FPP Camera FOV → 103 ; Display Mode → Full Screen.
- **League of Legends** : Wait for Vertical Sync → Off ; Frame Rate Cap → Uncapped (la fréquence de l'écran si le jeu saccade) ; Character Inking → Off ; Anti-Aliasing → Off ; Shadow Quality · Effects Quality → Low ; Window Mode → Full Screen (Borderless marche aussi).
- **Marvel Rivals** : Low Latency Mode → On + Boost (AMD : Anti-Lag 2) ; V-Sync → Off ; Frame Generation → Off ; Anti-Aliasing and Super Resolution Type → TAAU, 100 % ; Shadow Detail → Medium ; Effects Detail · Foliage Quality · Post-Processing → Low ; Limit FPS → On, à la fréquence de l'écran ; Reflection Quality → Disable.
- **THE FINALS** : NVIDIA Reflex → On + Boost ; V-Sync → Off ; NVIDIA DLSS → Disabled (TAAU à 100 %) ; Motion Blur · Lens Distortion → Disabled ; Effects · Foliage → Low ; Shadows → Medium ; NVIDIA RTX Global Illumination → Static ; FOV → 100 ; Window Mode → Fullscreen.

**Pas couverts** (11/11) : Overwatch 2, Rainbow Six Siege, Rocket League, GTA V, Roblox, Escape from Tarkov (ils ont un preset, mais pas encore de liste) et Minecraft (réglages propres à Rago). Le jeu est reconnu à son exe ([[games.rs]]) parmi les exes des jeux de la bibliothèque en cours ; un client ou un launcher resté ouvert (client de League of Legends pendant une partie de VALORANT) passe après l'exe d'un jeu.

## Ce que le PC montre pendant la partie (nouveaux points à vérifier)
Mesuré seulement pendant une partie, option active :
- **Applis qui prennent beaucoup de processeur** : au moins **10 %** de tout le processeur, deux tours de suite (8 s) ; le signal tombe après trois tours en dessous. Les deux plus gourmandes sont nommées (« Google Chrome »).
- **Mémoire presque pleine** : au moins **85 %** occupés, deux tours de suite ; le signal tombe sous **80 %**. Les deux applis qui prennent le plus (au moins 500 Mo chacune) sont nommées, avec le conseil de les fermer ou d'utiliser « Nettoyer » de la barre en jeu.
- Jamais signalés : le jeu lui-même, Windows et l'antivirus, les anti-triche, les jeux connus (liste de [[memory.rs]]), Rago, PresentMon et WebView2.
- Mesure par les **compteurs de performance de Windows**, comme le Gestionnaire des tâches : **aucun processus n'est ouvert**, pas même le jeu ou son anti-triche.
- **Écran sous sa meilleure fréquence** : au moins 5 Hz sous la plus haute qu'il accepte à cette définition (60 Hz sur un écran 144 Hz), avec le chemin des Paramètres de Windows ; relu toutes les minutes (un jeu peut changer la fréquence en plein écran).
- **Game DVR actif** (enregistrement en arrière-plan de la Xbox Game Bar) : renvoie au réglage gratuit « Couper Game DVR » (onglet Windows, `win_gamedvr`).
- **Fond d'écran animé** : Wallpaper Engine (`wallpaper32.exe`, `wallpaper64.exe`), avec le réglage à changer dans Wallpaper Engine pour qu'il rende sa mémoire en jeu.
- **Medal** (`medal.exe`) ajouté aux logiciels d'enregistrement, à côté d'OBS Studio et Streamlabs.
Ces deux dernières applis apparaissent aussi dans le point « Applis en arrière-plan » de l'[[Analyse du PC]], qui réutilise la même liste.

## Données
- `tips-done.json` dans le dossier de données de l'app : les réglages cochés « fait », gardés d'une partie à l'autre ; supprimé quand plus rien n'est coché. Un réglage retiré de la liste dans une version suivante est ignoré.
- Rien ne part au serveur.

## Limites (11/11)
- **Jamais essayé sur un PC Windows avec un jeu** : compteurs des processus, rappel dans la pastille, fréquence de l'écran relue en partie. Testé : 173 tests Rust sous Linux, la CI Windows de la PR (tests du moteur sous Windows et installateur construits le 11/11), la démo de l'interface. Pour l'essayer : « Run workflow » d'`app-windows` sur la branche `claude/project-thread-g3od2h` avec le serveur `staging` (exe de test « Rago Optimizer Staging », à côté du vrai) ; l'installateur construit par la PR elle-même vise le serveur de prod.
- Les noms d'exe de Medal et Wallpaper Engine viennent de leur installation habituelle, pas vérifiés sur un PC.
- La liste est figée dans l'exe : la changer demande une nouvelle version. Trois jeux reposent sur des pages de 2025 (League of Legends, Marvel Rivals, THE FINALS) ; à revoir quand les jeux changent leurs menus.
- Pistes pas faites : lire les fichiers de réglages des jeux pour savoir ce qui est déjà fait ; d'autres jeux ([[Prochaines étapes]]).

## Code
- Moteur : [[tips.rs]] (jeu en cours, réglages cochés, applis gourmandes, écran, Game DVR), [[session.rs]] (état de la partie : `game`, `tipsLeft`, points à vérifier), [[overlay.rs]] (rappel dans la pastille), [[lib.rs]] (commandes `tips_done` et `tips_mark`, mesure dans la boucle des jeux), [[stats.rs]] (compteurs Windows sans plafond à 100 %), [[games.rs]] (`preset_key`), [[analysis.rs]] (`refresh`).
- Interface : [[GameTips.tsx]] (le bloc), [[tips.ts]] (lecture de la liste, réglages cochés), [[tips.json]] (la liste), [[Overlay.tsx]] (rappel et barre), [[Games.tsx]] (bibliothèque), [[SessionCard.tsx]] (textes des points à vérifier), styles `tips.css` ([[Styles de l'app (CSS)]]).
- Démo : `overlay.html?pill&nudge` (rappel), `?game=fortnite` (autre jeu), `/?playing` (bibliothèque avec une partie en cours), voir [[api.ts]].
