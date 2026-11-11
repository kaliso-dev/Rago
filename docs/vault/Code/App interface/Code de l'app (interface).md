---
type: code
tags: [code, app, react, carte]
fichier: app/src/
lignes: 30056
lignes: 30663
lignes: 29270
maj: 2026-11-11
---
# Code de l'app (interface)

La **carte du code de l'interface React** de l'app Windows (`app/src/`). Elle présente :
- l'arbre des composants ;
- la façon dont la page affichée est choisie ;
- le cycle d'une action, du clic jusqu'au moteur Rust et retour ;
- tous les événements écoutés ;
- le simulateur `npm run window` ;
- la liste de toutes les fiches de code.

Côté moteur : [[Code de l'app (Rust)]]. Vue produit : [[App Windows]]. Architecture d'ensemble : [[Architecture de l'app]]. Reprendre le travail : [[Reprendre le développement]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`), sauf mention contraire. Ajouts du 11/11 pour [[Couleurs et résolution]] ([[Display.tsx]], [[pros.json]], puce de [[Games.tsx]]) : branche `claude/project-thread-7n0ikn`, jamais testés sur Windows.

## En bref
- **Pile** :
  - React 19 et TypeScript, construits par Vite ([[Configuration du front (Vite, npm)]]) ;
  - animations `motion/react`, icônes `lucide-react` ;
  - affichage par Tauri 2 dans WebView2.
- **Deux fenêtres, deux pages HTML** :
  - l'app (`index.html`, [[main.tsx (app)]]) ;
  - la barre en jeu (`overlay.html`, [[main.tsx (barre en jeu)]]).
- **Pas d'accès réseau dans l'interface** (CSP `connect-src ipc:`, voir [[Configuration Tauri]]). Tout passe par une commande Rust :
  - réglages, licence, compte, tests réseau, images des jeux, ouverture d'URL ;
  - [[api.ts]] et [[accountApi.ts]] sont les deux seules portes vers le moteur.
- **Pas de routeur** : la page affichée est une simple valeur `page` dans le store. Pas de Redux non plus : un seul contexte React, [[store.tsx]], plus le contexte du compte, [[account.tsx]].
- **Mode démo** : hors de Tauri (`isTauri` faux), les mêmes fonctions sont simulées dans le navigateur. Cela sert au simulateur `npm run window`, aux captures et aux tests de l'interface.
- Taille : 30 056 lignes dans `app/src/` (fichiers `.ts`, `.tsx`, `.css` et `.json`) avec la page Outils refaite de la PR #90 (11/11, pas encore fusionnée) ; 29 270 sur `staging`. Les plus gros fichiers sont :
  - `catalog.json` (8050 lignes) ;
  - `features.css` (3730 lignes) ;
  - `app.css` (2935 lignes) ;
  - `i18n.ts` (2246 lignes) ;
  - `api.ts` (1460 lignes) ;
- Taille : 30 663 lignes dans `app/src/` (fichiers `.ts`, `.tsx`, `.css` et `.json`). Les plus gros fichiers sont :
  - `catalog.json` (8050 lignes) ;
  - `features.css` (3850 lignes) ;
  - `app.css` (2935 lignes) ;
  - `i18n.ts` (2274 lignes) ;
  - `api.ts` (1485 lignes) ;
  - `NetOpt.tsx` (1090 lignes) ;
  - `Tools.tsx` (760 lignes) ;
  - `store.tsx` (731 lignes).

## Arbre des composants (fenêtre principale)
```
main.tsx
└─ StrictMode
   └─ StoreProvider                 (lib/store.tsx : tout l'état de l'app)
      └─ AccountProvider            (lib/account.tsx : compte Rago, avis, invitation)
         └─ App                     (App.tsx)
            └─ MotionConfig         (mouvement réduit ou non)
               └─ div.app
                  ├─ TitleBar               barre de titre, recherche Ctrl+K, boutons de fenêtre
                  ├─ div.body
                  │  ├─ Sidebar             navigation, compte, offre Premium
                  │  ├─ main
                  │  │  ├─ LicenseNotice    message de licence (fin, appareil, réparation)
                  │  │  └─ PageBoundary     garde-fou d'erreur
                  │  │     └─ la page courante (voir « Navigation »)
                  │  ├─ ApplyBar            barre « Appliquer » en bas
                  │  └─ RunOverlay          panneau d'exécution d'un lot
                  ├─ ConfirmDialog          confirmation avant un lot
                  ├─ SearchPalette          recherche Ctrl+K
                  ├─ Upsell                 fenêtre Premium (offre, prix, connexion)
                  ├─ ReviewPrompt           invitation à laisser un avis
                  ├─ ReviewDialog           connexion au compte et avis
                  ├─ ResetToast             fin d'une remise à zéro en arrière-plan
                  └─ Splash                 écran d'ouverture
```
- Barre en jeu : `overlay/main.tsx` → `Overlay`. Il n'y a **aucun fournisseur** : c'est une fenêtre séparée, qui lit la langue dans `localStorage` et parle au moteur par [[api.ts]]. Voir [[Overlay.tsx]].

## Navigation : comment la page est choisie
- `page` est un `useState("dashboard")` de [[store.tsx]], **non gardé** : chaque lancement s'ouvre sur l'accueil. `goTo(page, tweakId?)` change la page, et peut aussi mettre un réglage en avant (`focusTweak`, `focusSeq`).
- [[App.tsx]] choisit le composant par une suite de conditions :

| `page` | Composant | Fiche |
|---|---|---|
| `dashboard` | `Dashboard` | [[Dashboard.tsx]] |
| `settings` | `Settings` | [[Settings.tsx]] |
| `share` | `Share` | [[Share.tsx]] |
| `games` | `Games` | [[Games.tsx]] |
| `display` | `Display` | [[Display.tsx]] |
| `network`, `netopt`, `nettest`, `route` | `Network` (onglet = page) | [[Network.tsx]] → [[ModulePage.tsx]], [[NetOpt.tsx]], [[NetTest.tsx]], [[RouteTab.tsx]] |
| `tools` | `Tools` | [[Tools.tsx]] |
| `analysis` | `Analysis` | [[Analysis.tsx]] |
| tout autre id (module du catalogue : `latency`, `gpu`, `windows`, `hitreg`, `minecraft`, `expert`, `restore`…) | `ModulePage` | [[ModulePage.tsx]] |

- **Changement de page** :
  - la page est dans un bloc animé dont la clé est la page ; les quatre onglets de Réseau partagent la clé `network` et ne rejouent donc pas l'animation ;
  - [[App.tsx]] remonte la zone de défilement en haut ;
  - le garde-fou d'erreur repart de zéro.
- **Qui appelle `goTo`** :
  - la [[Sidebar.tsx]] ;
  - les cartes de l'accueil ;
  - la recherche ([[SearchPalette.tsx]], vers le module du réglage, avec le réglage en avant) ;
  - la puce « Couleurs et résolution » de [[Games.tsx]] (`goTo("display", id du jeu)` : `focusTweak` porte alors l'id du jeu, lu par [[Display.tsx]]) ;
  - les liens entre pages (Paramètres → Partage et support, Test réseau → Packet Optimizer…) ;
  - l'événement **`app:goto`** : la barre en jeu (« Ouvrir Rago Optimizer », `premium` ouvre l'offre) et [[Rago OS]] (forme `page#réglage`).
- Pages « nouvelles » : une puce dans la barre latérale tant que la page n'a pas été vue ([[seen.ts]], `rago.seenPages`).

## Cycle d'une action : appliquer des réglages
1. **Clic** :
   - un interrupteur de [[TweakRow.tsx]] coche le réglage (`toggle` du store, qui ajoute à `selection`) ;
   - « Optimiser et jouer », un preset ou les optimisations gratuites préparent un lot ;
   - **rien ne part encore**.
2. **Barre du bas** ([[ApplyBar.tsx]]) : « Appliquer » appelle `requestApply()`, qui met `confirm` dans le store.
3. **Confirmation** ([[ConfirmDialog.tsx]]) :
   - liste, redémarrage nécessaire, point de restauration, WMIC si besoin ;
   - « Appliquer » appelle `startRun(ids, options)` du store.
4. **Store → api** : `startRun` construit les `RunItem` :
   - le point de restauration d'abord ;
   - puis les retours arrière ;
   - puis les réglages, avec leur variante et leurs paramètres OptiFine ;
   - il ouvre le panneau ([[RunOverlay.tsx]]) et appelle `api.runTweaks(items)`.
5. **api → Rust** : `invoke("run_tweaks", { items })` ([[api.ts]] → [[lib.rs]] → [[runner.rs]]). Le moteur vérifie :
   - la licence ;
   - les places du plan gratuit (`free_slots`, voir [[free.json]] et [[catalog.rs]]) ;
   - les scripts Premium.
   - Il renvoie un `runId`, ou une erreur traduite par le store : `premium_required`, `free_slots`, `premium_scripts_unavailable` ou `reset_running`.
6. **Événements** : le moteur exécute chaque script et envoie :
   - **`run:item`** (état d'une ligne : en cours, fait, erreur, durée) ;
   - **`run:log`** (lignes du journal) ;
   - **`run:done`** (bilan : réussis, erreurs, annulé, point de restauration raté).
7. **Retour à l'interface** : le store met à jour `run`. À la fin (`run:done`), il :
   - marque l'analyse du PC comme à refaire ([[analysis.ts]]) ;
   - lance le jeu si c'était « Optimiser et jouer » ;
   - remet la sélection si le point de restauration a échoué ;
   - relit l'historique (`history`) et les réglages appliqués (`applied`).
   - [[RbwStatus.tsx]] et la barre en jeu relisent aussi leur état sur `run:done`.
- **Autres actions** : elles suivent le même chemin, clic → `api.*` → `invoke` → commande Rust, avec une réponse directe et parfois des événements. C'est le cas du Packet Optimizer (`netopt_run` + `netopt:line`), du test réseau (`net_test` + `nettest:*`), des outils, du compte, de la licence, des jeux.
- **Remise à zéro en arrière-plan** (fin de Premium, déconnexion) : le moteur la lance seul, sans fenêtre, puis envoie **`reset:done`**. Le store relit les réglages appliqués et affiche [[ResetToast.tsx]].

## Tous les événements écoutés
Les 13 événements Tauri que l'interface écoute, tous déclarés dans [[api.ts]] :

| Événement | Envoyé par | Écouté par | Contenu |
|---|---|---|---|
| `run:item` | [[runner.rs]] | [[store.tsx]] | état d'une ligne du lot |
| `run:log` | [[runner.rs]] | [[store.tsx]] | ligne du journal |
| `run:done` | [[runner.rs]] | [[store.tsx]], [[RbwStatus.tsx]], [[Overlay.tsx]] | bilan du lot |
| `reset:done` | [[lib.rs]] (remise à zéro, [[reset.rs]]) | [[store.tsx]] | bilan de la remise à zéro |
| `netopt:line` | [[lib.rs]] (`netopt_run`, [[netopt.rs]]) | [[NetOpt.tsx]], [[NetTest.tsx]] (diagnostic) | ligne du moteur réseau, ou avancement |
| `nettest:sample` | [[lib.rs]] (`net_test`, [[nettest.rs]]) | [[NetTest.tsx]], [[NetOpt.tsx]] (analyse) | un essai de ping |
| `nettest:measure` | [[lib.rs]] (`net_test`) | [[NetTest.tsx]] | résultat d'un serveur |
| `games:running` | [[lib.rs]] ([[games.rs]]) | [[Games.tsx]], [[Display.tsx]] | jeux lancés en ce moment |
| `games:session` | [[lib.rs]] ([[session.rs]]) | [[SessionCard.tsx]] (et `useSession` dans [[Games.tsx]]) | état de la partie en cours |
| `update:ready` | [[update.rs]] | [[UpdateCard.tsx]] | mise à jour téléchargée, prête |
| `overlay:mode` | [[overlay.rs]] | [[Overlay.tsx]] | barre ouverte ou pastille |
| `display:state` | [[lib.rs]] ([[display.rs]]) | [[Display.tsx]] | couleurs et résolution posées en ce moment, dernière erreur |
| `app:goto` | [[lib.rs]] (barre en jeu, pont de [[Rago OS]]) | [[store.tsx]] | page à ouvrir (`page#réglage`, `premium`) |

- Chaque écouteur renvoie une promesse de désinscription, appelée quand le composant disparaît.
- Les écouteurs des pages ignorent ce qui arrive après leur fermeture (garde `live`).

## Le mode démo et le simulateur `npm run window`
- `isTauri = "__TAURI_INTERNALS__" in window`. Ensuite `api = isTauri ? tauriApi : mockApi` dans [[api.ts]], et le même choix est fait dans [[accountApi.ts]].
- **`mockApi`** répond à chaque fonction avec des données plausibles, après un petit délai (`sleep`). Les événements de démo passent par un **bus `EventTarget`** interne (`emit` / `on`), avec les mêmes noms que les vrais événements. L'interface ne voit donc pas la différence.
- **État de la démo gardé dans `localStorage`** : `rago.demoApplied`, `rago.demoLicense`, `rago.demoDisplay`, `rago.demoRestoreFail`, `rago.demoRepair`, `rago.demoNoGpu`, `rago.demoSim`, et le compte `rago.demoAccount` ([[accountApi.ts]]).
- **Paramètres d'URL de la démo** :
  - `?why=…` : diagnostic du téléphone de Rago Route ;
  - `?playing` : une partie en cours ;
  - `?fastnet` : test réseau instantané ;
  - `?update` : une mise à jour prête ;
  - `?pill` et `?passive` : la barre en jeu en pastille ou passive ;
  - `?estimate` : ping estimé dans la barre en jeu ;
  - `?amd` et `?intel` : page Couleurs et résolution avec une carte AMD, ou un écran sans saturation.
- **`npm run window`** ([[window.mjs]]) :
  - lance le serveur Vite ;
  - ouvre Chrome, Edge ou Brave en mode application, à la taille de la fenêtre de l'app (1280 × 820), avec un profil à part qui garde l'état de la démo ;
  - connexion de démo : n'importe quel e-mail et 4 caractères ou plus = Premium ; un e-mail commençant par « free » = plan gratuit.
  - Détails : [[Configuration du front (Vite, npm)]], [[Développer et tester]].

## Données gardées par l'interface (`localStorage`)
- **Store** ([[store.tsx]], préfixe `rago.`) : `lang` (`en` par défaut), `motion`, `selection`, `pendingUndo`, `variants`, `mcDir`, `cleanTrim`, `myPresets`, `gamePresets`, `mcLauncher`, `activatedAt`.
- **Autres modules** :
  - `rago.seenPages` ([[seen.ts]]) ;
  - `rago.analysis` ([[analysis.ts]]) ;
  - `rago.netoptDraft` ([[netopt.ts]]) et `rago.netoptFolds` ([[NetOpt.tsx]]) ;
  - `rago.netLast`, `rago.netPick` et `rago.netTarget` ([[NetTest.tsx]]) ;
  - `rago.route.link` ([[RouteTab.tsx]]) ;
  - `rago.displayGame` ([[Display.tsx]]) ;
  - `rago.reviewPrompt2` ([[account.tsx]]).
- **Tout ce qui compte vraiment est gardé par le moteur**, pas par l'interface : réglages appliqués, historique, licence, sauvegardes réseau, jeux. Voir [[Code de l'app (Rust)]].

## Toutes les fiches de code de l'interface

### Entrées et cadre
[[main.tsx (app)]], [[main.tsx (barre en jeu)]], [[App.tsx]], [[Overlay.tsx]], [[Configuration du front (Vite, npm)]], [[Styles de l'app (CSS)]].

### Pages (`app/src/pages/`)
[[Dashboard.tsx]], [[ModulePage.tsx]], [[Network.tsx]], [[NetOpt.tsx]], [[NetTest.tsx]], [[RouteTab.tsx]], [[Games.tsx]], [[Display.tsx]], [[Tools.tsx]], [[Analysis.tsx]], [[Settings.tsx]], [[Share.tsx]].

### Composants (`app/src/components/`)
- Cadre et navigation : [[TitleBar.tsx]], [[Sidebar.tsx]], [[SearchPalette.tsx]], [[Splash.tsx]].
- Réglages et lots : [[TweakRow.tsx]], [[ApplyBar.tsx]], [[ConfirmDialog.tsx]], [[RunOverlay.tsx]], [[ResetToast.tsx]].
- Licence et Premium : [[LicenseGate.tsx]], [[LicenseNotice.tsx]], [[Upsell.tsx]], [[SubscriptionCard.tsx]].
- Compte et avis : [[ProfileCard.tsx]], [[ReviewDialog.tsx]], [[ReviewPrompt.tsx]].
- Cartes : [[UpdateCard.tsx]], [[BackgroundCard.tsx]], [[SessionCard.tsx]], [[LiveStatsCard.tsx]], [[RbwStatus.tsx]].
- Réseau et presets : [[NetTools.tsx]], [[PresetEditor.tsx]].
- Jeux : [[GameGraphics.tsx]] (graphismes des jeux, branche du 11/11).
- Petites briques (`ui.tsx`, `Modal`, `Logo`, `icons.ts`, `Avatar`, `GameLogo`, `PageBoundary`, `vite-env.d.ts`) : [[Petits composants de l'interface]].

### Logique (`app/src/lib/`)
[[api.ts]], [[store.tsx]], [[catalog.ts]], [[i18n.ts]], [[account.tsx]], [[accountApi.ts]], [[accountText.ts]], [[analysis.ts]], [[netopt.ts]], [[share.ts]], [[art.ts]], [[gameLogos.ts]], [[graphics.ts]], [[seen.ts]].

### Données (`app/src/data/`)
[[catalog.json]] (généré, voir [[Code du générateur de catalogue]]), [[free.json]] et [[pros.json]] (écrits à la main).

## À savoir avant de modifier
- Une nouvelle commande Rust demande trois choses :
  - sa signature dans l'interface `Api` de [[api.ts]] ;
  - son appel dans `tauriApi` ;
  - sa **simulation dans `mockApi`**, sinon le simulateur casse.
- Une nouvelle page demande :
  - sa condition dans [[App.tsx]] ;
  - son entrée dans [[Sidebar.tsx]] et son icône (`MODULE_ICONS`) ;
  - ses textes dans [[i18n.ts]] (français et anglais) ;
  - éventuellement sa puce « Nouveau » ([[seen.ts]]).
- Les règles d'accès (Premium, plan gratuit) sont appliquées **deux fois** : dans l'interface ([[store.tsx]]) et dans le moteur ([[catalog.rs]], [[lib.rs]]). L'interface n'est jamais la seule barrière.
- Après le travail : `npm run build` vérifie les types (règles strictes, voir [[Configuration du front (Vite, npm)]]).
