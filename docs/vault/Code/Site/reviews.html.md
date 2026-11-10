---
type: code
tags: [code, site, html, javascript, avis]
fichier: site/src/reviews.html
lignes: 345
maj: 2026-11-10
---
# reviews.html

Source de la page « tous les avis » (`rago-optimizer.com/reviews.html`) : les avis publiés des joueurs, en entier, lus en direct sur le serveur de comptes, avec la note moyenne, la répartition par étoiles, un filtre et un tri. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Partage et support]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Page créée le 11/10 (PR #34, prod #38). La page publiée `site/reviews.html` est produite par [[build.py]] (polices locales, `accountBase`) ; ne jamais la modifier à la main.

## Rôle et place dans l'ensemble
- L'accueil ([[page.html]]) montre quelques avis, coupés quand ils sont longs, avec « See more » qui pointe ici sur `reviews.html#r-<id>`. Cette page montre **tous** les avis publiés, en entier.
- Les avis ne sont **jamais** écrits dans le HTML : ils sont lus dans le navigateur sur `GET /api/v1/reviews?all=1` du [[Serveur de licences]] (module `reviews.js` côté serveur, voir [[reviews.js]]). Sans JavaScript, la page affiche seulement « Reviews load with JavaScript. Turn it on to read them. ».
- Contrairement à [[page.html]], c'est une page HTML complète (avec `<!doctype>`, `<head>`, balises `og:*`, canonical `https://rago-optimizer.com/reviews.html`).

## Sections et boutons
- **En-tête** : logo, « Back to the site » (`./`), « Get Premium » (`./#pricing`).
- **Héros** : « Reviews », titre « Players feel the difference. », texte « Every review of Rago Optimizer, in full and as written, from players signed in to their Rago account. Results depend on your PC and connection. ».
- **Résumé `#sum`** (caché tant que rien n'est chargé) : moyenne `#avg` (une décimale), jauge d'étoiles `#meter` (fond + avant-plan dont la largeur = moyenne / 5), total `#total`, répartition `#dist` : 5 boutons (5 à 1 étoiles) avec barre proportionnelle ; un bouton sans avis est désactivé ; cliquer filtre la liste (cliquer à nouveau enlève le filtre).
- **Outils `#tools`** : compteur `#count` (« 12 reviews », ou « 3 5-star reviews » + bouton « Show all ») ; tri `#sort` : Newest (`new`, par défaut), Highest rated (`high`), Lowest rated (`low`).
- **Liste `#list`** (`aria-busy` pendant le chargement, squelettes) et zone d'état `#state`.
- **Appel `#leave`** : « Played with Rago Optimizer? Leave your review. », « Premium members write theirs from their account page. On the free version, open Rago Optimizer, then Settings, then Leave a review. It shows here with your public name, never your email. », bouton « Leave a review » (classe `js-review`, vers `/account/review` du serveur de comptes).
- **Pied** : Rago Optimizer, Pricing, FAQ, Partners, Terms, Privacy, Cancellation, et le texte « Reviews are posted by players signed in to their Rago account, from the app or the website, and shown as written, from the most recently updated. We don't pay for reviews or hide negative ones. »

## Ce que le script expose
- `CONFIG` : `accountBase` (prod, réécrit par [[build.py]]), `previewAccountBase` (rempli par [[preview.sh]]). Même choix de serveur que [[page.html]] et [[tweaks.html]] : local → `http://<hôte>:8787`, `*.netlify.app` → `previewAccountBase` ou `null`.
- `acct(p)` : adresse complète sur le serveur de comptes.
- Fonctions internes : `esc` (échappement HTML), `ok(r)` (avis valide : `rating` entier de 1 à 5, `comment` et `name` non vides), `first` (initiale pour l'avatar), `when` (date « Nov 10, 2026 », en-US, fuseau UTC), `idOf` (`r-<id>` si l'id fait 1 à 12 caractères `a-z0-9`), `face` (photo si `avatar_url` correspond à `https://<hôte>/avatars/<20 à 40 caractères>.webp`, sinon pastille avec l'initiale ; une photo qui ne charge pas est remplacée par l'initiale), `card` (`<figure class="rq">` avec étoiles, texte, avatar, nom, date, version), `render`, `show`, `setFilter`, `say`.

## Fonctionnement détaillé
1. Si `accountBase` est `null` (aperçu sans serveur) : les boutons `.js-review` sont retirés et la zone d'état dit « Reviews are off on this preview. STAGING_ACCOUNT_URL isn't set on Netlify. ».
2. Si le navigateur n'a pas `fetch` : « Reviews can't load in this browser. ».
3. `fetch(acct("/api/v1/reviews?all=1"), { credentials: "omit", cache: "no-cache" })`. Erreur réseau ou HTTP : « Reviews can't be loaded right now. Try again in a moment. ».
4. `show(data)` : garde les avis valides de `data.reviews` (l'ordre du serveur = du plus récemment mis à jour au plus ancien) ; aucun : « No reviews yet. Be the first: leave yours below. ». Total = `data.count` (ou le nombre d'avis), moyenne = `data.average` si ≥ 1, sinon calculée.
5. `render()` : applique le filtre et le tri (à note égale, ordre d'origine), choisit le nombre de colonnes (**3** à partir de 1 080 px de large, **2** à partir de 680 px, sinon 1), crée les colonnes puis place **chaque carte dans la colonne la plus courte**, pour que la lecture de gauche à droite garde l'ordre (maçonnerie). Délai d'apparition de 40 ms par carte (12 au plus) au premier rendu.
6. Ancre `#r-<id>` (lien « See more » de l'accueil) : la carte est mise en valeur (classe `hl` pendant **4 s**) et centrée à l'écran ; un changement d'ancre enlève le filtre puis recommence.
7. Redimensionnement : nouveau rendu 150 ms après, seulement si le nombre de colonnes change.

## Données touchées
- Réseau : `GET <accountBase>/api/v1/reviews?all=1` (sans cookie). Voir [[API du serveur]].
- Photos : `https://<serveur>/avatars/<id>.webp` (`referrerpolicy="no-referrer"`).
- Aucun stockage local.

## Erreurs et cas limites
- Les données reçues sont filtrées (`ok`) et échappées (`esc`) : un avis malformé est ignoré, jamais injecté.
- Une photo dont l'adresse ne correspond pas exactement au motif `…/avatars/<id>.webp` n'est pas affichée.

## Liens avec le reste
- Données : [[reviews.js]] et [[Serveur de licences]] ; règles de publication des avis dans les conditions de vente ([[make_legal.py]], section 9).
- Construite par [[build.py]], vérifiée par [[site-check.yml]], retouchée sur les aperçus par [[preview.sh]].
- Les avis s'écrivent depuis l'app (Paramètres, voir [[Paramètres de l'app]]) ou depuis la page compte (Premium).
- Pages sœurs : [[page.html]] (section Reviews), [[tweaks.html]].

## À savoir avant de modifier
- La page ne doit jamais contenir d'avis écrits en dur (règle : « Toujours les vrais chiffres »).
- Le motif `PHOTO` doit rester aligné sur les adresses produites par le serveur pour les photos de profil.
- Dernière modification le 10/11 (`a190565`, lien « Refunds » du pied remplacé par « Cancellation »).
