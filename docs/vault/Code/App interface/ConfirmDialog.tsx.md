---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/ConfirmDialog.tsx
lignes: 220
maj: 2026-11-23
---
# ConfirmDialog.tsx

La **fenêtre de confirmation** avant chaque lot : ce qui sera appliqué et annulé, avertissements, case « point de restauration », case WMIC, redémarrage, puis lancement. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Moteur des tweaks]], [[Remise à zéro]].

Depuis la PR #130 (23/11), elle reprend à l'identique les maquettes v5 `app-confirm-apply`, `-single`, `-undo`, `-undoall` et `-warn` ([[Maquettes v5 dans l'app (s5)]]).

Tout ce qui suit est CONFIRMÉ (code de la branche `claude/app-v5-windows`, PR #130 vers `staging`, 23/11).

## Rôle et place dans l'ensemble
- Ouverte quand `confirm` du store n'est pas nul. Toutes les demandes y passent : barre « Appliquer » ([[ApplyBar.tsx]]), bouton « Lancer » d'une action et modes de session ([[TweakRow.tsx]]), optimisations gratuites et « Tout annuler » ([[Dashboard.tsx]]), tweaks gratuits de l'[[Analysis.tsx|analyse]], « turn on rbw mod » du vérificateur RBW ([[ModulePage.tsx]]), boutons du [[Mode jeu]] (même page), « Optimiser et jouer » ([[Games.tsx]]).
- Le bouton principal appelle `startRun` de [[store.tsx]], qui crée le lot affiché par [[RunOverlay.tsx]].
- Construite sur `Modal` avec l'option `v5` ([[Petits composants de l'interface]]) : `.w5 > .dim2 + .mdl` ; `.mdl.sm` pour une action seule.

## Fonctionnement détaillé

