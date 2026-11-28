---
type: code
tags: [code, marque, design]
fichier: brand/
lignes: 96
maj: 2026-11-28
---
# Kit de marque (brand)

Le dossier `brand/` du dépôt : kit de marque **v5 « Match day »** du 22/11/2026 ([[Charte graphique]]). Résumé (`README.md`), charte en images (`charte/`), voix en anglais (`voice-en.md`), jetons (`tokens/`) et fichiers du logo (`logo/`). Fiche parente : [[Code du site]].

CONFIRMÉ (branche du site v5, PR #109 vers `staging`, 22/11). Le kit a été copié depuis le kit `rendus-v5/marque/` (aujourd'hui dans le dépôt privé `kaliso-dev/rago-design`) (`logo/` sans le sous-dossier `abandonnes/`, `tokens/`, `charte-1…5.jpg`). Retirés le même jour : la charte v1.2 `charte.html`, l'outil de rendu `tools/export-logo.js` et ses polices Geist, et les fichiers abandonnés du logo (`rago-mark-white.svg`, `rago-mark-mono.svg`, `rago-wordmark-mono.svg`, `png/rago-mark-white-512.png`, `installer/header.png`, `installer/sidebar.png`). « lignes » = `README.md` (23) + `voice-en.md` (73).

## Plan du dossier
| Chemin | Rôle | Note |
|---|---|---|
| `README.md` | résumé du kit v5 : logo, couleurs, typo, formes, voix, où sont les scripts qui régénèrent le kit | ci-dessous |
| `charte/charte-1.jpg` à `charte-5.jpg` | la charte v5 en images, 10 chapitres (principes, logo, couleurs, typo, formes, effets d'affiche, icônes imprimées, voix, appliqué, fichiers) | [[Charte graphique]] |
| `voice-en.md` | « Rago voice: English (v1.1) » | ci-dessous et [[Voix et ton]] |
| `tokens/tokens.css`, `tokens/tokens.json` | jetons `--rg-*` v2.0 | [[tokens.css (marque)]] |
| `logo/` | SVG, PNG, `.ico`, fichiers du site et de l'installeur | ci-dessous |

## `README.md`
- **Logo** : le R est rouge plein (#FF3B30) partout ; icône de l'app = R rouge sur tuile blanche ; plus de R blanc, noir ou imprimé, ni de tuile rouge (sauf R noir sur la transition rouge plein écran de l'app).
- **Couleurs, typo, formes** : fonds `#0A0A0B` à `#1F1F23`, texte `#F5F5F6` / `#A1A1AA` / `#6E6E78`, un seul accent rouge (texte encre dessus), papier `#ECE9E2` ; Barlow Condensed 900 italique en capitales pour les titres, Barlow pour le texte ; boutons penchés (-12°), coins arrondis, icônes imprimées.
- **Régénérer** : scripts de la maquette (`rendus-v5/outils/marque/` : `gen_brand.py`, `gen_tokens.py`, `gen_charte.py`), qui écrivent dans le dossier partagé ; on recopie ensuite ici. Pas d'outil de rendu dans le dépôt.
- Le site prend `logo/web/*` (copiés dans `site/` et `site/media/og-route.png`, puis [[build.py]]) ; l'app prend `brand/logo` avec `sh app/tools/sync_icons.sh`.

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
| `rago-mark.svg` | le R seul, rouge |
| `rago-app-icon.svg`, `rago-app-icon-32.svg` | icône de l'app : tuile blanche, R rouge (256, et version dessinée pour 32 px) |
| `rago-favicon.svg` | favicon (16 px) |
| `rago-app-tile.svg` | tuile plein cadre (avatars, Apple) |
| `rago-lockup-app.svg`, `rago-lockup-app-ink.svg` | R rouge + « AGO » blanc (ou encre sur fond clair), comme dans l'app |
| `rago-lockup.svg` | tuile + « RAGO » (barres du site) |
| `rago-wordmark-white.svg`, `rago-wordmark-ink.svg` | nom complet ; texte vectorisé en Barlow Condensed Black Italic |
| `rago.ico` | icône Windows (16 à 256) |
| `png/` | `rago-icon-16` à `-1024`, `rago-mark-512`, `rago-tile-512` (avatar), `rago-lockup-1200`, `rago-lockup-app-1200`, `rago-wordmark-ink-1200`, `rago-wordmark-white-1200` |
| `web/` | `favicon.svg`, `favicon.ico` (16/32/48), `favicon-32.png`, `apple-touch-icon.png` (180), `og-image.png`, `og-launch.png`, `og-route.png` (1200 × 630) |
| `installer/` | fichiers de Tauri et NSIS : `icon.ico`, `icon.png`, `32x32.png`, `128x128.png`, `128x128@2x.png`, `sidebar.bmp` et `@2x`, `header.bmp` et `@2x` |

Les SVG contiennent un manifeste C2PA dans `<metadata>` (provenance du fichier).

## Écarts connus (22/11)
- `voice-en.md` dit encore « App sections (12) … 199 tweaks in total » (218 tweaks distincts aujourd'hui, 10 sections de tweaks).
- L'app (`app/`) n'a pas encore repris ces fichiers tant que sa PR v5 n'est pas fusionnée ([[Charte graphique]]).

## Liens avec le reste
- Règles lisibles dans le vault : [[Charte graphique]], [[Voix et ton]].
- Utilisateurs : le site ([[Code du site]], [[Fichiers publiés du site]]), l'app ([[App Windows]]), le serveur de comptes ([[Serveur de licences]]), la communication ([[Marketing]]).
