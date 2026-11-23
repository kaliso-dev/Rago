---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/RunOverlay.tsx
lignes: 249
maj: 2026-11-23
---
# RunOverlay.tsx

La **fenêtre du lot en cours** : compteur, barre de progression, élément en cours, liste des éléments avec leur durée, journal en direct, puis le bilan (échecs, point de restauration raté, redémarrage, jeu qui démarre, offres). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Moteur des tweaks]].

Depuis la PR #130 (23/11), elle reprend à l'identique les maquettes v5 `app-run-running`, `-done`, `-failed` et `-reboot` ([[Maquettes v5 dans l'app (s5)]]).

Tout ce qui suit est CONFIRMÉ (code de la branche `claude/app-v5-windows`, PR #130 vers `staging`, 23/11).

## Rôle et place dans l'ensemble
- Affichée tant que `run` du store n'est pas nul ; `run` est créé par `startRun` ([[store.tsx]]) et mis à jour par les événements `run:item`, `run:log`, `run:done` du moteur ([[runner.rs]]).
- Rendue par [[App.tsx]] : `div.w5` (z-index 40) couvre **toute la fenêtre**, barre de titre comprise ; elle a ses propres boutons réduire, agrandir, fermer (`span.wc2`) et se déplace par son fond (`data-tauri-drag-region`). Fondu de 0,24 s.
- Structure : `div.runw` (`.fin` à la fin du lot) > `div.run2` > `div.hero2` (gauche) et `div.side2` (droite). Styles : `s5/pages/win.css` et le bloc « écran d'exécution » de `s5/app.css` ([[Styles de l'app (CSS)]]).

## Fonctionnement détaillé

### Partie gauche (« héros »)
- Logo de l'app (`img.rlogo`, `assets/s5/img/rago-app-dark-128.svg`).
- État `p.rst` : point rouge qui bat (`i.lv`) et « optimizing », puis « done » ou « stopped ».
- Compteur `div.ctr` : `NN` (éléments finis, y compris sautés, sur deux chiffres, chaque changement glisse) et `/NN`.
- Barre `div.pg2` en cases : une case par élément, 40 cases au plus (au-delà, chaque case couvre plusieurs éléments) : hachurée rouge (`.x`) si l'un a échoué, pleine (`.d`) si tous sont finis, en cours (`.r`) si l'un tourne ou est fini ; une case dont tous les éléments sont sautés reste vide.
- Pendant le lot : nom de l'élément en cours (`span.nm3`, « Annuler · Nom » pour une annulation) et bouton « stop » → `api.cancelRun()`.
- **Bilan** à la fin (`div.cur`) : `p.sum` pour le compte, `p.er3` (icône `alert`, rouge) pour les erreurs, `p.rb3` pour le redémarrage et le jeu ; un message long (point de restauration) se lit à gauche, l'icône sur la première ligne :
  - erreur de lancement (refus du moteur, texte déjà traduit par le store) en rouge ;
  - sinon « {ok} sur {total} terminés en {s} s » ;
  - point de restauration raté (`restoreFailed`) : un des quatre textes selon ce qui s'est passé —
    `run.restoreFailed` (rien n'a été changé, conseil d'activer la protection du système),
    `run.restoreFailedPartial` ({n} réglages pas appliqués, annulations faites),
    `run.restoreFailedUndo` (seulement des annulations, faites quand même),
    `run.restoreFailedAlone` (le point était seul) ;
  - « {n} en échec, détails dans le journal. » (sans compter le point raté) ;
  - « Redémarre ton PC pour que tout prenne effet. » : si le lot demande un redémarrage et que quelque chose a changé ; après « stop », seulement si un élément qui le demande est allé au bout ;
  - « Optimiser et jouer » : « {jeu} va démarrer… », « {jeu} démarre. » ou « {jeu} n'a pas pu démarrer. Lance-le depuis la page Jeux. » (état `playing` du store) ;
  - si une analyse du PC existe et qu'au moins un élément est passé : pastille `button.up2` « mesurer la différence » (`pa.measureDiff`) → ferme et ouvre [[Analysis.tsx]] ;
  - en gratuit (connecté, pas arrêté) : pastille d'offre `button.up2.prem` (icône `sparkles`). Si l'analyse a trouvé des points réglés par Premium : `pa.premiumLeft` → offre `analysis` ; sinon « Premium ouvre {n} réglages de plus, dont le preset Minecraft PvP. » avec `n` = `totalTweaks − FREE.size` (218 − 73 = 145 en 1.3.0) → offre `plan` ([[Upsell.tsx]]).
- Boutons de fin (`div.ra`) : « restart now » (`btn red lg`, `api.restartPc()`) si redémarrage, et « close » (`setRun(null)`, discret `gh2` à côté du bouton rouge).

### Partie droite
- Liste `ol.rl` des éléments (`li` avec la classe de l'état) : roue (en cours), ✓ (vert à la fin), ✕ rouge, tiret au trait (sauté, ligne en retrait), point (en attente) ; durée en secondes. La liste défile pour garder l'élément en cours visible ; à la fin elle revient en haut, sur le premier échec s'il y en a un.
- « log » (`div.ch`) puis `div.cs` : lignes `id ligne` en direct (`span.cid` pour l'id), défilement automatique en bas ; une ligne qui commence par `!` (message d'erreur ajouté par le store) est en rouge. Le clic droit natif y reste permis pour copier ([[App.tsx]]). Lien « open log » (`openFolder("logs")`) à la fin si le moteur a écrit un fichier.

## Liens avec le reste
- Store : `run`, `setRun`, `premium`, `license`, `setUpsell`, `playing`, `goTo`, `FREE`, `itemName`.
- [[analysis.ts]] : `saved`, `findings` (points Premium restants).
- Moteur : [[runner.rs]] (ordre, sauts après un point de restauration raté, journal dans le dossier `logs`).
- Textes `run.*`, `play.*`, `done.upsell`, `pa.measureDiff`, `pa.premiumLeft` ([[i18n.ts]]).

## À savoir avant de modifier
- Le texte du point de restauration raté dépend de `skipped` et des éléments qui ont tourné après lui : garder les quatre cas, ils correspondent au comportement de [[runner.rs]] (les annulations passent même quand le point échoue).
