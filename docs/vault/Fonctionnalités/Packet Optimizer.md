---
type: fonctionnalité
tags: [fonctionnalité, app, réseau, premium, 1.2]
maj: 2026-10-31
---
# Packet Optimizer

Aussi appelé « Network Optimizer » / « Optimiseur réseau ». Arrivé en [[Version 1.2.0]] (22/10, refait le 25 et le 27/10). Code : `netopt.rs`, page `NetOpt.tsx`.

- Change la façon dont Windows envoie, reçoit et renvoie les paquets (pas la route : ça, c'est le [[Proxy]]).
- **6 profils** : Hitreg, Knockback, Balanced, Wi-Fi, Packet loss, Old-school. Curseurs Latence et Réactivité, réglages experts (Auto/Manuel), MTU, congestion, priorité réseau, Stabilisateur Wi-Fi…
- **« Analyser mon PC »** regarde carte réseau, processeur et connexion, puis conseille un profil ; « Garder les miens » remet les réglages d'avant.
- Moteur : le `network_optimizer.bat` de Sofiene, étape par étape, en PowerShell caché. Sauvegarde avant la première application ; **Restaurer** (sauvegarde ou valeurs Windows) ; la désinstallation et la fin de Premium remettent la sauvegarde. Pas dans « Tout annuler ».
- **Appliquer = Premium** ; Restaurer et les 4 outils (stabilité, bufferbloat, MTU, état actuel) sont gratuits.
- Le mode compétitif ne change pas un plan d'alimentation personnalisé (ex. Rago Low Latency) ni un Ryzen X3D à deux CCD.
- Pas repris : la « Wi-Fi game session » du .bat (empêche Windows de se reconnecter seul).
- **Problème connu (29/10)** : le preset de « Optimize and play » applique son propre réglage paquets (`ping_packets: hitreg`) qui chevauche le Packet Optimizer ; curseurs extrêmes = ping qui saute. Voir [[Problèmes joueurs]].

Liens : [[Test réseau]], [[Presets]], [[Vidéos YouTube]].
