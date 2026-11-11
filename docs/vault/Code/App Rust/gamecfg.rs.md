---
type: code
tags: [code, app, rust, jeux, graphismes]
fichier: app/src-tauri/src/gamecfg.rs
lignes: 1071
maj: 2026-11-11
---
# gamecfg.rs

**Graphismes des jeux** : écrit Performance, Équilibré ou Qualité dans les fichiers de réglages des jeux, comme le préréglage OptiFine ([[minecraft.rs]]) pour Minecraft. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Graphismes des jeux]]. Interface : [[GameGraphics.tsx]], textes [[graphics.ts]].

Statut : branche `claude/project-thread-5ln7f8` (11/11), pas encore poussée (accord de Sofiene demandé). Jamais testé sur Windows. Ticket RAG-92.

## Rôle et place dans l'ensemble
- Commandes de [[lib.rs]] : `graphics_status(game)`, `graphics_apply(game, level)`, `graphics_restore(game)`, toutes dans un fil à part (`spawn_blocking`). Chacune trouve les fichiers (`files`) et regarde si le jeu tourne (`running`, à partir de `games::process_paths()` de [[games.rs]]).
- Dossiers des comptes Windows : `games::local_dirs()` ([[games.rs]], rendue `pub(crate)` pour ce module) ; Steam : `HKCU\Software\Valve\Steam\SteamPath` puis `HKLM\SOFTWARE\WOW6432Node\Valve\Steam\InstallPath` ([[reg.rs]]).

## Ce que le fichier expose
- `Level` : `Performance`, `Balanced`, `Quality` (`id()` : `performance`, `balanced`, `quality` ; `parse`).
- `Format` : `Ini` (Unreal Engine, `cle=valeur` sous des `[sections]`) ou `Kv` (Source 2 et Apex, `"cle"  "valeur"` dans un bloc).
- `Def` (un jeu) : `id`, emplacements (`Place` : base `Local` = AppData\Local, `Home` = dossier du compte, `Steam` ; sous-dossiers avec `*` = chaque sous-dossier ; nom du fichier ; format), exes du jeu (en minuscules, `*` final = préfixe), valeurs des trois niveaux (`Set { key, val, add }`).
- `GAMES` : `valorant`, `fortnite`, `cs2`, `apex`, `rivals`, `finals` ; `def(id)`.
- `Roots::detect()` (Windows ; vide ailleurs), `files(def, roots)`, `running(def, exes)`.
- `Status { files, locked, level, saved, running }`, `status(def, files, running)`.
- `Outcome { files, changed, locked }`, `apply(def, level, files, running)`, `restore(files, running)`.

