---
type: fonctionnalité
tags: [fonctionnalité, app, 1.2]
version_app: 1.2.1
maj: 2026-10-31
---
# Barre en jeu

Linear RAG-82. Arrivée en [[Version 1.2.0]]. Code : `overlay.rs`, `fps.rs`, `gameping.rs`, `mcping.rs`, `flows.rs`, `icmp.rs`, interface `src/overlay/Overlay.tsx`. Nécessite que Rago tourne ([[Arrière-plan et démarrage]]).

## Ouvrir et fermer
- **Alt+X** (par défaut, modifiable dans les [[Paramètres de l'app]] ; c'était Ctrl+Maj+R avant le 22/10). Le raccourci n'est pris à Windows **que quand un jeu est au premier plan** (ou la barre ouverte) : ailleurs il reste à l'app active (ex. Ctrl+Maj+R recharge toujours Chrome).
- Un « jeu » = un jeu de la [[Bibliothèque de jeux]], Minecraft Java (`javaw.exe`, quel que soit le launcher) ou une fenêtre qui couvre tout l'écran (plein écran fenêtré). **Le plein écran exclusif ne laisse rien s'afficher par-dessus.**
- Barre ouverte : elle prend clavier et souris ; Échap, le raccourci ou un clic dans le jeu la ferment et rendent le premier plan au jeu.
- Jeux qui se réduisent s'ils perdent le premier plan (Minecraft Java en plein écran, plein écran exclusif, et ceux vus se réduire, retenus d'un lancement à l'autre) : la barre s'ouvre sans leur prendre le premier plan ; elle prend les clics mais pas le clavier ; raccourci, Échap ou ✕ la ferment.
- **Souris sur Minecraft** : en fenêtre, la barre prend le premier plan et le jeu rend la souris ; en plein écran, la barre envoie Échap au jeu (menu pause, curseur libéré).

## Ce qu'elle affiche (gratuit)
- **FPS** : mesurés par **PresentMon 2.3.0** (Intel, signé), ajouté seulement par la CI GitHub (un exe compilé ailleurs affiche « — »).
- **Ping du serveur de la partie** :
  - Minecraft Java : ping/pong du protocole du jeu toutes les 3 s, comme la liste des serveurs (Hypixel est derrière Cloudflare).
  - Autres jeux : le serveur est l'adresse dont le jeu reçoit le plus de paquets (journal réseau du noyau Windows, ETW). En TCP : aller-retour mesuré par Windows. En UDP (PUBG, Valorant, CS2, Fortnite) : écho ICMP toutes les 2 s, médiane des 5 dernières ; si le serveur ne répond pas, mesure au dernier routeur avant lui, affichée avec **« ≈ »** (à 1-2 ms près).
  - Pas de serveur repéré (menu, salon, hors ligne) : pas de ping.
- CPU, GPU, RAM ; bouton Nettoyer la RAM ([[Tableau de bord]]) ; vérifications de [[Pendant la partie]] ; bouton « Ouvrir Rago Optimizer ».
- **Pastille** « FPS et ping à l'écran » (option) : en haut à gauche, ne prend ni le focus ni les clics ; attend que le jeu soit au premier plan depuis 10 s ; jamais par-dessus le plein écran exclusif.

## Réglages en pleine partie (Premium, 21 tweaks)
Tweaks qui s'appliquent sans redémarrage, sans couper le réseau ni relancer l'Explorateur :
- **Processeur** : `cpu_parking`, `cpu_cstates_cfg`, `cpu_cstates_off`, `cpu_device_idle`, `cpu_pstates`, `cpu_boost_epp`, `cpu_throttle`, `cpu_turbo`, `cpu_cooling`, `cpu_ac`, `cpu_away`.
- **Alimentation** : `pow_plan` (Rago Low Latency), `pow_hwp`, `pow_devices`.
- **Mémoire** : `mem_compression`, `mem_combining`.
- **Réseau, Windows, carte graphique** : `net_dca`, `win_visual`, `win_transparency`, `win_autoplay`, `nv_profile`.
Détail de chacun : [[Tweaks Latence]], [[Tweaks Windows]], [[Tweaks Carte graphique]], [[Tweaks Réseau]]. Mode jeu, Hitreg, OptiFine et RBW Mod restent dans l'app. Un tweak changé depuis la barre apparaît dans l'app.

Liens : [[Test réseau]], [[Offres et prix]], [[Trailer 1.2]].
