---
type: code
tags: [code, site, html, partenaires]
fichier: site/src/partners.html
lignes: 111
maj: 2026-11-22
---
# partners.html

Source de la page des serveurs partenaires (`rago-optimizer.com/partners.html`) : une grille de cartes, chacune ouvrant l'invitation Discord du serveur dans un nouvel onglet. Fiche parente : [[Code du site]]. Fonctionnalité : [[Partenaires et créateurs]].

Tout ce qui suit est CONFIRMÉ (branche du site v5, PR #109 vers `staging`, 22/11). Créée le 16/10 (`f76cba4`, PR #54 ; prod #55), passée au design v5 le 22/11 (maquette « site-partners », [[Charte graphique]]). La page publiée `site/partners.html` est produite par [[build.py]] (`v5.css?v=`, image de partage versionnée) ; ne jamais la modifier à la main.

## Rôle et place dans l'ensemble
- La section Partners de l'accueil ([[page.html]]) montre 4 partenaires et renvoie ici pour la liste complète (6 aujourd'hui).
- Les cartes sont écrites entre `<!-- partners:all -->` et `<!-- /partners:all -->` par [[sync_partners.py]] à partir de [[partners.json]]. Le reste de la page est écrit à la main.
- Page statique : aucun appel au serveur de comptes, donc [[preview.sh]] ne la touche pas.

## Contenu
- `<head>` complet : titre « Partners · Rago Optimizer », description, canonical, `og:*`, icônes, `v5.css`, un petit `<style>` propre à la page.
- En-tête `header.s-nav.sm-nav#top` : logo (tuile blanche, R rouge), « Back to the site » (caché sur téléphone), « Get Premium » (`./#pricing`).
- Héros : « Partners // 6 servers » (le nombre, dans `<span id="pt-n">`, est écrit par [[sync_partners.py]]), « Our partner servers. » (coup de pinceau sous « servers. »), « Minecraft PvP communities that work with Rago Optimizer. Each card opens the server's Discord invite in a new tab. ».
- Grille `.pt-grid` (3 colonnes, 2 sous 1 080 px, 1 sur téléphone) de cartes `a.s-card.pt-c` : logo 96 × 96 (72 sur téléphone), nom, « Minecraft PvP server », bouton « Join on Discord » avec l'icône de lien externe, texte pour lecteur d'écran « (opens in a new tab) ».
- Note « Each partner server is run by its own team. » et le pied de page v5 commun, avec le même texte légal qu'avant.
- Script : seulement le fond de l'en-tête au défilement.

## Liens avec le reste
- Données : [[partners.json]] ; écriture des cartes : [[sync_partners.py]] ; publication : [[build.py]], [[Netlify]] ; contrôle : [[site-check.yml]].
- Section correspondante de l'accueil : [[page.html]].

## À savoir avant de modifier
- Ne pas retirer les marqueurs `<!-- partners:all -->` / `<!-- /partners:all -->`.
- Les cartes de cette page (`pt-c`, fonction `card_all` de [[sync_partners.py]]) sont plus grandes que celles de l'accueil (`s-pt`, fonction `card`) ; leur style est dans le `<style>` de chaque page.
- La page figure dans `sitemap.xml` (`lastmod` 2026-10-16), voir [[Fichiers publiés du site]].
