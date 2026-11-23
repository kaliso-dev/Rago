---
type: code
tags: [code, app, typescript, react, design]
fichier: app/src/s5/
maj: 2026-11-23
---
# Maquettes v5 dans l'app (`app/src/s5/`)

Depuis le 23/11/2026, l'app reprend **le HTML et le CSS des maquettes v5 tels quels** ([[Charte graphique]]), page par page, au lieu d'un habillage de l'ancienne interface. Demande de Sofiene du 23/11 : l'app livrée par la PR #108 « n'est pas conforme au design », il faut la refaire « strictement conforme », au pixel près, quitte à changer le back-end. Fiche parente : [[Code de l'app (interface)]].

## Fichiers
| Fichier | Rôle |
|---|---|
| `s5/base.css` | **généré** : `rago5.css` + `round.css` + `poster.css` + `frame.css` des maquettes, les effets des boutons d'`anim.css` et le CSS injecté par `printicons.js` et `icons.js`. Ne pas éditer à la main. Une seule règle de la maquette est retirée par le générateur (23/11) : `.scrim{display:none}` (voile du rail replié), car dans l'app `.scrim` est le fond des fenêtres ; elle rendait toutes les fenêtres invisibles (voir [[Bugs et incidents]]). |
| `s5/pages/<page>.css` | **généré** : le `<style>` d'une maquette, chaque sélecteur rattaché à la racine de la page (`.pg-dash` pour le tableau de bord, `.pg-games` pour les jeux, `.pg-display` pour Display, `.pg-mod` pour les modules ; dans `pg-display.css`, l'image de fond de l'aperçu est retirée à la main, la page pose la capture du jeu choisi). Le `.main` de la maquette devient la racine de la page. |
| `s5/pages/empty.css` | `empty.css` des maquettes (écrans vides et fenêtre d'erreur), `.empty` devenu `.empty.panel` (au départ pour ne pas toucher l'ancienne classe `.tools-row.empty`, retirée le 23/11 avec l'ancienne page Outils). |
| `s5/pages/picker.css` | fenêtre du choix de preset ([[PresetPicker.tsx]]) : le `<style>` de `app-preset-picker.html` et les règles de fenêtre de `win.css` (`.dim2`, `.mdl`, `.ml`, `.mf`), limitées à `.ovl` en attendant le portage de toutes les fenêtres (`win.css` a un `.grp` qui toucherait la barre latérale). |
| `s5/pages/module.css` | **généré** par `rendus-v5/outils/port_mod.py` : `module.css` des maquettes (`rendus-v5/src/module.css`, partagé par les 10 maquettes `app-module-*.html`) sous `.pg-mod` ; la barre « apply » (`.apply`, `.ap`) limitée à `.win`. Sert à [[ModulePage.tsx]], [[TweakRow.tsx]], [[ApplyBar.tsx]], à la page Réseau ([[Network.tsx]] et ses onglets, socle commun de ses maquettes) et à la page Outils ([[Tools.tsx]], socle commun de sa maquette). |
| `s5/pages/tools.css` | **généré** par `rendus-v5/outils/port_tools.py` (23/11, PR #124) : `rendus-v5/src/tools.css` (feuille de la maquette `app-tools.html`, posée sur `module.css`) sous `.pg-tools`, sans `.main{padding-bottom}`. Sert à [[Tools.tsx]]. |
| `s5/pages/pages.css` | **généré** par `rendus-v5/outils/port_pages.py` (23/11, PR #125) : `rendus-v5/src/pages.css` (feuille commune aux maquettes `app-mouse.html`, `app-settings*.html` et `app-share*.html`, posée sur `module.css`) sous `.pg-pages`. Sert à [[Mouse.tsx]], [[Settings.tsx]] (avec [[ProfileCard.tsx]], [[SubscriptionCard.tsx]], [[BackgroundCard.tsx]], [[SessionCard.tsx]]) et [[Share.tsx]]. |
| `s5/pages/net.css` | **généré** par `rendus-v5/outils/port_net.py` (23/11) : les règles propres aux onglets de Réseau (`app-network-{packet,test,route}-pi.html`), celles qui ne sont pas déjà dans le socle `module.css`, sous `.pg-net` ; la barre du Packet Optimizer sous `.win` (classe `.ap.net`). Sert à [[Network.tsx]], [[NetOpt.tsx]], [[NetTest.tsx]], [[RouteTab.tsx]]. |
| `s5/pages/vs.css` | ligne déchirée du face à face de Display qu'on glisse : les règles `.half.before` / `.half.after` d'`anim.css` (bande déchirée de 150 px posée à `--xl`), sans `html.anim`. |
| `s5/app.css` | écrit à la main : seulement ce que la fenêtre change (barre latérale et barre du haut fixes, page qui défile dessous, boutons `<button>` à la place des `<span>` des maquettes, états que les maquettes ne montrent pas). Bloc « modules » (23/11) : marge du bas pour la barre « apply », remise à zéro des `<button>` des carreaux, curseurs, détail `.pop` au survol après 0,35 s, mise en valeur `mod-focus`, menu des jeux `.pick-menu`, survols. Bloc « Packet Optimizer » (23/11, PR #123) : cartes des presets en `<button>`, curseurs, menu `.lmenu` du type de connexion, blocs « advanced » et « expert », panneau d'un outil `.tres`, panneau de l'analyse `.scan`, barre `.ap.net` et ses menus `.pop`. Bloc « Outils » (23/11, PR #124) : marge du bas (16 px), résultats `.ok.muted` et `.ok.bad` des cartes « en un clic », lignes et cases cliquables (`role="checkbox"`), modes d'alimentation cliquables, lignes d'attente `.li.wait`, pied `.sub.ok` / `.sub.bad`, confirmation `.ask`, raccourcis `.pn`, liens `.site` et `.go2` en `<button>`, interrupteur d'un programme gardé à pleine couleur. Bloc « Souris » (23/11, PR #125) : marge du bas (16 px), colonnes égales qui ne s'élargissent pas avec les champs, zone de clic en `<button>`, `<input>` et `<select>` transparents dans les cases `.in` (sans flèches ni anneau blanc, bordure rouge au focus), encadré neutre « aucun rebond », lien « start again » du titre. Bloc « Paramètres » (23/11, PR #126) : lignes `.sr` en `<button>` (lien vers Partage, licences `.lcn`), boutons `.acts` de la photo, liens `.lnk.dim`, champ du nom `.in2` transparent avec sa bordure rouge au focus et « save » rouge `.sv.on` quand le nom change, photo dans `.av`, étoiles vides `.stars i`, notes `.sr.nt`, ligne grisée `.sr.dis` (interrupteur à pleine couleur), raccourci en cours d'enregistrement `.kb.rec`, curseur des `.seg2`, petite corbeille `.ic.del` en bas à droite de la ligne de l'avis. Bloc « Partage » (23/11, PR #127) : retour « settings » du surtitre en `<button>`, cases `.in3` avec un `<input>` transparent (bordure rouge au focus), bouton « copy » du ticket avec les marges de la maquette (où c'est un `<span>` qui prend la règle `.tkr span`), lignes du rapport à cocher (`role="checkbox"`), texte du rapport qui défile dans son cadre (zone `.tx`, barre de 4 px, fondu du bas retiré en fin de texte). Outils, Souris, Paramètres et Partage gardent 16 px en bas comme leurs maquettes, et 106 px quand la barre « apply » est affichée. Aussi : libellés de la barre latérale sur une ligne (« Carte graphique » passait à la ligne en français). Aussi : icônes imprimées des petits boutons à 18 px sur les pages des modules, le tableau de bord et la barre « apply » (comme les maquettes), et icône de chargement visible dans les boutons (`.btn svg.spin`). |
| `s5/iconData.ts` | **généré** depuis `icons.js` et `bigicons.js` : icônes au trait, icônes imprimées, alias des noms (`grid` → `dashboard`…), filtres, tracé du R, grandes icônes des écrans vides (`BIG_ICONS` : games, offline, alert, library). |
| `s5/I.tsx` | `<I n="…"/>` remplace `<i data-i="…">` des maquettes, avec les couleurs que `icons.js` choisit selon le fond ; `IconDefs`, `LogoR`, `Seg` (barre à segments `.seg`), `BigIcon` (`data-big` des maquettes), `Rich` (texte avec des mots en gras écrits `**mot**`). |
| `s5/ui.tsx` | `Tabs` : les onglets `.tabs` des maquettes, cliquables au clavier et à la souris, avec leur compte (`<em>`) et leur étiquette (`.k`) ; `Sw` : l'interrupteur `.sw` (un `<button role="switch">`). |
| `s5/art.ts` | images des jeux embarquées (`assets/s5/games/<sorte>/<jeu>.webp`), clé d'un jeu d'après son id ou son nom (`gameKey`), `coverOf(jeu, sorte)`, `artByKey(clé, sorte)` ; photos des pros (`assets/s5/pros/<id>.webp`, 280 × 430) par `proPhoto(id)`. |
| `s5/text.ts` | « 2 days ago », « last week » (`ago` ; « 2 h ago » avec `short`) et date courte (`shortDate`) ; `displayName` : nom court d'un jeu (sans « Tom Clancy's » ni ™ ®), pour Jeux et Display ; `dayMonth` (« 12 Nov » ; avec l'année : « 10 Sep 2021 » ; en anglais, le mois court américain après le jour, car en-GB écrit « Sept »), `clock` (« 21:04 », sur 24 h) et `dayTime` (« Today 21:14 », « Yesterday 18:02 », « 20 Nov 22:41 ») pour les modules et l'historique. |

Les fichiers générés viennent de `rendus-v5/outils/port_s5.py` (dossier du projet, pas dans le dépôt) : `icons`, `base`, `page <maquette> <classe>` ; `module.css`, `net.css`, `tools.css` et `pages.css` ont leur propre script (`port_mod.py`, `port_net.py`, `port_tools.py`, `port_pages.py`, même dossier). Les images citées par le CSS des maquettes sont copiées dans `app/src/assets/s5/img/` (dont `img/game/grass-block.svg`, le bloc d'herbe de Minecraft, 23/11).

## Images des jeux (23/11)
Pour les 16 jeux qui ont un preset (clés `valorant`, `cs2`, `fortnite`, `apex`, `pubg`, `r6`, `overwatch`, `rivals`, `finals`, `tarkov`, `rl`, `lol`, `roblox`, `gta`, `minecraft`, `bedrock`), `app/src/assets/s5/games/` contient, en WebP (5 Mo en tout) :
- `cover/` : cover verticale 400 × 600 ([[PresetPicker.tsx]]) ;
- `hero/` : grande illustration recadrée sur le personnage, 760 × 750 (jeu en tête de [[Games.tsx]]) ; pour CS2, la cover (son illustration large n'est qu'un fond orange) ;
- `wide/` : vignette paysage 760 × 355 (vignettes de [[Games.tsx]], jeux du [[Dashboard.tsx]]) ; CS2 garde l'image de la maquette (`cs2.jpg`) ;
- `play/` : capture en jeu 1600 × 900 (aperçu avant / après de [[Display.tsx]]) ; pour Valorant, la capture d'Ascent de la maquette (`img/scenes/valorant-ascent.jpg`).
Photos des pros (23/11) : `app/src/assets/s5/pros/` (WebP 280 × 430, 7 joueurs : tenz, kaajak et demon1 de la maquette ; device, donk, m0nesy et niko de `rago-redesign/images/pros/`), recadrées en haut au centre. Les autres pros de [[pros.json]] ont leurs initiales.

Elles viennent du dossier du projet `rago-redesign/images/` (sources dans son `sources.md`), converties par `rendus-v5/outils/prep_art.py`. **Droits d'utilisation à vérifier avant la prod** (dit à Sofiene le 23/11).

## Fenêtre
La maquette est une image de 1440 × 900 : la fenêtre s'ouvre à cette taille (`tauri.conf.json`), et sur un écran plus petit `fit_main_window` (`lib.rs`) la réduit à la zone de travail (minimum 1080 × 680). À 1440 × 900, en haut de page, l'app et la maquette se superposent. La barre de défilement (10 px) prend sa place sur la marge droite de la page.

## Classes de l'ancienne interface renommées
Pour que le CSS des maquettes ne touche pas les pages pas encore refaites : `.btn` → `.obtn`, `.chip` → `.ochip`, `.live` → `.olive`, `.main` → `.omain`, `.wc` → `.owc` dans `styles/*.css` et les composants qui s'en servent.

## Avancement (23/11)
| Partie | Maquette | État |
|---|---|---|
| Cadre : barre latérale, barre du haut, carte de mise à jour, bandeau de licence | `shell5.js`, `frame.css` | refait |
| Tableau de bord | `app-dashboard-v2-pi.html` | refait, dans `staging` (PR #119) |
| Jeux (lanceur, aucun jeu) | `app-games-pi.html`, `app-games-empty.html` | refait, dans `staging` (PR #120) |
| Choix du preset (covers verticales) | `app-preset-picker.html` (nouvelle, 23/11) | refait, dans `staging` (PR #120), maquette à valider par Sofiene |
| Display (aperçu avant / après, ligne « vs » à glisser, photos des pros) | `app-display-pi.html` | refait, dans `staging` (PR #121) |
| Pages des modules (Latence, Carte graphique, Windows, Hitreg, Minecraft, RBW Mod, Mode jeu, Mode expert, Restauration), barre « apply » | `app-module-*.html` (10 maquettes, dont Restauration vide) | refait, dans `staging` (PR #122) |
| Réseau : réglages, Packet Optimizer, test réseau (et hors ligne), Rago Route | `app-network-pi.html`, `app-network-packet-pi.html`, `app-network-test-pi.html`, `app-network-offline.html`, `app-network-route-pi.html` | refait, dans `staging` (PR #123) |
| Outils | `app-tools.html` | refait, dans `staging` (PR #124) |
| Souris | `app-mouse.html` | refait, dans `staging` (PR #125) |
| Paramètres (Premium, gratuit, résilié) | `app-settings.html`, `app-settings-states.html` | refait, dans `staging` (PR #126, fusionnée le 23/11) ; les fenêtres « Before you cancel » et de déconnexion restent à l'ancien style jusqu'aux fenêtres |
| Partage et support (et ses états) | `app-share.html`, `app-share-states.html` | refait, dans `staging` (PR #127, fusionnée le 23/11) |
| Le reste (analyse, fenêtres, barre en jeu, démarrage) | voir l'inventaire des maquettes | à faire, ancienne interface en attendant. Démarrage : animation de 2 secondes fixes, sans dépendre de la vitesse d'ouverture de l'app (Sofiene, 23/11 à 22 h 40 : « au moins 1,5 à 2 sec fixe »), voir [[Splash.tsx]] |

Captures app contre maquette de chaque étape : `rago-redesign/app-strict/` (dossier du projet), de `1-…` à `32-…` (8 à 18 : les modules, le survol et la vue gratuite ; 19 à 25 : Réseau, dont les états du Packet Optimizer et Rago Route éteint ; 26 à 29 : Outils, en haut, au milieu, en bas, et en français ; 30 à 32 : Souris, avec une mesure simulée, ses états et en français). Plus de captures envoyées à partir des Paramètres (Sofiene, 23/11 à 22 h 46 : « pas besoin de me rendre les comparaison […] quand t'as finis compile l'app direct pour que je puisse la tester ») : la vérification reste faite, et l'exe de test est construit à la fin.

Rien de tout cela n'a été testé sur un vrai Windows.
