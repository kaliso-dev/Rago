---
type: code
tags: [code, app, rust, barre-en-jeu]
fichier: app/src-tauri/src/overlay.rs
lignes: 805
maj: 2026-11-11
---
# overlay.rs

La **barre en jeu** côté Rust : surveille le jeu au premier plan, prend le raccourci (Alt+X par défaut) à Windows pendant la partie, ouvre la fenêtre de la barre ou la pastille FPS/ping, et décide quand ne pas voler le premier plan au jeu. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Barre en jeu]] (Linear RAG-82).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Créée dans le `setup` de [[lib.rs]] (`Overlay::new(resource_dir, data_dir, library, background)`), surveillée par `overlay::watch` (fil `rago-overlay`). Le raccourci global appelle `overlay::on_shortcut`, et la perte de focus de la fenêtre `overlay` appelle `on_blur`.
- La fenêtre de la barre (label `overlay`, page `overlay.html`, interface [[Overlay.tsx]]) est créée **cachée au premier jeu vu** puis gardée : l'ouvrir est instantané.
- Les FPS viennent de [[fps.rs]] (PresentMon), le ping de [[gameping.rs]] ; le nom du jeu de [[games.rs]] (`Library::name_for`) ; les préférences (barre activée, raccourci, pastille gardée) de `background.rs`.
- Historique : créée le 17/10 (`6d5bf29`), ping Minecraft réel le 21/10, souris libérée et Lunar trouvé le 22/10, Alt+X et pastille à gauche le 22/10 (`0948426`), Rago OS jamais pris pour un jeu le 09/11 (`2d18b13`).

## Ce que le fichier expose

