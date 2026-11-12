---
type: fonctionnalité
tags: [fonctionnalité, app, bug]
version_app: 1.3.0
maj: 2026-11-10
---
# Réparations au lancement

Ce que l'app répare seule à chaque démarrage (`repair.rs`, `instance.rs`, chargement d'`applied.json` et `history.json`). Voir [[Bugs et incidents]].

- **Écran bleu 0x7E (RAG-67)** : jusqu'à la 1.1.9, plusieurs tweaks (Power optimization, Disable timer coalescing, Advanced hitreg suite, Disable Power Throttling, packs GPU) mettaient `CoalescingTimerInterval` à 0 dans **8 clés** sous `HKLM\SYSTEM\CurrentControlSet\Control` (`Session Manager\kernel`, `Executive`, `Memory Management`, `Power`…) → division par zéro du noyau sous Windows 11 24H2. Au lancement, l'app **supprime la valeur là où elle vaut 0** (une autre valeur n'est jamais touchée), corrige `applied.json` pour qu'aucune annulation ne remette le 0, et demande une fois de **Redémarrer (pas Arrêter**, à cause du démarrage rapide).
- **« Disable timer coalescing » retiré (`pow_timer`)** : une fois ses 8 valeurs réparées, il n'est plus noté comme appliqué (plus de carte « Réglages retirés encore appliqués » inutile, [[Tweaks retirés]]).
- **« Advanced hitreg suite » sans relevé (RAG-68)** : jusqu'à la 1.1.9, son relevé s'arrêtait avant la première ligne ; il était noté « sauvegardé » sans rien de gardé, et le décocher ne remettait rien. L'app le repasse en « retour aux valeurs de Windows ».
- Chaque réparation est notée dans `logs\repairs.log` (à demander au joueur, [[Problèmes joueurs]]).
- **Fichiers illisibles mis de côté** : un `applied.json` ou `history.json` coupé, abîmé ou chiffré pour un autre compte Windows est renommé `.bad-<ms>` (ligne dans `repairs.log`) et un nouveau est commencé ; s'il ne peut même pas être renommé, l'app ne l'écrase pas pendant ce lancement.
- **Anciens fichiers en clair** (d'avant la 1.1.14) relus puis réécrits chiffrés.
- **Une seule instance** : mutex Windows `Local\<identifiant>.instance`. Deux fenêtres écrasaient chacune `applied.json`. Un second lancement ramène la première fenêtre. À la désinstallation, la remise attend le verrou un temps limité (30 s) puis passe quand même.
- **`run\` vidé** au démarrage, ainsi que le dossier de repli `%SystemRoot%\Temp\<identifiant>` (aucun script ni fichier natif laissé en clair après un arrêt brutal).
- **Remise interrompue** reprise au lancement suivant ([[Remise à zéro]]).
- **Mode Performances élevées** d'une partie rendu si l'app avait été fermée ([[Pendant la partie]]).

## Code
- Réparations RAG-67, RAG-68 et `pow_timer`, journal `repairs.log` : [[repair.rs]] (appelé par `setup` de [[lib.rs]] et avant la remise de la désinstallation dans [[reset.rs]]).
- Mise de côté et chiffrement des fichiers : [[backup.rs]] (`applied.json`), [[history.rs]] (`history.json`).
- Instance unique : [[instance.rs]] ; dossiers temporaires : [[runner.rs]], [[assets.rs]] ; partie en cours : [[session.rs]].
- Vérification côté scripts (plus aucun script n'écrit le 0) : test `kernel_timer_value_stays_out` de [[catalog.rs]].
