---
type: design
tags: [design, marque]
maj: 2026-11-01
---
# Charte graphique

Source de vérité : `brand/tokens/tokens.json` → `brand/tokens/tokens.css` (variables `--rg-*`), puis les copies de l'app, du site et du serveur. Charte `brand/charte.html` (v1.2 du 07/10). Voir [[Voix et ton]] et [[Refonte glass]].

- **Positionnement** : « Un outil de précision, pas un gadget « boost FPS » ». Principes : Précis, Rapide, Sobre (« un seul accent rouge, beaucoup de noir, aucune flamme ni éclair »).
- **Thème sombre unique**, « six encres, un rouge » : `--rg-ink-0` `#070708` → `--rg-ink-5` `#2A2A30` ; texte `#F5F5F6` / `#A1A1AA` / `#7C7C86`.
- **Rouge unique** `#FF3B30` (`--rg-red-500`) ; hover `#FF5E55`, pressed `#F2352B`, profond `#C9221A`. Dégradé rouge réservé aux héros, barres de progression et CTA d'achat. **Aucun orange.**
- Texte posé sur le rouge : **toujours `#0A0A0B`** (jamais blanc ; blanc accepté sur `#C9221A`).
- Autres : succès `#3DDC97` (gains mesurés), alerte `#FFD60A`, info `#5AB8FF`.
- **Typo** : Geist (interface) et Geist Mono (mesures, labels), auto-hébergées ; chiffres en `tabular-nums`.
- **Formes** : arrondis partout (8/12/16/24/32/40/999), actions principales en pilule. Relief par les paliers d'encre, pas les ombres.
- **Logo** : R rouge de Sofiene vectorisé, icône d'app sans tuile ; interdits : pivoté, déformé, contour, dégradé, néon.
- Historique : v1 (04/10) rouge `#FF3347` → v1.1 (05/10) `#FF3B30`, plus d'orange → v1.2 (06-07/10) logo et nom « Rago Optimizer ».
- Écarts à arbitrer : icône éclair du [[Mode jeu]] ; copies de tokens en retard ; alias de couleurs propres au [[Site]].

Liens : [[Site]], [[App Windows]], [[Marketing]].
