---
type: code
tags: [code, app, react, page, reseau]
fichier: app/src/pages/NetOpt.tsx
lignes: 1090
maj: 2026-11-10
---
# NetOpt.tsx

L'onglet **« Packet Optimizer »** de la page Réseau. Il propose :
- 6 profils ;
- des curseurs et des interrupteurs ;
- un bloc « Avancé » et un bloc « Réglages experts » ;
- le tableau « Ce qui change » (valeurs de Windows avant et après) ;
- « Analyser mon PC » ;
- Appliquer et Restaurer, avec le journal du moteur.

Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Packet Optimizer]]. Logique partagée : [[netopt.ts]]. Côté Rust : [[netopt.rs]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Affiché par [[Network.tsx]] quand l'onglet est `netopt`. On y arrive aussi depuis le conseil et la « ligne instable » de [[NetTest.tsx]]. La recherche ([[SearchPalette.tsx]]) ne mène qu'aux réglages du catalogue, pas à cet onglet, même si le commentaire de [[Network.tsx]] dit le contraire (OBSERVÉ).
- **Entièrement Premium depuis la 1.3.0** (décision de Sofiene du 10/11, PR #76, commentaire dans le code). Sans licence, l'onglet montre seulement une **vue fermée** (voir plus bas). Le moteur refuse aussi `apply` sans licence active (`premium_required:netopt`, [[lib.rs]]) et a besoin des scripts Premium (`premium_scripts_unavailable`).
- Toutes les actions passent par `api.netOptRun(action, options)` (commande `netopt_run`). Le moteur reçoit **les choix** (`NetOptions`), jamais les valeurs calculées : le calcul de [[netopt.ts]] (`computeNet`) ne sert qu'à l'affichage.

## Ce que le fichier expose
- `NetOpt()` : l'onglet.
- Composants internes :
  - `Fold` : bloc repliable ;
  - `Changes` : tableau avant/après ;
  - `ScanPanel` : « Analyser mon PC » ;
  - `Summary` : résultat d'une action ;
  - `Log` : journal du moteur ;
  - `Slider`, `Select`, `Toggle` ;
  - `Expert` et `Stepper` : réglages experts.
- Constantes internes : `PRESET_ICONS`, `FOLDS` (`rago.netoptFolds`), `LINE_SAMPLES` (40), `NUM_ROWS`, `GROUPS`.

## Fonctionnement détaillé

### Vue fermée (sans licence)
- Cadenas, titre « Le Packet Optimizer fait partie de Premium », phrase d'accroche (`no.lead`).
- Trois points :
  - l'analyse de la carte et de la ligne, puis le bon profil ;
  - 6 profils et chaque réglage à la main ;
  - Restaurer remet la connexion comme avant.
- Bouton **« Passer Premium »** : `setUpsell("plan")`, voir [[Upsell.tsx]].
- Bouton **« Restaurer »**, seulement si quelque chose a été appliqué ou sauvegardé. Il lance `restore` s'il existe une sauvegarde, sinon `defaults`. C'est ce qui permet à un ancien abonné de **remettre sa connexion comme avant sans licence**, et le moteur l'accepte.

### Chargement (Premium)
- Réglages affichés :
  - le brouillon s'il existe (`loadDraft()`, `rago.netoptDraft`) ;
  - sinon les réglages de la dernière application (`netOptState().applied.options`) ;
  - sinon `NET_DEFAULTS`.
- `netOptRun("detect")` lit la carte réseau utilisée (nom, description, vitesse, Wi-Fi ou câble), affichée en « Connexion détectée : … ».
- À la toute première visite (ni brouillon ni application), une carte Wi-Fi règle le type de ligne sur Wi-Fi (`line` 5, `wifi` vrai).
- Événements écoutés :
  - **`netopt:line`** : lignes du moteur (`progress` pour la barre, le reste pour le journal) ;
  - **`nettest:sample`** : avancement des 40 pings de l'analyse, serveur `internet`.

### Carte du haut
- **État** :
  - « Pas encore appliqué. Tes réglages actuels sont gardés à la première application. » ;
  - ou « Appliqué {date} · {profil} » ;
  - plus « Changements pas encore appliqués » si les réglages affichés diffèrent de ceux appliqués (`same`, qui ne tient pas compte du nom du profil).
- **Boutons** :
  - « Analyser mon PC » ;
  - « Restaurer », un menu de deux choix :
    - « Mes réglages d'origine » (`restore`, gardés avant la première application ; grisé sans sauvegarde) ;
    - « Valeurs de Windows » (`defaults`) ;
  - **« Appliquer »** (`apply`).
- Note fixe : « Ta connexion se coupe quelques secondes pendant que la carte réseau redémarre. ».
- **Pendant une action** :
  - barre de progression (lignes `progress`) ;
  - titre de l'étape en cours, traduit par `engineText` de [[netopt.ts]] ;
  - à la fin, `Summary` : « {ok} réglages posés » / « Réglages d'origine remis » / « Valeurs de Windows remises », avec les avertissements et les erreurs.
- Après une réussite :
  - « Redémarre le PC pour finir », avec un bouton qui appelle `api.restartPc()` ;
  - le brouillon est effacé.
- Lien « Journal » : le détail des lignes du moteur. Il reste en anglais, sauf les titres.
- **Erreurs** :
  - `busy` (un lot ou une remise à zéro tourne) → texte `no.busy` ;
  - `premium_scripts_unavailable` → texte `err.premium_scripts_unavailable` ;
  - `premium_required` → fenêtre Premium ;
  - autre → message brut.

### Profils (`PRESETS`)
- 6 boutons radio : Hitreg, Knockback, Équilibré, Wi-Fi, Pertes de paquets, Old-school.
- Un clic appelle `applyPreset` de [[netopt.ts]] (valeurs de chaque profil dans cette fiche).
- Le profil conseillé par l'analyse porte une étiquette (`an.tag`).
- Toucher un réglage à la main fait passer le profil à « Personnalisé » (`preset: "custom"`).

### « Réglages » (toujours visibles)
- **Curseur « Latence »** (`latency`) : le texte du milieu dit combien de tampons de la carte sont coupés (`buffersOff`, sur 6).
- **Curseur « Réactivité »** (`responsiveness`) :
  - trois raccourcis : 0 « retardé », 50 « équilibré », 100 « réactif » ;
  - la ligne d'info donne le RTO initial et `SystemResponsiveness` calculés.
- **Listes** :
  - « Fenêtre TCP » (`tuning` 0 à 6 ; Auto affiche la valeur choisie pour la ligne) ;
  - « Type de connexion » (`line` 1 à 7 ; choisir Wi-Fi coche l'option Wi-Fi, quitter Wi-Fi la décoche).
- **Interrupteurs** :
  - « intelligent » (`smart`) ;
  - « tolérance aux pertes » (l'inverse de `stable`) ;
  - « compétitif » (`competitive`).

### Bloc « Avancé » (replié, résumé sur une ligne)
- **MTU** :
  - automatique (interrupteur, `mtuMode` 1, avec le champ **serveur** de mesure vérifié par `validTarget` de [[NetTools.tsx]]) ;
  - ou une valeur à la main (`mtuMode` 2, de 576 à 1500) ;
  - champ vide → « laisser » (`mtuMode` 0).
- **Curseur « Délai »** (`delay`) : la ligne d'info donne la fréquence et le délai des ACK, et Nagle coupé ou non.
- **Curseur « Priorité »** (`priority`) : affiche le DSCP et son nom. Un avertissement apparaît si « intelligent » est coupé (le marquage n'est alors pas posé).
- **Liste « Contrôle de congestion »** (`congestion`, 0 à 5). **BBR2 (5) n'est proposé que sous Windows 11** (`sys.isWin11`), sauf s'il est déjà choisi.
- **Interrupteurs** : mode priorité, économie d'énergie de la carte, Wi-Fi, protection contre l'arrière-plan.

### Bloc « Réglages experts » (replié)
- Chaque valeur que les curseurs calculent peut rester **Auto** ou être **forcée** (`NetExpert`, `null` = Auto).
- Valeurs numériques, réglées avec un `Stepper` :

  | Réglage | Plage | Pas | Avertissement si forcé |
  |---|---|---|---|
  | `minRto` | 20 à 300 ms | 10 | sous 60 ms |
  | `initialRto` | 300 à 3000 ms | 100 | — |
  | `icw` (fenêtre initiale) | 2 à 64 paquets | 1 | au-dessus de 32 |
  | `ackFrequency` | 1 à 255 | 1 | au-dessus de 2 |
  | `ackTimeout` | 10 à 600 ms | 10 | au-dessus de 200 ms |
  | `dscp` | 0 à 63 | 1 | si « intelligent » est coupé |

- Valeurs oui/non (Auto / Activé / Désactivé) : `timestamps`, `ecn` (avertissement s'il est forcé à Activé), `interruptModeration`.
- Chaque ligne rappelle la plage, la valeur de Windows et la valeur Auto.
- Groupes affichés : renvoi, ACK, envoi, carte.
- En bas : « {n} réglages forcés » et un bouton qui remet tout en Auto.

### Colonne de droite
- **« Ce qui change »** (`Changes`) : 11 lignes, la valeur de Windows (`WINDOWS_VALUES`) barrée puis la nouvelle :
  - tampons coupés ;
  - modération des interruptions ;
  - min RTO ;
  - RTO initial ;
  - ACK ;
  - Nagle ;
  - DSCP ;
  - fenêtre TCP ;
  - `SystemResponsiveness` ;
  - horodatage TCP ;
  - MTU.
- **État actuel** : l'outil `status` de [[NetTools.tsx]] (lecture des valeurs réelles de Windows, sans rien changer).
- **« Ce qu'aucun optimiseur ne fait »** : le ping dépend de la distance et de l'opérateur. Le texte donne ce qui aide le plus : câble, personne d'autre qui télécharge, FPS stables, serveur plus proche.

### « Analyser mon PC » (`analyse` et `ScanPanel`)
1. Carte réseau (`detect`).
2. Processeur et Windows : lus dans `sys` du store, sans appel au moteur.
3. Ligne : `api.netTest(["internet"])`, 40 pings vers Cloudflare, avec une barre d'avancement.
4. `recommend(avant, { wifi, threads }, mesure)` de [[netopt.ts]] choisit le profil et donne les raisons (clés `an.why.*`).
5. Les réglages conseillés sont **posés tout de suite dans la page** (et dans le brouillon). Ils ne sont **pas appliqués**.
6. Boutons :
   - **« Appliquer ces réglages »** : ferme le panneau et lance `apply` ;
   - **« Garder les miens »** : remet les réglages d'avant l'analyse. Le brouillon est effacé s'ils sont égaux à ceux appliqués.
   - La croix du panneau fait comme « Garder les miens ». Elle n'est active qu'à la fin de l'analyse.
- Si la carte n'est pas trouvée, c'est le type de connexion choisi dans la page qui décide du Wi-Fi.

## Données touchées
- `localStorage` : `rago.netoptDraft` (brouillon, via [[netopt.ts]]) et `rago.netoptFolds` (blocs ouverts ou repliés).
- Windows : réglages réseau, alimentation et priorités, posés par [[netopt.rs]]. La sauvegarde d'origine et l'état appliqué sont gardés par le moteur.
- La mesure de l'analyse passe par `net_test` : elle est donc aussi envoyée au serveur Rago ([[netshare.rs]]), comme celle de [[NetTest.tsx]].

## Erreurs et cas limites
- Une seule action à la fois (`busy`). Pendant l'analyse, Appliquer est grisé.
- Les réponses arrivées après la fermeture de l'onglet sont ignorées (`live`).
- `same()` compare les réglages en JSON : un ordre de clés différent dans `expert` compterait comme un changement (OBSERVÉ dans le code, sans effet connu).

## Liens avec le reste
- Fonctionnalité : [[Packet Optimizer]]. Formules, profils, conseil : [[netopt.ts]]. Moteur : [[netopt.rs]].
- Composants : [[NetTools.tsx]] (`Tool` « État actuel », `validTarget`), `Button`, `Segmented`, `Switch` ([[Petits composants de l'interface]]).
- Textes : clés `no.*` (page) et `an.*` (analyse) de [[i18n.ts]]. Styles : sections « Packet Optimizer », « Avancé / Réglages experts » et « Analyser mon PC » de `features.css` ([[Styles de l'app (CSS)]]).

## À savoir avant de modifier
- Une nouvelle option : l'ajouter d'abord dans `Options` de [[netopt.rs]] (avec ses tests), puis dans `NetOptions` et `NET_DEFAULTS` de [[netopt.ts]], puis ici.
- Le moteur ne lit pas les valeurs affichées : changer une formule seulement dans [[netopt.ts]] ferait mentir le tableau « Ce qui change ».
- La vue fermée doit garder « Restaurer » : sans lui, un joueur dont l'abonnement a pris fin ne peut plus remettre sa connexion d'origine depuis l'app.
