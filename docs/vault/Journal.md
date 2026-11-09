---
type: pilotage
tags: [journal, chronologie]
maj: 2026-11-10
---
# Journal

Une ligne par événement marquant, la plus récente en haut. Voir [[Historique des versions]] et [[Décisions]].

## Novembre 2026
| Date | Événement | Liens |
|---|---|---|
| 10/11 | Nouvelle note d'archive [[Historique des problèmes]] (demande de Sofiene) : tous les problèmes rencontrés, avec cause et solution, pour déboguer plus tard ; ajout du bug d'`availability()` (tweaks AMD appliqués sur un PC Intel) | [[Bugs et incidents]] |
| 10/11 | Tableau de bord `/admin` complet demandé par Sofiene et codé : joueurs et accès (dont bannissement), ventes Stripe du jour, du mois et totales, état des services, journal ; PR #77 fusionnée dans `staging` sur « fusionne » de Sofiene | [[Tableau de bord admin]] |
| 10/11 | Étude des minutes GitHub Actions : `rago` est public (minutes gratuites) ; le quota est vidé par la CI de `network-server-rago` (151 runs en deux jours) ; Sofiene décide de rendre ce dépôt public, pas GitLab | [[CI GitHub Actions]] |
| 10/11 | q46 : l'adresse des mentions légales sera une domiciliation, prise plus tard ; il ne reste que q65 (réglages Railway, à vérifier avec Sofiene) | [[Conformité juridique]] |
| 10/11 | PR #76 fusionnée dans `staging` (« tu peux tout push ») ; plan gratuit confirmé à 73 réglages dont 30 actifs (q68). | [[Version 1.3.0]] |
| 10/11 | PR #76 ouverte vers `staging` : la 1.3.0 devient la grosse sortie avec Rago Route (onglet dans tous les exe), Packet Optimizer entièrement Premium, essai sur le mensuel, plus de remboursement (`refunds.html` supprimée, CGV), normes de l'Analyse du PC par joueur, Straight retiré et signature « KALISO and RAGO » ; « 30 opti 15 slots » attend q68 | [[Version 1.3.0]], [[Proxy]], [[Offres et prix]] |
| 10/11 | Vault technique complété pour qu'un nouveau Claude puisse développer sans contexte : porte d'entrée [[Reprendre le développement]], fiches [[Architecture de l'app]], [[Architecture du serveur]], [[API du serveur]], [[Paiements Stripe]], [[Supabase]], [[Railway]], [[Netlify]], [[CI GitHub Actions]], [[Variables d'environnement]], [[Infrastructure Rago Route]], [[Développer et tester]] ; un `CLAUDE.md` court dans `app/`, `licensing/`, `site/` et `proxy/` | [[Reprendre le développement]] |
| 10/11 | Sofiene répond aux questions q36 à q67 ([[Décisions]]) : une seule grosse sortie avec Rago Route, pas de remboursement, Packet Optimizer en Premium, mensuel après l'essai, sa mère vendeuse ; Supabase de prod menacé de suppression le 05/12 et aucune clé sauvegardée ; anciens dossiers du dossier partagé supprimés | [[État actuel]], [[Supabase]], [[Clés et secrets]] |
| 10/11 | Point du projet : la page « Questions du vault Rago » montre en haut l'état du projet et la recommandation d'organisation (un seul projet Claude, un fil par tâche, une fiche technique par brique, CLAUDE.md par dossier du code), et range les questions par sujet ; 9 nouvelles questions (q56 à q64). LinkedIn automatisé arrêté à la demande de Sofiene (fil « Créer le profil LinkedIn de Sofiene ») | [[Questions ouvertes]], [[Mettre à jour le vault]] |
| 09/11 | [[Rago OS]] test5 : appli Horloge (alarmes, minuteur, chronomètre, villes), widget Rago Route, Rago Notes, Météo et Horloge dans la Recherche, « Jeu sur tout l'écran », widgets cachés en jeu, touche Windows fiable après une relance, animations du Dock réglables, Météo et boutons de Rago Notes moins « Apple », widgets revus. Côté app, PR #74 fusionnée dans `staging` (commandes `tweaks`, `tweak` et Rago Route du pont, Rago OS jamais pris pour un jeu) | [[Rago OS]], [[Proxy]] |
| 09/11 | Rago Route sur Windows testé par Sofiene avec pertes simulées (clumsy) : paquets sauvés et réparés comptés, mais pas de différence ressentie en jeu | [[Proxy]] |
| 09/11 | Rago Route sur Windows testé par Sofiene avec pertes simulées (clumsy) : paquets sauvés et réparés comptés, pas de différence ressentie à 5 % de pertes, nette différence à 25 % | [[Proxy]] |
| 08/11 | Rago OS test4 : touche Windows → Applis, Dock rangé dès que la souris part, lancement instantané par défaut, session légère (47 services en pause), Windows remis comme avant en quittant, économiseur supprimé, noms moins « Apple » | [[Rago OS]] |
| 08/11 | [[Rago OS]], retours de Sofiene traités : 3 thèmes gardés (Rago, Tournoi, Pétale) aux coins arrondis, contraste vérifié texte par texte en sombre et en clair, Dock qui ne s'ouvre que souris plaquée au bord et se range dès qu'elle part, île sans FPS ni ping en jeu (résumé de fin gardé). Nouvel exe de test | [[Rago OS]] |
| 08/11 | Rago Route, protocole 2 : tunnel chiffré, paquets de secours, 4G du téléphone sur Windows, choix de la sortie la plus rapide ; testé en labo, poussé sur `staging` (Sofiene réinstalle les 2 serveurs) | [[Proxy]] |
| 08/11 | Accès Premium de Rago Route poussé sur `staging` (commit `7ba0250`) à la demande de Sofiene | [[Proxy]] |
| 08/11 | Rago Route réservé au Premium (choix de Sofiene) : jeton signé par le serveur de licences, vérifié par la sortie, relais limité à Paris, onglet de l'app avec l'offre Premium, ancien proxy simple retiré de `install.sh` ; testé en labo, pas encore poussé ni installé | [[Proxy]] |
| 08/11 | Compte rendu des performances de Rago Route écrit pour le collègue de Sofiene | [[Proxy]] |
| 07/11 | [[Rago OS]], suite : Spotlight cherche et active n'importe quel réglage de l'app, applis ouvertes en plein écran, Dock masqué par défaut, logo R, thèmes v2 (15 thèmes complets, éditeur, thèmes enregistrés), île et widgets enrichis. Commits sur `rago-design` (Mac de Sofiene) ; côté app, commandes `tweaks` et `tweak` du pont en local seulement | [[Rago OS]] |
| 07/11 | Sofiene essaie l'exe de test de Rago OS sur son PC Windows : « plein de bug » (liste pas encore donnée) | [[Rago OS]] |
| 07/11 | PR #73 fusionnée dans `staging` sur « fusionne » de Sofiene : pont Rago OS et Mode jeu total dans l'app, vault | [[Rago OS]], [[Mode jeu]] |
| 07/11 | [[Rago OS]] (dossier `nimbus` du Mac de Sofiene) passe à la charte Rago, reçoit 7 thèmes Rago et devient l'extension de l'app : pont local, FPS et ping dans l'île, Mode jeu total, page, widget et Spotlight Rago | [[Rago OS]] |
| 07/11 | Premier essai de Rago Route dans l'exe de test sur un PC Windows (soir) : marche ; direct 13 ms, Frankfurt 35 ms, 0 perte, retard du moteur 12 ms au pire | [[Proxy]] |
| 07/11 | Rago Route dans l'app Windows : moteur Rust `route.rs` + onglet « Rago Route » dans Réseau (exe de test seulement), testé en labo ; poussé sur `staging` à la demande de Sofiene (exe de test refabriqué), jamais lancé sur un PC Windows | [[Proxy]] |
| 07/11 | Test de coupure du Wi-Fi (~30 s, 14 h 05) : la partie tient, la 4G prend tout, mais monte à 1,2–1,5 s : mauvaise réception 4G chez la grand-mère de Sofiene (sa réponse) | [[Proxy]] |
| 07/11 | Partie de 10 min avec Wi-Fi + Frankfurt + 4G de l'iPhone : `--telephone` marche sur le vrai Mac ; tunnel 107–125 ms contre 116–137 ms en direct ; 4G jamais utile (Wi-Fi parfait), ≈ 67 Mo/h reçus | [[Proxy]] |
| 07/11 | Rago Route : option `--telephone` (Mac) qui prépare et vérifie seule le trajet 4G de l'iPhone, à la demande de Sofiene ; testée par simulation, pas encore sur son Mac | [[Proxy]] |
| 07/11 | Essai d'1 min à 06 h 51 en câble seul (Wi-Fi coupé) : tunnel 108–109 ms contre 115 ms en direct, 0 perte ; trajet direct 11–14 ms comme à 06 h 27 ; le programme se fige encore jusqu'à 99 ms : les pics viennent du Mac, pas du Wi-Fi | [[Proxy]] |
| 07/11 | Essai de 2 min à 06 h 27 avec un câble RJ45 branché au Mac (interface réellement utilisée À VÉRIFIER, le Wi-Fi restait allumé) : au même moment, tunnel 105–110 ms contre 113–115 ms en direct ; 0 perte, trajet direct premier à 99 % ; pics restants = programme figé sur le Mac (jusqu'à 191 ms) | [[Proxy]] |
| 07/11 | Site : page `route.html` « Rago Route » entièrement animée + section et liens sur l'accueil, poussée sur `staging` (Sofiene : « tu peux push sur staging les modif du site ») | [[Site]] |
| 07/11 | Partie avec la version du 07/11 : tunnel médiane 116 ms contre 119 ms en direct ; aucune perte, pics venant du premier tronçon (Wi-Fi ou Mac) ; ajout de « arrivé premier » et des Mo reçus par trajet pour tester la 4G | [[Proxy]] |
| 07/11 | Rago Route, version du 07/11 : renvois inutiles supprimés, reprise en 10 à 20 ms après une coupure, retard du programme mesuré aussi sur la sortie ; testée en local | [[Proxy]] |
| 07/11 | Partie normale par Rago Route (Wi-Fi) : au même moment, tunnel 111–115 ms contre 116–118 ms en direct ; pics dus en partie au programme Python qui se fige sur le Mac | [[Proxy]] |
| 06/11 | Premier test réel de Rago Route depuis le Mac de Sofiene : 114,8 ms par le tunnel (sortie Paris) contre 120,1 ms en direct | [[Proxy]] |
| 06/11 | Prototype Rago Route écrit (`proxy/rago-route.py`) et testé en local ; test réel prévu avec une sortie à Paris | [[Proxy]] |
| 05/11 | Test de Sofiene depuis la France : direct 104,8 ms, Chicago 112, New York 111, Frankfurt 127 | [[Proxy]] |
| 05/11 | Proxys New York et Chicago installés ; Chicago → Hypixel 4,8 ms (Hypixel est à Chicago) | [[Proxy]] |
| 05/11 | Proxys Vultr Frankfurt et Mumbai installés et en marche ; Frankfurt → Hypixel 99,6 ms, Mumbai → Hypixel 239 ms | [[Proxy]] |
| 05/11 | Proxy : OVHcloud écarté (pas de VPS en Europe), Vultr retenu ; relais Minecraft, ping et script d'installation écrits (`proxy/`) ; document refait pour OVHcloud | [[Proxy]] |
| 04/11 | Proxy relancé par Sofiene ; analyse des tests réseau et recommandation d'achat chiffrée (Vultr) | [[Proxy]] |
| 04/11 | Ajoutés à la 1.3.0 (PR #70) : Analyse du PC avec avant/après, fenêtre Premium avec les prix, résiliation dans l'app | [[Analyse du PC]], [[Abonnement dans l'app]] |
| 04/11 | PR #70 passe en 1.3.0 : 73 réglages gratuits (30 actifs), connexion à l'app avec Google/Discord, essai de 3 jours, site et pages légales à jour, fusion prod → staging | [[Version 1.3.0]], [[Conformité juridique]] |
| 04/11 | PR #72 (état des lieux Stripe) fusionnée sur « fusionne » | [[Ventes Stripe]] |
| 04/11 | Stripe connecté à Claude : premier état des lieux des ventes (611,02 $, 33 abonnés, 5 Lifetime) ; prix Stripe conformes au vault | [[Ventes Stripe]] |
| 01/11 | PR #68 (mises à jour du vault du 31/10 et du 01/11) fusionnée sur « fusionne » | [[Mettre à jour le vault]] |
| 01/11 | Dernières réponses de Sofiene : acerSHOCK = Abel ; RAG-16, RAG-21 abandonnés ; RAG-76, RAG-84 arrêtés faute de nouvelles des joueurs | [[Linear]], [[Problèmes joueurs]] |
| 01/11 | Anciennes PR #16, #50, #51, #60 fermées ; [[Linear]] remis à jour (RAG-86 à RAG-91) ; fils « Sortir l'app 1.2.2 » et « Passer le bot Discord en prod » ouverts | [[Prochaines étapes]] |
| 01/11 | PR #69 (brouillon) : charte « Affiche » v2.2 sur la page d'accueil, pour décider de l'adopter | [[Charte graphique]] |
| 01/11 | Sofiene répond aux questions du vault sur la page « Questions du vault Rago » ; vault mis à jour | [[Décisions]], [[Questions ouvertes]] |

## Octobre 2026
| Date | Événement | Liens |
|---|---|---|
| 31/10 | 1.2.1 en ligne (exe et `.sig` déposés par Sofiene) ; Lifetime 59,99 $ confirmé | [[Version 1.2.1]] |
| 31/10 | Création de ce vault Obsidian dans `docs/vault/` | [[Mettre à jour le vault]] |
| 29/10 | Retour joueur : hitreg meilleur, mais curseur perdu en plein écran et ping instable | [[Problèmes joueurs]] |
| 29/10 | Site mis à jour pour la 1.2.1, plans de prix réécrits (PR #66) ; section « New in 1.2 » (PR #59) | [[Site]] |
| 29/10 | Serveur de prod : mises à jour auto + collecte des tests réseau (PR #63) ; exe 1.2.1 de prod signé ; 1.2.1 fusionnée dans `staging` (PR #64, #65) | [[Version 1.2.1]], [[Proxy]] |
| 29/10 | Annonces Discord 1.2 rédigées (FR, EN) ; script YouTube « What's new » écrit | [[Discord]], [[Vidéos YouTube]] |
| 28/10 | PR #58 (refonte et 1.2.0) fusionnée dans `staging` ; mise à jour auto vérifiée dès le lancement | [[Version 1.2.0]] |
| 25-28/10 | Connexion Google, Discord et code email à l'inscription (PR #61) | [[Connexion Google et Discord]] |
| 25/10 | Réseau en trois onglets, Packet Optimizer, Analyser mon PC, ping des jeux | [[Packet Optimizer]] |
| 22/10 | Retours sur la 1.2.0 : souris libre dans la barre, Lunar trouvé, logos, Network Optimizer, mode jeu renforcé, codes de partage | [[Version 1.2.0]] |
| 21/10 | Nouvelles optimisations de Sofiene intégrées (Hone, OptiCore, GAME V1, network_optimizer) | [[Catalogue des tweaks]] |
| 19/10 | Site : section Nouveautés 1.2 et boutons Discord (PR #59, brouillon jusqu'au 29/10) | [[Site]] |
| 18/10 | Étude du style CleanMyMac pour YouTube | [[Vidéos YouTube]] |
| 17/10 | App 1.2.0 commencée | [[Version 1.2.0]] |
| 16/10 | Refonte en verre et backlog Linear demandés | [[Refonte glass]] |
| 16/10 | **1.1.14 en prod** (PR #57) : base 1.1.10 + correctifs, 11 tweaks gratuits | [[Version 1.1.14]] |
| 16/10 | Offre Lifetime 59,99 $ et section Partners (PR #54, #55) | [[Offres et prix]] |
| 16/10 | Erreur WebView2 chez une cliente (solution donnée sans toucher à l'app) | [[Problèmes joueurs]] |
| 15/10 | 1.1.13 mise de côté, 1.1.10 = référence ; dossier de transfert rédigé ; nouveau projet Claude | [[Version 1.1.10]] |
| 14/10 | 1.1.11, 1.1.12 en prod puis non retenues ; accord RBW 230 $ | [[Versions 1.1.11 à 1.1.13]] |
| 13/10 | « ne crée plus rien pour l'app sans que je te le dise » ; fil unique des problèmes joueurs | [[Règles de travail]] |
| 11/10 | Staging d'abord, puis prod | [[Branches et environnements]] |
| 10/10 | **Lancement public 15:00 Paris** ; 1.1.9 ; 1.1.10 (remise à zéro auto) | [[Version 1.1.10]] |
| 09/10 | 1.1.8 (199 tweaks), avis et photos, Stripe en live, Linear créé | [[Historique des versions]] |
| 08/10 | Domaine OVH, `account.` sur Railway, emails | [[Personnes et services]] |
| 07/10 | Prix 5,99 $ / 29,99 $ ; versions 1.1.1 → 1.1.7 ; audit ligne par ligne des tweaks | [[Offres et prix]] |
| 04-06/10 | Démarrage : app Tauri tirée du `.bat`, site, serveur, charte | [[Charte graphique]] |
