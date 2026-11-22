---
type: code
tags: [code, app, nsis, installateur]
fichier: app/src-tauri/installer/hooks.nsh, app/src-tauri/installer/eula.txt
lignes: 39 (hooks.nsh), 20 (eula.txt)
maj: 2026-11-10
---
# Installateur NSIS

Ajouts de Rago Optimizer à l'installateur NSIS que Tauri fabrique : **remise à zéro des réglages à la désinstallation**, suppression de la tâche de lancement avec Windows, nettoyage des anciens fichiers en clair. Plus les conditions d'utilisation affichées à l'installation. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Remise à zéro]], [[Arrière-plan et démarrage]]. Configuration : [[Configuration Tauri]].

Tout est CONFIRMÉ (fichiers de `staging`, 10/11). `hooks.nsh` créé le 15/10 ([[Version 1.1.14]]), complété le 17/10 (tâche planifiée, RAG-82).

## Place dans l'ensemble
- Déclaré dans `tauri.conf.json` : `bundle > windows > nsis > installerHooks = "installer/hooks.nsh"`, `licenseFile = "installer/eula.txt"`, installation `perMachine`, anglais seulement.
- La remise elle-même est faite par l'exe : `run()` de [[lib.rs]] voit `--reset-tweaks` et appelle `reset::uninstall()` ([[reset.rs]]), avec le verrou d'instance de [[instance.rs]].
- Le modèle NSIS est celui de la CLI de Tauri **2.12.1** (cité dans le fichier) ; le test `delete_app_data_checkbox_is_read_before_the_hook` de [[reset.rs]] vérifie dans `node_modules` que ce modèle n'a pas changé.

## `NSIS_HOOK_PREUNINSTALL` (avant de retirer les fichiers)
1. **Tâche planifiée** : si `$UpdateMode <> 1` **et** `$EXEDIR != $INSTDIR` (vraie désinstallation), `nsExec::Exec 'schtasks.exe /Delete /TN "${PRODUCTNAME}" /F'`. Gardée pendant une mise à jour, où l'exe reste au même endroit ([[background.rs]]).
2. **Remise à zéro** : si `$UpdateMode <> 1` **et** (`$EXEDIR != $INSTDIR` **ou** `$DeleteAppDataCheckboxState = 1`) :
   - `!insertmacro CheckIfAppIsRunning "$INSTDIR\${MAINBINARYNAME}.exe" "${PRODUCTNAME}"` : l'app ouverte est fermée d'abord (la remise ne doit pas croiser un lot lancé depuis la fenêtre) ;
   - `DetailPrint "Putting back the Windows settings changed by ${PRODUCTNAME} (this can take a few minutes)..."` ;
   - `ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --reset-tweaks'` : attend la fin. La remise s'arrête d'elle-même au bout de **15 minutes** (`reset::UNINSTALL_LIMIT`) : la désinstallation ne reste jamais bloquée.

### Pourquoi ces conditions
- Une **vraie désinstallation** (Paramètres de Windows, menu Démarrer) copie d'abord le désinstallateur dans `%TEMP%` : `$EXEDIR != $INSTDIR`.
- Pendant une **mise à jour**, l'installateur de la nouvelle version lance le désinstallateur **en place** (depuis le dossier de l'app, avec `/UPDATE` ou `_?=`) : rien n'est remis, les réglages restent appliqués et `applied.json` est gardé.
- **Sauf** si le joueur coche « Delete the application data » sur la page de confirmation : la section Uninstall de Tauri efface alors `%APPDATA%\<identifiant>` (`applied.json` et les sauvegardes), et plus rien ne pourrait remettre ces réglages ensuite. `$DeleteAppDataCheckboxState` est la variable globale du modèle de Tauri, lue par `un.ConfirmLeave` en quittant cette page, donc avant la section Uninstall et ce crochet. Elle est vide (donc 0) en silencieux (`/S`) et en passif (`/P`), où la page n'est pas montrée et où Tauri n'efface rien. Avec `/UPDATE`, Tauri n'efface jamais les données.

## `NSIS_HOOK_POSTINSTALL` (après l'installation)
`Delete "$INSTDIR\resources\LowLatency.pow"` et `Delete "$INSTDIR\resources\extremelatencylow.nip"` : depuis la 1.1.14 ces fichiers sont chiffrés dans l'exe ([[assets.rs]]) ; une installation par-dessus une version d'avant laisserait leurs copies en clair.

## `eula.txt`
Conditions d'utilisation en anglais, en 5 points (ce que fait l'app ; responsabilité du joueur et point de restauration ; anti-cheat et screenshares, avec le RBW Mod ; licence : plan gratuit limité, Premium personnel lié à un PC, revente interdite ; aucune garantie), acceptées par « I Agree ». Voir [[Conformité juridique]].

## Tests (dans [[reset.rs]])
- `uninstaller_hook_skips_updates_and_is_bounded` : le fichier contient `$UpdateMode <> 1`, `$EXEDIR != $INSTDIR`, `${OrIf} $DeleteAppDataCheckboxState = 1` dans cet ordre avant `ExecWait`, **une seule** `ExecWait`, autant de `${If}` que de `${EndIf}` ; limite de la remise ≤ 20 min.
- `delete_app_data_checkbox_is_read_before_the_hook` : dans le binaire de la CLI de Tauri (`node_modules/@tauri-apps/cli-*`), l'ordre `un.ConfirmLeave` → lecture de la case → page de confirmation → page d'installation → `Section Uninstall` → `NSIS_HOOK_PREUNINSTALL` → `RmDir /r "$APPDATA\${BUNDLEID}"`. Sauté si `npm ci` n'a pas tourné.
- `data_dir_and_uninstaller_match_the_app` : `installerHooks` pointe bien sur ce fichier, qui contient `--reset-tweaks`.

## À savoir avant de modifier
- Une mise à jour de la CLI de Tauri peut changer le modèle NSIS : relancer les tests de [[reset.rs]] et relire ce fichier.
- Ne jamais ajouter une 2e `ExecWait` de remise : la remise ne doit tourner qu'une fois.
- Les mises à jour automatiques installent en mode passif ([[update.rs]]) : elles passent par le chemin « mise à jour » (rien n'est remis).
