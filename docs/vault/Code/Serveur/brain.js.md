---
type: code
tags: [code, serveur, javascript, admin, vault]
fichier: licensing/src/brain.js
lignes: 765
maj: 2026-11-12
---
# brain.js

Le côté serveur du [[Cerveau du vault]] : lit le dépôt (sur GitHub, ou sur le disque en local), met en forme les notes du vault comme Obsidian, calcule le graphe (notes, liens, citations, fichiers cités, liens cassés) et sert n'importe quel fichier du dépôt au lecteur. Fiche parente : [[Code du serveur]]. Page : [[brain-views.js]] ; navigateur : [[cerveau.js]].

(code de la PR #85 du Cerveau, dans `staging` depuis le 10/11 et en prod depuis la PR #87 du 10/11 ; plusieurs cerveaux depuis la PR #100 (`staging`) et la PR #101 (prod) du 12/11)

## Rôle et place dans l'ensemble

[[admin.js (serveur)]] crée un seul objet au démarrage avec `createBrain(cfg, { fetchImpl, log })` et l'utilise pour trois routes : la page (`brain.pick(id)`, `brain.brains`), `GET /admin/cerveau/donnees.json` (`brain.read({ id })`) et `GET /admin/cerveau/fichier?chemin=` (`brain.file(chemin, id)`), `id` étant le cerveau choisi. Tout passe derrière la garde de l'admin (cookie `rago_admin`, voir [[Tableau de bord admin]]). Aucune base de données : tout est gardé en mémoire.

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `BRAIN_VERSION` | `1`. Version du format envoyé à la page ; elle fait partie de l'`ETag`. À augmenter si la forme des données change. |
| `BrainError` | Erreur « normale » (GitHub absent, dépôt privé, branche inconnue) : la route répond 503 avec son message en français. |
| `untar(buf)` | Lit une archive tar (ustar, noms longs GNU `L`, en-têtes pax `x` et `g`) → `{ files: [{ path, data }], comment }`. `comment` = l'en-tête pax global, où GitHub met le commit. Seuls les fichiers normaux (`0`, `7`) sont gardés. |
| `localRepo(dir)` | Le dossier du dépôt autour du serveur (deux niveaux au-dessus de `src/`) ou `dir`, s'il contient `docs/vault/` ; sinon `null`. |
| `esc(s)` | Échappe `& < > " '`. |
| `slug(texte)` | Ancre d'un titre : sans accents, minuscules, tirets (`État actuel (10/11)` → `etat-actuel-10-11`). |
| `frontMatter(src)` | L'en-tête YAML simple des notes (`clé: valeur`, `clé: [a, b]`, listes `- a`) → `{ data, body, lines }`. |
| `plain(md)` | Le texte brut d'une ligne de markdown (pour la recherche et la phrase autour d'un lien). |
| `renderMarkdown(src, ctx)` | Markdown → HTML (voir plus bas). |
| `inline(src, ctx)` | La mise en forme dans une ligne. |
| `buildVault(notes, files, meta)` | Toutes les données de la page (voir plus bas). `meta.vault` = dossier du cerveau (`docs/vault/` par défaut), `meta.brain`, `meta.brains`. |
| `DEFAULT_BRAINS` | Les cerveaux par défaut : `rago` (« Rago Optimizer », `docs/vault/` du dépôt `CERVEAU_REPO`, branche `CERVEAU_BRANCH`) et `rago-os` (« RAGO-OS », `docs/vault/` de `kaliso-dev/RAGO-OS-`, branche `main`). |
| `parseBrains(texte)` | Lit `CERVEAUX` (`id|Nom|dossier|dépôt|branche;…`) ; id en minuscules, chiffres et tirets, dossier sans `..` ; liste vide ou invalide → `DEFAULT_BRAINS`. |
| `createBrain(cfg, { fetchImpl, log })` | `{ source, repo, branch, brains, pick(id), read({ fresh, id }), error(id), file(chemin, id) }`. Un id inconnu donne le premier cerveau. |

Constantes : `VAULT = 'docs/vault/'` (vault Rago), `CHECK_EVERY = 60 s` (au plus une lecture de GitHub par minute), `MAX_TARBALL = 120 Mo` (archive refusée au-delà), `MAX_TEXT = 600 Ko` (fichier listé mais pas gardé au-delà : type `big`).

## Fonctionnement détaillé

