---
type: code
tags: [code, app, rust, moteur]
fichier: app/src-tauri/src/repair.rs
lignes: 714
maj: 2026-11-27
---
# repair.rs

Réparations faites **à chaque lancement**, sans rien demander : ce qu'une version précédente a laissé sur le PC et qui peut le faire planter (RAG-67), fausser l'annulation (RAG-68, M2) ou faire saccader le stream Discord (priorité « Haute » des jeux, 13/11). Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Réparations au lancement]].

Tout est CONFIRMÉ (code de `staging`, 10/11), sauf la priorité des jeux : écrite le 13/11, mise dans `staging` par la PR #155 du 27/11 (pas encore en prod), **jamais testée sur Windows**. Créé le 16/10 ([[Version 1.1.14]]). Incidents : [[Bugs et incidents]].

## Rôle et place dans l'ensemble
- `at_startup(sys, ledger, data_dir)` est appelé par `setup` dans [[lib.rs]] juste après le chargement d'`applied.json`, et par [[reset.rs]] avant la remise de la désinstallation (`load_for_uninstall`). Il reçoit le dossier de données de l'app (avant le 13/11 : le dossier `logs`) : il y trouve `logs\`, et `netopt\` pour le [[Packet Optimizer]] ([[netopt.rs]]).
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
| `PRIORITY_VALUE = "CpuPriorityClass"`, `HIGH = 3`, `ABOVE_NORMAL = 6`, `PRI_GAME = "pri_game"`, `IFEO` (`HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options`) | priorité des jeux (13/11) |
| `NETOPT_GAMES` | `javaw.exe`, `java.exe`, `Minecraft.Windows.exe` (les `$Games` de [[common.ps1]], vérifié par un test) |
| `priority_probe(exe)`, `priority_exe(probe)` | la valeur `IFEO\<exe>\PerfOptions\CpuPriorityClass`, et l'exe (en minuscules) d'une telle valeur |
| `Lowered { reg, ledger, snapshot, failed }` | ce que `lower_game_priority` a fait : valeurs passées à 6, `applied.json` changé, sauvegarde du Packet Optimizer changée, écriture refusée |
| `lower_game_priority(ledger, netopt_high, snapshot, now, write) -> Lowered` | passe à 6 les priorités « Haute » écrites par Rago |
| `at_startup(sys, ledger, data_dir) -> Vec<String>` | tout ce qui précède, enregistre et journalise ; renvoie les valeurs à 0 supprimées |

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

### Priorité des jeux : « Haute » → « Supérieure à la normale » (13/11, **jamais testé sur Windows**)
« Advanced per-game priority » (`pri_game`, et les presets par jeu) et l'option de priorité du [[Packet Optimizer]] écrivaient `CpuPriorityClass` = **3** (Haute) dans les PerfOptions IFEO du jeu, lues par Windows à chaque lancement : le jeu prenait le processeur à Discord et au stream ([[Historique des problèmes]]). Depuis le choix de Sofiene du 13/11, les deux écrivent **6** (Supérieure à la normale). `lower_game_priority` passe à 6 les 3 que Rago a lui-même écrits :
- **pri_game** : chaque valeur `CpuPriorityClass` de son relevé (`ledger.tweaks["pri_game"].probes`) dont la valeur posée (`after`) vaut 3, ou est inconnue (relevé d'avant le suivi des valeurs posées), et qui vaut encore 3. Après l'écriture, relue, `after` passe à 6 (sinon « Changé par Windows »). Une valeur changée depuis par le joueur (posée 3, lue 2…) n'est pas touchée. Un état d'avant à 3 (choix du joueur) reste : décocher le réglage le rend.
- **Packet Optimizer** : si `netopt_high` (`netopt::wrote_high` : appliqué avec `priorityMode` et sans `aboveNormal`, donc par le moteur d'avant le 13/11), les trois exes de `NETOPT_GAMES` qui valent 3 passent à 6.
- **Les deux sur Minecraft** (avec la sauvegarde du Packet Optimizer, `netopt/snapshot.json`, ligne `reg` dont le chemin PowerShell `HKLM:\…` est comparé sans le « : ») : 3 dans la sauvegarde mais pas avant pri_game → c'est pri_game, appliqué en premier, qui l'avait écrit : la sauvegarde passe à « 6 », que la remise du Packet Optimizer (ou une application sans l'option) rendra ; 3 avant pri_game mais pas dans la sauvegarde, avec `netopt_high` → c'est le Packet Optimizer, appliqué en premier : l'état d'avant de pri_game passe à 6. Un 3 présent avant les deux (choix du joueur) reste dans les deux.
- Pas repris : un `pri_game` appliqué avant 1.1.6 (sans relevé, donc sans liste d'exes connue) ; le réappliquer suffit. Le script Premium n'est pas lisible au lancement.

`game_priority_at_startup` (privée) lit la sauvegarde (`read_snapshot` : JSON, BOM UTF-8 retiré et noté), lance `lower_game_priority` avec `Sys::read` et `Sys::restore`, réécrit la sauvegarde si elle a changé (`write_snapshot` : même BOM, que Windows PowerShell 5.1 demande pour relire les accents ; fichier `snapshot.json.tmp` puis renommé), et, si tout est passé, marque l'application du Packet Optimizer `aboveNormal` (`netopt::set_above_normal`) pour ne plus y revenir : un 3 que le joueur mettrait ensuite lui-même reste à 3. Le jeu prend la nouvelle priorité à son prochain lancement, sans redémarrer le PC ; rien n'est affiché au joueur.

### `at_startup`
Lance les quatre réparations, enregistre `applied.json` si quelque chose a changé, et ajoute dans `logs\repairs.log` :
- `<ms> removed <clé>\CoalescingTimerInterval (0: blue screen 0x7E after startup, RAG-67)` pour chaque valeur supprimée ;
- `<ms> pow_timer (retired) no longer applied: its only values are gone` ;
- `<ms> <clé>\CpuPriorityClass: High (3) -> Above normal (6), the game no longer starves Discord and the stream` pour chaque priorité passée à 6 ;
- `<ms> Packet Optimizer backup: Minecraft priority 3 -> 6 (written by Advanced per-game priority)` si la sauvegarde du Packet Optimizer a changé.
Renvoie la liste des valeurs supprimées (vide = rien à dire au joueur).

## Données touchées
Registre `HKLM\SYSTEM\CurrentControlSet\Control\…\CoalescingTimerInterval` (8 clés) et `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\<exe>\PerfOptions\CpuPriorityClass`, `applied.json`, `netopt\snapshot.json` et `netopt\applied.json` ([[netopt.rs]]), `logs\repairs.log` (aussi alimenté par [[backup.rs]] et [[history.rs]] quand un fichier est mis de côté).

## Tests
`zero_is_only_an_integer_zero`, `the_eight_keys_of_the_old_scripts` (écritures « Kernel »/« kernel », `HKEY_LOCAL_MACHINE\SYSTEM`/`HKLM\System` donnent le même élément), `ledger_never_puts_the_zero_back`, `hitreg_suite_without_probes_goes_back_to_windows_values`, `pow_timer_is_forgotten_once_its_values_are_repaired`, `zero_values_are_removed_from_the_registry` (Windows, CI : un vrai 0 supprimé, 1500 gardé). Priorité des jeux (13/11) : `priority_exe_reads_only_the_cpu_priority_of_a_game`, `games_are_set_to_above_normal_never_high` (les 16 variantes de `pri_game` écrivent 6 et ont chaque exe dans leur relevé ; [[apply.ps1]] écrit 6 et jamais « High » ; `NETOPT_GAMES` = `$Games`), `high_priority_written_by_rago_goes_to_above_normal` (posé 3 → 6, changé par le joueur → gardé, état d'avant à 3 → gardé, `after` inconnu → 6, `IoPriority` et un autre réglage → pas touchés, une seule fois, écriture refusée → réessayée), `packet_optimizer_high_priority_goes_to_above_normal`, `both_minecraft_restores_give_back_above_normal` (les quatre ordres d'application), `snapshot_is_rewritten_with_its_bom`. Côté scripts, [[catalog.rs]] vérifie qu'aucun script n'écrit plus cette valeur (`kernel_timer_value_stays_out`).

## À savoir avant de modifier
- L'app tourne en administrateur (`app.manifest`) : elle peut écrire dans `HKLM` sans rien demander.
- Une nouvelle réparation doit être idempotente (elle tourne à chaque lancement) et écrire une ligne dans `repairs.log` pour le support ([[Problèmes joueurs]]).
- La clé `CoalescingTimerInterval` des fichiers de jeu (Image File Execution Options) n'est pas concernée.
- Priorité des jeux : avec `pri_game` appliqué avant le Packet Optimizer, la remise de fin de licence (réglages d'abord, Packet Optimizer ensuite, [[lib.rs]]) finit par la valeur gardée dans la sauvegarde du Packet Optimizer : 6 maintenant, 3 avant le 13/11, au lieu de l'état d'avant Rago. Défaut d'ordre qui existait déjà, pas corrigé ; la désinstallation remet le Packet Optimizer d'abord et n'est pas concernée.
