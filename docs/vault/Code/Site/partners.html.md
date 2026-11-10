---
type: code
tags: [code, site, html, partenaires]
fichier: site/src/partners.html
lignes: 161
maj: 2026-11-10
---
# partners.html

Source de la page des serveurs partenaires (`rago-optimizer.com/partners.html`) : une grille de cartes, chacune ouvrant l'invitation Discord du serveur dans un nouvel onglet. Fiche parente : [[Code du site]]. Fonctionnalité : [[Partenaires et créateurs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créée le 16/10 (`f76cba4`, PR #54 ; prod #55). La page publiée `site/partners.html` est produite par [[build.py]] (seulement les polices locales) ; ne jamais la modifier à la main.

## Rôle et place dans l'ensemble
- La section Partners de l'accueil ([[page.html]]) montre 4 partenaires et renvoie ici pour la liste complète (6 aujourd'hui).
- Les cartes sont écrites entre `<!-- partners:all -->` et `<!-- /partners:all -->` par [[sync_partners.py]] à partir de [[partners.json]]. Le reste de la page est écrit à la main.
- Page statique : aucun appel au serveur de comptes, donc [[preview.sh]] ne la touche pas.

## Contenu
- `<head>` complet : titre « Partners · Rago Optimizer », description « The Minecraft PvP servers that partner with Rago Optimizer, the optimizer for Windows. Join them on Discord. », canonical, `og:*` (image `og-image.png` sans empreinte), icônes, bloc Google Fonts (remplacé par [[build.py]]).
- CSS : mêmes jetons que l'accueil (commentaire : « Same tokens and pieces as the home page (page.html): rounded everywhere, one red, no orange »), voir [[tokens.css (marque)]].
- En-tête : logo, « Back to the site », « Get Premium » (`./#pricing`).
- Héros : « Partners », « Our partner servers. », « Minecraft PvP communities that work with Rago Optimizer. Each card opens the server's Discord invite in a new tab. ».
- Grille `.pts` de cartes `.pt` (logo 56 × 56, nom, « Join on Discord », texte pour lecteur d'écran « (opens in a new tab) »).
- Pied : Rago Optimizer, Pricing, FAQ, Reviews, Terms, Privacy, Cancellation ; « Each partner server is run by its own team. … © 2026 Rago Optimizer, by KALISO and RAGO. » (signature ajoutée le 10/11, `a190565`).
- Script d'une ligne : la lueur rouge d'une carte suit le pointeur (variables CSS `--mx`, `--my`), comme sur l'accueil.

## Liens avec le reste
- Données : [[partners.json]] ; écriture des cartes : [[sync_partners.py]] ; publication : [[build.py]], [[Netlify]] ; contrôle : [[site-check.yml]].
- Section correspondante de l'accueil : [[page.html]].

## À savoir avant de modifier
- Ne pas retirer les marqueurs `<!-- partners:all -->` / `<!-- /partners:all -->`.
- Le style des cartes est dupliqué ici et dans [[page.html]] : une modification de la carte se fait aux deux endroits.
- La page figure dans `sitemap.xml` (`lastmod` 2026-10-16), voir [[Fichiers publiés du site]].
