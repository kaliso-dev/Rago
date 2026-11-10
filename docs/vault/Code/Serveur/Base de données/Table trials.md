---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 303-312
maj: 2026-11-10
---
# Table trials

Les essais gratuits (04/11/2026) : 3 jours avec carte, payés à la fin sauf résiliation. Un par personne : un deuxième essai avec la même carte ou le même e-mail est payé tout de suite. Définie dans [[schema.sql]] (lignes 303-312). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `subscription_id` | TEXT | clé primaire | Abonnement Stripe en essai | [[billing.js]] (`settleTrial`) |
| `email` | TEXT | NOT NULL | E-mail en minuscules | [[billing.js]] |
| `card_fingerprint` | TEXT | — | Empreinte Stripe de la carte (la même partout pour une même carte) | [[billing.js]] |
| `license_id` | TEXT | — | Licence créée | [[billing.js]] |
| `started_at` | BIGINT | NOT NULL | Début de l'essai | [[billing.js]] |
| `charged_now` | BOOLEAN | NOT NULL, défaut FALSE | Vrai si l'essai a été refusé (fin d'essai immédiate, `trial.refused`) | [[billing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `subscription_id` ; index `trials_email (email)` et `trials_card (card_fingerprint)`.

## Qui écrit, qui lit

- **Écrit** : [[billing.js]] (une ligne par abonnement en essai, depuis `/checkout/success` ou le webhook) ; [[retention.js]] (suppression).
- **Lit** : [[billing.js]] (essai déjà fait ?), [[app.js]] (`/buy` refuse `trial=1` si l'e-mail a déjà un essai ; essai en cours sur `/account` et dans `GET /api/v1/account/subscription`), [[admin.js (serveur)]] (filtre « En essai », fiche).

## Durée de vie

Purge après **2 ans** ([[retention.js]]). Pas effacée à la suppression du compte ([[support.js]]) : c'est voulu (un seul essai par personne et par carte) et annoncé dans la politique de confidentialité, « 2 years after the trial started » (CONFIRMÉ, `site/tools/make_legal.py`, [[Conformité juridique]]).

## Liens avec le reste

Tables liées : [[Table licenses]], [[Table stripe_events]], [[Table audit]].

## À savoir avant de modifier

- Décision codée le 10/11/2026 (commentaire de [[billing.js]]) : l'essai prend toujours le prix **mensuel**.
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
