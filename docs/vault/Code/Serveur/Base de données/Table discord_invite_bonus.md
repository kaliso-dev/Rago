---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 230-235
maj: 2026-11-10
---
# Table discord_invite_bonus

Les invitations comptées avant le bot Rago (par l'ancien Invite Tracker), ajoutées à la main par le staff avec `/invites-adjust`. Définie dans [[schema.sql]] (lignes 230-235). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `discord_id` | TEXT | clé primaire | Membre | [[community.js]] |
| `bonus` | INTEGER | NOT NULL | Invitations ajoutées (0 à 1000 ; 0 supprime la ligne) | [[community.js]] |
| `set_by` | TEXT | — | Id Discord du membre du staff | [[community.js]] |
| `set_at` | BIGINT | NOT NULL | Date | [[community.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `discord_id`.

## Qui écrit, qui lit

- **Écrit** : [[community.js]] (`/invites-adjust` : insertion ou mise à jour, suppression pour 0 ; audit `discord.invite_bonus`).
- **Lit** : [[community.js]] (`inviteStats`, `leaderboard`, paliers VIP/MVP).

## Durée de vie

Jamais purgée.

## Liens avec le reste

Tables liées : [[Table discord_joins]], [[Table discord_invite_roles]], [[Table discord_invite_links]].

## À savoir avant de modifier

- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
