---
type: pilotage
tags: [pilotage]
maj: 2026-11-09
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
6. **[[Proxy]]** (RAG-50) : serveurs Vultr Paris (sortie) et Frankfurt (relais). Prototype Rago Route testé en partie depuis le Mac de Sofiene (tunnel ~5 ms mieux que le direct au même moment, 07/11). Version du 07/11 installée et testée (médiane 116 ms par le tunnel contre 119 en direct). Tests sur le Mac du 07/11 faits (câble seul, puis Wi-Fi + 4G de l'iPhone avec `--telephone`) : tunnel quelques ms mieux que le direct, aucune perte, 4G ≈ 67 Mo/h et jamais utile tant que le Wi-Fi tient. Test de coupure du Wi-Fi fait (07/11) : la partie tient, mais la 4G monte à 1,2–1,5 s pendant la coupure ; à cause d'une mauvaise réception 4G ce jour-là (Sofiene). Version Windows dans l'app sur `staging` (moteur `route.rs` + onglet « Rago Route » de l'exe de test, 07/11) : essayée avec succès sur un PC Windows le 07/11 au soir (0 perte, retard du moteur 12 ms) ; reste une vraie partie avec ressenti. Accès Premium sur `staging` depuis le 08/11. Protocole 2 codé le 08/11 (chiffrement, paquets de secours, 4G sur Windows, choix de la sortie) : sur `staging` depuis le 08/11 au soir, Paris et Frankfurt réinstallés le 09/11 ; tests de Sofiene sur Windows en cours (double route, 4G du téléphone) ; variable `ROUTE_TESTERS` (son e-mail) sur Railway staging ; puis serveur de licences en prod après sa validation (sinon les comptes de la prod n'auront pas de jeton). Ensuite : essayer la 4G du téléphone sur un vrai PC Windows, nouvelles sorties (à acheter par Sofiene), onglet visible hors de l'exe de test.

## Ensuite
- **[[Rago OS]]** (EN COURS depuis le 07/11) : charte, 3 thèmes, Recherche des réglages, plein écran, Dock masqué, Pastille Live épurée, widgets, touche Windows, lancement instantané, session légère et retour à Windows d'origine faits sur la branche `rago-design` du Mac de Sofiene, avec ses retours du 08/11 (test4) et du 09/11 (test5 : appli Horloge, widget Rago Route, jeu sur tout l'écran, touche Windows fiable). Reste : retours de Sofiene sur test5 (dont le nombre de processus atteint), trouver comment réserver l'OS aux joueurs Premium.
- Charte « Affiche » v2.2 : aperçu sur la page d'accueil (PR #69, brouillon), en attente de la décision de Sofiene ([[Charte graphique]]).
- [[Client Minecraft Rago]] : projet à part, en cours dans un projet isolé ; rien à faire ici sans demande.

## Plus tard
- Signature de code de l'exe (RAG-83) : enlèverait l'avertissement SmartScreen et le blocage par Smart App Control ; prévue, quand il y aura le budget (01/11, voir [[App Windows]]).
- Note moyenne des avis dans Google (RAG-33).
