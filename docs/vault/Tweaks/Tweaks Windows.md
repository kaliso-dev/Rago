---
type: catalogue
tags: [tweaks, catalogue, généré]
généré: docs/tools/catalogue_vault.py
version_app: 1.2.1
maj: 2026-10-31
---

# Tweaks Windows

Module **Windows** (`windows`) de l'app 1.2.1 : Ce qui tourne pour rien en arrière-plan.
Note **générée** depuis `app/src/data/catalog.json` : ne pas l'éditer à la main, voir [[Catalogue des tweaks]].

Légende : 🆓 gratuit · 🔒 Premium (voir [[Offres et prix]]) · ↩️ seul le retour arrière est gratuit · ⚠️ avancé · 🔁 redémarrage nécessaire · ⚙️ action ponctuelle. Comment un tweak est appliqué : [[Moteur des tweaks]].

## Jeu

### Plein écran `win_fullscreen` 🆓 🔁
Remet les réglages plein écran de Windows par défaut et active l'optimisation des jeux en fenêtre de Windows 11.
- Gain : Peut réduire un peu la latence des jeux DirectX en fenêtre ; rarement utile pour Minecraft Java.
- Inconvénient : Coupe le VRR forcé des vieux jeux (optimisation de Windows 11) ; tes autres réglages graphiques, dont Auto HDR, sont gardés.
- Dans les presets : Minecraft PvP, FPS max, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Mode jeu Windows `win_gamemode` 🆓
Active ou coupe le mode jeu de Windows, qui donne la priorité au jeu et évite les installations de mises à jour en pleine partie.
- Variantes : Activé (`on`), Désactivé (`off`) ; par défaut `on`.
- Gain : « Activé », le réglage normal de Windows, peut stabiliser les FPS si des applis tournent en fond.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Minecraft PvP, FPS max, Latence minimale, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Couper Game DVR `win_gamedvr` 🆓 🔁
Coupe Game DVR, l'enregistrement en arrière-plan de la Game Bar, et ajuste les réglages plein écran liés.
- Gain : Peut rendre des FPS sur les petits PC si l'enregistrement en arrière-plan était actif.
- Inconvénient : Les clips et captures de la Game Bar ne marchent plus, et la touche Xbox de la manette ne l'ouvre plus.
- Dans les presets : Minecraft PvP, FPS max, Latence minimale, PC portable, Fortnite, Valorant, Counter-Strike 2, Apex Legends, PUBG, Rainbow Six Siege, Overwatch 2, Marvel Rivals, The Finals, Escape from Tarkov, Rocket League, League of Legends, Roblox, GTA V, Minecraft Bedrock (voir [[Tweaks Presets]]).

### Effets visuels `win_visual` 🆓
Coupe les animations, la transparence, les fondus des menus, les ombres et le contenu des fenêtres pendant leur déplacement ; le lissage du texte reste actif.
- Gain : Interface un peu plus vive sur les petits PC ; effet sur les FPS en jeu quasi nul.
- Inconvénient : Windows paraît moins fluide et moins joli : plus d'animations, d'ombres ni de transparence, et une fenêtre déplacée n'affiche que son contour.
- Dans les presets : FPS max, PC portable (voir [[Tweaks Presets]]).

## Système

### Couper le Bluetooth `win_bluetooth` 🔒 ⚠️ 🔁
Coupe les services Bluetooth de Windows, pour les PC qui n'utilisent aucun appareil Bluetooth.
- Gain : Une porte d'entrée sans fil et quelques services en moins ; effet sur les FPS quasi nul.
- Inconvénient : Les casques, manettes et souris Bluetooth ne marchent plus tant que tu ne le réactives pas.
- Demande confirmation : Les casques, manettes et souris Bluetooth ne marchent plus tant que tu ne le réactives pas.

### Désactiver les applis en arrière-plan `win_background` 🔒 🔁
Empêche les applis du Microsoft Store de tourner en arrière-plan une fois fermées.
- Gain : Un peu moins d'activité en fond ; effet sur les FPS quasi nul.
- Inconvénient : Les applis du Store ne t'alertent plus une fois fermées, et un portable en veille moderne peut vider plus sa batterie.
- Dans les presets : FPS max, PC portable, Roblox, GTA V (voir [[Tweaks Presets]]).

