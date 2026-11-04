---
type: procédure
tags: [technique, déploiement, procédure]
maj: 2026-10-31
---
# Publier une version de l'app

Voir [[Branches et environnements]], [[Mise à jour automatique]], [[Historique des versions]].

1. `npm run bump X.Y.Z` dans `app/` : numéro **supérieur** à tout exe déjà distribué et jamais utilisé (pas 1.1.11-1.1.13, pas 1.2.9).
2. PR vers `staging`, CI verte (`app-windows` : tests Windows + exe staging « Rago Optimizer Staging » relié au serveur de test).
3. Tests de Sofiene sur un vrai Windows.
4. Exe de prod : artefact `rago-optimizer-setup` du run GitHub (avec `…setup.exe.sig` si la clé de mise à jour est en place).
5. **Sofiene** dépose le **`.exe`** (pas le zip) et le **`.exe.sig`** dans le bucket `downloads` du Supabase **de prod** (jamais l'exe staging en prod).
6. **Sofiene** règle sur Railway `INSTALLER_VERSION=X.Y.Z`, `UPDATE_ROLLOUT=20` puis 100 ; `UPDATE_PAUSED=1` arrête tout.
7. Vérifier : `https://account.rago-optimizer.com/download/status`, `/api/v1/installer`, `/api/v1/update/status`.
8. Mettre à jour le [[Site]] si les chiffres ou fonctions changent, [[Linear]], et ce vault ([[Mettre à jour le vault]]).

Référence complète : `licensing/docs/MISE-EN-LIGNE.md`.
