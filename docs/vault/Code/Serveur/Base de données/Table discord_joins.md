---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 208-221
maj: 2026-11-10
---
# Table discord_joins

Chaque arrivée sur le serveur Discord et l'invitation utilisée (bot communauté, 12/10/2026). Sert au comptage des invitations (VIP/MVP) et à `/growth`. Définie dans [[schema.sql]] (lignes 208-221). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | TEXT | clé primaire | `dj_<id discord>_<date d'arrivée>` | [[community.js]] |
| `discord_id` | TEXT | NOT NULL | Membre | [[community.js]] |
| `joined_at` | BIGINT | NOT NULL | Arrivée ; `0` = était là avant le bot (vu en partant) | [[community.js]] |
| `left_at` | BIGINT | — | Départ | [[community.js]] (`GUILD_MEMBER_REMOVE`) |
| `invite_code` | TEXT | — | Code de l'invitation utilisée | [[community.js]] |
| `inviter_id` | TEXT | — | Membre à qui appartient l'invitation (`NULL` : URL personnalisée, inconnue, invitation d'un bot) | [[community.js]] |
| `source` | TEXT | NOT NULL | `invite`, `vanity`, `unknown`, `before_bot` | [[community.js]] |
| `first_join` | BOOLEAN | NOT NULL | Faux pour un retour : ne compte jamais une deuxième fois | [[community.js]] |
| `account_created_at` | BIGINT | NOT NULL | Création du compte Discord, lue dans l'id (un compte de moins de 7 jours ne compte pas) | [[community.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id` ; index `discord_joins_inviter (inviter_id)`, `discord_joins_member (discord_id)`, `discord_joins_at (joined_at)`.

## Qui écrit, qui lit

- **Écrit** : [[community.js]] (2 insertions : arrivée, et ligne `before_bot` au départ d'un ancien membre ; 1 mise à jour : `left_at`), [[retention.js]] (purge).
- **Lit** : [[community.js]] (`inviteStats`, `leaderboard`, `growthStats`, passe des rôles).

## Durée de vie

Purge horaire ([[retention.js]]) **12 mois après le départ** (`left_at > 0`). Les membres encore présents restent.

## Liens avec le reste

Tables liées : [[Table discord_invite_links]], [[Table discord_invite_bonus]], [[Table discord_invite_roles]], [[Table discord_links]].

## À savoir avant de modifier

- Une arrivée compte pour l'invitant si première arrivée, invitation d'un autre membre, compte de 7 jours au moins, pas un lien partenaire, et membre resté 7 jours ([[Bot communauté Discord]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
