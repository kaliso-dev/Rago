---
type: code
tags: [code, app, typescript, react, catalogue, v5]
fichier: app/src/components/TweakRow.tsx
lignes: 331
maj: 2026-11-23
---
# TweakRow.tsx

**Le carreau d'un réglage** (`.tw` des maquettes v5 `app-module-*.html`), refait le 23/11 à l'identique de la maquette (demande de Sofiene du 23/11, voir [[Maquettes v5 dans l'app (s5)]]) : tout le carreau est l'interrupteur ; un réglage à options prend toute la largeur ; une action a un bouton « run » ; un mode de session a deux boutons ; le détail s'ouvre au survol. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Catalogue des tweaks]], [[Moteur des tweaks]], [[Mode jeu]].

Statut : branche `claude/app-v5-modules`, PR vers `staging` (23/11). Jamais testé sur Windows ([[Règles de travail]]).

## Ce que le fichier expose
- `TweakRow({ tweak, mod?, adv? })` :
  - `mod` : le module de la page ; un réglage qui vient d'un autre module (renvoi `ref`) affiche « Also in {module} » ;
  - `adv` : carreau d'un réglage avancé déplié (classe `advx`).
- Rendu par [[ModulePage.tsx]] (pages des modules et onglet des réglages de [[Network.tsx]]) et par [[Tools.tsx]] (liste « Tous les outils de l'app », dans un `div.pg-mod.embed > .tgrid` en attendant que la page Outils soit refaite).
- Interne : `Glyph` (pastille d'un jeu dans le menu des jeux : « V » sur rouge #FF4655 pour Valorant, bloc d'herbe pour Minecraft, sinon la première lettre sur #3A3A42) et `VNOTE` (réglages à options qui ont leur phrase propre).

## Les formes du carreau
| Forme | Quand | À droite | Clic sur le carreau |
|---|---|---|---|
| **Verrouillé** (`lock`) | Premium en gratuit et **pas appliqué** | bouton `.lk` cadenas « Premium » | offre `tweak` ([[Upsell.tsx]]) |
| **Mode de session** (`var sess`) | `game_mode`, `rbw_mode`, `win_gamemode` (avec variantes, disponible) | état `.sst` (point, « on » / « off ») + bouton `.sb` « Activer » / « Désactiver » (rouge pour allumer, cadenas si la variante est Premium) | rien |
| **Action** | `kind: "action"` | bouton `.run` « Lancer » → `requestApply([id])` | rien |
| **Interrupteur** | tout le reste | `button.sw` (`role="switch"`, `aria-checked`) | `toggle(id)` |

Un réglage **appliqué pendant Premium** n'est jamais verrouillé : on peut toujours l'éteindre sans licence. Un réglage indisponible sur ce PC (`availability` de [[catalog.ts]]) prend la classe `blk` : interrupteur pâli, clic sans effet.

Mode de session : le bouton choisit la variante opposée à l'état connu, puis `requestApply([id])` (lance tout de suite, après confirmation). L'état vient de l'historique (`lastRun`), pas de `applied`.

## Les options (réglages à plusieurs variantes, hors session)
- Classe `var`, le carreau prend toute la ligne.
- **Boutons** `.opts` : un bouton `.o` par variante ; si toutes les variantes commencent par un chiffre (Go, Hz…), seul le nombre est écrit (`.o.n`). Le bouton choisi est `pend` (coché), `on` (appliqué) ou `now` ; la variante « auto » pour ce PC porte un petit « auto » ; une variante Premium en gratuit est `lkd`.
- **Menu des jeux** : plus de 6 variantes qui ne sont pas des nombres (ex. le réglage de priorité par jeu) : bouton `.pick` (pastille, nom, « {n} games », chevron) qui ouvre la liste `.pick-menu` (`role="listbox"`) ; se ferme sur Échap ou un clic dehors.
- Choisir une option : `setVariant` ; si le réglage n'est ni appliqué ni coché, il est coché en même temps. Variante Premium en gratuit → offre `tweak`.

## La ligne sous le nom (une seule, dans cet ordre)
1. Indisponible : texte `block.<raison>` (« No NVIDIA card detected »…).
2. Mode de session : « Activé depuis {heure} » / « Désactivé depuis {heure} ».
3. Action déjà lancée : « Last run {jour mois} » (avec l'heure pour le point de restauration `rst_point`), ou « Failed {date} » en rouge.
4. En cours d'annulation : « Will be undone » (classe `undo`).
5. Appliqué et coché à nouveau : « New option to apply ».
6. Changé par Windows (`drift`) ou raté : « Changed by Windows » / « Failed {date} » en rouge + lien « apply again » (`reapply`) ; classe `drift`.
7. « Also in {module} » pour un renvoi.
8. Réglage à options : sa phrase (`s5.mod.note.pri_game`, `in_frames`, `in_queue`, `hitreg_suite`, `mc_optifine`), sinon « Size of your RAM, in GB » (variantes en Go), « Your screen's exact rate, in Hz » (en Hz) ou « Picked for this PC » (variante auto).

À côté du nom, l'icône éclair (`zap`) quand l'interrupteur n'a pas besoin de redémarrage.

## Le détail au survol (`.pop`)
Apparaît après **0,35 s** de survol (styles `s5/app.css`). Contenu : description ; « + » bénéfice (`gain`) ; « − » inconvénients (`cons`) ; avertissement (`warn.*`) et « Windows a changé… » (`tweak.drift`) en orange (`.ft.cf`) ; ligne `.meta` : « restart needed » ou « no restart », « {n} commands » (lignes de la variante choisie, sauf réglage natif), « asks first » si le réglage a un texte de confirmation. S'ouvre vers le haut (`up`) quand le carreau est près du bas de `.main` et qu'il y a la place au-dessus (230 px).

## Classes du carreau
`on` (appliqué et pas en cours d'annulation), `pend` (coché), `undo`, `drift`, `blk`, `advx`, `var`, `sess`, `lock`, `focused`. L'interrupteur reprend `on`, `pend`, `undo`.

## Mise en valeur après une recherche
Quand `focusTweak` vise ce carreau : défilement doux jusqu'à lui (centré), classe `focused` (animation `mod-focus`) pendant **1,8 s**, puis `setFocusTweak(null)`. Une nouvelle recherche du même réglage relance l'effet (`focusSeq`). La recherche vient de [[SearchPalette.tsx]] ou d'un lien (`goTo(page, tweakId)`).

## Liens avec le reste
- Store ([[store.tsx]]) : `toggle`, `selected`, `setVariant`, `variantOf`, `requestApply`, `reapply`, `isLocked`, `variantLocked`, `setUpsell`, `isOn`, `applied`, `pendingUndo`, `lastRun`, `focusTweak`, `focusSeq`, `setFocusTweak`, `SESSION_TOGGLES`.
- Catalogue ([[catalog.ts]]) : `availability`, `autoVariant`, `tweakModule`.
- Textes `s5.mod.*`, `badge.*`, `session.*`, `block.*`, `warn.*`, `tweak.run`, `tweak.drift`, `free.lock` ([[i18n.ts]]) ; dates `dayMonth` et `clock` de `s5/text.ts`.
- Styles : `s5/pages/module.css` et le bloc « modules » de `s5/app.css` ([[Styles de l'app (CSS)]]). Image : `assets/s5/img/game/grass-block.svg`.

## À savoir avant de modifier
- Le clic sur tout le carreau bascule l'interrupteur : chaque bouton ou zone intérieure (options, menu, run, session, lien « apply again ») arrête la propagation du clic.
- La règle « appliqué = jamais verrouillé » est une promesse aux joueurs : un ancien Premium doit toujours pouvoir annuler.
