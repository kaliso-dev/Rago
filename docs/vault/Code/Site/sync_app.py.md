---
type: code
tags: [code, site, python, catalogue]
fichier: site/tools/sync_app.py
lignes: 71
maj: 2026-11-10
---
# sync_app.py

Recopie dans l'accueil du site ([[page.html]]) ce que dit l'app : textes et compteurs des sections, exemples de tweaks de l'aperçu, nombre total de tweaks et nombre de tweaks gratuits ; puis lance [[sync_tweaks.py]] pour la page Tweaks. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Commande : `python3 site/tools/sync_app.py`, puis `python3 site/tools/build.py`, puis commiter `site/src/page.html`, `site/src/tweaks.html` et les pages générées.

## Rôle et place dans l'ensemble
- **Les vérités sont dans l'app** : [[catalog.json]] (la liste des tweaks), [[free.json]] (le plan gratuit) et [[i18n.ts]] (les phrases). Ce script n'invente aucun texte : il les recopie dans la source de l'accueil.
- À lancer chaque fois que le catalogue de l'app change (ajout, retrait, renommage, description, plan gratuit). La CI [[site-check.yml]] ne le lance **pas** : si on l'oublie, le site reste en retard sans erreur. Le 10/11, une exécution dans une copie du dépôt ne change rien : la source est à jour.
- Ordre : `sync_app.py` (qui finit par [[sync_tweaks.py]]) → [[build.py]].

## Ce que le fichier expose
- `APP` : le premier dossier qui contient `data/catalog.json` parmi `app/src` (dépôt GitHub) et `app/rago-hub/src` (ancien dossier de projet). Dans le dépôt, c'est `app/src`.
- `SESSION = {"game_mode", "rbw_mode", "win_gamemode"}` : les interrupteurs « de session » de l'app (copie de `SESSION_TOGGLES` de [[store.tsx]]).
- `T` : tous les tweaks du catalogue sauf les renvois (`ref`), par id ; `MOD` : les modules ; `SEC` : les sections par `(module, section)`.
- `flags(t)` : chaîne de drapeaux pour l'aperçu : `a` = `risk == "advanced"`, `r` = redémarrage requis, `x` = `kind == "action"` (action unique), `s` = interrupteur de session.
- `PICK` : les tweaks montrés en exemple dans l'explorateur de l'accueil, par module :

| Module | Ids montrés |
|---|---|
| `network` | `ping_hitreg`, `net_nagle`, `net_powersave`, `net_restart` |
| `latency` | `kbm_accel`, `cpu_parking`, `pri_mmcss` |
| `gpu` | `gpu_nvidia`, `amd_power`, `gpu_general` |
| `windows` | `win_gamemode`, `win_gamedvr`, `cln_temp` |
| `hitreg` | `in_mouse`, `in_queue`, `hitreg_suite` |
| `minecraft` | `mc_optifine`, `pri_game`, `net_profile`, `cln_temp` |
| `rbw` | `rbw_mode` |
| `gamemode` | `game_mode` |
| `expert` | `exp_io`, `exp_kernel`, `exp_startup` |
| `restore` | `rst_point`, `rst_open`, `rst_network`, `rst_queue` |

- `count(mid)` : nombre de tweaks d'un module avec `kind == "tweak"` (sans les actions ni les renvois), comme le compteur de l'app.
- `sec_count(sid)` : la même chose pour une section du module `latency`.

