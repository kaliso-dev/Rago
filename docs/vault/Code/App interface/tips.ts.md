---
type: code
tags: [code, app, typescript, interface, conseils]
fichier: app/src/lib/tips.ts
lignes: 59
maj: 2026-11-11
---
# tips.ts

Lecture de la liste des **réglages en jeu conseillés** ([[tips.json]]) et suivi des réglages cochés « fait », pour les [[Conseils au lancement du jeu]]. Fiche parente : [[Code de l'app (interface)]].

**Fichier ajouté le 11/11 par la PR #91 (brouillon, pas encore dans `staging`).** Tout ce qui suit est CONFIRMÉ (code de la branche `claude/project-thread-g3od2h`, 11/11).

## Ce que le fichier expose
- Types : `TipTag` (`see`, `lag`, `fps`, `build`, `aim`), `Tip { id, tag, setting, value: {en, fr}, why: {en, fr} }`, `TipSource { name, url, date }`, `GameTips { name, sources, tips }`.
- `tipsFor(clé)` : les réglages d'un jeu (`undefined` sans clé ou pour un jeu sans liste).
- `tipsKeyForGame(nom)` : la clé d'un jeu de la bibliothèque d'après son nom, par le même chemin que le preset proposé : `presetForGame` ([[catalog.ts]]) puis `presetGameKey` ([[gameLogos.ts]]) ; `null` si ce jeu n'a pas de liste.
- `useTipsDone()` : crochet React qui renvoie `[ensemble des ids cochés, mark(id, fait)]`. Il lit la liste au montage (`api.tipsDone`), suit l'événement `tips:done` (l'app et la barre en jeu restent d'accord), et `mark` change l'affichage tout de suite puis appelle `api.tipsMark` ; la réponse du moteur remplace la liste (un id inconnu n'y entre pas).

## Liens avec le reste
- Utilisé par [[GameTips.tsx]] (`tipsFor`, `useTipsDone`), [[Overlay.tsx]] (`tipsFor` pour le nom du jeu du rappel) et [[Games.tsx]] (`tipsKeyForGame`).
- Commandes et événement : `tips_done`, `tips_mark`, `tips:done` ([[api.ts]], [[lib.rs]], [[tips.rs]]).
