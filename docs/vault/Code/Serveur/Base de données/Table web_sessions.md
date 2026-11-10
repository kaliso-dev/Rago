---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 12-17
maj: 2026-11-10
---
# Table web_sessions

Les sessions du site de compte (cookie `rg_session`). Le jeton n'est jamais stocké : seulement son SHA-256. Définie dans [[schema.sql]] (lignes 12-17). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `token_hash` | TEXT | clé primaire | SHA-256 du jeton aléatoire du cookie | [[licensing.js]] (`createWebSession`) |
| `user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE | Compte connecté | [[licensing.js]] |
| `created_at` | BIGINT | NOT NULL | Ouverture | [[licensing.js]] |
| `expires_at` | BIGINT | NOT NULL | Ouverture + 30 jours (`SESSION_TTL`) | [[licensing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `token_hash`. Pas d'index sur `user_id`.

## Qui écrit, qui lit

- **Écrit** : [[licensing.js]] : création à la connexion (`signIn` d'[[app.js]]), suppression à la déconnexion, à un changement de mot de passe (toutes les sessions du compte) et au bannissement.
- **Lit** : [[licensing.js]] (`userForWebSession`, refuse un compte banni), [[admin.js (serveur)]] (nombre de sessions ouvertes sur la fiche joueur).

## Durée de vie

Les lignes expirées ne sont **jamais supprimées** (aucune purge dans [[retention.js]]) ; elles sont seulement ignorées. Effacées avec le compte (cascade).

## Liens avec le reste

Tables liées : [[Table users]], [[Table api_sessions]], [[Table password_resets]].

## À savoir avant de modifier

- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
