---
type: technique
tags: [technique, serveur, architecture]
maj: 2026-11-10
---
# Architecture du serveur

Comment le code du serveur (`licensing/`) est organisé, état de `staging` au 10/11. Résumé et commandes support : [[Serveur de licences]]. Toutes les routes : [[API du serveur]]. Base : [[Supabase]]. Hébergement : [[Railway]]. Porte d'entrée : [[Reprendre le développement]].

## 1. Stack
Node ≥ 22.5 en modules ES, **sans framework de pages** : Hono 4 (routes) + `@hono/node-server`, HTML rendu par des fonctions (`views.js`, gabarits `html\`…\``), un seul script client (`public/account.js`). Dépendances : `hono`, `@hono/node-server`, `pg`, `stripe`, `sharp` (photos), `mmdb-lib` (bases DB-IP). En développement et en test : `@electric-sql/pglite` (Postgres en mémoire). Port 8787. Pages et e-mails en anglais ; `/admin` et les avertissements en français (seul Sofiene les lit).

## 2. Fichiers (`licensing/src/`)
| Fichier | Rôle |
|---|---|
| `server.js` | Démarrage : config, base, clés, Stripe, Discord, bot communauté, géolocalisation, tâches périodiques, `serve()` |
| `config.js` | **Toutes les variables d'environnement**, leurs valeurs par défaut et les avertissements (`cfg.warnings`) ; refuse de démarrer en prod sans `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_URL` en https ; refuse une clé Stripe live sur staging |
| `app.js` | `createApp()` : middlewares et **toutes les routes** (1 686 lignes) : pages de compte, achat, webhook, API `/api/v1` ; monte `/admin` (`mountAdmin` d'`admin.js`) |
| `db.js` | Connexion `pg.Pool` (ou PGlite), rejoue `supabase/schema.sql` au démarrage (6 essais), `claimDatabase` (une base = un environnement), `ensureKeys` (génère la clé de signature et le secret de session s'ils manquent, dans `server_secrets`), `audit()` |
| `licensing.js` | Comptes, sessions, codes d'inscription, identités Google/Discord, licences (création, réclamation, révocation, synchronisation d'abonnement, temps offert), activation sur un PC |
| `billing.js` | Stripe : Checkout, essai, Lifetime, codes promo d'affiliés, portail, traitement des webhooks, vérifications de `/admin` |
| `affiliates.js` | Parrainage : code, filleuls, récompense de 6 mois |
| `promo.js` | Pop-up de réduction du site (réglé dans `/admin`) |
| `discord.js` | REST Discord : liaison du compte, rôle Pro qui suit Premium, récompenses VIP/MVP/boost |
| `community.js` + `gateway.js` | Bot communauté : connexion gateway (WebSocket de Node, sans bibliothèque), arrivées, invitations comptées après 7 jours, commandes slash, message d'accueil ([[Bot communauté Discord]]) |
| `oauth.js` | Connexion Google et Discord ([[Connexion Google et Discord]]) |
| `installer.js` | Exe le plus récent du bucket `downloads`, lien signé 5 min, signature `.sig` pour la mise à jour |
| `network.js` + `geo.js` | Tests réseau de l'app ; bases DB-IP gratuites (`download.db-ip.com`, ≈150 Mo en mémoire, rechargées chaque mois) |
| `profile.js`, `reviews.js` | Nom public, photo (WebP 256 × 256 dans le bucket `avatars`), avis |
| `mailer.js` | E-mails par l'API Resend : achat (lien de réclamation), code d'inscription, abonnement annulé, mot de passe oublié. Sans clé : écrits dans les logs. Sur staging, sujet préfixé `[Test]` |
| `tokens.js`, `crypto.js`, `fingerprint.js` | JWT EdDSA, mots de passe scrypt (`scrypt$N$r$p$sel$hash`, NFKC), clés de licence, valeurs signées, empreinte PC et règle « 2 sur 3 » |
| `retention.js` | Purges promises par la politique de confidentialité |
| `views.js` | Toutes les pages HTML (compte, achat, connexion admin, messages) |
| `admin.js` + `admin-views.js` | [[Tableau de bord admin]] (`/admin/*`) : garde `ADMIN_KEY`, données, actions, pages (`staging` depuis le 10/11) ; son style et son script sont à part : `public/admin.css`, `public/admin.js` (PR #82) |
| `brain.js` + `brain-views.js` | [[Cerveau du vault]] (`/admin/cerveau`) : lit le dépôt sur GitHub (ou le disque en local), met le vault en graphe, sert les fichiers ; page dessinée par `public/cerveau.js` et `public/cerveau.css` (PR #85 du Cerveau, fusionnée dans `staging` le 10/11, pas en prod) |
| `sales.js` | Ventes lues dans Stripe pour `/admin` (gardées 5 min puis relues en arrière-plan, jours et mois en heure de Paris) |
| `support.js` | Suppression RGPD partagée par `/admin` et `npm run admin -- delete-user` |

Autres dossiers : `scripts/admin.js` (`npm run admin -- <commande>`, support), `scripts/local.js` (`npm run local`), `scripts/keys.js` (`npm run keys`, **à ne jamais lancer en prod**), `public/` (CSS, `account.js`, `admin.css` et `admin.js` de `/admin`, images des e-mails), `test/` (`flow.test.js`, `community.test.js`, `network.test.js`, `sales.test.js`), `docs/API.md` (contrat avec l'app), `docs/MISE-EN-LIGNE.md` (pas-à-pas de Sofiene), `docs/test/` (clé de test publique, utilisable seulement en local).

## 3. Démarrage (`server.js`)
1. `loadConfig()` puis affichage des avertissements.
2. Base : `openDb(DATABASE_URL, { envName })`, sinon PGlite en mémoire (tout est perdu au redémarrage). Le schéma est rejoué ; une base déjà marquée par un autre environnement est refusée.
3. `ensureKeys` puis `loadKeys` : clé Ed25519 de signature (variable `LICENSE_SIGNING_KEY` ou ligne de `server_secrets`).
4. `DEV_SEED=email:motdepasse` (sans base seulement) crée un compte Premium de test.
5. Stripe, mailer, Discord, bot communauté (`DISCORD_COMMUNITY=1`), géolocalisation chargée tout de suite.
6. `stripeChecks` : vérifie prix, webhook et portail dans le mode de la clé, avertit dans les logs.
7. Tâches périodiques (voir 5), puis écoute sur `PORT`.

## 4. Ce que fait chaque requête (middlewares de `app.js`)
- En-têtes de sécurité stricts (`secureHeaders`), sauf images des e-mails et photos (`cross-origin`).
- **Contrôle d'origine** des POST de formulaires (pas l'API ni le webhook) : refus 403 si `Origin` n'est pas le serveur.
- **Limite de taille** : 64 Ko par requête, 1 Mo pour le webhook, 5 Mo + 64 Ko pour une photo.
- Verrou d'avant lancement sur `/signup`, `/buy`, `/download`, `/affiliate` jusqu'à `LAUNCH_AT` (passé depuis le 10/10, donc inactif), contourné par le cookie `rago_preview` (`/acces/<PREVIEW_KEY>`).
- **Limites de débit en mémoire** (`rateLimiter`, une `Map` par processus, remise à zéro au redémarrage) : connexion 10 par email et IP et 50 par IP en 15 min, blocage après 20 échecs sur un email sauf pour une IP déjà connue ; inscription 10/h par IP et 5 e-mails de code/h par adresse ; code d'inscription 30 essais / 15 min ; mot de passe oublié 5/h par IP et 3/h par e-mail ; retour Google/Discord 30/h ; changement de mot de passe 10 / 15 min ; photo et avis 20/h ; Discord 10/h ; téléchargement 30/h ; connexion de l'app par le navigateur 30/h ; refresh 30/h par licence ; jeton Rago Route 60/h ; API compte 300/h ; mises à jour 120/h par IP (fichier 20/h) ; tests réseau 30/h par IP ; admin 10 essais/h. Tableau complet : [[app.js]].
- Adresse du visiteur : avec `TRUST_PROXY=1` (Railway), `X-Real-IP`, sinon le **dernier** saut de `X-Forwarded-For` (les précédents sont écrits par le client) ; sans, l'adresse de la connexion.
- Cookies : `rg_session` (session web, 30 jours, `httpOnly`, `SameSite=Lax`, `Secure` en prod), `rg_claim` (achat à rattacher, 2 jours, signé avec `SESSION_SECRET`), `rg_ref` (code d'affilié, 30 jours), `rg_signup` (inscription en attente du code, 24 h, chemin `/signup`), `rg_oauth` (connexion Google/Discord en cours : fournisseur, `state`, vérificateur PKCE, page de retour ; 10 min, chemin `/auth`), `rg_discord` (liaison du Discord en cours, 10 min, chemin `/account/discord`), `rago_preview` (30 jours), `rago_admin` (admin, 7 jours, chemin `/admin`, `SameSite=Strict`).
- Erreurs : sous `/api/` toujours au format `{ "error": { "code", "message" } }` (contrat de l'app) ; ailleurs une page HTML.

## 5. Tâches périodiques
| Quand | Quoi |
|---|---|
| 30 s après le démarrage puis toutes les heures | Affiliés à récompenser, fin des récompenses, codes d'affiliés recréés comme codes promo Stripe, abonnements remplacés par Lifetime arrêtés, purge des tests réseau de plus de 12 mois, purge de rétention (`retention.js` : journal `audit` 12 mois, arrivées Discord 12 mois après départ, codes d'inscription expirés depuis 1 jour, essais 2 ans) |
| Toutes les 5 min (avec les 5 variables Discord) | Rôle Pro remis en accord avec Premium pour les comptes qui ont changé |
| 1 min après le démarrage puis toutes les 24 h | Rôle Pro redonné à tous les comptes Premium liés (joueurs revenus sur le serveur) |
| Après chaque webhook Stripe | Synchronisation Discord |
| En continu (`DISCORD_COMMUNITY=1`) | Gateway Discord : arrivées, départs, invitations, commandes ; rôles VIP/MVP 2 min après le démarrage puis toutes les heures si `DISCORD_INVITE_ROLES=1` |
| 5 s après le démarrage (avec `ADMIN_KEY` et `DATABASE_URL`) | Préchargement des ventes Stripe et des contrôles de services de `/admin` |
| Au premier rapport réseau d'un nouveau mois | Rechargement des bases DB-IP (pas de minuteur) |

Ces tâches tournent **dans le processus web** : un seul réplica Railway doit tourner, sinon elles seraient faites deux fois et les limites de débit seraient partagées en deux.

## 6. Jetons signés par le serveur
Tous en JWT EdDSA avec la même clé (`tokens.js`), `typ` vérifié à chaque usage :
| `typ` | Durée | Usage |
|---|---|---|
| `license` | 30 jours au plus ; pour un abonné, fin de période payée + `SUBSCRIPTION_GRACE_DAYS` (3), au moins 24 h ; récompense : jusqu'à sa date | prouver Premium hors ligne dans l'app ; aussi Bearer pour `/api/v1/account/*` et `/route/token` |
| `access` | 15 min | entre la connexion et l'activation sur ce PC |
| `route` | 6 h (jamais après le jeton de licence) | ouvrir une session Rago Route ; vérifié hors ligne par la sortie Vultr avec `/api/v1/public-key` |

Autres secrets d'accès : session web (hash en base, `web_sessions`), jeton de compte de l'app (180 jours, `api_sessions`), réinitialisation de mot de passe (`password_resets`, 1 h), lien de réclamation d'achat (`claim_token_hash`). Les liens « se connecter depuis l'app » (`/auth/app-link/*`, 10 min) sont **gardés en mémoire** : un redémarrage du serveur les annule.

## 7. Garde-fous entre environnements
- Un serveur dont le nom d'environnement (`APP_ENV`, sinon `RAILWAY_ENVIRONMENT_NAME`) ressemble à `stag|test|preview|dev|pr-N` est un **serveur de test** : clé Stripe live refusée au démarrage, bandeau jaune sur chaque page, `[Test]` dans les e-mails, Rago Route réservé aux e-mails de `ROUTE_TESTERS`.
- `claimDatabase` : la première instance qui ouvre une base y écrit son nom (`server_secrets.environment`) ; une autre est refusée avant de rien modifier.
- Webhook signé avec le secret de l'autre mode Stripe (test/live) : accusé mais ignoré.
- Avertissements si staging a les variables Discord (il donnerait des rôles sur le vrai serveur) ou `LICENSE_SIGNING_KEY` (licences de test valables dans la vraie app).

## 8. Tests
`npm test` = `node --test --test-concurrency=1 test/*.test.js` : parcours complets avec Stripe simulé, sur PGlite, puis en CI aussi sur un vrai Postgres 16 (`TEST_DATABASE_URL`). La CI construit aussi l'image Docker et vérifie que `sharp` y produit un WebP. Voir [[CI GitHub Actions]] et [[Développer et tester]].

## Code

Une note par fichier, le graphe des imports, le trajet complet d'une requête et la liste des tables : [[Code du serveur]]. Routes et middlewares : [[app.js]] ; démarrage : [[server.js]] ; base : [[db.js]] et [[schema.sql]] ; variables : [[config.js]] ; tests : [[Tests du serveur]].
