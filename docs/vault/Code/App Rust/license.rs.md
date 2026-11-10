---
type: code
tags: [code, app, rust, licence]
fichier: app/src-tauri/src/license.rs
lignes: 691
maj: 2026-11-10
---
# license.rs

Licence Premium côté app : empreinte du PC, connexion (mot de passe ou navigateur), activation liée au PC, **jeton JWT EdDSA vérifié hors ligne**, rafraîchissement, clé des scripts Premium, jeton Rago Route, et le coffre DPAPI utilisé par tout le code. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalité : [[Licence dans l'app]]. Contrat serveur : [[API du serveur]], [[Serveur de licences]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (1.1.5), 6 commits. Suit le contrat `/api/v1` décrit dans `licensing/docs/API.md`.

## Rôle et place dans l'ensemble
- [[lib.rs]] : commandes `license_*`, `route_*`, `scripts_key` pour ouvrir le paquet Premium ([[catalog.rs]]), état de licence pour les règles de l'offre et la remise ([[reset.rs]]).
- [[account.rs]] a son propre client HTTP, mais emprunte `bearer()` (le jeton de licence ouvre aussi l'API du compte), `API_BASE`, `ApiError` et `vault`.
- `vault` (DPAPI) sert aussi à [[backup.rs]] (`applied.json`), [[history.rs]] et [[account.rs]] (`account.bin`).
- `device()` (empreinte) sert aussi à [[update.rs]] (identifiant anonyme du PC) et à [[netshare.rs]] (envoi du test réseau).

## Ce que le fichier expose

### Configuration à la compilation
| Constante | Release | Debug |
|---|---|---|
| `API_BASE` | `option_env!("RAGO_API_BASE")` (`https://…/api/v1`) | `http://localhost:8787/api/v1` par défaut |
| `PUBLIC_KEY` | `option_env!("RAGO_LICENSE_PUBKEY")` (PEM) | `app/src-tauri/keys/test-public-key.pem` par défaut |
| `REFRESH_BEFORE_S` | 7 jours | |

Sans `RAGO_API_BASE` ou sans clé publique, l'état est `unconfigured` (build hors ligne). [[build.rs]] refuse un build release avec la clé de test. Les valeurs sont fournies par la CI ([[CI GitHub Actions]], [[Variables d'environnement]]) ; voir [[Clés et secrets]].

### Empreinte du PC
- `struct Fingerprint {machine_guid, smbios_uuid, board_serial}` : chaque champ est un **hash**, jamais la valeur brute.
- `fp_hash(nom, valeur)` = sha256 hex de `rago-fp-v1|<nom>|<VALEUR en majuscules, nettoyée>` ; `None` pour une valeur « poubelle » : 14 valeurs connues (`00000000-…`, `FFFFFFFF-…`, `03000200-0400-0500-0006-000700080009`, « DEFAULT STRING », « TO BE FILLED BY O.E.M. », « NONE », « N/A », « NOT APPLICABLE », « NOT SPECIFIED », « SYSTEM SERIAL NUMBER », « BASE BOARD SERIAL NUMBER », « 123456789 », « 0123456789 », vide) ou faite seulement de `0`, `F`, `.` et espaces.
- `same_device(a, b)` : règle identique au serveur : au moins **2 identifiants égaux**, ou tous ceux comparables s'il y en a moins de 2 (au moins 1). Une réinstallation de Windows change le MachineGuid mais garde la carte mère : même PC.
- `probe_device()` → `Device {name, os, app_version, fingerprint}` : MachineGuid par `reg.exe query HKLM\SOFTWARE\Microsoft\Cryptography /v MachineGuid /reg:64` ; UUID SMBIOS (`Win32_ComputerSystemProduct`), numéro de série de la carte mère (`Win32_BaseBoard`) et OS (`Win32_OperatingSystem`, « Microsoft » retiré, 64 caractères au plus) par une commande PowerShell (`shell::powershell`) ; nom = `COMPUTERNAME` (défaut « Windows PC ») ; version = `CARGO_PKG_VERSION`. Envoyé au serveur avec `"fingerprint": {"v": 1, …}`.

### Jeton
- `struct Claims {typ, iss, sub, email, plan, lic, did, tv, fp, iat, exp}` (`iat`, `exp` en secondes).
- `parse_public_key(texte)` : accepte un PEM SPKI, un DER SPKI ou la clé brute de 32 octets en base64 (prend les 32 derniers octets).
- `verify(jeton, clé) -> Result<Claims, &str>` : 3 parties, signature Ed25519 sur `header.payload`, `alg == "EdDSA"`, `typ == "license"`. Erreurs `format`, `signature`, `header`, `alg`, `payload`, `typ`. L'expiration et le PC sont contrôlés à part.

### Coffre `vault` (`pub(crate)`)
`seal(texte)` / `open(octets)` : DPAPI `CryptProtectData` / `CryptUnprotectData` avec `CRYPTPROTECT_UI_FORBIDDEN`, lié au compte Windows. `protect(data, entropie)` / `unprotect` : même chose avec un secret propre à l'app en plus. `random::<N>()` : `BCryptGenRandom`. Hors Windows : pas de chiffrement (tests).