- `LABEL = "overlay"`.
- `Mode` (`hidden`, `panel`, `pill`), envoyé à la fenêtre par l'événement `overlay:mode`.
- `Target { hwnd, pid, name, minecraft, exe }` : le jeu suivi.
- `Info` (commande `overlay_info`) : `mode`, `game`, `shortcut`, `pin`, `fpsAvailable` (PresentMon livré avec l'app), `shortcutTaken` (raccourci refusé par Windows), `passive` (barre ouverte sans le premier plan).
- `Live` (commande `overlay_live`) : `fps` (au dixième), `ping` (ms), `pingEstimate` (ping mesuré jusqu'au dernier routeur).
- `game_name(exe, covers_screen, library) -> Option<String>` : nom du jeu, ou `None` si ce n'est pas un jeu.
- `Overlay` : `new`, `mode`, `last_match` (résumé de la dernière partie suivie, pour [[Analyse du PC]]), `info`, `live`, `toggle`, `open`, `close(refocus)`, `on_blur`.
- `watch(app, overlay)`, `on_shortcut(app)`.
- Commandes Tauri (dans [[lib.rs]]) : `overlay_info`, `overlay_live`, `overlay_close`, `overlay_set_pin(pin)` (enregistre la préférence), `overlay_open_app(page)` (ferme la barre, montre l'app et envoie `app:goto`).

## Fonctionnement détaillé

### Qu'est-ce qu'un jeu ? (`game_name`)

1. Jamais un jeu (`NEVER`, 21 exes) : `explorer.exe`, `ragoos.exe`, `rago-os.exe` (Rago OS remplace le bureau), `searchhost.exe`, `startmenuexperiencehost.exe`, `shellexperiencehost.exe`, `lockapp.exe`, `textinputhost.exe`, `applicationframehost.exe`, les navigateurs (`chrome`, `msedge`, `firefox`, `brave`, `opera`, `vivaldi`, `arc`) et les lecteurs vidéo (`vlc`, `mpc-hc64`, `mpc-be64`, `potplayermini64`, `wmplayer`).
2. Un exe dans le dossier d'un jeu de la bibliothèque → son nom ([[games.rs]]).
3. `KNOWN` : `javaw.exe` et `java.exe` → « Minecraft » (Java, tous les launchers), `minecraft.windows.exe` → « Minecraft » (Bedrock).
4. Sinon, une fenêtre qui couvre tout son écran (plein écran fenêtré, `covers_monitor` : classes `Progman`, `WorkerW`, `Shell_TrayWnd`, `Shell_SecondaryTrayWnd` exclues) → le nom de son exe.
La fenêtre de l'app elle-même n'est jamais un jeu.

### Surveillance (`tick`, toutes les 700 ms)

- Lit la fenêtre au premier plan (`GetForegroundWindow`, `QueryFullProcessImageNameW`). Garde le jeu suivi tant que sa fenêtre existe.
- Prépare la fenêtre de la barre dès qu'un jeu est vu.
- `sync_shortcuts` : le raccourci n'est pris à Windows que si la barre est activée dans les préférences **et** qu'un jeu est au premier plan (ou la barre ouverte) ; le reste du temps, il reste à l'app au premier plan. `Escape` est aussi pris tant que la barre est ouverte en mode passif. Un raccourci refusé (pris par une autre app) met `shortcutTaken` à vrai.
- Barre ouverte et jeu réduit pendant qu'elle avait le premier plan : `keep_game_up` (le jeu revient, la barre passe en mode passif, l'exe est retenu dans `overlay-games.json`).
- Plein écran exclusif Direct3D (`SHQueryUserNotificationState` = `QUNS_RUNNING_D3D_FULL_SCREEN`) : rien ne s'affiche par-dessus.
- Sinon, la barre ou la pastille repasse au-dessus (`keep_on_top`), car certains jeux en plein écran se remettent devant tout.
- **Pastille** (option « garder les stats à l'écran », préférence `pin`) : montrée quand le jeu est au premier plan **depuis 10 s** (`SETTLE`, le jeu change de mode d'affichage pendant son chargement), cachée sans jeu, sans option ou en plein écran exclusif. Elle ne prend ni le focus ni les clics (`set_ignore_cursor_events(true)`).
- `follow()` : les FPS ne sont mesurés que quand la barre ou la pastille est à l'écran.
- 15 s après le démarrage, la bibliothèque est lue une fois (jeux reconnus même si la page Bibliothèque n'a jamais été ouverte, lancement avec Windows).

### Ouvrir la barre (`open`)

1. Jeu au premier plan retenu.
2. **Mode passif** (`keeps_foreground`) si : Minecraft Java en plein écran (il se réduirait), un plein écran exclusif, ou un exe vu se réduire auparavant (`overlay-games.json`). La barre prend alors les clics mais pas le clavier ; le jeu garde le premier plan.
3. Minecraft en passif avec la souris capturée (`mouse_captured` : curseur caché ou non standard, ou enfermé dans une partie de l'écran) : la barre envoie **Échap** au jeu par son code de touche (`SendInput`, scan code `0x01`, car GLFW et LWJGL lisent le code et pas la touche virtuelle), ce qui ouvre le menu pause et libère le curseur ; 80 ms d'attente.
4. Placement : sur l'écran du jeu (celui qui contient le centre de sa fenêtre), barre de **780 × 600** points centrée en haut, pastille de **236 × 44** en haut à gauche (loin de la minicarte et des munitions), marge 18, multipliés par l'échelle de l'écran ; sur un petit écran la barre rétrécit (sa liste défile).
5. Mode `panel`, raccourcis mis à jour.

### Fermer (`close`, `on_blur`, `toggle`)

- Le raccourci (`toggle`), Échap (mode passif), ✕ ou `overlay_close` ferment la barre ; le jeu reprend le premier plan (`bring_back` : restaure s'il est réduit, puis `SetForegroundWindow`).
- Un clic dans le jeu (la fenêtre de la barre perd le focus) la ferme sans redonner le focus (le jeu l'a déjà) ; sans effet en mode passif.
- La pastille revient au tour suivant si l'option est active.
- Le raccourci est traité **sur un autre fil** (`on_shortcut`) : créer ou montrer une fenêtre depuis le fil principal pendant un événement peut bloquer sous Windows.

### Rappel des conseils (PR #91, 11/11, pas encore dans `staging`, jamais testé sur Windows)
- `Overlay::new` reçoit aussi la `Session` ([[session.rs]]). À chaque tour, quand le jeu est installé au premier plan (`SETTLE`, 10 s), que la barre est activée et qu'il n'y a pas de plein écran exclusif : si ce processus du jeu n'a pas encore eu son rappel (`nudged` ≠ son pid), qu'il est arrivé au premier plan il y a moins de `SETTLE + NUDGE_WINDOW` (10 s + 120 s) et que `session.has_advice(prefs)` dit qu'il y a quelque chose à signaler, le rappel dure `NUDGE` (**12 s**, `nudge_until`).
- Pendant le rappel, la pastille est montrée même si le joueur ne la garde pas à l'écran (`wanted = overlay && (pin || rappel) && !exclusif`), à la taille `NUDGE_SIZE` (**380 × 44** points au lieu de 236 × 44) ; début et fin du rappel replacent la pastille (`show_pill`), qui envoie `overlay:nudge` (vrai ou faux) à la fenêtre ; `Info.nudge` donne l'état à l'ouverture. Ouvrir la barre (`open`) arrête le rappel. Texte affiché : [[Overlay.tsx]]. Fonctionnalité : [[Conseils au lancement du jeu]].

## Données touchées

- `overlay-games.json` (dossier de données) : liste des exes vus se réduire.
- `last-match.json` : résumé de la dernière partie, écrit par [[fps.rs]] (`keep_matches_in`).
- Raccourcis globaux Windows (`tauri_plugin_global_shortcut`), fenêtre `overlay`.
- Événements : `overlay:mode` vers la fenêtre de la barre ; `app:goto` vers `main` (par `overlay_open_app`).
- Entrée clavier simulée (Échap) envoyée au jeu au premier plan.

## Erreurs et cas limites

- Hors Windows, le module `win` est une coquille vide (tests sous Linux).
- La fenêtre ne peut pas se créer : message `[overlay] …` et la barre ne s'ouvre pas.
- Échap refusé par Windows : la barre se ferme alors seulement par le raccourci ou ✕ (pas de nouvel essai à chaque tour).
- Ping par Rago Route : le jeu se connecte alors à `localhost`, que [[gameping.rs]] écarte ; la barre n'affiche sans doute pas de ping pendant une partie par Rago Route. À VÉRIFIER (déduit du code, pas observé).

## Liens avec le reste

- Appelle [[fps.rs]], [[gameping.rs]], [[games.rs]], `background.rs` ; appelée par [[lib.rs]] et [[bridge.rs]] (`live`).
- Interface : [[Overlay.tsx]] ; fonctionnalité : [[Barre en jeu]] ; ce que l'app fait pendant la partie : [[Pendant la partie]] et [[session.rs]].

## Tests

- `recognizes_games` : `javaw.exe` de Lunar → Minecraft ; exe dans le dossier de VALORANT → VALORANT ; fenêtre plein écran inconnue → nom de l'exe ; fenêtre normale → rien ; `explorer.exe` et `chrome.exe` en plein écran → rien.
- `default_shortcut_parses` : `Alt+X` (défaut), `Alt+F9` et `Escape` sont des raccourcis valides ; `Ctrl+Shift+` ne l'est pas.

## À savoir avant de modifier

- Ne jamais prendre le premier plan à Minecraft en plein écran ni à un jeu en plein écran exclusif : ils se réduisent.
- Ne jamais afficher la pastille par-dessus un plein écran exclusif : invisible, elle pourrait le faire sortir de son plein écran.
- Ajouter un exe à `NEVER` pour tout programme plein écran qui n'est pas un jeu (Rago OS y est depuis le 09/11).
- L'ancien raccourci par défaut était `Ctrl+Shift+R` (`OLD_DEFAULT_SHORTCUT` dans `background.rs`).
