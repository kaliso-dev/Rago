# Rago Optimizer

App Windows (Tauri 2 + React + Rust) : 226 réglages, l'ancien programme Premium v5.2 et les 3 .bat v6 de Sofiene combinés et corrigés (voir `docs/CORRECTIONS.md`). Plan gratuit : 9 réglages ouverts (`src/data/free.json`) et les variantes de retour arrière ; le reste demande une licence Premium.

## Ce qu'il y a dedans

- `legacy/` : les .bat sources (`Premium v5.2 - Rago Hub.bat` et `v6/`).
- `tools/` : extraction du .bat (`extract_bat.py`), métadonnées des réglages (`meta.py`), génération (`build_catalog_v6.py`, qui lance `build_catalog.py`, → `src/data/catalog.json` + `src-tauri/scripts/scripts.json`). Après une modif d'un .bat ou de `meta.py` : `npm run catalog`. `fix_free_bat.py` produit le .bat gratuit du site (`../free/rago-free-v5.2.bat`).
- `src-tauri/` : moteur Rust. Exécute chaque réglage dans un `cmd` caché avec droits admin, journal en direct, historique, point de restauration, ping TCP, préréglages OptiFine, licence.
- `src/` : interface React (anglais par défaut, français dans Settings).
- `src-tauri/resources/` : `nvidiaProfileInspector.exe` + `extremelatencylow.nip`. À ajouter si tu les as : `LowLatency.pow` (plan d'alimentation) et `smartctl.exe`.

## Compiler l'installateur (.exe)

Sur un PC Windows 10/11 :

1. Installer Node 22, Rust (rustup) et les outils de build Visual Studio (C++).
2. `npm ci`
3. Avec la licence branchée : définir `RAGO_API_BASE` (ex. `https://rago-production.up.railway.app/api/v1`, puis l'adresse du domaine définitif), `RAGO_LICENSE_PUBKEY` (clé publique Ed25519, PEM) `VITE_SITE_URL` et, si le lien Discord existe, `VITE_SUPPORT_URL`. Un build release refuse la clé publique de test (`src-tauri/build.rs`).
4. `npm run tauri build` → `src-tauri/target/release/bundle/nsis/Rago Optimizer_<version>_x64-setup.exe`

Sans ces variables, un build de développement se connecte au serveur local (`http://localhost:8787/api/v1`) avec la clé de test ; un build release sans elles n'a pas de serveur et le bouton Sign in répond « This build isn't connected to the license server ». Le plan gratuit marche dans tous les cas.

Nouvelle version : `npm run bump 1.2.0` (met à jour `package.json`, lu par `tauri.conf.json` et affiché dans Settings, et `src-tauri/Cargo.toml`, envoyé au serveur de licences), puis push.

Ou via GitHub : ce dossier vit sous `app/` dans le dépôt du projet, et `ci/build-windows.yml` va dans `.github/workflows/app-windows.yml` à la racine. Ajouter les secrets `RAGO_API_BASE` et `RAGO_LICENSE_PUBKEY`, puis lancer le workflow `app-windows`. L'installateur sort en artefact et en brouillon de release.

`npm run tauri dev` doit être lancé depuis un terminal administrateur (l'app demande les droits admin).

## Licence

Contrat de référence : `licensing/docs/API.md` (thread « Comptes, licences et paiement »). Implémentation : `src-tauri/src/license.rs`.

- Connexion `POST /auth/login {email, password, device}` → `activation_required` (écran « Activate Rago Optimizer on this PC? ») ou directement `active` si ce PC est déjà celui de la licence.
- Activation `POST /licenses/activate` (Bearer access_token 15 min), rafraîchissement `POST /licenses/refresh` au démarrage puis chaque jour.
- Empreinte : 3 hashes SHA-256 `rago-fp-v1|<nom>|<VALEUR>` (MachineGuid, UUID SMBIOS, n° de série carte mère), règle « même PC » 2 sur 3, appliquée aussi hors ligne contre le champ `fp` du jeton.
- Jeton EdDSA vérifié hors ligne avec la clé publique compilée, stocké chiffré DPAPI dans `%LOCALAPPDATA%\Rago\license.bin`.
- En debug : serveur `http://localhost:8787/api/v1` et clé de test `src-tauri/keys/test-public-key.pem` par défaut. En release : `RAGO_API_BASE` et `RAGO_LICENSE_PUBKEY` (PEM) obligatoires ; sans elles, l'écran de connexion s'affiche mais refuse toute connexion (licence « unconfigured »).
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

Les réglages v6 rejoignent les modules existants (Network, Latency, Graphics card, Windows, Hitreg). Les doublons de l'ancien programme sont listés dans `REPLACED`. Le script corrige aussi le rechercher/remplacer cassé de l'ancien .bat (« Disabling » remis en « Disable »), le `USER_SID` jamais défini et le chemin du profil `.nip`. Le détail est dans `docs/CORRECTIONS.md` (sections v5.2 et v6). Les réglages du plan gratuit sont dans `src/data/free.json`.

Depuis la vérification du 2026-10-07, `build_catalog_v6.py` :
- découpe les profils exclusifs en variantes (`ping_hitreg` 6 profils dont Default, `ping_packets` Hitreg/QoS/Knockback, `ping_main` Config 1 à 4, `sys_ram` selon la RAM) ;
- répare les défauts de la v5.2 revenus en v6 (boucles `for` détachées, `reg add` sans `/d`, GUID et chemins de l'auteur) et les lignes de `SCRIPT_FIXES` ;
- déduit l'avertissement « Read this first » de chaque script (`WARNINGS` : Spectre, Defender, pare-feu, Prefetch, BAM…) et passe ces réglages en Advanced ;
- marque les variantes de retour arrière (`revert`), ouvertes en gratuit ;
- ajoute `requires: wmic` dès qu'un script appelle WMIC.

Les scripts tournent depuis le dossier de données de l'app (`%APPDATA%\gg.rago.optimizer\run`), pas depuis `%TEMP%` que plusieurs réglages vident.
