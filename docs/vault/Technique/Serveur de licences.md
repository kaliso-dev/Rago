---
type: technique
tags: [technique, serveur]
maj: 2026-10-31
---
# Serveur de licences (`licensing/`)

https://account.rago-optimizer.com (aussi `rago-production.up.railway.app`, qui doit **rester actif** : les apps ≤ 1.1.7 l'ont en dur). Staging : `rago-staging.up.railway.app`. Voir [[Architecture]].

- **Stack** : Node ≥ 22.5 (ESM), Hono, Postgres (Supabase ; PGlite en dev), Stripe, Resend (emails `noreply@rago-optimizer.com`), sharp. Hébergé sur Railway (Root Directory `licensing`). Port 8787.
- **Modules** (`src/`) : `licensing.js`, `billing.js` (Stripe, abonnements, Lifetime), `affiliates.js`, `promo.js`, `discord.js` (rôle Pro, récompenses), `reviews.js`, `profile.js`, `installer.js` (lien signé 5 min vers l'exe le plus récent du bucket `downloads` + [[Mise à jour automatique]]), `oauth.js` ([[Connexion Google et Discord]]), `network.js` + `geo.js` ([[Proxy]]), `mailer.js`, `fingerprint.js`, `tokens.js`, `views.js`.
- Garde-fous : le staging refuse une clé Stripe live et une base réclamée par un autre environnement.
- Tests : `licensing-tests.yml` (78 tests verts le 29/10), aussi sur un vrai Postgres 16.
- **Clés immuables** : voir [[Clés et secrets]].

## Routes principales (prod, 31/10)
- **Site du compte** : `/signup` (+ `/signup/verify`, code à 6 chiffres), `/login`, `/forgot`, `/reset/:token`, `/auth/:provider` (Google, Discord), `/account` (page compte : téléchargement, licence, PC, avis, photo, Discord), `/account/discord` (liaison, rôle Pro), `/account/download`, `/claim/:token` (achat sans compte), `/affiliate`, `/reviews`.
- **Achat** : `/buy` (abonnement, `?promo=CODE`, `?ref=CODE`), `/buy/lifetime`, `/checkout/success`, webhook Stripe.
- **API de l'app** (`/api/v1/…`) : licence (connexion, activation, rafraîchissement), compte, `/plans`, `/promo`, `/public-key`, `/installer`, `/update/:target/:arch/:current` + `/update/file/:version` + `/update/status` ([[Mise à jour automatique]]), envoi des tests réseau ([[Test réseau]]).
- **Téléchargement** : `/download` (lien signé 5 min vers l'exe le plus récent du bucket `downloads`), `/download/status`.
- **Admin** (`/admin`, en français) : pop-up promo, vérification Stripe, `/admin/reseau` + `/admin/reseau.csv` ([[Proxy]]). `/acces/:key` : accès de l'équipe. `/healthz`.

## Commandes support (`npm run admin -- <commande>`)
`show <email>` (compte, licence, PC, événements, achats non rattachés) · `attach` · `claim-link` · `reset-link` (mot de passe, 1 h) · `reset-device` (libère le PC pour changer d'ordinateur) · `revoke` / `restore` · `grant` · `grant-months <n> <emails>` · `grant-days <n> <emails>` · `create-user` · `affiliate <email>` · `create-promo <CODE> <pourcent> [once|forever]` · `popup` (code, titre, texte, on/off, places) · `delete-user` (RGPD) · `export-keys` · `reviews` / `hide-review` / `show-review` · `remove-photo` · `set-name` · `discord [email]` / `discord-unlink`. `revoke` n'arrête pas l'abonnement Stripe.

Liens : [[Offres et prix]], [[Licence dans l'app]], [[Bot communauté Discord]], [[Discord]], [[Publier une version]].
