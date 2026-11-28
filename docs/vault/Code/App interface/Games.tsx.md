---
type: code
tags: [code, app, react, page, jeux]
fichier: app/src/pages/Games.tsx
lignes: 649
maj: 2026-11-28
---
# Games.tsx

La page **« Games » / « Jeux »** (bibliothèque) : le jeu en tête avec sa grande illustration au bord déchiré, son preset, ses graphismes, sa résolution et sa saturation, puis tous les jeux en vignettes. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Bibliothèque de jeux]] (RAG-57). Côté Rust : [[games.rs]].

**Refaite le 23/11/2026 à l'identique de la maquette v5** (`rendus-v5/src/app-games-pi.html`, et `app-games-empty.html` sans jeu), demande de Sofiene : l'app doit être « strictement conforme » au design, avec la « cover du jeu en gros avec l'effet déchiré ». Voir [[Maquettes v5 dans l'app (s5)]]. Branche `claude/app-v5-games`, PR vers `staging` (voir [[État actuel]]). Pas encore essayée sur un vrai Windows.

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "games"`. Entrée « Games » de la [[Sidebar.tsx]], avec le nombre de jeux (0 compris).
- Racine `div.pg-games` : le CSS de la maquette est dans `s5/pages/pg-games.css` (généré, chaque sélecteur rattaché à `.pg-games`), l'état vide dans `s5/pages/empty.css`, et ce que la maquette ne montre pas dans `s5/app.css` (section « lanceur de jeux »).
- Lit et écrit dans [[store.tsx]] : `gamePresets` (preset de chaque jeu), `mcLauncher` (launcher de Minecraft Java), `playing` (suivi du lancement), `launchGame`, `optimizeAndPlay`, `requestUndo`, `toApply`, `goTo`, `premium`, `setUpsell`, `applied`, `myPresets`, `run`.
- Appelle [[api.ts]] : `gamesList`, `onGamesRunning`, `gameArt`, `gameAdd`, `gameRemove`, `launcherLaunch`, `displayProfiles`, `displayInfo`, `graphicsStatus`, `graphicsApply`, `graphicsRestore`.
- Ouvre [[PresetPicker.tsx]] pour choisir le preset d'un jeu.
- **Gratuit / Premium** : la bibliothèque, « Play », « Play without tweaks » et l'ouverture des launchers sont gratuits. **« Optimize and play » est Premium**, même avec un preset de « Mes presets » : sans licence, le bouton ouvre la fenêtre Premium (`setUpsell("plan")`, voir [[Upsell.tsx]]) et la phrase dessous dit « Premium: 21 tweaks applied before the game starts. ».

## Ce que le fichier expose
- `Games()` : la page.
- Interne : `useGraphics(jeu, titre, enCours)` (état, choix d'un niveau et retour à la copie d'avant des [[Graphismes des jeux]]) ; `defaultPreset`, `real`, `launcherId`, `kindOf` ; le nom court d'un jeu vient de `displayName` (`s5/text.ts`, partagé avec [[Display.tsx]] depuis le 23/11).
- Constantes : `DEFAULT_PRESET`, `MC_JAVA` (`"mc:java"`), `LAUNCHERS` (noms affichés : Steam, Epic Games, Riot Client, Battle.net, Ubisoft Connect, Xbox, EA app, Roblox), `LAUNCHER_ORDER` (ordre du tri « by launcher » : riot, steam, epic, minecraft, battlenet, ubisoft, ea, xbox, roblox, manual).

## Fonctionnement détaillé

### En-tête
« LIBRARY // 9 GAMES ON 6 LAUNCHERS » (`s5.games.kick` ; « 0 GAMES » sans jeu), le titre « GAMES » en affiche, et à droite « Rescan » (`gamesList(true)`, nouvelle recherche sur le PC) et « Add a game » (rouge). Le nombre de launchers compte chaque launcher Minecraft à part.

### Chargement
- Au montage : `api.gamesList(false)`, `api.displayProfiles()`, `api.displayInfo()`.
- L'événement **`games:running`** (`api.onGamesRunning`) met à jour « Playing » et la date de dernière partie. Un jeu lancé depuis Rago (`playing.status === "started"`) passe aussi en tête.
- **Images** (`coverOf` de `s5/art.ts`) : les 16 jeux qui ont un preset (Valorant, CS2, Fortnite, Apex, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft, Minecraft Bedrock) ont des images embarquées dans l'app : illustration du jeu en tête (`hero`, déjà recadrée sur le personnage, 760 × 750), vignette paysage (`wide`, 760 × 355). Les autres jeux demandent l'image officielle au moteur (`api.gameArt`, trois à la fois, une fois par visite) et la montrent entière sur la même image floutée (classe `fit`) ; sans image, leurs initiales.

### Minecraft Java : une seule vignette
Les jeux dont `launcher === "minecraft"` (officiel, Lunar Client, Badlion…) sont regroupés en **une vignette `mc:java`** nommée « Minecraft ». Le launcher lancé est celui choisi (`mcLauncher`), sinon le dernier utilisé. S'il y en a plusieurs, la puce du launcher sur l'illustration du jeu en tête est un bouton : chaque clic passe au launcher suivant. Un preset choisi avant le regroupement, sur la vignette d'un launcher, reste valable.

### Jeu en tête (le jeu cliqué, sinon le plus récent)
- **Illustration** à gauche (380 px), bord droit déchiré en rouge (`html.poster .hero::before` et le masque de `.hero .art`, `poster.css` des maquettes), puce du launcher en haut à gauche.
- **Rangée du haut** : puce rouge « Ready to play » (ou « Playing », « Starting… », « Didn't start »), puce « Last played 2 h ago » / « Not played yet », et la corbeille « Remove from library » : premier clic, elle devient rouge avec « Click again to remove, the game stays installed » ; deuxième clic, `api.gameRemove` (pour chaque launcher de la vignette Minecraft). Elle se remet à zéro si elle perd le focus.
- **Nom** en affiche (92 px ; 70 px au-delà de 13 lettres). « Tom Clancy's » et ™ ® sont retirés des noms.
- **Quatre cases** (`.score`) :
  - **preset** : nom du preset et « 21 tweaks » (réglages utilisables, `presetCount`), ou « No preset » / « the game as is ». Un clic ouvre [[PresetPicker.tsx]].
  - **in-game graphics** : onglets Performance, Balanced, Quality pour les jeux de [[graphics.ts]] (`graphicsForGame`) ; l'onglet rouge est le niveau lu dans les fichiers du jeu. Un clic écrit le niveau (`graphicsApply`). Onglets grisés si l'état n'est pas lu, pendant une écriture, si le jeu tourne, si aucun fichier n'est trouvé ou si tous sont en lecture seule ; l'infobulle dit alors pourquoi, sinon ce que le niveau change pour ce jeu (`GFX_DETAILS`). Autres jeux : « – », « not for this game ».
  - **resolution** : celle réglée pour ce jeu dans [[Couleurs et résolution]] (« 1280×960 », « stretched » ou « black bars »), sinon « native » et la taille de l'écran. Un clic ouvre [[Display.tsx]] sur ce jeu (`goTo("display", id)`).
  - **saturation** : la saturation réglée pour ce jeu, sinon celle de Windows (« 100 % », « windows is 50% » ; 100 % pour une carte AMD) ; « – », « not on this screen » sans saturation possible. Un clic ouvre aussi [[Display.tsx]].
- **Boutons** : avec un preset qui a encore des réglages à appliquer (ou sans licence) : **« Optimize and play »** (rouge, `optimizeAndPlay` : fenêtre de confirmation [[ConfirmDialog.tsx]], lot, puis lancement) et « Play without tweaks » (`launchGame`). Preset déjà tout appliqué avec une licence, ou sans preset : un seul bouton rouge « Play ». Tout est grisé pendant un lot (`run`).
- **Phrase à côté des boutons**, dans cet ordre : échec du lancement ; résultat d'un changement de graphismes (avec « Restore my settings » juste après une écriture) ; « {n} tweaks from the preset stay on after you play. » avec « Remove them » (`requestUndo`) quand tout est appliqué ; « {n} tweaks from the preset are applied before the game starts. » ; sans licence « Premium: … » ; sans preset « The game starts as is, with no tweaks. ».

### Tous les jeux
- Barre : « ALL GAMES », onglets **all / shooters / minecraft / others** avec leur nombre (un filtre sans jeu est caché), et à droite **sort : by launcher / recent / a-z** (« by launcher » d'office ; le choix tient tant que l'app est ouverte).
- **Vignette** (3 par ligne) : image paysage, puce du launcher (un clic **ouvre le launcher**, `launcherLaunch`, sans droits d'administrateur), puce rouge « Playing » si le jeu tourne, nom, « valorant preset / 2 h ago » (en minuscules ; « {nom} preset » pour un preset de jeu, le nom seul pour un preset tout fait), bouton réglages (ouvre [[PresetPicker.tsx]] pour ce jeu) et bouton lecture (avec une licence et un preset : comme « Optimize and play » ; sinon lance le jeu tel quel). Un clic sur la vignette la met en tête ; la vignette en tête a un contour rouge et son bouton lecture rouge.

### Aucun jeu
Panneau de `app-games-empty.html` : grand « 0 » en contour, grande manette imprimée (`BigIcon`), « NO GAMES FOUND », la liste des launchers cherchés en gras (Steam, Epic Games, Riot, Battle.net, Ubisoft Connect, l'app Xbox, les launchers Minecraft), « Add a game » et « Scan again », et « Installed somewhere else? Add the game's .exe and Rago sets up its preset. ». Aussi affiché si la liste des jeux échoue. Pendant le premier chargement : une carte vide à la place du jeu en tête.

### Preset de chaque jeu
- Gardé dans `gamePresets` (`rago.gamePresets`) : `"builtin:<id>"`, `"mine:<id>"` ou `"none"`.
- **Preset d'office** (`defaultPreset`) : le preset du jeu s'il en a un (`presetForGame` de [[catalog.ts]], la plus longue correspondance gagne), sinon `mc_pvp` pour Minecraft, `latency` pour les jeux de tir, `fps` pour le reste. Un preset perso supprimé ou un preset du catalogue disparu revient au preset d'office.

### Ajouter un jeu
`api.gameAdd(titre)` ouvre le choix d'un `.exe` (« Choisir le programme du jeu ») ; la liste est rechargée et le nouveau jeu passe en tête. Un fichier qui n'est pas un programme n'ajoute rien, sans message.

### Réafficher un jeu retiré (28/11, q85)
Décision de Sofiene du 28/11 (PR PR_NUM) : sous la bibliothèque, un lien discret `section.hidg` « Show hidden games (N) » (« Voir les jeux retirés (N) ») apparaît dès qu'un jeu détecté a été retiré et qu'il est toujours installé (`api.gamesHidden()`, chargé avec la liste et après chaque retrait). Un clic ouvre un panneau qui liste ces jeux par nom (« Minecraft (Lunar Client) » pour un client), avec leur launcher et un bouton `btn sm` « Show again » (« Remettre ») : `api.gameUnhide(id)`, puis la bibliothèque est rechargée ; le panneau se ferme quand il n'y a plus de jeu retiré. Le lien passe à « Hide this list » quand le panneau est ouvert. Visible aussi quand la bibliothèque est vide (tous les jeux retirés). Un jeu ajouté à la main puis retiré est oublié, il ne figure pas dans cette liste (on le rajoute par « Add a game »). Styles : `.pg-games .hidg` dans `s5/app.css` (charte v5 : lien condensé en capitales gris, rouge au survol ; panneau `.panel` en lignes séparées). Jamais testé sur Windows.

## Retiré le 23/11 (la maquette ne le montre pas)
- La rangée des launchers en haut de page : un launcher s'ouvre maintenant par la puce d'une vignette ; un launcher sans jeu trouvé ne s'ouvre plus depuis la page.
- La carte « Graphismes du jeu » (`GameGraphics.tsx`, supprimé) : devenue la case « in-game graphics ».
- Les réglages conseillés sous le jeu ([[GameTips.tsx]]) et les vérifications pendant la partie (`SessionChecks`) : ils restent dans la [[Barre en jeu]] ([[Overlay.tsx]]).
- Le menu déroulant des presets (`PresetMenu`, avec `GameLogo.tsx`, supprimé) : remplacé par [[PresetPicker.tsx]].

## Données touchées
- `localStorage` via [[store.tsx]] : `rago.gamePresets`, `rago.mcLauncher`.
- Jeux ajoutés ou retirés : gardés par le moteur ([[games.rs]], listes `manual` et `hidden` de `games.json`).

## Simulateur
Avec `npm run window` : la bibliothèque de la maquette (9 jeux : Valorant, League of Legends, Counter-Strike 2, Apex Legends, Rocket League, Fortnite, Minecraft par Lunar Client, Overwatch 2, Rainbow Six Siege), Valorant réglé en 1280×960 étiré à 100 % de saturation et en graphismes « balanced ». `?nogames` : bibliothèque vide. Un jeu retiré dans la démo passe dans la liste des jeux retirés (`mockHidden`). `?playing` : le dernier jeu joué est « Playing ». Voir [[api.ts]].

## Liens avec le reste
- Fonctionnalités : [[Bibliothèque de jeux]], [[Presets]], [[Graphismes des jeux]], [[Couleurs et résolution]].
- Moteur : [[games.rs]] (recherche des jeux, launchers, images, lancement sans droits d'administrateur), [[gamecfg.rs]] (graphismes).
- Textes : clés `games.*`, `gfx.*` et `s5.games.*` de [[i18n.ts]].

## À savoir avant de modifier
- Le format `builtin:` / `mine:` / `none` de `gamePresets` est gardé chez les joueurs : ne pas le changer sans migration.
- Un nouveau launcher : son nom dans `LAUNCHERS` et sa place dans `LAUNCHER_ORDER`, sa détection dans [[games.rs]], et l'ajouter dans le texte `s5.games.noneLead`.
- Le CSS de la page vient de la maquette : régénérer `pg-games.css` avec `port_s5.py page app-games-pi pg-games` plutôt que de l'éditer.
