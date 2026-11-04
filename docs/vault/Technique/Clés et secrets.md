---
type: règle
tags: [technique, sécurité, règle]
maj: 2026-10-31
---
# Clés et secrets

**Jamais de valeur de secret ici ni ailleurs** (chat, Linear, commit, capture) : seulement les noms. Voir [[Règles de travail]].

## Interdits absolus
- Ne jamais changer la clé de signature des licences (table `server_secrets`, variable `LICENSE_SIGNING_KEY`), ne jamais vider `server_secrets`, **ne jamais lancer `npm run keys`**. Un jeton devenu invalide déclencherait la [[Remise à zéro]] chez tous les joueurs.
- Ne jamais changer `SCRIPTS_SECRET` (Railway) / `RAGO_SCRIPTS_SECRET` (GitHub) : la clé des scripts Premium en dépend.
- Ne jamais perdre la clé de [[Mise à jour automatique]] (`TAURI_SIGNING_PRIVATE_KEY`) : à sauvegarder hors du PC.
- Ne jamais copier `server_secrets` de la prod vers le staging.
- Ne jamais ajouter les MX Google dans OVH (couperait la boîte Zimbra `support@`).

## Noms des variables
- **GitHub secrets** : `RAGO_API_BASE`, `RAGO_LICENSE_PUBKEY`, `RAGO_SCRIPTS_SECRET`, `STAGING_RAGO_API_BASE`, `STAGING_RAGO_LICENSE_PUBKEY`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. **Variables** : `SITE_URL`, `SUPPORT_URL`, `STAGING_SITE_URL`, `RAGO_UPDATER_PUBKEY`.
- **Railway** : `NODE_ENV`, `PUBLIC_URL`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SCRIPTS_SECRET`, `INSTALLER_VERSION`, `INSTALLER_OBJECT`, `UPDATE_ROLLOUT`, `UPDATE_PAUSED`, `LIFETIME_PRICE`, `DISCORD_*` (dont `DISCORD_LOGIN=1`), clés Google OAuth ; staging : `APP_ENV=staging`. Liste complète : `licensing/.env.example`.
- **Netlify** : `PREVIEW_KEY`, `LAUNCH_AT`, `STAGING_ACCOUNT_URL`.
- Sauvegarde hors ligne de la clé de signature : `npm run admin -- export-keys`.

Liens : [[Serveur de licences]], [[App Windows]], [[Publier une version]].
