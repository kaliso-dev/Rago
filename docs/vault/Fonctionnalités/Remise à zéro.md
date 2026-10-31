---
type: fonctionnalité
tags: [fonctionnalité, app, licence]
maj: 2026-10-31
---
# Remise à zéro

Ce que l'app défait quand le joueur n'a plus le droit à ses tweaks. Code : `reset.rs`, `repair.rs`, `installer/hooks.nsh`.

- **Décision en vigueur (14/10 20:43)** : à la déconnexion, tout est désactivé **obligatoirement, sans bouton Stop** ; à la désinstallation, **tous** les paramètres reviennent à l'état d'avant sur le PC.
- Historique : 1.1.6 (Premium seulement à la déconnexion) → [[Version 1.1.10]] (remise auto et invisible à la fin de licence et à la désinstallation, avec défauts RAG-72) → [[Version 1.1.14]] (déconnexion et désinstallation complètes, clés protégées, profil NVIDIA et OptiFine).
- Le [[Packet Optimizer]] remet sa propre sauvegarde (désinstallation et fin de Premium).
- **Danger** : un jeton de licence devenu invalide (changement de clé de signature) déclencherait la remise chez **tous** les joueurs. Voir [[Clés et secrets]].
- Non vérifié : remise du profil NVIDIA sur un vrai PC NVIDIA ([[Questions ouvertes]]).

Liens : [[Serveur de licences]], [[Bugs et incidents]].
