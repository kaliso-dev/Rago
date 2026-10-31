---
type: fonctionnalité
tags: [fonctionnalité, app, tweaks]
maj: 2026-10-31
---
# Catalogue des tweaks

Voir [[App Windows]] et [[Presets]].

- **Chiffres** : 199 tweaks distincts après la 1.1.8 (16 risqués retirés) → **218** en [[Version 1.2.1]] (site : « Nearly 220 »). 10 modules (Windows, Latence, Réseau, Hitreg, Minecraft, Carte graphique, Restaurer…).
- **Génération** : `cd app && python3 tools/build_catalog_v6.py` (`npm run catalog`) à partir du `.bat` v5.2 et des `.bat` v6 (`app/legacy/`), avec `audit_fixes.py`, `safety.py` et `tools/descriptions.json`. Sorties : `app/src/data/catalog.json`, `app/src-tauri/scripts/scripts.json`, `probes.json`, `undo.json`. **Ne jamais éditer ces JSON à la main.** Historique des corrections : `app/docs/CORRECTIONS.md`.
- Les JSON sont en clair dans le dépôt : **le dépôt doit rester privé**. Dans l'exe, les scripts sont chiffrés (`seal.rs`, clé Premium fournie par le serveur, voir [[Clés et secrets]]).
- **Plan gratuit** : `app/src/data/free.json` (11 tweaks, voir [[Offres et prix]]), vérifié aussi par le moteur Rust.
- **Sources du 21/10** (fournies par Sofiene, intégrées en 1.2.0) : `[RAGO APP] GAME V1.bat`, `OptiCore-Tweaks.ps1`, `Hone-Optimizations.ps1`, `network_optimizer.bat`, dump des tweaks Hone.gg. Détail et écarts : `refonte-glass/OPTIMISATIONS-1.2.0.md` ([[Sources]]).
- Honnêteté : une description courte par tweak, sans gain promis ; l'audit du 05/10 estimait ~15 tweaks sur 189 vraiment efficaces et une centaine placebo ([[Voix et ton]]).
