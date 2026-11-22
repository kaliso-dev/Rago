---
type: code
tags: [code, app, catalogue, python, carte]
fichier: app/tools/
lignes: 6 488 (18 fichiers .py, .mjs et .sh de app/tools/ et app/tools/undo/), plus descriptions.json 2 773
maj: 2026-11-10
---
# Code du générateur de catalogue

Carte de **tout ce qui fabrique les tweaks de l'app** : d'où viennent les réglages, comment `npm run catalog` les transforme en fichiers JSON, comment ces fichiers sont chiffrés dans l'exe, lus par le moteur Rust, affichés par l'interface, puis recopiés dans le vault et sur le site. Une note par fichier détaille le reste. Fonctionnalité : [[Catalogue des tweaks]]. Moteur qui lance les scripts : [[Code de l'app (Rust)]], [[Moteur des tweaks]].

Tout est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`, app 1.3.0). **Vérifié le 10/11** : `npm run catalog` relancé sur une copie de `app/` hors du dépôt redonne les fichiers commités à l'identique : ils sont bien la sortie du code actuel.

## Le chemin d'un tweak, de la source au joueur
1. **Sources écrites à la main** : les anciens programmes batch ([[Anciens scripts .bat]]), la liste des 189 réglages de l'ancien programme ([[meta.py]]), les 51 réglages v6 décrits dans [[build_catalog_v6.py]] (`T(...)`), les 22 réglages écrits directement en Python (2 dans [[build_catalog_v6.py]], 20 dans [[optis_120.py]]), les textes visibles ([[descriptions.json]]), les corrections ([[audit_fixes.py]], [[optis_120.py]], [[safety.py]], [[paths.py]], [[rbw.py]]) et les valeurs de Windows pour l'annulation ([[defaults.py]]).
2. **Génération** : `cd app && npm run catalog` (= `python3 tools/build_catalog_v6.py`, environ 6 s). Calcul : 189 − 14 remplacés par leur version v6 + 51 + 2 + 20 − 17 retirés = **231 entrées** (218 réglages distincts).
3. **Fichiers produits, commités**, jamais édités à la main : voir le tableau sous cette liste.
4. **Plan gratuit** : [[free.json]] est écrit **à la main** et n'est pas lu par le générateur. Il est lu par l'interface, par la compilation et par le moteur.
5. **Compilation** (`cargo build`, CI [[app-windows.yml]]) : [[build.rs]] et [[embed_scripts.rs]] rangent chaque script, relevé et annulation dans un paquet **gratuit** (`scripts.plain.sealed`, plan gratuit et variantes de retour arrière) ou **Premium** (`scripts.sealed`), chiffrés par [[seal.rs]]. Aucune commande n'est en clair dans l'exe. L'exe embarque aussi `catalog.json` et `free.json` tels quels (`include_str!` dans [[catalog.rs]]).
6. **Exécution chez le joueur** : [[catalog.rs]] ouvre le paquet gratuit, ou le Premium avec la clé donnée par le serveur à une licence active ([[license.rs]]) ; [[runner.rs]] lance pour chaque réglage le relevé, garde l'état d'avant ([[backup.rs]], `applied.json`), puis le script dans un `.cmd` ; l'annulation remet la sauvegarde puis lance `rest` (avant elle si `rest_avant`), et sans sauvegarde la variante de retour arrière ou `full`. Trois réglages sont faits en Rust sans script (`mc_optifine` avec [[minecraft.rs]], `nv_profile` avec [[assets.rs]], `rst_point`). Remise à zéro : [[reset.rs]] ; réparations d'anciennes versions : [[repair.rs]].
7. **Interface** : [[catalog.ts]] charge `catalog.json` et calcule tout (variante auto, disponibilité sur ce PC, recherche) ; [[ModulePage.tsx]], [[TweakRow.tsx]] et [[Dashboard.tsx]] affichent ; [[api.ts]] appelle les commandes Rust.
8. **Documentation et site** (à relancer à la main) : [[catalogue_vault.py]] réécrit les notes [[Tweaks Réseau]], [[Tweaks Latence]]… [[Tweaks Presets]], [[Tweaks retirés]] ; [[sync_app.py]] (qui lance [[sync_tweaks.py]], avec les textes du site de [[tweaks-copy.json]]) met à jour [[page.html]] et [[tweaks.html]], puis [[build.py]] fabrique le site.

| Fichier produit | Contenu | Lu par |
|---|---|---|
| `app/src/data/catalog.json` ([[catalog.json]]) | modules, sections, réglages, variantes, presets, retirés ; **aucune commande** | interface, moteur Rust, vault, site |
| `app/src-tauri/scripts/scripts.json` ([[Scripts embarqués (JSON)]]) | le script batch de chaque réglage et variante | compilation |
| `app/src-tauri/scripts/probes.json` | le relevé « à blanc » de ce que chaque script va toucher | compilation |
| `app/src-tauri/scripts/undo.json` | l'annulation (`full`, `rest`, `rest_avant`) | compilation |
| `app/docs/CORRECTIONS.md` ([[CORRECTIONS.md (app)]]) | le journal de toutes les corrections | personnes |

## Les notes, par thème
### Chef d'orchestre
| Note | Lignes | Rôle |
|---|---|---|
| [[build_catalog_v6.py]] | 1 254 | `npm run catalog` : lance tout, fusionne, corrige, vérifie par `assert`, écrit les 4 JSON et `CORRECTIONS.md` |
| [[build_catalog.py]] | 301 | première étape (sous-processus) : les 189 réglages de l'ancien programme tirés du `.bat` v5.2, sorties provisoires |
| [[corrections_md.py]] | 38 | réécrit `CORRECTIONS.md` en gardant les sections écrites à la main sous la ligne marqueur |

### Sources des réglages
| Note | Lignes | Rôle |
|---|---|---|
| [[Anciens scripts .bat]] | 19 477 (4 fichiers) | `app/legacy/` : le `.bat` Premium v5.2 et les 3 `.bat` v6, source du texte des scripts, jamais lancés |
| [[extract_bat.py]] | 232 | lit le `.bat` v5.2, suit les `goto`, rend un script propre par label, 6 familles de corrections automatiques |
| [[meta.py]] | 791 | les 189 réglages de l'ancien programme : ids, noms, variantes, modules et ordre d'affichage |
| [[descriptions.json]] | 2 773 | la **seule** source des textes visibles (`desc`, `gain`, `cons`, en français et en anglais) |

### Corrections et sécurité
| Note | Lignes | Rôle |
|---|---|---|
| [[audit_fixes.py]] | 455 | audit ligne par ligne du 07/10 : lignes réparées, retirées ou annoncées |
| [[optis_120.py]] | 486 | optimisations du 21/10 (20 réglages ajoutés) et **endroit où placer les corrections récentes** |
| [[safety.py]] | 221 | les 17 réglages retirés et les lignes risquées retirées partout ; le build s'arrête s'il en reste une |
| [[paths.py]] | 319 | aucune suppression ne peut viser un mauvais dossier (`!VAR!`, `if defined`) |
| [[rbw.py]] | 318 | les deux scripts de `rbw_mode` ([[RBW Mod]]) |

### Relevé et annulation
| Note | Lignes | Rôle |
|---|---|---|
| [[probes.py]] | 368 | `probes.json` : chaque script réécrit « à blanc » en lignes `@@RAGO`, sans rien modifier |
| [[undo_gen.py]] | 1 023 | calcule l'annulation `full` et `rest` de chaque script |
| [[defaults.py]] | 374 | les valeurs d'un Windows propre (270 règles, 55 services) |
| [[merge_full.py]] | 76 | réunit l'annulation des scripts d'avant l'audit et celle des scripts actuels |

### Journal et documentation
| Note | Lignes | Rôle |
|---|---|---|
| [[CORRECTIONS.md (app)]] | 762 | ce qui a été changé dans les scripts et pourquoi ; le haut est généré, le bas écrit à la main |
| [[catalogue_vault.py]] | 104 | `docs/tools/` : réécrit les notes « Tweaks … » du vault depuis le catalogue |

### Autres outils rangés dans `app/tools/` (hors catalogue)
| Note | Lignes | Rôle |
|---|---|---|
| [[bump-version.mjs]] | 16 | `npm run bump` : change la version dans `package.json` et `Cargo.toml` |
| [[window.mjs]] | 46 | `npm run window` : l'interface en démo navigateur, à la taille de l'app |
| [[sync_icons.sh]] | 21 | copie les icônes et images d'installeur depuis `brand/logo` |
| [[fix_free_bat.py]] | 149 | ancien `.bat` gratuit, gardé pour mémoire, à ne pas lancer |

## Qui appelle qui
- `npm run catalog` → [[build_catalog_v6.py]], qui importe [[extract_bat.py]], [[audit_fixes.py]], [[optis_120.py]], [[safety.py]], [[rbw.py]], [[paths.py]] (qui importe [[probes.py]]), [[probes.py]] et [[corrections_md.py]].
- Il lance en sous-processus : [[build_catalog.py]] (qui importe [[meta.py]], [[extract_bat.py]], [[corrections_md.py]]), puis deux fois [[undo_gen.py]] (qui importe [[probes.py]] et [[defaults.py]]), puis [[merge_full.py]]. La sortie de ces deux derniers est masquée.
- Ordre des corrections dans `postprocess` (il compte, voir [[build_catalog_v6.py]]) : réparations et corrections du 07/10 → **copie `before_audit`** → [[audit_fixes.py]] → [[optis_120.py]] → jeux de `pri_game` → `wmic` remplacé → [[safety.py]] → [[rbw.py]] → [[paths.py]] → avertissements (`confirm`, `advanced`).
- Dernières étapes : presets → retrait des 17 → jumeaux → textes de [[descriptions.json]] → contrôles des presets → écritures → `restore: true` → `CORRECTIONS.md`.

## Recettes
Toutes se font **sur une branche partie de `staging`**, jamais sur la prod ([[Branches et environnements]]). Rien ne part sur GitHub ni dans l'app sans demande de Sofiene ([[Règles de travail]]).

### Ajouter un tweak
1. **Le réglage et son script** : une entrée `(module, section, tweak(id, en, fr, desc_en, desc_fr, risk, reboot), body(ligne, ligne…))` à la fin de `NEW_TWEAKS` dans [[optis_120.py]] (section nouvelle : `NEW_SECTIONS`). Les 22 réglages ajoutés ainsi n'ont qu'une variante (`_`). Un id **neuf**, jamais celui d'un réglage retiré. Pas de `wmic`. Une boucle `for /f` ne doit lancer qu'une commande de lecture ([[probes.py]]). Une commande lourde (désinstallation, suppression…) doit être annoncée : vérifier qu'un motif de `WARNINGS` la reconnaît, sinon en ajouter un.
2. **Ses textes** : une entrée `{fr: {desc, gain, cons}, en: {…}}` à la fin de [[descriptions.json]], sans promettre de gain non vérifié ([[Voix et ton]]). Sans elle, le build s'arrête.
3. **Son annulation** : chaque valeur de registre écrite doit avoir sa règle dans [[defaults.py]] (vraie valeur d'un Windows propre, ou `B("raison")` en cas de doute), chaque commande PowerShell réversible son traitement dans `h_powershell` de [[undo_gen.py]]. Vérification, depuis `app/`, avec une sortie **hors du dépôt** : `python3 -B tools/undo/undo_gen.py src-tauri/scripts/scripts.json src/data/catalog.json /tmp/undo-check.json`, puis lire l'entrée du réglage : rien ne doit figurer dans `sauvegarde_seulement` avec « valeur non répertoriée », et le journal affiché ne doit pas le citer.
4. **En option** : l'ajouter à un preset (`PRESETS` ou `PRESET_EXTRA` de [[build_catalog_v6.py]], voir [[Presets]] ; jamais rien de ce que lit le vérificateur RBW dans Minecraft PvP) ou au plan gratuit ([[free.json]]).
5. **Générer et vérifier** (section suivante), puis le texte du site dans [[tweaks-copy.json]] (sinon [[sync_tweaks.py]] avertit).

### Corriger le script d'un tweak
- **Déjà distribué** (cas normal) : `FIXES` (texte exact remplacé), `DROP` (lignes retirées par motif) ou `SUB` (remplacement par expression régulière) dans [[optis_120.py]]. Ces corrections passent **après** la copie `before_audit` : l'annulation couvre l'ancienne et la nouvelle version, ce qui protège les PC qui ont lancé l'ancienne.
- Une ligne dangereuse à retirer de partout : un motif dans [[safety.py]] (`DROP_EVERYWHERE` ou `DROP_IN`), avec sa raison.
- **Ne jamais** corriger dans les `.bat` de `app/legacy/` (numéros de ligne vérifiés par `assert`) ni dans les JSON.

### Changer un texte, un nom ou un preset
- Texte (description, gain, inconvénient) : [[descriptions.json]] seulement ; deux jumeaux (`twin`) doivent garder des textes identiques.
- Nom : `T(...)` de [[build_catalog_v6.py]], [[meta.py]] ou `tweak(...)` de [[optis_120.py]] ; regarder d'abord si `NAMES` ou `NAME_FIX` de [[build_catalog_v6.py]] ne le remplacent pas.
- Preset : `PRESETS`, `PRESET_EXTRA`, `RENAMED` de [[build_catalog_v6.py]] ([[Presets]]).

### Rendre un tweak gratuit ou Premium
Modifier `tweaks` dans [[free.json]] (pas besoin de `npm run catalog` : le tri en paquets se fait à la compilation). Puis `cargo test` (test `free_plan` de [[catalog.rs]] : 30 places, modules permis), [[catalogue_vault.py]] et [[sync_app.py]] (le site compte les gratuits).

### Retirer un tweak
1. L'ajouter à `RETIRED` de [[safety.py]] avec sa raison en anglais et en français (affichée aux joueurs qui l'ont encore appliqué). Son code source reste en place : `retire()` l'enlève des modules et des presets.
2. Retirer son entrée de [[descriptions.json]] (sinon le build s'arrête) et de [[free.json]] s'il y est ; retirer son texte de [[tweaks-copy.json]].
3. S'il n'a pas d'annulation, ajouter son id à l'`assert` de [[build_catalog_v6.py]] qui liste les retirés sans annulation (`amd_thermal`, `sto_cacheprot`, `dbl_edge` aujourd'hui).
4. Ne jamais réutiliser l'id ensuite : [[backup.rs]] et [[Tweaks retirés]] reconnaissent les PC qui l'ont appliqué par cet id.

## Vérifications après chaque changement
1. `cd app && npm run catalog` : doit finir sans `assert` et afficher `… réglages (… distincts), … scripts, … retirés` (aujourd'hui `231 réglages (218 distincts), 230 scripts, 17 retirés`). Si un `assert` l'arrête, les fichiers sont dans un état intermédiaire : corriger et relancer, ne rien commiter.
2. `git diff --stat` : seuls changent `catalog.json`, `scripts.json`, `probes.json`, `undo.json` et, si les textes de corrections ont changé, `CORRECTIONS.md`. Relire `git diff app/src-tauri/scripts/undo.json` pour le réglage touché : une règle trop large de [[defaults.py]] change l'annulation de beaucoup d'autres.
3. Depuis `app/` : `cargo test --manifest-path src-tauri/Cargo.toml` (tests du catalogue dans [[catalog.rs]] et [[lib.rs]] : scripts non vides et sans interaction, lignes dangereuses, retirés, plan gratuit, paquets chiffrés…). Complets seulement sous Windows ([[Développer et tester]]).
4. Depuis la racine : `python3 docs/tools/catalogue_vault.py` (Python 3.12 ou plus), puis `python3 site/tools/sync_app.py` et `python3 site/tools/build.py`.
5. Mettre à jour le vault ([[Mettre à jour le vault]]) : [[Catalogue des tweaks]], la note du fichier modifié et, pour une nouvelle version, une section à la fin de [[CORRECTIONS.md (app)]].

**Aucune CI ne relance le générateur** : [[app-windows.yml]] compile et lance `cargo test` sur les JSON commités, sans vérifier qu'ils correspondent au code des générateurs ([[CI GitHub Actions]]). L'étape 1 ne doit donc jamais être sautée.

## À savoir avant de modifier
- Les sources sont dans un **dépôt public** au 10/11 : les scripts Premium y sont lisibles en clair, seuls ceux de l'exe sont chiffrés ([[Catalogue des tweaks]]).
- Les modules Python s'importent entre eux par le dossier courant : les lancer avec `python3 -B` hors du build évite de créer des `__pycache__` (ignorés par git de toute façon).
- Plusieurs textes du dépôt sont en retard sur ce code (OBSERVÉ le 10/11) : le `README.md` de la racine annonce « 198 réglages, 10 modules, 5 presets » et « 11 réglages ouverts » (au 10/11 : 218 réglages distincts, 20 presets, 73 entrées gratuites) ; `V6_NOTES` écrit « 226/199 » ; le commentaire d'en-tête de [[catalog.rs]] attribue les scripts à `tools/build_catalog.py` (c'est [[build_catalog_v6.py]]) ; [[undo_gen.py]] cite encore `app/rago-hub/tools` et `audit/outils-annulation`. Détail dans les notes de chaque fichier.
