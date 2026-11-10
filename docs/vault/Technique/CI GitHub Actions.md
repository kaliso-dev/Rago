---
type: technique
tags: [technique, ci, github]
maj: 2026-11-10
---
# CI GitHub Actions

Les trois workflows de `.github/workflows/`. Secrets et variables : [[Variables d'environnement]], [[Clés et secrets]]. ## Minutes GitHub Actions (étude du 10/11)
- **Le dépôt `kaliso-dev/rago` est public** (constaté le 10/11 par l'API GitHub ; Sofiene, q60 : « on build en public »). Sur un dépôt public, les machines standard de GitHub (Ubuntu, Windows) sont **gratuites et illimitées** : les trois workflows ci-dessous **ne consomment aucune des 3 000 minutes**.
- Les 3 000 minutes du compte `kaliso-dev` (offre Pro) ne servent qu'aux **dépôts privés**. Le 10/11, **100 % des minutes de novembre étaient utilisées** (e-mail GitHub). Responsable : la CI du dépôt privé **`kaliso-dev/network-server-rago`** (serveur Minecraft Rago : moteur de combat, lobby, practice, Bed Wars), workflow `ci.yml`, fil Claude de la branche `claude/project-thread-nukjdk`. Chaque push sur sa PR lance **9 jobs** (build, 2 tests KB, 2 tests lobby, 4 lancements du serveur de test dont 2 sous Windows, comptés double) : ≈ **27 minutes facturées** pour un run de 5 minutes. **151 runs du 08/11 au 10/11** (dont 25 annulés) : de quoi vider le quota en deux jours. Depuis le 10/11 vers 00:25, ses jobs échouent en 2 secondes (quota vide).
- Pistes comparées le 10/11 :
  - **GitLab** : non. L'offre gratuite donne 400 minutes par mois (moins que les 3 000 de GitHub), et Netlify, Railway, les PR et Claude sont branchés sur GitHub.
  - **Runner sur le PC de Sofiene** : gratuit (le péage de 0,002 $/min annoncé par GitHub pour mars 2026 est reporté), mais le PC doit être allumé et ce runner exécute le code de chaque push. **Jamais sur `rago`** (public : une PR d'inconnu pourrait lancer du code sur le PC) ; possible pour `network-server-rago` seulement.
  - **Moins de builds** sur `network-server-rago` : sur les PR, garder seulement le job `build` (≈ 3 min) et lancer les tests lourds (KB, lobby, serveur de test Windows) à la main ou sur `main` : ≈ 90 % de minutes en moins. **Recommandé**. Rendre ce dépôt public réglerait aussi tout : À VÉRIFIER avec Sofiene.
- **Décision de Sofiene (10/11, carte du fil « Régler le manque de minutes GitHub Actions ») : rendre `network-server-rago` public.** C'est à lui de le faire (Settings → Danger Zone → Change visibility). Historique vérifié le 10/11 avant le passage en public (174 commits, 11 branches) : aucun secret, aucune clé (`hypixel.cle-api` vide dans `config.yml`), seule adresse e-mail l'adresse « noreply » GitHub ; tout le code du moteur de combat, du lobby et du Bed Wars devient lisible par tous. Une fois public, sa CI ne consomme plus de minutes. Fait ou non : À VÉRIFIER.
- **Décision de Sofiene (10/11, fil) : `rago` doit repasser en privé** (« rago doit passer en privé mais y a plus de minutes ducoup »). Privé, il consommerait environ 2 500 minutes par mois (estimé sur les runs du 28/10 au 10/11 : exe Windows ≈ 18 min facturées par build) ; environ 1 900 si un push ne construit plus que `staging` (correctif fusionné le 10/11 dans `staging`, PR #78, et sur la branche de prod, PR #81). Ça tient dans les 3 000 si `network-server-rago` est public. Le quota de novembre étant vide, un `rago` privé ne construit plus rien avant le 1er décembre. **Plan de Sofiene (10/11)** : pas de budget (« je ne peux pas payer ») ; en novembre, `rago` reste public pour les builds et Sofiene le passe lui-même en privé quand il en a besoin ; privé pour de bon à partir de décembre. Basculer la visibilité automatiquement à chaque build a été déconseillé (code copié par des robots dès qu'il est public, contournement de la facturation, clé administrateur à stocker) et n'est pas fait. **Un build lancé pendant que `rago` est privé en novembre ne démarre pas.**

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
- Machine fixée sur `ubuntu-24.04` (PR #75, 10/11) : `ubuntu-latest` est Ubuntu 26.04 depuis le 09/11, et Playwright 1.56.1 ne s'y installe pas. À revoir en même temps que la version de Playwright.
- Installe Playwright 1.56.1 + Chromium (même version que celle qui a fabriqué les pages), lance `python3 site/tools/build.py`, échoue si `prerender.js` n'a pas tourné ou si `index.html`, `reviews.html`, `tweaks.html`, `partners.html` ou `route.html` diffèrent de ceux poussés. Correction : lancer `build.py` et commiter ([[Netlify]]).

## Lire un échec
GitHub → onglet **Actions** → le run → l'étape en rouge. Les messages d'erreur des étapes maison sont en français et disent quoi faire. Pour un exe : section **Artifacts** du run (connecté avec le compte `kaliso-dev`).
