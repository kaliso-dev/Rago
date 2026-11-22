---
type: code
tags: [code, site, python, catalogue]
fichier: site/tools/sync_tweaks.py
lignes: 170
maj: 2026-11-10
---
# sync_tweaks.py

Écrit toute la liste des tweaks de la page Tweaks (`site/src/tweaks.html`) à partir du catalogue de l'app et des textes du site ([[tweaks-copy.json]]) : une fiche dépliable par tweak, la navigation par section, les boutons « Helps with » et tous les compteurs. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 12/10 avec la page Tweaks (PR #39, prod #43). Commande : `python3 site/tools/sync_tweaks.py` (ou via [[sync_app.py]], qui le lance à la fin), puis [[build.py]].

## Rôle et place dans l'ensemble
- Sources de vérité : [[catalog.json]] (noms, sections, risques, redémarrage, variantes, gains, inconvénients, descriptions de l'app, presets) et [[free.json]] (plan gratuit). Les mots propres au site (résumé, explication, objectifs, ce qui ne revient pas, redémarrage réel) viennent de [[tweaks-copy.json]].
- Il réécrit la **source** [[tweaks.html]] entre des marqueurs ; [[build.py]] en tire ensuite `site/tweaks.html`.
- La liste est en HTML pur (`<details>`) : elle se lit et s'ouvre sans JavaScript ; le JavaScript de la page ajoute la recherche, les filtres et la fiche latérale.

## Ce que le fichier expose
| Nom | Rôle |
|---|---|
| `FREE` | ensemble des ids de `free.json["tweaks"]` |
| `FREE_REVERTS` | ids de `free.json["reverts"]` : tweaks Premium dont l'option d'annulation reste ouverte sans licence (commentaire : RBW Mod On, mode jeu Rago Off) |
| `COPY` | contenu de [[tweaks-copy.json]] |
| `SESSION` | `{"game_mode", "rbw_mode", "win_gamemode"}` (copie de `SESSION_TOGGLES` de [[store.tsx]]) |
| `GROUPS` | `Optimize` : network, latency, gpu, windows ; `In game` : hitreg, minecraft, rbw, gamemode ; `Advanced` : expert, restore (mêmes groupes que la barre latérale de l'app) |
| `GOALS` | les 9 objectifs proposés en boutons : FPS, Smoothness, Input lag, Connection, Hitreg, Background, Privacy, Cleanup, Recovery |
| `NEEDS` | `gpu:nvidia` → « An NVIDIA graphics card », `gpu:amd` → « An AMD graphics card », `gpu:intel` → « Intel graphics », `cpu:intel` → « An Intel CPU », `cpu:amd` → « An AMD CPU » |
| `ICON` | les icônes Lucide des modules, lues dans l'objet `const ICON = {` de [[page.html]] |
| `presets` | pour chaque id de tweak, les noms anglais des presets qui le contiennent (le préfixe avant `:` des entrées de preset) |
| `restart(t)` | `('v', 'Depends on the option')` si une variante a un `reboot` différent du tweak, sinon `('1', 'Needed')` ou `('0', 'Not needed')` |
| `card(m, sec, t, k)` | le HTML d'une fiche |
| `put(name, body)` | remplace le contenu entre `<!-- tw:<name> -->` et `<!-- /tw:<name> -->` |

## Fonctionnement détaillé
### 1. Liste des tweaks distincts
Parcours de tous les modules et sections du catalogue, renvois `ref` ignorés. La clé d'un tweak est `twin` s'il existe, sinon son `id`. Le premier tweak rencontré pour une clé donne la fiche ; les suivants (jumeaux) deviennent des alias « Nom (Module) » et leurs ids sont gardés (`twin_ids`) pour que les anciens liens `#id` marchent. Même règle que `distinctKey` de [[catalog.ts]] : le total est **218** le 10/11, comme sur l'accueil.

### 2. Contrôle des textes
- `warning: no words in tweaks-copy.json for <clé> (the app description is used)` : tweak sans texte du site ; sa fiche utilise la description de l'app comme résumé et explication, sans objectif.
- `note: tweaks-copy.json has words for <clé> which is no longer in the catalog` : texte orphelin.
Le 10/11 : aucun avertissement, aucune note (218 clés de chaque côté).

### 3. Une fiche (`card`)
- **Redémarrage** : `restart(t)`, sauf si le texte du site a `restart` (le catalogue dit « pas de redémarrage » mais le script en demande un, vérifié à la main) : alors la valeur est `v` si le texte contient « some », sinon `1`, et le texte affiché est celui de `restart`.
- **Genre** : `session` si l'id est dans `SESSION`, sinon `kind` du catalogue (`tweak` ou `action`).
- **Badges** du résumé : `Advanced` (`risk == "advanced"`, style `warn`), `Restart` (si `rb == '1'`), `Runs once` (action) ou `On / Off` (session), puis un badge `tag` par objectif de `helps`.
- **Fiche technique** (`<dl class="spec">`), dans l'ordre :
  - `Plan` : « Free » + « Open in the free version », ou « Premium » + « Unlocked with Premium », ou « Premium » + « <option> is open in the free version » pour un tweak de `FREE_REVERTS` (l'option est la variante marquée `revert`) ;
  - `Level` : « Safe » + « Fine for every PC » ou « Advanced » + « For players who know what they change » ;
  - `In the app` : « Switch » + « Turn it off and your previous settings come back. » ; « One-time action » + « It runs once and has no off switch. » ; « On and off » + « Turn it on before playing, off after. ». Pour un `tweak`, le texte `undo` du site remplace la phrase (ce que l'arrêt ne remet pas) ;
  - `Restart` ;
  - `Restore point` : « Recommended » + « Ticked for you before it runs » si `restore` est vrai, sinon « Optional » + « Offered, not required » ;
  - `Works on` : matériel requis (`requires` du tweak et de la section, traduits par `NEEDS`) ou « Any Windows 10 or 11 PC » ;
  - `N options` (si variantes) avec la liste des libellés ;
  - `In presets` (si le tweak est dans des presets) ;
  - `Also in the app as` (si jumeaux).
- **Encadrés** : « What to expect » (le `gain` du catalogue, s'il existe) ; « Good to know » (le `cons` du catalogue, ou « No known drawback. ») ; « How the app describes it » (la `desc` anglaise de l'app).
- **Balise** : `<details class="tc" id="<clé>" data-m="<module>" data-mn="<nom du module>" data-h="<objectifs séparés par |>" data-p="free|pro" data-r="<risk>" data-b="0|1|v"` + `data-a` (alias) + `data-ids` (si jumeaux). Le résumé contient la section, la pastille Free ou Premium (cadenas), le nom, le résumé du site et les badges ; le corps contient l'explication (`about`), la fiche technique et les encadrés. Ces attributs `data-*` sont lus par le JavaScript de [[tweaks.html]] pour les filtres et la recherche.

### 4. Navigation, objectifs, puces et liste
- `icons` : un `<symbol id="m-<module>">` par module, plus `m-dashboard`.
- `nav` (barre latérale) : bouton « All tweaks » (218) puis les modules par groupe avec leur nombre de fiches.
- `chips` (puces au-dessus de la liste, pour mobile) : « All » puis les mêmes modules.
- `goals` : un bouton par objectif de `GOALS` qui a au moins un tweak, avec son nombre. Le 10/11 : Smoothness 66, Background 49, Input lag 38, Privacy 33, Connection 32, Cleanup 14, FPS 11, Recovery 8, Hitreg 3. L'objectif « Screenshare », utilisé par un seul texte (`rbw_mode`), n'est pas dans `GOALS` : il apparaît comme badge sur la fiche mais n'a pas de bouton.
- `list` : une `<section class="grp" id="s-<module>">` par module (titre, tagline, nombre) contenant ses fiches.
- Nombre de fiches par section le 10/11 : Latency 81, Windows 56, Graphics card 29, Network 24, Expert mode 12, Hitreg 9, Restore 4, Minecraft 1, RBW Mod 1, Game mode 1 (ces nombres comptent aussi les actions, d'où l'écart avec les compteurs de l'accueil, voir [[sync_app.py]]).

### 5. Écriture
`put()` pour `icons`, `nav`, `goals`, `chips`, `list` ; puis les nombres écrits dans le texte : classes `n-all` (218), `n-free` (68), `n-mods` (10), `n-presets` (nombre de presets du catalogue : 20) ; `<title>All 218 tweaks` ; « explore all / all / Search 218 tweaks ». Message final : `tweaks.html: 218 tweaks, 68 free, 10 sections`.

## Données touchées
- Lit : `app/src/data/catalog.json`, `app/src/data/free.json`, `site/src/tweaks-copy.json`, `site/src/page.html` (icônes).
- Écrit : `site/src/tweaks.html` (toujours réécrit).

## Erreurs et cas limites
- Un module sans icône dans `ICON` de [[page.html]] fait planter le script (`KeyError`).
- Un marqueur `<!-- tw:… -->` absent fait planter `put()` (`ValueError`).
- `n_free` compte les fiches distinctes dont l'id est dans `free.json` : **68**, alors que l'accueil affiche **73** (taille brute de `free.json`). À VÉRIFIER : lequel est le bon chiffre public.

## Liens avec le reste
- Lancé par [[sync_app.py]] (ou à la main) ; suivi de [[build.py]].
- Lit [[catalog.json]], [[free.json]], [[tweaks-copy.json]], et les icônes de [[page.html]].
- Écrit dans [[tweaks.html]].
- Fonctionnel : [[Catalogue des tweaks]], [[Presets]], [[Offres et prix]] (plan gratuit).

## À savoir avant de modifier
- Le résumé, l'explication et les objectifs d'un nouveau tweak s'écrivent dans [[tweaks-copy.json]] (le script avertit s'ils manquent).
- `undo` et `restart` dans [[tweaks-copy.json]] corrigent ce que le catalogue ne dit pas ; les commentaires précisent qu'ils ont été « vérifiés contre le script » du tweak. Les garder justes quand le script change.
- Ajouter un objectif public = l'ajouter à `GOALS` **et** l'utiliser dans `helps`.
- L'id HTML d'une fiche est la clé `twin` quand elle existe : changer le `twin` d'un tweak dans le catalogue casse les liens partagés vers cette fiche (sauf l'ancien id gardé dans `data-ids`).
