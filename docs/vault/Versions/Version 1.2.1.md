---
type: version
tags: [version, prod]
version: 1.2.1
maj: 2026-11-10
---
# Version 1.2.1

Construite et **signée** le 29/10 (commit `d853c9b`, PR #65 dans `staging`). Voir [[Version 1.2.0]] pour tout le contenu de la 1.2.

- Ajout : chaque [[Test réseau]] lancé par un joueur envoie ses résultats au serveur, avec sa ville et son fournisseur (bases DB-IP), pour préparer le [[Proxy]] (RAG-50). Page admin : `/admin/reseau`.
- Exe de prod : artefact du run GitHub 40875001628 (`…setup.exe` + `.exe.sig`).
- Serveur de prod prêt (PR #63) ; site prêt (PR #59, #66).
- **Reste** : Sofiene dépose l'exe et le `.sig` dans le bucket `downloads`, puis `INSTALLER_VERSION=1.2.1`. Les 1.2.0 installées la recevront au lancement. **Fait** (Sofiene, 31/10) : la 1.2.1 est en ligne ([[État actuel]]).
- Annonces Discord prêtes (voir [[Discord]]).
- Pourquoi cette version : le 29/10 à 01:32 UTC, Sofiene refuse de tout pousser en prod avant d'être sûr que l'app « récupère bien les stats et les villes des utilisateurs pour les futurs proxy » ; rien n'était collecté. Carte « Demander l'accord du joueur ? » → « Automatique » : chaque test réseau est envoyé, avec une ligne dans la politique de confidentialité ([[Décisions]]). L'exe de test qui envoyait déjà les résultats portait le numéro 1.2.9 (PR #64).
- Ces données ont servi le 04/11 à décider des proxys, puis à Rago Route ([[Fil - Développer les proxys Minecraft]]).
