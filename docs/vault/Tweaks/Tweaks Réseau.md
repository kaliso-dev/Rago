---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks Réseau

Module **Réseau** (`network`) de l'app 1.2.1 : Ping, stabilité et enregistrement des coups.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Enregistrement des coups

### Profil hitreg `ping_hitreg` 🔒
Six profils pour l'ajustement auto du débit TCP et le regroupement des paquets reçus ; « Par défaut » remet Windows comme avant.
- Variantes : Meilleur hitreg (`better`), Hitreg maximal (`besthitreg`), Équilibré (`balanced`), Hypixel (`hypixel`), Le plus lent (`slowlest`), Par défaut (`default`, retour) ; par défaut `better`.
- Gain : Effet rarement mesurable : le hitreg est calculé par le serveur et dépend surtout de ton ping.
- Inconvénient : Les profils autres que « Hitreg maximal » et « Par défaut » peuvent ralentir les gros téléchargements.
- Dans les presets : Minecraft PvP (voir [[Tweaks Presets]]).

### Optimisation des paquets `ping_packets` 🔒 🔁
Trois profils : Hitreg (paquets plus petits, accélérations de la carte coupées), QoS (Minecraft marqué prioritaire) ou Knockback.
- Variantes : Hitreg (`hitreg`), QoS (`qos`), Knockback (`knockback`) ; par défaut `hitreg`.
- Gain : Effet rarement mesurable sur le ping ; le marquage QoS n'aide que si ta box le respecte.
- Inconvénient : Le profil Hitreg peut un peu baisser le débit et charger un peu plus le processeur.
- Dans les presets : Minecraft PvP (voir [[Tweaks Presets]]).

## Ping

### Optimisation du ping `ping_main` 🔒 🔁
Quatre configurations qui combinent réglages TCP, Nagle, économie d'énergie et accélérations de la carte réseau.
- Variantes : Config 1 (`config1`), Config 2 (`config2`), Config 3 (`config3`), Config 4 (`config4`) ; par défaut `config1`.
- Gain : Peut lisser de petites pointes de latence sur certaines cartes ; ne te rapproche pas du serveur.
- Inconvénient : Configs 2 à 4 : plus de réveil du PC par le réseau et carte plus gourmande en énergie ; la 4 coupe aussi NetBIOS.
- Dans les presets : Minecraft PvP (voir [[Tweaks Presets]]).

### Configuration réseau avancée `ping_advanced` 🔒 ⚠️ 🔁
Pack réseau : NetBIOS coupé, Nagle, économie d'énergie et accélérations de la carte coupées, interruptions sur un seul cœur.
- Gain : Peut lisser de petites pointes de latence sur certaines cartes ; le reste a un effet rarement mesurable.
- Inconvénient : Plus de réveil par le réseau ni de vieux partages NetBIOS ; carte plus gourmande et un peu plus de charge processeur.

## Profil de jeu

### Profil réseau `net_profile` 🔒
Trois profils : Hitreg (paquets plus petits), Knockback (renvoi plus rapide des paquets perdus) ou QoS (Minecraft prioritaire).
- Variantes : Hitreg (`hitreg`), Knockback (`knockback`), QoS Minecraft (`qos`) ; par défaut `qos`.
- Gain : Effet rarement mesurable sur le ping ; le marquage QoS n'aide que si ta box le respecte.
- Inconvénient : Le profil Hitreg peut un peu baisser le débit des gros téléchargements.

## Préréglages complets

### Préréglage réseau complet `net_server` 🔒 ⚠️ 🔁
Quatre préréglages réseau complets (TCP, Nagle, carte, priorités DNS) ; les 1 et 2 changent aussi des minuteurs de démarrage.
- Variantes : Préréglage 1 (`s1`), Préréglage 2 (`s2`), Préréglage 3 (`s3`), Préréglage 4 (`s4`) ; par défaut `s3`.
- Gain : Effet rarement mesurable sur le ping, qui dépend surtout de la distance et de ta connexion.
- Inconvénient : Préréglages 1 et 2 : réglages de démarrage modifiés ; 2 et 4 : économie d'énergie et réveil par le réseau coupés.

## Réglages un par un

### Désactiver l'algorithme de Nagle `net_nagle` 🔒 🔁
Coupe l'algorithme de Nagle et l'accusé de réception différé, qui regroupent les petits paquets réseau avant de les envoyer.
- Gain : Effet rarement mesurable : Minecraft Java et la plupart des jeux le coupent déjà eux-mêmes.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Latence minimale, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Retirer la limitation multimédia du réseau `net_throttle` 🔒 🔁
Retire la limite que Windows met sur le trafic réseau quand un son ou une vidéo est en lecture.
- Gain : Ne joue que si un son ou une vidéo tourne pendant que tu joues ; effet rarement mesurable.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, Latence minimale, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Couper l'économie d'énergie de la carte réseau `net_powersave` 🔒 🔁
Coupe l'économie d'énergie de la carte réseau (Green Ethernet, mise en veille) et le réveil du PC par le réseau.
- Gain : Peut supprimer de petites pointes de latence sur certaines cartes réseau.
- Inconvénient : La carte consomme un peu plus (batterie sur portable) et le PC ne se réveille plus par le réseau.

### Optimiser la carte réseau `net_adapter` 🔒 🔁
Coupe l'économie d'énergie, le réveil par le réseau et les accélérations de la carte réseau, et agrandit ses tampons.
- Gain : Peut lisser de petites pointes de latence sur certaines cartes ; effet souvent faible.
- Inconvénient : Un peu plus de charge processeur et de consommation ; le PC ne se réveille plus par le réseau.

