---
type: code
tags: [code, app, typescript, react]
fichier: app/src/components/RunOverlay.tsx
lignes: 182
maj: 2026-11-10
---
# RunOverlay.tsx

La **fenêtre du lot en cours** : compteur, barre de progression, élément en cours, liste des éléments avec leur durée, journal en direct, puis le bilan (échecs, point de restauration raté, redémarrage, jeu qui démarre, offres). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Moteur des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Affichée tant que `run` du store n'est pas nul ; `run` est créé par `startRun` ([[store.tsx]]) et mis à jour par les événements `run:item`, `run:log`, `run:done` du moteur ([[runner.rs]]).
- Rendue par [[App.tsx]] dans `div.body` (elle couvre la zone de page, pas la barre de titre). Fondu de 0,24 s.

## Fonctionnement détaillé

### Partie gauche (« héros »)
- Logo animé `Pulse` de 132 px, actif tant que le lot tourne ([[Petits composants de l'interface]]).
- État : « Optimisation en cours », puis « Terminé » ou « Arrêté ».
- Compteur `NN/NN` (éléments finis sur total, y compris sautés) et barre de progression (0,42 s par pas).
- Pendant le lot : nom de l'élément en cours (« Annuler · Nom » pour une annulation) et bouton « Arrêter » → `api.cancelRun()`.
- **Bilan** à la fin :
  - erreur de lancement (refus du moteur, texte déjà traduit par le store) en rouge ;
  - sinon « {ok} sur {total} terminés en {s} s » ;
  - point de restauration raté (`restoreFailed`) : un des quatre textes selon ce qui s'est passé —
    `run.restoreFailed` (rien n'a été changé, conseil d'activer la protection du système),
    `run.restoreFailedPartial` ({n} réglages pas appliqués, annulations faites),
    `run.restoreFailedUndo` (seulement des annulations, faites quand même),
    `run.restoreFailedAlone` (le point était seul) ;
  - « {n} en échec, détails dans le journal. » (sans compter le point raté) ;
  - « Redémarre ton PC pour que tout prenne effet. » : si le lot demande un redémarrage et que quelque chose a changé ; après « Arrêter », seulement si un élément qui le demande est allé au bout ;
  - « Optimiser et jouer » : « {jeu} va démarrer… », « {jeu} démarre. » ou « {jeu} n'a pas pu démarrer. Lance-le depuis la page Jeux. » (état `playing` du store) ;
  - si une analyse du PC existe et qu'au moins un élément est passé : lien « mesurer la différence » (`pa.measureDiff`) → ferme et ouvre [[Analysis.tsx]] ;
  - en gratuit (connecté, pas arrêté) : lien d'offre. Si l'analyse a trouvé des points réglés par Premium : `pa.premiumLeft` → offre `analysis` ; sinon « Premium ouvre {n} réglages de plus, dont le preset Minecraft PvP. » avec `n` = `totalTweaks − FREE.size` (218 − 73 = 145 en 1.3.0) → offre `plan` ([[Upsell.tsx]]).
- Boutons de fin : « Redémarrer maintenant » (`api.restartPc()`) si redémarrage, et « Fermer » (`setRun(null)`).

### Partie droite
- Liste ordonnée des éléments : roue (en cours), ✓, ✕, tiret (sauté), point (en attente) ; durée en secondes. La liste défile pour garder l'élément en cours visible.
- « Journal » : lignes `id ligne` en direct, défilement automatique en bas ; une ligne qui commence par `!` (message d'erreur ajouté par le store) est en rouge. Le clic droit natif y reste permis pour copier ([[App.tsx]]). Bouton « Ouvrir le journal » (`openFolder("logs")`) à la fin si le moteur a écrit un fichier.

## Liens avec le reste
- Store : `run`, `setRun`, `premium`, `license`, `setUpsell`, `playing`, `goTo`, `FREE`, `itemName`.
- [[analysis.ts]] : `saved`, `findings` (points Premium restants).
- Moteur : [[runner.rs]] (ordre, sauts après un point de restauration raté, journal dans le dossier `logs`).
- Textes `run.*`, `play.*`, `done.upsell`, `pa.measureDiff`, `pa.premiumLeft` ([[i18n.ts]]).

## À savoir avant de modifier
- Le texte du point de restauration raté dépend de `skipped` et des éléments qui ont tourné après lui : garder les quatre cas, ils correspondent au comportement de [[runner.rs]] (les annulations passent même quand le point échoue).
