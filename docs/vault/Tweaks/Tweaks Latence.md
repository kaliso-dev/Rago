---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks Latence

Module **Latence** (`latency`) de l'app 1.2.1 : Timers, priorités, processeur, mémoire et alimentation.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Général

### Optimisations générales de latence `lat_general` 🔒 🔁
Pack de réglages : priorité des jeux, minuteurs de Windows, système de fichiers et menus qui s'ouvrent sans délai.
- Gain : Les menus s'ouvrent plus vite ; le reste a un effet rarement mesurable sur un PC récent.
- Inconvénient : Modifie le démarrage, consomme un peu plus au repos et une appli occupée affiche plus vite « ne répond pas ».

### Réglages DirectX `lat_directx` 🔒 🔁
Écrit d'anciens réglages DirectDraw et Direct3D, et active la planification GPU à accélération matérielle.
- Gain : Ces anciens réglages ne servent ni à Minecraft ni aux jeux récents ; la planification GPU a un effet variable.
- Inconvénient : Avec certains pilotes ou jeux, la planification GPU à accélération matérielle peut causer des saccades.

## Priorités

### Optimisation des priorités `sys_priority` 🔒 🔁
Règle les priorités du planificateur multimédia de Windows pour les jeux, le son et l'affichage.
- Gain : Effet rarement mesurable : peu de jeux utilisent ce planificateur de Windows.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : FPS max, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Priorité CSRSS (haute) `sys_csrss` 🔒 🔁
Demande une priorité haute pour le processus clavier-souris de Windows, plus d'autres priorités et deux options de télémétrie.
- Gain : Effet rarement mesurable : Windows ignore la priorité de ce processus et la plupart de ces valeurs.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Latence minimale (voir [[Tweaks Presets]]).

### Priorité avancée par jeu `pri_game` 🔒 🔁
Seize jeux au choix (Minecraft Java et Bedrock, Fortnite, Valorant, CS2, PUBG, Roblox…) : le jeu choisi passe en priorité haute et son trafic réseau est marqué comme prioritaire.
- Variantes : Minecraft (`minecraft`), Fortnite (`fortnite`), Valorant (`valorant`), CS2 (`cs2`), Apex (`apex`), GTA V (`gta`), PUBG (`pubg`), Roblox (`roblox`), Rainbow Six Siege (`r6`), Overwatch 2 (`overwatch`), Marvel Rivals (`rivals`), The Finals (`finals`), Escape from Tarkov (`tarkov`), Rocket League (`rl`), League of Legends (`lol`), Minecraft Bedrock (`bedrock`) ; par défaut `minecraft`.
- Gain : Peut aider si d'autres programmes chargent le processeur ; le marquage réseau n'agit que si ta box le gère.
- Inconvénient : Les autres programmes (Discord, stream) peuvent ralentir ; pour Minecraft, tous les programmes Java sont concernés.
- Dans les presets : Minecraft PvP, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Planificateur multimédia (MMCSS) `pri_mmcss` 🔒 🔁
Donne plus de priorité processeur et GPU aux tâches que le planificateur multimédia de Windows classe comme jeux ou basse latence.
- Gain : Effet rarement mesurable : peu de jeux utilisent ce planificateur de Windows.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, FPS max, Latence minimale, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Séparation des priorités Win32 `pri_w32` 🔒 🔁
Règle la façon dont Windows partage le temps processeur entre les programmes, en favorisant la fenêtre au premier plan.
- Gain : Effet rarement mesurable : sur un PC classique, cette valeur équivaut au réglage par défaut de Windows.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, FPS max, Latence minimale, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Réactivité système à 0 % `pri_sysresp` 🔒 🔁
Réduit la part du processeur que Windows garde pour les tâches de fond pendant le jeu ou la lecture de médias.
- Gain : Effet rarement mesurable : Windows remplace 0 par 10 % et seules quelques applis sont concernées.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, FPS max, Latence minimale, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Priorité des threads graphiques `pri_thread` 🔒 🔁
Monte la priorité des tâches internes du noyau graphique de Windows et du pilote NVIDIA.
- Gain : Effet rarement mesurable sur un PC récent.
- Inconvénient : Aucun inconvénient connu.

### Priorité de l'horloge système (IRQ8) `pri_irq8` 🔒 🔁
Demande à Windows de donner la priorité à l'horloge temps réel du PC (IRQ8).
- Gain : Effet rarement mesurable : ce vieux réglage est ignoré par les Windows récents.
- Inconvénient : Aucun inconvénient connu.

