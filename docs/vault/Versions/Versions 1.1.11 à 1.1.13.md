---
type: version
tags: [version, historique, non-retenue]
maj: 2026-11-10
---
# Versions 1.1.11 à 1.1.13 (non retenues)

Fabriquées les 14 et 15/10, mises de côté par Sofiene le 15/10 à 16:37. Voir [[Historique des versions]] et [[Version 1.1.10]].

| Version | Contenu | Où |
|---|---|---|
| 1.1.11 « correctifs » | correctifs des bugs joueurs | `claude/project-thread-uy8yf3` |
| 1.1.11 « prod » | scripts gratuits et retours arrière chiffrés aussi (PR #48), poussée en prod sur ordre | branche de prod |
| 1.1.12 | `applied.json` chiffré au repos (DPAPI), dossier `run\` vidé au démarrage (PR #49) | branche de prod (`27bf62f`) |
| 1.1.13-A | déconnexion qui remet tout (PR #50, fermée le 01/11) | `claude/reset-on-signout-uninstall` |
| 1.1.13-B | « Tout corriger » après l'audit (PR #51, fermée le 01/11) | `claude/project-thread-8oenwk` |

- Raison de la mise de côté de la 1.1.13 : jamais donnée (À VÉRIFIER). Le 15/10 à 19:25 UTC, dans le nouveau projet Claude, Sofiene précise seulement : « non personne n'a la 1.1.12 […] tu peux appelé la nouvelle version 1.1.14 et tu dois construire la nouvelle version à partir de la 1.1.10 » ([[Fils du projet]]).
- Leur travail a servi de **source** pour la [[Version 1.1.14]] (correctifs reportés sur la base 1.1.10).
- PR fermées le 01/11 avec l'accord de Sofiene, après vérification que leurs fonctions sont dans la 1.2.1 (remise à zéro à la déconnexion avec reprise au lancement, alerte WMIC, « Annuler · Nom », limite de 25 Mo, OptiFine…). Ne supprimer aucune de ces branches sans décision de Sofiene.
- Une 1.1.10 ne sait pas relire un `applied.json` chiffré (1.1.12+) : PC concernés À VÉRIFIER.
