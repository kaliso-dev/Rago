---
type: version
tags: [version, app]
maj: 2026-11-10
version_app: 1.3.0
---
# Version 1.3.0

**Sur `staging`, pas sortie** : PR #70 fusionnée le 04/11, puis PR #PRNUM (10/11, ouverte) pour en faire la grosse sortie avec Rago Route. Demandée par Sofiene le 04/11 ([[Décisions]]). Rien n'a été testé sur Windows. Voir [[État actuel]], [[Offres et prix]].

- Contient la 1.2.2 (commit `29123d4`) : preset Minecraft PvP sans `win_fullscreen` ni `ping_packets:hitreg` ([[Presets]], [[Problèmes joueurs]]), désinstallation des applis préinstallées gratuite ([[Page Outils]]). Pas de 1.2.2 seule : tout sort ensemble (Sofiene, 10/11, q47).
- **Plan gratuit** (en attente de q68, « 30 opti 15 slots ») : 73 réglages ouverts (`app/src/data/free.json`), 30 actifs à la fois au plus (`slots`). L'app montre « N of 30 slots used » dans la barre latérale et une fenêtre Premium quand c'est plein ; le moteur Rust refuse aussi (`free_slots`).
- **Connexion à l'app avec Google ou Discord** par le navigateur et un code de 4 caractères ([[Connexion Google et Discord]]).
- **Essai Premium de 3 jours** avec carte, puis le **mensuel** débité automatiquement (q48), un par personne et par carte ([[Offres et prix]]). **Plus de remboursement** : l'essai le remplace (q36).
- **[[Analyse du PC]]** (page « Analyze my PC ») avec avant/après mesuré ; **fenêtre Premium avec les prix** et **résiliation dans l'app** ([[Abonnement dans l'app]]), d'après la maquette « Fonctions gardées de la maquette de l'app » (04/11). Rappel 7 jours avant le renouvellement : pas fait.
- Serveur et site : la PR fusionne aussi la branche de prod dans `staging` (site de prod, connexion Google/Discord, code email, [[Bot communauté Discord]]) ; pages légales et durées de conservation à jour ([[Conformité juridique]]).
- **Ajouté par la PR #PRNUM (10/11, décisions de Sofiene du jour)** : Rago Route dans tous les exe, badge « Beta » ([[Proxy]]) ; [[Packet Optimizer]] entièrement Premium ; essai toujours sur le mensuel ; plus de remboursement (site, CGV, e-mails, Stripe) ; normes réseau de l'[[Analyse du PC]] selon le ping et l'habitude du joueur ; Straight retiré, signature « KALISO and RAGO » ([[Personnes et services]]).
- Tests : 04/11 `npm run build` OK, 148 tests Rust OK (1 ignoré). 10/11 (PR #PRNUM) : `npm run build` OK, 96 tests serveur OK (3 ignorés), site régénéré ; tests Rust pas lancés (le conteneur de Claude n'a pas les bibliothèques GTK), la CI `app-windows` les fera. Rien testé sur Windows.
