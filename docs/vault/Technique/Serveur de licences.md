---
type: technique
tags: [technique, serveur]
maj: 2026-11-10
---
# Serveur de licences (`licensing/`)

https://account.rago-optimizer.com (aussi `rago-production.up.railway.app`, qui doit **rester actif** : les apps ≤ 1.1.7 l'ont en dur). Staging : `rago-staging.up.railway.app`. Voir [[Architecture]]. Fonctionnement interne (démarrage, middlewares, limites, cookies, tâches) : [[Architecture du serveur]] ; toutes les routes : [[API du serveur]] ; Stripe : [[Paiements Stripe]] ; base : [[Supabase]] ; hébergement : [[Railway]] ; variables : [[Variables d'environnement]].

- **Stack** : Node ≥ 22.5 (ESM), Hono, Postgres (Supabase ; PGlite en dev), Stripe, Resend (emails `noreply@rago-optimizer.com`), sharp. Hébergé sur Railway (Root Directory `licensing`). Port 8787.
- **Modules** (`src/`) : `server.js` (démarrage), `app.js` (toutes les routes), `config.js` (variables), `db.js` (Postgres/PGlite, `schema.sql`), `crypto.js`, `licensing.js`, `billing.js` (Stripe, abonnements, Lifetime), `affiliates.js`, `promo.js`, `discord.js` (rôle Pro, récompenses), `community.js` + `gateway.js` (bot communauté, `staging`), `retention.js` (nettoyage des vieilles données), `reviews.js`, `profile.js`, `installer.js` (lien signé 5 min vers l'exe le plus récent du bucket `downloads` + [[Mise à jour automatique]]), `oauth.js` ([[Connexion Google et Discord]]), `network.js` + `geo.js` ([[Proxy]]), `mailer.js`, `fingerprint.js`, `tokens.js`, `views.js` (pages du compte), `admin.js` + `admin-views.js` ([[Tableau de bord admin]]), `sales.js` (ventes Stripe de `/admin`), `support.js` (suppression RGPD), `brain.js` + `brain-views.js` ([[Cerveau du vault]], PR #85 du Cerveau). Une note par fichier : [[Code du serveur]].
- Garde-fous : le staging refuse une clé Stripe live et une base réclamée par un autre environnement.
- Tests : `npm test` (PGlite) ; CI `licensing-tests.yml` aussi sur un vrai Postgres 16 et l'image Docker ([[CI GitHub Actions]]).
- **Clés immuables** : voir [[Clés et secrets]].

## Routes principales (prod, 31/10 ; liste complète avec celles de `staging` seulement : [[API du serveur]])
- **Site du compte** : `/signup` (+ `/signup/verify`, code à 6 chiffres), `/login`, `/forgot`, `/reset/:token`, `/auth/:provider` (Google, Discord), `/account` (page compte : téléchargement, licence, PC, avis, photo, Discord), `/account/discord` (liaison, rôle Pro), `/account/download`, `/claim/:token` (achat sans compte), `/affiliate`, `/reviews`.
- **Achat** : `/buy` (abonnement, `?promo=CODE`, `?ref=CODE`), `/buy/lifetime`, `/checkout/success`, webhook Stripe.
- **API de l'app** (`/api/v1/…`) : licence (connexion, activation, rafraîchissement), compte, `/plans`, `/promo`, `/public-key`, `/installer`, `/update/:target/:arch/:current` + `/update/file/:version` + `/update/status` ([[Mise à jour automatique]]), envoi des tests réseau ([[Test réseau]]), jeton Rago Route `POST /route/token` (08/11, Premium actif seulement, 6 h ; sur staging, e-mails de `ROUTE_TESTERS` seulement ; voir [[Proxy]] ; sur `staging` depuis le 08/11, pas en prod).
- **Téléchargement** : `/download` (lien signé 5 min vers l'exe le plus récent du bucket `downloads`), `/download/status`.
- **Admin** (`/admin`, en français) : en prod, pop-up promo, vérification Stripe et Discord, `/admin/reseau` + `/admin/reseau.csv` ([[Proxy]]). Sur `staging` depuis le 10/11 (PR #77), pas encore en prod : le [[Tableau de bord admin]] complet (joueurs, accès, bannissement, ventes Stripe, services, journal). `/acces/:key` : accès de l'équipe. `/healthz`.

## Commandes support (`npm run admin -- <commande>`)
Avec la PR #77, chacune a son bouton dans le [[Tableau de bord admin]] (sauf `export-keys` et `create-user`).

`show <email>` (compte, licence, PC, événements, achats non rattachés) · `attach` · `claim-link` · `reset-link` (mot de passe, 1 h) · `reset-device` (libère le PC pour changer d'ordinateur) · `revoke` / `restore` · `grant` · `grant-months <n> <emails>` · `grant-days <n> <emails>` · `create-user` · `affiliate <email>` · `create-promo <CODE> <pourcent> [once|forever]` · `popup` (code, titre, texte, on/off, places) · `delete-user` (RGPD) · `export-keys` · `reviews` / `hide-review` / `show-review` · `remove-photo` · `set-name` · `discord [email]` / `discord-unlink` · `growth [jours]` (arrivées Discord par source, comme `/growth`). `revoke` n'arrête pas l'abonnement Stripe. Détail de chaque commande : [[admin.js (script serveur)]].

Liens : [[Offres et prix]], [[Licence dans l'app]], [[Bot communauté Discord]], [[Discord]], [[Publier une version]].

## Code

Carte du code (fichiers, imports, trajet d'une requête, tâches de fond, achat → licence → app, tables) : [[Code du serveur]]. Points d'entrée : [[server.js]], [[app.js]], [[config.js]], [[db.js]] ; base : [[schema.sql]] ; tests : [[Tests du serveur]] ; documentation du dossier : [[Documentation et configuration du serveur]].
