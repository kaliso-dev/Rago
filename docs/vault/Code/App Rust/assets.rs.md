---
type: code
tags: [code, app, rust, moteur]
fichier: app/src-tauri/src/assets.rs
lignes: 139
maj: 2026-11-10
---
# assets.rs

Les deux fichiers Premium livrés avec l'app, le plan d'alimentation `LowLatency.pow` (« Rago Low Latency ») et le profil NVIDIA `extremelatencylow.nip`, **chiffrés dans l'exe** et écrits en clair seulement le temps du script qui les importe. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Moteur des tweaks]], [[Tweaks Latence]] (plan d'alimentation), [[Tweaks Carte graphique]] (profil NVIDIA).

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 16/10 ([[Version 1.1.14]]) : avant, les deux fichiers étaient installés en clair dans `resources\`.

## Rôle et place dans l'ensemble
- [[build.rs]] (`embed_assets`) lit `app/src-tauri/assets/LowLatency.pow` et `assets/extremelatencylow.nip`, les chiffre avec `seal::offline_key(version)` et écrit `OUT_DIR/<nom>.sealed`, inclus ici par `include_bytes!`. Les fichiers sources sont décrits dans [[Configuration Tauri]].
- [[runner.rs]] appelle `stage` avant chaque script (`run_batch`) et pour `nv_profile`.
- [[lib.rs]] vide `fallback_root()` au démarrage ; [[reset.rs]] le vide aussi à la désinstallation (`clear_run`).
- [[system.rs]] liste les deux noms dans `resources` de la sonde.

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `NAMES = ["LowLatency.pow", "extremelatencylow.nip"]` | les deux fichiers |
| `bytes(name) -> Option<Vec<u8>>` | contenu en clair (`seal::open` avec `offline_key(CARGO_PKG_VERSION)`) |
| `fallback_root() -> Option<PathBuf>` | `%SystemRoot%\Temp\<identifiant de l'app>` (un dossier par identifiant : l'exe de test et le vrai ne se vident pas l'un l'autre) |
| `struct Staged` | dossier temporaire ; `dir()` ; **son `Drop` supprime le dossier** (fin du script, même ratée) |
| `stage(run_dir, script) -> Result<(Staged, Cow<str>)>` | sort les fichiers que le script ouvre et réécrit leurs chemins |

## Fonctionnement détaillé
1. `stage` cherche dans le script les chaînes exactes `%RAGO_RES%\LowLatency.pow` et `%RAGO_RES%\extremelatencylow.nip` (forme des `.bat` d'origine). S'il n'y en a aucune : rien n'est écrit, le script reste tel quel.
2. Sinon, il crée `root(run_dir)\res-<PID>-<ms>\`, y écrit chaque fichier utilisé (en clair), et remplace dans le script `%RAGO_RES%\<nom>` par `%RAGO_SEC%\<nom>`.
3. [[runner.rs]] pose la variable d'environnement `RAGO_SEC` = ce dossier pour le `cmd.exe` du script.
4. À la fin, le `Staged` est détruit et le dossier supprimé.

`root(run_dir)` : `run\` en temps normal ; mais si le chemin contient un `!` (nom de compte Windows comme « Gamer! »), `cmd` le ferait disparaître en développant `%RAGO_SEC%` avec `EnableDelayedExpansion` (préambule de [[runner.rs]]) : le script ne trouverait pas le fichier et le réglage passerait pour réussi. Dans ce cas, le dossier de repli `%SystemRoot%\Temp\<identifiant>` (sans nom de compte).

Messages d'erreur : « Couldn't prepare the app files: … », « <nom> is missing from the app », « Couldn't prepare <nom>: … ».

## Données touchées
`%APPDATA%\gg.rago.optimizer\run\res-<pid>-<ms>\` ou `%SystemRoot%\Temp\gg.rago.optimizer\res-…` (staging : `…\gg.rago.optimizer.staging\`), effacés après usage.

## Tests
`assets_are_sealed_and_open_back` (le chiffré ne contient pas 32 octets du clair ; les fichiers ne sont plus dans `resources\`), `stage_writes_only_what_the_script_opens_and_cleans_up`, `staging_folder_avoids_an_exclamation_mark`, `every_script_opens_them_by_the_staged_path` (chaque script les ouvre exactement par `%RAGO_RES%\<nom>` ; au moins 3 usages : `pow_plan`, `gpu_nvidia`, `nv_general`).

## À savoir avant de modifier
- Un script qui écrirait le chemin autrement (minuscules, guillemets au milieu, `%RAGO_RES%/…`) ne serait pas vu par `stage` : le test `every_script_opens_them_by_the_staged_path` l'interdit.
- `nvidiaProfileInspector.exe` n'est **pas** chiffré : il reste dans `resources\` ([[Configuration Tauri]]).
- L'installateur supprime les anciennes copies en clair laissées par les versions d'avant 1.1.14 ([[Installateur NSIS]]).
