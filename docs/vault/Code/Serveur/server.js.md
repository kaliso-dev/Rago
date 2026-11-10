---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/server.js
lignes: 85
maj: 2026-11-10
---
# server.js

Point d'entrée du serveur (`npm start`) : lit la configuration, ouvre la base, charge la clé de signature, crée les services (Stripe, Discord, bot communauté, géolocalisation, e-mails), monte l'application Hono, lance les tâches périodiques et écoute sur le port. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Serveur de licences]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

C'est le seul fichier qui a des effets de bord au chargement. Tous les autres modules exportent des fonctions ou des fabriques (`createX`). Il est lancé par `npm start` (`node src/server.js`) dans le conteneur Docker de Railway ([[Railway]]), par `npm run dev` (avec `--watch`) et par `npm run local` via [[local.js]].

## Fonctionnement détaillé (ordre exact au démarrage)

1. `loadConfig()` ([[config.js]]) ; chaque avertissement est affiché `[warn] …`. Une config de prod incomplète **lève une erreur** : le processus s'arrête.
2. Serveur de test (`cfg.staging`) : log `[env] "<nom>" test server: Stripe test keys only, a banner on every page, [Test] in email subjects.`
3. Base : `openDb(DATABASE_URL, {envName})` ([[db.js]]) ; sans `DATABASE_URL`, `openMemoryDb()` (PGlite en mémoire : tout est perdu au redémarrage).
4. `ensureKeys(db, cfg)` puis `loadKeys(cfg.signingKeyPem)` ([[tokens.js]]).
5. **`DEV_SEED=email:motdepasse`**, seulement **sans** `DATABASE_URL` : crée le compte et lui offre une licence à vie (`grantLicense(db, email, 'dev seed')`), log `[dev] Premium account … created`.
6. Services :
   - `createStripe(cfg)` ([[billing.js]]) : `null` sans clé ;
   - `createDiscord(cfg, {db, stripe})` ([[discord.js]]) : `null` sans les 5 variables du rôle Pro ;
   - `createCommunity(cfg, {db, discord})` ([[community.js]]) seulement si `cfg.discordCommunity` ;
   - `createGeo(cfg)` puis `geo.load()` **tout de suite** ([[geo.js]]) : les bases DB-IP (~150 Mo) sont lues au démarrage, pas au premier test ;
   - `createApp({cfg, db, keys, stripe, mailer: createMailer(cfg), discord, community, geo})` ([[app.js]], [[mailer.js]]).
7. Si Stripe est configuré : `stripeChecks(stripe, cfg, {db})` en arrière-plan ; log `[stripe] <test|live> mode`, puis `[warn] Stripe, <libellé> : <texte>` pour chaque contrôle non OK, et un avertissement s'il reste des licences actives venant d'achats en mode test.
8. Tâches périodiques (voir ci-dessous).
9. `community.start()` si le bot communauté est actif (connexion à la gateway, [[gateway.js]]).
10. Avertissements finaux si `DATABASE_URL` ou `STRIPE_SECRET_KEY` manque (« /buy and the webhook are disabled »).
11. `serve({fetch: app.fetch, port: cfg.port})` ; log `Rago licensing on <PUBLIC_URL> (port <port>)`.

## Tâches périodiques lancées ici

| Tâche | Fréquence | Ce qu'elle fait |
|---|---|---|
| Balayage horaire `sweep` | toutes les **60 min**, premier passage **30 s** après le démarrage | 1) `affiliatesToEvaluate` → `settleAffiliate` pour chaque affilié ([[affiliates.js]]) ; 2) `expireRewards` ([[licensing.js]]) ; 3) `syncAffiliatePromos` ([[billing.js]]) ; 4) `stopAllReplacedSubscriptions` ([[billing.js]]) ; 5) `purgeNetworkReports` ([[network.js]]) ; 6) `purgeOldRecords` ([[retention.js]]). Chaque bloc a son `try/catch` et son message (`[affiliate] sweep failed`, `[stripe] Lifetime sweep failed`, `[network] purge failed`, `[retention] purge failed`). |
| Rôle Pro Discord | toutes les **5 min** | `discord.syncAll()` : comptes liés dont le Premium a changé sans événement Stripe. |
| Rôle Pro Discord, passe complète | toutes les **24 h**, et une fois **60 s** après le démarrage | `discord.syncAll({all: true})` : rend le rôle aux joueurs partis puis revenus. |

D'autres minuteurs vivent ailleurs : passe des rôles VIP/MVP du bot communauté (toutes les heures, 2 min après le démarrage, [[community.js]]), préchargement de l'admin 5 s après le démarrage ([[admin.js (serveur)]]), rechargement mensuel des bases DB-IP déclenché par un rapport réseau ([[geo.js]]). Tous les minuteurs sont `unref()`.

## Données touchées

Indirectement toutes les tables (via les modules). Variables lues directement ici : `DEV_SEED` (en plus de [[config.js]]).

## Liens avec le reste

Importe [[config.js]], [[db.js]], [[tokens.js]], [[billing.js]], [[mailer.js]], [[app.js]], [[discord.js]], [[community.js]], [[geo.js]], [[network.js]], [[retention.js]], [[affiliates.js]], [[licensing.js]]. Vue d'ensemble : [[Architecture du serveur]].

## À savoir avant de modifier

- Les tâches tournent **dans le processus web** : le service Railway doit garder **un seul réplica**, sinon chaque tâche (et le bot Discord) tourne en double ([[Railway]]).
- Un échec de l'une des étapes du balayage n'empêche pas les suivantes, sauf à l'intérieur du premier bloc (affiliation, récompenses, codes promo : un échec arrête les deux autres).
