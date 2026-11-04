---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks Restaurer

Module **Restaurer** (`restore`) de l'app 1.2.1 : Toujours une porte de sortie.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Retour arrière

### Créer un point de restauration `rst_point` 🆓 ⚙️
Active la protection du système si besoin et crée un point de restauration de Windows.
- Gain : Te permet de remettre Windows dans cet état si un réglage pose problème.
- Inconvénient : Prend un peu de place sur le disque ; tes fichiers perso ne sont pas sauvegardés.
- Exécuté par du code Rust natif (`restore_point`), pas par un script.

### Ouvrir la restauration du système `rst_open` 🆓 ⚙️
Ouvre l'outil de Windows pour revenir à un point de restauration.
- Gain : Annule d'un coup les changements faits à Windows depuis ce point.
- Inconvénient : Les programmes installés après ce point devront être réinstallés ; tes fichiers perso ne bougent pas.

### Réinitialiser le réseau `rst_network` 🆓 ⚠️ 🔁 ⚙️
Remet à zéro la configuration réseau de Windows, vide le cache DNS et redemande une adresse IP.
- Gain : Répare souvent une connexion cassée par un réglage réseau ou un logiciel.
- Inconvénient : Tous tes réglages réseau sont effacés : IP fixe et DNS manuels à ressaisir, VPN parfois à réinstaller.
- Demande confirmation : Réinitialise Winsock et les réglages réseau.

### File souris et clavier par défaut `rst_queue` 🆓 🔁 ⚙️
Remet les files de la souris et du clavier à la valeur normale de Windows.
- Gain : Utile si ta souris saute ou rate des mouvements après un réglage de file plus bas.
- Inconvénient : Aucun inconvénient connu.

- Aussi affiché ici : **Mode jeu Rago** (`game_mode`), voir [[Tweaks Mode jeu]].