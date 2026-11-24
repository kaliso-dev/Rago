---
type: code
tags: [code, app, typescript, react, design]
fichier: app/src/components/Splash.tsx
lignes: 225
maj: 2026-11-24
---
# Splash.tsx

L'**écran de démarrage** de la charte v5 : le R tombe comme un tampon, « AGO » glisse, la bande « optimizer » se déroule, puis le statut et la jauge à segments vont jusqu'à « Ready » ; un aplat rouge penché avec le R noir passe ensuite et découvre l'app. Fiche parente : [[Code de l'app (interface)]]. Design : [[Charte graphique]].

Refait le 24/11 sur la maquette v5 `rendus-v5/perso/src/splash.html` (image `perso/demarrage.jpg`, vidéo `videos/anim-demarrage.mp4`) par la PR #PRX, jamais testé sur Windows. Avant : version de la PR #108 (22/11), 1,45 s.

## Durée fixe (décision du 23/11)
Sofiene, 23/11 à 22 h 40 : « pour l'écran de démarrage je veux une animation d'au moins 1,5 à 2 sec fixe pas dépendante de la vitesse à laquelle s'ouvre l'app ». Les durées sont comptées depuis la première image de l'animation, pas depuis le chargement : l'app se charge dessous pendant ce temps.
- 0 à 1 s : comme la maquette (R en tampon de 120 à 340 ms puis tremblement, « AGO » de 430 à 760 ms, bande de 700 à 960 ms, statut de 820 à 1 100 ms).
- 1 à 1,8 s : la jauge (28 segments) et le pourcentage de 0 à 100 ; messages « Checking Windows », « Reading drivers and games » (1,25 s), « Testing your connection » (1,55 s), « Ready » à 1,8 s (`READY_MS`), en blanc. La maquette fait la même jauge de 1 à 2,7 s ; ses instants de message sont ramenés à proportion.
- 2 à 2,3 s : l'aplat rouge entre (`WIPE_MS`) ; à 2,3 s (`SHOW_MS`) il couvre toute la fenêtre, la carte s'efface dessous (`.spl5.off`) et `onDone` est appelé ; [[App.tsx]] retire le composant, l'aplat repart vers la droite en 0,45 s et découvre l'app. L'app est visible en entier vers 2,75 s.
- Avant de partir, l'animation attend les polices du logo et du statut (Barlow Condensed 900 italique, Barlow 500), **400 ms au plus** (`FONTS_MS`) : fichiers locaux, quelques millisecondes en pratique. Pendant ce temps, la carte est vide (première image de la maquette).

## Fonctionnement détaillé
- HTML et CSS de la maquette : scène `.stage` (720 × 460 dans la maquette, ici à la taille de la fenêtre) et carte `.sp` (600 × 360) avec sa trame de points et son grain, logo en SVG (R de `LOGO_R` à l'échelle 0,4722, texte « AGO » en Barlow Condensed 120 px coupé par un `clipPath`), bande `.spt` (`.tape` dans la maquette), statut `.st` (message, pourcentage, jauge `.seg`). Les couches rouges décalées de la maquette (`#rb`, `#ab`) ne sont pas reprises : la maquette les cache elle-même depuis le 22/11.
- **Échelle** : `fit()` = le plus petit de largeur / 720 et hauteur / 450 ; la scène est agrandie d'autant (× 2 à 1440 × 900, la carte fait alors 1 200 × 720 comme l'image de la maquette) et suit le redimensionnement.
- L'animation est calculée image par image (`seek(ms)`, comme `__seq.seek` de la maquette, mêmes courbes que `seq.js`) et écrite directement dans le SVG et les styles, sans rendu React à chaque image ; seul le message passe par l'état.
- Textes : clés `splash.windows`, `splash.games`, `splash.network`, `splash.ready` ([[i18n.ts]]), en français « Vérification de Windows », « Lecture des pilotes et des jeux », « Test de ta connexion », « Prêt ».
- **Mouvement réduit** (réglage de l'app ou de Windows) : pas de tampon, de découpe ni d'aplat ; logo, bande et statut apparaissent en fondu (200 ms), la jauge va jusqu'à « Ready » à 1,8 s, et l'écran disparaît en fondu à 2,3 s.
- `aria-hidden` : rien n'est lu par les lecteurs d'écran.

## Liens avec le reste
- Logo de l'aplat : `LogoR` de `s5/I.tsx` ; tracé du R : `LOGO_R` de `s5/iconData.ts` ([[Maquettes v5 dans l'app (s5)]]).
- Styles : `s5/pages/splash.css` (généré depuis la maquette par `port_splash.py`) et le bloc « écran de démarrage » de `s5/app.css` (scène sur toute la fenêtre, jauge sans coins arrondis, aplat), voir [[Maquettes v5 dans l'app (s5)]].
- Vérifications : `shot-splash.js` (captures aux instants voulus, horloge figée) et `itest-splash.js` (9 vérifications en temps réel : messages en anglais et en français, « Ready » vers 1,8 s, aplat vers 2,3 s, app découverte avant 3,1 s, mouvement réduit), dans `rendus-v5/outils/`. À « Ready », la carte de l'app et la maquette à × 2 se superposent au pixel (aucun pixel ne diffère de plus de 40 sur 255).
