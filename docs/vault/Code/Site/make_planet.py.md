---
type: code
tags: [code, site, python, svg, rago-route]
fichier: site/tools/make_planet.py
lignes: 171
maj: 2026-11-24
---
# make_planet.py

Dessine le globe de la section **Rago Route** de l'accueil, **directement dans `site/src/page.html`**, entre les marqueurs `<!-- globe -->` et `<!-- /globe -->`. Fiche parente : [[Code du site]]. Utilisé par [[page.html]].

CONFIRMÉ (branche `claude/project-thread-7emsbt`, 24/11/2026). Lancé à la main, jamais par [[build.py]] : `python3 site/tools/make_planet.py`, puis `python3 site/tools/build.py`. Le SVG est commité dans `page.html`, donc le script ne sert qu'à le refaire.

Demande de Sofiene du 24/11 (deuxième version) : « au lieu de l'image que tu le dessines toi-même dans le même format que celui que je t'avais, mais comme celui que je t'ai donné dans l'image ». La référence est un globe filaire : côtes blanches, points carrés sur une grille latitude/longitude là où il y a de la terre, graticule gris, fond noir. L'image `site/img/x/planet.webp` de la première version est supprimée.

## Source, libre d'utilisation
Les côtes : **Natural Earth 50 m** (domaine public), `ne_50m_land` et `ne_50m_lakes` en GeoJSON, téléchargés une fois dans un cache hors du dépôt (`$TMPDIR/rago-planet`) depuis `raw.githubusercontent.com` (les hébergeurs d'images sont refusés par le réseau de l'environnement, pas celui-là).

## Ce que fait le script
1. `land_mask()` : rasterise les polygones de terre (les lacs en noir par-dessus) dans une carte équirectangulaire 2880 × 1440, avec PIL.
2. `dots()` : parcourt une grille de 1,25° × 1,25°, garde les cellules qui tombent sur la terre et sur la moitié du globe tournée vers nous, et pose un carré dont le côté suit `.32 + .68·√z` (plus petit quand la cellule s'éloigne du centre du disque).
3. `coast()` et `graticule()` : les côtes et un méridien/parallèle tous les 15°, découpés au limbe (`line()`, `cross()`) puis simplifiés en Douglas-Peucker (`simplify()`). Les îles de moins de 0,002 rayon sont jetées.
4. `main()` : écrit un `<svg class="x-orb-gl">` de quatre tracés (`lm` le limbe, `gr` le graticule, `dt` les points, `cs` les côtes) et le recolle dans `page.html`. Tout est en unités entières de dix-millièmes de rayon : le bloc fait **95 Ko** pour **2 780 points** (34 Ko une fois compressé, contre 177 Ko pour l'image qu'il remplace).

## Les constantes, recopiées dans page.html
`LAT0 = -10`, `LON0 = 8` (le point du globe au centre du disque, l'Europe dans la calotte visible), `K = 0,5` (hauteur du dessin en rayons), `U = 10000` (un rayon en unités SVG), `VMAX = 0,56` (rien n'est dessiné plus bas), `STEP = 1,25` (la grille de points), `DOT = 32` (le côté d'un point vu de face). Densité et finesse revues le 24/11 au soir (Sofiene : « refait le globe avec plus de point plus de détails ») : la grille passe de 2° à 1,25° et la tolérance de simplification des côtes de .0012 à .0006.

La section pose les pins de Frankfurt et de Paris et les flux Rago Route **en pourcentage** du dessin, d'après la même projection (`x = P·est`, `v = 1 − P·nord`, en rayons) : si on change ces constantes, il faut refaire ces tracés dans le bloc `.x-orb-pl` de [[page.html]].
