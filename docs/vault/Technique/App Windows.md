---
type: technique
tags: [technique, app]
maj: 2026-11-11
---
# App Windows (`app/`)

Vue produit de l'app (écrans, stack, fichiers). Fonctionnement interne précis (démarrage, 76 commandes sur `staging` et 82 avec la PR #90 de la page Outils, événements, scellement) : [[Architecture de l'app]]. Code fichier par fichier : [[Code de l'app (Rust)]]. Voir aussi [[Architecture]], [[Historique des versions]], [[Développer et tester]].

## Navigation (barre latérale)
- **Tableau de bord** ([[Tableau de bord]]) · **Analyse du PC** ([[Analyse du PC]], 1.3.0 sur `staging`)
- **Optimiser** : Réseau (onglets Optimisations, [[Packet Optimizer]], [[Test réseau]], et « Rago Route » (badge « Beta »), dans tous les exe sur `staging` depuis la PR #76, réservé au Premium (sur `staging` le 08/11 ; protocole 2 avec chiffrement, paquets de secours et 4G du téléphone sur `staging` le 08/11) : voir [[Proxy]]) · Latence · Carte graphique · Windows · [[Page Outils]]
- **En jeu** : Hitreg · Minecraft · [[RBW Mod]] · [[Mode jeu]] · Jeux ([[Bibliothèque de jeux]])
- **Avancé** : Mode expert · Restaurer (historique, retour arrière)
- En bas : carte « Plan gratuit » ([[Licence dans l'app]]), « Rejoindre le Discord », Paramètres ([[Paramètres de l'app]]), état administrateur.
- Recherche de tweak (palette), [[Barre en jeu]] (fenêtre séparée `overlay.html`), icône près de l'horloge ([[Arrière-plan et démarrage]]).
Contenu des modules : [[Catalogue des tweaks]]. Fonctionnement interne : [[Moteur des tweaks]], [[Réparations au lancement]], [[Pendant la partie]], [[Partage et support]].

## Stack
- **Tauri 2** (Rust, edition 2021) + **React 19 / TypeScript / Vite**, affichée par WebView2. Identifiant `gg.rago.optimizer` (staging : `gg.rago.optimizer.staging`). Installateur **NSIS** en anglais, `perMachine`, droits administrateur à chaque lancement. Fenêtre min 1080×680. Le front n'a pas d'accès réseau (CSP `connect-src ipc:`) : tout passe par les commandes Rust.
- Version : `npm run bump X.Y.Z` (ne pas éditer `tauri.conf.json`).
- Pas de signature de code : avertissement SmartScreen, et **Smart App Control de Windows 11 bloque l'app au lancement** (RAG-83). Prévue, mais pas avant d'avoir le budget (Sofiene, 01/11).

## Modules Rust (`app/src-tauri/src/`, `staging` 1.3.0)
- Cœur : `lib.rs` (commandes), `runner.rs` (exécute un lot : `.cmd` caché dans `run\`, journal `logs\run-<ms>.log`), `catalog.rs`, `seal.rs` (scripts chiffrés), `assets.rs` (plan d'alimentation et profil NVIDIA chiffrés dans l'exe, 1.1.14), `backup.rs` (`applied.json`, état d'avant, chiffré DPAPI), `history.rs`, `reset.rs` ([[Remise à zéro]]) / `repair.rs` ([[Réparations au lancement]]), `instance.rs`, `license.rs`, `account.rs`, `shell.rs`, `reg.rs`.
- Système : `system.rs`, `stats.rs`, `memory.rs`, `minecraft.rs` (OptiFine), `tools.rs` ([[Page Outils]]), `rbw.rs` ([[RBW Mod]]), `background.rs` (icône près de l'horloge, démarrage avec Windows).
- 1.2 : `overlay.rs`, `fps.rs`, `gameping.rs`, `mcping.rs`, `session.rs` ([[Barre en jeu]]) ; `games.rs`, `icon.rs` ([[Bibliothèque de jeux]]) ; `netopt.rs` ([[Packet Optimizer]]) ; `nettest.rs`, `icmp.rs`, `netshare.rs` ([[Test réseau]]) ; `flows.rs`, `report.rs` ; `update.rs` ([[Mise à jour automatique]]).
- 1.3 et `staging` : `analysis.rs` ([[Analyse du PC]]), `boost.rs` (Mode jeu total), `bridge.rs` (pont local avec [[Rago OS]]), `route.rs` (Rago Route, [[Infrastructure Rago Route]]). `main.rs` ne fait qu'appeler `lib.rs`.
- Pages React (`app/src/pages/`) : `Dashboard`, `Analysis`, `Games`, `ModulePage`, `Network`, `NetOpt`, `NetTest`, `RouteTab`, `Share`, `Tools`, `Settings`. FR/EN (`lib/i18n.ts`, anglais par défaut, tutoiement en français).

## Fichiers écrits sur le PC
`%LOCALAPPDATA%\Rago\license.bin`, `scripts.bin`, `account.bin` (DPAPI) ; `%APPDATA%\gg.rago.optimizer\applied.json`, `history.json`, `logs\`, `backup\*.reg`, et les autres fichiers listés dans [[Code de l'app (Rust)]] (section « Les fichiers sur disque »). Les logs d'un joueur : `%APPDATA%\gg.rago.optimizer\logs` ([[Problèmes joueurs]]).

## Licence côté app
Jeton JWT EdDSA de 30 jours (`LICENSE_TOKEN_DAYS` du serveur) vérifié hors ligne, rafraîchi par l'interface au démarrage puis toutes les 24 h ([[license.rs]]) ; empreinte PC = 2 sur 3 parmi MachineGuid, UUID SMBIOS, n° de série carte mère. Voir [[Serveur de licences]] et [[Clés et secrets]].

## Ressources natives
Plan d'alimentation `LowLatency.pow` (Rago Low Latency) et profil NVIDIA `extremelatencylow.nip`, chiffrés dans l'exe depuis la 1.1.14 ([[assets.rs]]) ; `nvidiaProfileInspector.exe` dans `resources\` : d'après ses métadonnées (OBSERVÉ), version modifiée de NVIDIA Profile Inspector (« DeadManWalking », 3.5.0.0) ; **À VÉRIFIER** : d'où il vient et si sa licence permet de le redistribuer ([[Configuration Tauri]]). PresentMon v2.3.0 ajouté par la CI.

## Tests
`cargo test --manifest-path src-tauri/Cargo.toml`, `npm run build`, démo navigateur `npm run window`, CI `app-windows` (tests Windows + build) : [[Développer et tester]], [[CI GitHub Actions]]. Les vrais tests se font sur le PC de Sofiene ou une VM.

## Code
- Carte du cœur Rust : [[Code de l'app (Rust)]] ; interface : [[Code de l'app (interface)]].
- Configuration et installateur : [[Configuration Tauri]], [[Installateur NSIS]], [[Cargo.toml]], [[build.rs]].
- Fichiers clés : [[lib.rs]] (commandes), [[runner.rs]], [[catalog.rs]], [[backup.rs]], [[license.rs]], [[update.rs]], [[background.rs]].
