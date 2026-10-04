# Contrat d'activation Rago Hub v1

Ce document fait foi entre le serveur de licences (`/mnt/project-files/licensing/`) et l'app Windows (`/mnt/project-files/app/`). Toute évolution passe par une nouvelle version (`/api/v2`), jamais par un changement silencieux de `/api/v1`.

## Principe

1. L'acheteur paie sur Stripe, crée son compte sur le site, télécharge Rago Hub depuis son tableau de bord.
2. Dans l'app, il se connecte avec l'email et le mot de passe de ce compte.
3. Au premier login, l'app lui demande d'activer : la licence est alors verrouillée sur ce PC.
4. Le serveur renvoie un **license token** signé Ed25519. L'app le vérifie hors ligne au démarrage avec la clé publique embarquée, et le rafraîchit quand elle a du réseau.
5. Sur un autre PC, le login est refusé avec `bound_to_other_device`. Seul le support (ou le tableau de bord si `SELF_SERVICE_RESET_DAYS` > 0) libère l'appareil.

## Base

- Base URL : `https://<domaine>/api/v1` (en local : `http://localhost:8787/api/v1`).
- JSON en entrée et en sortie, `Content-Type: application/json`.
- Les erreurs ont toujours cette forme, avec un `code` stable et un `message` en anglais affichable tel quel (textes de `brand/voice-en.md`) :

```json
{ "error": { "code": "bound_to_other_device", "message": "This license is already active on another PC. ..." } }
```

| code | HTTP | Quand | Ce que fait l'app |
|---|---|---|---|
| `invalid_request` | 400 | Corps ou empreinte mal formés (`detail` précise) | Bug côté app, journaliser |
| `invalid_credentials` | 401 | Email ou mot de passe faux | Rester sur l'écran de connexion |
| `invalid_token` | 401 | Token d'accès expiré, ou license token plus valable (appareil libéré, licence ré-activée ailleurs puis revenue) | Effacer le token, retour à la connexion |
| `no_license` | 403 | Compte sans Premium. Contient `buy_url` | Bouton vers `buy_url` |
| `bound_to_other_device` | 403 | Licence déjà active sur un autre PC | Effacer le token, afficher le message, lien support |
| `revoked` | 403 | Remboursé, litige ou désactivé par le support | Effacer le token, afficher le message |
| `rate_limited` | 429 | Trop d'essais (10 logins / 15 min par email et IP) | Afficher le message, réessayer plus tard |
| `server_error` | 500 | Panne serveur | Garder le token existant, mode hors ligne |

Réseau injoignable : l'app affiche « Couldn't reach the license server. Check your connection and try again. » et continue avec son token tant qu'il n'est pas expiré.

## Objet `device` (envoyé à chaque appel)

```json
{
  "name": "DESKTOP-4F2K9",
  "os": "Windows 11 Pro 23H2 (22631)",
  "app_version": "1.0.0",
  "fingerprint": {
    "v": 1,
    "machine_guid": "9f2c...64 hex",
    "smbios_uuid": "41ab...64 hex ou null",
    "board_serial": "c03e...64 hex ou null"
  }
}
```

`name`, `os` et `app_version` servent à l'affichage dans le tableau de bord (64 caractères max). `machine_guid` est obligatoire, les deux autres peuvent être `null`.

## Empreinte machine

Trois identifiants, hachés côté app : le serveur ne voit jamais les valeurs brutes.

| Nom | Source | Change quand |
|---|---|---|
| `machine_guid` | Registre `HKLM\SOFTWARE\Microsoft\Cryptography`, valeur `MachineGuid` (lire la vue 64 bits, `KEY_WOW64_64KEY`) | Windows réinstallé |
| `smbios_uuid` | WMI `SELECT UUID FROM Win32_ComputerSystemProduct` | Carte mère changée |
| `board_serial` | WMI `SELECT SerialNumber FROM Win32_BaseBoard` | Carte mère changée |

Pour chaque valeur :

1. `trim()` puis majuscules.
2. Valeur bidon, remplacée par `null` : chaîne vide, `00000000-0000-0000-0000-000000000000`, `FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF`, `03000200-0400-0500-0006-000700080009`, `DEFAULT STRING`, `TO BE FILLED BY O.E.M.`, `NONE`, `N/A`, `NOT APPLICABLE`, `NOT SPECIFIED`, `SYSTEM SERIAL NUMBER`, `BASE BOARD SERIAL NUMBER`, `123456789`, `0123456789`, ou une chaîne faite uniquement de `0`, de `F`, de points ou d'espaces.
3. Hash : SHA-256 en hex minuscule de la chaîne UTF-8 `rago-fp-v1|<nom>|<valeur>`. Exemple : `rago-fp-v1|machine_guid|9A1B2C3D-...`.

```rust
use sha2::{Digest, Sha256};
fn fp_hash(name: &str, raw: &str) -> Option<String> {
    let v = raw.trim().to_uppercase();
    if is_junk(&v) { return None; }
    Some(hex::encode(Sha256::digest(format!("rago-fp-v1|{name}|{v}").as_bytes())))
}
```

