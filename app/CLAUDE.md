# app/ : l'app Windows (Tauri 2 + React)

Lire d'abord `CLAUDE.md` à la racine et `docs/vault/Technique/Reprendre le développement.md`.

- Fonctionnement précis : `docs/vault/Technique/Architecture de l'app.md` (démarrage, modules Rust, commandes, événements, scellement des scripts) ; vue produit : `docs/vault/Technique/App Windows.md`.
- Une fiche par fichier : `docs/vault/Code/App Rust/Code de l'app (Rust).md`, `docs/vault/Code/App interface/Code de l'app (interface).md`, `docs/vault/Code/Générateur du catalogue/Code du générateur de catalogue.md`.
- Lancer et tester : `docs/vault/Technique/Développer et tester.md` (`npm run window` pour la démo, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`).
- Catalogue des tweaks : `src/data/catalog.json` ; après un changement, `npm run catalog`, puis `python3 docs/tools/catalogue_vault.py` et `python3 site/tools/sync_app.py`.
- Version : `npm run bump X.Y.Z`, jamais à la main dans `tauri.conf.json`.
- Le front n'a pas d'accès réseau (CSP `connect-src ipc:`) : tout appel réseau passe par une commande Rust.
- Ne jamais toucher aux clés de signature (`docs/vault/Technique/Clés et secrets.md`). Mettre à jour le vault à la fin de la tâche.
