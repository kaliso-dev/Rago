---
type: code
tags: [code, serveur, javascript, admin, vault]
fichier: licensing/src/brain-views.js
lignes: 101
maj: 2026-11-10
---
# brain-views.js

La page HTML du [[Cerveau du vault]] (`GET /admin/cerveau`) : une application plein écran, vide au départ, que [[cerveau.js]] remplit avec les données de `/admin/cerveau/donnees.json` ([[brain.js]]). Fiche parente : [[Code du serveur]]. Voisine de [[admin-views.js]], qui dessine le reste de l'admin.

(code de la PR #85 du Cerveau, 10/11, pas encore dans `staging`)

## Ce que le fichier expose
- `brainPage(cfg)` → le document HTML complet, en français (`lang="fr"`), `noindex`. `cfg.envName` est posé en `data-env` (prod ou staging).

## Fonctionnement détaillé
- **Mêmes règles que tout `/admin`** : CSP stricte, donc **aucun script ni style en ligne** ; tout le comportement est dans `/assets/cerveau.js` (chargé en `defer`) et tout le style dans `/assets/tokens.css` et `/assets/cerveau.css`. Les icônes sont des SVG en ligne (tracés seulement). Le HTML est construit avec le gabarit `html` de [[views.js]], qui échappe les valeurs.
- `ASSETS = '20261110a'` : ajouté aux adresses de `cerveau.css` et `cerveau.js` (`?v=`). **À changer à chaque modification de ces deux fichiers**, sinon les navigateurs gardent l'ancienne version.
- Polices Geist et Geist Mono préchargées (comme l'admin), icône du site, couleur de thème `#070708`.
- Structure (identifiants utilisés par [[cerveau.js]]) :
  - `#cv` (racine, `data-src`, `data-file`, `data-env`) ; case cachée `#cv-nav` qui ouvre le tiroir sur téléphone (sans JavaScript, par `<label for>`).
  - Colonne `cv-side` : logo et retour à `/admin`, bouton de recherche (`data-palette`, `Ctrl K`), filtre `#cv-filter`, onglets `#tab-files` / `#tab-view` et leurs panneaux `#panel-files` / `#panel-view`, pied `#cv-sync` (branche, commit, heure de lecture) et bouton ↻ `#cv-refresh`.
  - Scène `#cv-stage` : `canvas#cv-canvas` (avec une description pour les lecteurs d'écran), barre de gauche (menu, chiffres `#cv-stats`), barre de droite (`#cv-local` avec `data-local` et `data-depth`, zoom `data-zoom`, `data-fit`, recherche sur téléphone), info-bulle `#cv-tip`, écran de chargement `#cv-loading` (logo qui pulse), aide `#cv-hint`.
  - Lecteur `#cv-reader` : poignée de largeur `#cv-resize`, barre (précédent `data-hist`, fil d'Ariane `#cv-crumbs`, actions `#cv-ractions`, fermer `data-close`), contenu `#cv-scroll` > `#cv-doc`.
  - Palette de recherche `#cv-palette` (`role="dialog"`), champ `#cv-q`, résultats `#cv-results`.
  - `<noscript>` : « Le Cerveau a besoin de JavaScript pour dessiner le graphe. »

## Liens avec le reste
Appelé par [[admin.js (serveur)]] pour `GET /admin/cerveau`. Le lien du menu est dans [[admin-views.js]] (section « Projet »). Styles : [[cerveau.css]].

## Tests
`brain.test.js` vérifie que la page n'a ni `<script>` sans `src`, ni attribut `style=`, ni `on…=` ([[Tests du serveur]]).
