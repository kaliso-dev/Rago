---
type: code
tags: [code, dépôt, documentation, config]
fichier: README.md, DEVELOPPEMENT.md, CLAUDE.md, Dockerfile, _config.yml, .gitignore, .dockerignore
lignes: 493
maj: 2026-11-10
---
# Fichiers de la racine du dépôt

Les sept fichiers posés à la racine du monodépôt (hors dossiers) : deux guides pour Sofiene (`README.md`, `DEVELOPPEMENT.md`), les consignes pour Claude (`CLAUDE.md`), un `Dockerfile` jamais utilisé, la configuration GitHub Pages (`_config.yml`) et les listes d'exclusion (`.gitignore`, `.dockerignore`). Fiche parente : [[Code de la CI et du dépôt]]. Vue d'ensemble : [[Architecture]].

Tout ce qui suit est CONFIRMÉ (fichiers de `staging`, 10/11) sauf mention. `netlify.toml`, aussi à la racine, a sa propre note : [[netlify.toml]].

## `README.md` (284 lignes) : le guide général
Guide en français écrit pour Sofiene (« Ce guide-ci explique comment les trois s'emboîtent et comment tout lancer, dans l'ordre »). Plan :
1. Tableau des dossiers (`app/`, `brand/`, `site/`, `licensing/`, `.github/workflows/`, `netlify.toml` / `Dockerfile`) et adresses (site, serveur de comptes, e-mails de support et d'envoi).
2. « Comment l'app et le site travaillent ensemble » : schéma site → serveur de comptes → Stripe → app ; l'offre (gratuit, Premium, affiliation, code promo du pop-up) ; le parcours d'un acheteur.
3. « Ce qu'il te faut ». 4. « Mettre le serveur et le site en ligne » (renvoie à `licensing/docs/MISE-EN-LIGNE.md`), « Régler la page de vente » (objet `CONFIG`), compte à rebours d'avant le lancement, variante Docker.
5. « Fabriquer le setup.exe de l'app » (secrets GitHub, artefact), mise à disposition, alerte SmartScreen.
6. « Tester tout le parcours avant d'ouvrir », barre en jeu. 7. Support au quotidien (`npm run admin -- …`). 8. Développer en local. 9. « Ce qui manque encore » et « renommer la branche en `main` » (ordre GitHub → Netlify → Railway, sinon le site et le serveur cessent de se mettre à jour sans prévenir).

**Passages périmés le 10/11** (le vault fait foi, voir [[Sources]]) :
- « 198 réglages, 10 modules, 5 presets » et « Gratuite avec 11 réglages ouverts » (lignes 7 et 57, et ligne 191) : aujourd'hui 218 tweaks, 20 presets, 73 réglages gratuits dont 30 actifs à la fois ([[Offres et prix]], [[Catalogue des tweaks]]) ; « 198 réglages » aussi pour la page Tweaks (ligne 135).
- Exemple de `CONFIG` (ligne 116) avec `accountBase: "https://rago-production.up.railway.app"` et `discord: ""` : la page utilise `https://account.rago-optimizer.com` et a une invitation Discord ([[page.html]]).
- La phrase sur `site-check` (ligne 11) ne cite que `index.html`, `reviews.html` et `tweaks.html` ; le workflow vérifie aussi `partners.html` et `route.html` ([[site-check.yml]]).
- « La fabrication se lance d'elle-même à chaque push qui touche `app/` » (ligne 164) : depuis le 10/11, seul un push sur `staging` (ou un tag `app-v*`) la lance ; les autres branches passent par leur PR ([[app-windows.yml]]). « environ 5 minutes » : plutôt 7 à 8 en médiane.
- « `SITE_URL` = `https://rago-optimiser.netlify.app` aujourd'hui » : à jour ou non côté GitHub, À VÉRIFIER (le README demande lui-même de le passer sur le domaine).
- **« Ctrl+Maj+R »** pour la barre en jeu (ligne 206) : le raccourci par défaut est **Alt+X** depuis la 1.2.0 (`DEFAULT_SHORTCUT` de `background.rs`, voir [[background.rs]] et [[Barre en jeu]]).
- « Les pages légales sont des brouillons avec un bandeau « Draft » » (ligne 272) : bandeau retiré le 09/10 (PR #9) ; il reste l'identité du vendeur ([[Conformité juridique]]).
- Exemple de code promo `RAGO50` (lignes 61 et 227) : simple exemple d'usage de `npm run admin -- popup`, pas l'état actuel ([[Promotions et affiliation]]).
- « Désactiver GitHub Pages … Rien du dépôt n'y est plus publié » (ligne 261) : **faux depuis l'arrivée du vault en prod**, voir `_config.yml` plus bas.
- Le README ne parle ni de l'essai gratuit de 3 jours, ni de l'absence de remboursement (depuis le 10/11), ni de Rago Route.

## `DEVELOPPEMENT.md` (154 lignes) : développer sans toucher à la prod
Guide pour le Mac de Sofiene, ajouté le 10/10 (PR #22) : ce qui change la version en ligne (et rien d'autre) ; installer Node, GitHub Desktop ; voir l'app (`npm run window`) ; voir le site et les pages de compte (`npm run local`, compte de démonstration, rien ne part vers la prod) ; le chemin d'une modification (PR, aperçu Netlify, fusion) ; mise en place du **staging** en sept étapes : a. branche `staging`, b. second projet Supabase, c. Stripe en mode test, d. environnement Railway `staging`, e. Netlify (branch deploy `staging`, variable `STAGING_ACCOUNT_URL`), f. secrets de l'exe de test (`STAGING_RAGO_API_BASE`, `STAGING_RAGO_LICENSE_PUBKEY`, variable `STAGING_SITE_URL`), g. mettre une modification sur staging. Version résumée et tenue à jour dans le vault : [[Développer et tester]].
Écarts : la liste des pages générées (section 3) omet `route.html` ; la section 4 dit que l'exe d'une branche est dans « le run de la branche » : depuis le 10/11 c'est le run de **sa pull request**, et cet exe vise le serveur de prod (seul un push sur `staging` ou un lancement manuel « staging » donne l'exe de test).

## `CLAUDE.md` (11 lignes) : consignes pour Claude
Lu automatiquement par Claude Code : le vault `docs/vault/` est la mémoire du projet ; **règle n°1 de Sofiene (31/10)** : le vault doit correspondre en tout point à l'état du projet ; lire `Projet`, `État actuel`, `Règles de travail` avant tout travail ; repérer pendant le travail ce qui change ; mettre le vault à jour à la fin ([[Mettre à jour le vault]]) ; en cas de doute, poser la question sur la page « Questions du vault Rago » (règle du 01/11, [[Questions ouvertes]]). Règles fixes : rien sur GitHub ni dans l'app sans demande explicite de Sofiene, staging d'abord, aucun secret écrit, ne jamais changer les clés de signature ([[Clés et secrets]]), répondre en français. Chaque dossier de code a aussi son `CLAUDE.md` court (par exemple `site/CLAUDE.md`, voir [[Fichiers publiés du site]] ; `proxy/CLAUDE.md`, voir [[CLAUDE.md (proxy)]]).

## `Dockerfile` (15 lignes) : variante jamais utilisée
Image `node:22-alpine` qui sert **le serveur et le site ensemble** sur un seul domaine : copie `licensing/package*.json`, `npm ci --omit=dev`, `licensing/src`, `public`, `scripts`, `supabase`, puis `site` ; `ENV NODE_ENV=production PORT=8787 SITE_DIR=/app/site` ; `EXPOSE 8787` ; `npm start`. Le commentaire de tête dit que le chemin recommandé est Railway avec `Root Directory = licensing` (donc `licensing/Dockerfile`, celui que teste [[licensing-tests.yml]]) et le site sur Netlify. **Non utilisé** en prod comme en staging ([[Railway]]). Le serveur sait servir un dossier de site par `SITE_DIR` : c'est ce qu'utilise `npm run local`.

## `_config.yml` (17 lignes) : GitHub Pages
Configuration Jekyll de GitHub Pages. Commentaire : « GitHub Pages ne doit rien publier de ce dépôt privé : le site est servi par Netlify … Tant que Pages reste activé sur le dépôt, il publie ainsi un site vide. » Liste `exclude` : `app`, `brand`, `guide`, `licensing`, `site`, `README.md`, `DEVELOPPEMENT.md`, `Dockerfile`, `netlify.toml`, `_config.yml`, `.github`, `.gitignore`, `.dockerignore`.
- Origine : incident du 04 au 07/10, où Pages a publié le dépôt alors privé ([[Bugs et incidents]]).
- **OBSERVÉ le 10/11** : GitHub Pages est **toujours actif**. Le workflow automatique « pages build and deployment » tourne sur chaque push de la branche de prod (84 exécutions, dernière le 10/11 à 15:05 UTC, réussie) et publie sur l'adresse `github.io` du dépôt. Comme `docs/`, `netlify/`, `proxy/` et `CLAUDE.md` **ne sont pas exclus**, le vault de la branche de prod y est publié en pages web : une note du vault et `CLAUDE.md` répondent en HTTP 200 (vérifié le 10/11), comme `netlify/preview.sh`. Le dépôt étant public, ce contenu est déjà lisible sur GitHub, mais il est aussi servi comme un site et peut être indexé par les moteurs de recherche. Le commentaire « dépôt privé » est faux depuis que le dépôt est public.
- Correctifs possibles (décision de Sofiene, À VÉRIFIER) : désactiver Pages (Settings → Pages, ce que le README demande déjà) ou ajouter `docs`, `netlify`, `proxy`, `CLAUDE.md` à `exclude`.

## `.gitignore` (5 lignes)
`__pycache__/`, `*.pyc`, `.DS_Store`, `node_modules/`, `.env`. Le vault a son propre `docs/vault/.gitignore` (réglages locaux d'Obsidian).

## `.dockerignore` (7 lignes)
`node_modules`, `**/node_modules`, `app`, `.git`, `site/src`, `site/*.md`, `site/tools` : sert au `Dockerfile` de la racine (l'image n'emporte que les pages publiées du site). Le `licensing/Dockerfile` est construit depuis `licensing/` et n'utilise pas ce fichier.

## Liens avec le reste
- Structure du dépôt : [[Architecture]] ; CI : [[Code de la CI et du dépôt]] ; branches : [[Branches du dépôt]].
- Guides correspondants dans le vault : [[Développer et tester]], [[Publier une version]], [[Reprendre le développement]].
