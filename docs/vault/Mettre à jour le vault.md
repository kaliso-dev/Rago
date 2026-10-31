---
type: règle
tags: [règle, vault]
maj: 2026-10-31
---
# Mettre à jour le vault

Ce vault est la **mémoire du projet**. La mémoire intégrée de Claude est désactivée chez Sofiene : tout ce qui n'est pas écrit ici est perdu à la fin d'un fil. Retour à [[Projet]].

## Au début d'une tâche
1. Lire [[Projet]], [[État actuel]], [[Règles de travail]].
2. Lire les notes liées au sujet (version, fonctionnalité, marketing).
3. Si une note contredit le code ou la prod, le code et la prod font foi : corriger la note.

## À la fin d'une tâche (obligatoire)
Dans la même PR que le travail, ou dans une PR dédiée au vault si le travail n'est pas dans le dépôt :
1. **[[État actuel]]** : ce qui a changé (version servie, PR ouvertes/fusionnées, ce qui attend Sofiene).
2. **[[Journal]]** : une ligne datée par événement marquant.
3. **[[Décisions]]** : chaque décision de Sofiene, datée, avec ses mots entre « » quand c'est possible.
4. **[[Bugs et incidents]]** / **[[Problèmes joueurs]]** : bugs ouverts ou corrigés.
5. La note de la fonctionnalité, de la version ou du sujet marketing concerné (en créer une si besoin, et la relier depuis [[Projet]]).
6. Mettre `maj:` à la date du jour dans l'en-tête des notes touchées.

## Règles d'écriture
- Français simple, phrases complètes. Une note par sujet ; nom de fichier = titre, unique dans tout le vault (les liens `[[...]]` se font par nom).
- **Relier** : chaque note pointe vers au moins deux autres notes avec `[[Nom de la note]]`, et vers [[Projet]] ou une note de carte. C'est ce qui donne la toile dans la vue graphe.
- Indiquer le statut (CONFIRMÉ, DÉCIDÉ, OBSERVÉ, À VÉRIFIER…) et la source (commit, PR, fil, date).
- **Jamais de secret** : seulement les noms de variables (voir [[Clés et secrets]]).
- Les gros fichiers (vidéos, exe, captures) restent dans le dossier partagé du projet Claude ou les artefacts GitHub : le vault ne contient que leur chemin (voir [[Sources]]).
