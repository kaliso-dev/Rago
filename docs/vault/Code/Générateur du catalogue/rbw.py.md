---
type: code
tags: [code, app, catalogue, générateur, python, rbw]
fichier: app/tools/rbw.py
lignes: 318
maj: 2026-11-10
---
# rbw.py

Fabrique les deux scripts du réglage `rbw_mode` (« RBW Mod ») : `ON`, qui remet en route tout ce que lit le vérificateur de screenshare de Ranked BedWars, et `OFF`, qui remet ces services et réglages comme Windows les règle. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[RBW Mod]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Ticket RAG-69 du 13/10 ([[Linear]]) ; fichier entré dans le dépôt le 16/10 (commit `995b238`, app 1.1.14), jamais modifié depuis.

## Rôle et place dans l'ensemble
- Le vérificateur officiel (QuickPots, `github.com/quickpots/RBW-SS`, `Services.ps1`, relevé le 13/10) exige que **SysMain, PcaSvc, DPS, BAM, EventLog, WSearch, DusmSvc, BFE, AppInfo, DCOMLaunch, PlugPlay** et chaque `CDPUserSvc_xxxx` tournent, que `DisableCMD`, `EnableScriptBlockLogging`, `EnableActivityFeed`, `EnablePrefetcher` et `Start_TrackDocs` ne valent pas 0, et que la clé `HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat` n'existe pas (sinon « PCA Logging: Disabled »).
- `ON` reproduit **`Rago-RBW-Fix.ps1`, le script validé par Sofiene sur son PC le 13/10** (« le script marche parfaitement »), dans le même ordre et avec les mêmes moyens. Différences voulues : aucune fenêtre ni question (l'app est déjà administrateur et affiche le journal), textes en anglais, et une ligne qui commence par `!` s'affiche **en rouge** dans le journal de l'app.
- `OFF` (demande de Sofiene du 13/10) remet tout comme Windows et lance les services que Windows lance de lui-même, **sans rien arrêter** (l'ancien script arrêtait SysMain et DiagTrack).
- [[build_catalog_v6.py]] remplace en entier les scripts `rbw_mode:on` et `rbw_mode:off` par `RBW.ON` et `RBW.OFF` à l'étape 9 de `postprocess`, **après** l'audit et [[safety.py]], pour qu'aucune de leurs lignes ne soit retirée (ils remettent justement BAM, le Prefetch, SysMain…). Il force aussi `reboot: false` sur le réglage et `reboot: true` sur la seule variante `on`.

## Ce que le fichier expose
| Nom | Contenu |
|---|---|
| `CHECKER_SERVICES` | les 11 services lus par le vérificateur |
| `SERVICES` | 16 tuples `(nom, démarrage voulu par ON, démarrage Windows remis par OFF, lancé par OFF)` dans l'ordre du script validé : `SysMain` (2, auto, oui), `PcaSvc` (2, auto, oui), `DPS` (2, auto, oui), `EventLog` (2, auto, oui), `WSearch` (2, delayed-auto, oui), `DusmSvc` (2, auto, oui), `BFE` (2, auto, oui), `Appinfo` (2, demand, non), `Schedule` (2, auto, oui), `DsmSvc` (2, demand, non), `DiagTrack` (2, auto, oui), `DcomLaunch` (2, auto, non), `PlugPlay` (3, demand, non), `bam` (1, system, oui), `dam` (1, system, non), `CDPUserSvc` (2, aucun, non). Valeurs `Start` : 1 système (pilotes BAM et DAM), 2 automatique, 3 manuel |
| `SVC_KEY`, `PREFETCH` | `HKLM:\SYSTEM\CurrentControlSet\Services\` et `…\Memory Management\PrefetchParameters` |
| `STATE` | `rbw-mod.state` : fichier d'état entre les étapes, dans le dossier où l'app lance ses scripts |
| `ps(code)` | transforme un bloc PowerShell en **une** ligne `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "…"` |
| `PRELUDE` | début de chaque étape : erreurs muettes (`$ErrorActionPreference = 'SilentlyContinue'`), sortie UTF-8, `$w` = `!` + espace (préfixe des lignes rouges, écrit `[char]33`), fonction `Reg(path, name)` |
| `SERVICE_LIST` | la table `$services` du script validé + chaque `CDPUserSvc_*` trouvé dans le registre (noms jamais traduits, contrairement à `sc query`) |
| `STAGE_START_TYPE`, `STAGE_DEPENDENCIES`, `STAGE_SETTINGS`, `STAGE_LAUNCH`, `STAGE_REPORT`, `STAGE_SCAN` | les 6 étapes de `ON` |
| `STAGES` | `[(titre affiché, code)]` |
| `ON` | 12 lignes : pour chaque étape, `echo - <titre>` puis la ligne `ps(code)` |
| `OFF` | 32 lignes de `cmd` (aucun PowerShell) |

## Fonctionnement détaillé

### Pourquoi une ligne PowerShell par étape
`cmd.exe` refuse les lignes de plus de 8 191 caractères : le script validé entier n'y tient pas. Chaque étape est donc une ligne (la plus longue fait 2 974 caractères ; `ps` impose < 8 000). Ce qui passe d'une étape à l'autre (heure de début, « redémarrage nécessaire », nombre d'éléments en rouge) est écrit dans `rbw-mod.state`, lu et écrit avec `-LiteralPath` (un `[` dans le nom d'utilisateur serait pris pour un motif avec `-Path`).

`ps(code)` contrôle par `assert` : chaque ligne finit par `;`, `{`, `(` ou `,` (ou `}`/`)` devant `else` ou `)`), sinon deux instructions se colleraient ; **aucun `"`** (fermerait la commande), **aucun `%`** (remplacé par `cmd`), **aucun `!`** (le moteur lance les scripts avec `EnableDelayedExpansion`, voir [[runner.rs]]). Les commentaires `#` sont retirés.

### Les 6 étapes de `ON`
1. **Démarrage avec Windows** (`Set-Start`) : écrit `since <ticks>` dans l'état ; pour chaque service, `sc.exe config`, puis `Set-Service -StartupType` si besoin, puis la valeur `Start` du registre en dernier recours ; `WSearch` en démarrage différé (`DelayedAutostart` 1). Si `WSearch` a été supprimé de Windows, il est réinstallé (`Enable-WindowsOptionalFeature SearchEngine-Client-Package`) et `restart` est noté. Un pilote passé de 4 à 1 note aussi `restart`.
2. **Services dont ils dépendent** (`Fix-Dependencies`) : tout service requis désactivé (`Start` 4) repasse en manuel.
3. **Réglages lus par le vérificateur** : stratégies `EnableActivityFeed` et `PublishUserActivities` supprimées ; clé `AppCompat` supprimée ; `Start_TrackDocs` à 1 ; `DisableCMD` supprimé ; `EnableScriptBlockLogging` supprimé s'il vaut 0 ; `EnablePrefetcher` et `EnableSuperfetch` à 3 ; journaux `DiagLog` et `WdiContextLog` (`Control\WMI\Autologger`) remis à `Start` 1 (actif après redémarrage, `restart` noté) ; stratégie WDI `{9c5a40da-…}\ScenarioExecutionEnabled` supprimée (DPS en a besoin).
4. **Lancement** (`Start-One`) : pour chaque service qui ne tourne pas, `Start-Service`, puis `sc.exe start`, puis attente jusqu'à 20 s (40 × 500 ms, arrêt après 3 s si le service reste `Stopped`), puis `net.exe start` en dernier recours. `CDPUserSvc` (modèle qui ne se lance pas) et `dam` (utile seulement en veille connectée) sont sautés.
5. **Ce que voit le vérificateur** : relit chaque service et réglage dans l'ordre du vérificateur, compte les éléments en rouge, explique un service arrêté par son code d'erreur et le message de Windows.
6. **Programmes qui pourraient les recouper** (lecture seule) : tâches planifiées hors `\Microsoft\*`, valeurs des clés `Run`/`RunOnce` (HKLM, HKCU, et `WOW6432Node\…\Run`) et fichiers `.bat`, `.cmd`, `.ps1`, `.vbs` des dossiers Démarrage. Chaque commande (et le contenu des fichiers de script qu'elle cite) est comparée à un motif qui cherche `sc config|stop`, `Set-Service`, `Stop-Service`, `net stop`, `reg add|delete` ou `Set-ItemProperty` visant un des services ou réglages ; un suspect s'affiche en rouge. Puis le verdict : « Everything is green for the RBW checker. », ou « Restart your PC, then turn RBW Mod on again… » si `restart` est noté, ou « Something is still red: post a screenshot of this log on the Rago Discord. » ; le fichier d'état est supprimé.

### `OFF`
1. `sc config <service> start= <mode Windows>` pour chaque service qui a un mode, et `CDPUserSvc` remis à `Start` 2 si la clé existe.
2. Stratégies `EnableActivityFeed`, `PublishUserActivities`, clé `AppCompat`, `DisableCMD` supprimées ; `Start_TrackDocs` 1 ; `EnableScriptBlockLogging` supprimé s'il vaut `0x0` ; `EnablePrefetcher` et `EnableSuperfetch` à 3 ; `DiagLog` et `WdiContextLog` à 1 **seulement si leur clé existe** (`_if_key`) ; stratégie WDI supprimée.
3. `sc start` des services marqués « lancé par OFF », puis chaque `CDPUserSvc_xxxx` (noms lus par `reg query … /k /f "CDPUserSvc_"`, car `sc query` est traduit sur un Windows français) remis en automatique et lancé.
Rien n'est arrêté, aucune clé absente n'est créée. Le build vérifie `'!' not in ON and '!' not in OFF`.

## Données touchées
Côté PC du joueur (quand l'app lance le script) : services Windows, registre (`HKLM\SYSTEM\CurrentControlSet\Services\…`, stratégies `HKLM\SOFTWARE\Policies\Microsoft\Windows\…`, `HKCU\…\Explorer\Advanced`, `Control\WMI\Autologger`), fichier `rbw-mod.state`. Côté build : aucune écriture, seulement les chaînes `ON` et `OFF`.

## Erreurs et cas limites
- Un service absent de ce Windows est signalé (en rouge s'il est lu par le vérificateur) sans faire échouer le script.
- Les messages de Windows peuvent être en français : sortie forcée en UTF-8 pour que le journal les affiche correctement.

## Liens avec le reste
- Utilisé par [[build_catalog_v6.py]] (`RBW.ON`, `RBW.OFF`) ; le preset Minecraft PvP ne doit toucher à rien de `RBW_TOUCHED` (même fichier).
- `rbw_mode:on` est une variante `revert` gratuite ([[free.json]] `reverts`) : un joueur sans licence peut toujours remettre son PC en état pour un screenshare.
- Tests Rust de [[catalog.rs]] : `rbw_mode_on_does_what_the_validated_fix_does` (ordre et contenu des étapes, `RBW_CHECKER` des 11 services), `rbw_mode_off_puts_windows_values_and_stops_nothing`, `rbw_mode_puts_back_what_other_tweaks_turn_off`.
- Écran du statut RBW dans l'app : voir [[RBW Mod]] et [[Tweaks RBW Mod]].

## À savoir avant de modifier
- `ON` doit rester **fidèle au script validé par Sofiene** (13/10) : tout changement d'ordre ou de moyen doit être revalidé sur un vrai PC Windows avec le vérificateur RBW ([[Règles de travail]] : Claude ne teste pas sur Windows).
- Pas de `"`, `%` ni `!` dans le PowerShell ; `[char]33` pour `!`, `[char]34` pour `"`.
- Si le vérificateur ajoute un service ou un réglage, mettre à jour `CHECKER_SERVICES`, `SERVICES`, l'étape 5, `OFF`, `RBW_TOUCHED` de [[build_catalog_v6.py]] et `RBW_CHECKER` du test Rust.
