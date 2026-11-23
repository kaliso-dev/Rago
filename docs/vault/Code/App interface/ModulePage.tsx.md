---
type: code
tags: [code, app, typescript, react, catalogue, v5]
fichier: app/src/pages/ModulePage.tsx
lignes: 703
maj: 2026-11-23
---
# ModulePage.tsx

La page **d'un module du catalogue** (Latence, Carte graphique, Windows, Hitreg, Minecraft, RBW Mod, Mode jeu, Mode expert, Restauration, et l'onglet des réglages de Réseau), **refaite le 23/11 à l'identique des maquettes v5 `app-module-*.html`** (demande de Sofiene du 23/11 : « strictement conforme au design », voir [[Maquettes v5 dans l'app (s5)]]). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Catalogue des tweaks]], [[Moteur des tweaks]].

Statut : dans `staging` (PR #122, fusionnée le 23/11). Jamais testée sur Windows ([[Règles de travail]]). Captures app contre maquette : `/mnt/project-files/rago-redesign/app-strict/8-…` à `18-…` (dossier du projet, hors dépôt).

## Ce que le fichier expose
- `ModulePage({ id, embedded = false })` : `id` = id du module dans [[catalog.json]] ; `embedded` = affichée dans un onglet ([[Network.tsx]]) : sans en-tête, classe `embed` au lieu de `is-page`.
- Composants internes : `Sig` (bloc signature), `MinecraftFolder`, `RbwPanel`, `GameModePanel`, `History`, `ModSection` ; fonctions `titleSize`, `sectionBlock`, et le hook `useRbw`.

C'est la page « par défaut » de [[App.tsx]] : toute valeur de `page` qui n'est pas une page connue est prise pour un id de module.

## Structure (classes de la maquette)
Racine `div.pg-mod.is-page` (ou `.embed`) avec `data-mod={id}`. Styles : `s5/pages/module.css` (porté de la maquette, tout sous `.pg-mod`) et le bloc « modules » de `s5/app.css` ([[Styles de l'app (CSS)]]).

### En-tête (`section.head`, pas en mode intégré)
- Surtitre `.kick` : « nom // tagline » en minuscules (le point final du slogan retiré).
- Titre `h1.title` (avec `data-t` pour l'effet déchiré) : **150 px** si le nom a 8 lettres ou moins, sinon `floor(150 × 8,4 / lettres)` (règle de `gen.py`, le générateur des maquettes).
- Bloc signature `Sig` (`.ping.sig`) à droite : un grand chiffre, son unité, une petite ligne et des traits (`.ticks`, un groupe par section, `--n` = nombre de traits) :
  - modules à réglages : allumés / total (« tweaks on ») ; un trait par interrupteur, `on` s'il est appliqué (et pas en cours d'annulation), `pd` s'il est coché ;
  - **RBW Mod** : nombre d'éléments en rouge, « red / at screenshare », un trait par élément lu (18 traits vides pendant la lecture) ;
  - **Mode jeu** (`sess`) : ON / OFF, « since {heure} » (ou « never used »), un trait par changement de la liste ;
  - **Restauration** : la date du dernier point de restauration réussi (`rst_point`, jour + mois, « last restore point »), sinon le nombre de passages de l'historique (« in your history » / « nothing applied yet ») ; traits = les 9 derniers passages, `on` s'ils ont réussi.

### Barre des sections
- Plus d'une section (et pas RBW ni Mode jeu) : `.bar` avec le sommaire `.tabs.idx` (`role="tablist"`) : une puce par section, nom (« and » devient « & » en anglais) et `<em><b>allumés</b>/interrupteurs</em>` (ou le nombre d'éléments s'il n'y a pas d'interrupteur). Puce `on` = section à l'écran, `off` = section sans objet sur ce PC. Clic ou Entrée → `jump` : déplie la section et y défile en douceur.
- À droite : « select safe » (`selectMany(safe)`, désactivé quand ils sont tous allumés), ou, en gratuit sans aucun réglage sûr ouvert, le bouton cadenas « Premium » → offre `plan` ([[Upsell.tsx]]). `safe` = interrupteurs `risk: "safe"`, disponibles sur ce PC, sans texte de confirmation (`confirm`), pas verrouillés et pas « retour seul » (`undoOnly`).
- Une seule section, RBW Mod ou Mode jeu : `div.nobar` (l'espace de la maquette).
- **Suivi de la section à l'écran** : écoute le défilement de `.main` ; la section courante est la dernière dont le haut a passé `haut de .main + 140 px` ; tout en bas de la page (et seulement si on a défilé), la dernière section, même courte.

### Sections (`ModSection`, `section.msec#sec-<id>`)
- Titre sur ruban `h2.h2.tape`, compteur `.cnt` « allumés / interrupteurs » si plus de la moitié des éléments sont des interrupteurs, étiquette `.tg` (icône info + texte `block.*`) si la section demande un matériel absent (`requires`, ex. carte AMD), bouton `.fold` « Hide » / « Show » (`aria-expanded`) sauf s'il n'y a qu'une section.
- Une section sans objet sur ce PC est **repliée d'office** ; l'état replié et les avancés dépliés sont remis à zéro à chaque changement de module ou de PC (`sys`).
- `div.tgrid` : un carreau [[TweakRow.tsx]] par réglage normal (avec `mod` = ce module, pour « Also in … »), puis les **réglages avancés** (`risk: "advanced"`) : fermés, un carreau `button.tw.adv` « Advanced » + leur nombre ; ouverts, l'en-tête `.advh` (nombre, phrase `s5.mod.advLead`, bouton « Hide ») puis leurs carreaux en classe `advx`.
- Les renvois `ref` du catalogue sont résolus par `sectionTweaks` ([[catalog.ts]]).

### Recherche vers un réglage (Ctrl+K)
Quand `focusTweak` vise un réglage de la page, sa section se déplie, et ses avancés aussi s'il est avancé ; le carreau se met lui-même en valeur ([[TweakRow.tsx]]).

### Blocs propres à certains modules
- **Minecraft** (`MinecraftFolder`, `section.msec.mcf` au-dessus des réglages) : titre « Minecraft folder », panneau `.panel.folder` : bloc d'herbe, « Folder », chemin lu par le moteur (`status.dir`, sinon `mcDir`) avec le dernier dossier en `<em>`, bouton « change folder » (`pickFolder`, enregistré dans `rago.mcDir`) ; ligne d'état `.fs` : point vert « optionsof.txt found » ou rouge (absent / dossier introuvable), nombre de copies de sauvegarde, lien « restore the last backup » (`minecraftRestore`) ; le moteur répond en anglais : « No Rago backup found » devient `mc.noBackup`, toute autre erreur `mc.restoreFailed` avec le détail.
- **RBW Mod** (`RbwPanel`, pas de sections) : panneau verdict : « RBW Mod // on since {heure} » ou « off since », titre « {n} red at screenshare » / « Ready for screenshare » / lecture en cours, phrase, bouton ↻ (tourne pendant la lecture), puis :
  - pas encore « Activé » ou un élément rouge : **« turn on rbw mod »** (rouge) → `requestApplyEntries(["rbw_mode:on"], { title, lead }, true)`, relancé même déjà appliqué (Windows a pu recouper un service) ; refusé (variante Premium en gratuit) → offre `tweak` ;
  - activé et tout vert : « turn off rbw mod » → variante `off` puis `requestApply(["rbw_mode"])`.
  Ensuite deux grilles : « Services » (`.ckgrid`, « {ok} / {n} running » ; nom sans suffixe `_xxxx` des services par utilisateur, état, démarrage) et « Settings » (`.ckgrid.c3`, « {ok} / {n} on ») ; un élément rouge a la classe `bad`. Lecture par `useRbw` : au montage, **toutes les 5 s** et après chaque fin de lot (`onDone`), seulement sur cette page.
- **Mode jeu** (`GameModePanel`, pas de sections) : à gauche « right now », « game mode is on / off », phrase (« since {heure} »), deux chiffres (changements actifs : 7 ou 0 ; « paused until restart » : 2), bouton « Turn on » / « Turn off » (`setVariant` + `requestApply(["game_mode"])`, cadenas si la variante est Premium) et une petite ligne ; à droite la liste des **7 changements** de la variante « Activé » (`s5.gm.l1` à `l7`, les 2e et 3e seulement jusqu'au redémarrage). L'état vient du dernier passage (`lastRun`), comme le [[Mode jeu]].
- **Restauration** (`History`, sous les réglages) : titre « History », compteur, bouton « clear » (`clearHistory`) ; liste `ul.panel.hl` des **80** derniers passages, du plus récent : point, nom (`itemName`), variante en `<em>` (pas pour une annulation, écrite « Annuler · Nom »), « failed » si raté (`li.bad`), date « Today 21:14 », « Yesterday 18:02 » ou « 20 Nov 22:41 » (`dayTime` de `s5/text.ts`). Vide : `.hl.hemp` avec l'icône et `restore.historyEmpty`.

## Données touchées
- Store ([[store.tsx]]) : `selected`, `selectMany`, `isLocked`, `undoOnly`, `premium`, `setUpsell`, `focusTweak`, `focusSeq`, `isOn`, `applied`, `pendingUndo`, `lastRun`, `history`, `refreshHistory`, `run`, `requestApply`, `requestApplyEntries`, `setVariant`, `variantLocked`, `mcDir`, `setMcDir`.
- Commandes ([[api.ts]]) : `minecraft_status` (renvoie aussi `dir` depuis le 23/11, [[minecraft.rs]]), `minecraft_restore`, `rbw_status`, `clear_history`, choix de dossier.

## Liens avec le reste
- [[TweakRow.tsx]] (un carreau), [[ApplyBar.tsx]] (la barre « apply » en bas), icônes `I` de `s5/I.tsx`, textes `s5.mod.*`, `s5.rbw.*`, `s5.gm.*`, `s5.rst.*` ([[i18n.ts]]).
- Moteur : [[minecraft.rs]] (dossier et OptiFine), [[rbw.rs]] (vérificateur), [[history.rs]].
- Fonctionnalités : [[RBW Mod]], [[Mode jeu]], [[Remise à zéro]].
- Le compte de la barre de gauche ([[Sidebar.tsx]]) suit la même règle que le bloc signature (appliqués et pas en cours d'annulation).

## À savoir avant de modifier
- La maquette de chaque module est générée depuis le catalogue par `rendus-v5/outils/gen.py` (dossier du projet) : les règles d'affichage (compteur si interrupteurs × 2 > éléments, repli sauf section unique, avancés derrière un carreau, taille du titre) viennent de lui. Garder les deux d'accord.
- « select safe » ne doit jamais cocher un réglage avec `confirm` (il demande une confirmation propre) ni un réglage Premium en gratuit.
- Le hook `useRbw` est appelé sur chaque page module (ordre des hooks) mais ne lit rien hors de RBW Mod.
