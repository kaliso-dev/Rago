---
type: code
tags: [code, site, javascript, playwright]
fichier: site/tools/prerender.js
lignes: 21
maj: 2026-11-10
---
# prerender.js

Petit script Node qui ouvre `site/index.html` dans un Chromium sans écran et renvoie le HTML que le JavaScript de l'accueil écrit dans ses blocs vides, pour que [[build.py]] le grave dans la page. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11).

## Rôle et place dans l'ensemble
L'accueil ([[page.html]]) remplit plusieurs zones par JavaScript : l'aperçu de l'app dans le héros, la bande des jeux, l'explorateur des sections et le tableau de comparaison. Sans pré-rendu, un visiteur sans JavaScript (ou un robot d'indexation qui n'exécute pas le JavaScript) verrait des cadres vides. Ce script produit ce contenu une fois, au moment de la construction ; le JavaScript de la page réécrit ensuite les mêmes blocs au chargement, donc le contenu pré-rendu n'est qu'un état de départ.

## Ce que le fichier expose
- Usage : `node prerender.js chemin/vers/index.html`. [[build.py]] l'appelle avec `site/index.html` juste après l'avoir écrit.
- Sortie standard : un objet JSON `{ id: innerHTML }` pour les 7 identifiants de `IDS`.
- Code de sortie `1` (avec le message de l'erreur sur la sortie d'erreur) si quoi que ce soit échoue.

Les 7 blocs (`IDS`) et ce qu'ils contiennent dans [[page.html]] :

| id | Élément | Contenu rempli par le JavaScript |
|---|---|---|
| `side` | `<nav class="side">` de l'aperçu de l'app | la barre latérale avec les sections de l'app |
| `tl1` | `<div class="tlist">` | les lignes du groupe « Mouse and keyboard » (7) de la section Latency de l'aperçu |
| `tl2` | `<div class="tlist">` | les lignes du groupe « Power » (20) |
| `mq` | `<div class="mq-track">` | la bande défilante des modes et jeux couverts |
| `cmp` | `<tbody>` | les lignes du tableau de comparaison Free / Premium |
| `xtabs` | `<div class="xp-tabs" role="tablist">` | les onglets de l'explorateur « Nearly 220 tweaks. One clear app. » |
| `xpanel` | `<div class="xp-panel" role="tabpanel">` | le panneau de l'onglet actif (Latency) |

## Fonctionnement détaillé
1. `chromium.launch()` (paquet `playwright`, résolu par `require("playwright")` : en CI grâce à `NODE_PATH`, voir [[site-check.yml]]).
2. Nouvelle page de **1440 × 900** avec `reducedMotion: "reduce"` (les animations de la page sont coupées, le contenu est stable).
3. `p.route(/^https?:/, r => r.abort())` : **toute** requête réseau est bloquée. Seul le fichier local est lu ; les appels au serveur de comptes (`/api/v1/plans`, `/promo`, `/reviews`) échouent donc, ce qui est voulu : les avis et les prix venant du serveur ne sont jamais gravés.
4. `goto("file://" + chemin absolu)`, puis attente fixe de **300 ms** pour laisser le JavaScript remplir les blocs.
5. Pour chaque id : copie profonde de l'élément ; dans la copie, les lignes de tweak `.tw` perdent `role`, `aria-checked` et `tabindex` (sans JavaScript elles ne peuvent pas être basculées, il ne faut donc pas les annoncer comme interrupteurs aux lecteurs d'écran).
6. Fermeture du navigateur et écriture du JSON.

[[build.py]] insère ensuite chaque valeur dans l'élément vide correspondant (`<x … id="…"></x>`, une seule occurrence exigée) et ajoute `aria-labelledby="xt1"` au panneau.

## Données touchées
Lit le fichier HTML donné. N'écrit rien sur disque. Aucun accès réseau.

## Erreurs et cas limites
- Sans le paquet `playwright` ou sans Chromium installé : erreur, code 1 ; [[build.py]] affiche alors `warning: no-JS sections not baked (node + playwright needed)` et la CI [[site-check.yml]] échoue volontairement.
- Si un des 7 éléments n'existe plus dans la page, `document.getElementById(i)` vaut `null` et le script plante : il faut mettre à jour `IDS` en même temps que la page.
- Si le JavaScript de la page met plus de 300 ms à remplir un bloc, le contenu gravé serait incomplet (pas observé à ce jour).

## Liens avec le reste
- Appelé par [[build.py]] uniquement.
- Lit la page produite à partir de [[page.html]].
- Version de Playwright fixée par la CI [[site-check.yml]] (`1.56.1`) ; l'outil [[export-logo.js]] de la marque utilise lui aussi Playwright.
- Explications sur la mise en place locale : [[Développer et tester]].

## À savoir avant de modifier
- La taille de fenêtre compte : certaines parties de la page s'adaptent à la largeur. Changer 1440 × 900 change le HTML gravé, donc toutes les pages commitées devront être reconstruites.
- Garder le blocage réseau : sans lui, le pré-rendu dépendrait de l'état du serveur de comptes et ne serait plus reproductible (la CI compare au caractère près).
