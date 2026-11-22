---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/UpdateCard.tsx
lignes: 56
maj: 2026-11-10
---
# UpdateCard.tsx

La petite carte **« Mise à jour »** en bas de la barre latérale, quand une nouvelle version a été téléchargée et vérifiée. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Mise à jour automatique]] (RAG-24).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- Au montage : `api.updateReady()` (une mise à jour déjà prête) et abonnement à l'événement `update:ready` ([[api.ts]], [[update.rs]]). Rien n'est affiché tant qu'il n'y a rien.
- Carte : « Mise à jour », « {version} prête » ; infobulle avec les notes de version et « Version {version} : elle s'installe quand tu fermes l'app, ou tout de suite avec Redémarrer. »
- Bouton « Redémarrer » → `api.updateInstall()` (l'app se ferme et se rouvre). Désactivé pendant un lot (infobulle « Disponible à la fin de l'optimisation en cours ») : l'app ne se ferme pas au milieu.
- Échec : « Impossible de lancer l'installation : elle se fera à la fermeture. »
- Démo : ajouter `?update` à l'adresse fait apparaître une 1.2.1 prête.

## Liens avec le reste
- Monté par [[Sidebar.tsx]] au-dessus de la carte du plan gratuit.
- Paramètres : la date de la dernière recherche s'affiche dans l'exe de test ([[Settings.tsx]]).
- Styles : « mise à jour prête (RAG-24) » de `features.css` ([[Styles de l'app (CSS)]]).
