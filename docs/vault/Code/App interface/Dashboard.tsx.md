---
type: code
tags: [code, app, typescript, react]
fichier: app/src/pages/Dashboard.tsx
lignes: 395
maj: 2026-11-10
---
# Dashboard.tsx

La page **Tableau de bord**, ouverte au lancement : optimisations gratuites en un clic, accès à l'analyse du PC, fiche de la machine, usage en direct, état, presets, presets par jeu et « Mes presets ». Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Tableau de bord]], [[Presets]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `Dashboard()` : la page (rendue par [[App.tsx]] quand `page === "dashboard"`).
- `MyPresetCard` (interne) : une carte de « Mes presets ».
- Constantes calculées au chargement :
  - `totalSwitches` : interrupteurs (`kind: "tweak"`) du catalogue, jumeaux comptés une fois → **203** en 1.3.0 ;
  - `wmicUsed` : un réglage demande-t-il encore WMIC ? → **non** en 1.3.0 (WMIC retiré de Windows 11 24H2), donc la ligne WMIC de « État » n'est plus affichée ;
  - `FREE_ENTRIES` : les interrupteurs gratuits **du module Windows** seulement, chacun avec sa variante par défaut (`id:variante`) → **50** entrées. Les outils ponctuels gratuits (point de restauration, réinitialisations) et les réglages gratuits des autres modules (stockage, pilotes) n'y sont pas.

## Fonctionnement détaillé (blocs de haut en bas)
Animation d'entrée : chaque bloc monte de 10 px en fondu (0,42 s), avec 0,04 s de décalage entre blocs.

1. **En-tête** : « Tableau de bord », titre « Chaque milliseconde compte. », texte « {n} réglages issus du programme Rago, rangés par module… » avec `n` = `totalTweaks` (218).
2. **Optimisations gratuites** (carte `free-boost`) :
   - liste `boost` = entrées de `FREE_ENTRIES` encore à appliquer sur ce PC (`toApply`), **limitée aux places libres** du plan gratuit (`FREE_SLOTS − slotsUsed`, sans limite en Premium) : au-delà de 30, le moteur refuserait tout le lot ;
   - texte « Jusqu'à {n} réglages Windows du plan gratuit en un clic : mode jeu, Game DVR, effets visuels, notifications, suggestions, Copilot et Recall… » avec `n` = 50 en Premium, sinon `min(50, 30)` = **30** ;
   - bouton « Appliquer les optimisations gratuites » → `requestApplyEntries(boost, { title, lead })` ([[store.tsx]]) qui ouvre [[ConfirmDialog.tsx]] avec le texte « Rago Optimizer garde l'état d'avant de chaque réglage… » ; désactivé pendant un lot ou si tout est fait (« Déjà appliquées », icône ✓).
   - Ouvert en gratuit comme en Premium.
3. **Analyse du PC** (carte `an-cta`) : « Une vingtaine de secondes pour mesurer ce qui ralentit ton PC en jeu. Rien n'est changé. » ; bouton « Analyser mon PC » → `goTo("analysis")` ([[Analysis.tsx]]).
4. **Grille** de trois cartes :
   - **Ta machine** : système et build, processeur (cœurs, threads), carte(s) graphique(s), mémoire, carte réseau et débit du lien ; bouton ↻ → `refreshSys(true)` (nouvelle lecture du PC) ; lignes grises pendant le chargement.
   - **Usage en direct** : [[LiveStatsCard.tsx]].
   - **État** : droits administrateur ; WMIC (seulement si `wmicUsed`) ; NVIDIA Profile Inspector livré ; dernier point de restauration réussi (sinon « Aucun pour l'instant » + bouton « Créer » → `requestApply(["rst_point"])`) ; « Réglages appliqués » `X / 203` avec bouton « Tout annuler » → `requestUndoAll()` (RAG-43), désactivé pendant un lot.
5. **Réglages retirés encore appliqués** (seulement s'il y en a, `retiredApplied`) : nom et raison de chaque réglage retiré du catalogue, bouton « Remettre comme avant » → `requestUndo(retiredApplied)`.
6. **Presets** : les 5 presets généraux du catalogue (`mc_pvp`, `fps`, `latency`, `laptop`, `privacy`), numérotés `01` à `05`, avec le nombre de réglages utilisables sur ce PC. Premium : clic → `selectMany(preset.tweaks)` (coche, n'applique pas) ; carte « Sélectionné » ✓ quand tous ses réglages sont allumés avec la bonne variante. Gratuit : cadenas « Premium », clic → offre `preset` ([[Upsell.tsx]]).
7. **Presets par jeu** : les 15 presets `game: true` + `mc_pvp` affiché « Minecraft » ; pastille colorée (`hue` de [[art.ts]]) avec le logo du jeu (`GameLogo` : icône du jeu installé, glyphe de [[gameLogos.ts]], sinon sigle). Mêmes règles Premium/gratuit que les presets.
8. **Mes presets** (ouverts en gratuit : seuls les réglages du plan du joueur sont cochés) :
   - une carte par preset enregistré (`MyPresetCard`) : date, nom, boutons Modifier (ouvre [[PresetEditor.tsx]]), Copier le code (`encodePreset` de [[share.ts]] → presse-papiers, « Code copié » pendant 2,2 s), Supprimer (deux clics : le premier demande « Supprimer « nom » ? », perdre le focus annule) ; clic sur la carte → `selectMany` ;
   - carte « Enregistrer ma sélection » : désactivée si rien n'est allumé (« Allume des réglages d'abord. ») ; sinon formulaire de nom (40 caractères, Échap annule) → `savePreset(nom, currentSetup)`.

### État « preset complet » (`presetState`)
Réglages du preset utilisables sur ce PC = `tweak` disponibles (`availability`) ; complet si chacun est allumé (`isOn`) avec la variante du preset quand elle est précisée (variante cochée, sinon variante appliquée).

## Données touchées
Aucune directement : tout passe par [[store.tsx]] (sélection, presets du joueur dans `rago.myPresets`) et [[api.ts]] (`copyText`, `presetIcons` par `usePresetIcons`).

## Liens avec le reste
- Store : `sys`, `refreshSys`, `isOn`, `selectMany`, `toApply`, `requestApply`, `requestApplyEntries`, `requestUndo`, `requestUndoAll`, `myPresets`, `savePreset`, `currentSetup`, `slotsUsed`, `premium`, `setUpsell`, `goTo`.
- Composants : [[LiveStatsCard.tsx]], [[PresetEditor.tsx]], `Card`, `Button`, `GameLogo` ([[Petits composants de l'interface]]).
- Données : [[catalog.json]] (presets), [[free.json]] (optimisations gratuites).

## À savoir avant de modifier
- La limite `room` est indispensable : sans elle, un joueur gratuit avec des réglages déjà allumés enverrait plus de 30 réglages et le moteur refuserait **tout** le lot (`free_slots`).
- Le texte `dash.free.lead` cite des exemples (mode jeu, Game DVR, Copilot, Recall) : il doit rester vrai si la liste gratuite change.
