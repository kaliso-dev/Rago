---
type: pilotage
tags: [pilotage]
maj: 2026-11-07
---
# Prochaines étapes

Liste priorisée au 01/11. Rien ne se lance sans la demande de Sofiene ([[Règles de travail]]). Voir [[État actuel]] et [[Questions ouvertes]]. Chaque tâche a son ticket [[Linear]].

## Maintenant
1. La [[Version 1.2.1]] est en ligne (31/10) : vérifier que les 1.2.0 se mettent à jour seules ([[Mise à jour automatique]]).
2. **[[Version 1.3.0]]** (PR #70, 04/11) : contient la 1.2.2 ci-dessous, plus le plan gratuit à 73 réglages (30 actifs), la connexion à l'app avec Google ou Discord (RAG-90) et l'essai de 3 jours. À tester sur staging par Sofiene ; q47 et q48 en attente.
   **Version 1.2.2**, incluse dans la PR #70 (Sofiene, 01/11 : « il faut lancer la correction avec le passage de la désinstallation des app préinstallées en gratuit et mettre à jour grâce à l'auto update ») :
   - corriger le preset Minecraft PvP (RAG-87) : curseur perdu en plein écran après « Optimize and play » (suspect : `win_fullscreen`, présent aussi dans les presets FPS max, PC portable et des jeux compétitifs) et ping instable (`ping_packets: hitreg` qui chevauche le [[Packet Optimizer]]). Cause à vérifier d'abord ([[Problèmes joueurs]], [[Presets]]) ;
   - désinstallation des applis préinstallées gratuite (RAG-88, [[Page Outils]]) ;
   - staging, puis prod après validation de Sofiene, distribuée par la [[Mise à jour automatique]].
3. **[[Bot communauté Discord]]** : le tester puis le passer en prod (Sofiene, 01/11), en cours dans le fil « Passer le bot Discord en prod » (RAG-91). Abel gère les bots du Discord.
4. **E-mail aux titulaires de compte sur la collecte des tests réseau** (Sofiene, 01/11 : « oui il faudrait les envoyer »), comme le promet la politique de confidentialité : texte à rédiger, puis à faire valider par Sofiene avant l'envoi (RAG-89, [[Test réseau]], [[Serveur de licences]]).
5. **Identité du vendeur** sur le site (mentions légales, CGV) : bloquant pour être en règle, voir [[Conformité juridique]].
6. **[[Proxy]]** (RAG-50) : serveurs Vultr Paris (sortie) et Frankfurt (relais). Prototype Rago Route testé en partie depuis le Mac de Sofiene (tunnel ~5 ms mieux que le direct au même moment, 07/11). Version du 07/11 installée et testée (médiane 116 ms par le tunnel contre 119 en direct). Prochaine étape : rejouer en câble, ou en Wi-Fi avec l'iPhone en 4G branché en USB comme trajet de plus (`--interface`), et regarder « arrivé premier » et le ping Tab ; puis la version Windows dans l'app (sur `staging`).

## Ensuite
- **[[Rago OS]]** (EN COURS depuis le 07/11) : charte Rago, thèmes et lien avec l'app faits sur la branche `rago-design` du Mac de Sofiene. Reste : le tester sur Windows, mettre le pont et le Mode jeu total de l'app sur GitHub (staging) avec l'accord de Sofiene, réponses à q52 et q53.
- Charte « Affiche » v2.2 : aperçu sur la page d'accueil (PR #69, brouillon), en attente de la décision de Sofiene ([[Charte graphique]]).
- [[Client Minecraft Rago]] : projet à part, en cours dans un projet isolé ; rien à faire ici sans demande.

## Plus tard
- Signature de code de l'exe (RAG-83) : enlèverait l'avertissement SmartScreen et le blocage par Smart App Control ; prévue, quand il y aura le budget (01/11, voir [[App Windows]]).
- Note moyenne des avis dans Google (RAG-33).
