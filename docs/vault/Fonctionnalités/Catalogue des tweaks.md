---
type: fonctionnalité
tags: [fonctionnalité, app, tweaks]
version_app: 1.2.1
maj: 2026-10-31
---
# Catalogue des tweaks

Les tweaks de l'app, module par module. Les notes « Tweaks … » sont **générées** depuis le code : leur contenu (nom, description, gain, inconvénient, variantes, gratuit ou Premium, presets) est exactement celui de l'app.

## Chiffres de la 1.2.1
231 entrées (214 tweaks + 17 actions ponctuelles), **218 tweaks distincts** (les jumeaux, même script sous deux noms, comptent une fois), 196 sûrs et 35 avancés, **11 gratuits**, 20 presets, 17 tweaks retirés. Le site dit « Nearly 220 ».

## Modules (ordre de la barre latérale)
| Groupe | Module | Entrées | Note |
|---|---|---|---|
| Optimiser | Réseau | 24 | [[Tweaks Réseau]] (+ [[Packet Optimizer]], [[Test réseau]]) |
| Optimiser | Latence | 86 | [[Tweaks Latence]] |
| Optimiser | Carte graphique | 30 | [[Tweaks Carte graphique]] |
| Optimiser | Windows | 57 | [[Tweaks Windows]] |
| Optimiser | Outils | natif | [[Page Outils]] |
| En jeu | Hitreg | 9 | [[Tweaks Hitreg]] |
| En jeu | Minecraft | 1 (+3 renvois) | [[Tweaks Minecraft]] |
| En jeu | RBW Mod | 1 | [[Tweaks RBW Mod]], [[RBW Mod]] |
| En jeu | Mode jeu | 1 | [[Tweaks Mode jeu]], [[Mode jeu]] |
| En jeu | Jeux | — | [[Bibliothèque de jeux]] |
| Avancé | Mode expert | 18 | [[Tweaks Mode expert]] |
| Avancé | Restaurer | 4 (+1 renvoi) | [[Tweaks Restaurer]] |
Presets : [[Tweaks Presets]] · retirés : [[Tweaks retirés]].

## D'où vient le catalogue
- Généré par `cd app && python3 tools/build_catalog_v6.py` (`npm run catalog`) à partir du `.bat` v5.2 et des `.bat` v6 (`app/legacy/`), avec `audit_fixes.py` (audit du 07/10), `safety.py` (tweaks retirés), `tools/descriptions.json` (textes), `optis_120.py` (optimisations du 21/10). Sorties : `app/src/data/catalog.json`, `app/src-tauri/scripts/scripts.json`, `probes.json`, `undo.json`. **Ne jamais éditer ces JSON à la main.** Historique : `app/docs/CORRECTIONS.md`.
- Plan gratuit : `app/src/data/free.json` (`tweaks` = 11 gratuits, `reverts` = Premium dont le retour est gratuit, `formerly` = anciens gratuits).
- Sources du 21/10 (Sofiene) : `[RAGO APP] GAME V1.bat`, `OptiCore-Tweaks.ps1`, `Hone-Optimizations.ps1`, `network_optimizer.bat`, dump Hone.gg. Ce qui a été pris ou écarté : `refonte-glass/OPTIMISATIONS-1.2.0.md` ([[Sources]]).
- Les JSON sont en clair dans le dépôt : **le dépôt doit rester privé**. Dans l'exe, les scripts sont chiffrés ([[Moteur des tweaks]]).

## Régénérer les notes « Tweaks … »
Sur la branche qui porte la dernière version de l'app (aujourd'hui `staging`) : `python3 docs/tools/catalogue_vault.py`. À faire **à chaque changement du catalogue** ([[Mettre à jour le vault]]).

## Honnêteté
Une description courte par tweak, avec son gain réel et son inconvénient, sans gain chiffré promis ([[Voix et ton]]). L'audit du 05/10 estimait ~15 tweaks sur 189 vraiment efficaces et une centaine placebo ; la 1.1.8 a retiré les risqués.
