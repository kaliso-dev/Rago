---
type: code
tags: [code, app, rust, build]
fichier: app/src-tauri/build.rs
lignes: 66
maj: 2026-11-10
---
# build.rs

Script de compilation de Cargo, lancé avant chaque build de l'app : il refuse la clé de licence de test en release, chiffre les scripts et les fichiers natifs dans l'exe, fixe l'identifiant de l'app, et intègre le manifeste Windows. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnement : [[Architecture de l'app]], [[Développer et tester]].

Tout est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble
- Compile [[seal.rs]] (`#[path = "src/seal.rs"] mod seal;`) et inclut [[embed_scripts.rs]] (`include!`) : les mêmes fonctions de chiffrement servent au build et à l'app.
- Produit dans `OUT_DIR` les fichiers inclus par `include_bytes!` dans [[catalog.rs]] (`scripts.plain.sealed`, `scripts.sealed`) et [[assets.rs]] (`LowLatency.pow.sealed`, `extremelatencylow.nip.sealed`).
- Pose la variable de compilation `RAGO_IDENTIFIER`, lue par `env!` dans [[reset.rs]] (`IDENTIFIER`), [[instance.rs]], [[assets.rs]] et [[lib.rs]] (`server_name`).
- Lancé par `cargo build`, `npm run tauri build` et la CI ([[CI GitHub Actions]]).

## Fonctionnement détaillé (`main`)
1. **`guard_test_key()`** : en profil `release`, si la variable `RAGO_LICENSE_PUBKEY` est posée, elle est comparée (espaces et `\n` retirés) au contenu de `keys/test-public-key.pem` ; si c'est la clé de test (ou si elle la contient), le build **panique** : « RAGO_LICENSE_PUBKEY est la clé publique de TEST : mets la clé du serveur de production (GET /api/v1/public-key) ». Raison : la clé privée de test est publique (`licensing/docs/test`), un exe release qui accepterait sa clé publique validerait des licences signées par n'importe qui. `rerun-if-env-changed=RAGO_LICENSE_PUBKEY`.
2. **`embed_scripts(manifest, out)`** : voir [[embed_scripts.rs]].
3. **`embed_assets(manifest, out)`** : pour `assets/LowLatency.pow` et `assets/extremelatencylow.nip`, chiffre avec `seal::offline_key(CARGO_PKG_VERSION)` et un nonce = 16 premiers octets de `HMAC(clé, "nonce|<nom>|<horodatage en ns>")`, écrit `OUT_DIR/<nom>.sealed`. Un fichier absent fait paniquer (« assets/<nom> : … »). `rerun-if-changed` sur chaque fichier.
4. **`app_identifier(manifest)`** : lit `identifier` dans la variable `TAURI_CONFIG` (configuration passée par la CLI de Tauri) sinon dans `tauri.conf.json`, et émet `cargo:rustc-env=RAGO_IDENTIFIER=<id>`. Sans identifiant : panique. Raison : le désinstallateur (`--reset-tweaks`) lit `applied.json` dans `%APPDATA%\<identifiant>` ; écrit en dur, l'exe de test lirait et remettrait les réglages du vrai Rago Optimizer. La CI fusionne `tauri.staging.conf.json` dans `tauri.conf.json` avant le build pour l'exe de test ([[Configuration Tauri]]).
5. **Manifeste Windows** : `tauri_build::WindowsAttributes::new().app_manifest(include_str!("app.manifest"))` puis `tauri_build::try_build`. Le manifeste demande les droits administrateur (`requireAdministrator`) : la quasi-totalité des réglages écrivent dans `HKLM`, les services ou le BCD.

## Données touchées
Lit `app/src-tauri/assets/*`, `keys/test-public-key.pem`, `tauri.conf.json`, `app.manifest` et (par [[embed_scripts.rs]]) `scripts/*.json`, `netopt/*.ps1`, `app/src/data/free.json`, `app/src/data/catalog.json`. Écrit dans `OUT_DIR` (dossier `target/` de Cargo, jamais dans git).

## À savoir avant de modifier
- Un nonce dérivé de l'horodatage change à chaque build : deux builds de la même version n'ont pas les mêmes octets chiffrés (normal).
- Les dépendances de build sont dans `[build-dependencies]` de [[Cargo.toml]] (`tauri-build`, `serde_json`, `sha2`) : [[seal.rs]] ne doit utiliser que `sha2`.
- Ne jamais affaiblir `guard_test_key` : c'est la seule barrière contre un exe de production qui accepterait la clé de test ([[Clés et secrets]]).
