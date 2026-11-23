---
type: code
tags: [code, app, react, page, outils]
fichier: app/src/pages/Tools.tsx
lignes: 792
maj: 2026-11-23
---
# Tools.tsx

La **page Outils**, refaite le 23/11 à l'identique de la maquette v5 `app-tools.html` (dans `staging` : PR #124, fusionnée le 23/11). En-tête avec la place à libérer, quatre cartes « en un clic », quatre panneaux d'entretien sur deux colonnes (nettoyage, applis au démarrage, applis préinstallées, réglages de Windows), les pilotes sur toute la largeur, puis toutes les actions à bouton « run » des autres onglets. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Page Outils]]. Côté Rust : [[tools.rs]] (et les commandes de [[lib.rs]]). Socle v5 : [[Maquettes v5 dans l'app (s5)]].

Statut : CONFIRMÉ dans le code de `staging` et dans la démo du navigateur (captures `26-…` à `29-…` de `rago-redesign/app-strict/`, positions des blocs identiques à la maquette au pixel près). **Jamais testé sur Windows.** Les commandes Rust n'ont pas changé : celles des cartes Nettoyage, Applis préinstallées et Pilotes datent de `ee77d4f` (10/11), les autres de la PR #90 (11/11).

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "tools"`. Entrée « Outils » dans le groupe « Optimiser » de la [[Sidebar.tsx]], sans badge « Nouveau » depuis le cadre v5 (PR #119). La page pose encore la clé `tools.v2` de [[seen.ts]] (`TOOLS_SEEN`) à chaque ouverture, que plus rien ne lit.
- **Toute la page est gratuite** : aucune vérification de licence ni dans la page, ni dans les commandes Rust (`tools_scan`, `tools_clean`, `tools_apps`, `tools_remove_apps`, `tools_drivers`, `tools_windows_update`, `tools_startup`, `tools_set_startup`, `tools_power_plans`, `tools_set_power_plan`, `tools_flush_dns`, `tools_open`). Seule exception : les carreaux de « all of the app's tools » gardent le verrou Premium de leur réglage (voir plus bas).
- Elle ne passe pas par le store pour ses actions : chaque bloc appelle [[api.ts]] directement et garde son propre état local. Du store ([[store.tsx]]), elle lit `t`, `lang`, `cleanTrim` (option des [[Paramètres de l'app]]) et `goTo`.
- Racine : `div.pg-mod.pg-tools.is-page`. Styles : `s5/pages/module.css` (socle commun des pages module : en-tête, titres de section `.sh`, `.panel`, carreaux, bouton `.run`), `s5/pages/tools.css` (généré par `rendus-v5/outils/port_tools.py` depuis `rendus-v5/src/tools.css`, chaque règle sous `.pg-tools`) et les retouches de `s5/app.css` (voir [[Styles de l'app (CSS)]]).

## Ce que le fichier expose
- `Tools()` : la page. Elle porte aussi l'état du nettoyage (zones mesurées, cochées, résultat), partagé avec l'en-tête.
- `TOOLS_SEEN = "tools.v2"` (exporté).
- Fonctions internes : `useSize()` (taille en deux morceaux, chiffre et unité), `keyToggle(go)` (cocher au clavier : espace ou entrée), `StatusLine`, `QuickTools()`, `Wait` (ligne d'attente ou de liste vide), `Startup()`, `Apps()`, `Panels()`, `Drivers()`, `AllTools()`, `linkFor(table, texte)`.
- Constantes internes : `AREAS` (les 9 zones dans l'ordre de [[tools.rs]]), `AREA_DEFAULT`, `APP_KEEP`, `VENDORS`, `MAKERS` (site et nom court du fabricant), `PANELS` (id et icône).

## Fonctionnement détaillé

### En-tête
- Surtitre « {entretien / maintenance} // {s5.tl.kick} » (« nettoyage, démarrage, mémoire, réseau, pilotes et réglages utiles ») et grand titre « outils » / « tools » (150 px jusqu'à 8 lettres, comme les pages module).
- À droite, le bloc rouge `.ping.sig` : la place à libérer (somme des zones cochées et non vides, « 7,3 » + « go »), dessous « à libérer, {all} trouvés » (l'unité n'est répétée que si elle change), et **une coche par zone** (9), allumée pour une zone cochée et non vide. Pendant la première mesure : « – » et « Analyse de ton PC… ».
- Sous l'en-tête, `div.nobar` (46 px), la place des onglets des autres pages.

### « En un clic » (`QuickTools`)
Quatre cartes `.panel.qt` (icône, titre, phrase, pied `.qf` avec le résultat à gauche et le bouton `.run` à droite). Une carte dont l'action a réussi prend un liseré rouge (`.done`).
- **Vider le cache de la RAM** (icône `ram`) : `api.cleanRam(cleanTrim)`, le même moteur que « Nettoyer » du [[Tableau de bord]] ([[memory.rs]]). Résultat : « {n} Go libérés » (`s5.tl.freed` : cache vidé, compté à partir de 50 Mo, plus la mémoire rendue par les applis réduites), sinon « Cache déjà vide » (gris), « Nettoyage impossible, réessaie » (rouge) en cas d'échec.
- **Vider le cache DNS** (icône `globe`) : `api.toolsFlushDns()` ; « Cache DNS vidé. » ou « Windows n'a pas pu vider le cache DNS. Réessaie dans un instant. » (rouge).
- **Mode d'alimentation** (icône `battery`) : `api.toolsPowerPlans()` au montage ; les modes en lignes `.plans` (rond rouge sur le mode actif, noms donnés par Windows dans sa langue), cliquables et utilisables au clavier (`role="radio"`). Un clic sur un autre mode : `api.toolsSetPowerPlan(guid)`, qui renvoie la liste à jour. Pied fixe : « Le plus performant pour jouer, un mode économe sur batterie. » ; refus : « Windows a refusé le changement. Ce mode est peut-être imposé par une entreprise ou une école. » (rouge), puis la liste est relue. Pendant la lecture : « Lecture des modes… » ; liste vide : « Windows ne donne pas ses modes d'alimentation sur ce PC. ».
- **Tester ma connexion** (icône `activity`) : bouton « Ouvrir » (flèche en coin), `goTo("nettest")` : onglet Test de la page Réseau ([[Network.tsx]], [[Test réseau]]).

### « Nettoyage » (colonne gauche)
- Au montage, `api.toolsScan()` (commande `tools_scan`) mesure les 9 zones : `temp`, `windows_temp`, `update`, `crash`, `browsers`, `discord`, `launchers`, `shaders`, `recycle`. Pendant la mesure, les 9 lignes affichent « … ».
- **Cochées d'office** (`AREA_DEFAULT`) : toutes sauf `shaders` (les jeux recompilent leurs shaders et saccadent au premier lancement) et `recycle` (la corbeille ; le texte d'aide prévient que les vérificateurs de screenshare la regardent).
- Titre de section avec le compte « 7,3 / 8,2 go » et le lien « Analyser à nouveau » (icône qui tourne pendant la mesure).
- Une ligne `.li` par zone, cliquable en entier (`role="checkbox"`, espace ou entrée au clavier) : case `.cb`, nom et aide, taille en gros (« 1,8 » + « Go »). Une zone décochée ou vide est grisée (`.off`) ; une zone vide (0 octet) affiche « 0 Mo » et ne se coche pas. Les cases sont bloquées pendant une mesure ou un nettoyage.
- Pied : « Les fichiers supprimés ne reviennent pas. Tes jeux, tes documents et Minecraft ne sont jamais touchés. » et le bouton rouge « Nettoyer {taille} » : `api.toolsClean(ids)` (commande `tools_clean`), puis nouvelle mesure. Désactivé si rien à libérer. Après coup, le pied affiche « {taille} libérés. » (coche rouge) et, si des fichiers étaient ouverts, « {n} fichiers en cours d'utilisation sont restés en place. ».
- Le texte de la zone `browsers` promet : le cache seulement, jamais l'historique, les mots de passe ni les cookies. C'est [[tools.rs]] qui tient cette promesse.

### « Applis au démarrage » (colonne droite)
- Au montage, `api.toolsStartup()` (commande `tools_startup`). Compte à côté du titre : « 7 / 9 démarrent avec windows » (`s5.tl.startCnt`). Phrase d'accroche : « Tout ce qui démarre avec Windows rallonge le démarrage et tourne pendant tes parties. Steam, Epic, Discord, Spotify ou Edge n'en ont pas besoin : tu les ouvres quand tu veux. »
- Une ligne par programme, **dans l'ordre alphabétique de [[tools.rs]]** comme la maquette (avant le 23/11, les programmes gardés allaient à la fin) : nom, éditeur et « Tous les comptes » si l'entrée vaut pour tout le PC ; la commande complète en info-bulle ; un interrupteur (`Sw` de `s5/ui.tsx`). Une ligne coupée est grisée (`.off`).
- Programme gardé (`keep`) : étiquette « gardé » avec un cadenas (info-bulle « Gardé : Windows ou ton matériel en a besoin. »), interrupteur bloqué tant qu'il est allumé et affiché à pleine couleur (s'il était déjà coupé, on peut le rallumer).
- Un clic : `api.toolsSetStartup(id, enabled)` (commande `tools_set_startup`), qui renvoie la liste à jour ; pendant l'écriture, tous les interrupteurs sont bloqués. Refus : « Windows a refusé le changement pour « {name} ». Réessaie, ou passe par le Gestionnaire des tâches. » en rouge dans le pied.
- Pied : « Couper un programme ne le désinstalle pas. Effet au prochain démarrage du PC. » (`s5.tl.startNote`, texte de la maquette).
- Pendant la lecture : « Lecture des programmes au démarrage… » ; liste vide : « Rien ne démarre avec Windows : ton démarrage est déjà propre. ».

### « Applis préinstallées » (colonne gauche)
- Au montage, `api.toolsApps()` (commande `tools_apps`) liste les applis préinstallées ou sponsorisées présentes ; un échec donne une liste vide. Le Store, Xbox et la Game Bar ne sont jamais proposés (texte `tools.apps.lead`, liste tenue par [[tools.rs]]). Compte : « 12 trouvées » (`s5.tl.found`).
- **Décochées d'office** (`APP_KEEP`, applis qu'on peut vraiment utiliser) : `MSTeams`, `MicrosoftTeams`, `Microsoft.OutlookForWindows`, `microsoft.windowscommunicationsapps`, `Microsoft.MicrosoftOfficeHub`, `Microsoft.YourPhone`, `SpotifyAB.SpotifyMusic`, `Microsoft.Todos`. Toutes les autres sont cochées.
- Cases `.bl` sur trois colonnes, cliquables et utilisables au clavier ; le nom vient de l'appli elle-même (`a.name[lang]`).
- Désinstallation en **deux clics** : « Désinstaller {n} applis », puis « Annuler » ou le bouton rouge « Oui, désinstaller ({n}) ». Appel `api.toolsRemoveApps(ids)` (commande `tools_remove_apps`), qui renvoie les applis encore là ; le pied affiche « {n} applis désinstallées. ».
- Pied par défaut : chaque appli se réinstalle depuis le Microsoft Store. Liste vide : « Aucune appli préinstallée à retirer : ton Windows est déjà propre. » (ou « Tout est retiré » juste après une désinstallation).

### « Réglages windows » (colonne droite, `Panels`)
- Titre « réglages windows » (`s5.tl.panels`), compte 10, « Les réglages de Windows qu'on cherche toujours, ouverts en un clic. ».
- Dix boutons `.pn` sur deux colonnes (icône, nom, aide, flèche en coin) : Paramètres graphiques (`gpu`), Affichage avancé (`monitor`), Mode Jeu de Windows (`pad`), Son (`volume`), Souris (`mouse`), Connexions réseau (`wifi`), Options d'alimentation (`power`), Gestionnaire de périphériques (`board`), Effets visuels (`sparkles`), Gestionnaire des tâches (`list`).
- Un clic : `api.toolsOpen(id)` (commande `tools_open`) ; une erreur est ignorée. Le programme lancé est choisi côté Rust, dans une liste fermée ([[tools.rs]]).

### « Pilotes » (toute la largeur, `section.blockh.drv2`)
- Au montage, `api.toolsDrivers()` (commande `tools_drivers`) renvoie les pilotes de la carte graphique, du réseau et de l'audio, plus le fabricant et le modèle de la carte mère ; un échec donne une liste vide.
- Titre avec le compte « {anciens} / {n} anciens » (`s5.tl.drvCnt` ; la maquette écrit « over 2 years old », mais la règle est de 6 mois pour la carte graphique) et, à droite, le bouton « Mises à jour facultatives de Windows » : `api.toolsWindowsUpdate()` ouvre `ms-settings:windowsupdate-optionalupdates`.
- Une ligne par pilote : type (« carte graphique », « réseau », « audio »), nom, « version · date » (« 32.0.15.6614 · 15 Oct 2026 », `dayMonth` de `s5/text.ts` avec l'année), **âge** en durée (« 38 jours », « 3 ans » : jours jusqu'à 2 mois, puis mois jusqu'à 2 ans, puis années, via `Intl.NumberFormat` en unités) et le lien du site.
- **Pilote ancien** (âge en rouge, `.age.old`) : plus de 6 mois pour la carte graphique (correctifs des jeux récents), plus de 24 mois pour le reste. Sinon point vert lumineux (`.age.new`).
- Lien « Site officiel » : le site du fournisseur trouvé dans `VENDORS` (NVIDIA, AMD/ATI/Radeon, Intel/Killer) ; sinon « Site du fabricant », le site du fabricant de la carte mère (`MAKERS` : ASUS, MSI, Gigabyte/Aorus, ASRock, Lenovo, HP, Dell/Alienware, Acer/Predator, Razer, Samsung, Microsoft Surface). Ouverture par `api.openUrl` (le front n'ouvre rien lui-même).
- Ligne « carte mère » à la fin si le fabricant est connu : nom court du fabricant (`MAKERS`, Windows écrit par exemple « ASUSTeK COMPUTER INC. » → « ASUS ») et modèle, « Chipset, audio et réseau : sur le site du fabricant », lien « Site du fabricant ».
- Pied : « Rago Optimizer n'installe aucun pilote : prends-les toujours sur le site officiel. Le rouge signale un pilote ancien (plus de 6 mois pour la carte graphique, 2 ans pour le reste). ».

### « All of the app's tools » (`AllTools`)
- Bandeau `.allh` : titre « Tous les outils de l'app », nombre total et « Les actions à lancer des autres onglets, réunies ici. Elles restent aussi à leur place. ».
- Parcourt les modules du catalogue ([[catalog.ts]]) dans l'ordre et garde les réglages `kind: "action"` (bouton « run ») de chaque section (`sectionTweaks`). Deux jumeaux (même script sous deux noms, `distinctKey`) ne comptent qu'une fois : le premier rencontré. Au catalogue du 11/11 : **17 actions, 15 carreaux** (Réseau 1, Latence 3, Carte graphique 1, Windows 6, Restaurer 4).
- Un groupe `.agrp` par module : nom de l'onglet, nombre, lien « ouvrir {nom} » (`s5.tl.open`, `goTo(module)`), puis la grille `.tgrid`.
- Chaque carreau est un [[TweakRow.tsx]], exactement comme dans l'onglet : même verrou Premium, même `requestApply` (fenêtre de confirmation et de lancement), même historique (« Lancé le 21 nov. »). Les réglages à risque (`risk: "advanced"`) ont le liseré pointillé des réglages avancés (`adv`), comme dans la maquette (« Supprimer les applis préinstallées », « Réinitialiser le réseau »).

## Données touchées
- Aucune donnée gardée par la page, sauf la clé « vue » `tools.v2` ([[seen.ts]]). Le nettoyage supprime des fichiers et la désinstallation retire des applis : les deux sont faits par [[tools.rs]], **sans sauvegarde** (rien n'est inscrit dans l'historique ni dans la remise à zéro). Couper un programme au démarrage, changer de mode d'alimentation ou vider le cache DNS ne passe pas non plus par l'historique : ces changements se défont depuis la page elle-même (ou le Gestionnaire des tâches, ou Windows). Les actions de « all of the app's tools » passent par le moteur des réglages, comme dans leur onglet.

## Erreurs et cas limites
- Nettoyage : `toolsScan` et `toolsClean` n'ont pas de `catch` ; si une commande échoue, l'état `busy` est remis à zéro (`finally`) mais aucun message n'est affiché (OBSERVÉ dans le code, pas vu sur Windows).
- Applis préinstallées et Pilotes : une lecture qui échoue donne une liste vide (depuis le 23/11 ; avant, la carte restait sur « Recherche… »). Une désinstallation qui échoue ne montre pas de message.
- Cartes « en un clic » et applis au démarrage : chaque échec affiche un message (voir plus haut).
- Les effets ignorent une réponse arrivée après la fermeture de la page (`live = false`).
- Comme sur les pages module, la fenêtre de détail (`.pop`) des derniers carreaux dépasse sous la page : on peut défiler une centaine de pixels plus bas que la fin de la page.

## Simulateur
Avec `npm run window`, [[api.ts]] simule les valeurs de la maquette : 9 zones mesurées en 0,9 s (7,3 Go à libérer sur 8,2 trouvés) ; le nettoyage garde 8 % du cache des navigateurs et annonce 37 fichiers restés en place ; 12 applis préinstallées (9 cochées), une liste qui se vide pour de bon ; trois pilotes (carte graphique NVIDIA de 38 jours, réseau Realtek de 2023, audio Realtek de 2021) et une carte mère ASUS « ROG Strix B650-A Gaming WiFi » ; neuf programmes au démarrage (Discord, Epic Games, Microsoft Edge, OneDrive allumés ; Riot Vanguard, Realtek et SecurityHealth gardés ; Spotify et Steam coupés) ; trois modes d'alimentation (Balanced actif, High performance, Ultimate Performance) ; le cache DNS vidé en 0,6 s ; un raccourci écrit seulement dans la console. L'état de capture (Premium et dates des derniers lancements de la maquette) est `ls-tools.json`, fait par `mkstates.py` (outils de capture, hors dépôt).

## Liens avec le reste
- Fonctionnalité : [[Page Outils]]. Moteur : [[tools.rs]] et, pour la RAM, [[memory.rs]].
- Composants : `I` (icônes) et `Sw` (interrupteur) de `s5/` ([[Maquettes v5 dans l'app (s5)]]), [[TweakRow.tsx]]. Textes : clés `tools.*` et `s5.tl.*` (et `live.*` pour la RAM) de [[i18n.ts]].
- Les réglages de nettoyage du module Windows (`cln_*`) sont une autre chose : ce sont des tweaks du [[Catalogue des tweaks]], gratuits eux aussi ([[free.json]]).

## À savoir avant de modifier
- Ajouter une zone de nettoyage : l'ajouter dans [[tools.rs]], dans le type `CleanAreaId` de [[api.ts]], dans `AREAS` (et `AREA_DEFAULT` si elle est cochée d'office), et écrire `tools.area.<id>` et `tools.area.<id>.hint` en français et en anglais dans [[i18n.ts]]. L'en-tête prend une coche de plus tout seul.
- Ajouter un raccourci Windows : `PANELS` de [[tools.rs]] (programme et argument), type `WindowsPanel` de [[api.ts]], `PANELS` ici (icône de `s5/iconData.ts`), textes `tools.panel.<id>` et `tools.panel.<id>.hint`.
- Une nouvelle action du catalogue (`kind: "action"`) apparaît toute seule dans « all of the app's tools ». Pour la faire revenir dans la puce « Nouveau » de la barre latérale, changer `TOOLS_SEEN` (`tools.v3`…).
- Les styles de la maquette se régénèrent avec `python3 port_tools.py` (dossier `rendus-v5/outils/`) : ne pas éditer `s5/pages/tools.css` à la main.
- Rendre une carte Premium serait un changement d'offre : décision de Sofiene (voir [[Décisions]]), et il faudrait aussi bloquer la commande côté Rust.
