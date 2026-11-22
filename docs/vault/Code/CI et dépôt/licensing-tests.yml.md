---
type: code
tags: [code, ci, github-actions, yaml, serveur]
fichier: .github/workflows/licensing-tests.yml
lignes: 64
maj: 2026-11-10
---
# licensing-tests.yml

Le workflow GitHub Actions qui lance les tests du serveur de comptes et de licences (`licensing/`) sur une base en mémoire puis sur un vrai Postgres 16, et vérifie que l'image Docker de Railway sait traiter les photos de profil. Fiche parente : [[Code de la CI et du dépôt]]. Fonctionnalité : [[CI GitHub Actions]], [[Serveur de licences]].

Tout ce qui suit est CONFIRMÉ (fichier de `staging`, 10/11) sauf mention. Créé le 07/10 (`6c2bcad`) ; job `image` ajouté le 09/10 avec les photos de profil (`14363e2`, PR #5) ; push limité à `staging` et à la prod le 10/11 (`0b8995b`). Identique sur la branche de prod.

## Rôle et place dans l'ensemble
- Garde-fou du serveur : chaque modification de `licensing/` passe ces tests avant d'être fusionnée.
- Commentaire de tête : « Railway attend ce résultat avant de redéployer si « Wait for CI » est activé » (réglage côté Railway, voir [[Railway]] ; son état réel est À VÉRIFIER dans Railway).

## Déclencheurs
| Événement | Condition |
|---|---|
| `workflow_dispatch` | à la main |
| `push` | branches `staging` et `claude/rago-monorepo-initial-eyj6pq` (prod) seulement, fichiers `licensing/**` ou ce workflow (« les autres branches sont testées par leur pull request ») |
| `pull_request` | toute PR qui touche `licensing/**` ou ce workflow |

`concurrency` : groupe `licensing-tests-<ref>`, le nouveau run annule l'ancien. `permissions: contents: read`. Dossier de travail : `licensing`.

## Job `test` (ubuntu-latest)
- **Service** `postgres:16`, port `5432`, mot de passe jetable écrit dans le fichier (base de test du runner, vide, détruite à la fin), contrôle de santé `pg_isready` toutes les 5 s (10 essais).
- Étapes : `actions/checkout@v4` ; `actions/setup-node@v4` (Node 22, cache npm sur `licensing/package-lock.json`) ; `npm ci` ;
  - « Tests (base en mémoire, PGlite) » : `npm test` = `node --test --test-concurrency=1 test/*.test.js` ;
  - « Tests (vraie base Postgres 16) » : `npm test` avec la variable `TEST_DATABASE_URL` pointant sur le service local. Le test `flow.test.js` refuse toute base qui n'est pas jetable (hôte local ou nom contenant « test »).
- Fichiers de test (10/11) : `flow.test.js` (parcours complets : achat, licence, webhooks Stripe simulés, environ 84 tests), `community.test.js`, `network.test.js`, `sales.test.js`, `brain.test.js` et l'aide `mmdb.js` ; 4 366 lignes au total. Détails : notes du serveur ([[Architecture du serveur]]).

## Job `image` (ubuntu-latest)
1. `docker build -t rago-licensing .` dans `licensing/` : la même image que Railway (`licensing/Dockerfile` : `node:22-alpine`, `npm ci --omit=dev`, `src`, `public`, `scripts`, `supabase`, port 8787, `npm start`).
2. « Photo de profil dans l'image » : dans un conteneur, `sharp` crée un JPEG 600 × 400, `processAvatar()` de `src/profile.js` ([[profile.js]]) le convertit ; le test échoue si le résultat n'est pas un **WebP de 256 px de large**, sinon il affiche `avatar ok webp 256x256`. But : vérifier que la bibliothèque native `sharp` se charge bien sous Alpine.

## Durée (OBSERVÉ, API GitHub, 10/11)
219 exécutions depuis la création. Sur les 100 dernières (15/10 → 10/11) : 76 réussies, 12 échouées (toutes en 4 à 5 s les 21, 25 et 28/10 : machine jamais démarrée), 12 annulées. Durée d'une exécution réussie : **6,3 min en médiane depuis le 04/11** (2,8 à 7,4 min). Les deux jobs tournent en parallèle ; le plus long est `test` (deux passages de la suite).

## Liens avec le reste
- Code testé : [[Serveur de licences]], [[Architecture du serveur]], [[billing.js]], [[profile.js]].
- Déploiement qui en dépend : [[Railway]].
- Tests à lancer soi-même avant une PR : [[Développer et tester]].

## À savoir avant de modifier
- `--test-concurrency=1` : les tests partagent la base, ne pas les paralléliser.
- Le job `image` construit l'image à chaque fois (pas de cache Docker) : c'est voulu, c'est le seul contrôle de l'image avant Railway.
