---
type: code
tags: [code, app, catalogue, générateur, python, annulation]
fichier: app/tools/undo/defaults.py
lignes: 374
maj: 2026-11-10
---
# defaults.py

La table des **valeurs par défaut de Windows 10/11** (installation propre) pour tout ce que les réglages modifient : registre, démarrage des services, `fsutil`, audit. [[undo_gen.py]] la consulte pour écrire la commande qui remet chaque valeur comme Windows. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Moteur des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `29a1e67`, audit du 07/10), modifié le 21/10 (`365fff1`, règles des réglages ajoutés par [[optis_120.py]]).

## Rôle et place dans l'ensemble
- Fichier de données pur, sans docstring (un commentaire en tête donne les actions). Importé par [[undo_gen.py]] (`import defaults as DF`).
- Il décide, pour chaque valeur de registre écrite ou supprimée par un script, ce que fait l'annulation `full` : remettre une valeur, la supprimer, supprimer une clé, nettoyer une clé parasite, ou laisser faire la sauvegarde.

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `SZ`, `DW`, `BIN`, `EXP` | `REG_SZ`, `REG_DWORD`, `REG_BINARY`, `REG_EXPAND_SZ` |
| `DEL`, `DELP`, `NOOP` | actions `('del',)`, `('delp',)`, `('noop',)` |
| `S(d)`, `D(d)`, `B(why)` | `('set', REG_SZ, d)`, `('set', REG_DWORD, str(d))`, `('backup', why)` |
| `CC`, `MM`, `SP`, `TCP`, `CPL`, `CU` | préfixes de clés en minuscules (`hklm\system\currentcontrolset`, `…\memory management`, `…\multimedia\systemprofile`, `…\tcpip\parameters`, `hkcu\control panel`, `hkcu\software\microsoft\windows\currentversion`) |
| `MOUSE_X`, `MOUSE_Y` | courbes de lissage de la souris de Windows (`SmoothMouseXCurve`, `SmoothMouseYCurve`) |
| `RULES` | 270 règles `(regex de clé, regex de valeur ou None, action)` ; **la première qui correspond gagne** |
| `_COMPILED` | les mêmes, compilées |
| `norm(key)` | clé normalisée : `HKEY_LOCAL_MACHINE` → `HKLM` (idem HKCU, HKU, HKCR), `\\` doublés réduits, `ControlSet00N` → `CurrentControlSet`, minuscules |
| `lookup(key, value)` | action de la première règle qui correspond ; sinon `('backup', 'valeur non répertoriée')` |
| `SERVICES` | 55 services → démarrage par défaut (`1` système, `2` automatique, `3` manuel, `4` désactivé ; `'d'` démarrage différé ; `'tp'` logiciel tiers ; `None` = variable) |
| `SC_WORD` | `{1: 'system', 2: 'auto', 3: 'demand', 4: 'disabled'}` |
| `FSUTIL` | `disablelastaccess` 2, `disable8dot3` 2, `memoryusage` 1, `mftzone` 1, `encryptpagingfile` 0, `disabledeletenotify` 0, `disablecompression` 0, `disableencryption` 0 |
| `AUDIT` | défaut `(succès, échec)` de 3 sous-catégories d'audit (les autres : `disable`, `disable`) |

