---
type: code
tags: [code, app, react, page, jeux]
fichier: app/src/pages/Games.tsx
lignes: 553
maj: 2026-11-10
---
# Games.tsx

La page **« Jeux »** (bibliothèque) : jeux trouvés sur le PC, un preset par jeu, « Optimiser et jouer », launchers installés. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Bibliothèque de jeux]] (RAG-57). Côté Rust : [[games.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "games"`. Entrée « Jeux » de la [[Sidebar.tsx]], avec une puce « Nouveau » tant que la page n'a pas été vue ([[seen.ts]]).
- Lit et écrit dans [[store.tsx]] :
  - `gamePresets` : preset choisi pour chaque jeu ;
  - `mcLauncher` : launcher choisi pour Minecraft Java ;
  - `playing` : suivi du lancement ;
  - les fonctions `launchGame`, `optimizeAndPlay`, `requestUndo` et `toApply`.
- Appelle [[api.ts]] pour la liste des jeux et des launchers, les images, l'ajout et le retrait d'un jeu.
- **Gratuit / Premium** : la bibliothèque, « Jouer » et l'ouverture des launchers sont gratuits. **« Optimiser et jouer » est Premium**, même avec un preset de « Mes presets » : sans licence, le bouton porte un cadenas et ouvre la fenêtre Premium (`setUpsell("plan")`, voir [[Upsell.tsx]]).

## Ce que le fichier expose
- `Games()` : la page.
- Composants internes :
  - `Art` : image du jeu, ou ses initiales sur un fond coloré ;
  - `Launchers` : rangée des launchers ;
  - `PresetMenu` : menu de choix du preset.
- Fonction interne : `useLauncherIcons(ids)`.
- Constantes internes : `DEFAULT_PRESET`, `MC_JAVA` (`"mc:java"`), `LAUNCHERS` (noms affichés de `steam`, `epic`, `riot`, `battlenet`, `ubisoft`, `xbox`, `roblox`).

## Fonctionnement détaillé

### Chargement
- Au montage : `api.gamesList(false)` et `api.launchersList(false)` (commandes `games_list` et `launchers_list`). Le bouton rond « Chercher à nouveau les jeux » relance avec `refresh = true`, c'est-à-dire une nouvelle recherche sur le PC.
- La page écoute l'événement **`games:running`** (`api.onGamesRunning`) : la liste des jeux lancés en ce moment. Un jeu qui démarre ou s'arrête met à jour son état « En cours » et sa date de dernière partie.
- Un jeu lancé depuis Rago (`playing.status === "started"`) passe aussi en tête.
- **Images officielles** : `api.gameArt(id)` (commande `game_art`), trois demandes en même temps. Chaque id n'est demandé qu'une fois par visite. L'image est montrée entière, sur un fond fait de la même image floutée.

### Minecraft Java : une seule tuile
Les jeux dont `launcher === "minecraft"` sont les launchers et clients Minecraft (officiel, Lunar Client, Badlion…). Ils sont regroupés en **une tuile `mc:java`** :
- Le launcher utilisé est celui choisi (`mcLauncher`), sinon le dernier utilisé.
- Sur la grande carte, une rangée « Lancer avec » montre chaque launcher avec son icône (`api.launcherIcon`). Un clic change `mcLauncher`.
- C'est le jeu réellement lancé (`via`) qui part.
- Un preset choisi avant le regroupement, sur la tuile d'un launcher, reste valable.

### Ordre et filtres
- Tri : les jeux en cours d'abord, puis la dernière partie, puis le nom.
- Filtre segmenté : « Tous ({n}) », « Minecraft », « Jeux de tir », « Autres ». Un filtre sans jeu est caché.
- À côté du filtre : « Trouvés sur ce PC : Steam, Epic Games… » (sans Minecraft ni les jeux ajoutés à la main).

### Preset de chaque jeu
- Le choix est gardé dans `gamePresets` (`rago.gamePresets`). La valeur est `"builtin:<id>"`, `"mine:<id>"` ou `"none"`.
- **Preset d'office** (`defaultPreset`) :
  - le preset du jeu s'il en a un (`presetForGame` de [[catalog.ts]], qui compare le nom du jeu aux `match` des presets, la plus longue correspondance gagne) ;
  - sinon `mc_pvp` pour Minecraft ;
  - sinon `latency` pour les jeux de tir ;
  - sinon `fps`.
- Un preset perso supprimé, ou un preset du catalogue qui n'existe plus, revient au preset d'office.
- **`PresetMenu`** (puce « Preset : {nom} · {n} réglages ») propose, dans l'ordre :
  - les presets généraux du catalogue ;
  - « Par jeu » : les presets `game:true`, avec le logo du jeu (`GameLogo` et `usePresetIcons`, voir [[Petits composants de l'interface]]) ;
  - « Mes presets » ;
  - « Sans preset ».
  - Le menu se ferme par Échap ou par un clic à côté.

### Grande carte (le jeu choisi, sinon le premier)
- Image, état (« En cours », « Dernière partie · il y a 2 h », « Pas encore lancé »), nom (« Minecraft · Lunar Client » pour un client).
- Puces :
  - le preset ;
  - le launcher (ou « Ajouté par toi ») ;
  - la corbeille « Retirer de la bibliothèque ». Elle demande deux clics, et le texte précise que le jeu reste installé. Elle appelle `api.gameRemove` pour le jeu, ou pour chaque client de la tuile Minecraft.
- Pendant une partie, les vérifications de la session sont affichées (`SessionChecks` et `useSession` de [[SessionCard.tsx]]).
- **Boutons** :
  - Preset choisi, avec des réglages à appliquer, ou joueur sans licence : **« Optimiser et jouer »**. Avec une licence, cela appelle `optimizeAndPlay(jeu, entrées)` : fenêtre de confirmation ([[ConfirmDialog.tsx]]) avec les réglages du preset encore à appliquer (`toApply`), lot, puis lancement du jeu à la fin du lot. Si tout est déjà appliqué, le jeu démarre tout de suite.
  - À côté : « Jouer sans optimiser » (`launchGame`).
  - Avec une licence, si tout le preset est déjà appliqué : un seul bouton **« Jouer »**.
  - Sans preset : « Jouer ».
  - Tous les boutons sont grisés pendant un lot (`run`).
- **Ligne d'info sous les boutons** :
  - « Lancement… », ou en cas d'échec « Le jeu n'a pas pu démarrer. Ouvre son launcher une fois, puis réessaie. » ;
  - sinon, si des réglages du preset sont encore appliqués : « {n} réglages du preset restent allumés après la partie. », avec le lien **« Les retirer »** (`requestUndo`, la fenêtre de confirmation en mode retour arrière) ;
  - sinon, avec une licence : « {n} réglages du preset seront appliqués avant le lancement. ».

### Grille des jeux
Une carte par jeu : image, pastille « En cours », nom, launcher, puce du preset, bouton « Jouer » (lance sans optimiser). Un clic sur la carte la met en grande carte.

### Launchers (`Launchers`)
- Rangée affichée si au moins un launcher est installé : icône de l'exe (`api.launcherIcon`, commande `launcher_icon`), nom, état « Ouvrir » / « Ouvert » / « Introuvable ».
- Un clic appelle `api.launcherLaunch(id)` : le launcher s'ouvre sans droits d'administrateur.

### Ajouter un jeu
« Ajouter un jeu » : `api.gameAdd(titre)` ouvre une boîte de choix d'un `.exe` (« Choisir le programme du jeu »), puis la liste est rechargée et le nouveau jeu devient la grande carte. Un fichier qui n'est pas un programme n'ajoute rien, sans message.

## Données touchées
- `localStorage` via [[store.tsx]] : `rago.gamePresets`, `rago.mcLauncher`.
- Jeux ajoutés ou retirés : gardés par le moteur ([[games.rs]], listes `manual` et `hidden`). Un jeu trouvé puis retiré passe dans `hidden`.
- `api.gamesUnhide()` (commande `games_unhide`, qui vide la liste `hidden`) existe dans [[api.ts]] mais **aucun écran ne l'appelle** (OBSERVÉ par recherche dans `app/src/`, y compris [[Settings.tsx]]). Un jeu trouvé par un launcher puis retiré ne revient donc pas depuis l'interface. « Ajouter un jeu » sur son `.exe` crée une autre entrée, `manual:<empreinte>`, sans réafficher l'ancienne. À VÉRIFIER : bouton prévu puis oublié, ou retiré exprès ?

## Erreurs et cas limites
- Si la liste des jeux échoue, la page affiche l'état vide : « Aucun jeu trouvé sur ce PC », avec la liste des launchers cherchés et deux boutons (chercher à nouveau, ajouter).
- Pendant le premier chargement, une carte squelette est affichée.
- « Optimiser et jouer » avec un preset dont aucun réglage n'est à appliquer lance le jeu directement, sans fenêtre.

## Simulateur
Avec `npm run window` : une liste de jeux de démo, sans images (`gameArt` renvoie `null`). Avec `?playing`, le dernier jeu joué est « En cours » (démo de [[SessionCard.tsx]]). Les icônes des launchers peuvent être fournies par les captures (`window.__launcherIcons`).

## Liens avec le reste
- Fonctionnalités : [[Bibliothèque de jeux]], [[Presets]], [[Pendant la partie]].
- Moteur : [[games.rs]] (recherche des jeux, launchers, images, lancement sans droits d'administrateur), [[session.rs]] (vérifications pendant la partie).
- Textes : clés `games.*` de [[i18n.ts]]. Styles : sections « bibliothèque », « launchers » et « presets par jeu » de `features.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Le format `builtin:` / `mine:` / `none` de `gamePresets` est gardé chez les joueurs : ne pas le changer sans migration.
- Un nouveau launcher : son nom dans `LAUNCHERS` ici, sa détection dans [[games.rs]], et l'ajouter dans le texte `games.emptyLead`.
