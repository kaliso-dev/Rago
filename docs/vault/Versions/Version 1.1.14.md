---
type: version
tags: [version, prod]
version: 1.1.14
maj: 2026-11-10
---
# Version 1.1.14

**En production depuis le 16/10/2026** (PR #52, #53, #56 vers staging, puis #57 vers la prod). Linear RAG-81. Voir [[Historique des versions]].

- **Base** : [[Version 1.1.10]] + tous les correctifs préparés pour les [[Versions 1.1.11 à 1.1.13]] : écran bleu, chemins avec caractères spéciaux, [[RBW Mod]], [[Remise à zéro]] (déconnexion et désinstallation).
- Retour arrière des clés protégées corrigé (4 tweaks restaient actifs après désinstallation, vu dans les logs du 15/10) ; remise du profil NVIDIA et d'OptiFine ajoutée (non vérifiée sur un PC NVIDIA).
- **Plan gratuit à 11 tweaks** : 3 réglages de confort ajoutés le 16/10 (voir [[Offres et prix]]).
- 88 tests verts sur Windows (CI).
- Pas de [[Mise à jour automatique]] : chaque joueur doit installer la 1.2.x une fois à la main.
- Après publication, Sofiene devait déposer l'exe dans Supabase et régler `INSTALLER_VERSION=1.1.14` sur Railway (voir [[Publier une version]]).
- Le code app de la branche de prod est resté en 1.1.14 ; la suite est la [[Version 1.2.0]]. Le 10/11, c'est toujours le code de l'app sur la branche de prod (les exe 1.2.x et 1.3.0 sont construits depuis `staging`).

## Histoire (fils « Analyse du contexte importé » et « Tweaks gratuits et site à jour »)
- 15/10 : Sofiene, « tu peux appelé la nouvelle version 1.1.14 et tu dois construire la nouvelle version à partir de la 1.1.10 » ; carte « que mettre dedans » → « Tout ». Ses demandes du soir : remise à zéro « pas a la vue du spectateur » et qui continue même si l'app est fermée, pas de cadenas sur Windows en gratuit, `history.json` chiffré, nouveau script du RBW Mod sans toucher aux optimisations, retrait des tweaks qui pouvaient faire planter le PC, chemins avec caractères spéciaux.
- Refaite strictement sur la 1.1.10 : seules différences, le nouveau RBW Mod, 8 réglages liés à l'écran bleu (« Disable timer coalescing » retiré) et les chemins ; scripts et `applied.json` chiffrés ; `history.json` chiffré (DPAPI) ; l'alerte antivirus vient de la réputation d'un exe non signé (RAG-25).
- 15/10 22:36 : plan gratuit limité à Windows et Restaurer (PR #53, 8 réglages) ; 16/10 : +3 réglages de confort (PR #56, 11). 16/10 12:10 : « il faut absolument que tu t'assures que tout les tweaks disponible sur l'app seront désactivé après la déconnection ».
- 17/10 : un joueur avec `&` dans son chemin confirme que tout s'applique ([[Problèmes joueurs]]).
- Détails : [[Fils du projet]], [[Pull requests]] (#52, #53, #56, #57).