### Priorité IRQ16 `pri_irq16` 🔒 🔁
Demande à Windows de donner la priorité à l'interruption IRQ16, souvent liée à l'USB ou à la carte graphique.
- Gain : Effet rarement mesurable : ce vieux réglage est ignoré par les Windows récents.
- Inconvénient : Aucun inconvénient connu.

### Priorité CSRSS (registre) `pri_csrss` 🔒 🔁
Demande une priorité plus haute pour le processus Windows qui gère le clavier, la souris et les fenêtres.
- Gain : Effet rarement mesurable : Windows ignore la priorité de ce processus protégé.
- Inconvénient : Aucun inconvénient connu.

### Priorité du gestionnaire de fenêtres `pri_dwm` 🔒 🔁
Règle la priorité de l'affichage des fenêtres de Windows dans le planificateur multimédia.
- Gain : Effet rarement mesurable : ce sont les valeurs que Windows utilise déjà par défaut.
- Inconvénient : Aucun inconvénient connu.

### Politique de ressources avancée `pri_policy` 🔒 ⚠️ 🔁
Retire les limites de processeur des applis en arrière-plan ou en pause et les met au même niveau que le premier plan.
- Gain : Effet incertain et rarement mesurable : ces règles concernent surtout les applis en arrière-plan.
- Inconvénient : Les applis en arrière-plan ne sont plus freinées : elles peuvent prendre du processeur au jeu et vider la batterie.

## Souris et clavier

### Désactiver l'accélération de la souris `kbm_accel` 🔒 🔁
Coupe « Améliorer la précision du pointeur » : le curseur bouge de la même distance, quelle que soit la vitesse de ton geste.
- Gain : Visée plus régulière et prévisible en PvP ; ne réduit pas la latence.
- Inconvénient : Le curseur peut sembler plus lent sur le bureau, surtout sur grand écran.
- Dans les presets : PC portable (voir [[Tweaks Presets]]).

### Mouvement 1:1 sans lissage `kbm_1to1` 🔒 🔁
Coupe « Améliorer la précision du pointeur » et remet la vitesse du pointeur Windows au cran 6/11, pour un mouvement 1:1.
- Gain : Un même geste donne toujours le même déplacement : visée plus régulière, sans baisse de latence.
- Inconvénient : Si tu avais changé la vitesse du pointeur, elle repasse au cran 6 : règle ta sensibilité en jeu ou sur ta souris.
- Dans les presets : PC portable (voir [[Tweaks Presets]]).

### Priorité des pilotes souris et clavier `kbm_thread` 🔒 🔁
Demande la priorité maximale pour les pilotes Windows de la souris et du clavier.
- Gain : Effet rarement mesurable sur un PC récent.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, Latence minimale, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Minecraft Bedrock (voir [[Tweaks Presets]]).

### CSRSS en temps réel `kbm_csrss` 🔒 ⚠️ 🔁
Demande la priorité temps réel pour le processus Windows qui transmet le clavier et la souris aux applis.
- Gain : Effet rarement mesurable : Windows ignore la priorité de ce processus protégé.
- Inconvénient : Aucun inconvénient connu.

### Répétition clavier instantanée `kbm_repeat` 🔒 🔁
Règle la répétition des touches au plus rapide : délai le plus court et vitesse maximale quand tu restes appuyé.
- Gain : Plus de confort pour écrire ; en jeu, l'effet est quasi nul car les jeux lisent l'appui directement.
- Inconvénient : Une touche gardée un peu trop longtemps peut se répéter sans que tu le veuilles.

### Réglages souris du panneau de configuration `kbm_panel` 🔒 🔁
Coupe l'accélération de la souris, remet la vitesse du pointeur au cran 6/11 et réduit le délai de survol.
- Gain : Visée plus régulière en PvP ; le reste relève du confort, sans baisse de latence.
- Inconvénient : Si tu avais changé la vitesse du pointeur, elle repasse au cran 6 ; le curseur peut sembler plus lent sur le bureau.

### Désactiver les touches rémanentes et filtres `kbm_filter` 🔒 🔁
Coupe les raccourcis des touches rémanentes, filtres et bascules (comme Maj 5 fois de suite) et les touches souris.
- Gain : Plus de fenêtre qui interrompt ton jeu quand tu appuies plusieurs fois sur Maj.
- Inconvénient : Si tu utilises ces aides d'accessibilité, il faudra les activer depuis les paramètres de Windows.
- Dans les presets : PC portable (voir [[Tweaks Presets]]).

