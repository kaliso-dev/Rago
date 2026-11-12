---
type: code
tags: [code, app, rust, moteur]
fichier: app/src-tauri/src/runner.rs
lignes: 995
maj: 2026-11-10
---
# runner.rs

Le moteur qui applique et annule les réglages : un lot à la fois, dans un fil, chaque réglage écrit en script `.cmd` caché puis lancé par `cmd.exe`, le journal envoyé ligne par ligne à l'interface. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Moteur des tweaks]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (1.1.5), 7 commits. Revue du moteur du 13/10 citée dans les tests (M1, m2, « Lancement des scripts »).

## Rôle et place dans l'ensemble
- Appelé par [[lib.rs]] : `start` pour un lot de l'interface (après les règles de l'offre de `start_tweaks`), `run_now` pour la remise de fin de licence ; et par [[reset.rs]] pour la désinstallation.
- Lit les scripts dans [[catalog.rs]] (paquet gratuit ou Premium), relève et remet l'état d'avant avec [[backup.rs]] (`Ledger`, `Sys`), note chaque réglage dans [[history.rs]], sort les fichiers natifs avec [[assets.rs]], lance les processus cachés par [[shell.rs]], règle OptiFine par [[minecraft.rs]].

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `struct RunItem {id, variant: Option, params: Option<Value>, undo: bool}` | un réglage demandé par l'interface (JSON en camelCase). `params` : données des réglages natifs (valeurs OptiFine, dossier Minecraft). `undo` : réglage décoché, remettre l'état d'avant |
| `struct Runner {running, cancel: AtomicBool, child: Mutex<Option<u32>>}` | état du moteur ; `child` = PID du processus en cours |
| `Runner::is_running()` | un lot tourne |
| `Runner::cancel()` | met `cancel` à vrai et tue le processus en cours et ses enfants : `taskkill.exe /PID <pid> /T /F` |
| `Runner::start(ctx, items) -> Result<run_id>` | refuse si un lot tourne (`"An optimization is already running"`), crée `run-<ms>`, lance un fil qui prend le verrou `EXCLUSIVE` puis `run` |
| `Runner::run_now(ctx, items) -> (ok, failed)` | même chose sur le fil appelant, id `reset-<ms>`, sans interface |
| `type Emit = Arc<dyn Fn(&str, Value) + Send + Sync>` | envoi d'un événement ; [[lib.rs]] le relie à `AppHandle::emit` |
| `struct Context` | `app: Option<Emit>`, `history`, `resource_dir`, `logs_dir`, `run_dir`, `backup_dir`, `adapter` (nom de la carte réseau), `ledger`, `premium: Option<Arc<Bundle>>`, `stop_when: Option<Fn() -> bool>` |
| `pub(crate) fn exclusive()` | prend `static EXCLUSIVE: Mutex<()>` : un seul lot à la fois sur Windows, même entre l'interface et une remise |
| `pub fn changes_windows(id)` | tout sauf `rst_point`, `rst_open`, `app_settings` (ces deux derniers ouvrent une fenêtre de Windows) |
| `pub fn is_native(id)` | `mc_optifine`, `nv_profile`, `rst_point` : lancés par le moteur, sans script du catalogue |
| `pub fn ensure_dir(p)` | `create_dir_all` sans erreur |

Événements (structures privées, sérialisées en camelCase) :
- `run:item` `{runId, index, id, variant, status, code, durationMs, message}`, `status` parmi `running`, `ok`, `error`, `skipped` ;
- `run:log` `{runId, id, line}` ;
- `run:done` `{runId, ok, failed, skipped, restoreFailed, cancelled, logFile}`.

## Fonctionnement détaillé

