---
type: code
tags: [code, app, react, composant]
fichier: app/src/components/ (ui.tsx, Modal.tsx, Logo.tsx, logoPaths.ts, icons.ts, ri.tsx, printed.ts, Avatar.tsx, PageBoundary.tsx) et app/src/vite-env.d.ts
lignes: 465
maj: 2026-11-23
---
# Petits composants de l'interface

Les briques réutilisées partout dans l'app : boutons, interrupteurs, cartes, fenêtres, logo, icônes, avatar, logo des jeux, garde-fou d'erreur de page. Ce sont de petits fichiers sans logique métier, regroupés ici. Fiche parente : [[Code de l'app (interface)]]. Design : [[Charte graphique]] (v5 depuis la PR #108 du 22/11, vers `staging`, jamais testée sur Windows).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

| Fichier | Lignes | Contenu |
|---|---|---|
| `components/ui.tsx` | 112 | `Switch`, `Segmented`, `Badge`, `Button`, `Card`, `Kbd` |
| `components/Modal.tsx` | 53 | `Modal` (fenêtre par-dessus la page, avec pile d'Échap) |
| `components/Logo.tsx` | 53 | `Mark`, `AppIcon`, `Wordmark`, `Pulse` |
| `components/logoPaths.ts` | 3 | tracé SVG du R |
| `components/icons.ts` | 23 | `MODULE_ICONS`, `DiscordIcon` |
| `components/ri.tsx` | 125 | icônes de l'app (imprimées ou lucide), `PrintIcon`, `PrintDefs` |
| `components/printed.ts` | 7 | formes des icônes imprimées et leurs filtres (généré) |
| `components/Avatar.tsx` | 9 | `Avatar` |
| `components/PageBoundary.tsx` | 34 | `PageBoundary` |
| `vite-env.d.ts` | 9 | types des variables `VITE_*` et de `__APP_VERSION__` |

## `ui.tsx` : les briques de base
Utilisé par 13 fichiers (23/11, après la PR #128 : surtout les fenêtres, la barre en jeu et Paramètres ; les pages refaites sur les maquettes se servent de `s5/ui.tsx`).
- **`Button({ variant, size, icon, ...})`** :
  - `variant` : `primary` (rouge), `secondary` (par défaut) ou `ghost` ;
  - `size` : `sm`, `md` (par défaut) ou `lg` ;
  - l'icône est placée avant le texte ; classes `btn btn-<variant> btn-<size>` ;
  - `type="button"` par défaut, sauf si l'appelant passe `type="submit"`.
- **`Switch({ checked, onChange, disabled, label })`** : interrupteur accessible (`role="switch"`, `aria-label`). Le rond glisse avec une animation à ressort (`motion`). Le clic ne remonte pas au parent (`stopPropagation`), ce qui permet de rendre toute une ligne cliquable sans double bascule (voir [[NetOpt.tsx]] ; les carreaux de réglage de [[TweakRow.tsx]] ont leur propre interrupteur `.sw` depuis le 23/11).
- **`Segmented({ value, options, onChange, layoutId, disabled })`** : choix entre plusieurs boutons (`role="radiogroup"`). La pastille du choix actif glisse d'un bouton à l'autre (`layoutId`, qui doit être unique dans la page). Une option peut porter un cadenas (`locked`, variante Premium) et une petite indication (`hint`).
- **`Badge({ tone, children })`** : étiquette, `tone` parmi `neutral`, `warn`, `red`, `ok`, `info`.
- **`Card({ title, action, className, children })`** : la carte (classe `card`), avec un en-tête en petites capitales (`rg-overline`) si un titre ou une action est donné.
- **`Kbd`** : une touche de clavier (raccourci Ctrl+K de la recherche, voir [[SearchPalette.tsx]], [[TitleBar.tsx]]).
- `Segments` et `HeadNumber` (jauge et bloc chiffré rouge de la PR #108) sont retirés le 23/11 : plus aucune page ne s'en servait (le bloc en tête des pages suit maintenant les maquettes, [[Maquettes v5 dans l'app (s5)]]).

## `Modal.tsx` : les fenêtres
- `Modal({ open, onClose, className, children })` : un fond sombre (`scrim`) et la fenêtre (`role="dialog"`, `aria-modal`), avec une animation d'entrée et de sortie.
- Un clic sur le fond ferme la fenêtre ; un clic dans la fenêtre ne la ferme pas.
- **Pile des fenêtres** : chaque fenêtre ouverte prend un rang plus haut que les autres (`z-index` 50 + rang). **Échap ne ferme que celle du dessus**. Exemple : la recherche Ctrl+K ouverte par-dessus la fenêtre Premium.
- La dernière fonction `onClose` reçue est gardée dans une référence. Ainsi, la fenêtre n'est pas réinscrite dans la pile à chaque rendu.
- Utilisée par [[ConfirmDialog.tsx]], [[SearchPalette.tsx]], [[Upsell.tsx]], [[SubscriptionCard.tsx]], [[PresetEditor.tsx]], [[ReviewDialog.tsx]].

## `Logo.tsx` et `logoPaths.ts` : le logo
Charte v5 (PR #108 du 22/11, vers `staging`, jamais testée sur Windows) : **R rouge plein partout** (décision de Sofiene du 22/11) ; le R est noir seulement sur la transition rouge plein écran du démarrage.
- `logoPaths.ts` : le tracé du R (`MARK`, boîte 164 × 180). L'ancien tracé du texte « Rago Optimizer » (`WORDMARK_TEXT`) est retiré.
- **`Mark({ size, ink })`** : le R seul, centré dans un carré ; rouge (`--rg-red-500`), ou noir avec `ink` ([[Sidebar.tsx]], [[Splash.tsx]]).
- **`AppIcon({ size })`** : l'icône de l'app, R rouge sur une tuile blanche arrondie (`rx` 56 sur 256), comme `marque/logo/rago-app-icon.svg` ([[Upsell.tsx]], [[Overlay.tsx]]).
- **`Wordmark({ height, mark, sub })`** : texte HTML « R » rouge + « AGO » en condensé 900 italique, et « optimizer » en petit avec `sub` ([[LicenseGate.tsx]], [[Settings.tsx]]).
- **`Pulse({ size, active })`** : `AppIcon` avec des ondes centrées autour, actives pendant un travail ([[RunOverlay.tsx]], [[LicenseGate.tsx]]).

## `icons.ts`
- **`MODULE_ICONS`** : l'icône **imprimée** de chaque module ou page, construite depuis la table `NAMES` (nom du catalogue ou id de page → nom de l'icône de la charte, rendue par `PrintIcon`). Exemples : `games` → `library`, `bolt` → `games`, `gauge` → `latency`, `display`, `nettest`, `tools`, `analysis`. Utilisé par [[Sidebar.tsx]].
- **`DiscordIcon({ size })`** : le logo de Discord (Simple Icons, licence CC0), pour les liens vers le Discord de Rago ([[Sidebar.tsx]], [[Settings.tsx]], [[Tools.tsx]] pour le cache de Discord).

## `ri.tsx` et `printed.ts` : les icônes imprimées
- Toute l'app importe ses icônes depuis `components/ri` au lieu de `lucide-react` (chemins relatifs). `ri.tsx` réexporte tout lucide (`export * from "lucide-react"`), puis **remplace** les noms qui ont un équivalent dans la charte par une icône imprimée : `Zap` → `apply`, `Check`, `Lock`, `Cpu`, `Gpu` → `graphics`, `Search`, `Play`, `Plus`, `Power`, `RefreshCw`, `RotateCcw` → `rotate`, `Trash2`, `Pencil`, `ScanSearch` → `analysis`, `TriangleAlert` → `alert`, etc. (65 noms). Flèches, chevrons, croix, `Minus`, `Square` et `LoaderCircle` restent au trait.
- **`PrintIcon({ name, size, color, ... })`** : SVG 24 × 24 ; la forme pleine (masquée par ses découpes) est dessinée deux fois, un dos rouge décalé de (1,3 ; 1,5) puis la face, le tout penché (`skewX(-12)`). Couleurs par CSS : `--pf` (face) et `--pb` (dos), changées selon le fond dans `v5.css` ([[Styles de l'app (CSS)]]).
- **`PrintDefs()`** : pose une fois les filtres de grain (`rgh-face-s`, `rgh-back-s`) ; monté en haut de [[App.tsx]] et de [[Overlay.tsx]].
- `printed.ts` est **généré** depuis les maquettes : `PRINTED` (nom → [formes, découpes], environ 85 icônes) et `PRINT_FILTERS`. Ne pas l'éditer à la main.

## `Avatar.tsx`
`Avatar({ photo, name, size })` : la photo du compte, ou la première lettre du nom (ou de l'e-mail) sur un rond sombre. La taille du texte suit celle du rond (42 %). Utilisé par [[ProfileCard.tsx]] et [[ReviewDialog.tsx]].

## `PageBoundary.tsx`
- Garde-fou d'erreur React autour de la page courante dans [[App.tsx]]. Si une page plante, elle affiche une carte au lieu de vider toute la fenêtre :
  - « Cette page n'a pas pu s'afficher » ;
  - « Le reste de l'app fonctionne. Réessaie, ou passe par une autre page. » ;
  - un bouton « Réessayer ».
- L'erreur est écrite dans la console.
- Changer de page repart de zéro : la page est dans un bloc animé avec une clé par page, qui recrée le garde-fou.
- Les textes viennent de `translate(lang, clé)` de [[i18n.ts]], car ce composant est une classe et ne peut pas utiliser `useStore`.

## `vite-env.d.ts`
- Types des variables lues au build (`import.meta.env`). Toutes sont facultatives :
  - `VITE_SITE_URL` ;
  - `VITE_ACCOUNT_URL` ;
  - `VITE_SUPPORT_URL` ;
  - `VITE_RAGO_SERVER` : `"staging"` pour l'exe de test, affiché dans la barre de titre.
- Déclare aussi la constante `__APP_VERSION__`, injectée par Vite.
- Voir [[Configuration du front (Vite, npm)]] et [[Variables d'environnement]].

## À savoir avant de modifier
- `Button` et `Card` sont partout : changer leurs classes touche toute l'app et ses styles ([[Styles de l'app (CSS)]]).
- Une nouvelle page dans la barre latérale a besoin de son icône dans `NAMES` d'`icons.ts`.
- Importer les icônes depuis `components/ri`, jamais directement depuis `lucide-react`.
- Une fenêtre doit passer par `Modal`, sinon Échap ferme aussi celle du dessous.