## Processeur

### CPU AMD `cpu_amd` 🔒 🔁
Pour AMD : tous les cœurs actifs et processeur à 100 % sur secteur, ventilateurs prioritaires et veille hybride coupée.
- Gain : Peut rendre les images plus régulières, surtout sur Ryzen et sur portable branché.
- Inconvénient : Plus de chaleur, de bruit et de consommation ; sans veille hybride, une coupure de courant en veille efface ton travail.
- Nécessite : `cpu:amd`
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### CPU Intel `cpu_intel` 🔒 🔁
Pour Intel : tous les cœurs actifs et processeur à 100 % sur secteur, ventilateurs prioritaires et veille hybride coupée.
- Gain : Peut rendre les images plus régulières, surtout sur portable branché.
- Inconvénient : Plus de chaleur, de bruit et de consommation ; sans veille hybride, une coupure de courant en veille efface ton travail.
- Nécessite : `cpu:intel`
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### CPU avancé `cpu_advanced` 🔒 ⚠️ 🔁
Gros pack processeur : tous les cœurs actifs, 100 % sur secteur, 50 % minimum sur batterie, boost maximal et moins d'économies.
- Gain : Peut stabiliser les images sur certains PC ; beaucoup des valeurs écrites n'existent pas dans Windows.
- Inconvénient : Plus de chaleur, de bruit et de consommation, autonomie nettement réduite sur portable et veille hybride coupée.

### Latence système `sys_latency` 🔒 🔁
Demande la priorité maximale pour les pilotes USB, réseau et NVIDIA, et une priorité plus haute pour le processus clavier-souris.
- Gain : Effet rarement mesurable : Windows et les pilotes récents ignorent souvent ces valeurs.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Latence minimale, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Réglages processeur du registre `cpu_registry` 🔒 🔁
Écrit des dizaines de réglages processeur dans le registre et coupe la limitation d'énergie des applis en arrière-plan.
- Gain : Couper cette limitation peut aider sur portable branché ; la plupart des autres valeurs sont ignorées.
- Inconvénient : Les applis en arrière-plan ne sont plus économisées : un peu plus de consommation et moins d'autonomie.

### Réglages spécifiques au processeur `cpu_vendor` 🔒 ⚠️ 🔁
Intel ou AMD, les deux font la même chose : tous les cœurs actifs, 100 % sur secteur, ventilateurs prioritaires.
- Variantes : Intel (`intel`), AMD (`amd`) ; par défaut `intel`.
- Gain : Peut rendre les images plus régulières, surtout sur Ryzen et sur portable branché.
- Inconvénient : Plus de chaleur, de bruit et de consommation ; sans veille hybride, une coupure de courant en veille efface ton travail.

### Désactiver le parking des cœurs `cpu_parking` 🔒
Garde tous les cœurs du processeur actifs quand le PC est branché, au lieu d'en mettre certains en pause.
- Gain : Peut réduire les micro-saccades, surtout sur Ryzen et sur portable branché.
- Inconvénient : Un peu plus de chaleur et de consommation, même quand le PC ne fait rien.
- Dans les presets : Minecraft PvP, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Configurer les C-states `cpu_cstates_cfg` 🔒
Rend le processeur plus lent à passer en veille profonde quand le PC est branché.
- Gain : Peut réduire un peu le temps de réaction du processeur ; effet souvent faible sur un PC récent.
- Inconvénient : Un peu plus de chaleur et de consommation au repos.

### Désactiver la veille et le minimum processeur `cpu_cstates_off` 🔒
Sur secteur, empêche la mise en veille du PC (veille, veille hybride, mode absence) et garde le processeur à 100 % minimum.
- Gain : Le processeur à 100 % peut rendre les images plus régulières ; couper la veille n'apporte rien en jeu.
- Inconvénient : Le PC branché ne se met plus en veille, même inutilisé : plus de chaleur, de bruit et de consommation.

### Gestion du repos processeur `cpu_idle` 🔒 🔁
Écrit une quarantaine de valeurs de « repos processeur » dans le registre.
- Gain : Aucun effet attendu : ces valeurs n'existent pas dans Windows, qui ne les lit jamais.
- Inconvénient : Aucun inconvénient connu.

