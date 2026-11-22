---
type: code
tags: [code, app, outil, javascript, version]
fichier: app/tools/bump-version.mjs
lignes: 16
maj: 2026-11-10
---
# bump-version.mjs

Change le numéro de version de l'app aux deux endroits qui comptent : `app/package.json` et `app/src-tauri/Cargo.toml`. C'est le **seul** moyen prévu de changer la version. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Publier une version]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `6c2bcad`), jamais modifié depuis.

## Rôle et place dans l'ensemble
- Commande : `cd app && npm run bump X.Y.Z` (script `"bump": "node tools/bump-version.mjs"` de `app/package.json`). À lancer depuis `app/` : les chemins `package.json` et `src-tauri/Cargo.toml` sont relatifs au dossier courant.
- `tauri.conf.json` ne porte pas de numéro : son champ `version` vaut `"../package.json"` (Tauri lit la version dans `package.json`). D'où la règle « jamais à la main dans `tauri.conf.json` » de `app/CLAUDE.md`.
- La version de `Cargo.toml` devient `CARGO_PKG_VERSION` dans le code Rust. Elle est envoyée au serveur de licences (`app_version`, par exemple dans `account.rs`) et elle **entre dans les clés de chiffrement des scripts** : `build.rs` et `embed_scripts.rs` scellent le paquet gratuit avec `seal::offline_key(version)` et le paquet Premium avec `seal::version_key(RAGO_SCRIPTS_SECRET, version)` ([[seal.rs]], [[Scripts embarqués (JSON)]]). Le serveur doit donc connaître la version exacte pour donner la clé Premium.

## Ce que le fichier expose
Un script sans fonction exportée :
1. Lit `process.argv[2]` ; s'il ne correspond pas à `^\d+\.\d+\.\d+$`, affiche `usage : npm run bump 1.2.0` et sort avec le code 1.
2. Réécrit `package.json` avec `version` changée (`JSON.stringify(pkg, null, 2)` + saut de ligne final).
3. Dans `src-tauri/Cargo.toml`, remplace la **première** ligne qui commence par `version = "…"` (celle du paquet `[package]`).
4. Affiche `Rago Optimizer X.Y.Z : package.json et src-tauri/Cargo.toml mis à jour (Cargo.lock suivra au prochain build).`

## Données touchées
Écrit `app/package.json` et `app/src-tauri/Cargo.toml`. `Cargo.lock` est mis à jour par Cargo au prochain build ou `cargo test`.

## Erreurs et cas limites
- Aucun contrôle que le nouveau numéro est plus haut que l'ancien : c'est à la personne qui publie de le vérifier.
- Pas de suffixe accepté (`1.3.0-beta` est refusé).

## Liens avec le reste
- Étape de [[Publier une version]] ; la [[Mise à jour automatique]] compare ce numéro à celui publié.
- Historique des numéros : [[Historique des versions]], [[Version 1.3.0]].

## À savoir avant de modifier
- **Le numéro doit toujours être plus haut que tout exe déjà distribué** : 1.1.11 à 1.1.13 et 1.2.9 ont servi en test et ne doivent pas être réutilisés ([[Reprendre le développement]], [[Versions 1.1.11 à 1.1.13]]).
- Ne jamais changer la version à la main dans un seul des deux fichiers : l'exe annoncerait une version et scellerait ses scripts avec une autre.
