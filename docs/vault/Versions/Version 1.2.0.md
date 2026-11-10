---
type: version
tags: [version]
version: 1.2.0
maj: 2026-11-10
---
# Version 1.2.0

Développée du 17 au 28/10 sur `claude/app-redesign-glass-z5m1c8` (PR #58, fusionnée dans `staging` le 28/10). Doit rester **identique à la 1.1.14 pour les optimisations existantes** ([[Décisions]] du 16/10). Suite : [[Version 1.2.1]]. Voir [[Historique des versions]].

## Nouveautés
- [[Refonte glass]] de toute l'interface.
- [[Barre en jeu]] (Alt+X), FPS par PresentMon, ping des jeux.
- [[Test réseau]] et [[Packet Optimizer]] (onglet Réseau en trois sous-onglets, « Analyser mon PC »).
- [[Bibliothèque de jeux]] et launchers, « Optimize and play ».
- [[Presets]] enrichis + 15 presets par jeu ; partage par code `RAGO2_` ou fichier `.rago`.
- [[Page Outils]] : nettoyage, applis préinstallées (Premium), pilotes, Clean RAM.
- État des services sous [[RBW Mod]].
- [[Mode jeu]] renforcé.
- Bouton « Appliquer les optimisations gratuites », lien « Rejoindre le Discord », animation du logo au lancement, démarrage avec Windows activé d'office (icône près de l'horloge).
- **20 nouveaux tweaks** (Hone, OptiCore, GAME V1, network_optimizer) : 19 le 21/10 ([[optis_120.py]]) et `win_bgdownloads` le 22/10, dont une section « Interface et confort » : **218 tweaks** au total. Voir [[Catalogue des tweaks]].
- [[Mise à jour automatique]] (RAG-24).

## Histoire
Racontée en détail dans [[Fil - Nouvelle version backlog et refonte]] : demande du 16/10 (« plus s'inspirer d'apple et rajouter beaucoup d'effet glassy […] les optimisations doivent rester intact »), PR #58 ouverte le 16/10 en CSS seulement, plan validé le 17/10, 12 demandes de Sofiene le 21/10, nouvelles optimisations (366 fichiers) le 21/10, tests de Sofiene du 22 au 27/10 (code `RAGO2_`, Alt+X au lieu de Ctrl+Maj+R, renommages après la ressemblance avec « Ghast »), dépôt passé public le 22/10 pour compiler, fusion dans `staging` le 28/10, signature réparée le 28/10, vérification de mise à jour au lancement (PR #62) le 29/10.

## Tests
Liste complète : `refonte-glass/TESTS-1.2.0.md` du dossier partagé ([[Sources]]). Beaucoup de points marqués « jamais testé sur Windows » au 28/10. Résultats des tests de Sofiene : « tout fonctionne » le 29/10 (avant la mise en prod).

Documents de préparation de cette version (backlog, maquette, plans) : [[Documents de la 1.2.0]].
