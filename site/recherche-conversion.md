# Rago Optimizer : ce qui fait convertir un site de vente

Synthèse de recherche (4 octobre 2026) et ce qu'on en a tiré pour le site. Chaque règle renvoie à sa source.

## 1. La vitesse est le premier levier
- Une amélioration de 0,1 s du temps de chargement a augmenté les conversions de 8,4 % en retail et les formulaires envoyés de 21,6 % en génération de leads (étude Google/Deloitte, 37 marques, 30 M de sessions). [web.dev, Milliseconds make millions](https://web.dev/case-studies/milliseconds-make-millions)
- **Appliqué :** une seule page HTML, aucun framework, aucune image lourde (logo en SVG inline, animation en canvas), polices limitées à 3 familles avec `display=swap`.

## 2. Une seule action, répétée
- Les pages avec un seul lien convertissent à 13,5 % contre 10,5 % pour celles qui en ont 5 ou plus ; retirer la navigation externe a fait gagner jusqu'à 28 % sur des pages de milieu de tunnel (VWO / HubSpot, cité par ClickMinded). [ClickMinded, Landing page statistics 2026](https://www.clickminded.com/landing-page-statistics/)
- Médiane toutes industries : 6,6 % de conversion (Unbounce, 41 000 pages). Même source.
- **Appliqué :** un seul appel à l'action, « Obtenir Rago Premium », présent dans le hero, les tarifs, la fin de page et une barre fixe sur mobile. Pas de liens sortants hors Discord.

## 3. Rassurer au moment où on paie
- Un prix seul force un jugement sur le prix. Ajouter un titre orienté bénéfice et un avis client nommé juste au-dessus des tarifs a donné +8 % de conversions. [Conversion Rate Experts](https://conversion-rate-experts.com/pricing-page-doubt-win-report/)
- Une garantie n'agit qu'au moment de l'engagement et seulement si on la voit : +10 % sur desktop, presque rien sur mobile où elle était hors écran. [Atticus Li, risk reversal](https://atticusli.com/blog/posts/the-guarantee-nobody-saw-risk-reversal-psychology-and-the-commitment-gap/)
- **Appliqué :** la carte Premium porte sa propre réassurance (point de restauration, retour arrière en un clic, mises à jour chaque semaine), directement sous le bouton, visible sur mobile.

## 4. Ce que font les leaders du secteur
- **Hone** (2,5 M+ joueurs) : promesse en 5 mots (« Boost FPS. Reduce Latency. »), offre gratuite limitée puis Premium, avis de joueurs pros, logos des jeux supportés, et une FAQ qui traite la sécurité, la réversibilité et les limites sur le ping. [hone.gg](https://hone.gg/)
- **ExitLag** : essai de 3 jours sans carte, remboursement sous 7 jours, compteurs d'utilisateurs, FAQ « risque de ban ». [exitlag.com](https://www.exitlag.com/)
- **Appliqué :** structure gratuit → Premium (vous avez déjà des outils gratuits), FAQ centrée sur sécurité / ban / ping, liste des jeux couverts.

## 5. L'honnêteté comme argument
Votre propre programme dit que la distance au serveur ne se corrige pas. Hone le dit aussi dans sa FAQ. Le site le reprend : ça coupe court au « ça marche pas » et rend le reste crédible.

## Ce qu'il reste à brancher (décisions de votre côté)
1. **Lien d'invitation Discord** : une seule constante `CONFIG.discord` dans la page.
2. **Prix Premium** : `CONFIG.prix`. Sans prix, la carte affiche « Prix sur le Discord », ce qui convertit moins.
3. **Avis réels** : `CONFIG.avis` (pseudo, texte, rang ou mode de jeu). Vide, la section renvoie au salon feedback. Jamais d'avis inventés.
4. **Chiffres réels** : nombre de membres / d'acheteurs dans `CONFIG.chiffres`, affichés seulement s'ils sont remplis.
5. **Mesure** : une fois en ligne, ajouter un outil d'analyse léger (Plausible ou Umami) et suivre le taux de clic sur le bouton principal pour tester les titres un par un.
