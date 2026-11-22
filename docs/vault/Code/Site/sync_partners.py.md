---
type: code
tags: [code, site, python, partenaires]
fichier: site/tools/sync_partners.py
lignes: 67
maj: 2026-11-22
---
# sync_partners.py

Écrit les cartes des serveurs partenaires dans les sources du site à partir de [[partners.json]] : la section Partners de l'accueil et la page `partners.html`. Fiche parente : [[Code du site]]. Fonctionnalité : [[Partenaires et créateurs]].

Tout ce qui suit est CONFIRMÉ (branche du site v5, PR #109, 22/11). Ajouté le 16/10 avec l'offre Lifetime et la section Partners (PR #54 sur `staging`, #55 en prod).

## Rôle et place dans l'ensemble
- [[build.py]] lance ce script **en premier**. Après avoir modifié [[partners.json]], lancer `python3 site/tools/build.py` suffit ; on peut aussi le lancer seul : `python3 site/tools/sync_partners.py`.
- Il réécrit les **sources** [[page.html]] et [[partners.html]] (dans `site/src/`), qu'il faut commiter, puis `build.py` en tire les pages publiées.

## Ce que le fichier expose
- `e(t)` : `html.escape(str(t), quote=True)`.
- `logo(p, size=64)` : `<img src="…" alt="" width="size" height="size" loading="lazy" decoding="async">` (64 sur l'accueil, 96 sur la page des partenaires). Si l'entrée a `still`, l'image est entourée d'un `<picture>` avec `<source srcset="still" media="(prefers-reduced-motion: reduce)">` : un logo animé reste immobile pour qui coupe les animations.
- `card(p, ind)` (accueil, design v5) : `<a class="s-card s-pt" href="url" target="_blank" rel="noopener">` + logo 64 + `<div><b>nom</b><span>` icône `#i-external` + « Join on Discord »`</span>` + `<span class="sr-only"> (opens in a new tab)</span>`.
- `card_all(p, ind)` (page des partenaires) : `<a class="s-card pt-c" …>` + `<div class="lg">` logo 96, nom, « Minecraft PvP server » + bouton `<span class="btn">` « Join on Discord » + texte pour lecteur d'écran.
- `write(path, name, items, card=card)` : remplace tout ce qui est entre `<!-- partners:<name> -->` et `<!-- /partners:<name> -->`, avec l'indentation des marqueurs ; renvoie le nombre de cartes.

## Fonctionnement détaillé
1. Lit `site/src/partners.json`, clé `partners` (l'ordre du fichier est l'ordre d'affichage).
2. **Validation** de chaque entrée (numérotée à partir de 1) ; toutes les erreurs sont collectées puis le script s'arrête avec `partners.json:` suivi de la liste :
   - `name` doit être une chaîne non vide, **sans espace au début ni à la fin** (« must be the exact server name ») ;
   - `url` doit correspondre à `https://[^\s"<>]+` (« must be the full https invite link ») ;
   - `logo` (obligatoire) et `still` (si présent) doivent correspondre à `img/partners/[a-z0-9-]+\.webp` **et** le fichier doit exister dans `site/img/partners/` (« must be a WebP in site/img/partners/ ») ;
   - au moins une entrée doit avoir `"home": true` (« the home page section would be empty »).
3. Écrit les entrées `home: true` entre `<!-- partners:home -->` et `<!-- /partners:home -->` de `src/page.html`, puis **toutes** les entrées entre `<!-- partners:all -->` et `<!-- /partners:all -->` de `src/partners.html`. Chaque paire de marqueurs doit apparaître exactement une fois (`assert`). Le fichier n'est réécrit que si le contenu change. Écrit aussi le nombre de serveurs dans `<span id="pt-n">` de `src/partners.html` (« 6 servers », `assert` s'il manque).
4. Affiche `partners: N on the home page, M on partners.html`. Aujourd'hui : **4** sur l'accueil, **6** sur la page des partenaires.

## Données touchées
- Lit : `site/src/partners.json`, l'existence des images dans `site/img/partners/`.
- Écrit : `site/src/page.html`, `site/src/partners.html` (seulement la zone entre marqueurs).

## Erreurs et cas limites
- Une seule entrée invalide arrête tout `build.py` (le script est lancé avec `check=True`).
- Le nom affiché est exactement celui du fichier : il doit être le nom réel du serveur Discord partenaire (« Nothing is guessed »).
- Les textes « Join on Discord » et « Minecraft PvP server » sont fixes : un partenaire d'un autre genre demanderait de modifier `card()` et `card_all()`.

## Liens avec le reste
- Appelé par [[build.py]].
- Données : [[partners.json]] ; images : `site/img/partners/` ([[Fichiers publiés du site]]).
- Pages touchées : [[page.html]] (section Partners), [[partners.html]].
- Côté marketing : [[Partenaires et créateurs]].

## À savoir avant de modifier
- Garder les marqueurs `<!-- partners:… -->` dans les sources ; les supprimer casse la construction.
- Le style des cartes est défini dans chaque page : `.s-pt` dans [[page.html]], `.pt-c` dans [[partners.html]].
- La règle « 4 partenaires sur l'accueil » est écrite dans `_about` de [[partners.json]], pas imposée par le script.
