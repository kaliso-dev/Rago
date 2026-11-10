---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 99-110
maj: 2026-11-10
---
# Table referrals

Un filleul : un acheteur qui a utilisé le code d'un affilié. Un acheteur n'utilise qu'un code, une fois. Définie dans [[schema.sql]] (lignes 99-110). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | TEXT | clé primaire | `ref_…` | [[affiliates.js]] (`applyReferral`) |
| `affiliate_user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE | Affilié | [[affiliates.js]] |
| `referred_user_id` | TEXT | NOT NULL, UNIQUE, FK `users(id)` ON DELETE CASCADE | Filleul | [[affiliates.js]] |
| `license_id` | TEXT | NOT NULL, UNIQUE, FK `licenses(id)` | Achat du filleul ; suit vers la nouvelle licence si le filleul passe à Lifetime | [[affiliates.js]], [[licensing.js]] |
| `status` | TEXT | NOT NULL, défaut `pending` | `pending`, `counted` ou `void` | [[affiliates.js]] |
| `void_reason` | TEXT | — | `refunded`, `disputed`, `same_device`, `same_payer`, `subscription_ended`, `revoked`, `test_mode` | [[affiliates.js]] |
| `machine_guid` | TEXT | — | Premier PC activé par le filleul (comparé aux PC de l'affilié) | [[licensing.js]] (`activate`), [[affiliates.js]] |
| `smbios_uuid` | TEXT | — | Idem | [[licensing.js]], [[affiliates.js]] |
| `board_serial` | TEXT | — | Idem | [[licensing.js]], [[affiliates.js]] |
| `created_at` | BIGINT | NOT NULL | Code appliqué | [[affiliates.js]] |
| `counted_at` | BIGINT | — | Compté (après `AFFILIATE_HOLD_DAYS`) | [[affiliates.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id` ; `UNIQUE (referred_user_id)`, `UNIQUE (license_id)` ; index `referrals_affiliate (affiliate_user_id)`.

## Qui écrit, qui lit

- **Écrit** : [[affiliates.js]] (création, empreinte, comptage, annulation), [[licensing.js]] (empreinte à l'activation, licence remplacée).
- **Lit** : [[affiliates.js]] (8 requêtes : résumé, évaluation), [[app.js]] (achat avec code, `settleReferral`), [[admin.js (serveur)]] (parrain sur la fiche), [[admin.js (script serveur)]] (`affiliate`).

## Durée de vie

Effacée avec le compte de l'affilié ou du filleul (cascade).

## Liens avec le reste

Tables liées : [[Table affiliates]], [[Table licenses]], [[Table account_devices]], [[Table users]].

## À savoir avant de modifier

- Le commentaire du schéma ne cite que 4 raisons d'annulation sur 7.
- Le journal de l'admin ne montre pas `referral.created` dans le filtre « affiliation » ([[admin.js (serveur)]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
