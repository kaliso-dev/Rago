---
type: code
tags: [code, app, catalogue, générateur, python, annulation]
fichier: app/tools/undo/undo_gen.py
lignes: 1023
maj: 2026-11-10
---
# undo_gen.py

Fabrique, pour chaque réglage et chaque variante, les **scripts d'annulation** : `full` (remet tout aux valeurs de Windows, quand l'app n'a pas de sauvegarde) et `rest` (seulement ce que la sauvegarde ne couvre pas). C'est la source de `undo.json`. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Moteur des tweaks]], [[Remise à zéro]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `29a1e67`, app 1.1.6, audit du 07/10) ; modifié le 21/10 (`365fff1`, nouveaux réglages) et le 22/10 (`b767d4d`, Mode jeu : `GAME_FX` et services en pause).

## Rôle et place dans l'ensemble
- Il reprend la mécanique de [[probes.py]] (mêmes boucles, mêmes conditions, mêmes variables) mais remplace chaque commande par **sa commande inverse**, calculée avec les valeurs par défaut de Windows de [[defaults.py]].
- Deux modes par script :
  - **`full`** : remet tout aux valeurs de Windows. Sert quand il n'y a pas de sauvegarde (réglage appliqué avant 1.1.6, ou par l'ancien `.bat`).
  - **`rest`** : seulement ce que la sauvegarde de l'app ne relève pas (`netsh`, PowerShell, `auditpol`, plans d'alimentation supprimés, règle de pare-feu, `net accounts`, services mis en pause). À lancer **après** la remise de la sauvegarde, sauf si `rest_avant` vaut `true`.
- Lancé **deux fois** par [[build_catalog_v6.py]] (`build_undo`) en sous-processus : sur les scripts d'avant l'audit et sur les scripts finaux. [[merge_full.py]] réunit ensuite les deux résultats, pour qu'un PC passé par l'ancienne version retrouve aussi les valeurs des lignes retirées depuis.
- Le moteur Rust lit le résultat dans la struct `Undo { full, rest, rest_avant }` de [[backup.rs]].

## Ce que le fichier expose
**Ligne de commande** : `python3 undo_gen.py <scripts.json> <catalog.json> <sortie.json>`. La sortie contient une entrée `_meta` (texte `lisez_moi`) puis `{id: {variante: entrée}}`, `indent=1`. Affiche ensuite le journal `LOG` (commandes non reconnues, par catégorie).

**Variable d'environnement** `RAGO_TOOLS` : dossier où trouver [[probes.py]] (par défaut `app/tools`, le dossier parent). `sys.dont_write_bytecode = True` (le commentaire cite encore l'ancien chemin `app/rago-hub/tools`).

**Entrée produite par `main`** pour une variante :
| Champ | Sens |
|---|---|
| `full` | script `full` ou `None` |
| `rest` | script `rest` ou `None` |
| `ponctuel_sans_retour` | `true` = action ponctuelle (nettoyage, désinstallation, point de restauration) ou script qui écrit déjà les valeurs de Windows : rien à annuler |
| `sans_retour` | liste de ce qu'aucune annulation ne remet (applis désinstallées, pile réseau remise à zéro, Edge supprimé, historique de Windows Update effacé…) |
| `sauvegarde_seulement` | valeurs dont seule la sauvegarde de l'app connaît l'état d'origine (valeurs de pilote, bornes d'alimentation…) |
| `notes` | remarques (paramètre `netsh` inexistant, élément `bcdedit` inexistant, plan ajouté…) |
| `rest_avant` | `true` si le script supprime un plan d'alimentation de Windows : lancer `rest` **avant** la sauvegarde, sinon le plan actif d'avant n'existe plus quand la sauvegarde le réactive |
| `retour` | variante « retour » du catalogue (`revert`), rien à annuler (`full` et `rest` à `None`) |

