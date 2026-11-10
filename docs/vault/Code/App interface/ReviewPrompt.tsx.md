---
type: code
tags: [code, app, react, composant, avis]
fichier: app/src/components/ReviewPrompt.tsx
lignes: 49
maj: 2026-11-10
---
# ReviewPrompt.tsx

L'**invitation discrète à laisser un avis**, en bas à droite de la fenêtre : « Rago Optimizer te plaît ? ». Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Paramètres de l'app]], [[Site]] (les avis s'affichent sur le site).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

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

## Fonctionnement détaillé
- Carte animée (`motion.aside`) : cinq étoiles, titre « Rago Optimizer te plaît ? », texte « Laisse un avis rapide. Il s'affiche sur le site avec ton nom public. ».
- **« Donner mon avis »** : `openReview(true)` ouvre [[ReviewDialog.tsx]]. Si la fenêtre est fermée sans envoi, cela compte comme un refus.
- **« Plus tard »** et la croix : `dismissPrompt()`, un refus.
- **Placement** : la carte monte au-dessus de la barre « Appliquer » quand celle-ci est visible (classe `above-bar`). C'est la même règle que [[ApplyBar.tsx]] : pas de lot en cours, et au moins un réglage coché ou un retour arrière en attente sur un réglage appliqué.

## Données touchées
- Aucune directement. La mémoire de l'invitation (`rago.reviewPrompt2`) est tenue par [[account.tsx]].

## Liens avec le reste
- Règles : [[account.tsx]]. Fenêtre : [[ReviewDialog.tsx]]. Barre du bas : [[ApplyBar.tsx]]. Textes : `prompt.*` de [[accountText.ts]].
- Styles : section « invitation » de `account.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Si la règle d'affichage de [[ApplyBar.tsx]] change, recopier ici le calcul de `barUp`, sinon l'invitation passe sous la barre.
