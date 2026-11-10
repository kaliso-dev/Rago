---
type: code
tags: [code, app, typescript, react, minecraft]
fichier: app/src/components/RbwStatus.tsx
lignes: 115
maj: 2026-11-10
---
# RbwStatus.tsx

Le **vérificateur Ranked Bedwars** affiché sous le RBW Mod : ce que lit l'outil de « screenshare » de Ranked Bedwars sur le PC (services Windows et réglages), relu en continu, avec un bouton pour tout remettre en marche. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[RBW Mod]]. Côté Rust : [[rbw.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- Monté par [[ModulePage.tsx]] quand le module est `rbw`.
- Lecture : `api.rbwStatus()` au montage, puis **toutes les 5 s**, et après **chaque fin de lot** (`run:done`) ; erreur → liste vide. Bouton ↻ « Relire ».
- Verdict :
  - pendant la première lecture : « Lecture des services… » ;
  - tout est vert : « Prêt pour le screenshare » + « Chaque service lu par le vérificateur de Ranked Bedwars tourne et aucun réglage n'est coupé. » (bouclier vert) ;
  - sinon : « {n} éléments en rouge au screenshare » + « Ce que lit le vérificateur… relu toutes les 5 secondes. RBW Mod « Activé » remet tout en marche. »
- Bouton **« Tout remettre en marche »** (si au moins un élément est rouge, désactivé pendant un lot) → `requestApplyEntries(["rbw_mode:on"], { title: "Remettre en marche les services RBW", lead: … }, true)` : la confirmation s'ouvre avec la variante « Activé » du RBW Mod, **relancée même si elle est déjà appliquée** (`again`), car Windows ou un autre programme a pu recouper un service.
- Deux colonnes :
  - « Services ({n}) » : nom, état (En marche, Arrêté, Démarrage…, Arrêt…, En pause, Introuvable), type de démarrage (auto, manuel, désactivé, système — `boot` et `system` s'affichent tous deux « système ») ;
  - « Réglages » : nom, Activé ou Coupé.
  Point vert ou rouge par ligne.

## Liens avec le reste
- [[api.ts]] (`rbwStatus`, `onDone` ; le simulateur montre `SysMain`, `PcaSvc` et `Prefetch` en rouge tant que `rbw_mode` « Activé » n'est pas appliqué).
- [[store.tsx]] (`run`, `requestApplyEntries`) → [[ConfirmDialog.tsx]].
- Styles : « RBW Mod : ce que lit le vérificateur de Ranked Bedwars » de `features.css` ([[Styles de l'app (CSS)]]).
