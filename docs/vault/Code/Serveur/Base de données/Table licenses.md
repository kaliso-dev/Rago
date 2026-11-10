---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 20-48, 123
maj: 2026-11-10
---
# Table licenses

Une ligne par achat (Stripe), licence offerte (support, admin) ou récompense (affiliation, Discord). `user_id` reste vide tant que l'acheteur n'a pas créé ou relié son compte. C'est la table centrale de Premium. Définie dans [[schema.sql]] (lignes 20-48, 123). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | TEXT | clé primaire | `lic_…` | [[licensing.js]] (`insertLicense`) |
| `key` | TEXT | NOT NULL, UNIQUE | Clé `RAGO-XXXXX-XXXXX-XXXXX-XXXXX` (base32), affichée masquée | [[licensing.js]] |
| `user_id` | TEXT | FK `users(id)` sans cascade | Compte titulaire ; `NULL` = achat pas encore rattaché (ou compte supprimé) | [[licensing.js]] (`claimLicense`), [[support.js]] (mis à `NULL`) |
| `email` | TEXT | NOT NULL | E-mail de l'achat ; `deleted-…` après suppression du compte | [[licensing.js]], [[support.js]] |
| `status` | TEXT | NOT NULL, défaut `active` | `active` ou `revoked` | [[licensing.js]] (`setLicenseStatus`), [[support.js]] |
| `status_reason` | TEXT | — | Raison : `refunded`, `disputed`, `manual`, `subscription_ended`, `replaced`, `duplicate`, `banned`, `deleted`, `test_mode`, ou saisie libre (`affiliate_fraud`…) | [[licensing.js]], [[billing.js]], [[admin.js (serveur)]] |
| `source` | TEXT | NOT NULL, défaut `stripe` | `stripe`, `grant` (offerte), `affiliate`, `discord` (récompenses) | [[licensing.js]] |
| `stripe_session_id` | TEXT | UNIQUE | Session Checkout (`cs_…`) : un achat ne crée qu'une licence | [[licensing.js]] (`fulfillCheckoutSession`) |
| `stripe_payment_intent` | TEXT | — | Paiement (remboursements, litiges) | [[licensing.js]] |
| `stripe_customer_id` | TEXT | — | Client Stripe (portail, réutilisé au prochain achat) | [[licensing.js]] |
| `amount` | INTEGER | — | Montant payé en centimes | [[licensing.js]] |
| `currency` | TEXT | — | Devise | [[licensing.js]] |
| `claim_token_hash` | TEXT | — | SHA-256 du lien de réclamation `/claim/<jeton>` ; vidé au rattachement | [[licensing.js]] (`newClaimToken`, `claimLicense`), [[support.js]] |
| `token_version` | INTEGER | NOT NULL, défaut 1 | Monte de 1 à chaque changement de statut ou libération du PC : les anciens jetons (`tv`) ne marchent plus | [[licensing.js]] |
| `last_reset_at` | BIGINT | — | Dernière libération du PC (délai `SELF_SERVICE_RESET_DAYS`) | [[licensing.js]] (`resetDevice`) |
| `created_at` | BIGINT | NOT NULL | Création | [[licensing.js]] |
| `claimed_at` | BIGINT | — | Rattachement au compte | [[licensing.js]] |
| `plan` | TEXT | NOT NULL, défaut `lifetime` | `month`, `year`, `lifetime`, `reward` (temps offert qui s'arrête seul) ; ajoutée le 05/10/2026 | [[licensing.js]] |
| `stripe_subscription_id` | TEXT | — | Abonnement Stripe (`sub_…`) | [[licensing.js]] (`syncSubscription`) |
| `current_period_end` | BIGINT | — | Payé (ou offert) jusqu'à (ms) | [[licensing.js]] (`syncSubscription`, `givePremiumTime`) |
| `cancel_at_period_end` | BOOLEAN | NOT NULL, défaut false | Résilié, Premium jusqu'à la fin de la période | [[licensing.js]] (`syncSubscription`) |
| `referral_code` | TEXT | — | Code d'affiliation porté par l'achat (`metadata.ref` de Checkout) | [[licensing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id` ; `UNIQUE (key)`, `UNIQUE (stripe_session_id)` ; index `licenses_user (user_id)`, `licenses_sub (stripe_subscription_id)`, `licenses_customer (stripe_customer_id)`, `licenses_pi (stripe_payment_intent)`, `licenses_claim (claim_token_hash)`. Référencée par [[Table devices]] et [[Table referrals]] (sans cascade).

## Qui écrit, qui lit

- **Écrit** : [[licensing.js]] (création, rattachement, statut, abonnement, temps offert, remplacement), appelé par [[billing.js]] (webhooks), [[affiliates.js]], [[discord.js]], [[admin.js (serveur)]], [[admin.js (script serveur)]] ; [[support.js]] (anonymisation).
- **Lit** : [[licensing.js]], [[app.js]], [[billing.js]], [[affiliates.js]], [[discord.js]] (Premium actif → rôle Pro), [[community.js]] (acheteurs dans `/growth`), [[support.js]], [[admin.js (serveur)]] (14 requêtes), [[admin.js (script serveur)]].

## Durée de vie

Jamais supprimée : à la suppression d'un compte, la licence est gardée **sans nom** pour la comptabilité (`user_id = NULL`, e-mail `deleted-…`, `revoked`/`deleted`). Une récompense (`reward`) dépassée est arrêtée à la lecture (`current`, raison `subscription_ended`).

## Liens avec le reste

Tables liées : [[Table users]], [[Table devices]], [[Table referrals]], [[Table trials]], [[Table audit]], [[Table stripe_events]].

## À savoir avant de modifier

- Les commentaires du schéma sont en retard : `status_reason` n'y cite que `refunded | disputed | manual`, `source` que `stripe | grant` et `plan` que `month | year | lifetime`.
- Un compte n'a qu'une licence active à la fois (vérifié par le code, pas par une contrainte).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
