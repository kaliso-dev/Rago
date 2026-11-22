---
type: code
tags: [code, app, rust, moteur, licence]
fichier: app/src-tauri/src/reset.rs
lignes: 522
maj: 2026-11-11
---
# reset.rs

Remise à zéro des réglages **sans fenêtre ni bouton pour l'arrêter** : à la fin de la licence sur ce PC (déconnexion, abonnement terminé, remboursement, licence passée sur un autre PC) et à la désinstallation (`--reset-tweaks`). Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Remise à zéro]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 15/10 ([[Version 1.1.14]]). Revue du 13/10 (m3) citée dans les tests.

## Rôle et place dans l'ensemble
- La boucle de remise de fin de licence est dans [[lib.rs]] (`reset_after_license`) ; ce fichier fournit la liste des réglages (`targets`), la note sur disque (`Pending`), la décision (`due`) et l'état partagé (`Reset`).
- La remise de désinstallation (`uninstall`) est entièrement ici, appelée par `run()` de [[lib.rs]] quand l'installateur lance l'exe avec `--reset-tweaks` ([[Installateur NSIS]]).
- Le travail lui-même est fait par [[runner.rs]] (`run_now`, annulations), à partir de [[backup.rs]] (`applied.json`).
- Remet aussi ce qui n'est pas dans `applied.json` : [[netopt.rs]] (`put_back`, Packet Optimizer), [[session.rs]] (`undo_all`, réglages posés pendant une partie) et, à la désinstallation, [[display.rs]] (`undo_all`, couleurs, résolution et fichiers des jeux ; ajouté le 11/11, PR #93).

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `UNINSTALL_ARG = "--reset-tweaks"` | argument passé par le désinstallateur |
| `IDENTIFIER = env!("RAGO_IDENTIFIER")` | identifiant de `tauri.conf.json` posé par [[build.rs]] (`gg.rago.optimizer` ou `gg.rago.optimizer.staging`) : nom du dossier de données ; l'exe de test ne remet jamais les réglages du vrai |
| `enum Scope { LicenseEnd, Premium, All }` | portée de la remise (voir plus bas) |
| `targets(ledger, scope, bundle) -> Vec<String>` | réglages à remettre, **le dernier appliqué en premier** (tri par `ts` décroissant puis par id) |
| `optifine_dir(applied)` | dossier noté dans `applied.json` (`dir`), sinon `%APPDATA%\.minecraft` |
| `items(ids) -> Vec<RunItem>` | chaque id en annulation (`undo: true`, sans variante) |
| `struct Done {ok, failed}` | charge de l'événement `reset:done` (message « Tweaks have been reset ») |
| `struct Pending {why, at}` | fin de licence notée dans `reset-pending.json` ; `new`, `load`, `save`, `remove` |
| `due(data_dir, état de licence, ledger) -> Option<Pending>` | une remise est-elle due maintenant ? |
| `struct Reset` | état d'une remise en cours : `noting`, `begin`, `end`, `is_running`, `hold_exit`, `keep_open` |
| `uninstall()` | remise complète de la désinstallation |
| `UNINSTALL_LIMIT = 15 min` | durée maximale de cette remise |

## Fonctionnement détaillé

### Les trois portées
- `LicenseEnd` (fin de licence) : tous les réglages, **gratuits compris**, que le moteur sait remettre tout seul (`undoable`).
- `Premium` : seulement les réglages Premium de `LicenseEnd`, sauf ceux qui étaient gratuits avant (`was_free`, la souris `in_mouse`). Sert à `due` pour repérer une fin de licence pas notée.
- `All` (désinstallation, « Tout annuler » du [[Tableau de bord]] par `undo_all_plan`) : tous, même sans annulation automatique.

`undoable(id, applied, bundle)` est vrai si : OptiFine avec au moins une copie de sauvegarde dans son dossier ([[minecraft.rs]] `status().backups > 0`) ; profil NVIDIA (toujours : retour aux réglages du pilote) ; sinon sauvegarde de l'état d'avant, copie `undo.full`, annulation `full` dans les paquets, ou variante de retour arrière disponible. Les autres (15 réglages sans annulation automatique d'après le journal d'une déconnexion de la 1.1.13) échoueraient à chaque fois : ils restent appliqués, annulables à la main ou par le point de restauration.

### `Pending` : la note sur disque
- Fichier `<data_dir>\reset-pending.json` (JSON camelCase `{"why": …, "at": <ms>}`), écrit par `.json.tmp` + `sync_all` + renommage. Erreur : « Couldn't note the reset: … ».
- `why` : `signed_out` (déconnexion), un code du serveur (`revoked`, `bound_to_other_device`, `invalid_token`), `license_gone` (fin trouvée sans note), ou `unreadable` (fichier présent mais abîmé : la remise est due quand même).
- Écrit **avant** d'effacer le jeton (déconnexion) ou dès que le serveur le refuse ([[lib.rs]], `license_refresh`). Effacé quand tout ce qui pouvait être remis l'a été, ou quand la licence revient.

### `due` : faut-il remettre ?
1. Licence `active` (reconnexion) ou `unconfigured` (build sans serveur) → supprime la note, rien à faire.
2. Une note existe → la renvoie.
3. Licence `none` (pas de jeton valable) **et** des réglages `Premium` encore appliqués, ou le Packet Optimizer appliqué (`netopt::applied`) → écrit et renvoie `license_gone` (jeton effacé à la main, copié d'un autre PC, version d'avant).
4. Sinon rien. **Un jeton expiré hors ligne ne remet rien** : le joueur paie peut-être encore, le serveur le dira au prochain rafraîchissement.

