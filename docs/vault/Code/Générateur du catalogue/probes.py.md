---
type: code
tags: [code, app, catalogue, générateur, python, sauvegarde]
fichier: app/tools/probes.py
lignes: 368
maj: 2026-11-10
---
# probes.py

Fabrique les **scripts de relevé** (`probes.json`) : pour chaque réglage, une version « à blanc » de son script qui ne modifie rien et annonce, ligne par ligne, ce que le vrai script va toucher. L'app s'en sert pour sauvegarder l'état réel du PC juste avant d'appliquer un réglage. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Moteur des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `29a1e67`, app 1.1.6 : sauvegarde et annulation des réglages), jamais modifié depuis.

## Rôle et place dans l'ensemble
- Le moteur Rust lance d'abord le relevé : **mêmes boucles, mêmes variables, mêmes conditions** que le vrai script, mais chaque commande qui modifie quelque chose devient une ligne `echo @@RAGO <type> "<arg>" …`, et toute autre commande devient `ver >nul` (ne fait rien). Le moteur lit ces lignes, relève les valeurs actuelles, lance le vrai script, et garde la sauvegarde. Décocher le réglage remet ces valeurs (voir [[backup.rs]], [[runner.rs]]).
- `build(scripts)` est appelé par [[build_catalog_v6.py]] sur les scripts finaux (sans les retirés), puis [[paths.py]] passe sur le résultat. Sortie : `app/src-tauri/scripts/probes.json`, même forme et mêmes clés que `scripts.json` (230 réglages, 7 534 lignes `@@RAGO`, 852 660 octets au 10/11), embarqué chiffré dans l'exe ([[Scripts embarqués (JSON)]]).
- [[undo_gen.py]] réutilise ses fonctions (`split_top`, `tokens`, `find_in_clause`…) et remplace `dry_cmd`/`dry_chain` par les siennes.

## Ce que le fichier expose

### Types de lignes émises (lues par [[backup.rs]])
| Ligne | Sens | Produite par |
|---|---|---|
| `@@RAGO reg "CLÉ" "NOM"` | une valeur de registre (`NOM` vide = valeur par défaut) | `reg add/delete … /v NOM` ou `/ve` ; aussi `sc config … start=` (deux lignes : `Start` et `DelayedAutostart` de `HKLM\SYSTEM\CurrentControlSet\Services\<svc>`), `fsutil behavior set` (valeur de `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem`), `setx` (`HKCU\Environment` ou, avec `/m`, `…\Session Manager\Environment`) |
| `@@RAGO regkey "CLÉ"` | clé créée sans valeur | `reg add CLÉ /f` |
| `@@RAGO regvals "CLÉ"` | toutes les valeurs d'une clé | `reg delete CLÉ /va` |
| `@@RAGO regtree "CLÉ"` | clé entière supprimée | `reg delete CLÉ /f` |
| `@@RAGO bcd "{id}" "NOM"` | élément `bcdedit` | `bcdedit /set` ou `/deletevalue` (`{current}` par défaut) ; `/timeout` → `{bootmgr}` `timeout` |
| `@@RAGO task "CHEMIN"` | tâche planifiée | `schtasks /change /tn … /disable` ou `/enable` |
| `@@RAGO pwr "SCHÉMA" "SOUS-GROUPE" "RÉGLAGE"` | index secteur et batterie d'un réglage d'alimentation | `powercfg -setacvalueindex/-setdcvalueindex`, ou `powercfg -change <alias>` (`monitor-timeout` → `SUB_VIDEO VIDEOIDLE`, `disk-timeout` → `SUB_DISK DISKIDLE`, `standby-timeout` → `SUB_SLEEP STANDBYIDLE`, `hibernate-timeout` → `SUB_SLEEP HIBERNATEIDLE`, sur `scheme_current`) |
| `@@RAGO pwractive` | plan d'alimentation actif | `powercfg -setactive`, `-s`, `-duplicatescheme`, `-import` |
| `@@RAGO hib` | mise en veille prolongée | `powercfg -h` / `-hibernate` |

