---
type: fonctionnalité
tags: [fonctionnalité, app, bug]
version_app: 1.2.1
maj: 2026-10-31
---
# Réparations au lancement

Ce que l'app répare seule à chaque démarrage (`repair.rs`, `instance.rs`). Voir [[Bugs et incidents]].

- **Écran bleu 0x7E (RAG-67)** : jusqu'à la 1.1.9, plusieurs tweaks (Power optimization, Disable timer coalescing, Advanced hitreg suite, Disable Power Throttling, packs GPU) mettaient `CoalescingTimerInterval` à 0 dans `HKLM\SYSTEM\CurrentControlSet\Control` → division par zéro du noyau sous Windows 11 24H2. Au lancement, l'app **supprime la valeur là où elle vaut 0** et demande une fois de **Redémarrer (pas Arrêter**, à cause du démarrage rapide).
- **Une seule instance** : mutex Windows `Local\<identifiant>.instance`. Deux fenêtres écrasaient chacune `applied.json`. Un second lancement ramène la première fenêtre. À la désinstallation, la remise attend le verrou un temps limité puis passe quand même.
- **`run\` vidé** au démarrage (aucun script laissé en clair après un arrêt brutal).
- **Remise interrompue** reprise au lancement suivant ([[Remise à zéro]]).
- **Mode Performances élevées** d'une partie rendu si l'app avait été fermée ([[Pendant la partie]]).
