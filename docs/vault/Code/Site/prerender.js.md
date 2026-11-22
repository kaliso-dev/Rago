---
type: code
tags: [code, site, javascript, playwright]
fichier: site/tools/prerender.js
lignes: 19
maj: 2026-11-22
---
# prerender.js

Petit script Node qui ouvre `site/index.html` dans un Chromium sans écran et renvoie le HTML que le JavaScript de l'accueil écrit dans ses blocs vides, pour que [[build.py]] le grave dans la page. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]].

Tout ce qui suit est CONFIRMÉ (branche du site v5, PR #109, 22/11).

## Rôle et place dans l'ensemble
L'accueil ([[page.html]]) remplit le tableau de comparaison Free / Premium par JavaScript. Sans pré-rendu, un visiteur sans JavaScript (ou un robot d'indexation qui ne l'exécute pas) verrait un tableau vide. Depuis le design v5 (22/11), c'est le **seul** bloc pré-rendu : l'aperçu de l'app, la bande défilante et l'explorateur des sections de l'ancienne page n'existent plus (les dix sections sont écrites dans le HTML par [[sync_app.py]]).

## Ce que le fichier expose
- Usage : `node prerender.js chemin/vers/index.html`. [[build.py]] l'appelle avec `site/index.html` juste après l'avoir écrit.
- `IDS = ["cmp"]` : le `<tbody>` du tableau `#cmp`.
- Sortie standard : un objet JSON `{ cmp: innerHTML }`. Code de sortie `1` (message sur la sortie d'erreur) si quoi que ce soit échoue.

## Fonctionnement détaillé
1. `chromium.launch()` (paquet `playwright`, résolu par `require("playwright")` : en CI grâce à `NODE_PATH`, voir [[site-check.yml]]).
2. Page de **1440 × 900** avec `reducedMotion: "reduce"`.
3. `p.route(/^https?:/, r => r.abort())` : toute requête réseau est bloquée (les appels au serveur de comptes échouent, c'est voulu : le résultat ne dépend que du fichier).
4. `goto("file://" + chemin absolu)`, attente fixe de **300 ms**.
5. Copie de chaque élément de `IDS` et lecture de son `innerHTML`, puis fermeture du navigateur.

[[build.py]] insère ensuite la valeur dans l'élément vide correspondant (`<x … id="cmp"></x>`, une seule occurrence exigée).

## Données touchées
Lit le fichier HTML donné. N'écrit rien sur disque. Aucun accès réseau.

## Erreurs et cas limites
- Sans le paquet `playwright` ou sans Chromium installé : erreur, code 1 ; [[build.py]] affiche alors `warning: no-JS sections not baked (node + playwright needed)` et la CI [[site-check.yml]] échoue volontairement.
- Si un élément de `IDS` n'existe plus dans la page, `document.getElementById(i)` vaut `null` et le script plante : il faut mettre à jour `IDS` en même temps que la page.
- Si le JavaScript de la page met plus de 300 ms à remplir un bloc, le contenu gravé serait incomplet (pas observé à ce jour).

## Liens avec le reste
- Appelé par [[build.py]] uniquement.
- Lit la page produite à partir de [[page.html]].
- Version de Playwright fixée par la CI [[site-check.yml]] (`1.56.1`).
- Explications sur la mise en place locale : [[Développer et tester]].

## À savoir avant de modifier
- La taille de fenêtre compte : certaines parties de la page s'adaptent à la largeur. Changer 1440 × 900 change le HTML gravé, donc toutes les pages commitées devront être reconstruites.
- Garder le blocage réseau : sans lui, le pré-rendu dépendrait de l'état du serveur de comptes et ne serait plus reproductible (la CI compare au caractère près).
