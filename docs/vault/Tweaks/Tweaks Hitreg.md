---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks Hitreg

Module **Hitreg** (`hitreg`) de l'app 1.2.1 : La suite avancée pour que tes coups passent.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Latence d'entrée

### Latence des pilotes `in_driver` 🔒 🔁
Met à zéro un réglage de latence dans les pilotes qui en ont un, surtout ceux des disques.
- Gain : Effet rarement mesurable en jeu.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, Latence minimale, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Latence de la carte `in_adapter` 🔒 🔁
Règle les tampons réseau, les accusés de réception et la durée de vie des paquets, et met la carte réseau sur un seul cœur.
- Gain : Effet rarement mesurable : ces valeurs changent peu de chose en jeu.
- Inconvénient : Toutes les interruptions réseau passent par un seul cœur, ce qui peut limiter le débit d'une connexion très rapide.
- Dans les presets : Minecraft PvP, Latence minimale (voir [[Tweaks Presets]]).

### Latence de Windows `in_windows` 🔒 ⚠️ 🔁
Mélange réseau, démarrage et énergie : coupe la veille des disques et de la carte réseau, et vide les fichiers temporaires.
- Gain : Effet rarement mesurable : la plupart de ces valeurs changent peu de chose sur un Windows récent.
- Inconvénient : Modifie les réglages de démarrage, coûte un peu de batterie et peut gêner le chat de groupe Xbox.
- Dans les presets : Minecraft PvP, Latence minimale (voir [[Tweaks Presets]]).

### Latence des images `in_frames` 🔒 🔁
Écrit des variables système censées limiter les images en attente dans DirectX ; « Par défaut » les efface.
- Variantes : Minimale (`lowest`), Équilibrée (`balanced`), Par défaut (`default`, retour) ; par défaut `lowest`.
- Gain : Effet peu probable : ni Windows ni les jeux ne lisent ces variables.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Latence minimale (voir [[Tweaks Presets]]).

### Latence avancée `in_advanced` 🔒 ⚠️ 🔁
Gros pack : démarrage, priorités, réseau, Game DVR coupé, vie privée, notifications et apparence de Windows.
- Gain : Couper le Game DVR peut aider sur un petit PC ; le reste a un effet rarement mesurable en jeu.
- Inconvénient : Coupe notifications, pilotes de Windows Update et alerte avant d'ouvrir un téléchargement ; change couleurs et curseurs.

## Souris et clavier

### Optimisation de la souris `in_mouse` 🔒
Coupe l'accélération de la souris de Windows pour que le pointeur suive exactement ta main, et raccourcit le délai de survol.
- Gain : Visée plus régulière : le même geste donne toujours le même déplacement ; pas de gain de latence.
- Inconvénient : Ta vitesse de pointeur Windows est remise au réglage du milieu.
- Dans les presets : Minecraft PvP, Latence minimale, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Optimisation du clavier `in_keyboard` 🔒
Répétition des touches au plus rapide et raccourcis d'accessibilité coupés, comme les touches rémanentes (Maj 5 fois).
- Gain : Plus de fenêtre des touches rémanentes en pleine partie ; aucun gain de latence mesurable.
- Inconvénient : Les touches se répètent plus vite si tu restes appuyé ; les aides d'accessibilité du clavier sont coupées.
- Dans les presets : Minecraft PvP, Latence minimale, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Minecraft Bedrock (voir [[Tweaks Presets]]).

### File souris et clavier `in_queue` 🔒 🔁
Règle combien de clics et de touches les pilotes gardent en file ; « Par défaut » remet la valeur de Windows.
- Variantes : Ultra basse (`ultra`), Basse (`low`), Équilibrée (`balanced`), Par défaut (`default`, retour) ; par défaut `ultra`.
- Gain : Effet rarement mesurable : cette file ne se remplit presque jamais en jeu.
- Inconvénient : Avec une souris à 4000 Hz ou plus, une file trop petite peut faire rater des mouvements.
- Dans les presets : Minecraft PvP, Latence minimale, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Minecraft Bedrock (voir [[Tweaks Presets]]).

## Suite Hitreg

### Suite Hitreg avancée `hitreg_suite` 🔒 ⚠️ 🔁
Plus de 300 réglages : processeur à fond sur secteur, priorités, minuteurs, mémoire, vie privée ; 4 profils presque identiques.
- Variantes : PC puissant (`good`), PC moyen (`medium`), PC modeste (`low`), PC portable (`laptop`) ; par défaut `medium`.
- Gain : Peut rendre les images plus régulières sur un PC branché ; le reste a un effet rarement mesurable.
- Inconvénient : Plus de chaleur ; localisation et applis Store en fond coupées ; touche au préchargement, vérifié en screenshare.
