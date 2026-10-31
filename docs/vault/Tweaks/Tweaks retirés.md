---
type: catalogue
tags: [tweaks, retirés, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks retirés

Tweaks retirés du catalogue pour risque ou inutilité (17), avec la raison. Ils ne sont plus proposés ; leur retour arrière reste possible chez les joueurs qui les avaient (encart du [[Tableau de bord]]). Voir [[Catalogue des tweaks]].

- **Bloquer la limitation réseau** `net_limit` : Il bloquait deux plages d'adresses Google dans le pare-feu, ce qui peut casser YouTube et d'autres services Google, sans gain sur le ping.
- **Baisser la priorité des services** `pri_svc` : Il passait tous les services Windows en priorité minimale : le son pouvait grésiller et le réseau ramer en jeu.
- **Désactiver Prefetch** `mem_prefetch` : Les applis s'ouvraient plus lentement, et sur un screenshare un Prefetch vide peut ressembler à des traces effacées.
- **Désactiver le regroupement des timers** `pow_timer` : Il mettait à 0 une valeur du noyau par laquelle Windows divise : sur certains PC (Windows 11 24H2), écran bleu quelques minutes après le démarrage, sans gain mesurable.
- **Cache protégé contre les coupures** `sto_cacheprot` : Des fichiers en cours d'écriture pouvaient être corrompus si le courant coupait.
- **Désactiver le TDR** `nv_tdr` : Quand le pilote graphique ne répondait plus, le PC figeait au lieu de récupérer.
- **Désactiver le bridage thermique** `amd_thermal` : Il coupait la protection thermique des cartes graphiques AMD.
- **Isolation du noyau** `win_coreiso` : Couper l'intégrité de la mémoire baisse la protection de ton PC contre les pilotes malveillants.
- **Couper les protections CPU** `win_mitigations` : Il coupait les protections Spectre et Meltdown.
- **Couper SmartScreen** `win_smartscreen` : Il coupait SmartScreen, qui vérifie les fichiers téléchargés.
- **Couper Hyper-V** `win_hyperv` : Il coupait Hyper-V et la sécurité basée sur la virtualisation, et cassait WSL, le Bac à sable Windows et les émulateurs.
- **Désactiver les services Xbox** `dbl_xbox` : Il cassait le Game Pass, l'appli Xbox et la connexion à Minecraft Bedrock.
- **Désinstaller Microsoft Edge** `dbl_edge` : Supprimer Edge ne s'annule pas depuis l'app et peut casser des fonctions de Windows qui s'en servent.
- **Désinstaller OneDrive** `dbl_onedrive` : Il supprimait les dossiers OneDrive du PC : les fichiers pas encore synchronisés étaient perdus.
- **Sécurité du démarrage (BCD)** `exp_bios` : Il changeait des réglages de sécurité du démarrage (sécurité basée sur la virtualisation, protection DMA, mémoire du noyau). Une mauvaise valeur peut empêcher Windows de démarrer.
- **Désactiver le remappage DMA** `exp_dma` : Il retirait la protection contre les attaques par périphériques Thunderbolt et PCIe.
- **Renforcer la sécurité** `exp_harden` : Il coupait le service Station de travail : les dossiers partagés et les lecteurs réseau ne s'ouvraient plus.
