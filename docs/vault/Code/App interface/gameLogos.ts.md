---
type: code
tags: [code, app, typescript, interface]
fichier: app/src/lib/gameLogos.ts
lignes: 21
maj: 2026-11-23
---
# gameLogos.ts

Les **logos des jeux des presets**, dessinés en SVG (chemins de 24 × 24, en blanc sur la pastille du jeu), et la fonction qui retrouve le jeu d'un preset. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Presets]], [[Bibliothèque de jeux]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `GAME_GLYPHS: Record<string, string>` : chemin SVG (`d`) par clé de jeu. 11 clés : `fortnite`, `valorant`, `cs2`, `pubg`, `lol`, `roblox`, `finals`, `gta`, `minecraft`, `bedrock` (même dessin que `minecraft`). Sources écrites dans le fichier : **Simple Icons (CC0)** ; Minecraft : **Material Design Icons (Apache 2.0)** ; « les marques appartiennent à leurs éditeurs ».
- `presetGameKey(id)` : clé du jeu d'un preset du catalogue : `mc_pvp` → `minecraft` ; `game_<clé>` → `<clé>` (`game_valorant` → `valorant`) ; sinon `null`. C'est aussi la variante de `pri_game` utilisée par ces presets.

Presets de jeu **sans glyphe** : `apex`, `r6`, `overwatch`, `rivals`, `tarkov`, `rl` (ils s'affichent avec l'icône du jeu installé, sinon leur sigle, voir plus bas).

## Liens avec le reste
- Depuis le 23/11, **`GAME_GLYPHS` n'est plus utilisé** : son seul lecteur, `GameLogo.tsx` (menu des presets de l'ancienne page Jeux), a été supprimé avec la page refaite sur la maquette v5 ; le choix du preset montre maintenant les covers des jeux ([[PresetPicker.tsx]]). `api.presetIcons()` ([[api.ts]], commande `preset_icons`) n'a plus d'appelant non plus. Gardés pour l'instant (la page Display, pas encore refaite, pourrait s'en servir).
- [[tips.ts]] utilise `presetGameKey` pour trouver la liste de réglages conseillés d'un jeu.

## À savoir avant de modifier
- Ajouter un logo : vérifier la licence de l'icône (CC0 ou équivalent) et la noter dans le commentaire ; la clé doit être celle de `presetGameKey`.
