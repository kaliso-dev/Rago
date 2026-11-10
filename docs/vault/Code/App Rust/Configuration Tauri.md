---
type: code
tags: [code, app, config, tauri]
fichier: app/src-tauri/tauri.conf.json, tauri.staging.conf.json, capabilities/default.json, capabilities/overlay.json, app.manifest, keys/, assets/, icons/, resources/
lignes: 71 (tauri.conf.json), 5 (staging), 29 + 12 (capabilities), 30 (app.manifest)
maj: 2026-11-10
---
# Configuration Tauri

Fichiers de configuration et ressources du dossier `app/src-tauri/` qui ne sont pas du code Rust : configuration de Tauri (fenêtre, sécurité, mise à jour, installateur), configuration de l'exe de test, permissions des fenêtres, manifeste Windows, clé publique de test, fichiers natifs chiffrés, icônes et `nvidiaProfileInspector.exe`. Fiche parente : [[Code de l'app (Rust)]]. Voir aussi [[App Windows]], [[Architecture de l'app]], [[Branches et environnements]].

Tout est CONFIRMÉ (fichiers de `staging`, 10/11), sauf ce qui est marqué OBSERVÉ ou À VÉRIFIER.

## `tauri.conf.json` (71 lignes)
| Clé | Valeur | Remarque |
|---|---|---|
| `productName`, `mainBinaryName` | « Rago Optimizer » | nom de l'exe, du raccourci et de la tâche planifiée ([[background.rs]]) |
| `version` | `"../package.json"` | la version vient de `app/package.json` (`npm run bump`, voir [[Cargo.toml]]) |
| `identifier` | `gg.rago.optimizer` | dossier `%APPDATA%\gg.rago.optimizer`, verrou d'instance, `RAGO_IDENTIFIER` ([[build.rs]]) |
| `build` | `beforeDevCommand: npm run dev`, `devUrl: http://localhost:1420`, `beforeBuildCommand: npm run build`, `frontendDist: ../dist` | interface Vite |
| `app.withGlobalTauri` | `false` | l'interface importe `@tauri-apps/api` |
| fenêtre `main` | titre « Rago Optimizer », **1280 × 820**, minimum **1080 × 680**, centrée, redimensionnable, `decorations: false` (barre de titre dessinée par l'interface), ombre, fond `#070708`, **`visible: false`** | [[lib.rs]] la montre (`show_main`) sauf lancement `--background` |
| `security.csp` | `default-src 'self'; img-src 'self' data: asset: http://asset.localhost; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src ipc: http://ipc.localhost` | **l'interface n'a aucun accès réseau** : tout passe par les commandes Rust |
| `plugins.updater` | `pubkey: ""` (remplie par la CI), `requireSignedVersion: true`, `windows.installMode: "passive"` | voir [[update.rs]] |
| `bundle.targets` | `["nsis"]` | installateur NSIS seulement ([[Installateur NSIS]]) |
| `bundle.publisher` / `copyright` / `category` | « Rago » / « © KALISO and RAGO » / `Utility` | |
| `bundle.shortDescription`, `longDescription` | textes anglais de l'installateur | |
| `bundle.licenseFile` | `installer/eula.txt` | conditions affichées par l'installateur |
| `bundle.icon` | `icons/32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.ico` | `icons/icon.png` existe aussi |
| `bundle.resources` | `["resources/*"]` | copiés dans `<installation>\resources\` |
| `bundle.windows.webviewInstallMode` | `embedBootstrapper` | l'installateur embarque l'installeur de WebView2 |
| `bundle.windows.nsis` | `installMode: perMachine` (Program Files, administrateur), `languages: ["English"]`, sans sélecteur de langue, `installerIcon: icons/icon.ico`, `installerHooks: installer/hooks.nsh`, `headerImage: installer/header.bmp`, `sidebarImage: installer/sidebar.bmp` | |

## `tauri.staging.conf.json` (5 lignes)
`productName` et `mainBinaryName` « Rago Optimizer Staging », `identifier` `gg.rago.optimizer.staging`. La CI le **fusionne** dans `tauri.conf.json` (étape `node -e … {...tauri.conf, ...staging}`) quand la cible est staging : l'exe de test a son propre dossier de données, son propre verrou, sa propre tâche planifiée et ne touche jamais aux réglages du vrai. La CI met aussi, quand la clé de signature existe, `bundle.createUpdaterArtifacts = true` et `plugins.updater.pubkey` = variable `RAGO_UPDATER_PUBKEY`, et télécharge `PresentMon.exe` (v2.3.0, Intel) et sa licence dans `resources\`. Voir [[CI GitHub Actions]], [[Branches et environnements]].

## `capabilities/` (permissions des fenêtres)
- `default.json` (fenêtre `main`) : `core:default` ; fenêtre : `allow-minimize`, `allow-toggle-maximize`, `allow-is-maximized`, `allow-close`, `allow-start-dragging` (barre de titre maison) ; `dialog:allow-open`, `dialog:allow-save`, `dialog:allow-ask` ; `opener:allow-open-url` limité à `https://*` et `http://localhost:*`.
- `overlay.json` (fenêtre `overlay`, la [[Barre en jeu]], créée par [[overlay.rs]]) : `core:default` seulement. « Lit les mesures et lance les réglages par les commandes de l'app, rien d'autre. »
- Les 76 commandes de l'app ([[lib.rs]]) n'ont pas besoin d'être listées ici : seules les commandes des plugins le sont.

## `app.manifest` (30 lignes)
Intégré à l'exe par [[build.rs]] :
- dépendance `Microsoft.Windows.Common-Controls` **6.0.0.0** (contrôles communs v6, nécessaires aux fenêtres de Tauri ; c'est pourquoi [[runner.rs]] ne doit pas dépendre d'`AppHandle` dans les tests) ;
- `requestedExecutionLevel level="requireAdministrator"` : **droits administrateur à chaque lancement** (invite UAC) ;
- `supportedOS` Windows 10/11 ;
- `dpiAware true/pm`, `dpiAwareness PerMonitorV2`.

## `keys/test-public-key.pem`
Clé publique **de test** (113 octets) du contrat de licence (`licensing/docs/test`). Utilisée par défaut en debug par [[license.rs]] et par le test `parses_test_public_key` ; un build release qui la recevrait en `RAGO_LICENSE_PUBKEY` est refusé par [[build.rs]]. Sa valeur n'est pas recopiée ici ([[Clés et secrets]]).

## `assets/` (chiffrés dans l'exe, jamais installés en clair)
| Fichier | Taille | Contenu |
|---|---|---|
| `LowLatency.pow` | 24 576 octets | export `powercfg` du plan « Rago Low Latency » (GUID `7c4e2a51-3b9d-4f7e-9a62-5d18c0f3b6a4`) ; le script `pow_plan` l'importe, corrige 3 réglages, le renomme et l'active ([[catalog.rs]]) |
| `extremelatencylow.nip` | 7 912 octets | profil NVIDIA Profile Inspector (XML déclaré UTF-16, fichier en UTF-8 avec BOM), profil `Base Profile` avec 38 `ProfileSetting` ; importé par `nv_profile` et les scripts `gpu_nvidia`, `nv_general` |

Placés dans `assets/` le 16/10 ([[Version 1.1.14]]) ; avant, ils étaient dans `resources\` en clair. Chiffrement : [[build.rs]], lecture : [[assets.rs]]. Les `.bat` d'origine (Rago Hub) les utilisaient déjà par `%RAGO_RES%\<nom>` (commentaire d'[[assets.rs]]) ; leur provenance exacte n'est pas documentée dans le dépôt.

## `resources/`
- `nvidiaProfileInspector.exe` (1 118 208 octets), dans git depuis le 07/10 (1.1.5). Métadonnées du fichier (OBSERVÉ) : nom d'origine `NVidiaProfileInspectorDmW.exe`, version 3.5.0.0, mention « Modified by DeadManWalking (DeadManWalkingTO-Github) » : c'est une version modifiée de NVIDIA Profile Inspector. **À VÉRIFIER** : d'où il a été téléchargé et si sa licence permet de le redistribuer.
- `PresentMon.exe` et `PresentMon-LICENSE.txt` : **pas dans git**, ajoutés par la CI à chaque build (FPS de la [[Barre en jeu]], [[fps.rs]]).
- `smartctl.exe` : cherché par [[system.rs]] mais jamais livré : seul le réglage `pow_storage_apm` s'en servirait (APM/AAM des disques), il marche sans, en partie.

## `icons/` et `installer/*.bmp`
Icônes de l'app (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.ico` 116 Ko, `icon.png`) et images de l'installateur (`header.bmp`, `sidebar.bmp`). Charte : [[Charte graphique]].

## À savoir avant de modifier
- Ne jamais éditer `version` ici : `npm run bump X.Y.Z`.
- Ne pas mettre la clé publique de mise à jour dans git : la CI la pose ([[Clés et secrets]]).
- Ouvrir une permission de plugin à l'interface est un choix de sécurité (l'app tourne en administrateur) : garder `opener` limité à `https` et `localhost`.
- Changer `identifier` changerait le dossier de données de tous les joueurs (réglages appliqués perdus de vue).
