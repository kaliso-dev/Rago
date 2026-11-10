---
type: code
tags: [code, marque, design]
fichier: brand/
lignes: 636
maj: 2026-11-10
---
# Kit de marque (brand)

Le dossier `brand/` du dépôt : le résumé de la charte (`README.md`), la charte complète à ouvrir dans un navigateur (`charte.html`), la voix en anglais (`voice-en.md`), les jetons de design (`tokens/`), les fichiers du logo (`logo/`) et l'outil qui les fabrique (`tools/`). Fiche parente : [[Code du site]]. Fonctionnalité : [[Charte graphique]], [[Voix et ton]].

Tout ce qui suit est CONFIRMÉ (fichiers de `staging`, 10/11). Les « lignes » de l'en-tête sont la somme des quatre fichiers texte principaux (`README.md` 60, `charte.html` 420, `voice-en.md` 73, `tools/export-logo.js` 83, hors jetons qui ont leur propre note). Le dossier n'est ni publié ni utilisé à l'exécution : c'est une référence, et chaque copie (app, site, serveur, installateur) est faite à la main.

## Plan du dossier
| Chemin | Rôle | Note |
|---|---|---|
| `README.md` | « kit de marque v1.2 (7 octobre 2026) » : résumé à appliquer pour l'app et le site, et commandes de régénération du logo | ci-dessous |
| `charte.html` | charte complète en français (page sombre, colonne de 1 080 px, sections numérotées) | ci-dessous |
| `voice-en.md` | « Rago voice: English (v1.1) » : la voix de toutes les surfaces anglaises | ci-dessous et [[Voix et ton]] |
| `tokens/tokens.css`, `tokens/tokens.json` | jetons `--rg-*` | [[tokens.css (marque)]] |
| `tools/export-logo.js` | rendu de toutes les images | [[export-logo.js]] |
| `tools/fonts/Geist-Variable.woff2`, `GeistMono-Variable.woff2` | polices intégrées dans les rendus (licence OFL ; 56 800 et 58 048 octets, d'une autre version que les copies de `site/fonts/`, 69 652 et 71 368 octets) | [[export-logo.js]] |
| `logo/` | SVG sources et fichiers produits | ci-dessous |

## `README.md` (60 lignes)
- **Historique** : v1.1 (05/10) : rouge `#FF3B30` au lieu de `#FF3347`, plus d'orange (dégradé rouge→orange supprimé, alerte en jaune), plus de formes carrées ni de coins coupés. v1.2 (06-07/10) : logo de Sofiene vectorisé, nom « Rago Optimizer ».
- **Logo** : source vectorielle unique `logo/rago-mark.svg` (R rouge `#FF3B30`, viewBox 164 × 180) ; icône d'app **R rouge sur fond transparent, sans tuile** (demande de Sofiene du 06/10) ; tuile sombre gardée seulement où un fond opaque est exigé (apple-touch, avatar Discord) ; favicon et moins de 32 px : `rago-favicon.svg` (R presque plein cadre) ; le R est toujours rouge (blanc ou monochrome seulement sur rouge ou photo) ; interdits : pivoter, déformer, contour, dégradé, néon.
- **Couleurs, typo, formes, mouvement** : mêmes valeurs que [[tokens.css (marque)]] ; texte sur rouge toujours `#0A0A0B` ; rayons 8 / 12 / 16 / 24 / 32 / 40 / 999 ; durées 90 / 160 / 240 / 420 ms, signature « Pulse » (ondes rouges qui partent du R, 1 600 ms, en boucle).
- **Interface (direction)** : « Sidebar (12 modules, 199 tweaks) » : **chiffre périmé** (218 tweaks distincts aujourd'hui, 10 sections de tweaks côté site).
- **Voix** : renvoie à `voice-en.md`.
- **Régénérer le logo** : `node tools/export-logo.js`, puis ImageMagick : `convert png/rago-icon-{16…256}.png rago.ico`, `convert png/rago-icon-{16,32,48}.png web/favicon.ico`, `cp rago-favicon.svg web/favicon.svg`, conversion des PNG de l'installateur en BMP 24 bits (`BMP3:`), réduction des images de partage en PNG 8 bits (environ 85 et 45 Ko au lieu de 125). Ensuite copier `logo/web/og-image.png` et `og-launch.png` dans `site/` et relancer [[build.py]] ; copier `logo/installer/*.bmp` dans `app/src-tauri/installer/`.

## `charte.html` (420 lignes)
Charte « Charte Rago » en français, thème sombre, Geist chargé depuis Google Fonts (c'est un document interne, non publié). Sections (`id`) et titres :
1. `marque` : « Un outil de précision, pas un gadget « boost FPS ». » (principes Précis, Rapide, Sobre) ;
2. `logo` : « Le R de Rago Optimizer. » (bons usages et interdits, `#bad`) ;
3. `couleurs` : « Six encres, un rouge. » ;
4. `typo` : « Geist pour parler, Geist Mono pour mesurer. » ;
5. `formes` : « Arrondi partout. » ;
6. `mouvement` : « Court, ferme, et une onde quand ça travaille. » (démonstrations : interrupteur `#demo-tog` et compteur `#demo-count` qui descend de 41 à 18 ms en 1,4 s, figé à 18 avec « réduire les animations ») ;
7. `app` : « Rago Optimizer, appliqué. » (maquette de l'app, texte « 12 modules (199 réglages) » et « 199 tweaks · 12 modules » : **périmé**) ;
8. `voix` : « Talk to one player. Measure. Never overpromise. » ;
9. `fichiers` : « Tout est dans le dossier brand. ».
Version indiquée : v1.2 du 07/10. Elle ne contient pas les jetons de verre (refonte du 16/10, voir [[Refonte glass]]).

## `voice-en.md` (73 lignes)
« This replaces the French "Voix" section of the charter for every English surface » : site, pages compte et licence, app, e-mails, annonces Discord.
- **Slogan** : « Every millisecond counts. » ; anglais US ; **sentence case** partout (« Apply 6 tweaks »).
- **Principes** : Direct (« you », contractions, ni corporate ni argot), Precise (unités réelles : ms, FPS, %), Calm (pas de majuscules criées, pas d'emoji dans le produit et le site, un « ! » au plus par écran), Honest (jamais un chiffre non mesuré sur le PC du joueur, « up to » seulement avec une source, toujours dire comment annuler).
- **Vocabulaire exact** : Rago Optimizer (plus jamais « Rago Hub ») ; Free (« Unlock with Premium » sur ce qui est verrouillé, « Get Premium » sur le bouton) ; Premium (jamais « Pro ») ; **Lifetime** (nom d'offre, jamais « Lifetime Pro » ou « deal » ; « Get Lifetime ») ; **Partners** (« See all partners », « Join on Discord », noms exacts) ; tweak (jamais hack, boost, cheat) ; Apply / Applied ; Restore / restore point ; Safe / Advanced ; license key, activate ; Create account, Sign in, Sign out. La ligne « App sections (12) … 199 tweaks in total » est **périmée**.
- **Nombres** : espace avant l'unité (`18 ms`), pas avant `%` ; vrais signes `−23 ms`, `+38 FPS`, en vert quand c'est un gain ; prix `$X.XX`.
- **À faire / à éviter**, **textes clés** par surface (site, après paiement, licence sur un seul appareil, app) et **erreurs** (dire ce qui s'est passé puis quoi faire, sans excuse ni code nu).

## `logo/`
| Fichier | Usage |
|---|---|
| `rago-mark.svg` | **source unique** : le R rouge (164 × 180) |
| `rago-mark-white.svg`, `rago-mark-mono.svg` | R blanc (sur rouge ou photo), monochrome |
| `rago-wordmark-white.svg`, `-ink.svg`, `-mono.svg` | logotype « Rago Optimizer » vectorisé en Geist (fond sombre, fond clair, mono) ; `site/rago-wordmark.svg` en est une copie |
| `rago-app-icon.svg` | icône d'app sans tuile (≥ 40 px) |
| `rago-favicon.svg` | R plein cadre pour les petites tailles et le favicon |
| `rago-app-tile.svg` | tuile sombre (apple-touch, avatar Discord) |
| `rago.ico` | icône Windows multi-tailles (16 à 256) ; identique à `app/src-tauri/icons/icon.ico` |
| `png/` | `rago-icon-16` à `-1024`, `rago-mark-512`, `rago-mark-white-512`, `rago-tile-512`, `rago-wordmark-ink-1200`, `rago-wordmark-white-1200` |
| `web/` | `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `og-image.png`, `og-launch.png` (copiés dans `site/`) |
| `installer/` | `sidebar.png/.bmp` (164 × 314), `header.png/.bmp` (150 × 57) ; les BMP sont identiques à ceux de `app/src-tauri/installer/` |

Les SVG contiennent un manifeste C2PA dans `<metadata>` (provenance du fichier) ; [[export-logo.js]] le retire avant le rendu. Le logo d'Adam (création proposée) est un autre sujet : [[Logo création d'Adam]].

## Écarts trouvés le 10/11
- « 199 tweaks » et « 12 modules » dans `README.md`, `charte.html` et `voice-en.md` ; `site/og-image.png` affiche aussi « 199 tweaks » (voir [[export-logo.js]]).
- Copies des jetons en retard dans l'app et le serveur (voir [[tokens.css (marque)]]).
- Le kit ne décrit pas encore la [[Refonte glass]] ailleurs que dans les jetons.

## Liens avec le reste
- Règles lisibles dans le vault : [[Charte graphique]], [[Voix et ton]], [[Refonte glass]].
- Utilisateurs : le site ([[Code du site]], [[Fichiers publiés du site]]), l'app ([[App Windows]]), le serveur de comptes ([[Serveur de licences]]), la communication ([[Marketing]]).
