---
type: code
tags: [code, site, python, catalogue]
fichier: site/tools/sync_app.py
lignes: 60
maj: 2026-11-23
---
# sync_app.py

Recopie dans l'accueil du site ([[page.html]]) ce que dit l'app : textes et compteurs des sections, exemples de tweaks de l'aperçu, nombre total de tweaks et nombre de tweaks gratuits ; puis lance [[sync_tweaks.py]] pour la page Tweaks. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (branche du site v5, PR #109, 22/11 ; script réécrit pour la nouvelle page d'accueil). Commande : `python3 site/tools/sync_app.py`, puis `python3 site/tools/build.py`, puis commiter `site/src/page.html`, `site/src/tweaks.html` et les pages générées.

## Rôle et place dans l'ensemble
- **Les vérités sont dans l'app** : [[catalog.json]] (la liste des tweaks, noms et taglines des sections) et [[free.json]] (le plan gratuit). Ce script n'invente aucun texte : il les recopie dans la source de l'accueil.
- À lancer chaque fois que le catalogue de l'app change (ajout, retrait, renommage, description, plan gratuit). La CI [[site-check.yml]] ne le lance **pas** : si on l'oublie, le site reste en retard sans erreur. Le 10/11, une exécution dans une copie du dépôt ne change rien : la source est à jour.
- Ordre : `sync_app.py` (qui finit par [[sync_tweaks.py]]) → [[build.py]].

## Ce que le fichier expose
- `APP` : le premier dossier qui contient `data/catalog.json` parmi `app/src` (dépôt) et `app/rago-hub/src` (ancien dossier de projet).
- `T` : tous les tweaks du catalogue sauf les renvois (`ref`), par id ; `MOD` : les modules ; `SEC` : les sections.
- `count(mid)` : nombre de tweaks d'un module avec `kind == "tweak"` (comme le compteur de l'app).
- `sec_name(sec)` : nom anglais d'une partie d'un module ; `tally(mid)` : le compte affiché sur la carte.
- `ICON` : l'icône v5 de chaque module (gpu → `graphics`, gamemode → `games`, les autres gardent leur nom ; `settings` par défaut).

## Fonctionnement détaillé (dans l'ordre du fichier)
1. **Les dix sections** de l'app sur l'accueil (Site v6, 23/11) : tout ce qui est entre `<!-- mods -->` et `<!-- /mods -->` est remplacé par une carte `<article class="x-cap">` par module, dans l'ordre de l'app : numéro (01 à 10), nom anglais (`name.en`), tagline anglaise (`tagline.en`), le nom de chacune de ses parties (`sections[].name.en`, en étiquettes), l'icône (`ICON`), le nombre de tweaks (`count`, « 1 tweak » au singulier ; Restore, qui n'en a aucun, affiche « Undo every tweak ») et, depuis le 24/11, un bloc `.x-cap-x` qui remplit la carte : combien de ses tweaks sont ouverts en gratuit (croisement avec [[free.json]], « All of them with Premium. » quand aucun) puis ses huit premiers noms de tweaks en colonnes. Restore, sans tweak, n'a pas ce bloc. Les cartes s'empilent au défilement ([[page.html]]).
2. **Total** : `total = nombre de valeurs distinctes de (twin ou id)` sur `T` (jumeaux comptés une fois, actions uniques comptées), comme `totalTweaks` de [[catalog.ts]]. Aujourd'hui **218**.
3. **Titre arrondi** : si le total est 1 à 3 sous une dizaine, « Nearly 220 tweaks », sinon le nombre exact (règle décidée avec Sofiene le 09/10). Écrit dans `<h2 class="s-h2" id="feat-h">` et dans la description « … tweaks, free to start ».
4. **Compteurs exacts** : classes `n-all` (`<span>` et `<b>`), chiffre « 218 tweaks » du bandeau du héros (`<span>N tweaks</span>`), « All N » et « unlocks all N » (tableau, lien vers la page Tweaks, étape « Sign in and unlock », FAQ).
5. **Plan gratuit** : `n_free = len(free.json["tweaks"])`, aujourd'hui **73** (comme `FREE.size` de [[store.tsx]]). Écrit dans « 73 of 218 » (`<span class="txt">`), les classes `n-free`, « Free opens 73 tweaks » (FAQ) et la largeur de la barre `#free-bar` (`100 × 73 / 218` = 33,5 %).
6. Écrit `site/src/page.html` et affiche `sections [...] total 218 free 73 heading Nearly 220 tweaks`.
7. Lance [[sync_tweaks.py]] avec `runpy.run_path` (même processus).

Depuis le 22/11, le script ne touche plus `i18n.ts` : l'accueil v5 n'a plus de fausse fenêtre de l'app (constantes `EX` et `MODS`, groupes « Mouse and keyboard » et « Power », phrase de redémarrage).

## Données touchées
- Lit : `app/src/data/catalog.json`, `app/src/data/free.json`, `site/src/page.html`.
- Écrit : `site/src/page.html` ; puis, par [[sync_tweaks.py]], `site/src/tweaks.html`.

## Erreurs et cas limites
- Aucun `assert` : si un motif n'est plus trouvé dans la page (texte modifié à la main), le remplacement ne se fait simplement pas, **sans message**. Après toute retouche des textes de l'accueil, relire la sortie et le diff.
- `next(...)` sur `APP` lève `StopIteration` si l'app n'est pas trouvée (dépôt incomplet).
- Les marqueurs `<!-- mods -->` et `<!-- /mods -->` sont obligatoires (`ValueError` de `index` sinon).

## Liens avec le reste
- Lit les données de l'app : [[catalog.json]], [[free.json]] ; reproduit les calculs de [[catalog.ts]] et [[store.tsx]].
- Écrit dans [[page.html]] ; appelle [[sync_tweaks.py]] ; suivi de [[build.py]].
- Les notes du vault sur les tweaks ont leur propre générateur (`docs/tools/catalogue_vault.py`, voir [[Catalogue des tweaks]]) : les deux sont à lancer quand le catalogue change.

## À savoir avant de modifier
- **Deux façons de compter les tweaks gratuits coexistent** : ce script écrit **73** sur l'accueil (taille brute de `free.json`, avec les variantes « revert » et les outils de Restaurer), alors que [[sync_tweaks.py]] écrit **68** sur la page Tweaks (tweaks distincts, jumeaux réunis). Les deux chiffres sont visibles sur le site le même jour. À VÉRIFIER avec Sofiene : lequel doit être affiché.
- Le compteur des modules (`count`) ignore les actions uniques ; le total les compte. C'est voulu (même logique que l'app).
- La règle « Nearly » ne s'applique qu'au titre et à la description ; les compteurs restent exacts.
