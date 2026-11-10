---
type: code
tags: [code, ci, github-actions, yaml, site]
fichier: .github/workflows/site-check.yml
lignes: 48
maj: 2026-11-10
---
# site-check.yml

Le workflow GitHub Actions qui reconstruit le site avec [[build.py]] et échoue si une page publiée commitée n'est pas exactement ce que la source produit. Fiche parente : [[Code de la CI et du dépôt]]. Fonctionnalité : [[CI GitHub Actions]], [[Code du site]].

Tout ce qui suit est CONFIRMÉ (fichier de `staging`, 10/11) sauf mention. Créé le 07/10 ; pages ajoutées au fil des PR (reviews 11/10, tweaks 12/10, partners 16/10, route 07/11) ; machine fixée sur Ubuntu 24.04 le 10/11 (`98181fb`, PR #75) ; push limité à `staging` et à la prod le 10/11 (`0b8995b`).

## Rôle et place dans l'ensemble
[[Netlify]] publie les pages telles qu'elles sont dans Git, sans rien construire. Si quelqu'un modifie une source sans relancer `build.py`, ou modifie une page générée à la main, le site publié et la source divergent. Ce workflow l'empêche.

## Déclencheurs
| Événement | Condition |
|---|---|
| `workflow_dispatch` | à la main |
| `push` | branches `staging` et `claude/rago-monorepo-initial-eyj6pq` seulement, fichiers `site/**` ou ce workflow |
| `pull_request` | toute PR qui touche `site/**` ou ce workflow |

`concurrency` : groupe `site-check-<ref>`, annulation du run précédent. `permissions: contents: read`.

Attention : un changement de `licensing/src/billing.js` (prix Lifetime) ou du catalogue de l'app ne déclenche **pas** ce workflow, alors que [[build.py]] lit `LIFETIME_PRICE` ; l'écart ne serait vu qu'au prochain changement de `site/`.

## Job `index-html`
- Machine **`ubuntu-24.04`** (commentaire : « Playwright 1.56.1 ne gère pas Ubuntu 26.04 (ubuntu-latest depuis le 09/11) »).
1. `actions/checkout@v4`.
2. `actions/setup-node@v4`, Node 22.
3. « Installer Playwright » : dans `$RUNNER_TEMP/pw`, `npm install playwright@1.56.1` puis `npx playwright install --with-deps chromium` ; `NODE_PATH` pointe sur ce dossier pour que [[prerender.js]] trouve le paquet. Commentaire : « Même version que celle qui a fabriqué index.html, pour un résultat identique ».
4. « Régénérer index.html, reviews.html, tweaks.html, partners.html et route.html » : `python3 site/tools/build.py 2>&1 | tee build.log` (bash avec `pipefail` : un `assert` de `build.py` fait échouer l'étape) ; si le journal contient `warning: no-JS sections not baked`, erreur « prerender.js n'a pas tourné ».
5. « Comparer avec la version poussée » : `git diff --exit-code` sur `site/index.html`, `reviews.html`, `tweaks.html`, `partners.html`, `route.html`, et `git ls-files --error-unmatch site/partners.html site/route.html` (les pages doivent être suivies par Git). Sinon : « … n'est pas à jour : lance python3 site/tools/build.py et pousse le résultat ».

Ce que le workflow ne vérifie pas : les pages légales de [[make_legal.py]], le passage de [[sync_app.py]] / [[sync_tweaks.py]] (le catalogue de l'app peut avoir changé sans que le site suive), `sitemap.xml`, les images.

## État et durée (OBSERVÉ, API GitHub, 10/11)
- 203 exécutions depuis la création ; sur les 100 dernières (13/10 → 10/11) : 79 réussies, 17 échouées, 4 annulées. Durée d'une exécution réussie : **0,7 min en médiane** (0,5 à 2,5 min depuis le 04/11).
- **Branche de prod en échec** : sur la branche de prod, le fichier a encore `runs-on: ubuntu-latest` et ne vérifie pas `route.html`. Depuis le passage d'`ubuntu-latest` à Ubuntu 26.04 (09/11), l'installation de Playwright y échoue (« Cannot install dependencies for ubuntu26.04-x64 with Playwright 1.56.1 »). Constaté : push sur la prod le 10/11 à 15:05 (fusion de la PR #81) en échec, ainsi que la PR `claude/ci-prod-moins-de-builds` vers la prod. Tant que le correctif (`98181fb`) n'est pas porté en prod, toute PR vers la prod qui touche `site/` aura un `site-check` rouge.
- Autres échecs récents : 09/11 21:38 (`claude/project-thread-r4qi8b`) et 10/11 13:19-13:20 (`claude/project-thread-voewre`, trois runs), même cause, avant le correctif ; le reste (21, 25 et 28/10) en quelques secondes, quota de minutes vide.

## Liens avec le reste
- Ce qu'il reconstruit : [[build.py]], [[prerender.js]], [[sync_partners.py]] ; pages : [[Fichiers publiés du site]].
- Pendant pour le serveur et l'app : [[licensing-tests.yml]], [[app-windows.yml]].
- Procédure de correction : [[Développer et tester]], [[Netlify]].

## À savoir avant de modifier
- Changer la version de Playwright (`1.56.1`) change le HTML pré-rendu : reconstruire et commiter toutes les pages avec la même version, sinon la comparaison échoue.
- Une nouvelle page générée doit être ajoutée aux deux listes de l'étape 5 et au nom de l'étape 4.
- Revoir `ubuntu-24.04` quand Playwright sera mis à jour.