### Politique de repos des périphériques : performance `cpu_device_idle` 🔒
Demande aux périphériques de privilégier la performance plutôt que l'économie d'énergie quand le PC est branché.
- Gain : Effet rarement mesurable : sur secteur, Windows utilise souvent déjà ce mode.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### P-states adaptés aux C-states `cpu_pstates` 🔒
Adapte les seuils de repos du processeur à sa vitesse du moment, quand le PC est branché.
- Gain : Effet rarement mesurable sur un PC récent.
- Inconvénient : Aucun inconvénient connu.

### Fréquence d'origine du processeur `cpu_ppm` 🔒 🔁 ⚙️
Remet les pilotes de gestion d'énergie du processeur (Intel et AMD) en démarrage normal, comme à l'origine.
- Gain : Utile seulement si un autre outil les avait coupés : le processeur retrouve sa gestion de vitesse normale.
- Inconvénient : Aucun inconvénient connu.

### Ne pas brider le boost `cpu_boost_epp` 🔒
Dit au processeur de privilégier la performance plutôt que l'économie d'énergie quand le PC est branché.
- Gain : Sur les processeurs récents, peut faire monter la fréquence plus vite.
- Inconvénient : Plus de chaleur, de bruit et de consommation.

### Désactiver les états de bridage `cpu_throttle` 🔒
Empêche Windows d'utiliser les états de bridage du processeur pour économiser l'énergie, quand le PC est branché.
- Gain : Effet rarement mesurable : les processeurs récents utilisent peu ces états.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### Activer le Turbo Boost `cpu_turbo` 🔒
Autorise le boost du processeur (Turbo Boost, Precision Boost) au-delà de sa fréquence de base, quand le PC est branché.
- Gain : Utile seulement si le boost était coupé : il est déjà actif par défaut sur la plupart des PC.
- Inconvénient : Plus de chaleur, de bruit et de consommation quand le processeur monte en boost.
- Dans les presets : FPS max, Roblox, GTA V (voir [[Tweaks Presets]]).

### Refroidissement actif `cpu_cooling` 🔒
Fait accélérer les ventilateurs avant de ralentir le processeur quand il chauffe, sur secteur comme sur batterie.
- Gain : Peut éviter que le processeur ralentisse en chauffant, surtout sur portable sur batterie.
- Inconvénient : Ventilateurs plus bruyants et autonomie réduite sur batterie.

### Processeur à 100 % sur secteur `cpu_ac` 🔒
Garde le processeur à pleine vitesse quand le PC est branché.
- Gain : Peut rendre les images plus régulières, surtout sur Ryzen et sur portable branché.
- Inconvénient : Plus de chaleur, de bruit et de consommation.

### Processeur sur batterie `cpu_dc` 🔒
Sur batterie, garde le processeur à au moins 50 % de sa vitesse, sans limiter son maximum.
- Gain : Peut rendre le jeu plus fluide sur portable débranché.
- Inconvénient : La batterie se vide nettement plus vite et le portable chauffe davantage.

### Démarrer avec tous les cœurs `cpu_numproc` 🔒 ⚠️ 🔁
Indique au démarrage de Windows un nombre fixe de cœurs à utiliser : celui de ton processeur actuel.
- Gain : Aucun effet attendu : Windows utilise déjà tous les cœurs par défaut.
- Inconvénient : Modifie le démarrage : si tu changes de processeur, Windows restera limité à l'ancien nombre de cœurs.

### Désactiver le mode absence `cpu_away` 🔒
Coupe le mode absence, qui permet à certaines applis de garder le PC allumé écran éteint au lieu de le mettre en veille.
- Gain : Aucun effet en jeu ; le PC se met vraiment en veille quand tu le demandes.
- Inconvénient : Aucun inconvénient connu.

## Mémoire

