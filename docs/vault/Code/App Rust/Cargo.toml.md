---
type: code
tags: [code, app, rust, build]
fichier: app/src-tauri/Cargo.toml
lignes: 45
maj: 2026-11-11
---
# Cargo.toml

Manifeste Cargo du cœur Rust de l'app : nom du paquet, version, dépendances (et pourquoi chacune), fonctions Windows utilisées, profil de compilation release. Fiche parente : [[Code de l'app (Rust)]]. Voir aussi [[Configuration Tauri]], [[build.rs]], [[App Windows]].

Tout est CONFIRMÉ (code de `staging`, 10/11). `Cargo.lock` (dans git) fige 543 paquets.

## Paquet
| Clé | Valeur |
|---|---|
| `name` | `rago-hub` (nom historique, du temps de « Rago Hub ») |
| `version` | `1.3.0` (ne pas éditer à la main : `npm run bump X.Y.Z` (`app/tools/bump-version.mjs`) met à jour `package.json` et cette ligne ; `Cargo.lock` suit au build suivant. C'est cette version qui part au serveur (`app_version`) et qui dérive les clés des scripts ; voir [[Publier une version]]) |
| `description` | « Rago Optimizer, the Windows optimizer for Minecraft PvP and competitive games » |
| `authors` | `KALISO`, `RAGO` |
| `edition` / `rust-version` | 2021 / 1.80 au minimum |
| `[lib]` | `name = "rago_hub_lib"`, `crate-type = ["staticlib", "cdylib", "rlib"]` (modèle Tauri 2 ; [[main.rs]] appelle `rago_hub_lib::run()`) |

La CI peut réécrire la première ligne `version = "…"` pour fabriquer un exe de test numéroté (entrée `version` du lancement manuel, serveur staging seulement), voir [[CI GitHub Actions]].

## Dépendances de build (`[build-dependencies]`)
| Crate | Pourquoi |
|---|---|
| `tauri-build` 2.7 | génère le contexte Tauri, intègre `app.manifest` ([[build.rs]]) |
| `serde_json` 1 | lit `tauri.conf.json`, les JSON des scripts ([[embed_scripts.rs]]) |
| `sha2` 0.10 | HMAC de [[seal.rs]] compilé dans le build |

## Dépendances (`[dependencies]`)
| Crate | Fonctions | Utilisée par |
|---|---|---|
| `tauri` 2.12, feature `tray-icon` | cadre de l'app, fenêtres, événements, icône près de l'horloge | [[lib.rs]], [[background.rs]], [[overlay.rs]], [[update.rs]] |
| `tauri-plugin-dialog` 2.8 | fenêtres « Ouvrir » / « Enregistrer » (fichiers `.rago`, exe de jeu, photo) appelées depuis l'interface | `app/src/lib/api.ts` |
| `tauri-plugin-opener` 2.7 | ouvrir une URL dans le navigateur (connexion Google/Discord, liens) | [[lib.rs]], interface |
| `tauri-plugin-updater` 2.14, sans défauts, `native-tls` + `system-proxy` | mise à jour signée | [[update.rs]] |
| `tauri-plugin-global-shortcut` 2 | raccourci de la barre en jeu (Alt+X) | [[lib.rs]], [[overlay.rs]] |
| `serde` 1 (`derive`), `serde_json` 1 | tout ce qui passe à l'interface et aux fichiers JSON | partout |
| `sysinfo` 0.39, sans défauts, `system` | RAM, processeur, version de Windows | [[system.rs]], [[stats.rs]] |
| `ureq` 3, sans défauts, `json` + `native-tls` | client HTTP bloquant, TLS de Windows (schannel, magasin de certificats du système) | [[license.rs]], [[account.rs]], [[games.rs]] |
| `ed25519-dalek` 2 | vérifier la signature du jeton de licence | [[license.rs]] |
| `base64` 0.22 | jeton, clé des scripts, photo, images | [[license.rs]], [[account.rs]], [[games.rs]] |
| `sha2` 0.10 | empreinte, HMAC, identifiants anonymes | [[seal.rs]], [[license.rs]], [[backup.rs]], [[history.rs]], [[update.rs]], [[games.rs]], [[netshare.rs]], [[route.rs]] |
| `x25519-dalek` 2 (`getrandom`), `chacha20poly1305` 0.10, `hkdf` 0.12, `getrandom` 0.2 | **Rago Route** : tunnel chiffré (échange de clés X25519, ChaCha20-Poly1305), comme `proxy/rago-route.py` | [[route.rs]] ([[Infrastructure Rago Route]]) |

## `windows-sys` 0.61 (Windows seulement)
Liaisons brutes vers l'API Windows. Une feature par partie de l'API :

| Feature | Utilisée par |
|---|---|
| `Win32_Foundation` | presque tous les modules Windows |
| `Win32_System_Registry` | [[backup.rs]], [[reg.rs]] |
| `Win32_Security`, `Win32_Security_Authorization` | [[shell.rs]] (administrateur), [[memory.rs]] (privilège), [[games.rs]], [[bridge.rs]] (droits du canal nommé) |
| `Win32_Security_Cryptography` | [[license.rs]] (DPAPI, `BCryptGenRandom`) |
| `Win32_System_Threading` | [[instance.rs]], [[shell.rs]], [[memory.rs]], [[games.rs]], [[overlay.rs]], [[bridge.rs]], [[display.rs]] |
| `Win32_System_Diagnostics_ToolHelp`, `Win32_System_ProcessStatus`, `Win32_System_LibraryLoader`, `Win32_System_RemoteDesktop` | [[memory.rs]] (et [[games.rs]] pour ToolHelp, [[display.rs]] pour LibraryLoader : pilotes NVIDIA et AMD chargés depuis `System32`) |
| `Win32_System_Performance` | [[stats.rs]] (compteurs PDH) |
| `Win32_System_Power` | [[session.rs]] |
| `Win32_System_Services` | [[boost.rs]], [[rbw.rs]] |
| `Win32_System_Diagnostics_Etw` | [[flows.rs]] (journal réseau du ping des jeux) |
| `Win32_System_Pipes`, `Win32_Storage_FileSystem` | [[bridge.rs]] (canal nommé avec Rago OS) ; [[display.rs]] pour FileSystem (fichier du jeu en lecture seule) |
| `Win32_Graphics_Gdi` | [[icon.rs]], [[analysis.rs]], [[overlay.rs]], [[display.rs]] (écrans, résolution) |
| `Win32_UI_ColorSystem`, `Win32_System_Memory` | [[display.rs]] : rampe gamma (`GetDeviceGammaRamp`, `SetDeviceGammaRamp`) et mémoire demandée par le pilote AMD (`HeapAlloc`) ; ajoutées le 11/11 (branche `claude/project-thread-7n0ikn`) |
| `Win32_UI_WindowsAndMessaging` | [[instance.rs]], [[icon.rs]], [[memory.rs]], [[games.rs]], [[overlay.rs]], [[display.rs]] |
| `Win32_UI_Shell` | [[tools.rs]] (corbeille), [[overlay.rs]] |
| `Win32_UI_Input_KeyboardAndMouse` | [[overlay.rs]] |
| `Win32_NetworkManagement_IpHelper`, `Win32_Networking_WinSock` | [[icmp.rs]], [[gameping.rs]], [[route.rs]] |
| `Win32_NetworkManagement_Ndis`, `Win32_Devices_DeviceAndDriverInstallation`, `Win32_Media` | [[route.rs]] |
| `Win32_System_IO`, `Win32_System_Time` | aucun import direct dans `src/` : sans doute exigées par les signatures d'autres fonctions (`OVERLAPPED` des canaux nommés…). À VÉRIFIER avant de les retirer |

## Profil release
| Clé | Valeur | Effet |
|---|---|---|
| `codegen-units` | 1 | meilleure optimisation, compilation plus lente |
| `lto` | `true` | optimisation à l'édition de liens |
| `opt-level` | `"s"` | optimisé pour la **taille** |
| `panic` | `"abort"` | une panique arrête le processus sans dérouler la pile (exe plus petit). Attention : une panique dans un fil arrête toute l'app en release |
| `strip` | `true` | symboles retirés |

## À savoir avant de modifier
- `ureq` et l'updater utilisent `native-tls` (schannel) : le TLS de Windows, avec son magasin de certificats et le proxy du système. Ne pas passer à `rustls` sans tester derrière un proxy d'entreprise ou un antivirus qui inspecte le HTTPS.
- Ajouter une fonction Windows : ajouter la feature `windows-sys` correspondante, sinon la compilation Windows échoue (la CI le verra, pas un build Linux).
- Pas de build long dans le conteneur de développement : les vrais builds se font sur la CI Windows ([[Développer et tester]]).
