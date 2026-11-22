---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 137-141
maj: 2026-11-10
---
# Table server_secrets

Les secrets que le serveur crée lui-même au premier démarrage quand ils ne sont pas donnés en variables d'environnement, et la marque d'environnement de la base. **Ne jamais recopier une valeur de cette table.** Définie dans [[schema.sql]] (lignes 137-141). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `name` | TEXT | clé primaire | `license_signing_key` (clé privée Ed25519 en PEM), `session_secret` (HMAC des cookies), `environment` (environnement propriétaire de la base) | [[db.js]] (`secret`, `ensureKeys`, `claimDatabase`) |
| `value` | TEXT | NOT NULL | La valeur | [[db.js]] |
| `created_at` | BIGINT | NOT NULL | Création | [[db.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `name`.

## Qui écrit, qui lit

- **Écrit** : [[db.js]] : insertion une seule fois (la première valeur gagne).
- **Lit** : [[db.js]] (démarrage ; garde-fou : un serveur d'un autre environnement refuse la base), [[admin.js (script serveur)]] (`export-keys`).

## Durée de vie

Jamais modifiée ni supprimée par le code.

## Liens avec le reste

Tables liées : [[Table audit]], [[Table licenses]], [[Table users]].

## À savoir avant de modifier

- Changer `license_signing_key` invaliderait toutes les licences des apps installées : voir [[Clés et secrets]].
- Les variables `LICENSE_SIGNING_KEY` et `SESSION_SECRET`, si elles sont réglées, passent avant cette table ([[config.js]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
