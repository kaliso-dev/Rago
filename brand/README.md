# Rago — kit de marque v1.2 (7 octobre 2026)

> **v1.1 :** rouge `#FF3B30` à la place de `#FF3347`, plus aucun orange (dégradé rouge→orange supprimé, alerte en jaune), fin des formes carrées et coins coupés : arrondis partout (échelle ci-dessous).

Charte complète : `charte.html` (ouvrir dans un navigateur). Ce fichier est le résumé à appliquer pour l'app Windows (Rago Optimizer) et le site de vente.

## Logo (v1.2, 6 octobre 2026 : logo de Sofiene vectorisé, nom « Rago Optimizer »)
- Source vectorielle unique : `logo/rago-mark.svg` (R rouge #FF3B30, viewBox 164 × 180). Tout le reste se régénère avec `tools/export-logo.js`.
- Installeur NSIS : `logo/installer/sidebar.bmp` (164 × 314) et `header.bmp` (150 × 57), BMP 24 bits.
- Site : `logo/web/favicon.ico` (16/32/48), `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` (180), `og-image.png` (1200 × 630, l'aperçu des liens partagés : Discord, WhatsApp, réseaux) et `og-launch.png` (même format, celui du compte à rebours, qui ne montre que le nom).
- Logo principal « Rago Optimizer » (texte vectorisé en Geist) : `logo/rago-wordmark-white.svg` (fond sombre) ou `logo/rago-wordmark-ink.svg` (fond clair).
- Icône d'app (barre des tâches, .exe, .ico, PNG `png/rago-icon-*`) : `logo/rago-app-icon.svg`, **R rouge sur fond transparent, sans tuile** (demande de Sofiene, 6 oct.).
- Tuile sombre conservée pour les endroits qui exigent un fond opaque : `logo/rago-app-tile.svg` → `web/apple-touch-icon.png`, `png/rago-tile-512.png` (avatar Discord, réseaux).
- Symbole seul : `logo/rago-mark.svg` (rouge), `-white`, `-mono`.
- Windows : `logo/rago.ico` (16, 20, 24, 32, 40, 48, 64, 128, 256 px). PNG 16 → 1024 dans `logo/png/`.
- Sous 32 px et favicon : `logo/rago-favicon.svg` (R presque plein cadre, transparent).
- Le R est toujours rouge #FF3B30 (blanc ou monochrome seulement sur fond rouge ou photo). Ne pas pivoter, déformer, mettre en contour, en dégradé ou en néon.

## Couleurs (thème sombre par défaut)
| Rôle | Valeur |
|---|---|
| Fond fenêtre / fond / surface / survol / menus / actif | `#070708` `#0A0A0B` `#111113` `#17171A` `#1F1F23` `#2A2A30` |
| Texte 1 / 2 / 3 | `#F5F5F6` `#A1A1AA` `#7C7C86` |
| Accent unique (Rouge Rago) | `#FF3B30`, hover `#FF5E55`, pressed `#F2352B`, profond `#C9221A` |
| Dégradé rouge (moments forts seulement, aucun orange) | `linear-gradient(100deg,#C9221A,#FF3B30 55%,#FF5E55)` |
| Gain / alerte / info | `#3DDC97` `#FFD60A` `#5AB8FF` |

Texte posé sur le rouge : toujours `#0A0A0B` (5,6:1). Jamais de blanc sur `#FF3B30` (3,5:1) ; le blanc passe sur `#C9221A` (5,6:1).

## Typo
Geist (UI, titres en 600, interlettrage négatif) + Geist Mono (ping, FPS, versions, labels en capitales, `tabular-nums`). Licence OFL : embarquable dans l'app. npm `geist` ou Google Fonts.

## Formes, mouvement
- Arrondis partout, aucun angle vif ni coin coupé. Rayons : xs 8 (tags) · sm 12 (inputs, items de menu) · md 16 (boutons secondaires, tuiles) · lg 24 (cartes) · xl 32 (modales, sections, carte pricing) · 2xl 40 (héros) · full 999 (boutons principaux en pilule, toggles, chips). Imbrication : rayon enfant = rayon parent − padding.
- Relief par paliers d'encre, peu d'ombres.
- Durées 90 / 160 / 240 / 420 ms, `cubic-bezier(.16,1,.3,1)` par défaut, ressort pour les interrupteurs. Signature « Pulse » pendant une optimisation : des ondes rondes rouges partent du R et s'effacent (1600 ms, en boucle). Tout se coupe avec `prefers-reduced-motion` / l'option Windows « Effets d'animation ».

## Interface Rago Optimizer (direction)
Sidebar (12 modules, 199 tweaks) : Dashboard, Network, Latency, Graphics card, Windows, Hitreg, Minecraft, RBW Mod, Game mode, Expert mode, puis Restore et Settings. Chaque réglage : titre, une ligne d'explication, badge de risque (Safe / Advanced), interrupteur. Chiffres avant/après en Geist Mono avec delta vert. Bouton principal rouge à texte encre (« Apply 6 tweaks »). Maquette dans la section 07 de la charte.

## Voice (English)
Le site, les pages compte et l'app sont en anglais : la référence est **`voice-en.md`** (ton, vocabulaire produit, copy clé, licence 1 appareil). Résumé : "you" + contractions, sentence case, US English, chiffres mesurés, pas d'emoji ni de capitales hurlées. Tagline : *Every millisecond counts.*

## Tokens
`tokens/tokens.css` (variables `--rg-*`, importer tel quel) et `tokens/tokens.json` (mêmes valeurs, pour générer un thème WPF/WinUI/Tailwind).

## Régénérer les fichiers du logo
```
cd brand   # depuis la racine du dépôt
node tools/export-logo.js   # playwright requis ; PNG, favicon-32, apple-touch, og-image, installeur .png (Geist embarqué)
cd logo
convert png/rago-icon-{16,20,24,32,40,48,64,128,256}.png rago.ico
convert png/rago-icon-{16,32,48}.png web/favicon.ico
cp rago-favicon.svg web/favicon.svg
for n in sidebar header; do convert installer/$n.png -alpha off -type TrueColor BMP3:installer/$n.bmp; done
for n in og-image og-launch; do convert web/$n.png -dither FloydSteinberg -colors 256 -define png:compression-level=9 PNG8:web/$n.png; done   # ~85 et ~45 Ko au lieu de ~125
```
`node tools/export-logo.js og-image og-launch` ne refait que les fichiers dont le nom contient ces mots.
Ensuite, copier `logo/web/og-image.png` et `og-launch.png` dans `site/` puis relancer `python3 site/tools/build.py` : l'adresse de l'image dans le HTML change avec son contenu (`?v=`), ce qui force Discord, WhatsApp et les réseaux à la recharger.
Ensuite, copier `brand/logo/installer/*.bmp` dans `app/src-tauri/installer/` (chemins depuis la racine du dépôt).
