---
type: code
tags: [code, app, typescript, react, overlay]
fichier: app/src/overlay/main.tsx
lignes: 18
maj: 2026-11-24
---
# main.tsx (barre en jeu)

Point d'entrée de la **fenêtre de la barre en jeu** (fenêtre Tauri « overlay », page `app/overlay.html`). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Barre en jeu]]. Fenêtre principale : [[main.tsx (app)]].

Tout ce qui suit est CONFIRMÉ (code de `staging` après la PR #PRX, 24/11).

## Fonctionnement détaillé
- Importe `fonts.css` (Barlow), puis les styles de la maquette v5 : `s5/base.css`, `s5/pages/ingame.css` et `s5/overlay.css` (fenêtre transparente : seule la barre ou la pastille est peinte), voir [[Maquettes v5 dans l'app (s5)]]. Pas les autres styles de l'app.
- Ajoute la classe `round` à `<html>` (coins arrondis de la maquette) ; pas `poster` : son grain couvrirait toute la fenêtre, donc le jeu (`s5/overlay.css` le pose sur la barre seulement).
- Rend `<StrictMode><IconDefs /><Overlay /></StrictMode>` dans `#root` (`IconDefs` : filtres des icônes imprimées, `s5/I.tsx`).
- **Aucun fournisseur** : ni `StoreProvider` ni `AccountProvider`. La barre est une fenêtre séparée, avec son propre JavaScript ; elle lit la langue et l'option de nettoyage directement dans `localStorage` et parle au moteur par [[api.ts]].

## Liens avec le reste
- Composant : [[Overlay.tsx]].
- Fenêtre créée et montrée par [[overlay.rs]] ; deuxième entrée de Vite (`overlay.html`, RAG-82), voir [[Configuration du front (Vite, npm)]].
