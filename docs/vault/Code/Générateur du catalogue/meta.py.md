---
type: code
tags: [code, app, catalogue, générateur, python]
fichier: app/tools/meta.py
lignes: 791
maj: 2026-11-10
---
# meta.py

Les métadonnées des 189 réglages repris de l'ancien programme v5.2 : modules, sections, noms, textes, risques et lien `label@ligne` vers le `.bat`. Ce fichier ne contient **aucun script** : le texte des commandes est extrait du `.bat` par [[extract_bat.py]]. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (`6c2bcad`), dernier changement le 16/10 (`995b238`, 1.1.14).

## Rôle et place dans l'ensemble
- Lu par [[build_catalog.py]] (`from meta import MODULES, PRESETS`). Indirectement, il donne au catalogue final ([[catalog.json]]) **l'ossature** : les 10 modules (Réseau, Latence, Carte graphique, Windows, Hitreg, Minecraft, RBW Mod, Mode jeu, Mode expert, Restaurer), leurs icônes, noms et accroches (`tagline`). [[build_catalog_v6.py]] verse ensuite les réglages v6 dans ces modules.
- Sur ses 189 réglages, au 10/11 : 167 ids sont encore dans le catalogue final (dont 5 dont le contenu a été remplacé par la version v6 du même id : `win_diag`, `win_bluetooth`, `win_gamemode`, `gpu_general`, `sto_defrag`), 14 ont été retirés par [[safety.py]] (`amd_thermal`, `dbl_edge`, `dbl_onedrive`, `dbl_xbox`, `exp_bios`, `exp_dma`, `exp_harden`, `mem_prefetch`, `net_limit`, `nv_tdr`, `pow_timer`, `pri_svc`, `sto_cacheprot`, `win_smartscreen`) et 8 ont disparu au profit d'un réglage v6 d'un autre id (`dbl_gamedvr`, `dbl_hyperv`, `exp_gamedvr`, `exp_hyperv`, `exp_mitigations`, `kbm_queue`, `win_animations`, `win_fse`).
- **Ce qui sert encore dans l'app** : ids, noms (sauf 14 renommés ensuite par `NAMES`/`NAME_FIX`/`UK_US` de [[build_catalog_v6.py]]), `risk`, `reboot`, `kind`, variantes (ids, libellés, `auto`), `defaultVariant`, `requires`, `native`, sections et ordre. **Ce qui ne sert plus** : les descriptions `desc` (écrasées par [[descriptions.json]]), les `confirm` (recalculés par les `WARNINGS`) et les presets `mc_pvp` et `esport` (remplacés).

## Ce que le fichier expose
| Nom | Signature | Retour |
|---|---|---|
| `T` | `T(id, src, fr, en, dfr, den, risk='safe', reboot=True, kind='tweak', variants=None, requires=None, confirm=None, default_variant=None, native=None)` | `{id, src, name: {fr, en}, desc: {fr, en}, risk, reboot, kind, variants, requires: [], confirm, defaultVariant, native}` |
| `V` | `V(id, src, fr, en=None, auto=None)` | variante `{id, src, label: {fr, en}, auto}` (`en` = `fr` si absent) |
| `REF` | `REF(id)` | `{ref: id}` : renvoi, le réglage s'affiche aussi dans ce module |
| `MODULES` | liste | 10 modules `{id, icon, name, tagline, sections: [{id, name, requires?, tweaks}]}` |
| `PRESETS` | liste | 4 presets `{id, name, desc, tweaks}` |

**Attention à l'ordre des arguments** : dans ce `T`, le français vient **avant** l'anglais (`fr, en, dfr, den`). Dans le `T` de [[build_catalog_v6.py]], c'est l'inverse (`en, fr, desc_en, desc_fr`). Les deux fonctions ont le même nom mais vivent dans des fichiers différents.

Valeurs des champs (docstring du fichier) :
- `risk` : `safe` (« Sûr ») ou `advanced` (« Avancé » : touche à la sécurité, au démarrage, ou supprime quelque chose).
- `reboot` : un redémarrage est nécessaire pour que le réglage prenne effet.
- `kind` : `tweak` (coché puis appliqué en lot) ou `action` (bouton, s'exécute tout de suite).
- `src` : `label@ligne` (ligne en base 1 du label dans le `.bat` v5.2), `None` pour un réglage natif ou à variantes, ou la source spéciale `Performance@13768:temp` (`cln_temp`, script écrit à la main dans [[build_catalog.py]]).
- `auto` d'une variante : choix automatique selon le PC, `cpu:intel` / `cpu:amd` (`cpu_profile`, labels `c17@7522`, `c18@7601`) et `ram:4` à `ram:128` (9 tailles de RAM, labels `4GB@9546` à `128GB@9659`). Dans l'app, `autoVariant` de [[catalog.ts]] compare ces valeurs à `ramTier` et `cpuVendor` fournis par l'[[Analyse du PC]] (il connaît aussi `os:10`/`os:11`, que le catalogue n'utilise pas).
- `requires` d'une section : `gpu:nvidia`, `gpu:amd`, `gpu:intel`. Recopié tel quel dans [[catalog.json]], mais **lu par aucun code de l'app** au 10/11 (OBSERVÉ par recherche dans `app/src` et `app/src-tauri/src`) : c'est le `requires` de chaque réglage que `availability()` de [[catalog.ts]] vérifie pour griser un réglage sur un PC sans la bonne carte.
- `native` : `nvidia_profile` (`nv_profile`), `minecraft_optifine` (`mc_optifine`), `restore_point` (`rst_point`) : l'app fait l'action elle-même en Rust au lieu de lancer un script (voir [[Moteur des tweaks]]).

