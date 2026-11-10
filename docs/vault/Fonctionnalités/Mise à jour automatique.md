---
type: fonctionnalité
tags: [fonctionnalité, app, serveur, 1.2]
version_app: 1.3.0
maj: 2026-11-10
---
# Mise à jour automatique

Linear RAG-24. Arrivée en [[Version 1.2.0]] ; serveur en prod le 29/10 (PR #63). Code : `update.rs` (app), `installer.js` (serveur) ; détail dans la section « Code ».

- L'app demande au serveur s'il existe une version plus récente : **au lancement**, puis toutes les **4 heures** ; après un échec (hors ligne, serveur coupé), elle réessaie au bout de **30 minutes**. Une fois une mise à jour téléchargée, elle arrête de chercher jusqu'à l'installation.
- Demande : `GET <API>/update/windows/x86_64/<version actuelle>` avec l'en-tête `X-Rago-Device` (identifiant anonyme et stable du PC, haché, qui sert au déploiement progressif). Délai de 30 s pour la question, 15 min pour le téléchargement. Le serveur répond 204 s'il n'y a rien à installer.
- Elle télécharge en fond (l'installateur reste **en mémoire**, pas sur le disque), **vérifie la signature**, puis affiche « Mise à jour » en bas du menu (événement `update:ready`) : **Redémarrer** l'installe tout de suite, sinon à la fermeture de la fenêtre ou par « Quitter ». Jamais pendant un lot de tweaks ou une [[Remise à zéro]]. Si l'app est quittée autrement avant, le téléchargement est perdu et recommence au lancement suivant.
- L'installateur tourne en mode **passif** (barre de progression, sans question) : c'est le chemin « mise à jour » de l'[[Installateur NSIS]], qui ne remet aucun tweak à zéro.
- Un installateur non signé avec la clé Rago est refusé.
- Un exe sans clé publique de mise à jour (build local, build sans la clé) ou sans serveur ne cherche rien (« off, this build has no update key »).
- Clé : `TAURI_SIGNING_PRIVATE_KEY` (+ `…_PASSWORD`) en secret GitHub, `RAGO_UPDATER_PUBKEY` en variable. **Perdue = plus aucune mise à jour automatique possible pour les apps installées.** Voir [[Clés et secrets]].
- Serveur (Railway) : `INSTALLER_VERSION`, `UPDATE_ROLLOUT` (pourcentage, ex. 20 puis 100), `UPDATE_PAUSED=1` arrête tout ; contrôle sur `/api/v1/update/status`.
- La [[Version 1.1.14]] ne l'a pas : chaque joueur installe la 1.2.x une fois à la main.
- Test : exe staging numéroté 1.2.9 (entrée `version` du lancement manuel de la CI, serveur staging seulement) pour ne pas être remplacé par une mise à jour de test. L'exe de test montre dans les [[Paramètres de l'app]] le résultat de la dernière recherche (`update_status`, relu toutes les 3 s, sans bouton pour relancer) ; le rapport de support le reprend aussi.
- Procédure de test : `refonte-glass/MISE-A-JOUR-AUTO-TEST.md` ([[Sources]]) ; mise en ligne : `licensing/docs/MISE-EN-LIGNE.md`, section « Les mises à jour automatiques ».

Liens : [[Publier une version]], [[Serveur de licences]].

## Code
- Recherche, téléchargement, installation : [[update.rs]] ; lancement de la recherche, commandes `update_ready`, `update_status`, `update_install`, installation à la fermeture : [[lib.rs]].
- Configuration de l'updater (clé publique, mode passif) : [[Configuration Tauri]] ; plugin : [[Cargo.toml]] ; route du serveur : [[API du serveur]].
