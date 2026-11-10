---
type: code
tags: [code, app, typescript, interface]
fichier: app/src/lib/seen.ts
lignes: 38
maj: 2026-11-10
---
# seen.ts

Mémoire des **pages et onglets déjà ouverts**, pour effacer leur badge « Nouveau » à la première visite. Fiche parente : [[Code de l'app (interface)]]. Utilisé par [[Sidebar.tsx]] et [[Network.tsx]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `markSeen(id)` : ajoute `id` à la liste (si absent), l'écrit dans `localStorage` `rago.seenPages`, et prévient les abonnés.
- `useSeen()` : crochet React (`useSyncExternalStore`) qui renvoie la liste des ids vus ; tout composant qui l'utilise se redessine quand un id est ajouté.

## Fonctionnement détaillé
- La liste est lue une fois puis gardée en mémoire (`cache`) ; un JSON illisible donne une liste vide.
- Si l'écriture échoue (stockage indisponible), le badge revient au prochain lancement.
- Les ids sont des ids de page (`games`, `tools`…) ou d'onglet de Réseau (`netopt`, `nettest`, `route`…) ; c'est [[Sidebar.tsx]] qui décide lesquels portent un badge (table `NEW`) et [[Network.tsx]] qui marque l'onglet ouvert.

## Données touchées
- `localStorage` `rago.seenPages` (tableau JSON d'ids).

## Liens avec le reste
- Commentaire du fichier : badges des pages de la 1.2.0 ([[Version 1.2.0]]).
- Styles du badge : `features.css` (« barre latérale : pages nouvelles »), voir [[Styles de l'app (CSS)]].
