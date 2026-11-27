# Marque Rago v5 « Match day » (22 novembre 2026)

Remplace le kit v1.2 du 7 octobre (`brand/` du dépôt). Rien n'est copié dans le dépôt sans la demande de Sofiene.

- `charte-1…5.jpg` : la charte, 10 chapitres (principes, logo, couleurs, typo, formes, effets d'affiche, icônes imprimées, voix, appliqué, fichiers).
- `logo/` : mêmes noms que `brand/logo/`, chaque fichier remplace l'ancien. **Depuis le 22/11 au soir, le R est rouge plein partout, et l'icône de l'app est un R rouge sur une tuile blanche.** Plus de R imprimé (face papier, couche rouge décalée, bords rugueux), plus de R blanc ni de R noir, plus de tuile rouge.
  - `rago-mark.svg` : le R seul, rouge.
  - `rago-app-icon.svg` (tuile blanche, R rouge, 256), `-32` ; `rago-favicon.svg` (16 px) ; `rago-app-tile.svg` (plein cadre : avatars, Apple).
  - `rago-lockup-app.svg` (R rouge + AGO blanc, comme dans l'app), `-ink` (AGO en encre, fond clair), `rago-lockup.svg` (tuile + RAGO, site), `rago-wordmark-white.svg` / `-ink` (nom complet). Texte vectorisé en Barlow Condensed Black Italic, crénage HarfBuzz.
  - `rago.ico` (16 à 256), `png/` (icônes 16 → 1024, avatar `rago-tile-512.png`, R rouge 512, lockups 1200), `web/` (favicon .ico 16/32/48, .svg, 32 px, apple-touch 180, og-image / og-launch / og-route), `installer/` (fichiers Tauri et NSIS).
  - `abandonnes/` : les fichiers retirés le 22/11 (R blanc `rago-mark-white.svg`, R noir `rago-mark-mono.svg`, R imprimé `rago-mark-printed.svg` et `-printed-ink`, tuile rouge `rago-app-icon-red.svg`, `rago-wordmark-mono.svg` et leurs PNG), gardés pour mémoire. À ne plus utiliser.
- `tokens/tokens.css` et `tokens.json` (v2.0) : mêmes noms `--rg-*` que le dépôt, valeurs v5 ; nouveaux : papier, biais, rayons v5, styles de texte `--rg-t-*`. Les tokens Geist et verre de la v1.2 sont gardés dans un bloc à part.
- `discord-messages.jpg` et `discord/` : proposition pour le bot (embeds rouges, bannières 1200 × 480, boutons de lien). Demande une modification de `licensing/src/community.js`.

Régénérer : scripts dans `rendus-v5/outils/marque/` (`gen_brand.py`, `gen_tokens.py`, `gen_charte.py`, `gen_discord.py`), Python 3 avec fontTools, brotli, uharfbuzz ; Playwright ; ImageMagick pour les .ico.
