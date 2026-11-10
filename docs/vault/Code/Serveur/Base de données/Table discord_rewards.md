---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 193-206
maj: 2026-11-10
---
# Table discord_rewards

Les récompenses Discord données (10/10/2026) : rôles VIP / MVP et boosts transformés en temps de Premium et en code promo à usage unique. Une fois par compte Discord **et** une fois par compte Rago pour chaque récompense. Définie dans [[schema.sql]] (lignes 193-206). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | TEXT | clé primaire | `drw_…` | [[discord.js]] (`giveReward`) |
| `kind` | TEXT | NOT NULL | `vip`, `mvp`, `boost`, `boost2` | [[discord.js]] |
| `discord_id` | TEXT | NOT NULL | Membre Discord | [[discord.js]] |
| `user_id` | TEXT | FK `users(id)` ON DELETE SET NULL | Compte Rago (vidé si le compte est supprimé : la récompense reste comptée pour ce Discord) | [[discord.js]] |
| `given_at` | BIGINT | NOT NULL | Réservation | [[discord.js]] |
| `license_id` | TEXT | — | Licence prolongée ou créée | [[discord.js]] |
| `action` | TEXT | — | `created`, `extended`, `subscription` (paiements décalés), `lifetime` (rien à ajouter) | [[discord.js]] |
| `until` | BIGINT | — | Premium jusqu'à (ms), quand du temps a été ajouté | [[discord.js]] |
| `promo_code` | TEXT | — | Code Stripe à usage unique `NOM-XXXXXX` montré sur `/account` | [[discord.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id` ; `UNIQUE (discord_id, kind)` et `UNIQUE (user_id, kind)`.

## Qui écrit, qui lit

- **Écrit** : [[discord.js]] : réservation (`INSERT … ON CONFLICT DO NOTHING`), puis mise à jour après le temps de Premium ([[licensing.js]]) ; suppression si Stripe ou la base échoue (nouvel essai plus tard).
- **Lit** : [[discord.js]] (`rewardsOf`, page compte, contrôles), [[admin.js (serveur)]] (fiche joueur).

## Durée de vie

Jamais purgée.

## Liens avec le reste

Tables liées : [[Table discord_links]], [[Table licenses]], [[Table users]], [[Table discord_invite_roles]].

## À savoir avant de modifier

- Le commentaire du schéma (`vip | mvp`) ne cite pas `boost` et `boost2`.
- `boost2` remplace `boost` (décision de Sofiene du 10/10/2026, voir [[discord.js]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
