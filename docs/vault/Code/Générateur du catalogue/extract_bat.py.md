---
type: code
tags: [code, app, catalogue, générateur, python]
fichier: app/tools/extract_bat.py
lignes: 232
maj: 2026-11-10
---
# extract_bat.py

Lecteur de l'ancien `.bat` Premium v5.2 : il simule les sauts `goto` du script à menus et rend, pour chaque étiquette (label), un script batch propre, sans interaction et corrigé. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Fichier créé le 07/10 (commit `6c2bcad`, app 1.1.5), jamais modifié depuis.

## Rôle et place dans l'ensemble
- L'ancien programme `app/legacy/Premium v5.2 - Rago Hub.bat` ([[Anciens scripts .bat]]) est un seul fichier de 14 435 lignes, piloté par des menus : chaque choix fait `goto <label>`, le code sous le label s'exécute puis revient au menu par un autre `goto`. L'app, elle, a besoin d'**un script autonome par réglage**.
- Ce module transforme « un label » en « un script » : il suit le fil d'exécution comme le ferait `cmd.exe`, retire tout ce qui est interface (dessins, `pause`, `cls`, questions), remplace les retours au menu par `exit /b 0` et corrige les bugs connus du fichier.
- Utilisé par [[build_catalog.py]] (classe `LegacyBat`, constante `NPI_CALL`) pour les 189 réglages de [[meta.py]], et par [[build_catalog_v6.py]] (seulement `LegacyBat._fix_blocks`, pour refermer les boucles `for` des `.bat` v6). [[fix_free_bat.py]] reprend ses corrections mécaniques à part (il ne l'importe pas).

## Ce que le fichier expose
| Nom | Type | Rôle |
|---|---|---|
| `ART` | regex | caractères de dessin (`█ ╔ ╗ ╚ ╝ ═ ║ ░ ▓ ▒ ▀ ▄ ▌ ▐`) : une ligne qui en contient est jetée |
| `COLOR` | regex | variables de couleur du `.bat` (`%w%`, `%p%`, `%b%`, `%v%`, `%o%`, `%j%`, `%u%`, `%m%`, `%h%`), retirées des lignes |
| `LABEL_RE` | regex | une ligne `:nom` seule (lettres, chiffres, `_`, `-`) |
| `GOTO_RE` | regex | `goto nom` ou `goto :nom` |
| `MENU_NAMES` | ensemble | `menu`, `m`, `main`, `mouse`, `god`, `misspellredirect`, `redirectmenu`, `redirect`, `redirectmouse` : labels toujours traités comme des menus |
| `NPI_CALL` | chaîne | commande qui importe le profil NVIDIA : si `%RAGO_RES%\nvidiaProfileInspector.exe` existe, il est lancé avec `%RAGO_RES%\extremelatencylow.nip -silentImport`, sinon `echo [skip] NVIDIA Profile Inspector introuvable` |
| `LegacyBat(path)` | classe | le fichier chargé et ses labels |

Méthodes de `LegacyBat` :
| Méthode | Paramètres → retour | Rôle |
|---|---|---|
| `resolve(name, frm)` | nom de label, index de ligne → index ou `None` | trouve la cible d'un `goto` comme `cmd.exe` : le premier label de ce nom **après** la ligne, sinon le premier depuis le début (recherche qui « fait le tour ») |
| `find(name, line)` | nom, ligne en base 1 → index | vérifie par `assert` que la ligne donnée porte bien ce label (garde-fou : si le `.bat` bouge, le build s'arrête) |
| `block_end(i)` | index → index | ligne du label suivant (ou fin de fichier) |
| `menu_block(i)` | index → index | saute les labels vides empilés pour trouver le bloc qui contient du code |
| `is_menu(i)` | index → bool | vrai si ce bloc contient `set /p input` (une invite de menu) |
| `is_menu_target(name, frm)` | nom, index → bool | vrai pour `MENU_NAMES`, `eof`, un label introuvable ou un label menu |
| `fix_line(s, i)` | ligne, index → ligne | les 6 corrections automatiques (voir plus bas) ; chaque ligne changée est notée dans `self.fixes` |
| `clean_line(l, i)` | ligne, index → ligne ou `None` | retire le bruit d'interface ; `None` = ligne jetée |
| `collect(start, max_hops=12, stop_at_menu=True)` | index du label → `(script, confirm_vars)` | simule l'exécution à partir d'un label |
| `collect_until_menu(start)` | index → texte | les commandes d'un label menu **avant** son invite `set /p input` |
| `_fix_blocks(script)` | texte → texte | méthode statique : referme les corps de boucles `for` réparés |
| `leaf(name, line)` | nom, ligne en base 1 → `(script, confirm_vars)` | point d'entrée : `find` puis `collect` |

## Fonctionnement détaillé

### Chargement (`__init__`)
1. Lecture binaire. Si les deux premiers octets sont `FF FE`, ils sont retirés : c'est un **faux BOM UTF-16** posé par l'auteur pour que les éditeurs affichent le fichier comme du charabia ; le reste est de l'UTF-8.
2. Décodage UTF-8 avec remplacement des octets invalides ; fins de ligne `\r\n` et `\r` ramenées à `\n` ; découpe en lignes (`self.L`, `self.N` = 14 435).
3. Liste des labels `(index, nom en minuscules)` : 372 labels, 310 noms distincts (des noms reviennent plusieurs fois, d'où la résolution « vers l'avant » de `resolve`). 56 labels sont reconnus comme menus par `is_menu`.

### Nettoyage d'une ligne (`clean_line`)
Une ligne est jetée si : elle est vide ; elle contient un caractère de dessin ; elle commence par `cls`, `pause`, `timeout`, `chcp`, `title`, `color` ou `mode` ; c'est un `echo` vide ou `echo.` ; c'est un `echo` qui contient « press any key » ou « operation completed » ; elle contient `notifyicon` ou `messagebox` (bulles et boîtes PowerShell) ou commence par `set "$` ; elle contient `contentreference` ou `oaicite` (restes collés depuis un assistant de chat) ; c'est un `reg add` avec un nombre impair de guillemets (ligne tronquée).
Sinon : les `& pause` (et `& pause >nul`) en fin de commande sont retirés, les variables de couleur aussi, et si la ligne n'est ni un `echo` ni un commentaire (`::`, `rem`), elle passe par `fix_line`.

### Les 6 corrections automatiques (`fix_line`)
1. **« Disabling » → « Disable », « Enabling » → « Enable »** : un rechercher-remplacer global fait sur le `.bat` avait cassé environ 270 commandes (noms de valeurs de registre, `schtasks /Disable`, `auditpol`, `Disable-MMAgent`…). 152 lignes réparées dans les scripts repris.
2. **`reg add <clé> /v DevicePriority /f`** (ou `MessageNumberLimit`) sans donnée écrivait une chaîne vide ; les messages du script disaient qu'il fallait supprimer la valeur : la ligne devient `reg delete <clé> /v "<nom>" /f >nul 2>&1`. 14 lignes.
3. **`REG_BINARY` avec espaces** : `/d 90 00 00 00` devient `/d 9012038010000000` (`reg` refuse les espaces ; c'est la valeur `UserPreferencesMask`).
4. **Guillemets typographiques et carte réseau en dur** : `“Ethernet”` devient `"%adapter_name%"` (variable que le moteur fournit, voir [[runner.rs]]).
5. **Chemins du PC de l'auteur** : `start "" /wait "C:\Users\Full PC Gamer\Desktop\Premium Program V3\extremelatencylow.nip"` devient `NPI_CALL` ; `C:\Rago Optimizer\PowerPlan\LowLatency.pow` devient `%RAGO_RES%\LowLatency.pow` ; `resources\smartctl.exe` devient `"%RAGO_RES%\smartctl.exe"`. `RAGO_RES` est le dossier des ressources de l'app. 5 lignes.
6. **Boucles `for` sans corps** : `do set "str=%%i" (` lançait le bloc une seule fois, hors de la boucle, avec un `%i` littéral (c'était le réglage MSI des cartes graphiques). La ligne devient `do set "str=%%i" & (`, et `_fix_blocks` referme le bloc. 3 lignes.

Au total, 176 lignes corrigées (compteur affiché par [[build_catalog.py]]), détaillées ligne par ligne dans [[CORRECTIONS.md (app)]].

### Simulation de l'exécution (`collect`)
Part de la ligne qui suit le label et avance ligne par ligne :
- **Label rencontré** : recopié tel quel (le code « tombe » dans le label suivant, comme dans `cmd.exe`).
- **`set /p input`** (invite d'un menu) : fin du script.
- **`set /p <var>=`** (question de confirmation) : la ligne est sautée et la variable notée ; toute ligne qui teste ensuite `%<var>%` est sautée aussi. Les variables sont rendues dans `confirm_vars` (que [[build_catalog.py]] n'utilise plus : les avertissements sont écrits à la main dans [[meta.py]]).
- **Profondeur de parenthèses** : comptée sur les lignes qui ne sont pas des `echo`.
- **`goto`** (hors `echo` et commentaires) : on regarde s'il est « de premier niveau » (hors bloc, ne commence pas par `if`/`for`/`)`, sans `&`).
  - vers un **menu** : de premier niveau → fin du script ; dans un bloc → le `goto` est remplacé par `exit /b 0` et la ligne est gardée ;
  - vers un **label de code** de premier niveau : le label est recopié en commentaire-label (`:nom`) et la lecture continue à sa ligne (code **suivi et recopié en ligne**). Arrêt si le label a déjà été visité (boucle) ou après `max_hops` = 12 sauts ;
  - un `goto` de code dans un bloc reste tel quel.
- **`exit`** de premier niveau : fin du script.
- Toute autre ligne passe par `clean_line`.
Ensuite : un bloc `( )` vide reçoit un `rem` pour rester valide (`(\n  rem\n)`), puis `_fix_blocks`.

### `_fix_blocks`
Après chaque ligne `do set "str=%%i" & (`, garde les lignes suivantes tant qu'elles contiennent `%%i` ou commencent par `echo` (et ne commencent pas par `for `), puis ajoute la `)` fermante si le `.bat` ne l'avait pas mise.

## Données touchées
Lecture seule de `app/legacy/Premium v5.2 - Rago Hub.bat`. N'écrit rien : le texte produit est rendu à l'appelant ; la liste `self.fixes` `(ligne, avant, après)` (coupée à 200 caractères) sert au rapport de [[CORRECTIONS.md (app)]].

## Erreurs et cas limites
- `find` lève `AssertionError` si le label annoncé n'est pas à la ligne annoncée : toute modification du `.bat` qui décale des lignes casse le build. C'est voulu (le 10/11, le changement des crédits du `.bat`, commit `a190565`, n'a modifié que des lignes `echo` sans en ajouter, donc rien n'a bougé).
- Un label introuvable vers lequel pointe un `goto` est traité comme un menu (fin du script).
- Le compteur de parenthèses ne tient pas compte des guillemets ni des `^(` échappés : c'est [[build_catalog.py]] (`paren_delta` + `tidy`) qui retire ensuite les `)` orphelines.

## Liens avec le reste
- Appelé par [[build_catalog.py]] (`LegacyBat`, `leaf`, `collect_until_menu`, `find`, `block_end`, `NPI_CALL`) et [[build_catalog_v6.py]] (`_fix_blocks`).
- Source lue : [[Anciens scripts .bat]]. Les scripts qui en sortent finissent dans [[Scripts embarqués (JSON)]] et sont lancés par [[runner.rs]] (qui ajoute l'en-tête `@echo off`, `chcp 65001`, `setlocal EnableExtensions EnableDelayedExpansion` et fournit `RAGO_RES` et `adapter_name`).

## Tests
Aucun test Python. Les tests Rust de [[catalog.rs]] vérifient le résultat final : `every_script_is_non_empty_and_non_interactive` (aucun script vide, aucun `set /p input`, aucun chemin « Full PC Gamer », plus aucun « Disabling »/« Enabling » hors `echo` et commentaires) et `no_empty_cmd_block` (aucune ligne finissant par `(` suivie d'une ligne commençant par `)`).

## À savoir avant de modifier
- Changer une règle ici change **les 189 réglages de l'ancien programme d'un coup** : relancer `npm run catalog` et regarder `git diff app/src-tauri/scripts/scripts.json` en entier.
- Ne jamais déplacer de lignes dans le `.bat` v5.2 : les numéros `label@ligne` de [[meta.py]] sont vérifiés par `find`.
- Une correction propre à un seul réglage ne va pas ici mais dans `PATCHES` de [[build_catalog.py]], ou mieux dans [[optis_120.py]] (après la copie d'avant audit, pour que l'annulation couvre l'ancienne version, voir [[build_catalog_v6.py]]).
