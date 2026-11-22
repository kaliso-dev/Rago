---
type: code
tags: [code, app, json, donnees]
fichier: app/src/data/free.json
lignes: 86
maj: 2026-11-10
---
# free.json

La **liste du plan gratuit** : quels réglages sont ouverts sans licence, combien peuvent être allumés en même temps, et quels retours arrière restent ouverts. Fichier écrit **à la main** (aucun générateur), lu à la fois par l'interface et par le moteur Rust. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Catalogue des tweaks]], [[Abonnement dans l'app]], [[Offres et prix]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`). Dernier changement : commit `e146ca2` du 04/11/2026 (« Plan gratuit élargi à 73 réglages (30 actifs à la fois) »).

## Format
Un objet JSON à cinq clés :

| Clé | Type | Valeur en 1.3.0 | Sens |
|---|---|---|---|
| `_comment` | texte | — | explication en français, avec la règle de Sofiene du 04/11/2026 citée mot pour mot |
| `tweaks` | liste d'ids | **73** ids | réglages et actions ouverts sans licence |
| `reverts` | liste d'ids | `rbw_mode`, `game_mode` | réglages Premium dont **seule la variante de retour arrière** est ouverte (RBW Mod « Activé », mode jeu « Désactivé ») |
| `formerly` | liste d'ids | `in_mouse` | réglages gratuits d'une version d'avant (la souris avant la 1.1.14), encore appliqués chez des joueurs du plan gratuit : sans licence, ils ne déclenchent pas le message « Premium a pris fin » ([[reset.rs]]) |
| `slots` | nombre | **30** | nombre de réglages gratuits de type `tweak` (pas les actions) allumés **en même temps** sans licence |

La règle citée dans `_comment` (Sofiene, 04/11/2026) : « 50 - 100 tweaks gratuit, laisser les meilleurs et les plus demandés en premium surtout network et hitreg, mais seulement 30 slots de tweaks disponibles gratuitement à activer simultanément ».

## Contenu par module (calculé avec `catalog.json`)
| Module du catalogue | Ids gratuits | dont interrupteurs (`tweak`) | Détail |
|---|---|---|---|
| Windows (`windows`) | 57 | 50 | tout le module : réglages `win_*`, nettoyage `dbl_*`, applis (`app_remove`, `app_settings`), nettoyage `cln_*` |
| Latence (`latency`) | 9 | 7 | seulement la section stockage : `sto_general`, `sto_ntfs`, `sto_fsutil`, `sto_fsutil2`, `sto_fsutil_v6`, `sto_defrag`, `sto_writecache`, `sto_ssdpower`, `sto_trim` |
| Carte graphique (`gpu`) | 3 | 2 | nettoyage des pilotes : `nv_telemetry`, `nv_debloat`, `amd_logging` |
| Restaurer (`restore`) | 4 | 0 | outils : `rst_point`, `rst_open`, `rst_network`, `rst_queue` |
| **Total** | **73** | **59** | |

Restent Premium (d'après `_comment` et le contenu) : Réseau/ping, Hitreg, le reste de Latence (processeur, mémoire, alimentation, timers), le reste de Carte graphique, Minecraft, RBW Mod (sauf « Activé »), mode jeu (sauf « Désactivé »), Expert, les presets du catalogue et le [[Packet Optimizer]].

La liste détaillée, réglage par réglage, avec le badge gratuit est dans les notes générées du dossier `Tweaks/` (voir [[Catalogue des tweaks]]).

## Qui le lit
- **Interface** : [[store.tsx]] l'importe (`import free from "../data/free.json"`) et en tire `FREE`, `FREE_SLOTS`, `FREE_REVERTS` ; [[Dashboard.tsx]] s'en sert pour la carte « optimisations gratuites ».
- **Moteur** : [[catalog.rs]] l'inclut dans l'exe (`include_str!("../../src/data/free.json")`) et vérifie avant chaque lot que rien de fermé n'est lancé sans licence et que les places ne débordent pas (`over_free_slots`, erreur `free_slots`). L'interface n'est donc pas la seule barrière.
- **Site** : `site/tools/sync_tweaks.py` (badges de la page Tweaks) et `site/tools/sync_app.py` (nombre de réglages gratuits affiché) — voir [[Site]].
- **Vault** : `docs/tools/catalogue_vault.py` (notes `Tweaks/`).

## À savoir avant de modifier
- Changer ce fichier change l'offre : c'est une **décision de Sofiene** (voir [[Décisions]]). Après un changement : rebâtir l'app (le moteur l'embarque à la compilation), relancer `python3 docs/tools/catalogue_vault.py`, `python3 site/tools/sync_app.py` et `python3 site/tools/sync_tweaks.py`.
- Un id qui n'existe pas dans [[catalog.json]] est simplement ignoré par l'interface ; le moteur a un test qui vérifie la cohérence (voir [[catalog.rs]]).
- Retirer un id de `tweaks` alors que des joueurs l'ont appliqué en gratuit : l'ajouter à `formerly`, sinon la remise à zéro le traitera comme un réglage Premium perdu.
