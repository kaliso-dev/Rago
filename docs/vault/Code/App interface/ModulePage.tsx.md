---
type: code
tags: [code, app, typescript, react, catalogue]
fichier: app/src/pages/ModulePage.tsx
lignes: 263
maj: 2026-11-10
---
# ModulePage.tsx

La page **d'un module du catalogue** (Latence, Carte graphique, Windows, Hitreg, Minecraft, RBW Mod, Mode jeu, Mode expert, Restaurer, et l'onglet « Optimisations » de Réseau) : en-tête, compteur, « Sélectionner les réglages sûrs », sommaire et sections repliables, une ligne par réglage, et les blocs propres à Minecraft, RBW Mod et Restaurer. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalités : [[Catalogue des tweaks]], [[Moteur des tweaks]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Ce que le fichier expose
- `ModulePage({ id, embedded = false })` : `id` = id du module dans [[catalog.json]] ; `embedded` = affiché dans un onglet ([[Network.tsx]]), sans grand titre (seulement le slogan du module).
- `MinecraftFolder` et `HistoryList` : composants internes.

C'est la page « par défaut » de [[App.tsx]] : toute valeur de `page` qui n'est pas une page connue est prise pour un id de module.

## Fonctionnement détaillé

### En-tête
- Surtitre `NN / NOM DU MODULE` (numéro = rang du module dans le catalogue, sur 2 chiffres), titre, slogan (`tagline`).
- Si le module a plus d'un interrupteur :
  - compteur « {n} sur {total} activés » (`isOn` : appliqué et pas décoché, ou coché) ;
  - un seul bouton à droite, choisi dans cet ordre :
    1. des changements en attente dans le module (cochés, ou appliqués puis décochés) → « Effacer les changements » (`unselectMany` de tous les réglages du module) ;
    2. sinon, en gratuit sans aucun réglage sûr ouvert → bouton cadenas « Premium » → offre `plan` ([[Upsell.tsx]]) ;
    3. sinon → « Sélectionner les réglages sûrs » → `selectMany(safe)`, où `safe` = interrupteurs `risk: "safe"`, disponibles sur ce PC, sans texte de confirmation (`confirm`), pas verrouillés et pas « retour seul » (`undoOnly`).

### Sections
- Module « long » (plus de 30 interrupteurs **et** plus d'une section, ex. Latence, Windows) : **sommaire** de puces (nom + nombre) qui défile jusqu'à la section (`#sec-<id>`, défilement doux) en la dépliant, et **titres repliables** (chevron, `aria-expanded`). Les sections repliées sont oubliées quand on change de module.
- Module court avec plusieurs sections : titres simples avec le nombre.
- Une section n'a pas de titre si le module n'en a qu'une.
- Apparition de chaque section : fondu + 10 px, délai `min(rang × 0,05 s, 0,3 s)`.
- Chaque réglage est une [[TweakRow.tsx]] ; les renvois `ref` du catalogue sont résolus (`sectionTweaks`, [[catalog.ts]]).

### Recherche vers un réglage (Ctrl+K)
- Quand `focusTweak` vise un réglage d'une section repliée, la section se déplie.
- La clé React de la ligne visée devient `id-<focusSeq>` : chaque nouvelle recherche recrée la ligne, ce qui rejoue sa mise en valeur ; ensuite la clé ne change plus, pour ne pas refermer un « Détails » ouvert.
- Replier la section du réglage cherché annule la recherche (`setFocusTweak(null)`), pour éviter un saut surprise plus tard.

### Blocs propres à certains modules
- **Minecraft** (`id === "minecraft"`) : carte « Dossier Minecraft » (`MinecraftFolder`) : chemin (`mcDir` du store, sinon « Dossier introuvable »), bouton « Changer » (`pickFolder`, enregistré dans `rago.mcDir`), état `minecraftStatus` : « optionsof.txt trouvé » / « optionsof.txt absent, il sera créé », nombre de copies de sauvegarde, bouton « Restaurer la dernière copie » (`minecraftRestore`) ; le moteur répond en anglais : le texte « No Rago backup found » devient « Aucune copie de sauvegarde Rago trouvée. », toute autre erreur est montrée en détail.
- **RBW Mod** (`id === "rbw"`) : [[RbwStatus.tsx]] sous les réglages.
- **Restaurer** (`id === "restore"`) : carte « Historique » (`HistoryList`) : les **80** derniers passages, du plus récent au plus ancien, point vert/rouge, nom (`itemName`) avec la variante, ou « Annuler · Nom » pour une annulation (sans variante), date et heure ; bouton « Effacer l'historique » (`clearHistory`).

## Données touchées
- Store : sélection, `rago.mcDir`.
- Commandes : `minecraft_status`, `minecraft_restore`, `clear_history`, dialogue de choix de dossier ([[api.ts]]).

## Liens avec le reste
- [[TweakRow.tsx]] (une ligne), [[RbwStatus.tsx]], `Card`/`Button` ([[Petits composants de l'interface]]).
- Store : [[store.tsx]] (`selectMany`, `unselectMany`, `isLocked`, `undoOnly`, `focusTweak`, `focusSeq`, `history`).
- Moteur : [[minecraft.rs]] (dossier et OptiFine), [[history.rs]].
- Fonctionnalités : [[RBW Mod]], [[Mode jeu]], [[Remise à zéro]].

## À savoir avant de modifier
- Le seuil « long » (30 interrupteurs) décide du sommaire et des sections repliables.
- « Sélectionner les réglages sûrs » ne doit jamais cocher un réglage avec `confirm` (il demande une confirmation propre) ni un réglage Premium en gratuit.
