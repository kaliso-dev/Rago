---
type: code
tags: [code, serveur, javascript, configuration]
fichier: licensing/src/config.js
lignes: 279
maj: 2026-11-10
---
# config.js

Lit **toutes** les variables d'environnement du serveur, applique les valeurs par défaut, refuse de démarrer quand la configuration de production est incomplète ou dangereuse, et produit la liste des avertissements affichés au démarrage et sur `/admin`. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Variables d'environnement]].

(code de `staging` @ `ee77d4f`, 10/11. Les variables `CERVEAU_*` en cours d'ajout par la personne qui coordonne ne sont pas décrites ici.)

## Rôle et place dans l'ensemble

Un seul export utile : `loadConfig(env = process.env)` → objet `cfg`, passé à tous les modules. Les tests appellent `loadConfig({...})` avec leur propre environnement. [[admin.js (script serveur)]] force `NODE_ENV: 'development'` pour ne pas exiger la config de prod. Règle du dépôt (`licensing/CLAUDE.md`) : **une nouvelle variable** = `src/config.js` + `.env.example` + `docs/MISE-EN-LIGNE.md` + la note [[Variables d'environnement]].

## Ce que le fichier expose

- `DEFAULT_LAUNCH` = `'2026-10-10T13:00:00Z'` (samedi 10 octobre 2026, 15 h à Paris).
- `loadConfig(env)` → `cfg` (voir le tableau).

## Aides internes

- `asUrl(s)` : ajoute `https://` s'il manque et retire les `/` finaux (`rago.up.railway.app` est accepté).
- `readPem(v)` : accepte un PEM (les `\n` littéraux sont remplacés par de vrais sauts de ligne) ou le **base64 d'un PEM** (plus facile à coller dans Railway).
- `launchTime(v, prod)` : date de `LAUNCH_AT` ; vide ou invalide → `DEFAULT_LAUNCH` en prod, `0` (déjà lancé) ailleurs.
- `whole(v, défaut)` : entier ≥ 1, sinon le défaut. `percent(v, défaut)` : nombre borné entre 0 et 100, sinon le défaut.
- `STAGING_NAME` = `/stag|test|preview|^dev$|pr-\d/` : un nom d'environnement qui y correspond fait de ce serveur un **serveur de test**.

## Toutes les variables lues

| Variable | Clé `cfg` | Défaut et règle |
|---|---|---|
| `NODE_ENV` | `prod` | `production` = prod. |
| `APP_ENV`, `RAILWAY_ENVIRONMENT_NAME` | `envName`, `staging` | `APP_ENV`, sinon le nom d'environnement Railway, sinon `production` / `development` ; en minuscules. `staging` = le nom correspond à `STAGING_NAME`. |
| `PORT` | `port` | 8787. |
| `PUBLIC_URL` | `publicUrl` | `http://localhost:<PORT>`. |
| `SITE_URL` | `siteUrl` | `publicUrl`. |
| `DATABASE_URL` | `databaseUrl` | vide = base en mémoire. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `supabaseUrl`, `supabaseServiceKey` | vides. |
| `INSTALLER_OBJECT` | `installerObject` | `downloads/RagoOptimizer-Setup.exe` (bucket/chemin). |
| `AVATAR_BUCKET` | `avatarBucket` | `avatars`. |
| `TRUST_PROXY` | `trustProxy` | `1` ou `true`. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `stripeSecretKey`, `stripeWebhookSecret` | espaces et sauts de ligne retirés (Stripe refuse sinon). |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | `stripePriceMonthly`, `stripePriceYearly` | vides. |
| `STRIPE_PRICE_ID` | `stripePriceId` | ancien prix unique, plus vendu ; seulement comparé et signalé. |
| `STRIPE_PRICE_LIFETIME` | `stripePriceLifetime` | vide = Lifetime pas en vente. |
| `TRIAL_DAYS` | `trialDays` | 3 ; entier de 0 à 30, sinon 3 ; 0 = aucun essai. |
| `LICENSE_SIGNING_KEY` | `signingKeyPem` | vide = clé générée en base ([[db.js]]). |
| `SESSION_SECRET` | `sessionSecret` | vide = généré en base. |
| `SCRIPTS_SECRET` | `scriptsSecret` | en dev : une valeur de test fixe ; en prod, vide = aucune `scripts_key` envoyée. |
| `RESEND_API_KEY` | `resendApiKey` | vide = e-mails dans les logs. |
| `MAIL_FROM` | `mailFrom` | `Rago Optimizer <noreply@example.com>` (valeur d'exemple, refusée par Resend). |
| `MAIL_REPLY_TO` | `mailReplyTo` | vide = pas de `Reply-To`. |
| `SUPPORT_URL` | `supportUrl` | lien Discord du support. |
| `STRIPE_PORTAL_LOGIN_URL` | `portalLoginUrl` | lien de connexion au portail client Stripe (« Cancel subscription » sans compte Rago). |
| `PRICE_LABEL` | `priceLabel` | texte du prix montré aux comptes gratuits ; vide = pas de prix. |
| `FREE_TWEAKS` | `freeTweaks` | **11**. |
| `PREMIUM_TWEAKS` | `premiumTweaks` | **198**. |
| `CHECKOUT_CANCEL_URL` | `cancelUrl` | `<SITE_URL ou PUBLIC_URL>/#pricing`. |
| `SELF_SERVICE_RESET_DAYS` | `selfServiceResetDays` | 0 = changement de PC par le support seulement. |
| `SITE_DIR` | `siteDir` | dossier du site servi par ce serveur (local). |
| `INSTALLER_PATH`, `INSTALLER_VERSION`, `INSTALLER_URL` | `installerPath`, `installerVersion`, `installerUrl` | vides. |
| `INSTALLER_FILENAME` | `installerFileName` | `RagoOptimizer-Setup.exe`. |
| `UPDATE_ROLLOUT` | `updateRollout` | 100 (pourcentage 0 à 100). |
| `UPDATE_PAUSED` | `updatePaused` | `1`, `true` ou `yes`. |
| `UPDATE_NOTES` | `updateNotes` | coupé à 500 caractères. |
| `GEOIP`, `GEOIP_CITY_URL`, `GEOIP_ASN_URL` | `geoip.on`, `geoip.city`, `geoip.asn` | actif sauf `0`, `off`, `false`, `no`. |
| `LICENSE_TOKEN_DAYS` | `licenseTokenDays` | 30. |
| `ROUTE_TESTERS` | `routeTesters` | e-mails séparés par des virgules, en minuscules ; utilisé seulement sur un serveur de test. |
| `SUBSCRIPTION_GRACE_DAYS` | `subscriptionGraceDays` | 3. |
| `AFFILIATE_GOAL` | `affiliateGoal` | 3. |
| `AFFILIATE_HOLD_DAYS` | `affiliateHoldDays` | 0 (choix de Sofiene, 07/10/2026 : compte dès l'activation). |
| `AFFILIATE_REWARD_MONTHS` | `affiliateRewardMonths` | 6. |
| `AFFILIATE_REWARD_MAX` | `affiliateRewardMax` | 1 (`??` : `0` est accepté et veut dire « sans limite »). |
| `AFFILIATE_MAX_REFERRALS` | `affiliateMaxReferrals` | `AFFILIATE_GOAL`, sinon 3. |
| `AFFILIATE_DISCOUNT_PERCENT` | `affiliateDiscountPercent` | 5. |
| `AFFILIATE_DISCOUNT_DURATION` | `affiliateDiscountDuration` | `once` ; `forever` seulement si écrit tel quel. |
| `LAUNCH_AT` | `launchAt` | voir `launchTime`. |
| `PREVIEW_KEY` | `previewKey` | ignorée sous 16 caractères. |
| `ADMIN_KEY` | `adminKey` | `/admin` fermé sous 16 caractères. |
| `CERVEAU_REPO`, `CERVEAU_BRANCH`, `CERVEAU_GITHUB_TOKEN`, `CERVEAU_DIR`, `CERVEAU_SOURCE` | `brainRepo` (`kaliso-dev/rago`), `brainBranch` (`staging`), `brainToken`, `brainDir`, `brainSource` (en minuscules) | le [[Cerveau du vault]] ([[brain.js]]) ; jeton nécessaire quand le dépôt est privé (PR #85 du Cerveau). |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID` | `discordClientId`… | les 5 variables du rôle Pro (avec le token). |
| `DISCORD_BOT_TOKEN` | `discordBotToken` | le préfixe `Bot ` collé depuis le Developer Portal est retiré. |
| `DISCORD_VIP_ROLE_ID`, `DISCORD_MVP_ROLE_ID`, `DISCORD_BOOST2_ROLE_ID` | `discordVipRoleId`, `discordMvpRoleId`, `discordBoost2RoleId` | récompenses Discord. |
| `DISCORD_COMMUNITY` | `discordCommunity` | `1`, `true` ou `yes`. |
| `DISCORD_WELCOME_CHANNEL_ID` | `discordWelcomeChannelId` | salon d'accueil. |
| `DISCORD_WELCOME_TEXT` | `discordWelcomeText` | `\n` → saut de ligne. |
| `DISCORD_INVITE_ROLES` | `discordInviteRoles` | `1`, `true` ou `yes`. |
| `DISCORD_VIP_INVITES`, `DISCORD_MVP_INVITES` | `discordVipInvites`, `discordMvpInvites` | 10 et 15 (`whole`). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `googleClientId`, `googleClientSecret` | vides = pas de bouton Google. |
| `DISCORD_LOGIN` | `discordLogin` | exactement `'1'`. |
| `EMAIL_VERIFICATION` | (sert à `verifyEmail`) | voir plus bas. |

Variables lues **ailleurs** que dans ce fichier : `DEV_SEED` ([[server.js]], [[local.js]]), `TEST_DATABASE_URL` (tests), `RAILWAY_GIT_COMMIT_SHA` et `RAILWAY_GIT_BRANCH` (page Services de [[admin.js (serveur)]]), `LICENSE_SIGNING_KEY` / `SESSION_SECRET` relues par `export-keys` ([[admin.js (script serveur)]]).

## Valeurs calculées

- `cfg.subscriptions` = au moins un prix mensuel **ou** annuel.
- `cfg.discord` = les 5 variables du rôle Pro présentes (et les identifiants valides, voir plus bas).
- `cfg.mailEnabled` = clé Resend **et** `MAIL_FROM` qui n'est pas un exemple (`example.com`, `your-domain`, `ragohub.com`).
- `cfg.verifyEmail` (code à 6 chiffres à l'inscription) = `EMAIL_VERIFICATION === '0'` ? non : `mailEnabled` **ou** `EMAIL_VERIFICATION === '1'` (en local, le code est écrit dans le terminal).
- `cfg.warnings` : liste des avertissements.

## Refus de démarrer (exceptions)

1. **Prod** (`NODE_ENV=production`) sans `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ou avec un `PUBLIC_URL` qui n'est pas en `https://` → `Missing production config: …`.
2. **Serveur de test** avec une clé Stripe live (`sk_live_` ou `rk_live_`) → « This is the "<env>" test server, but STRIPE_SECRET_KEY is a live key: real cards would be charged… ».

## Avertissements (le serveur démarre quand même)

Une valeur « d'exemple » correspond à `/\.\.\.|abcd|a_remplir|xxxx/i`.

- `SCRIPTS_SECRET` absent en prod (l'app 1.1.6+ affiche « Premium scripts unavailable »).
- `SITE_URL` absent (liens vers le site en 404) ou encore l'exemple (`ragohub.com`, `example.com`).
- Supabase absent en prod (photos gardées en mémoire, perdues au redémarrage) ; `SUPABASE_URL` encore l'exemple.
- `STRIPE_SECRET_KEY` qui n'est pas une clé secrète `sk_`/`rk_` (jamais la clé publique `pk_`) ; secret du webhook encore l'exemple.
- Aucun prix d'abonnement (« /buy shows "Checkout opens soon" »), avec un rappel si l'ancien `STRIPE_PRICE_ID` est encore là.
- `STRIPE_PRICE_LIFETIME` encore l'exemple, ou égal à un autre prix : **vidé** (Lifetime pas vendu).
- `RESEND_API_KEY` encore l'exemple (**vidée**) ou absente ; `MAIL_FROM` encore l'exemple alors que Resend est réglé.
- `SUPPORT_URL` ou `STRIPE_PORTAL_LOGIN_URL` encore l'exemple : **vidés** (lien caché).
- `LAUNCH_AT` qui n'est pas une date ; `PREVIEW_KEY` trop courte alors que le lancement est dans le futur.
- `ADMIN_KEY` trop courte en prod.
- Variables Discord partielles (1 à 4 sur 5).
- `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` ou `DISCORD_ROLE_ID` qui n'ont pas 17 à 20 chiffres : `cfg.discord = false`.
- `DISCORD_VIP_ROLE_ID`, `DISCORD_MVP_ROLE_ID`, `DISCORD_BOOST2_ROLE_ID` invalides : **vidés** (palier coupé) ; salon d'accueil invalide : vidé.
- `DISCORD_COMMUNITY=1` sans le bot : coupé ; `DISCORD_INVITE_ROLES=1` sans `DISCORD_COMMUNITY` : coupé.
- Serveur de test avec le bot Discord actif (il agit sur le vrai serveur Discord indiqué), ou avec `LICENSE_SIGNING_KEY` réglée (si c'est la clé de prod, ses licences débloquent la vraie app).
- Google réglé à moitié (une seule des deux clés).

## Liens avec le reste

Utilisé par tous les modules ; appelé par [[server.js]], [[admin.js (script serveur)]] et les tests. Les avertissements s'affichent dans les logs ([[server.js]]) et sur la page Services ([[admin.js (serveur)]]). Fiches : [[Variables d'environnement]], [[Railway]], [[Branches et environnements]], [[Clés et secrets]].

## Tests

« config accepts a bare host for PUBLIC_URL and flags example values », « staging server: named by Railway or APP_ENV, refuses live Stripe keys… », « config: off by default, on with DISCORD_COMMUNITY=1… » ([[Tests du serveur]]).

## À savoir avant de modifier

- `FREE_TWEAKS` = 11 par défaut alors que le plan gratuit décidé le 04/11/2026 compte 73 réglages (commit `e146ca2`, app seulement). La page compte affiche ces chiffres ([[views.js]]). Valeur réglée sur Railway : À VÉRIFIER.
- Ne jamais mettre de vraie valeur dans `.env.example` ni dans le vault : seulement des noms ([[Clés et secrets]]).
