---
type: code
tags: [code, app, react, logique, jeux, graphismes]
fichier: app/src/lib/graphics.ts
lignes: 85
maj: 2026-11-11
---
# graphics.ts

Textes des [[Graphismes des jeux]] : quels jeux ont la carte et ce que chaque niveau change, en anglais et en français. Les clés et valeurs écrites sont dans [[gamecfg.rs]] (seul à écrire). Fiche parente : [[Code de l'app (interface)]]. Utilisé par [[GameGraphics.tsx]] et [[Games.tsx]].

Statut : branche `claude/project-thread-5ln7f8` (11/11), PR #94 vers `staging`, pas encore fusionnée.

## Ce que le fichier expose
- `GFX_LEVELS` : `performance`, `balanced`, `quality` (ordre des tuiles).
- `graphicsForGame(nom)` : id du jeu dans [[gamecfg.rs]] d'après le preset reconnu par `presetForGame` ([[catalog.ts]]) : `game_valorant` → `valorant`, `game_fortnite` → `fortnite`, `game_cs2` → `cs2`, `game_apex` → `apex`, `game_rivals` → `rivals`, `game_finals` → `finals` ; sinon `null` (pas de carte).
- `GFX_DETAILS[jeu][niveau]` : une phrase `{ en, fr }` par jeu et par niveau ; Marvel Rivals et The Finals partagent les textes des jeux Unreal Engine.

## À savoir avant de modifier
- Garder la même liste de jeux que `GAMES` de [[gamecfg.rs]], et des phrases fidèles aux valeurs réellement écrites.
