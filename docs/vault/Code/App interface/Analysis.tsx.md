---
type: code
tags: [code, app, typescript, react, analyse]
fichier: app/src/pages/Analysis.tsx
lignes: 466
maj: 2026-11-25
---
# Analysis.tsx

La page **Analyse du PC** (« Analyze my PC », 1.3.0) : lance la mesure, montre les 6 étapes en direct, puis les points trouvés groupés, ce qui les règle et l'avant/après. Depuis la PR #128 (23/11), elle reprend à l'identique les maquettes v5 `app-analysis-start`, `-running`, `-results`, `-allfine` et `-after` ([[Maquettes v5 dans l'app (s5)]]). Toute la logique (mesures, normes, mémoire) est dans [[analysis.ts]]. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Analyse du PC]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, PR #128 fusionnée le 23/11).

## Ce que le fichier expose
- `Analysis()` : la page, rendue par [[App.tsx]] quand `page === "analysis"`. On y arrive par la barre latérale (groupe du haut, sous le tableau de bord), par la carte du [[Dashboard.tsx]] ou par la recherche.

## Structure
Racine `div.pg-mod.pg-an.is-page` (socle des pages de module, `s5/pages/module.css`, plus `s5/pages/analysis.css` et les retouches « Analyse » de `s5/app.css`, voir [[Styles de l'app (CSS)]]).

### En-tête (`section.head`)
- Sur-titre `pa.overline` en minuscules, `//`, puis « nothing is changed during the analysis » (`s5.pa.kick`).
- Titre `pa.title` en minuscules (« analyze my pc »), taille `min(97, floor(97 × 13 / longueur))` px pour que les titres longs (français) tiennent.
- **Étiquette rouge** (`.ping.sig`), qui change avec l'état :
  - départ : « 20 sec », « about, start to finish », 6 traits vides ;
  - en cours : numéro de l'étape « / 6 », nom de l'étape en petit (`s5.pa.sn.*`), traits faits (`on`) et en cours (`pd`) ;
  - résultats : nombre de points au-dessus de la normale, « above normal » sur deux lignes, en petit « of 17 measured » (`s5.pa.ofMeasured`) ou, avec un avant/après, « was 8 on 20 nov » (`s5.pa.was`) ; un groupe de traits par groupe de points, allumés pour les points en défaut.

### Départ et analyse en cours (`.start`)
- Les deux cartes finissent à la même hauteur (`align-items:stretch` dans `s5/grids.css`, 25/11, PR #137) : pendant la mesure, la carte `.go` n'est plus plus courte que la liste des étapes.
- Carte `.panel.go` : étiquette (« 6 checks, about 20 seconds », ou « analysis running »), grand titre sur deux lignes (« what slows your pc down in game », ou l'étape en cours `s5.pa.run.*`), texte (`s5.pa.startLead` ; pendant l'analyse `s5.pa.runLead`, ou `s5.pa.runLeadNet` pendant l'étape réseau).
- Bloc `.gb` : bouton rouge « analyze my pc » (icône `activity`) avec « Nothing is changed. The network test sends its numbers to Rago's server, like the usual network test. » ; pendant l'analyse, bouton « stop » (icône `x`) avec « Nothing has been changed on your PC. ». « stop » appelle `abort()` sur l'`AbortController` de la mesure : `analyze` rejette avec `Stopped`, rien n'est gardé, la page revient au départ.
- Liste `ol.panel.steps` des 6 étapes : numéro, nom (`s5.pa.sn.*`), détail (`s5.pa.sd.*`), puis à droite « done » (coche), « next », une roue, ou le compte en direct « 23 / 40 pings » (`s5.pa.pings`) et « 4 / 10 s » (`s5.pa.secs`) avec une barre de progression `.pg`. Classes `done` et `now` sur la ligne.

### Résultats
- **Avant / après** (`section.ba`, s'il y a un avant et un après) : titre `pa.beforeAfter` en ruban avec les dates (« 20 nov → today »), une carte `.bc` par valeur qui a changé (`deltas`) : ancienne valeur barrée, nouvelle valeur, écart (`gap()` : en % pour gigue, FPS, 1 % low, saccades ; « −4.6 points » pour processeur et perte ; « −63 processes » ; « −1 spike »), classe `worse` si c'est moins bien. Note « FPS and 1% low are measured during your next match, with the in-game bar. » si la partie n'a pas changé.
- **Tout va bien** (aucun point en défaut) : bande `.panel.okbar` : coche, « 17 / 17 within normal », « **Things are fine:** nothing above normal on this PC. Run it again after a big Windows update or a new driver. » (ou `pa.changed` si des tweaks ont été appliqués depuis), bouton « analyze again ».
- **Sinon** (`.split`) : trois cartes `.sc.free`, `.sc.prem`, `.sc.diy` (« fixed for free », « by premium », « to do yourself », classe `zero` quand le compte est nul), puis `.acts` :
  - phrase de bilan : « **8 things above normal.** 3 fixed for free, 3 by Premium, 2 to do yourself: each line says how. » (ou `pa.changed`) ;
  - bouton rouge, dans cet ordre de priorité : « Measure again » si des tweaks ont été appliqués depuis (`changed`) ; « Apply the N free tweaks that fix it » (icône `zap`) s'il reste des tweaks gratuits utiles, présents dans `FREE` et pas encore appliqués → `requestApplyEntries(freeTweaks)` ([[store.tsx]], ouvre [[ConfirmDialog.tsx]]) ; « Open Latency » (icône `gauge`) en Premium avec des points Premium → `goTo("latency")` ;
  - en gratuit avec des points Premium : « See what Premium adds » (icône `lock`) → offre `analysis` ([[Upsell.tsx]]) ; ce bouton devient rouge s'il n'y a pas d'autre bouton rouge ;
  - lien « analyze again » dans la rangée quand il y a un avant/après (et pas de `changed`).
- **Quatre groupes** (`.groups` > `section.grp`, ordre network, FPS, system, windows) : titre en ruban et « 1 / 5 above normal » (`s5.pa.cnt`), puis une ligne `.r` par point (classe `iss` si en défaut) :
  - nom (`pa.<id>`), norme (`pa.norm.*` avec ses variables : fréquence max de l'écran, vitesse nominale de la mémoire, moitié des FPS, seuil réseau et son origine `pa.norm.usual` ou `pa.norm.atPing`), et pour un point « à faire soi-même » en défaut, la marche à suivre (`pa.diy.*`, première lettre en majuscule) ;
  - valeur : nombre et unité (« 14 ms », « 4800 MT/s », « 38 d » affiché « 38 j » en français), ou texte (« Cable », « Off », « High performance ») ; pour les applis de fond, les deux premières puis « +N », la liste entière en info-bulle ;
  - badge `.vt` : « fine », « free » (`zap`), « premium » (`lock` seulement en gratuit), « do it yourself » (`wrench`).
- **Pied** (`p.mfoot`) : « Measured today at 21:20. » ou « Measured on 20 Nov 2026 at 22:30. », lien « analyze again » (quand il n'est pas déjà dans la rangée, qu'il y a des points en défaut et pas de `changed`), lien « start over » (`resetBaseline` : l'analyse suivante redevient l'« avant », l'habitude réseau est gardée). Liens en minuscules comme la maquette.

### Lancement automatique et mise à jour
- À l'ouverture, la mesure repart **toute seule** si `changed` est vrai (des tweaks ont été appliqués depuis la dernière mesure) ou si le tableau de bord l'a demandé (« Run again » : `sessionStorage` `rago.analysis.run` à `"1"`, effacé aussitôt).
- Quand `applied` change pendant que la page est ouverte (et qu'aucune mesure ne tourne), la page relit `saved()` : après une application lancée depuis la page, le bouton rouge devient « Measure again » sans relancer la mesure.
- Quitter la page arrête une mesure en cours.

### Déroulé d'une mesure
`run()` → `analyze(onStep, { signal, onProgress })` → `record(v)` → relit `saved()`. Rien n'est modifié sur le PC pendant l'analyse.

## Données touchées
- `localStorage` `rago.analysis` (par [[analysis.ts]]) ; `sessionStorage` `rago.analysis.run`.
- Commandes : `analysis_facts`, `tools_drivers`, `net_test` (et l'événement `nettest:sample` pour le compte des pings), `live_stats` (voir [[api.ts]]).

## Liens avec le reste
- Store : `premium`, `applied`, `requestApplyEntries`, `setUpsell`, `goTo`, `t`, `lang`.
- Icônes : `I` (`s5/I.tsx`) ; dates : `clock` et `dayMonth` (`s5/text.ts`).
- Moteur : [[analysis.rs]] (faits Windows), [[nettest.rs]] (pings), [[fps.rs]] (dernière partie suivie par la [[Barre en jeu]]).

## À savoir avant de modifier
- Les textes des points sont construits à partir de l'id (`pa.<id>`, `pa.norm.*`, `pa.diy.*`, `pa.v.*`) ; ceux de l'écran v5 sont les clés `s5.pa.*`. Un nouveau point ou un nouveau texte demande ses clés dans les deux langues de [[i18n.ts]].
- Le bouton gratuit filtre par `FREE` : un tweak proposé qui ne serait plus gratuit disparaît simplement du bouton.
- Les styles viennent de la maquette (`port_an.py` génère `s5/pages/analysis.css`) : une retouche va dans `s5/app.css`, avec un sélecteur plus précis, puisque `app.css` est chargé avant les CSS de page.
