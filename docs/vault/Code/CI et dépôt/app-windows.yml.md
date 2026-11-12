---
type: code
tags: [code, ci, github-actions, yaml, app]
fichier: .github/workflows/app-windows.yml
lignes: 189
maj: 2026-11-10
---
# app-windows.yml

Le workflow GitHub Actions qui teste le moteur Rust de l'app et fabrique l'installateur Windows (NSIS) de Rago Optimizer, en version de prod ou de test (« Rago Optimizer Staging »). Fiche parente : [[Code de la CI et du dépôt]]. Fonctionnalité : [[CI GitHub Actions]], [[Publier une version]].

Tout ce qui suit est CONFIRMÉ (fichier de `staging`, 10/11) sauf mention. Commentaires en français. Historique : créé le 07/10 (`6c2bcad`), scripts Premium chiffrés (`29a1e67`, 07/10), exe de test et secrets `STAGING_*` (PR #22, 10/10), mises à jour signées (RAG-24, `623ed71`, 17/10), PresentMon (RAG-82, `6d5bf29`, 17/10), numéro de version de test (`a22b6ad`, 28/10), refus d'une adresse sans `https://` (`f8e6557`, 29/10), push limité à `staging` et aux tags (`0b8995b`, 10/11, PR #78 sur `staging` et #81 en prod).

## Rôle et place dans l'ensemble
- Seul moyen de produire un exe : personne ne compile l'app à la main pour la distribuer. L'exe produit n'est **pas** publié automatiquement : Sofiene télécharge l'artefact et le dépose dans Supabase ([[Publier une version]], [[Mise à jour automatique]]).
- Il compile le code de `app/` ([[Code de l'app (Rust)]], [[Configuration Tauri]], [[Installateur NSIS]]).

## Déclencheurs (`on:`)
| Événement | Condition | Cible du serveur |
|---|---|---|
| `workflow_dispatch` (bouton « Run workflow ») | entrées `server` (`production` par défaut, ou `staging`) et `version` (texte, vide par défaut ; « Serveur staging seulement ») | celle choisie |
| `push` | branche **`staging` seulement**, ou tag `app-v*` ; fichiers `app/**` ou ce workflow (GitHub n'applique pas le filtre de chemins aux tags) | `staging` pour la branche, `production` pour un tag |
| `pull_request` | toute PR qui touche `app/**` ou ce workflow | `production` (le nom de la référence d'une PR n'est jamais `staging`) |

Commentaire du fichier : les autres branches sont construites par leur pull request, pour ne pas construire deux fois le même commit (« minutes GitHub Actions comptées double sous Windows »). Une PR produit donc un exe **relié au serveur de prod** (artefact `rago-optimizer-setup`), même quand elle vise `staging` ; seul un push sur `staging` (après fusion) ou un lancement manuel « staging » produit l'exe de test.

Aucun tag `app-v*` ni aucune release n'existe le 10/11 (OBSERVÉ par l'API GitHub) : la voie « release » n'a jamais servi.

## Réglages généraux
- `concurrency` : groupe `app-windows-<ref>-<server>-<version>`, `cancel-in-progress: true` (un nouveau push annule le build en cours de la même branche ; un lancement manuel avec un autre serveur ou une autre version a son propre groupe).
- `permissions: contents: write` (nécessaire pour le brouillon de release des tags).
- `defaults.run.working-directory: app`.
- Un seul job, `windows`, sur `windows-latest`.

## Étapes du job `windows`
1. **« Choisir le serveur et vérifier les secrets »** (bash, à la racine). `TARGET = staging` si la branche est `staging` ou si l'entrée `server` vaut `staging`, sinon `production`. `STRICT` = vrai sauf pour une PR.
   - Secrets lus (noms) : `RAGO_API_BASE`, `RAGO_LICENSE_PUBKEY`, `STAGING_RAGO_API_BASE`, `STAGING_RAGO_LICENSE_PUBKEY`, `RAGO_SCRIPTS_SECRET` ; variables : `SITE_URL`, `STAGING_SITE_URL`.
   - Manque l'adresse ou la clé publique de la cible, ou `RAGO_SCRIPTS_SECRET` (« même valeur que SCRIPTS_SECRET sur Railway ») : erreur et arrêt (`::error::`), sauf en PR (simple avertissement : une PR n'a pas toujours accès aux secrets).
   - Cible staging dont l'adresse d'API est celle de prod : arrêt (« STAGING_RAGO_API_BASE est l'adresse du vrai serveur »).
   - Adresse qui ne correspond pas à `^https://[^/[:space:]]+/` : arrêt (sinon l'exe échoue avec « relative URL without a base »).
   - Écrit dans `GITHUB_ENV` : `RAGO_TARGET`, `RAGO_API_BASE`, `VITE_ACCOUNT_URL` (même valeur), `VITE_SITE_URL`, `VITE_RAGO_SERVER=staging` (exe de test seulement) et `RAGO_LICENSE_PUBKEY` (sur plusieurs lignes, délimiteur `RAGO_PUBKEY_END`).
2. `actions/checkout@v4`.
3. `actions/setup-node@v4` : Node 22, cache npm sur `app/package-lock.json`.
4. `dtolnay/rust-toolchain@stable`.
5. `swatinem/rust-cache@v2` sur `app/src-tauri`.
6. **« Exe de test, nom et identifiant à part »** (si `RAGO_TARGET == staging`) : fusionne `src-tauri/tauri.staging.conf.json` dans `src-tauri/tauri.conf.json` : `productName` et `mainBinaryName` « Rago Optimizer Staging », `identifier` `gg.rago.optimizer.staging`. L'exe de test s'installe à côté du vrai.
7. **« Mises à jour signées »** : avec le secret `TAURI_SIGNING_PRIVATE_KEY` **et** la variable `RAGO_UPDATER_PUBKEY`, met `bundle.createUpdaterArtifacts = true` et `plugins.updater.pubkey` dans `tauri.conf.json` (« Exe avec mise à jour automatique ») ; sinon avertissement « Exe sans mise à jour automatique » et on continue.
8. **« PresentMon (FPS de la barre en jeu) »** : télécharge `PresentMon-*-x64.exe` de la release `v2.3.0` du dépôt `GameTechDev/PresentMon` (sinon la dernière release), avec le jeton automatique du workflow. Le fichier n'est gardé que si sa signature Authenticode est valide et que le sujet du certificat contient `O=Intel Corporation` (vérifié par PowerShell `Get-AuthenticodeSignature`). Copié en `src-tauri/resources/PresentMon.exe` avec sa licence (`PresentMon-LICENSE.txt`, lue par l'API GitHub). Sinon : avertissement, exe sans FPS dans la [[Barre en jeu]].
9. `npm ci`.
10. **« Numéro de version de test »** (lancement manuel avec `version` non vide) : refuse si la cible n'est pas staging ou si le numéro n'est pas `x.y.z` ; `npm pkg set version=…` et remplacement de la première ligne `version = "…"` de `src-tauri/Cargo.toml` ([[Cargo.toml]]). Sert à tester la mise à jour automatique (une « 1.2.1 de test proposée à une 1.2.0 Staging installée »).
11. **« Tests du moteur »** : `cargo test --manifest-path src-tauri/Cargo.toml`. Un test rouge arrête le build.
12. `tauri-apps/tauri-action@v0` : construit le front (`npm run build`), le binaire Rust en release et l'installateur NSIS. Environnement : `RAGO_SCRIPTS_SECRET` (chiffre les scripts Premium dans l'exe), `TAURI_SIGNING_PRIVATE_KEY` et `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (signature des mises à jour), `VITE_SUPPORT_URL` (variable `SUPPORT_URL`, invitation Discord du support ; vide = pas de bouton d'aide). Paramètres : `projectPath: app`, `tagName` = nom du tag seulement pour un tag et une cible prod (sinon vide, donc pas de release), `releaseName: Rago Optimizer <ref>`, `releaseDraft: true`.
13. `actions/upload-artifact@v4` : artefact `rago-optimizer-setup-STAGING` (exe de test) ou `rago-optimizer-setup` (prod), contenant `app/src-tauri/target/release/bundle/nsis/*.exe` et `*.exe.sig`. Pas de durée de conservation fixée dans le fichier : c'est le réglage du dépôt (90 jours par défaut chez GitHub, À VÉRIFIER dans les réglages).

## Durée et coût (OBSERVÉ, API GitHub, 10/11)
- 238 exécutions depuis la création. Sur les 100 dernières (21/10 → 10/11) : 66 réussies, 26 échouées (21 en 3 à 6 secondes, machine jamais démarrée : quota de minutes vide le 21/10 et le 28/10 ; 5 vrais échecs le 21/10), 8 annulées.
- Durée d'une exécution réussie : 5,0 min au mieux, **7,7 min en médiane depuis le 04/11**, 13,4 min au plus depuis le 04/11 (jusqu'à 28 min sans cache).
- Le dépôt étant public, ces minutes Windows sont gratuites ; s'il redevient privé, chaque minute Windows compte double (voir [[CI GitHub Actions]]).

## Différences avec la branche de prod (10/11)
La version de la branche de prod a les mêmes déclencheurs (PR #81) mais pas : l'entrée `version`, le groupe de concurrence par serveur et version, la vérification `https://`, l'étape « Mises à jour signées », l'étape PresentMon, ni le `.exe.sig` dans l'artefact. Peu importe pour les exe : on les fabrique depuis `staging`, une PR ou un lancement manuel.

## Fichier voisin trompeur
`app/ci/build-windows.yml` est une **ancienne copie** (07/10, push sur toutes les branches), hors de `.github/workflows/` : GitHub ne l'exécute pas.

## Liens avec le reste
- Secrets et variables (noms, rôle) : [[Variables d'environnement]], [[Clés et secrets]] (la clé de signature des mises à jour ne doit jamais changer).
- Ce que l'exe embarque : clé publique de licence et adresse du serveur ([[Licence dans l'app]]), scripts chiffrés ([[seal.rs]]), mise à jour ([[update.rs]], [[Mise à jour automatique]]), PresentMon ([[fps.rs]], [[Barre en jeu]]).
- Suite de la publication : [[Publier une version]], [[Branches et environnements]].

## À savoir avant de modifier
- Ne jamais donner à l'exe de test les secrets de prod : la première étape l'empêche, garder ce contrôle.
- Le nom de l'artefact sert aux procédures ([[Publier une version]], [[Développer et tester]]) : le changer demande de mettre ces notes à jour.
- Ajouter une branche aux déclencheurs `push` double le travail des PR : c'est ce que le 10/11 a supprimé.
