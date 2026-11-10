---
type: code
tags: [code, app, catalogue, générateur, python]
fichier: app/tools/build_catalog.py
lignes: 301
maj: 2026-11-10
---
# build_catalog.py

L'ancien générateur du catalogue (époque v5.2) : il tire les 189 réglages de [[meta.py]] du `.bat` Premium v5.2 et écrit un premier `catalog.json`, `scripts.json` et la section v5.2 de `CORRECTIONS.md`. Aujourd'hui il ne sert plus que de **première étape** de [[build_catalog_v6.py]]. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Créé le 07/10 (commit `6c2bcad`), dernier changement le 16/10 (`995b238`, passage des sections manuelles de `CORRECTIONS.md` à [[corrections_md.py]]).

## Rôle et place dans l'ensemble
- **Ne pas le lancer seul pour fabriquer l'app** : ses sorties sont incomplètes (catalogue en `version: 1`, sans les réglages v6, sans relevés ni annulations). `npm run catalog` lance [[build_catalog_v6.py]], qui l'exécute en sous-processus (`python3 tools/build_catalog.py`, `check=True`), relit ce qu'il vient d'écrire, puis réécrit tout.
- Il fait le lien entre les métadonnées de [[meta.py]] (noms, textes, risques, `label@ligne`) et le texte des scripts, extrait par `LegacyBat` de [[extract_bat.py]].
- Le docstring en tête dit encore `python3 tools/build_catalog.py` comme commande et décrit ses sorties comme finales : c'était vrai avant le 06/10 (catalogue v6). Le commentaire d'en-tête de [[catalog.rs]] cite aussi encore ce fichier comme générateur (petit retard de commentaire, sans effet).

