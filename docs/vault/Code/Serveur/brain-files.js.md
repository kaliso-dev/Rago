---
type: code
tags: [code, serveur, javascript, admin, vault]
fichier: licensing/src/brain-files.js
lignes: 187
maj: 2026-11-27
---
# brain-files.js

Le côté serveur des **cerveaux « explorateur de fichiers »** du [[Cerveau du vault]] (`kind: 'files'`), créé le 27/11 pour **Rago Design** (dépôt privé `kaliso-dev/rago-design` : maquettes v5, kit de marque, scripts du CSS). Contrairement à [[brain.js]], il ne télécharge **jamais l'archive du dépôt** : il lit l'arborescence par l'API GitHub et chaque fichier seulement quand la page le demande. Fiche parente : [[Code du serveur]]. Navigateur : [[cerveau-fichiers.js]] ; page : [[brain-views.js]] (`explorerPage`).

(27/11 : PR #167 vers `staging`, pas fusionnée)

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `MAX_FILE` | 25 Mo : au-delà, un fichier n'est pas servi (la page renvoie vers GitHub). |
| `CACHE_TOTAL` / `CACHE_ITEM` | 50 Mo de cache en tout ; seuls les fichiers de 8 Mo au plus y entrent. |
| `IMAGE_TYPES`, `TEXT_EXT` | Types servis tels quels (png, jpg, jpeg, webp, gif, svg, avif, ico) ; extensions affichées en texte (py, md, txt, json, css, js, html, csv, yml, toml, sh, ps1, xml, sql, rs…). |
| `fileKind(chemin)` | `img`, `txt` ou `bin` (ce que la page fait du fichier). |
| `contentType(chemin)` | Type envoyé : celui de l'image, `text/plain; charset=utf-8` pour tout texte (même `.html`, `.js` : jamais exécuté), `application/octet-stream` sinon. |
| `lru(maxOctets)` | Petit cache LRU de `Buffer` borné par la taille totale (`get`, `set`, `bytes`, `size`) ; un élément plus gros que tout le cache n'est pas gardé. |
| `createExplorer({ repo, branch, dir, token }, { fetchImpl, log })` | `{ repo, error, cache, tree({ fresh }), open(chemin) }`. |

## Fonctionnement détaillé
- **`tree()`** : `GET https://api.github.com/repos/<dépôt>/git/trees/<branche>?recursive=1` (`Accept: application/vnd.github+json`, `Authorization: Bearer <CERVEAU_GITHUB_TOKEN>`, `X-GitHub-Api-Version: 2022-11-28`, 20 s au plus). Garde les `blob` : `{ p (chemin), s (taille), b (empreinte du blob), k (fileKind) }`, triés ; filtre sur `dir` si le cerveau a un dossier ; **jamais un `.env`**. Réponse de plus de 20 Mo refusée. Relue au plus une fois par minute (`CHECK_EVERY`), en arrière-plan ; `fresh` force la lecture. Si GitHub échoue après une première lecture, l'ancienne arborescence reste servie et `error` donne la raison. Renvoie `{ repo, branch, dir, sha, truncated, at, files }` (`truncated` : GitHub a coupé la liste).
- **Erreurs** (`BrainError` de [[brain.js]]) : 401, 403, 404 → « **Ajoute rago-design au jeton CERVEAU_GITHUB_TOKEN** : … » (le nom du dépôt est repris de `repo` ; texte différent avec ou sans jeton : sans jeton, mettre la variable dans Railway ; avec, ajouter le dépôt au jeton, droit « Contents : Read-only », ou la branche n'existe pas) ; 403 avec `x-ratelimit-remaining: 0` → limite de l'API ; 409 → dépôt vide ; panne réseau → « GitHub ne répond pas ».
- **`open(chemin)`** : seulement un chemin de l'arborescence (sinon `null` → 404). Plus gros que `MAX_FILE` → `{ file, body: null }` sans rien télécharger. Dans le cache → `{ file, body: Buffer }`. Sinon `GET …/git/blobs/<empreinte>` avec `Accept: application/vnd.github.raw` (contenu brut, 120 s au plus) et renvoie un `ReadableStream` qui passe les morceaux au navigateur au fil de l'eau ; s'il dépasse `MAX_FILE` en route, le flux s'arrête. Un fichier de 8 Mo au plus est copié dans le cache une fois reçu en entier.
- **6 téléchargements à la fois au plus** (`MAX_ACTIVE`) : les suivants attendent ; la place est rendue à la fin du flux, à l'erreur ou quand le navigateur abandonne.

## Liens avec le reste
Créé par [[admin.js (serveur)]] (un explorateur par cerveau `kind: 'files'`, au premier appel) pour `GET /admin/cerveau/arbre.json` et `GET /admin/cerveau/brut`. Les en-têtes de sécurité de `brut` (CSP `sandbox`) sont posés par [[app.js]]. La liste des cerveaux (`DEFAULT_BRAINS`, `CERVEAUX`) est dans [[brain.js]].

## Tests
`brain-files.test.js` (5 tests, faux GitHub) : cache LRU, types, `CERVEAUX` avec `fichiers` ; arborescence sans contenu, un seul appel par fichier, cache, gros fichier relu en flux, plus de 25 Mo jamais téléchargé ; messages sans jeton et sans accès ; routes derrière la clé admin, en-têtes ; voir [[Tests du serveur]].
