---
type: pilotage
tags: [pilotage]
maj: 2026-11-01
---
# Prochaines étapes

Liste priorisée au 01/11. Rien ne se lance sans la demande de Sofiene ([[Règles de travail]]). Voir [[État actuel]] et [[Questions ouvertes]].

## Maintenant
1. La [[Version 1.2.1]] est en ligne (31/10) : vérifier que les 1.2.0 se mettent à jour seules ([[Mise à jour automatique]]).
2. **Corriger le preset Minecraft PvP** (Sofiene, 01/11 : « il faut le faire, il faut l'ajouter aux tâches »). Retour joueur du 29/10 : curseur perdu en plein écran après « Optimize and play » (suspect : `win_fullscreen`, présent aussi dans les presets FPS max, PC portable et des jeux compétitifs) et ping instable (`ping_packets: hitreg` qui chevauche le [[Packet Optimizer]]). La cause n'est pas confirmée : la vérifier d'abord, puis staging, puis prod. Voir [[Problèmes joueurs]], [[Presets]].
3. **E-mail aux titulaires de compte sur la collecte des tests réseau** (Sofiene, 01/11 : « oui il faudrait les envoyer »), comme le promet la politique de confidentialité : texte à rédiger, puis à faire valider par Sofiene avant l'envoi ([[Test réseau]], [[Serveur de licences]]).
4. **Connexion à l'app Windows avec Google ou Discord** (Sofiene, 01/11 : prévue, « c'est important ») : voir [[Connexion Google et Discord]].

## Ensuite
- Remettre [[Linear]] entièrement à jour pour pouvoir continuer à l'utiliser (Sofiene, 01/11) ; attend son accord pour écrire dedans ([[Questions ouvertes]]).
- **OS de Sofiene** (développé sur un autre compte Claude, hors de ce dépôt) : quand Sofiene le demandera, le personnaliser avec la DA de Rago Optimizer ([[Charte graphique]], [[Voix et ton]], [[Refonte glass]]). Rien à faire avant sa demande.
- [[Client Minecraft Rago]] : projet à part, en cours dans un projet isolé ; rien à faire ici sans demande.

## Plus tard
- [[Proxy]] : mesurer le trajet proxy → serveur de jeu (« pas maintenant », 01/11).
- Signature de code de l'exe (RAG-25, avertissement SmartScreen) : prévue, quand il y aura le budget (01/11, voir [[App Windows]]).

## Backlog Linear (relevé du 16/10, en partie fait depuis)
Fait en 1.2 : RAG-82 [[Barre en jeu]], RAG-24 [[Mise à jour automatique]], RAG-48 Clean RAM, RAG-57 [[Bibliothèque de jeux]], RAG-44/70 partage de presets. Restent : RAG-50 [[Proxy]] (en pause), RAG-70 rapport support (partiel : `report.rs`), RAG-33 note des avis dans Google, RAG-25 signature de code (plus tard, budget). Voir [[Linear]].
