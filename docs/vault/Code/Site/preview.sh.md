---
type: code
tags: [code, site, netlify, shell]
fichier: netlify/preview.sh
lignes: 39
maj: 2026-11-11
---
# preview.sh

Script shell lancé par [[Netlify]] à la place de la commande de production sur les aperçus de pull request et sur la branche `staging` : il fait pointer les liens de compte, les avis et le pop-up du site vers le serveur de comptes de **staging**, jamais vers le vrai. Fiche parente : [[Code du site]]. Fonctionnalité : [[Branches et environnements]], [[Netlify]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 11/11). Modifié le 11/11 (ajout de `route.html`, page de vente Rago Route) et le 12/10 (`51558ed`, ajout de `tweaks.html`) ; créé le 10/10 (PR #22, « Développer sans toucher à la prod »).

## Rôle et place dans l'ensemble
- Déclaré dans [[netlify.toml]] pour `[context.deploy-preview]` et `[context.branch-deploy]` : `sh netlify/preview.sh`.
- Il agit sur les pages **déjà générées** et commitées (`site/index.html`, `site/reviews.html`, `site/tweaks.html` et, depuis le 11/11, `site/route.html`), dans la copie de travail de Netlify : rien n'est commité.
- Côté pages, chaque script choisit son serveur ainsi : sur un nom d'hôte `*.netlify.app`, `CONFIG.accountBase = CONFIG.previewAccountBase || null`. Ce script remplit `previewAccountBase` ; s'il reste vide, la page passe en mode « comptes coupés » (`#account-off` et message « Account pages are off on this preview (STAGING_ACCOUNT_URL isn't set on Netlify). »). Voir [[page.html]], [[tweaks.html]], [[reviews.html]].

## Fonctionnement détaillé
1. `set -eu` : arrêt à la première erreur ou variable non définie.
2. `LIVE="https://account.rago-optimizer.com"` (le vrai serveur de comptes).
3. `URL` = la variable Netlify `STAGING_ACCOUNT_URL`, débarrassée des espaces, retours chariot, sauts de ligne et `/` finaux.
4. Si `URL` est rempli :
   - elle doit correspondre à `^https://[A-Za-z0-9.-]+(:[0-9]+)?$` (https, **sans chemin**), sinon message `STAGING_ACCOUNT_URL must be an https address without a path, e.g. https://… (got: …)` et **échec du déploiement** (`exit 1`) ;
   - elle ne doit être ni `LIVE` ni une adresse finissant par `rago-production.up.railway.app`, sinon `STAGING_ACCOUNT_URL is the live account server: use the staging one` et échec ;
   - `TARGET = URL`, message `Preview: account links go to <URL>`.
5. Sinon : `TARGET = "#account-off"`, message `Preview: STAGING_ACCOUNT_URL isn't set, account links are off on this preview`.
6. Pour chacune des quatre pages `site/index.html`, `site/reviews.html`, `site/tweaks.html`, `site/route.html` (la page Rago Route depuis le 11/11) :
   - `sed` remplace `previewAccountBase: ""` par `previewAccountBase: "<URL>"` (vide si pas d'URL) ;
   - avec URL : chaque `href="https://account.rago-optimizer.com/…` devient `href="<URL>/…` (liens gravés pour les visiteurs sans JavaScript) ;
   - sans URL : chaque `href="https://account.rago-optimizer.com/…"` complet devient `href="#account-off"` ;
   - contrôle : `grep -q 'previewAccountBase: "<URL>"'`, sinon `previewAccountBase not found in <page>` et échec.
7. Comme en production : `rm -rf site/src site/tools && rm -f site/*.md`.

## Données touchées
- Lit la variable Netlify `STAGING_ACCOUNT_URL` (contextes deploy-preview et branch-deploy).
- Modifie, dans la copie de Netlify seulement, `site/index.html`, `site/reviews.html`, `site/tweaks.html`, `site/route.html` ; supprime `site/src/`, `site/tools/`, `site/*.md`.

## Erreurs et cas limites
- Une `STAGING_ACCOUNT_URL` mal formée ou égale à la prod fait **échouer** l'aperçu (volontaire : mieux vaut pas d'aperçu qu'un aperçu branché sur le vrai Stripe).
- La page [[partners.html]] n'est pas traitée : elle n'a aucun lien vers le serveur de comptes (vérifié). [[route.html]] l'est depuis le 11/11 : devenue page de vente, elle a des liens d'essai, d'achat et de téléchargement et lit les avis.
- Les pages légales ([[make_legal.py]]) et la 404 non plus : elles ne contiennent que l'adresse e-mail de support et des liens relatifs.
- Les redirections 302 de [[netlify.toml]] (`/buy`, `/login`…) ne sont pas réécrites : elles visent la prod dans tous les contextes (voir cette note).

## Liens avec le reste
- Déclaré par [[netlify.toml]] ; prépare les pages produites par [[build.py]].
- Serveur visé : le serveur de staging sur [[Railway]] ([[Serveur de licences]]).
- Mise en place de `STAGING_ACCOUNT_URL` : [[Netlify]], [[Variables d'environnement]], guide `DEVELOPPEMENT.md` ([[Fichiers de la racine du dépôt]]).

## À savoir avant de modifier
- Une nouvelle page qui appelle le serveur de comptes doit être ajoutée à la boucle `for PAGE in …` **et** avoir `previewAccountBase: ""` dans son `CONFIG`, sinon le `grep` final échoue (ou, si on l'oublie dans la boucle, l'aperçu enverrait vers la prod).
- Le texte `previewAccountBase: ""` (avec exactement un espace) est cherché tel quel par `sed` et `grep`.