Seuls `full`, `rest` et `rest_avant` arrivent dans `undo.json` ; `sans_retour` sert au build à poser `restore: true` (point de restauration coché d'office) ; le reste est jeté.

**Constantes principales** : `R` = ` >nul 2>&1` ; `BALANCED` (GUID du plan « Utilisation normale ») et `PLANS` (les 3 plans de Windows : Utilisation normale, Performances élevées, Économie d'énergie) ; `KERNEL_SVC` (pilotes qu'on ne lance pas : `gpuenergydrv`, `bam`, `dam`, `amdppm`, `intelppm`) ; `AUDIT_GUID` (9 sous-catégories d'audit) ; `NIC_KW` (nom affiché anglais d'une propriété de carte réseau → mot-clé du registre, ex. `interrupt moderation` → `*InterruptModeration`) ; `NIC_PM` ; `TCP_GLOBAL` et `TCP_GLOBAL_SAME` (valeurs Windows de `netsh int tcp set global`, ex. `autotuninglevel=normal`, `initialrto=1000`, `maxsynretransmissions=4`) ; `SUPPLEMENTAL` (modèle → algorithme de congestion : `internet` → `cubic`, `datacenter` → `dctcp`, `compat` → `newreno`) ; `IP_GLOBAL` ; `NETTCP` ; `MMFLAGS` ; `BARE` (valeurs écrites sur une clé trouvée par une boucle, dont le défaut est connu) ; `NIC_NAMES` ; `BCD_SET` (`nx` → `optin`, `bootmenupolicy` → `standard`, `allowedinmemorysettings` → `0x15000075`, `isolatedcontext` → `yes`, `hypervisorlaunchtype` → `auto`) et `BCD_SKIP` (`vm`) ; `PAUSED` (`wsearch`, `diagtrack`) ; `ONE_SHOT_FILES` ; `NATIVE` (`mc_optifine`, `nv_profile`, `rst_point`, avec leur explication) ; `META`.

## Fonctionnement détaillé

### Branchement sur `probes.py`
Le module importe [[probes.py]] sous le nom `P` puis **remplace** `P.dry_cmd` par `undo_cmd` et `P.dry_chain` par `undo_chain`. Ainsi `P.dry_script` (qui garde les `for`, `if`, `set` et parenthèses) produit des commandes inverses au lieu de lignes de relevé. C'est sans risque pour le reste du build parce que `undo_gen.py` tourne dans **son propre processus**.

### `run(body, mode, where)`
1. Crée un contexte `Ctx` (mode, listes `sans_retour`, `sauvegarde`, `notes`, réglages d'alimentation vus, plans ajoutés ou supprimés, mots-clés de carte réseau, services à relancer, drapeaux `hib`, `nic_pm`, `mm`, compteur `same` des commandes qui écrivent déjà la valeur de Windows).
2. `) > nul` en fin de bloc est réduit à `)` (sinon la redirection en ferait une commande).
3. `P.dry_script(body)` : chaque commande passe par `undo_cmd`, qui choisit un traitement selon le premier mot (`HANDLERS`).
4. `finish(text, epilogue(ctx))` met en forme.

`both(cmd)` marque une commande inverse que la sauvegarde ne couvre pas (gardée dans `full` **et** `rest`) ; `full_only(cmd)` une commande couverte par la sauvegarde (gardée seulement dans `full`).

### Traitement par commande
| Commande | Inverse |
|---|---|
| `reg add/delete` (`h_reg`) | règle de [[defaults.py]] (`lookup(clé, valeur)`) : `set` → `reg add` de la valeur Windows (rien si le script écrivait déjà cette valeur) ; `del`/`delp` → `reg delete` de la valeur ; `delkey` → suppression de la clé ; `clean` → suppression de la clé parasite jusqu'au composant fautif (`junk_root`) ; `svc` → valeur `Start` du service (`svc_reg`) ; `backup` → noté dans `sauvegarde_seulement` ; `noop` → rien. `reg delete … /va` d'un historique de l'Explorateur → `sans_retour`. `HibernateEnabled` 0 → `powercfg /hibernate on` en épilogue. Tout en `full_only`. |
| `sc config … start=` (`h_sc`) | `sc config "<svc>" start= <mot>` d'après `SERVICES` de [[defaults.py]] ; services automatiques relancés en épilogue (`sc start`), sauf `KERNEL_SVC`. `sc delete` → `sans_retour`. |
| `fsutil behavior set` | valeur par défaut de `FSUTIL` de [[defaults.py]] |
| `bcdedit /set` | `BCD_SET` ou `/deletevalue` ; `/timeout` → `bcdedit /timeout 30` ; note pour `hypervisorlaunchtype` |
| `schtasks /change … /disable` | `/enable` ; `/delete` → `sans_retour` |
| `setx` | `reg delete` de la variable (`HKCU\Environment` ou, avec `/m`, celle du système) |
| `powercfg` | réglages d'alimentation remis par `power_block` (PowerShell qui lit `DefaultPowerSchemeValues` de chaque réglage et remet les index secteur et batterie) ; plan importé sous un GUID fixe → supprimé en épilogue ; plan de Windows supprimé (`-delete`) → recréé par `powercfg -duplicatescheme <g> <g>` et `rest_avant` ; `-h off` → `hibernate on` ; plan activé → « Utilisation normale » réactivé |
| `netsh` (`h_netsh`) | `int tcp set global` → valeurs `TCP_GLOBAL` (paramètres inexistants notés) ; `heuristics`, `security`, `supplemental`, `int ip set global`, `isatap/teredo/6to4`, MTU (`Set-NetIPInterface … 1500`)… en `both` ; `winsock reset`, `int ip reset`, `advfirewall reset` → `sans_retour` |
| `powershell` (`h_powershell`) | `GAME_FX` du Mode jeu ([[optis_120.py]]) relancé tel quel (`both`, après la remise des valeurs) ; `Remove-AppxPackage` → `sans_retour` (appli à réinstaller depuis le Store) ; effacement des IFEO, `pnputil … remove-device`, `Clear-RecycleBin` → `sans_retour` ; `Enable-ComputerRestore` sur D: à G: → `Disable-ComputerRestore` ; `Disable-MMAgent -X` → `Enable-MMAgent` en épilogue ; `Disable-NetAdapterLso` → `Enable-…` ; `Disable-NetAdapterPowerManagement` → épilogue ; `Set-NetOffloadGlobalSetting`, `Set-NetTCPSetting` → valeurs Windows ; propriétés de carte réseau → `Reset-NetAdapterAdvancedProperty` |
| `auditpol` | `/success` et `/failure` par défaut (`AUDIT` de [[defaults.py]], sinon `disable`), toujours avec le **GUID** (marche sur un Windows non anglais) |
| `net` | `net accounts /maxpwage` → 42 ; `net stop wsearch|diagtrack` (Mode jeu) → `net start` |
| `del`, `rd`, `forfiles`… (`h_files`) | rien (fichiers temporaires) ; dossiers de Edge, de OneDrive, historique de Windows Update, `Windows\Temp` recréé → `sans_retour` |
| `takeown`, `icacls` | `sans_retour` |
| autres (`dism`, `taskkill`, `ipconfig`…) | rien ; `nvidiaProfileInspector` → `sauvegarde_seulement` ; désinstallation de Edge ou OneDrive → `sans_retour` |
Un tube `a | b` n'est inversé que si `a` est un `echo` ; sinon il est ignoré et noté dans `LOG` (sauf commandes de lecture).

### `epilogue(ctx)`
Ajouté à la fin (avant un `exit` de premier niveau) : remise des propriétés de carte réseau (`Reset-NetAdapterAdvancedProperty` pour chaque mot-clé), gestion d'alimentation des cartes (`Set-NetAdapterPowerManagement … Enabled`), `power_block` (en `full`), recréation des plans supprimés, réactivation de « Utilisation normale » (en `full`, ou en `rest` quand un plan ajouté doit être supprimé : Windows refuse de supprimer le plan actif), suppression des plans ajoutés, `powercfg /hibernate on`, `sc start` des services automatiques (en `full`), `sc start SysMain` + `Enable-MMAgent`.

### `finish(text, epilogue)`
`unwrap` (retire une boucle `for` dont la commande inverse n'utilise plus la variable), `balance` (retire les `)` orphelines, ferme les blocs restés ouverts), `prune` (retire lignes et blocs qui ne font plus rien, en gardant les `set` encore lus ailleurs), dédoublonnage des commandes de premier niveau, `@echo off` en tête, sortie CRLF. Si aucune commande n'agit et qu'il n'y a pas d'épilogue : `None`.

### `main(scripts_path, catalog_path, out_path)`
Lit les variantes `revert` du catalogue (elles reçoivent `retour: true`, rien à annuler). Pour chaque autre variante, `run(…, 'full')` et `run(…, 'rest')`, puis les champs de l'entrée ; `rest_avant` si des plans de Windows sont supprimés ; note spéciale si le script touche `mspower_deviceenable`. Les 3 réglages de `NATIVE` reçoivent leur explication ; `rst_point` est `ponctuel_sans_retour`. Le paramètre `out_path` n'est pas utilisé par `main` (l'écriture est faite par `__main__`).

## Données touchées
Lit deux fichiers JSON (scripts, catalogue), écrit le fichier de sortie passé en argument (dans un dossier temporaire quand c'est [[build_catalog_v6.py]] qui le lance). Aucun fichier du dépôt n'est écrit directement.

## Erreurs et cas limites
- Une commande non reconnue ne fait pas échouer le build : elle est notée dans `LOG` (affiché, mais le build envoie la sortie standard vers `DEVNULL`) et n'a pas d'inverse.
- Une valeur de registre absente de [[defaults.py]] tombe sur `('backup', 'valeur non répertoriée')` : pas d'inverse dans `full`, seule la sauvegarde la remet.
- `ValueError` de [[probes.py]] (ligne illisible) arrête le build.

## Liens avec le reste
- Importe [[probes.py]] et [[defaults.py]] ; lancé par [[build_catalog_v6.py]] ; résultat fusionné par [[merge_full.py]] ; chemins réécrits par [[paths.py]].
- Lu dans l'app par [[backup.rs]] (struct `Undo`) via [[catalog.rs]] (`undo_of`) ; embarqué chiffré ([[Scripts embarqués (JSON)]]).
- Les réglages retirés gardent leur annulation ([[safety.py]], [[Tweaks retirés]]).

## Tests
Pas de test Python. Tests Rust de [[catalog.rs]] : `retired_tweaks_cannot_run` (annulation présente pour des retirés), `kernel_timer_value_stays_out` (les annulations suppriment `CoalescingTimerInterval` et ne la remettent jamais), assertion `pow_ultimate` avec `rest_avant` dans le build.

## À savoir avant de modifier
- Un nouveau réglage qui écrit dans le registre a besoin d'une règle dans [[defaults.py]] ; sinon son annulation `full` ne remet rien (valeur « non répertoriée »).
- Le texte `META` (`lisez_moi`) parle encore d'`audit/outils-annulation/undo_gen.py` et d'une commande hors dépôt : il n'arrive pas dans `undo.json` (le build ne garde que `full`, `rest`, `rest_avant`), mais il est faux pour le dépôt actuel.
- Une commande PowerShell nouvelle et réversible doit recevoir un traitement dans `h_powershell`, sinon elle n'a pas d'inverse.