### La boucle `run(ctx, run_id, items)`
1. Ouvre le journal `logs\<run_id>.log` en ajout. Crée un `Sys` sur `backup_dir`.
2. Pour chaque réglage, dans l'ordre :
   - **arrêt** : `cancel` → sortie de boucle ; `stop_when()` vrai → ligne `==== stopped before <id>: no longer needed` et sortie (lu entre deux réglages seulement : un réglage commencé est toujours remis en entier) ;
   - **annulation déjà faite** : `undo` alors que le réglage n'est plus dans `applied.json` → ligne `==== undo <id>: already put back`, compté réussi ;
   - **RBW Mod « Désactivé » de cette version (M1)** : si on défait `rbw_mode` (`catalog::revert_runs_script`) et que l'entrée a `windows_values = true` sans sauvegarde, rien n'est lancé (« - Off already put the Windows values back: nothing to undo »), l'entrée est libérée, l'historique note une annulation réussie ;
   - **RBW Mod, autre retour** : sinon défaire `rbw_mode`, ou cliquer sur sa variante de retour quand il est appliqué, est **converti** en lancement complet de la variante « Activé » (`revert_variant`), jamais en restauration de la sauvegarde ;
   - `undo` = décoché, ou variante de retour arrière (`is_revert`) d'un réglage appliqué (sauf RBW) ;
   - **point de restauration raté** : si `rst_point` a échoué plus haut, chaque réglage qui n'est pas une annulation et qui `changes_windows` est sauté (`==== skipped <id> (no restore point)`, statut `skipped`). Les annulations tournent quand même : c'est le sens sûr ;
   - **jumeaux** : deux réglages qui ont le même script (`catalog::twin_of`) cochés ensemble : le script tourne une fois. Le 2e affiche « - Same commands as <nom>, applied above: not run again » (ou « …which failed above… ») et reçoit le même résultat et les mêmes relevés ;
   - **appliquer** : si c'est un interrupteur (`is_switch` et pas une variante de retour) et pas RBW : `snapshot` relève l'état d'avant ; puis `run_item` ; puis, avec les relevés : `forget_active`, `set_after` pour chaque valeur de registre (sert à repérer la dérive), `set_applied(id, variante, ok, backup = true, ids, ts)`, `repair::hitreg_suite_without_backup` (RAG-68), `fill_undo`, `save` ;
   - interrupteur sans relevé : OptiFine (sauvegarde propre, `backup = true`, `dir` = dossier choisi) ou RBW « Désactivé » (`windows_values = true`) ;
   - RBW « Activé » allé au bout : l'entrée est libérée (plus « appliqué »). S'il n'a pas tourné, « Désactivé » reste noté (m2) ;
   - **annuler** : `undo_item` ;
   - émet `run:item` final (`ok` ou `error`, code, durée, message). Ajoute une entrée à l'historique, sauf pour les id qui commencent par `__` (comme `__wmic`) ;
   - échec de `rst_point` → `restore_failed = true` et ligne `! No restore point: the tweaks after it are not run`.
3. Émet `run:done` et renvoie `(ok, failed)`.

### `snapshot` : relever l'état d'avant
Le relevé (`catalog::probe`) est un petit script qui affiche des lignes `@@RAGO <type> "a" "b"`. S'il en contient, il est écrit (`<id>-probe-…cmd`), lancé, effacé ; la sortie est décodée et lue par `backup::parse_markers`. Les éléments pas encore gardés (`!ledger.has(id)`) sont lus hors du verrou (bcdedit et powercfg sont lents) puis gardés par `record_before`. Message : « - Saved how N settings were before, to put them back if you turn this off ». Un élément déjà gardé par un autre réglage n'est pas relu : la valeur d'avant reste celle d'avant **le premier** réglage.

