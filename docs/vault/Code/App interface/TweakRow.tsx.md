---
type: code
tags: [code, app, typescript, react, catalogue]
fichier: app/src/components/TweakRow.tsx
lignes: 251
maj: 2026-11-22
---
# TweakRow.tsx

**Une ligne de réglage** dans une page de module : nom, badges, description, bénéfice et inconvénients, variantes, détails dépliables, et à droite l'interrupteur, le bouton « Lancer », les boutons Activer/Désactiver ou le cadenas Premium. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Catalogue des tweaks]], [[Moteur des tweaks]], [[Mode jeu]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `TweakRow({ tweak })` : rendue par [[ModulePage.tsx]] pour chaque réglage, et depuis la PR #90 (11/11) par [[Tools.tsx]] pour chaque action (`kind: "action"`) de la liste « Tous les outils de l'app » : même ligne, même cadenas, même « Lancer ».
- `twinNames(tweak, lang)` (interne) : noms des réglages jumeaux (même script, champ `twin`) avec leur module, ex. « Nom » (Module).

## Les quatre formes de la ligne
| Forme | Quand | Côté droit | Clic sur la ligne |
|---|---|---|---|
| **Verrouillée** | réglage Premium en gratuit et **pas appliqué** (`isLocked && !applied`) | bouton cadenas « Premium » → offre `tweak` | offre `tweak` ([[Upsell.tsx]]) |
| **Mode de session** | `game_mode`, `rbw_mode`, `win_gamemode` (avec variantes, disponible) | un bouton par variante : « Activer » / « Désactiver » (cadenas si variante verrouillée) ; le bouton de l'état connu est en couleur | ouvre/ferme les détails |
| **Action** | `kind: "action"` | « Lancer » → `requestApply([id])` | ouvre/ferme les détails |
| **Interrupteur** | tout le reste | `Switch` → `toggle(id, valeur)` | `toggle(id)` |

Un réglage **appliqué pendant Premium** n'est jamais verrouillé : on peut toujours l'éteindre sans licence (l'annulation reste ouverte). Un réglage indisponible sur ce PC (`availability` de [[catalog.ts]]) est grisé, le clic ne fait rien.

Mode de session : un clic sur un bouton → `setVariant(id, v)` puis `requestApply([id])` (lance tout de suite, après confirmation). L'état affiché vient de l'historique (`lastRun`), pas de `applied`.

## Badges (dans cet ordre)
1. « Gratuit » (ou « Retour gratuit » pour `rbw_mode`/`game_mode`) : en gratuit, sur les réglages ouverts.
2. « Avancé » : `risk: "advanced"`.
3. « Redémarrage » : `reboot: true`.
4. Un seul badge d'état :
   - mode de session : « Activé depuis {heure} » / « Désactivé depuis {heure} » ;
   - action : « Appliqué le {date} » ou « Échec le {date} » (dernier passage) ;
   - interrupteur décoché après application : « Sera annulé » ;
   - appliqué et coché avec une autre variante : « Nouvelle variante à appliquer » ;
   - appliqué : « Appliqué le {date} » / « Échec le {date} ».
5. « Changé par Windows » : `drift` (Windows ou une autre app a remis une valeur), sauf si une annulation ou une nouvelle application est prévue.

Bouton « Détails » (chevron) sauf sur une ligne verrouillée.

## Corps
- Description, puis liste « Bénéfice : … » et « Inconvénients : … » (`gain`, `cons` du catalogue).
- **Variantes** (plus d'une, disponible, hors mode de session) : contrôle segmenté (`Segmented`) ; la variante choisie automatiquement pour ce PC porte « Auto » ; une variante verrouillée en gratuit porte un cadenas. Changer → `setVariant`.
- Note rouge si indisponible : texte `block.<raison>` (« Aucune carte NVIDIA détectée », « Fichier manquant dans le dossier ressources »…). Note orange si avertissement : `warn.needsWmic`.
- **Détails** (dépliés en 0,2 s) : nombre de commandes Windows de la variante (`lines`) ou texte du traitement natif (`tweak.native.*` : profil NVIDIA, OptiFine, point de restauration) ; comment l'annuler : « Se change avec Activer et Désactiver… » (session), « Appliqué avant cette version : le décocher remet les valeurs de Windows. » (pas de sauvegarde, avant 1.1.6) ou « Pour l'annuler, décoche-le… » ; jumeaux : « Mêmes commandes que … : cochés ensemble, ils ne s'appliquent qu'une fois. » ; si `drift` : « Windows ou une autre app a changé certains de ces réglages depuis. » + lien « Réappliquer » (`reapply`) ; texte de confirmation du catalogue (`confirm`) le cas échéant.

## Mise en valeur après une recherche
Quand `focusTweak` vise cette ligne : défilement doux jusqu'à elle (centrée), classe `focused` pendant **1,8 s**, puis `setFocusTweak(null)`. La recherche vient de [[SearchPalette.tsx]] ou d'un lien (`goTo(page, tweakId)`).

## Charte v5 : la ligne devient une tuile (PR #108 du 22/11, vers `staging`, jamais testée sur Windows)
Toute la logique ci-dessus est gardée ; seul le rendu change.
- Classes : `tweak tile`, plus `wide` (variantes ou mode de session, la tuile prend toute la ligne), `on`, `pend`, `blocked`, `locked`, `focused`, `open`.
- Dans la tuile : le nom, l'icône de redémarrage, une ligne d'état (`.tweak-state`, rouge ou verte, avec le lien « Réappliquer » si Windows a changé le réglage), les variantes en ligne ; à droite le cadenas, les boutons de session, « Lancer » ou l'interrupteur.
- La **bulle** `.tweak-pop` (claire, au survol après 0,35 s, ou ouverte) porte la description, le bénéfice et les inconvénients, les avertissements, la confirmation, les badges, les détails repliables et le bouton « Détails ».

## Liens avec le reste
- Store ([[store.tsx]]) : `toggle`, `setVariant`, `variantOf`, `requestApply`, `reapply`, `isLocked`, `variantLocked`, `undoOnly`, `isOn`, `applied`, `pendingUndo`, `lastRun`, `focusTweak`, `SESSION_TOGGLES`.
- Primitives `Badge`, `Button`, `Segmented`, `Switch` ([[Petits composants de l'interface]]).
- Textes `tweak.*`, `badge.*`, `session.*`, `free.*`, `block.*`, `warn.*` ([[i18n.ts]]).
- Styles : tuiles et bulle de `v5.css`, par-dessus la section « réglages » d'`app.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Le clic sur toute la ligne bascule l'interrupteur : chaque bouton intérieur fait `e.stopPropagation()` pour ne pas basculer en même temps.
- La règle « appliqué = jamais verrouillé » est une promesse aux joueurs : un ancien Premium doit toujours pouvoir annuler.