### Paramètres TCP/IP du registre `net_registry` 🔒 🔁
Change une vingtaine de réglages TCP/IP cachés de Windows : tampons, accusés de réception, durée de vie des paquets.
- Gain : Effet rarement mesurable : beaucoup de ces valeurs datent d'anciens Windows et ne changent rien en jeu.
- Inconvénient : Aucun inconvénient connu.

### Réglages TCP avancés `net_advanced` 🔒 ⚠️
Change une quinzaine de réglages TCP globaux de Windows et coupe Teredo et ISATAP, deux vieux tunnels IPv6.
- Gain : Effet rarement mesurable sur le ping : ces réglages jouent surtout sur le débit.
- Inconvénient : Le chat de groupe Xbox et quelques jeux en pair-à-pair peuvent avoir du mal à se connecter.

### Priorité de résolution DNS `net_dnsprio` 🔒 🔁
Fait passer le cache local et le fichier hosts avant le serveur DNS pour trouver l'adresse d'un site ou d'un serveur.
- Gain : Effet rarement mesurable : Windows suit déjà cet ordre par défaut.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Activer le Direct Cache Access `net_dca` 🔒
Autorise la carte réseau à écrire directement dans la mémoire cache du processeur.
- Gain : Effet nul sur presque tous les PC : seules certaines cartes réseau de serveur s'en servent.
- Inconvénient : Aucun inconvénient connu.

### Utiliser le processeur de la carte réseau `net_offload` 🔒 🔁
Réactive le déchargement de certains calculs réseau vers la carte réseau.
- Gain : Soulage un peu le processeur ; c'est le réglage normal de Windows.
- Inconvénient : Aucun inconvénient connu.

### Mode MSI sur la carte réseau `net_msi` 🔒 🔁
Passe la carte réseau en interruptions MSI, une autre façon de prévenir le processeur que des données sont arrivées.
- Gain : Utile seulement sur du vieux matériel : les cartes récentes utilisent déjà ce mode.
- Inconvénient : Sur une carte qui gère mal ce mode, la connexion peut ne plus marcher.

### Affinité processeur de la carte réseau `net_affinity` 🔒 ⚠️ 🔁
Envoie toutes les interruptions de la carte réseau sur un seul cœur du processeur.
- Gain : Effet rarement mesurable : Windows répartit déjà bien ce travail.
- Inconvénient : Ce cœur peut saturer sur une connexion très rapide et limiter le débit.

### Désactiver NetBIOS sur TCP/IP `net_netbios` 🔒 🔁
Coupe NetBIOS, un vieux protocole de partage de fichiers sur le réseau local.
- Gain : Un peu moins de trafic local et un peu plus de sécurité ; aucun effet sur le ping.
- Inconvénient : Les vieux appareils partagés (NAS, imprimantes réseau, PC sous Windows 7) peuvent ne plus apparaître.

### Désactiver IPv6 `net_ipv6` 🔒 ⚠️
Fait passer l'IPv4 avant l'IPv6 quand un site ou un serveur propose les deux ; l'IPv6 reste actif.
- Gain : Peut aider si ta connexion IPv6 est instable ; sinon effet rarement mesurable.
- Inconvénient : Aucun inconvénient connu.

### Optimiser le partage de fichiers (SMB) `net_lanman` 🔒 🔁
Change des réglages du partage de fichiers de Windows, utilisé quand d'autres PC ouvrent tes dossiers partagés.
- Gain : Aucun effet en jeu ; ne sert que si tu partages des dossiers sur ton réseau local.
- Inconvénient : Les fichiers partagés peuvent s'ouvrir un peu plus lentement depuis les autres PC.

### Priorité réseau d'autres jeux en ligne `net_dscp` 🔒 🔁
Marque comme prioritaire le trafic de 12 jeux en ligne (Dota 2, Call of Duty, Destiny 2, Halo Infinite, Rust, Warframe, War Thunder, World of Tanks, Dead by Daylight, Brawlhalla, Battlefield V, Titanfall 2).
- Gain : Peut aider quand quelqu'un télécharge ou streame sur ta connexion ; le marquage n'agit que si ta box le gère.
- Inconvénient : Aucun quand ta box ne lit pas le marquage : rien ne change alors.

### Utiliser les DNS Cloudflare et Google `net_dns` 🔒 🔁
Tes cartes réseau connectées cherchent les adresses avec Cloudflare (1.1.1.1) et Google (8.8.8.8) au lieu de ton fournisseur d'accès.
- Gain : Sites et serveurs trouvés plus vite et plus sûrement quand les DNS de ton fournisseur sont lents ; ça ne baisse pas le ping en jeu.
- Inconvénient : Peut gêner sur un réseau qui impose ses DNS (école, travail, contrôle parental) ; seulement en IPv4.

### Couper la modération des interruptions `net_intmod` 🔒 🔁
Ta carte réseau transmet chaque paquet à Windows tout de suite au lieu de les grouper.
- Gain : Latence réseau un peu plus basse et plus régulière, surtout en filaire.
- Inconvénient : Plus de processeur utilisé pendant les gros téléchargements. Le Hitreg Suite fait l'inverse : n'utilise pas les deux.

## Outils

### Redémarrer la carte réseau `net_restart` 🔒 ⚙️
Redémarre les cartes réseau connectées pour appliquer les réglages réseau sans redémarrer le PC.
- Gain : Évite un redémarrage complet après un réglage réseau.
- Inconvénient : Ta connexion coupe quelques secondes, ce qui peut te déconnecter d'un serveur.
