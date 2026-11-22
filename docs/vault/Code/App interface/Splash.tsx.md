---
type: code
tags: [code, app, typescript, react, design]
fichier: app/src/components/Splash.tsx
lignes: 72
maj: 2026-11-22
---
# Splash.tsx

L'**écran de démarrage** de la charte v5 : carte au logo RAGO et ruban « optimizer », « Loading » puis « Ready » avec le pourcentage, jauge à segments, puis un aplat rouge penché avec le R noir qui ouvre sur l'app. Fiche parente : [[Code de l'app (interface)]]. Design : [[Charte graphique]].

Réécrit par la PR #108 du 22/11, vers `staging`, jamais testée sur Windows (maquette `perso/demarrage.jpg`).

## Fonctionnement détaillé
- `Splash({ onDone })` appelle `onDone` après **1 450 ms** (`SHOW_MS`) ; [[App.tsx]] retire alors le composant, ce qui joue la sortie.
- Carte : `Mark` rouge de 150 px, « AGO » en condensé 900 italique, ruban papier « optimizer » (`.splash-tape`).
- Pied (`.splash-foot`) : « Loading » puis « Ready » à 100 %, pourcentage animé par une valeur `motion`, jauge de 28 segments (`.splash-segs`).
- À `SHOW_MS - 300`, l'aplat rouge penché (`.splash-wipe`) entre avec le R noir (`Mark ink`, 96 px) et « AGO » ; à la sortie, il part vers la droite et découvre l'app.
- `aria-hidden` : rien n'est lu par les lecteurs d'écran. En mouvement réduit, `MotionConfig` de [[App.tsx]] ne garde que les fondus.

## Liens avec le reste
- Logo : `Mark` ([[Petits composants de l'interface]]).
- Styles : section « splash » de `v5.css` ([[Styles de l'app (CSS)]]).