### API
| Élément | Description |
|---|---|
| `ApiError {code, message, buy_url}` | erreur pour l'interface (camelCase : `buyUrl`) ; `message` en anglais du serveur |
| `ApiError::drops_token()` | `invalid_token`, `bound_to_other_device`, `revoked` : le jeton local est inutilisable |
| `post(path, bearer, body)` | client `ureq`, délai global **15 s**, TLS de Windows (`NativeTls`, magasin du système), statut HTTP lu sans erreur ; réseau en panne → `network` ; 429 sans code → `rate_limited` ; autre → `server_error` ou `error.code` du serveur |
| `struct Status {state, email, plan, key_hint, expires_at, needs_refresh, device_name}` | `state` ∈ `active`, `none`, `expired`, `unconfigured` ; `expires_at` en ms |
| `enum LoginResult` | `ActivationRequired {email, key_hint}` ou `Active {status}` (JSON `{"kind": …}`) |
| `struct Link {link_id, poll_token, code, url}` | connexion par le navigateur (1.3.0) |
| `License::new()` | fichier `%LOCALAPPDATA%\Rago\license.bin` (repli `%TEMP%\Rago`) |
| `device()` | empreinte calculée au premier besoin (`OnceLock`) |
| `status()` | vérification hors ligne |
| `login(email, mot de passe)` | POST `/auth/login` |
| `link_start()` | POST `/auth/app-link/start` → `Link` |
| `link_poll(link_id, poll_token)` | POST `/auth/app-link/poll` ; `None` tant que `status == "pending"` |
| `activate()` | POST `/licenses/activate` avec le jeton d'accès en `Bearer` |
| `refresh()` | POST `/licenses/refresh` |
| `sign_out()` | efface jeton et clé |
| `scripts_key()` | clé des scripts Premium (32 octets), **seulement si l'état est `active`** |
| `route_token()` | POST `/route/token` avec le jeton de licence en `Bearer` → jeton Rago Route (6 h) ; `no_license` sans Premium |
| `bearer()` (`pub(crate)`) | jeton de licence tant qu'il est actif (ouvre aussi l'API du compte) |

## Fonctionnement détaillé

### `status()` : vérification hors ligne au démarrage
1. Pas de clé publique ou pas d'`API_BASE` → `unconfigured`.
2. Pas de `license.bin` lisible → `none`.
3. Signature fausse → **efface** le jeton et la clé → `none`.
4. Empreinte du jeton ≠ ce PC (`same_device` faux : jeton copié d'un autre PC) → efface → `none`.
5. `exp` > maintenant → `active`, sinon `expired`. `needs_refresh` = reste moins de 7 jours. `key_hint` vient de la mémoire (dernière réponse du serveur), pas du jeton.

L'interface (`store.tsx`) appelle `license_refresh` au démarrage puis toutes les 24 h quand l'état est `active` ou `expired` ; elle n'utilise pas `needs_refresh` ([[Licence dans l'app]]).

### Connexion et activation
- `login` envoie `{email, password, device}`. Réponse `activation_required` : garde en mémoire le jeton d'accès (`access_token`, 15 min) et `key_hint`, renvoie `ActivationRequired` (l'interface demande de confirmer que ce PC devient celui de la licence). Sinon `accept`.
- `activate` envoie `{device}` avec le jeton d'accès ; sans lui → `invalid_token`.
- `link_start` / `link_poll` : même suite, mais la connexion se fait sur le site du compte avec Google ou Discord ([[Connexion Google et Discord]]) ; [[lib.rs]] ouvre l'URL avec `?p=google|discord`.
- `accept(réponse)` : lit `license_token`, le **vérifie** (sinon `server_error`), refuse s'il n'est pas pour ce PC (`bound_to_other_device`), garde `license.key_hint`, écrit `license.bin` (DPAPI) et remplace `scripts.bin` par `scripts_key` (DPAPI) ; absent (serveur sans `SCRIPTS_SECRET`) → `scripts.bin` supprimé, plus de scripts Premium.

### Rafraîchissement
`refresh` envoie `{license_token, device}` (même expiré). Réponse OK : sous le verrou `write`, si le jeton a changé pendant la requête (déconnexion ou autre connexion), la réponse est ignorée ; sinon `accept`. Erreur `drops_token` → efface. Sans réseau ou serveur en panne → le jeton actuel est gardé. [[lib.rs]] lance alors la remise de fin de licence ([[reset.rs]]).

`sign_out` prend le même verrou `write` : un rafraîchissement en vol ne peut pas remettre un jeton effacé.

## Données touchées
- `%LOCALAPPDATA%\Rago\license.bin` (jeton, DPAPI) et `%LOCALAPPDATA%\Rago\scripts.bin` (clé des scripts en base64, DPAPI). Ce dossier est partagé par l'exe de test et le vrai : À VÉRIFIER (le chemin ne dépend pas de l'identifiant ; un jeton staging et un jeton prod s'écraseraient sur un même PC).
- Réseau : `<API_BASE>/auth/login`, `/auth/app-link/start`, `/auth/app-link/poll`, `/licenses/activate`, `/licenses/refresh`, `/route/token`.
- Lit le registre (MachineGuid) et WMI.

## Tests
`hashes_follow_the_contract`, `same_device_rule`, `verifies_signed_token`, `rejects_tampered_or_foreign_tokens`, `parses_test_public_key`, et `live_flow` (`#[ignore]` : parcours complet contre le serveur local, `cargo test live_flow -- --ignored` après `npm start` avec la clé de test ; vérifie mauvais mot de passe, activation, refresh, même PC après réinstallation, autre PC refusé, jeton copié inutile).

## À savoir avant de modifier
- La règle `same_device` et le calcul `fp_hash` doivent rester **identiques** au serveur (`licensing/`), sinon tous les joueurs seraient « sur un autre PC ».
- Ne jamais mettre l'e-mail ni le jeton dans un rapport, un journal ou le pont Rago OS ([[lib.rs]] n'expose que l'offre).
- Ne jamais changer les clés de signature côté serveur (règle de Sofiene, [[Clés et secrets]]) : tous les jetons existants deviendraient invalides.