Un joueur du plan gratuit qui n'a que des réglages gratuits n'est donc jamais remis à zéro.

### `Reset` : un seul tour à la fois
- `begin()` : faux si une remise tourne déjà (elle note `again` et refera un tour).
- `end()` : `None` si une demande est arrivée pendant le tour (refaire un tour) ; sinon `Some(quit)`, où `quit` dit si la fenêtre a été fermée pendant la remise.
- `hold_exit()` : appelée à la fermeture de la fenêtre ou par « Quitter » ; si une remise tourne, note `quit_after` et renvoie vrai (la fenêtre se cache, l'app quitte à la fin).
- `keep_open()` : l'app relancée pendant la fin de la remise (fenêtre remontrée par [[instance.rs]]) ne quitte plus à la fin.
- `noting(f)` : exécute `f` sous le verrou `note`. Il empêche qu'une remise lise la licence encore active entre l'effacement du jeton et l'écriture de la note (elle oublierait la fin).

### `uninstall()` : la remise de la désinstallation
1. `data_dir` = `%APPDATA%\<IDENTIFIER>` (repli `%TEMP%\RagoOptimizer`).
2. `clear_run` : supprime `run\` et `%SystemRoot%\Temp\<IDENTIFIER>` ([[assets.rs]]), avant, en cas de délai, et à la fin.
3. `session::undo_all` (mode d'alimentation d'avant, choix de carte graphique retirés) ; `display::undo_all` (niveaux de couleur, rampe gamma et résolution d'avant, valeurs d'avant Rago dans les fichiers de Valorant, Fortnite et CS2, profils effacés) ; `netopt::put_back` (valeurs d'avant le Packet Optimizer, délai borné dans [[netopt.rs]]).
4. `load_for_uninstall` : charge `history.json` et `applied.json` **comme au lancement de l'app** : `import_history` si `applied.json` n'existait pas, puis `repair::at_startup` ([[repair.rs]]). Sans ça, une version jamais lancée avant d'être désinstallée garderait un état d'avant à 0 pour `CoalescingTimerInterval` (PC passé par l'ancien `.bat`) et la remise l'écrirait : écran bleu 0x7E, et plus d'app pour réparer (RAG-67).
5. `targets(All)` ; si vide, fin.
6. `resource_dir` = `<dossier de l'exe>\resources`. Paquet Premium ouvert si la licence est encore active (`License::new().scripts_key()`), sinon les copies gardées dans `applied.json` ; `keep_undo`.
7. Contexte sans fenêtre (`app: None`), carte réseau de la sonde ([[system.rs]]).
8. **Garde-fou** : un fil attend `UNINSTALL_LIMIT` (15 min), puis `cancel` (tue le script en cours), attend 30 s, `clear_run`, et `process::exit(2)`. Ce qui n'est pas remis reste dans `applied.json` (et le point de restauration reste possible). Une remise complète prend d'habitude 1 à 5 minutes.
9. `runner.run_now(items)` puis `clear_run`.

## Données touchées
`reset-pending.json` (+ `.json.tmp`), `applied.json`, `history.json`, `logs\reset-<ms>.log`, `run\`, `%SystemRoot%\Temp\<identifiant>\`, et tout ce que les annulations remettent dans Windows.

## Erreurs et cas limites
- App tuée ou PC éteint pendant la remise : la note reste, la remise reprend au lancement suivant (`reset_after_license(None)` dans `setup`). Un réglage ne quitte `applied.json` qu'une fois remis.
- Licence revenue pendant la remise : `stop_when` de [[runner.rs]] arrête après le réglage en cours ; les suivants restent appliqués.
- Pendant une remise, `run_tweaks` renvoie `reset_running`, `netopt_run` et `update_install` renvoient `busy` ([[lib.rs]]).

## Tests
`license_end_puts_back_free_tweaks_too`, `license_end_skips_what_cannot_be_put_back`, `tweaks_without_automatic_undo_are_left_alone` (15 réglages, journal de la 1.1.13), `nvidia_profile_is_put_back_too`, `optifine_is_put_back_where_it_was_applied`, `license_end_is_noted_and_resumed`, `uninstall_never_puts_the_crashing_zero_back` (RAG-67), `uninstaller_hook_skips_updates_and_is_bounded` (lit `installer/hooks.nsh` : `$UpdateMode <> 1`, `$EXEDIR != $INSTDIR`, `$DeleteAppDataCheckboxState = 1` dans cet ordre, une seule `ExecWait`, limite ≤ 20 min), `delete_app_data_checkbox_is_read_before_the_hook` (m3 : lit le modèle NSIS dans la CLI de Tauri de `node_modules` ; sauté si `npm ci` n'a pas tourné), `closing_the_window_waits_for_the_reset`, `data_dir_and_uninstaller_match_the_app` (identifiant = `tauri.conf.json`, crochet = `installer/hooks.nsh`).

## À savoir avant de modifier
- La remise de fin de licence ne doit **jamais** montrer de fenêtre de suivi ni de bouton Arrêter : l'interface n'en voit que `reset:done` ([[Licence dans l'app]]).
- Ne jamais toucher à `UNINSTALL_LIMIT` au-delà de 20 min (test) : la désinstallation ne doit jamais rester bloquée.
- Si la CLI de Tauri change son modèle NSIS, `delete_app_data_checkbox_is_read_before_the_hook` échoue : revoir [[Installateur NSIS]].
