---
type: code
tags: [code, app, rust, minecraft, optifine]
fichier: app/src-tauri/src/minecraft.rs
lignes: 185
maj: 2026-11-10
---
# minecraft.rs

**Préréglages OptiFine** : écrit les options choisies dans `optionsof.txt` du dossier Minecraft, en remplaçant les clés à leur place, avec une copie gardée avant d'écrire. Le `.bat` ajoutait les lignes à la fin à chaque passage (`echo ... >> optionsof.txt`), ce qui empilait des doublons. Fiche parente : [[Code de l'app (Rust)]]. Réglage : `mc_optifine` du [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Appliquer : [[runner.rs]] (`run_item`, réglage `mc_optifine`) avec les paramètres `dir` (dossier choisi dans l'interface, sinon `%APPDATA%\.minecraft`) et `values` (clé → valeur). `keep` = vrai si le réglage est déjà appliqué **dans ce même dossier** (autre variante).
- Annuler : [[runner.rs]] (`restore_latest`, dossier de l'interface, sinon celui où il a été appliqué, sinon le dossier habituel).
- [[reset.rs]] : `mc_optifine` est « annulable » s'il reste au moins une copie (`status().backups > 0`) ; utilisé pour la remise en fin de licence.
- Commandes de [[lib.rs]] : `minecraft_status(dir)`, `minecraft_restore(dir)` (sans dossier → `%APPDATA%\.minecraft` ; pas de `APPDATA` → « Minecraft folder not set »).

## Ce que le fichier expose

- Constantes : `FILE = "optionsof.txt"`, préfixe des copies `optionsof.txt.rago-`, **5 copies gardées**, suffixe `.none` (copie d'un dossier qui n'avait pas de fichier).
- `Status { dirExists, optifineFile, backups }`, `status(dir)`.
- `apply(dir, values, stamp, keep) -> Result<String>` (message pour le journal).
- `restore_latest(dir) -> Result<String>`.

## Fonctionnement détaillé

1. `apply` : dossier absent → « Minecraft folder not found ». Fichier existant illisible → erreur, **rien n'est écrit** (plutôt que le remplacer sans copie).
2. Copie avant d'écrire, sauf si `keep` et qu'une copie existe déjà (la copie d'avant la première fois reste celle à remettre ; une nouvelle copie garderait les valeurs de Rago). Nom : `optionsof.txt.rago-<horodatage ms>.bak`, ou `.none` (fichier vide) s'il n'y avait pas de fichier. Au-delà de 5 copies, les plus anciennes (ordre du nom) sont supprimées.
3. `merge` : chaque ligne `clé:valeur` dont la clé est demandée est remplacée **à sa place**, une seule fois (les doublons empilés par l'ancien `.bat` disparaissent) ; les autres lignes restent ; les clés nouvelles sont ajoutées à la fin ; fin de ligne `\n`.
4. Messages : « N OptiFine options written, the copy from before Rago is kept », « …, old file kept as <copie> », ou « … written to a new optionsof.txt ».
5. `restore_latest` : prend la copie la plus récente ; `.none` → supprime `optionsof.txt` (« there was none before Rago ») ; sinon recopie la copie sur `optionsof.txt`. Aucune copie → « No Rago backup found ».

## Données touchées

`optionsof.txt` et les copies `optionsof.txt.rago-*` dans le dossier Minecraft du joueur (par défaut `%APPDATA%\.minecraft`, ou un dossier de launcher choisi).

## Erreurs et cas limites

- La remise utilise la copie **la plus récente**, qui reste celle d'avant Rago tant que le réglage est réappliqué dans le même dossier (`keep`). Appliqué dans un autre dossier : nouvelle copie dans ce dossier.
- Une version d'avant qui n'avait laissé aucune copie : une copie est prise quand même au passage suivant.

## Liens avec le reste

- Appelé par [[runner.rs]], [[reset.rs]] et [[lib.rs]].
- Fonctionnalités : [[Catalogue des tweaks]] (module Minecraft), [[Remise à zéro]], [[Client Minecraft Rago]] (autre projet Minecraft).

## Tests

- `merge_replaces_in_place_and_dedupes` : `ofFogType` remplacé à sa place, doublon supprimé, autre ligne gardée, nouvelle clé à la fin.
- `apply_keeps_backup` : une copie, puis remise du fichier d'origine.
- `put_back_as_before_rago` : appliqué deux fois (deux variantes) puis remis → le fichier d'avant Rago, une seule copie ; sans fichier avant → copie `.none` et fichier supprimé à la remise ; déjà appliqué sans copie → une copie est prise.

## À savoir avant de modifier

- Ne jamais écrire sans copie, et ne jamais refaire de copie quand le réglage est déjà appliqué dans ce dossier (on perdrait l'état d'avant Rago).
- La fin de licence remet ce réglage : la copie `.none` est ce qui permet de supprimer un fichier que Rago a créé.
