---
type: code
tags: [code, app, typescript, react, couleurs, résolution]
fichier: app/src/pages/Display.tsx
lignes: 745
maj: 2026-11-11
---
# Display.tsx

La page **« Couleurs et résolution »** : pour chaque jeu de la bibliothèque, la saturation, la luminosité, le contraste, le gamma et la résolution (étirée ou avec bandes noires) posés seulement pendant la partie, et les réglages de 22 pros à importer en un clic (Premium). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Couleurs et résolution]] (Linear RAG-95). Côté Rust : [[display.rs]].

Tout ce qui suit est CONFIRMÉ (code de la branche `claude/project-thread-7n0ikn`, 11/11). Vu dans la démo du navigateur, **jamais testé sur Windows**.

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "display"`. Entrée « Couleurs et résolution » de la [[Sidebar.tsx]] (groupe « En jeu », sous Jeux, icône palette), avec « Nouveau » tant que la page n'a pas été ouverte ([[seen.ts]]).
- Ouverte aussi depuis la puce de la grande carte de [[Games.tsx]] : `goTo("display", id)` passe l'id du jeu dans `focusTweak` ([[store.tsx]]), lu une fois à l'ouverture pour choisir ce jeu.
- Tout passe par [[api.ts]] : `gamesList`, `gameArt`, `displayInfo`, `displayProfiles`, `displayState`, `displaySetProfile`, `displayPreview`, `openUrl`, et les événements `display:state` et `games:running`.
- Réglages des pros : [[pros.json]], importé à la compilation.

## Ce que le fichier expose
- `Display()` : la page. Composants internes : `GamePanel` (les deux cartes du jeu choisi), `Slider` (curseur au style de celui du [[Packet Optimizer]], classes `.no-slider`), `ProCard` (carte d'un pro).
- Constantes :

| Nom | Valeur | Rôle |
|---|---|---|
| `PRO_GAMES` | Valorant, CS2, Fortnite | onglets des pros |
| `proGameOf(id)` | `riot:valorant` → valorant, `steam:730` → cs2, `epic:fortnite` (sans casse) → fortnite | jeux dont Rago connaît les pros et le fichier de réglages |
| `WINDOWS` | saturation 50, luminosité 0, contraste 0, gamma 100 | « Valeurs de Windows » |
| `FIRST_COLORS` | saturation **70 %** | couleurs allumées la première fois (50 % sur un écran sans saturation) |
| `FIRST_RES` | Valorant 1440×1080, CS2 1280×960, Fortnite 1650×1080, autres 1440×1080 | résolution allumée la première fois (la plus jouée par les pros du jeu) |
| `COMMON` | 1440×1080, 1280×960, 1024×768 (4:3), 1280×1024 (5:4), 1680×1050 (16:10), 1650×1080, 1720×1080, 1750×1080 (Fortnite) | boutons de résolution |
| `SAVE_MS` | 350 ms | délai d'enregistrement après le dernier mouvement |
| `PREVIEW_MS` | 5 000 ms | durée de l'aperçu |
| `REMEMBER` | `rago.displayGame` | dernier jeu réglé (`localStorage`) |

## Fonctionnement détaillé

### Chargement
- `gamesList(false)` → `entries()` : un jeu par entrée, sauf Minecraft Java dont tous les launchers font **une seule entrée** « Minecraft » (`mc:java`, image du launcher le plus joué), comme dans Jeux. Tri : jeux en cours, puis dernière partie, puis nom.
- En même temps : `displayInfo()` (carte de l'écran principal, ses résolutions), `displayProfiles()`, `displayState()`.
- Écoute `display:state` (bandeau d'état) et `games:running` (pastille « en cours » ; Minecraft en cours si un `mc:*` tourne).
- Images des jeux : `gameArt`, trois à la fois, une fois par jeu.
- Jeu choisi : celui passé par Jeux, sinon le dernier réglé ici (`rago.displayGame`), sinon le premier de la liste.

### Enregistrement
- `update(id, profil)` : la page change tout de suite, puis `displaySetProfile` part **350 ms** après le dernier mouvement (un curseur qui bouge n'écrit qu'une fois). Ce qui attend encore part quand on quitte la page. Import d'un pro : envoyé tout de suite.
- Un profil sans couleurs, sans résolution et sans pro est retiré (`null`).
- Tout réglage changé à la main efface `pro` : ce n'est plus le preset du pro. Cocher ou décocher « Écrire aussi dans les réglages du jeu » le garde.
- Refus `premium:no_license` du moteur (Premium fini entre-temps) : l'offre `plan` s'ouvre ([[Upsell.tsx]]) et la page relit les profils enregistrés.
- Interrupteur éteint puis rallumé : les valeurs d'avant reviennent (`lastColors`, `lastRes`, le temps de la visite).

### Bandeau d'état
- Ce qui est posé en ce moment : « Couleurs posées sur {jeu} », « Aperçu sur ton écran », « Résolution posée pour {jeu} », sinon « Rien de posé en ce moment : tout s'allume au lancement du jeu. »
- La dernière erreur du moteur (`display.err.*` : saturation refusée, rampe refusée, résolution refusée, fichier en lecture seule, introuvable ou impossible à écrire) avec « Masquer ». Une erreur masquée revient si elle se reproduit après avoir disparu.

### Les cartes du jeu (`GamePanel`)
- **Couleurs** (interrupteur) : curseur « Saturation (Digital Vibrance) » de 50 à 100 % ; sur une carte AMD, la valeur AMD à côté (« saturation AMD {100 + (v − 50) × 2} ») ; sans saturation sur cet écran (Intel) : curseur grisé et explication. « Luminosité, contraste, gamma » se déplie (ouvert d'office si l'un des trois est changé) : luminosité et contraste de −30 à +30, gamma de 0,70 à 1,50. Boutons « Aperçu 5 s » et « Valeurs de Windows ».
- **Aperçu** : `displayPreview(couleurs)` sur l'écran principal pendant 5 s, prolongé tant qu'on bouge un curseur, puis `displayPreview(null)` ; arrêté en quittant la page (le moteur l'arrête de toute façon après 8 s).
- **Résolution** (interrupteur) : « Ton écran : {l}×{h} · {Hz} Hz » ; les 8 boutons de `COMMON`, marqués « À créer » quand l'écran ne les propose pas (avec la marche à suivre dans le panneau NVIDIA ou AMD Software) ; liste « Autre résolution de ton écran » pour les autres ; « Étirée » ou « Bandes noires » (aide « Encore des bandes noires ? » quand c'est étiré) ; pour Valorant, CS2 et Fortnite, « Écrire aussi dans les réglages de {jeu} » (coché d'office) ; rappel « Lance {jeu} depuis Rago Optimizer : la résolution est posée avant qu'il démarre. »

### Réglages des pros
- Onglets Valorant, CS2, Fortnite (celui du jeu choisi au départ, Valorant pour les autres jeux). Pour un autre jeu : « Pas encore de pros relevés pour ce jeu : leurs couleurs marchent dans tous les jeux. »
- Sans Premium (licence connue) : badge cadenas sur le titre ; chaque « Importer » a un cadenas et ouvre l'offre `plan`.
- `ProCard` : initiales, nom, résumé (« Saturation 55 % · 1440×1080 étirée », « couleurs de Windows », « saturation non publiée », « résolution native »), ce qu'il règle « Sur son écran » et « Dans le jeu » (affiché seulement, jamais appliqué), source (site et date ; l'infobulle donne l'adresse et « vérifié le … » ou « vérifié en … » pour une date au mois près ; un clic ouvre la page), bouton « Importer » (« Importé » quand c'est le pro du jeu).
- **Importer** : couleurs du pro (saturation non publiée : les couleurs du joueur restent ; 50 % : couleurs de Windows, interrupteur éteint), sa résolution (native : résolution retirée), `gameFile` coché pour les trois jeux connus, `pro` = son id, envoyé tout de suite.

## Données touchées
- `localStorage` `rago.displayGame` (dernier jeu réglé).
- Commandes : `games_list`, `game_art`, `display_info`, `display_profiles`, `display_state`, `display_set_profile`, `display_preview`, `open_url`. Événements : `display:state`, `games:running`.

## Erreurs et cas limites
- Démo navigateur ([[Développer et tester]]) : carte NVIDIA, écran « ZOWIE XL LCD » 1920×1080 à 240 Hz ; `?amd` montre une carte AMD, `?intel` un écran sans saturation ; profils gardés dans `localStorage` `rago.demoDisplay` ; import refusé sans licence de démo (voir [[api.ts]]).
- Bibliothèque vide : carte « Aucun jeu dans ta bibliothèque » et bouton « Ouvrir Jeux ».

## Liens avec le reste
- Composants : `Badge`, `Button`, `Segmented`, `Switch` ([[Petits composants de l'interface]]) ; `hue`, `initials` ([[art.ts]]) ; `useStore` ([[store.tsx]]).
- Textes : clés `display.*` et `nav.display` de [[i18n.ts]]. Styles : section « Couleurs et résolution » de `features.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Les bornes des curseurs sont celles de `Colors::clamped` dans [[display.rs]] : les changer des deux côtés.
- `profileKey` et `proGameOf` doivent rester d'accord avec `profile_key` et `GameFile::of` de [[display.rs]].
- Le cadenas de la page n'est pas la seule barrière : le moteur refuse aussi l'import d'un pro sans licence active ([[lib.rs]]).
