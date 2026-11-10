---
type: registre
tags: [support, suivi]
maj: 2026-11-10
---
# Problèmes joueurs

Retours de joueurs, du plus récent au plus ancien. Règle du 13/10 : un seul fil pour tous les problèmes joueurs, et tout noter dans [[Linear]]. Voir [[Bugs et incidents]].

Pour diagnostiquer : demander les logs `%APPDATA%\gg.rago.optimizer\logs` ([[App Windows]]). Les réponses au joueur se rédigent en anglais familier, avec la traduction pour Sofiene.

| Date | Joueur / version | Problème | Réponse |
|---|---|---|---|
| 03/11 | joueur, compte gratuit | boost du serveur sans Premium | son Discord avait déjà eu la récompense boost le 11/10 sur un autre compte Rago (une fois par compte Discord) ; détails dans [[Historique des problèmes]] |
| 02/11 | joueur RBW, 1.2.1 | ping de 65 à 220 ms et Minecraft qui crashe toutes les 2 min | logs : tweaks AMD et profil mémoire 16 Go appliqués sur un PC Intel/NVIDIA 8 Go (bug d'`availability()`, [[Bugs et incidents]]) ; « Undo all » puis redémarrer |
| 02/11 | joueur, 1.2.1 | clavier filaire qui ne répond plus après des tweaks | « Undo all » au clavier visuel puis redémarrer, sinon `rst_queue`, sinon point de restauration ; cause non confirmée (suspects `in_queue`, `kbm_thread`, `usb_msi`) |
| 02/11 | nouveau client, portable Intel Core Ultra | app jugée compliquée ; « Optimize and play » verrouillé | parcours gratuit en 3 étapes ; « Optimize and play » est Premium, utiliser « Play » |
| 29/10 | 1.2.1 | Hitreg meilleur, mais curseur invisible en plein écran et borderless après « Optimize and play » sur Minecraft ; ping plus instable | désactiver « Fullscreen optimizations » (recherche dans Rago) puis redémarrer ; dans le [[Packet Optimizer]], Latence un peu à droite et Réactivité un peu à gauche, ou profil stable |
| 19/10 | joueur, Windows 11 en anglais | app bloquée au lancement par Smart App Control (exe non signé) | désactiver Smart App Control ; plus de nouvelles du joueur, suivi arrêté le 01/11 (RAG-84 annulé, [[Bugs et incidents]]) |
| 16/10 | cliente, 1.1.14 | erreur WebView2 au lancement | solution et cause expliquées, app non modifiée (fil « Erreur WebView2 chez une cliente ») |
| 15/10 | ami de Sofiene, 1.1.14 de test | preset Network en échec ; 4 tweaks non remis à la désinstallation | corrigé dans la [[Version 1.1.14]] |
| 15/10 | joueur, 1.1.10 | dossier utilisateur avec `&` : rien ne s'applique | corrigé en 1.1.14 |
| 14/10 | joueur (Lunar Client 1.8.9) | crashs aléatoires du jeu | log reçu sans le crash ; cause probable : vieux pilote NVIDIA (Quadro K2000) et mémoire ; logs du crash demandés ; plus de nouvelles, suivi arrêté le 01/11 (RAG-76 annulé) |
| 13/10 | joueurs RBW | services laissés arrêtés par le [[RBW Mod]] | corrigé en 1.1.14 |
| 12/10 | joueur | écran bleu 0x7E (Windows 11 24H2) | corrigé en 1.1.14 |
| 11/10 | client | logs Game Mode | réponse sans changer l'app |
