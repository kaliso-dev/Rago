---
type: fonctionnalité
tags: [fonctionnalité, app, réseau, premium, 1.2]
version_app: 1.2.1
maj: 2026-11-10
---
# Packet Optimizer

Onglet « Packet Optimizer » de la page Réseau (page « Optimiseur réseau » / Network Optimizer à l'origine, 22/10 ; refait le 25 et le 27/10). Portage de `network_optimizer.bat` v2 de Sofiene. Code : `netopt.rs` (formules `compute`), moteur PowerShell `app/src-tauri/netopt/*.ps1` (chiffré dans l'exe), page `NetOpt.tsx`, `lib/netopt.ts`.

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
- **Dans la [[Version 1.3.0]] (PR #76, sur `staging`, pas sortie)** : **entièrement Premium** (Sofiene, 10/11, q41 : « mets le en premium dans la prochaine version de prod »). En gratuit, l'onglet montre seulement « The Packet Optimizer is part of Premium », ce qu'il fait (3 lignes) et « Get Premium » ; **Restaurer reste gratuit** quand une application faite en Premium est encore là, pour remettre la connexion comme avant (`NetOpt.tsx`). Le moteur refusait déjà Appliquer sans Premium (`premium_required:netopt`, `lib.rs`). Les 4 outils réseau restent gratuits dans le [[Test réseau]]. Jamais testé sur Windows.
- La connexion coupe quelques secondes à l'application.
- Valeurs d'avant gardées à la première application (`snapshot.json`) ; **Restaurer** propose cette sauvegarde ou les valeurs de Windows. Désinstallation et fin de Premium remettent la sauvegarde. Pas dans « Tout annuler » (bouton à part).
- Pas repris du .bat : la « Wi-Fi game session » (Windows ne se reconnecterait plus seul).

## Problème connu (29/10)
Le preset Minecraft PvP applique `ping_packets: hitreg`, qui réécrit une partie des mêmes valeurs (MTU 1400, RSS, congestion, autotuning) : les deux se marchent dessus. Curseurs extrêmes = ping qui saute. Voir [[Problèmes joueurs]], [[Tweaks Presets]].

Liens : [[Test réseau]], [[Tweaks Réseau]], [[Vidéos YouTube]], [[Proxy]].
