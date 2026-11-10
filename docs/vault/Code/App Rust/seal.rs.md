---
type: code
tags: [code, app, rust, sécurité]
fichier: app/src-tauri/src/seal.rs
lignes: 156
maj: 2026-11-10
---
# seal.rs

Chiffrement authentifié maison (flux HMAC-SHA256 en mode compteur + étiquette HMAC) et dérivation de toutes les clés de l'app : scripts Premium, scripts gratuits, `applied.json`, `history.json`, fichiers natifs. Fiche parente : [[Code de l'app (Rust)]]. Contexte sécurité : [[Clés et secrets]].

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (1.1.6). Le fichier est aussi compilé dans [[build.rs]] (par `#[path]`), d'où `#![allow(dead_code)]`.

## Rôle et place dans l'ensemble
- À la compilation : [[embed_scripts.rs]] et [[build.rs]] chiffrent les scripts et les fichiers natifs avec `seal`.
- À l'exécution : [[catalog.rs]] ouvre les paquets (`open` + `offline_key` ou clé reçue du serveur), [[assets.rs]] ouvre `LowLatency.pow` et le `.nip`, [[backup.rs]] utilise `ledger_key` en secours de DPAPI, [[history.rs]] utilise `history_key` et `history_entropy`.
- Le serveur de licences fait le même calcul que `version_key` pour donner la clé des scripts à une licence active ([[Serveur de licences]], [[license.rs]]).

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `TEST_SECRET` | secret de **développement** (valeur dans le code, publique) ; un build release connecté le refuse ([[embed_scripts.rs]]). Ne pas recopier sa valeur |
| `hmac(key, msg) -> [u8;32]` | HMAC-SHA256 écrit à la main (clé > 64 octets hachée), vérifié contre la RFC 4231 |
| `version_key(secret, version)` | `HMAC(secret, "rago-scripts-v1\|<version>")` : clé des scripts Premium d'une version |
| `offline_key(version)` | `HMAC(offline_secret, "rago-plain-v1\|<version>")` : scripts gratuits et fichiers natifs |
| `ledger_key()` | `HMAC(offline_secret, "rago-ledger-v1")` : secours d'`applied.json` |
| `history_key()` | `HMAC(offline_secret, "rago-history-v1")` : couche de l'app d'`history.json` |
| `history_entropy()` | `HMAC(offline_secret, "rago-history-entropy-v1")` : entropie DPAPI d'`history.json` |
| `seal(key, nonce[16], plain) -> Vec<u8>` | `nonce (16) ‖ chiffré ‖ étiquette (32)` |
| `open(key, sealed) -> Option<Vec<u8>>` | `None` si moins de 48 octets, clé fausse ou contenu modifié |

## Fonctionnement détaillé
- `offline_secret()` (privé) reconstruit un secret de 32 octets par XOR de deux constantes `A` et `B`, pour qu'il n'apparaisse pas d'un bloc dans l'exe. Le code le dit lui-même : c'est une **obfuscation**, pas un vrai secret (il est dans le binaire). Elle empêche de lire les commandes en ouvrant l'exe ou en le donnant à une IA, pas une rétro-ingénierie déterminée.
- `xor_stream(key, nonce, data)` : clé de chiffrement `ek = HMAC(key, "enc")` ; pour le bloc `i` (32 octets), flux = `HMAC(ek, nonce ‖ i en u64 big-endian)`, XOR avec les données.
- `tag(key, nonce, ct)` : `HMAC(HMAC(key, "mac"), nonce ‖ ct)`. Chiffrer puis authentifier.
- `open` compare l'étiquette **en temps constant** (OU des XOR) avant de déchiffrer.
- La vraie protection des scripts Premium est `version_key` : son secret n'est connu que de la CI (variable `RAGO_SCRIPTS_SECRET`) et du serveur (`SCRIPTS_SECRET`). Voir [[Variables d'environnement]] et [[CI GitHub Actions]].

## Tests
`hmac_matches_rfc4231` (cas 2 de la RFC 4231), `seal_round_trip_and_rejects_wrong_key` (le chiffré ne contient pas le clair ; mauvaise version ou octet modifié → `None`). `history_keys_are_distinct` est dans [[history.rs]].

## À savoir avant de modifier
- **Ne jamais changer** `ledger_key`, `history_key`, `history_entropy` ni `offline_secret` : les fichiers des joueurs deviendraient illisibles (mis de côté) après la mise à jour. Les libellés `"rago-…-v1"` sont des séparateurs de domaine : en ajouter un nouveau pour un nouvel usage, ne pas réutiliser.
- Changer le format de `seal` casse la compatibilité avec le serveur (clé Premium) et avec les fichiers existants.
- Ne jamais écrire dans le vault la valeur des constantes `A`/`B`, du secret de test ni des secrets de la CI (dépôt public, règle de [[Clés et secrets]]).
