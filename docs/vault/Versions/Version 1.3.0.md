---
type: version
tags: [version, app]
maj: 2026-11-04
version_app: 1.3.0
---
# Version 1.3.0

**PR #70 vers `staging`, pas fusionnée, pas sortie** (04/11). Demandée par Sofiene le 04/11 ([[Décisions]]). Rien n'a été testé sur Windows. Voir [[État actuel]], [[Offres et prix]].

- Contient la 1.2.2 (commit `29123d4`) : preset Minecraft PvP sans `win_fullscreen` ni `ping_packets:hitreg` ([[Presets]], [[Problèmes joueurs]]), désinstallation des applis préinstallées gratuite ([[Page Outils]]). Sortir la 1.2.2 seule ou avec la 1.3.0 : q47.
- **Plan gratuit** : 73 réglages ouverts (`app/src/data/free.json`), 30 actifs à la fois au plus (`slots`). L'app montre « N of 30 slots used » dans la barre latérale et une fenêtre Premium quand c'est plein ; le moteur Rust refuse aussi (`free_slots`).
- **Connexion à l'app avec Google ou Discord** par le navigateur et un code de 4 caractères ([[Connexion Google et Discord]]).
- **Essai Premium de 3 jours** avec carte, débité automatiquement à la fin, un par personne et par carte ([[Offres et prix]]).
- **[[Analyse du PC]]** (page « Analyze my PC ») avec avant/après mesuré ; **fenêtre Premium avec les prix** et **résiliation dans l'app** ([[Abonnement dans l'app]]), d'après la maquette « Fonctions gardées de la maquette de l'app » (04/11). Rappel 7 jours, remboursement 14 jours, parrainage et variante Packet Optimizer attendent q36, q39, q40, q41.
- Serveur et site : la PR fusionne aussi la branche de prod dans `staging` (site de prod, connexion Google/Discord, code email, [[Bot communauté Discord]]) ; pages légales et durées de conservation à jour ([[Conformité juridique]]).
- Tests (04/11) : `npm run build` OK, 148 tests Rust OK (1 ignoré), serveur : voir la PR #70.
