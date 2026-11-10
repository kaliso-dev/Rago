---
type: pilotage
tags: [pilotage, à-décider, à-vérifier]
maj: 2026-11-10
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
Ouvertes au 10/11, rangées par sujet sur la page (champ `theme` : Organisation, Version 1.3.0, Offre et app, Juridique et argent, Technique, Rago Route, Rago OS, Support, Marketing) :
- **Organisation** : q56 (un seul projet Claude avec des fils et des fiches par brique, ou plusieurs projets), q57 (Claude peut-il pousser le vault seul sur staging), q58 (ranger les anciens dossiers du dossier partagé dans une archive).
- **Version 1.3.0** : q47 (1.2.2 seule ou avec la 1.3.0), q48 (offre débitée après l'essai), q50 (seuils de l'[[Analyse du PC]], À VÉRIFIER).
- **Offre et app** : q36 (remboursement 14 jours), q37 (accord avant l'envoi du test réseau), q39 (parrainage dans la fenêtre Premium), q40 (même prix au renouvellement), q41 (Packet Optimizer en gratuit).
- **Juridique et argent** : q45 (partage des ventes), q46 (adresse des mentions légales), q49 (vendeur majeur et compte Stripe). Voir [[Conformité juridique]].
- **Technique** : q59 (correctif de site-check, Ubuntu 26.04 sur GitHub), q60 (minutes GitHub Actions de novembre épuisées, vu dans un e-mail du 10/11, non revérifié), q65 (réglages Railway de prod : Wait for CI, Watch Paths, Healthcheck, moniteur ; [[Railway]]), q66 (offre et sauvegardes du Supabase de prod ; [[Supabase]]), q67 (clés du serveur sauvegardées avec `export-keys` ; [[Clés et secrets]]).
- **Rago Route** : q55 (`ROUTE_TESTERS` sur Railway staging), q63 (4G du téléphone vue par Windows). Voir [[Proxy]].
- **Rago OS** : q62 (test de l'exe test5). Voir [[Rago OS]].
- **Support** : q61 (2 semaines offertes au client dont le Discord a déjà eu la récompense boost).
- **Marketing** : q64 (réponses d'Abel, voir ci-dessous).

Toutes les autres (q01 à q35, q38, q42 à q44, q51 à q54) sont traitées.

## À demander à Abel (Sofiene ne sait pas)
- Le partenariat avec le créateur YouTube à 50 % est-il arrêté ? ([[Partenaires et créateurs]])
- État des vidéos : « Rago tour », « What's new », vidéo principale de l'app ([[Vidéos YouTube]]).
- Tâches marketing dans [[Linear]] : GIVEAWAY (RAG-51), YOUTUBE (RAG-56), partner discord (RAG-54), vidéos YouTube avant/après (RAG-39), recrutement de créateurs Minecraft (RAG-35). Sofiene, 01/11 : « surement toujours en cours ».

## À vérifier (sans Sofiene)
- Les 1.2.0 installées reçoivent-elles bien la 1.2.1 ? (`/api/v1/update/status`) ([[Mise à jour automatique]])
- Railway prod a-t-il chargé les bases DB-IP (`/admin/reseau`) ? ([[Proxy]])
- La clé de mise à jour Tauri est-elle sauvegardée hors du PC ? ([[Clés et secrets]])
- [[Rago OS]] : la tâche « Rago Optimizer » se lance-t-elle sans droits administrateur depuis Rago OS ? Sofiene a essayé l'exe de test le 07/11, sans le dire.
- Remise du profil NVIDIA sur un vrai PC NVIDIA ([[Remise à zéro]]).
- Identité du vendeur absente des conditions de vente ; TVA (RAG-20 annulée sans raison) : voir [[Conformité juridique]].