### Constantes et fonctions
| Nom | Rôle |
|---|---|
| `FS`, `FSUTIL` | 13 noms `fsutil behavior set` → valeur de registre (`disablelastaccess` → `NtfsDisableLastAccessUpdate`, `disabledeletenotify` → `DisableDeleteNotification`, `memoryusage` → `NtfsMemoryUsage`, `disable8dot3`, `mftzone`, `encryptpagingfile`, `disablecompression`, `disableencryption`, `allowextchar`, `bugcheckoncorrupt`, `quotanotify`, `symlinkevaluation`, `disabletxf`) ; un nom inconnu donne `ver >nul` |
| `PWR_CHANGE` | les 4 alias de `powercfg -change` |
| `NOOP` | `ver >nul` |
| `IN_OK` | **liste blanche** des commandes permises dans la partie `in ('…')` d'un `for /f` : `reg query`, `sc query`, `find`, `sort`, `more`, `wmic … get`, `findstr`, `dir`, `type`, `echo`, `ver`, `call "%RAGO_RES%\smartctl.exe" --scan`, et `powershell … Get-…` |
| `split_top(s, ops)` | découpe aux opérateurs `&&`, `||`, `&`, `|` hors guillemets (garde `^x` et `>&`) |
| `unquoted`, `tokens`, `unq`, `q`, `strip_redir` | aides (texte entre guillemets, arguments, redirections `>nul 2>&1`, `> $null`, `>> fichier` retirées) |
| `marker(*parts)` | `echo @@RAGO …` |
| `dry_cmd(cmd)` | une commande simple → ligne de relevé ou `ver >nul` ; `set`, `setlocal`, `endlocal`, `exit`, `shift` gardés tels quels (les variables doivent rester justes) |
| `dry_chain(text)` | une suite `a & b && c` : chaque morceau traité, parenthèses gardées ; un morceau avec un tube `|` devient `ver >nul` |
| `find_in_clause(s)` | position de la parenthèse qui ferme `in (…)` (tient compte des guillemets simples et doubles) |
| `check_in(clause)` | lève `ValueError` si la commande d'un `for /f` n'est pas dans `IN_OK` |
| `dry_line(line)` | une ligne : texte (`echo`, `rem`, `::`, `title`, `cls`, `pause`, `timeout`…) supprimé ; `)`, `(`, `) else (` gardés ; `for` gardé avec son corps passé à blanc ; `if` gardé avec sa condition reconstruite depuis le texte d'origine (formes `exist`, `defined`, `errorlevel`, `==`, `equ`/`neq`/…), corps passé à blanc ; le reste par `dry_chain` |
| `dry_script(script)` | tout le script ; gère les listes `for %%a in (` sur plusieurs lignes ; sortie en CRLF |
| `ALLOWED_HEADS` | ce qu'un relevé a le droit de contenir : `echo @@RAGO`, `ver >nul`, `set`, `setlocal`, `endlocal`, `exit`, `shift`, `for`, `if`, `(`, `)`, `&` |
| `lint(dry)` | relit le relevé et lève `ValueError` dès qu'une commande hors liste blanche reste |
| `build(scripts)` | `{id: {variante: relevé}}`, chaque relevé passé par `lint` |

## Fonctionnement détaillé
1. Pour chaque ligne du script : on garde le squelette (`for`, `if`, parenthèses, `set`) pour que les boucles et les conditions donnent **exactement** les mêmes clés que le vrai script (par exemple une boucle sur toutes les cartes réseau).
2. Chaque commande qui agit est traduite par `dry_cmd` en ligne `@@RAGO` ; une commande inconnue (taskkill, netsh, powershell…) devient `ver >nul` : elle n'est pas relevée (c'est l'annulation générée par [[undo_gen.py]] qui s'en charge, avec ses valeurs par défaut de [[defaults.py]]).
3. Toute commande lancée dans un `for /f` doit être une lecture (`check_in`) : sinon le relevé, censé ne rien changer, exécuterait une modification.
4. `lint` revérifie le résultat final.

### En ligne de commande
`python3 tools/probes.py` (depuis `app/`) relit `src-tauri/scripts/scripts.json`, fabrique les relevés **en mémoire** et affiche `7534 lignes de relevé` ; `python3 tools/probes.py <id>` affiche en plus le relevé de chaque variante de ce réglage. **N'écrit aucun fichier** (contrairement à ce que laisse penser le docstring, il n'affiche pas de « couverture » détaillée, seulement le total).

## Données touchées
Aucun fichier écrit par le module. Ses relevés deviennent `probes.json` via [[build_catalog_v6.py]]. Sur le PC du joueur, le relevé lancé par l'app lit le registre, les services, `bcdedit`, les tâches et l'alimentation (voir [[backup.rs]]).

## Erreurs et cas limites
- `ValueError` (build arrêté) pour : `for` sans `in (…)` ou sans `do`, `if` illisible ou sans commande, liste de `for` inattendue, commande d'écriture dans un `for /f`, commande interdite restée dans le relevé.
- Une ligne `) > nul` ferme toujours le bloc (cas corrigé : elle devenait `ver >nul` et le bloc ne se fermait jamais).
- Ce qui n'est pas relevé (une commande `netsh`, `powershell Set-…`, une suppression de fichier) n'est pas sauvegardé : l'annulation repose alors sur la remise aux valeurs de Windows ([[undo_gen.py]]), et le build coche « point de restauration » d'office sur les réglages qu'aucune annulation ne remet entièrement (`restore: true`).

## Liens avec le reste
- Appelé par [[build_catalog_v6.py]] (`PROBES.build`) ; utilisé par [[paths.py]] (`find_in_clause`) et [[undo_gen.py]].
- Lu côté app par [[backup.rs]] (sauvegarde avant application) et [[catalog.rs]] (fonction `probe`, qui choisit le relevé du paquet gratuit ou Premium) ; embarqué par `embed_scripts.rs` ([[Scripts embarqués (JSON)]], [[seal.rs]]).
- Les règles « boucle `for /f` en lecture seule » s'imposent aux scripts écrits dans [[optis_120.py]] (ex. `win_fullscreen`).

## Tests
Pas de test Python. `lint` est le garde-fou. Côté Rust, [[catalog.rs]] vérifie que les retirés n'ont pas de relevé et que `CoalescingTimerInterval` n'apparaît dans aucun (`kernel_timer_value_stays_out`).

## À savoir avant de modifier
- Ajouter un type de ligne `@@RAGO` demande de modifier aussi le lecteur Rust ([[backup.rs]]) et l'annulation ([[undo_gen.py]]).
- Une nouvelle commande de lecture dans un `for /f` doit être ajoutée à `IN_OK`, en vérifiant qu'elle ne peut rien modifier.
