---
type: code
tags: [code, serveur, javascript, développement]
fichier: licensing/scripts/local.js
lignes: 35
maj: 2026-11-10
---
# local.js

Script `npm run local` : lance le serveur sur le PC du développeur, **sans rien de réel** (ni base Supabase, ni e-mails, ni Discord, ni Stripe live), avec le site servi sur la même adresse. Fiche parente : [[Code du serveur]]. Mode d'emploi : [[Développer et tester]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

`npm run local` = `node --watch scripts/local.js` (relance à chaque modification). Le script prépare `process.env` puis importe `../src/server.js` ([[server.js]]).

## Ce que le fichier fait

1. **Retire** de l'environnement (et affiche « Ignored here: … ») : `DATABASE_URL`, `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LICENSE_SIGNING_KEY`, `SESSION_SECRET`, les 5 variables du rôle Pro Discord (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID`) et les rôles `DISCORD_VIP_ROLE_ID`, `DISCORD_MVP_ROLE_ID`, `DISCORD_BOOST2_ROLE_ID`, `RAILWAY_ENVIRONMENT_NAME`, `APP_ENV`. Une clé Stripe **live** (`sk_live_` ou `rk_live_`) est retirée avec le secret du webhook et les prix ; une clé de test peut rester (cartes de test, webhooks par la CLI Stripe). Sans token, ni le bot du rôle Pro ni le bot communauté ne démarrent.
2. **Règle** : `NODE_ENV=development`, `PORT` (8787 par défaut), `PUBLIC_URL` = `SITE_URL` = `http://localhost:<port>`, `SITE_DIR` = dossier `site/` du dépôt (le [[Site]] servi par le même serveur), `EMAIL_VERIFICATION=1` par défaut, `DEV_SEED` par défaut (compte Premium de test recréé à chaque démarrage, identifiants affichés dans la bannière) ; supprime `LAUNCH_AT` (pas de compte à rebours).
3. Affiche une bannière, puis démarre le serveur : base PGlite en mémoire, e-mails et codes d'inscription affichés dans le terminal ([[mailer.js]], [[db.js]]).

## Données touchées

Base en mémoire, perdue à l'arrêt.

## Liens avec le reste

[[server.js]], [[config.js]], [[Développer et tester]], [[Variables d'environnement]].

## Tests

Aucun ([[Tests du serveur]]).

## À savoir avant de modifier

- Une nouvelle variable « réelle » (clé d'un service) doit être ajoutée à la liste des variables retirées, sinon `npm run local` agirait sur le vrai service.
- Avec `SITE_DIR`, le site n'a pas la CSP stricte (voir [[app.js]]).
