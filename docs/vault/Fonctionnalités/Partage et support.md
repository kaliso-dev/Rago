---
type: fonctionnalité
tags: [fonctionnalité, app, support, 1.2]
version_app: 1.2.1
maj: 2026-10-31
---
# Partage et support

Page « Partage et support », ouverte depuis les [[Paramètres de l'app]] (`Share.tsx`, `share.ts`, `report.rs`). Gratuit. RAG-44 et RAG-70.

## Partager un preset
- Les tweaks allumés et leurs variantes deviennent un **code `RAGO2_…`** (aucune info du PC dedans) ou un **fichier `.rago`**. Nom facultatif, que l'ami voit.
- Le code se copie en entier par double-clic dans Discord et marche collé au milieu d'un message.
- **Importer** : aperçu avec le nombre de tweaks, nouveaux, déjà allumés, redémarrage, indisponibles sur ce PC, réservés à Premium ; « Ajouter à ma sélection » (à appliquer depuis la barre du bas) ; « Garder dans Mes presets ». Code d'une version plus récente → message « mets l'app à jour » ; code abîmé → message clair.

## Rapport pour le support
- Fichier texte à joindre à un **ticket Discord** : PC (Windows, CPU, GPU, RAM), tweaks appliqués et variantes, 50 derniers changements, 3 derniers journaux d'optimisation, carte réseau.
- **Masqués partout** : nom du compte Windows et chemin du profil, nom du PC, e-mails, clés de licence, adresses IP et MAC. **Rien n'est envoyé** : le fichier est écrit dans `reports\`, le joueur le voit avant de le partager. Bouton « Ouvrir le support Discord ».

Liens : [[Presets]], [[Problèmes joueurs]], [[Discord]].
