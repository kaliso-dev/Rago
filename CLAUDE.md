# Rago Optimizer : à lire avant tout travail

La mémoire du projet est le vault Obsidian `docs/vault/`. **Règle n°1 (Sofiene, 31/10/2026) : le vault doit correspondre en tout point à l'état actuel du projet.** Chaque Claude qui travaille sur le projet en est responsable.

1. **Avant** : lire `docs/vault/Projet.md`, `docs/vault/État actuel.md`, `docs/vault/Règles de travail.md` et les notes du sujet. Comparer avec le code, les PR et la prod ; corriger tout écart trouvé. Lire aussi les réponses de Sofiene pas encore traitées sur la page « Questions du vault Rago » (voir `docs/vault/Questions ouvertes.md`) et les appliquer.
2. **Pendant** : repérer toute info qui change une partie du projet (fonctionnalité ajoutée, modifiée ou abandonnée, version, décision, bug, chiffre).
3. **À la fin de chaque tâche, avant de dire que c'est fini** : mettre le vault à jour en suivant `docs/vault/Mettre à jour le vault.md`. Ce qui est abandonné ou n'est plus vrai est supprimé (une seule ligne reste dans « Décisions » > « Abandonné »). Si le catalogue de l'app change : `python3 docs/tools/catalogue_vault.py`.
4. **En cas de doute** (fait, prévu ou abandonné ?) : ajouter **soi-même, automatiquement**, la question sur la page « Questions du vault Rago » (règle de Sofiene du 01/11 ; mode d'emploi dans `docs/vault/Questions ouvertes.md`), écrire « À VÉRIFIER » en attendant, et prévenir Sofiene en une ligne. Ne jamais deviner.

Règles qui ne bougent jamais : rien sur GitHub ni dans l'app sans demande explicite de Sofiene ; staging d'abord, prod après validation ; aucun secret écrit nulle part ; ne jamais changer les clés de signature (voir `docs/vault/Technique/Clés et secrets.md`). Répondre à Sofiene en français.
