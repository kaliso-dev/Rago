---
type: code
tags: [code, app, typescript, react, design]
fichier: app/src/components/Splash.tsx
lignes: 51
maj: 2026-11-10
---
# Splash.tsx

L'**animation de lancement** : la marque sort du flou avec son onde, le nom suit, une barre se remplit, puis l'écran s'efface sur l'app. Fiche parente : [[Code de l'app (interface)]]. Design : [[Charte graphique]], [[Refonte glass]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- `Splash({ onDone })` appelle `onDone` après **1 450 ms** (`SHOW_MS`) ; [[App.tsx]] retire alors le composant, ce qui joue la sortie (fondu de 0,5 s, le centre grossit à 1,06 et se floute de 6 px).
- Séquence (courbe `[0.16, 1, 0.3, 1]`) : halo qui grandit (0,6 → 1 en 1,2 s) ; logo `Mark` de 76 px qui passe de 14 px de flou à net et de l'échelle 0,78 à 1 en 0,8 s ; trois ondes CSS décalées de 250, 570 et 890 ms ; nom (`Wordmark` 20 px) qui monte et se dé-floute à partir de 0,32 s ; barre qui se remplit de 0,2 s à 1,35 s.
- `aria-hidden` : rien n'est lu par les lecteurs d'écran.
- En mouvement réduit (réglage de l'app ou de Windows), `MotionConfig` de [[App.tsx]] ne garde que les fondus.

## Liens avec le reste
- Logos : `Mark`, `Wordmark` ([[Petits composants de l'interface]]).
- Styles : section « Splash » de `app.css` ([[Styles de l'app (CSS)]]).