### Ce qui est listé
- `list` : réglages à appliquer (connus du catalogue).
- Annulations : réglages du catalogue (`undoList`), réglages retirés du catalogue (`undoRetired`, badge « Retiré »), et pour « Tout annuler » seulement, des ids inconnus de cette version mais notés appliqués par une autre (`undoUnknown`, badge « Retiré » ; le moteur les remet quand même).
- Chaque ligne : nom (`itemName`), variante, icône ↻ si redémarrage (pour une annulation, d'après la variante que le moteur lancera vraiment, `undoVariant`), badge « Avancé ».
- Deux groupes titrés « À appliquer » et « À annuler, remis comme avant » quand il y a les deux.
- Une demande `single` d'un seul réglage sans titre propre n'affiche pas de liste (le titre est le nom du réglage, le texte sa description).
- Bloc « À lire avant » : textes `confirm` du catalogue des réglages concernés.

### Titre, texte et bouton
| Cas | Titre | Bouton |
|---|---|---|
| lot préparé avec `title` (optimisations gratuites…) | ce titre et ce texte | « Appliquer maintenant » |
| « Optimiser et jouer » | « Optimiser {jeu} » + « Ces {n} réglages sont appliqués, puis {jeu} démarre… » | « Appliquer et jouer » |
| un seul réglage (`single`) | son nom + sa description | « Lancer » |
| « Tout annuler » | « Tout annuler ? » + « … remet Windows comme avant pour les {n} réglages appliqués sur ce PC… Ta licence ne change pas. » | « Tout annuler » |
| que des annulations | « Annuler {n} réglages ? » | « Annuler maintenant » |
| applications + annulations | « Appliquer {n} changements ? » | « Appliquer maintenant » |
| applications seules | « Appliquer {n} réglages ? » + « Rago Optimizer va modifier ces réglages de Windows. Tout est noté dans l'historique et le journal. » | « Appliquer maintenant » |

« Annuler » ferme sans rien lancer (et, pour « Optimiser et jouer », le jeu ne démarrera pas). À l'ouverture, le bouton principal prend le focus sans faire défiler la fenêtre.

### Point de restauration (règle de Sofiene du 08/10/2026)
Écrite en commentaire : la case de la 1.1.6 n'est **cochée d'office que quand elle sert vraiment**. Rago Optimizer garde l'état d'avant de chaque réglage ; le point n'est conseillé que pour un réglage avancé ou qui ne se remet pas entièrement, et pas deux fois dans la journée.
- La case n'est **pas proposée** si : la demande est seulement `rst_point`, seulement des annulations, seulement `rst_open`/`app_settings`, ou contient déjà `rst_point`.
- Cochée d'office si : au moins un réglage a `restore: true` (38 réglages du catalogue), **et** pas de point réussi depuis moins de 24 h (`RESTORE_FRESH_MS`), **et** la demande n'est pas faite uniquement de modes de session (mode jeu, RBW Mod, mode jeu de Windows).
- Texte sous la case : « Conseillé pour {3 noms…} : réglages avancés ou que l'app ne remet pas entièrement comme avant. » ; ou « Facultatif : Rago Optimizer en a déjà créé un récemment ({heure}). » ; ou « Facultatif : Rago Optimizer garde l'état d'avant… » ; ou, pour des actions, « Facultatif pour ces actions. ».

### Autres options
- **WMIC** : case « Installer WMIC d'abord » (cochée) si au moins un réglage demande WMIC absent du PC ; aucun en 1.3.0.
- **Redémarrage** : « Redémarre ton PC pour que tout prenne effet. » si un élément en demande un.
- **Minecraft** : si un réglage OptiFine est dans la liste et qu'aucun dossier Minecraft n'est connu : « Choisis ton dossier Minecraft dans le module Minecraft… » et le bouton principal est désactivé.

### Écran (maquettes v5, PR #130)
Styles : `s5/pages/win.css` (généré par `port_win.py` depuis les maquettes) et le bloc « fenêtres » de `s5/app.css` ([[Styles de l'app (CSS)]]).
- Titre `h2.h2.tape.mt` (ruban rouge), texte `p.ml`.
- Liste `ul.cl` : une ligne `li` par réglage (`li.u` pour une annulation) : trait `i.tk`, nom en gras, variante `span.vr`, icône de redémarrage `rotate` (`.rb`), badge `span.adv` (« advanced », ou « retired » pour un réglage retiré ou inconnu). Au-delà de 6 lignes, la liste est dans `div.clw` : elle défile (318 px au plus) avec sa barre `i.sbar2`, et le dégradé du bas s'efface en fin de liste (`.clw.end`).
- Groupes `p.grp` (« to apply », « to undo… ») quand il y a les deux ; avertissements dans `div.wrn` (`p.grp` puis une ligne par réglage : icône `alert`, nom en gras, texte `confirm` du catalogue) ; dossier Minecraft manquant dans un `div.wrn` aussi.
- Point de restauration et WMIC : case `div.opt` (`role="checkbox"`, Espace ou Entrée la cochent, `i.cbx`, titre avec icône `shield` pour le point de restauration, explication en petit).
- Redémarrage : `p.rbn` avec l'icône `power`.
- Pied `div.mf` : « cancel » (`btn gh2`) et le bouton rouge (`btn red`), qui prend le focus.
- Une action seule (`single`, un réglage, sans jeu ni titre propre) : petite fenêtre `.mdl.sm`, sans liste (maquette `app-confirm-single`).

### Lancement
`startRun(ids, { restorePoint: case proposée et cochée, wmic: case cochée et utile, clearSelection: !single, undo })`. Une demande `single` ne touche pas à la sélection du joueur.

## Liens avec le reste
- Store : `confirm`, `setConfirm`, `startRun`, `variantOf`, `applied`, `lastRestore`, `mcDir`, `RESTORE_FRESH_MS`, `SESSION_TOGGLES`, `itemName`, `undoVariant` ([[store.tsx]]).
- Moteur : le point de restauration est l'élément `rst_point`, toujours en tête du lot ; s'il échoue, rien de ce qui suit n'est appliqué ([[runner.rs]]).
- Textes `confirm.*`, `play.*` ([[i18n.ts]]).

## À savoir avant de modifier
- La règle du point de restauration est une décision de Sofiene (08/10/2026) : ne pas recocher la case d'office pour tous les lots.
