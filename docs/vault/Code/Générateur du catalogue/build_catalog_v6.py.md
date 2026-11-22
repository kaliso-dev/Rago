---
type: code
tags: [code, app, catalogue, générateur, python]
fichier: app/tools/build_catalog_v6.py
lignes: 1254
maj: 2026-11-10
---
# build_catalog_v6.py

Le générateur du catalogue des tweaks : il fabrique, à partir des anciens `.bat` et des modules Python de `app/tools/`, les quatre fichiers que l'app embarque (`catalog.json`, `scripts.json`, `probes.json`, `undo.json`) et le journal `app/docs/CORRECTIONS.md`. C'est lui que lance `npm run catalog`. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). **Vérifié le 10/11** : relancé sur une copie de `app/` hors du dépôt, il redonne `catalog.json`, `scripts.json`, `probes.json`, `undo.json` et `CORRECTIONS.md` **identiques octet pour octet** aux fichiers commités, en 6 s. Les fichiers du dépôt sont donc bien la sortie du code actuel.

## Rôle et place dans l'ensemble
- Commande : `cd app && npm run catalog` (script `"catalog": "python3 tools/build_catalog_v6.py"` de `app/package.json`). Aucun argument. Il doit être lancé depuis `app/` ou n'importe où : tous les chemins partent de `ROOT = <dossier du script>/..`.
- Il **appelle** [[build_catalog.py]] (l'ancien programme v5.2, en sous-processus), puis importe et applique dans l'ordre [[audit_fixes.py]], [[optis_120.py]], [[safety.py]], [[rbw.py]], [[paths.py]], [[probes.py]], [[corrections_md.py]], la classe `LegacyBat` de [[extract_bat.py]], et lance [[undo_gen.py]] puis [[merge_full.py]] en sous-processus. Les textes viennent de [[descriptions.json]].
- Ses sorties sont lues par le moteur Rust ([[catalog.rs]], [[backup.rs]], [[runner.rs]]) après chiffrement à la compilation ([[Scripts embarqués (JSON)]], [[seal.rs]]), par l'interface ([[catalog.ts]], [[catalog.json]]), par le site (`site/tools/sync_app.py`) et par [[catalogue_vault.py]] (notes [[Tweaks Réseau]] et suivantes).
- Historique : créé le 07/10 (1.1.5, commit `6c2bcad`), 9 commits, dernier changement le 01/11 (`29123d4`, preset Minecraft PvP de la 1.2.2).

## Entrées et sorties
| Sens | Fichier | Rôle |
|---|---|---|
| Entrée | `app/legacy/v6/RAGO APP Ping Optimization Final.bat`, `RAGO APP HITREG INPUTLAG.bat`, `RAGO APP FPS.bat` | les trois `.bat` de Sofiene du 06/10 ([[Anciens scripts .bat]]) |
| Entrée (indirecte) | `app/legacy/Premium v5.2 - Rago Hub.bat` | lu par [[build_catalog.py]] |
| Entrée | `app/tools/*.py`, `app/tools/descriptions.json` | données et corrections |
| Sortie | `app/src/data/catalog.json` | ce que l'interface affiche (sans aucun script), 271 742 octets, 8 050 lignes |
| Sortie | `app/src-tauri/scripts/scripts.json` | les scripts batch, 1 116 793 octets |
| Sortie | `app/src-tauri/scripts/probes.json` | les relevés « à blanc », 852 660 octets |
| Sortie | `app/src-tauri/scripts/undo.json` | les annulations, 732 476 octets |
| Sortie | `app/docs/CORRECTIONS.md` | journal des corrections ([[CORRECTIONS.md (app)]]) |
| Console | `231 réglages (218 distincts), 230 scripts, 17 retirés` | précédé de la ligne de [[build_catalog.py]] : `189 réglages, 231 scripts, 6908 lignes, 176 lignes corrigées` |

`app/src/data/free.json` (plan gratuit) **n'est pas** produit ici : il est écrit à la main ([[free.json]]).

## Ce que le fichier expose
Le fichier n'a pas d'API : `main()` est lancé par `if __name__ == '__main__'`. Ses constantes sont les vraies « données » du catalogue v6 :

| Nom | Contenu |
|---|---|
| `FILES` | clés `ping`, `input`, `fps` → nom des trois `.bat` v6 |
| `HEADER` | regex `^:{2,3}\s*([A-Za-z].*?)\s*$` : une ligne `:: Titre` ou `::: Titre` ouvre un bloc |
| `NIP` | ligne qui importe `extremelatencylow.nip` par `"%RAGO_RES%\nvidiaProfileInspector.exe" … -silentImport` |
| `I(en, fr)` | texte bilingue `{'en', 'fr'}` (fr = en si absent) |
| `T(file, line, id, en, fr, desc_en, desc_fr, risk, reboot, requires, variants, absorb, confirm, default, revert, prefix)` | décrit un réglage v6 (voir plus bas) |
| `ONOFF` | variantes `on`/`off` repérées par `:: gmode ON` / `:: gmode OF` |
| `MODULES` | 5 modules v6, 51 réglages : `network` (Ping, 4), `hitreg` (Hitreg et input lag, 8), `gpu` (5), `system` (CPU et système, 19), `windows` (15) |
| `PRESETS` | 3 presets v6 : `mc_pvp` (20 réglages), `fps` (25), `latency` (23) |
| `PRESET_EXTRA` | ajouts aux presets `laptop` et `privacy` repris de l'ancien programme |
| `RBW_TOUCHED` | regex de tout ce que lit le vérificateur de screenshare Ranked Bedwars (SysMain, PcaSvc, DPS, BAM, EventLog, WSearch, DusmSvc, BFE, AppInfo, DCOMLaunch, PlugPlay, CDPUserSvc, DisableCMD, ScriptBlockLogging, EnableActivityFeed, EnablePrefetcher, Start_TrackDocs, AppCompat) |
| `GAMES`, `LEGACY_GAMES`, `QOS`, `game_priority(exes)`, `add_games()` | priorité par jeu `pri_game` : 10 jeux ajoutés + 6 jeux d'origine réécrits (16 variantes) |
| `COMPETITIVE` (20 réglages), `SMOOTH` (16), `GAME_PRESETS` (15), `game_presets()` | presets par jeu de la [[Bibliothèque de jeux]] |
| `INTO`, `REPLACED` (14 ids), `RENAMED`, `QUEUE_VARIANTS`, `MOVE` (26 ids), `SECTION_NAMES`, `NAMES`, `NAME_FIX`, `UK_US` | fusion avec l'ancien programme et noms |
| `REVERT` | variante « retour arrière » de chaque réglage (`game_mode: off`, `rbw_mode: on`, complété par `T(revert=)`) |
| `SCRIPT_FIXES` (7), `DROP_LINES` (5), `SUB_LINES` (2) | corrections faites avant l'audit |
| `EMPTY_BLOCKS`, `WMIC_SUBS` (4), `TEMP_QUOTES` (2) | corrections faites après l'audit |
| `NEW_TWEAKS` | 2 réglages écrits par l'app (1.1.6) : `win_ai`, `win_autoplay` |
| `WARNINGS` | 26 motifs → avertissement « Read this first » (19 ici + 6 de `audit_fixes.WARNINGS_PLUS` + 1 de `optis_120.WARNINGS`) |
| `DESC_FIX`, `MEMORYUSAGE`, `LASTACCESS_OFF` | anciennes corrections de descriptions (écrasées ensuite, voir « À savoir ») |
| `ONE_SHOT` | 7 réglages passés en action ponctuelle (`kind: action`) |
| `KEEP_CONFIRM` | `win_bluetooth`, `dbl_edge`, `dbl_onedrive` : avertissement écrit à la main gardé devant ceux du script |
| `V6_NOTES` | texte de la section v6 de `CORRECTIONS.md` |
| fonctions | `variants_of`, `fix_scripts`, `drop_lines`, `sub_lines`, `apply_audit`, `postprocess`, `twins`, `count_commands`, `sections_of`, `repair`, `clean`, `split_variants`, `build_undo`, `describe`, `retire`, `main` |

## Comment un réglage v6 est décrit : `T(...)`
`T(file, line, id, en, fr, desc_en, desc_fr, …)` :
- `file` : `ping`, `input` ou `fps` ; `line` : numéro (base 1) de la ligne d'en-tête `:: Titre` du bloc dans ce `.bat`. Il doit tomber **exactement** sur un en-tête (dictionnaire `by_line`), sinon `KeyError`.
- `risk` : `safe` ou `advanced` (point de départ ; les avertissements peuvent le monter) ; `reboot` (défaut `True`) ; `requires` (`gpu:nvidia`, `cpu:amd`…).
- `variants` : liste de tuples `(id, nom en, nom fr, motif regex de début[, choix auto])`. Le bloc est coupé à la première ligne qui correspond à chaque motif ; la ligne du motif elle-même est exclue. `prefix=True` recopie les lignes d'avant la première variante dans chacune (cas de `sys_ram`, 9 tailles de RAM avec `auto: ram:N`).
- `absorb=N` : les N blocs suivants deviennent les variantes, d'après leur titre (`QUEUE_VARIANTS` : « Ultra Low », « Low », « Balanced », « Default » de `in_queue`).
- `default` → `defaultVariant` ; `revert` → la variante qui remet Windows comme avant (ouverte sans licence si le réglage est dans `reverts` de [[free.json]]) ; `confirm` → avertissement écrit à la main.

## Fonctionnement détaillé (`main`)
1. **Découpe des `.bat` v6** : `sections_of()` lit chaque fichier (UTF-8, erreurs remplacées, `\r` retirés) et le coupe en blocs `{title, line, body}` à chaque en-tête `HEADER`.
2. **Réglages v6** : pour chaque `T` de `MODULES`, l'entrée reçoit `id, name, desc, risk, reboot, requires, kind: 'tweak'`, `confirm` éventuel, `legacy: ["<fichier>@<ligne>"]`, ses `variants` (avec `auto`), `defaultVariant`, et `lines` provisoire. Le script passe par `clean()` : lignes vides, `---…`, `cls`, `pause`, `timeout`, `color` et étiquettes `:x` retirées ; `start … extremelatencylow.nip` remplacé par `NIP` ; hors `echo`/commentaires, « Disabling »/« Enabling » remis en « Disable »/« Enable », `HKU\!USER_SID!\` → `HKCU\`, puis `repair()` ; deux boucles `for` identiques consécutives fusionnées ; blocs détachés refermés (`LegacyBat._fix_blocks`) ; fins de ligne CRLF. Un script vide fait échouer le build.
3. **Blocs non repris** : chaque bloc v6 non utilisé doit être vide une fois nettoyé (en-têtes de chapitre « Latency Optimization », « DirectX Optimization », « System Optimization »…, doublons « Power Optimization » l. 1917 et « USB Optimization » l. 2046), sauf les 4 blocs absorbés par `in_queue`.
4. **Ancien programme** : lance `tools/build_catalog.py` (sous-processus, `check=True`), puis relit le `catalog.json` (version 1, 189 réglages) et le `scripts.json` qu'il vient d'écrire. Un id présent des deux côtés doit être dans `REPLACED` (14 ids : `win_diag`, `win_bluetooth`, `win_smartscreen`, `win_gamemode`, `gpu_general`, `sto_defrag`, `dbl_gamedvr`, `exp_gamedvr`, `exp_mitigations`, `dbl_hyperv`, `exp_hyperv`, `win_animations`, `win_fse`, `kbm_queue`) : la version v6 l'emporte, l'ancienne et ses renvois (`ref`) disparaissent.
5. **Fusion des modules** : les modules v6 n'existent plus en tant que tels. Chacun est versé dans un module de l'ancien programme (`INTO` : network→network, hitreg→hitreg, gpu→gpu, system→latency, windows→windows), ses sections préfixées `v6_` et placées **avant** les anciennes. Les 10 modules finaux sont ceux de [[meta.py]] (Réseau, Latence, Carte graphique, Windows, Hitreg, Minecraft, RBW Mod, Mode jeu, Mode expert, Restaurer), avec leurs noms et icônes.
6. **Sections et réglages ajoutés** : `optis_120.NEW_SECTIONS` (section `comfort` « Interface et confort » de Windows, après `system`), puis `NEW_TWEAKS` + `optis_120.NEW_TWEAKS` (22 réglages) ajoutés à la fin de leur section avec un script `{'_': corps}`.
7. **`postprocess(modules, scripts)`**, dans cet ordre exact :
   1. réparations ligne à ligne de tous les scripts (`IFACE_GUID` → boucle sur toutes les cartes réseau, `/f%` final retiré, boucles `for` en double fusionnées) ;
   2. `SCRIPT_FIXES`, `DROP_LINES`, `SUB_LINES` (corrections du 07/10 : fichiers du PC de l'auteur, « Risxn Restore Point » renommé, `useplatformclockJ`, `PROFILES_DIR`, files à 100, TRIM gardé, date de dernier accès vraiment coupée…) ;
   3. **copie `before_audit`** : les scripts tels que les PC les ont lancés avant l'audit, gardés pour l'annulation ;
   4. `apply_audit()` : [[audit_fixes.py]] (`SCRIPT_FIXES_PLUS`, `DROP_BLOCKS`, `DROP_LINES_PLUS`, `SUB_LINES_PLUS`) ;
   5. [[optis_120.py]] : `FIXES`, `DROP`, `SUB`, `REPLACE` (le script entier, seulement pour un réglage à variante unique `_`), `APPEND` ;
   6. `add_games()` : `pri_game` réécrit pour les 6 jeux d'origine et 10 jeux ajoutés (`game_priority` : `Do not use NLA` en chaîne, stratégie QoS DSCP 46 par exe, `CpuPriorityClass` et `IoPriority` à 3 dans `PerfOptions`) ;
   7. `WMIC_SUBS` (`wmic` remplacé par `powershell … Get-CimInstance`, absent de Windows 11 24H2) puis `TEMP_QUOTES` (`%temp%` entre guillemets) ;
   8. [[safety.py]] `apply()` : lignes risquées retirées partout ; le build s'arrête si `SAFETY.remaining()` trouve encore une ligne ;
   9. scripts `rbw_mode` remplacés en entier par `RBW.ON` / `RBW.OFF` de [[rbw.py]] (posés après l'audit et `safety.py` pour qu'aucune ligne n'en soit retirée) ;
   10. [[paths.py]] `apply(scripts)`, qui doit renvoyer exactement 6 (nettoyages `set folder=` de `cln_temp` et `mc_optifine`) ;
   11. `EMPTY_BLOCKS` : la boucle vidée de `net_server:s3` (RAG-68, « ) était inattendu ») est retirée avec son commentaire ;
   12. pour chaque réglage : `wmic` retiré de `requires` (et le build échoue s'il reste « wmic » dans un script) ; chaque motif de `WARNINGS` trouvé dans une ligne de commande ajoute son avertissement à `confirm` et passe le réglage en `advanced` (sauf les `rst_*`) ; sans motif, `confirm` disparaît sauf pour `KEEP_CONFIRM` ; `revert: true` posé sur la variante de `REVERT` ; `NAMES` et anglais américain (`UK_US`) ;
   13. `rbw_mode` : `reboot: false` au niveau du réglage, `reboot: true` sur la variante `on` seulement ;
   14. `DESC_FIX`, note de maintenance, texte de `hitreg_suite` (vérifié par `assert`), `ONE_SHOT` → `kind: action`, `MEMORYUSAGE`, `NAME_FIX`, textes de `exp_autologgers` et `rst_queue` ;
   15. tagline du module Expert ; dans Latence et Windows, les réglages v6 rangés dans les sections homonymes (`MOVE`, insérés en tête), sections vides supprimées, `SECTION_NAMES` ;
   16. `count_commands()` : `lines` = nombre de commandes (sans `echo`, `rem`, `::`), par variante et au maximum pour le réglage (« N Windows commands » dans les détails).
8. **Presets** : `PRESETS` (le premier, `mc_pvp`, reçoit `tag: 'MC'` et `match: ['minecraft']`), puis `laptop` et `privacy` de l'ancien programme (ids remplacés traduits par `RENAMED`, plus `PRESET_EXTRA`), puis les 15 presets par jeu (`game_<variante>`, `game: true`, `tag`, `match`). Total 20.
9. **`retire()`** : les 17 réglages de `safety.RETIRED` quittent modules, sections et presets ; la liste `retired` (`id, name, reason, reboot, module`) est rendue.
10. **`twins()`** : réglages au script identique (comparés sans `echo`, commentaires, redirections ni espaces) : même `risk` (le plus haut), même `reboot`, même `confirm`, et `twin` = id du premier. 11 groupes, 24 entrées.
11. **`describe()`** : `desc`, `gain` et `cons` remplacés par ceux de [[descriptions.json]] ; le build échoue si les ids du fichier ne sont pas exactement ceux du catalogue, ou si deux jumeaux ont des textes différents.
12. **Contrôles des presets** : aucun réglage en double, chaque id et chaque variante existe, et aucun réglage du preset Minecraft PvP ne touche à `RBW_TOUCHED` (script du jumeau compris).
13. `legacy` retiré de chaque entrée (l'origine dans les `.bat` donnerait le plan des anciens programmes à qui ouvre l'app).
14. **Écritures** : `catalog.json` (`{'version': 8, 'modules', 'presets', 'retired'}`, `indent=1`, UTF-8 sans échappement) ; `scripts.json` sans les retirés ; `probes.json` = `probes.build(scripts)` puis `paths.apply` ; `undo.json` = `build_undo(before_audit, scripts)` puis `paths.apply`, `indent=0`. Contrôle : les seuls retirés sans annulation sont `amd_thermal`, `sto_cacheprot`, `dbl_edge`.
15. **`restore: true`** (case « point de restauration » cochée d'office) sur chaque réglage `advanced` ou qu'aucune annulation ne remet entièrement (`sans_retour` dans le résultat de [[undo_gen.py]]) ; `catalog.json` réécrit.
16. **`CORRECTIONS.md`** : section v5.2 (déjà écrite par [[build_catalog.py]]) + `V6_NOTES` + `optis_120.NOTES` + `safety.notes(…)`, puis la ligne marqueur et les sections écrites à la main, relues et remises à l'identique ([[corrections_md.py]]).

### `build_undo(before, after)`
Écrit les deux jeux de scripts dans un dossier temporaire, lance [[undo_gen.py]] sur chacun (avec `RAGO_TOOLS=app/tools` et le `catalog.json` qui vient d'être écrit, pour connaître les variantes `revert`), puis [[merge_full.py]] (`full` et `rest` de l'ancien script + ce que le nouveau ajoute). Ne garde que les réglages et variantes encore dans `scripts` (retirés compris), et seulement les champs `full`, `rest` et `rest_avant` (les autres champs d'`undo_gen.py` servent au calcul de `no_return` puis sont jetés). `pow_ultimate` doit avoir `rest_avant`.

## Structure exacte d'une entrée de `catalog.json`
Exemple réel (`in_queue`, textes coupés) : `{"id":"in_queue","name":{"en","fr"},"desc":{…},"risk":"safe","reboot":true,"requires":[],"kind":"tweak","variants":[{"id":"ultra","label":{…},"lines":2},…,{"id":"default","label":{…},"revert":true,"lines":2}],"lines":2,"gain":{…},"cons":{…}}`.

| Champ | Présent | Qui le remplit |
|---|---|---|
| `id` | toujours (231) | `T`/[[meta.py]]/`NEW_TWEAKS` |
| `name` `{en, fr}` | toujours | `T`/[[meta.py]], puis `NAMES`, `NAME_FIX`, `UK_US` |
| `desc`, `gain`, `cons` `{en, fr}` | toujours | [[descriptions.json]] (`describe`) |
| `risk` | toujours : 196 `safe`, 35 `advanced` | source, monté par `WARNINGS` et `twins` |
| `reboot` | toujours | source ; `rbw_mode` forcé |
| `requires` | toujours (liste) | source + `requirements()` de [[build_catalog.py]] (`res:smartctl.exe`, `res:LowLatency.pow`, `res:nvidiaProfileInspector.exe`), `wmic` retiré |
| `kind` | toujours : 214 `tweak`, 17 `action` | source, `ONE_SHOT` |
| `lines` | toujours | `count_commands` |
| `variants` `[{id, label, lines, auto?, revert?, reboot?}]` | 18 réglages, 86 variantes | `T`/[[meta.py]] ; `auto` sur 20 variantes (`ram:N`, `cpu:intel`/`cpu:amd`) ; `revert` sur 5 ; `reboot` seulement sur `rbw_mode` |
| `defaultVariant` | 13 | `T(default=)`/[[meta.py]] |
| `confirm` `{en, fr}` | 4 (`win_bluetooth`, `dbl_onedrive_off`, `exp_smb`, `rst_network`) | `WARNINGS` + `KEEP_CONFIRM` |
| `twin` | 24 | `twins()` |
| `restore` | 38 | étape 15 |
| `native` | 3 (`nv_profile`, `mc_optifine`, `rst_point`) | [[meta.py]] |
| `optifine` `{performance, quality}` | `mc_optifine` | [[build_catalog.py]] (`optifine_preset`) |
| `{ref: id}` | 4 renvois (3 dans Minecraft, 1 dans Restaurer) | [[meta.py]] `REF` |

Module : `{id, icon, name, tagline, sections}` ; section : `{id, name, tweaks, requires?}` (`requires` sur les sections NVIDIA, AMD, Intel) ; preset : `{id, name, desc, tweaks: ["id" | "id:variante"], tag?, match?, game?}` ; retiré : `{id, name, reason, reboot, module}`. Le détail côté interface est dans [[catalog.json]].

## Formats des trois fichiers de scripts
- `scripts.json` : `{id: {variante | "_": texte}}`, sans indentation. 230 réglages (tous sauf `nv_profile`), 298 textes (212 sous la clé `_`). `pri_game` a 16 variantes. Les textes de l'ancien programme et ceux écrits en Python sont en fin de ligne LF (213), ceux des `.bat` v6 en CRLF (70), et 15 tiennent sur une seule ligne : c'est normal, chaque correction garde le séparateur du texte qu'elle modifie (`sep`).
- Réglages natifs : le moteur Rust ne lance **pas** de script pour `mc_optifine`, `nv_profile` et `rst_point` (`runner::is_native`, [[runner.rs]]) ; les scripts de `mc_optifine` et `rst_point` restent dans `scripts.json` (repris de l'ancien programme) sans être exécutés.
- `probes.json` : même forme, mêmes clés que `scripts.json`, 7 534 lignes `echo @@RAGO …` ([[probes.py]]).
- `undo.json` : `{id: {variante: {full, rest?, rest_avant?}}}`. 207 réglages, 270 variantes, `full` partout, `rest` sur 58, `rest_avant` sur `pow_ultimate` et `pow_delete_plans`. 14 des 17 retirés y restent ; 37 réglages n'en ont pas (actions ponctuelles, valeurs déjà celles de Windows, natifs). Lu par la struct `Undo` de [[backup.rs]].

## Règles de sécurité appliquées par le build
- Lignes dangereuses cachées retirées ([[safety.py]], [[audit_fixes.py]]) ; tout ce qui reste de lourd est annoncé (`WARNINGS` → `confirm` + `advanced`).
- Aucun chemin du profil en `%VAR%` dans une suppression, `if defined` devant ([[paths.py]]).
- Le relevé ne contient que des commandes de lecture ([[probes.py]] `lint`).
- Le preset Minecraft PvP ne touche à rien de ce que lit le vérificateur RBW (`RBW_TOUCHED`), voir [[RBW Mod]].
- Les réglages retirés gardent leur annulation, pour que le [[Tableau de bord]] propose de les remettre comme avant ([[Tweaks retirés]]).

## Erreurs et cas limites
- Chaque incohérence arrête le build par un `assert` (ligne d'en-tête fausse, motif de correction qui ne trouve rien, texte manquant dans `descriptions.json`, preset qui vise une variante inexistante, ligne risquée restante…). Les fichiers déjà écrits restent alors dans un état intermédiaire : [[build_catalog.py]] a pu réécrire `catalog.json` (version 1), `scripts.json` et `CORRECTIONS.md`. Corriger puis relancer `npm run catalog` ; ne jamais commiter cet état.
- Les sous-processus écrivent `app/tools/__pycache__/` et `app/tools/undo/__pycache__/` : ignorés par `.gitignore` (`__pycache__/`, `*.pyc`).

## Liens avec le reste
- Appelle : [[build_catalog.py]], [[undo_gen.py]], [[merge_full.py]] (sous-processus) ; importe [[audit_fixes.py]], [[safety.py]], [[rbw.py]], [[paths.py]], [[probes.py]], [[corrections_md.py]], [[optis_120.py]], [[extract_bat.py]].
- Lit : [[Anciens scripts .bat]], [[descriptions.json]]. Écrit : [[catalog.json]], [[Scripts embarqués (JSON)]], [[CORRECTIONS.md (app)]].
- Après lui : `cargo test` ([[catalog.rs]]), [[catalogue_vault.py]], `site/tools/sync_app.py` puis `build.py` ([[Site]]).

## Tests
Pas de test Python : les `assert` du build sont les tests. Les tests Rust de [[catalog.rs]] relisent les JSON produits (`every_script_is_non_empty_and_non_interactive`, `dangerous_lines_are_flagged`, `dangerous_lines_stay_out`, `retired_tweaks_cannot_run`, `kernel_timer_value_stays_out`, `rbw_mode_*`, `deletions_never_use_a_percent_path`, `no_empty_cmd_block`, `free_plan`, `scripts_are_sealed`…). La CI `app-windows` lance `cargo test` mais **ne relance pas** le générateur : rien ne vérifie automatiquement que les JSON commités sont à jour ([[CI GitHub Actions]]).

## À savoir avant de modifier
- **Ne jamais éditer les JSON à la main** ([[Règles de travail]], règle 10) : modifier ce fichier ou un module de `app/tools/`, puis `npm run catalog`.
- **Les descriptions visibles viennent seulement de [[descriptions.json]]** : `describe()` passe en dernier et écrase `desc` partout. Les textes `desc` de `T()`, de [[meta.py]], de `DESC_FIX`, `MEMORYUSAGE`, `MAINTENANCE_NOTE`, `audit_fixes.DESC_FIX_PLUS` et du remplacement de `hitreg_suite` n'apparaissent plus dans l'app (ils servent encore aux `assert`). Les **noms**, eux, viennent bien d'ici.
- **Où placer une correction de script** : avant la copie `before_audit` (`SCRIPT_FIXES`, `DROP_LINES`, `SUB_LINES`), l'ancienne ligne disparaît aussi de l'annulation ; après (audit, `optis_120.py`, `safety.py`, `add_games`), l'annulation `full` couvre l'ancienne et la nouvelle version, ce qui protège les PC qui ont lancé l'ancienne. Pour une ligne déjà distribuée, corriger **après** la copie (règle suivie depuis le 21/10 : « après l'audit, comme add_games, pour que l'annulation couvre l'ancienne version et la nouvelle »).
- Le preset `mc_pvp` (1.2.2, retour joueur du 29/10 : curseur perdu en plein écran, ping instable) n'a plus `win_fullscreen` ni `ping_packets:hitreg` : ne pas les remettre ([[Presets]]).
- Choix de Sofiene cités dans le code : TRIM gardé actif (07/10), date de dernier accès vraiment coupée (07/10), « tout garder » (actions lourdes gardées mais annoncées), presets enrichis (21/10 : « ils ont trop peu de tweaks »), Mode jeu « rends-le le plus performant » (22/10).
- `V6_NOTES` écrit encore « 226 réglages au total (199 réglages distincts depuis 1.1.8) » en dur : chiffres d'octobre, faux aujourd'hui (231 et 218 ; la section [[safety.py]] juste après donne les bons, calculés).
