---
type: code
tags: [code, app, react, page, souris]
fichier: app/src/pages/Mouse.tsx
lignes: 450
maj: 2026-11-11
---
# Mouse.tsx

La [[Page Souris]] (page `mouse` de [[App.tsx]], entrée « Souris » de [[Sidebar.tsx]]). Styles dans `app/src/styles/mouse.css` (40 lignes, importé par [[main.tsx (app)]]). Fiche parente : [[Code de l'app (interface)]].

**Fichier ajouté le 11/11 (PR #NN vers `staging`), jamais testé sur Windows.** Textes en anglais et en français dans le fichier (fonction `L(en, fr)`, comme [[Display.tsx]]), sauf le libellé `nav.mouse` de [[i18n.ts]].

## Composants
- `Mouse` : en-tête et deux grilles `.mouse-grid` de deux cartes (`card tools-tile`, comme [[Tools.tsx]]).
- `PollingTest` : écoute `pointerrawupdate` (sinon `pointermove`) sur la zone, prend les horodatages de `getCoalescedEvents()`, garde les 1 000 derniers écarts ; `rateOf` retire les écarts de 12 ms ou plus (pauses), attend 300 écarts, puis calcule Hz (1000 / écart moyen), régularité (part à ±25 % de la médiane), plus long écart et les 80 derniers écarts pour la courbe SVG. Barre de progression avant le résultat. Verdicts : < 200 Hz, < 700, < 1 600, au-delà.
- `ClickTest` : `onPointerDown` du bouton gauche sur la zone ; un appui à moins de 40 ms (`BOUNCE_MS`) du précédent est un rebond ; 20 clics (`CLICKS`) ; 20 pastilles (vertes, jaune si le clic a rebondi) ; « Recommencer ».
- `Apps` : `api.mouseApps()` ([[api.ts]], [[mouse.rs]]) au chargement et sur le bouton de rafraîchissement ; badge « Risqué en classé » sauf `vendor` (« OK ») ; ligne « Souris 1:1 » : `isOn` de [[store.tsx]] sur `kbm_1to1`, `kbm_accel`, `kbm_panel`, `in_mouse`, sinon `goTo("latency", "kbm_1to1")`.
- `Sensitivity` : `YAW` (degrés par point à la sensi 1) pour Valorant, CS2, Apex Legends, Overwatch 2, Rainbow Six Siege ; eDPI, cm/360 = 360 / (DPI × sensi × yaw) × 2,54, conversion = sensi × yaw source / yaw cible ; nombres au format de la langue.