## Contenu (chiffres)
| Module | id, icône | Sections (nombre de réglages) |
|---|---|---|
| Réseau | `network`, `network` | `profiles` (1), `presets` (1), `manual` (15), `tools` (1) |
| Latence | `latency`, `gauge` | `general` (2), `priority` (11), `input` (8), `cpu` (17), `memory` (7), `power` (16), `storage` (6), `usb` (6) |
| Carte graphique | `gpu`, `gpu` | `general` (1), `nvidia` (18), `amd` (8), `intel` (1) |
| Windows | `windows`, `windows` | `system` (20), `debloat` (12), `apps` (2), `clean` (4) |
| Hitreg | `hitreg`, `crosshair` | `suite` (1 : `hitreg_suite`, 4 variantes par type de PC) |
| Minecraft | `minecraft`, `cube` | `client` (`mc_optifine` + renvois `pri_game`, `net_profile`, `cln_temp`) |
| RBW Mod | `rbw`, `shield` | `rbw` (`rbw_mode`, variantes `On@14039`, `off@14077`) |
| Mode jeu | `gamemode`, `bolt` | `gamemode` (`game_mode`, variantes `ENABLE8@14250`, `DISABLE8@14304`) |
| Mode expert | `expert`, `flask` | `kernel` (12), `system` (7, + renvoi `dbl_onedrive`), `security` (6) |
| Restaurer | `restore`, `undo` | `restore` (4 : `rst_point`, `rst_open`, `rst_network`, `rst_queue` + renvois `exp_mitigations`, `game_mode`) |

Total : 189 réglages et 6 renvois. 15 réglages ont des variantes (58 variantes, dont 13 avec `auto`), 13 sont des actions, 32 sont `advanced`, 48 n'exigent pas de redémarrage, 12 ont un `defaultVariant`. `confirm` n'est posé que sur `dbl_edge` et `dbl_onedrive`.

Presets : `mc_pvp` (15 réglages), `esport` (16), `laptop` (10), `privacy` (9). Seuls `laptop` et `privacy` arrivent dans l'app, complétés par `PRESET_EXTRA` de [[build_catalog_v6.py]] (voir [[Presets]]).

## Fonctionnement détaillé
Le fichier ne fait que construire des structures de données Python à l'import. [[build_catalog.py]] parcourt `MODULES` dans l'ordre : l'ordre des sections et des réglages ici est l'ordre d'affichage final pour les réglages de l'ancien programme (les sections v6 sont insérées **devant**, préfixées `v6_`).

## Erreurs et cas limites
- **Réglages de carte graphique sans `requires`** (OBSERVÉ, 10/11) : `nv_preemption`, `nv_advanced`, `nv_kboost` (section NVIDIA) et `amd_advanced` (section AMD), tous `advanced`, n'ont pas de `requires` alors que les autres réglages de leur section ont `gpu:nvidia` ou `gpu:amd`. Comme le `requires` de la section n'est pas lu, l'app ne les grise pas sur un PC sans carte NVIDIA ou AMD. **À VÉRIFIER** avec Sofiene : oubli (ajouter `requires=['gpu:nvidia']` / `['gpu:amd']` ici, puis `npm run catalog`) ou choix voulu.
- Un `label@ligne` faux fait échouer `LegacyBat.find` (`assert`) dans [[extract_bat.py]].
- Un id en double, un `REF` ou un réglage de preset vers un id inconnu fait échouer [[build_catalog.py]].

## Liens avec le reste
- Lu par [[build_catalog.py]] ; ses sorties sont fusionnées par [[build_catalog_v6.py]].
- Les ids d'ici sont ceux de [[descriptions.json]], [[free.json]], [[Scripts embarqués (JSON)]] et des notes générées comme [[Tweaks Latence]].

## À savoir avant de modifier
- **Changer un texte d'explication ici ne change rien dans l'app** : les textes visibles viennent de [[descriptions.json]]. Pour un nom, regarder d'abord si `NAMES`/`NAME_FIX` de [[build_catalog_v6.py]] ne le remplacent pas.
- Ne jamais réutiliser l'id d'un réglage retiré : [[Tweaks retirés]] et l'annulation de [[backup.rs]] le reconnaissent par son id sur les PC des joueurs.
- Un nouveau réglage ne s'ajoute plus ici (il faudrait un label dans l'ancien `.bat`) : il s'ajoute dans `NEW_TWEAKS` de [[optis_120.py]] (voir la recette dans [[Code du générateur de catalogue]]).
