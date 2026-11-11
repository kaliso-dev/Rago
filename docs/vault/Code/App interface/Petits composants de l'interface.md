---
type: code
tags: [code, app, react, composant]
fichier: app/src/components/ (ui.tsx, Modal.tsx, Logo.tsx, logoPaths.ts, icons.ts, Avatar.tsx, GameLogo.tsx, PageBoundary.tsx) et app/src/vite-env.d.ts
lignes: 343
maj: 2026-11-11
---
# Petits composants de l'interface

Les briques réutilisées partout dans l'app : boutons, interrupteurs, cartes, fenêtres, logo, icônes, avatar, logo des jeux, garde-fou d'erreur de page. Ce sont de petits fichiers sans logique métier, regroupés ici. Fiche parente : [[Code de l'app (interface)]]. Design : [[Refonte glass]], [[Charte graphique]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

| Fichier | Lignes | Contenu |
|---|---|---|
| `components/ui.tsx` | 111 | `Switch`, `Segmented`, `Badge`, `Button`, `Card`, `Kbd` |
| `components/Modal.tsx` | 53 | `Modal` (fenêtre par-dessus la page, avec pile d'Échap) |
| `components/Logo.tsx` | 45 | `Mark`, `Wordmark`, `Pulse` |
| `components/logoPaths.ts` | 8 | tracés SVG du logo |
| `components/icons.ts` | 37 | `MODULE_ICONS`, `DiscordIcon` |
| `components/Avatar.tsx` | 9 | `Avatar` |
| `components/GameLogo.tsx` | 37 | `usePresetIcons`, `GameLogo` |
| `components/PageBoundary.tsx` | 34 | `PageBoundary` |
| `vite-env.d.ts` | 9 | types des variables `VITE_*` et de `__APP_VERSION__` |

## `ui.tsx` : les briques de base
Utilisé par 31 fichiers.
- **`Button({ variant, size, icon, ...})`** :
  - `variant` : `primary` (rouge), `secondary` (par défaut) ou `ghost` ;
  - `size` : `sm`, `md` (par défaut) ou `lg` ;
  - l'icône est placée avant le texte ; classes `btn btn-<variant> btn-<size>` ;
  - `type="button"` par défaut, sauf si l'appelant passe `type="submit"`.
- **`Switch({ checked, onChange, disabled, label })`** : interrupteur accessible (`role="switch"`, `aria-label`). Le rond glisse avec une animation à ressort (`motion`). Le clic ne remonte pas au parent (`stopPropagation`), ce qui permet de rendre toute une ligne cliquable sans double bascule (voir [[TweakRow.tsx]], [[NetOpt.tsx]]).
- **`Segmented({ value, options, onChange, layoutId, disabled })`** : choix entre plusieurs boutons (`role="radiogroup"`). La pastille du choix actif glisse d'un bouton à l'autre (`layoutId`, qui doit être unique dans la page). Une option peut porter un cadenas (`locked`, variante Premium) et une petite indication (`hint`).
- **`Badge({ tone, children })`** : étiquette, `tone` parmi `neutral`, `warn`, `red`, `ok`, `info`.
- **`Card({ title, action, className, children })`** : la carte en verre (classe `card`), avec un en-tête en petites capitales (`rg-overline`) si un titre ou une action est donné.
- **`Kbd`** : une touche de clavier (raccourci Ctrl+K de la recherche, voir [[SearchPalette.tsx]], [[TitleBar.tsx]]).

## `Modal.tsx` : les fenêtres
- `Modal({ open, onClose, className, children })` : un fond sombre (`scrim`) et la fenêtre (`role="dialog"`, `aria-modal`), avec une animation d'entrée et de sortie.
- Un clic sur le fond ferme la fenêtre ; un clic dans la fenêtre ne la ferme pas.
- **Pile des fenêtres** : chaque fenêtre ouverte prend un rang plus haut que les autres (`z-index` 50 + rang). **Échap ne ferme que celle du dessus**. Exemple : la recherche Ctrl+K ouverte par-dessus la fenêtre Premium.
- La dernière fonction `onClose` reçue est gardée dans une référence. Ainsi, la fenêtre n'est pas réinscrite dans la pile à chaque rendu.
- Utilisée par [[ConfirmDialog.tsx]], [[SearchPalette.tsx]], [[Upsell.tsx]], [[SubscriptionCard.tsx]], [[PresetEditor.tsx]], [[ReviewDialog.tsx]].

## `Logo.tsx` et `logoPaths.ts` : le logo
- `logoPaths.ts` : le tracé de la **marque** (`MARK`, boîte 164 × 180) et du **texte** « Rago Optimizer » (`WORDMARK_TEXT`, boîte `0 0 1124 180`). Le commentaire dit qu'ils sont repris du dossier de la marque (fil « charte »), voir [[Charte graphique]].
- **`Mark({ size })`** : la marque seule, en rouge (`--rg-red-500`), centrée dans un carré pour s'aligner comme une icône ([[TitleBar.tsx]], [[Splash.tsx]]).
- **`Wordmark({ height, mark })`** : la marque et le texte (`--rg-text-1`). Avec `mark={false}`, on a le texte seul ([[Splash.tsx]], [[LicenseGate.tsx]]).
- **`Pulse({ size, active })`** : la signature « Pulse », 4 ondes qui partent du coin haut droit de la marque, décalées de 400 ms ([[RunOverlay.tsx]], [[Upsell.tsx]], [[LicenseGate.tsx]]). Animation dans `app.css` (section Pulse, voir [[Styles de l'app (CSS)]]).

## `icons.ts`
- **`MODULE_ICONS`** : l'icône lucide de chaque module ou page, par nom d'icône du catalogue ou id de page. Par exemple : `network` (réseau), `gauge` (latence), `gpu`, `windows`, `crosshair` (hitreg), `cube` (Minecraft), `shield`, `bolt`, `flask` (expert), `undo` (restaurer), `settings`, `games`, `display` (palette, page [[Display.tsx]], ajoutée le 11/11 sur la branche `claude/project-thread-7n0ikn`), `nettest`, `netopt`, `tools`, `analysis`. Utilisé par [[Sidebar.tsx]].
- **`DiscordIcon({ size })`** : le logo de Discord (Simple Icons, licence CC0), pour les liens vers le Discord de Rago ([[Sidebar.tsx]], [[Settings.tsx]], [[Tools.tsx]] pour le cache de Discord).

## `Avatar.tsx`
`Avatar({ photo, name, size })` : la photo du compte, ou la première lettre du nom (ou de l'e-mail) sur un rond sombre. La taille du texte suit celle du rond (42 %). Utilisé par [[ProfileCard.tsx]] et [[ReviewDialog.tsx]].

## `GameLogo.tsx`
- **`usePresetIcons()`** : les icônes des jeux installés (`api.presetIcons()`, lues par le moteur dans les dossiers des jeux, voir [[games.rs]]). Il n'y a **qu'une demande pour toute l'app**, partagée entre les composants. Elle est refaite si elle a échoué.
- **`GameLogo({ presetId, tag, icons })`** : le logo du jeu d'un preset.
  - D'abord l'**icône du jeu installé**.
  - Sinon son **glyphe** SVG (`GAME_GLYPHS` de [[gameLogos.ts]], par la clé `presetGameKey`).
  - Sinon les lettres du preset (`tag`).
- Utilisé par [[Dashboard.tsx]] (presets par jeu) et [[Games.tsx]] (menu des presets).

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
- Une nouvelle page dans la barre latérale a besoin de son icône dans `MODULE_ICONS`.
- Une fenêtre doit passer par `Modal`, sinon Échap ferme aussi celle du dessous.
