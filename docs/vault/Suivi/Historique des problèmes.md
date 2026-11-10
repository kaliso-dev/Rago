---
type: archive
tags: [suivi, bug, support, archive]
maj: 2026-11-10
---
# Historique des problèmes

Archive de **tous les problèmes rencontrés avec Rago Optimizer**, du plus récent au plus ancien, avec leur cause et la solution. Demandée par Sofiene le 10/11 : cette note n'est pas à lire à chaque tâche. Elle sert à **déboguer plus tard**, quand un problème ressemble à un ancien.

L'état actuel des bugs reste dans [[Bugs et incidents]], et les retours de joueurs dans [[Problèmes joueurs]]. Ici, on **ajoute** sans jamais effacer : un problème réglé reste, avec la mention « réglé ». Pas d'e-mail ni de nom réel de joueur, et aucun secret ([[Clés et secrets]]).

## Comment chercher
- Logs d'un joueur : `%APPDATA%\gg.rago.optimizer\logs\run-<ms>.log` (un fichier par lot appliqué ou annulé, [[App Windows]]). Les lignes `==== <id>[:variante]` donnent chaque tweak dans l'ordre, et `==== undo <id>` chaque retour arrière. Le nombre dans le nom est l'heure en millisecondes : il permet de remettre les lots dans l'ordre.
- Récompenses Discord d'un joueur : `npm run admin -- discord <email>` dans le shell Railway ([[Serveur de licences]]). Elle ne liste que les récompenses de **cet e-mail**, pas celles du même compte Discord sur un autre compte Rago (voir le cas du 03/11).
- Le reste des commandes support : [[Serveur de licences]].

## Novembre 2026

### 03/11 : boost Discord sans Premium
- **Symptôme** : un joueur a boosté le serveur et lié son Discord sur sa page compte, mais n'est pas passé Premium. `npm run admin -- discord <email>` n'affichait aucune récompense ni aucune erreur.
- **Cause** : son compte Discord avait **déjà reçu la récompense boost le 11/10 sur un autre compte Rago**. La récompense est donnée une fois par compte Discord (`licensing/src/discord.js`, `checkRewards`), et la commande admin ne montre que les récompenses de l'e-mail demandé.
- **Comment on l'a vu** : un script en lecture seule dans le shell Railway a lu `discord_rewards` par `discord_id` (une ligne `boost` sur un autre e-mail) et l'API Discord (`premium_since` rempli, donc boost réel).
- **À savoir** : quand le bot ne trouve pas le membre sur le serveur (`not_member`), `checkRewards` abandonne **sans rien écrire**. La ligne « Pro role not given » sans « last problem » ne prouve donc pas que le bot voit le joueur.
- **Réponse** : lui dire que son Discord a déjà eu la récompense sur un autre compte. Sofiene peut offrir les 2 semaines à la main avec `npm run admin -- grant-days 14 <email>`, sans le code −10 %.

### 03/11 : un joueur propose ses scripts de tweaks
- Un joueur a voulu envoyer par Google Drive ses scripts `.bat`, plus un pack de scripts acheté (environ 12 $), en prévenant qu'ils peuvent « avoir un effet très négatif sur le système » et faire mourir les adversaires « derrière les murs » sur CS2 et The Finals.
- **Conduite tenue** : ne rien exécuter, lire les fichiers comme du texte. Ne pas reprendre un pack payant tel quel (droits). Rien qui ressemble à de la désynchronisation réseau ou à de la triche (risque de ban anti-cheat pour les joueurs).
- Un autre joueur a demandé à Sofiene d'installer AnyDesk pour réparer son PC. Le conseil a été de passer plutôt par un partage d'écran Discord, et de ne jamais donner son propre code AnyDesk.