### Désactiver la transparence `win_transparency` 🔒
Retire l'effet de transparence de la barre des tâches, du menu Démarrer et des fenêtres.
- Gain : Interface un peu plus légère sur les petits PC ; effet sur les FPS quasi nul.
- Inconvénient : La barre des tâches et les menus deviennent opaques.

### Désactiver les notifications `win_notifications` 🆓 🔁
Coupe les bannières et sons de notification, et masque le centre de notifications de Windows.
- Gain : Plus rien ne s'affiche ni ne sonne pendant tes parties ; effet sur les FPS quasi nul.
- Inconvénient : Tu ne vois plus aucune notification, même les alertes de disque plein ou de sécurité Windows.
- Dans les presets : PC portable (voir [[Tweaks Presets]]).

### Désactiver les bulles et suggestions `win_popups` 🆓 🔁
Coupe les bulles d'aide, les pubs OneDrive dans l'explorateur, le secouage de fenêtre et l'identifiant publicitaire.
- Gain : Moins de distractions et plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Les applis qui lisent tes notifications Windows (montre connectée, par exemple) n'y ont plus accès.
- Dans les presets : PC portable, Vie privée (voir [[Tweaks Presets]]).

### Recherche Windows sans le web `win_search` 🔒 🔁
La recherche du menu Démarrer ne va plus sur le web (Bing) ni n'utilise ta position, et Windows n'apprend plus de ta frappe.
- Gain : Plus de vie privée et des résultats limités à ton PC ; effet sur les FPS quasi nul.
- Inconvénient : Plus de résultats web ni de réponses Bing dans le menu Démarrer, et l'Explorateur ne garde plus tes recherches récentes.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver le rapport d'erreurs `win_errors` 🔒 🔁
Windows n'envoie plus de rapports de plantage à Microsoft et n'en garde plus de trace.
- Gain : Un peu plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Moins d'infos pour comprendre un plantage de Windows ou d'un jeu.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver la synchronisation des paramètres `win_sync` 🔒 🔁
Arrête la synchronisation de tes thèmes, mots de passe et préférences Windows avec ton compte Microsoft.
- Gain : Plus de vie privée si tu utilises un compte Microsoft ; effet sur les FPS quasi nul.
- Inconvénient : Tes réglages et mots de passe ne suivent plus d'un PC à l'autre.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver le suivi d'activité `win_tracking` 🔒 🔁
Coupe l'historique d'activité, les suggestions basées sur ton usage et quelques tâches de diagnostic planifiées.
- Gain : Plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Le Gestionnaire des tâches ne mesure plus l'impact des applis au démarrage.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver Actualités et centres d'intérêt `win_feed` 🔒 🔁
Retire les widgets météo et actualités de la barre des tâches et coupe l'identifiant publicitaire.
- Gain : Barre des tâches plus propre et plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Plus de widgets météo ni d'actualités dans Windows.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver les expérimentations `win_experiments` 🔒 🔁
Empêche Microsoft de tester des fonctions ou réglages expérimentaux sur ton PC.
- Gain : Peut éviter des changements de Windows faits sans prévenir ; effet sur les FPS quasi nul.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver la maintenance automatique `win_maintenance` 🔒 🔁
Coupe la maintenance automatique que Windows lance quand le PC est inactif (disques, ménage, diagnostics).
- Gain : Peut éviter qu'une tâche de fond démarre pendant une partie ; effet souvent faible.
- Inconvénient : Windows n'optimise plus tes disques tout seul et ne fait plus son ménage ni ses diagnostics automatiques.

### Bloquer la réinstallation des applis `win_reinstall` 🔒 🔁
Empêche Windows d'installer tout seul des applis et jeux sponsorisés (Candy Crush, etc.) et coupe ses suggestions.
- Gain : Moins d'applis inutiles qui reviennent ; effet sur les FPS quasi nul.
- Inconvénient : Les images « Windows à la une » de l'écran de verrouillage peuvent ne plus changer.
- Dans les presets : PC portable, Vie privée (voir [[Tweaks Presets]]).

