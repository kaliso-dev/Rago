---
type: code
tags: [code, app, json, donnees, catalogue]
fichier: app/src/data/catalog.json
lignes: 8050
maj: 2026-11-10
---
# catalog.json

Le **catalogue des tweaks** de l'app : modules, sections, réglages avec leurs variantes, presets, réglages retirés. Fichier **généré** par `app/tools/build_catalog_v6.py` (commande `npm run catalog`) ; on ne le modifie jamais à la main. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Catalogue des tweaks]]. Générateur : [[build_catalog_v6.py]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`). Dernier changement du fichier : commit `29123d4` du 01/11/2026 (« preset Minecraft PvP corrigé, applis préinstallées en gratuit »).

## Format
Objet racine : `{ version, modules, presets, retired }`.

- `version` : **8**.
- `modules[]` : `{ id, icon, name: {fr, en}, tagline: {fr, en}, sections[] }`.
  - `sections[]` : `{ id, name: {fr, en}, tweaks[] }` (le type TS prévoit aussi `requires`, non utilisé aujourd'hui).
  - `tweaks[]` : soit un réglage complet, soit un renvoi `{ "ref": "<id>" }` vers un réglage déclaré dans un autre module (il s'affiche aux deux endroits sans être dupliqué).
- Un réglage : `id`, `name`, `desc` (fr/en), `risk` (`safe` ou `advanced`), `reboot`, `requires` (liste), `kind` (`tweak` = interrupteur, `action` = bouton « Lancer » ponctuel), `lines` (nombre de commandes du script), `gain` et `cons` (fr/en : bénéfice attendu sans promesse, inconvénients) ; et selon le cas `variants`, `defaultVariant`, `restore` (point de restauration conseillé), `twin` (même script qu'un autre réglage), `confirm` (texte de confirmation), `native` (traitement en Rust au lieu d'un script), `optifine` (valeurs d'`optionsof.txt` par variante).
- Une variante : `{ id, label: {fr, en}, auto?, revert?, reboot?, lines? }`. `auto` = choix automatique selon le PC (`ram:16`, `cpu:intel`, `os:11`) ; `revert: true` = remet Windows comme avant.
- `presets[]` : `{ id, name, desc, tweaks: ["id" | "id:variante"], game?, tag?, match? }`.
- `retired[]` : `{ id, name, reason: {fr, en}, reboot, module }`.

Les scripts eux-mêmes ne sont **pas** dans ce fichier : ils sont scellés dans l'exe par le moteur (voir [[Moteur des tweaks]] et [[catalog.rs]]).

## Chiffres (1.3.0)
| Mesure | Valeur |
|---|---|
| Modules | 10 : Réseau (`network`, 6 sections, 24 entrées), Latence (`latency`, 8 sections, 86), Carte graphique (`gpu`, 5, 30), Windows (`windows`, 6, 57), Hitreg (`hitreg`, 3, 9), Minecraft (`minecraft`, 1, 4), RBW Mod (`rbw`, 1, 1), Mode jeu (`gamemode`, 1, 1), Mode expert (`expert`, 3, 18), Restaurer (`restore`, 1, 5) |
| Entrées dans les sections | 235, dont 4 renvois `ref` (`pri_game`, `net_profile`, `cln_temp` dans Minecraft ; `game_mode` dans Restaurer) |
| Réglages distincts (ids) | **231** : 214 `tweak` et 17 `action` ; 196 `safe`, 35 `advanced` |
| Réglages annoncés (`totalTweaks`, jumeaux comptés une fois) | **218** (24 réglages portent un `twin`, en 11 groupes) |
| Réglages à variantes | 18 (13 avec `defaultVariant`) |
| Variantes automatiques | `cpu_vendor` (cpu), `sys_ram` et `mem_profile` (9 paliers de RAM, 4 à 128 Go) |
| Variantes de retour (`revert`) | `ping_hitreg:default`, `in_frames:default`, `in_queue:default`, `rbw_mode:on`, `game_mode:off` |
| `restore: true` | 38 réglages |
| `native` | `nvidia_profile`, `minecraft_optifine`, `restore_point` |
| `requires` utilisés | `gpu:nvidia` (15), `gpu:amd` (7), `gpu:intel` (2), `res:nvidiaProfileInspector.exe` (2), `cpu:amd` (1), `cpu:intel` (1), `res:LowLatency.pow` (1), `res:smartctl.exe` (1). Plus aucun réglage ne demande `wmic`. |
| Presets | 20 : 5 généraux (`mc_pvp`, `fps`, `latency`, `laptop`, `privacy`) et 15 presets de jeu (`game: true`) |
| Réglages retirés | 17 (ex. `net_limit`, `pri_svc`) |

Presets de jeu, avec leur sigle et les mots reconnus dans le nom du jeu (`match`) : Fortnite `FN`, Valorant `VAL`, CS2 `CS2` (`counterstrike`), Apex `APEX`, PUBG `PUBG`, Rainbow Six `R6`, Overwatch `OW2`, Marvel Rivals `MR`, The Finals `TF`, Tarkov `EFT`, Rocket League `RL`, League of Legends `LoL`, Roblox `RBX`, GTA `GTA` (`grandtheftauto`, `gtav`, `gta5`), Minecraft Bedrock `MCBE`. `mc_pvp` (sigle `MC`, mot `minecraft`) n'est pas marqué `game` mais sert de preset à Minecraft Java dans la bibliothèque.

## Qui le lit
- [[catalog.ts]] l'importe et construit les tables (`tweaks`, `tweakModule`, `retired`, `totalTweaks`…), utilisées dans toute l'interface.
- [[catalog.rs]] l'inclut dans l'exe (`include_str!`) : liste des réglages connus, jumeaux, retours, redémarrages, tests de cohérence.
- `docs/tools/catalogue_vault.py` (notes `Tweaks/` du vault), `site/tools/sync_app.py` et `site/tools/sync_tweaks.py` (site), `brand/tools/export-logo.js` (icônes des modules).

## À savoir avant de modifier
- Ne pas éditer à la main : changer le générateur (voir [[Code du générateur de catalogue]]) puis `npm run catalog` dans `app/`.
- Après chaque génération : `python3 docs/tools/catalogue_vault.py`, `python3 site/tools/sync_app.py`, puis vérifier [[free.json]] (un id renommé y casse le plan gratuit).
- Un réglage retiré doit passer dans `retired` (pas disparaître) : les PC qui l'ont appliqué doivent pouvoir l'annuler.
