---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/background.rs
lignes: 297
maj: 2026-11-11
---
# background.rs

**Mode arrière-plan** (RAG-82) : icône près de l'horloge, fermeture qui cache au lieu de quitter, lancement caché avec Windows par une tâche planifiée, et les préférences de la barre en jeu et de la session de jeu. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Arrière-plan et démarrage]], [[Barre en jeu]], [[Pendant la partie]], [[Paramètres de l'app]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 17/10 (RAG-82) ; le 21/10, lancement avec Windows activé d'office.

## Rôle et place dans l'ensemble
- [[lib.rs]] : `Background::load` dans `setup`, `sync_tray`, création de la tâche au premier lancement, `hides_on_close` à la fermeture, commandes `background_get`, `background_set`, `session_set_prefs`, `overlay_set_pin`, `show_main` (icône, raccourci, 2e lancement, pont Rago OS).
- [[overlay.rs]] lit `overlay`, `shortcut`, `pin` ; [[session.rs]] lit `game_gpu`, `game_power`, `game_checks`, `game_priority` à chaque tour du fil des jeux.
- L'[[Installateur NSIS]] supprime la tâche planifiée à la désinstallation.

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `BACKGROUND_ARG = "--background"` | argument du lancement avec Windows : la fenêtre reste cachée |
| `DEFAULT_SHORTCUT = "Alt+X"` | depuis la 1.2.0. L'ancien `Ctrl+Shift+R` est remplacé au chargement : avec lui, Échap tapé avant de lâcher Ctrl et Maj ouvrait le Gestionnaire des tâches (Ctrl+Maj+Échap) au lieu de fermer la barre |
| `struct Prefs` | préférences (JSON camelCase, champs manquants = défauts) |
| `Prefs::keeps_running()` | `tray \|\| autostart` : l'icône est nécessaire |
| `struct Background {path, prefs, started_hidden}` | `started_hidden` : lancée avec `--background` (l'icône reste même si l'option a été coupée depuis) |
| `Background::load(data_dir, started_hidden)`, `prefs()`, `save(prefs)` | fichier `background.json` |
| `hides_on_close()` | `keeps_running() \|\| started_hidden` |
| `show_main(app)` | `show`, `unminimize`, `set_focus` de la fenêtre `main` |
| `sync_tray(app, show, lang, on_quit)` | crée ou retire l'icône |
| `task_xml(exe, user)` | XML de la tâche planifiée |
| `set_autostart(name, on, temp_dir)` | crée ou supprime la tâche |
| `autostart_exists(name)` | `schtasks.exe /Query /TN <name>` réussit |

### `Prefs` et leurs défauts
| Champ | Défaut | Sens |
|---|---|---|
| `tray` | `true` | fermer la fenêtre laisse Rago près de l'horloge |
| `autostart` | `true` | lancer Rago caché à l'ouverture de session |
| `autostart_chosen` | `false` | le joueur a lui-même changé l'option ; **tant que c'est faux, `load` force `autostart` et `tray` à vrai** |
| `overlay` | `true` | le raccourci ouvre la [[Barre en jeu]] |
| `shortcut` | `"Alt+X"` | raccourci global (validé par `tauri_plugin_global_shortcut::Shortcut` dans `background_set`) |
| `pin` | `false` | FPS et ping gardés à l'écran pendant la partie, sans prendre les clics |
| `lang` | `"fr"` | langue du menu de l'icône (`background_set` n'accepte que `en` ou `fr`) |
| `game_gpu` | `true` | carte graphique performante pour les jeux (PC à deux cartes) |
| `game_power` | `true` | mode Performances élevées le temps de jouer |
| `game_checks` | `true` | vérifications au lancement d'un jeu (conseils, rien n'est fermé) |
| `game_priority` | `true` | processus du jeu en priorité haute le temps de jouer (11/11, pas encore dans `staging`) |

## Fonctionnement détaillé

### Icône près de l'horloge
`sync_tray` retire l'icône d'id `rago`, puis, si `show`, la recrée : info-bulle = nom de l'app, icône de la fenêtre, menu « Ouvrir Rago Optimizer » / séparateur / « Quitter » (« Open Rago Optimizer » / « Quit » si `lang = en`), menu **pas** ouvert au clic gauche ; **clic gauche relâché → `show_main`** ; « Quitter » appelle `quit` de [[lib.rs]] (qui attend une remise en cours et installe une mise à jour prête). Erreur → `eprintln!("[tray] …")`.

### Lancement avec Windows
Une **tâche planifiée** plutôt que la clé `Run` du registre : la clé `Run` ne lance pas une app qui demande les droits administrateur. Nom de la tâche = nom de l'app (`productName` : « Rago Optimizer », staging « Rago Optimizer Staging »).

`task_xml` : déclencheur `LogonTrigger` pour l'utilisateur `DOMAINE\nom` (ou `nom`), **délai `PT10S`** ; `LogonType InteractiveToken`, **`RunLevel HighestAvailable`** ; `MultipleInstancesPolicy IgnoreNew` ; démarre et continue **sur batterie** ; pas de condition de réseau ni d'inactivité ; `ExecutionTimeLimit PT0S` (sans limite de durée) ; `Priority 7` ; action = exe actuel avec l'argument `--background`. Les caractères `& < > "` sont échappés.

`set_autostart(name, true, data_dir)` écrit ce XML en **UTF-16 LE avec BOM** dans `<data_dir>\rago-autostart.xml`, lance `schtasks.exe /Create /TN <name> /XML <fichier> /F`, efface le fichier. `set_autostart(name, false, …)` lance `schtasks.exe /Delete /TN <name> /F` (une tâche déjà absente n'est pas une erreur). L'erreur rendue est la sortie d'erreur de `schtasks`.

Au démarrage ([[lib.rs]]) : si `prefs.autostart` et pas en debug, la tâche est créée dans un fil si elle n'existe pas. Avec `autostart_chosen = false` (cas par défaut), le lancement avec Windows est donc activé d'office jusqu'à ce que le joueur le coupe.

## Données touchées
`<data_dir>\background.json` (JSON lisible, `to_vec_pretty`), `<data_dir>\rago-autostart.xml` (temporaire), tâche planifiée `\Rago Optimizer` (ou `\Rago Optimizer Staging`), icône de la zone de notification.

## Tests
`prefs_fill_missing_fields` (défauts, autostart forcé sauf choix du joueur, ancien raccourci migré, raccourci choisi gardé), `task_runs_hidden_elevated_without_time_limit` (chemin avec espaces, `--background`, `HighestAvailable`, `PT0S`, batterie, échappement de `&`).

## À savoir avant de modifier
- `background_set` ([[lib.rs]]) ne doit jamais écraser `game_gpu`, `game_power`, `game_checks`, `game_priority` (réglés à part) : il recopie ceux de l'ancienne copie.
- Changer le nom de l'app change le nom de la tâche : l'ancienne resterait. L'installateur supprime la tâche par `${PRODUCTNAME}`.
