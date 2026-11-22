---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 79-87
maj: 2026-11-10
---
# Table audit

Le journal de sécurité : achats, licences, PC, comptes, abonnements, affiliation, Discord, actions de l'admin. Affiché sur `/admin/journal` et la fiche joueur. Définie dans [[schema.sql]] (lignes 79-87). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | BIGSERIAL | clé primaire | Numéro croissant (sert aussi à la pagination `avant=<id>`) | base |
| `at` | BIGINT | NOT NULL | Date (ms) | [[db.js]] (`audit`), [[app.js]] |
| `license_id` | TEXT | — | Licence concernée (pas de clé étrangère) | [[db.js]], [[app.js]] |
| `user_id` | TEXT | — | Compte concerné (pas de clé étrangère) | [[db.js]], [[app.js]] |
| `type` | TEXT | NOT NULL | Type d'événement (liste plus bas) | [[db.js]], [[app.js]] |
| `detail` | TEXT | — | Détails en JSON (raison, IP, nom du PC…) ; mis à `NULL` à la suppression du compte | [[db.js]], [[support.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id` ; index `audit_license (license_id, id)`.

## Qui écrit, qui lit

- **Écrit** : La fonction `audit(db, type, {licenseId, userId, detail})` de [[db.js]], appelée par presque tous les modules ; [[app.js]] écrit aussi directement `subscription.canceled_in_app` / `resumed_in_app` ; [[support.js]] vide `detail` ; [[retention.js]] supprime.
- **Lit** : [[admin.js (serveur)]] (journal, activité récente, fiche joueur), [[admin.js (script serveur)]] (`show` : 15 derniers), [[billing.js]] (marqueurs `license.subscription_stopped` et `license.subscription_replaced` : un abonnement remplacé par Lifetime est-il déjà arrêté ?).

## Durée de vie

Purge horaire ([[retention.js]]) après **12 mois**, sauf les deux marqueurs d'abonnement ci-dessus, gardés pour toujours.

## Liens avec le reste

Tables liées : [[Table licenses]], [[Table users]], [[Table devices]].

## À savoir avant de modifier

- Types écrits par le code : `user.created`, `user.oauth_linked`, `user.email_verified`, `user.banned`, `user.unbanned` ; `license.created`, `license.granted`, `license.claimed`, `license.claim_link`, `license.active`, `license.revoked`, `license.duplicate`, `license.reward_extended`, `license.reward_replaced`, `license.subscription_replaced`, `license.subscription_stopped` ; `device.bound`, `device.reset`, `device.blocked` ; `download`, `update_download` ; `subscription.canceled_in_app`, `subscription.resumed_in_app` ; `trial.started`, `trial.refused` ; `affiliate.joined`, `affiliate.rewarded`, `affiliate.reward_failed`, `affiliate.reward_at_risk`, `referral.created` ; `review.saved`, `review.deleted`, `profile.photo` ; `discord.linked`, `discord.unlinked`, `discord.role_added`, `discord.role_removed`, `discord.reward`, `discord.invite_role`, `discord.partner_link`, `discord.invite_bonus` ; et 25 types `admin.*` ([[admin.js (serveur)]]).
- Libellés en français : `EVENT` d'[[admin-views.js]] ; beaucoup de types n'en ont pas et s'affichent bruts.
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
