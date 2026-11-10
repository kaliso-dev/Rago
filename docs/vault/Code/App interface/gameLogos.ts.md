---
type: code
tags: [code, app, typescript, interface]
fichier: app/src/lib/gameLogos.ts
lignes: 21
maj: 2026-11-10
---
# gameLogos.ts

Les **logos des jeux des presets**, dessinés en SVG (chemins de 24 × 24, en blanc sur la pastille du jeu), et la fonction qui retrouve le jeu d'un preset. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Presets]], [[Bibliothèque de jeux]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `GAME_GLYPHS: Record<string, string>` : chemin SVG (`d`) par clé de jeu. 11 clés : `fortnite`, `valorant`, `cs2`, `pubg`, `lol`, `roblox`, `finals`, `gta`, `minecraft`, `bedrock` (même dessin que `minecraft`). Sources écrites dans le fichier : **Simple Icons (CC0)** ; Minecraft : **Material Design Icons (Apache 2.0)** ; « les marques appartiennent à leurs éditeurs ».
- `presetGameKey(id)` : clé du jeu d'un preset du catalogue : `mc_pvp` → `minecraft` ; `game_<clé>` → `<clé>` (`game_valorant` → `valorant`) ; sinon `null`. C'est aussi la variante de `pri_game` utilisée par ces presets.

Presets de jeu **sans glyphe** : `apex`, `r6`, `overwatch`, `rivals`, `tarkov`, `rl` (ils s'affichent avec l'icône du jeu installé, sinon leur sigle, voir plus bas).

## Liens avec le reste
- [[Petits composants de l'interface]] (`GameLogo.tsx`) choisit quoi dessiner. Ordre réel dans le code : **icône de l'exe du jeu installé** (`presetIcons`, [[api.ts]]) d'abord, puis le glyphe d'ici, puis le sigle `tag` du preset ([[catalog.json]]).
- [[Dashboard.tsx]] (presets par jeu) utilise `presetGameKey` ; [[Games.tsx]] passe par `GameLogo`.

## À savoir avant de modifier
- Le commentaire de ce fichier dit « Sans glyphe ici, l'icône de l'exe du jeu installé, sinon les lettres du preset », ce qui laisse croire que le glyphe passe avant l'icône. `GameLogo.tsx` (code et commentaire) fait l'inverse : icône du jeu installé d'abord. C'est le composant qui décide ; seul ce commentaire est en retard.
- Ajouter un logo : vérifier la licence de l'icône (CC0 ou équivalent) et la noter dans le commentaire ; la clé doit être celle de `presetGameKey`.
