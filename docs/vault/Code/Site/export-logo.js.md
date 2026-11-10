---
type: code
tags: [code, marque, javascript, playwright]
fichier: brand/tools/export-logo.js
lignes: 83
maj: 2026-11-10
---
# export-logo.js

Script Node qui fabrique toutes les images de la marque à partir des SVG de `brand/logo/` : icônes PNG de 16 à 1 024 px, symbole, logotype, icônes du site, images de l'installateur et images de partage (`og-image.png`, `og-launch.png`). Fiche parente : [[Kit de marque (brand)]]. Fonctionnalité : [[Charte graphique]], [[Site]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Commentaires en français. Dernière modification le 09/10 (`4dfbcc6`, nouvelle image de partage, PR #12).

## Rôle et place dans l'ensemble
- Seul outil de rendu de la marque : un Chromium sans écran (Playwright) dessine chaque SVG ou chaque petit gabarit HTML et en fait une capture PNG.
- Usage : `cd brand && node tools/export-logo.js` (Playwright requis), puis les commandes ImageMagick du README (`convert` pour `rago.ico`, `web/favicon.ico`, les BMP de l'installateur et la réduction des images de partage à 256 couleurs). Argument optionnel : `node tools/export-logo.js og-image og-launch` ne refait que les fichiers dont le nom contient un de ces mots.
- Les fichiers produits restent dans `brand/logo/` ; il faut ensuite **les recopier à la main** : `logo/web/og-image.png` et `og-launch.png` dans `site/` (puis [[build.py]], qui change l'empreinte `?v=` de l'image), `logo/installer/*.bmp` dans `app/src-tauri/installer/`.

## Ce que le fichier produit
### Rendus de SVG (`jobs`, fond transparent)
| Sortie (dans `brand/logo/`) | Source SVG | Taille |
|---|---|---|
| `png/rago-icon-16.png` … `png/rago-icon-1024.png` (16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024) | `rago-favicon.svg` jusqu'à 32 px, `rago-app-icon.svg` au-delà | carré |
| `png/rago-mark-512.png` | `rago-mark.svg` | 466 × 512 |
| `png/rago-mark-white-512.png` | `rago-mark-white.svg` | 466 × 512 |
| `png/rago-wordmark-white-1200.png`, `png/rago-wordmark-ink-1200.png` | logotypes blanc et encre | 1 200 × 192 |
| `web/apple-touch-icon.png` | `rago-app-tile.svg` (tuile sombre) | 180 × 180 |
| `png/rago-tile-512.png` | `rago-app-tile.svg` | 512 × 512 |
| `web/favicon-32.png` | `rago-favicon.svg` | 32 × 32 |

### Gabarits HTML (`html`, polices Geist intégrées)
| Sortie | Taille | Contenu |
|---|---|---|
| `installer/sidebar.png` | 164 × 314 | bandeau gauche de l'installateur NSIS : R rouge, « Rago / Optimizer », « Every millisecond counts. », halo rouge |
| `installer/header.png` | 150 × 57 | en-tête de l'installateur : fond blanc, R dans une tuile sombre |
| `web/og-image.png` | 1 200 × 630 | image de partage du site : logotype, « Every millisecond counts. », « The Windows optimizer for Minecraft PvP. Less input lag, smoother frames, steadier ping. », pastilles « **<TOTAL> tweaks** » et « Free to start », fausse fenêtre « 3 TWEAKS SELECTED » avec trois vrais tweaks Safe (Disable mouse acceleration / LATENCY, Disable Game DVR / WINDOWS, Disable NIC power saving / NETWORK) et un bouton « Apply 3 tweaks » |
| `web/og-launch.png` | 1 200 × 630 | image du compte à rebours ([[launch-gate.js]]) : R entouré d'ondes, « Rago Optimizer », « Every millisecond counts. » |

## Fonctionnement détaillé
1. `load(f)` lit un SVG de `brand/logo/` et **retire son bloc `<metadata>`** (les SVG portent un manifeste C2PA qui casserait le rendu) ; le SVG est injecté dans la page (pas de `file://`, qui donnait une image cassée).
2. `TOTAL` = nombre de clés distinctes (`twin` ou `id`) des tweaks de `app/src/data/catalog.json` ([[catalog.json]]), même règle que l'app et le site. Le 10/11 : **218**.
3. Les polices `brand/tools/fonts/Geist-Variable.woff2` et `GeistMono-Variable.woff2` (licence OFL) sont intégrées en base64 : aucune dépendance réseau. Le script vérifie que Geist 700 et Geist Mono 500 sont bien chargées, sinon erreur « Geist non chargé pour <fichier> ».
4. Chromium est lancé avec `--disable-lcd-text --font-render-hinting=none` ; la variable d'environnement `PLAYWRIGHT_CHROMIUM` permet d'indiquer un Chromium déjà installé.
5. Pour chaque travail : taille de fenêtre = taille de l'image, capture découpée exactement (fond transparent pour les SVG).

## Données touchées
- Lit : `brand/logo/*.svg`, `brand/tools/fonts/*.woff2`, `app/src/data/catalog.json`.
- Écrit : `brand/logo/png/*`, `brand/logo/web/apple-touch-icon.png`, `favicon-32.png`, `og-image.png`, `og-launch.png`, `brand/logo/installer/*.png`.

## Erreurs et cas limites
- **L'image de partage publiée est en retard** : `site/og-image.png` (identique à `brand/logo/web/og-image.png`, 84 Ko) affiche encore « **199 tweaks** » (rendu du 09/10), alors que le script produirait aujourd'hui « 218 tweaks » et que le site dit « Nearly 220 tweaks ». Il faut relancer le script avec `og-image`, réduire l'image (README), la copier dans `site/` et relancer [[build.py]]. À VÉRIFIER avec Sofiene (préférence entre « 218 » et « Nearly 220 » sur l'image).
- Les icônes `site/favicon.svg`, `site/favicon-32.png` et `site/apple-touch-icon.png` ne diffèrent de celles de `brand/logo/web/` que par leurs métadonnées C2PA (mêmes images, même taille).
- Les BMP de l'installateur de l'app (`app/src-tauri/installer/sidebar.bmp`, `header.bmp`) et l'icône `app/src-tauri/icons/icon.ico` sont identiques à ceux de `brand/logo/` (vérifié le 10/11).

## Liens avec le reste
- Kit de marque : [[Kit de marque (brand)]] ; jetons : [[tokens.css (marque)]].
- Utilisateurs des images : le site ([[Fichiers publiés du site]], [[build.py]]), la fonction [[launch-gate.js]] (`og-launch.png`), l'installateur de l'app ([[App Windows]]).
- Même outil de rendu (Playwright) que [[prerender.js]].

## À savoir avant de modifier
- Le texte de l'image de partage est en anglais et doit suivre [[Voix et ton]] (pas de gain chiffré non mesuré).
- Après tout changement du nombre de tweaks, penser à cette image : aucun contrôle automatique ne la compare au site.