### Optimisation de la RAM `sys_ram` 🔒 ⚠️ 🔁
Réglages mémoire selon ta RAM (choisie automatiquement) : compression coupée dès 16 Go, lancement anticipé des applis coupé.
- Variantes : 4 Go (`4`), 8 Go (`8`), 12 Go (`12`), 16 Go (`16`), 24 Go (`24`), 32 Go (`32`), 48 Go (`48`), 64 Go (`64`), 128 Go (`128`) ; par défaut `16`.
- Gain : Effet rarement mesurable : Windows gère déjà la mémoire seul et ignore une bonne partie de ces réglages.
- Inconvénient : Certaines applis du Store s'ouvrent un peu plus lentement ; dès 16 Go, saccades possibles si la RAM se remplit.
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### Optimisation du registre `sys_registry` 🔒 ⚠️ 🔁
Plus de 150 réglages : priorités des jeux, minuteurs, recherche web, télémétrie, notifications, synchro et applis en arrière-plan.
- Gain : Plus de vie privée et moins de distractions ; effet sur les FPS rarement mesurable.
- Inconvénient : Coupe notifications, transparence et applis du Store en arrière-plan ; peut sembler suspect en screenshare Minecraft.

### Profil mémoire selon ta RAM `mem_profile` 🔒 🔁
Réglages mémoire selon ta RAM (choisie automatiquement) : compression coupée dès 16 Go, fusion des pages mémoire coupée.
- Variantes : 4 Go (`4`), 8 Go (`8`), 12 Go (`12`), 16 Go (`16`), 24 Go (`24`), 32 Go (`32`), 48 Go (`48`), 64 Go (`64`), 128 Go (`128`) ; par défaut `4`.
- Gain : Effet rarement mesurable : Windows gère déjà la mémoire seul et ignore une bonne partie de ces réglages.
- Inconvénient : Windows peut utiliser un peu plus de RAM ; dès 16 Go, saccades possibles si la RAM se remplit.

### Regrouper les services (svchost) `mem_svchost` 🔒 🔁
Regroupe les services de Windows dans moins de processus, avec un seuil calculé d'après ta RAM.
- Gain : Moins de processus dans le Gestionnaire des tâches ; effet sur les FPS quasi nul.
- Inconvénient : Si un service plante, il peut entraîner avec lui les autres services de son groupe.

### Gestion mémoire du noyau `mem_registry` 🔒 🔁
Garde le cœur de Windows en RAM plutôt que dans le fichier d'échange et change des tailles de mémoire système.
- Gain : Effet rarement mesurable : les Windows récents ignorent la plupart de ces valeurs.
- Inconvénient : Aucun inconvénient connu.

### Désactiver la compression mémoire `mem_compression` 🔒
Coupe la compression de la mémoire, qui permet à Windows de faire tenir plus de données en RAM.
- Gain : Peut économiser un peu de processeur sur un PC avec beaucoup de RAM ; effet souvent faible.
- Inconvénient : Avec peu de RAM (8 Go ou moins), Windows utilise plus le disque et les saccades peuvent augmenter.

### Désactiver la fusion de pages `mem_combining` 🔒
Windows arrête de chercher les zones de mémoire identiques pour les fusionner.
- Gain : Effet rarement mesurable : peut économiser un peu de processeur en arrière-plan.
- Inconvénient : Windows peut utiliser un peu plus de RAM.

### Désactiver SysMain (Superfetch) `mem_superfetch` 🔒 🔁
Écrit un ancien réglage censé couper le préchargement des applis en mémoire.
- Gain : Effet improbable : Windows 10 et 11 ignorent ce réglage, le préchargement reste actif.
- Inconvénient : Aucun inconvénient connu.

## Alimentation

### Optimisation de l'alimentation `pow_main` 🔒 🔁
Coupe plusieurs économies d'énergie : ralentissement des applis en arrière-plan, veille des liaisons SATA et des disques.
- Gain : Peut rendre les images plus régulières sur certains PC, surtout les portables branchés.
- Inconvénient : Plus de consommation et moins d'autonomie sur portable.
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### Plan Performances optimales `pow_ultimate` 🔒 ⚠️ 🔁
Ajoute et active le plan Performances optimales, supprime les plans par défaut et affiche les options d'alimentation cachées.
- Gain : Peut rendre les images plus régulières, surtout sur Ryzen et sur portable branché.
- Inconvénient : Plus de chaleur et de consommation ; les plans Équilibré, Performances élevées et Économie d'énergie sont supprimés.

### Veille des disques `pow_saving` 🔒 🔁
Modifie les valeurs de veille des SSD et cartes SD que Windows utilise pour estimer leur consommation.
- Gain : Effet rarement mesurable : ces valeurs servent surtout à estimer la consommation, pas à gérer la veille.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### Horodatage des fichiers `sys_time` 🔒 🔁
Windows ne note plus quand chaque fichier a été ouvert et ne crée plus d'anciens noms courts (format DOS) pour les fichiers.
- Gain : Peut réduire un peu les écritures sur le disque ; effet rarement mesurable.
- Inconvénient : La date de dernier accès n'est plus mise à jour, et de très vieux programmes peuvent mal gérer les nouveaux fichiers.
- Dans les presets : Latence minimale (voir [[Tweaks Presets]]).

