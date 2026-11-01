---
type: technique
tags: [technique, app]
maj: 2026-11-01
---
# App Windows (`app/`)

Voir [[Architecture]] et [[Historique des versions]].

## Navigation (barre latérale)
- **Tableau de bord** ([[Tableau de bord]])
- **Optimiser** : Réseau (onglets Optimisations, [[Packet Optimizer]], [[Test réseau]]) · Latence · Carte graphique · Windows · [[Page Outils]]
- **En jeu** : Hitreg · Minecraft · [[RBW Mod]] · [[Mode jeu]] · Jeux ([[Bibliothèque de jeux]])
- **Avancé** : Mode expert · Restaurer (historique, retour arrière)
- En bas : carte « Plan gratuit » ([[Licence dans l'app]]), « Rejoindre le Discord », Paramètres ([[Paramètres de l'app]]), état administrateur.
- Recherche de tweak (palette), [[Barre en jeu]] (fenêtre séparée `overlay.html`), icône près de l'horloge ([[Arrière-plan et démarrage]]).
Contenu des modules : [[Catalogue des tweaks]]. Fonctionnement interne : [[Moteur des tweaks]], [[Réparations au lancement]], [[Pendant la partie]], [[Partage et support]].

## Stack
- **Tauri 2** (Rust, edition 2021) + **React 19 / TypeScript / Vite**, affichée par WebView2. Identifiant `gg.rago.optimizer` (staging : `gg.rago.optimizer.staging`). Installateur **NSIS** en anglais, `perMachine`, droits administrateur à chaque lancement. Fenêtre min 1080×680. Le front n'a pas d'accès réseau (CSP `connect-src ipc:`) : tout passe par les commandes Rust.
- Version : `npm run bump X.Y.Z` (ne pas éditer `tauri.conf.json`).
- Pas de signature de code : avertissement SmartScreen, et **Smart App Control de Windows 11 bloque l'app au lancement** (RAG-83, RAG-84). Prévue, mais pas avant d'avoir le budget (Sofiene, 01/11).

## Modules Rust (`app/src-tauri/src/`, 1.2.x)
- Cœur : `lib.rs` (commandes), `runner.rs` (exécute un lot : `.cmd` caché dans `run\`, journal `logs\run-<ms>.log`), `catalog.rs`, `seal.rs` (scripts chiffrés), `backup.rs` (`applied.json`, état d'avant, chiffré DPAPI), `history.rs`, `reset.rs` / `repair.rs` ([[Remise à zéro]]), `instance.rs`, `license.rs`, `account.rs`, `shell.rs`, `reg.rs`.
- Système : `system.rs`, `stats.rs`, `memory.rs`, `minecraft.rs` (OptiFine), `tools.rs` ([[Page Outils]]), `rbw.rs` ([[RBW Mod]]), `background.rs` (icône près de l'horloge, démarrage avec Windows).
- 1.2 : `overlay.rs`, `fps.rs`, `gameping.rs`, `mcping.rs`, `session.rs` ([[Barre en jeu]]) ; `games.rs`, `icon.rs`, `assets.rs` ([[Bibliothèque de jeux]]) ; `netopt.rs` ([[Packet Optimizer]]) ; `nettest.rs`, `icmp.rs`, `netshare.rs` ([[Test réseau]]) ; `flows.rs`, `report.rs` ; `update.rs` ([[Mise à jour automatique]]).
- Pages React : `Dashboard`, `Games`, `ModulePage`, `Network`, `NetOpt`, `NetTest`, `Share`, `Tools`, `Settings`. FR/EN (`lib/i18n.ts`, anglais par défaut, tutoiement en français).

## Fichiers écrits sur le PC
`%LOCALAPPDATA%\Rago\license.bin`, `scripts.bin`, `account.bin` (DPAPI) ; `%APPDATA%\gg.rago.optimizer\applied.json`, `history.json`, `logs\`, `backup\*.reg`. Les logs d'un joueur : `%APPDATA%\gg.rago.optimizer\logs` ([[Problèmes joueurs]]).

## Licence côté app
Jeton JWT EdDSA de 30 jours vérifié hors ligne, rafraîchi s'il expire dans moins de 7 jours ; empreinte PC = 2 sur 3 parmi MachineGuid, UUID SMBIOS, n° de série carte mère. Voir [[Serveur de licences]] et [[Clés et secrets]].

## Ressources natives
Plan d'alimentation `LowLatency.pow` (Rago Low Latency), profil NVIDIA `.nip` + `nvidiaProfileInspector.exe` (provenance non documentée), PresentMon (ajouté par la CI).

## Tests
`cargo test --manifest-path src-tauri/Cargo.toml`, `npm run build`, CI `app-windows` (tests Windows + build). Les vrais tests se font sur le PC de Sofiene ou une VM.
