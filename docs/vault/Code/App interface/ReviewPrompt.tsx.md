---
type: code
tags: [code, app, react, composant, avis]
fichier: app/src/components/ReviewPrompt.tsx
lignes: 71
maj: 2026-11-23
---
# ReviewPrompt.tsx

L'**invitation discrète à laisser un avis**, en bas à droite de la fenêtre : « Rago Optimizer te plaît ? ». Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Paramètres de l'app]], [[Site]] (les avis s'affichent sur le site).

Tout ce qui suit est CONFIRMÉ (code de `staging`, PR #131 fusionnée le 24/11 : carte refaite sur la maquette v5 `app-review-prompt`).

## Rôle et place dans l'ensemble
- Montée une seule fois par [[App.tsx]], juste avant [[ReviewDialog.tsx]].
- Elle ne décide pas **quand** s'afficher : elle lit `showPrompt` de [[account.tsx]]. Les règles y sont décrites :
  - temps d'utilisation réelle (5 min au départ) ;
  - report de 7 jours et 30 min après un premier refus ;
  - plus jamais après deux refus ;
  - jamais si le joueur a déjà un avis ;
  - jamais pendant un lot, une confirmation, la palette ou l'offre Premium.

## Ce que le fichier expose
- `ReviewPrompt()`, sans paramètre.
- `STAR` : le tracé de l'étoile pleine des maquettes d'avis (`.st4`), repris par [[ReviewDialog.tsx]].

## Fonctionnement détaillé
- **Aspect (v5)** : `div.w5.flt` couvre toute la fenêtre sans prendre les clics (`pointer-events: none`) ; dedans la carte `aside.rvp` (330 px, à 28 px du coin bas droit) : croix `.cx`, cinq étoiles rouges `.st4`, titre en condensé italique, texte, puis `.ra2` avec « Donner mon avis » (`btn sm red`) et « Plus tard » (`btn sm gh2`). Apparition : fondu et 16 px en 0,32 s.
- **« Donner mon avis »** : `openReview(true)` ouvre [[ReviewDialog.tsx]]. Si la fenêtre est fermée sans envoi, cela compte comme un refus.
- **« Plus tard »** et la croix : `dismissPrompt()`, un refus.
- **Placement** : la carte monte à 100 px du bas quand la barre « Appliquer » est visible (classe `up` sur `.flt`, glissement de 0,32 s). C'est la même règle que [[ApplyBar.tsx]] : pas de lot en cours, page hors de `NO_APPLY_BAR`, et au moins un réglage coché ou un retour arrière en attente sur un réglage appliqué. Sur l'onglet Packet Optimizer (`netopt`), la carte monte toujours : sa propre barre est toujours là ([[NetOpt.tsx]]).
- **Hauteur partagée** : un `ResizeObserver` pose la hauteur de la carte dans `--rvp-h` (sur `<html>`). `s5/app.css` s'en sert pour placer les petits messages de [[ResetToast.tsx]] juste au-dessus d'elle, et pour laisser la page défiler sous elle (marge du bas de `.main`).
- **Empilement** : `z-index` 30, sous l'écran d'exécution (40) et les fenêtres (50 et plus). De toute façon elle ne s'affiche pas pendant un lot ni par-dessus une fenêtre ([[account.tsx]]).

## Données touchées
- Aucune directement. La mémoire de l'invitation (`rago.reviewPrompt2`) est tenue par [[account.tsx]].

## Liens avec le reste
- Règles : [[account.tsx]]. Fenêtre : [[ReviewDialog.tsx]]. Barre du bas : [[ApplyBar.tsx]]. Textes : `prompt.*` de [[accountText.ts]].
- Styles : `.rvp`, `.st4`, `.ra2` de `s5/pages/win.css` (maquette), placement et `.flt` dans `s5/app.css` ([[Maquettes v5 dans l'app (s5)]]).

## À savoir avant de modifier
- Si la règle d'affichage de [[ApplyBar.tsx]] change, recopier ici le calcul de `barUp`, sinon l'invitation passe sous la barre.