### Minuteurs de démarrage (BCD) `sys_bcdedit` 🔒 ⚠️ 🔁
Modifie les réglages de démarrage de Windows : gestion des minuteurs du processeur et animation de démarrage masquée.
- Gain : Effet rarement mesurable : Windows gère déjà bien ses minuteurs.
- Inconvénient : Change les réglages de démarrage de Windows, et le PC peut consommer un peu plus au repos.

### Plan d'alimentation Rago Low Latency `pow_plan` 🔒
Installe et active le plan d'alimentation Rago, réglé pour la performance, et affiche les options d'alimentation cachées.
- Gain : Peut rendre les images plus régulières, surtout sur Ryzen et sur portable branché.
- Inconvénient : Plus de chaleur, de bruit et de consommation ; moins d'autonomie sur portable. Branché, le PC ne se met plus en veille et l'écran ne s'éteint plus tout seul.
- Nécessite : `res:LowLatency.pow`

### Réglages d'alimentation complémentaires `pow_extra` 🔒 🔁
Coupe le ralentissement des applis en arrière-plan et l'estimation de consommation, plus des réglages processeur peu documentés.
- Gain : Peut rendre les images plus régulières sur portable branché ; le reste a un effet rarement mesurable.
- Inconvénient : Plus de consommation et moins d'autonomie sur portable.

### Réglages d'alimentation Windows `pow_windows` 🔒 🔁
Coupe l'hibernation, le démarrage rapide, le mode absence et le ralentissement des applis en arrière-plan.
- Gain : Libère l'espace du fichier d'hibernation ; images parfois plus régulières sur portable branché.
- Inconvénient : Hibernation indisponible, démarrage un peu plus long après un arrêt et moins d'autonomie sur portable.

### Désactiver le Power Throttling `pow_throttling` 🔒 🔁
Windows ne ralentit plus les applis qu'il juge en arrière-plan pour économiser l'énergie.
- Gain : Peut rendre les images plus régulières sur certains PC, surtout les portables branchés.
- Inconvénient : Plus de consommation et moins d'autonomie sur portable.
- Dans les presets : Minecraft PvP, FPS max, Latence minimale, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### P-states matériels `pow_hwp` 🔒
Laisse le processeur choisir lui-même sa fréquence quand le PC est branché, au lieu de Windows.
- Gain : Effet souvent nul : la plupart des processeurs récents fonctionnent déjà comme ça.
- Inconvénient : Aucun inconvénient connu.

### Réglages d'alimentation MMCSS `pow_mmcss` 🔒 🔁
Écrit des réglages de priorité multimédia à des endroits que Windows ne lit pas.
- Gain : Effet improbable : Windows ne lit pas ces réglages.
- Inconvénient : Aucun inconvénient connu.

### Désactiver l'économie d'énergie des pilotes `pow_idle` 🔒 🔁
Les contrôleurs de disque ne se mettent plus en veille quand ils ne servent pas.
- Gain : Peut éviter de petits temps de réveil du disque ; effet rarement mesurable en jeu.
- Inconvénient : Un peu plus de consommation, surtout sur portable.

### Désactiver l'économie des liens SATA `pow_link` 🔒 🔁
Les disques SATA ne coupent plus leur liaison avec le PC pour économiser l'énergie.
- Gain : Peut éviter de petits temps de réveil du disque ; effet rarement mesurable en jeu.
- Inconvénient : Un peu plus de consommation, surtout sur portable.

### Économie d'énergie des périphériques `pow_devices` 🔒
Décoche « Autoriser l'ordinateur à éteindre ce périphérique » sur tous tes périphériques.
- Gain : Peut éviter qu'une souris, un casque ou la carte réseau se coupe ou se réveille en retard.
- Inconvénient : Un peu plus de consommation ; moins d'autonomie sur portable.

### Désactiver le pilote d'énergie GPU `pow_gpuenergy` 🔒 🔁
Désactive le pilote de Windows qui mesure la consommation d'énergie de la carte graphique.
- Gain : Effet rarement mesurable sur les FPS.
- Inconvénient : Aucun inconvénient connu.

