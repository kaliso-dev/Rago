---
type: pilotage
tags: [pilotage, à-décider, à-vérifier]
maj: 2026-11-08
---
# Questions ouvertes

Ce que le vault ne sait pas encore. **Retirer chaque question dès que Sofiene y répond**, et mettre à jour les notes concernées ([[Mettre à jour le vault]]). Voir [[Décisions]] et [[État actuel]].

**Où Sofiene répond** : la page « Questions du vault Rago » (https://claude.ai/artifact/1mqjZuFNVqGT5JhBmG6HPk). Règle du 01/11 : **dès qu'un Claude a une question, il l'ajoute lui-même sur cette page, sans attendre ni demander dans le fil** (« désormais tu devras le faire automatiquement »).

Mode d'emploi (outil ArtifactData, collection `questions`) :
- **Poser** : créer un document `qNN` (numéro suivant) avec `num`, `titre`, `question`, `contexte` (ce qu'on sait, en une phrase), `choix` (2 à 4 réponses courtes ; « Je ne sais pas » est ajouté par la page), `precision` (facultatif, texte d'aide du champ libre), `statut: "ouverte"`, `reponse: {choix: null, texte: ""}`. Une question = un sujet, en mots simples.
- **Lire** : au début de chaque tâche, lister les questions `ouverte` qui ont une réponse (`reponse.choix` ou `reponse.texte`).
- **Traiter** : mettre le vault à jour selon la réponse, puis passer la question en `statut: "traitée"` avec `traitement` (ce qui a été fait, en une phrase). Si la réponse demande une précision, réécrire `question` et `contexte`, vider `reponse` et laisser `ouverte`.
- Dire à Sofiene dans le fil, en une ligne, quand de nouvelles questions l'attendent.

## En attente de réponse sur la page
Ouvertes au 04/11 : q36 (remboursement 14 jours), q37 (accord avant l'envoi du test réseau), q39 (parrainage dans l'app), q40 (même prix au renouvellement), q41 (Packet Optimizer en gratuit), q45 à q50 (partage des ventes, mentions légales, sortie de la 1.2.2, offre après l'essai, vendeur majeur et Stripe, seuils de l'Analyse du PC). Les autres sont traitées (q51 traitée le 08/11 : Rago Route réservé au Premium).

- q44 à q49 (04/11) : statut du vendeur (traitée : « Pas encore »), partage de l'argent, adresse des mentions légales, vendeur majeur et compte Stripe, sortie de la 1.2.2, offre débitée après l'essai. Voir [[Conformité juridique]].
- q50 (04/11) : seuils de l'[[Analyse du PC]], À VÉRIFIER.
- q52 et q53 (07/11) : Mode jeu total gratuit ou Premium ; garder ou non l'optimiseur d'installation de [[Rago OS]] quand l'app est là.

## À demander à Abel (Sofiene ne sait pas)
- Le partenariat avec le créateur YouTube à 50 % est-il arrêté ? ([[Partenaires et créateurs]])
- État des vidéos : « Rago tour », « What's new », vidéo principale de l'app ([[Vidéos YouTube]]).
- Tâches marketing dans [[Linear]] : GIVEAWAY (RAG-51), YOUTUBE (RAG-56), partner discord (RAG-54), vidéos YouTube avant/après (RAG-39), recrutement de créateurs Minecraft (RAG-35). Sofiene, 01/11 : « surement toujours en cours ».

## À vérifier (sans Sofiene)
- Les 1.2.0 installées reçoivent-elles bien la 1.2.1 ? (`/api/v1/update/status`) ([[Mise à jour automatique]])
- Railway prod a-t-il chargé les bases DB-IP (`/admin/reseau`) ? ([[Proxy]])
- La clé de mise à jour Tauri est-elle sauvegardée hors du PC ? ([[Clés et secrets]])
- [[Rago OS]] : la tâche « Rago Optimizer » se lance-t-elle sans droits administrateur depuis Rago OS ? Rien n'est encore testé sur Windows.
- Remise du profil NVIDIA sur un vrai PC NVIDIA ([[Remise à zéro]]).
- Identité du vendeur absente des conditions de vente ; TVA (RAG-20 annulée sans raison) : voir [[Conformité juridique]].