## Valeurs écrites
| Jeu | Performance | Équilibré | Qualité |
|---|---|---|---|
| Valorant (`sg.*` : ViewDistance, AntiAliasing, Shadow, PostProcess, Texture, Effects, Foliage, Shading) | tout à 0, `bUseVSync=False` | ViewDistance 1, AntiAliasing 2, Texture 1, Shading 1, le reste 0, `bUseVSync=False` | tout à 3 |
| Fortnite | `PreferredRHI=dx11`, `PreferredFeatureLevel=es31` (ajoutés à `[D3DRHIPreference]` s'ils manquent), `MeshQuality=0`, 10 `sg.*` à 0, `DesiredGlobalIlluminationQuality=0`, `DesiredReflectionQuality=0`, `bUseNanite=False`, `bRayTracing=False`, `FortAntiAliasingMethod=Disabled`, `bMotionBlur=False`, `bShowGrass=False`, `bUseVSync=False` | même mode Performance, `MeshQuality=1`, `sg.ViewDistanceQuality=3`, `sg.TextureQuality=1`, autres `sg.*` à 0, mêmes options coupées (anti-crénelage non touché) | `dx12` + `sm6`, 10 `sg.*` à 3, `Desired*Quality=3`, `bUseNanite=True`, `bShowGrass=True` |
| CS2 (`setting.*`) | `Autoconfig=2`, shaders 0, filtrage 0, MSAA 0, CMAA 0, ombres 0, ombres dynamiques 0, textures 0, particules 0, occlusion 0, HDR 3, FSR 0, V-Sync 0 | shaders 0, filtrage 3 (4x), MSAA 4, ombres 2, ombres dynamiques 1, textures 1, particules 0, occlusion 0, HDR 3, FSR 0, V-Sync 0 | shaders 1, filtrage 5 (16x), MSAA 8, ombres 2, dynamiques 1, textures 2, particules 2, occlusion 2, HDR -1, FSR 0 |
| Apex (`setting.*`) | anti-crénelage 0, `stream_memory` 160000, `mat_forceaniso` 1, `mat_mip_linear` 0, `ssao_enabled`/`ssao_quality` 0, `csm_coverage` 1, `csm_cascade_res` 512, `volumetric_lighting` 0, `shadow_maxdynamic` 0, `r_lod_switch_scale` 0.6, `particle_cpu_level` 0, `r_decals` 0, `r_createmodeldecals` 0, `cl_ragdoll_maxcount` 0, `mat_vsync_mode` 0, `dvs_enable` 0 | TSAA (12), 600000, aniso 4, mip 1, occlusion 0, ombres basses, `r_lod_switch_scale` 0.8, particules 1, corps 4, V-Sync 0, `dvs_enable` 0 | TSAA, 1000000, aniso 16, occlusion 1/2, `csm_coverage` 2, `csm_cascade_res` 1024, volumétrique 1, `shadow_maxdynamic` 4, `r_lod_switch_scale` 1.0, particules 2, impacts 256/1, corps 8 |
| Marvel Rivals, The Finals (10 `sg.*` d'Unreal Engine) | tout à 0, `bUseVSync=False` | ViewDistance 2, AntiAliasing 2, Texture 2, les autres à 1, `bUseVSync=False` | tout à 3 |

Exes surveillés : `valorant-win64-shipping.exe`, `valorant.exe` ; `fortniteclient-win64-shipping*`, `fortnitelauncher.exe` ; `cs2.exe` ; `r5apex.exe`, `r5apex_dx12.exe` ; `marvel-win64-shipping.exe`, `marvelrivals_launcher.exe` ; `discovery.exe`.

## Fonctionnement détaillé
1. **Trouver** (`files`) : pour chaque emplacement, chaque base (tous les comptes Windows, ou chaque installation de Steam), les `*` sont développés en sous-dossiers ; seuls les fichiers qui existent sont gardés, sans doublon (comparaison en minuscules).
2. **Lire** : UTF-8, UTF-8 avec BOM ou UTF-16 LE avec BOM (Unreal écrit parfois en UTF-16) ; réécrit dans le même encodage. Autre encodage : fichier ignoré.
3. **Modifier** (`edit`) : ligne par ligne, seules les valeurs des clés connues changent (comparaison des clés sans tenir compte de la casse) ; fins de ligne, ordre, lignes vides et autres clés restent identiques. Une clé absente n'est **jamais ajoutée**, sauf celles marquées `add` (Fortnite : `PreferredRHI`, `PreferredFeatureLevel` sous `[D3DRHIPreference]`, section créée en fin de fichier si besoin). Format `Kv` : guillemets et tabulations gardés.
4. **Appliquer** (`apply`) : jeu en cours → `running` ; aucun fichier → `not_found` ; fichier en lecture seule → laissé, compté dans `locked` ; aucune clé connue dans aucun fichier → `unknown_format` (ou `locked` si tout est verrouillé). Avant la première écriture d'un fichier : copie exacte des octets dans `<fichier>.rago-original` (jamais remplacée ensuite). Fichier écrit seulement si une valeur change.
5. **Niveau actuel** (`status`) : relit les fichiers ; un niveau correspond si toutes ses clés présentes ont ses valeurs (au moins une clé trouvée), dans l'ordre Performance, Équilibré, Qualité.
6. **Remettre** (`restore`) : pour chaque fichier qui a une copie (et pas en lecture seule), recopie la copie puis la supprime. Aucune copie → `no_backup`.

## Données touchées
Les fichiers de réglages des six jeux ci-dessus et leurs copies `.rago-original` dans les mêmes dossiers. Rien dans le dossier de données de Rago, rien dans le registre.

## Erreurs et cas limites
- Codes d'erreur lus par [[GameGraphics.tsx]] : `running`, `not_found`, `locked`, `unknown_format`, `no_backup`, `unknown_game`, `unknown_level` ; sinon le message du système avec le chemin.
- Plusieurs comptes du jeu sur le PC : le niveau est écrit dans tous.
- Écriture directe du fichier (pas de fichier temporaire), comme [[minecraft.rs]] : la copie d'origine permet de revenir en arrière.

## Liens avec le reste
- [[lib.rs]] (commandes), [[games.rs]] (comptes Windows, processus), [[reg.rs]] (Steam).
- Fonctionnalité : [[Graphismes des jeux]], page [[Bibliothèque de jeux]].

## Tests (12, tous verts le 11/11 sous Linux ; `cargo check` pour Windows propre)
- `ini_edit_changes_only_known_keys_and_keeps_the_rest`, `kv_edit_keeps_tabs_and_quotes`, `missing_keys_are_never_added_except_render_mode`, `utf16_and_bom_are_written_back_as_they_were`.
- `apply_keeps_the_original_once_and_restore_puts_it_back`, `refuses_while_running_or_when_nothing_is_found`, `read_only_files_are_left_alone`, `levels_are_told_apart`.
- `finds_the_files_of_every_account`, `expand_follows_stars`, `running_matches_exe_names_and_prefixes`.
- `no_display_keys_and_every_level_is_filled` : aucune clé de résolution ou d'affichage (contrat avec le fil des résolutions des pros, `display.rs`), aucune clé en double, chaque niveau rempli.

## À savoir avant de modifier
- Ne jamais ajouter une clé que le jeu n'écrit pas lui-même (sauf section standard du moteur, marquée `add`).
- Ne jamais toucher aux clés de résolution et d'affichage (liste `DISPLAY_KEYS` du test).
- La liste des jeux doit rester la même que `BY_PRESET` de [[graphics.ts]].