### Les actions
| Action | Effet dans l'annulation `full` | Nombre de règles |
|---|---|---|
| `('set', type, donnée)` | `reg add` de la valeur de Windows | 152 |
| `('del',)` | `reg delete` de la valeur (absente par défaut, sûr) | 48 |
| `('delp',)` | `reg delete` de la valeur (**probablement** absente par défaut) | 8 |
| `('delkey',)` | `reg delete` de la clé entière (clé créée par le réglage, ex. stratégie QoS d'un jeu, `PerfOptions` d'un exe) | 4 |
| `('clean',)` | supprime la clé parasite créée par une faute de frappe, jusqu'au composant fautif | 8 |
| `('backup', raison)` | pas d'inverse ; la valeur est notée « sauvegarde seulement » avec sa raison | 42 |
| `('svc',)` | valeur `Start`/`DelayedAutostart` d'un service : traitée avec `SERVICES` | 2 |
| `('noop',)` | rien (ex. `HKLM\CurrentControlSet\…`, chemin refusé par Windows, rien n'a été créé) | 6 |

## Fonctionnement détaillé
`RULES` est rangée par thème, de la plus précise à la plus large (l'ordre compte) :
1. **Clés parasites** créées par des fautes dans les scripts (`Class{4d36e968…}` sans `\`, `services\gpuenergydr`, `PowerSettings\xxxxxxxx_…`, `Policies &#8203`, `windowsnt` sans espace, `javaw.exe.exe`, `Enum\%a`) → `clean`.
2. **Stratégies** (`\Policies\`) : absentes par défaut → `del` ; stratégie QoS d'un exe → `delkey`.
3. **Multimedia Class Scheduler** : `SystemResponsiveness` 20, `NetworkThrottlingIndex` 10, tâche `Games` (`Affinity` 0, `Background Only` False, `Clock Rate` 10000, `GPU Priority` 8, `Priority` 2…), tâche `Low Latency` supprimée.
4. **Mémoire, priorités, contrôle** : valeurs de `Memory Management` (`LargeSystemCache` 0, `SessionPoolSize` 4, `SessionViewSize` 48…), `EnablePrefetcher` 3, `Win32PrioritySeparation` 2, mode tablette laissé à la sauvegarde…
5. **Périphériques (`Enum`)** : `Affinity Policy` supprimée, mode MSI laissé à la sauvegarde, valeurs d'une clé trouvée par une boucle (`%%a`) laissées à la sauvegarde.
6. **Services** : `Start`/`DelayedAutostart` → `svc` ; `Tcpip\Parameters` (`IPEnableRouter` 0, `EnableICMPRedirect` 1…, le reste supprimé) ; `ServiceProvider` (`LocalPriority` 499, `HostsPriority` 500, `DnsPriority` 2000, `NetbtPriority` 2001) ; `LanmanServer` ; `W32Time` `Type` NTP ; règles du pare-feu et télémétrie NVIDIA laissées à la sauvegarde ; tout autre sous-clé de service : `del`.
7. **Panneau de configuration (HKCU)** : souris (`MouseSpeed` 1, `MouseThreshold1` 6, `MouseThreshold2` 10, `MouseSensitivity` 10, courbes `MOUSE_X`/`MOUSE_Y`), clavier, bureau, accessibilité…
8. **Explorateur, jeu, recherche (HKCU)**.
9. **HKLM\SOFTWARE** : `PolicyManager` (`AllowGameDVR` 1…), visionneuse de photos, `SmartScreenEnabled` `Warn`, `PerfOptions` des exe supprimés (`delkey`), Defender laissé à la sauvegarde (protégé), clés NVIDIA et Intel `delp`, `HKCR` laissé à la sauvegarde, tout le reste de `HKLM\SOFTWARE` `delp`.

`SERVICES` couvre les services touchés : diagnostics (`diagtrack` 2, `dps` 2, `pcasvc` 2…), `sysmain` 2, `wsearch` 2 différé, `spooler` 2, `remoteregistry` 4, Bluetooth, Xbox (`xblauthmanager` 3…), Hyper-V (`vmic*` 3), pilotes (`bam` 1, `dam` 1, `amdppm` 3, `intelppm` 3, `gpuenergydrv` 2), logiciels tiers (`edgeupdate` 2 différé, `gupdate` 2 différé, `nvtelemetrycontainer` 2, `amdlog` variable), et `%%s` (les `CDPUserSvc_xxxx` de la boucle de `rbw_mode`).

## Données touchées
Aucune : table importée.

## Erreurs et cas limites
- Une valeur sans règle n'arrête rien : elle devient « valeur non répertoriée » et n'a pas d'inverse dans `full` (seule la sauvegarde de l'app la remet). C'est le cas à surveiller quand on ajoute un réglage.
- Un service absent de `SERVICES` est noté dans le journal de [[undo_gen.py]] (`service inconnu`) et laissé à la sauvegarde.

## Liens avec le reste
- Lu par [[undo_gen.py]] (`lookup`, `norm`, `_COMPILED`, `SERVICES`, `SC_WORD`, `FSUTIL`, `AUDIT`, `DEL`).
- Ses choix se retrouvent dans `undo.json` ([[Scripts embarqués (JSON)]]), joué par [[backup.rs]] quand un joueur décoche un réglage ou lance la [[Remise à zéro]].
- `FSUTIL` ici (valeurs par défaut) est différent de `FSUTIL` de [[probes.py]] (nom → valeur de registre).

## À savoir avant de modifier
- **Ajouter un réglage qui écrit dans le registre** : ajouter la règle de sa clé (et de sa valeur) **avant** les règles larges du même thème, avec la vraie valeur d'un Windows propre. En cas de doute sur la valeur par défaut, préférer `B("raison")` (la sauvegarde de l'app la remettra) à une valeur devinée.
- Une règle trop large placée trop haut change l'annulation de nombreux réglages : relancer `npm run catalog` et relire `git diff app/src-tauri/scripts/undo.json`.
