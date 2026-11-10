---
type: code
tags: [code, serveur, css, admin, vault]
fichier: licensing/public/cerveau.css
lignes: 316
maj: 2026-11-10
---
# cerveau.css

Les styles du [[Cerveau du vault]] : mise en page plein écran, colonne de l'explorateur, barres sur le graphe, lecteur, palette de recherche, version téléphone. Fiche parente : [[Code du serveur]]. Page : [[brain-views.js]] ; comportement : [[cerveau.js]]. Les autres styles du serveur sont décrits dans [[Styles du serveur (CSS)]].

(code de la PR #85 du Cerveau, dans `staging` depuis le 10/11 et en prod depuis la PR #87 du 10/11)

## Fonctionnement détaillé
- **Jetons** : utilise ceux de `/assets/tokens.css` (couleurs `--rg-*`, polices Geist, rayons, ombres) et définit les siens sur `.cv` : fonds `--bg` `#070708`, surfaces, lignes, textes `--t1` à `--t3`, `--sw: 288px` (largeur de l'explorateur), `--rw: min(620px, 46vw)` (largeur du lecteur, remplacée par la largeur choisie à la souris), courbe `--ease`.
- **Mise en page** : `.cv-app` en flex sur toute la fenêtre ; `.cv-side` (explorateur) ; `.cv-stage` (le `canvas` en plein) ; `.cv-reader` posé par-dessus la droite de la scène (`.wide` = toute la largeur) ; quand le lecteur est ouvert (`.cv-app.reading`), la barre de droite du graphe glisse à sa gauche et seuls le premier chiffre reste dans la barre de gauche.
- **Explorateur** : lignes d'arbre `.cv-row` avec pastille `--c`, chevrons, compteurs ; interrupteurs `.cv-switch` et curseurs `.cv-range` du panneau Affichage ; grille de chiffres `.cv-statgrid` ; liste des liens cassés.
- **Graphe** : barres `.cv-hud` (boutons ronds translucides), puces de chiffres (`.cv-chip`, jaune pour les liens cassés), info-bulle `.cv-tip`, écran de chargement avec le logo qui pulse, aide en bas qui disparaît après 6 s.
- **Lecteur** : `.cv-doc` (780 px de large au plus, 14,5 px, interligne 1,68 ; les mots longs ne cassent qu'en dernier recours) ; titres, liens de notes `a.wl` (rouge Rago), liens cassés en pointillé, liens externes en bleu, code en ligne, code cliquable `code.cf`, tableaux dans un cadre qui défile en largeur avec en-tête collant, encadrés Obsidian par type, cases à cocher, sommaire repliable, blocs « Mentionnée dans » ; lecteur de fichiers `.cv-code` avec numéros de ligne par compteur CSS (non sélectionnables) et couleurs `.tk-c` (commentaire), `.tk-s` (chaîne), `.tk-n` (nombre), `.tk-k` (mot-clé), `.tk-f` (appel), `.tk-t` (type), `.tk-p`, `.tk-v`.
- **Palette** : fenêtre centrée avec flou, résultats groupés, texte trouvé surligné.
- **Téléphone et écrans étroits (≤ 900 px)** : explorateur en tiroir avec voile, lecteur plein écran, pas de poignée ni de mode grand, un seul chiffre. Écran tactile (`hover: none`) : pas d'indications clavier. « Réduire les animations » : animations et transitions coupées.

## À savoir avant de modifier
- Changer `ASSETS` dans [[brain-views.js]] après chaque modification.
- Pas de style en ligne possible (CSP de l'admin) : tout passe par des classes et des variables CSS.
