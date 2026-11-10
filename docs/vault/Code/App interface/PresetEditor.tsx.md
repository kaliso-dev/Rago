---
type: code
tags: [code, app, react, composant, presets]
fichier: app/src/components/PresetEditor.tsx
lignes: 163
maj: 2026-11-10
---
# PresetEditor.tsx

La fenêtre **« Modifier le preset »** d'un preset de « Mes presets » : son nom, ses réglages, leurs variantes. **Rien n'est appliqué** : le preset s'ajoute ensuite à la sélection comme avant. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Presets]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Ouverte depuis la carte « Mes presets » de [[Dashboard.tsx]] (bouton « Modifier ») et depuis [[Share.tsx]] (juste après avoir gardé le preset d'un ami).
- Lit `myPresets`, `currentSetup` et `updatePreset` dans [[store.tsx]]. La recherche vient de `searchTweaks` de [[catalog.ts]], le nom limité à 40 caractères de `MAX_NAME` ([[share.ts]]).
- Gratuite : « Mes presets » marche sans licence.

## Ce que le fichier expose
- `PresetEditor({ id, onClose })`. La fenêtre est ouverte quand `id` désigne un preset existant de « Mes presets », sinon elle est fermée. Elle utilise `Modal` (voir [[Petits composants de l'interface]]).

## Fonctionnement détaillé
- À l'ouverture (changement d'`id`), la fenêtre recopie le nom et les entrées du preset. La recherche est vidée.
- **Nom** : champ limité à 40 caractères. Entrée enregistre.
- **Liste des réglages** (« {n} réglages »). Chaque ligne montre :
  - le nom du réglage et son module ;
  - « Inconnu de cette version » si l'id n'existe pas dans ce catalogue (le nom vient alors de `itemName`) ;
  - une liste des variantes si le réglage en a plus d'une ;
  - une croix « Retirer du preset ».
- **« Ajouter mes réglages allumés ({n}) »** : ajoute les entrées de `currentSetup` (réglages allumés en ce moment) qui ne sont pas déjà dans le preset. Un réglage déjà présent prend la variante choisie en ce moment.
- **Recherche** « Ajouter un réglage : nom ou mot-clé » :
  - 8 résultats au plus, seulement des `tweak` qui ne sont pas déjà dans le preset ;
  - un clic ou Entrée ajoute le réglage avec sa variante par défaut (`defaultVariant`, sinon la première) ;
  - le champ garde le focus pour en ajouter plusieurs à la suite ;
  - Échap vide d'abord la recherche, puis, au 2e appui, ferme la fenêtre.
- **Enregistrer** : `updatePreset(id, nom, entrées)`, puis fermeture. Grisé si le nom est vide ou s'il n'y a aucun réglage. « Annuler » ferme sans rien garder.

## Données touchées
- `rago.myPresets` (`localStorage`, via [[store.tsx]]).

## Erreurs et cas limites
- La recherche propose aussi les réglages Premium. Sans licence, ils restent dans le preset mais ne sont pas cochés quand on l'ajoute à la sélection (règles de `selectMany`, voir [[store.tsx]]).
- Un preset supprimé pendant que la fenêtre est ouverte la ferme (`preset` devient `null`).

## Liens avec le reste
- Fonctionnalité : [[Presets]]. Appelants : [[Dashboard.tsx]], [[Share.tsx]].
- Textes : clés `dash.mine.*` de [[i18n.ts]]. Styles : section « modifier un preset » de `features.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Les entrées gardent le format `id` ou `id:variante` des codes de partage ([[share.ts]]) : ne pas le changer, les presets sont gardés chez les joueurs et partagés sur Discord.
