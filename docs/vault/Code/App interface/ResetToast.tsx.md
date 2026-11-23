---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/ResetToast.tsx
lignes: 54
maj: 2026-11-23
---
# ResetToast.tsx

Les **petits messages en bas à droite**, qui ne bloquent rien et partent d'eux-mêmes : fin de la remise à zéro faite par le moteur, et demande de redémarrage après une réparation au lancement. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Remise à zéro]], [[Réparations au lancement]].

Tout ce qui suit est CONFIRMÉ (PR #N vers `staging`, 24/11 : messages refaits sur la maquette v5 `app-toasts`).

## Fonctionnement détaillé
- **Réparation au lancement** (RAG-67) : si `repairNotice` du store est vrai (le moteur a supprimé une valeur qui peut faire planter Windows), message `.ts2.warn` (liseré rouge, icône de rotation) « Rago Optimizer a réparé une valeur qui peut faire planter Windows. Redémarre ton PC pour finir : Redémarrer, pas Arrêter. » pendant **20 s**. « Redémarrer » et pas « Arrêter » : avec le démarrage rapide de Windows, « Arrêter » ne relit pas la valeur.
- **Remise à zéro** (fin de Premium, déconnexion) : quand `resetDone` est posé par l'événement `reset:done` ([[store.tsx]]) :
  - tout est remis : « Tweaks réinitialisés » (`.ts2`, liseré vert, coche) pendant **4,5 s** ;
  - des échecs : « {n} réglages n'ont pas pu être remis : détails dans l'historique (module Restaurer) » (`.ts2.warn`, alerte) pendant **9 s**.
- **Aspect (v5)** : `div.w5.flt.tz` couvre la fenêtre sans prendre les clics, au-dessus de tout (`z-index` 60, même des fenêtres ouvertes) ; dedans `.tst`, la pile des messages en bas à droite (28 px du coin), le plus ancien en haut. Quand l'invitation à laisser un avis est là, la pile monte juste au-dessus d'elle (`--rvp-h`, [[ReviewPrompt.tsx]]).
- Apparition et disparition : fondu + 8 px en 0,24 s ; `role="status"` sur la pile pour les lecteurs d'écran. Les messages ne prennent jamais les clics.

## Liens avec le reste
- Store : `resetDone`, `setResetDone`, `repairNotice`, `setRepairNotice`.
- Moteur : [[reset.rs]] (remise à zéro en arrière-plan), [[repair.rs]] (réparation au lancement), commande `take_repair_notice`.
- Styles : `.tst`, `.ts2` de `s5/pages/win.css` (maquette), placement dans `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]).
