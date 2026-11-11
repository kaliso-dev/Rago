---
type: code
tags: [code, app, typescript, react]
fichier: app/src/App.tsx
lignes: 85
maj: 2026-11-11
---
# App.tsx

Le **cadre de la fenêtre principale** : barre de titre, barre latérale, zone de page, barre « Appliquer », fenêtre du lot, et toutes les fenêtres qui flottent au-dessus. C'est aussi lui qui choisit **quelle page afficher** d'après `page` du store. Fiche parente : [[Code de l'app (interface)]]. Vue produit : [[App Windows]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `App()` : composant racine, monté par [[main.tsx (app)]] sous `StoreProvider` et `AccountProvider`.

## Fonctionnement détaillé

### Arbre rendu
```
MotionConfig (reducedMotion)
└ div.app (.reduced si animations réduites)
  ├ TitleBar
  ├ div.body
  │ ├ Sidebar
  │ ├ main.main (zone qui défile)
  │ │ ├ LicenseNotice
  │ │ └ AnimatePresence (mode "wait")
  │ │   └ motion.div (clé = "network" pour les 4 onglets de Réseau, sinon la page)
  │ │     └ PageBoundary
  │ │       └ la page
  │ ├ ApplyBar
  │ └ RunOverlay
  ├ ConfirmDialog
  ├ SearchPalette
  ├ Upsell
  ├ ReviewPrompt
  ├ ReviewDialog
  ├ ResetToast
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
| tout le reste (`latency`, `gpu`, `windows`, `hitreg`, `minecraft`, `rbw`, `gamemode`, `expert`, `restore`) | [[ModulePage.tsx]] avec `id={page}` (un module du catalogue) |

### Transitions
- Changement de page : fondu et glissement de 8 px (sortie vers la gauche, entrée depuis la droite) en **0,16 s**, courbe `[0.16, 1, 0.3, 1]`. Les quatre onglets de Réseau partagent la clé `network` : passer d'un onglet à l'autre ne rejoue pas la transition de page (Network a la sienne).
- `MotionConfig reducedMotion` : `"always"` si le joueur a choisi « animations réduites » dans les paramètres, sinon `"user"` (suit le réglage de Windows).

### Effets
- `document.documentElement.lang` suit la langue du store (lecteurs d'écran, césure).
- Remonte la zone `main` en haut à chaque changement de page.
- **Clic droit bloqué** partout (`contextmenu` annulé), sauf dans un champ de saisie (`input`, `textarea`) et dans la console du lot (`.run-console`), où le menu natif sert à copier.
- `Splash` est affiché au lancement puis retiré par son `onDone` (voir [[Splash.tsx]]).

## Liens avec le reste
- Composants du cadre : [[TitleBar.tsx]], [[Sidebar.tsx]], [[LicenseNotice.tsx]], [[ApplyBar.tsx]], [[RunOverlay.tsx]], [[ConfirmDialog.tsx]], [[SearchPalette.tsx]], [[Upsell.tsx]], [[ReviewPrompt.tsx]], [[ReviewDialog.tsx]], [[ResetToast.tsx]], [[Splash.tsx]] ; filet d'erreur `PageBoundary` (voir [[Petits composants de l'interface]]).
- Arbre complet et cycle d'une action : [[Code de l'app (interface)]].

## À savoir avant de modifier
- Ajouter une page : (1) le composant dans `pages/` ; (2) une branche dans la chaîne ci-dessus **avant** le `ModulePage` final (sinon la page est prise pour un module inconnu et plante) ; (3) une entrée dans [[Sidebar.tsx]] ; (4) un libellé dans [[i18n.ts]].
- Les fenêtres flottantes sont rendues hors de `div.body` pour passer au-dessus de tout ; leur ordre dans le code donne leur ordre d'empilement à `z-index` égal.
