---
type: code
tags: [code, app, typescript, react, overlay]
fichier: app/src/overlay/main.tsx
lignes: 11
maj: 2026-11-10
---
# main.tsx (barre en jeu)

Point d'entrée de la **fenêtre de la barre en jeu** (fenêtre Tauri « overlay », page `app/overlay.html`). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Barre en jeu]]. Fenêtre principale : [[main.tsx (app)]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- Importe seulement `tokens.css` et `overlay.css` (pas les styles de l'app : la fenêtre est transparente et ne peint que la barre ou la pastille, voir [[Styles de l'app (CSS)]]).
- Rend `<StrictMode><Overlay /></StrictMode>` dans `#root`.
- **Aucun fournisseur** : ni `StoreProvider` ni `AccountProvider`. La barre est une fenêtre séparée, avec son propre JavaScript ; elle lit la langue et l'option de nettoyage directement dans `localStorage` et parle au moteur par [[api.ts]].

## Liens avec le reste
- Composant : [[Overlay.tsx]].
- Fenêtre créée et montrée par [[overlay.rs]] ; deuxième entrée de Vite (`overlay.html`, RAG-82), voir [[Configuration du front (Vite, npm)]].
