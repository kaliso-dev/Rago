---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/SearchPalette.tsx
lignes: 111
maj: 2026-11-10
---
# SearchPalette.tsx

La **recherche Ctrl+K** : une fenêtre qui cherche parmi tous les réglages, mène au réglage dans sa page, ou le coche directement. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Fonctionnement détaillé
- **Ouverture** : `Ctrl+K` (ou `Cmd+K` sur Mac en démo) n'importe où dans l'app, ou le bouton « Rechercher un réglage » de [[TitleBar.tsx]]. État `paletteOpen` du store. À chaque ouverture, le champ et la ligne active sont remis à zéro. Fermeture : Échap ou clic hors de la fenêtre (`Modal`).
- **Champ** : texte d'aide « Rechercher parmi {n} réglages » (`n` = 218, `totalTweaks`). Aucun résultat tant que le champ est vide.
- **Résultats** : `searchTweaks(q, lang)` de [[catalog.ts]] (tous les mots, sans accents, nom + description + nom anglais + id ; 40 au plus) ; chaque ligne montre le nom et le module.
- **Clavier** : flèches haut/bas pour changer de ligne, Entrée pour ouvrir ; la souris survolant une ligne la rend active (icône ↵).
- **Ouvrir un réglage** : ferme la palette et `goTo(module du réglage, id)` : la page du module s'ouvre, la section se déplie et la ligne est mise en valeur ([[ModulePage.tsx]], [[TweakRow.tsx]]).
- **Bouton à droite** (seulement pour les interrupteurs) :
  - réglage verrouillé : cadenas → ferme et ouvre l'offre `tweak` ([[Upsell.tsx]]) ;
  - sinon « + » → `toggle(id, true)` (coche ; respecte les places du plan gratuit) ; « ✓ » → `unselectMany([id])` (retire de la sélection). Ce bouton **n'annule jamais** un réglage déjà appliqué.
- « Aucun réglage ne correspond. » si rien ne correspond.

## Liens avec le reste
- Store : `paletteOpen`, `setPaletteOpen`, `goTo`, `selected`, `toggle`, `unselectMany`, `isLocked`, `setUpsell` ([[store.tsx]]).
- Composants : `Modal`, `Kbd` ([[Petits composants de l'interface]]).
- Le compte (`account.tsx`) ne montre pas l'invitation à laisser un avis tant que la palette est ouverte ([[account.tsx]]).
