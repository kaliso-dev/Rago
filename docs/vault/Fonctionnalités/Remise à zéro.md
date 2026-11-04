---
type: fonctionnalité
tags: [fonctionnalité, app, licence]
version_app: 1.2.1
maj: 2026-10-31
---
# Remise à zéro

Ce que l'app défait quand le joueur perd le droit à ses tweaks, ou le demande. Code : `reset.rs`, `installer/hooks.nsh`, `ResetToast.tsx`.

## Quand
- **Fin de licence sur ce PC** : déconnexion, abonnement terminé, remboursement, licence passée sur un autre PC → **tous** les tweaks appliqués sont remis.
- **Désinstallation** : le désinstallateur lance l'exe avec `--reset-tweaks` → tout est remis, y compris la sauvegarde du [[Packet Optimizer]], le profil NVIDIA et OptiFine.
- **Tout annuler** (bouton du [[Tableau de bord]]) et décocher un tweak : à la demande.

## Comment
- **Sans fenêtre ni bouton pour l'arrêter** (décision du 14/10 20:43). Petit message « Tweaks réinitialisés » en bas à droite ; si un tweak n'a pas pu être remis, le détail est dans l'historique (module Restaurer).
- La fin de licence est notée sur le disque (`Pending`) **avant** de commencer : fenêtre fermée → l'app finit cachée ; app tuée ou PC éteint → reprise au lancement suivant. Un tweak ne quitte `applied.json` qu'une fois remis.
- Les tweaks gratuits d'avant (`formerly`, ex. `in_mouse`) ne sont pas présentés comme une fin de Premium.

## Historique
1.1.6 (Premium seulement à la déconnexion) → [[Version 1.1.10]] (auto et invisible, défauts RAG-72) → [[Version 1.1.14]] (déconnexion et désinstallation complètes, clés protégées, NVIDIA, OptiFine).

## Danger
Un changement de clé de signature des licences rendrait tous les jetons invalides → remise chez **tous** les joueurs. Voir [[Clés et secrets]]. Non vérifié : remise du profil NVIDIA sur un vrai PC NVIDIA.

Liens : [[Licence dans l'app]], [[Moteur des tweaks]].
