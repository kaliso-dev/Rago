---
type: projet
tags: [projet, rago-os, en-cours]
maj: 2026-11-07
version_app: 1.3.0
---
# Rago OS

Bureau complet pour Windows (Dock, Dynamic Island, Launchpad, Spotlight, widgets, écran de verrouillage) que Sofiene a développé sur son Mac avec un autre Claude, dans le dossier `~/nimbus` (Tauri 2, Svelte 5, Rust). Ce n'est **pas** l'ancien Rago OS de la PR #60, abandonné le 31/10 ([[Décisions]]). Depuis le 07/11, c'est **l'extension de [[App Windows|Rago Optimizer]]** : il en reprend la charte et lui délègue tout ce qui touche à Windows. Retour à [[Projet]].

- Statut : EN COURS (07/11). Code sur le Mac de Sofiene, branche `rago-design` de `~/nimbus` (sa branche `main` n'est pas touchée). Rien n'a encore été testé sur un PC Windows.
- Charte : celle de l'app 1.2.1 ([[Charte graphique]]), choisie par Sofiene le 07/11 : encres, rouge `#ff3b30`, Geist et Geist Mono, logo R, animation de démarrage « Every millisecond counts. ».
- Thèmes : le thème « Rago » (sombre) est appliqué à l'installation ; six autres thèmes Rago (Signal, Piste, Horizon, Affiche, Rago Clair, Graphite), le thème clair, l'accent et le fond d'écran restent personnalisables dans Réglages > Apparence. L'ancien fond d'écran du joueur est gardé et peut être remis.

## Lien avec Rago Optimizer (le pont)
Rago OS parle à l'app par un canal nommé local, `\\.\pipe\gg.rago.optimizer.bridge` (`gg.rago.optimizer.staging.bridge` pour l'exe de test). Code : `app/src-tauri/src/bridge.rs` côté app (commandes dans `bridge_handler`, `lib.rs`), `src-tauri/src/win/rago.rs` et `src/lib/rago.svelte.ts` côté Rago OS.
- Garde-fous : canal fermé au réseau, ouvert aux seuls utilisateurs de la session ; l'exe client doit s'appeler `RagoOS.exe` (ou `rago-os.exe` en développement) ; ni e-mail, ni clé, ni identifiant ne passent, la licence se résume à l'offre.
- Commandes : `hello`, `status`, `live` (FPS et ping du [[Barre en jeu|jeu en cours]]), `stats`, `clean_ram`, `net_test` ([[Test réseau]]), `games` et `game_launch` ([[Bibliothèque de jeux]]), `presets`, `open` (ouvre une page de l'app), `game_mode` ([[Mode jeu]]), `boost` (Mode jeu total).
- App fermée : Rago OS la démarre en arrière-plan par sa tâche « Rago Optimizer » ([[Arrière-plan et démarrage]]), sinon par son exe. Que la tâche se lance sans droits administrateur depuis Rago OS : À VÉRIFIER sur Windows.

## Ce que Rago OS fait avec l'app
- Dynamic Island : FPS et ping en direct pendant la partie ; au survol, libérer la mémoire et ouvrir l'app. Résumé de fin de partie avec FPS et ping moyens.
- Mode jeu total, à chaque partie détectée : les services Windows inutiles en jeu (indexation, impression, SysMain, télémétrie, rapports d'erreurs, partage des mises à jour, cartes, géolocalisation, diagnostics, mises à jour Edge et Google…) sont arrêtés par l'app puis relancés à la fin (`app/src-tauri/src/boost.rs`). Jamais la sécurité, le réseau, le son, les périphériques, les anti-triches ni Xbox ; le type de démarrage n'est jamais changé et un redémarrage remet tout. Réservé à Premium pour l'instant : À VÉRIFIER (q52).
- Option : allumer le [[Mode jeu]] de l'app au début de la partie et l'éteindre à la fin.
- Page « Rago Optimizer » dans les réglages, widget « Rago Optimizer » (ping, réglages appliqués, Libérer la RAM, Test réseau, Ouvrir), ping dans la barre de menus, actions et pages de l'app dans Spotlight et le menu R, jeux de la bibliothèque de l'app dans le widget Jeux.
- Quand l'app répond, Réglages > Performances indique « Gérée par Rago Optimizer ». L'optimiseur de 51 réglages appliqué à l'installation de Rago OS existe toujours : le garder ou non, À VÉRIFIER (q53).

Décision de Sofiene (07/11) sur les services : « Les deux », c'est-à-dire les services sûrs coupés en permanence par les réglages de l'app (Services Windows, diagnostics…) et le reste en pause pendant chaque partie.

Côté app, le pont et le Mode jeu total sont sur la branche locale `claude/project-thread-r4qi8b` (base `staging`, 1.3.0), **pas encore sur GitHub** : en attente de l'accord de Sofiene ([[Règles de travail]]).

Liens : [[Prochaines étapes]], [[Client Minecraft Rago]].
