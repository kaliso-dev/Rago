---
type: design
tags: [design, marque]
maj: 2026-11-10
---
# Charte graphique

Source de vérité : `brand/tokens/tokens.json` et sa traduction `brand/tokens/tokens.css` (variables `--rg-*`, v1.2, identiques le 10/11 ; aucun script ne génère l'un depuis l'autre), puis les copies faites à la main dans l'app et le serveur ; le site redéclare ses propres alias avec les mêmes valeurs. Charte `brand/charte.html` (v1.2 du 07/10). Voir [[Voix et ton]] et [[Refonte glass]].

- **Positionnement** : « Un outil de précision, pas un gadget « boost FPS » ». Principes : Précis, Rapide, Sobre (« un seul accent rouge, beaucoup de noir, aucune flamme ni éclair »).
- **Thème sombre unique**, « six encres, un rouge » : `--rg-ink-0` `#070708` → `--rg-ink-5` `#2A2A30` ; texte `#F5F5F6` / `#A1A1AA` / `#7C7C86`.
- **Rouge unique** `#FF3B30` (`--rg-red-500`) ; hover `#FF5E55`, pressed `#F2352B`, profond `#C9221A`. Dégradé rouge réservé aux héros, barres de progression et CTA d'achat. **Aucun orange.**
- Texte posé sur le rouge : **toujours `#0A0A0B`** (jamais blanc ; blanc accepté sur `#C9221A`).
- Autres : succès `#3DDC97` (gains mesurés), alerte `#FFD60A`, info `#5AB8FF`.
- **Typo** : Geist (interface) et Geist Mono (mesures, labels), auto-hébergées ; chiffres en `tabular-nums`.
- **Formes** : arrondis partout (8/12/16/24/32/40/999), actions principales en pilule. Relief par les paliers d'encre, pas les ombres.
- **Logo** : R rouge de Sofiene vectorisé, icône d'app sans tuile ; interdits : pivoté, déformé, contour, dégradé, néon.
- Historique : v1 (04/10) rouge `#FF3347` → v1.1 (05/10) `#FF3B30`, plus d'orange → v1.2 (06-07/10) logo et nom « Rago Optimizer ».
- **Verre** (refonte du 16/10) : jetons `--rg-glass-*` ajoutés à `tokens.css` et `tokens.json` (surfaces translucides ; flou seulement sur ce qui flotte). Voir [[Refonte glass]].
- Écarts à arbitrer : icône éclair du [[Mode jeu]] ; **copies de tokens en retard** (CONFIRMÉ le 10/11) : `app/src/styles/tokens.css` (en-tête « v1.1 », sans `--rg-warning-a06/a10/a18`) et `licensing/public/tokens.css` (en-tête « v1.1 », sans les `--rg-warning-a*` ni les 8 jetons `--rg-glass-*`) ; les trois `--rg-warning-a*` ne sont utilisés nulle part ; alias de couleurs propres au [[Site]].
- **Chiffres périmés dans le kit** : `brand/README.md`, `charte.html` et `voice-en.md` parlent encore de « 12 modules » et « 199 tweaks » (218 tweaks aujourd'hui) ; l'image de partage du site `og-image.png` affiche « 199 tweaks ». La charte HTML ne décrit pas encore le verre.

## Code
Notes de code : [[Kit de marque (brand)]] (README, charte HTML, voix, fichiers du logo), [[tokens.css (marque)]] (jetons et `tokens.json`), [[export-logo.js]] (rendu des icônes, images de l'installateur et images de partage). Où le site applique la charte : [[Code du site]].

Liens : [[Site]], [[App Windows]], [[Marketing]].
