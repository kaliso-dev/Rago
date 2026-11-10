---
type: code
tags: [code, app, rust, moteur]
fichier: app/src-tauri/src/history.rs
lignes: 292
maj: 2026-11-10
---
# history.rs

Historique des réglages lancés (appliqués ou annulés), gardé **chiffré en deux couches** dans `history.json`. Fiche parente : [[Code de l'app (Rust)]]. Fonctionnalités : [[Moteur des tweaks]] (onglet Restaurer > historique), [[Partage et support]] (le rapport de support le reprend).

Tout est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (1.1.5) ; chiffré au repos depuis la [[Version 1.1.14]].

## Rôle et place dans l'ensemble
- [[runner.rs]] appelle `push` après chaque réglage (sauf les id internes en `__`).
- [[lib.rs]] le charge au démarrage, l'expose par `get_history` / `clear_history`, le passe à `Ledger::import_history` ([[backup.rs]]) au premier lancement de 1.1.6, et au rapport de support ([[report.rs]]).
- Chiffrement : [[seal.rs]] (couche de l'app) sous DPAPI de [[license.rs]] (`vault::protect` avec entropie).
- `now_ms()` (millisecondes depuis 1970) est utilisé dans tout le code (moteur, sauvegarde, remise).

## Ce que le fichier expose
| Élément | Description |
|---|---|
| `struct Entry {id, variant, ts, ok, code, duration_ms, undo}` | une ligne (JSON camelCase : `durationMs`) ; `ts` en ms ; `undo` : retour à l'état d'avant |
| `History::load(path) -> History` | charge, migre ou met de côté |
| `History::push(entry)` | ajoute, coupe à `MAX_ENTRIES` = **1000** (les plus anciennes partent), enregistre |
| `History::all() -> Vec<Entry>` | copie de toutes les lignes |
| `History::clear()` | vide et enregistre |
| `pub fn now_ms() -> u64` | heure en millisecondes |

## Fonctionnement détaillé

### Format du fichier
- **Cas normal** : `RAGO-HISTORY-2\0` + DPAPI( `seal(history_key, nonce, json)` ) avec l'entropie `seal::history_entropy()`. Le fichier ne s'ouvre que sur ce PC, avec ce compte Windows, et par Rago Optimizer. Modifié à la main, il ne se relit plus (étiquette d'authentification de [[seal.rs]]).
- **DPAPI refuse** (profil Windows abîmé) : `RAGO-HISTORY-2A\0` + `seal(history_key, nonce, json)` seulement ; réécrit avec DPAPI dès que possible.
- **Avant 1.1.14** : JSON en clair, relu puis réécrit chiffré au chargement.
- Nonce de 16 octets : `vault::random` (générateur de Windows, `BCryptGenRandom`), sinon sha256(heure, PID, compteur, contenu) : jamais deux fois le même.

### Chargement (`load`)
1 lecture + 3 nouveaux essais espacés de 200 ms (verrou d'un antivirus). Absent → historique vide. Illisible (« Windows couldn't decrypt it », « modified or damaged », JSON invalide) → renommé `history.json.bad-<ms>` avec une ligne dans `logs\repairs.log` ; s'il ne peut pas être renommé, `unread` empêche toute écriture pendant ce lancement (« …this launch's history isn't saved »).

### Écriture (`save`)
Chiffre, écrit `history.json.tmp`, `sync_all`, renomme : une coupure de courant ne laisse jamais un fichier coupé ou vide sous le bon nom. Chaque `push` réécrit le fichier entier (1000 lignes au plus).

## Données touchées
`%APPDATA%\gg.rago.optimizer\history.json`, `history.json.tmp`, `history.json.bad-<ms>`, `logs\repairs.log`.

## Tests
`history_is_encrypted_at_rest` (ni id ni variante lisibles dans le fichier), `each_write_uses_a_new_nonce`, `plaintext_history_is_migrated`, `tampered_history_is_set_aside`, `history_keys_are_distinct`.

## À savoir avant de modifier
- `history_key` et `history_entropy` sont **fixes d'une version à l'autre** : les changer rendrait l'historique illisible après une mise à jour (il serait mis de côté).
- Même logique de mise de côté que `applied.json` ([[backup.rs]]) : garder les deux cohérentes. Voir [[Réparations au lancement]].
- L'historique ne dit pas ce qui est appliqué aujourd'hui : c'est `applied.json` qui fait foi.
