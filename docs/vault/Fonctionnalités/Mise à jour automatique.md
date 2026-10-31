---
type: fonctionnalité
tags: [fonctionnalité, app, serveur, 1.2]
maj: 2026-10-31
---
# Mise à jour automatique

Linear RAG-24. Arrivée en [[Version 1.2.0]] ; serveur en prod le 29/10 (PR #63). Code : `update.rs` (app), `installer.js` (serveur).

- L'app demande au serveur s'il existe une version plus récente : au lancement, puis toutes les 4 heures. Elle télécharge en fond, **vérifie la signature**, puis affiche « Mise à jour » en bas du menu : **Redémarrer** l'installe tout de suite, sinon à la fermeture.
- Un installateur non signé avec la clé Rago est refusé.
- Clé : `TAURI_SIGNING_PRIVATE_KEY` (+ `…_PASSWORD`) en secret GitHub, `RAGO_UPDATER_PUBKEY` en variable. **Perdue = plus aucune mise à jour automatique possible pour les apps installées.** Voir [[Clés et secrets]].
- Serveur (Railway) : `INSTALLER_VERSION`, `UPDATE_ROLLOUT` (pourcentage, ex. 20 puis 100), `UPDATE_PAUSED=1` arrête tout ; contrôle sur `/api/v1/update/status`.
- La [[Version 1.1.14]] ne l'a pas : chaque joueur installe la 1.2.x une fois à la main.
- Test : exe staging numéroté 1.2.9 pour ne pas être remplacé par une mise à jour de test.
- Procédure de test : `refonte-glass/MISE-A-JOUR-AUTO-TEST.md` ([[Sources]]) ; mise en ligne : `licensing/docs/MISE-EN-LIGNE.md`, section « Les mises à jour automatiques ».

Liens : [[Publier une version]], [[Serveur de licences]].