### Lire le dépôt sur GitHub
1. **Dernier commit** (`headSha`) : `GET https://github.com/<repo>.git/info/refs?service=git-upload-pack`, la liste des branches de git. Elle ne compte pas dans le quota de l'API REST. Le commit de `refs/heads/<branche>` est cherché dans la réponse. 401, 403 ou 404 → `BrainError` qui dit d'ajouter `CERVEAU_GITHUB_TOKEN` (ou que le jeton a expiré) ; branche absente → « La branche … n'existe pas » ; délai 15 s.
2. **Archive** (`download`) : sans jeton `https://codeload.github.com/<repo>/tar.gz/<commit>`, avec jeton `https://api.github.com/repos/<repo>/tarball/<commit>` (en-tête `Bearer`). Délai 90 s. Décompressée en mémoire (au plus 4 × 120 Mo), puis `untar`.
3. **Tri** (`loadGithub`) : le premier dossier de chaque chemin (`kaliso-dev-rago-<commit>/`) est retiré. Chaque fichier devient `{ size, kind }` : `big` au-delà de 600 Ko, `bin` pour les extensions binaires (`png`, `exe`, `woff2`, `pow`, `nip`, `mmdb`…) ou si les 8 000 premiers octets contiennent un octet nul, sinon `txt` (son texte est gardé). Les `.md` de `docs/vault/` (hors `.obsidian/`) deviennent les notes.
4. **Une « source » par dépôt et branche** (`makeSource`) : les cerveaux du même dépôt partagent la même archive ; chaque source a son cache, sa lecture en cours et sa dernière erreur. Chaque cerveau est construit (`build`) à partir de l'archive de son dépôt la première fois qu'on le demande, et de nouveau seulement quand l'archive change. Un cerveau sans note → `BrainError` « Le cerveau « … » est vide ».
5. **Cache** (`refresh`, `run`) : une seule lecture à la fois par source. Moins d'une minute depuis la dernière vérification → rien n'est demandé. Même commit → rien n'est retéléchargé. Nouveau commit → nouvelle archive et nouveau graphe. En erreur avec une version déjà lue, elle reste servie et `error()` donne la raison (en-tête `X-Cerveau-Erreur`) ; sans version, `BrainError`.
6. `read({ fresh, id })` répond tout de suite avec la version en mémoire et vérifie GitHub en arrière-plan si la minute est passée ; `fresh: true` (bouton ↻ de la page) attend la vérification.

Avec un jeton, la liste des branches est demandée avec `Authorization: Basic` (`x-access-token:<jeton>`), comme le fait git.

### Lire le dépôt sur le disque (local et tests)
Choisi quand `CERVEAU_SOURCE` n'est pas `github` et que `localRepo()` trouve un dossier, **seulement pour le dépôt principal** (`CERVEAU_REPO` à sa branche) : un cerveau d'un autre dépôt (RAGO-OS) est toujours lu sur GitHub. Liste des fichiers : `git ls-files -z --cached --others --exclude-standard` (fichiers suivis et nouveaux, pas ceux ignorés) ; sans git, parcours du dossier sans `.git`, `node_modules`, `target`, `dist`, `.obsidian`, `.trash`. **Un `.env` n'est jamais listé**, même s'il n'est pas ignoré (`.env.example` oui). Les notes sont relues à chaque appel si leur date ou leur taille a changé (empreinte `sig`), donc une note enregistrée apparaît au rechargement suivant. Un fichier est lu au moment où on l'ouvre ; s'il contient un octet nul, il est traité comme binaire.

### Markdown (`renderMarkdown`, `inline`)
Le sous-ensemble utilisé par le vault, façon Obsidian. **Tout le texte est échappé** : le seul HTML produit est celui écrit dans ce fichier.
- Blocs : titres `#` à `######` (avec une ancre unique, `-2`, `-3` si répétée), blocs de code ```` ``` ```` ou `~~~` (avec `data-lang`), lignes `---`, citations `>`, encadrés Obsidian `> [!type] Titre` (`<div class="callout co-type">`), tableaux (alignement `:-:` et `-:`, `\|` dans une cellule pour un lien de note avec alias, `|` gardé dans le code), listes à puces et numérotées imbriquées, cases `[ ]` et `[x]`, paragraphes (lignes jointes par `<br>`).
- Ligne : code `` `…` ``, liens de notes entre doubles crochets (simples, avec texte après `|`, vers un titre après `#`, ou intégrés avec `!`), liens `[texte](adresse)`, images (lien seulement), adresses nues `https://…`, gras, italique, barré `~~`, surligné `==`. Les liens externes n'acceptent que `http(s)://` et `mailto:` et s'ouvrent dans un nouvel onglet avec `rel="noopener noreferrer"` ; `javascript:` et le reste deviennent du texte.
- `ctx` décide de ce que devient chaque lien : `wiki`, `code`, `link`, `line` (la ligne en cours, pour la phrase de contexte), `ids` et `headings` (sommaire).

