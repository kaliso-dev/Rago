---
type: code
tags: [code, app, react, composant, jeux, graphismes]
fichier: app/src/components/GameGraphics.tsx
lignes: 134
maj: 2026-11-11
---
# GameGraphics.tsx

Carte **« In-game graphics » / « Graphismes du jeu »** de la page « Jeux » : trois tuiles Performance, Équilibré, Qualité ; un clic écrit le niveau dans les réglages du jeu. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Graphismes des jeux]]. Côté Rust : [[gamecfg.rs]].

Statut : PR #94 (11/11), fusionnée dans `staging` le 11/11 par la PR #92.

## Rôle et place dans l'ensemble
- Affichée par [[Games.tsx]] sous la carte du jeu choisi, seulement si `graphicsForGame(nom)` ([[graphics.ts]]) reconnaît le jeu. Clé React `gfx:<id du jeu>` (une clé égale à celle de la carte du jeu dupliquait la carte, corrigé le 11/11).
- Props : `game` (id de [[gamecfg.rs]]), `title` (nom affiché), `running` (le jeu tourne, d'après la bibliothèque).

## Fonctionnement détaillé
1. À l'affichage et quand `running` change : `api.graphicsStatus(game)` ([[api.ts]]).
2. En-tête : titre, phrase d'explication (« Like OptiFine: … Your previous settings are kept. », avec le nombre de comptes du jeu s'il y en a plusieurs) ; à droite la puce « Current: <niveau> » ou « Your own settings », et le lien « Restore my settings » s'il existe une copie.
3. Tuiles (`role="radio"`) : icône (Zap, Gauge, Sparkles), nom, sous-titre (`gfx.tag.*`), ce que le niveau change pour ce jeu ([[graphics.ts]]). La tuile du niveau actuel est rouge avec une coche.
4. Clic : `api.graphicsApply` ; message « Done. <jeu> uses it the next time it starts. », « The game is already set this way. » (rien changé), plus « N read-only files were left as is. » si besoin.
5. Tuiles et lien grisés tant que l'état n'est pas lu, pendant une écriture, quand le jeu tourne, quand aucun fichier n'est trouvé ou quand tous sont en lecture seule ; la phrase d'en-tête dit alors pourquoi (en jaune).
6. Erreurs traduites : `running`, `not_found`, `locked`, `unknown_format`, `no_backup` (`gfx.*` dans [[i18n.ts]]) ; autre → « Couldn't apply: <message> ».

## Styles
Classes `.games-gfx*` dans `features.css` ([[Styles de l'app (CSS)]]) : grille de 3 tuiles, une colonne sous 900 px de large.

## Simulateur
Dans la démo ([[api.ts]]) : Valorant a 2 comptes, Apex n'a jamais été lancé (fichier introuvable), les niveaux et la copie sont gardés en mémoire le temps de la page.
