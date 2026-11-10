---
type: code
tags: [code, app, rust, moteur]
fichier: app/src-tauri/src/repair.rs
lignes: 298
maj: 2026-11-10
---
# repair.rs

Réparations faites **à chaque lancement**, sans rien demander : ce qu'une version précédente a laissé sur le PC et qui peut le faire planter (RAG-67) ou fausser l'annulation (RAG-68, M2). Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Réparations au lancement]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 16/10 ([[Version 1.1.14]]). Incidents : [[Bugs et incidents]].

## Rôle et place dans l'ensemble
- `at_startup` est appelé par `setup` dans [[lib.rs]] juste après le chargement d'`applied.json`, et par [[reset.rs]] avant la remise de la désinstallation (`load_for_uninstall`).
- `hitreg_suite_without_backup` est aussi appelé par [[runner.rs]] juste après avoir appliqué un réglage.
- Lit et écrit le registre par `Sys` de [[backup.rs]] ; repli `reg.exe` par [[shell.rs]].
- Si une valeur a été supprimée, `AppState.repaired` est vrai et l'interface demande une fois de **redémarrer** (`take_repair_notice`).

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `TIMER_VALUE = "CoalescingTimerInterval"` | la valeur qui fait planter |
| `TIMER_KEYS` (8 clés) | `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel`, `…\Session Manager\Executive`, `…\Session Manager\Memory Management`, `…\Session Manager\Power`, `…\Session Manager`, `…\Control\Power\ModernSleep`, `…\Control\Power`, `…\Control` |
| `timer_probes()` | les 8 `Probe::Reg` correspondants |
| `is_zero(saved)` | entier qui vaut 0 : types 4 (`REG_DWORD`), 5 (`REG_DWORD_BIG_ENDIAN`) ou 11 (`REG_QWORD`), octets tous à zéro ; un texte « 0 » ne compte pas |
| `remove_zero_values(sys, ledger, probes) -> (supprimées, changé)` | supprime celles qui valent 0 |
| `forget_zero(ledger, probes, now) -> bool` | met `applied.json` d'accord |
| `hitreg_suite_without_backup(ledger) -> bool` | RAG-68 |
| `POW_TIMER = "pow_timer"`, `forget_pow_timer(ledger, now) -> bool` | M2 |
| `at_startup(sys, ledger, logs_dir) -> Vec<String>` | tout ce qui précède, enregistre et journalise |

## Fonctionnement détaillé

### RAG-67 : `CoalescingTimerInterval` à 0 (13/10)
Jusqu'à la 1.1.9, « Power optimization », « Disable timer coalescing », « Advanced hitreg suite », « Disable Power Throttling » et les packs graphiques (NVIDIA, AMD, GPU général, AMD avancé) posaient cette valeur à 0 dans les 8 clés. Elle n'est pas documentée par Microsoft ; le noyau la lit au démarrage et **divise par elle** : à 0, écran bleu `0x7E` (exception `c0000094`, division par zéro) quelques minutes après le démarrage (Windows 11 24H2), même avec les seuls réglages « Safe ».

`remove_zero_values` : pour chaque clé, si la valeur vaut 0, `Sys::restore(Absent)` la supprime ; si elle vaut encore 0 (clé que l'app n'ouvre pas en accès complet), repli `reg.exe delete <clé> /v CoalescingTimerInterval /f`. Une valeur différente de 0 (par exemple 1500 posé à la main) n'est jamais touchée.

`forget_zero` : dans `applied.json`, un état d'avant à 0 (PC passé par l'ancien `.bat` ou un autre optimiseur) devient « absente » (valeur de Windows) : aucune annulation ne pourra remettre le 0. La valeur posée par Rago (`after`) suit l'état actuel, sinon le réglage afficherait « Changé par Windows » ; si elle est illisible, la comparaison est abandonnée ; si elle vaut encore 0, on réessaiera au lancement suivant.

Windows reprend sa valeur interne au prochain **démarrage complet**. Avec le démarrage rapide (actif par défaut), « Arrêter » met le noyau en veille prolongée et ne relit pas la valeur : le PC peut planter une fois de plus. D'où le message unique « redémarre ton PC ».

### RAG-68 : « Advanced hitreg suite » sans relevé (13/10)
Jusqu'à la 1.1.9, le relevé de `hitreg_suite` s'arrêtait sur un bloc vide avant sa première ligne : le réglage était noté « sauvegardé » sans aucun élément relevé, et le décocher ne remettait rien. `hitreg_suite_without_backup` : si `backup` est vrai et `probes` vide, `backup` passe à faux (retour par les valeurs de Windows, comme un réglage appliqué avant 1.1.6). Appliqué avec le relevé réparé, il n'est pas touché.

### M2 : réglage retiré `pow_timer` (revue du 13/10)
« Disable timer coalescing » ne posait que les 8 valeurs. Quand toutes sont réparées (absentes ou non nulles, aucune illisible), il n'a plus rien d'appliqué : `forget_pow_timer` le retire d'`applied.json` (`Ledger::release`, les éléments tenus par un autre réglage comme `pow_main` restent gardés). Plus de carte « Réglages retirés encore appliqués » ni de « Remettre comme avant » inutile ([[Tweaks retirés]]). Ce qu'on perd : une valeur d'avant non nulle posée à la main reste absente.

### `at_startup`
Lance les trois réparations, enregistre `applied.json` si quelque chose a changé, et ajoute dans `logs\repairs.log` :
- `<ms> removed <clé>\CoalescingTimerInterval (0: blue screen 0x7E after startup, RAG-67)` pour chaque valeur supprimée ;
- `<ms> pow_timer (retired) no longer applied: its only values are gone`.
Renvoie la liste des valeurs supprimées (vide = rien à dire au joueur).

## Données touchées
Registre `HKLM\SYSTEM\CurrentControlSet\Control\…\CoalescingTimerInterval` (8 clés), `applied.json`, `logs\repairs.log` (aussi alimenté par [[backup.rs]] et [[history.rs]] quand un fichier est mis de côté).

## Tests
`zero_is_only_an_integer_zero`, `the_eight_keys_of_the_old_scripts` (écritures « Kernel »/« kernel », `HKEY_LOCAL_MACHINE\SYSTEM`/`HKLM\System` donnent le même élément), `ledger_never_puts_the_zero_back`, `hitreg_suite_without_probes_goes_back_to_windows_values`, `pow_timer_is_forgotten_once_its_values_are_repaired`, `zero_values_are_removed_from_the_registry` (Windows, CI : un vrai 0 supprimé, 1500 gardé). Côté scripts, [[catalog.rs]] vérifie qu'aucun script n'écrit plus cette valeur (`kernel_timer_value_stays_out`).

## À savoir avant de modifier
- L'app tourne en administrateur (`app.manifest`) : elle peut écrire dans `HKLM` sans rien demander.
- Une nouvelle réparation doit être idempotente (elle tourne à chaque lancement) et écrire une ligne dans `repairs.log` pour le support ([[Problèmes joueurs]]).
- La clé `CoalescingTimerInterval` des fichiers de jeu (Image File Execution Options) n'est pas concernée.