### États de veille NVMe `pow_storage` 🔒 🔁
Modifie les valeurs de veille des SSD et cartes SD que Windows utilise pour estimer leur consommation.
- Gain : Effet rarement mesurable : ces valeurs servent surtout à estimer la consommation, pas à gérer la veille.
- Inconvénient : Aucun inconvénient connu.
- Jumeau de `pow_saving` (même script, compté une fois).

### Gestion d'énergie des disques `pow_storage_apm` 🔒 🔁
Empêche tes disques de passer en veille et, si smartctl est là, coupe le mode économie et silence des disques durs.
- Gain : Peut éviter les temps de réveil d'un disque dur ; effet rarement mesurable sur un SSD.
- Inconvénient : Disques durs plus bruyants, plus de consommation, et sur portable la batterie se vide plus vite en veille.
- Nécessite : `res:smartctl.exe`

### Désactiver l'hibernation et Sleep Study `pow_hibernate` 🔒 🔁
Coupe l'hibernation, le démarrage rapide et le suivi de la mise en veille de Windows (Sleep Study).
- Gain : Libère plusieurs Go sur le disque système ; aucun effet sur les FPS.
- Inconvénient : Hibernation indisponible (sur portable, une batterie vide en veille ferme tout) et démarrage un peu plus lent.

### Désactiver l'estimation d'énergie `pow_telemetry` 🔒 🔁
Coupe l'estimation, par Windows, de la consommation d'énergie de chaque appli.
- Gain : Un peu moins de suivi en arrière-plan ; effet sur les FPS quasi nul.
- Inconvénient : L'utilisation de la batterie par appli peut ne plus s'afficher dans les paramètres.

### Supprimer les plans par défaut `pow_delete_plans` 🔒 ⚠️
Supprime les plans d'alimentation Équilibré, Performances élevées et Économie d'énergie de Windows.
- Gain : Aucun effet sur les performances : ça évite juste de repasser par erreur sur un de ces plans.
- Inconvénient : Tu ne peux plus choisir ces plans, ce qui gêne surtout sur portable pour économiser la batterie.

## Stockage

### Optimisation du stockage `sto_general` 🔒 ⚠️ 🔁
Active le cache d'écriture des disques internes et vide les fichiers temporaires, caches des navigateurs et de Windows Update.
- Gain : Libère de l'espace disque ; aucun gain de FPS.
- Inconvénient : Sites et miniatures un peu plus lents à recharger la première fois ; le nettoyage peut prendre plusieurs minutes.

### Réglages NTFS `sto_ntfs` 🔒 🔁
Agrandit le cache des fichiers, coupe la date de dernier accès, garde le TRIM actif et ne chiffre plus le fichier d'échange.
- Gain : Effet rarement mesurable : Windows gère déjà bien ces réglages.
- Inconvénient : La date de dernier accès des fichiers n'est plus mise à jour, et le système de fichiers utilise un peu plus de RAM.

### Réglages FSUTIL `sto_fsutil_v6` 🔒 🔁
Windows ne note plus quand chaque fichier a été ouvert et ne crée plus d'anciens noms courts (format DOS) pour les fichiers.
- Gain : Peut réduire un peu les écritures sur le disque ; effet rarement mesurable.
- Inconvénient : La date de dernier accès n'est plus mise à jour, et de très vieux programmes peuvent mal gérer les nouveaux fichiers.
- Jumeau de `sys_time` (même script, compté une fois).

### Réglages de fichiers FSUTIL `sto_fsutil2` 🔒 🔁
Windows ne note plus quand chaque fichier a été ouvert et ne crée plus d'anciens noms courts (format DOS) pour les fichiers.
- Gain : Peut réduire un peu les écritures sur le disque ; effet rarement mesurable.
- Inconvénient : La date de dernier accès n'est plus mise à jour, et de très vieux programmes peuvent mal gérer les nouveaux fichiers.
- Jumeau de `sys_time` (même script, compté une fois).

### Optimiser le disque `sto_defrag` 🔒 ⚙️
Lance tout de suite un TRIM du disque C, qui signale au SSD ses espaces libres ; Windows le fait normalement chaque semaine.
- Gain : Peut aider un SSD à garder ses vitesses d'écriture ; sans effet sur un disque dur.
- Inconvénient : Aucun inconvénient connu.

