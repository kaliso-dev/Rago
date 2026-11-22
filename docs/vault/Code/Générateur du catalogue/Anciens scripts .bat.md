---
type: code
tags: [code, app, catalogue, source, batch]
fichier: app/legacy/
lignes: 19477
maj: 2026-11-10
---
# Anciens scripts .bat

Les programmes d'optimisation d'origine, sous forme de fichiers batch Windows à menus, rangés dans `app/legacy/`. Ils ne sont **jamais lancés** par l'app ni distribués : ils servent seulement de **source** au générateur, qui en extrait un script par réglage, le corrige et l'embarque. Fiche parente : [[Code du générateur de catalogue]]. Fonctionnalité : [[Catalogue des tweaks]].

Tout ce qui suit est CONFIRMÉ (fichiers de `staging`, 10/11). Les commandes elles-mêmes ne sont pas recopiées ici (règle du vault) : la liste des réglages qui en sortent est dans les notes générées [[Tweaks Réseau]], [[Tweaks Latence]], [[Tweaks Carte graphique]], [[Tweaks Windows]], etc.

## Les fichiers
| Fichier | Taille | Lignes | Rôle |
|---|---|---|---|
| `app/legacy/Premium v5.2 - Rago Hub.bat` | 1 134 623 octets | 14 435 | l'ancien produit payant « Premium », un seul fichier à menus. Lu par [[build_catalog.py]] via [[extract_bat.py]] |
| `app/legacy/v6/RAGO APP FPS.bat` | 307 764 octets | 3 212 | 53 blocs : processeur, carte graphique, système, Windows… |
| `app/legacy/v6/RAGO APP HITREG INPUTLAG.bat` | 63 878 octets | 817 | 5 blocs : latence des pilotes (`in_driver`), de la carte réseau (`in_adapter`), de Windows (`in_windows`), pack avancé (`in_advanced`), sélecteur de latence des images (`in_frames`) |
| `app/legacy/v6/RAGO APP Ping Optimization Final.bat` | 67 068 octets | 1 013 | 4 blocs, un par bouton : « HITREG (BUTTON ONE) », « PACKET OPTIMIZATION (SECOND BUTTON) », « PING OPTIMIZATION (THIRD BUTTON) », « ADVANCED OPTIMIZATION CONFIG (BUTTON FOUR) » |
Les trois fichiers v6 ont été écrits pour l'app et envoyés par Sofiene le 06/10/2026 ; ils sont lus par [[build_catalog_v6.py]]. Tous sont entrés dans le dépôt le 07/10 (commit `6c2bcad`). Tous sont en fins de ligne CRLF.

## Premium v5.2 en détail
- **Encodage** : UTF-8 précédé d'un **faux BOM UTF-16** (`FF FE`), posé par l'auteur pour qu'un éditeur affiche le fichier comme du charabia. [[extract_bat.py]] et [[fix_free_bat.py]] le retirent ou le gardent selon le besoin. La ligne 21 dit encore `Set Version=5.1`.
- **En-tête** (l. 1-258) : message « Thanks for your Purchase ! » par une bulle PowerShell, recherche de la carte réseau active (`adapter_name`, par `wmic`), vérification des droits administrateur, écran d'avertissement, activation des points de restauration (labels `RP` l. 205 et `restore` l. 230, repris comme réglages `rst_point` et `rst_open`).
- **Menu principal** (`:menu`, l. 259) puis un sous-menu par option ; 372 labels en tout (310 noms distincts, certains répétés), 41 invites `set /p input` :
  | Choix | Label (ligne) | Contenu | Devenu dans l'app |
  |---|---|---|---|
  | 1 | `NetworkOpt1` (344) | profils réseau Hitreg, Knockback, QoS, préréglages serveur, réglages un par un | module Réseau |
  | 2 | `FPSOpt2` (2111) | 18 sous-menus : général, souris et clavier, Windows, nettoyage, RAM, DirectX, carte graphique, processeur, USB, alimentation, débloat, stockage, réparation de fichiers, plein écran, désinstallation d'applis, BIOS, priorités, et un « God Mod » (`godmmmm`, l. 2267) | modules Latence, Carte graphique, Windows, Mode expert |
  | 3 | `HitregOpt3` (12964) | réglages de la carte réseau (`BASE`, l. 13026) puis choix du type de PC (`ggpc1`, `mdpc1`, `lwpc1`, `ltpc1`) | `hitreg_suite` (4 variantes) |
  | 4 | `MCOpt4` (13715) | OptiFine `Performance` (13768) et `Quality` (13875), nettoyage des fichiers temporaires | `mc_optifine`, `cln_temp` |
  | 5 | `RBWOpt5` (13983) | services pour un screenshare Ranked BedWars, `On` (14039) / `off` (14077) | `rbw_mode`, réécrit par [[rbw.py]] ([[RBW Mod]]) |
  | 6 | `MOD8` (14195) | mode jeu, `ENABLE8` (14250) / `DISABLE8` (14304) | `game_mode` ([[Mode jeu]]) |
  | 7 | `Restarting6` (14109) | redémarrage de la carte réseau (`RestartY`, 14164) | `net_restart` |
  | R | `revert1` (14337) | retours arrière (`RevzertNt` 14395 : réseau ; `RevertHt` 14420, non repris par [[meta.py]]) | `rst_network` (module Restaurer ; `rst_queue` vient, lui, du label `Mdrevert`, l. 12817) |
