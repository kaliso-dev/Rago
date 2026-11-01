---
type: pilotage
tags: [pilotage, à-décider, à-vérifier]
maj: 2026-11-01
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
Aucune au 01/11 (q01 à q29 traitées).

## À demander à Abel (Sofiene ne sait pas)
- Le partenariat avec le créateur YouTube à 50 % est-il arrêté ? ([[Partenaires et créateurs]])
- État des vidéos : « Rago tour », « What's new », vidéo principale de l'app ([[Vidéos YouTube]]).
- Tâches marketing dans [[Linear]] : GIVEAWAY (RAG-51), YOUTUBE (RAG-56), partner discord (RAG-54), vidéos YouTube avant/après (RAG-39), recrutement de créateurs Minecraft (RAG-35). Sofiene, 01/11 : « surement toujours en cours ».

## À vérifier (sans Sofiene)
- Les 1.2.0 installées reçoivent-elles bien la 1.2.1 ? (`/api/v1/update/status`) ([[Mise à jour automatique]])
- Railway prod a-t-il chargé les bases DB-IP (`/admin/reseau`) ? ([[Proxy]])
- La clé de mise à jour Tauri est-elle sauvegardée hors du PC ? ([[Clés et secrets]])
- Remise du profil NVIDIA sur un vrai PC NVIDIA ([[Remise à zéro]]).
- Identité du vendeur absente des conditions de vente ; TVA (RAG-20 annulée sans raison).
