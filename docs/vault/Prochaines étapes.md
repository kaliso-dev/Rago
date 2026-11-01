---
type: pilotage
tags: [pilotage]
maj: 2026-11-01
---
# Prochaines étapes

Liste priorisée au 01/11. Rien ne se lance sans la demande de Sofiene ([[Règles de travail]]). Voir [[État actuel]] et [[Questions ouvertes]]. Chaque tâche a son ticket [[Linear]].

## Maintenant
1. La [[Version 1.2.1]] est en ligne (31/10) : vérifier que les 1.2.0 se mettent à jour seules ([[Mise à jour automatique]]).
2. **Version 1.2.2**, en cours dans le fil « Sortir l'app 1.2.2 » (Sofiene, 01/11 : « il faut lancer la correction avec le passage de la désinstallation des app préinstallées en gratuit et mettre à jour grâce à l'auto update ») :
   - corriger le preset Minecraft PvP (RAG-87) : curseur perdu en plein écran après « Optimize and play » (suspect : `win_fullscreen`, présent aussi dans les presets FPS max, PC portable et des jeux compétitifs) et ping instable (`ping_packets: hitreg` qui chevauche le [[Packet Optimizer]]). Cause à vérifier d'abord ([[Problèmes joueurs]], [[Presets]]) ;
   - désinstallation des applis préinstallées gratuite (RAG-88, [[Page Outils]]) ;
   - staging, puis prod après validation de Sofiene, distribuée par la [[Mise à jour automatique]].
3. **[[Bot communauté Discord]]** : le tester puis le passer en prod (Sofiene, 01/11), en cours dans le fil « Passer le bot Discord en prod » (RAG-91). Abel gère les bots du Discord.
4. **E-mail aux titulaires de compte sur la collecte des tests réseau** (Sofiene, 01/11 : « oui il faudrait les envoyer »), comme le promet la politique de confidentialité : texte à rédiger, puis à faire valider par Sofiene avant l'envoi (RAG-89, [[Test réseau]], [[Serveur de licences]]).
5. **Connexion à l'app Windows avec Google ou Discord** (Sofiene, 01/11 : prévue, « c'est important ») : RAG-90, voir [[Connexion Google et Discord]].

## Ensuite
- **OS de Sofiene** (développé sur un autre compte Claude, hors de ce dépôt) : quand Sofiene le demandera, le personnaliser avec la DA de Rago Optimizer ([[Charte graphique]], [[Voix et ton]], [[Refonte glass]]). Rien à faire avant sa demande.
- Charte « Affiche » v2.2 : aperçu sur la page d'accueil (PR #69, brouillon), en attente de la décision de Sofiene ([[Charte graphique]]).
- [[Client Minecraft Rago]] : projet à part, en cours dans un projet isolé ; rien à faire ici sans demande.

## Plus tard
- [[Proxy]] : mesurer le trajet proxy → serveur de jeu (« pas maintenant », 01/11 ; RAG-50).
- Signature de code de l'exe (RAG-83) : enlèverait l'avertissement SmartScreen et le blocage par Smart App Control ; prévue, quand il y aura le budget (01/11, voir [[App Windows]]).
- Note moyenne des avis dans Google (RAG-33).
