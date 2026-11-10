---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 65-70
maj: 2026-11-10
---
# Table password_resets

Les liens « choisir un nouveau mot de passe » (`/reset/<jeton>`), envoyés par e-mail (`/forgot`) ou créés par le support. Définie dans [[schema.sql]] (lignes 65-70). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `token_hash` | TEXT | clé primaire | SHA-256 du jeton du lien | [[licensing.js]] (`createPasswordReset`) |
| `user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE | Compte | [[licensing.js]] |
| `expires_at` | BIGINT | NOT NULL | Création + 1 heure | [[licensing.js]] |
| `used_at` | BIGINT | — | Date d'utilisation ; aussi remplie pour tous les liens ouverts quand le mot de passe change | [[licensing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `token_hash`.

## Qui écrit, qui lit

- **Écrit** : [[licensing.js]], appelé par [[app.js]] (`/forgot`), [[admin.js (serveur)]] (action `lien-mdp`) et [[admin.js (script serveur)]] (`reset-link`).
- **Lit** : [[licensing.js]] (`passwordResetEmail`, utilisation), [[admin.js (serveur)]] (lien encore valable sur la fiche joueur).

## Durée de vie

Jamais purgée (les lignes utilisées ou expirées restent). Effacée avec le compte.

## Liens avec le reste

Tables liées : [[Table users]], [[Table web_sessions]], [[Table audit]].

## À savoir avant de modifier

- Un lien ne marche qu'une fois (`UPDATE … SET used_at … RETURNING`).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
