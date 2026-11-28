# Rago : kit de marque v5 « Match day » (22 novembre 2026)

Remplace le kit v1.2 du 7 octobre (Geist, verre, R transparent). La charte complète est en images dans `charte/charte-1.jpg` à `charte-5.jpg` (10 chapitres : principes, logo, couleurs, typo, formes, effets d'affiche, icônes imprimées, voix, appliqué, fichiers).

## Logo (`logo/`)
- **Le R est rouge plein (#FF3B30) partout.** L'icône de l'app est un R rouge sur une tuile blanche. Plus de R blanc, noir ou imprimé, plus de tuile rouge. Seule exception : sur la transition rouge plein écran de l'app, le R est noir.
- `rago-mark.svg` : le R seul. `rago-app-icon.svg` (tuile blanche, 256) et `rago-app-icon-32.svg`, `rago-favicon.svg` (16 px), `rago-app-tile.svg` (plein cadre : avatars, Apple).
- `rago-lockup-app.svg` (R rouge + AGO blanc, comme dans l'app), `rago-lockup-app-ink.svg` (fond clair), `rago-lockup.svg` (tuile + RAGO, barres du site), `rago-wordmark-white.svg` / `-ink.svg` (nom complet). Texte vectorisé en Barlow Condensed Black Italic.
- `rago.ico` (16 à 256), `png/` (icônes 16 à 1024, avatar `rago-tile-512.png`, lockups 1200), `web/` (favicons, apple-touch 180, `og-image`, `og-launch`, `og-route` en 1200 × 630), `installer/` (fichiers Tauri et NSIS).
- Le site utilise `web/*` : `favicon.*`, `apple-touch-icon.png` et `og-image.png` sont copiés dans `site/` (`og-launch` servait au compte à rebours d’avant lancement, retiré le 28/11), `og-route.png` dans `site/media/`. Après une copie, relancer `python3 site/tools/build.py` (l'adresse des images de partage change avec leur contenu).
- App : `sh app/tools/sync_icons.sh` reprend `brand/logo` (icônes, installeur, favicon).

## Couleurs, typo, formes
- Fond `#0A0A0B`, panneaux `#111113`, surfaces `#17171A` / `#1F1F23`. Texte `#F5F5F6` / `#A1A1AA` / `#6E6E78`. Un seul accent : rouge `#FF3B30` (texte posé dessus en encre `#0A0A0B`, jamais en blanc). Papier `#ECE9E2`.
- Titres : Barlow Condensed 900 italique en capitales, interligne serré, coup de pinceau rouge derrière un mot. Texte : Barlow 400 à 700. Plus de Geist ni de police à chasse fixe.
- Boutons et étiquettes penchés (biais -12°), coins arrondis. Icônes « imprimées » (face pleine, copie rouge décalée derrière, bords rugueux) pour ce qui a un sens, icônes au trait pour les flèches et la croix.
- Tokens : `tokens/tokens.css` (variables `--rg-*`, mêmes noms qu'en v1.2) et `tokens/tokens.json` (v2.0).

## Voix
Le site, les pages compte et l'app sont en anglais US : référence **`voice-en.md`**. Tagline : *Every millisecond counts.*

## Régénérer
Les fichiers du kit sont produits par les scripts de la maquette (dépôt privé `kaliso-dev/rago-design`, dossier `rendus-v5/outils/marque/` ; chemin d'origine `/mnt/project-files/rago-redesign/`, voir le README de ce dépôt : `gen_brand.py`, `gen_tokens.py`, `gen_charte.py`), Python 3 avec fontTools, brotli et uharfbuzz, Playwright, ImageMagick pour les .ico. Ils écrivent dans le dossier du projet, puis on copie ici.
