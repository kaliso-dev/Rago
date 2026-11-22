---
type: code
tags: [code, vault, catalogue, générateur, python]
fichier: docs/tools/catalogue_vault.py
lignes: 104
maj: 2026-11-10
---
# catalogue_vault.py

Régénère les notes « Tweaks … » du vault (`docs/vault/Tweaks/*.md`) à partir du catalogue de l'app : une note par module, une note des presets et une note des réglages retirés. Ces notes ne s'écrivent **jamais à la main**. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]], [[Mettre à jour le vault]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 31/10 (commit `fd1c7cc`, règle n°1 du vault), jamais modifié depuis.

## Rôle et place dans l'ensemble
- Dernier maillon de la chaîne du catalogue côté documentation : [[build_catalog_v6.py]] écrit [[catalog.json]], ce script le traduit en notes lisibles dans Obsidian ([[Tweaks Réseau]], [[Tweaks Latence]], [[Tweaks Carte graphique]], [[Tweaks Windows]], [[Tweaks Hitreg]], [[Tweaks Minecraft]], [[Tweaks RBW Mod]], [[Tweaks Mode jeu]], [[Tweaks Mode expert]], [[Tweaks Restaurer]], [[Tweaks Presets]], [[Tweaks retirés]]).
- Commande, **depuis la racine du dépôt**, sur la branche qui porte la dernière version de l'app (`staging`) : `python3 docs/tools/catalogue_vault.py [dossier_app]` (`app` par défaut). À lancer après chaque `npm run catalog` et après tout changement de [[free.json]] ou de version (règle 9 de [[Mettre à jour le vault]]).
- Le site a son propre équivalent ([[sync_app.py]]).

## Ce que le fichier expose
Un script sans fonction exportée. Entrées et sorties :
| Sens | Fichier |
|---|---|
| Entrée | `<dossier_app>/src/data/catalog.json` (modules, presets, retirés) |
| Entrée | `<dossier_app>/src/data/free.json` (`tweaks` gratuits, `reverts`) |
| Entrée | `<dossier_app>/package.json` (`version`) |
| Sortie | `<racine du dépôt>/docs/vault/Tweaks/Tweaks <nom français du module>.md` (10 notes) |
| Sortie | `…/Tweaks/Tweaks Presets.md`, `…/Tweaks/Tweaks retirés.md` |
| Console | `app <version> : <n> entrées, <n> tweaks distincts, <n> gratuits, <n> presets, <n> retirés` puis la liste des notes écrites |

Le chemin du **dossier app est relatif au dossier courant** (d'où « depuis la racine »), alors que le dossier de sortie est calculé depuis l'emplacement du script (`docs/tools/../../`).

## Fonctionnement détaillé
1. Charge les trois fichiers ; `FREE` = `free.json` › `tweaks`, `REVERTS` = `free.json` › `reverts` (les champs `slots` et `formerly` ne sont pas lus).
2. Indexe chaque entrée par id (`by_id`), son module (`module_of`) et les presets qui la citent (`in_presets`). Réglages distincts = ids ramenés à leur `twin`.
3. En-tête de chaque note : `type: catalogue`, `tags`, `généré: docs/tools/catalogue_vault.py`, `version_app: <version>`, `maj: <date du jour>`.
4. **Une note par module** : titre `Tweaks <nom fr>`, accroche, rappel « Note générée… ne pas l'éditer à la main, voir [[Catalogue des tweaks]] », légende, puis une section `##` par section du module. Pour chaque réglage, un titre `### <nom fr> \`id\` <drapeaux>` :
   - 🆓 si l'id est dans `FREE`, sinon ↩️ si dans `REVERTS` (seul le retour arrière est gratuit), sinon 🔒 Premium ;
   - ⚠️ `risk: advanced` ; 🔁 `reboot` ; ⚙️ `kind: action` ;
   - puis la description (`desc` français), les variantes (`libellé (\`id\`, retour)`, variante par défaut), « Gain », « Inconvénient », « Demande confirmation », « Nécessite », « Jumeau de », « Exécuté par du code Rust natif », « Dans les presets ».
   Un renvoi `{ref}` devient « Aussi affiché ici : … voir `[[Tweaks <module>]]` ». Les `|` des textes sont remplacés par `/` et les sauts de ligne par des espaces (pour ne pas casser le Markdown).
5. **Tweaks Presets** : pour chaque preset, `## <nom> (\`id\`, N tweaks · étiquette · reconnu pour : …)`, sa description, puis chaque entrée `id` ou `id → variante` avec le lien vers la note du module.
6. **Tweaks retirés** : `- **<nom>** \`id\` : <raison>` pour chaque retiré.
7. Écrase les fichiers existants (UTF-8). Il ne supprime pas une note devenue inutile (par exemple si un module disparaissait).

## Données touchées
Écrit seulement dans `docs/vault/Tweaks/`. Ne touche ni au code ni aux JSON.

## Erreurs et cas limites
- **Il faut Python 3.12 ou plus** : la ligne 67 imbrique des guillemets doubles dans une f-string (`f"- Gain : {fr(t.get("gain"))}"`), refusé par Python 3.11 et avant (`SyntaxError`). OBSERVÉ : il tourne avec Python 3.13 dans l'environnement de Claude.
- Lancé depuis un autre dossier que la racine sans argument : `FileNotFoundError` sur `app/src/data/catalog.json`.
- Lancé sur une branche en retard (la prod `claude/rago-monorepo-initial-eyj6pq` porte l'app 1.1.14) : les notes décriraient une vieille version. Toujours sur `staging`.

## Dernière génération
Le 10/11 sur `staging`, avec l'app **1.3.0** : 231 entrées, 218 tweaks distincts, **73 gratuits**, 20 presets, 17 retirés. Avant, les notes dataient du 31/10 (app 1.2.1, 11 gratuits, Minecraft PvP à 22 tweaks au lieu de 20).

## Liens avec le reste
- Lit [[catalog.json]] (produit par [[build_catalog_v6.py]]) et [[free.json]].
- Procédure : [[Mettre à jour le vault]], [[Reprendre le développement]] (tâche « Ajouter ou corriger un tweak »).

## À savoir avant de modifier
- Garder les noms de notes `Tweaks <nom fr du module>` : beaucoup de notes du vault y pointent.
- Ajouter l'affichage de `slots` (30 réglages gratuits actifs à la fois) et de `formerly` serait utile : aujourd'hui ces deux règles du plan gratuit n'apparaissent pas dans les notes générées.
