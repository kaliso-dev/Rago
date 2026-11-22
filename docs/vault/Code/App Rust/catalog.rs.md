---
type: code
tags: [code, app, rust, moteur, catalogue]
fichier: app/src-tauri/src/catalog.rs
lignes: 1405
maj: 2026-11-10
---
# catalog.rs

Accès aux scripts des réglages embarqués **chiffrés** dans l'exe, et règles de l'offre (plan gratuit, places, retours arrière). C'est aussi le fichier qui porte le plus de **tests de sécurité** des scripts (audits du 05/10 au 13/10). Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Moteur des tweaks]], [[Catalogue des tweaks]], [[Licence dans l'app]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (1.1.5), 12 commits. Environ 300 lignes de code et 1 100 lignes de tests.

## Rôle et place dans l'ensemble
- Les scripts viennent de `app/src-tauri/scripts/*.json` ([[Scripts embarqués (JSON)]]), préparés et chiffrés à la compilation par [[embed_scripts.rs]] (inclus dans [[build.rs]]), qui produit deux paquets dans `OUT_DIR` : `scripts.plain.sealed` et `scripts.sealed`. Le chiffrement est celui de [[seal.rs]].
- Utilisé par [[runner.rs]] (scripts, relevés, annulations, jumeaux, noms), [[lib.rs]] (règles de l'offre dans `start_tweaks`, `keep_undo`), [[reset.rs]] (`is_free`, `was_free`, `is_switch`), [[netopt.rs]] (`plain_engine`, `Bundle::engine`) et [[backup.rs]] (le type `Undo`).
- Lit aussi deux fichiers de l'interface inclus à la compilation : `app/src/data/catalog.json` (modules, réglages, variantes) et `app/src/data/free.json` (plan gratuit).

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `struct Bundle {scripts, probes, undo, engine}` | un paquet déchiffré. `scripts` et `probes` : `id → variante → texte` ; `undo` : `id → variante → Undo` ; `engine` : morceaux du moteur PowerShell du [[Packet Optimizer]] |
| `Bundle::engine(name)` | un morceau du moteur (`netopt`, `netopt.main` dans le paquet gratuit ; `netopt.apply` dans le Premium) |
| `plain_engine(name)` | `PLAIN.engine(name)` : ce qui tourne sans licence (remise, valeurs de Windows, tests) |
| `premium(key: &[u8;32]) -> Option<Arc<Bundle>>` | ouvre `scripts.sealed` avec la clé reçue du serveur ; `None` si clé absente ou fausse (autre version). Résultat gardé dans `OPENED` avec sa clé : les appels suivants avec la même clé ne redéchiffrent pas |
| `undo_of(id, variant, premium)` | annulation (`Undo {full, rest, rest_avant}`) : d'abord le paquet gratuit, sinon le Premium |
| `over_free_slots(applied, items) -> Option<usize>` | dépassement de la limite du plan gratuit (voir plus bas) |
| `is_switch(id)` | réglage de type `"tweak"` (interrupteur qu'on annule), pas `"action"` ni un script interne |
| `is_free(id)` | dans `free.json > tweaks` |
| `was_free(id)` | dans `free.json > formerly` (aujourd'hui seulement `in_mouse`, gratuit avant 1.1.14) |
| `is_revert(id, variant)` | `id:variante` est marqué `revert: true` dans le catalogue (« Default », RBW « On »…) |
| `revert_variant(id)` | la variante de retour arrière d'un réglage |
| `revert_runs_script(id)` | vrai seulement pour `rbw_mode` (voir [[runner.rs]]) |
| `is_plain(id, variant)` | script présent dans le paquet gratuit (ou interne) : tourne sans clé |
| `twin_of(id)` | premier réglage du groupe au script identique (champ `twin` du catalogue) |
| `name_of(id)` | nom anglais (réglages retirés compris), sinon l'id ; sert aux lignes du journal |
| `allowed(id, variant, premium)` | `premium` OU `id == "__wmic"` OU réglage gratuit OU (réglage de `free.json > reverts` ET variante de retour) |
| `script(id, variant, premium)` | script interne, sinon paquet gratuit, sinon paquet Premium |
| `probe(id, variant, premium)` | relevé : paquet gratuit, sinon Premium |
| `pub use backup::Undo` | type de l'annulation |

`pick(entry, variant)` : prend la variante demandée, sinon l'entrée `_` (réglage sans variante).

## Fonctionnement détaillé

### Les deux paquets
- `PLAIN` (`LazyLock`) : `scripts.plain.sealed` ouvert au premier usage avec `seal::offline_key(CARGO_PKG_VERSION)`, une clé reconstruite dans le binaire. Il contient les scripts du plan gratuit et toutes les variantes de retour arrière, les relevés et annulations des réglages gratuits, et la partie libre du moteur du Packet Optimizer. Il doit tourner sans licence. Un échec d'ouverture fait **paniquer** l'app (`expect("scripts.plain.sealed illisible")`) : c'est un exe cassé.
- `SEALED` : `scripts.sealed`, chiffré avec la clé de la version, que seul le serveur de licences connaît et donne à une licence active (champ `scripts_key` de [[license.rs]], route `/licenses/activate` et `/licenses/refresh`). Voir [[Clés et secrets]].
- Aucun script n'est en clair dans l'exe. En tests seulement, `SCRIPTS` lit `scripts/scripts.json` en clair.

### Le plan gratuit (`free.json`)
- `FREE` : 73 réglages ; `FREE_REVERTS` : 2 (`rbw_mode` et `game_mode`, seule leur variante de retour est ouverte) ; `FORMERLY_FREE` : `in_mouse` ; `FREE_SLOTS` : **30** depuis la 1.3.0 (0 voudrait dire « sans limite »). Chiffres de `staging` au 10/11 ; le détail est dans [[Offres et prix]] et [[Catalogue des tweaks]].
- `over_free_slots(applied, items)` : part des réglages appliqués qui sont des interrupteurs ; pour chaque élément du lot qui est un interrupteur, une annulation ou une variante de retour l'enlève, sinon l'ajoute. Renvoie `Some(30)` si le total dépasse 30 **et** augmente. Les actions ne prennent pas de place, et un joueur déjà au-dessus (réglages appliqués pendant Premium) peut toujours annuler.

### Script interne `__wmic`
`builtin("__wmic")` = `DISM /Online /Add-Capability /CapabilityName:WMIC~~~~0.0.1.0 /NoRestart`. WMIC a été retiré de Windows 11 24H2 et une partie des anciens scripts s'en sert. Toujours permis, jamais noté dans l'historique (id en `__`).

### Index lus dans `catalog.json`
`REVERTS` (liste `id:variante`), `KINDS` (`id → tweak|action`), `TWINS` (`id → twin`), `NAMES_EN` (modules + `retired`). Tous en `LazyLock`, une `expect` si le JSON est invalide.

## Tests (la partie la plus longue du fichier)
| Test | Ce qu'il garantit |
|---|---|
| `scripts_are_sealed` | les deux paquets ne contiennent que du chiffré (plus de 150 scripts Premium) et chacun ne s'ouvre qu'avec sa clé |
| `every_script_is_non_empty_and_non_interactive` | plus de 200 id ; aucun script vide, aucun `set /p input` (saisie), aucun chemin de l'auteur de l'ancien `.bat`, aucun « Disabling »/« Enabling » hors `echo` (reste d'un rechercher-remplacer raté) |
| `dangerous_lines_are_flagged` | audit du 05/10 appliqué au catalogue de Sofiene le 06/10 : WebView2 jamais supprimé (l'app en a besoin) ; Spectre/Meltdown et BAM marqués Advanced avec avertissement |
| `dangerous_lines_stay_out` | les lignes dangereuses de l'ancien programme ne reviennent pas |
| `v6_scripts_are_repaired` | défauts de la vérification du 07/10 corrigés |
| `retired_tweaks_cannot_run` | les 17 réglages retirés (`tools/safety.py`, 08/10) n'ont ni script ni relevé, mais gardent leur annulation ([[Tweaks retirés]]) |
| `kernel_timer_value_stays_out` | RAG-67 (13/10) : `CoalescingTimerInterval` = 0 sous `HKLM\SYSTEM\CurrentControlSet\Control` (écran bleu 0x7E) n'est plus écrit nulle part ; chaque clé nettoyée est réparée au lancement ([[repair.rs]]) |
| `rbw_mode_on_does_what_the_validated_fix_does` | RBW Mod « Activé » fait ce que fait le script validé par Sofiene (`rbw/Rago-RBW-Fix.ps1`), dans le même ordre ; liste des services lus par le vérificateur RBW (relevé du 13/10) |
| `rbw_mode_off_puts_windows_values_and_stops_nothing` | « Désactivé » remet les valeurs de Windows sans rien arrêter |
| `rbw_mode_puts_back_what_other_tweaks_turn_off` | tout ce qu'un autre réglage coupe parmi ce que lit le vérificateur, « Activé » le remet (sinon corriger `tools/rbw.py`) |
| `deletion_checker_sees_bad_paths`, `deletions_never_use_a_percent_path` | revue du 13/10 (P1/P2) : aucune suppression (`del`, `rd`, `forfiles`, `takeown`, `icacls`…) sur un chemin `%VAR%`, sur un `!VAR!` sans `if defined`, ni sur une variable de boucle avec le développement retardé ; mêmes règles dans `tools/paths.py` |
| `game_mode_pauses_background_work_and_puts_it_back` | Sofiene, 22/10 (« rends-le le plus performant ») : indexation et télémétrie en pause, animations, et tout relancé à l'annulation ([[Mode jeu]]) |
| `free_plan` | règles du plan gratuit : 30 places (Sofiene, 04/11) ; `win_notifications`, `win_popups`, `win_ai` gratuits (16/10) ; rien de Latence, Réseau, Hitreg ni Minecraft en gratuit (15/10), sauf stockage et pilotes en 1.3.0 (modules permis : windows, gpu, latency, restore) |
| `no_empty_cmd_block` | aucun bloc `( )` vide : cmd s'arrête sur « ) était inattendu » (RAG-68) |
| `lookup` | `pick`, variantes, `_` |
| `rago_power_plan_is_corrected_on_import` | plan « Rago Low Latency » (`LowLatency.pow`, 10/10) : le script corrige repos processeur, mot de passe au réveil, bouton d'alimentation, puis renomme et active le plan (GUID `7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4`) |
| `rago_power_plan_imports_on_windows` | Windows seulement (CI administrateur) : le vrai fichier passe dans `powercfg` sous un GUID de test, supprimé à la fin |

Les tests ouvrent le paquet Premium d'un build de développement avec `seal::version_key(TEST_SECRET, RAGO_APP_VERSION ou CARGO_PKG_VERSION)`. Lancer : `cargo test --manifest-path src-tauri/Cargo.toml` ([[Développer et tester]]).

## À savoir avant de modifier
- On ne modifie **jamais** un script ici : on modifie le générateur Python (`npm run catalog`, `tools/build_catalog_v6.py` et `tools/*.py`) qui réécrit `scripts/*.json`, puis on recompile. Le commentaire en tête du fichier cite encore `tools/build_catalog.py` (l'ancien générateur, toujours présent) : c'est `build_catalog_v6.py` que lance `npm run catalog`.
- Ajouter un réglage gratuit : `app/src/data/free.json` (partagé avec l'interface), puis vérifier `free_plan`. Les notes `Tweaks/` du vault se régénèrent avec `python3 docs/tools/catalogue_vault.py`.
- Un nouveau réglage qui coupe un service lu par le vérificateur RBW fait échouer `rbw_mode_puts_back_what_other_tweaks_turn_off` : c'est voulu.
- Le paquet Premium dépend de la version (`CARGO_PKG_VERSION`) : une nouvelle version demande une nouvelle clé côté serveur ([[Publier une version]]).
