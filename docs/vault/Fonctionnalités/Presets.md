---
type: fonctionnalité
tags: [fonctionnalité, app, premium]
version_app: 1.3.0
maj: 2026-11-10
---
# Presets

Ensembles de tweaks sélectionnés en un clic, puis appliqués avec la barre du bas. **Les presets du catalogue (généraux et par jeu) sont Premium** : sans licence, cadenas et fenêtre Premium. **« Mes presets » est gratuit** (seuls les réglages du plan gratuit sont cochés). Contenu exact de chacun : [[Tweaks Presets]] (note générée).

- **5 presets généraux** (enrichis en 1.2.0) : Minecraft PvP 22 tweaks en 1.2.1, 20 dans le code de `staging` (sortie avec la 1.3.0 : la 1.2.2 ne sort pas seule, Sofiene, 10/11, q47), FPS max 25 (15), Latence minimale 23 (11), PC portable 19 (10), Vie privée 16 (9).
- **15 presets par jeu** : Fortnite, Valorant, CS2, Apex, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Minecraft Bedrock (21 tweaks chacun), Roblox et GTA V (17, socle « fluide »). Chacun met le jeu en priorité haute + un socle compétitif. **20 presets en tout.** Ils sont reconnus automatiquement dans la [[Bibliothèque de jeux]] (le nom du jeu est comparé aux mots-clés `match` de chaque preset). Dans la bibliothèque, « Optimiser et jouer » est Premium, même avec un preset de « Mes presets ».
- « Priorité avancée par jeu » (`pri_game`) : 15 jeux ; Lunar compte comme Minecraft (`javaw.exe`).
- Règle : le preset Minecraft est vérifié à chaque build : rien de ce que lit le vérificateur RBW ([[RBW Mod]]).
- **Mes presets** : enregistrer ses tweaks allumés sous un nom, modifier, copier le code, supprimer ; partager ou importer : [[Partage et support]].
- Le preset Minecraft PvP de la 1.2.1 contient `win_fullscreen` et `ping_packets: hitreg` (curseur perdu, ping instable : [[Problèmes joueurs]], [[Packet Optimizer]]) ; la 1.2.2 les retire (PR #70, dans `staging`, sortie prévue avec la 1.3.0).

Liens : [[Tableau de bord]], [[Offres et prix]].

## Code
- Affichage et sélection : [[Dashboard.tsx]] (presets, presets par jeu, « Mes presets »), [[Games.tsx]] (preset de chaque jeu, « Optimiser et jouer »). Modifier un preset : [[PresetEditor.tsx]].
- Logique : `selectMany`, `savePreset`, `updatePreset`, `currentSetup` et `toApply` de [[store.tsx]] ; `presetForGame` de [[catalog.ts]] ; codes de partage : [[share.ts]] et [[Share.tsx]]. Logos des jeux : [[gameLogos.ts]].
- Données : `presets` de [[catalog.json]], fabriqué par [[build_catalog_v6.py]]. Carte d'ensemble : [[Code de l'app (interface)]].
