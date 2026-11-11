---
type: version
tags: [version, app]
maj: 2026-11-11
version_app: 1.3.0
---
# Version 1.3.0

**Sur `staging`, pas sortie** : PR #70 fusionnée le 04/11, puis PR #76 (fusionnée le 10/11) pour en faire la grosse sortie avec Rago Route. Demandée par Sofiene le 04/11 ([[Décisions]]). Presque rien n'a été testé sur Windows (voir « Tests »). Voir [[État actuel]], [[Offres et prix]].

- Contient la 1.2.2 (commit `29123d4`) : preset Minecraft PvP sans `win_fullscreen` ni `ping_packets:hitreg` ([[Presets]], [[Problèmes joueurs]]), désinstallation des applis préinstallées gratuite ([[Page Outils]]). Pas de 1.2.2 seule : tout sort ensemble (Sofiene, 10/11, q47).
- **Plan gratuit** (confirmé par Sofiene le 10/11, q68) : 73 réglages ouverts (`app/src/data/free.json`), 30 actifs à la fois au plus (`slots`). L'app montre « N of 30 slots used » dans la barre latérale et une fenêtre Premium quand c'est plein ; le moteur Rust refuse aussi (`free_slots`).
- **Connexion à l'app avec Google ou Discord** par le navigateur et un code de 4 caractères ([[Connexion Google et Discord]]).
- **Essai Premium de 3 jours** avec carte, puis le **mensuel** débité automatiquement (q48), un par personne et par carte ([[Offres et prix]]). **Plus de remboursement** : l'essai le remplace (q36).
- **[[Analyse du PC]]** (page « Analyze my PC ») avec avant/après mesuré (son étape réseau envoie ses chiffres au serveur comme le [[Test réseau]], ce que dit la politique de confidentialité) ; **fenêtre Premium avec les prix** et **résiliation dans l'app** ([[Abonnement dans l'app]]), d'après la maquette « Fonctions gardées de la maquette de l'app » (04/11). Rappel 7 jours avant le renouvellement : pas fait.
- Serveur et site : la PR fusionne aussi la branche de prod dans `staging` (site de prod, connexion Google/Discord, code email, [[Bot communauté Discord]]) ; pages légales et durées de conservation à jour ([[Conformité juridique]]).
- **Ajouté par la PR #76 (10/11, décisions de Sofiene du jour)** : Rago Route dans tous les exe, badge « Beta » ([[Proxy]]) ; [[Packet Optimizer]] entièrement Premium ; essai toujours sur le mensuel ; plus de remboursement (site, CGV, e-mails, Stripe) ; normes réseau de l'[[Analyse du PC]] selon le ping et l'habitude du joueur ; Straight retiré, signature « KALISO and RAGO » ([[Personnes et services]]).
- **Pas dedans pour l'instant (11/11)** : les fonctions demandées par Sofiene le 11/11, chacune dans sa PR vers `staging`, pas fusionnée : #89 (jeu en priorité haute), #90 ([[Page Outils]] refaite), #91 (conseils au lancement du jeu). Une PR fusionnée dans `staging` avant la sortie part avec elle ; pour la page Outils : À DÉCIDER par Sofiene. Sortie prévue par Sofiene « demain voir apres demain MAX » (message du 11/11 à 01:17, heure de Paris).
- Histoire : ouverte le 01/11 comme 1.2.2 dans le fil « Sortir l'app 1.2.2 » (renommé « Lancer l'essai 3 jours et le gratuit élargi ») ; le 04/11 à 19:59 UTC, Sofiene : « on va ajouter directement la suite » ; fusionnée dans `staging` le 04/11 à 22:55 ; exe « Rago Optimizer Staging » à 23:06. Détails : [[Fil - Lancer l'essai 3 jours et le gratuit élargi]] et, pour Rago Route, [[Fil - Développer les proxys Minecraft]].
- Tests : 04/11 `npm run build` OK, 148 tests Rust OK (1 ignoré). 10/11 (PR #76) : `npm run build` OK, 96 tests serveur OK (3 ignorés), site régénéré ; tests Rust pas lancés (le conteneur de Claude n'a pas les bibliothèques GTK), la CI `app-windows` les fera. Rien testé sur Windows, sauf Rago Route : Sofiene l'a essayé avec l'exe de test de `staging` le 07/11 et le 09/11 (pertes simulées), et le diagnostic du partage USB du téléphone attend son test (exe du 10/11).
