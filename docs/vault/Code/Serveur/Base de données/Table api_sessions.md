---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 162-168
maj: 2026-11-10
---
# Table api_sessions

Les sessions « compte » de l'app Windows (`POST /api/v1/account/login`), pour les avis et la photo sans licence sur le PC (comptes gratuits compris). Ajoutée le 09/10/2026. Définie dans [[schema.sql]] (lignes 162-168). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `token_hash` | TEXT | clé primaire | SHA-256 du jeton `account_token` donné à l'app | [[licensing.js]] (`createApiSession`) |
| `user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE | Compte | [[licensing.js]] |
| `created_at` | BIGINT | NOT NULL | Ouverture | [[licensing.js]] |
| `expires_at` | BIGINT | NOT NULL | Ouverture + 180 jours (`API_SESSION_TTL`) | [[licensing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `token_hash` ; index `api_sessions_user (user_id)`.

## Qui écrit, qui lit

- **Écrit** : [[licensing.js]] : création (`/account/login` d'[[app.js]]), suppression à `POST /api/v1/account/logout`, au changement de mot de passe et au bannissement.
- **Lit** : [[licensing.js]] (`userForApiSession`, refuse un compte banni), [[admin.js (serveur)]] (sessions ouvertes).

## Durée de vie

Lignes expirées jamais purgées. Effacées avec le compte.

## Liens avec le reste

Tables liées : [[Table users]], [[Table web_sessions]], [[Table reviews]].

## À savoir avant de modifier

- Un jeton de licence (3 parties séparées par des points) passe avant : [[app.js]] (`apiUser`) ne cherche dans cette table que les autres jetons.
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
