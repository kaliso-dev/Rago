---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 150-159
maj: 2026-11-10
---
# Table reviews

Les avis des joueurs (09/10/2026) : un par compte, modifiable, affiché sur le site. Écrits depuis l'app ou la page `/account/review` (Premium). Définie dans [[schema.sql]] (lignes 150-159). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `user_id` | TEXT | clé primaire, FK `users(id)` ON DELETE CASCADE | Auteur | [[reviews.js]] (`saveReview`) |
| `rating` | SMALLINT | NOT NULL, CHECK 1 à 5 | Note en étoiles | [[reviews.js]] |
| `comment` | TEXT | NOT NULL, CHECK non vide | Texte (600 caractères au plus, `COMMENT_MAX`) | [[reviews.js]] |
| `status` | TEXT | NOT NULL, défaut `published` | `published` ou `hidden` (masqué par le support) | [[reviews.js]] (`setReviewStatus`) |
| `app_version` | TEXT | — | Version de l'app qui l'a écrit | [[reviews.js]] |
| `created_at` | BIGINT | NOT NULL | Premier avis | [[reviews.js]] |
| `updated_at` | BIGINT | NOT NULL | Dernière modification (ordre d'affichage) | [[reviews.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `user_id` ; index `reviews_status (status, updated_at)`.

## Qui écrit, qui lit

- **Écrit** : [[reviews.js]] (insertion ou mise à jour, suppression, statut), appelé par [[app.js]], [[admin.js (serveur)]], [[admin.js (script serveur)]].
- **Lit** : [[reviews.js]] (`publicReviews` : 60 derniers pour l'accueil, tous avec `?all=1`), [[admin.js (serveur)]] (moyenne, avis masqués, 100 derniers), [[admin.js (script serveur)]] (`reviews`).

## Durée de vie

Effacée par le joueur, ou avec le compte.

## Liens avec le reste

Tables liées : [[Table users]], [[Table audit]], [[Table site_settings]].

## À savoir avant de modifier

- Le nom et la photo affichés viennent de [[Table users]] ([[profile.js]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
