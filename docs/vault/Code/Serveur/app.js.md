---
type: code
tags: [code, serveur, javascript, api, hono]
fichier: licensing/src/app.js
lignes: 1686
maj: 2026-11-10
---
# app.js

Toutes les routes du serveur de comptes et licences : pages du site de compte (inscription, connexion, `/account`, achat), webhook Stripe et API `/api/v1` de l'app. Le fichier assemble les autres modules ; il ne contient presque pas de logique métier. Fiche parente : [[Code du serveur]]. Contrat de l'API côté app : [[API du serveur]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

[[server.js]] appelle `createApp({cfg, db, keys, stripe, mailer, log, fetchImpl, avatars, discord, community, oauth, geo})` puis sert l'objet Hono renvoyé. Les pages HTML viennent de [[views.js]] ; la logique vient de [[licensing.js]] (comptes, licences, PC), [[billing.js]] (Stripe), [[affiliates.js]], [[profile.js]], [[reviews.js]], [[promo.js]], [[network.js]], [[installer.js]], [[discord.js]], [[oauth.js]]. Le tableau de bord `/admin` est monté par `mountAdmin(app, …)` de [[admin.js (serveur)]].

## Ce que le fichier expose

- `createApp(deps)` → l'application Hono, plus `app.idle()` (attend la fin de la passe du bot Discord ; sert aux tests).
- `API_ERRORS` (non exporté) : code → [statut HTTP, message en anglais affichable tel quel par l'app] : `invalid_request` 400, `invalid_credentials` 401, `invalid_token` 401, `no_license` 403, `bound_to_other_device` 403, `revoked` 403, `account_banned` 403, `subscription_ended` 403 (message seulement, renvoyé sous le code `revoked`), `route_closed` 403, `rate_limited` 429, `no_subscription` 404, `billing_unavailable` 503, `link_expired` 410, `name_required`, `invalid_name`, `invalid_rating`, `empty_comment`, `comment_too_long`, `invalid_image` (400), `image_too_large` 413, `storage_unavailable` 503. En plus : `server_error` 500 (toute exception sous `/api/`), `not_found` 404 et `unavailable` 503 (fichier de mise à jour).

## Cycle d'une requête (middlewares, dans l'ordre)

1. **En-têtes de sécurité** : `/assets/email-*` et `/avatars/*` → `Cross-Origin-Resource-Policy: cross-origin` (images lues par les clients mail et le site). Chemins du serveur (`OWN` : `assets, download, buy, checkout, claim, signup, login, logout, forgot, reset, account, affiliate, webhooks, api, healthz, acces, admin, auth`) ou serveur sans `SITE_DIR` → **CSP stricte** : `default/style/font/script-src 'self'`, `img-src 'self' data:`, `form-action 'self'` + `checkout.stripe.com` + `billing.stripe.com`, `frame-ancestors 'none'`, `Referrer-Policy: same-origin` (avec `no-referrer`, les navigateurs envoient `Origin: null` et le contrôle suivant échoue). Le site servi par `SITE_DIR` n'a pas de CSP (styles et scripts en ligne).
2. **Contrôle d'origine** : tout `POST` hors `/api/` et `/webhooks/` dont l'en-tête `Origin` ne correspond ni à `Host`, ni à `X-Forwarded-Host` (avec `TRUST_PROXY`), ni à l'hôte de `PUBLIC_URL` → 403 « Forbidden ».
3. **Taille des corps** : webhook 1 Mo ; toute écriture 64 Ko ; envoi de photo (`/account/profile/photo`, `/api/v1/account/avatar`) 5 Mo + 64 Ko. Trop gros : JSON `image_too_large` sous `/api/`, redirection `?n=toolarge` pour le profil, sinon texte 413.
4. **Fichiers** `/assets/*` → dossier `public/` ([[Styles du serveur (CSS)]], [[admin.js (page admin)]], [[account.js]]).
5. **Verrou d'avant lancement** : jusqu'à `LAUNCH_AT`, `/signup`, `/buy`, `/buy/lifetime`, `/download`, `/affiliate`, `/affiliate/join` renvoient vers le site (ou 503 « Opening soon. »), sauf avec le cookie `rago_preview` = HMAC(`PREVIEW_KEY`, `rago-preview-v1`) en base64url, le même que la fonction Netlify `launch-gate` du [[Site]].

**Adresse du visiteur** (`ipOf`) : avec `TRUST_PROXY`, `X-Real-IP` (mis par Railway), sinon le **dernier** saut de `X-Forwarded-For` ; sinon l'adresse du socket.

**Limites de débit** (`rateLimiter`, en mémoire, purgée au-delà de 50 000 clés, perdue au redémarrage) :

| Clé | Limite |
|---|---|
| connexion site/app (`login`, `api-login`) | 10 / 15 min par IP + e-mail, 50 / 15 min par IP ; après 20 échecs sur un e-mail, seuls passent les IP qui ont déjà réussi (30 j) ou n'ont jamais échoué |
| `acces` | 20 / h par IP |
| `signup` / `signup-mail` | 10 / h par IP ; 5 e-mails de code / h par adresse |
| `signup-verify` / `signup-resend` | 30 / 15 min ; 10 / h par IP |
| `forgot` | 5 / h par IP et 3 / h par e-mail |
| `oauth` (callback) | 30 / h par IP |
| `password` | 10 / 15 min par compte |
| `avatar`, `review` | 20 / h par compte (site et app) |
| `discord`, `discord-sync` | 10 / h par compte |
| `download`, `download-status` | 30 / h par IP |
| `applink` | 30 / h par IP |
| `refresh` | 30 / h par licence |
| `route` | 60 / h par licence |
| `account-api` | 300 / h par compte |
| `update`, `update-file`, `update-status` | 120, 20, 30 / h par IP |
| `network` | 30 / h par IP |

**Cookies** (tous `HttpOnly`, `SameSite=Lax`, `Secure` en prod) :

| Nom | Contenu | Durée, chemin |
|---|---|---|
| `rg_session` | jeton de session ([[Table web_sessions]]) | 30 j |
| `rg_claim` | id de licence signé (HMAC `SESSION_SECRET`) | 2 j |
| `rg_ref` | code de parrainage | 30 j |
| `rg_signup` | id de la demande d'inscription signé | 24 h, `/signup` |
| `rg_oauth` | `fournisseur.state.verifier.next` signé | 10 min, `/auth` |
| `rg_discord` | `userId.state` signé | 10 min, `/account/discord` |
| `rago_preview` | passage d'avant lancement | 30 j, domaine du site si sous-domaine |
| `rago_admin` | voir [[admin.js (serveur)]] | 7 j, `/admin`, `Strict` |

## Routes des pages (site de compte)

| Méthode, chemin | Accès | Ce qu'elle fait |
|---|---|---|
| GET `/healthz` | public | `SELECT 1` → `{ok:true}` ou 503 `database unreachable`. |
| GET `/acces/:key` | public | Bonne clé `PREVIEW_KEY` → cookie `rago_preview` et `/signup` ; `sortir` l'efface ; sinon 404. |
| GET `/buy`, `/buy/lifetime` | public | Crée la session Stripe Checkout (voir plus bas) et redirige. |
| GET `/checkout/success` | public | `session_id` `cs_…` : `fulfillCheckoutSession`, `settleTrial`, e-mail, puis compte ou page de connexion/inscription. |
| GET `/claim/:token` | public | Lien de l'e-mail d'achat ; expiré → 410 « This link doesn't work anymore. ». |
| GET/POST `/signup` | public | E-mail ≤ 254, mot de passe 8 à 200. Avec `EMAIL_VERIFICATION` et un e-mail qui n'est pas celui de l'achat : code par e-mail (`startSignup`) et `/signup/verify` ; sinon compte créé, bienvenue, `/account/profile?welcome=1`. |
| GET/POST `/signup/verify`, POST `/signup/resend` | cookie `rg_signup` | Code : `wrong` (essais restants), `expired`, `locked` (429) ; audit `user.email_verified`. |
| GET/POST `/login` | public | Hachage factice pour un e-mail inconnu (même durée) ; compte banni → 403 ; rattache un achat en attente. |
| POST `/logout` | session | Supprime la session. |
| GET/POST `/forgot`, `/reset/:token` | public | Même réponse que l'e-mail existe ou non ; lien d'1 h ([[licensing.js]]). |
| GET `/auth/:provider`, `/auth/:provider/callback` | public | Connexion Google/Discord ([[oauth.js]]) ; erreurs `oauthcancel`, `oauthfail`, `oauthlimit`, `banned`, `googleemail`, `discordemail`, `googleother`, `discordother`. |
| GET/POST `/app/link/:id` | session | Confirme la connexion de l'app avec le code à 4 caractères. |
| GET `/account` | session | Tableau de bord (licence, PC, Discord, affiliation, avis, offre Lifetime aux comptes gratuits ou abonnés). |
| GET/POST `/account/password` | session | Mot de passe actuel demandé seulement s'il existe. |
| GET `/account/profile`, POST `…/photo`, `…/photo/remove`, `…/name`, `…/review/delete` | session | Profil public ([[profile.js]]). |
| GET/POST `/account/review`, POST `/account/review/delete` | session, Premium | Avis ([[reviews.js]]) ; 403 sans Premium. |
| GET `/avatars/:file` | public | Photo WebP, cache `immutable` d'un an. |
| POST `/account/billing` | session | Portail client Stripe, sinon `nobilling`. |
| GET `/account/discord`, `/callback`, POST `/sync`, `/unlink` | session | Liaison du Discord ([[discord.js]]). |
| GET `/affiliate`, POST `/affiliate/join` | public / session | Programme d'affiliation ([[affiliates.js]]). |
| GET `/download`, `/account/download`, `/download/status` | public / session | Installateur ([[installer.js]]) ; audit `download`. |
| POST `/account/reset-device` | session | Libère le PC soi-même (`SELF_SERVICE_RESET_DAYS`). |
| POST `/webhooks/stripe` | signature Stripe | Voir plus bas. |
| `/admin…` | `ADMIN_KEY` | [[admin.js (serveur)]]. |

**Achat (`buy`)** : compte qui a déjà Premium → `/account?n=owned` ; sans prix → 503 ; `?ref` → cookie `rg_ref` ; code promo `?promo` sinon celui de l'affilié (un affilié ne profite pas de son propre code) ; client Stripe précédent réutilisé ; `trial=1` seulement sans récompense en cours, sans licence passée et sans essai pour cet e-mail ([[Table trials]]) ; Lifetime d'un abonné → `replaces` (l'abonnement est arrêté après paiement). Doublon d'achat : `settleClaim` annule l'abonnement en trop, révoque la licence (`duplicate`) et l'audite.

**Webhook Stripe** : signature fausse → 400 « Bad signature » (journalisé au plus toutes les 10 min) ; événement de l'autre mode (test/live) → `{received:true, ignored:'other_mode'}` sans rien appliquer ; sinon `handleStripeEvent` ([[billing.js]]) avec l'e-mail d'achat, puis `discord.syncAll()` et vidage du cache du pop-up. `hookSeen` (dernier refus, dernier autre mode) est montré sur `/admin`.

## API `/api/v1` (app Windows)

| Méthode, chemin | Accès | Réponse |
|---|---|---|
| GET `/public-key` | public | `{alg:'EdDSA', crv:'Ed25519', kid, public_key_pem}` ; `?format=pem` → la clé seule. |
| POST `/auth/login` | e-mail + mot de passe + `device` | `active` + jeton, ou `activation_required` + `access_token` (15 min), ou erreur (`no_license` avec `buy_url`). |
| POST `/auth/app-link/start` | public | `{link_id, poll_token, code, url, interval:2, expires_in:600}` (liens en mémoire). |
| POST `/auth/app-link/poll` | `poll_token` | `{status:'pending'}` puis comme `/auth/login` ; `link_expired`. |
| POST `/licenses/activate` | `Bearer` access | Lie le PC et renvoie le jeton de licence. |
| POST `/licenses/refresh` | jeton de licence (même expiré) | Nouveau jeton ; une licence remplacée suit vers la nouvelle si c'est le même PC ; `invalid_token` si le PC a été libéré. |
| POST `/route/token` | `Bearer` licence | `{route_token, expires_at}` (6 h au plus) ; staging : `route_closed` hors `ROUTE_TESTERS` ([[Infrastructure Rago Route]]). |
| POST `/account/login` | e-mail + mot de passe | `{account_token, expires_at, account, review}` ([[Table api_sessions]]). |
| GET `/account/me` | licence ou compte | `{account:{email, name, avatar_url}, review}`. |
| GET `/account/subscription` | idem | `{subscription:{interval, trial, canceled, renews_at, ends_at, price}}` ou `null`. |
| POST `/account/subscription/cancel`, `/resume` | idem | `cancel_at_period_end` dans Stripe ; audits `subscription.canceled_in_app` / `resumed_in_app` ; e-mail à la résiliation ; `no_subscription`, `billing_unavailable`. |
| POST `/account/logout` | compte | Supprime la session API. |
| PUT/DELETE `/account/review` | idem | Avis (nom vérifié avant tout enregistrement) ; audits `review.saved` / `review.deleted`. |
| PUT `/account/name`, PUT/DELETE `/account/avatar` | idem | Nom ; photo (octets bruts) ; audit `profile.photo`. |
| GET `/reviews` | public, CORS `*` | Avis du site (cache 30 s ; `?all=1` = page des avis). |
| GET `/promo` | public, CORS `*` | Pop-up de réduction ([[promo.js]]), cache 30 s. |
| GET `/plans` | public, CORS `*` | `{lifetime, month, year, trial_days}` (cache 60 s). |
| GET `/installer` | public, CORS `*` | `{version}` de `INSTALLER_VERSION` (cache 5 min). |
| GET `/update/:target/:arch/:current` | public | 204 ou `{version, notes, pub_date, url, signature}` ([[Mise à jour automatique]]). |
| GET `/update/file/:version` | public | Redirection vers un lien signé de 5 min ; audit `update_download`. |
| GET `/update/status` | public | État de la mise à jour pour [[Publier une version]]. |
| POST `/network/report` | public | Rapport de [[Test réseau]] → 204. |

**Jeton de licence** (`licenseToken`) : `{typ:'license', iss, sub, email, plan:'premium', lic, did, tv, fp, iat, exp}`. Durée (`tokenExp`) : Lifetime → `LICENSE_TOKEN_DAYS` ; récompense → sa date de fin (1 h au moins) ; abonnement → fin de période + `SUBSCRIPTION_GRACE_DAYS`, entre 1 et 30 jours. `scripts_key` = HMAC-SHA256(`SCRIPTS_SECRET`, `rago-scripts-v1|<version de l'app>`) en base64, seulement dans les réponses `active`. Une licence arrêtée par la fin de l'abonnement répond `revoked` avec `reason: 'subscription_ended'` et `buy_url`.

**Comptes de l'API** (`apiUser`) : un `Bearer` à 3 parties est un jeton de licence (licence active, même `tv`, compte non banni) ; sinon un jeton de compte de `/account/login` (comptes gratuits compris).

**Mises à jour** : 204 si limite atteinte, cible autre que `windows/x86_64`, `UPDATE_PAUSED`, erreur du bucket, version pas plus récente (une préversion passe avant la finale), ou PC hors du déploiement : `sha256("rago-update|<version>|<X-Rago-Device ou ip>") mod 100 ≥ UPDATE_ROLLOUT`.

## Données touchées

Directement : [[Table audit]] (insertions), [[Table trials]] (lecture), [[Table licenses]] (lecture). Le reste passe par les modules.

## Erreurs

Route d'API inconnue → JSON `invalid_request` 404 ; exception → `server_error` 500 « Couldn't reach the license server… » ; page inconnue → page 404 « Page not found. » ; exception sur une page → « Something went wrong. ».

## Tests

Presque tout `flow.test.js` passe par ces routes avec un mini navigateur ([[Tests du serveur]]).

## À savoir avant de modifier

- Une nouvelle route d'API doit garder la forme `{error:{code, message}}` : l'app affiche `message` tel quel ([[Voix et ton]]).
- `/app/link/…` n'est pas dans `OWN` : avec `SITE_DIR` (seulement en local avec `npm run local`, voir [[local.js]] ; « non utilisée » en ligne d'après [[Variables d'environnement]]), cette page n'a pas la CSP stricte. Sans `SITE_DIR`, la CSP stricte s'applique partout. À ajouter à `OWN` si `SITE_DIR` sert un jour en ligne.
- Les liens de connexion de l'app, les limites de débit et les caches sont en mémoire : un seul réplica ([[Railway]]).