### Désactiver les expériences partagées `win_shared` 🔒 🔁
Coupe le partage de proximité et la reprise de tes activités entre ton PC et tes autres appareils.
- Gain : Un peu plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Tu ne peux plus envoyer de fichiers à un PC proche avec le partage de proximité.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Journaliser seulement les échecs importants `win_audit` 🔒 🔁
Réduit ce que Windows note dans son journal de sécurité et coupe quelques journaux de diagnostic.
- Gain : Un peu moins d'écritures en arrière-plan ; effet sur les FPS rarement mesurable.
- Inconvénient : Windows garde moins de traces de ce qui se passe, ce qui complique un dépannage.

### Désactiver l'exécution automatique `win_autoplay` 🔒
Windows n'ouvre plus de fenêtre et ne lance plus rien quand tu branches une clé USB, un téléphone ou un disque.
- Gain : Moins de fenêtres surprises et un peu plus de sécurité face aux clés USB piégées.
- Inconvénient : Tu dois ouvrir toi-même le contenu de ce que tu branches.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Couper les téléchargements de cartes et de voix `win_bgdownloads` 🔒
Windows ne télécharge plus en arrière-plan les mises à jour des cartes hors connexion ni les nouveaux modèles de reconnaissance vocale.
- Gain : Un peu moins d'activité réseau et disque en fond pendant que tu joues ; effet sur la latence très faible.
- Inconvénient : Les cartes hors connexion et la reconnaissance vocale ne se mettent plus à jour d'elles-mêmes.

## Interface et confort

### Alléger la barre des tâches `win_taskbar` 🔒 🔁
Retire les boutons Vue des tâches, Rechercher, Conversation et Meet Now de la barre des tâches.
- Gain : Barre des tâches plus propre ; effet sur les FPS quasi nul.
- Inconvénient : Pour chercher, appuie sur la touche Windows et tape ; la Vue des tâches reste sur Windows + Tab.

### Masquer les éléments récents `win_recent` 🔒 🔁
Démarrer n'affiche plus les applis récemment ajoutées ni les plus utilisées, et l'Explorateur ne montre plus tes fichiers récents ni tes dossiers fréquents.
- Gain : Plus de vie privée quand tu streams ou partages ton écran ; aucun effet sur les FPS.
- Inconvénient : Tu ne retrouves plus tes derniers fichiers depuis l'accueil de l'Explorateur.

### Désactiver les suggestions de la recherche `win_highlights` 🔒 🔁
Retire les images Bing et les sujets tendance affichés dans la barre et le panneau de recherche de Windows.
- Gain : Recherche plus sobre et moins d'appels vers Bing ; effet sur les FPS quasi nul.
- Inconvénient : Plus d'illustrations ni de tendances dans la recherche.

### Passer l'écran de verrouillage `win_lockscreen` 🔒
Tu arrives directement sur l'écran de connexion, sans l'image d'accueil ni le flou derrière ; le mot de passe reste demandé.
- Gain : Un clic de moins au démarrage et au retour sur le PC ; aucun effet sur les FPS.
- Inconvénient : Plus d'image d'accueil ni d'heure avant la connexion. Certaines éditions Famille peuvent ignorer ce réglage.

### Ancien menu du clic droit `win_classicmenu` 🔒 🔁
Sur Windows 11, le clic droit ouvre tout de suite le menu complet, sans passer par « Afficher plus d'options ».
- Gain : Un clic de moins pour les options des fichiers ; aucun effet sur les FPS.
- Inconvénient : Le menu compact de Windows 11 disparaît. Sans effet sur Windows 10.

### Alt+Tab classique `win_alttab` 🔒 🔁
Alt+Tab affiche l'ancienne liste d'icônes, sans aperçu des fenêtres.
- Gain : Sélecteur simple qui n'a pas d'aperçus à dessiner quand tu quittes un jeu ; effet sur les FPS quasi nul.
- Inconvénient : Plus d'aperçus des fenêtres ni d'onglets du navigateur dans Alt+Tab.

