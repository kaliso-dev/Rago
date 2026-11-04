---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks Mode expert

Module **Mode expert** (`expert`) de l'app 1.2.1 : Noyau, démarrage et sécurité. Puissant, à utiliser en connaissance de cause.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Noyau et timers

### Priorité des entrées-sorties `exp_io` 🔒 🔁
Baisse la priorité de l'indexation de la recherche et des mises à jour Windows, et monte celle de l'affichage du bureau.
- Gain : Effet rarement mesurable ; peut limiter un peu l'activité de fond pendant tes parties.
- Inconvénient : La recherche Windows et l'installation des mises à jour peuvent être plus lentes.

### Retirer le plafond de latence disque `exp_iolatency` 🔒 🔁
Retire le plafond de latence que certains pilotes de stockage appliquent aux accès disque.
- Gain : Effet rarement mesurable sur un PC de jeu.
- Inconvénient : Aucun inconvénient connu.

### Réglages du noyau `exp_kernel` 🔒 ⚠️ 🔁
Empêche Windows de déplacer les interruptions d'un cœur à l'autre et règle quelques délais de l'affichage.
- Gain : Effet rarement mesurable ; deux des réglages sont déjà ceux de Windows par défaut.
- Inconvénient : Aucun inconvénient connu.

### Réglages complémentaires `exp_misc` 🔒 🔁
Minuteurs répartis sur les cœurs, réglage de veille du SSD NVMe modifié, option Veille masquée, date de dernier accès coupée.
- Gain : Effet rarement mesurable en jeu.
- Inconvénient : L'option Veille disparaît du menu Marche/Arrêt, et la date de dernier accès des fichiers n'est plus mise à jour.

### Désactiver le mode paresseux MMCSS `exp_nolazy` 🔒 🔁
Garde le planificateur multimédia de Windows toujours actif, sans mode économie.
- Gain : Effet rarement mesurable : réglage non documenté, souvent ignoré.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, FPS max, Latence minimale, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Tolérance de latence du GPU `exp_lattol` 🔒 🔁
Raccourcit des délais internes du pilote NVIDIA avant ses passages en économie d'énergie, sur la première carte graphique.
- Gain : Effet rarement mesurable : réglages non documentés, et sur portable ils peuvent viser la puce intégrée.
- Inconvénient : Aucun inconvénient connu.
- Jumeau de `nv_latency` (même script, compté une fois).

### Tolérance de latence de l'écran `exp_monitorlat` 🔒 🔁
Règle sur zéro le délai que le noyau graphique de Windows tolère du côté de l'écran.
- Gain : Effet rarement mesurable.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Latence minimale (voir [[Tweaks Presets]]).

### Forcer la fréquence de l'écran `exp_hz` 🔒 🔁
Force la fréquence d'écran des très vieux jeux DirectDraw ; neuf choix de 60 à 360 Hz, prends exactement celle de ton écran.
- Variantes : 60 Hz (`60`), 75 Hz (`75`), 120 Hz (`120`), 144 Hz (`144`), 160 Hz (`160`), 165 Hz (`165`), 240 Hz (`240`), 280 Hz (`280`), 360 Hz (`360`) ; par défaut `144`.
- Gain : Utile seulement pour de très vieux jeux : Minecraft et les jeux récents n'en tiennent pas compte.
- Inconvénient : Une fréquence plus haute que celle de ton écran peut donner un écran noir « hors limites » dans ces vieux jeux.

### Réglages multimédia Microsoft `exp_multimedia` 🔒 🔁
Écrit quelques anciens réglages « jeux » de Windows (affichage des FPS, fluidité) dans ton profil.
- Gain : Effet improbable : les Windows récents ne semblent pas utiliser ces réglages.
- Inconvénient : Aucun inconvénient connu.

