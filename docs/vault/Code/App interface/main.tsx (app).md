---
type: code
tags: [code, app, typescript, react]
fichier: app/src/main.tsx
lignes: 35
maj: 2026-11-23
---
# main.tsx (app)

Point d'entrée de la **fenêtre principale** de l'app : charge les feuilles de style et monte l'arbre React dans `#root` de `app/index.html`. Fiche parente : [[Code de l'app (interface)]]. À ne pas confondre avec [[main.tsx (barre en jeu)]] (fenêtre de la barre en jeu) ni avec [[main.rs]] (point d'entrée Rust).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
1. Importe les styles **dans cet ordre** : `tokens.css` (jetons de couleur, verre, typo), `app.css` (cadre et composants), `account.css` (compte et avis), `features.css` (fonctionnalités 1.2.0 et après). L'ordre compte : une règle plus bas l'emporte à spécificité égale. Détails : [[Styles de l'app (CSS)]].
2. `createRoot(document.getElementById("root")!)` puis rend :
```
<StrictMode>
  <StoreProvider>        ← état central (store.tsx)
    <AccountProvider>    ← compte et avis (account.tsx), lit le store
      <App />            ← cadre et pages (App.tsx)
```

## Charte v5 (PR #108 du 22/11, puis PR #119 à #123 du 23/11, dans `staging`, jamais testée sur Windows)
- Imports de style : `fonts.css` avant `tokens.css`, puis `v5.css` après `features.css` et `mouse.css` ([[Styles de l'app (CSS)]]).
- Puis les feuilles des **maquettes v5 reprises telles quelles** ([[Maquettes v5 dans l'app (s5)]]), après l'ancien style qui ne sert plus qu'aux pages pas encore refaites : `s5/base.css`, `s5/app.css`, puis une feuille par page refaite : `pg-dash.css`, `pg-games.css`, `empty.css`, `picker.css`, `pg-display.css`, `vs.css`, `module.css` et `net.css` (page Réseau, ajoutée par la PR #123 du 23/11).
- Ajoute les classes `round` et `poster` à `<html>` (coins arrondis et effets « affiche » des maquettes).

## Liens avec le reste
- Page HTML : `app/index.html` (voir [[Configuration du front (Vite, npm)]]).
- Fournisseurs : [[store.tsx]], [[account.tsx]] ; composant racine : [[App.tsx]].

## À savoir avant de modifier
- `AccountProvider` doit rester **dans** `StoreProvider` : il lit la licence et les fenêtres ouvertes dans le store.
- `StrictMode` double les effets en développement (`npm run dev` / `npm run window`) : un effet qui n'est pas idempotent se voit tout de suite.
