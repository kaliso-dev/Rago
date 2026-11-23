---
type: fonctionnalité
tags: [fonctionnalité, app, réseau, premium, 1.2]
version_app: 1.2.1
maj: 2026-11-23
---
# Packet Optimizer

Onglet « Packet Optimizer » de la page Réseau (page « Optimiseur réseau » / Network Optimizer à l'origine, 22/10 ; refait le 25 et le 27/10). Portage de `network_optimizer.bat` v2 de Sofiene. Code : [[netopt.rs]] (formules `compute`), moteur PowerShell `app/src-tauri/netopt/*.ps1` (scellé dans l'exe : [[common.ps1]] et [[main.ps1]] dans la partie gratuite, [[apply.ps1]] dans la partie Premium), page [[NetOpt.tsx]], [[netopt.ts]] (détail dans « Code » plus bas).

**Principe** : aucun réglage ne raccourcit la route, **le ping ne baisse pas**. Ça change la façon dont Windows envoie, reçoit, confirme et renvoie les paquets (tampons de la carte, reprise TCP après une perte, délai des ACK, QoS, économies d'énergie, trafic de fond) : moins d'à-coups au hitreg et au knockback.

## Profils
| Profil | Effet |
|---|---|
| Hitreg | coups envoyés sans attendre : accusés immédiats, aucun regroupement, priorité maximale |
| Knockback | ce que le serveur envoie arrive sans attendre : aucun tampon dans la carte |
| Équilibré | réactif en jeu, téléchargements toujours rapides |
| Wi-Fi | carte Wi-Fi à pleine puissance, pas de changement de borne en partie |
| Pertes de paquets | ADSL, 4G, maison chargée : renvois plus sûrs |
| Old-school | fenêtre TCP fixe 64 Ko + NewReno, sans QoS ; ralentit les gros téléchargements |
| Personnalisé | dès qu'un réglage est changé à la main |

## Réglages
- **Mise en tampon des paquets** (curseur 0-100 : de « aucun tampon » à Windows, N tampons coupés sur 6) ; **Renvoi des paquets perdus** (Prudent → Rapide : délai du 1er renvoi, SystemResponsiveness) ; **Regroupement des petits paquets** (ACK, minuteur, Nagle).
- Fenêtre de réception TCP (Auto, Normal, Restreint, Très restreint, Fixe 64 Ko, Expérimental, Ne pas changer) ; type de connexion (Fibre/Ethernet, Câble, VDSL, ADSL, Wi-Fi, 4G/5G, Satellite) avec détection ; **Priorité au trafic du jeu (QoS, DSCP)** ; **Tolérance aux pertes** ; **Performances de Windows pour le jeu** (plan Performances élevées, Mode jeu, Game DVR coupé, priorité CPU aux jeux ; ne remplace pas un plan perso comme Rago Low Latency ni sur un Ryzen X3D 2 CCD) ; **MTU** (Automatique recommandé, valeur, laisser tel quel) ; niveau DSCP ; contrôle de congestion ; économie d'énergie réseau ; Stabilisateur Wi-Fi ; garde du trafic de fond.
- **Réglages experts** : chaque valeur en Auto ou Manuel ; choisir un profil remet tout en Auto.

## Analyser mon PC
Trois étapes : carte réseau (câble/Wi-Fi), processeur et Windows (threads), qualité de la ligne (40 pings). Conseille un profil avec ses raisons (ex. Wi-Fi → profil Wi-Fi ; ligne qui perd → tolérance aux pertes ; peu de threads → un peu de modération des interruptions). « Appliquer ces réglages » ou « Garder les miens ».

## Appliquer, restaurer
- Dans la 1.2.1 (en ligne) : **Appliquer = Premium** ; l'analyse, les presets, **Restaurer** et les 4 outils (stabilité, bufferbloat, MTU, état actuel) sont gratuits.
- **Dans la [[Version 1.3.0]] (PR #76, sur `staging`, pas sortie)** : **entièrement Premium** (Sofiene, 10/11, q41 : « mets le en premium dans la prochaine version de prod »). En gratuit, l'onglet montrait jusqu'au 23/11 seulement « The Packet Optimizer is part of Premium », ce qu'il fait (3 lignes) et « Get Premium » (remplacé par l'écran verrouillé de la refonte v5, plus bas) ; **Restaurer reste gratuit** quand une application faite en Premium est encore là, pour remettre la connexion comme avant (`NetOpt.tsx`). Le moteur refusait déjà Appliquer sans Premium (`premium_required:netopt`, `lib.rs`). Les outils restent gratuits (voir la refonte v5 plus bas). Jamais testé sur Windows.
- **Refonte v5 (23/11, PR #123, vers `staging`, jamais testée sur Windows)** : l'onglet suit la maquette `app-network-packet-pi.html` : 6 cartes de presets, « find my preset » (l'analyse), une console de trois curseurs (buffering, re-send, batching) avec le tableau avant/après des vraies valeurs calculées, les interrupteurs, le type de connexion, les blocs « advanced » et « expert », la rangée **« tools »** (stabilité, bufferbloat, MTU, état actuel) et une barre « apply » à elle en bas de la fenêtre (restore, journal, restart). Détail : [[NetOpt.tsx]].
  - **Gratuit, depuis cette refonte** : le vrai écran s'affiche, verrouillé (un clic ouvre l'offre Premium) au lieu de l'écran « part of Premium » ; **les 4 outils et « restore » restent gratuits**. Les outils viennent de l'ancien « Diagnostic avancé » du [[Test réseau]], retiré de la maquette ; « État actuel » devient donc gratuit aussi. **À VÉRIFIER** : choix fait pour la refonte, question q117 posée à Sofiene le 23/11 ([[Questions ouvertes]]).
- La connexion coupe quelques secondes à l'application.
- Valeurs d'avant gardées à la première application (`snapshot.json`) ; **Restaurer** propose cette sauvegarde ou les valeurs de Windows. Désinstallation et fin de Premium remettent la sauvegarde, ou à défaut les valeurs de Windows (`put_back`, sans licence). Pas dans « Tout annuler » (bouton à part).
- Pas repris du .bat : la « Wi-Fi game session » (Windows ne se reconnecterait plus seul).

## Problème connu (29/10)
Le preset Minecraft PvP applique `ping_packets: hitreg`, qui réécrit une partie des mêmes valeurs (MTU 1400, RSS, congestion, autotuning) : les deux se marchent dessus. Curseurs extrêmes = ping qui saute. Voir [[Problèmes joueurs]], [[Tweaks Presets]].

Liens : [[Test réseau]], [[Tweaks Réseau]], [[Vidéos YouTube]], [[Proxy]].

## Code
- [[netopt.rs]] : options et bornes, formules du `.bat` (`compute`, `dscp_of`), assemblage et lancement du moteur, lecture des lignes `@@NO|…`, `applied.json`, remise `put_back`.
- [[common.ps1]] (gratuit) : sauvegarde lue, `Do-Restore` (sauvegarde exacte), `Do-Defaults` (valeurs de Windows), outils `quality`, `loaded`, `mtu`, `detect`, `status`.
- [[apply.ps1]] (Premium) : `Take-Snapshot` et `Do-Apply` en 11 étapes, avec toutes les valeurs écrites.
- [[main.ps1]] : point d'entrée. [[session.rs]] : détection des Ryzen X3D à deux CCD. Interface : [[NetOpt.tsx]], [[netopt.ts]].
