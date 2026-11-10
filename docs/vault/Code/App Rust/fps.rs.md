---
type: code
tags: [code, app, rust, barre-en-jeu, fps]
fichier: app/src-tauri/src/fps.rs
lignes: 286
maj: 2026-11-10
---
# fps.rs

Mesure des **FPS du jeu en cours** pour la barre en jeu, par l'outil PresentMon d'Intel, et **résumé de la dernière partie** (FPS moyen, 1 % low, saccades par minute) pour l'analyse du PC. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Barre en jeu]] et [[Analyse du PC]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble

- Un objet `Fps` vit dans [[overlay.rs]]. La barre appelle `follow(resource_dir, Some(pid))` quand la barre ou la pastille est à l'écran, `follow(…, None)` sinon ; `value()` donne les FPS affichés (`overlay_live`).
- PresentMon (Intel, licence MIT) lit les images que le jeu présente à l'écran par les traces ETW de Windows, **sans toucher au jeu**. Il n'est pas dans git : le workflow `app-windows.yml` le télécharge à chaque fabrication depuis les publications GitHub de `GameTechDev/PresentMon` et le copie en `src-tauri/resources/PresentMon.exe` (avec sa licence `PresentMon-LICENSE.txt`). S'il manque (exe de développement, téléchargement raté), la barre affiche « — » (`fpsAvailable = false`). Voir [[CI GitHub Actions]].
- Le résumé de partie est lu par l'analyse du PC (`Overlay::last_match`, puis `analysis.ts` côté interface) et comparé dans l'avant/après ([[Version 1.3.0]]).

## Ce que le fichier expose

- `EXE = "PresentMon.exe"`.
- `frame_column(header) -> Option<usize>` : colonne des millisecondes entre deux images dans l'en-tête CSV (`FrameTime` pour PresentMon 2.x, `MsBetweenPresents` ou `msBetweenPresents` pour 1.x).
- `fps_of(frames) -> Option<f64>` : `nombre d'images × 1000 / somme des ms`.
- `MatchSummary { at, minutes, fps, low1, stuttersPerMin }` (sérialisé `camelCase`) : début de la partie (ms depuis 1970), durée (au dixième de minute), FPS moyen, **1 % low** (FPS des 1 % d'images les plus lentes), saccades par minute (au dixième).
- `Fps` : `available(resource_dir)`, `keep_matches_in(file)`, `last_match()`, `follow(resource_dir, pid)`, `value()`.

## Fonctionnement détaillé

### Lancement de PresentMon (`start`)

Commande cachée (`shell::hidden`) : `PresentMon.exe --process_id <pid> --output_stdout --stop_existing_session --terminate_on_proc_exit --session_name RagoOptimizerFps`. La session ETW porte le nom `RagoOptimizerFps` : une session laissée par un arrêt brutal est reprise au lancement suivant (`--stop_existing_session`). La sortie standard est lue ligne par ligne par un fil `rago-fps` : la première ligne donne la colonne, chaque ligne suivante un temps d'image (> 0). Les temps sont gardés avec leur heure de réception (au-delà de 4 096, on n'en garde que 2 048).

### Valeur affichée (`value`)

- Rien si aucune image depuis **3 s** (`STALE` : jeu en pause ou réduit).
- Sinon les FPS sur la **dernière seconde reçue** (`WINDOW = 1 s`), pas la dernière seconde d'horloge : PresentMon écrit par paquets.

### Suivi (`follow`)

- Si PresentMon s'est arrêté, ou si le jeu suivi change, la partie en cours est terminée (`finish`) et l'outil arrêté (`kill` + `wait` à la destruction du `Tracker`).
- Un échec de lancement ou un arrêt pour un jeu bloque les nouveaux essais pour ce même jeu pendant **20 s** (`RETRY`), pour ne pas relancer en boucle.

### Résumé de partie (`Histogram`, `summary`)

- Tous les temps d'image de la partie vont dans un histogramme fixe : tranches de **0,05 ms** jusqu'à **200 ms** (4 001 cases), mémoire constante même pour des heures à 500 FPS.
- Résumé seulement pour une partie d'**au moins 600 images et 60 s** (sinon trop court pour vouloir dire quelque chose).
- Médiane = quantile 0,5 ; 1 % low = `1000 / quantile 0,99` ; **saccade** = image plus longue que `max(2,5 × médiane, 20 ms)`.
- `finish` écrit le résumé (JSON indenté) dans le fichier donné par `keep_matches_in` : `last-match.json` du dossier de données de l'app. Il remplace le précédent.

## Données touchées

- Lance le processus `PresentMon.exe` (session ETW `RagoOptimizerFps`).
- Écrit `last-match.json` (dossier de données de l'app) à la fin de chaque partie suivie d'au moins une minute.

## Erreurs et cas limites

- Sans `PresentMon.exe` dans `resources\`, aucune mesure, aucun résumé.
- Les FPS ne sont mesurés que quand la barre ou la pastille est à l'écran : une partie jouée sans pastille ni barre ouverte n'a pas de résumé (CONFIRMÉ par `follow` dans [[overlay.rs]]).
- Plein écran exclusif : la pastille n'est pas montrée, donc pas de mesure sauf barre ouverte.

## Liens avec le reste

- Appelé par [[overlay.rs]] ; utilise `shell.rs` (`hidden`) ; résumé lu par l'analyse du PC (`analysis.rs`, [[Analyse du PC]]).
- Fabrication : [[CI GitHub Actions]] (workflow `app-windows.yml`).

## Tests

- `reads_both_csv_formats` : colonne `FrameTime` (2.x) et `MsBetweenPresents` (1.x), en-tête d'erreur → rien.
- `match_summary` : partie trop courte → rien ; 2 minutes à 250 FPS avec 1 % d'images à 10 ms et 24 saccades de 40 ms → ≈ 246 FPS, 1 % low = 100, ≈ 11,9 saccades/min, médiane 4,025 ms.
- `fps_from_frame_times` : 4 × 4 ms → 250 FPS ; 16/17/17 ms → 60 FPS.

## À savoir avant de modifier

- Ne jamais injecter quoi que ce soit dans le jeu : la mesure doit rester extérieure (ETW).
- Garder le nom de session `RagoOptimizerFps` : il permet de reprendre une session orpheline.
- La règle des saccades (2,5 × médiane, 20 ms au moins) est aussi celle affichée dans l'analyse ; la changer change les chiffres comparés dans l'avant/après.
