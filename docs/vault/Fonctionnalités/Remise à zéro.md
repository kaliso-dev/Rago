---
type: fonctionnalité
tags: [fonctionnalité, app, licence]
version_app: 1.3.0
maj: 2026-11-10
---
# Remise à zéro

Ce que l'app défait quand le joueur perd le droit à ses tweaks, ou le demande. Code : `reset.rs`, `reset_after_license` de `lib.rs`, `installer/hooks.nsh`, `ResetToast.tsx` (détail dans la section « Code »).

## Quand
- **Fin de licence sur ce PC** : déconnexion, abonnement terminé, remboursement, licence passée sur un autre PC → tous les tweaks que le moteur sait remettre seul sont remis, **gratuits compris**, puis le [[Packet Optimizer]] revient à ses valeurs d'avant. Un tweak sans annulation automatique (15 d'après le journal d'une déconnexion de la 1.1.13) reste appliqué : à défaire à la main ou par le point de restauration.
- **Désinstallation** : le désinstallateur lance l'exe avec `--reset-tweaks` → **tout** est remis, y compris le Packet Optimizer, le profil NVIDIA, OptiFine et ce que l'app a posé le temps d'une partie ([[Pendant la partie]] : mode d'alimentation, choix de carte graphique). **Pas pendant une mise à jour** (les réglages restent), sauf si le joueur coche « Delete the application data », qui effacerait la sauvegarde : la remise tourne alors avant ([[Installateur NSIS]]).
- **Tout annuler** (bouton du [[Tableau de bord]]) et décocher un tweak : à la demande.
- **Jamais** pour un jeton simplement expiré hors ligne (le joueur paie peut-être encore : le serveur le dira au prochain rafraîchissement), ni pour un joueur du plan gratuit qui n'a que des tweaks gratuits.

## Comment
- **Sans fenêtre ni bouton pour l'arrêter** (décision du 14/10 20:43). Petit message « Tweaks réinitialisés » en bas à droite (événement `reset:done`) ; si un tweak n'a pas pu être remis, le détail est dans l'historique (module Restaurer) et dans `logs\reset-<ms>.log`.
- La fin de licence est notée sur le disque (`reset-pending.json`, avec sa raison : `signed_out`, `revoked`, `bound_to_other_device`, `invalid_token`, `license_gone` si des tweaks Premium sont trouvés appliqués sans licence, `unreadable` si la note est abîmée) **avant** d'effacer le jeton. Fenêtre fermée → l'app finit cachée puis quitte ; app tuée ou PC éteint → reprise au lancement suivant. Un tweak ne quitte `applied.json` qu'une fois remis.
- Le dernier tweak appliqué est remis en premier. Un tweak qui échoue n'est essayé qu'une fois par remise.
- **Licence revenue pendant la remise** (reconnexion) : elle s'arrête après le tweak en cours ; les suivants restent appliqués.
- **Désinstallation bornée** : 15 minutes au plus (d'habitude 1 à 5) ; ensuite le script en cours est tué et ce qui reste est laissé dans `applied.json`. Avant de remettre, les mêmes [[Réparations au lancement]] que l'app sont faites (sinon une ancienne valeur dangereuse pourrait être réécrite, RAG-67).
- Les tweaks gratuits d'avant (`formerly`, ex. `in_mouse`) ne sont pas présentés comme une fin de Premium.

## Historique
1.1.6 (Premium seulement à la déconnexion) → [[Version 1.1.10]] (auto et invisible, défauts RAG-72) → [[Version 1.1.14]] (déconnexion et désinstallation complètes, clés protégées, NVIDIA, OptiFine).

## Danger
Un changement de clé de signature des licences rendrait tous les jetons invalides → remise chez **tous** les joueurs. Voir [[Clés et secrets]]. Non vérifié : remise du profil NVIDIA sur un vrai PC NVIDIA.

Liens : [[Licence dans l'app]], [[Moteur des tweaks]].

## Code
- Portées, note sur disque, décision et désinstallation : [[reset.rs]] ; boucle de la fin de licence (`reset_after_license`) : [[lib.rs]].
- Annulations : [[runner.rs]], [[backup.rs]] ; Packet Optimizer : [[netopt.rs]] (`put_back`) ; partie en cours : [[session.rs]] (`undo_all`) ; OptiFine : [[minecraft.rs]].
- Crochet du désinstallateur : [[Installateur NSIS]] ; verrou d'instance pendant la désinstallation : [[instance.rs]].
