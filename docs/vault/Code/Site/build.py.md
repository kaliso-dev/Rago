---
type: code
tags: [code, site, python]
fichier: site/tools/build.py
lignes: 164
maj: 2026-11-10
---
# build.py

Le générateur du site : il transforme les sources `site/src/*.html` en pages publiées à la racine de `site/` (`index.html`, `reviews.html`, `tweaks.html`, `partners.html`, `route.html`). Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Netlify]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`). Commande : `python3 site/tools/build.py` (depuis n'importe quel dossier : les chemins partent de l'emplacement du script). Il faut ensuite **commiter les pages générées** : [[Netlify]] ne lance pas ce script, il publie le dossier `site/` tel qu'il est dans Git.

## Rôle et place dans l'ensemble
- C'est la **seule** façon correcte de produire les pages publiées. On modifie toujours la source ([[page.html]], [[tweaks.html]], [[reviews.html]], [[partners.html]], [[route.html]]), puis on lance ce script. Les pages de la racine de `site/` ne se modifient jamais à la main ([[Fichiers publiés du site]]).
- La CI [[site-check.yml]] relance ce script sur chaque push ou PR qui touche `site/` et échoue si une page commitée diffère de ce que le script produit, ou si le pré-rendu sans JavaScript n'a pas marché.
- Ce script ne génère **pas** les pages légales (`terms.html`, `privacy.html`, `404.html`) : c'est [[make_legal.py]]. Il ne met pas non plus à jour la liste des tweaks : c'est [[sync_app.py]] (qui lance [[sync_tweaks.py]]). Ordre normal quand le catalogue de l'app change : `sync_app.py` puis `build.py`.
- Il appelle lui-même [[sync_partners.py]] au début et [[prerender.js]] au milieu.

## Ce que le fichier expose
Un script sans fonction publique. Constantes et petites fonctions internes :

| Nom | Valeur ou rôle |
|---|---|
| `SITE` | `https://rago-optimizer.com` : adresse publique, utilisée pour `canonical`, `og:url`, l'image de partage et le JSON-LD |
| `ROOT` | le dossier `site/` (parent de `tools/`) |
| `GOOGLE` | le bloc exact de 3 lignes qui charge Geist depuis Google Fonts dans les sources : `preconnect` vers `fonts.googleapis.com`, `preconnect` `crossorigin` vers `fonts.gstatic.com`, feuille `css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap` |
| `LOCAL` | ce qui le remplace : `preload` de `fonts/Geist-Variable.woff2` et deux `@font-face` (`Geist` → `fonts/Geist-Variable.woff2`, `Geist Mono` → `fonts/GeistMono-Variable.woff2`, poids `100 900`, `font-display: swap`) |
| `cfg(k)` | lit une clé de l'objet `CONFIG` de `page.html` par expression régulière (`k: "texte"` ou `k: 12.34`) |
| `BASE`, `CUR` | `CONFIG.accountBase` sans `/` final, `CONFIG.currency` |
| `PM`, `PY`, `PL` | `priceMonth`, `priceYear`, `priceLifetime` (en nombres) |
| `ISO` | `$` → `USD`, `€` → `EUR`, `£` → `GBP`, sinon `USD` |
| `jsround(n)` | arrondi au centime identique au `Math.round` du JavaScript de la page |
| `FREE` | `floor(1e-9 + 12 − PY / PM)` = nombre de mois offerts par l'annuel, même calcul que `MONTHS_FREE` dans la page (aujourd'hui 12 − 29,99 / 5,99 = 6,99 → **6**) |
| `OG` | `https://rago-optimizer.com/og-image.png?v=<10 premiers caractères du SHA-256 du fichier>` (aujourd'hui `?v=153045a26b`) |
| `LD` | le JSON-LD de l'accueil |
| `OUT` | `site/index.html` |

## Fonctionnement détaillé
### 1. Cartes des partenaires
Ligne 11 : `subprocess.run([sys.executable, 'tools/sync_partners.py'], check=True)`. Si une entrée de [[partners.json]] est incomplète, [[sync_partners.py]] sort en erreur et `build.py` s'arrête là (exception `CalledProcessError`), avant d'avoir écrit quoi que ce soit.

### 2. Accueil (`src/page.html` → `index.html`)
1. **Polices** : `assert GOOGLE in s` (message `Google Fonts block changed in page.html: update build.py`), puis remplacement par `LOCAL`. But écrit en tête du script : ne pas envoyer l'adresse IP des visiteurs à Google.
2. **Liens sans JavaScript** : les `href="/login"`, `/signup`, `/affiliate`, `/download` et `/buy?interval=year` deviennent `href="https://account.rago-optimizer.com/..."` (valeur de `accountBase`). Le JavaScript de la page réécrit de toute façon ces liens au chargement ; ce remplacement sert aux visiteurs sans JavaScript.
3. **Prix par défaut (offre annuelle)** :
   - `<b id="p-amt">` ← `$2.50` (29,99 / 12 arrondi) ;
   - `<div class="price-note" id="p-note">` ← `Billed $29.99 yearly. 6 months free.` (la phrase des mois offerts disparaît si `FREE` < 1) ;
   - `<span class="save" id="save">` ← `6 months free yearly` (avec `hidden` si `FREE` < 1) ;
   - `<b id="l-amt">` ← `$59.99` (Lifetime). `assert n == 1` (message `Lifetime price (l-amt) not found in page.html`). Sans JavaScript, le bouton Lifetime reste sur « Coming soon ».
4. **Contrôle du prix Lifetime** : si `licensing/src/billing.js` existe (il existe dans le monodépôt), le script y cherche `LIFETIME_PRICE = { amount: (\d+), currency: '(\w+)' }` et vérifie que `amount == round(PL × 100)` et `currency == ISO.lower()`. Aujourd'hui : `5999` et `usd` des deux côtés. En cas d'écart, arrêt avec `priceLifetime ($59.99 in src/page.html) and LIFETIME_PRICE (licensing/src/billing.js) differ: change both`. C'est la règle de `site/CLAUDE.md` : le prix du site doit rester égal à celui que vend le serveur ([[Offres et prix]], [[Paiements Stripe]]). Le prix mensuel et annuel ne sont **pas** contrôlés ici (ils viennent de Stripe, lus par la page via `/api/v1/plans`).
5. **FAQ sans JavaScript** : le script découpe dans la page le tableau JavaScript `  const F = [` … `\n  ];`, le fait exécuter par `node -e` avec `MONTHS_FREE` et un `CONFIG` réduit (`currency`, `priceLifetime`, `priceMonth`, `trialDays`), récupère le JSON des questions, échappe `&`, `<`, `>`, remplace le mot `Discord` par un lien vers `CONFIG.discord`, **écarte les questions marquées `"life"`** (Lifetime ne s'achète pas sans JavaScript) et insère juste après `<div class="faq rv" id="faqs"></div>` un `<noscript><div class="faq">` de `<details class="fq-s">`. Aujourd'hui : 18 questions dans `F`, **16** dans la version sans JavaScript. Si `node` manque : avertissement `warning: static FAQ skipped (node not available)` et la page est quand même écrite. Correctif du 10/11 (`a190565`) : `priceMonth` et `trialDays` ajoutés au `CONFIG` réduit, sinon la FAQ statique affichait « undefined-day ».
6. **Discord** : si `CONFIG.discord` est rempli (c'est le cas), chaque `href="#discord"` devient le lien d'invitation avec `target="_blank" rel="noopener"`, et l'attribut ` hidden` est retiré des éléments qui ont la classe `js-discord` (`assert n >= 1`, message `no js-discord element found in page.html`).
7. **Image de partage** : l'adresse porte une empreinte du fichier `site/og-image.png` (`?v=` + 10 caractères du SHA-256), pour que Discord, WhatsApp et les réseaux rechargent l'image quand elle change. Attention : l'image actuelle affiche encore « 199 tweaks » (voir [[Fichiers publiés du site]] et [[export-logo.js]]).
8. **Données structurées (JSON-LD)** dans un `@graph` :
   - `WebSite` (`@id` `/#website`, `name` « Rago Optimizer », `alternateName` « Rago », `inLanguage` `en`) ;
   - `Organization` (`@id` `/#organization`, `logo` `apple-touch-icon.png`, `email` l'adresse de support) ;
   - `SoftwareApplication` (`@id` `/#app`, `operatingSystem` « Windows 10, Windows 11 », `applicationCategory` `UtilitiesApplication`, `image` = `OG`, description « The Minecraft PvP optimizer for Windows: steadier ping, smoother frames, less input lag. », trois `Offer` : Free 0, Premium monthly 5.99, Premium yearly 29.99, en `USD`). Lifetime n'y figure pas.
   - Le commentaire de la ligne 78 dit que `aggregateRating` (les étoiles Google) est ajouté **par la page elle-même** à partir des avis publiés. **À VÉRIFIER** : ce code existait dans [[page.html]] depuis le 17/10 (`4f33070`, RAG-33, à partir de 10 avis) mais il n'y est plus sur `staging` ; il semble avoir été perdu lors d'une fusion fin octobre ou début novembre. Le commentaire est donc faux aujourd'hui.
9. **En-tête `<head>`** : le script trouve la fin du grand style (`</style>` qui suit `<style>\n/* Layout`), et met devant : `<!doctype html>`, `<html lang="en">`, `charset`, `viewport` (`viewport-fit=cover`), `theme-color` `#0A0A0B`, `canonical` `https://rago-optimizer.com/`, les balises `og:*` (`site_name`, `type website`, `locale en_US`, `url`, `title` = le `<title>` de la page, `description`, `image` 1200 × 630 `image/png`, `image:alt`), `twitter:card summary_large_image` et ses copies, les icônes (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`) et le JSON-LD. La description de partage est « Every millisecond counts. The Minecraft PvP optimizer for Windows: {TOTAL}, free to start, with a restore point offered before advanced tweaks. », où `{TOTAL}` est lu dans le titre `<h2>Nearly 220 tweaks. One clear app.</h2>` (expression `(?:Nearly )?\d+ tweaks`) et mis en minuscules : « nearly 220 tweaks ». Le texte alternatif est « Rago Optimizer, the Windows optimizer for Minecraft PvP. Every millisecond counts. ».
10. **Écriture** : `head + partie avant la fin du style + </head><body> + reste + </body></html>` dans `site/index.html`.
11. **Pré-rendu sans JavaScript** : `node tools/prerender.js site/index.html` ([[prerender.js]]) ouvre la page dans Chromium hors ligne et rend un JSON `{id: innerHTML}` pour les blocs que le JavaScript remplit (`side`, `tl1`, `tl2`, `mq`, `cmp`, `xtabs`, `xpanel` : aperçu de l'app, bande des jeux, tableau de comparaison, explorateur de tweaks). Chaque bloc est inséré dans son élément vide (`assert n == 1` par id), puis `aria-labelledby="xt1"` est ajouté à `#xpanel` (l'onglet pré-rendu est Latency). La page est réécrite. Si `node` ou Playwright manquent : `warning: no-JS sections not baked (node + playwright needed): …` et la page reste sans ces blocs ; la CI considère ce message comme une **erreur**.
12. Message `index.html built`. Les avis ne sont jamais pré-rendus : ils viennent du serveur de comptes et restent cachés sans JavaScript.

### 3. Page des avis (`src/reviews.html` → `reviews.html`)
Polices locales (`assert`), `accountBase: "…"` remplacé par `BASE` (`assert n == 1`, message `accountBase not found in reviews.html`), et les liens écrits en dur `href="https://account.rago-optimizer.com/` remplacés par `BASE`. Message `reviews.html built`.

### 4. Page Tweaks (`src/tweaks.html` → `tweaks.html`)
Exactement le même traitement que la page des avis (messages `… in tweaks.html`). La liste des tweaks est déjà dans la source (écrite par [[sync_tweaks.py]]). Message `tweaks.html built`.

### 5. Partenaires et Rago Route
`src/partners.html` → `partners.html` et `src/route.html` → `route.html` : seulement les polices locales (pages statiques, aucun lien vers le serveur de comptes). Messages `partners.html built`, `route.html built`.

## Données touchées
- **Lit** : `site/src/page.html`, `reviews.html`, `tweaks.html`, `partners.html`, `route.html`, `site/og-image.png`, `licensing/src/billing.js`.
- **Écrit** : `site/index.html`, `site/reviews.html`, `site/tweaks.html`, `site/partners.html`, `site/route.html` ; et, par [[sync_partners.py]], `site/src/page.html` et `site/src/partners.html` (seulement si les cartes ont changé).
- **Lance** : `python3 tools/sync_partners.py`, `node -e …` (FAQ), `node tools/prerender.js` (Chromium par Playwright).
- Aucun accès réseau : le pré-rendu bloque toutes les requêtes `http(s)`.

## Erreurs et cas limites
- Tous les `assert` arrêtent le script avec un message en anglais qui dit quoi corriger. Comme l'accueil est écrit **avant** le pré-rendu, une erreur dans les étapes 3 à 5 peut laisser `index.html` à jour et les autres pages anciennes : relancer après correction.
- Sans `node` : pas de FAQ statique ni de blocs pré-rendus, mais le script finit (deux avertissements). La CI échoue alors à cause du second avertissement.
- Si Playwright n'est pas installé localement, voir [[Développer et tester]] (la CI installe `playwright@1.56.1` dans un dossier temporaire et passe `NODE_PATH`).
- Si le titre `<h2>… tweaks. One clear app.</h2>` change de forme, `re.search(...).group(1)` lève une erreur (`AttributeError`).
- Le script est idempotent : relancé sur des sources inchangées, il produit des fichiers identiques (vérifié le 10/11 dans une copie : les 5 pages sont identiques à celles commitées).

## Liens avec le reste
- Appelé par : la personne qui modifie le site, la CI [[site-check.yml]], et indirectement le guide de [[Développer et tester]].
- Appelle : [[sync_partners.py]], [[prerender.js]].
- Lit la configuration de [[page.html]] (objet `CONFIG`), le prix Lifetime du serveur ([[Serveur de licences]]).
- Ses sorties sont publiées par [[Netlify]] ; [[preview.sh]] les retouche ensuite pour les aperçus.
- Ses règles de prix découlent de [[Offres et prix]].

## Tests
Pas de test unitaire. Le contrôle est la CI [[site-check.yml]] : relance complète puis `git diff --exit-code` sur les 5 pages générées.

## À savoir avant de modifier
- Le bloc `GOOGLE` doit rester identique, caractère pour caractère, dans les cinq sources : si on change les polices d'une source, il faut changer `GOOGLE` ici aussi (sinon `assert`).
- Le prix Lifetime se change **à deux endroits** : `CONFIG.priceLifetime` dans [[page.html]] et `LIFETIME_PRICE` dans `licensing/src/billing.js`. Le script refuse de construire s'ils diffèrent.
- Les 302 de `netlify.toml` (`/buy`, `/login`…) ne servent qu'aux adresses tapées à la main ; les liens de la page sont déjà absolus après ce script.
- Le commentaire sur `aggregateRating` (ligne 78) est trompeur tant que le code n'est pas remis dans la page (voir plus haut).
- Toute nouvelle page source doit être ajoutée ici **et** dans la liste de [[site-check.yml]] (`git diff --exit-code …` et `git ls-files --error-unmatch …`), sinon elle ne sera ni construite ni vérifiée.
