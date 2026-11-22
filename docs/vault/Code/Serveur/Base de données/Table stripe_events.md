---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 72-77
maj: 2026-11-10
---
# Table stripe_events

Les événements de webhook Stripe déjà traités : un même événement renvoyé par Stripe n'est appliqué qu'une fois. Définie dans [[schema.sql]] (lignes 72-77). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | TEXT | clé primaire | Identifiant de l'événement (`evt_…`) | [[billing.js]] (`handleStripeEvent`) |
| `type` | TEXT | NOT NULL | Type (`checkout.session.completed`, `customer.subscription.updated`…) | [[billing.js]] |
| `received_at` | BIGINT | NOT NULL | Date de traitement | [[billing.js]] |
| `livemode` | BOOLEAN | — | Mode Stripe de l'événement ; `NULL` pour les lignes d'avant le 10/10/2026 | [[billing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id`.

## Qui écrit, qui lit

- **Écrit** : [[billing.js]] : insertion **après** le traitement réussi (`ON CONFLICT (id) DO NOTHING`) ; si le traitement échoue, rien n'est écrit et Stripe renvoie l'événement.
- **Lit** : [[billing.js]] : déjà vu ? (début de `handleStripeEvent`) ; dernier événement reçu dans le mode de la clé (`stripeChecks`, affiché sur `/admin` par [[admin.js (serveur)]]).

## Durée de vie

Jamais purgée.

## Liens avec le reste

Tables liées : [[Table licenses]], [[Table trials]], [[Table audit]].

## À savoir avant de modifier

- Un événement de l'autre mode (test/live) est refusé par [[app.js]] avant d'arriver ici ([[Paiements Stripe]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
