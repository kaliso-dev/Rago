---
type: code
tags: [code, site, python, svg, rago-route]
fichier: site/tools/make_planet.py
lignes: 237
maj: 2026-11-27
---
# make_planet.py

Dessine le globe de la section **Rago Route** de l'accueil, **directement dans `site/src/page.html`** : le globe entre `<!-- globe -->` et `<!-- /globe -->`, les flux et les pins entre `<!-- flows -->` et `<!-- /flows -->`. Fiche parente : [[Code du site]]. Utilisé par [[page.html]].

CONFIRMÉ (branche `claude/project-thread-7emsbt`, 24/11/2026). Lancé à la main, jamais par [[build.py]] : `python3 site/tools/make_planet.py`, puis `python3 site/tools/build.py`. Le SVG est commité dans `page.html`, donc le script ne sert qu'à le refaire.

Demande de Sofiene du 24/11 (deuxième version) : « au lieu de l'image que tu le dessines toi-même dans le même format que celui que je t'avais, mais comme celui que je t'ai donné dans l'image ». La référence est un globe filaire : points carrés sur une grille latitude/longitude là où il y a de la terre, côtes au trait, graticule, fond noir. L'image `site/img/x/planet.webp` de la première version est supprimée. Le soir même : « encore plus de points et de détails sur le globe et je veux aussi des flux qui viennent d'Asie et je veux des milliers de points et qu'il soit rouge ».

## Source, libre d'utilisation
Les côtes : **Natural Earth 50 m** (domaine public), `ne_50m_land` et `ne_50m_lakes` en GeoJSON, téléchargés une fois dans un cache hors du dépôt (`$TMPDIR/rago-planet`) depuis `raw.githubusercontent.com` (les hébergeurs d'images sont refusés par le réseau de l'environnement, pas celui-là).

## Ce que fait le script
1. `land_mask()` : rasterise les polygones de terre (les lacs en noir par-dessus) dans une carte équirectangulaire 2880 × 1440, avec PIL.
2. `dots()` : parcourt une grille de 0,75° × 0,75°, garde les cellules qui tombent sur la terre et sur la moitié du globe tournée vers nous, et pose un carré dont le côté suit `.32 + .68·√z` (plus petit quand la cellule s'éloigne du centre du disque). Chaque carré est écrit **en déplacement relatif** (`m dx dy h s v s h-s z`) depuis le précédent : les nombres restent à deux ou trois chiffres et le tracé se compresse très bien.
3. `coast()` et `graticule()` : les côtes et un méridien/parallèle tous les 15°, découpés au limbe (`line()`, `cross()`) puis simplifiés en Douglas-Peucker (`simplify()`). Les îles de moins de 0,002 rayon sont jetées.
4. `arc()` et `flows()` : les flux Rago Route et les pins, calculés avec la **même projection** que le globe, donc toujours d'accord avec lui. Un flux est un grand cercle entre deux villes, interpolé en 27 points et **soulevé** du globe (`LIFT` par radian de longueur, au plus `LIFT_MAX`) pour se lire comme une route au-dessus de la carte ; si l'arc monterait plus haut que `VTOP` il est aplati jusqu'à redescendre, pour ne jamais passer devant les cartes. Les onze décalages d'animation sont répartis sur le cycle `RUN` et mélangés pour que deux flux voisins ne pulsent pas ensemble.
5. `main()` : écrit les deux blocs et les recolle dans `page.html`. Tout est en unités entières de dix-millièmes de rayon : le globe fait **166 Ko** pour **7 738 points**, soit 34 Ko une fois compressé (`index.html` pèse 98 Ko compressé, comme avant les points supplémentaires).

## Les villes
`CITIES` : Frankfurt (le relais) et Paris (la sortie), nommés sur la page ; les joueurs en petits points, Milan, Dublin, Stockholm, Kyiv, Bucarest, **Novossibirsk, Iakoutsk, Astana** (l'Asie, demandée le 24/11) et Moscou. `FLOWS` : onze trajets vers Frankfurt ou Paris, plus Frankfurt → Paris.

Le cadrage n'autorise que ça : la vue est une calotte autour de (80 N, 8 E), donc l'Asie n'est atteignable que par les hautes latitudes (Sibérie, steppe). Iakoutsk est à 130° E, aussi loin à l'est que le Japon, mais Tokyo, Pékin ou Séoul sont trop au sud pour entrer dans la bande que la page montre. **Décidé le 27/11 (q119)** : Sofiene garde les flux d'Asie comme ils sont (Sibérie et steppe, pas de Tokyo, Pékin ou Séoul) ; le globe ne bouge pas ([[Décisions]]).

## Les constantes, recopiées dans page.html
`LAT0 = -10`, `LON0 = 8` (le point du globe au centre du disque, l'Europe dans la calotte visible), `K = 0,5` (hauteur du dessin en rayons), `U = 10000` (un rayon en unités SVG), `VMAX = 0,56` (rien n'est dessiné plus bas), `STEP = 0,75` (la grille de points), `DOT = 22` (le côté d'un point vu de face), `LIFT = 0,30` / `LIFT_MAX = 0,072` / `VTOP = 0,022` (la hauteur des flux), `RUN = 4,6 s` (le temps qu'une impulsion met à parcourir un flux, à garder égal à l'animation `orb-run` de [[page.html]]).

Le JavaScript de la section se sert du point le plus bas (Bucarest, **38,5 %** du dessin, soit 0,193 rayon) pour décider jusqu'où le globe peut grandir sans que ce pin tombe sous l'écran : si on change les villes ou le cadrage, il faut reprendre la constante `.193` dans le bloc `#route` de [[page.html]].
