---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 172-176
maj: 2026-11-10
---
# Table site_settings

Réglages changés depuis `/admin` ou `npm run admin`. Aujourd'hui une seule ligne : `popup`, le pop-up de réduction du site. Définie dans [[schema.sql]] (lignes 172-176). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `name` | TEXT | clé primaire | Nom du réglage (`popup`) | [[promo.js]] (`savePopup`) |
| `value` | TEXT | NOT NULL | JSON : `enabled`, `code`, `eyebrow`, `title`, `text` (le pourcentage et le nombre d'utilisations restent dans Stripe) | [[promo.js]] |
| `updated_at` | BIGINT | NOT NULL | Dernier changement | [[promo.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `name` (`INSERT … ON CONFLICT (name) DO UPDATE`).

## Qui écrit, qui lit

- **Écrit** : [[promo.js]], appelé par [[admin.js (serveur)]] (`POST /admin/popup`) et [[admin.js (script serveur)]] (`popup`).
- **Lit** : [[promo.js]] (`getPopup`), pour `GET /api/v1/promo` d'[[app.js]] et la page « Site et promos ».

## Durée de vie

Jamais supprimée.

## Liens avec le reste

Tables liées : [[Table audit]], [[Table reviews]], [[Table licenses]].

## À savoir avant de modifier

- Sans ligne, les valeurs par défaut de `POPUP_DEFAULTS` s'appliquent (code `RAGO15`).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
