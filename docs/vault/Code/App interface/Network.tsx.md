---
type: code
tags: [code, app, typescript, react, reseau]
fichier: app/src/pages/Network.tsx
lignes: 136
maj: 2026-11-23
---
# Network.tsx

La **page Réseau** : son en-tête avec le ping en direct, ses **quatre onglets**, et le bouton « relancer la carte réseau ». Refaite le 23/11 à l'identique des maquettes v5 `app-network-*-pi.html` (PR #123). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Packet Optimizer]], [[Test réseau]], [[Proxy|Rago Route]].

Tout ce qui suit est CONFIRMÉ (code de la PR #123 du 23/11, commit `c0d27dd`, vers `staging`). Jamais testé sur Windows.

## Ce que le fichier expose
- `NETWORK_TABS = ["network", "netopt", "nettest", "route"]` et le type `NetworkTab`.
- `isNetworkTab(page)` : vrai pour ces quatre ids. Utilisé par [[App.tsx]] (quelle page rendre) et [[Sidebar.tsx]] (l'entrée « Réseau » reste active sur les quatre onglets).
- `useLivePing()` : le ping en direct vers Cloudflare (`api.liveStats()`, lu chaque seconde, voir [[stats.rs]]). Garde les 24 derniers relevés. **Hors ligne** après 3 relevés sans réponse. [[NetTest.tsx]] reçoit cet état (`offline`).
- `Network({ tab })` : la page.

Chaque onglet est **une page à part** du store (`goTo("netopt")`…) : la recherche Ctrl+K et la barre en jeu peuvent y mener directement.

## Fonctionnement détaillé
- Racine : `div.pg-mod.pg-net.is-page` avec `data-tab`. Les styles viennent de `s5/pages/module.css` (socle commun avec les pages des modules) et de `s5/pages/net.css` (règles propres à Réseau), voir [[Styles de l'app (CSS)]].
- **En-tête** (comme les pages des modules, [[ModulePage.tsx]]) :
  - surtitre « {nom du module} // {accroche} » et grand titre « réseau », lus dans le module `network` du catalogue ;
  - à droite, le **bloc du ping** (`PingBlock`) : le dernier ping en grand, « ms » et « cloudflare » (ou « hors ligne »), et **24 barres**. Une barre est rouge (`pk`) quand c'est un pic : plus de 4 relevés, au-dessus de 1,5 fois la moyenne et de 8 ms de plus. Hors ligne ou avant le premier relevé : les barres grises de la maquette, pâlies.
- **Barre d'onglets** (`Tabs` de `s5/ui`) :

| Onglet | Libellé (en / fr) | Contenu |
|---|---|---|
| `network` | Tweaks / Optimisations | [[NetTweaks.tsx]] ; pastille du nombre de réglages réseau cochés ou à annuler |
| `netopt` | Packet Optimizer | [[NetOpt.tsx]] |
| `nettest` | Network test / Test réseau | [[NetTest.tsx]] |
| `route` | Rago Route | [[RouteTab.tsx]] |

- Sur l'onglet `network`, à droite des onglets : le bouton **« restart network card »** (« relancer la carte réseau »). Il lance le réglage `net_restart` du catalogue (`requestApply`), ou ouvre l'offre Premium s'il est fermé. Ce réglage n'est plus une ligne de la grille.
- L'onglet ouvert est marqué vu par `markSeen(tab)` ([[seen.ts]]).
- La barre « apply » des réglages ([[ApplyBar.tsx]]) est cachée sur `netopt`, `nettest` et `route` (`NO_APPLY_BAR`) : le Packet Optimizer a sa propre barre.

## Historique utile
- 25/10/2026 (`79535fa`) : Réseau passe en trois onglets avec le Packet Optimizer et le test réseau.
- 07/11/2026 (`342d09e`) : onglet Rago Route ajouté, d'abord seulement dans l'exe de test.
- 10/11/2026 (`a190565`, 1.3.0) : Rago Route dans tous les exe.
- 23/11/2026 (PR #123) : page refaite sur les maquettes v5. Disparus : le texte d'introduction (`hub.lead`), le surtitre « Connexion », les badges « Nouveau » des onglets et la pastille animée. Ajoutés : le ping en direct dans l'en-tête et le bouton « relancer la carte réseau ».

## Liens avec le reste
- Store : `goTo`, `selected`, `pendingUndo`, `applied`, `isLocked`, `setUpsell`, `requestApply`, `run` ([[store.tsx]]).
- Textes : `hub.tab.*`, `s5.net.*` ([[i18n.ts]]).
