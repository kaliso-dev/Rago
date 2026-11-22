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

### 10/11 : téléchargements Steam bridés à 15 Mbit/s
- **Symptôme** : après la mise à jour, un joueur passe de 200+ à 15 Mbit/s sur Steam. Captures : « Hitreg profile » en **Better hitreg** appliqué le 10/11, « Packet optimization » en Hitreg (26/10), « Ping optimization » Config 1, « Network profile » Hitreg.
- **Cause** : « Better hitreg » (`ping_hitreg:better`) passe l'auto-tuning TCP en `HighlyRestricted` ; « Packet optimization » Hitreg (`ping_packets:hitreg`) écrit `TcpWindowSize` et `GlobalMaxTcpWindowSize` à 65536. Une fenêtre de 64 Ko à ~35 ms de ping donne ~15 Mbit/s. « Better hitreg » était la variante par défaut du réglage.
- **Solution** : au joueur, « Best hitreg » ou « Default » puis redémarrer, sinon couper « Packet optimization ». Dans l'app, « Best hitreg » (auto-tuning `Normal`) devient la variante par défaut (PR #86, dans `staging` depuis le 11/11 par la PR #92). Résultat chez le joueur : À VÉRIFIER.

### 10/11 : quota Supabase dépassé et minutes GitHub vidées
- **Supabase** : un e-mail du 04/11, d'abord compris comme une menace de suppression, annonce en fait un **dépassement du quota gratuit de bande passante** (plus de 5,5 Go téléchargés, sans doute les installateurs et les mises à jour). Restrictions possibles après le 05/12 (site, licences, téléchargements). Rien n'est supprimé. Sofiene passera en Pro ou migrera avant le 05/12 ([[Supabase]]). Aucune clé n'était sauvegardée ([[Clés et secrets]]).
- **GitHub Actions** : jobs en échec en 2 s depuis le 10/11 vers 01:25 UTC. Cause : les 3 000 minutes du mois, réservées aux dépôts privés, vidées par la CI de `network-server-rago` (9 jobs par push dont 2 Windows qui comptent double, 151 runs du 08 au 10/11). `rago`, public, n'est pas touché. Solution : moins de builds (PR #78, #81) et `network-server-rago` public ([[CI GitHub Actions]]).

