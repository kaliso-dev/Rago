---
type: code
tags: [code, site, python]
fichier: site/tools/build.py
lignes: 188
maj: 2026-11-22
---
# build.py

Le générateur du site : il transforme les sources `site/src/*.html` en pages publiées à la racine de `site/` (`index.html`, `reviews.html`, `tweaks.html`, `partners.html`, `route.html`). Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Netlify]].

Tout ce qui suit est CONFIRMÉ (branche du site v5, PR #109 vers `staging`, 22/11/2026). Commande : `python3 site/tools/build.py` (depuis n'importe quel dossier : les chemins partent de l'emplacement du script). Il faut ensuite **commiter les pages générées** : [[Netlify]] ne lance pas ce script, il publie le dossier `site/` tel qu'il est dans Git.

## Rôle et place dans l'ensemble
- C'est la **seule** façon correcte de produire les pages publiées. On modifie toujours la source ([[page.html]], [[tweaks.html]], [[reviews.html]], [[partners.html]], [[route.html]]), puis on lance ce script. Les pages de la racine de `site/` ne se modifient jamais à la main ([[Fichiers publiés du site]]).
- La CI [[site-check.yml]] relance ce script sur chaque push ou PR qui touche `site/` et échoue si une page commitée diffère de ce que le script produit, ou si le pré-rendu sans JavaScript n'a pas marché.
- Ce script ne génère **pas** les pages légales (`terms.html`, `privacy.html`, `404.html`) : c'est [[make_legal.py]]. Il ne met pas non plus à jour la liste des tweaks : c'est [[sync_app.py]] (qui lance [[sync_tweaks.py]]). Ordre normal quand le catalogue de l'app change : `sync_app.py` puis `build.py`.
- Il appelle lui-même [[sync_partners.py]] puis [[sync_icons.py]] au début, et [[prerender.js]] au milieu.

## Ce que le fichier expose
Un script sans fonction publique. Repères :

| Nom | Valeur ou rôle |
|---|---|
| `SITE` | `https://rago-optimizer.com` |
| `CSSV`, `css(html, name)` | 10 premiers caractères du SHA-256 de `site/v5.css` ; `css()` vérifie que la page a exactement une fois `<link rel="stylesheet" href="v5.css">` (sinon `link to v5.css not found in <page>: update build.py`) et le remplace par `v5.css?v=<CSSV>`, pour que les navigateurs ne gardent jamais une ancienne copie de la feuille ; depuis le 22/11 au soir, elle ajoute aussi `<script src="v5.js?v=<JSV>" defer>` ([[v5.js]]) et refuse une source qui charge déjà `v5.js` (même dans un commentaire) ; depuis le 2e retour, elle met devant un petit script `KJS` qui pose `--k` avant le premier affichage ([[v5.css]], « écran par écran ») |
| `cfg(k)` | lit une valeur de l'objet `CONFIG` de [[page.html]] |
| `BASE`, `CUR`, `PM`, `PY`, `PL`, `PR`, `PRY` | serveur de comptes, devise, prix mensuel, annuel, Lifetime, option Rago Route mensuelle et annuelle |
| `FREE`, `free_txt` | mois offerts par l'annuel (`floor(12 - PY / PM)`, 6 aujourd'hui) et « 6 months free » |
| `OG` | `https://rago-optimizer.com/og-image.png?v=<empreinte>` (empreinte du fichier, pour que Discord et les réseaux rechargent l'image quand elle change) |
| `OGR`, `share(t)` | même chose pour `media/og-route.png` ; `share()` met les deux adresses versionnées dans les balises `og:image` et `twitter:image` des pages autres que l'accueil |
| `LD` | données structurées JSON-LD (WebSite, Organization, SoftwareApplication avec les offres Free, Premium mensuel et annuel) |

## Fonctionnement détaillé
### 1. Avant tout
1. [[sync_partners.py]] écrit les cartes partenaires (accueil et page des partenaires).
2. [[sync_icons.py]] écrit le sprite d'icônes de chaque source de `site/src/`.

### 2. Accueil (`src/page.html` → `index.html`)
1. Feuille partagée : `css(s, 'page.html')`. Plus de bloc Google Fonts ni de Geist depuis le 22/11 : les polices Barlow sont déclarées dans `v5.css`.
2. Liens sans JavaScript : `href="/login"`, `/signup`, `/affiliate`, `/download`, `/buy?interval=year`, `/buy/route` deviennent absolus vers `BASE`.
3. Prix sans JavaScript (formule annuelle par défaut) : `<b id="p-amt">` ← 2,50 $ ; `<p class="bil" id="p-note">` ← « Billed $29.99 yearly. 6 months free. » ; `<em id="save">` ← « 6 months free » (`hidden` si `FREE` < 1) ; `<b id="l-amt">` ← prix Lifetime. Chaque remplacement a son `assert`.
4. Contrôles de prix : `priceLifetime` = `LIFETIME_PRICE` de `licensing/src/billing.js`, `priceRoute` = `ROUTE_PRICE` et `priceRouteYear` = `ROUTE_PRICE_YEARLY` de `licensing/src/route-addon.js` (arrêt avec « … differ: change both »).
5. FAQ sans JavaScript : le tableau `  const F = [` … `\n  ];` est exécuté par `node -e`, puis écrit dans un `<noscript>` sous `<div class="faq rv" id="faqs"></div>`, au format v5 (`<details class="s-q"><summary class="qh"><span>Question</span><span class="pm"></span></summary><p>Réponse</p></details>`) ; les questions Lifetime (`life`) sont laissées de côté ; le nombre de questions est écrit dans `<span id="faq-n">`.
6. Discord : `href="#discord"` devient l'invitation (nouvel onglet) et les éléments `js-discord … hidden` sont rendus visibles.
7. `<head>` : tout ce qui précède la fin du `<style>` qui commence par `/* Layout` est mis dans un `<head>` complet (canonical, Open Graph, Twitter, icônes, JSON-LD). La description de partage reprend « Nearly 220 tweaks » du titre `#feat-h`.
8. Pré-rendu : `node tools/prerender.js site/index.html` ([[prerender.js]]) rend le tableau `#cmp`, gravé ensuite dans la page. Sans `node` ou Playwright : `warning: no-JS sections not baked`.

### 3. Avis, Tweaks, Partenaires
`src/reviews.html`, `src/tweaks.html`, `src/partners.html` → mêmes noms à la racine : `css()`, `share()`, `accountBase: "…"` remplacé par `BASE` (obligatoire sauf pour `partners.html`), liens `href="https://account.rago-optimizer.com/` remplacés par `BASE`. Messages `reviews.html built`…

### 4. Rago Route
`src/route.html` → `route.html` : `css()`, `share()`, le `CONFIG` de l'accueil (`accountBase`, `trialDays`, `currency`, prix) recopié dans celui de la page, prix et liens écrits dans le HTML pour les visiteurs sans JavaScript, liens du serveur de comptes rendus absolus.

## Données touchées
- **Lit** : `site/src/page.html`, `reviews.html`, `tweaks.html`, `partners.html`, `route.html`, `site/v5.css`, `site/v5.js`, `site/og-image.png`, `site/media/og-route.png`, `licensing/src/billing.js`, `licensing/src/route-addon.js`.
- **Écrit** : `site/index.html`, `site/reviews.html`, `site/tweaks.html`, `site/partners.html`, `site/route.html` ; par [[sync_partners.py]] et [[sync_icons.py]], les sources de `site/src/` (seulement si quelque chose change).
- Aucun accès réseau : le pré-rendu bloque toutes les requêtes `http(s)`.

## Erreurs et cas limites
- Tous les `assert` arrêtent le script avec un message en anglais qui dit quoi corriger. Comme l'accueil est écrit **avant** le pré-rendu, une erreur dans les étapes 3 à 5 peut laisser `index.html` à jour et les autres pages anciennes : relancer après correction.
- Sans `node` : pas de FAQ statique ni de blocs pré-rendus, mais le script finit (deux avertissements). La CI échoue alors à cause du second avertissement.
- Si Playwright n'est pas installé localement, voir [[Développer et tester]] (la CI installe `playwright@1.56.1` dans un dossier temporaire et passe `NODE_PATH`).
- Si le titre `<h2 class="s-h2" id="feat-h">… tweaks.` change de forme, `re.search(...).group(1)` lève une erreur (`AttributeError`).
- Le script est idempotent : relancé sur des sources inchangées, il produit des fichiers identiques (vérifié le 22/11 : deux constructions de suite donnent les mêmes 5 pages).

## Liens avec le reste
- Appelé par : la personne qui modifie le site, la CI [[site-check.yml]], et indirectement le guide de [[Développer et tester]].
- Appelle : [[sync_partners.py]], [[sync_icons.py]], [[prerender.js]].
- Lit la configuration de [[page.html]] (objet `CONFIG`), le prix Lifetime du serveur ([[Serveur de licences]]).
- Ses sorties sont publiées par [[Netlify]] ; [[preview.sh]] les retouche ensuite pour les aperçus.
- Ses règles de prix découlent de [[Offres et prix]].

## Tests
Pas de test unitaire. Le contrôle est la CI [[site-check.yml]] : relance complète puis `git diff --exit-code` sur les 5 pages générées.

## À savoir avant de modifier
- Chaque source doit garder une seule ligne `<link rel="stylesheet" href="v5.css">` et ne jamais charger `v5.js` elle-même (sinon `assert`).
- Les prix de l'option Rago Route aussi : `CONFIG.priceRoute` et `CONFIG.priceRouteYear` dans [[page.html]], `ROUTE_PRICE` et `ROUTE_PRICE_YEARLY` dans `licensing/src/route-addon.js` (arrêt avec `priceRouteYear (…) and ROUTE_PRICE_YEARLY (…) differ: change both`).
- Le prix Lifetime se change **à deux endroits** : `CONFIG.priceLifetime` dans [[page.html]] et `LIFETIME_PRICE` dans `licensing/src/billing.js`. Le script refuse de construire s'ils diffèrent.
- Les 302 de `netlify.toml` (`/buy`, `/login`…) ne servent qu'aux adresses tapées à la main ; les liens de la page sont déjà absolus après ce script.
- Le commentaire sur `aggregateRating` (« added by the page itself ») est trompeur : la page ne l'ajoute pas. À VÉRIFIER (relevé le 10/11).
- Toute nouvelle page source doit être ajoutée ici **et** dans la liste de [[site-check.yml]] (`git diff --exit-code …` et `git ls-files --error-unmatch …`), sinon elle ne sera ni construite ni vérifiée.
