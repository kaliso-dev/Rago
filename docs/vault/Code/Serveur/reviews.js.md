---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/reviews.js
lignes: 70
maj: 2026-11-10
---
# reviews.js

Les avis des joueurs : un avis (1 à 5 étoiles + commentaire) par compte, modifié sur place, affiché sur le site. Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Partage et support]], [[Site]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Un joueur laisse son avis depuis l'app (depuis la 1.1.8, connecté à son compte) ou, s'il est Premium, depuis la page `/account/review` du site. Le site lit les avis publiés par `GET /api/v1/reviews`. Le support peut masquer un avis (`/admin` ou `npm run admin -- hide-review`). Les erreurs de saisie utilisent la classe `ProfileError` de [[profile.js]], que [[app.js]] traduit en codes d'API.

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `COMMENT_MAX` | 600 caractères. |
| `cleanReview({rating, comment})` | Valide et nettoie ; renvoie `{rating, comment}` ou lève `ProfileError`. |
| `reviewOf(db, userId)` | L'avis du compte (ligne brute) ou `undefined`. |
| `saveReview(db, userId, input, appVersion)` | Crée ou remplace l'avis (`INSERT … ON CONFLICT (user_id) DO UPDATE`). `app_version` coupé à 20 caractères. Ne touche pas à `status` : un avis masqué reste masqué après modification. |
| `deleteReview(db, userId)` | Supprime l'avis ; vrai s'il existait. |
| `reviewView(r)` | Ce que l'app reçoit : `{rating, comment, updated_at (ISO), hidden}` ou `null`. |
| `SITE_LIMIT` / `ALL_LIMIT` | 60 avis pour le carrousel de l'accueil, 1000 pour la page de tous les avis (`?all=1`). |
| `publicReviews(db, cfg, limit)` | `{count, average, reviews:[{id, name, rating, comment, avatar_url, date}]}`. |
| `setReviewStatus(db, userId, status)` | `published` ou `hidden` ; vrai si l'avis existe. |

## Fonctionnement détaillé

`cleanReview` :
1. note entière de 1 à 5, sinon `invalid_rating` « Pick a rating from 1 to 5 stars. » ;
2. commentaire normalisé en NFC, fins de ligne `\r\n` → `\n`, caractères de contrôle et caractères invisibles retirés (U+0000–U+0009, U+000B–U+001F, U+007F–U+009F, U+200B, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069 : ce dernier groupe empêche les inversions de sens d'écriture), espaces avant un saut de ligne retirés, au plus une ligne vide de suite, puis `trim` ;
3. vide → `empty_comment` « Write a few words about Rago Optimizer. » ; plus de 600 caractères → `comment_too_long`.

`publicReviews` ne prend que les avis `published` **dont l'auteur a un nom public** (`users.display_name` non nul), du plus récent au plus ancien (`updated_at`). La moyenne est arrondie à 1 décimale (`null` sans avis). `id` = date de création en base 36 : stable tant que l'avis existe, l'accueil s'en sert pour pointer vers l'avis sur la page des avis. `date` = jour de dernière modification (`AAAA-MM-JJ`).

## Données touchées

[[Table reviews]] (lecture, écriture, suppression) et [[Table users]] (lecture de `display_name` et `avatar_key`).

## Liens avec le reste

- Appelé par [[app.js]] (`PUT/DELETE /api/v1/account/review`, `GET /api/v1/reviews`, pages `/account/review`), [[admin.js (serveur)]] (action `avis`), [[admin.js (script serveur)]] (`reviews`, `hide-review`, `show-review`).
- Nom et photo : [[profile.js]]. Pages : [[views.js]].

## Tests

`flow.test.js`, tests « reviews: … » (app, suppression, page compte Premium, 60 contre tous, jeton de licence révoqué) ([[Tests du serveur]]).

## À savoir avant de modifier

- Le commentaire est stocké **tel que tapé** (nettoyé) : le site et les pages doivent toujours l'afficher comme du texte, jamais comme du HTML.
- Le cache de [[app.js]] garde la réponse de `GET /reviews` 30 s : un avis masqué peut rester visible jusqu'à une minute (cache HTTP de 60 s en plus).
