---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 90-96, 112-119
maj: 2026-11-10
---
# Table affiliates

Les comptes inscrits au programme d'affiliation, avec leur code. Chaque palier de filleuls comptés donne des mois de Premium ([[Promotions et affiliation]]). Définie dans [[schema.sql]] (lignes 90-96, 112-119). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `user_id` | TEXT | clé primaire, FK `users(id)` ON DELETE CASCADE | Compte affilié | [[affiliates.js]] (`joinAffiliate`) |
| `code` | TEXT | NOT NULL, UNIQUE | Code en majuscules | [[affiliates.js]] |
| `created_at` | BIGINT | NOT NULL | Inscription au programme | [[affiliates.js]] |
| `reward_granted_at` | BIGINT | — | Dernière récompense donnée | [[affiliates.js]] (`evaluateAffiliate`) |
| `reward_license_id` | TEXT | — | Licence de la dernière récompense | [[affiliates.js]] |
| `rewards` | INTEGER | NOT NULL, défaut 0 | Nombre de récompenses données (réservé avant l'appel à Stripe, rendu si Stripe refuse) ; une migration met 1 aux anciennes lignes déjà récompensées | [[affiliates.js]] |
| `stripe_promo_id` | TEXT | — | Code promo Stripe du même nom (réduction `AFFILIATE_DISCOUNT_PERCENT` au paiement) | [[billing.js]] (`ensureAffiliatePromo`) |
| `stripe_promo_live` | BOOLEAN | — | Mode Stripe du code (un par mode) | [[billing.js]] |
| `stripe_promo_active` | BOOLEAN | — | Code actif dans Stripe (coupé quand toutes les places sont prises) | [[billing.js]] (`syncPromoActive`) |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `user_id` ; `UNIQUE (code)`.

## Qui écrit, qui lit

- **Écrit** : [[affiliates.js]] (inscription, récompenses), [[billing.js]] (code promo Stripe).
- **Lit** : [[affiliates.js]] (résumé, évaluation), [[billing.js]] (code promo au paiement), [[licensing.js]] (code saisi à l'inscription après achat).

## Durée de vie

Effacée avec le compte (cascade).

## Liens avec le reste

Tables liées : [[Table referrals]], [[Table users]], [[Table licenses]].

## À savoir avant de modifier

- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
