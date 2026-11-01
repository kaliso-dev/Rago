---
type: règle
tags: [règle, vault]
maj: 2026-11-01
---
# Mettre à jour le vault

> **Règle n°1 du projet (Sofiene, 31/10/2026).** Ce vault doit correspondre **en tout point** à l'état actuel du projet : chaque fonctionnalité, chaque fonctionnement, chaque décision, chaque chose en cours. Il ne doit **jamais** contenir une info fausse, périmée ou abandonnée. Tout Claude qui travaille sur le projet en est responsable.

Ce vault est la **mémoire du projet** : la mémoire intégrée de Claude est désactivée chez Sofiene, donc ce qui n'est pas écrit ici est perdu à la fin d'un fil. Retour à [[Projet]].

## 1. Avant de commencer
1. Lire [[Projet]], [[État actuel]], [[Règles de travail]], puis toutes les notes du sujet (fonctionnalité, version, marketing…).
2. **Comparer avec la réalité** (code de la bonne branche, PR, prod, ce que dit Sofiene). Toute différence trouvée est corrigée dans le vault **dans la même tâche**, même si ce n'est pas le sujet demandé.
3. **Lire les réponses de Sofiene** sur la page « Questions du vault Rago » qui ne sont pas encore traitées, et les appliquer (mode d'emploi dans [[Questions ouvertes]]).

## 2. Pendant le travail : détecter tout changement
À chaque info nouvelle, se demander : **est-ce que ça change une note ?**
- une fonctionnalité ajoutée, modifiée, renommée, déplacée (gratuit ↔ Premium, nouvel écran, nouveau comportement) ;
- une version construite, testée, publiée, retirée ;
- une décision de Sofiene (même dite en passant) ;
- un bug trouvé ou corrigé, un retour joueur ;
- un chiffre (nombre de tweaks, prix, membres, vues…) ;
- **un projet ou une fonctionnalité arrêtés ou abandonnés**.

## 3. À la fin de chaque tâche (obligatoire, avant de dire « fini »)
1. **Mettre à jour** la note de chaque sujet touché pour qu'elle décrive **l'état réel d'aujourd'hui** (pas l'historique).
2. **Supprimer** ce qui n'est plus vrai :
   - fonctionnalité ou projet **abandonné** → supprimer sa note et toutes ses mentions ; garder **une seule ligne** dans [[Décisions]], section « Abandonné » (date + quoi + raison si connue), pour qu'aucun Claude ne le relance ;
   - info remplacée → réécrire la phrase, ne pas empiler « avant / après » sauf si c'est utile pour comprendre.
3. [[État actuel]] : version servie, PR ouvertes, ce qui attend Sofiene.
4. [[Journal]] : une ligne datée par événement marquant.
5. [[Décisions]] : chaque décision de Sofiene, datée, avec ses mots entre « ».
6. [[Bugs et incidents]] / [[Problèmes joueurs]] ; [[Questions ouvertes]] (retirer les questions répondues).
7. Si le catalogue de l'app a changé : régénérer les notes « Tweaks … » avec `python3 docs/tools/catalogue_vault.py` sur la branche qui porte la dernière version de l'app.
8. Mettre `maj:` à la date du jour (et `version_app:` si la note décrit l'app) dans l'en-tête des notes touchées.
9. Vérifier qu'aucun lien `[[…]]` n'est cassé et que chaque nouvelle note est reliée depuis [[Projet]] ou une note de carte.

## 4. En cas de doute
- **Ne jamais deviner.** Si on ne sait pas si une chose est faite, prévue ou abandonnée : **ajouter soi-même la question sur la page « Questions du vault Rago »**, automatiquement, sans attendre ni demander la permission (règle de Sofiene du 01/11 ; mode d'emploi dans [[Questions ouvertes]]). En attendant, l'écrire « À VÉRIFIER » dans la note et dans [[Questions ouvertes]], et prévenir Sofiene en une ligne dans le fil.
- Le code, la prod et la parole la plus récente de Sofiene font foi, dans cet ordre pour les faits, et Sofiene pour les décisions.

## 5. Règles d'écriture
- Français simple, phrases complètes. Une note par sujet ; nom de fichier = titre, unique dans tout le vault (les liens se font par nom).
- Précis : noms exacts de l'app, valeurs, conditions (gratuit/Premium), fichiers de code. Pas de « environ » quand le chiffre exact est connu.
- Statut et source pour ce qui n'est pas évident (CONFIRMÉ, DÉCIDÉ, OBSERVÉ, À VÉRIFIER).
- **Relier** : chaque note pointe vers au moins deux autres notes avec des liens doubles crochets. C'est la toile de la vue graphe.
- **Jamais de secret** : seulement les noms de variables ([[Clés et secrets]]).
- Les notes du dossier `Tweaks/` sont générées : ne pas les éditer à la main ([[Catalogue des tweaks]]).
- Les gros fichiers (vidéos, exe, captures) restent hors du dépôt : le vault ne garde que leur chemin ([[Sources]]).