### Retirer « - Raccourci » des nouveaux raccourcis `win_shortcut` 🔒
Les nouveaux raccourcis gardent le nom du fichier, sans « - Raccourci » ajouté à la fin.
- Gain : Plus besoin de renommer tes raccourcis ; aucun effet sur les FPS.
- Inconvénient : Aucun. Les raccourcis déjà créés ne changent pas.

### Couper les suggestions de Démarrer et des Paramètres `win_suggestions` 🔒 🔁
Retire les conseils recommandés dans Démarrer, les rappels « terminer la configuration », les astuces en ligne des Paramètres et les résultats du cloud dans la recherche.
- Gain : Moins de pubs et de rappels dans Windows ; aucun effet sur les FPS.
- Inconvénient : La recherche ne montre plus tes fichiers OneDrive ni tes mails Outlook.

### Afficher les extensions de fichiers `win_extensions` 🔒
Affiche les extensions comme .exe ou .zip dans l'Explorateur, pour repérer d'un coup d'œil les faux fichiers.
- Gain : Un « photo.png.exe » piégé se voit tout de suite ; aucun effet sur les FPS.
- Inconvénient : Renommer un fichier peut changer son extension si tu l'effaces par erreur (Windows te prévient).

### Explorateur compact `win_compact` 🔒
Réduit l'espace entre les éléments de l'Explorateur, pour afficher plus de fichiers à l'écran.
- Gain : Plus de fichiers visibles d'un coup ; aucun effet sur les FPS.
- Inconvénient : Les éléments sont plus serrés, un peu moins pratiques au doigt sur un écran tactile.

### Fond d'écran en pleine qualité `win_wallpaper` 🔒
Windows ne compresse plus ton fond d'écran JPEG, qui reste net.
- Gain : Fond d'écran sans artefacts de compression ; aucun effet sur les FPS.
- Inconvénient : Prend effet la prochaine fois que tu choisis ton fond d'écran.

### Ouvrir l'Explorateur sur Ce PC `win_thispc` 🔒
L'Explorateur s'ouvre sur Ce PC, avec tes disques, au lieu de la page Accueil.
- Gain : Tes disques et dossiers tout de suite ; aucun effet sur les FPS.
- Inconvénient : La page Accueil (fichiers récents, favoris) reste à un clic dans la barre de gauche.

## Débloat

### Désactiver la télémétrie `dbl_telemetry` 🔒 🔁
Coupe la télémétrie de Windows et d'Office et une vingtaine de tâches qui envoient des données d'usage à Microsoft.
- Gain : Plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Coupe aussi la localisation : météo, cartes et « Localiser mon appareil » ne te situent plus.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver la télémétrie Office `dbl_office` 🔒 🔁
Coupe la collecte de données et les envois de rapports de Microsoft Office (Word, Excel, Outlook, etc.).
- Gain : Plus de vie privée si tu utilises Office ; sans effet s'il n'est pas installé.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver l'impression et les cartes `dbl_print` 🔒 ⚠️ 🔁
Coupe le service d'impression de Windows et celui des cartes hors ligne.
- Gain : Ferme une source de failles connue si tu n'imprimes jamais ; effet sur les FPS quasi nul.
- Inconvénient : Plus aucune impression, même en PDF, tant que tu ne le désactives pas.

### Désinstaller Cortana `dbl_cortana` 🔒
Coupe Cortana et la recherche web du menu Démarrer, puis désinstalle l'appli Cortana.
- Gain : Plus de vie privée et une appli inutile en moins ; effet sur les FPS quasi nul.
- Inconvénient : Plus de résultats web dans la recherche du menu Démarrer.

