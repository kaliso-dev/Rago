# Rago Optimizer Premium

App Windows (Tauri 2 + React + Rust) qui reprend les 189 réglages de `Premium v5.2 - Rago Optimizer.bat`, corrigés (voir `docs/CORRECTIONS.md`).

## Ce qu'il y a dedans

- `legacy/` : le .bat d'origine (Rago Free).
- `tools/` : extraction du .bat (`extract_bat.py`), métadonnées des réglages (`meta.py`), génération (`build_catalog.py` → `src/data/catalog.json` + `src-tauri/scripts/scripts.json`). Après une modif du .bat ou de `meta.py` : `npm run catalog`.
- `src-tauri/` : moteur Rust. Exécute chaque réglage dans un `cmd` caché avec droits admin, journal en direct, historique, point de restauration, ping TCP, préréglages OptiFine, licence.
- `src/` : interface React (anglais par défaut, français dans Settings).
- `src-tauri/resources/` : `nvidiaProfileInspector.exe` + `extremelatencylow.nip`. À ajouter si tu les as : `LowLatency.pow` (plan d'alimentation) et `smartctl.exe`.

## Compiler l'installateur (.exe)

Sur un PC Windows 10/11 :

1. Installer Node 22, Rust (rustup) et les outils de build Visual Studio (C++).
2. `npm ci`
3. Avec la licence branchée : définir `RAGO_API_BASE` (ex. `https://ragohub.com/api/v1`), `RAGO_LICENSE_PUBKEY` (clé publique Ed25519, PEM) et `VITE_SITE_URL`.
4. `npm run tauri build` → `src-tauri/target/release/bundle/nsis/Rago Optimizer_1.0.0_x64-setup.exe`

Sans ces variables, l'app se lance sans écran de connexion (build de développement).

Ou via GitHub : ce dossier vit sous `app/` dans le dépôt du projet, et `ci/build-windows.yml` va dans `.github/workflows/app-windows.yml` à la racine. Ajouter les secrets `RAGO_API_BASE` et `RAGO_LICENSE_PUBKEY`, puis lancer le workflow `app-windows`. L'installateur sort en artefact et en brouillon de release.

`npm run tauri dev` doit être lancé depuis un terminal administrateur (l'app demande les droits admin).

## Licence

Contrat de référence : `licensing/docs/API.md` (thread « Comptes, licences et paiement »). Implémentation : `src-tauri/src/license.rs`.

- Connexion `POST /auth/login {email, password, device}` → `activation_required` (écran « Activate Rago Optimizer on this PC? ») ou directement `active` si ce PC est déjà celui de la licence.
- Activation `POST /licenses/activate` (Bearer access_token 15 min), rafraîchissement `POST /licenses/refresh` au démarrage puis chaque jour.
- Empreinte : 3 hashes SHA-256 `rago-fp-v1|<nom>|<VALEUR>` (MachineGuid, UUID SMBIOS, n° de série carte mère), règle « même PC » 2 sur 3, appliquée aussi hors ligne contre le champ `fp` du jeton.
- Jeton EdDSA vérifié hors ligne avec la clé publique compilée, stocké chiffré DPAPI dans `%LOCALAPPDATA%\Rago\license.bin`.
- En debug : serveur `http://localhost:8787/api/v1` et clé de test `src-tauri/keys/test-public-key.pem` par défaut. En release : `RAGO_API_BASE` et `RAGO_LICENSE_PUBKEY` (PEM) obligatoires, sinon pas d'écran de connexion.
- Test de bout en bout contre le serveur local : `cargo test --manifest-path src-tauri/Cargo.toml live_flow -- --ignored`.

## Tests

- `cargo test --manifest-path src-tauri/Cargo.toml` (scripts non interactifs, aucun chemin de l'auteur, plus de « Disabling », fusion OptiFine, ping, jeton de licence).
- `npm run build` (typecheck + build).

## Icônes et images de l'installeur

Le thread charte livre le logo dans `brand/logo/` (PNG 16 à 1024, `rago.ico`, images NSIS). Pour les reprendre dans l'app :

```
sh tools/sync_icons.sh            # copie vers src-tauri/icons, src-tauri/installer et public/favicon.svg
```

Le logo affiché dans l'interface (marque, wordmark) vit dans `src/components/logoPaths.ts`.

## Catalogue (depuis le 2026-10-06)

Le catalogue combine l'ancien programme (`legacy/Premium v5.2 - Rago Hub.bat`, via `tools/build_catalog.py`) et les trois .bat de Sofiene (`legacy/v6/`) :

```
python3 tools/build_catalog_v6.py   # lance build_catalog.py, ajoute les réglages v6, dédoublonne
```

Les réglages v6 rejoignent les modules existants (Network, Latency, Graphics card, Windows, Hitreg). Les doublons de l'ancien programme sont listés dans `REPLACED`. Le script corrige aussi « Disable » → « Disabling », le `USER_SID` jamais défini et le chemin du profil `.nip`. Les réglages du plan gratuit sont dans `src/data/free.json`.
