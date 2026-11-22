---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/ResetToast.tsx
lignes: 51
maj: 2026-11-10
---
# ResetToast.tsx

Les **petits messages en bas à droite**, qui ne bloquent rien et partent d'eux-mêmes : fin de la remise à zéro faite par le moteur, et demande de redémarrage après une réparation au lancement. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Remise à zéro]], [[Réparations au lancement]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- **Réparation au lancement** (RAG-67) : si `repairNotice` du store est vrai (le moteur a supprimé une valeur qui peut faire planter Windows), message orange « Rago Optimizer a réparé une valeur qui peut faire planter Windows. Redémarre ton PC pour finir : Redémarrer, pas Arrêter. » pendant **20 s**. « Redémarrer » et pas « Arrêter » : avec le démarrage rapide de Windows, « Arrêter » ne relit pas la valeur.
- **Remise à zéro** (fin de Premium, déconnexion) : quand `resetDone` est posé par l'événement `reset:done` ([[store.tsx]]) :
  - tout est remis : « Tweaks réinitialisés » (✓) pendant **4,5 s** ;
  - des échecs : « {n} réglages n'ont pas pu être remis : détails dans l'historique (module Restaurer) » (orange) pendant **9 s**.
- Apparition et disparition : fondu + 8 px en 0,24 s ; `role="status"` pour les lecteurs d'écran.

## Liens avec le reste
- Store : `resetDone`, `setResetDone`, `repairNotice`, `setRepairNotice`.
- Moteur : [[reset.rs]] (remise à zéro en arrière-plan), [[repair.rs]] (réparation au lancement), commande `take_repair_notice`.
- Styles : section « toasts » de `app.css` ([[Styles de l'app (CSS)]]).
