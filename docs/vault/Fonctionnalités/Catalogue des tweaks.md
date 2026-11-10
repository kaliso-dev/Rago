---
type: fonctionnalité
tags: [fonctionnalité, app, tweaks]
version_app: 1.3.0
maj: 2026-11-10
---
# Catalogue des tweaks

Les tweaks de l'app, module par module. Les notes « Tweaks … » sont **générées** depuis le code : leur contenu (nom, description, gain, inconvénient, variantes, gratuit ou Premium, presets) est celui de l'app au moment où elles ont été générées (voir « Régénérer les notes »). Comment le catalogue est fabriqué : [[Code du générateur de catalogue]].

Chiffres CONFIRMÉS sur le code de `staging` (10/11, app 1.3.0).

## Chiffres de la 1.3.0
- 231 entrées (214 tweaks + 17 actions ponctuelles), **218 tweaks distincts** (les jumeaux, même script sous deux noms, comptent une fois : 24 entrées en 11 groupes), 196 sûrs et 35 avancés, 20 presets (dont 15 par jeu), 17 tweaks retirés. Le site dit « Nearly 220 ».
- **Plan gratuit** ([[free.json]], décision de Sofiene du 04/11) : **73 entrées gratuites** (59 tweaks + 14 actions, 70 distincts) : tout le module Windows (57), le stockage du module Latence (9), les 4 outils de Restaurer, et 3 réglages de pilotes (`nv_telemetry`, `nv_debloat`, `amd_logging`). Au plus **30 réglages gratuits** (pas les actions) appliqués en même temps sans licence (`slots`). Ping, Hitreg, latence, processeur, mémoire, alimentation, Minecraft, RBW Mod, mode jeu, Expert, presets et Packet Optimizer restent Premium ; le retour arrière de RBW Mod et du mode jeu reste ouvert (`reverts`). Voir [[Version 1.3.0]].

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
- Plan gratuit : `app/src/data/free.json`, écrit à la main (le générateur ne le lit pas) : `tweaks` = 73 entrées gratuites, `slots` = 30 réglages gratuits actifs à la fois, `reverts` = Premium dont seul le retour arrière est gratuit (`rbw_mode`, `game_mode`), `formerly` = anciens gratuits encore appliqués chez des joueurs (`in_mouse`).
- Sources du 21/10 (Sofiene) : `[RAGO APP] GAME V1.bat`, `OptiCore-Tweaks.ps1`, `Hone-Optimizations.ps1`, `network_optimizer.bat`, dump Hone.gg. Ce qui a été pris ou écarté : `refonte-glass/OPTIMISATIONS-1.2.0.md` ([[Sources]]).
- Les JSON (scripts Premium compris) sont en clair dans le dépôt, qui est **public** depuis une date inconnue (constaté le 10/11) : tout le monde peut les lire, ainsi que ce vault. Sofiene, 10/11 : public en novembre pour les builds, privé à partir de décembre ([[CI GitHub Actions]]). Dans l'exe, les scripts sont chiffrés ([[Moteur des tweaks]]).

## Code
Carte complète, avec les recettes pour ajouter, corriger ou retirer un tweak et les vérifications : [[Code du générateur de catalogue]].
- **Générateur** (`app/tools/`) : [[build_catalog_v6.py]] (lance tout), [[build_catalog.py]] et [[extract_bat.py]] (ancien programme), [[meta.py]] (ses 189 réglages), [[descriptions.json]] (textes visibles), [[corrections_md.py]].
- **Corrections et sécurité** : [[audit_fixes.py]] (audit du 07/10), [[optis_120.py]] (optimisations du 21/10, corrections récentes), [[safety.py]] (retirés, lignes risquées), [[paths.py]] (suppressions protégées), [[rbw.py]] (RBW Mod).
- **Relevé et annulation** : [[probes.py]], [[undo_gen.py]], [[defaults.py]], [[merge_full.py]].
- **Sources et journal** : [[Anciens scripts .bat]], [[CORRECTIONS.md (app)]].
- **Fichiers produits** : [[catalog.json]], [[Scripts embarqués (JSON)]] ; plan gratuit [[free.json]].
- **Dans l'app** : chiffrement à la compilation ([[embed_scripts.rs]], [[seal.rs]]), lecture et règles du plan gratuit ([[catalog.rs]]), lancement ([[runner.rs]]), sauvegarde ([[backup.rs]]), affichage ([[catalog.ts]], [[TweakRow.tsx]]). Voir [[Moteur des tweaks]].
- **Vault et site** : [[catalogue_vault.py]], [[sync_app.py]], [[sync_tweaks.py]].

## Régénérer les notes « Tweaks … »
Sur la branche qui porte la dernière version de l'app (aujourd'hui `staging`), depuis la racine du dépôt : `python3 docs/tools/catalogue_vault.py` (Python 3.12 ou plus). À faire **à chaque changement du catalogue ou de [[free.json]]** ([[Mettre à jour le vault]]).

## Honnêteté
Une description courte par tweak, avec son gain réel et son inconvénient, sans gain chiffré promis ([[Voix et ton]]). L'audit du 05/10 estimait ~15 tweaks sur 189 vraiment efficaces et une centaine placebo ; la 1.1.8 a retiré les risqués.
