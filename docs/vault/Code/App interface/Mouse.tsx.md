---
type: code
tags: [code, app, react, page, souris]
fichier: app/src/pages/Mouse.tsx
lignes: 487
maj: 2026-11-25
---
# Mouse.tsx

La [[Page Souris]] (page `mouse` de [[App.tsx]], entrée « Souris » de [[Sidebar.tsx]]). Fiche parente : [[Code de l'app (interface)]].

**Écran v5 (23/11, dans `staging` par la PR #125, fusionnée le 23/11, jamais testé sur Windows)** : la page est refaite à l'identique de la maquette `app-mouse.html` (demande de Sofiene du 23/11 : l'app doit être « strictement conforme au design »). Styles : `s5/pages/module.css` (socle des pages, en-tête et `.panel`) et `s5/pages/pages.css` (porté de `rendus-v5/src/pages.css`, commun aux maquettes Souris, Paramètres et Partage), retouches dans `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]). L'ancienne feuille `styles/mouse.css` et les cartes `.tools-tile` de `features.css` sont retirées. Fichier ajouté le 11/11 (PR #96). Textes en anglais et en français dans le fichier (fonction `L(en, fr)`), sauf le libellé `nav.mouse` de [[i18n.ts]].

## Composants
- `Mouse` : racine `div.pg-mod.pg-pages.pg-mouse.is-page`.
  - En-tête `.head` :
    - surtitre « check your mouse // measured in this window only, nothing touches your game » ;
    - titre `.title` (« mouse » / « souris », taille réduite si le mot est long) ;
    - étiquette rouge `.ping.sig` : Hz mesurés, « polling rate, good » (le verdict en minuscules), 40 traits dont la hauteur suit l'écart (42 % au rythme médian, entre 20 et 100 %).
  - Puis `.nobar` et la grille `.mgrid` de deux colonnes égales : les quatre sections ci-dessous.
  - L'état `rate` est tenu ici, pour l'en-tête et la section fréquence.
- `PollingTest` (section « polling rate ») :
  - Mesure : écoute `pointerrawupdate` (sinon `pointermove`) sur la zone `.panel.zone` et prend les horodatages de `getCoalescedEvents()`. Garde les 1 000 derniers écarts ; `rateOf` retire les écarts de 12 ms ou plus (pauses de la main) et attend 300 écarts.
  - Calcul : Hz (1000 / écart moyen), régularité (part à ±25 % de la médiane), plus long écart, médiane et 64 derniers écarts.
  - Affichage :
    - chiffres `.big` / `.mid` ;
    - 64 barres `.zs`, de hauteur 0,7 × écart / médiane, en rouge (`pk`) au-delà de 1,15 × la médiane ; avant le résultat, elles se remplissent avec la mesure ;
    - étiquette `vt2` du verdict (`verdictOf` : moins de 200 Hz « low », en rouge ; puis « fine », « good », « very high ») et conseil `p.verdict2.inner`, dans la carte `.panel.zone` (entre les barres et la légende) depuis le 25/11 (PR #137).
- `ClickTest` (section « double-click check ») :
  - `onPointerDown` du bouton gauche sur la zone `button.panel.pad`.
  - Un appui à moins de 40 ms (`BOUNCE_MS`) du précédent est un rebond. Il faut 20 clics (`CLICKS`) ; les appuis suivants sont ignorés.
  - Affichage : compteur `.pc2`, 20 pastilles `.dots` (`c` blanche, `b` rouge si ce clic a rebondi).
  - Pendant le test, un lien « start again » dans le titre.
  - À la fin :
    - étiquette « N double click(s) » en rouge ou « no double click » ;
    - encadré `.alert2` (écarts en ms, conseil sur le « debounce », bouton « start again ») ou `.alert2.ok` neutre.
- `Apps` (section « mouse software ») :
  - `api.mouseApps()` ([[api.ts]], [[mouse.rs]]) au chargement et sur « check again » (icône qui tourne pendant la lecture).
  - Lignes `.li2` : liseré rouge (`risk`) et « risky in ranked » sauf `vendor` (« fine »). « all clear » si rien n'est lancé.
  - Dernière ligne « 1:1 mouse » (`.li2.one`) : état `.sst` « on » / « off » (`isOn` de [[store.tsx]] sur `kbm_1to1`, `kbm_accel`, `kbm_panel`, `in_mouse`) et lien « latency → » (`goTo("latency", "kbm_1to1")`), toujours affiché.
- `Sensitivity` (section « sensitivity ») : la note « Just a calculation: nothing is changed in your games. » est en bas de la carte `.sens` (`p.verdict2.inner`) depuis le 25/11 (PR #137). La classe `in` des maquettes est réservée aux champs : un `<p>` qui la porte prendrait le style des champs.
  - Saisie : DPI et sensibilité dans des `<input type="number">`, jeu dans un `<select>` (`GameSelect`), tous dans les cases `.in` de la maquette, transparents.
  - Calcul :
    - `YAW` donne les degrés par point à la sensi 1, pour Valorant, CS2, Apex Legends, Overwatch 2 et Rainbow Six Siege ;
    - eDPI ;
    - cm/360 = 360 / (DPI × sensi × yaw) × 2,54 ;
    - conversion = sensi × yaw source / yaw cible.
  - Nombres au format de la langue ; « – » si un champ est vide.

## À savoir
- Écarts avec la maquette, voulus :
  - la maquette ne montre que l'état mesuré, l'app montre aussi « – » avant la mesure, le test en cours et le cas sans rebond ;
  - les colonnes de `.mgrid` sont en `minmax(0, 1fr)`, parce qu'un `<input>` a une largeur propre que le `<span>` de la maquette n'a pas.
- Les étiquettes (« average », « regularity »…) plus larges que leur chiffre écartent l'unité, comme dans la maquette (« 97  % ») ; en français, c'est plus visible (« 46,7  cm »).
- Captures app contre maquette : `rago-redesign/app-strict/30-…` à `32-…` (mesure simulée par `rendus-v5/outils/shot-mouse.js`).
