---
type: code
tags: [code, app, rust, souris]
fichier: app/src-tauri/src/mouse.rs
lignes: 107
maj: 2026-11-11
---
# mouse.rs

Le moteur de la carte « Entre ta souris et le jeu » de la [[Page Souris]] : quels logiciels de remappage, de macro, de clic automatique ou du fabricant de la souris tournent. **Lecture seule** : il ne ferme rien, n'installe aucun crochet, n'envoie aucune entrée. Fiche parente : [[Code de l'app (Rust)]].

**Fichier ajouté le 11/11 (PR #NN vers `staging`), jamais testé sur Windows.** CONFIRMÉ (code de la branche, 11/11).

## Ce que le fichier expose
- `Kind` (sérialisé en minuscules) : `remap` (X-Mouse Button Control), `script` (AutoHotkey), `autoclick` (clic automatique), `vendor` (logiciel du fabricant).
- `MouseApp { name, kind }` : nom affiché et genre.
- `detect(exes) -> Vec<MouseApp>` : compare le nom de fichier de chaque exe (en minuscules, coupé à la main sur `\` et `/` pour que les tests passent hors Windows) à la table `KNOWN` ; un logiciel n'apparaît qu'une fois même s'il a plusieurs exes ; tri : d'abord les risqués, puis ceux du fabricant, puis par nom.
- `running()` : `detect(games::process_paths())` ([[games.rs]], la même liste de processus que la bibliothèque de jeux).

## Table `KNOWN`
`xmousebuttoncontrol.exe` ; `autohotkey.exe`, `autohotkey32.exe`, `autohotkey64.exe`, `autohotkeyu32.exe`, `autohotkeyu64.exe`, `autohotkeya32.exe`, `autohotkeyux.exe` ; `tinytask.exe`, `gsautoclicker.exe`, `autoclicker.exe` ; `lghub.exe`, `lghub_agent.exe` (Logitech G HUB), `logioptionsplus_agent.exe`, `razer synapse 3.exe`, `razer synapse service.exe`, `razerappengine.exe` (Razer Synapse), `steelseriesgg.exe`, `icue.exe`, `glorious core.exe`.

## Utilisé par
- Commande `mouse_apps` de [[lib.rs]] (async, `spawn_blocking`), appelée par `api.mouseApps()` ([[api.ts]]) depuis [[Mouse.tsx]].

## Tests
- `finds_known_apps_once_risky_first` (G HUB en deux exes compté une fois, AutoHotkey et XMBC avant G HUB) ; `ignores_unknown_apps`. Lancés hors Windows dans une copie du module le 11/11 (2 passent) ; `cargo test` complet seulement sur Windows (CI).
