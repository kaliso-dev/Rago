---
type: procédure
tags: [technique, déploiement, procédure]
maj: 2026-11-10
---
# Publier une version de l'app

Voir [[Branches et environnements]], [[Mise à jour automatique]], [[Historique des versions]].

1. `npm run bump X.Y.Z` dans `app/` : numéro **supérieur** à tout exe déjà distribué et jamais utilisé (pas 1.1.11-1.1.13, pas 1.2.9).
2. PR vers `staging`, CI verte (`app-windows` sur la PR : tests du moteur + un exe **qui vise le serveur de prod**, artefact `rago-optimizer-setup`). Une fois la PR fusionnée, le push sur `staging` fabrique l'exe de test « Rago Optimizer Staging » relié au serveur de test (artefact `rago-optimizer-setup-STAGING`).
3. Tests de Sofiene sur un vrai Windows.
4. Exe de prod : artefact `rago-optimizer-setup` (avec `…setup.exe.sig` si la clé de mise à jour est en place) d'un run qui vise la prod : celui de la PR, ou **Actions → app-windows → Run workflow** avec `server = production` sur la branche voulue. Un tag `app-v*` créerait en plus un brouillon de release GitHub (voie jamais utilisée : aucun tag le 10/11). Un push sur la branche de prod ne fabrique plus d'exe depuis le 10/11. Détail : [[app-windows.yml]].
5. **Sofiene** dépose le **`.exe`** (pas le zip) et le **`.exe.sig`** dans le bucket `downloads` du Supabase **de prod** (jamais l'exe staging en prod).
6. **Sofiene** règle sur Railway `INSTALLER_VERSION=X.Y.Z`, `UPDATE_ROLLOUT=20` puis 100 ; `UPDATE_PAUSED=1` arrête tout.
7. Vérifier : `https://account.rago-optimizer.com/download/status`, `/api/v1/installer`, `/api/v1/update/status`.
8. Mettre à jour le [[Site]] si les chiffres ou fonctions changent (catalogue : [[sync_app.py]] puis [[build.py]] ; nombre de tweaks sur l'image de partage : [[export-logo.js]]), [[Linear]], et ce vault ([[Mettre à jour le vault]]).

Référence complète : `licensing/docs/MISE-EN-LIGNE.md`. Code de la CI : [[Code de la CI et du dépôt]] ; branches : [[Branches du dépôt]].
