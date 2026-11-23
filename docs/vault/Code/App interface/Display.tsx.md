---
type: code
tags: [code, app, typescript, react, couleurs, résolution, design]
fichier: app/src/pages/Display.tsx
lignes: 906
maj: 2026-11-23
---
# Display.tsx

La page **« Display »** (« Affichage » en français) : pour chaque jeu de la bibliothèque, la saturation, la luminosité, le contraste, le gamma et la résolution (étirée ou avec bandes noires) posés seulement pendant la partie, avec un **aperçu avant / après sur une capture du jeu**, et les réglages des pros à importer en un clic (Premium). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Couleurs et résolution]]. Côté Rust : [[display.rs]].

**Refaite le 23/11/2026 à l'identique de la maquette** `rendus-v5/src/app-display-pi.html` ([[Maquettes v5 dans l'app (s5)]]), sur la demande de Sofiene du 23/11 : « dans le display on devait pouvoir avoir une preview du jeu […] je dois pouvoir déplacer la ligne déchiré en rouge le vs là pour le avant après. et les filtre que j'applique doivent être conforme à l'aperçu […] au pixel prêt », et « y a pas les photos des joueurs pro aussi ». Comparaison : `app-strict/6-display-app-vs-maquette.jpg` et `7-display-ligne-vs-et-filtres.jpg` (dossier du projet). Branche `claude/app-v5-display`, PR vers `staging`. Vu dans la démo du navigateur, **jamais testé sur Windows**.

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "display"`. Entrée « display » de la [[Sidebar.tsx]] (groupe « play »), avec le compte « jeux réglés / jeux » (« 2/9 »).
- Ouverte aussi depuis les cases « resolution » et « saturation » du jeu en tête de [[Games.tsx]] : `goTo("display", id)` passe l'id du jeu dans `focusTweak` ([[store.tsx]]), lu une fois à l'ouverture.
- Tout passe par [[api.ts]] : `gamesList`, `gameArt` (seulement pour un jeu sans image embarquée), `displayInfo`, `displayProfiles`, `displayState`, `displaySetProfile`, `displayPreview`, `openUrl`, et les événements `display:state` et `games:running`.
- Réglages des pros : [[pros.json]], importé à la compilation ; photos des pros et captures des jeux embarquées (`s5/art.ts`).
- CSS : `s5/pages/pg-display.css` (généré depuis la maquette, sans l'image de fond de l'aperçu), `s5/pages/vs.css` (ligne déchirée déplaçable, reprise d'`anim.css`) et la section « Display » de `s5/app.css`.

## Ce que le fichier expose
- `Display()` : la page. Composants internes : `Versus` (le face à face), `Mini` (petite barre de 20 cases avec son curseur invisible), `ProCard` (carte d'un pro).
- Constantes :

| Nom | Valeur | Rôle |
|---|---|---|
| `PRO_GAMES`, `proGameOf(id)` | Valorant, CS2, Fortnite (`riot:valorant`, `steam:730`, `epic:fortnite` sans casse) | jeux dont Rago connaît les pros et le fichier de réglages |
| `WINDOWS` | saturation 50, luminosité 0, contraste 0, gamma 100 | couleurs de Windows |
| `FIRST_COLORS` | saturation **70 %** | couleurs allumées la première fois (50 % sur un écran sans saturation) |
| `FIRST_RES` | Valorant 1440×1080, CS2 1280×960, Fortnite 1650×1080, autres 1440×1080 | résolution allumée la première fois |
| `TILES` | après « native » : 1440×1080, 1280×960, 1024×768, 1280×1024, 1680×1050 ; Fortnite : 1650×1080, 1720×1080, 1750×1080, 1440×1080, 1680×1050 | tuiles de résolution (6 avec « native ») |
| `RECT`, `rectOf` | tailles de la maquette (46 × 34,5 pour 1440×1080…), sinon d'après la largeur | petit écran dessiné dans chaque tuile |
| `TABS_SHOWN` / `PROS_SHOWN` | 5 / 3 | onglets de jeux avant « +N », pros avant « all N … pros » |
| `SAVE_MS` / `PREVIEW_MS` | 350 ms / 5 000 ms | enregistrement après le dernier mouvement / durée de l'aperçu sur l'écran |
| `REMEMBER` | `rago.displayGame` | dernier jeu réglé (`localStorage`) |
| `LINEAR`, `GAMMA` | échelles des petites barres | luminosité et contraste −30 à +30 ; gamma 70 à 150 avec Windows (100) au milieu de la barre |

## Fonctionnement détaillé

### En-tête et barre
- « PER GAME // ON WHILE THE GAME IS ON SCREEN, BACK TO NORMAL AFTER », titre « display ».
- **preview 5 s** : `displayPreview(couleurs)` sur l'écran principal pendant 5 s, prolongé tant qu'on bouge un réglage, puis `displayPreview(null)` ; grisé sans couleurs. **windows defaults** : retire les couleurs, la résolution et le pro du jeu (les interrupteurs retrouvent les valeurs d'avant pendant la visite).
- Onglets des jeux (« GAME ») : un par jeu, Minecraft Java en un seul (« Minecraft », image du launcher le plus joué). Ordre fixé au chargement : jeu lancé, jeu déjà réglé, jeu des pros, puis dernière partie et nom. Les 5 premiers, puis « +N » qui montre les autres (« less » pour replier) ; le jeu choisi reste toujours visible. Noms sans « Tom Clancy's » ni ™ ® (`displayName` de `s5/text.ts`).
- Puce à droite : « previewing on your screen », « on now for {jeu} », « applies when {jeu} starts », sinon « nothing set for {jeu} » (infobulle : garder Rago ouvert pendant la partie). Une erreur du moteur la remplace (`display.err.*`) avec « Hide » ; une erreur masquée revient si elle se reproduit après avoir disparu.

### Face à face (`Versus`)
- La même capture du jeu des deux côtés (`coverOf(jeu, "play")`, sinon `hero`, `wide`, puis l'image officielle du moteur) : à gauche **Windows** tel quel (« 2560×1440 / 240 hz / saturation 50% »), à droite **le jeu avec ses réglages** (« 1280×960 stretched / saturation 100% »).
- **Ligne déchirée rouge à glisser** : clic ou glissé n'importe où dans l'aperçu (souris ou doigt), ou flèches du clavier sur le badge « vs » (Maj : pas plus grands, Début / Fin). La position est gardée en fraction de la largeur (6 à 94 %) et posée en px dans `--xl` (bord gauche de la bande de 150 px, `vs.css`) ; le badge suit. Elle reste où on l'a mise quand on change de jeu.
- **Filtres calculés comme le moteur** : saturation `saturate(1 + (v − 50) / 50)` (50 % = Windows, 100 % = le double, comme la saturation AMD 200 ; pas de saturation sur un écran Intel), puis un filtre SVG qui refait la rampe gamma de `ramp` ([[display.rs]]) : `x^(1/gamma)`, puis `(… − 0,5) × (1 + contraste/100) + 0,5 + luminosité/200`, en sRGB.
- **Résolution** : étirée, l'image s'élargit de (format de l'écran / format du jeu) ; bandes noires, l'image se resserre au milieu avec du noir sur les côtés. Rien ne change pour une résolution au format de l'écran.

### Couleurs
- Interrupteur ; grand chiffre « 100 % » ; barre de 20 cases avec le repère Windows au milieu et « gray / windows / max ». Le pilote ne descend pas sous 50 % ([[display.rs]] `nvidia_level`) : un clic à gauche du repère met 50 %. Sur un écran sans saturation, la barre est grisée et affiche 50 %.
- Carte du pilote : « nvidia digital vibrance / geforce rtx 4070, set by the driver », « amd saturation / …, set by the driver (140 in amd software) », ou « no saturation on this screen / intel graphics: brightness, contrast and gamma still work ». Nom de la carte : celle du fabricant du pilote dans `sys.gpus` ([[store.tsx]]), sans la marque.
- Luminosité, contraste, gamma : trois barres de 20 cases (10 = Windows) avec un curseur invisible par-dessus ; gamma affiché en écart (« +20 » = 1,20). Bouger un réglage, couleurs éteintes, les allume avec celles de Windows plus ce réglage.

### Résolution
- Interrupteur ; liste « other… » des autres résolutions de l'écran (hors tuiles et native) ; tuiles « native » (allumée quand la résolution est éteinte) et celles de `TILES`, « in game » sur celle du jeu. Une résolution choisie hors des tuiles prend la dernière place. Une tuile que l'écran ne propose pas est pâlie, et la choisir montre la marche à suivre pour la créer (`display.missingHelp`).
- Onglets « stretched » / « black bars » (aide NVIDIA et AMD en infobulle sur « stretched ») ; pour Valorant, CS2 et Fortnite, « also write it into {jeu}'s settings » avec son interrupteur (explication en infobulle).

### Réglages des pros
- « pro settings », « from prosettings.net and specs.gg, november 2026 » (sources des pros du jeu, mois de `updated`). Pour un jeu sans pros : « no pros listed for {jeu} yet: their colors work in every game » et des onglets valorant / cs2 / fortnite.
- 3 cartes, puis « all N valorant pros » pour tous (« top 3 » pour replier). Carte : photo (`proPhoto(id)`, sinon initiales sur fond rayé), nom (un clic ouvre la source, infobulle avec la date du relevé), écran du pro (avant « : » dans `monitor`, sinon le site ; réglages complets en infobulle), saturation et résolution, bouton « import » (cadenas sans Premium, ouvre l'offre `plan`) ou « imported » en rouge quand c'est le pro du jeu.
- **Importer** : couleurs du pro (saturation non publiée : les couleurs du joueur restent ; 50 % : couleurs de Windows), sa résolution (native : résolution retirée), `gameFile` pour les trois jeux connus, `pro` = son id, envoyé tout de suite.

### Enregistrement
- `update(id, profil)` : la page change tout de suite, `displaySetProfile` part **350 ms** après le dernier mouvement ; ce qui attend encore part quand on quitte la page ; l'import d'un pro part tout de suite. Profil vide retiré (`null`).
- Tout réglage changé à la main efface `pro` ; l'interrupteur « also write it… » le garde.
- Refus `premium:no_license` (Premium fini entre-temps) : offre `plan` ([[Upsell.tsx]]) et relecture des profils.

### Sans jeu
Écran vide des maquettes (`section.empty.panel`, grande icône « games ») : « NO GAMES TO SET UP », « **Add your games** from the Games page… », bouton « open games ».

## Données touchées
- `localStorage` `rago.displayGame`.
- Commandes : `games_list`, `game_art`, `display_info`, `display_profiles`, `display_state`, `display_set_profile`, `display_preview`, `open_url`. Événements : `display:state`, `games:running`.

## Erreurs et cas limites
- Démo navigateur ([[Développer et tester]]) : carte NVIDIA, écran « ZOWIE XL LCD » 2560×1440 à 240 Hz (celui de la maquette) ; `?amd` montre une carte AMD, `?intel` un écran sans saturation ; Valorant réglé comme la maquette (saturation 100 %, luminosité +6, contraste +4, 1280×960 étirée, TenZ importé) et CS2 en 1280×960 étirée ; profils gardés dans `localStorage` `rago.demoDisplay` ([[api.ts]]).
- Différences voulues avec la maquette : l'aperçu montre les vrais filtres (la maquette dessinait un côté Windows plus terne pour l'effet) ; « other… » ajouté (autres résolutions de l'écran) ; la barre de luminosité suit la valeur (+6 = 12 cases, la maquette en dessinait 11) ; cadenas sur « import » sans Premium.

## Liens avec le reste
- `Tabs`, `Sw` (`s5/ui.tsx`), `I`, `BigIcon`, `Rich` (`s5/I.tsx`), `coverOf`, `proPhoto` (`s5/art.ts`), `displayName` (`s5/text.ts`) : [[Maquettes v5 dans l'app (s5)]] ; `initials` ([[art.ts]]) ; `useStore` ([[store.tsx]]).
- Textes : clés `s5.display.*`, `nav.display` et les `display.*` encore utilisées (erreurs, aides) de [[i18n.ts]].

## À savoir avant de modifier
- Les bornes des réglages sont celles de `Colors::clamped` dans [[display.rs]], et le filtre de l'aperçu refait sa `ramp` : changer les deux ensemble.
- `profileKey` et `proGameOf` doivent rester d'accord avec `profile_key` et `GameFile::of` de [[display.rs]].
- Le cadenas n'est pas la seule barrière : le moteur refuse aussi l'import d'un pro sans licence active ([[lib.rs]]).
- Photos des pros : `app/src/assets/s5/pros/<id>.webp` (280 × 430). **Droits à vérifier avant la prod.**
