---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/ApplyBar.tsx
lignes: 71
maj: 2026-11-10
---
# ApplyBar.tsx

La **barre « Appliquer »** qui monte en bas de la fenêtre dès qu'il y a des changements en attente (réglages cochés ou réglages appliqués décochés). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Moteur des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- Rendue par [[App.tsx]] dans `div.body`, après la zone de page.
- Calcule :
  - `undo` = réglages de `pendingUndo` encore appliqués ;
  - `n` = nombre de cochés + nombre à annuler ;
  - `reboot` = cochés dont la variante choisie demande un redémarrage + annulations dont la variante que le moteur lancera (`undoVariant`) en demande un (réglage retiré : son drapeau `reboot` gardé).
- **Visible** si `n > 0` et qu'aucun lot n'est affiché (`run` nul). Entrée et sortie : glissement de 80 px avec ressort (raideur 420, amortissement 36). Le chiffre rejoue une petite animation à chaque changement.
- Texte : « réglages sélectionnés » ou, s'il y a des annulations, « changements » (le chiffre est affiché à part, retiré du texte) ; sous-ligne « {a} à appliquer · {u} à annuler » et/ou « {n} demandent un redémarrage ».
- Boutons :
  - « Vider » → `unselectMany(sélection + annulations)` ;
  - « Appliquer {n} réglages » / « Appliquer {n} changements » → `requestApply()` sans argument : ouvre [[ConfirmDialog.tsx]] avec la sélection et les annulations.

## Liens avec le reste
- Store : `selection`, `pendingUndo`, `applied`, `variantOf`, `unselectMany`, `requestApply`, `run`, `undoVariant` ([[store.tsx]]) ; `needsReboot`, `retired` ([[catalog.ts]]).
- L'invitation à laisser un avis ([[ReviewPrompt.tsx]]) se place au-dessus de cette barre quand elle est visible (styles `account.css`).
- Styles : section « applybar » de `app.css` ([[Styles de l'app (CSS)]]).
