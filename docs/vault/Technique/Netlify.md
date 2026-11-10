---
type: technique
tags: [technique, netlify, site, déploiement]
maj: 2026-11-10
---
# Netlify

Hébergement du site de vente et chaîne de fabrication des pages. Contenu des pages : [[Site]]. Variables : [[Variables d'environnement]].

## Site Netlify
| Contexte | Branche | Adresse | Serveur de comptes utilisé |
|---|---|---|---|
| Production | `claude/rago-monorepo-initial-eyj6pq` | `https://rago-optimizer.com` (domaine OVH ; l'ancienne `rago-optimiser.netlify.app` redirige en 301) | `https://account.rago-optimizer.com` |
| Branch deploy | `staging` | `https://staging--rago-optimiser.netlify.app` | serveur de staging (`STAGING_ACCOUNT_URL`) |
| Deploy preview | chaque PR | `https://deploy-preview-<N>--rago-optimiser.netlify.app` | serveur de staging, sinon liens de compte coupés |

Le nom du site Netlify s'écrit `rago-optimiser` (avec un s), le domaine `rago-optimizer.com` (avec un z).

## `netlify.toml` (racine)
- **Build** : `publish = "site"` ; la commande supprime `site/src`, `site/tools` et `site/*.md` avant publication (sources et notes jamais publiées). **Netlify ne lance pas `build.py`** : les pages générées sont commitées.
- **Aperçus et staging** : `sh netlify/preview.sh` remplace l'adresse du serveur de comptes dans `index.html`, `reviews.html` et `tweaks.html` par `STAGING_ACCOUNT_URL` (refuse l'adresse de prod), ou coupe les liens si la variable manque. Un aperçu n'envoie donc jamais vers le vrai serveur ni le vrai Stripe. `partners.html`, `route.html` et les pages légales n'ont aucun lien de compte et ne sont pas touchées. Une `STAGING_ACCOUNT_URL` mal formée (chemin, pas de `https://`) ou égale à la prod fait **échouer** l'aperçu. Détail : [[preview.sh]].
- **Fonction edge `launch-gate`** (`netlify/edge-functions/launch-gate/`, sur `/*`) : compte à rebours avant `LAUNCH_AT` (10/10/2026 15 h Paris), accès de l'équipe par `/acces/<PREVIEW_KEY>`. **Inactive depuis le lancement** (laisse tout passer) ; peut être retirée avec son bloc `[[edge_functions]]` et le verrou de `licensing/src/app.js`. Test : `node --test netlify/launch-gate.test.mjs` (lancé par aucune CI ; le 10/11, 7 tests sur 8 passent : celui de la date par défaut échoue parce que la date est passée). Détail : [[launch-gate.js]].
- **En-têtes** : `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Redirections** : 301 forcée de l'ancienne adresse `rago-optimiser.netlify.app/*` vers le domaine ; 301 forcée de `/refunds.html` vers `/terms.html#cancel` (depuis le 10/11, sur `staging`) ; **302** de `/buy`, `/login`, `/signup`, `/affiliate`, `/download`, `/account`, `/account/*` vers `account.rago-optimizer.com` (navigateurs sans JavaScript, anciens liens) ; `/downloads/*` (ancien `.bat`) vers l'accueil. Ces 302 visent le serveur de prod **dans tous les contextes**, y compris `staging` et les aperçus (seuls les liens des pages sont réécrits par `preview.sh`). Détail : [[netlify.toml]].

## Fabrication des pages (`site/tools/`)
On modifie **les sources** `site/src/*.html` (et `partners.json`, `tweaks-copy.json`), puis `python3 site/tools/build.py`, qui écrit les pages publiées à la racine de `site/` :
| Source | Page publiée |
|---|---|
| `src/page.html` | `index.html` |
| `src/reviews.html` | `reviews.html` |
| `src/tweaks.html` (+ `tweaks-copy.json`) | `tweaks.html` |
| `src/partners.html` + `src/partners.json` | `partners.html` (et la section Partners de l'accueil) |
| `src/route.html` | `route.html` (staging) |

Ce que fait `build.py` ([[build.py]]) : remplace Google Fonts par les polices locales `site/fonts/` (aucune IP envoyée à Google), lit le `CONFIG` de `page.html` (`accountBase`, prix, devise, Discord), écrit les liens et prix pour les visiteurs sans JavaScript, **vérifie que le prix Lifetime du site = `LIFETIME_PRICE` du serveur**, rend la FAQ en `<noscript>`, ajoute les données structurées, versionne l'image de partage, puis lance `prerender.js` (Chromium par Playwright, hors ligne) pour figer le tableau comparatif, la bande de jeux et les aperçus de l'app. `sync_partners.py` est lancé en premier et s'arrête sur une entrée incomplète.

Autres outils :
- `sync_app.py` ([[sync_app.py]], [[sync_tweaks.py]]) : recopie dans `page.html` l'aperçu de l'app depuis `app/src/data/catalog.json` et `app/src/lib/i18n.ts`, puis lance `sync_tweaks.py` (liste des tweaks de `tweaks.html`, depuis `catalog.json`, `free.json` et `tweaks-copy.json`). **À lancer quand le catalogue de l'app change**, avant `build.py`.
- `make_legal.py` ([[make_legal.py]]) : génère `terms.html`, `privacy.html` et `404.html` (plus de `refunds.html` sur `staging` : redirection 301 vers `terms.html#cancel`) (identité du vendeur à compléter : [[Conformité juridique]]).

La CI `site-check` relance `build.py` et échoue si les pages commitées diffèrent ([[CI GitHub Actions]]) : toujours commiter les pages régénérées.

## Variables Netlify
`STAGING_ACCOUNT_URL` (aperçus et staging), `PREVIEW_KEY` et `LAUNCH_AT` (fonction edge, inutiles depuis le lancement). Aucune clé secrète côté site : le site est public et n'appelle que les routes publiques du serveur (`/api/v1/reviews`, `/promo`, `/plans`, `/installer`).

## Code
Carte : [[Code du site]]. Configuration : [[netlify.toml]] ; aperçus : [[preview.sh]] ; fonction edge : [[launch-gate.js]] ; fabrication : [[build.py]], [[prerender.js]], [[sync_partners.py]], [[sync_app.py]], [[sync_tweaks.py]], [[make_legal.py]] ; ce qui est publié : [[Fichiers publiés du site]] ; contrôle : [[site-check.yml]].

## Voir une modification
Aperçu Netlify de la PR (lien « Deploy Preview » sur GitHub), ou en local `cd licensing && npm run local` puis `http://localhost:8787/src/page.html` (source) ([[Développer et tester]]).