- Chaque option fait `goto <label>` ; le code sous le label tourne jusqu'au `goto` qui ramène au menu. C'est ce fil que [[extract_bat.py]] simule pour sortir un script par label.
- **Défauts du fichier** corrigés par le générateur (détail dans [[CORRECTIONS.md (app)]]) : un rechercher-remplacer global « Disable » → « Disabling » qui a cassé environ 270 commandes ; valeurs `DevicePriority` écrites vides ; boucles `for` détachées ; chemins du PC de l'auteur (profil NVIDIA, plan d'alimentation, `smartctl`) ; nom de service `CDPUserSvc_5d3cf` propre à un PC ; carte réseau « Ethernet » en guillemets typographiques ; lignes collées depuis un assistant de chat ; choix 3 et 4 du Hitreg qui renvoyaient vers 1 et 2 ; variable `USER_SID` jamais définie.

## Les .bat v6 en détail
- Pas de menus : chaque fichier est une suite de **blocs** ouverts par une ligne d'en-tête `:: Titre` ou `::: Titre`. [[build_catalog_v6.py]] (`sections_of`) les découpe et chaque réglage v6 pointe vers la **ligne exacte** de son en-tête (`T(file, line, …)`).
- Certains blocs regroupent des profils exclusifs, découpés en variantes par motif (`ping_hitreg` : 6 profils ; `ping_packets` : Hitreg, QoS, Knockback ; `ping_main` : Config 1 à 4 ; `sys_ram` : 9 tailles de RAM) ou absorbés (dans `RAGO APP FPS.bat`, les 4 blocs « Ultra Low / Low / Balanced / Default » des lignes 2191 à 2206, qui suivent l'en-tête « Latency Selector » de la ligne 2189, deviennent les variantes de `in_queue`).
- Blocs non repris : les en-têtes de chapitre sans commande (dans `RAGO APP FPS.bat` : lignes 1, 1560, 1917, 2046, 2307, 2645, 3080, dont des doublons « Power Optimization » et « USB Optimization ») ; le build vérifie qu'ils sont vides une fois nettoyés.
- Mêmes défauts que la v5.2 revenus (corrigés de la même façon), plus un GUID de carte réseau du PC de l'auteur et des `/f%` de copier-coller.

## Comment ils servent de source
1. [[meta.py]] relie chacun des 189 réglages de l'ancien programme à un `label@ligne` du `.bat` v5.2 ; [[build_catalog.py]] en tire les scripts.
2. [[build_catalog_v6.py]] relie ses 51 réglages v6 à une ligne d'en-tête, fusionne les deux ensembles (14 anciens réglages remplacés par leur version v6), ajoute 22 réglages écrits directement en Python (`NEW_TWEAKS`, [[optis_120.py]]), applique les corrections ([[audit_fixes.py]], [[optis_120.py]], [[safety.py]], [[paths.py]]) et en retire 17 : 189 − 14 + 51 + 2 + 20 − 17 = **231 entrées** au catalogue (218 réglages distincts).
3. L'origine `fichier@ligne` de chaque réglage (`legacy`) sert pendant le build puis est **retirée** du `catalog.json` publié : elle donnerait le plan des anciens programmes à qui ouvre l'app.

## Données touchées
Lecture seule par le générateur. Aucun de ces fichiers n'est copié dans l'exe ni sur le site.

## Historique
- 07/10 : entrée dans le dépôt (`6c2bcad`).
- 10/11 : dans le `.bat` v5.2, l'ancienne signature des crédits (deux pseudonymes, dont un ancien collaborateur) est remplacée par « Made by KALISO and RAGO » (commit `a190565`, app 1.3.0 : « … retiré des .bat historiques ; « KALISO and RAGO » dans l'app, l'installateur, le site et le serveur »). Seules des lignes `echo` changent (10 lignes) ; aucun script généré ne change et aucun numéro de ligne ne bouge. Les `.bat` v6 n'ont pas changé depuis le 07/10.

## À savoir avant de modifier
- **Ne pas reformater ni réenregistrer ces fichiers** (encodage, fins de ligne, lignes ajoutées ou retirées) : les numéros `label@ligne` de [[meta.py]] et les lignes d'en-tête de [[build_catalog_v6.py]] sont vérifiés par `assert`, et le faux BOM est attendu.
- Ne pas y corriger un bug : corriger dans le générateur (de préférence [[optis_120.py]]), pour que la correction soit tracée dans [[CORRECTIONS.md (app)]] et que l'annulation couvre l'ancienne version.
- Le dépôt est public : ces fichiers y sont lisibles par tous. Les scripts embarqués dans l'exe, eux, sont chiffrés ([[Scripts embarqués (JSON)]], [[seal.rs]]).
