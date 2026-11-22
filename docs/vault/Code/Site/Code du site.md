---
type: carte
tags: [code, site, netlify, marque, carte]
maj: 2026-11-22
---
# Code du site

Carte du code du site rago-optimizer.com, de sa publication sur Netlify et du kit de marque : chaque fichier a sa note, et cette page explique comment ils s'enchaînent, de la source à la page publiée. Fiches techniques parentes : [[Site]] (contenu des pages), [[Netlify]] (hébergement et fabrication). Vue d'ensemble du dépôt : [[Architecture]].

Tout est CONFIRMÉ d'après le code de `staging` (10/11, commit `ee77d4f`), mis à jour le 22/11 pour le site v5 « Match day » (PR #109 vers `staging`, [[Charte graphique]]).

## Les notes, par thème
### Sources des pages (`site/src/`)
| Note | Rôle en une ligne |
|---|---|
| [[page.html]] | source de l'accueil : HTML, CSS propre à l'accueil et JavaScript en un fragment (prix, pop-up promo, avis, aperçu de l'app, FAQ) |
| [[v5.css]] | feuille partagée par toutes les pages : polices Barlow, couleurs, boutons penchés, en-tête, pied de page |
| [[tweaks.html]] | source de la page Tweaks : téléchargement gratuit et les 218 tweaks avec recherche, filtres, fiche détaillée |
| [[reviews.html]] | source de la page de tous les avis (lus en direct sur le serveur) |
| [[partners.html]] | source de la page des serveurs partenaires |
| [[route.html]] | source de la page de vente de Rago Route (bêta Premium) : schémas, prix et liens de l'accueil |
| [[Textes juridiques (src-legal)]] | texte des conditions et de la confidentialité (`src/legal/terms.html`, `privacy.html`) |
| [[partners.json]] | liste des partenaires (nom, invitation Discord, logo, accueil ou non) |
| [[tweaks-copy.json]] | textes du site pour chacun des 218 tweaks |

### Outils (`site/tools/`)
| Note | Rôle en une ligne |
|---|---|
| [[build.py]] | fabrique les 5 pages publiées depuis `src/` (empreinte de `v5.css`, prix, FAQ et blocs sans JavaScript, JSON-LD) |
| [[sync_icons.py]] | écrit le sprite d'icônes de chaque page depuis [[icons_v5.json]] |
| [[prerender.js]] | Chromium hors ligne : rend les blocs que le JavaScript de l'accueil remplit |
| [[sync_partners.py]] | écrit les cartes partenaires dans `page.html` et `partners.html` |
| [[sync_app.py]] | recopie les textes et compteurs de l'app dans `page.html`, puis lance `sync_tweaks.py` |
| [[sync_tweaks.py]] | écrit la liste des tweaks de `tweaks.html` depuis le catalogue de l'app |
| [[make_legal.py]] | génère `terms.html`, `privacy.html`, `404.html` au design v5 (texte lu dans `src/legal/`) |

### Publication (Netlify)
| Note | Rôle en une ligne |
|---|---|
| [[netlify.toml]] | configuration Netlify : dossier publié, commandes par contexte, en-têtes, redirections |
| [[preview.sh]] | aperçus et `staging` : liens de compte vers le serveur de staging, ou coupés |
| [[launch-gate.js]] | fonction edge du compte à rebours d'avant le 10/10 (avec `countdown.js` et les tests), inactive |
| [[Fichiers publiés du site]] | inventaire de `site/` : ce qui est généré, par quoi, et ce qui est posé à la main |
| [[recherche-conversion (site)]] | note de recherche du 04/10 rangée dans `site/` (non publiée, en partie périmée) |

### Marque (`brand/`)
| Note | Rôle en une ligne |
|---|---|
| [[Kit de marque (brand)]] | README, charte v5 en images, voix anglaise, fichiers du logo |
| [[tokens.css (marque)]] | jetons de design `--rg-*` (et `tokens.json`), source des copies de l'app et du serveur |

### CI du site
[[site-check.yml]] (dans [[Code de la CI et du dépôt]]) : reconstruit le site et échoue si une page commitée diffère.

## Comment les fichiers s'enchaînent
### 1. De l'app au site (quand le catalogue change)
```
app/src/data/catalog.json ─┐
app/src/data/free.json ────┼─> sync_app.py ──> site/src/page.html (EX, MODS, compteurs, « Nearly 220 », « 73 of 218 »)
app/src/lib/i18n.ts ───────┘        │
                                    └─> sync_tweaks.py ──> site/src/tweaks.html (218 fiches, nav, objectifs, « 68 free »)
site/src/tweaks-copy.json ─────────────────┘   (icônes lues dans page.html : const ICON)
```
Sources de vérité côté app : [[catalog.json]], [[free.json]], [[i18n.ts]] ; mêmes règles de comptage que [[catalog.ts]] et [[store.tsx]].

### 2. Des sources aux pages publiées
```
python3 site/tools/build.py
  1. sync_partners.py : partners.json ──> src/page.html (4 cartes) + src/partners.html (6 cartes)
     sync_icons.py    : icons_v5.json ──> sprite d'icônes de chaque src/*.html
  2. src/page.html ──> index.html  (v5.css?v=<empreinte>, CONFIG lu, prix et liens sans JS,
                                     contrôle prix Lifetime = licensing/src/billing.js,
                                     FAQ <noscript> via node, Discord, og:image?v=, JSON-LD, <head>)
     └─ node prerender.js index.html ──> tableau cmp gravé
  3. src/reviews.html  ──> reviews.html   (v5.css, accountBase)
  4. src/tweaks.html   ──> tweaks.html    (v5.css, accountBase)
  5. src/partners.html ──> partners.html  (v5.css)
  6. src/route.html    ──> route.html     (v5.css, CONFIG de l'accueil, prix et liens sans JS)
python3 site/tools/make_legal.py : src/legal/*.html ──> terms.html, privacy.html, 404.html
```
Puis on commite sources **et** pages : Netlify ne lance aucun de ces outils.

### 3. Contrôle
La CI [[site-check.yml]] relance `build.py` sur chaque push vers `staging` ou la prod et chaque PR qui touche `site/`, échoue si le pré-rendu n'a pas pu se faire, puis exige que `index.html`, `reviews.html`, `tweaks.html`, `partners.html` et `route.html` soient identiques à ce qui est commité. `sync_app.py` et `make_legal.py` ne sont pas vérifiés par la CI.

### 4. Publication sur Netlify
```
push sur la branche de prod ──> [build] : rm site/src site/tools site/*.md ──> https://rago-optimizer.com
push sur staging            ──> sh netlify/preview.sh ──> https://staging--rago-optimiser.netlify.app
pull request                ──> sh netlify/preview.sh ──> https://deploy-preview-<N>--rago-optimiser.netlify.app
                                 (previewAccountBase = STAGING_ACCOUNT_URL, ou liens « #account-off »)
toutes les requêtes ──> fonction edge launch-gate (laisse tout passer depuis le 10/10)
```
Voir [[netlify.toml]], [[preview.sh]], [[launch-gate.js]] et [[Branches et environnements]].

### 5. Dans le navigateur
Les pages appellent seulement les routes publiques du serveur de comptes ([[API du serveur]]) : `GET /api/v1/plans` (prix et essai), `/api/v1/promo` (pop-up), `/api/v1/reviews` (avis ; `?all=1` sur la page des avis), `/api/v1/installer` (version affichée). Le choix du serveur est le même dans toutes les pages : `localhost` et réseau local → `http://<hôte>:8787` (serveur local, `npm run local` dans `licensing/`) ; `*.netlify.app` → `previewAccountBase` ou rien ; sinon `https://account.rago-optimizer.com`. Les boutons d'achat, de compte et de téléchargement mènent aux pages du [[Serveur de licences]] (`/buy`, `/login`, `/signup`, `/affiliate`, `/download`, `/account/review`).

### 6. La marque
Le kit v5 est produit hors du dépôt par les scripts de la maquette (`rago-redesign/rendus-v5/outils/marque/` dans le dossier partagé), copié dans `brand/logo/`, puis `brand/logo/web/` est copié à la main dans `site/` (favicons, `apple-touch-icon`, `og-image`, `og-launch`, `media/og-route.png`) ; l'app reprend ses icônes avec `app/tools/sync_icons.sh`. Les jetons de [[tokens.css (marque)]] sont recopiés à la main dans l'app et le serveur ; le site redéclare ses propres alias avec les mêmes valeurs.

## Points d'attention (relevés le 10/11, revus le 22/11)
- Deux chiffres du plan gratuit coexistent : **73** sur l'accueil (taille brute de `free.json`) et **68** sur la page Tweaks (tweaks distincts). À VÉRIFIER.
- Les étoiles Google (`aggregateRating`, RAG-33, ajoutées le 17/10) ne sont plus dans [[page.html]] alors qu'un commentaire de [[build.py]] dit que la page les ajoute (toujours vrai en v5). À VÉRIFIER.
- La section `#route` de [[page.html]] garde son bouton « Get notified on Discord » alors que Rago Route est en bêta dans Premium ; [[route.html]] n'a plus de texte d'attente depuis la page de vente du 11/11.
- Le test de [[launch-gate.js]] échoue depuis la date du lancement (test daté, hors CI).
