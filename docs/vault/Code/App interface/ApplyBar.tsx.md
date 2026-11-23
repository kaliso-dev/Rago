---
type: code
tags: [code, app, typescript, react, v5]
fichier: app/src/components/ApplyBar.tsx
lignes: 61
maj: 2026-11-23
---
# ApplyBar.tsx

La **barre « apply »** (`.apply > .ap` des maquettes v5 `app-module-*.html`) qui monte en bas de la fenêtre dès qu'il y a des changements en attente (réglages cochés ou réglages appliqués décochés). Refaite le 23/11 à l'identique de la maquette : droite et arrondie, sans déchirure ([[Maquettes v5 dans l'app (s5)]]). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Moteur des tweaks]].

Statut : dans `staging` (PR #122, fusionnée le 23/11) ; `NO_APPLY_BAR` ajouté par la PR #123 du 23/11. Jamais testée sur Windows.

## Fonctionnement détaillé
- Rendue par [[App.tsx]] (`div.apply`, posée en bas de `.win`, `pointer-events: none` sauf sur la barre).
- Calcule :
  - `undo` = réglages de `pendingUndo` encore appliqués ;
  - `n` = nombre de cochés + nombre à annuler ;
  - `reboot` = cochés dont la variante choisie demande un redémarrage + annulations dont la variante que le moteur lancera (`undoVariant`) en demande un (réglage retiré : son drapeau `reboot` gardé).
- **Visible** si `n > 0`, qu'aucun lot n'est affiché (`run` nul) et que la page n'est pas dans `NO_APPLY_BAR`.
- `NO_APPLY_BAR` (exporté, 23/11, PR #123) = les onglets `netopt`, `nettest` et `route` de [[Network.tsx]], qui n'ont pas cette barre dans les maquettes v5 : le Packet Optimizer a la sienne ([[NetOpt.tsx]]), le test réseau et Rago Route n'en montrent pas. Les réglages cochés restent cochés ; la barre revient sur les autres pages.
- Entrée et sortie : glissement de 110 px avec ressort (raideur 420, amortissement 36). Le chiffre rejoue une petite animation à chaque changement.
- Contenu (`role="region"`) : le chiffre en gros, « changes » et la petite ligne (icône rotation + « {n} need a restart » ou « no restart needed ») ; s'il y a des annulations, l'infobulle dit « {a} to apply · {u} to undo ».
- Boutons :
  - « Clear » (`.clr`) → `unselectMany(sélection + annulations)` ;
  - « Apply » (`.btn`, icône éclair) → `requestApply()` sans argument : ouvre [[ConfirmDialog.tsx]] avec la sélection et les annulations.

## Liens avec le reste
- Store : `selection`, `pendingUndo`, `applied`, `variantOf`, `unselectMany`, `requestApply`, `run`, `undoVariant` ([[store.tsx]]) ; `needsReboot`, `retired`, `tweaks` ([[catalog.ts]]).
- Textes `apply.changes`, `apply.split`, `apply.reboot`, `apply.clear`, `apply.go`, `s5.mod.noRestartNeeded` ([[i18n.ts]]).
- L'invitation à laisser un avis ([[ReviewPrompt.tsx]]) se place au-dessus de cette barre quand elle est visible.
- Styles : `.apply`/`.ap` de `s5/pages/module.css` (limités à `.win`) et retouches de `s5/app.css` ([[Styles de l'app (CSS)]]).