### 02/11 : ping de 65 à 220 ms et crash du jeu toutes les 2 minutes (joueur RBW, 1.2.1)
- **Symptôme** : ping passé de 65 à 189-220 ms (Minemen Club) et Minecraft qui crashe toutes les 2 minutes, après avoir appliqué beaucoup de tweaks. Le joueur a envoyé 8 logs `run-*.log`.
- **Ce que montrent les logs** : PC sans doute **Intel + NVIDIA (avec puce Intel) + 8 Go de RAM** (l'app avait choisi `mem_profile:8` et `sys_ram:8`, et appliqué `cpu_intel`, `gpu_nvidia`, `intel_gpu`). Un lot plus tard a pourtant appliqué **`cpu_amd`, `gpu_amd` et `sys_ram:16`**.
- **Cause probable des crashs** : `sys_ram:16` sur 8 Go coupe la compression mémoire (« saccades possibles si la RAM se remplit », catalogue). Minecraft avec 8 Go peut alors manquer de mémoire. Probable, pas prouvé.
- **Bug trouvé** : dans `app/src/lib/catalog.ts`, `availability()` renvoie « ok » quand les infos du PC ne sont pas encore chargées (`if (!sys) return { ok: true }`), et le moteur Rust ne revérifie pas la marque du processeur et de la carte graphique. Un preset choisi avant le chargement (FPS max contient les tweaks NVIDIA, AMD et Intel) passe tout, avec la variante par défaut (`sys_ram:16`). **Toujours présent sur `staging` le 10/11** (ligne `if (!sys) return { ok: true };`). Voir [[Bugs et incidents]].
- **Cause probable du ping** : `ping_main:config1`, `ping_packets:hitreg`, `ping_hitreg` et `in_adapter` (carte réseau sur un seul cœur) empilés. C'est le même chevauchement que le bug du preset Minecraft PvP (RAG-87, [[Packet Optimizer]]).
- **Réponse** : « Undo all » sur le [[Tableau de bord]], puis redémarrer. Ne pas remettre les gros presets, et réactiver les tweaks un par un.
- Le même jour, avant les logs, la réponse donnée était : Packet Optimizer → Restore (il n'est pas dans « Undo all »), puis « Undo all », redémarrer, et lancer un [[Test réseau]].

### 02/11 : clavier filaire qui ne marche plus après des tweaks
- **Symptôme** : après des tweaks, le clavier (filaire, le seul du PC) ne répond plus. Le joueur écrit avec le clavier visuel.
- **Suspects** (d'après les scripts, cause jamais confirmée) : `in_queue` (file clavier à 19 ou 20 en Ultra ou Basse, au lieu de 100 dans Windows), `kbm_thread` (priorité du pilote clavier) et `usb_msi` (mode MSI des contrôleurs USB, « certains contrôleurs gèrent mal le mode MSI »). Aucun des 11 tweaks gratuits de la 1.2.1 ne touche au clavier.
- **Réponse** : avec la souris et le clavier visuel, « Undo all » puis redémarrer ; sinon « Default input queue » (`rst_queue`, gratuit, page Restaurer) et un autre port USB ; sinon le point de restauration Windows « Rago Optimizer restore point » (`rstrui`). Demander l'historique de la page Restaurer et un rapport support.
- **Vérifié depuis** : `usb_msi` n'a pas de script dans `undo.json`, mais le moteur le remet quand même par la sauvegarde de l'état d'avant (log du 02/11 : « undo usb_msi, Putting back 6 settings »).

### 02/11 : client perdu dans l'app et « Optimize and play » verrouillé
- Un nouveau client (portable Intel Core Ultra) a trouvé l'app « très compliquée ». Il ne savait pas ce qu'est un preset, et a cru que « Premium » voulait dire un compte Minecraft payant (il joue en version crack).
- « Optimize and play » affichait « Unlock everything with Premium » : c'est normal, la fonction est Premium ([[Bibliothèque de jeux]]). En gratuit, il faut utiliser « Play ».
- Rago ne demande aucun compte Minecraft : il optimise `javaw.exe` quel que soit le launcher, et OptiFine dans `.minecraft` (`app/src-tauri/src/lib.rs`).
- **Leçon** : un nouveau joueur a besoin d'un parcours en 3 étapes (optimisations gratuites du Tableau de bord, page Jeux, jouer) et d'une explication de « preset » et de « Premium ».

## Octobre 2026
- **29/10** (1.2.1) : hitreg meilleur, mais curseur invisible en plein écran et en borderless après « Optimize and play » sur Minecraft, et ping plus instable. Suspects : `win_fullscreen` et `ping_packets: hitreg` dans le preset Minecraft PvP, qui chevauche le [[Packet Optimizer]]. Contournement : couper « Fullscreen optimizations » puis redémarrer. Réglage du preset prévu dans la 1.2.2, désormais dans la [[Version 1.3.0]] (RAG-87).
- **21/10** : minutes GitHub Actions épuisées, plus de build Windows ([[CI GitHub Actions]]).
- **19/10** : app bloquée au lancement par Smart App Control (Windows 11) car l'exe n'est pas signé. Seule solution côté joueur : désactiver Smart App Control. Vraie solution : signer l'exe (RAG-83). Suivi arrêté le 01/11, faute de nouvelles du joueur.
- **16/10** (1.1.14) : erreur WebView2 au lancement chez une cliente. Solution donnée sans modifier l'app.
- **15/10** (1.1.14 de test) : preset Network en échec, et 4 tweaks protégés non remis à la désinstallation. Réglé dans la [[Version 1.1.14]].
- **15/10** (1.1.10) : rien ne s'applique si le dossier utilisateur contient `&` (ou `( ) ^ @`). Réglé en 1.1.14 (RAG-71).
- **14/10** : crashs aléatoires de Lunar Client 1.8.9. Log reçu sans le crash ; cause probable un vieux pilote NVIDIA (Quadro K2000) et la mémoire. Suivi arrêté le 01/11 (RAG-76).
- **14/10** : Claude a affirmé à tort que la 1.1.12 contenait « tout le travail ». D'où la règle « jamais sans preuve » ([[Règles de travail]]).
- **13/10** : le [[RBW Mod]] laissait des services Windows arrêtés, avec un risque de ban. Réglé en 1.1.14 (RAG-69).
- **12/10** : écran bleu 0x7E sous Windows 11 24H2. Réglé en 1.1.14 (RAG-67).
- **11/10** : un client a envoyé des logs du Game Mode. Réponse donnée sans changer l'app.
- **10-11/10** : Netlify ne publiait plus le site, car l'appli Netlify avait été désinstallée de GitHub. Réglé.
- **Avant 1.1.14** : préréglage 3 du réseau en échec (RAG-68), annulations qui cassaient des réglages (RAG-60), [[Remise à zéro]] déclenchée sur un simple doute de licence (RAG-72). Tous réglés en 1.1.14.
- **04/10 → 07/10** : GitHub Pages a publié le dépôt privé (`.bat` Premium, scripts, code serveur). Coupé, et `_config.yml` neutralise Pages.
- **04/10** : des secrets ont été collés dans le chat, leur régénération a été demandée ([[Clés et secrets]]).
- **Avant 1.1.6** : `wmic` absent de Windows 11 24H2. Réglé en 1.1.6.

Liens : [[Bugs et incidents]], [[Problèmes joueurs]], [[Linear]], [[Projet]].
