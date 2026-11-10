---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 180-192
maj: 2026-11-10
---
# Table discord_links

Le compte Discord relié depuis `/account` (10/10/2026) pour le **rôle Pro** : le bot le donne tant que Premium est actif et le retire quand il s'arrête. Un Discord par compte Rago, et inversement. Définie dans [[schema.sql]] (lignes 180-192). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `user_id` | TEXT | clé primaire, FK `users(id)` ON DELETE CASCADE | Compte Rago | [[discord.js]] (`link`) |
| `discord_id` | TEXT | NOT NULL, UNIQUE | Identifiant Discord | [[discord.js]] |
| `discord_name` | TEXT | — | `@pseudo` au moment de la liaison (support) | [[discord.js]] |
| `linked_at` | BIGINT | NOT NULL | Liaison | [[discord.js]] |
| `role` | BOOLEAN | NOT NULL, défaut false | Rôle Pro tel que le bot l'a mis la dernière fois | [[discord.js]] (`apply`) |
| `error` | TEXT | — | Pourquoi le dernier changement a échoué : `not_member`, `forbidden`, `unauthorized`, `config`, `unavailable` | [[discord.js]] (`apply`) |
| `synced_at` | BIGINT | — | Dernière tentative (délai de 15 min, ou 1 h si pas sur le serveur) | [[discord.js]] |
| `rewards_checked_at` | BIGINT | — | Dernier regard sur les rôles du membre pour les récompenses | [[discord.js]] (`checkRewards`) |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `user_id` ; `UNIQUE (discord_id)`.

## Qui écrit, qui lit

- **Écrit** : [[discord.js]] (liaison : supprime une autre liaison du même Discord puis `INSERT … ON CONFLICT (user_id) DO UPDATE` ; rôle ; suppression à `unlink`), [[admin.js (serveur)]] (suppression directe quand le bot n'est pas configuré).
- **Lit** : [[discord.js]] (`syncUser`, `reconcile`, `rewardPass`), [[community.js]] (comptes liés pour `/growth` et les rôles VIP/MVP), [[support.js]] (délier avant suppression), [[admin.js (serveur)]], [[admin.js (script serveur)]].

## Durée de vie

Effacée au déliage ou avec le compte.

## Liens avec le reste

Tables liées : [[Table discord_rewards]], [[Table users]], [[Table oauth_identities]], [[Table discord_joins]].

## À savoir avant de modifier

- Ne pas confondre avec [[Table oauth_identities]] (connexion avec Discord).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
