---
type: procédure
tags: [technique, développement, tests]
maj: 2026-11-10
---
# Développer et tester

Comment lancer chaque brique sans toucher à la prod, et quels tests passer avant une PR. Guide écrit pour Sofiene (Mac) : `DEVELOPPEMENT.md` à la racine. Porte d'entrée : [[Reprendre le développement]].

## Ce qui change la prod, et rien d'autre
| Quoi | Déclencheur |
|---|---|
| Site `rago-optimizer.com` | fusion dans la branche de prod ([[Netlify]]) |
| Serveur `account.rago-optimizer.com` | fusion dans la branche de prod qui touche `licensing/` ([[Railway]]) |
| App chez les joueurs | exe + `.sig` déposés par Sofiene dans le bucket `downloads` du Supabase de prod, puis `INSTALLER_VERSION` ([[Publier une version]]) |
| Serveurs Rago Route | `install.sh` relancé par Sofiene sur les VPS ([[Infrastructure Rago Route]]) |

Tout le reste (branches, PR, aperçus Netlify, exe de la CI, staging, local) ne touche pas les joueurs.

## Prérequis
Node 22 (LTS) ; Python 3 (catalogue, site) ; Rust stable + outils de build Visual Studio C++ (seulement pour compiler l'app, sur Windows) ; Playwright + Chromium (seulement pour `build.py` du site ; dans un conteneur Claude, déjà installé).

## Serveur et site en local
```bash
cd licensing && npm install && npm run local     # http://localhost:8787
```
- `scripts/local.js` **retire** du terminal les variables de prod (`DATABASE_URL`, Resend, Supabase, Discord, clés) et toute clé Stripe live : impossible de toucher la prod par erreur.
- Base en mémoire (PGlite), vide à chaque redémarrage ; compte Premium `test@rago.dev` / `password123` (`DEV_SEED`) ; codes d'inscription et e-mails affichés dans le terminal ; le site est servi par le même serveur (`SITE_DIR`), source visible sur `/src/page.html`.
- Paiement : pas branché en local sauf avec des clés `sk_test_` (et la Stripe CLI pour les webhooks) ; sinon le tester sur staging.

## App en local
```bash
cd app && npm install && npm run window          # démo dans une fenêtre Chromium 1280 × 820 (Mac ou PC)
cd app && npm run dev                            # même chose sur http://localhost:1420
cd app && npm ci && npm run tauri dev            # vraie app, sur Windows, terminal administrateur
```
- **Démo navigateur** (`npm run window` / `dev`) : bandeau « Web demo, tweaks are simulated » ; réglages, infos du PC, licence et compte simulés. Connexion : n'importe quel e-mail et un mot de passe de 4 caractères ou plus ; e-mail commençant par `free` = compte sans Premium, par `other` = « already active on another PC ». Bascules de test dans `localStorage` : `rago.demoRestoreFail`, `rago.demoRepair`, `rago.demoNoGpu` = `1`.
- **Vraie app** (debug) : serveur `http://localhost:8787/api/v1` et clé de test `src-tauri/keys/test-public-key.pem` par défaut ; lancer `npm run local` à côté pour la licence. Elle modifie vraiment Windows : de préférence dans une machine virtuelle avec instantanés.
- **Exe de test sur un vrai Windows** : artefact `rago-optimizer-setup-STAGING` d'un run `app-windows` sur `staging` ([[CI GitHub Actions]], [[app-windows.yml]]) ; relié au serveur de staging, s'installe à côté du vrai. Attention : le run d'une **PR** produit `rago-optimizer-setup`, relié au serveur **de prod** (une branche de travail ne construit plus sur push depuis le 10/11).

## Staging (en ligne)
Serveur `https://rago-staging.up.railway.app`, site `https://staging--rago-optimiser.netlify.app`, Supabase `rago-staging`, Stripe test (`4242 4242 4242 4242`). Une PR fusionnée dans `staging` y part toute seule. Support : `DATABASE_URL=<base staging> npm run admin -- show <email>`. Voir [[Branches et environnements]].

## Tests à passer avant une PR
| Brique touchée | Commandes | Aussi en CI |
|---|---|---|
| `licensing/` | `npm test` (parcours complets, Stripe simulé, PGlite) | + vrai Postgres 16, + image Docker |
| `app/src/` | `npm run build` (TypeScript strict + Vite) | dans le build Windows |
| `app/src-tauri/` | `cargo test --manifest-path src-tauri/Cargo.toml` ; hors Windows, une partie seulement compile : `cargo check --target x86_64-pc-windows-msvc` si la cible est installée | tests complets sur Windows |
| Catalogue | `npm run catalog` puis `cargo test` ; puis `python3 docs/tools/catalogue_vault.py` et `python3 site/tools/sync_app.py` + `build.py` | — |
| `site/` | `python3 site/tools/build.py` (lance aussi `sync_partners.py` et `prerender.js`), commiter sources et pages générées ; `python3 site/tools/make_legal.py` si les pages légales changent | `site-check` (sans les pages légales) |
| `netlify/` (fonction edge) | `node --test netlify/launch-gate.test.mjs` : le 10/11, 7 tests sur 8 passent, celui de la date par défaut du lancement échoue (date passée) | — |
| `proxy/` | `python3 proxy/fabriquer-install.py` si `rago-route.py` ou `mcping.py` changent | — |

Test de bout en bout de la licence contre le serveur local : `cargo test --manifest-path src-tauri/Cargo.toml live_flow -- --ignored` (serveur `npm run local` lancé).

## Code
Notes de code utiles pour ces tests : site [[Code du site]] ([[build.py]], [[prerender.js]], [[make_legal.py]], [[launch-gate.js]]) ; CI [[Code de la CI et du dépôt]] ([[app-windows.yml]], [[licensing-tests.yml]], [[site-check.yml]]) ; guides de la racine (`README.md`, `DEVELOPPEMENT.md`, écarts connus) : [[Fichiers de la racine du dépôt]].

## Ce que Claude peut et ne peut pas faire
- Peut : lire et modifier le code, lancer les tests Node et Python, la démo de l'interface, `cargo check`/`cargo test` de ce qui compile hors Windows, lire GitHub (PR, CI) et Stripe (lecture).
- Ne peut pas : lancer l'app sur un vrai Windows, déposer un exe dans Supabase, changer une variable Railway ou Netlify, se connecter aux VPS. Ces gestes sont ceux de Sofiene ; Claude prépare et explique.