### `undo_item` : remettre l'état d'avant
- Annulation à utiliser : celle de cette version (`catalog::undo_of`), sinon la copie gardée dans `applied.json` au moment d'appliquer (utile quand le paquet Premium est fermé après une déconnexion).
- `mc_optifine` : `minecraft::restore_latest(dossier)` (dossier donné, sinon celui noté, sinon `%APPDATA%\.minecraft`), puis libère.
- `nv_profile` : `nvidia_defaults` (voir plus bas), libère si code 0 et pas d'arrêt.
- **Avec sauvegarde** (`backup = true`) : `releasable(id)` donne les éléments à remettre (ceux qu'aucun autre réglage appliqué ne partage). Si `rest_avant` : le script `rest` tourne d'abord (plans d'alimentation supprimés, recréés avant que la sauvegarde réactive l'ancien). Puis « - Putting back N settings as they were before this tweak » et `sys.restore` pour chacun (une erreur par élément : `! <élément>: <erreur>`). Puis `rest` si pas `rest_avant` (« - Putting back the Windows values for the network and system commands »). Erreurs → code 1 et message « N settings couldn't be put back ». L'entrée n'est libérée que si tout a pu être lancé et sans arrêt : une remise coupée reprend au lancement suivant.
- **Sans sauvegarde** (appliqué avant 1.1.6 ou par l'ancien `.bat`) : `undo.full`, sinon le script de la variante de retour ; message « - Putting back the Windows default values ». S'il n'y a rien : erreur « This tweak can't be undone automatically yet. Use the restore point in the Restore module. ».

### `run_item` : appliquer
- `mc_optifine` : lit `params.dir` (défaut `%APPDATA%\.minecraft`) et `params.values` ; si déjà appliqué dans ce dossier, la copie d'avant Rago est gardée (`keep`) ; `minecraft::apply`.
- `nv_profile` : exige `resources\nvidiaProfileInspector.exe` ; sort `extremelatencylow.nip` par `assets::stage` puis lance `nvidiaProfileInspector.exe <nip> -silentImport`.
- `rst_point` : PowerShell caché avec `RESTORE_POINT_PS` : `Enable-ComputerRestore` sur le lecteur système, `SystemRestorePointCreationFrequency` = 0 (DWORD, sous `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore`, pour lever la limite d'un point par 24 h), puis `Checkpoint-Computer -Description 'Rago Optimizer' -RestorePointType 'MODIFY_SETTINGS'`.
- Autre : `catalog::script(id, variant, premium)` (sinon « Unknown tweak: <id> ») puis `run_batch`.

### `nvidia_defaults`
Profile Inspector ne sait pas exporter le profil d'avant. L'annulation importe donc un profil vide (`NVIDIA_DEFAULTS` : `Base Profile` sans réglage, écrit en UTF-16 LE avec BOM dans `run\nvidia-defaults.nip`) : les réglages 3D globaux reviennent à ceux du pilote, comme « Restaurer » dans le panneau NVIDIA. Sans `System32\nvapi64.dll` (plus de pilote NVIDIA), rien n'est fait et c'est une réussite.

### Écrire et lancer un script
- `run_batch` : `assets::stage` remplace `%RAGO_RES%\LowLatency.pow` ou `.nip` par un fichier sorti en clair dans un dossier temporaire, et pose `RAGO_SEC` ; `write_script` ; `script_command` ; `stream` ; efface le script ; le dossier temporaire disparaît avec `Staged`.
- `write_script(dir, id, variant, body)` : nom `<id>[-<variante>]-<ms>.cmd` passé par `sanitize` (lettres, chiffres, `-`, `_`, `.` ; le reste devient `_`), fins de ligne CRLF, contenu = `PREAMBLE` + corps + `exit /b 0`. `PREAMBLE` = `@echo off`, `chcp 65001 >nul`, `setlocal EnableExtensions EnableDelayedExpansion`.
- `script_command` : `cmd.exe /d /c .\<nom>.cmd`, **dossier courant = dossier du script**, variables `RAGO_RES` = `resource_dir` et `adapter_name` = carte réseau. Le chemin complet n'est jamais sur la ligne de commande : un `&`, `(`, `)` ou `^` dans le nom du compte Windows cassait chaque réglage (revue du 13/10). `/d` ignore l'AutoRun de cmd.
- `stream` : lance le processus, garde son PID pour `cancel`, lit stdout et stderr dans deux fils qui envoient chaque ligne non vide dans un canal ; le fil du lot les relaie (`run:log` + journal) ; renvoie le code de sortie (`-1` si aucun).
- `decode` : UTF-8, sinon CP850 (table `cp850`) pour garder les accents des outils Windows restés en page OEM.

## Données touchées
- `data_dir\run\*.cmd` (effacés aussitôt ; le dossier est vidé au démarrage par [[lib.rs]]), `run\nvidia-defaults.nip`, dossiers `res-<pid>-<ms>` d'[[assets.rs]].
- `data_dir\logs\run-<ms>.log` et `reset-<ms>.log` (jamais effacés par l'app).
- `applied.json` (par `Ledger`), `history.json` (par `History`), `backup\*.reg` (par `Sys`).
- Registre `SystemRestorePointCreationFrequency` ; point de restauration Windows.
- Processus lancés : `cmd.exe`, `powershell.exe`, `nvidiaProfileInspector.exe`, `taskkill.exe`.

## Erreurs et cas limites
- Le script finit toujours par `exit /b 0` : un code non nul vient d'un `exit /b N` explicite du script ou d'un processus tué. Un lot arrêté rend `ok = false` même avec le code 0.
- Une annulation arrêtée en route ou dont `rest` n'a pas pu démarrer garde le réglage et sa sauvegarde (test `undo_that_could_not_start_keeps_the_backup`).
- `stdin` est fermé par [[shell.rs]] : un `pause` oublié dans un script ne bloque jamais.
- Les scripts ne sont pas dans `%TEMP%` : beaucoup de réglages vident `%TEMP%` et tuaient leur propre script.

## Tests
`decodes_cp850_fallback`, `script_file_uses_crlf_and_preamble`, `scripts_start_by_name_from_their_folder` et `scripts_run_from_a_folder_with_special_characters` (dossier « O'Brien & Co (x) ^1 %TEMP% !y! », revue du 13/10), `reset_stops_when_the_license_comes_back`, `reset_puts_back_and_releases_each_tweak`, `rbw_off_is_forgotten_without_running_on` (M1), `rbw_on_that_did_not_run_keeps_off_applied` (m2), `stopped_undo_keeps_the_tweak_applied`, `undo_that_could_not_start_keeps_the_backup`. Les tests qui touchent un vrai réglage utilisent un dossier `run` impossible à créer (`unwritable`), pour ne jamais rien appliquer sur le PC de test ni sur la CI Windows ([[CI GitHub Actions]]).

## À savoir avant de modifier
- `Emit` ne doit jamais devenir un `AppHandle` : les tests lancent des lots, et sous Windows un programme de test qui contient le code des fenêtres de Tauri ne démarre plus sans le manifeste (`STATUS_ENTRYPOINT_NOT_FOUND`, comctl32 v6).
- L'ordre « relevé avant, puis script, puis `set_after` » est ce qui permet le badge « Changé par Windows » ([[backup.rs]]).
- `rest_avant` n'existe que pour `pow_ultimate` et `pow_delete_plans` ([[Scripts embarqués (JSON)]]).
- Les cas RBW sont subtils (M1, m2) : lire les tests avant de toucher. Voir [[RBW Mod]] et [[Tweaks RBW Mod]].
- Ne jamais faire sauter `EXCLUSIVE` : une remise à zéro et un lot de l'interface en même temps se marcheraient dessus.