**Règle « même PC »** (serveur et app l'appliquent à l'identique) : on compte les identifiants présents des deux côtés ; c'est le même PC si au moins 2 sont égaux, ou tous s'il y en a moins de 2 comparables. Conséquence voulue : réinstaller Windows (nouveau `MachineGuid`) ou changer de disque ne bloque pas le joueur, car l'UUID SMBIOS et le numéro de carte mère restent. Un autre PC ne passe pas.

## Endpoints

### `GET /public-key`

```json
{ "alg": "EdDSA", "crv": "Ed25519", "kid": "Xc1...", "public_key_pem": "-----BEGIN PUBLIC KEY-----\n..." }
```

Pour le développement seulement. En production, la clé publique est **compilée dans l'app** (jamais téléchargée), sinon un faux serveur pourrait fournir la sienne.

### `POST /auth/login`

```json
{ "email": "player@example.com", "password": "...", "device": { ... } }
```

Réponse 200, PC pas encore activé :

```json
{
  "status": "activation_required",
  "access_token": "eyJ...",
  "expires_in": 900,
  "account": { "email": "player@example.com" },
  "license": { "key_hint": "RAGO-9EGJN-•••••-•••••-VKXDS", "status": "active", "plan": "premium", "device": null }
}
```

L'app affiche alors : « Activate Rago Hub on this PC? Your license will be locked to this device. » avec le bouton **Activate**.

Réponse 200, ce PC est déjà celui de la licence (réinstallation de l'app, nouveau login) : directement la réponse `active` décrite sous `/licenses/activate`, sans étape d'activation.

Erreurs : `invalid_request`, `invalid_credentials`, `no_license`, `bound_to_other_device`, `revoked`, `rate_limited`.

### `POST /licenses/activate`

En-tête `Authorization: Bearer <access_token>` (valable 15 min), corps `{ "device": { ... } }` avec la même empreinte qu'au login.

```json
{
  "status": "active",
  "license_token": "eyJ...",
  "expires_at": "2026-11-03T11:40:00.000Z",
  "account": { "email": "player@example.com" },
  "license": { "key_hint": "RAGO-...", "status": "active", "plan": "premium",
               "device": { "name": "DESKTOP-4F2K9", "activated_at": "2026-10-04T11:40:00.000Z" } }
}
```

L'app affiche « License active. Rago Hub is ready. » Erreurs : `invalid_token`, `invalid_request`, `bound_to_other_device` (un autre PC a activé entre-temps), `revoked`.

### `POST /licenses/refresh`

```json
{ "license_token": "eyJ...", "device": { ... } }
```

Accepte un token expiré tant que sa signature est bonne et que l'appareil n'a pas été libéré. Renvoie la même réponse `active` avec un nouveau token. Erreurs : `invalid_token`, `bound_to_other_device`, `revoked`, `rate_limited` (30 / heure par licence).

Quand l'appeler : au démarrage de l'app si le réseau répond, puis une fois par jour si elle reste ouverte. Au minimum quand il reste moins de 7 jours.

## License token

JWT compact, `alg: EdDSA` (Ed25519), en-tête `{"alg":"EdDSA","typ":"JWT","kid":"..."}`. Crate Rust conseillée : `jsonwebtoken` (algorithme `EdDSA`) ou `ed25519-dalek` directement.

```json
{
  "typ": "license",
  "iss": "https://ragohub.com",
  "sub": "usr_...",
  "email": "player@example.com",
  "plan": "premium",
  "lic": "lic_...",
  "did": "dev_...",
  "tv": 1,
  "fp": { "machine_guid": "...", "smbios_uuid": "...", "board_serial": null },
  "iat": 1791114000,
  "exp": 1793706000
}
```

Vérification hors ligne au démarrage, dans cet ordre :

1. Signature valide avec la clé publique embarquée, et `typ == "license"`.
2. `exp` dans le futur (30 jours après émission). Au-delà, l'app exige le réseau : appel à `/licenses/refresh`, sinon écran de connexion.
3. L'empreinte calculée maintenant passe la règle « même PC » contre `fp`. Sinon : token copié depuis un autre PC, on l'efface.
4. `plan == "premium"` débloque les modules Premium.

Stockage : Windows Credential Manager (`CredWriteW`, cible `RagoHub/license`) ou fichier chiffré DPAPI dans `%LOCALAPPDATA%\Rago`. Jamais le mot de passe.

## Clés et compte de test

- Clé publique de test : `docs/test/test-public-key.pem`. La clé privée correspondante est dans `docs/test/test.env` : **test uniquement**, la clé de production sera générée avec `npm run keys` au déploiement et ne quittera jamais le serveur.
- Lancer le serveur en local avec cette clé et un compte Premium de test (base en mémoire, rien à installer) :

```bash
cd /mnt/project-files/licensing && npm ci
export $(grep -v '^#' docs/test/test.env | xargs)
DEV_SEED=test@rago.dev:password123 npm start     # http://localhost:8787/api/v1
```

Pour rejouer l'activation, redémarrer le serveur (la base en mémoire repart de zéro).

- En production, la clé publique à compiler dans l'app se lit sur `https://<domaine-du-serveur>/api/v1/public-key?format=pem`.