## Ce que le fichier expose
Pas de fonction `main` : **tout le code tourne au niveau du module** (l'importer lancerait la génération). Constantes et fonctions :

| Nom | Rôle |
|---|---|
| `HERE`, `ROOT` | `app/tools/` et `app/` |
| `BAT` | `app/legacy/Premium v5.2 - Rago Hub.bat` |
| `bat` | l'objet `LegacyBat(BAT)` chargé une fois |
| `TEMP_CLEAN` | script écrit à la main pour `cln_temp` (source spéciale `Performance@13768:temp`) : vide `C:\Windows\Temp` puis `%LOCALAPPDATA%\Temp` avec `set folder=` + `cd /d` + boucle `rmdir`/`del` (réécrit ensuite par [[paths.py]]) |
| `PATCHES` | corrections ciblées par `id` ou `id:variante` → liste `(avant, après)` ; `après = None` supprime la ligne. Une seule entrée : `exp_mitigations:on` (voir plus bas) |
| `rbw_script(base)` | remplace le service `CDPUserSvc_5d3cf` (suffixe propre au PC de l'auteur) par une boucle `for /f` sur `sc query state= all` qui retrouve le vrai nom `CDPUserSvc_xxxx` ; garde `start= auto`, `start= demand` ou `start` |
| `EDGE_FIX` | désinstallation de Edge réécrite : `taskkill /f /im msedge.exe`, puis boucle sur `%ProgramFiles(x86)%\Microsoft\Edge\Application\*` qui lance `Installer\setup.exe --uninstall --system-level --verbose-logging --force-uninstall` (le `.bat` visait la version figée 125.0.2535.79) |
| `paren_delta(line)` | variation de profondeur de parenthèses d'une ligne, en ignorant `echo`, `rem`, `::`, le texte entre guillemets et les `^(` échappés |
| `tidy(script)` | retire les `)` orphelines laissées par le découpage, et coupe le code mort après le premier `exit /b` de premier niveau (seulement si le script n'a ni `goto` ni `call :`) |
| `SAFETY_DROPS` | lignes retirées pour la sécurité du joueur (audit du 05/10) |
| `harden(script, tid)` | `HKU\!USER_SID!\` → `HKCU\` (la variable n'était définie nulle part ; le moteur tourne sous le compte du joueur), puis applique `SAFETY_DROPS` |
| `resolve_src(src, tid, vid)` | `_resolve_src` puis `tidy` puis `harden` |
| `_resolve_src(src, tid, vid)` | transforme une source `label@ligne` en texte de script (cas particuliers ci-dessous) |
| `requirements(script)` | déduit les besoins : `wmic` si le script contient `wmic` ; `res:smartctl.exe`, `res:LowLatency.pow`, `res:nvidiaProfileInspector.exe` selon les fichiers de ressources cités |
| `optifine_preset(name, line)` | lit, sous le label, les lignes `echo <clé>:<valeur> >> optionsof.txt` et rend un dictionnaire clé → valeur |

## Fonctionnement détaillé

### Cas particuliers de `_resolve_src`
- `None` → pas de script (réglage natif, comme `nv_profile`).
- `Performance@13768:temp` → `TEMP_CLEAN`.
- `lwpc1`, `ltpc1`, `ggpc1`, `mdpc1` (les 4 variantes de `hitreg_suite`) : le script commence par les commandes du label `BASE` (l. 13026) qui précèdent son menu (`collect_until_menu`, réglages de la carte réseau), puis le label du type de PC. Dans le `.bat`, les choix 3 et 4 (« PC modeste », « PC portable ») renvoyaient vers les choix 1 et 2 ; ici chacun est branché sur son vrai label (`lwpc1@13118`, `ltpc1@13123`).
- `d8` (`dbl_edge`) : lignes `taskkill`, `cd ` et `setup.exe` retirées, `EDGE_FIX` mis devant.
- `On`, `off` (`rbw_mode`) : `rbw_script`. Ces deux scripts sont de toute façon remplacés en entier plus tard par [[rbw.py]].
- `DISABLE8` (`game_mode:off`) : ajoute à la fin `echo - Turning printing back on`, `sc config Spooler start= auto`, `net start Spooler` (le mode jeu coupait le spouleur d'impression sans jamais le relancer).
- `nv3` → `NPI_CALL`. **Branche morte** : plus aucun réglage de [[meta.py]] ne pointe vers `nv3` (`nv_profile` est natif, `src = None`).
- Puis `PATCHES` de la clé `id:variante` ou `id` ; chaque « avant » doit être trouvé (`assert`).

### `PATCHES['exp_mitigations:on']`
Le « revert » des atténuations du `.bat` remettait `DisableExceptionChainValidation` à `1` et `MoveImages` à `0`, laissant **SEHOP et l'ASLR désactivés**. Corrigé : `DisableExceptionChainValidation` à `0`, et `MoveImages` supprimé (`Reg.exe delete … /v "MoveImages" /f`) au lieu d'être écrit.

### `SAFETY_DROPS` (audit du 05/10, fichier `audit/avis-tweaks.md` hors dépôt)
| Réglages | Motif retiré | Raison |
|---|---|---|
| `dbl_edge` | `Microsoft\EdgeWebView`, `EdgeUpdate`, `EdgeCore`, `Temp` | WebView2 fait tourner l'app elle-même ; Edge Update le tient à jour |
| `mem_profile`, `mem_registry`, `hitreg_suite` | `FeatureSettingsOverride` | coupait Spectre/Meltdown sans le dire, sous une étiquette « Safe » |
| `game_mode` | `\Prefetch\` | vider le Prefetch ressemble à des traces effacées lors d'un screenshare ([[RBW Mod]]) |
| `win_background`, `hitreg_suite` | `Services\bam"` | couper BAM, même raison |

### Boucle principale (niveau module)
Pour chaque module, section et réglage de `MODULES` ([[meta.py]]) :
1. `{ref: id}` recopié tel quel (renvoi vers un réglage d'un autre module).
2. Un id ne peut apparaître qu'une fois (`assert`).
3. L'entrée reprend tous les champs de `T()` sauf `src` et les valeurs `None`.
4. Avec variantes : un script par variante (`scripts[id][variante]`), `variants` sans `src`. Sans variantes : `scripts[id] = {'_': script}` (la clé `_` veut dire « pas de variante » partout dans la chaîne, jusqu'au moteur Rust).
5. `mc_optifine` reçoit `optifine: {performance, quality}` lu dans les labels `Performance@13768` et `Quality@13875` (les options écrites dans `optionsof.txt` ; l'app les applique en natif, voir [[Tweaks Minecraft]]).
6. `native == 'nvidia_profile'` ajoute `res:nvidiaProfileInspector.exe` aux besoins.
7. `requires` = besoins écrits dans [[meta.py]] + `requirements()` de chaque script, triés ; `legacy` = les sources `label@ligne` ; `lines` = nombre total de lignes des scripts du réglage.
Ensuite : chaque `ref` et chaque réglage de preset (`id` ou `id:variante`) doit exister.

### Écritures
- `app/src/data/catalog.json` : `{"version": 1, "modules", "presets"}`, `indent=1`, UTF-8 sans échappement.
- `app/src-tauri/scripts/scripts.json` : `{id: {variante|_: texte}}`, `indent=1`, fins de ligne LF.
- `app/docs/CORRECTIONS.md` : la section « Corrections apportées au .bat Premium v5.2 » (chiffres calculés, tableau des 4 familles de corrections, corrections ciblées, éléments retirés, détail ligne par ligne `- L<n>: avant → après`), suivie des sections écrites à la main relues par [[corrections_md.py]] (`CM.parts()` puis `CM.write`).
- Console : `189 réglages, 231 scripts, 6908 lignes, 176 lignes corrigées` (chiffres du 10/11).

Les 176 corrections se répartissent ainsi dans le tableau généré : 152 « Disable/Enable », 14 `DevicePriority`, 3 boucles `for`, 5 chemins ; les 2 restantes (binaire `90 00 00 00` et guillemets « Ethernet ») ne sont que dans le détail ligne par ligne.

## Données touchées
Lit le `.bat` v5.2 et [[meta.py]]. Écrit les trois fichiers ci-dessus (créant `src/data`, `src-tauri/scripts`, `docs` au besoin). Ces écritures sont **provisoires** quand il est lancé par [[build_catalog_v6.py]] : celui-ci les réécrit juste après.

## Erreurs et cas limites
- Tout écart arrête le script par `assert` (label à la mauvaise ligne, id en double, `PATCHES` introuvable, `ref` ou preset vers un id inconnu).
- Lancé seul, il **écrase** `catalog.json` et `scripts.json` avec une version incomplète : l'app n'aurait plus les réglages v6. Il faut alors relancer `npm run catalog`.

## Liens avec le reste
- Importe [[extract_bat.py]], [[meta.py]], [[corrections_md.py]].
- Lancé par [[build_catalog_v6.py]] ; ses `PRESETS` `laptop` et `privacy` y survivent (les deux autres, `mc_pvp` et `esport`, sont remplacés par les presets v6, voir [[Presets]]).
- Les textes de scripts qu'il produit sont les « scripts de l'ancien programme » (LF) de [[Scripts embarqués (JSON)]].
- La section v5.2 de [[CORRECTIONS.md (app)]] vient d'ici.

## Tests
Pas de test propre. Les `assert` du module et les tests Rust de [[catalog.rs]] sur le résultat final.

## À savoir avant de modifier
- Les numéros de lignes de [[meta.py]] et ceux codés ici (`BASE@13026`, `Performance@13768`, `Quality@13875`) dépendent du `.bat` : ne jamais le reformater.
- Une nouvelle correction ciblée ici (dans `PATCHES` ou `SAFETY_DROPS`) agit **avant** la copie d'avant audit de [[build_catalog_v6.py]] : l'ancienne ligne disparaît aussi de l'annulation. Pour une ligne déjà distribuée, préférer [[optis_120.py]] ou [[safety.py]].
- Le texte des « Corrections ciblées » et « Retirés de l'app » est écrit en dur dans la chaîne du rapport : il ne se met pas à jour seul.
