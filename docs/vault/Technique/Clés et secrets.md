---
type: règle
tags: [technique, sécurité, règle]
maj: 2026-11-10
---
# Clés et secrets

**Jamais de valeur de secret ici ni ailleurs** (chat, Linear, commit, capture) : seulement les noms. Voir [[Règles de travail]].

## Interdits absolus
- Ne jamais changer la clé de signature des licences (table `server_secrets`, variable `LICENSE_SIGNING_KEY`), ne jamais vider `server_secrets`, **ne jamais lancer `npm run keys`**. Un jeton devenu invalide déclencherait la [[Remise à zéro]] chez tous les joueurs.
- Ne jamais changer `SCRIPTS_SECRET` (Railway) / `RAGO_SCRIPTS_SECRET` (GitHub) : la clé des scripts Premium en dépend.
- Ne jamais perdre la clé de [[Mise à jour automatique]] (`TAURI_SIGNING_PRIVATE_KEY`) : à sauvegarder hors du PC.
- Ne jamais copier `server_secrets` de la prod vers le staging.
- Ne jamais ajouter les MX Google dans OVH (couperait la boîte Zimbra `support@`).

## État des sauvegardes (11/11)
**Toutes les clés sont sauvegardées** dans le gestionnaire de mots de passe de Sofiene (Sofiene, 11/11 : « j'ai finis d'enregistrer toute les clé que tu m'a dis d'enregistré ») :
- clé de signature des licences et secret de session (`server_secrets` de Supabase prod) ;
- variables Railway (prod et staging), dont la clé Stripe secrète, `SCRIPTS_SECRET` (= `RAGO_SCRIPTS_SECRET` de GitHub), `DATABASE_URL`, Discord, Google ;
- clé de [[Mise à jour automatique]] : fichier `~/.tauri/rago-updater.key` (et `.key.pub`) du Mac de Sofiene, créé le 28/10, avec son mot de passe (vérifié par un test de signature le 10/11) ;
- codes de secours de double authentification des comptes (GitHub, Stripe, Supabase, Railway, OVH, Google) ;
- identifiants de l'interface admin du serveur (`/admin`).
Les valeurs ne sont écrites nulle part ailleurs (ni chat, ni vault). La clé des licences n'est **pas** mise en variable Railway : elle reste lue dans la base ; ne pas l'y ajouter sans Claude (une valeur mal collée remplacerait la clé en service).

## Noms des variables
Liste complète, rangée par service avec leurs défauts : [[Variables d'environnement]].
- **GitHub secrets** : `RAGO_API_BASE`, `RAGO_LICENSE_PUBKEY`, `RAGO_SCRIPTS_SECRET`, `STAGING_RAGO_API_BASE`, `STAGING_RAGO_LICENSE_PUBKEY`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. **Variables** : `SITE_URL`, `SUPPORT_URL`, `STAGING_SITE_URL`, `RAGO_UPDATER_PUBKEY`.
- **Railway** : `NODE_ENV`, `PUBLIC_URL`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SCRIPTS_SECRET`, `INSTALLER_VERSION`, `INSTALLER_OBJECT`, `UPDATE_ROLLOUT`, `UPDATE_PAUSED`, `LIFETIME_PRICE`, `DISCORD_*` (dont `DISCORD_LOGIN=1`), clés Google OAuth ; staging : `APP_ENV=staging`, `ROUTE_TESTERS` (e-mails autorisés à avoir un jeton Rago Route sur le serveur de test, séparés par des virgules ; pas un secret, 08/11, [[Proxy]]). Liste complète : `licensing/.env.example`.
- **Netlify** : `PREVIEW_KEY`, `LAUNCH_AT`, `STAGING_ACCOUNT_URL`.
- Sauvegarde hors ligne de la clé de signature : `npm run admin -- export-keys`.

Liens : [[Serveur de licences]], [[App Windows]], [[Publier une version]].