### Désactiver les journaux automatiques `dbl_autologgers` 🔒 🔁
Coupe une trentaine de journaux système qui écrivent en continu sur le disque, et les suggestions d'applis sponsorisées.
- Gain : Un peu moins d'écritures en fond ; effet sur les FPS rarement mesurable.
- Inconvénient : Moins de traces pour diagnostiquer un problème, et un démarrage parfois plus lent sur disque dur.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Programme d'amélioration de l'expérience `dbl_ceip` 🔒 🔁
Coupe les tâches planifiées du programme d'amélioration de l'expérience, qui envoient des statistiques à Microsoft.
- Gain : Plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Aucun inconvénient connu.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Désactiver la biométrie `dbl_biometrics` 🔒 ⚠️ 🔁
Coupe la connexion biométrique de Windows Hello (empreinte digitale et reconnaissance du visage).
- Gain : Un service en moins si tu n'utilises ni empreinte ni visage ; effet sur les FPS quasi nul.
- Inconvénient : Connexion par empreinte ou visage impossible : il faudra ton code PIN ou ton mot de passe.

### Désactiver Copilot et Recall `win_ai` 🆓 🔁
Coupe Copilot et son bouton dans la barre des tâches, et empêche Recall de prendre des captures de ton écran.
- Gain : Plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Le bouton Copilot disparaît de la barre des tâches.
- Dans les presets : PC portable, Vie privée (voir [[Tweaks Presets]]).

### Désactiver OneDrive `dbl_onedrive_off` 🔒 ⚠️ 🔁
OneDrive ne se lance plus et ne synchronise plus en arrière-plan. Rien n'est supprimé.
- Gain : Moins de processus, d'accès disque et de réseau pendant que tu joues.
- Inconvénient : Tes fichiers ne se synchronisent plus, et ceux gardés seulement en ligne ne s'ouvrent plus tant que tu n'annules pas.
- Demande confirmation : OneDrive ne synchronise plus : les fichiers gardés seulement en ligne ne s'ouvrent plus tant que tu n'annules pas.

### Désactiver la télémétrie des navigateurs `dbl_browsers` 🔒
Edge, Chrome et Firefox n'envoient plus leurs données d'utilisation ni d'avis ; Edge masque aussi sa barre latérale et ses recommandations.
- Gain : Plus de vie privée et un Edge plus sobre ; effet sur les FPS quasi nul.
- Inconvénient : Les navigateurs affichent « géré par votre organisation » ; plus de barre latérale Copilot dans Edge.

### Désactiver la télémétrie de Visual Studio `dbl_vs` 🔒
Visual Studio n'envoie plus de données d'utilisation et ne demande plus ton avis.
- Gain : Plus de vie privée si Visual Studio est installé ; sans effet sinon.
- Inconvénient : Aucun pour jouer. Tu ne peux plus envoyer d'avis à Microsoft depuis Visual Studio.

## Applications

### Supprimer les applis préinstallées `app_remove` 🔒 ⚠️ 🔁 ⚙️
Désinstalle une trentaine d'applis Microsoft préinstallées : Météo, Astuces, Solitaire, Skype, Cartes, Caméra, Courrier, etc.
- Gain : Menu Démarrer plus propre et un peu d'espace disque libéré ; effet sur les FPS quasi nul.
- Inconvénient : Retire aussi Caméra, Courrier, Alarmes et Lien avec le téléphone ; ils se réinstallent depuis le Microsoft Store.

### Ouvrir Applications et fonctionnalités `app_settings` 🔒 ⚙️
Ouvre la page Applications des paramètres Windows pour désinstaller toi-même ce que tu veux.
- Gain : Pratique pour finir le ménage à la main, appli par appli.
- Inconvénient : Aucun inconvénient connu.

## Nettoyage

### Télémétrie `win_telemetry` 🔒 ⚠️ 🔁
Pack de plus de 200 réglages : télémétrie et tâches de collecte coupées, moins d'animations, souris sans accélération, etc.
- Gain : Plus de vie privée et un Windows plus calme en fond ; effet sur les FPS rarement mesurable.
- Inconvénient : Coupe aussi la localisation et l'accélération de la souris (autre sensation) ; Windows ne cherche plus seul tes pilotes.

