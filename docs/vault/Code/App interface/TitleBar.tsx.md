---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/TitleBar.tsx
lignes: 42
maj: 2026-11-22
---
# TitleBar.tsx

La **barre du haut** maison de la fenêtre (la fenêtre Tauri n'a pas de cadre Windows) : recherche, bandeau démo ou staging, offre, boutons réduire/agrandir/fermer. Depuis la charte v5 (PR #108 du 22/11, vers `staging`, jamais testée sur Windows), elle est dans la colonne de droite, au-dessus des pages ; le logo est passé en haut de la barre latérale ([[Sidebar.tsx]]). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[App Windows]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- `data-tauri-drag-region` sur la barre, le bloc du nom et le texte : on déplace la fenêtre en les tirant.
- À gauche : bouton « Rechercher un réglage » avec `Ctrl K` → ouvre [[SearchPalette.tsx]], puis un bandeau :
  - hors de Tauri (navigateur, `npm run window`) : « Démo web : les réglages sont simulés » ;
  - dans l'exe de test (`VITE_RAGO_SERVER === "staging"`, posé par le workflow de build, voir [[CI GitHub Actions]]) : « Serveur de test (staging) » ;
  - rien dans l'exe de production.
- À droite, une fois la licence connue : étiquette « Premium », ou bouton « Se connecter » → offre `signin` ([[Upsell.tsx]], qui montre [[LicenseGate.tsx]]).
- Boutons de fenêtre : réduire, agrandir/restaurer, fermer → `api.window.*` ([[api.ts]]). Fermer peut seulement cacher l'app dans la zone de notification si le mode arrière-plan est actif (géré par le moteur, [[background.rs]]).

## Liens avec le reste
- Monté dans `div.body`, à côté de la barre latérale.
- Styles : barre du haut de `v5.css` (boutons `.wc`) ([[Styles de l'app (CSS)]]).
