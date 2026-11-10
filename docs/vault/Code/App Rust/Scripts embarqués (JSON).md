---
type: code
tags: [code, app, catalogue, données]
fichier: app/src-tauri/scripts/scripts.json, app/src-tauri/scripts/probes.json, app/src-tauri/scripts/undo.json
lignes: 3 fichiers JSON générés (1 116 793, 852 660 et 732 476 octets)
maj: 2026-11-10
---
# Scripts embarqués (JSON)

Les trois fichiers de données qui contiennent **tout ce que l'app lance** pour un réglage : le script qui l'applique (`scripts.json`), le relevé « à blanc » de ce qu'il va toucher (`probes.json`) et l'annulation (`undo.json`). Ils sont générés, jamais écrits à la main, puis chiffrés dans l'exe à la compilation. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Moteur des tweaks]], [[Catalogue des tweaks]].

Tout est CONFIRMÉ (fichiers de `staging`, 10/11 ; chiffres calculés sur ces fichiers).

## Rôle et place dans l'ensemble
- **Générés** par `cd app && npm run catalog` (= `python3 tools/build_catalog_v6.py`, voir [[build_catalog_v6.py]]) en même temps que [[catalog.json]]. Ne jamais les éditer à la main : la prochaine génération écraserait la modification.
- **Chiffrés** à la compilation par [[embed_scripts.rs]] (partie de [[build.rs]]) en deux paquets, gratuit et Premium, avec [[seal.rs]]. Aucun script n'est en clair dans l'exe.
- **Lus** dans l'app par [[catalog.rs]] (`script`, `probe`, `undo_of`), utilisés par [[runner.rs]] (lancer, relever, annuler) et [[backup.rs]] (lecture des lignes `@@RAGO`, type `Undo`).
- L'interface ne voit **jamais** ces fichiers : elle n'a que [[catalog.json]] (textes, variantes, risques), sans aucune commande.

## Format commun
Les trois fichiers ont la même forme : `{ "<id du réglage>": { "<variante>": … } }`.
- `id` : l'identifiant du réglage dans [[catalog.json]] (ex. `net_nagle`, `ping_hitreg`).
- `variante` : le nom de la variante choisie dans l'interface (ex. `ping_hitreg` : `besthitreg`, `balanced`, `default`, `slowlest`, `better`, `hypixel`), ou `"_"` pour un réglage sans variante. [[catalog.rs]] cherche la variante demandée, sinon `"_"`.
- Fins de ligne : les scripts sont du batch Windows (`cmd`), écrit tel quel dans un `.cmd` par [[runner.rs]].

## `scripts.json` : appliquer
`{id: {variante: "texte du script batch"}}`.
- **230 id, 298 variantes** (dont 212 `"_"`).
- `rst_point` (point de restauration) et `mc_optifine` (variantes `performance`, `quality`) y sont encore, repris des anciens `.bat`, mais **le moteur ne lance pas ces textes** : ce sont des réglages natifs (`runner::is_native`), faits en Rust par [[runner.rs]] (PowerShell du point de restauration) et [[minecraft.rs]] (OptiFine). `nv_profile`, natif aussi, n'y est pas (profil importé par [[runner.rs]] avec [[assets.rs]]). `__wmic` n'y est pas : son script est écrit en dur dans [[catalog.rs]].
- Les scripts utilisent `%RAGO_RES%\<nom>` pour les fichiers natifs ([[assets.rs]]).
- Les réglages retirés pour sécurité (`SAFETY.RETIRED` de [[safety.py]]) sont filtrés : ils n'ont pas de script.

