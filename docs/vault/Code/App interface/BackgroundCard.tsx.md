---
type: code
tags: [code, app, typescript, react, overlay]
fichier: app/src/components/BackgroundCard.tsx
lignes: 139
maj: 2026-11-10
---
# BackgroundCard.tsx

La carte **« Barre en jeu et arrière-plan »** des paramètres : activer la barre en jeu, choisir son raccourci, garder FPS et ping à l'écran, rester près de l'horloge, lancer avec Windows. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Barre en jeu]], [[Arrière-plan et démarrage]]. Ticket : RAG-82.

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `shortcutOf(event)` : transforme une frappe en raccourci lisible par le moteur (ex. `Ctrl+Shift+R`), ou `null` :
  - une touche de modification seule (`Control`, `Shift`, `Alt`, `Meta`, `AltGraph`) → `null` (on attend la touche principale) ;
  - touche principale lue sur `e.code` (indépendante de la disposition du clavier) : lettre `KeyA` → `A`, chiffre `Digit1` → `1`, `F1`–`F24`, ou un nom parmi `Numpad0-9`, `Space`, `Backquote`, `Minus`, `Equal`, `BracketLeft/Right`, `Semicolon`, `Quote`, `Comma`, `Period`, `Slash`, `Backslash`, `Insert`, `Home`, `End`, `PageUp`, `PageDown` ; autre touche → `null` ;
  - modificateurs dans l'ordre `Ctrl`, `Alt`, `Shift`, `Super` ;
  - **une touche F peut servir seule** ; une lettre ou un chiffre seul est refusé (gênerait la frappe en jeu).
- `BackgroundCard()` : la carte (montée par [[Settings.tsx]]).

## Fonctionnement détaillé
- Au montage : `api.backgroundGet()` → `{ prefs, autostart, shortcutTaken, fpsAvailable }` ([[background.rs]]). Rien n'est affiché avant la réponse.
- `save(patch)` : fusionne, **ajoute toujours la langue de l'app** (`lang`), applique deux liens : allumer « Lancer avec Windows » allume aussi « Rester près de l'horloge » (le lancement démarre caché) ; éteindre « Rester près de l'horloge » éteint aussi « Lancer avec Windows ». Mise à jour optimiste, puis `api.backgroundSet(prefs)`. Erreurs : `shortcut` → « Ce raccourci ne marche pas : garde Ctrl, Alt ou Maj avec une lettre, un chiffre ou une touche F. » ; `autostart:…` → « Windows a refusé le lancement automatique. Réessaie, ou lance Rago en administrateur. » ; après une erreur, l'état est relu.
- Lignes :
  1. « Barre en jeu » (interrupteur `overlay`) : « Par-dessus le jeu : FPS, ping, CPU, GPU, RAM et réglages en direct. Le jeu doit être en plein écran fenêtré ou en fenêtre. »
  2. Si la barre est active : « Raccourci » (« Actif seulement quand un jeu est au premier plan. ») avec les touches affichées (`Shift` écrit « Maj » en français), bouton « Changer » (enregistre la prochaine combinaison ; Échap annule ; la capture se fait en phase de capture et bloque la frappe), bouton « Par défaut » si le raccourci n'est pas `Alt+X`. Si Windows refuse le raccourci (déjà pris par une autre app) : « Ce raccourci est déjà pris par une autre app. Choisis-en un autre. »
  3. « FPS et ping à l'écran pendant la partie » (`pin`) : « Une petite pastille en haut à gauche, qui ne prend pas les clics. » ; si PresentMon n'est pas livré : « Les FPS ne sont pas mesurés dans cette version : la barre affiche « — ». »
  4. « Rester près de l'horloge à la fermeture » (`tray`).
  5. « Lancer avec Windows » (`autostart`) : « Activé d'office : Rago démarre caché près de l'horloge à l'ouverture de ta session… » ; l'interrupteur n'est allumé que si la préférence **et** la tâche Windows existent.

## Liens avec le reste
- [[api.ts]] (`backgroundGet`, `backgroundSet`) ; moteur [[background.rs]] (préférences, tâche de lancement, icône) et [[overlay.rs]] (raccourci global).
- La barre elle-même : [[Overlay.tsx]].
- Primitives `Card`, `Switch`, `Button` ([[Petits composants de l'interface]]).

## À savoir avant de modifier
- Le moteur valide aussi le raccourci (le simulateur imite sa règle) : changer `shortcutOf` sans changer [[background.rs]] crée des raccourcis refusés.
