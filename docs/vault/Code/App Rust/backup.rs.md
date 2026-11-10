---
type: code
tags: [code, app, rust, moteur]
fichier: app/src-tauri/src/backup.rs
lignes: 1347
maj: 2026-11-10
---
# backup.rs

Registre des réglages appliqués (`applied.json`) et **sauvegarde de l'état d'avant** de chaque élément que Rago modifie (valeurs de registre, options de démarrage, tâches planifiées, plans d'alimentation, veille prolongée), avec la lecture et la remise sous Windows. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Moteur des tweaks]], [[Remise à zéro]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (1.1.6, arrivée de la sauvegarde), 4 commits. Environ 1 000 lignes de code, 330 de tests.

## Rôle et place dans l'ensemble
- [[runner.rs]] relève avant d'appliquer (`record_before`, `set_after`, `set_applied`) et remet en annulant (`releasable`, `Sys::restore`, `release`).
- [[lib.rs]] charge le registre au démarrage (`Ledger::load`, `import_history`, `needs_migration`), le montre (`views` pour `get_applied`, avec la dérive) et garde les annulations (`fill_undo` par `keep_undo`).
- [[reset.rs]] choisit quoi remettre à la fin de licence ou à la désinstallation ; [[repair.rs]] corrige les valeurs dangereuses déjà posées.
- Le chiffrement au repos utilise DPAPI de [[license.rs]] (`license::vault`) et, en secours, [[seal.rs]].

## Ce que le fichier expose

### Les éléments relevés : `enum Probe` (JSON `{"t": "<type>", …}`)
| Variante | Ligne du relevé | Ce que c'est | `id()` |
|---|---|---|---|
| `Reg {key, name}` | `@@RAGO reg "clé" "nom"` | une valeur de registre (nom vide : valeur par défaut) | `reg\|clé\|nom` |
| `RegKey {key}` | `regkey` | clé créée sans valeur | `regkey\|clé` |
| `RegVals {key}` | `regvals` | toutes les valeurs d'une clé (`reg delete /va`) | `regvals\|clé` |
| `RegTree {key}` | `regtree` | clé entière supprimée | `regtree\|clé` |
| `Bcd {store, name}` | `bcd "{id}" "nom"` | option de démarrage `bcdedit` | `bcd\|store\|nom` |
| `Task {path}` | `task "\chemin"` | tâche planifiée | `task\|chemin` |
| `Pwr {scheme, sub, setting}` | `pwr "plan" "sous-groupe" "réglage"` | valeur d'un plan d'alimentation | `pwr\|…` |
| `PwrActive` | `pwractive` | plan actif | `pwractive` |
| `Hib` | `hib` | veille prolongée | `hib` |

`id()` est **en minuscules** (registre et commandes Windows ignorent la casse). `normalize_key` réduit la racine (`HKEY_LOCAL_MACHINE` → `HKLM`, aussi `HKCU`, `HKU`, `HKCR`, `HKCC`) et retire guillemets et barre finale ; une racine inconnue ou vide (boucle qui n'a rien trouvé) donne `None` et l'élément est ignoré. `parse_markers(sortie)` lit les lignes `@@RAGO`, retire les doublons et garde l'ordre.

### L'état relevé : `enum Saved` (JSON `{"t": …}`)
`Value {kind, data}` (type de registre et octets en hexadécimal), `Absent {created}` (valeur absente ; `created` = première clé du chemin qui n'existait pas, supprimée si vide au retour), `Values {values: [(nom, type, hex)]}`, `Tree {file}` (clé exportée par `reg export`), `NoTree`, `Key {existed}`, `Bcd {value}`, `Task {enabled}`, `Pwr {scheme, ac, dc}`, `Active {guid}`, `Hib {on}`, `Unknown` (illisible : rien à remettre).

`SavedEntry {probe, before, after}` : `after` = valeur posée par Rago (registre seulement), pour voir si Windows l'a changée depuis.

### L'annulation : `struct Undo {full, rest, rest_avant}`
Vient de `scripts/undo.json` ([[Scripts embarqués (JSON)]]). `full` : script qui remet les valeurs de Windows quand il n'y a pas de sauvegarde. `rest` : ce que la sauvegarde ne relève pas (netsh, PowerShell, plans supprimés…), lancé **après** elle, sauf si `rest_avant` (le plan à réactiver doit d'abord être recréé).

### Un réglage appliqué : `struct Applied` (camelCase)
`variant`, `ts` (ms), `ok`, `backup` (l'état d'avant a été relevé ; faux = appliqué avant 1.1.6, retour par les valeurs de Windows), `probes` (id des éléments touchés), `undo` (copie de l'annulation gardée tant que la licence était active), `windows_values` (RBW Mod « Désactivé » depuis RAG-69 : rien à défaire), `dir` (dossier Minecraft d'OptiFine).

### Le registre : `struct Ledger`
- `tweaks: BTreeMap<String, Applied>` et `saved: Vec<(id, SavedEntry)>` (dans l'ordre du relevé) sont écrits dans le fichier ; `path`, `unread`, `legacy_plaintext` ne le sont pas.
- Méthodes : `load(path) -> (Ledger, existait)`, `save()`, `needs_migration()`, `has(probe_id)`, `record_before(probe, before)` (seulement si pas déjà gardé), `set_after(id, after)`, `fill_undo(lookup) -> changé`, `set_applied(id, variant, ok, backup, probes, ts)`, `releasable(id)`, `release(id)`, `import_history(history)`, `views(read) -> Vec<AppliedView>`.
- `AppliedView {id, variant, ts, ok, backup, drift, windows_values}` : ce que l'interface affiche (badge « Changé par Windows » si `drift`).

### Lecture des sorties de Windows (fonctions pures, testées partout)
`parse_bcd` (nom → valeur de `bcdedit /enum`), `bcd_value` (oui/non traduits en 12 langues → `yes`/`no`), `parse_pwr` (les deux derniers nombres hexadécimaux de `powercfg /q` = secteur, batterie), `parse_guid`, `task_enabled` (XML de la tâche : activée sauf `<Enabled>false</Enabled>` dans `<Settings>`), `decode_text` (UTF-16 LE avec BOM ou UTF-8), `hex`/`unhex`, `file_for(dir, id)` = `backup\<16 caractères hex de sha256(id)>.reg`, `service_key` (clé `HKLM\SYSTEM\CurrentControlSet|ControlSetNNN\Services\<nom>`), `dword`, `start_mode` (Start + DelayedAutostart → `boot`, `system`, `delayed-auto`, `auto`, `demand`, `disabled` pour `sc config`), `same_reg` (valeur déjà comme avant ; `DelayedAutostart` absent vaut 0).

### `struct Sys` : lire et remettre sous Windows
`Sys::new(backup_dir)`, `read(probe) -> Saved`, `forget_active()`, `restore(probe, saved) -> Result`. Hors Windows (tests, démo), `read` rend `Unknown` et `restore` ne fait rien.

## Fonctionnement détaillé

### Principe du partage
Chaque élément est lu **une seule fois**, avant la première modification par Rago. Si deux réglages touchent la même valeur, la valeur d'avant est celle d'avant le premier. Décocher un réglage ne remet que les éléments qu'aucun autre réglage encore appliqué ne touche (`releasable` / `release`, dans l'ordre inverse du relevé) ; les autres reviennent avec le dernier réglage qui les touche.

### `Sys::read`
- `Reg` : API `RegOpenKeyExW` / `RegQueryValueExW` en vue 64 bits (`KEY_WOW64_64KEY`) ; clé absente → `Absent {created: first_missing(clé)}`.
- `RegVals` : `RegEnumValueW` ; `RegTree` : `reg.exe export <clé> backup\<hash>.reg /y`.
- `Bcd` : `bcdedit.exe /enum <store>` une fois par store (cache `bcd`).
- `Task` : lit le fichier `%WINDIR%\System32\Tasks\<chemin>`.
- `Pwr` : `powercfg.exe /q <plan> <sous-groupe> <réglage>` ; `scheme_current` est remplacé par le GUID du plan actif (`/getactivescheme`, en cache `active`).
- `Hib` : `HKLM\SYSTEM\CurrentControlSet\Control\Power\HibernateEnabled`.
- `forget_active` vide les deux caches après un script (le plan actif a pu changer).

### `Sys::restore`
- `Reg` + `Value` : si déjà comme avant (`same_reg`), rien n'est écrit : c'est le cas des clés protégées par Windows (journal de déconnexion du 16/10 : dossier Réseau sous `HKCR\CLSID`, `Diagnostics\Performance`, service DPS, journaux de Defender). Sinon `RegCreateKeyExW` avec le seul droit `KEY_SET_VALUE` (certaines clés refusent l'accès complet aux administrateurs) puis `RegSetValueExW`. En cas d'échec sur `Start` ou `DelayedAutostart` d'un service : `by_service` lance `sc.exe config <service> start= <mode>` (seulement dans le jeu de contrôle courant, lu dans `HKLM\SYSTEM\Select\Current`) puis relit.
- `Reg` + `Absent` : `RegDeleteValueW`, puis `prune` supprime les clés vides créées par le réglage (jamais au-dessus de `created`). Si la valeur est encore là : erreur (« couldn't delete … »), sauf réussite de `by_service`.
- `RegKey` qui n'existait pas : supprimée si vide. `RegVals` : réécrit chaque valeur. `RegTree` : `reg.exe import <fichier>`.
- `Bcd` : `bcdedit /timeout <v>` pour `timeout`, `/set <store> <nom> <valeur>` ou `/deletevalue` ; une erreur sur une valeur déjà absente est ignorée.
- `Task` : `schtasks.exe /change /tn <chemin> /enable|/disable` (rien si déjà comme avant).
- `Pwr` : `powercfg /setacvalueindex`, `/setdcvalueindex`, puis `/setactive scheme_current`. `PwrActive` : `powercfg /setactive <guid>`. `Hib` : `powercfg /hibernate on|off`.
- Tous les programmes sont lancés cachés par [[shell.rs]] ; l'erreur rendue est la dernière ligne de la sortie.

### Chiffrement et écriture d'`applied.json`
- `save()` : JSON → `license::vault::seal` (DPAPI, lié au compte Windows). Si DPAPI refuse (profil abîmé) : en-tête `RAGO-LEDGER-1\0` + `seal(ledger_key, nonce, json)` avec un nonce de 16 octets tiré de sha256(heure, PID, contenu). **Jamais de commandes en clair sur le disque.** Écriture dans `applied.json.tmp`, `sync_all`, puis renommage : une coupure de courant ne laisse ni fichier coupé ni fichier vide.
- `load()` : 1 lecture + jusqu'à 3 nouveaux essais espacés de 200 ms (verrou passager d'un antivirus). Absent → registre vide et `false` (l'appelant le remplit par `import_history`). Illisible (coupé, chiffré pour un autre compte Windows, champ inconnu) → renommé `applied.json.bad-<ms>` et ligne dans `logs\repairs.log` (« … kept as …, a new one is started ») ; s'il ne peut même pas être renommé, `unread` empêche tout `save` d'écraser le fichier pendant ce lancement (ligne « …left untouched, changes of this launch aren't saved »).
- `decode` : en-tête de secours → `seal::open` ; sinon DPAPI ; sinon texte en clair (fichier d'avant le chiffrement au repos) avec `legacy_plaintext = true`, réécrit chiffré au démarrage. Un fichier en secours est aussi marqué à réécrire (en DPAPI).

### `set_applied`, `fill_undo`, `import_history`, `views`
- `set_applied` : un réglage réappliqué garde `backup = ancien && nouveau` (s'il a été posé avant 1.1.6, relever maintenant ne verrait que sa propre valeur) ; ajoute les nouveaux `probes` ; un changement de variante efface la copie `undo`.
- `fill_undo(lookup)` : remplace la copie de l'annulation par celle de cette version dès qu'elle est connue (les copies des versions 1.1.6 à 1.1.10 n'ont pas les corrections de l'écran bleu ni des chemins du profil) ; sans lookup (paquet Premium fermé), la copie reste.
- `import_history` : au premier lancement de 1.1.6, chaque réglage dont la dernière entrée de l'historique est une application réussie d'un interrupteur (pas une variante de retour) devient `Applied {backup: false}`.
- `views(read)` : un élément `Reg` a dérivé si sa valeur actuelle diffère de `after` ; un réglage a `drift` si un de ses éléments a dérivé.

## Données touchées
- `%APPDATA%\gg.rago.optimizer\applied.json` (chiffré), `applied.json.tmp`, `applied.json.bad-<ms>`, `logs\repairs.log`, `backup\<hash>.reg`.
- Registre (toutes racines, vue 64 bits), magasin BCD, tâches planifiées, plans d'alimentation, veille prolongée, services (par `sc.exe`).

## Erreurs et cas limites
- Une valeur que Windows protège et que le script n'a pas pu changer non plus se « remet » sans écriture : pas de faux échec (avant le 16/10, la déconnexion annonçait 4 réglages « pas remis »).
- `Unknown` à la lecture = rien à remettre (`restore` renvoie `Ok`).
- `bcd_value` traduit les oui/non affichés dans la langue de Windows : sinon `bcdedit /set` refuserait « Oui ».

## Tests
`markers_are_parsed_and_deduplicated`, `windows_outputs_are_read_in_any_language`, `values_already_back_need_no_write` (journal du 16/10), `service_start_maps_to_sc_config`, `restore_on_windows` (CI Windows : valeurs du 16/10 et une valeur sous HKCU retirée avec sa clé), `shared_values_come_back_with_the_last_tweak`, `drift_is_seen_on_registry_values`, `ledger_survives_a_restart`, `unreadable_ledger_is_set_aside_not_overwritten` (en 1.1.9 tout était perdu), `unread_ledger_is_set_aside_before_any_save`, `undo_copy_is_kept_and_follows_the_variant`, `old_undo_copy_is_refreshed`, `ledger_never_written_in_clear_when_dpapi_fails`, `reads_legacy_plaintext_ledger_then_reseals`.

## À savoir avant de modifier
- Le format JSON (`#[serde(tag = "t")]`, noms en minuscules, champs `#[serde(default)]`) est lu par les versions suivantes : n'ajouter que des champs avec `default`, sinon un PC qui revient en arrière met son fichier de côté.
- Ne jamais écrire `applied.json` en clair : il contient la copie des scripts d'annulation Premium.
- Un nouveau type d'élément demande : une variante `Probe`, une ligne `@@RAGO` dans `tools/probes.py`, une lecture et une remise dans `Sys`, et un `describe` dans [[runner.rs]].
- Voir aussi [[history.rs]] (même logique de mise de côté et de chiffrement) et [[Réparations au lancement]].
