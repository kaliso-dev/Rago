---
type: code
tags: [code, serveur, documentation, configuration]
fichier: licensing/README.md, licensing/CLAUDE.md, licensing/docs/API.md, licensing/docs/MISE-EN-LIGNE.md, licensing/.env.example, licensing/Dockerfile, licensing/package.json
lignes: 63 + 9 + 266 + 489 + 80 + 11 + 29
maj: 2026-11-10
---
# Documentation et configuration du serveur

Les fichiers du dossier `licensing/` qui ne sont pas du code : documentation (README, `CLAUDE.md`, contrat de l'API, guide de mise en ligne), modèle de variables, image Docker et paquets npm. Fiche parente : [[Code du serveur]].

(code de `staging` @ HEAD, 10/11 ; les ajouts « Cerveau » non commités de `.env.example` et `MISE-EN-LIGNE.md` ne sont pas décrits)

## README.md (63 lignes, en français)

- **Le parcours de l'acheteur** : achat Stripe → page de succès → compte → téléchargement → activation dans l'app ; rôle Pro Discord avec les cinq variables `DISCORD_`.
- **Choix faits** : abonnement mensuel ou annuel ; un seul PC par licence (réinstaller Windows ne bloque pas) ; changement de PC par le support, ou en libre-service avec `SELF_SERVICE_RESET_DAYS` ; Supabase (base + installateur dans un bucket privé) ; clés de licence créées au premier démarrage ; « Le plan gratuit, c'est l'app elle-même sans compte (11 réglages). »
- **Support** : les commandes `npm run admin` ([[admin.js (script serveur)]]).
- **Développement** : `npm run local`, `npm test` ; avertissement : `TEST_DATABASE_URL` efface la base ([[Tests du serveur]]).

## CLAUDE.md (9 lignes)

Consignes pour Claude dans ce dossier : lire le `CLAUDE.md` de la racine et [[Reprendre le développement]] ; les notes [[Architecture du serveur]], [[API du serveur]], [[Paiements Stripe]], [[Supabase]], [[Railway]], [[Variables d'environnement]] ; local et tests ; **une nouvelle variable = `src/config.js` + `.env.example` + `docs/MISE-EN-LIGNE.md` + la note du vault** ; `schema.sql` seulement idempotent ([[schema.sql]]) ; ne jamais lancer `npm run keys` ([[keys.js]]) ni changer `LICENSE_SIGNING_KEY`, `SESSION_SECRET` ou `SCRIPTS_SECRET` ([[Clés et secrets]]).

## docs/API.md (266 lignes) : le contrat de l'app

« Contrat d'activation Rago Optimizer v1 », la référence entre le serveur et l'app Windows : principe, base (`/api/v1`, forme `{error:{code, message}}`, tableau des erreurs dont `account_banned`), objet `device` et empreinte (avec des valeurs d'exemple), `GET /public-key`, `POST /auth/login`, `/licenses/activate`, `/licenses/refresh`, abonnement, clé des scripts Premium (1.1.6), récompense d'affiliation, affiliation et version gratuite, avis et photo de profil (1.1.8), Lifetime (`/plans`), jeton de licence, clés de test.

Écarts avec [[app.js]] (code de `staging`) :
- routes **absentes** : `POST /auth/app-link/start` et `/poll` (connexion Google/Discord de l'app), `POST /route/token` ([[Infrastructure Rago Route]]), `GET /account/subscription` et `POST …/cancel`, `…/resume` (1.3.0), `GET /installer`, `GET /update/…` ([[Mise à jour automatique]]), `POST /network/report` ([[Test réseau]]) ;
- `GET /plans` documenté avec seulement `lifetime`, alors qu'il renvoie aussi `month`, `year` et `trial_days` ;
- chemins encore écrits avec l'ancien préfixe `/mnt/project-files/`.

La version du vault, plus complète, est [[API du serveur]].

## docs/MISE-EN-LIGNE.md (489 lignes) : le guide de Sofiene

Mise en ligne pas à pas : étapes 1 à 10 (domaine, Supabase, Stripe, Resend, Railway, webhook, Netlify, app Windows avec mises à jour automatiques et tests réseau, test complet, passage en vrai), revenir en mode test, codes promo et pop-up, rôle Pro Discord, connexion Google/Discord et code par e-mail, récompenses Discord, bot communauté, « Ce que tu me donnes », récapitulatif des variables Railway, « Au quotidien (support) » avec toutes les commandes, règles de l'affiliation, « Le tableau de bord `/admin` (2026-11-10) ». Voir [[Railway]], [[Paiements Stripe]], [[Bot communauté Discord]].

`docs/screens/` : 7 captures (inscription, tableau de bord gratuit et Premium, téléphone, affiliation). `docs/test/` : `test-public-key.pem` et `test.env`, clés **de test seulement** (ne jamais recopier leur contenu).

## .env.example (80 lignes) : les noms des variables

Modèle commenté, en sections : **Required** (`NODE_ENV`, `PUBLIC_URL`, `SITE_URL`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `TRIAL_DAYS`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET`, `TRUST_PROXY`) ; **Installer** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INSTALLER_VERSION`) ; **Emails and support** (`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, `SUPPORT_URL`) ; **Optional** (`ROUTE_TESTERS`, `SELF_SERVICE_RESET_DAYS`, `LICENSE_TOKEN_DAYS`, `SUBSCRIPTION_GRACE_DAYS`, les 7 `AFFILIATE_*`, `STRIPE_PORTAL_LOGIN_URL`, `PRICE_LABEL`, `STRIPE_PRICE_LIFETIME`, `INSTALLER_OBJECT`, `GEOIP`, `LICENSE_SIGNING_KEY`, `SESSION_SECRET`, `SCRIPTS_SECRET`, `CHECKOUT_CANCEL_URL`, `SITE_DIR`, `LAUNCH_AT`, `PREVIEW_KEY`) ; **Discord Pro role** (5 variables) ; **rewards** (`DISCORD_VIP_ROLE_ID`, `DISCORD_MVP_ROLE_ID`, `DISCORD_BOOST2_ROLE_ID`) ; **Community bot** (`DISCORD_COMMUNITY`, `DISCORD_WELCOME_CHANNEL_ID`, `DISCORD_WELCOME_TEXT`, `DISCORD_INVITE_ROLES`, `DISCORD_VIP_INVITES`, `DISCORD_MVP_INVITES`) ; **Google/Discord** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_LOGIN`, `EMAIL_VERIFICATION`). Aucune vraie valeur.

Variables lues par [[config.js]] mais **absentes** du modèle (16) : `ADMIN_KEY`, `APP_ENV`, `AVATAR_BUCKET`, `FREE_TWEAKS`, `GEOIP_ASN_URL`, `GEOIP_CITY_URL`, `INSTALLER_FILENAME`, `INSTALLER_PATH`, `INSTALLER_URL`, `PORT`, `PREMIUM_TWEAKS`, `RAILWAY_ENVIRONMENT_NAME` (mise par Railway), `STRIPE_PRICE_ID` (ancien prix unique), `UPDATE_NOTES`, `UPDATE_PAUSED`, `UPDATE_ROLLOUT`. La liste complète avec le sens de chacune : [[Variables d'environnement]].

## Dockerfile (11 lignes)

`node:22-alpine` ; `npm ci --omit=dev` (PGlite n'est donc pas dans l'image) ; copie de `src`, `public`, `scripts`, `supabase` ; `NODE_ENV=production`, `PORT=8787`, `EXPOSE 8787` ; `CMD npm start`. Railway construit cette image ([[Railway]]) ; la CI vérifie que `sharp` y marche ([[licensing-tests.yml]]).

## package.json

- `rago-licensing` 1.0.0, privé, modules ES (`"type": "module"`), Node **≥ 22.5**.
- Scripts : `start` (`node src/server.js`), `dev` (`--watch`), `local` ([[local.js]]), `test` (`node --test --test-concurrency=1 test/*.test.js`), `keys` ([[keys.js]], à ne jamais lancer), `admin` ([[admin.js (script serveur)]]).
- Dépendances : `@hono/node-server` ^2.1.3, `hono` ^4.13.13, `mmdb-lib` ^3.0.3 ([[geo.js]]), `pg` ^8.23.1 ([[db.js]]), `sharp` ^0.35.5 ([[profile.js]]), `stripe` ^23.0.0 ([[billing.js]]). Développement : `@electric-sql/pglite` ^0.5.8 (base en mémoire).

`.gitignore` : `node_modules/`, `data/`, `.env`.

## À savoir avant de modifier

- README : « 11 réglages » pour le plan gratuit, alors que la version gratuite en a 73 depuis le 04/11 : À VÉRIFIER (même écart que `FREE_TWEAKS` dans [[config.js]]).
- Garder `API.md` en accord avec [[app.js]] : l'app Windows s'y réfère.
