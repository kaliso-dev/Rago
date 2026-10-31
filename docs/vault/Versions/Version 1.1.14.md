---
type: version
tags: [version, prod]
version: 1.1.14
maj: 2026-10-31
---
# Version 1.1.14

**En production depuis le 16/10/2026** (PR #52, #53, #56 vers staging, puis #57 vers la prod). Linear RAG-81. Voir [[Historique des versions]].

- **Base** : [[Version 1.1.10]] + tous les correctifs préparés pour les [[Versions 1.1.11 à 1.1.13]] : écran bleu, chemins avec caractères spéciaux, [[RBW Mod]], [[Remise à zéro]] (déconnexion et désinstallation).
- Retour arrière des clés protégées corrigé (4 tweaks restaient actifs après désinstallation, vu dans les logs du 15/10) ; remise du profil NVIDIA et d'OptiFine ajoutée (non vérifiée sur un PC NVIDIA).
- **Plan gratuit à 11 tweaks** : 3 réglages de confort ajoutés le 16/10 (voir [[Offres et prix]]).
- 88 tests verts sur Windows (CI).
- Pas de [[Mise à jour automatique]] : chaque joueur doit installer la 1.2.x une fois à la main.
- Après publication, Sofiene devait déposer l'exe dans Supabase et régler `INSTALLER_VERSION=1.1.14` sur Railway (voir [[Publier une version]]).
- Le code app de la branche de prod est resté en 1.1.14 ; la suite est la [[Version 1.2.0]].
