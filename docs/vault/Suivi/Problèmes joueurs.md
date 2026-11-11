---
type: registre
tags: [support, suivi]
maj: 2026-11-10
---
# Problèmes joueurs

Retours de joueurs, du plus récent au plus ancien. Règle du 13/10 : un seul fil pour tous les problèmes joueurs, et tout noter dans [[Linear]]. Voir [[Bugs et incidents]].

Pour diagnostiquer : demander les logs `%APPDATA%\gg.rago.optimizer\logs` ([[App Windows]]) : `run-<ms>.log` (un par lot de réglages, [[runner.rs]]), `reset-<ms>.log` (remise à zéro, [[reset.rs]]) et `repairs.log` (réparations au lancement, [[repair.rs]]). Le plus simple : le rapport de support de l'app, données personnelles masquées ([[Partage et support]], [[report.rs]]). Les réponses au joueur se rédigent en anglais familier, avec la traduction pour Sofiene.

| Date | Joueur / version | Problème | Réponse |
|---|---|---|---|
| 10/11 | joueur, après la mise à jour | Steam télécharge à 15 Mbit/s au lieu de 200+ | cause : « Hitreg profile » en « Better hitreg » (auto-tuning TCP `HighlyRestricted`) avec « Packet optimization » Hitreg (fenêtre TCP 64 Ko) ; réponse : choisir « Best hitreg » ou « Default » et redémarrer, sinon couper « Packet optimization » ; « Best hitreg » par défaut dans la PR #86 ([[Historique des problèmes]]) |
| 03/11 | joueur, compte gratuit | boost du serveur sans Premium | son Discord avait déjà eu la récompense boost le 11/10 sur un autre compte Rago (une fois par compte Discord) ; détails dans [[Historique des problèmes]] |
| 03/11 | joueur | veut envoyer ses scripts `.bat` et un pack de scripts acheté, qui peuvent « avoir un effet très négatif sur le système » | ne rien exécuter, ne pas reprendre un pack payant, rien qui ressemble à de la triche ; Sofiene lui offre l'app ([[Historique des problèmes]]) |
| 03/11 | client | demande à Sofiene d'installer AnyDesk pour réparer son PC | conseil : partage d'écran Discord ; si AnyDesk, c'est le client qui donne son code, jamais d'accès sans surveillance |
| 02/11 | joueur RBW, 1.2.1 | ping de 65 à 220 ms et Minecraft qui crashe toutes les 2 min | logs : tweaks AMD et profil mémoire 16 Go appliqués sur un PC Intel/NVIDIA 8 Go (bug d'`availability()`, [[Bugs et incidents]]) ; « Undo all » puis redémarrer |
| 02/11 | joueur, 1.2.1 | clavier filaire qui ne répond plus après des tweaks | « Undo all » au clavier visuel puis redémarrer, sinon `rst_queue`, sinon point de restauration ; cause non confirmée (suspects `in_queue`, `kbm_thread`, `usb_msi`) |
| 02/11 | nouveau client, portable Intel Core Ultra | app jugée compliquée ; « Optimize and play » verrouillé | parcours gratuit en 3 étapes ; « Optimize and play » est Premium, utiliser « Play » |
| 29/10 | 1.2.1 | Hitreg meilleur, mais curseur invisible en plein écran et borderless après « Optimize and play » sur Minecraft ; ping plus instable | désactiver « Fullscreen optimizations » (recherche dans Rago) puis redémarrer ; dans le [[Packet Optimizer]], Latence un peu à droite et Réactivité un peu à gauche, ou profil stable |
| 19/10 | joueur, Windows 11 en anglais | app bloquée au lancement par Smart App Control (exe non signé) | désactiver Smart App Control ; plus de nouvelles du joueur, suivi arrêté le 01/11 (RAG-84 annulé, [[Bugs et incidents]]) |
| 19/10 | joueur | « aucune réponse du serveur » à la connexion dans l'app | `/healthz` répondait ; cause non trouvée |
| 18/10 | joueur | pourquoi un badge « redémarrage » sur certains réglages réseau | `TcpAckFrequency` et `TCPNoDelay` ne sont lus qu'au démarrage de Windows |
| 17/10 | joueur, 1.1.14 | `&` dans le chemin du dossier utilisateur | « all tweaks run correctly » : correctif de la 1.1.14 confirmé sur un vrai PC |
| 17/10 | joueuse, pas cliente | mauvais ping seulement sur Hypixel | réponse de Sofiene : un système de proxy est en travail, pas encore disponible (devenu Rago Route, [[Proxy]]) |
| 17/10 | joueur | micro-lags toutes les 30 s, délais dépassés | preset « Full network » (BUG-05) → préréglage 4 ; puis pics vers `8.8.8.8` : sa connexion Wi-Fi |
| 17/10 | client qui a boosté deux fois | n'arrive pas à lier son Discord | Discord bloquait tout le serveur de comptes depuis le 16/10 (« global rate limits ») ; débloqué le 17/10 ; ne pas redonner le Premium à la main |
| 17/10 | client | écran noir qui se ferme au lancement | plantage `0xc0000409` : WebView2 désinstallé par un guide de « debloat » ; réinstaller WebView2 |
| 16/10 | cliente, 1.1.14 | erreur WebView2 au lancement (« We couldn't create the data directory ») | compte Windows non administrateur : le passer en administrateur ; app non modifiée (fil « Erreur WebView2 chez une cliente », [[Fils du projet]]) |
| 15/10 | ami de Sofiene, 1.1.14 de test | preset Network en échec ; 4 tweaks non remis à la désinstallation | corrigé dans la [[Version 1.1.14]] |
| 15/10 | joueur, 1.1.10 | dossier utilisateur avec `&` : rien ne s'applique | corrigé en 1.1.14 |
| 14/10 | joueur (Lunar Client 1.8.9) | crashs aléatoires du jeu | log reçu sans le crash ; cause probable : vieux pilote NVIDIA (Quadro K2000) et mémoire ; logs du crash demandés ; plus de nouvelles, suivi arrêté le 01/11 (RAG-76 annulé) |
| 13/10 | joueurs RBW | services laissés arrêtés par le [[RBW Mod]] | corrigé en 1.1.14 |
| 12/10 | joueur | écran bleu 0x7E (Windows 11 24H2) | corrigé en 1.1.14 |
| 11/10 | client | logs Game Mode | réponse sans changer l'app |
