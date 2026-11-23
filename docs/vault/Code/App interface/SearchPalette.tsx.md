---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/SearchPalette.tsx
lignes: 122
maj: 2026-11-23
---
# SearchPalette.tsx

La **recherche Ctrl+K** : une fenêtre qui cherche parmi tous les réglages, mène au réglage dans sa page, ou le coche directement. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, PR #131 fusionnée le 24/11 : fenêtre refaite sur la maquette v5 `app-search`).

## Fonctionnement détaillé
- **Ouverture** : `Ctrl+K` (ou `Cmd+K` sur Mac en démo) n'importe où dans l'app, ou le bouton « Rechercher un réglage » de [[TitleBar.tsx]]. État `paletteOpen` du store. À chaque ouverture, le champ et la ligne active sont remis à zéro. Fermeture : Échap ou clic hors de la fenêtre (`Modal`).
- **Aspect (v5)** : `Modal` avec `box="pal"` : la boîte `.pal` (660 px) en haut de la fenêtre, à 110 px, la page assombrie et floutée dessous (`.dim2`). En haut `.pin` : loupe, la saisie dans la police de `.q` (condensé italique 28 px, capitales) avec un curseur rouge, `esc`. Dessous la liste `.pls2` : une ligne `li` (`.act` pour la ligne choisie, liseré rouge) avec le nom en gras, le module à côté, le bouton `.tg2` et l'icône Entrée (`.ent`) sur la ligne choisie. La liste montre 8 réglages puis défile (CSS dans `s5/app.css`).
- **Champ** : texte d'aide « Rechercher parmi {n} réglages » (`n` = 218, `totalTweaks`). Aucun résultat tant que le champ est vide.
- **Résultats** : `searchTweaks(q, lang)` de [[catalog.ts]] (tous les mots, sans accents, nom + description + nom anglais + id ; ceux dont le **nom** contient la recherche d'abord, puis ceux trouvés par leur description ; 40 au plus) ; chaque ligne montre le nom et le module.
- **Clavier** : flèches haut/bas pour changer de ligne, Entrée pour ouvrir ; la ligne choisie reste visible quand la liste défile ; la souris survolant une ligne la rend active (icône Entrée).
- **Ouvrir un réglage** : ferme la palette et `goTo(module du réglage, id)` : la page du module s'ouvre, la section se déplie (et ses réglages avancés si besoin) et le carreau est mis en valeur ([[ModulePage.tsx]], [[TweakRow.tsx]]).
- **Bouton à droite** (seulement pour les interrupteurs) :
  - réglage verrouillé : cadenas → ferme et ouvre l'offre `tweak` ([[Upsell.tsx]]) ;
  - sinon « + » → `toggle(id, true)` (coche ; respecte les places du plan gratuit) ; « ✓ » (case rouge `.tg2.on`) → `unselectMany([id])` (retire de la sélection). Ce bouton **n'annule jamais** un réglage déjà appliqué. Libellés lus par les lecteurs d'écran : `palette.add` / `palette.remove`. Un clic sur ce bouton laisse le focus dans la saisie : Entrée ouvre toujours la ligne choisie.
- « Aucun réglage ne correspond. » si rien ne correspond.

## Liens avec le reste
- Store : `paletteOpen`, `setPaletteOpen`, `goTo`, `selected`, `toggle`, `unselectMany`, `isLocked`, `setUpsell` ([[store.tsx]]).
- Composants : `Modal` (`box="pal"`, [[Petits composants de l'interface]]), icônes `I` (`s5/I.tsx`, [[Maquettes v5 dans l'app (s5)]]).
- Le compte (`account.tsx`) ne montre pas l'invitation à laisser un avis tant que la palette est ouverte ([[account.tsx]]).
