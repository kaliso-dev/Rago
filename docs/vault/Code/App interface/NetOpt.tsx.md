---
type: code
tags: [code, app, react, page, reseau]
fichier: app/src/pages/NetOpt.tsx
lignes: 1109
maj: 2026-11-27
---
# NetOpt.tsx

L'onglet **« Packet Optimizer »** de la page Réseau, refait le 23/11 à l'identique de la maquette v5 `app-network-packet-pi.html` (PR #123). Il propose :
- 6 profils (« presets ») et « find my preset » (l'analyse du PC) ;
- une console de trois curseurs avec le tableau avant/après ;
- des interrupteurs, le type de connexion, les blocs « advanced » et « expert » ;
- les 4 outils du moteur (stabilité, bufferbloat, MTU, état actuel) ;
- sa propre barre « apply » en bas de la fenêtre, avec « restore » et le journal.

Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Packet Optimizer]]. Logique partagée : [[netopt.ts]]. Côté Rust : [[netopt.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging` après la PR #123, fusionnée le 23/11). Jamais testé sur Windows.

## Rôle et place dans l'ensemble
- Affiché par [[Network.tsx]] quand l'onglet est `netopt`. On y arrive aussi par le conseil de [[NetTest.tsx]].
- **Appliquer est Premium** (décision de Sofiene du 10/11 pour la 1.3.0, PR #76). Sans licence, l'onglet montre depuis le 23/11 **le vrai écran, verrouillé** (voir « Sans licence » plus bas), au lieu de l'ancienne vue fermée. Le moteur refuse aussi `apply` sans licence active (`premium_required:netopt`, [[lib.rs]]).
- Toutes les actions passent par `api.netOptRun(action, options)` (commande `netopt_run`). Le moteur reçoit **les choix** (`NetOptions`), jamais les valeurs calculées : le calcul de [[netopt.ts]] (`computeNet`) ne sert qu'à l'affichage.

## Ce que le fichier expose
- `NetOpt()` : l'onglet.
- Composants internes : `Fader` (curseur), `Diff` (avant/après), `Toggle`, `LineTile` (type de connexion), `FoldHead`, `VarRow`, `Opt`, `Advanced`, `Expert`, `Stepper`, `ScanPanel` (analyse), `Bar` (barre du bas), `Log` (journal).
- Constantes internes : `PRESET_ICONS`, `FOLDS` (`rago.netoptFolds`), `LINE_SAMPLES` (40), `PRIOS` (6 niveaux de priorité), `NUM_ROWS`, `EXPERT_ROWS`.

## Fonctionnement détaillé

### Chargement
- Réglages affichés : le brouillon s'il existe (`loadDraft()`, `rago.netoptDraft`), sinon ceux de la dernière application (`netOptState().applied.options`), sinon `NET_DEFAULTS`.
- `netOptRun("detect")` lit la carte réseau utilisée. Elle s'affiche en puce **« ethernet detected »** ou **« wi-fi detected »** (le nom complet de la carte au survol). La fibre ne se voit pas : la carte ne dit que câble ou Wi-Fi.
- À la toute première visite (ni brouillon ni application), une carte Wi-Fi règle le type de connexion sur Wi-Fi (`line` 5, `wifi` vrai).
- Événements écoutés :
  - **`netopt:line`** : `progress` pour l'avancement ; les lignes d'`apply`, `restore` et `defaults` pour le journal ; le titre de l'étape en cours d'un outil ;
  - **`nettest:sample`** : avancement des 40 pings de l'analyse (serveur `internet`).

### « presets » (6 cartes)
- Hitreg, Knockback, Balanced, Wi-Fi, Packet loss, Old-school, chacune avec son icône, une coche quand elle est choisie et une phrase (`s5.no.pd.*`).
- Un clic appelle `applyPreset` de [[netopt.ts]]. Toucher un réglage à la main fait passer le profil à **« custom »** (puce à côté de « tune », et nom dans la barre).
- Bouton **« find my preset »** (l'analyse, voir plus bas).

### « tune » : la console
- Trois curseurs (`Fader`, 24 segments, glisser, cliquer, flèches ±5, Page ±20, Début et Fin) :

| Curseur | Option | Texte affiché |
|---|---|---|
| buffering | `latency` | « {n} off » (tampons coupés sur 6) ou « windows » |
| re-send | `responsiveness` | windows (0), cautious, balanced, fast |
| batching | `delay` | none (0), light, heavy, windows (100) |

- **Tableau avant/après** (`Diff`), valeur de Windows puis la nouvelle, la ligne pâlie si rien ne change :
  - Nagle : on → off ou on ;
  - accusés de réception : fréquence · délai en ms ;
  - premier renvoi : `minRto` en ms ;
  - tampons : « {n} on » (6 moins les tampons coupés) ;
  - priorité : aucune ou « {DSCP} {nom} ».
- Les valeurs sont **les vraies valeurs calculées** par `computeNet`, pas celles, illustratives, de la maquette.

### Tuiles d'options
- Interrupteurs : **game traffic first** (`smart`), **loss tolerance** (l'inverse de `stable`), **windows game boost** (`competitive`).
- **connection** (`LineTile`) : menu des 7 types de ligne, qui s'ouvre vers le haut. Choisir Wi-Fi coche l'option Wi-Fi, quitter Wi-Fi la décoche.
- **advanced 9** et **expert 9** : déplient leur bloc (état gardé dans `rago.netoptFolds`). « {n} manual » sur la tuile expert quand des valeurs sont forcées.

### Bloc « advanced »
- Interrupteurs : mode priorité (`priorityMode`), économie d'énergie de la carte (`powerSaving`), Wi-Fi (`wifi`), garde du trafic de fond (`bgGuard`).
- Champ **serveur de test** (`target`, sur deux colonnes), vérifié par `validTarget` de [[NetTools.tsx]]. Il sert aux outils et à la mesure du MTU.
- Lignes à options :
  - **priorité** : 6 niveaux (`PRIOS`, DSCP 0, 32, 34, 40, 46, 48) ; avertissement si « game traffic first » est coupé (le marquage n'est alors pas posé) ;
  - **MTU** : keep (`mtuMode` 0), auto (1), set (2, champ de 576 à 1500) ;
  - **fenêtre de réception** (`tuning`, 0 à 6) ;
  - **contrôle de congestion** (`congestion`, 0 à 5). **BBR2 (5) n'est proposé que sous Windows 11**, sauf s'il est déjà choisi.

### Bloc « expert »
- Chaque valeur que les curseurs calculent peut rester **Auto** ou être **forcée** (`NetExpert`, `null` = Auto). Neuf tuiles :

  | Réglage | Plage | Pas |
  |---|---|---|
  | `minRto` | 20 à 300 ms | 10 |
  | `initialRto` | 300 à 3000 ms | 100 |
  | `ackFrequency` | 1 à 255 | 1 |
  | `ackTimeout` | 10 à 600 ms | 10 |
  | `icw` (fenêtre initiale) | 2 à 64 paquets | 1 |
  | `dscp` | 0 à 63 | 1 |
  | `timestamps`, `ecn`, `interruptModeration` | auto · {valeur} / on / off | — |

- Les nombres se règlent avec un `Stepper` (−, champ, +, bouton de retour en Auto). Un avertissement (`no.x.warn.*`) s'affiche quand une valeur forcée est risquée.
- En-tête : bouton « all auto ». Note de bas de bloc.

### « tools » (les outils du moteur)
- Quatre boutons : **stability test** (`quality`), **bufferbloat test** (`loaded`), **measure mtu** (`mtu`), **current state** (`status`). Voir [[NetTools.tsx]] pour leurs résultats.
- Le résultat s'affiche dans un panneau sous la rangée : titre, description, croix. Pendant l'outil : segments d'avancement et étape en cours (traduite par `engineText`).
- Le bufferbloat télécharge : le panneau **demande d'abord** (texte `no.tool.loaded.confirm`, bouton « run »).
- « Turn on packet loss tolerance », sous un résultat instable, coche « loss tolerance » (Premium seulement).
- **Gratuits** : les outils marchent sans licence (le moteur ne la demande que pour `apply`).
- Note honnête en bas (`no.honest.*`) : ce qu'aucun optimiseur ne fait.

### « find my preset » (`analyse` et `ScanPanel`)
1. Carte réseau (`detect`).
2. Processeur et Windows : lus dans `sys` du store.
3. Ligne : `api.netTest(["internet"])`, 40 pings vers Cloudflare, avec 40 segments d'avancement.
4. `recommend(avant, { wifi, threads }, mesure)` de [[netopt.ts]] choisit le profil et ses raisons.
5. Le panneau du haut montre les étapes (faite, en cours, à venir) à gauche, et à droite le profil conseillé en grand, les raisons et une note.
6. Les réglages conseillés sont **posés tout de suite dans la page** (et dans le brouillon), **pas appliqués**. Boutons « Apply these settings » (lance `apply`) et « Keep mine » (remet les réglages d'avant ; la croix fait pareil, active seulement à la fin).

### La barre du bas (`Bar`)
- Posée dans la fenêtre (`createPortal` dans `.win`), à la place de la barre des réglages ([[ApplyBar.tsx]], cachée sur cet onglet). Contenu : le nom du profil, l'état, « log » (s'il y a un journal), « restore » et le bouton principal.
- États :
  - « not applied yet » ou « changes not applied », avec « drops for a few seconds » (la connexion coupe à l'application) ;
  - « applied » et la date ;
  - « applying » / « restoring », avec l'étape en cours et une barre de progression ;
  - après une action : « applied » ou « restored » et « {n} settings · {n} warning » ; « failed » en cas d'erreur ;
  - sans licence : « part of premium » et « restore stays free ».
- Bouton principal : « apply » ; « restart » (`api.restartPc()`) juste après une application réussie ; « Get Premium » sans licence.
- « restore » ouvre un menu : « mes réglages d'origine » (`restore`, grisé sans sauvegarde) ou « valeurs de Windows » (`defaults`). Grisé s'il n'y a ni application ni sauvegarde.
- Erreurs : `busy` → `no.busy` ; `premium_scripts_unavailable` → `err.premium_scripts_unavailable` ; `premium_required` (le serveur refuse d'appliquer, licence perdue entre-temps) → la fenêtre Premium d'un réglage (`setUpsell("tweak")`, comme avant la v5 ; gardée, décision de Sofiene du 27/11, q112 : « non on garde cette fenêtre ») ; autre → message brut.
- Après une réussite, le brouillon est effacé.

### Sans licence (nouveau le 23/11)
- Le vrai écran s'affiche, verrouillé (classe `lkd`) : les profils, curseurs, interrupteurs, « find my preset » et les blocs ouvrent l'offre Premium générale (`setUpsell("plan")`, [[Upsell.tsx]]) ; « advanced » et « expert » ne se déplient pas.
- **DÉCIDÉ** (Sofiene, 27/11, q117 : « je suis d'accord va pour A ») : on garde ce choix de la refonte (la maquette n'a pas d'écran gratuit) ; aucun changement de code ([[Décisions]]).
- **Les outils restent gratuits.**
- **« restore » reste gratuit** : sans menu, il lance `restore` s'il existe une sauvegarde, sinon `defaults`. C'est ce qui permet à un ancien abonné de remettre sa connexion comme avant.

## Données touchées
- `localStorage` : `rago.netoptDraft` (brouillon, via [[netopt.ts]]) et `rago.netoptFolds` (blocs ouverts).
- Windows : réglages réseau, alimentation et priorités, posés par [[netopt.rs]].
- La mesure de l'analyse passe par `net_test` : elle est aussi envoyée au serveur Rago ([[netshare.rs]]).

## Erreurs et cas limites
- Une seule action ou un seul outil à la fois (`busy`). Pendant l'analyse, « apply » est grisé.
- Les réponses arrivées après la fermeture de l'onglet sont ignorées (`live`).
- `same()` compare les réglages en JSON : un ordre de clés différent dans `expert` compterait comme un changement (OBSERVÉ dans le code, sans effet connu).

## Liens avec le reste
- Fonctionnalité : [[Packet Optimizer]]. Formules, profils, conseil : [[netopt.ts]]. Moteur : [[netopt.rs]].
- Composants : [[NetTools.tsx]], `I` et `Seg` de `s5/I` ([[Maquettes v5 dans l'app (s5)]]).
- Textes : `s5.no.*` (écran) et `no.*`, `an.*` (descriptions, avertissements, analyse) de [[i18n.ts]]. Styles : bloc « Packet Optimizer » de `s5/app.css` et `s5/pages/net.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Une nouvelle option : l'ajouter d'abord dans `Options` de [[netopt.rs]] (avec ses tests), puis dans `NetOptions` et `NET_DEFAULTS` de [[netopt.ts]], puis ici.
- Le moteur ne lit pas les valeurs affichées : changer une formule seulement dans [[netopt.ts]] ferait mentir le tableau avant/après.
- L'écran sans licence doit garder « restore » : sans lui, un joueur dont l'abonnement a pris fin ne peut plus remettre sa connexion d'origine depuis l'app.
- Les classes de cette page croisent celles de `module.css` (`.run`, `.ck`, `.pop`) : le panneau d'outil en cours s'appelle `busy` et le menu du type de connexion `lmenu` pour cette raison.