## `probes.json` : relever avant d'appliquer
`{id: {variante: "texte du script de relevé"}}`. Mêmes **230 id et 298 variantes** que `scripts.json`.
- Un relevé ne change rien : il **affiche** une ligne par élément que le script va toucher, sous la forme `@@RAGO <type> "a" "b"`. [[runner.rs]] le lance avant le script, [[backup.rs]] (`parse_markers`) lit ces lignes et garde la valeur d'avant.
- Types de lignes (nombre d'occurrences de `@@RAGO <type>` dans le fichier) : `reg` 7 117, `pwr` 111, `bcd` 106, `task` 101, `pwractive` 94, `regtree` 4, `hib` 1. `regkey` et `regvals` existent dans [[backup.rs]] mais ne sont produits par aucun relevé actuel.
- 25 variantes n'ont aucune ligne `@@RAGO` (rien à garder : actions, nettoyages…). Elles sont alors sautées.
- Généré par [[probes.py]] à partir des chemins de [[paths.py]] (`PATHS.apply`).

## `undo.json` : annuler
`{id: {variante: {"full": "…", "rest": "…", "rest_avant": true}}}`. `rest` et `rest_avant` sont facultatifs.
- **207 id, 270 entrées.** `full` : 270. `rest` : 58. `rest_avant` : 2 (`pow_ultimate`, `pow_delete_plans`).
- `full` : script qui remet **les valeurs par défaut de Windows** ; il sert quand il n'y a pas de sauvegarde (réglage appliqué avant la 1.1.6 ou par l'ancien `.bat`, voir [[runner.rs]]).
- `rest` : ce que la sauvegarde ne sait pas relever (commandes `netsh`, PowerShell, plans d'alimentation supprimés…), lancé **après** la remise de la sauvegarde, ou **avant** si `rest_avant` (un plan supprimé doit être recréé avant que la sauvegarde le réactive).
- 14 id n'ont **qu'une annulation**, sans script : ce sont des réglages retirés, gardés pour qu'un joueur qui les avait appliqués puisse encore les enlever : `dbl_onedrive`, `dbl_xbox`, `exp_bios`, `exp_dma`, `exp_harden`, `mem_prefetch`, `net_limit`, `nv_tdr`, `pow_timer`, `pri_svc`, `win_coreiso`, `win_hyperv`, `win_mitigations`, `win_smartscreen`.
- Généré par [[undo_gen.py]], complété par [[merge_full.py]] et les valeurs de Windows de [[defaults.py]].

## Répartition dans les deux paquets (chiffres du 10/11)
Tri fait par [[embed_scripts.rs]] avec [[free.json]] (73 réglages gratuits) et les variantes `revert: true` de [[catalog.json]] :

| Paquet | Scripts | Relevés | Annulations | Clé |
|---|---|---|---|---|
| Gratuit (`scripts.plain.sealed`) | 80 | 75 | 56 id | `offline_key`, reconstruite dans l'exe |
| Premium (`scripts.sealed`) | 218 | 223 | 151 id | `version_key`, donnée par le serveur à une licence active |

Les deux paquets portent aussi le moteur PowerShell du Packet Optimizer (`netopt/*.ps1`, voir [[netopt.rs]]).

## À savoir avant de modifier
- Changer un script : modifier la source dans `app/tools/` (ou les `.bat` d'origine), relancer `npm run catalog`, puis les tests de [[catalog.rs]] (`cargo test`), qui vérifient entre autres que chaque script est non vide et non interactif (`every_script_is_non_empty_and_non_interactive`), qu'aucun bloc `( )` n'est vide (`no_empty_cmd_block`, RAG-68) et que les réglages retirés n'ont ni script ni relevé (`retired_tweaks_cannot_run`).
- Un réglage qui touche une nouvelle valeur sans ligne `@@RAGO` dans son relevé ne sera **pas** sauvegardé : sa désactivation retombera sur `full` (valeurs de Windows). Ajouter la ligne dans [[probes.py]].
- Retirer un réglage : le garder dans `undo.json` (comme les 14 id ci-dessus) tant que des joueurs peuvent l'avoir appliqué.
- Si le catalogue change : relancer aussi `python3 docs/tools/catalogue_vault.py` pour les notes de `docs/vault/Tweaks/`.
