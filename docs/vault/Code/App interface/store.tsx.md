---
type: code
tags: [code, app, typescript, react, interface]
fichier: app/src/lib/store.tsx
lignes: 731
maj: 2026-11-10
---
# store.tsx

L'**état central** de l'interface : langue, page affichée, infos du PC, licence, sélection des réglages, réglages appliqués, presets, lot en cours, fenêtres ouvertes. Un seul contexte React (`StoreProvider` / `useStore`) le donne à tous les composants. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Moteur des tweaks]], [[Licence dans l'app]], [[Presets]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Monté dans [[main.tsx (app)]] autour de toute l'app (`<StoreProvider><AccountProvider><App/>`). La barre en jeu ([[Overlay.tsx]]) **n'a pas** ce store : elle lit la langue directement dans `localStorage`.
- Il n'y a **pas de routeur** : la page affichée est la valeur `page` du store, changée par `goTo`. [[App.tsx]] choisit le composant à afficher d'après elle.
- Toutes les règles de l'offre côté interface vivent ici : réglages gratuits (`FREE`), places du plan gratuit (`FREE_SLOTS`), retours arrière ouverts (`FREE_REVERTS`), verrous (`isLocked`, `variantLocked`). Le moteur Rust ([[lib.rs]], [[catalog.rs]]) applique **les mêmes règles** une seconde fois : l'interface n'est pas la seule barrière.
- Il appelle [[api.ts]] pour tout ce qui touche le PC, [[catalog.ts]] pour le catalogue, [[i18n.ts]] pour les textes, [[analysis.ts]] (`markChanged`) pour l'avant/après de l'analyse, et lit [[free.json]].

## Ce que le fichier expose

### Constantes et petites fonctions
| Nom | Valeur / rôle |
|---|---|
| `FREE` | `Set` des ids de `free.json > tweaks` (73 réglages ouverts sans licence) |
| `FREE_SLOTS` | `free.json > slots` (30 en 1.3.0) : nombre de réglages gratuits de type `tweak` allumés en même temps sans licence |
| `REVERTS` | `Map` id → id de la variante marquée `revert` dans le catalogue (retour à l'état de Windows) |
| `FREE_REVERTS` | `Set` de `free.json > reverts` : réglages Premium dont seul le retour arrière est gratuit (`rbw_mode`, `game_mode`) |
| `SESSION_TOGGLES` | `game_mode`, `rbw_mode`, `win_gamemode` : modes qu'on allume avant de jouer et qu'on éteint après ; affichés avec deux boutons au lieu d'un interrupteur ([[TweakRow.tsx]]) |
| `REVERT_RUNS_SCRIPT` | `rbw_mode` : son retour arrière lance la variante « Activé » en entier (miroir de `catalog::revert_runs_script`) |
| `undoVariant(id, applied)` | variante que le moteur lancera vraiment pour annuler : pour `rbw_mode` appliqué normalement, la variante de retour ; sinon la variante appliquée. Sert au calcul « redémarrage nécessaire » |
| `Upsell` | type des raisons d'ouvrir l'offre : `tweak`, `plan`, `preset`, `signin`, `slots`, `analysis`, `null` |
| `BUILTIN_NAMES` | noms des éléments internes : `__wmic` → « Installer WMIC » / « Install WMIC » |
| `itemName(id, lang)` | nom affiché d'un réglage ; si deux réglages ont le même nom (ex. « Disable autologgers »), ajoute ` · <module>` ; réglage retiré : son nom gardé dans `retired` ; inconnu : l'id |
| `RESTORE_FRESH_MS` | 24 h : un point de restauration réussi plus récent ne coche plus d'office la case ([[ConfirmDialog.tsx]]) |

### Types
- `MyPreset { id, name, t: string[], at }` : preset du joueur ; `t` = entrées `"id"` ou `"id:variante"` ; id de la forme `p<base36 de l'horodatage>`.
- `RunRow { id, variant, undo, status, durationMs, reboot }` et `RunState { runId, rows, logs, startedAt, endedAt, done, reboot, error }` : le lot affiché par [[RunOverlay.tsx]].
- `ConfirmState { ids, undo, single, all?, play?, title?, lead? }` : la fenêtre de confirmation ouverte ([[ConfirmDialog.tsx]]).
- `Playing { id, name, status: "waiting" | "started" | "failed" }` : lancement d'un jeu de la bibliothèque.
- `Store` : le type de tout ce que renvoie `useStore()`.

### Composants et crochets
- `StoreProvider({ children })` : calcule l'état (`useStoreValue`) et le fournit.
- `useStore()` : lit le contexte ; lève `"useStore hors de StoreProvider"` si appelé hors du fournisseur.

### Valeurs et actions renvoyées par `useStore()`
**Langue, animations, page** : `lang`, `setLang`, `motion` (`full`/`reduced`), `setMotion`, `t(key, vars?)` (traduction liée à la langue courante), `page`, `goTo(page, tweakId?)`, `focusTweak`, `setFocusTweak`, `focusSeq`.

**PC** : `sys` (`SystemInfo` ou `null`), `sysLoading`, `refreshSys(refresh?)`, `mcDir` (dossier Minecraft choisi, sinon celui détecté), `setMcDir`, `cleanTrim`, `setCleanTrim`.

**Sélection et réglages** : `selection` (tableau), `selected` (`Set`), `toggle(id, on?)`, `selectMany(entries)`, `unselectMany(ids)`, `variants`, `setVariant(id, v)`, `variantOf(tweak)`, `pendingUndo`, `applied` (`Map` id → `AppliedView`), `appliedLoaded`, `isOn(id)`, `premiumApplied`, `reapply(id)`, `retiredApplied`, `requestUndo(ids)`, `requestUndoAll()`, `history`, `lastRun`, `lastRestore`, `refreshHistory`, `refreshApplied`, `currentSetup`, `slotsUsed`.

**Presets et jeux** : `myPresets`, `savePreset(name, entries)` → id, `updatePreset(id, name, entries)`, `deletePreset(id)`, `gamePresets`, `setGamePresets`, `mcLauncher`, `setMcLauncher`, `playing`, `setPlaying`, `launchGame(id, name)`, `optimizeAndPlay(game, entries)`, `toApply(entries, again?)`.

**Lots** : `confirm`, `setConfirm`, `requestApply(ids?)`, `requestApplyEntries(entries, text?, again?)`, `run`, `setRun`, `startRun(ids, opts)`.

**Fenêtres et messages** : `paletteOpen`, `setPaletteOpen`, `resetDone`, `setResetDone`, `repairNotice`, `setRepairNotice`.

**Licence** : `license`, `setLicense`, `refreshLicense(st)`, `signOut()`, `activated(st, fresh)`, `activatedAt`, `licenseNotice`, `setLicenseNotice`, `premium`, `isLocked(id)`, `variantLocked(id, v)`, `undoOnly(id)`, `upsell`, `upsellTweak`, `setUpsell(kind, tweakId?)`.

## Fonctionnement détaillé

### Persistance (`localStorage`, préfixe `rago.`)
`usePersisted(key, défaut)` lit `rago.<key>` en JSON au premier rendu et le réécrit à chaque changement ; toute erreur de stockage est ignorée (l'état reste en mémoire).

| Clé | Défaut | Contenu |
|---|---|---|
| `rago.lang` | `"en"` | langue de l'interface |
| `rago.motion` | `"full"` | animations complètes ou réduites |
| `rago.selection` | `[]` | réglages cochés, pas encore appliqués |
| `rago.pendingUndo` | `[]` | réglages appliqués décochés, à annuler au prochain « Appliquer » |
| `rago.variants` | `{}` | variante choisie par réglage |
| `rago.mcDir` | `null` | dossier Minecraft choisi à la main |
| `rago.cleanTrim` | `false` | « Nettoyer » la RAM réduit aussi les applis de fond |
| `rago.myPresets` | `[]` | presets du joueur |
| `rago.gamePresets` | `{}` | preset choisi par jeu : `builtin:<id>`, `mine:<id>` ou `none` |
| `rago.mcLauncher` | `null` | launcher choisi pour Minecraft Java (`mc:lunar`, `mc:official`…) |
| `rago.activatedAt` | `null` | date d'activation de la licence dans l'app (sert à [[account.tsx]] pour l'invitation à laisser un avis) |

Ce qui **n'est pas** gardé : `page` (toujours `dashboard` au lancement), `sys`, `history`, `applied` (relus au moteur), `run`, `confirm`, `license`.

### Démarrage
1. `api.takeRepairNotice()` : si la réparation au lancement a supprimé une valeur (RAG-67), `repairNotice` passe à `true` ([[TitleBar.tsx]] affiche « redémarre ton PC »).
2. `api.licenseStatus()` puis `refreshLicense` ; un minuteur relance `licenseStatus` + `refreshLicense` **toutes les 24 h**.
3. `refreshSys()`, `refreshHistory()`, `refreshApplied()` en parallèle.
4. Dès que la licence est `active`, `refreshApplied()` est relancé (le moteur a reçu la clé des scripts Premium).
5. Nettoyages automatiques : la sélection perd les ids qui ne sont plus dans le catalogue ; `pendingUndo` perd les ids qui ne sont plus appliqués ; en gratuit, la sélection perd ce qui n'est pas ouvert (`openInFree`).
6. En vraie app seulement, à chaque changement de langue : si `backgroundGet().prefs.lang` diffère, `backgroundSet` l'enregistre (langue du menu de l'icône près de l'horloge, [[background.rs]]).

### Licence
- `refreshLicense(st)` ne fait rien si l'état n'est ni `active` ni `expired`. Sinon `api.licenseRefresh()` :
  - succès : nouvel état ; `licenseNotice` = `{ code: "expired" }` si le serveur dit expiré, sinon effacé ;
  - erreur `invalid_token`, `bound_to_other_device` ou `revoked` : `licenseNotice` = l'erreur et l'état est relu (le plan gratuit s'affiche) ;
  - autre erreur (pas de réseau) alors que l'état local est `expired` : `licenseNotice` = `expired` (on dit au joueur que la vérification n'a pas pu se faire plutôt que de lui montrer le gratuit).
- `activated(st, fresh)` : après connexion ([[LicenseGate.tsx]]) ; efface la notice ; met `activatedAt` à maintenant si `fresh` ou s'il était vide.
- `signOut()` : `api.licenseSignOut()`, efface notice et `activatedAt`, relit l'état. Le moteur remet alors tous les réglages en arrière-plan et émet `reset:done`.
- `onReset` : à chaque `reset:done`, relit appliqués et historique ; si au moins un réglage a été traité, `resetDone = { ok, failed, at }` ([[ResetToast.tsx]]).

### Verrous du plan gratuit
- `premium` = `license.state === "active"`.
- `isLocked(id)` : vrai si pas Premium, pas dans `FREE` et pas dans `FREE_REVERTS`.
- `variantLocked(id, v)` : en gratuit, seule la variante de retour (`REVERTS.get(id)`) de `rbw_mode` et `game_mode` est ouverte.
- `undoOnly(id)` : réglage Premium dont seul le retour est gratuit : pas de badge « Free », pas dans « Select safe tweaks ».
- `slotsUsed` : nombre de réglages de type `tweak` allumés (appliqués et pas décochés, plus cochés).
- `slotsFull(id, extra)` (interne) : vrai si pas Premium, `FREE_SLOTS > 0`, `id` est un `tweak` pas encore allumé et `slotsUsed + extra >= FREE_SLOTS`.
- `variantOf(tw)` : en gratuit, pour un réglage `undoOnly`, toujours la variante de retour ; sinon la variante choisie (`variants`), sinon `autoVariant(tw, sys)` (choix selon le PC, [[catalog.ts]]).

### Cocher, décocher, choisir une variante
- `toggle(id, on?)` :
  - réglage **appliqué** : l'éteindre l'ajoute à `pendingUndo` (possible même sans licence) et le retire de la sélection ; le rallumer le retire de `pendingUndo` ;
  - réglage verrouillé : ouvre l'offre `tweak` ;
  - allumage alors que les places gratuites sont pleines : ouvre l'offre `slots` ;
  - sinon ajoute ou retire de la sélection.
- `setVariant(id, v)` : variante verrouillée → offre `tweak` ; sinon enregistre. Si le réglage est appliqué (et n'est pas un mode de session) : la même variante que l'appliquée le retire de la sélection ; une autre l'y ajoute (sera appliquée au prochain « Appliquer »).
- `reapply(id)` : remet dans la sélection un réglage dont Windows a changé une valeur (`drift`).
- `unselectMany(ids)` : retire de la sélection et de `pendingUndo`.
- `selectMany(entries)` (presets) : pour chaque `"id[:variante]"`, ignore ce qui est inconnu, indisponible sur ce PC (`availability`), une action, verrouillé, déjà appliqué avec la même variante ; s'arrête de cocher quand les places gratuites sont pleines (et ouvre l'offre `slots`) ; renvoie le nombre de réglages cochés.
- `currentSetup` : réglages `tweak` allumés, dans l'ordre du catalogue, au format `"id:variante"` : c'est ce que garde un code de partage ([[Share.tsx]]) ou « Enregistrer ma sélection » ([[Dashboard.tsx]]).

### Préparer et lancer un lot
- `requestApply(ids?)` : sans argument, prend la sélection (moins le verrouillé) et `pendingUndo` (encore appliqués) ; ouvre la confirmation (`single: false`). Avec `ids` (bouton « Lancer » d'une action), pas d'annulations et `single: true`. Si tout est verrouillé, ouvre l'offre.
- `toApply(entries, again)` : mêmes filtres que `selectMany`, sans toucher à la sélection ; `again` relance aussi ce qui est déjà appliqué.
- `requestApplyEntries(entries, text?, again?)` : lot préparé par un bouton (« optimisations gratuites », [[RbwStatus.tsx]] « Fix », outils) avec titre et texte propres ; renvoie 0 si tout est déjà fait.
- `optimizeAndPlay(game, entries)` : « Optimiser et jouer » de [[Games.tsx]] ; si rien n'est à appliquer, lance le jeu tout de suite ; sinon mémorise le jeu dans `launchAfter` et ouvre la confirmation avec `play`.
- `requestUndo(ids)` : confirmation d'annulation (réglages retirés du catalogue encore appliqués, `retiredApplied`).
- `requestUndoAll()` : « Tout annuler » ; liste et ordre donnés par `api.undoAllPlan()` (repli : les clés de `applied`) ; confirmation avec `all: true`.
- `startRun(ids, { restorePoint, wmic, clearSelection, undo })` appelé par [[ConfirmDialog.tsx]] :
  1. construit les éléments **dans cet ordre** : `rst_point` (si la case est cochée ou s'il est dans la liste) → `__wmic` (si demandé) → les annulations (`undo: true`, avec la variante appliquée ; un réglage retiré du catalogue reste annulable) → les réglages à appliquer (avec `variantOf`) ;
  2. pour `minecraft_optifine`, ajoute `params: { dir: mcDir, values: <valeurs OptiFine de la variante> }` (ou seulement `dir` pour l'annulation) ;
  3. marque les lignes qui demandent un redémarrage (`needsReboot` sur la variante lancée, ou `undoVariant` pour une annulation) ;
  4. ferme la confirmation, efface `playing`, crée un `RunState` avec toutes les lignes en `pending` ;
  5. `api.runTweaks(items)` ; si `clearSelection`, retire de la sélection ce qui part dans le lot ;
  6. en cas de refus du moteur, traduit l'erreur : `premium_required` → `err.premium_required`, `free_slots` → `err.free_slots` (avec `n` = `FREE_SLOTS`), `premium_scripts_unavailable` → `err.premium_scripts_unavailable`, `reset_running` → `err.reset_running`, sinon le texte brut ; le lot affiche l'erreur.
- Écoute des événements du lot (une seule fois) :
  - `run:item` : met à jour la ligne `index` ; une erreur avec message ajoute une ligne de journal `! <message>` ;
  - `run:log` : ajoute la ligne ; au-delà de **600 lignes**, ne garde que les **500** dernières ;
  - `run:done` : marque la fin ; si au moins un réglage est passé et que le lot n'a pas été arrêté, `markChanged()` ([[analysis.ts]]) ; lance le jeu de `launchAfter` si le lot n'a pas été annulé ; si le point de restauration a échoué, remet dans la sélection les réglages qui n'ont pas été appliqués ; relit historique et appliqués.
  - Les événements d'un autre lot (lancé depuis la barre en jeu) sont ignorés tant qu'un lot terminé est encore affiché (`r.done`).
- Si la confirmation est fermée sans lancer, `launchAfter` est vidé (le jeu ne démarre pas plus tard).

### Historique dérivé
- `lastRun` : dernier passage de chaque réglage (badges « Appliqué le… »). Une annulation de `game_mode` ou `win_gamemode` compte comme la variante de retour (« Désactivé depuis… ») ; les autres annulations sont ignorées ; `rbw_mode` suit la règle de [[runner.rs]] (son retour est noté comme « Activé »).
- `lastRestore` : date du dernier `rst_point` réussi qui n'est pas une annulation.
- `premiumApplied` : réglages appliqués hors `FREE`, triés comme le catalogue.

### Navigation et barre en jeu
- `goTo(page, tweakId?)` : change `page`, fixe `focusTweak` ; avec un réglage, incrémente `focusSeq` (chaque recherche compte, même vers le même réglage, pour rouvrir une section repliée).
- Événement `app:goto` (barre en jeu, pont [[Rago OS]]) : la cible est `"page"` ou `"page#tweak"` (ex. `network#ping_main`) ; `premium` ouvre l'offre `plan`.

## Données touchées
- `localStorage` : les 11 clés `rago.*` ci-dessus.
- Moteur : `run_tweaks`, `get_applied`, `get_history`, `undo_all_plan`, `license_*`, `background_get/set`, `take_repair_notice` (via [[api.ts]]).
- Événements écoutés : `run:item`, `run:log`, `run:done`, `reset:done`, `app:goto`.

## Erreurs et cas limites
- Le point de restauration est **toujours en tête** du lot : s'il échoue, le moteur saute tout ce qui suit (sauf annulations) et le store remet ces réglages dans la sélection pour réessayer.
- Un réglage retiré du catalogue (`retired`) mais noté appliqué reste annulable, avec son drapeau de redémarrage gardé dans `retired`.
- Les erreurs de `takeRepairNotice` et `backgroundGet` sont ignorées.
- `byCatalog` est déclaré plus bas que `optimizeAndPlay` et `requestApplyEntries` qui l'utilisent : ça marche parce que ces fonctions ne sont appelées qu'après le rendu (à ne pas déplacer dans un calcul immédiat).

## Liens avec le reste
- Fourni par [[main.tsx (app)]] ; lu par presque tous les composants : [[App.tsx]], [[Sidebar.tsx]], [[ApplyBar.tsx]], [[ConfirmDialog.tsx]], [[RunOverlay.tsx]], [[TweakRow.tsx]], [[Upsell.tsx]], [[SearchPalette.tsx]], et toutes les pages.
- Moteur : [[runner.rs]] (lots), [[license.rs]] (licence), [[reset.rs]] (remise à zéro), [[catalog.rs]] (mêmes règles du gratuit).
- Fonctionnalités : [[Remise à zéro]], [[Réparations au lancement]], [[Mode jeu]], [[RBW Mod]], [[Bibliothèque de jeux]].

## Tests
Pas de test automatique côté front. À tester avec `npm run window` : les interrupteurs `rago.demoRestoreFail`, `rago.demoSim` et la connexion « free… » de [[api.ts]] couvrent les cas difficiles.

## À savoir avant de modifier
- **Toute règle du gratuit doit être changée aux deux endroits** : ici et dans le moteur ([[catalog.rs]] `over_free_slots`, liste de [[free.json]]). L'interface seule ne protège rien.
- Ordre du lot (point de restauration, WMIC, annulations, applications) : choisi pour qu'un réglage réappliqué reparte de l'état d'avant. Ne pas le changer sans regarder [[runner.rs]].
- La sélection est gardée entre deux lancements : un réglage retiré du catalogue doit disparaître tout seul (déjà géré).
- La langue par défaut est **l'anglais** (`en`) ; la barre en jeu, elle, prend `fr` par défaut (voir [[Overlay.tsx]] ; sans effet visible, car `rago.lang` est écrit dès la première ouverture).
