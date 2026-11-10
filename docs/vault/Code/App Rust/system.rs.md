---
type: code
tags: [code, app, rust, windows]
fichier: app/src-tauri/src/system.rs
lignes: 171
maj: 2026-11-10
---
# system.rs

La **sonde matérielle** de l'app : Windows, processeur, RAM, cartes graphiques, carte réseau active, droits administrateur, WMIC, dossier Minecraft et fichiers présents dans `resources\`. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Tableau de bord]] (carte « Santé du PC »), [[Moteur des tweaks]] (variante choisie selon le matériel), [[Analyse du PC]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (1.1.5).

## Rôle et place dans l'ensemble
- [[lib.rs]] garde le résultat en cache (`AppState.system`, `probe_cached`) et l'expose par `get_system_info(refresh?)`. Le contexte de chaque lot y prend la carte réseau (`adapter`), passée aux scripts par la variable `adapter_name` ([[runner.rs]]).
- [[reset.rs]] l'appelle directement pour la remise de la désinstallation ; `netopt_run` y lit le nom du processeur pour repérer un Ryzen X3D à deux CCD ([[session.rs]]) ; le rapport de support la reprend ([[report.rs]]).
- Côté interface, `app/src/lib/catalog.ts` choisit la variante par défaut d'après `ramTier`, et prévient si un réglage demande WMIC (`hasWmic`) ou un fichier de `resources` absent.

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `struct Gpu {name, vendor}` | `vendor` ∈ `nvidia`, `amd`, `intel`, `other` |
| `struct SystemInfo` | voir le tableau suivant (JSON camelCase) |
| `RAM_TIERS = [4, 8, 12, 16, 24, 32, 48, 64, 128]` | paliers de RAM de l'ancien `.bat` |
| `vendor_of(nom)` | `nvidia` si le nom contient nvidia, geforce, rtx ou gtx ; `amd` si amd, radeon, ryzen ou « ati » ; `intel` ; sinon `other` |
| `probe(resource_dir) -> SystemInfo` | la sonde (lance PowerShell : quelques secondes) |

| Champ de `SystemInfo` | Source |
|---|---|
| `os_name` | `sysinfo::System::long_os_version()` (défaut « Windows ») |
| `os_build`, `is_win11` | chiffres de `kernel_version()` ; Windows 11 si build ≥ **22000** |
| `hostname` | `System::host_name()` (masqué dans le rapport de support) |
| `cpu_name`, `cpu_vendor`, `cpu_cores`, `cpu_threads` | `sysinfo` : marque du premier cœur, cœurs physiques, nombre de processeurs logiques |
| `ram_gb`, `ram_tier` | mémoire totale arrondie en Go ; palier le plus proche (15,8 Go visibles → 16) |
| `gpus` | `Get-CimInstance Win32_VideoController` ; « Microsoft Basic Display » retiré |
| `adapter`, `adapter_desc`, `link_speed` | `Get-NetAdapter -Physical` avec `Status = Up`, le plus petit `ifIndex` : nom, description, vitesse du lien |
| `is_admin` | `shell::is_elevated()` ([[shell.rs]]) ; affiché en bas de la barre latérale |
| `has_wmic` | `%SystemRoot%\System32\wbem\WMIC.exe` existe (retiré de Windows 11 24H2 ; le réglage interne `__wmic` le réinstalle, voir [[catalog.rs]]) |
| `minecraft_dir` | `%APPDATA%\.minecraft` s'il existe |
| `resources` | `nvidiaProfileInspector.exe` et `smartctl.exe` s'ils sont dans `resources\`, plus toujours `LowLatency.pow` et `extremelatencylow.nip` (chiffrés dans l'exe, [[assets.rs]]) |

## Fonctionnement détaillé
Une seule commande PowerShell (`PROBE`) rend en JSON compact `{gpus, adapter, adapterDesc, linkSpeed}` ; `gpus` peut être une chaîne seule (une carte) ou un tableau. Si PowerShell échoue, ces champs restent vides (pas d'erreur). Tout le reste vient de la crate `sysinfo` ([[Cargo.toml]]).

## Erreurs et cas limites
- Pas de carte réseau « Up » physique (Wi-Fi coupé, VPN seul) : `adapter = None` ; les scripts reçoivent `adapter_name` vide.
- `smartctl.exe` n'est **pas** livré (le dossier `resources\` ne contient que `nvidiaProfileInspector.exe`, et la CI ajoute `PresentMon.exe`) : il n'apparaît donc jamais dans `resources`. L'interface ignore son absence (« le réglage marche sans, en partie », `catalog.ts`). Il sert au seul réglage `pow_storage_apm` (« Gestion d'énergie des disques », [[Tweaks Latence]]) : sans lui, le réglage coupe l'économie d'énergie des disques mais pas l'APM/AAM (CONFIRMÉ, [[meta.py]] et [[build_catalog.py]]). Le livrer ou non n'a jamais été décidé.

## Tests
`ram_tiers_round_to_nearest` (15 → 16, 7 → 8, 31 → 32, 100 → 128), `vendors`.

## À savoir avant de modifier
- La sonde est **lente** (PowerShell) : ne jamais l'appeler sur le fil de l'interface ; passer par le cache de [[lib.rs]].
- Ajouter un champ : l'ajouter aussi au type `SystemInfo` de `app/src/lib/api.ts` (et à la démo navigateur du même fichier).
