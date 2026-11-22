---
type: code
tags: [code, site, marketing, document]
fichier: site/recherche-conversion.md
lignes: 32
maj: 2026-11-10
---
# recherche-conversion.md

Note de recherche du 04/10/2026 rangée dans `site/` : ce qui fait acheter sur un site de vente, avec ses sources, et ce qui en a été tiré pour la première version du site. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Marketing]].

Tout ce qui suit est CONFIRMÉ (fichier de `staging`, 10/11). Fichier en français, un seul commit (`6c2bcad`, 07/10), jamais modifié depuis. **Non publié** : [[netlify.toml]] supprime `site/*.md` avant la publication.

## Contenu, résumé
1. **La vitesse d'abord** : 0,1 s de chargement gagnée = +8,4 % de conversions en commerce (étude Google / Deloitte, 37 marques, 30 millions de sessions, via web.dev). Appliqué : une seule page HTML, aucun framework, logo en SVG, polices limitées.
2. **Une seule action, répétée** : pages à un seul lien 13,5 % contre 10,5 % avec cinq liens ou plus ; médiane 6,6 % (Unbounce, 41 000 pages ; via ClickMinded). Appliqué : un seul appel à l'action Premium, répété (héros, tarifs, fin de page, barre fixe sur mobile).
3. **Rassurer au moment de payer** : titre orienté bénéfice et avis nommé au-dessus des prix, +8 % (Conversion Rate Experts) ; une garantie ne sert que si elle est visible au moment de l'engagement (+10 % sur ordinateur). Appliqué : réassurance sous le bouton de la carte Premium.
4. **Les concurrents** : Hone (promesse courte, gratuit limité puis Premium, FAQ sécurité / réversibilité / limites du ping) et ExitLag (essai de 3 jours sans carte, remboursement sous 7 jours, FAQ « risque de ban »). Voir [[Étude - Optimiseurs concurrents]].
5. **L'honnêteté comme argument** : dire que la distance au serveur ne se corrige pas.
6. **« Ce qu'il reste à brancher »** : `CONFIG.discord`, `CONFIG.prix`, `CONFIG.avis`, `CONFIG.chiffres`, et un outil d'analyse léger (Plausible ou Umami).

## Ce qui est périmé (comparé au code du 10/11)
- `CONFIG.prix`, `CONFIG.avis` et `CONFIG.chiffres` n'existent pas dans [[page.html]] : les prix sont `priceMonth`, `priceYear`, `priceLifetime` (et lus sur `/api/v1/plans`), les avis viennent du serveur ([[reviews.html]]), il n'y a pas de compteur de membres. `CONFIG.discord` est rempli.
- Le texte du bouton cité (« Obtenir Rago Premium ») et la promesse « mises à jour chaque semaine » ne sont plus utilisés ; [[Voix et ton]] interdit de promettre un rythme de mises à jour.
- L'outil d'analyse n'a jamais été ajouté, et la politique de confidentialité dit « We don't use advertising or analytics cookies, and the site loads no third-party fonts or trackers » ([[make_legal.py]]) : en ajouter un demanderait de changer cette page.
- La comparaison avec le remboursement d'ExitLag ne vaut plus pour Rago : depuis le 10/11, pas de remboursement, l'essai de 3 jours (avec carte) le remplace ([[Offres et prix]]).

## Liens avec le reste
- Étude plus récente et plus complète sur le même sujet : [[Étude - Convertir honnêtement]] (novembre 2026).
- Le site actuel : [[page.html]], [[Site]].

## À savoir
Document historique : il n'est lu par aucun outil. On peut le garder comme trace des choix du 04/10 ou le supprimer (À VÉRIFIER avec Sofiene, il n'est référencé nulle part).
