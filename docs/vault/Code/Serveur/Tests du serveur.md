---
type: code
tags: [code, serveur, tests]
fichier: licensing/test/
lignes: 4110
maj: 2026-11-10
---
# Tests du serveur

Les tests automatiques du serveur de comptes et licences : `npm test` dans `licensing/` (`node --test --test-concurrency=1 test/*.test.js`, un fichier après l'autre). Ils tournent sans réseau : Stripe, Discord, Supabase, Resend et DB-IP sont simulés. Fiche parente : [[Code du serveur]]. Lancer et déboguer : [[Développer et tester]].

(code de `staging`, 10/11)

## Les fichiers

| Fichier | Lignes | Tests | Sujet |
|---|---|---|---|
| `flow.test.js` | 3345 | 84 (dont 3 « real Postgres ») | Parcours complets à travers [[app.js]] |
| `community.test.js` | 419 | 11 | [[community.js]] et [[gateway.js]] |
| `network.test.js` | 193 | 5 | [[network.js]] et [[geo.js]] |
| `sales.test.js` | 106 | 4 | [[sales.js]] |
| `brain.test.js` | 256 | 7 | [[brain.js]], routes du [[Cerveau du vault]] |
| `mmdb.js` | 86 | — | Outil : `writeMmdb(entries, type)` écrit un petit fichier MaxMind (arbre IPv6, enregistrements de 24 bits) pour simuler DB-IP |


## Outils de `flow.test.js`

- **`testDb()`** : PGlite en mémoire par défaut (`openMemoryDb` de [[db.js]]). Avec `TEST_DATABASE_URL`, une vraie base Postgres, **effacée** au début de chaque test (`DROP SCHEMA public CASCADE`) ; refusée si l'hôte n'est pas `localhost`/`127.0.0.1`/`::1`/`postgres` et que le nom de la base ne contient pas « test ».
- **`setup(env, extra)`** : config de test (`PUBLIC_URL=http://localhost`, prix `price_123`, secret de webhook de test, faux installateur), clés générées en base, **Stripe simulé** (sessions Checkout, abonnements, coupons et codes promo, paiements, solde, portail), faux mailer qui garde les messages, application créée par `createApp`.
- **Mini navigateur** (`browse`) qui garde les cookies et envoie des formulaires de même origine ; `api(…)` pour l'API de l'app ; `webhook(…)` qui signe un événement Stripe ; `device(…)` qui fabrique une empreinte de PC ([[fingerprint.js]]).

## Ce que couvre `flow.test.js` (par thème)

- **Achat et licence** : achat → webhook → page de succès → compte → téléchargement ; succès avant le webhook (une seule licence) ; lien de l'e-mail utilisable une fois ; achat connecté et achat en double ; achat sur un e-mail qui a déjà Premium ; conditions d'utilisation au paiement ; pas de prix Stripe → paiement fermé.
- **App** : connexion, activation, un seul PC, réinstallation tolérée, rafraîchissement, remboursement ; `scripts_key` ; libération du PC par le support ou soi-même ; activations simultanées sur deux PC ; jeton Rago Route (6 h, `ROUTE_TESTERS` sur staging) ; connexion de l'app par le navigateur (code des deux côtés, compte gratuit, lien expiré).
- **Abonnements et Lifetime** : mensuel/annuel, résiliation, fin, reprise, remboursement ou litige ; essai gratuit de 3 jours (carte déjà utilisée → payé tout de suite) ; Lifetime (prix propre, passage d'un abonné, remboursement, appels Stripe limités à un par minute) ; abonnement vu et résilié depuis l'app.
- **Affiliation et cadeaux** : code à 5 %, 3 joueurs, récompense de 6 mois, relance horaire si Stripe refuse, `AFFILIATE_REWARD_MAX=0`, mois et jours offerts par l'équipe (`grant-months`, `grant-days`).
- **Promotions** : `/buy?promo=…`, code refusé par Stripe, pop-up du site réglé depuis `/admin`.
- **Comptes** : mot de passe, verrouillage contre les inconnus, contrôle d'`Origin` par hôte, 404 de l'API en JSON, code d'inscription à 6 chiffres (5 erreurs bloquent, expiration, renvoi), boutons Google/Discord, connexion Google/Discord ([[oauth.js]]).
- **Avis et profil** : avis depuis l'app et le site, suppression, 60 derniers sur l'accueil ; photo de profil depuis l'app et le site, stockage Supabase simulé ([[reviews.js]], [[profile.js]]).
- **Discord** : rôle Pro, une liaison par compte, récompenses VIP/MVP/boosts ([[discord.js]]).
- **Serveur** : site servi par `SITE_DIR` sans CSP stricte, site sur une autre origine, installateur Supabase et mises à jour automatiques ([[installer.js]]), version de l'installateur, clés gardées en base, config, e-mails, staging qui refuse les clés live, base réservée au premier environnement ([[db.js]]), verrou d'avant lancement, purge des anciennes données ([[retention.js]]).
- **Admin** : `/admin` en 404 sans `ADMIN_KEY`, contrôles de mise en ligne (prix, webhook, portail), clés de test, prix Lifetime, et « /admin dashboard: players, Premium time, revoke, ban, gifts, sales, journal (2026-11-10) » ([[admin.js (serveur)]]).
- **Vraie base** (seulement avec `TEST_DATABASE_URL`) : connexion coupée par la base, table verrouillée au démarrage, staging sur la base de prod arrêté avant le schéma.

## Les autres fichiers

- **`community.test.js`** : faux REST Discord (`fakeRest`), horloge fixée au 12/10/2026, identifiants Discord fabriqués à la date voulue. Tests : config, ids et âge des comptes, comptage après 7 jours, départs/retours/comptes jeunes/auto-invitations, URL personnalisée et invitation épuisée, commandes et droits du staff, liens partenaires, VIP par le comptage Rago, texte de `/growth`, enregistrement des commandes et contrôles, gateway (identification, reprise, intent manquant).
- **`network.test.js`** : faux DB-IP (fichiers gzip écrits avec `mmdb.js`) ; rapport gardé avec ville et fournisseur mais jamais l'IP, contrôle de ce que l'app envoie, limite par adresse, sans base de villes, page `/admin/reseau`, CSV, suppression après 12 mois.
- **`sales.test.js`** : remboursements et échecs, revenu mensuel ; jours et mois qui commencent à minuit à Paris (été et hiver) ; lecture unique puis cache et relecture en arrière-plan ; paiements en $US convertis par Stripe comptés en € (PR #84).
- **`brain.test.js`** (PR #85 du Cerveau) : petit écrivain d'archives tar comme celles de GitHub, faux GitHub (`fetchImpl`). Tests : markdown échappé (aucun `<script>`, `onerror` ni `javascript:`) ; tableaux, listes, cases, encadrés, en-têtes ; graphe (liens, liens cassés, fichiers cités, phrase de contexte) ; archive avec noms longs ; lecture GitHub (une archive par commit, cache d'une minute, panne, dépôt privé sans jeton, jeton envoyé, branche absente) ; vault réel lu sur le disque ; routes protégées, page sans code en ligne, `ETag` et 304, gzip, fichier hors liste en 404.

## Intégration continue

Le workflow [[licensing-tests.yml]] lance `npm test` deux fois (PGlite, puis Postgres 16 avec `TEST_DATABASE_URL`) à chaque push sur `staging` ou la branche de prod et sur chaque pull request qui touche `licensing/`, puis construit l'image Docker et vérifie que `sharp` y produit un WebP. Railway peut attendre ce résultat avant de redéployer ([[Railway]]).

## À savoir avant de modifier

- Ne jamais mettre une vraie base dans `TEST_DATABASE_URL` : les tests l'effacent (garde-fou sur le nom, voir plus haut).
- Les clés de test (`docs/test/test-public-key.pem`, `docs/test/test.env`) servent seulement aux tests ; ne jamais recopier leur contenu.
- `--test-concurrency=1` : les fichiers ne tournent pas en parallèle (avec `TEST_DATABASE_URL`, ils partagent la même base, effacée à chaque test).
