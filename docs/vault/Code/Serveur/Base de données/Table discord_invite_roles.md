---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 237-242
maj: 2026-11-10
---
# Table discord_invite_roles

Les rôles VIP / MVP donnés par le bot Rago d'après son propre comptage (`DISCORD_INVITE_ROLES=1`), une fois par membre et par palier. Définie dans [[schema.sql]] (lignes 237-242). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `discord_id` | TEXT | NOT NULL, clé primaire avec `kind` | Membre | [[community.js]] |
| `kind` | TEXT | NOT NULL | `vip` ou `mvp` | [[community.js]] |
| `given_at` | BIGINT | NOT NULL | Réservation | [[community.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire (`discord_id`, `kind`).

## Qui écrit, qui lit

- **Écrit** : [[community.js]] (`inviteRolesPass` : `INSERT … ON CONFLICT DO NOTHING RETURNING` pour réserver ; suppression si le rôle n'a pas pu être donné, nouvel essai à la passe suivante).
- **Lit** : Aucune lecture en dehors de la réservation elle-même (le `RETURNING` dit si la ligne est nouvelle).

## Durée de vie

Jamais purgée : un membre qui perd puis retrouve le palier n'est pas annoncé deux fois.

## Liens avec le reste

Tables liées : [[Table discord_joins]], [[Table discord_invite_bonus]], [[Table discord_rewards]].

## À savoir avant de modifier

- La récompense Premium qui suit le rôle est dans [[Table discord_rewards]] (via `checkRewards` de [[discord.js]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
