---
type: technique
tags: [technique, serveur]
maj: 2026-11-01
---
# Serveur de licences (`licensing/`)

https://account.rago-optimizer.com (aussi `rago-production.up.railway.app`, qui doit **rester actif** : les apps ≤ 1.1.7 l'ont en dur). Staging : `rago-staging.up.railway.app`. Voir [[Architecture]].

- **Stack** : Node ≥ 22.5 (ESM), Hono, Postgres (Supabase ; PGlite en dev), Stripe, Resend (emails `noreply@rago-optimizer.com`), sharp. Hébergé sur Railway (Root Directory `licensing`). Port 8787.
- **Modules** (`src/`) : `licensing.js`, `billing.js` (Stripe, abonnements, Lifetime), `affiliates.js`, `promo.js`, `discord.js` (rôle Pro, récompenses), `community.js` + `gateway.js` ([[Bot communauté Discord]], sur `staging` ; en attente pour la prod), `reviews.js`, `profile.js`, `installer.js` (lien signé 5 min vers l'exe le plus récent du bucket `downloads` + [[Mise à jour automatique]]), `oauth.js` ([[Connexion Google et Discord]]), `network.js` + `geo.js` ([[Proxy]]), `mailer.js`, `fingerprint.js`, `tokens.js`, `views.js`.
- **Pages** : espace compte, `/admin` (en français : pop-up promo, vérification Stripe, `/admin/reseau`).
- **Commandes support** : `npm run admin -- …` (`grant-days`, `grant-months`, `revoke`, `create-promo`, `delete-user`, `export-keys`…). `revoke` n'arrête pas l'abonnement Stripe.
- Garde-fous : le staging refuse une clé Stripe live et une base réclamée par un autre environnement.
- Tests : `licensing-tests.yml` (78 tests verts le 29/10), aussi sur un vrai Postgres 16.
- **Clés immuables** : voir [[Clés et secrets]].

Liens : [[Offres et prix]], [[Discord]], [[Publier une version]].
