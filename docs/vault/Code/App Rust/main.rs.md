---
type: code
tags: [code, app, rust]
fichier: app/src-tauri/src/main.rs
lignes: 6
maj: 2026-11-10
---
# main.rs

Point d'entrée de l'exécutable `Rago Optimizer.exe` : il appelle seulement `rago_hub_lib::run()`, défini dans [[lib.rs]]. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnement : [[Architecture de l'app]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (1.1.5).

## Ce que le fichier contient
- `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` : en build release, l'exe est une application fenêtrée, **sans console noire** derrière la fenêtre. En debug (`npm run tauri dev`), la console reste, pratique pour lire les `eprintln!` (par exemple `[autostart] …` de [[background.rs]]).
- `fn main() { rago_hub_lib::run() }`.

## Pourquoi un fichier si court
Le code vit dans la bibliothèque `rago_hub_lib` (crate-types `staticlib`, `cdylib`, `rlib`, voir [[Cargo.toml]]) : c'est le modèle standard de Tauri 2, qui permet aussi une cible mobile (`#[cfg_attr(mobile, tauri::mobile_entry_point)]` sur `run()`, non utilisée). Les tests (`cargo test`) compilent la bibliothèque sans passer par ce fichier.

## À savoir avant de modifier
- Ne rien ajouter ici : tout le démarrage (verrou d'instance, désinstallation `--reset-tweaks`, plugins, fils) est dans `run()` de [[lib.rs]].
- Le manifeste Windows (administrateur, contrôles communs v6) n'est pas ici mais dans `app.manifest`, intégré par [[build.rs]] (voir [[Configuration Tauri]]).