### 06/11 au 10/11 : Rago Route en test
- **Pics sur le Mac** (06-07/11) : le prototype Python se figeait jusqu'à 123 puis 191 ms sur le Mac de Sofiene, même au câble ; ce n'était pas le réseau. Le moteur Rust de l'app Windows a ramené ce retard à 12 ms au pire (07/11) ([[route.rs]]).
- **4G à 1,2-1,5 s** (07/11) : pendant une coupure du Wi-Fi, la 4G a tenu la partie mais avec un ping injouable. Cause : mauvaise réception 4G sur place (réponse de Sofiene), pas le programme.
- **Hypixel coupe les connexions venant de Frankfurt** (09/11, « Connection reset by peer ») : sans gravité, Frankfurt n'est qu'un relais vers la sortie de Paris.
- **Pas de différence ressentie à 5 % de pertes** (09/11, outil clumsy) alors que l'app comptait des paquets sauvés : 5 % est trop doux ; à 25 %, « la différence ce fait vraiment ressentir ». Rago Route ne baisse pas le ping vers Hypixel, il protège des pertes et des coupures.
- **iPhone branché en USB pas vu par Windows** (09-10/11) : le partage de connexion n'apparaît pas. Le 10/11, l'onglet guide le joueur et montre un diagnostic en 5 étapes (téléphone vu en USB, pilote USB Apple, pilote de partage Apple, partage activé, Internet par le téléphone). Cause exacte chez Sofiene : À VÉRIFIER avec l'exe du 10/11 ([[Proxy]]).

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
- **28/10** : la mise à jour de test n'apparaît pas chez un ami de Sofiene. Trois causes : le déploiement Railway de staging de la PR #58 avait été sauté (« CI check suite failed », plus de minutes), donc la route `/api/v1/update/status` n'existait pas ; `PUBLIC_URL` de staging valait l'adresse de prod (Railway copie les variables d'un environnement à l'autre) ; le secret `STAGING_RAGO_API_BASE` n'avait pas `https://`. Le même soir, la signature échouait : `TAURI_SIGNING_PRIVATE_KEY` collé avec un retour à la ligne (« failed to decode secret key »), puis `RAGO_UPDATER_PUBKEY` avec un `%` en trop (copie depuis le Terminal du Mac). Tout réglé ; la compilation refuse désormais une adresse sans `https://` ([[Mise à jour automatique]], [[Railway]]).
- **22/10** (1.2.0 en test) : le code de partage de preset marche « une fois sur deux » : texte autour du code, ou Discord qui efface des « _ » (environ 4 % des codes). Réglé par le format `RAGO2_` ([[Presets]]). Le même jour, Railway bloquait les déploiements (cyberattaque chez Railway), rétabli le soir.
- **19/10** : « aucune réponse du serveur » à la connexion dans l'app, alors que `/healthz` répondait. Cause non trouvée (À VÉRIFIER si le cas revient).
- **18/10** : un joueur demande pourquoi certains réglages réseau demandent un redémarrage : `TcpAckFrequency` et `TCPNoDelay` ne sont lus qu'au démarrage de Windows.
- **17/10** (1.2.0 en développement) : l'app se fermait en ouvrant la bibliothèque : il manquait le module TLS pour télécharger les images des jeux. Réglé avant la sortie, avec un écran « Réessayer » en cas de plantage d'une page.
- **17/10** : micro-lags toutes les 30 s et délais dépassés sur un serveur Minecraft : le preset « Full network » (BUG-05) ; conseil : le préréglage 4 ; le lendemain, des pics vers `8.8.8.8` montraient que la connexion du joueur (Wi-Fi) était en cause.
- **17/10** : une joueuse (pas cliente) avec un mauvais ping seulement sur Hypixel. Sofiene : « tu peux dire que nous travaillons sur un système de proxy qui le fera mais que ce n'est pas le cas pour le moment », « ne lui demande pas de contacter son fournisseur ».
- **17/10** : un joueur avec `&` dans son chemin confirme que la 1.1.14 applique tout (correctif des chemins vérifié sur un vrai PC ; `$` pas testé).
- **17/10** : écran noir qui se ferme au lancement : plantage `0xc0000409` (l'app s'arrête net au lancement, rien n'est écrit dans `%APPDATA%\gg.rago.optimizer\logs`, il faut l'Observateur d'événements). Cause : le joueur avait **désinstallé WebView2** en suivant un guide de « debloat ». Solution : réinstaller WebView2 (Evergreen Bootstrapper). Idée de FAQ « Ne désinstallez pas WebView2 ».
- **16-17/10** : **Discord bloquait tout le serveur de comptes** (« exceeding global rate limits ») du 16/10 17:44 UTC au 17/10 vers 11:30 : 14 liaisons de comptes Discord ratées, 25 rôles Pro pas donnés (dont un client qui avait boosté deux fois). Débloqué après un test de Sofiene dans `railway ssh` (sans `curl`, avec `fetch` de Node). Ne pas redonner le Premium à la main avec `grant-months` (doublon). Découvert en même temps : le code de la pop-up promo n'existait que dans le mode test de Stripe (243 erreurs) ; la pop-up ne marchait donc pas en prod ; `npm run admin -- popup <CODE> 50` la recrée en live (fait : À VÉRIFIER) ([[Discord]], [[Promotions et affiliation]]).
- **29/10** (1.2.1) : hitreg meilleur, mais curseur invisible en plein écran et en borderless après « Optimize and play » sur Minecraft, et ping plus instable. Suspects : `win_fullscreen` et `ping_packets: hitreg` dans le preset Minecraft PvP, qui chevauche le [[Packet Optimizer]]. Contournement : couper « Fullscreen optimizations » puis redémarrer. Réglage du preset prévu dans la 1.2.2, désormais dans la [[Version 1.3.0]] (RAG-87).
- **21/10** : minutes GitHub Actions épuisées, plus de build Windows ([[CI GitHub Actions]]).
- **19/10** : app bloquée au lancement par Smart App Control (Windows 11) car l'exe n'est pas signé. Seule solution côté joueur : désactiver Smart App Control. Vraie solution : signer l'exe (RAG-83). Suivi arrêté le 01/11, faute de nouvelles du joueur.
- **16/10** (1.1.14) : erreur WebView2 au lancement chez une cliente (« We couldn't create the data directory », écran noir). Cause : son compte Windows n'était pas administrateur ; l'UAC validé avec un autre compte faisait tourner Rago sous ce compte, dont le dossier n'était pas utilisable. Solution : passer son compte en administrateur (ou supprimer seulement le dossier `EBWebView` de l'app, vérifier l'antivirus et le disque). App non modifiée.
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