### Le graphe (`buildVault`)
- **Notes** : identifiant = chemin dans le vault sans `.md` (`Technique/Railway`), triées en français. Le groupe = premier dossier (`''` pour les notes de la racine, affiché « Pilotage »).
- **Résolution d'un lien de note** : avec un `/`, chemin relatif au dossier de la note puis chemin complet puis fin de chemin ; sinon par nom (sans tenir compte des majuscules), et s'il y a plusieurs notes du même nom, la plus courte en chemin. Introuvable → **lien cassé** (`bad` de la note, et un « fantôme » `ghosts` qui liste les notes qui le citent).
- **Fichiers cités** : un code entre backticks qui est un chemin du dépôt (`licensing/src/app.js`), une fin de chemin unique (`src/app.js`) ou un nom de fichier unique dans le dépôt (`route.rs`) devient un lien vers le fichier ; un nom présent deux fois (`admin.js`) reste du texte. Les suffixes `:12` ou `:12-30` sont ignorés. Le champ `fichier:` de l'en-tête compte aussi. Un chemin `<dossier du cerveau>/….md` en code devient un lien vers la note, ainsi qu'un nom de fichier de note seul (`Projet.md`).
- **Liens `[texte](chemin.md)`** vers une note du vault comptent comme des liens entre notes ; vers un autre fichier du dépôt, ils l'ouvrent dans le lecteur.
- Pour chaque note : `{ id, t (nom), g (groupe), d (dossier), fm (en-tête), tags, h (HTML), x (texte brut), hd (titres niveau 1 à 3), h1, out (notes liées), ctx (pour chaque note liée, la phrase où le lien apparaît la première fois, 260 caractères), code (fichiers cités), bad (liens cassés), w (mots), s (octets) }`.
- Total : `{ v, brain, brains: [{ id, name, repo }], vault, repo, branch, sha, source, at, notes, ghosts, files: [{ p, s, k }], groups: [{ id, count }], stats: { notes, links, broken, words, codeRefs, files } }`.
- Le JSON est gardé tel quel et compressé (gzip) une fois par version ; `ETag` = `"brain-<version>-<id du cerveau>-<20 caractères du sha256 du JSON>"`. Ordre de grandeur (10/11, ~250 notes) : ~2 Mo de JSON, ~0,4 Mo compressé, construit en ~0,2 s.

### Un fichier (`file(chemin)`)
Seulement un chemin **de la liste des fichiers** : rien d'autre sur le disque n'est atteignable (`../../etc/passwd` → `null`, donc 404). Réponse `{ p, s, k, lang }`, plus `text` pour un fichier texte. Un `.md` reçoit aussi `html` (`renderFileMarkdown`) : ses liens relatifs ouvrent les fichiers du dépôt, ses liens vers `docs/vault/*.md` ouvrent les notes.

## Données touchées
Réseau : `github.com` (liste des branches), `codeload.github.com` ou `api.github.com` (archive). Disque en local seulement (lecture). Mémoire : la dernière version (archive décompressée comprise, quelques dizaines de Mo).

## Erreurs et cas limites
- GitHub en panne : la dernière version reste, avec la raison. Rien de lu depuis le démarrage : 503 avec le message (« GitHub ne répond pas », « Le dépôt … n'est pas lisible sans jeton », « La branche … n'existe pas »…), affiché sur la page avec un bouton « Réessayer ».
- `decodeURIComponent` d'un lien mal formé : le lien reste du texte, la note s'affiche.
- Un fichier de plus de 600 Ko : `k: 'big'`, pas de texte (la page propose GitHub).

## Liens avec le reste
Appelé par [[admin.js (serveur)]] ; réglé par [[config.js]] (`brainRepo`, `brainBranch`, `brainToken`, `brainDir`, `brainSource` ← variables `CERVEAU_*`, voir [[Variables d'environnement]]). Ses données sont dessinées par [[cerveau.js]]. Le vault qu'il lit suit les règles de [[Mettre à jour le vault]].

## Tests
`licensing/test/brain.test.js` ([[Tests du serveur]]) : échappement (aucun `<script>`, `<img onerror>` ni `javascript:` ne passe) ; tableaux avec `\|`, listes, cases, encadrés, en-têtes ; graphe (liens par nom et par chemin, liens cassés, fichiers cités, nom en double trop vague, phrase de contexte) ; archive avec noms longs pax ; lecture GitHub (une archive par commit, cache d'une minute, GitHub en panne, dépôt privé sans jeton, jeton envoyé, branche absente) ; lecture du vault réel sur le disque ; routes protégées, page sans code en ligne, `ETag` et 304, gzip, fichier hors liste en 404.

## À savoir avant de modifier
- Ne jamais servir un chemin qui n'est pas dans la liste : c'est ce qui empêche de lire un fichier du serveur.
- Garder l'échappement de tout le texte des notes : la page de l'admin a une CSP stricte, mais le HTML des notes est injecté tel quel dans le lecteur.
- Changer la forme des données → augmenter `BRAIN_VERSION` et adapter [[cerveau.js]].
