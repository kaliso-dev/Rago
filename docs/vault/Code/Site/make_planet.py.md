---
type: code
tags: [code, site, python, image, rago-route]
fichier: site/tools/make_planet.py
lignes: 118
maj: 2026-11-24
---
# make_planet.py

Dessine `site/img/x/planet.webp`, la Terre de nuit de la section **Three ways in** de l'accueil : le haut du globe, vu d'un point de l'Atlantique sud, l'Europe au milieu de la calotte visible. Fiche parente : [[Code du site]]. Utilisée par [[page.html]].

CONFIRMÉ (branche `claude/project-thread-7emsbt`, 24/11/2026). Lancé à la main, jamais par [[build.py]] : `python3 site/tools/make_planet.py [qualité]` (80 par défaut). L'image est commitée, donc le script ne sert qu'à la refaire.

Demande de Sofiene du 24/11 : « je veux une image coupée comme ça du haut de la terre en 4K haute définition ». Le dessin SVG précédent (cercle, méridiens, quatre traits rouges) est abandonné.

## Sources, libres d'utilisation
- Les lumières des villes : **Black Marble** de la NASA (domaine public), l'équirectangulaire 4096 × 2048 livré avec `three-globe` sur GitHub.
- Les côtes : **Natural Earth 50 m** (domaine public), `ne_50m_land` et `ne_50m_lakes` en GeoJSON.

Les deux sont téléchargés une fois dans un cache hors du dépôt (`$TMPDIR/rago-planet`), parce que les hébergeurs d'images (NASA, Wikimedia) sont refusés par le réseau de l'environnement alors que `raw.githubusercontent.com` passe.

## Ce que fait le script
1. `land_mask()` : dessine les polygones de terre en blanc (les lacs en noir par-dessus) dans une carte équirectangulaire 12288 × 6144.
2. Projection **orthographique** du haut du globe, 3 × 3 échantillons par pixel, par bandes de 64 lignes : pour chaque pixel on retrouve sa latitude et sa longitude, puis on y lit la terre (plus proche voisin) et les lumières (bilinéaire).
3. Mélange : mer très sombre, terre bleu ardoise tirée de la texture sous 0,26, **villes** chaudes au-dessus de ce seuil (plus un halo flou à deux échelles), trait de côte fin, bleu de l'atmosphère qui monte vers le bord, liseré clair sur le limbe et halo transparent au-delà.
4. Enregistre en WebP avec transparence : au-dessus du limbe c'est le noir de la page qui se voit.

## Les constantes, recopiées dans page.html
`LAT0 = -10`, `LON0 = 8` (le centre du disque), `K = 0,5` (hauteur de l'image en rayons), `W = 5120` (largeur = deux rayons). La section s'en sert pour poser les pins de Frankfurt et de Paris et les flux de Rago Route **en pourcentage** de l'image : si on change ces constantes, il faut refaire les tracés (`x = P·est`, `v = 1 − P·nord`, en rayons) dans le bloc `.x-orb-pl` de [[page.html]].
