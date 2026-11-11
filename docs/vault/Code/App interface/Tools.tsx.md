---
type: code
tags: [code, app, react, page, outils]
fichier: app/src/pages/Tools.tsx
lignes: 760
maj: 2026-11-11
---
# Tools.tsx

La **page Outils** : tous les outils de l'app au même endroit. Quatre tuiles « En un clic », cinq cartes d'entretien du PC (nettoyage, applis au démarrage, applis préinstallées, réglages Windows utiles, pilotes) et la liste de toutes les actions à bouton « Lancer » des autres onglets. Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Page Outils]]. Côté Rust : [[tools.rs]] (et les commandes de [[lib.rs]]).

Statut : les cartes Nettoyage, Applis préinstallées et Pilotes sont CONFIRMÉES (code de `staging`, 10/11, commit `ee77d4f`). Les tuiles « En un clic », les cartes Applis au démarrage et Réglages Windows utiles, la zone « Cache des launchers » et la liste « Tous les outils de l'app » viennent de la **PR #90** (11/11, fusionnée dans `staging` par la PR #92) : CONFIRMÉES dans le code de `staging` et dans la démo du navigateur, **jamais testées sur Windows**.

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "tools"`. Entrée « Outils » dans le groupe « Optimiser » de la [[Sidebar.tsx]], avec une puce « Nouveau » tant que la page n'a pas été vue : clés `tools` et `tools.v2` de [[seen.ts]]. La page pose `tools.v2` (`TOOLS_SEEN`, exporté pour la barre latérale) à chaque ouverture : les joueurs qui avaient déjà vu l'ancienne page revoient la puce une fois.
- **Toute la page est gratuite** : aucune vérification de licence ni dans la page, ni dans les commandes Rust (`tools_scan`, `tools_clean`, `tools_apps`, `tools_remove_apps`, `tools_drivers`, `tools_windows_update`, et depuis la PR #90 `tools_startup`, `tools_set_startup`, `tools_power_plans`, `tools_set_power_plan`, `tools_flush_dns`, `tools_open`). Seule exception : les lignes de « Tous les outils de l'app » gardent le verrou Premium de leur réglage (voir plus bas). Le commentaire de [[lib.rs]] sur `tools_remove_apps` dit « gratuite depuis la 1.2.2 » ; la 1.2.2 n'est jamais sortie seule (elle part avec la 1.3.0, voir [[Version 1.3.0]]). Le commentaire « Premium » qui restait au-dessus de `toolsRemoveApps` dans [[api.ts]] est corrigé dans la PR #90.
- Elle ne passe pas par le store pour ses actions : chaque carte appelle [[api.ts]] directement et garde son propre état local. Du store ([[store.tsx]]), elle lit `t`, `lang`, `cleanTrim` (option des [[Paramètres de l'app]]) et `goTo`.

## Ce que le fichier expose
- `Tools()` : la page (en-tête « Entretien » / « Outils » / phrase d'accroche, puis `QuickTools`, la grille `tools-grid` des cinq cartes dans l'ordre Nettoyage, Applis au démarrage, Applis préinstallées, Réglages Windows utiles, Pilotes, puis `AllTools`).
- `TOOLS_SEEN = "tools.v2"` (exporté).
- Fonctions internes : `Tile`, `QuickTools()`, `Startup()`, `Panels()`, `AllTools()`, `useSize()` (taille lisible), `Cleaner()`, `Apps()`, `Drivers()`, `linkFor(table, texte)`.
- Constantes internes : `AREA_ICONS`, `AREA_DEFAULT`, `APP_KEEP`, `VENDORS`, `MAKERS`, `PANELS`, `KIND_ICONS`.

## Fonctionnement détaillé

### Tuiles « En un clic » (`QuickTools`, PR #90)
Quatre tuiles (`Tile` : icône, titre, phrase, zone de résultat `aria-live`, bouton), sur 4 colonnes, 2 sous 1100 px de large.
- **Vider le cache de la RAM** : `api.cleanRam(cleanTrim)`, le même moteur que « Nettoyer » du [[Tableau de bord]] ([[memory.rs]]), avec l'option « réduire aussi les applis en arrière-plan ». Mêmes textes que le tableau de bord : « {n} Go de cache vidés » (à partir de 50 Mo), sinon « Cache déjà vide » ; « {gb} Go rendus par {n} applis » si des applis ont été réduites ; « Nettoyage impossible, réessaie » en cas d'échec.
- **Vider le cache DNS** : `api.toolsFlushDns()` ; « Cache DNS vidé. » ou « Windows n'a pas pu vider le cache DNS. Réessaie dans un instant. ».
- **Mode d'alimentation** : `api.toolsPowerPlans()` au montage ; liste de boutons radio (le mode actif coché, noms donnés par Windows dans sa langue). Un clic sur un autre mode : `api.toolsSetPowerPlan(guid)`, qui renvoie la liste à jour. Refus : « Windows a refusé le changement. Ce mode est peut-être imposé par une entreprise ou une école. », puis la liste est relue. Liste vide : « Windows ne donne pas ses modes d'alimentation sur ce PC. ».
- **Tester ma connexion** : bouton « Ouvrir », `goTo("nettest")` : onglet Test de la page Réseau ([[Network.tsx]], [[Test réseau]]).

### Carte « Nettoyage » (`Cleaner`)
- Au montage, `api.toolsScan()` (commande `tools_scan`) mesure les 9 zones : `temp`, `windows_temp`, `update`, `crash`, `browsers`, `discord`, `launchers` (PR #90), `shaders`, `recycle`. Pendant la mesure, la liste montre les zones cochées d'office avec « … ».
- **Cochées d'office** (`AREA_DEFAULT`) : toutes sauf `shaders` (les jeux recompilent leurs shaders et saccadent au premier lancement) et `recycle` (la corbeille ; le texte d'aide prévient que les vérificateurs de screenshare la regardent).
- Zone « Cache des launchers » (icône manette) : « Steam et Epic Games : le cache de la boutique et de leurs pages, recréé tout seul. Jamais tes jeux. ».
- Une zone vide (0 octet) est grisée et affiche « Rien ». Les cases sont bloquées pendant une mesure ou un nettoyage.
- Le gros chiffre en haut est la somme des zones cochées et non vides ; dessous : « à libérer sur {all} trouvés ».
- Bouton « Analyser à nouveau » (icône qui tourne pendant la mesure).
- Bouton principal « Nettoyer {size} » : `api.toolsClean(ids)` (commande `tools_clean`), puis nouvelle mesure. Désactivé si rien à libérer. Après coup, le pied de carte affiche « {size} libérés. » et, si des fichiers étaient en cours d'utilisation, « {n} fichiers en cours d'utilisation sont restés en place. ».
- Avant le nettoyage, le pied de carte rappelle : « Les fichiers supprimés ne reviennent pas. Tes jeux, tes documents et Minecraft ne sont jamais touchés. »
- Le texte de la zone `browsers` promet : le cache seulement, jamais l'historique, les mots de passe ni les cookies. C'est [[tools.rs]] qui tient cette promesse.

### Carte « Applis au démarrage » (`Startup`, PR #90)
- Au montage, `api.toolsStartup()` (commande `tools_startup`). En haut à droite : « {on} sur {n} démarrent avec Windows ».
- Phrase d'accroche : « Tout ce qui démarre avec Windows rallonge le démarrage et tourne pendant tes parties. Steam, Epic, Discord, Spotify ou Edge n'en ont pas besoin : tu les ouvres quand tu veux. »
- Une ligne par programme (ordre alphabétique de [[tools.rs]], les programmes gardés à la fin) : nom, éditeur et « Tous les comptes » si l'entrée vaut pour tout le PC ; la commande complète en info-bulle ; un interrupteur (`Switch`). Une ligne coupée est atténuée (classe `off`).
- Programme gardé (`keep`) : cadenas et « Gardé : Windows ou ton matériel en a besoin. », interrupteur grisé tant qu'il est allumé (s'il était déjà coupé, on peut le rallumer).
- Un clic : `api.toolsSetStartup(id, enabled)` (commande `tools_set_startup`), qui renvoie la liste à jour ; pendant l'écriture, une icône qui tourne remplace l'interrupteur et les autres sont bloqués. Refus : « Windows a refusé le changement pour « {name} ». Réessaie, ou passe par le Gestionnaire des tâches. ».
- Pied de carte : « Couper un programme ne le désinstalle pas : il ne démarre plus avec Windows, c'est tout. Tu le rallumes ici ou dans le Gestionnaire des tâches. Effet au prochain démarrage du PC. »
- Liste vide : « Rien ne démarre avec Windows : ton démarrage est déjà propre. ». La liste défile dans la carte (hauteur d'au moins 240 px, alignée sur la carte voisine).

### Carte « Applis préinstallées » (`Apps`)
- Au montage, `api.toolsApps()` (commande `tools_apps`) liste les applis préinstallées ou sponsorisées présentes. Le Store, Xbox et la Game Bar ne sont jamais proposés (texte `tools.apps.lead`, liste tenue par [[tools.rs]]).
- **Décochées d'office** (`APP_KEEP`, applis qu'on peut vraiment utiliser) : `MSTeams`, `MicrosoftTeams`, `Microsoft.OutlookForWindows`, `microsoft.windowscommunicationsapps`, `Microsoft.MicrosoftOfficeHub`, `Microsoft.YourPhone`, `SpotifyAB.SpotifyMusic`, `Microsoft.Todos`. Toutes les autres sont cochées.
- Le nom affiché vient de l'appli elle-même (`a.name[lang]`, en français ou en anglais).
- Désinstallation en **deux clics** : « Désinstaller {n} applis », puis « Oui, désinstaller ({n}) » ou « Annuler ». Appel `api.toolsRemoveApps(ids)` (commande `tools_remove_apps`), qui renvoie les applis encore là ; la carte affiche « {n} applis désinstallées. ».
- Liste vide : « Aucune appli préinstallée à retirer : ton Windows est déjà propre. » (ou « Tout est retiré » juste après une désinstallation).
- Rappel en bas : chaque appli se réinstalle depuis le Microsoft Store.

### Carte « Réglages Windows utiles » (`Panels`, PR #90)
- « Les réglages de Windows qu'on cherche toujours, ouverts en un clic. » Dix boutons (`PANELS`, une icône chacun), un par ligne : Paramètres graphiques (carte graphique de chaque jeu, planification GPU), Affichage avancé (fréquence maximale de l'écran en Hz), Mode Jeu de Windows, Son (sorties, entrées et mode exclusif), Souris (vitesse et précision du pointeur), Connexions réseau (cartes, adresse IP et DNS), Options d'alimentation (réglages avancés de chaque mode), Gestionnaire de périphériques, Effets visuels (animations et mémoire virtuelle), Gestionnaire des tâches.
- Un clic : `api.toolsOpen(id)` (commande `tools_open`) ; une erreur est ignorée. Le programme lancé est choisi côté Rust, dans une liste fermée ([[tools.rs]]).

### Carte « Pilotes » (`Drivers`)
- Au montage, `api.toolsDrivers()` (commande `tools_drivers`) renvoie les pilotes de la carte graphique, du réseau et de l'audio, plus le fabricant et le modèle de la carte mère.
- Pour chaque pilote : icône du type, nom, type et fournisseur, version, date et âge (« il y a 3 mois », « il y a 2 ans », via `Intl.RelativeTimeFormat`).
- **Pilote ancien** (point orange, classe `old`) : plus de 6 mois pour la carte graphique (correctifs des jeux récents), plus de 24 mois pour le reste. Point vert sinon.
- Bouton « Site officiel » : le site du fournisseur trouvé dans `VENDORS` (NVIDIA, AMD/ATI/Radeon, Intel/Killer) ; sinon le site du fabricant de la carte mère (`MAKERS` : ASUS, MSI, Gigabyte/Aorus, ASRock, Lenovo, HP, Dell/Alienware, Acer/Predator, Razer, Samsung, Microsoft Surface). Ouverture par `api.openUrl` (le front n'ouvre rien lui-même).
- Ligne « carte mère » à la fin si le fabricant est connu, avec « Site du fabricant ».
- Bouton en haut « Mises à jour facultatives de Windows » : `api.toolsWindowsUpdate()` ouvre `ms-settings:windowsupdate-optionalupdates`.
- Note fixe : « Rago Optimizer n'installe aucun pilote : prends-les toujours sur le site officiel. »

### « Tous les outils de l'app » (`AllTools`, PR #90)
- Titre, nombre total et « Les actions à lancer des autres onglets, réunies ici. Elles restent aussi à leur place. »
- Parcourt les modules du catalogue ([[catalog.ts]]) dans l'ordre et garde les réglages `kind: "action"` (bouton « Lancer ») de chaque section (`sectionTweaks`). Deux jumeaux (même script sous deux noms, `distinctKey`) ne comptent qu'une fois : le premier rencontré. Au catalogue du 11/11 : **17 actions, 15 lignes** (Réseau 1, Latence 3, Carte graphique 1, Windows 6, Restaurer 4).
- Un groupe par module : nom de l'onglet, nombre, lien « Voir dans {nom} » (`goTo(module)`).
- Chaque ligne est un [[TweakRow.tsx]], exactement comme dans l'onglet : même verrou Premium, même `requestApply` (fenêtre de confirmation et de lancement), même historique. Les actions restent dans leur onglet.

## Données touchées
- Aucune donnée gardée par la page, sauf la clé « vue » `tools.v2` ([[seen.ts]]). Le nettoyage supprime des fichiers et la désinstallation retire des applis : les deux sont faits par [[tools.rs]], **sans sauvegarde** (rien n'est inscrit dans l'historique ni dans la remise à zéro). Couper un programme au démarrage, changer de mode d'alimentation ou vider le cache DNS ne passe pas non plus par l'historique : ces changements se défont depuis la page elle-même (ou le Gestionnaire des tâches, ou Windows). Les actions de « Tous les outils de l'app » passent par le moteur des réglages, comme dans leur onglet.

## Erreurs et cas limites
- Cartes Nettoyage, Applis préinstallées et Pilotes : les appels n'ont pas de `catch` ; si une commande échoue, l'état `busy` est remis à zéro (`finally`) mais aucun message n'est affiché. Si `toolsApps` ou `toolsDrivers` échoue, la carte reste sur « Recherche… » / « Lecture… » (OBSERVÉ dans le code, pas vu sur Windows).
- Tuiles et cartes de la PR #90 : chaque échec affiche un message (voir plus haut) ; une lecture qui échoue donne une liste vide.
- Les effets ignorent une réponse arrivée après la fermeture de la page (`live = false`).

## Simulateur
Avec `npm run window`, [[api.ts]] simule : 9 zones mesurées en 0,9 s (dont 914 Mo de cache des launchers) ; le nettoyage garde 8 % du cache des navigateurs et annonce 37 fichiers restés en place ; une liste d'applis qui se vide pour de bon ; trois pilotes (NVIDIA, réseau et audio Realtek) et une carte mère ASUS ; neuf programmes au démarrage (Discord, Epic Games, Microsoft Edge, OneDrive, Steam allumés, Spotify coupé, Riot Vanguard, Realtek et SecurityHealth gardés) ; trois modes d'alimentation (Balanced actif, High performance, Ultimate Performance) ; le cache DNS vidé en 0,6 s ; un raccourci écrit seulement dans la console.

## Liens avec le reste
- Fonctionnalité : [[Page Outils]]. Moteur : [[tools.rs]] et, pour la RAM, [[memory.rs]].
- Composants : `Button` et `Switch` de `ui.tsx` et `DiscordIcon` de `icons.ts` (voir [[Petits composants de l'interface]]), [[TweakRow.tsx]]. Textes : clés `tools.*` (et `live.*` pour la RAM) de [[i18n.ts]]. Styles : section « outils » de `features.css` (voir [[Styles de l'app (CSS)]]).
- Les réglages de nettoyage du module Windows (`cln_*`) sont une autre chose : ce sont des tweaks du [[Catalogue des tweaks]], gratuits eux aussi ([[free.json]]).

## À savoir avant de modifier
- Ajouter une zone de nettoyage : l'ajouter dans [[tools.rs]], dans le type `CleanAreaId` de [[api.ts]], dans `AREA_ICONS` (et `AREA_DEFAULT` si elle est cochée d'office), et écrire `tools.area.<id>` et `tools.area.<id>.hint` en français et en anglais dans [[i18n.ts]].
- Ajouter un raccourci Windows : `PANELS` de [[tools.rs]] (programme et argument), type `WindowsPanel` de [[api.ts]], `PANELS` ici (icône), textes `tools.panel.<id>` et `tools.panel.<id>.hint`.
- Une nouvelle action du catalogue (`kind: "action"`) apparaît toute seule dans « Tous les outils de l'app ». Pour la faire revenir dans la puce « Nouveau » de la barre latérale, changer `TOOLS_SEEN` (`tools.v3`…).
- Rendre une carte Premium serait un changement d'offre : décision de Sofiene (voir [[Décisions]]), et il faudrait aussi bloquer la commande côté Rust.
