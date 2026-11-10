---
type: code
tags: [code, app, catalogue, générateur, python, sécurité]
fichier: app/tools/paths.py
lignes: 319
maj: 2026-11-10
---
# paths.py

Réécrit les chemins de tous les scripts générés pour qu'**aucune suppression ne puisse viser le mauvais dossier** : `%VAR%` devient `!VAR!`, chaque suppression sur une variable reçoit un `if defined`, et les boucles qui suppriment tournent sans développement retardé. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Revue de sécurité du 13/10 (points P1 et P2) ; fichier entré le 16/10 (commit `995b238`, app 1.1.14), jamais modifié depuis.

## Rôle et place dans l'ensemble
- Le moteur lance chaque script après `setlocal EnableExtensions EnableDelayedExpansion` (`PREAMBLE` de [[runner.rs]]). Or `cmd.exe` remplace `%VAR%` **en lisant la ligne, avant de la découper**, puis remplace les `!…!` du texte obtenu. Conséquences : un `!` dans le nom du compte (« Jean! ») est retiré, et le texte entre deux `!` devient une autre variable ; `"%temp%\*"` peut alors viser le dossier temporaire d'un **autre** compte, et `del /s` ou `rd /s` agir au mauvais endroit. `!VAR!`, lui, est remplacé après le découpage et son texte n'est jamais relu.
- Pire cas trouvé (docstring) : un dossier nommé `!SystemRoot!` dans `C:\Windows\Temp` (où un compte standard peut créer des dossiers) faisait lancer `rmdir "C:\Windows" /s/q` par `cln_temp`, **en administrateur**.
- Branché dans [[build_catalog_v6.py]] à trois endroits : sur les scripts (étape 10 de `postprocess`, après le RBW Mod ; doit renvoyer **6**), sur les relevés de [[probes.py]] et sur les annulations de [[undo_gen.py]] (dans `main`). Il ne fabrique rien : il transforme.

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `WINDOWS_VARS` | 20 variables de chemin de Windows : `TEMP`, `TMP`, `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `PROGRAMDATA`, `ALLUSERSPROFILE`, `PUBLIC`, `SYSTEMROOT`, `WINDIR`, `SYSTEMDRIVE`, `HOMEDRIVE`, `HOMEPATH`, `USERNAME`, `ONEDRIVE`, `PROGRAMFILES`, `PROGRAMFILES(X86)`, `PROGRAMW6432`, `COMMONPROGRAMFILES`, `COMMONPROGRAMFILES(X86)` |
| `SCRIPT_VARS` | `PROFILES_DIR` (posée par `sto_general`) |
| `PATH_VARS` | l'union des deux |
| `PERCENT`, `BANG`, `FOR_VAR`, `ACTION`, `GUARD`, `FOR_HEAD`, `IS_FOR`, `FOLDER` | expressions régulières (`%VAR%` ou `%%`, `!VAR!`, `%%x` de boucle, commande qui supprime, `if defined X`, début de `for`, motif `set folder=`) |
| `DDE_OFF` | `setlocal DisableDelayedExpansion` |
| `masked(line)` | remplace le texte entre guillemets par des `x` (mêmes positions) |
| `kind(line)` | `label`, `rem`, `echo` ou `cmd` |
| `parens(line)` | +1/-1 pour chaque parenthèse hors guillemets et hors `^` (même règle que `block_errors` de [[catalog.rs]]) |
| `block_end(lines, i)` | ligne qui ferme le bloc ouvert en `i` (`ValueError` si jamais fermé) |
| `first_action(line)`, `is_action(line)` | position de la première commande `del`, `erase`, `rd`, `rmdir`, `forfiles`, `takeown` ou `icacls` ; un commentaire ne compte pas, un `echo` seulement après un `&` ou `|` hors guillemets |
| `path_refs`, `percent_refs`, `guarded`, `depths` | aides de lecture |
| `folders(text, where)` | réécrit le nettoyage par `set folder="…"` |
| `convert(lines, where)` | `%VAR%` → `!VAR!` |
| `guards(lines, where)` | ajoute `if defined VAR` |
| `encloses(body)`, `wrap(line, where)`, `toggles(lines, where, on=True)` | coupe le développement retardé autour des suppressions sur une variable de boucle |
| `check(text)` | relit le résultat et rend la liste des défauts |
| `apply_text(text, where)` | `folders` → `convert` → `guards` → `toggles` → `check` (doit être vide) ; rend `(texte, nombre de set folder= réécrits)` |
| `apply(tree, where='')` | applique `apply_text` à chaque chaîne d'un dictionnaire imbriqué (scripts `{id: {variante: texte}}` ou annulations `{id: {variante: {full, rest}}}`) ; rend le total de `folders` |

## Fonctionnement détaillé
Pour chaque texte, en gardant son séparateur (`\r\n` ou `\n`) :
1. **`folders`** : le motif exact `set folder="<chemin>"` / `IF EXIST "%folder%" (` / `cd /d %folder%` / `for /F "delims=" %%i in ('dir /b') do …` / `)` devient `if exist "<chemin>" (` / `cd /d "<chemin>" && for …` / `)`. Avant, avec un espace dans le chemin, `IF EXIST "%folder%"` (guillemets doublés) était mal lu, le `cd` pouvait échouer et la boucle **vidait alors le dossier où l'app lance ses scripts**. Maintenant la boucle ne tourne que si le `cd` a réussi. Il ne doit plus rester `%folder%` (`assert`). Cas réels : `cln_temp` (2 dossiers) et les 2 variantes de `mc_optifine` (2 chacune) = 6.
2. **`convert`** : `%VAR%` → `!VAR!` pour les variables de `PATH_VARS` uniquement (les `%%` restent : variable de boucle, ou `%` écrit tel quel comme `%%SystemRoot%%` des annulations). Refusé (`assert`) : une variable de Windows modifiée par un script ; une variable de chemin posée dans un bloc (`%VAR%` y garderait l'ancienne valeur) ou posée et lue sur la même ligne ; une ligne qui contient déjà un `!` ; une ligne `call` (relue deux fois) ; une ligne qui contient déjà `DisableDelayedExpansion`.
3. **`guards`** : devant chaque commande qui supprime ou change des droits sur un chemin tiré d'une variable (ou devant le bloc qui la contient), ajoute `if defined VAR ` pour chaque variable pas déjà gardée par un bloc englobant. Sans cela, une variable vide ferait de `"!temp!\*"` le chemin `"\*"`, **la racine du disque**.
4. **`toggles`** : une variable de boucle (`%%d`) est remplacée **avant** les `!…!`, donc un nom de dossier contenant des `!` serait interprété. Les suppressions sur une variable de boucle tournent donc avec le développement retardé coupé :
   - sur une seule ligne : `for … do CORPS` → `for … do (setlocal DisableDelayedExpansion & CORPS & endlocal)` (`wrap`, qui utilise `probes.find_in_clause` pour trouver la fin de la clause `in (…)`) ;
   - pour un bloc `for … do (` … `)` : `setlocal DisableDelayedExpansion` en première ligne du bloc et `endlocal` en dernière. Refusé si le bloc contient un `!` (il ne serait plus développé) ou une commande dont l'effet serait perdu au `endlocal` (`set`, `cd`, `pushd`, `popd`, `goto`, `exit`, `call`).
5. **`check`** : mêmes règles que le test Rust `deletions_never_use_a_percent_path` de [[catalog.rs]]. Pour chaque ligne qui supprime : pas de `%VAR%` (sur la ligne ou sur la ligne qui ouvre son bloc) ; chaque `!VAR!` gardé par un `if defined` ; pas de variable de boucle avec le développement retardé actif ; pas de `!…!` là où il n'est plus développé ; aucune variable hors guillemets. Il suit les `setlocal`/`endlocal` sur leur propre ligne, en partant de l'état du `PREAMBLE` (développement retardé actif).

## Données touchées
Modifie en mémoire les dictionnaires passés par [[build_catalog_v6.py]]. Aucun fichier.

## Erreurs et cas limites
- Toute situation non prévue lève un `AssertionError` avec l'endroit (`id:variante`) et la ligne : le build s'arrête plutôt que de produire un script douteux.
- `apply` sur les scripts doit renvoyer exactement 6 (contrôle dans le build) : un nouveau nettoyage `set folder=` ou un ancien qui disparaît change ce chiffre, à mettre à jour en connaissance de cause.

## Liens avec le reste
- Appelé par [[build_catalog_v6.py]] ; importe [[probes.py]] (dans `wrap`).
- Rend compatibles les scripts lancés par [[runner.rs]] et les annulations de [[backup.rs]].
- Garde-fou miroir côté Rust : test `deletions_never_use_a_percent_path` de [[catalog.rs]].

## À savoir avant de modifier
- Écrire les nouveaux scripts directement avec `!VAR!`, guillemets autour des chemins et `if defined` devant une suppression : ce module les acceptera tels quels.
- Ne pas utiliser `call` ni poser une variable de chemin dans un bloc : refusé.
- Toute nouvelle variable de chemin posée par un script doit être ajoutée à `SCRIPT_VARS`.