### Réglages NTFS selon ton disque `sto_fsutil` 🔒
SSD : coupe la date de dernier accès et les noms courts DOS. Disque dur : laisse Windows gérer la date, garde les noms courts.
- Variantes : SSD (`ssd`), Disque dur (`hdd`) ; par défaut `ssd`.
- Gain : Peut réduire un peu les écritures sur le disque ; effet rarement mesurable.
- Inconvénient : Avec SSD, la date de dernier accès n'est plus mise à jour ; de très vieux programmes peuvent être gênés.

### Activer le cache d'écriture `sto_writecache` 🔒 🔁
Active le cache d'écriture de tes disques internes ; les clés et disques USB ne sont pas touchés.
- Gain : Peut accélérer les écritures, mais Windows l'active souvent déjà par défaut.
- Inconvénient : En cas de coupure de courant brutale, les dernières données écrites peuvent être perdues.

### Économie d'énergie des SSD `sto_ssdpower` 🔒 🔁
Modifie les valeurs de veille des SSD et cartes SD que Windows utilise pour estimer leur consommation.
- Gain : Effet rarement mesurable : ces valeurs servent surtout à estimer la consommation, pas à gérer la veille.
- Inconvénient : Aucun inconvénient connu.
- Jumeau de `pow_saving` (même script, compté une fois).

### TRIM du disque système `sto_trim` 🔒 ⚙️
Lance tout de suite un TRIM du disque C, qui signale au SSD ses espaces libres ; Windows le fait normalement chaque semaine.
- Gain : Peut aider un SSD à garder ses vitesses d'écriture ; sans effet sur un disque dur.
- Inconvénient : Aucun inconvénient connu.
- Jumeau de `sto_defrag` (même script, compté une fois).

## USB

### Optimisation USB `sys_usb` 🔒 🔁
Coupe la mise en veille des ports USB et demande une priorité plus haute pour les pilotes USB, réseau et NVIDIA.
- Gain : Peut éviter qu'une souris ou un casque USB se coupe ; la partie priorité a un effet rarement mesurable.
- Inconvénient : Un peu plus de consommation ; moins d'autonomie sur portable.
- Dans les presets : FPS max (voir [[Tweaks Presets]]).

### Priorité des pilotes USB `usb_priority` 🔒 🔁
Demande une priorité plus haute pour les pilotes USB, réseau, NVIDIA et graphiques de Windows.
- Gain : Effet rarement mesurable : ce réglage est souvent ignoré par les Windows récents.
- Inconvénient : Aucun inconvénient connu.

### Désactiver la mise en veille USB `usb_power` 🔒 🔁
Empêche tes contrôleurs USB de se mettre en veille pour économiser l'énergie.
- Gain : Peut éviter qu'une souris, un clavier ou un casque USB se coupe ou réagisse en retard.
- Inconvénient : Un peu plus de consommation ; moins d'autonomie sur portable.
- Dans les presets : Latence minimale, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Économies USB cachées `usb_hidden` 🔒 🔁
Coupe les économies d'énergie cachées de tous les périphériques qui en ont, pas seulement l'USB.
- Gain : Peut éviter des coupures ou des réveils lents de certains périphériques ; effet rarement mesurable en jeu.
- Inconvénient : Plus de consommation, et sur portable la batterie dure moins, même en veille.

### Priorité des contrôleurs SATA `usb_controller` 🔒 🔁 ⚙️
Retire la priorité d'interruption forcée des contrôleurs de disque SATA, si un outil en avait fixé une.
- Gain : Utile seulement si un autre outil avait changé ce réglage ; sinon aucun effet.
- Inconvénient : Aucun inconvénient connu.

### Mode MSI sur les contrôleurs USB `usb_msi` 🔒 🔁
Passe tes contrôleurs USB en mode d'interruption MSI et retire leur priorité forcée.
- Gain : Effet souvent nul : les contrôleurs USB récents utilisent déjà ce mode ; peut aider sur du vieux matériel.
- Inconvénient : Rare : sur certains contrôleurs, des périphériques USB peuvent mal fonctionner.

### Optimisation USB avancée `usb_advanced` 🔒 🔁
Regroupe la coupure de la veille USB, la priorité des pilotes USB, réseau et NVIDIA et le mode MSI des contrôleurs USB.
- Gain : Peut éviter des coupures de périphériques USB ; le reste a un effet rarement mesurable.
- Inconvénient : Plus de consommation sur portable ; rare : certains contrôleurs USB gèrent mal le mode MSI.
