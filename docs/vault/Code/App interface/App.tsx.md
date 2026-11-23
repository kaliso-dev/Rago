---
type: code
tags: [code, app, typescript, react]
fichier: app/src/App.tsx
lignes: 90
maj: 2026-11-23
---
# App.tsx

Le **cadre de la fenêtre principale** : barre de titre, barre latérale, zone de page, barre « Appliquer », fenêtre du lot, et toutes les fenêtres qui flottent au-dessus. C'est aussi lui qui choisit **quelle page afficher** d'après `page` du store. Fiche parente : [[Code de l'app (interface)]]. Vue produit : [[App Windows]].

Tout ce qui suit est CONFIRMÉ (code de `staging` après la PR #130, fusionnée le 23/11, et la PR #131, fusionnée le 24/11).

## Ce que le fichier expose
- `App()` : composant racine, monté par [[main.tsx (app)]] sous `StoreProvider` et `AccountProvider`.

## Fonctionnement détaillé

### Arbre rendu
```
MotionConfig (reducedMotion)
└ div.win (.reduced si animations réduites) : cadre de la maquette v5 (rago5.css, shell5.js)
  ├ IconDefs (symboles des icônes au trait, s5/I.tsx)
  ├ PrintDefs (filtres des icônes imprimées)
  ├ Sidebar
  ├ TitleBar (barre du haut : recherche, boutons de la fenêtre)
  ├ main.main (zone qui défile)
  │ ├ LicenseNotice
  │ └ AnimatePresence (mode "wait")
  │   └ motion.div.page-wrap (clé = "network" pour les 4 onglets de Réseau, sinon la page)
  │     └ PageBoundary
  │       └ la page
  ├ ApplyBar
  ├ RunOverlay (div.w5 : couvre toute la fenêtre pendant un lot)
  ├ ConfirmDialog
  ├ SearchPalette
  ├ Upsell
  ├ ReviewPrompt (div.w5.flt : couvre la fenêtre sans prendre les clics)
  ├ ReviewDialog
  ├ ResetToast (div.w5.flt.tz : au-dessus de tout, même des fenêtres)
  └ Splash (au lancement seulement)
```
### Choix de la page (il n'y a pas de routeur)
`page` vient de [[store.tsx]] (`"dashboard"` au lancement, changé par `goTo`). La chaîne de conditions :

| `page` | Composant |
|---|---|
| `dashboard` | [[Dashboard.tsx]] |
| `settings` | [[Settings.tsx]] |
| `share` | [[Share.tsx]] (ouverte depuis les paramètres) |
| `games` | [[Games.tsx]] |
| `display` | [[Display.tsx]] (ajoutée le 11/11, PR #93) |
| `network`, `netopt`, `nettest`, `route` | [[Network.tsx]] avec l'onglet `tab={page}` |
| `tools` | [[Tools.tsx]] |
| `analysis` | [[Analysis.tsx]] |
| `mouse` | [[Mouse.tsx]] |
| tout le reste (`latency`, `gpu`, `windows`, `hitreg`, `minecraft`, `rbw`, `gamemode`, `expert`, `restore`) | [[ModulePage.tsx]] avec `id={page}` (un module du catalogue) |

### Transitions
- Changement de page : fondu et glissement de 8 px (sortie vers la gauche, entrée depuis la droite) en **0,16 s**, courbe `[0.16, 1, 0.3, 1]`. Les quatre onglets de Réseau partagent la clé `network` : passer d'un onglet à l'autre ne rejoue pas la transition de page (Network a la sienne).
- `MotionConfig reducedMotion` : `"always"` si le joueur a choisi « animations réduites » dans les paramètres, sinon `"user"` (suit le réglage de Windows).

### Effets
- `document.documentElement.lang` suit la langue du store (lecteurs d'écran, césure).
- Remonte la zone `main` en haut à chaque changement de page.
- **Clic droit bloqué** partout (`contextmenu` annulé), sauf dans un champ de saisie (`input`, `textarea`) et dans le journal du lot (`.w5 .cs`, [[RunOverlay.tsx]]), où le menu natif sert à copier.
- `Splash` est affiché au lancement puis retiré par son `onDone` (voir [[Splash.tsx]]).

## Cadre v5 (PR #119, dans `staging`)
- Le cadre reprend la maquette v5 : `div.win` contient directement la barre latérale, la barre du haut et `main` (plus de `div.app` ni de `div.body`). Les pages posent elles-mêmes leur grand titre (plus d'effet qui mesure le titre).
- Les fenêtres v5 (`Modal` avec `v5`, [[Petits composants de l'interface]]) sont rendues dans `body` : la page, animée par `motion.div.page-wrap`, garderait sinon une fenêtre ouverte depuis elle dans son cadre (PR #130). Depuis la PR #131 (vers `staging`), toutes les fenêtres montées ici suivent les maquettes v5 : recherche, Premium et connexion, avis ; l'invitation à laisser un avis et les petits messages aussi (`.w5.flt`).

## Liens avec le reste
- Composants du cadre : [[TitleBar.tsx]], [[Sidebar.tsx]], [[LicenseNotice.tsx]], [[ApplyBar.tsx]], [[RunOverlay.tsx]], [[ConfirmDialog.tsx]], [[SearchPalette.tsx]], [[Upsell.tsx]], [[ReviewPrompt.tsx]], [[ReviewDialog.tsx]], [[ResetToast.tsx]], [[Splash.tsx]] ; filet d'erreur `PageBoundary` (voir [[Petits composants de l'interface]]).
- Arbre complet et cycle d'une action : [[Code de l'app (interface)]].

## À savoir avant de modifier
- Ajouter une page : (1) le composant dans `pages/` ; (2) une branche dans la chaîne ci-dessus **avant** le `ModulePage` final (sinon la page est prise pour un module inconnu et plante) ; (3) une entrée dans [[Sidebar.tsx]] ; (4) un libellé dans [[i18n.ts]].
- Les fenêtres flottantes sont rendues après `main` pour passer au-dessus de la page ; leur ordre dans le code donne leur ordre d'empilement à `z-index` égal. Une fenêtre ouverte après une autre passe au-dessus (rang de `Modal`).
