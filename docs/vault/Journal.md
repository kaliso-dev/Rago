---
type: pilotage
tags: [journal, chronologie]
maj: 2026-11-11
---
# Journal

Une ligne par événement marquant, la plus récente en haut. Voir [[Historique des versions]] et [[Décisions]].

## Novembre 2026
| Date | Événement | Liens |
|---|---|---|
| 11/11 | [[Couleurs et résolution]] codée à la demande de Sofiene, après une analyse du marché (VibranceGUI ; réglages des pros sur prosettings.net, specs.gg et csdb.gg) : saturation, luminosité et résolution par jeu, posées seulement pendant la partie ; 22 presets de pros Valorant, CS2 et Fortnite, import réservé au Premium (carte du 11/11). Commit sur la branche `claude/project-thread-7n0ikn`, pas encore envoyé sur GitHub (accord demandé à Sofiene) ; jamais testé sur Windows ; ticket RAG-95 | [[Couleurs et résolution]], [[Décisions]] |
| 11/11 | Sofiene demande six nouveautés pour l'optimizer, à ajouter après la sortie prévue le 12 ou le 13/11 (Free Slot, retours clients, connexion Google et Discord, Analyse du PC avec avant/après, nouveaux proxys) : saturation et résolution des pros, **graphismes par jeu façon OptiFine**, conseils au lancement du jeu, priorité maximale, page Outils centralisée ; un fil par sujet. [[Graphismes des jeux]] codés le jour même sur la branche `claude/project-thread-5ln7f8` (6 jeux, 12 tests), envoyés vers `staging` par la PR #94 sur la demande de Sofiene (version test) ; ticket RAG-92, question q94 (gratuit ou Premium) | [[Graphismes des jeux]], [[Bibliothèque de jeux]] |
| 10/11 | Version publique du [[Cerveau du vault]] construite pour le cousin de Sofiene : kit sans design Rago (thème clair et sombre), site statique pour GitHub Pages, `INSTALLER.md` pour que son Claude crée le dépôt et le vault, vault d'exemple qui sert de guide ; nommé **Synapse** par Sofiene, poussé dans le dépôt public `kaliso-dev/Synapse` | [[Cerveau du vault]] |
| 10/11 | [[Tableau de bord admin]] et [[Cerveau du vault]] **en prod** (PR #87, portage depuis une branche partie de la prod), sur « il faut le push sur la prod maintenant et qu'il soit fonctionnel normalement […] j'ai ajouté une page cerveau il faut push avec » ; rien de la 1.3.0 n'est parti ; l'ancienne page `/admin` n'existe plus | [[Tableau de bord admin]], [[Branches et environnements]] |
| 10/11 | Admin, ventes en € et en $US mal affichées sur staging (capture de Sofiene : « 420,00 € + 122,95… », barre « Par type » fausse) : chaque paiement converti par Stripe compte pour son montant en €, comme dans Stripe ; PR #84 fusionnée dans `staging` le 10/11 (demande de Sofiene de tout mettre en prod) | [[Tableau de bord admin]] |
| 10/11 | [[Cerveau du vault]] codé à la demande de Sofiene : `/admin/cerveau`, le vault en graphe animé façon Obsidian (impulsions sur les liens, graphe local, recherche), lecteur de notes et de n'importe quel fichier du dépôt ; derrière la clé admin, qu'Abel utilise aussi (choix de Sofiene). Lit `staging` sur GitHub ; PR #85 fusionnée dans `staging` sur « fusionne » de Sofiene | [[Cerveau du vault]], [[Tableau de bord admin]] |
| 10/11 | Vault détaillé « dans les moindres détails » (demande de Sofiene) : une fiche par fichier de code relue dans `staging` (230 notes dans `Code/` : app Rust, interface, générateur du catalogue, serveur et base de données, site, Rago Route, CI), écarts corrigés dans les fiches (plan gratuit, Rago Route dans tous les exe, Analyse du PC qui envoie le résultat réseau…), notes `Tweaks/` régénérées pour la 1.3.0 (le catalogue de l'app, lui, se régénère à l'identique), correction Supabase de la branche `tzbch5` reprise ; 24 questions posées (q70 à q93) | [[Reprendre le développement]], [[Questions ouvertes]] |
| 10/11 | Admin, retours de Sofiene sur staging : plus aucun trou dans la mise en page (colonnes qui finissent ensemble, graphiques des ventes côte à côte, fiche joueur rééquilibrée, éditeur de la pop-up avec aperçu), contrôles Stripe seulement dans Services (retirés de « Site et promos ») ; PR #83 fusionnée dans `staging` le 10/11 sur « fusionne » de Sofiene | [[Tableau de bord admin]] |
| 10/11 | Histoire du projet écrite dans le vault : [[Chronologie du projet]] (semaine par semaine), [[Pull requests]] (les 84 PR), [[Fils du projet]] (les 28 fils) et 6 notes de fil détaillées | [[Fils du projet]] |
| 10/11 | PR #78 (CI : un push ne construit plus que `staging`) fusionnée dans `staging`, puis le seul correctif CI porté en prod (PR #81) à la demande de Sofiene (« il faut en prod […] j'espère que tu ne push pas la version en cours de dev de l'app ») ; constat : `staging` a environ 160 commits de plus que la prod, et le code de l'app sur la branche de prod est encore la 1.1.14 (les exe sont construits depuis `staging`) | [[CI GitHub Actions]], [[Branches et environnements]] |
| 10/11 | E-mail Supabase du 04/11 relu : ce n'est **pas une suppression** mais un dépassement du quota gratuit de bande passante (plus de 5,5 Go), avec des restrictions possibles après le 05/12. Guide envoyé à Sofiene pour sauvegarder ses clés. Sofiene : « je passerai en pro avant décembre ou alors on migrera de supabase vers un autre service je te tiendrai au courant avant le 5 décembre ». (Écrit d'abord sur la branche `claude/project-thread-tzbch5`, jamais fusionnée) | [[Supabase]], [[Clés et secrets]] |
| 10/11 | Interface du tableau de bord `/admin` refaite à la demande de Sofiene (« comme si ça devait etre commercialisé ») : menu fixe et tiroir sur téléphone, cartes et graphiques (30 jours, 12 mois), « À traiter », recherche `/`, confirmations, export CSV des joueurs, bandeau « Stripe en mode test » sur staging ; ventes et services relus en arrière-plan pour ne plus attendre Stripe ; PR #82 fusionnée dans `staging` sur « fusionne et push sur staging » de Sofiene | [[Tableau de bord admin]] |
| 10/11 | Nouvelle note d'archive [[Historique des problèmes]] (demande de Sofiene) : tous les problèmes rencontrés, avec cause et solution, pour déboguer plus tard ; ajout du bug d'`availability()` (tweaks AMD appliqués sur un PC Intel) | [[Bugs et incidents]] |
| 10/11 | Tableau de bord `/admin` complet demandé par Sofiene et codé : joueurs et accès (dont bannissement), ventes Stripe du jour, du mois et totales, état des services, journal ; PR #77 fusionnée dans `staging` sur « fusionne » de Sofiene | [[Tableau de bord admin]] |
| 10/11 | Étude des minutes GitHub Actions : `rago` est public (minutes gratuites) ; le quota est vidé par la CI de `network-server-rago` (151 runs en deux jours) ; Sofiene décide de rendre ce dépôt public, pas GitLab | [[CI GitHub Actions]] |
| 10/11 | q46 : l'adresse des mentions légales sera une domiciliation, prise plus tard ; il ne reste que q65 (réglages Railway, à vérifier avec Sofiene) | [[Conformité juridique]] |
| 10/11 | PR #76 fusionnée dans `staging` (« tu peux tout push ») ; plan gratuit confirmé à 73 réglages dont 30 actifs (q68). | [[Version 1.3.0]] |
| 10/11 | PR #76 ouverte vers `staging` : la 1.3.0 devient la grosse sortie avec Rago Route (onglet dans tous les exe), Packet Optimizer entièrement Premium, essai sur le mensuel, plus de remboursement (`refunds.html` supprimée, CGV), normes de l'Analyse du PC par joueur, Straight retiré et signature « KALISO and RAGO » ; « 30 opti 15 slots » attend q68 | [[Version 1.3.0]], [[Proxy]], [[Offres et prix]] |
| 10/11 | Vault technique complété pour qu'un nouveau Claude puisse développer sans contexte : porte d'entrée [[Reprendre le développement]], fiches [[Architecture de l'app]], [[Architecture du serveur]], [[API du serveur]], [[Paiements Stripe]], [[Supabase]], [[Railway]], [[Netlify]], [[CI GitHub Actions]], [[Variables d'environnement]], [[Infrastructure Rago Route]], [[Développer et tester]] ; un `CLAUDE.md` court dans `app/`, `licensing/`, `site/` et `proxy/` | [[Reprendre le développement]] |
| 10/11 | Sofiene répond aux questions q36 à q67 ([[Décisions]]) : une seule grosse sortie avec Rago Route, pas de remboursement, Packet Optimizer en Premium, mensuel après l'essai, sa mère vendeuse ; Supabase de prod au-delà de son quota gratuit (restrictions possibles après le 05/12, voir la ligne sur l'e-mail relu) et aucune clé sauvegardée ; anciens dossiers du dossier partagé supprimés | [[État actuel]], [[Supabase]], [[Clés et secrets]] |
| 10/11 | Point du projet : la page « Questions du vault Rago » montre en haut l'état du projet et la recommandation d'organisation (un seul projet Claude, un fil par tâche, une fiche technique par brique, CLAUDE.md par dossier du code), et range les questions par sujet ; 9 nouvelles questions (q56 à q64). LinkedIn automatisé arrêté à la demande de Sofiene (fil « Créer le profil LinkedIn de Sofiene ») | [[Questions ouvertes]], [[Mettre à jour le vault]] |
| 10/11 | Rago Route : l'iPhone en USB n'est pas vu par le PC de Sofiene ; l'onglet propose maintenant n'importe quelle 2e connexion (dont le partage en Wi-Fi), prend le téléphone tout seul, montre un diagnostic étape par étape quand il ne partage pas encore, et reconnaît le partage par Bluetooth ; sur `staging` le 10/11 pour l'exe de test (« fait un exe de test pour tout ça ») | [[Proxy]] |
| 09/11 | [[Rago OS]] test5 : appli Horloge (alarmes, minuteur, chronomètre, villes), widget Rago Route, Rago Notes, Météo et Horloge dans la Recherche, « Jeu sur tout l'écran », widgets cachés en jeu, touche Windows fiable après une relance, animations du Dock réglables, Météo et boutons de Rago Notes moins « Apple », widgets revus. Côté app, PR #74 fusionnée dans `staging` (commandes `tweaks`, `tweak` et Rago Route du pont, Rago OS jamais pris pour un jeu) | [[Rago OS]], [[Proxy]] |
| 09/11 | Rago Route sur Windows testé par Sofiene avec pertes simulées (clumsy) : paquets sauvés et réparés comptés, pas de différence ressentie à 5 % de pertes, nette différence à 25 % | [[Proxy]] |
| 09/11 | Serveurs Rago Route de Paris (sortie) et de Frankfurt (relais) réinstallés en protocole 2, fermés à tout sans jeton Premium ; Hypixel coupe les connexions venant de Frankfurt (sans gravité, c'est un relais) ; ancien proxy simple arrêté | [[Proxy]], [[Infrastructure Rago Route]] |
| 09/11 | La vérification du site (site-check) échoue : GitHub est passé à Ubuntu 26.04, que Playwright 1.56.1 ne gère pas ; corrigé le 10/11 en fixant Ubuntu 24.04 (PR #75) | [[CI GitHub Actions]] |
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
| 07/11 | Test de coupure du Wi-Fi (~30 s, 14 h 05) : la partie tient, la 4G prend tout, mais monte à 1,2–1,5 s : mauvaise réception 4G à l'endroit du test (réponse de Sofiene) | [[Proxy]] |
| 07/11 | Partie de 10 min avec Wi-Fi + Frankfurt + 4G de l'iPhone : `--telephone` marche sur le vrai Mac ; tunnel 107–125 ms contre 116–137 ms en direct ; 4G jamais utile (Wi-Fi parfait), ≈ 67 Mo/h reçus | [[Proxy]] |
| 07/11 | Rago Route : option `--telephone` (Mac) qui prépare et vérifie seule le trajet 4G de l'iPhone, à la demande de Sofiene ; testée par simulation, pas encore sur son Mac | [[Proxy]] |
| 07/11 | Essai d'1 min à 06 h 51 en câble seul (Wi-Fi coupé) : tunnel 108–109 ms contre 115 ms en direct, 0 perte ; trajet direct 11–14 ms comme à 06 h 27 ; le programme se fige encore jusqu'à 99 ms : les pics viennent du Mac, pas du Wi-Fi | [[Proxy]] |
| 07/11 | Essai de 2 min à 06 h 27 avec un câble RJ45 branché au Mac (interface réellement utilisée À VÉRIFIER, le Wi-Fi restait allumé) : au même moment, tunnel 105–110 ms contre 113–115 ms en direct ; 0 perte, trajet direct premier à 99 % ; pics restants = programme figé sur le Mac (jusqu'à 191 ms) | [[Proxy]] |
| 07/11 | Site : page `route.html` « Rago Route » entièrement animée + section et liens sur l'accueil, poussée sur `staging` (Sofiene : « tu peux push sur staging les modif du site ») | [[Site]] |
| 07/11 | Partie avec la version du 07/11 : tunnel médiane 116 ms contre 119 ms en direct ; aucune perte, pics venant du premier tronçon (Wi-Fi ou Mac) ; ajout de « arrivé premier » et des Mo reçus par trajet pour tester la 4G | [[Proxy]] |
| 07/11 | Rago Route, version du 07/11 : renvois inutiles supprimés, reprise en 10 à 20 ms après une coupure, retard du programme mesuré aussi sur la sortie ; testée en local | [[Proxy]] |
| 07/11 | Partie normale par Rago Route (Wi-Fi) : au même moment, tunnel 111–115 ms contre 116–118 ms en direct ; pics dus en partie au programme Python qui se fige sur le Mac | [[Proxy]] |
| 06/11 | Vraie partie de Bedwars par le tunnel : tenue sans déconnexion ni lag ressenti, mais ping de la touche Tab à 178 ms contre 129 ms en direct ; test avec 30 % de pertes simulées : 0 % à l'arrivée, 2 246 paquets sauvés en 2 minutes | [[Proxy]] |
| 06/11 | Premier test réel de Rago Route depuis le Mac de Sofiene : 114,8 ms par le tunnel (sortie Paris) contre 120,1 ms en direct | [[Proxy]] |
| 06/11 | Prototype Rago Route écrit (`proxy/rago-route.py`) et testé en local ; test réel prévu avec une sortie à Paris | [[Proxy]] |
| 05/11 | Test de Sofiene depuis la France : direct 104,8 ms, Chicago 112, New York 111, Frankfurt 127 | [[Proxy]] |
| 05/11 | Proxys New York et Chicago installés ; Chicago → Hypixel 4,8 ms (Hypixel est à Chicago) | [[Proxy]] |
| 05/11 | Proxys Vultr Frankfurt et Mumbai installés et en marche ; Frankfurt → Hypixel 99,6 ms, Mumbai → Hypixel 239 ms | [[Proxy]] |
| 05/11 | Proxy : OVHcloud écarté (pas de VPS en Europe), Vultr retenu ; relais Minecraft, ping et script d'installation écrits (`proxy/`) ; document refait pour OVHcloud | [[Proxy]] |
| 04/11 | Proxy relancé par Sofiene ; analyse des tests réseau et recommandation d'achat chiffrée (Vultr) | [[Proxy]] |
| 04/11 | Ajoutés à la 1.3.0 (PR #70) : Analyse du PC avec avant/après, fenêtre Premium avec les prix, résiliation dans l'app | [[Analyse du PC]], [[Abonnement dans l'app]] |
| 04/11 | Sofiene abandonne la nouvelle charte graphique et les maquettes de l'app (« on abandonne ce projet ») ; PR #69 fermée ; seules 4 fonctions de la maquette sont gardées (voir [[Décisions]]) | [[Fil - Lister les fonctionnalités de la maquette]] |
| 04/11 | PR #70 passe en 1.3.0 : 73 réglages gratuits (30 actifs), connexion à l'app avec Google/Discord, essai de 3 jours, site et pages légales à jour, fusion prod → staging | [[Version 1.3.0]], [[Conformité juridique]] |
| 04/11 | PR #72 (état des lieux Stripe) fusionnée sur « fusionne » | [[Ventes Stripe]] |
| 04/11 | Stripe connecté à Claude : premier état des lieux des ventes (611,02 $, 33 abonnés, 5 Lifetime) ; prix Stripe conformes au vault | [[Ventes Stripe]] |
| 03/11 | Maquettes de l'app v2 à v4 et charte 4.0 (abandonnées le 04/11, voir [[Décisions]]) ; étude de 84 applis concurrentes ou proches, gardée | [[Étude de marché de novembre 2026]] |
| 02/11 | Logs d'un joueur RBW (ping et crashs) : bug d'`availability()` trouvé, des tweaks AMD et le profil 16 Go appliqués sur un PC Intel de 8 Go ; pas corrigé | [[Bugs et incidents]], [[Historique des problèmes]] |
| 02/11 | Vidéo TikTok « Création d'Adam » refaite avec le R de Rago en 4K | [[Logo création d'Adam]] |
| 01/11 | PR #68 (mises à jour du vault du 31/10 et du 01/11) fusionnée sur « fusionne » | [[Mettre à jour le vault]] |
| 01/11 | Dernières réponses de Sofiene : acerSHOCK = Abel ; RAG-16, RAG-21 abandonnés ; RAG-76, RAG-84 arrêtés faute de nouvelles des joueurs | [[Linear]], [[Problèmes joueurs]] |
| 01/11 | Anciennes PR #16, #50, #51, #60 fermées ; [[Linear]] remis à jour (RAG-86 à RAG-91) ; fils « Sortir l'app 1.2.2 » et « Passer le bot Discord en prod » ouverts | [[Prochaines étapes]] |
| 01/11 | PR #69 (brouillon) : charte « Affiche » v2.2 sur la page d'accueil, pour décider de l'adopter ; abandonnée le 04/11 (voir [[Décisions]]) | [[Charte graphique]] |
| 01/11 | Sofiene répond aux questions du vault sur la page « Questions du vault Rago » ; vault mis à jour | [[Décisions]], [[Questions ouvertes]] |

## Octobre 2026
| Date | Événement | Liens |
|---|---|---|
| 31/10 | 1.2.1 en ligne (exe et `.sig` déposés par Sofiene) ; Lifetime 59,99 $ confirmé | [[Version 1.2.1]] |
| 31/10 | Création de ce vault Obsidian dans `docs/vault/` | [[Mettre à jour le vault]] |
| 31/10 | Premier Rago OS (PR #60) abandonné (voir [[Décisions]]) ; page « Questions du vault Rago » créée ; début d'une nouvelle charte graphique (abandonnée le 04/11) | [[Fils du projet]] |
| 29/10 | Retour joueur : hitreg meilleur, mais curseur perdu en plein écran et ping instable | [[Problèmes joueurs]] |
| 29/10 | Site mis à jour pour la 1.2.1, plans de prix réécrits (PR #66) ; section « New in 1.2 » (PR #59) | [[Site]] |
| 29/10 | Serveur de prod : mises à jour auto + collecte des tests réseau (PR #63) ; exe 1.2.1 de prod signé ; 1.2.1 fusionnée dans `staging` (PR #64, #65) | [[Version 1.2.1]], [[Proxy]] |
| 29/10 | Mise à jour vérifiée dès le lancement (PR #62) ; carte « Automatique » : chaque test réseau est envoyé au serveur sans demander, avec une ligne dans la politique de confidentialité | [[Mise à jour automatique]], [[Test réseau]] |
| 29/10 | Annonces Discord 1.2 rédigées (FR, EN) ; script YouTube « What's new » écrit | [[Discord]], [[Vidéos YouTube]] |
| 28/10 | PR #58 (refonte et 1.2.0) fusionnée dans `staging` ; mise à jour auto vérifiée dès le lancement | [[Version 1.2.0]] |
| 28/10 | Signature des mises à jour réparée (secret collé avec un retour à la ligne, clé publique avec un `%` en trop) ; test de mise à jour raté sur staging (déploiement Railway sauté, `PUBLIC_URL` de staging égal à la prod, adresse sans `https://`), corrigé | [[Mise à jour automatique]], [[Railway]] |
| 27/10 | Un utilisateur trouve que la section Packet Optimizer ressemble à une autre appli (« Ghast ») : réglages renommés et section redessinée | [[Packet Optimizer]] |
| 25-28/10 | Connexion Google, Discord et code email à l'inscription (PR #61) | [[Connexion Google et Discord]] |
| 25/10 | Réseau en trois onglets, Packet Optimizer, Analyser mon PC, ping des jeux | [[Packet Optimizer]] |
| 22/10 | Retours sur la 1.2.0 : souris libre dans la barre, Lunar trouvé, logos, Network Optimizer, mode jeu renforcé, codes de partage | [[Version 1.2.0]] |
| 22/10 | Sofiene passe le dépôt `rago` en public pour que la CI compile gratuitement ; Railway bloque les déploiements (cyberattaque) puis repart le soir ; code de partage `RAGO2_` et raccourci Alt+X | [[CI GitHub Actions]], [[Presets]] |
| 21/10 | Nouvelles optimisations de Sofiene intégrées (Hone, OptiCore, GAME V1, network_optimizer) | [[Catalogue des tweaks]] |
| 21/10 | Premier Rago OS codé (PR #60) et testé par Sofiene, abandonné le 31/10 (voir [[Décisions]]) ; minutes GitHub Actions épuisées, l'exe est compilé dans le conteneur de Claude | [[CI GitHub Actions]] |
| 19/10 | Site : section Nouveautés 1.2 et boutons Discord (PR #59, brouillon jusqu'au 29/10) | [[Site]] |
| 19/10 | Vidéo de style CleanMyMac v1 à v3 ; un film publicitaire 4K procédural est abandonné le jour même (« c'est horrible ») | [[Vidéos YouTube]] |
| 18/10 | Étude du style CleanMyMac pour YouTube | [[Vidéos YouTube]] |
| 17/10 | App 1.2.0 commencée | [[Version 1.2.0]] |
| 17/10 | Discord bloquait tout le serveur de comptes depuis le 16/10 (« global rate limits » : 14 liaisons ratées, 25 rôles Pro pas donnés), débloqué vers 11:30 UTC ; le code de la pop-up promo n'existait qu'en mode test Stripe ; un client avait désinstallé WebView2 | [[Historique des problèmes]], [[Discord]] |
| 16/10 | Refonte en verre et backlog Linear demandés | [[Refonte glass]] |
| 16/10 | **1.1.14 en prod** (PR #57) : base 1.1.10 + correctifs, 11 tweaks gratuits | [[Version 1.1.14]] |
| 16/10 | Offre Lifetime 59,99 $ et section Partners (PR #54, #55) | [[Offres et prix]] |
| 16/10 | Erreur WebView2 chez une cliente (solution donnée sans toucher à l'app) | [[Problèmes joueurs]] |
| 15/10 | PR #52 (1.1.14 refaite sur la 1.1.10) et PR #40 (bot communauté Discord) fusionnées dans `staging` | [[Version 1.1.14]], [[Bot communauté Discord]] |
| 15/10 | 1.1.13 mise de côté, 1.1.10 = référence ; dossier de transfert rédigé ; nouveau projet Claude | [[Version 1.1.10]] |
| 14/10 | 1.1.11, 1.1.12 en prod puis non retenues ; accord RBW 230 $ | [[Versions 1.1.11 à 1.1.13]] |
| 13/10 | « ne crée plus rien pour l'app sans que je te le dise » ; fil unique des problèmes joueurs | [[Règles de travail]] |
| 11/10 | Staging d'abord, puis prod | [[Branches et environnements]] |
| 10/10 | **Lancement public 15:00 Paris** ; 1.1.9 ; 1.1.10 (remise à zéro auto) | [[Version 1.1.10]] |
| 09/10 | 1.1.8 (199 tweaks), avis et photos, Stripe en live, Linear créé | [[Historique des versions]] |
| 08/10 | Domaine OVH, `account.` sur Railway, emails | [[Personnes et services]] |
| 07/10 | Prix 5,99 $ / 29,99 $ ; versions 1.1.1 → 1.1.7 ; audit ligne par ligne des tweaks | [[Offres et prix]] |
| 04-06/10 | Démarrage : app Tauri tirée du `.bat`, site, serveur, charte | [[Charte graphique]] |
