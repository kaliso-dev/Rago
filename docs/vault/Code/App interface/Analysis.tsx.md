---
type: code
tags: [code, app, typescript, react, analyse]
fichier: app/src/pages/Analysis.tsx
lignes: 196
maj: 2026-11-10
---
# Analysis.tsx

La page **Analyse du PC** (« Analyze my PC », 1.3.0) : lance la mesure, montre les 6 étapes, puis les points trouvés groupés, ce qui les règle et l'avant/après. Toute la logique (mesures, normes, mémoire) est dans [[analysis.ts]]. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Analyse du PC]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `Analysis()` : la page, rendue par [[App.tsx]] quand `page === "analysis"`. On y arrive par la barre latérale (groupe du haut, sous le tableau de bord), par la carte du [[Dashboard.tsx]] ou par la recherche.

## Fonctionnement détaillé

### États de la page
1. **Mesure en cours** (`step` non nul) : liste des 6 étapes avec ✓ (faites), roue (en cours), point (à venir) :
   « Le matériel », « Windows et les applis », « Les pilotes », « La connexion (40 pings, et le serveur du jeu) », « Le processeur sans jeu ouvert (10 secondes) », « La dernière partie jouée avec la barre en jeu ». Sous la liste : « Une vingtaine de secondes. Le test réseau envoie aussi ses chiffres au serveur de Rago, comme le test réseau habituel. » (c'est exact : la commande `net_test` de [[lib.rs]] envoie les résultats au serveur par [[netshare.rs]], pour choisir où placer de futurs relais).
2. **Jamais mesuré** : « Ferme tes jeux et tes téléchargements pendant l'analyse… » et grand bouton « Analyser mon PC ».
3. **Résultats** (dernière mesure = l'« après » s'il existe, sinon l'« avant ») :
   - si des tweaks ont été appliqués depuis la dernière mesure (`changed`) : carte « Tu as appliqué des tweaks depuis la dernière analyse… » + « Mesurer à nouveau » ;
   - **Avant / après** (s'il y a les deux) : une ligne par valeur qui a changé (`deltas`), en vert si c'est mieux ; note « Les FPS et le 1 % low se mesurent pendant ta prochaine partie, avec la barre en jeu. » si la partie n'a pas changé ;
   - **Résumé** : « Tout va bien : rien au-dessus de la normale sur ce PC. » ou « {n} points au-dessus de la normale. {free} réglé(s) en gratuit, {premium} par Premium, {diy} à faire toi-même. » ; boutons :
     - « Appliquer les {n} tweaks gratuits qui règlent ça » : tweaks gratuits proposés par les points en défaut, présents dans `FREE` et pas encore appliqués → `requestApplyEntries(freeTweaks)` ([[store.tsx]], ouvre [[ConfirmDialog.tsx]]) ;
     - gratuit avec des points « Premium » : « Voir ce que Premium ajoute » → offre `analysis` ([[Upsell.tsx]], variante propre à l'analyse) ;
     - Premium avec des points « Premium » : « Ouvrir Latence » → `goTo("latency")` (même quand le point vient du Packet Optimizer) ;
     - « Analyser à nouveau ».
   - **Quatre cartes de groupe** (Réseau, FPS, Système, Windows) : pour chaque point, son nom (`pa.<id>`), la norme (texte `pa.norm.*` avec les variables : fréquence max de l'écran, vitesse nominale de la mémoire, moitié des FPS, seuil personnalisé et son origine), ce qu'il faut faire soi-même le cas échéant (`pa.diy.*`), la valeur, et un badge : « Normal » (vert), « Gratuit » (bleu), « Premium » (rouge), « À faire toi-même » (orange).
   - Pied : « Mesuré le {date}. » + lien « Repartir de zéro » (`resetBaseline` : l'analyse suivante redevient l'« avant », l'habitude réseau est gardée).

### Lancement automatique
À l'ouverture de la page, si `changed` est vrai (des tweaks ont été appliqués depuis la dernière mesure), la mesure repart **toute seule**.

### Déroulé d'une mesure
`run()` → `analyze(setStep)` → `record(v)` → relit `saved()`. Rien n'est modifié sur le PC pendant l'analyse.

## Données touchées
- `localStorage` `rago.analysis` (par [[analysis.ts]]).
- Commandes : `analysis_facts`, `tools_drivers`, `net_test`, `live_stats` (voir [[api.ts]]).

## Liens avec le reste
- Store : `premium`, `applied`, `requestApplyEntries`, `setUpsell`, `goTo`.
- Composants : `Card`, `Badge`, `Button` ([[Petits composants de l'interface]]).
- Moteur : [[analysis.rs]] (faits Windows), [[nettest.rs]] (pings), [[fps.rs]] (dernière partie suivie par la [[Barre en jeu]]).

## À savoir avant de modifier
- Les textes des points sont construits à partir de l'id (`pa.<id>`, `pa.norm.*`, `pa.diy.*`, `pa.v.*`) : un nouveau point demande ses clés dans les deux langues de [[i18n.ts]].
- Le bouton gratuit filtre par `FREE` : un tweak proposé qui ne serait plus gratuit disparaît simplement du bouton.