### Politique de ressources `exp_policy` 🔒 🔁
Retire les limites que Windows impose aux applis en arrière-plan (processeur, disque, mémoire) et leur donne la même importance.
- Gain : Effet rarement mesurable en jeu.
- Inconvénient : Les applis en arrière-plan ne sont plus freinées : elles peuvent prendre plus de processeur et de batterie.

### Réglages NTFS `exp_ntfs` 🔒 🔁
Agrandit le cache des fichiers, coupe la date de dernier accès, garde le TRIM actif et ne chiffre plus le fichier d'échange.
- Gain : Effet rarement mesurable : Windows gère déjà bien ces réglages.
- Inconvénient : La date de dernier accès des fichiers n'est plus mise à jour, et le système de fichiers utilise un peu plus de RAM.
- Jumeau de `sto_ntfs` (même script, compté une fois).

### Accélérer le démarrage `exp_startup` 🔒 🔁
Supprime le délai que Windows attend avant de lancer les applis de démarrage.
- Gain : Les applis de démarrage s'ouvrent plus tôt après la connexion ; aucun effet en jeu.
- Inconvénient : Juste après la connexion, le PC peut ramer un peu plus car tout démarre en même temps.

## Système

### Désactiver Windows Insider `exp_insider` 🔒 🔁
Empêche Microsoft de tester des fonctions ou réglages expérimentaux sur ton PC.
- Gain : Peut éviter des changements de Windows faits sans prévenir ; effet sur les FPS quasi nul.
- Inconvénient : Aucun inconvénient connu.
- Jumeau de `win_experiments` (même script, compté une fois).

### Désactiver les journaux automatiques `exp_autologgers` 🔒 🔁
Coupe une trentaine de journaux système qui écrivent en continu sur le disque, et les suggestions d'applis sponsorisées.
- Gain : Un peu moins d'écritures en fond ; effet sur les FPS rarement mesurable.
- Inconvénient : Moins de traces pour diagnostiquer un problème, et un démarrage parfois plus lent sur disque dur.
- Jumeau de `dbl_autologgers` (même script, compté une fois).

### Désactiver la maintenance `exp_maintenance` 🔒 🔁
Coupe la maintenance automatique que Windows lance quand le PC est inactif (disques, ménage, diagnostics).
- Gain : Peut éviter qu'une tâche de fond démarre pendant une partie ; effet souvent faible.
- Inconvénient : Windows n'optimise plus tes disques tout seul et ne fait plus son ménage ni ses diagnostics automatiques.
- Jumeau de `win_maintenance` (même script, compté une fois).

### Optimiser la recherche `exp_search` 🔒 🔁
La recherche du menu Démarrer ne va plus sur le web (Bing) ni n'utilise ta position, et Windows n'apprend plus de ta frappe.
- Gain : Plus de vie privée et des résultats limités à ton PC ; effet sur les FPS quasi nul.
- Inconvénient : Plus de résultats web ni de réponses Bing dans le menu Démarrer, et l'Explorateur ne garde plus tes recherches récentes.
- Jumeau de `win_search` (même script, compté une fois).

## Sécurité et démarrage

### Mappage mémoire PCI-E `exp_pcie` 🔒 ⚠️ 🔁
Règle la façon dont Windows configure au démarrage les composants PCI Express (carte graphique, SSD NVMe, etc.).
- Gain : Effet improbable : ces valeurs sont pour la plupart déjà celles de Windows par défaut.
- Inconvénient : Modifie les paramètres de démarrage de Windows.

### Renforcer SMB `exp_smb` 🔒 ⚠️ 🔁
Renforce le partage de fichiers en réseau : coupe le vieux protocole SMB1 et exige la signature et le chiffrement.
- Gain : Plus de sécurité sur ton réseau local ; aucun effet sur les performances en jeu.
- Inconvénient : Les vieux NAS, box et TV ne pourront plus ouvrir tes dossiers partagés ; les copies réseau peuvent ralentir.
- Demande confirmation : Les vieux NAS, box et TV qui ne gèrent pas le chiffrement SMB ne pourront plus ouvrir tes dossiers partagés.
