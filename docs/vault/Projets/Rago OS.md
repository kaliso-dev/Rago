---
type: projet
tags: [projet, rago-os, en-cours]
maj: 2026-11-09
version_app: 1.3.0
---
# Rago OS

Bureau complet pour Windows (Dock, Pastille Live, Applis, Recherche, widgets, écran de veille) que Sofiene a développé sur son Mac avec un autre Claude, dans le dossier `~/nimbus` (Tauri 2, Svelte 5, Rust). Ce n'est **pas** l'ancien Rago OS de la PR #60, abandonné le 31/10 ([[Décisions]]). Depuis le 07/11, c'est **l'extension de [[App Windows|Rago Optimizer]]** : il en reprend la charte et lui délègue tout ce qui touche à Windows. Retour à [[Projet]].

- Statut : EN COURS (08/11). Code sur le Mac de Sofiene, branche `rago-design` de `~/nimbus` (sa branche `main` n'est pas touchée), version 0.1.0.
- Test sur Windows : Sofiene teste les exe de test depuis le 07/11. Sur test3 (08/11 après-midi) : « vraiment mieux […] de nombreux bug [résolus] et […] de nombreuses animations ». Ses retours du 08/11 au soir (Dock qui ne se range pas, touche Windows qui ouvre la recherche de Windows, trop de processus, look trop proche d'Apple, widget Rago, bouton sombre/clair sans effet, écran de veille en double, nuage au redémarrage, démarrage lent, Windows à remettre comme avant en quittant) sont traités dans l'exe de test `RagoOS-0.1.0-test4.zip` (08/11, dans les fichiers du projet et dans `~/nimbus`) : à tester sur Windows (À VÉRIFIER : touche Windows, tâches planifiées, session légère). L'installeur (`Rago OS_0.1.0_x64-setup.exe`) n'est pas signé.
- Pour qui : **tout joueur de Rago OS a Rago Premium** (Sofiene, 07/11 : « ceux qui auront l'os auront forcément rago premium »). L'OS n'affiche donc plus d'offre gratuite ni de « réservé à Premium ». Rien n'empêche encore un joueur sans Premium d'installer l'OS : la façon de le sécuriser est à trouver (À FAIRE, [[Décisions]]). L'app, elle, garde ses propres contrôles de licence.
- Charte : celle de l'app 1.2.1 ([[Charte graphique]]), choisie par Sofiene le 07/11 : encres, rouge `#ff3b30`, Geist et Geist Mono, animation de démarrage « Every millisecond counts. ».
- Logo : l'icône de l'exe, de la barre des tâches et de l'installeur est le R rouge de l'app (`brand/logo/png/rago-icon-*`, sans tuile, comme l'app) ; l'installeur a ses propres images « Rago OS » (`src-tauri/installer/`).

## Thèmes (Réglages > Apparence)
Un thème règle tout le bureau, pas seulement l'accent (code : `src/lib/theme.svelte.ts`) :
- couleur des surfaces (encre en sombre, papier en clair), accent et second accent (dégradés, lueurs) ;
- matière : verre, opaque ou néon (contours lumineux) ; barre de menus : verre, transparente ou opaque ;
- arrondis de toute l'interface (carrés à très ronds), police (Geist, Segoe, Bahnschrift, Mono), lueur de l'accent, transparence, fond d'écran.

3 thèmes Rago, choisis par Sofiene le 08/11 : **Rago** (par défaut à l'installation, encres et rouge), **Tournoi** (esport : surfaces pleines, Bahnschrift, rouge et jaune) et **Pétale** (clair, pastels). Chacun a son fond d'écran fourni (2560 × 1440, dossier `wallpapers/` : `encre`, `tournoi`, `petale`). Les coins sont toujours arrondis : le réglage d'arrondi va de 0,75 à 1,4, sans coins carrés. « Personnaliser » permet de tout changer (couleurs au choix comprises), « Enregistrer comme thème » garde ses réglages dans « Mes thèmes », « Surprends-moi » tire un thème au hasard. Un joueur qui avait un thème retiré le 08/11 repasse sur Rago. L'ancien fond d'écran du joueur est gardé et peut être remis.

Lisibilité (08/11) : le texte reste lisible en sombre comme en clair, quel que soit le fond d'écran.
- Le verre devient plus opaque quand le fond est trop clair (thème sombre) ou trop sombre (thème clair), calculé sur les zones claires ou sombres du fond (`minGlass` dans `src/lib/theme.svelte.ts`).
- L'accent écrit en texte est éclairci ou assombri juste assez pour se lire (`--accent-text`, et `--accent-on-dark` sur la Pastille Live et l'écran de veille) ; les couleurs d'erreur, de succès et d'alerte sont assombries en clair.
- L'écran de veille et les Applis s'assombrissent sur un fond clair ; la barre latérale des Réglages suit le thème.
- Vérifié par un contrôle automatique de chaque texte de la démo (3 thèmes, plus des fonds blanc, noir et très coloré) : plus aucun texte principal sous 4,5:1, les textes discrets à 4:1 au moins sur les fonds extrêmes.

## Bureau
- Applis ouvertes en plein écran : chaque nouvelle fenêtre d'appli s'ouvre agrandie, jamais les jeux, boîtes de dialogue, consoles ni petits outils (`src-tauri/src/win/maximize.rs`, réglage Dock > « Ouvrir les applis en plein écran », activé par défaut).
- Dock masqué par défaut : il n'apparaît que si la souris reste plaquée contre le bord de l'écran (0,35 s, bouton relâché), pour qu'un simple passage ou un glisser ne l'ouvre pas. Il se range dès que la souris quitte la barre (0,12 s) : sa position est relue toutes les 100 ms (commande `cursor_pos`), car la sortie de la souris n'est pas toujours signalée. Pas de loupe par défaut. Une appli ouverte est marquée d'un trait à l'accent du thème. Les fenêtres agrandies prennent tout l'écran.
- Touche Windows seule : ouvre les **Applis** de Rago OS, jamais le menu Démarrer ni la recherche de Windows (08/11, `src-tauri/src/win/hooks.rs`). Win + une touche garde son raccourci Windows (rejoué par Rago OS), Win + L verrouille. En jeu plein écran, la touche reste à Windows.
- Noms propres à Rago (08/11, Sofiene : « certaine chose copie vraiment apple ») : Applis (ex-Launchpad), Recherche (ex-Spotlight, Alt + Espace), Pastille Live (ex-Dynamic Island, avec le R de Rago au repos), Réglages rapides, Coins de l'écran, Animation de réduction (ex-Génie). Widgets Météo et Calendrier redessinés (chiffres en Geist Mono, surtitres en capitales).
- Écran de veille : c'est l'ancien écran de verrouillage de Rago OS, renommé le 08/11 ; il s'affiche après 10 minutes d'inactivité par défaut (Réglages > Écran de veille).
- Bouton sombre/clair (Réglages rapides, Recherche) : bascule vraiment le bureau, même avec un thème choisi, et Windows suit.
- Confirmations (redémarrer, éteindre…) : le R de Rago à la place de l'ancien nuage.
- Pastille Live épurée (08/11) : au survol, l'heure, la date, la batterie et la Concentration ; le lecteur prend la couleur de la pochette.
- Widgets en plus : Rago Optimizer en grand (ping des 4 premiers serveurs, Mode jeu, Mode jeu total), Raccourcis (recherche, mémoire, ping, concentration, applis, Rago, Mode Jeu, verrouillage, réglages).

## Lien avec Rago Optimizer (le pont)
Rago OS parle à l'app par un canal nommé local, `\\.\pipe\gg.rago.optimizer.bridge` (`gg.rago.optimizer.staging.bridge` pour l'exe de test). Code : `app/src-tauri/src/bridge.rs` côté app (commandes dans `bridge_handler`, `lib.rs`), `src-tauri/src/win/rago.rs` et `src/lib/rago.svelte.ts` côté Rago OS.
- Garde-fous : canal fermé au réseau, ouvert aux seuls utilisateurs de la session ; l'exe client doit s'appeler `RagoOS.exe` (ou `rago-os.exe` en développement) ; ni e-mail, ni clé, ni identifiant ne passent, la licence se résume à l'offre.
- Commandes dans `staging` (PR #73, fusionnée le 07/11) : `hello`, `status`, `live` (FPS et ping du [[Barre en jeu|jeu en cours]]), `stats`, `clean_ram`, `net_test` ([[Test réseau]]), `games` et `game_launch` ([[Bibliothèque de jeux]]), `presets`, `open` (ouvre une page de l'app), `game_mode` ([[Mode jeu]]), `boost` (Mode jeu total).
- Commandes codées le 07/11 mais **pas encore sur GitHub** (branche locale `claude/project-thread-r4qi8b`, commit `fecc94c`) : `tweaks` (tout le catalogue proposé à Rago OS, avec l'état de chaque réglage), `tweak` (activer, désactiver ou changer de profil un réglage, par le même chemin que l'app : licence, emplacements et lot en cours vérifiés), et `open` avec un réglage à mettre en avant. Sans elles, la recherche de réglages de la Recherche ne marche pas avec l'app installée. En attente de l'accord de Sofiene ([[Règles de travail]]).
- App fermée : Rago OS la démarre en arrière-plan par sa tâche « Rago Optimizer » ([[Arrière-plan et démarrage]]), sinon par son exe. Que la tâche se lance sans droits administrateur depuis Rago OS : À VÉRIFIER sur Windows. Le dossier d'installation de l'app est relu au plus toutes les 10 minutes.

## Ce que Rago OS fait avec l'app
- Recherche (Alt + Espace) : cherche **n'importe quel réglage** de l'app (nom français ou anglais, module, profils) et l'active ou le désactive, avec l'avertissement de l'app quand il en a un ; Maj + Entrée l'ouvre dans l'app. Il ouvre aussi les onglets de l'app par leur nom français ou anglais (« network » ouvre Réseau).
- Pastille Live : rien pendant la partie (la [[Barre en jeu|barre en jeu]] de l'app affiche déjà FPS et ping, décision du 08/11). À la fin, un résumé : temps de jeu, FPS et ping moyens, relevés en silence pendant la partie par la commande `live`.
- Mode jeu total, à chaque partie détectée : les services Windows inutiles en jeu (indexation, impression, SysMain, télémétrie, rapports d'erreurs, partage des mises à jour, cartes, géolocalisation, diagnostics, mises à jour Edge et Google…) sont arrêtés par l'app puis relancés à la fin (`app/src-tauri/src/boost.rs`). Jamais la sécurité, le réseau, le son, les périphériques, les anti-triches ni Xbox ; le type de démarrage n'est jamais changé et un redémarrage remet tout. Réservé à Premium dans l'app, ce qui convient puisque tout joueur de l'OS est Premium (q52 traitée le 07/11).
- Option : allumer le [[Mode jeu]] de l'app au début de la partie et l'éteindre à la fin.
- Page « Rago Optimizer » dans les réglages, widgets « Rago Optimizer » et « Raccourcis », ping dans la barre de menus, actions et pages de l'app dans le menu R, jeux de la bibliothèque de l'app dans le widget Jeux.
- Quand l'app répond, Réglages > Performances indique « Gérés par Rago Optimizer ». La session légère de Rago OS ne touche à aucun service réglé par l'app (voir plus bas).

## Démarrage, session légère et fermeture (08/11, test4)
Sofiene, 08/11 : « il faut que rago se lance instantanément au démarrage du pc […] par défaut ensuite si je quitte rago os tous les paramètres doivent revenir comme ceux d'origine et quand je lance tout se réactive pendant l'animation de chargement ».
- **Une invite UAC à l'installation** : `optimizer/Rago-Session.ps1 -Mode Install` copie le script dans `C:\Program Files\Rago OS Session` (modifiable seulement par un administrateur) et crée 3 tâches planifiées dans `\Rago OS\`. Si le joueur refuse, Réglages > Performances > « Autoriser Rago OS » refait la demande.
- **Lancement instantané, activé par défaut** (`shell.autostart`, installations existantes comprises) : tâche `Lancement` à l'ouverture de session, sans le délai des programmes de démarrage, priorité normale (les jeux lancés depuis Rago OS en héritent), sans limite de durée ni arrêt sur batterie. Sans la tâche, la clé Run sert de secours. Rago OS est lancé avec `--autostart` et se ferme aussitôt si le réglage est coupé.
- **Session légère** (Réglages > Performances, activée par défaut, `src-tauri/src/win/session.rs`) : au lancement, la tâche `Allegement` (droits admin, sans fenêtre) met en pause 47 services inutiles sur un PC de jeu (téléphonie, paiement, réalité mixte, IA de Windows, diagnostics secondaires, gestion d'entreprise, cartes à puce, contrôle parental, optimisation des disques, mises à jour Firefox et Adobe Reader, courrier et contacts des anciennes applis…). Rago OS ferme aussi les widgets et la recherche de Windows qu'il remplace. Un service est arrêté, jamais désactivé : la tâche `Retablissement` relance en quittant ceux que Rago OS a arrêtés, et un redémarrage remet tout. Jamais touchés : **tout service que règle Rago Optimizer** (vérifié le 08/11 contre les scripts de l'app et `boost.rs`), la sécurité, Windows Update, le réseau, le son, l'affichage, les périphériques (Bluetooth, capteurs, caméra, Windows Hello), les anti-triches et Xbox. Liste dans `optimizer/Rago-Session.ps1`.
- **Quitter Rago OS remet Windows comme avant** : barre des tâches, zone de travail, icônes du bureau, animations, Ne pas déranger, fond d'écran et mode sombre de Windows (`look.json` garde ceux de Rago OS, l'état d'origine est dans `restore.json`), services en pause. Un fond changé dans Windows pendant la session est gardé. Au lancement suivant, tout est réappliqué pendant l'animation de démarrage.
- L'installation n'applique plus l'optimisation durable de 51 réglages (profil « rago ») depuis test4 : elle contredisait ces deux demandes et touchait aux services de l'app. Sofiene, 09/11 : « Oui, tout en session » (q53 traitée). Le bouton « Restaurer » de Réglages > Performances reste pour annuler celle des anciens exe de test, et la désinstallation l'annule aussi. Objectif de Sofiene : approcher les 80 processus d'un ami (À MESURER sur son PC avec test4).

Décision de Sofiene (07/11) sur les services : « Les deux », c'est-à-dire les services sûrs coupés en permanence par les réglages de l'app (Services Windows, diagnostics…) et le reste en pause pendant chaque partie.

Liens : [[Prochaines étapes]], [[Client Minecraft Rago]].
