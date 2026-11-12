---
type: code
tags: [code, app, typescript, react, reseau]
fichier: app/src/pages/Network.tsx
lignes: 75
maj: 2026-11-10
---
# Network.tsx

La **page Réseau** et ses **quatre onglets** : les réglages réseau du catalogue, le Packet Optimizer, le test réseau et Rago Route. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Packet Optimizer]], [[Test réseau]], [[Proxy|Rago Route]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `NETWORK_TABS = ["network", "netopt", "nettest", "route"]` et le type `NetworkTab`.
- `isNetworkTab(page)` : vrai pour ces quatre ids. Utilisé par [[App.tsx]] (quelle page rendre, clé d'animation commune) et [[Sidebar.tsx]] (l'entrée « Réseau » reste active sur les quatre onglets).
- `Network({ tab })` : la page.

Chaque onglet est **une page à part** du store (`goTo("netopt")`…) : la recherche Ctrl+K et la barre en jeu peuvent y mener directement.

## Fonctionnement détaillé
- En-tête : surtitre « Connexion », titre « Réseau », texte « Les réglages réseau de Windows, le Packet Optimizer et le test de ta connexion, au même endroit. » (clés `hub.*`).
- Barre d'onglets (`role="tablist"`), qui reste collée sous la barre de titre en défilant (verre, `features.css`) :

| Onglet | Libellé | Icône | Contenu |
|---|---|---|---|
| `network` | Optimisations | `SlidersHorizontal` | [[ModulePage.tsx]] du module `network`, en mode `embedded` (sans son propre en-tête) ; pastille du nombre de réglages réseau cochés ou à annuler |
| `netopt` | Packet Optimizer | `Activity` | [[NetOpt.tsx]] |
| `nettest` | Test réseau | `Gauge` | [[NetTest.tsx]] |
| `route` | Rago Route | `Route` | [[RouteTab.tsx]] |

- L'onglet actif a une pastille animée (`layoutId="hub-pill"`, ressort raideur 520, amortissement 42). Changement d'onglet : fondu + glissement de 6 px en 0,18 s.
- Badge « Nouveau » sur les onglets `netopt`, `nettest` et `route` tant qu'ils n'ont pas été ouverts ; l'onglet ouvert est marqué vu par `markSeen(tab)` ([[seen.ts]]).

## Historique utile
- 25/10/2026 (`79535fa`) : Réseau passe en trois onglets avec le Packet Optimizer et le test réseau.
- 07/11/2026 (`342d09e`) : onglet Rago Route ajouté, **visible seulement dans l'exe de test** (`VITE_RAGO_SERVER === "staging"`).
- 10/11/2026 (`a190565`, 1.3.0) : la condition est retirée, **Rago Route est dans tous les exe** (avec un badge « Beta » dans l'onglet lui-même). Seule la copie du jeton pour le Mac reste réservée à l'exe de test ([[RouteTab.tsx]]).

## Liens avec le reste
- Store : `goTo`, `selected`, `pendingUndo` ([[store.tsx]]).
- Styles : section « Réseau : les réglages, le Packet Optimizer et le test réseau en trois onglets » de `features.css` ([[Styles de l'app (CSS)]]). Le titre de la section « Rago Route (onglet de Réseau, exe de test) » y est en retard sur le code.
