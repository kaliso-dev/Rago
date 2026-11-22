---
type: code
tags: [code, app, catalogue, générateur, python, annulation]
fichier: app/tools/undo/merge_full.py
lignes: 76
maj: 2026-11-10
---
# merge_full.py

Réunit deux fichiers d'annulation : celui des scripts **d'avant** l'audit et celui des scripts **actuels**. Résultat : un PC qui a lancé l'ancienne version d'un réglage retrouve aussi, en l'annulant, les valeurs des lignes retirées depuis. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Moteur des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `29a1e67`, app 1.1.6), jamais modifié depuis.

## Rôle et place dans l'ensemble
- Lancé par [[build_catalog_v6.py]] (`build_undo`) en sous-processus, après les deux passages de [[undo_gen.py]] : `python3 merge_full.py <annulation_ancienne.json> <annulation_nouvelle.json> <sortie.json>`.
- C'est ce qui rend sûre la règle « corriger un script **après** la copie d'avant audit » : l'annulation `full` couvre l'ancienne et la nouvelle version.

## Ce que le fichier expose
Un script sans fonction `main` (le code tourne au niveau du module, arguments lus dans `sys.argv[1:4]`) :
| Nom | Rôle |
|---|---|
| `R` | `\r\n` (les annulations sont en CRLF) |
| `depth(line)` | variation de profondeur de parenthèses (hors `rem`, `::`, `echo`, texte entre guillemets, `^(` `^)`) |
| `units(body)` | découpe un script en instructions complètes (un bloc `( … )` reste entier), sans la ligne `@echo off` |
| `merge(ob, nb)` | `@echo off` + toutes les instructions de l'ancien script + celles du nouveau qui n'y sont pas déjà ; rend `(texte, nombre d'instructions ajoutées)` |
| `NOTE` | phrases ajoutées aux `notes` d'une entrée fusionnée |

## Fonctionnement détaillé
1. Pour chaque réglage et variante du **nouveau** fichier (sauf `_meta`) : copie de l'entrée ; pour `full` puis `rest`, si l'ancien a un texte différent, `merge` (ordre : ancien d'abord, puis ce que le nouveau ajoute). Si le texte change, une note l'explique. Un texte dont les parenthèses ne s'équilibrent pas est signalé dans les statistiques (`déséquilibre`) sans bloquer.
2. Les variantes présentes dans l'**ancien** fichier mais absentes du nouveau sont gardées telles quelles (`gardées`).
3. Le `lisez_moi` de `_meta` reçoit deux phrases (qui citent `audit/outils-annulation/propositions.py` et `annulation-2026-10-07.json`, fichiers hors dépôt).
4. Écrit la sortie (`indent=1`) et affiche les statistiques en JSON (`full_fusionnées`, `rest_fusionnées`, `blocs_ajoutés`, `déséquilibre`, `gardées`).

Les champs autres que `full` et `rest` (`rest_avant`, `sans_retour`, `sauvegarde_seulement`…) viennent du nouveau fichier.

## Données touchées
Lit deux fichiers JSON, écrit le troisième (dans le dossier temporaire du build). Rien dans le dépôt.

## Erreurs et cas limites
- Les variantes « gardées » (disparues du nouveau fichier) et les réglages qui ne sont plus dans les scripts sont ensuite **jetés** par `build_undo` de [[build_catalog_v6.py]], qui ne garde que les réglages et variantes encore présents dans les scripts finaux (retirés compris).
- La comparaison des instructions est textuelle : une même commande écrite un peu autrement apparaît deux fois (sans danger, l'annulation la joue deux fois).

## Liens avec le reste
- Entrées produites par [[undo_gen.py]] ; sortie relue par [[build_catalog_v6.py]], puis [[paths.py]], puis écrite dans `undo.json` ([[Scripts embarqués (JSON)]]) et jouée par [[backup.rs]].
- Les lignes retirées par [[audit_fixes.py]] et [[safety.py]] restent annulables grâce à lui.

## À savoir avant de modifier
- Ne pas inverser l'ordre « ancien puis nouveau » : l'ancien script contient les valeurs que les PC concernés ont réellement reçues.
