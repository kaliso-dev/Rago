---
type: référence
tags: [technique, configuration, variables]
maj: 2026-11-10
---
# Variables d'environnement

**Noms seulement, jamais de valeur** ([[Clés et secrets]] : ce qu'il ne faut jamais changer). Source de vérité du serveur : `licensing/src/config.js` (lecture, défauts, avertissements) et `licensing/.env.example` (modèle commenté). Ajouter une variable = ces deux fichiers + `licensing/docs/MISE-EN-LIGNE.md` + cette note.

## Railway (serveur `licensing/`)
Obligatoires en prod (sinon le serveur refuse de démarrer) : `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_URL` (https).

| Groupe | Variables | Défaut / effet |
|---|---|---|
| Base | `NODE_ENV` (`production`), `PORT` (8787), `PUBLIC_URL`, `SITE_URL`, `TRUST_PROXY=1`, `APP_ENV` (`staging` sur le serveur de test ; sinon `RAILWAY_ENVIRONMENT_NAME`) | sans `DATABASE_URL` : base en mémoire |
| Supabase | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AVATAR_BUCKET` (`avatars`) | [[Supabase]] |
| Installateur et mises à jour | `INSTALLER_VERSION`, `INSTALLER_OBJECT` (`downloads/RagoOptimizer-Setup.exe`, repli), `INSTALLER_FILENAME`, `INSTALLER_URL`, `INSTALLER_PATH`, `UPDATE_ROLLOUT` (100), `UPDATE_PAUSED`, `UPDATE_NOTES` | [[Mise à jour automatique]] |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_LIFETIME`, `STRIPE_PRICE_ID` (ancien, plus vendu), `STRIPE_PORTAL_LOGIN_URL`, `TRIAL_DAYS` (3 ; 0 = sans essai ; staging), `CHECKOUT_CANCEL_URL`, `PRICE_LABEL`, `SUBSCRIPTION_GRACE_DAYS` (3) | [[Paiements Stripe]] |
| Clés | `LICENSE_SIGNING_KEY`, `SESSION_SECRET` (générées et gardées dans `server_secrets` si absentes), `SCRIPTS_SECRET` (= secret GitHub `RAGO_SCRIPTS_SECRET`), `LICENSE_TOKEN_DAYS` (30) | **immuables** |
| E-mails | `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, `EMAIL_VERIFICATION` (vide = code à l'inscription quand les e-mails partent ; 0 = coupé ; 1 = forcé) | sans clé : e-mails dans les logs |
| Support et admin | `SUPPORT_URL`, `ADMIN_KEY` (≥ 16 caractères, ouvre `/admin`), `SELF_SERVICE_RESET_DAYS` (0 = PC libéré par le support seulement), `FREE_TWEAKS`, `PREMIUM_TWEAKS` (chiffres affichés sur le tableau de bord gratuit) | |
| Affiliation | `AFFILIATE_GOAL` (3), `AFFILIATE_HOLD_DAYS` (0), `AFFILIATE_REWARD_MONTHS` (6), `AFFILIATE_REWARD_MAX` (1), `AFFILIATE_MAX_REFERRALS` (3), `AFFILIATE_DISCOUNT_PERCENT` (5), `AFFILIATE_DISCOUNT_DURATION` (`once`) | [[Promotions et affiliation]] |
| Lancement | `LAUNCH_AT`, `PREVIEW_KEY` | inutiles depuis le 10/10 |
| Connexion Google/Discord | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_LOGIN=1` (bouton Discord ; utilise `DISCORD_CLIENT_ID`/`SECRET`) | [[Connexion Google et Discord]] |
| Discord, rôle Pro (les 5 ensemble) | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID` | **à retirer du staging** (sinon rôles donnés sur le vrai Discord) |
| Discord, récompenses | `DISCORD_VIP_ROLE_ID`, `DISCORD_MVP_ROLE_ID`, `DISCORD_BOOST2_ROLE_ID` | |
| Discord, bot communauté | `DISCORD_COMMUNITY=1`, `DISCORD_WELCOME_CHANNEL_ID`, `DISCORD_WELCOME_TEXT`, `DISCORD_INVITE_ROLES=1`, `DISCORD_VIP_INVITES` (10), `DISCORD_MVP_INVITES` (15) | code sur `staging` et dans la PR #71 ([[Bot communauté Discord]]) |
| Tests réseau | `GEOIP` (`off` pour couper), `GEOIP_CITY_URL`, `GEOIP_ASN_URL` | [[Test réseau]] |
| Rago Route | `ROUTE_TESTERS` (e-mails, staging seulement ; ignorée en prod) | [[Infrastructure Rago Route]] ; ajoutée par Sofiene sur Railway staging (10/11, q55) |
| Variante un seul domaine | `SITE_DIR` | non utilisée |
| Développement | `DEV_SEED=email:motdepasse` (compte Premium au démarrage, base en mémoire), `TEST_DATABASE_URL` (tests sur vrai Postgres) | jamais en prod |

Sur staging, à **ne pas** mettre : `LICENSE_SIGNING_KEY`, `SESSION_SECRET` (le staging fabrique les siennes), toutes les `DISCORD_*` (sauf serveur Discord de test), `INSTALLER_OBJECT`. Clés Stripe : toujours `sk_test_` et les prix/webhook de test.

## GitHub (Settings → Secrets and variables → Actions)
| Type | Nom | Usage |
|---|---|---|
| Secret | `RAGO_API_BASE`, `RAGO_LICENSE_PUBKEY` | serveur de prod compilé dans l'exe |
| Secret | `STAGING_RAGO_API_BASE`, `STAGING_RAGO_LICENSE_PUBKEY` | exe de test |
| Secret | `RAGO_SCRIPTS_SECRET` | chiffrement des scripts Premium (**= `SCRIPTS_SECRET` de Railway, immuable**) |
| Secret | `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | signature des mises à jour (**immuable, à sauvegarder hors du PC**) |
| Variable | `SITE_URL`, `STAGING_SITE_URL`, `SUPPORT_URL`, `RAGO_UPDATER_PUBKEY` | liens de l'app, clé publique de mise à jour |

## Netlify
`STAGING_ACCOUNT_URL` (aperçus et staging), `PREVIEW_KEY`, `LAUNCH_AT` ([[Netlify]]).

## App, à la compilation (posées par la CI)
`RAGO_API_BASE`, `RAGO_LICENSE_PUBKEY`, `RAGO_SCRIPTS_SECRET` (Rust, `build.rs`) ; `VITE_SITE_URL`, `VITE_ACCOUNT_URL`, `VITE_SUPPORT_URL`, `VITE_RAGO_SERVER` (interface) ; `TAURI_CONFIG` (facultatif : identifiant de l'app, sinon lu dans `tauri.conf.json`). Effets : [[Architecture de l'app]].

## Serveurs Rago Route (Vultr)
Aucune variable : `install.sh` installe tout, la sortie lit la clé publique sur `/api/v1/public-key` ([[Infrastructure Rago Route]]).