### Optimiser Windows `win_optimize` 🔒 🔁
Une cinquantaine de réglages de confort : moins de suggestions et de pubs, Edge ne tourne plus en fond, menus plus rapides.
- Gain : Windows plus calme et des menus plus vifs ; effet sur les FPS rarement mesurable.
- Inconvénient : L'Assistance à distance de Windows est coupée et Edge ne t'envoie plus de notifications une fois fermé.

### Couper les diagnostics `win_diag` 🔒 🔁
Passe le service de télémétrie en démarrage manuel et coupe le rapport d'erreurs de Windows.
- Gain : Un peu plus de vie privée ; effet sur les FPS quasi nul.
- Inconvénient : Moins d'infos pour comprendre un plantage de Windows ou d'un jeu.
- Dans les presets : Vie privée (voir [[Tweaks Presets]]).

### Couper les services inutiles `win_services` 🔒 ⚠️ 🔁
Coupe l'indexation, l'impression, les fichiers hors connexion et les rapports d'erreurs, et retire Cortana et Copilot.
- Gain : Quelques services de fond en moins ; effet sur les FPS rarement mesurable.
- Inconvénient : Recherche Windows plus lente, plus d'impression ni de centre de notifications tant que tu ne le désactives pas.

### Supprimer les applis inutiles `win_apps` 🔒 ⚠️ 🔁 ⚙️
Désinstalle une trentaine d'applis Microsoft préinstallées : Météo, Astuces, Solitaire, Skype, Cartes, Caméra, Courrier, etc.
- Gain : Menu Démarrer plus propre et un peu d'espace disque libéré ; effet sur les FPS quasi nul.
- Inconvénient : Retire aussi Caméra, Courrier, Alarmes et Lien avec le téléphone ; ils se réinstallent depuis le Microsoft Store.
- Jumeau de `app_remove` (même script, compté une fois).

### Limiter le partage des mises à jour `win_store` 🔒 🔁
Laisse le Microsoft Store actif et limite le partage des mises à jour Windows aux PC de ton réseau local.
- Gain : Effet peu probable : c'est souvent déjà le réglage par défaut de Windows.
- Inconvénient : Aucun inconvénient connu.

### Vider les fichiers temporaires `cln_temp` 🔒 ⚙️
Supprime les fichiers temporaires de Windows et de ton compte.
- Gain : Libère de l'espace disque ; ne fait pas gagner de FPS.
- Inconvénient : Aucun inconvénient connu.

### Retirer les périphériques fantômes `cln_devices` 🔒 ⚙️
Supprime de Windows les périphériques débranchés qui y restent déclarés (anciennes clés USB, casques, etc.).
- Gain : Range la liste des périphériques ; ne fait pas gagner de FPS.
- Inconvénient : Un appareil retiré se réinstalle quand tu le rebranches, mais ses réglages peuvent être perdus.

### Nettoyage de disque Windows `cln_disk` 🔒 ⚙️
Ouvre l'outil Nettoyage de disque de Windows pour supprimer les fichiers inutiles de ton choix.
- Gain : Libère de l'espace disque ; ne fait pas gagner de FPS.
- Inconvénient : Vérifie les cases : certaines, comme « Téléchargements », suppriment tes propres fichiers.

### Réparer les fichiers système `cln_repair` 🔒 ⚙️
Vérifie l'image de Windows et répare les fichiers système abîmés, après un ménage des anciennes mises à jour.
- Gain : Utile si Windows plante ou bugge ; ne fait pas gagner de FPS sur un PC sain.
- Inconvénient : Prend plusieurs minutes et peut avoir besoin d'Internet pour réparer.

### Pas de navigateur en arrière-plan `win_browserbg` 🔒
Edge, Chrome et Brave se ferment vraiment quand tu fermes leur fenêtre, et Edge ne se précharge plus au démarrage de Windows.
- Gain : Plus de mémoire et de processeur libres pour ton jeu quand ton navigateur est fermé.
- Inconvénient : Les extensions et notifications du navigateur ne tournent plus fenêtre fermée ; les navigateurs affichent « géré par votre organisation ».
