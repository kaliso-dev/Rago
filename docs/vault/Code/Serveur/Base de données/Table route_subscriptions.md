---
type: code
tags: [code, serveur, base-de-données, rago-route]
fichier: licensing/supabase/schema.sql
lignes: 344-365
maj: 2026-11-13
---
# Table route_subscriptions

L'**option Rago Route** (3 $ par mois en plus du Premium, décision de Sofiene du 13/11) : une ligne par abonnement Stripe de l'option. Définie dans [[schema.sql]] (lignes 344-365). Écrite et lue par [[route-addon.js]]. Fiche parente : [[Code du serveur]].

(code de `staging`, 13/11 ; les colonnes `license_id`, `checkout_session` et `stopped_with_premium` y sont depuis le 13/11 au soir ; pas en prod)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `stripe_subscription_id` | TEXT | clé primaire | Abonnement Stripe de l'option | [[route-addon.js]] (`syncRouteSubscription`) |
| `user_id` | TEXT | — (NOT NULL retiré le 13/11) | Compte qui a pris l'option ; vide quand elle a été prise avec un Premium payé avant la création du compte | [[route-addon.js]] |
| `license_id` | TEXT | — | Licence Premium avec laquelle l'option a été prise au paiement (`/buy?…&route=1`) ; sert jusqu'à ce que le compte la rattache | [[route-addon.js]] (`addRouteWithPremium`) |
| `checkout_session` | TEXT | index unique | Paiement Stripe du Premium d'où vient l'option : jamais deux options pour un même paiement | [[route-addon.js]] |
| `stripe_customer_id` | TEXT | — | Client Stripe (le même que celui du Premium) | [[route-addon.js]] |
| `status` | TEXT | NOT NULL | Statut Stripe (`active`, `trialing`, `past_due`, `canceled`, `incomplete`…) ; `active`, `trialing` et `past_due` donnent Rago Route | [[route-addon.js]] |
| `current_period_end` | BIGINT | — | Fin du mois payé (ou de l'essai) | [[route-addon.js]] |
| `cancel_at_period_end` | BOOLEAN | NOT NULL, défaut FALSE | L'option s'arrête à `current_period_end` | [[route-addon.js]] |
| `stopped_with_premium` | BOOLEAN | NOT NULL, défaut FALSE | Arrêt demandé par le serveur parce que le Premium s'arrête ; repris si le Premium reprend | [[route-addon.js]] (`followPremium`) |
| `created_at`, `updated_at` | BIGINT | NOT NULL | Dates | [[route-addon.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `stripe_subscription_id` ; index `route_subscriptions_user (user_id)` et `route_subscriptions_license (license_id)` ; index unique `route_subscriptions_checkout (checkout_session)` (plusieurs lignes vides permises).

## Qui écrit, qui lit

- **Écrit** : [[route-addon.js]], appelé par [[billing.js]] (webhook : Checkout de l'option, Premium payé avec la case cochée, événements d'abonnement) et [[app.js]] (`/checkout/route`, `/checkout/success`, résiliation depuis l'app).
- **Lit** : [[app.js]] (`/api/v1/route/token` demande une option en cours en prod, sauf pendant l'essai gratuit ; `/buy/route` refuse un 2e achat ; bloc « Rago Route » de `/account` ; portail de facturation), passe horaire de [[server.js]] (`stopOrphanRoutes`).
- Une option en cours est celle du compte (`user_id`) **ou** d'une de ses licences (`license_id`).

## Liens avec le reste

Tables liées : [[Table licenses]], [[Table trials]], [[Table stripe_events]], [[Table audit]] (`route.subscription`, `route.added_at_checkout`, `route.subscription_stopped`). Offre : [[Offres et prix]], [[Paiements Stripe]].

## À savoir avant de modifier

- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
- L'option n'est jamais une ligne de `licenses` : la licence reste le Premium.