## Fonctionnement détaillé (dans l'ordre du fichier)
1. **Constante `EX`** : la ligne `  const EX = {…};` de [[page.html]] est remplacée par `{module: [[nom anglais, description anglaise, drapeaux], …]}` pour les ids de `PICK`. Si un id de `PICK` disparaît du catalogue, le script plante (`KeyError`) : il faut alors choisir un autre exemple.
2. **Lignes `MODS`** : dans `const MODS = [ … ];`, chaque ligne `["id","Nom","tagline",N]` reçoit la tagline anglaise du module et `count(id)`. Le nom affiché (2e champ) n'est pas touché. Valeurs du 10/11 : network 23, latency 82, gpu 29, windows 50, hitreg 9, minecraft 1, rbw 1, gamemode 1, expert 18, restore 0.
3. **Aperçu du héros** (section Latency de la fausse fenêtre de l'app) : nombres des groupes « Mouse and keyboard » (`sec_count('input')`, aujourd'hui **7**) et « Power » (`sec_count('power')`, aujourd'hui **20**) ; paragraphe `<p>Timers, priorities…</p>` remplacé par la tagline du module `latency` ; chaque appel `row("Nom","description",` reçoit la description anglaise du tweak qui porte ce nom.
4. **Phrase de fin d'application** : la clé `run.rebootNeeded` de la partie anglaise (`const en`) de [[i18n.ts]] remplace la phrase qui suit `<br>Restart…` dans l'animation de l'aperçu.
5. **Total** : `total = nombre de valeurs distinctes de (twin ou id)` sur `T`. Les jumeaux (même script sous deux noms ou dans deux modules, champ `twin`) comptent une fois ; les actions uniques comptent ; les renvois `ref` non. C'est le même calcul que `totalTweaks` de [[catalog.ts]]. Aujourd'hui : **218**.
6. **Titre arrondi** : `ten` = dizaine supérieure (220). Si `0 < ten − total ≤ 3`, le titre est « Nearly 220 tweaks », sinon le nombre exact. Règle décidée avec Sofiene le 09/10 (commentaire du code). Remplacements :
   - `<h2>… tweaks. One clear app.</h2>` ;
   - la description de la page « … tweaks, free to start » ;
   - « All N tweaks » et « unlocks all N » prennent toujours le **nombre exact** (218).
7. **Plan gratuit** : `n_free = len(free.json["tweaks"])`, aujourd'hui **73** (la liste brute de [[free.json]], outils de Restaurer compris, comme `FREE.size` de [[store.tsx]]). Remplacements : `<span class="txt">73 of 218</span>`, « 73 tweaks open, » / « 73 tweaks are open, », « Free opens 73 tweaks ».
8. **Compteur de l'aperçu** : `id="msel">0 of 82` (= `count('latency')`).
9. Écrit `site/src/page.html` (toujours, même sans changement) et affiche deux lignes de contrôle : `MODS [...]` puis `total 218 free 73 heading Nearly 220 tweaks reboot … power 20 input 7`.
10. Lance [[sync_tweaks.py]] avec `runpy.run_path` (même processus).

## Données touchées
- Lit : `app/src/data/catalog.json`, `app/src/data/free.json`, `app/src/lib/i18n.ts`, `site/src/page.html`.
- Écrit : `site/src/page.html` ; puis, par [[sync_tweaks.py]], `site/src/tweaks.html`.

## Erreurs et cas limites
- Aucun `assert` : si un motif n'est plus trouvé dans la page (texte modifié à la main), le remplacement ne se fait simplement pas, **sans message**. Après toute retouche des textes de l'accueil, relire la sortie et le diff.
- `next(...)` sur `APP` lève `StopIteration` si l'app n'est pas trouvée (dépôt incomplet).
- `hero_row` lève `StopIteration` si un nom de tweak écrit dans un `row("…")` de la page n'existe plus dans le catalogue.

## Liens avec le reste
- Lit les données de l'app : [[catalog.json]], [[free.json]], [[i18n.ts]] ; reproduit les calculs de [[catalog.ts]] et [[store.tsx]].
- Écrit dans [[page.html]] ; appelle [[sync_tweaks.py]] ; suivi de [[build.py]].
- Les notes du vault sur les tweaks ont leur propre générateur (`docs/tools/catalogue_vault.py`, voir [[Catalogue des tweaks]]) : les deux sont à lancer quand le catalogue change.

## À savoir avant de modifier
- **Deux façons de compter les tweaks gratuits coexistent** : ce script écrit **73** sur l'accueil (taille brute de `free.json`, avec les variantes « revert » et les outils de Restaurer), alors que [[sync_tweaks.py]] écrit **68** sur la page Tweaks (tweaks distincts, jumeaux réunis). Les deux chiffres sont visibles sur le site le même jour. À VÉRIFIER avec Sofiene : lequel doit être affiché.
- Le compteur des modules (`count`) ignore les actions uniques ; le total les compte. C'est voulu (même logique que l'app).
- La règle « Nearly » ne s'applique qu'au titre et à la description ; les compteurs restent exacts.
