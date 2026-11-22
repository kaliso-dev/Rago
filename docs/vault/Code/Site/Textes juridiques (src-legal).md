---
type: code
tags: [code, site, juridique]
fichier: site/src/legal/terms.html, site/src/legal/privacy.html
maj: 2026-11-22
---
# Textes juridiques (src-legal)

Le texte des conditions de vente (`site/src/legal/terms.html`) et de la politique de confidentialité (`site/src/legal/privacy.html`), en anglais US. Ce ne sont pas des pages : seulement les sections (`<h2>`, paragraphes, listes, et le tableau `<div class="tbl"><table>` des données collectées). [[make_legal.py]] les met en page dans `site/terms.html` et `site/privacy.html`. Fiche parente : [[Code du site]] ; suivi : [[Conformité juridique]].

CONFIRMÉ (branche du site v5, PR #109, 22/11/2026). Créés le 22/11 en reprenant **mot pour mot** le texte des pages publiées (conditions du 13/11 avec la section 4a Rago Route, confidentialité du 10/11).

## Règles
- Conditions : chaque titre commence par son numéro (« 4a. Rago Route option ») ; `<h2 id="route">` et `<h2 id="cancel">` gardent les ancres utilisées ailleurs (`terms.html#cancel` dans tous les pieds de page).
- Pas d'accolade ni de balise de mise en page : le style vient de [[make_legal.py]] et [[v5.css]].
- Toute modification de fond : changer aussi la date `UPD` de [[make_legal.py]], puis relancer le script et commiter les pages.
- Ce qui est écrit ici engage le code (essai, prix, remise à zéro, données, cookies) : voir [[Offres et prix]], [[Paiements Stripe]], [[Remise à zéro]].
