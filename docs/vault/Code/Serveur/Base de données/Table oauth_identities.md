---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 260-271
maj: 2026-11-10
---
# Table oauth_identities

Les comptes Google ou Discord qui ouvrent un compte Rago (« Continue with Google/Discord », 25/10/2026). Un compte Rago peut avoir les deux. Définie dans [[schema.sql]] (lignes 260-271). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `provider` | TEXT | NOT NULL, clé primaire avec `subject` | `google` ou `discord` | [[licensing.js]] (`userForIdentity`) |
| `subject` | TEXT | NOT NULL | Identifiant du compte chez le fournisseur (`sub` Google, id Discord) | [[licensing.js]] |
| `user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE | Compte Rago | [[licensing.js]] |
| `email` | TEXT | — | E-mail donné par le fournisseur (pour le support) | [[licensing.js]] |
| `created_at` | BIGINT | NOT NULL | Première connexion | [[licensing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire (`provider`, `subject`) ; `UNIQUE (user_id, provider)` : un seul compte Google et un seul compte Discord par compte Rago.

## Qui écrit, qui lit

- **Écrit** : [[licensing.js]] (insertion à la première connexion, audit `user.oauth_linked`), appelé par [[app.js]] (`/auth/:provider/callback`) avec [[oauth.js]].
- **Lit** : [[licensing.js]] (connexion suivante), [[admin.js (serveur)]] (fiche joueur).

## Durée de vie

Jamais purgée ; effacée avec le compte.

## Liens avec le reste

Tables liées : [[Table users]], [[Table discord_links]], [[Table web_sessions]].

## À savoir avant de modifier

- Ne pas confondre avec [[Table discord_links]] : celle-ci sert à **se connecter**, l'autre au **rôle Pro** sur le serveur Discord ([[Connexion Google et Discord]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
