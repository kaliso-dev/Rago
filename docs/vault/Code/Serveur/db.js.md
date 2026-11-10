---
type: code
tags: [code, serveur, javascript, base]
fichier: licensing/src/db.js
lignes: 163
maj: 2026-11-10
---
# db.js

Accès à Postgres (Supabase en production, PGlite en mémoire pour les tests et le local) : petite couche `all` / `get` / `run` / `tx`, rejeu du schéma au démarrage, garde-fou « une base = un environnement », journal d'audit et secrets générés par le serveur. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Supabase]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Tous les modules reçoivent un objet `db` créé ici par [[server.js]] (ou par les tests). Le SQL est écrit à la main dans chaque module, avec des `?` comme paramètres. Il n'y a pas d'ORM ni d'outil de migration : le fichier [[schema.sql]] est **rejoué à chaque démarrage** et ne contient que des changements idempotents.

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `SCHEMA` | Texte de `licensing/supabase/schema.sql`, lu une fois au chargement du module. |
| `applySchema(pg, url, local, {tries = 6, log})` | Rejoue le schéma sur une connexion dédiée, avec nouveaux essais. |
| `openDb(url, {envName})` | Ouvre la base Postgres (pool `pg`), vérifie le propriétaire, rejoue le schéma, réclame la base. Renvoie `db` (+ `db.close()`). |
| `claimDatabase(db, envName)` | Marque la base avec l'environnement du premier serveur qui l'ouvre, refuse un autre environnement. |
| `openMemoryDb()` | Base PGlite en mémoire avec le schéma (tests, local). |
| `audit(db, type, {licenseId, userId, detail})` | Ajoute une ligne au journal ([[Table audit]]) ; `detail` est stocké en `JSON.stringify`. |
| `ensureKeys(db, cfg)` | Remplit `cfg.signingKeyPem` et `cfg.sessionSecret` depuis l'environnement, sinon depuis la base (générés une fois). |

L'objet `db` a 4 méthodes :
- `all(sql, params)` → toutes les lignes ;
- `get(sql, params)` → la première ligne ou `null` ;
- `run(sql, params)` → `{changes}` (nombre de lignes touchées) ;
- `tx(fn)` → exécute `fn(txDb)` dans une transaction ; à l'intérieur d'une transaction, `tx` réutilise la même (pas de transaction imbriquée).

## Fonctionnement détaillé

- **Paramètres** : `toPg` remplace chaque `?` par `$1`, `$2`… dans l'ordre. Un `?` littéral dans une chaîne SQL serait donc remplacé aussi : ne pas en écrire.
- **Dates** : toutes les dates sont des `BIGINT` en millisecondes. Le parseur de type 20 (BIGINT) est remplacé par `Number` (pour `pg` et pour PGlite) : les dates arrivent en nombres JavaScript.
- **`openDb`** :
  1. `DATABASE_URL` obligatoire (message qui indique où la trouver dans Supabase) ;
  2. « local » si l'URL contient `@localhost` ou `@127.0.0.1` : pas de SSL ; sinon SSL avec `rejectUnauthorized: false` ;
  3. `Pool` : `max` **5** connexions, `connectionTimeoutMillis` **5000**, `query_timeout` **10000** (une base qui ne répond plus donne une erreur en quelques secondes, et `/healthz` répond 503) ;
  4. `pool.on('error')` : log `[db] idle connection lost:` (Supabase peut fermer une connexion inactive ; sans cet écouteur, Node planterait) ;
  5. transaction : `BEGIN`, `fn`, `COMMIT` ; en erreur `ROLLBACK` ; une connexion coupée pendant la transaction (log `[db] connection lost during a transaction:`) est **relâchée avec l'erreur**, donc fermée et non réutilisée ; la requête échoue en 500 sans arrêter le serveur ;
  6. si `envName` est donné : lecture de `server_secrets.environment` **avant** le rejeu du schéma (code `42P01` = table absente = base neuve, personne ne la possède) ; propriétaire différent → erreur ;
  7. `applySchema` ; 8. `claimDatabase`. En cas d'échec, le pool est fermé et l'erreur remonte (le serveur s'arrête).
- **`applySchema`** : client `pg` séparé (timeout de connexion 10 s), `SET lock_timeout = '5s'; SET statement_timeout = '60s'`, puis le schéma entier. Les `ALTER TABLE` demandent un court verrou exclusif : si une requête longue ou l'éditeur Supabase tient la table, on abandonne après 5 s côté base (rien ne reste en file derrière le verrou), puis on réessaie après `min(30, 2^essai)` secondes (2, 4, 8, 16, 30 s), **6 essais** en tout. Log `[db] schema not applied (attempt n/6: …), retrying in N s`.
- **Garde-fou d'environnement** (`refuseOtherOwner`) : message « This database belongs to the "<owner>" server, and this server is "<env>". Each server needs its own database… If this really is the "<owner>" server and its Railway environment was renamed, set APP_ENV=<owner>. » Un staging qui aurait gardé la `DATABASE_URL` de prod s'arrête donc **avant** de toucher au schéma.
- **`openMemoryDb`** : `new PGlite({parsers: {20: Number}})`, `exec(SCHEMA)`. PGlite n'a qu'une connexion : les transactions passent par `pglite.transaction`, qui les sérialise.
- **`secret(db, name, make)`** (interne) : `INSERT … ON CONFLICT (name) DO NOTHING` puis `SELECT` : sûr même si deux serveurs démarrent en même temps.
- **`ensureKeys`** : `license_signing_key` = clé privée Ed25519 PKCS#8 PEM générée ; `session_secret` = 32 octets aléatoires en hexadécimal. Utilisées seulement si `LICENSE_SIGNING_KEY` / `SESSION_SECRET` ne sont pas dans l'environnement.

## Données touchées

[[Table server_secrets]] (lignes `environment`, `license_signing_key`, `session_secret`), [[Table audit]], et toutes les tables via [[schema.sql]].

## Erreurs et cas limites

- Base d'un autre environnement → arrêt au démarrage (voulu).
- Schéma bloqué par un verrou plus de ~1 min au total → arrêt au démarrage ; Railway relance le conteneur.

## Liens avec le reste

Utilisé par tous les modules du serveur ; ouvert par [[server.js]], [[admin.js (script serveur)]] et les tests ([[Tests du serveur]]). Hébergement de la base : [[Supabase]] ; environnements : [[Branches et environnements]] ; clés : [[Clés et secrets]].

## Tests

`flow.test.js` : « keys generated once and kept in the database », « a database belongs to the first environment that opens it », et avec un vrai Postgres (`TEST_DATABASE_URL`) : connexion fermée par la base (inactive ou en pleine transaction), table verrouillée au démarrage, staging sur la base de prod ([[Tests du serveur]]).

## À savoir avant de modifier

- Les clés générées en base sont **les vraies clés** si les variables ne sont pas réglées : ne jamais vider [[Table server_secrets]] (`npm run admin -- export-keys` les affiche pour les sauvegarder, voir [[Clés et secrets]]).
- `max: 5` connexions : Supabase gratuit limite le nombre de connexions ; ne pas l'augmenter sans vérifier l'offre.
