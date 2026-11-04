---
type: version
tags: [version, prod]
version: 1.2.1
maj: 2026-10-31
---
# Version 1.2.1

Construite et **signée** le 29/10 (commit `d853c9b`, PR #65 dans `staging`). Voir [[Version 1.2.0]] pour tout le contenu de la 1.2.

- Ajout : chaque [[Test réseau]] lancé par un joueur envoie ses résultats au serveur, avec sa ville et son fournisseur (bases DB-IP), pour préparer le [[Proxy]] (RAG-50). Page admin : `/admin/reseau`.
- Exe de prod : artefact du run GitHub 40875001628 (`…setup.exe` + `.exe.sig`).
- Serveur de prod prêt (PR #63) ; site prêt (PR #59, #66).
- **Reste** : Sofiene dépose l'exe et le `.sig` dans le bucket `downloads`, puis `INSTALLER_VERSION=1.2.1`. Les 1.2.0 installées la recevront au lancement. **Fait** (Sofiene, 31/10) : la 1.2.1 est en ligne ([[État actuel]]).
- Annonces Discord prêtes (voir [[Discord]]).
