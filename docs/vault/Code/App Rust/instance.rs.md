---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/instance.rs
lignes: 283
maj: 2026-11-10
---
# instance.rs

**Une seule Rago Optimizer à la fois** dans la session Windows, par un mutex nommé ; un 2e lancement ramène la fenêtre de la première au premier plan. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Arrière-plan et démarrage]], [[Remise à zéro]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 15/10 ([[Version 1.1.14]]). Raison : deux fenêtres ouvertes gardaient chacune son `applied.json` en mémoire (le dernier enregistrement gagnait, les sauvegardes de l'autre étaient perdues) et lançaient chacune sa remise de fin de Premium.

## Rôle et place dans l'ensemble
Appelé tout au début de `run()` dans [[lib.rs]], avant Tauri : `acquire`, puis `starts`, sinon `show_other`. Dans `setup`, `on_show_request` relie la demande d'un 2e lancement à `reset.keep_open()` + affichage de la fenêtre ([[reset.rs]]). Le verrou est gardé jusqu'à la fin du processus.

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `UNINSTALL_WAIT = 30 s` | attente maximale du verrou par la remise de la désinstallation |
| `enum Lock { Mine(Guard), Busy, Unavailable }` | verrou pris, tenu par une autre instance, impossible à créer |
| `Lock::starts(uninstall) -> bool` | ce lancement continue : toujours pour la désinstallation, sinon seulement si pas `Busy` |
| `acquire(wait) -> Lock` | mutex `Local\<identifiant>.instance` (staging : `Local\gg.rago.optimizer.staging.instance`) |
| `on_show_request(show)` | écoute l'événement nommé `Local\<identifiant>.show` dans un fil et appelle `show` à chaque demande |
| `show_other()` | demande à l'autre instance de se montrer, et la met au premier plan |

## Fonctionnement détaillé
- `acquire_named` : `CreateMutexW` puis `WaitForSingleObject(wait)`. `WAIT_OBJECT_0` ou `WAIT_ABANDONED` (instance tuée ou plantée sans rendre le verrou) → `Mine`. `WAIT_TIMEOUT` → `Busy`. `CreateMutexW` qui échoue avec `ERROR_ACCESS_DENIED` (créé par un processus qu'on ne peut pas ouvrir) → `Busy` ; autre échec → `Unavailable` (l'app démarre comme avant : jamais bloquée par le verrou lui-même). Windows rend le mutex dès que le processus se termine.
- `Guard` : `ReleaseMutex` + `CloseHandle` à sa destruction.
- Désinstallation (`--reset-tweaks`) : le désinstallateur a déjà fermé l'app (`CheckIfAppIsRunning` dans [[Installateur NSIS]]). La remise attend au plus 30 s puis passe quand même. Tenu pendant la remise, le verrou empêche une fenêtre ouverte entre-temps de lancer ses propres lots.
- `on_show_request` : `CreateEventW` en **auto-reset** (une demande = un affichage), boucle `WaitForSingleObject(INFINITE)`.
- `show_other` :
  1. `request_show` : `OpenEventW` + `AllowSetForegroundWindow(ASFW_ANY)` (ce lancement vient du joueur, il autorise l'autre à passer devant) + `SetEvent` ;
  2. cherche la fenêtre de l'autre instance 12 fois toutes les 250 ms (3 s) par `other_window` ; la restaure si réduite (`SW_RESTORE`) et `SetForegroundWindow` ;
  3. rien de visible au bout de 3 s (remise de la désinstallation, fenêtre pas encore créée) : `MessageBoxW` avec `BUSY_MESSAGE`, en français puis en anglais (l'interface n'est pas chargée) : « Rago Optimizer est déjà ouvert, ou il finit de remettre des réglages de Windows en arrière-plan. Réessaie dans quelques minutes (redémarre ton PC si ça dure). »
- `other_window` : `EnumWindows` ; garde une fenêtre visible, sans propriétaire, qui **n'est pas** une fenêtre outil (`WS_EX_TOOLWINDOW` : la pastille de la [[Barre en jeu]]), d'un autre processus dont l'exe porte le même nom (`QueryFullProcessImageNameW`, en minuscules).

## Données touchées
Objets noyau nommés `Local\<identifiant>.instance` et `Local\<identifiant>.show` (session Windows courante). Aucun fichier.

## Tests
`only_a_second_window_is_stopped` (et `UNINSTALL_WAIT` < `UNINSTALL_LIMIT / 10`), `the_lock_is_held_then_given_back` (Windows : tenu, refusé, rendu, abandonné puis repris).

## À savoir avant de modifier
- Préfixe `Local\` : le verrou vaut pour la session Windows, pas pour tout le PC. Deux comptes Windows connectés en même temps peuvent donc chacun ouvrir Rago, chacun avec son propre `%APPDATA%` (cas que le code ne traite pas à part).
- L'identifiant vient de [[build.rs]] (`RAGO_IDENTIFIER`) : l'exe de test et le vrai ont chacun leur verrou et peuvent tourner en même temps.
