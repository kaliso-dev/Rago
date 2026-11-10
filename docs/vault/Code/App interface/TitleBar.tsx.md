---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/TitleBar.tsx
lignes: 45
maj: 2026-11-10
---
# TitleBar.tsx

La **barre de titre** maison de la fenêtre (la fenêtre Tauri n'a pas de cadre Windows) : logo et nom, bandeau démo ou staging, bouton de recherche, offre, boutons réduire/agrandir/fermer. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[App Windows]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- `data-tauri-drag-region` sur la barre, le bloc du nom et le texte : on déplace la fenêtre en les tirant.
- À gauche : logo (`Mark` 16 px), « Rago Optimizer », puis un bandeau :
  - hors de Tauri (navigateur, `npm run window`) : « Démo web : les réglages sont simulés » ;
  - dans l'exe de test (`VITE_RAGO_SERVER === "staging"`, posé par le workflow de build, voir [[CI GitHub Actions]]) : « Serveur de test (staging) » ;
  - rien dans l'exe de production.
- Au centre : bouton « Rechercher un réglage » avec `Ctrl K` → ouvre [[SearchPalette.tsx]].
- À droite, une fois la licence connue : étiquette « Premium », ou bouton « Se connecter » → offre `signin` ([[Upsell.tsx]], qui montre [[LicenseGate.tsx]]).
- Boutons de fenêtre : réduire, agrandir/restaurer, fermer → `api.window.*` ([[api.ts]]). Fermer peut seulement cacher l'app dans la zone de notification si le mode arrière-plan est actif (géré par le moteur, [[background.rs]]).

## Liens avec le reste
- Monté par [[App.tsx]] en haut de la fenêtre.
- Styles : section « titlebar » de `app.css` ([[Styles de l'app (CSS)]]).
