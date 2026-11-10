---
type: code
tags: [code, app, react, page, outils]
fichier: app/src/pages/Tools.tsx
lignes: 398
maj: 2026-11-10
---
# Tools.tsx

La **page Outils** : trois cartes d'entretien du PC (nettoyage des fichiers inutiles, applis préinstallées, pilotes). Fiche parente : [[Code de l'app (interface)]]. Fonctionnalité : [[Page Outils]]. Côté Rust : [[tools.rs]] (et les commandes de [[lib.rs]]).

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`).

## Rôle et place dans l'ensemble
- Affichée par [[App.tsx]] quand `page === "tools"`. Entrée « Outils » dans le groupe « Optimiser » de la [[Sidebar.tsx]], avec une puce « Nouveau » tant que la page n'a pas été vue ([[seen.ts]]).
- **Toute la page est gratuite** : aucune vérification de licence ni dans la page, ni dans les commandes Rust (`tools_scan`, `tools_clean`, `tools_apps`, `tools_remove_apps`, `tools_drivers`, `tools_windows_update`). Le commentaire de [[lib.rs]] sur `tools_remove_apps` dit « gratuite depuis la 1.2.2 » ; la 1.2.2 n'est jamais sortie seule (elle part avec la 1.3.0, voir [[Version 1.3.0]]). Le commentaire « Premium » au-dessus de `toolsRemoveApps` dans [[api.ts]] est en retard sur le code.
- Elle ne passe pas par le store pour ses actions : chaque carte appelle [[api.ts]] directement et garde son propre état local.

## Ce que le fichier expose
- `Tools()` : la page (en-tête « Entretien » / « Outils » / phrase d'accroche, puis la grille `tools-grid` des trois cartes).
- Fonctions internes : `useSize()` (taille lisible), `Cleaner()`, `Apps()`, `Drivers()`, `linkFor(table, texte)`.
- Constantes internes : `AREA_ICONS`, `AREA_DEFAULT`, `APP_KEEP`, `VENDORS`, `MAKERS`, `KIND_ICONS`.

## Fonctionnement détaillé

### Taille lisible (`useSize`)
Au-delà de 1 Go : un chiffre après la virgule, « Go » en français, « GB » en anglais. En dessous : des Mo arrondis, au moins 1 Mo si la zone n'est pas vide. Le séparateur suit la langue (`fr-FR` ou `en-US`).

### Carte « Nettoyage » (`Cleaner`)
- Au montage, `api.toolsScan()` (commande `tools_scan`) mesure les 8 zones : `temp`, `windows_temp`, `update`, `crash`, `browsers`, `discord`, `shaders`, `recycle`. Pendant la mesure, la liste montre les zones cochées d'office avec « … ».
- **Cochées d'office** (`AREA_DEFAULT`) : toutes sauf `shaders` (les jeux recompilent leurs shaders et saccadent au premier lancement) et `recycle` (la corbeille ; le texte d'aide prévient que les vérificateurs de screenshare la regardent).
- Une zone vide (0 octet) est grisée et affiche « Rien ». Les cases sont bloquées pendant une mesure ou un nettoyage.
- Le gros chiffre en haut est la somme des zones cochées et non vides ; dessous : « à libérer sur {all} trouvés ».
- Bouton « Analyser à nouveau » (icône qui tourne pendant la mesure).
- Bouton principal « Nettoyer {size} » : `api.toolsClean(ids)` (commande `tools_clean`), puis nouvelle mesure. Désactivé si rien à libérer. Après coup, le pied de carte affiche « {size} libérés. » et, si des fichiers étaient en cours d'utilisation, « {n} fichiers en cours d'utilisation sont restés en place. ».
- Avant le nettoyage, le pied de carte rappelle : « Les fichiers supprimés ne reviennent pas. Tes jeux, tes documents et Minecraft ne sont jamais touchés. »
- Le texte de la zone `browsers` promet : le cache seulement, jamais l'historique, les mots de passe ni les cookies. C'est [[tools.rs]] qui tient cette promesse.

### Carte « Applis préinstallées » (`Apps`)
- Au montage, `api.toolsApps()` (commande `tools_apps`) liste les applis préinstallées ou sponsorisées présentes. Le Store, Xbox et la Game Bar ne sont jamais proposés (texte `tools.apps.lead`, liste tenue par [[tools.rs]]).
- **Décochées d'office** (`APP_KEEP`, applis qu'on peut vraiment utiliser) : `MSTeams`, `MicrosoftTeams`, `Microsoft.OutlookForWindows`, `microsoft.windowscommunicationsapps`, `Microsoft.MicrosoftOfficeHub`, `Microsoft.YourPhone`, `SpotifyAB.SpotifyMusic`, `Microsoft.Todos`. Toutes les autres sont cochées.
- Le nom affiché vient de l'appli elle-même (`a.name[lang]`, en français ou en anglais).
- Désinstallation en **deux clics** : « Désinstaller {n} applis », puis « Oui, désinstaller ({n}) » ou « Annuler ». Appel `api.toolsRemoveApps(ids)` (commande `tools_remove_apps`), qui renvoie les applis encore là ; la carte affiche « {n} applis désinstallées. ».
- Liste vide : « Aucune appli préinstallée à retirer : ton Windows est déjà propre. » (ou « Tout est retiré » juste après une désinstallation).
- Rappel en bas : chaque appli se réinstalle depuis le Microsoft Store.

### Carte « Pilotes » (`Drivers`)
- Au montage, `api.toolsDrivers()` (commande `tools_drivers`) renvoie les pilotes de la carte graphique, du réseau et de l'audio, plus le fabricant et le modèle de la carte mère.
- Pour chaque pilote : icône du type, nom, type et fournisseur, version, date et âge (« il y a 3 mois », « il y a 2 ans », via `Intl.RelativeTimeFormat`).
- **Pilote ancien** (point orange, classe `old`) : plus de 6 mois pour la carte graphique (correctifs des jeux récents), plus de 24 mois pour le reste. Point vert sinon.
- Bouton « Site officiel » : le site du fournisseur trouvé dans `VENDORS` (NVIDIA, AMD/ATI/Radeon, Intel/Killer) ; sinon le site du fabricant de la carte mère (`MAKERS` : ASUS, MSI, Gigabyte/Aorus, ASRock, Lenovo, HP, Dell/Alienware, Acer/Predator, Razer, Samsung, Microsoft Surface). Ouverture par `api.openUrl` (le front n'ouvre rien lui-même).
- Ligne « carte mère » à la fin si le fabricant est connu, avec « Site du fabricant ».
- Bouton en haut « Mises à jour facultatives de Windows » : `api.toolsWindowsUpdate()` ouvre `ms-settings:windowsupdate-optionalupdates`.
- Note fixe : « Rago Optimizer n'installe aucun pilote : prends-les toujours sur le site officiel. »

## Données touchées
- Aucune donnée gardée par la page. Le nettoyage supprime des fichiers et la désinstallation retire des applis : les deux sont faits par [[tools.rs]], **sans sauvegarde** (rien n'est inscrit dans l'historique ni dans la remise à zéro).

## Erreurs et cas limites
- Les appels n'ont pas de `catch` : si une commande échoue, l'état `busy` est remis à zéro (`finally`) mais aucun message n'est affiché. Si `toolsApps` ou `toolsDrivers` échoue, la carte reste sur « Recherche… » / « Lecture… » (OBSERVÉ dans le code, pas vu sur Windows).
- Les effets ignorent une réponse arrivée après la fermeture de la page (`live = false`).

## Simulateur
Avec `npm run window`, [[api.ts]] simule : 8 zones mesurées en 0,9 s ; le nettoyage garde 8 % du cache des navigateurs et annonce 37 fichiers restés en place ; une liste d'applis qui se vide pour de bon ; trois pilotes (NVIDIA, réseau et audio Realtek) et une carte mère ASUS.

## Liens avec le reste
- Fonctionnalité : [[Page Outils]]. Moteur : [[tools.rs]].
- Composants : `Button` de `ui.tsx` et `DiscordIcon` de `icons.ts` (voir [[Petits composants de l'interface]]). Textes : clés `tools.*` de [[i18n.ts]]. Styles : section « outils » de `features.css` (voir [[Styles de l'app (CSS)]]).
- Les réglages de nettoyage du module Windows (`cln_*`) sont une autre chose : ce sont des tweaks du [[Catalogue des tweaks]], gratuits eux aussi ([[free.json]]).

## À savoir avant de modifier
- Ajouter une zone de nettoyage : l'ajouter dans [[tools.rs]], dans le type `CleanAreaId` de [[api.ts]], dans `AREA_ICONS`, et écrire `tools.area.<id>` et `tools.area.<id>.hint` en français et en anglais dans [[i18n.ts]].
- Rendre une carte Premium serait un changement d'offre : décision de Sofiene (voir [[Décisions]]), et il faudrait aussi bloquer la commande côté Rust.
