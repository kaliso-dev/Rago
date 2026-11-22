---
type: code
tags: [code, site, données, icônes]
fichier: site/tools/icons_v5.json
maj: 2026-11-22
---
# icons_v5.json

Le jeu d'icônes Rago du design v5 ([[Charte graphique]]), pour le site : lu par [[sync_icons.py]]. Fiche parente : [[Code du site]].

CONFIRMÉ (branche du site v5, PR #109, 22/11/2026). Clés :
- `P` : 94 icônes au trait (contenu SVG en 24 × 24), par nom (`grid`, `activity`, `arrow`, `chev`, `download`, `external`, `pencil`, `chat`…).
- `G` : 86 formes pleines des icônes imprimées, chacune `[forme, découpes]`.
- `ALIAS` : 17 correspondances d'un nom d'interface vers une forme imprimée (`grid` → `dashboard`, `wifi` et `net` → `network`, `gauge` → `latency`, `gpu` → `graphics`, `crosshair` → `hitreg`, `pad` → `games`, `box` → `minecraft`, `shield` → `rbw`, `terminal` → `expert`, `undo` → `restore`, `sliders` → `settings`…).
- `LINE` : 11 noms toujours dessinés au trait (`arrow`, `chev`, `dot`, `left`, `loader`, `menu`, `right`, `trend`, `trenddown`, `upright`, `x`).
- `FILTERS` : les filtres SVG de bord rugueux (`rgh-face`, `rgh-back` et leurs variantes `-s`, `-l`).
- `R` : le tracé du R de Rago.

Source : les icônes de l'app v5 (maquettes `rendus-v5/src/icons.js` et `printicons.js`). Ajouter une icône ici, puis relancer [[build.py]].
