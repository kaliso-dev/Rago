---
type: code
tags: [code, site, python, icônes]
fichier: site/tools/sync_icons.py
lignes: 53
maj: 2026-11-22
---
# sync_icons.py

Écrit le sprite d'icônes de chaque page source du site : pour chaque `<use href="#i-NOM">` de la page, une `<symbol id="i-NOM">`, entre les marques `<!-- icons -->` et `<!-- /icons -->`. Fiche parente : [[Code du site]]. Données : [[icons_v5.json]].

CONFIRMÉ (branche du site v5, PR #109, 22/11/2026). Lancé par [[build.py]] (après [[sync_partners.py]]) pour toutes les pages de `site/src/*.html`, et par [[make_legal.py]] pour `terms.html`, `privacy.html` et `404.html`. À la main : `python3 site/tools/sync_icons.py [pages…]`.

## Fonctionnement
- `symbol(n)` : 
  - `logo` → le R de Rago (`viewBox 0 0 164 180`) ;
  - `discord` → le logo Discord, plein, couleur du texte (l'id `#discord` seul est réservé : [[build.py]] le remplace par l'invitation) ;
  - une icône de la liste `LINE` (flèches, chevrons, croix, menu…) ou sans forme imprimée → icône au trait (`stroke` 2, bouts ronds) ;
  - sinon une **icône imprimée** : la forme pleine (avec un masque qui découpe ses détails), penchée de -12°, posée deux fois : une copie rouge décalée de (1,3 ; 1,5) derrière (`color:var(--pb)`, filtre de bord rugueux `#rgh-back-s`) et la face devant (`color:var(--pf)`, filtre `#rgh-face-s`). Les couleurs sont en `style` dans la symbole parce que le CSS de la page n'atteint pas l'intérieur d'une copie `<use>`.
  - `ALIAS` donne le nom de la forme imprimée d'un nom d'interface (par exemple `wifi` et `net` → `network`, `gauge` → `latency`, `pad` → `games`).
- `sync(path)` : liste les noms utilisés (`href="#i-…"`), écrit le sprite (avec les filtres de bord rugueux une fois par page), réécrit le fichier seulement s'il change et affiche `page.html: 40 icons`.
- Un nom inconnu arrête tout : `sync_icons: no icon named '…' (see tools/icons_v5.json)`.

## À savoir
- Les icônes sont les mêmes que celles de l'app v5 (jeu d'icônes Rago).
- Une page sans les marques `<!-- icons -->` est ignorée.
