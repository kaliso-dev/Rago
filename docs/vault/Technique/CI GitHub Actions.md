---
type: technique
tags: [technique, ci, github]
maj: 2026-11-10
---
# CI GitHub Actions

Les trois workflows de `.github/workflows/`. Secrets et variables : [[Variables d'environnement]], [[Clés et secrets]]. Les minutes GitHub Actions peuvent s'épuiser (vu le 21/10) : vérifier Settings → Billing and plans si un run ne démarre pas.

## `app-windows.yml` : fabrique l'installateur
- **Déclencheurs** : push sur toute branche qui touche `app/**` ou le workflow ; tags `app-v*` (brouillon de release) ; PR qui touche `app/**` ; à la main (**Run workflow**) avec `server` = `production` ou `staging` et `version` (numéro de test, staging seulement).
- **Concurrence** : un build par branche (et par serveur/version demandés), le nouveau annule l'ancien.
- **Machine** : `windows-latest`, Node 22, Rust stable (cache `swatinem/rust-cache`).
- **Étapes** :
  1. « Choisir le serveur et vérifier les secrets » : cible `staging` si la branche est `staging` ou si on l'a choisi, sinon `production`. Prend `RAGO_API_BASE`/`RAGO_LICENSE_PUBKEY`/`SITE_URL` ou leurs versions `STAGING_*`. **Échoue** (hors PR) s'il manque un secret ou `RAGO_SCRIPTS_SECRET`, si l'API de staging est celle de prod, ou si l'adresse ne commence pas par `https://`. Écrit `RAGO_API_BASE`, `VITE_ACCOUNT_URL`, `VITE_SITE_URL`, `VITE_RAGO_SERVER=staging`, `RAGO_LICENSE_PUBKEY` dans l'environnement.
  2. Exe de test : fusionne `tauri.staging.conf.json` dans `tauri.conf.json` (nom « Rago Optimizer Staging », identifiant `gg.rago.optimizer.staging`).
  3. « Mises à jour signées » : avec `TAURI_SIGNING_PRIVATE_KEY` et `RAGO_UPDATER_PUBKEY`, active `createUpdaterArtifacts` et met la clé publique dans l'exe ; sinon exe sans mise à jour automatique (avertissement).
  4. PresentMon v2.3.0 (Intel, MIT) téléchargé depuis `GameTechDev/PresentMon`, **gardé seulement s'il est signé par Intel**, copié dans `src-tauri/resources/` avec sa licence ; sinon exe sans FPS dans la [[Barre en jeu]].
  5. `npm ci` ; numéro de version de test éventuel (`npm pkg set version`, `Cargo.toml`).
  6. **Tests du moteur** : `cargo test --manifest-path src-tauri/Cargo.toml`.
  7. `tauri-apps/tauri-action@v0` : `npm run build` + `cargo build --release` + NSIS, avec `RAGO_SCRIPTS_SECRET`, `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)`, `VITE_SUPPORT_URL`. Sur un tag `app-v*` de prod : brouillon de release.
  8. Artefact **`rago-optimizer-setup`** (prod) ou **`rago-optimizer-setup-STAGING`** : le `.exe` et son `.exe.sig`. Conservé 90 jours.
- Durée : ≈5 min (15 à 20 sans cache). Le fichier `app/ci/build-windows.yml` est une ancienne copie, **pas** le workflow actif.

## `licensing-tests.yml` : teste le serveur
- **Déclencheurs** : push ou PR qui touche `licensing/**` ; à la main.
- Job `test` (Ubuntu, service Postgres 16) : `npm ci`, `npm test` sur PGlite, puis `npm test` avec `TEST_DATABASE_URL` (vrai Postgres).
- Job `image` : construit `licensing/Dockerfile` (l'image de Railway) et vérifie que `sharp` y convertit une photo en WebP 256 px.
- Railway attend ce résultat si « Wait for CI » est actif ([[Railway]]).

## `site-check.yml` : vérifie les pages générées
- **Déclencheurs** : push ou PR qui touche `site/**` ; à la main.
- Installe Playwright 1.56.1 + Chromium (même version que celle qui a fabriqué les pages), lance `python3 site/tools/build.py`, échoue si `prerender.js` n'a pas tourné ou si `index.html`, `reviews.html`, `tweaks.html`, `partners.html` ou `route.html` diffèrent de ceux poussés. Correction : lancer `build.py` et commiter ([[Netlify]]).

## Lire un échec
GitHub → onglet **Actions** → le run → l'étape en rouge. Les messages d'erreur des étapes maison sont en français et disent quoi faire. Pour un exe : section **Artifacts** du run (connecté avec le compte `kaliso-dev`).
