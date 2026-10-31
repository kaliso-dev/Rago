---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
maj: 2026-10-31
---
# Page Outils

Arrivée en [[Version 1.2.0]] dans « Optimiser ». Code : `tools.rs`, `memory.rs`, page `Tools.tsx`.

- **Nettoyage** (gratuit) : mesure puis libère 8 zones (temporaires, temporaires Windows, Windows Update, rapports de plantage, caches navigateurs, Discord, shaders, corbeille). Corbeille et shaders décochés d'office. Ne touche jamais au Prefetch, aux journaux Windows ni aux dossiers Minecraft (lus par le vérificateur [[RBW Mod]]).
- **Clean RAM** (gratuit, RAG-48).
- **Applis préinstallées** (Premium) : une quarantaine d'applis connues (Candy Crush, TikTok, Clipchamp, Teams…). Jamais le Store, Xbox ni la Game Bar.
- **Pilotes** (gratuit) : GPU, réseau, audio, avec leur âge ; liens vers les sites officiels. Rago n'installe jamais de pilote.
- À DÉCIDER : nettoyage en Premium ? (une ligne à changer). Voir [[Questions ouvertes]].

Liens : [[Offres et prix]], [[Refonte glass]].
