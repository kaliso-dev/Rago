---
type: fonctionnalité
tags: [fonctionnalité, app, support, 1.2]
version_app: 1.3.0
maj: 2026-11-10
---
# Partage et support

Page « Partage et support », ouverte depuis la ligne « Partage et support » des [[Paramètres de l'app]] (pas d'entrée dans la barre latérale ; un lien « ‹ Paramètres » ramène en arrière). Gratuit. RAG-44 et RAG-70. Code : voir la section « Code ».

## Partager un preset
- Les tweaks allumés et leurs variantes deviennent un **code `RAGO2_…`** (aucune info du PC dedans) ou un **fichier `.rago`**. Nom facultatif, que l'ami voit.
- Le code se copie en entier par double-clic dans Discord et marche collé au milieu d'un message.
- **Importer** : aperçu avec le nombre de tweaks, nouveaux, déjà allumés, redémarrage, indisponibles sur ce PC, réservés à Premium ; « Ajouter à ma sélection » (à appliquer depuis la barre du bas) ; « Garder dans Mes presets » (sous le nom choisi par l'ami, modifiable, puis bouton « Modifier »). Sans licence, les réglages Premium du preset ne sont pas ajoutés et un bouton « Passer Premium » apparaît. Code d'une version plus récente → message « mets l'app à jour » ; code abîmé → message clair. Les anciens codes `RAGO1-…` se lisent encore.

## Rapport pour le support
- Fichier texte à joindre à un **ticket Discord**, en cinq parties à cocher : PC (Windows, CPU, GPU, RAM), tweaks appliqués et variantes, 50 derniers changements, 3 derniers journaux d'optimisation, carte réseau (**décochée d'office**).
- **Masqués partout** : nom du compte Windows et chemin du profil, nom du PC, e-mails, clés de licence, adresses IP et MAC. **Rien n'est envoyé** : le fichier est écrit dans `reports\`, le joueur le voit avant de le partager. Bouton « Ouvrir le support Discord ».

Liens : [[Presets]], [[Problèmes joueurs]], [[Discord]].

## Code
- Page : [[Share.tsx]] (aperçu de l'import, rapport). Codes `RAGO2_` et `RAGO1-` : [[share.ts]]. Modifier un preset gardé : [[PresetEditor.tsx]]. Partager un de « Mes presets » depuis l'accueil : [[Dashboard.tsx]].
- Moteur : [[report.rs]] (rapport masqué, dossier `reports\`) et les commandes `save_preset_file`, `read_preset_file`, `show_report` de [[lib.rs]].
- Carte d'ensemble : [[Code de l'app (interface)]].
