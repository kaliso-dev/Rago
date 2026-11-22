---
type: historique
tags: [historique]
maj: 2026-11-11
---
# Fil - Développer les proxys Minecraft

Histoire détaillée du fil « Développer les proxys Minecraft » (`cmsg_01Mb4hMYwRFctv5wE2NGiASiF1ZGcXwk5kz3XBNz7gsfsS`), ouvert le 04/11 à 23:18 UTC, dernière activité le 10/11 à 15:30. **État au 10/11 : bloqué**, il attend les tests de Sofiene. C'est le fil qui a inventé **Rago Route**. Retour à [[Fils du projet]]. L'état actuel de la fonctionnalité est dans [[Proxy]] et [[Infrastructure Rago Route]] ; le code dans [[Code de Rago Route]]. Heures en UTC. Statut : CONFIRMÉ (lu dans le fil le 10/11). Les adresses IP des serveurs ne sont volontairement pas écrites.

## Le point de départ (04/11)
- Le 17/10, Sofiene voulait un proxy « gratuitement ou presque », sinon de côté ; la 1.2 n'a reçu que le [[Test réseau]] (fil [[Fil - Nouvelle version backlog et refonte|Nouvelle version]]). Le 29/10, la [[Version 1.2.1]] collecte les tests réseau des joueurs « pour les futurs proxy ».
- 04/11 23:18 (depuis le fil de l'essai 3 jours) : « Ok maintenant je veux qu'on développe les proxy comme je te l'avais déjà expliqué le principe est simple optimisé le trajet des packet pour les joueurs de mincraft sur hypixel ou autre d'ailleurs l'objectif est que après le test réseau il analyse la meilleure route et propose le meilleur proxy il faut que tu me montre comment et ou acheter combien ça va me couter lesquelles prendre ect ». Il joint le CSV des tests réseau.
- 23:27, recommandation : ne pas acheter de parc tout de suite. Hypixel passe par Cloudflare. Sur 667 mesures du CSV, le gain estimé d'un proxy est d'environ 70 ms en Inde, 0 à 20 ms en Europe et nul en Amérique du Nord. Proposition : un jour de test sur 6 serveurs Vultr loués à l'heure (environ 1 $), puis 2 proxys (Francfort et Inde) à 5 $ par mois. Question q51 (proxy gratuit ou Premium ?).

## 05/11 : OVHcloud écarté, 4 serveurs Vultr, et le direct qui gagne
- 19:23 : « je choisis quoi entre ovhcloud et vultr c'est le même prix […] lequel est le meilleur pour faire le lancement maintenant » → OVHcloud recommandé (anti-DDoS inclus).
- 19:34 : « vsy refait moi le document pour ovh cloud et je veux pas ta journée de test là je veux tout config maintenant 5$ c'est rien » → relais Minecraft (Hypixel sur le port 25565, Minemen sur 25566) et `install.sh` en une commande ([[install.sh]]). La journée de test est **abandonnée le 05/11 (voir [[Décisions]])**.
- 19:51 : « le vps1 n'est pas dispo je devais prendre le 2 à 7 euros x 2 ducoup et en plus la seule localisation disponible c'est en amérique du nord se qui est inutile donc faut pas prendre chez ovh » → **OVHcloud abandonné le 05/11 (voir [[Décisions]])**, Vultr retenu : 2 serveurs Cloud Compute à 1 vCPU et 1 Go, 5 $ par mois chacun, Ubuntu 24.04, Frankfurt et Mumbai.
- 20:37 : Frankfurt → Hypixel 99,6 ms, Frankfurt → Minemen 1,5 ms, Mumbai → Hypixel 239 ms, Mumbai → Minemen 126,3 ms. Pour l'Europe, Frankfurt est plus lent de 4 à 27 ms que le direct ; gain en Inde (+46 et +58 ms selon le fournisseur) et au Bangladesh (+19 ms).
- 20:41 : « mais si ça gagne que 15 ms c'est bien hein » ; 20:50 : « Alors fait le plan parfait pour optimiser à coup sur avec les meilleurs serveurs » → l'app mesurerait le direct et chaque proxy, et ne proposerait un proxy qu'avec un gain d'au moins 10 ms ; New Jersey (indisponible, remplacé par New York) et Chicago ajoutés.
- 21:37 : New York → Hypixel 20,7 ms, **Chicago → Hypixel 4,8 ms** (Hypixel est à Chicago).
- 21:41, test depuis le Mac de Sofiene (`mcping.py`) : direct 104,8 ms, Chicago 112,1, New York 111,2, Frankfurt 126,6. **Le direct est le plus rapide** depuis la France (Cloudflare fait déjà le trajet).

## 05/11 au soir : l'idée de Rago Route
- 21:48 : « ma question c'est tu es sur qu'on ne peut rien développer pour optimiser encore plus tu ne peux pas imaginer une nouvelle idée » → idée du **double trajet anti-lag** (chaque paquet part par deux routes, la sortie garde le premier arrivé) et d'un diagnostic chez le joueur. Les données montrent des pertes jusqu'à 37 % chez un fournisseur américain et 27 ms de gigue chez un fournisseur belge.
- 22:10 : « c'est incroyable le double trajet anti lag plus l'optimisation de la route et tu peux pas inventer autre chose » ; carte → « Prototype du double trajet ». 39 % des mesures vers Hypixel (34 sur 88) ont des pertes, pics ou gigue de plus de 10 ms. Autres idées : réparer les pertes avec un paquet de secours tous les 4 paquets (environ 25 % de données en plus), une connexion qui survit aux coupures, deux connexions (box et 4G/5G). Nom proposé : **Rago Route**, en Premium.
- 22:15 : « est ce que l'ensemble de ses features pourront fonctionner avec tout les jeux ? » → Minecraft Java par un relais local ; les autres jeux UDP demanderaient un pilote réseau Windows (comme ExitLag) ; prudence avec les anti-triches (Vanguard À VÉRIFIER).
- 22:20 : « rajoute en encore essaie d'innover d'inventer des méthodes qui n'existe pas » → document « Rago Route : idées anti-lag » (22:23) : la connexion Hypixel s'arrête à Paris chez Cloudflare (15,5 ms), d'où l'idée de **faire sortir le tunnel à Paris** ; Wi-Fi « mode compétition », détective de lag, hitreg par la 4G, « Waze du ping ».

## 06/11 : le prototype et le premier test réel
- 20:10 : « Bon c'est partie développons ça ce soir ». 20:17 : prototype Python `proxy/rago-route.py` ([[rago-route.py]]) : double trajet, renvoi rapide des pertes, survie aux coupures. Test local : 30 % de pertes sur un trajet, 2 Mo sans erreur ; coupure totale de 8 s sans perte.
- 20:23 : Sofiene avait supprimé les anciens serveurs → 2 nouveaux serveurs Vultr : **Paris** (`rago-paris`, sortie du tunnel) et **Frankfurt** (`rago-frankfurt`, 2e trajet). `install.sh` passe d'environ 9 Ko à 37 Ko.
- 21:46, premier test depuis le Mac : 114,8 ms par le tunnel contre 120,1 ms en direct : **le tunnel ne coûte rien**.
- 22:12 : une vraie partie par le tunnel (mode de jeu non dit) tient sans déconnexion ni lag ressenti, mais le ping de la touche Tab affiche 178 ms (tunnel) contre 129 ms (direct). Compteur « sauvés » corrigé, renvois moins nerveux, mesure toutes les 15 s.
- 22:16 : test avec 30 % de pertes simulées sur le direct : 0 % de pertes à l'arrivée, 2 246 paquets sauvés en 2 minutes environ.

## 07/11 : mesures, site, version Windows
- 02:57 : au même moment, tunnel 111 à 115 ms contre 116 à 118 ms en direct ; Paris → Hypixel 92 à 97 ms. Le vrai problème : le programme Python se fige jusqu'à 123 ms sur le Mac. Sofiene, en Wi-Fi : « je ne sens pas vraiment de différence mais je ne joue pas de base ».
- 03:39 : nouvelle version (plus de renvoi inutile, reprise en 10 à 20 ms après une coupure au lieu d'environ 1 s, protection contre la mise en veille de macOS). 04:09 : sur 14 mesures simultanées, tunnel médiane 116 ms contre 119 ms ; les pics viennent du premier tronçon (Wi-Fi).
- 05:14 : « il faut une section dans le site avec un call to action qui redirige vers une page dédié je veux une page dans le design de rago avec full animation pour expliqué chaque fonctionnalité présente ça comme des révolutions » → page `route.html` et section de l'accueil « Your PC is tuned. Now Rago takes the road. », chiffres mesurés seulement, bouton vers Discord, aucun prix ([[Site]]). 05:40 : « tu peux push sur staging les modif du site » → en ligne sur le site de staging à 05:41.
- 05:39 et 05:53 : essais au câble (tunnel 105 à 110 ms contre 113 à 115 ms ; câble seul 108 à 109 contre 115). Les pics restants viennent du programme figé sur le Mac.
- 05:46 : carte « Quelle prochaine étape ? » → « Encore des tests sur le Mac ». 12:12 : « tu peux pas me faire un programmes qui fait tout ça » → option `--telephone` (trouve l'iPhone et vérifie son partage 4G). 12:54 : 9 min 38 s avec la 4G en 3e trajet : tunnel 107 à 125 ms contre 116 à 137 ms en direct ; la 4G arrive première 1 % du temps ; environ 70 Mo par heure reçus.
- 12:58 : « OK let's go » → version Windows. 13:09 : coupure du Wi-Fi de 30 à 38 s : la connexion tient (une partie en cours n'est pas établie), la 4G prend tout, mais monte à 1,2 à 1,5 s. Sofiene : c'était sa mauvaise réception 4G sur place, « tu peux push sur staging ».
- 13:33 : onglet « Rago Route » dans Réseau de l'app Windows (exe de test seulement), moteur Rust `route.rs` ([[route.rs]]) ; poussé sur `staging` à 14:44, exe de test prêt à 15:00. 22:49, premier essai sur un PC Windows : direct vers Paris 13 ms, Frankfurt 35 ms, 0 % de pertes, retard du moteur 12 ms au pire (394 ms avec le Python du Mac), sortie → Hypixel 91 ms.

## 08/11 : réservé au Premium, protocole 2
- 20:31 : « tu peux me faire un compte rendu des performances de rago route pour présenter à mon collègue » → page « Rago Route : compte rendu des performances ».
- 21:11 : Sofiene croit Rago Route protégé ; il ne l'est pas (Paris et Frankfurt acceptent tout, l'ancien proxy simple tourne encore). Carte « Je réserve Rago Route au Premium maintenant ? » → « Oui, tout de suite ».
- 21:33 : jeton signé 6 h par le serveur de licences pour un compte Premium actif (même clé, aucun nouveau secret), redemandé toutes les 2 h ; Paris refuse sans jeton ; Frankfurt ne relaie que vers Paris ; l'ancien proxy (ports 25565 et 25566) est retiré par `install.sh` (**abandonné le 08/11, voir [[Décisions]]**) ; onglet « Passer Premium » sans Premium ; variable `ROUTE_TESTERS` (liste d'e-mails de test, Railway staging).
- 21:42 : « j'ai pas besoin de tester en vrai je sais que c'est bon tu peux push sur staging il faut développer le reste des feature maintenant » → poussé à 21:43 (commit `7ba0250`).
- 22:09, **protocole 2** : tunnel chiffré (paquet forgé ou rejoué jeté), paquets de secours (plus de 1 300 réparés sans renvoi avec 20 % de pertes par trajet), 4G du téléphone sur Windows, plusieurs sorties avec choix de la plus rapide. 23:04, carte « Je pousse ? » → « Oui, je réinstalle juste après ».

## 09/11 : réinstallation et tests de Sofiene
Heures UTC dans cette partie et la suivante (heure de Paris = UTC + 1).
- 17:35 : « ou est le .exe ? comment je peut créer un compte premium staging facilement pour mes test » → carte de test Stripe ou `ROUTE_TESTERS` ; 17:50 : « explique moi comment config dans railways » (projet `rago-staging`).
- 18:14 à 18:29 : Frankfurt puis Paris réinstallés en protocole 2 ; Hypixel coupe les connexions venant de Frankfurt (« Connection reset by peer », sans gravité : c'est un relais) ; Paris → Hypixel 94,3 ms, Minemen 10,4 ms ; port 25600 en UDP ; serveurs fermés à tout sans jeton ; ancien proxy arrêté.
- 18:40 : « donne moi la commande pour perdre des packet volontairement » → l'outil clumsy, 3 filtres (sans Rago Route, avec Rago Route sur le port 25600, trajet direct seul).
- 19:01, à 5 % de pertes : « franchement je vois pas grande différence même si sur l'app ça calcule bien et ça dit bien que y a des packet save et resend je trouve que ça lag pareil honnêtement » ; 20:24, à 25 % : « la différence ce fait vraiment ressentir en effet c'est incroyable je dois faire quoi pou tester le partage de co déjà ? ». Rago Route ne baisse pas le ping vers Hypixel (environ 105 à 115 ms depuis la France) : il protège des pertes et des coupures.
- 22:25 : l'iPhone branché en USB n'est pas vu par Windows.

## 10/11 : le partage de connexion du téléphone
- 14:43 : « non ça à pas marché y a déjà l'ap appareil apple mais rien n'est détecté il faut simplifier cette procédure développer un truc qui permet de le faire sans cable ou plus simplement jsp » → 14:47, une 2e connexion au choix (USB ou partage Wi-Fi de l'iPhone).
- 15:00 : « hmm non il faut que le partage par cable fonctionne mais il faut que ça fonctionne le plus facilement possible pour l'utilisateur et avec n'importe quel cable » ; carte fermée sur « Garder l'USB et le déboguer ». 15:05 : détection du téléphone branché et message guidé (bouton iTunes pour le pilote Apple).
- 15:10 : « faut que le diagnostic disent exactement pourquoi ça ne marche pas et si je n'ai pas de cable comment testé ducoup ? » → 15:13, diagnostic en 5 étapes (téléphone vu en USB, pilote USB Apple, pilote de partage Apple, partage activé, Internet par le téléphone), bouton « Copier les détails », partage Bluetooth reconnu.
- 15:16 : « ok fait un exe de test pour tout ça que je testerai en rentrant » → poussé sur `staging` à 15:18, exe prêt à 15:29.

## 11/11 : la page de vente, sa refonte, puis le retour au matin avec du gameplay
- 08:30 : « pour annoncer sa sortie apres le test il faut créer une page dédier sur le site web pour expliquer ce que ca fait sans faire de fausse promesse, les nouveauté, sur quoi on se differencie mais surtout les résultats » → page de vente écrite (« Lose packets, not fights. »), dossier, vidéo et captures.
- 09:40 : carte de choix « Oui, pousse sur staging » → commit `f9fdc24` sur `staging` (site-check vert à 09:43). Pas en prod.
- 10:01 : long brief « Aborde ce projet comme un Product Designer senior spécialisé en landing pages, storytelling produit et optimisation de la conversion », puis « passe en max juste » → refonte complète : 8 analyses, page en 12 sections dans la charte du site, scène du haut et simulateur de pertes animés, résultats datés, 19 blocs cachés en prod tant qu'un test manque, encart de l'accueil aligné ; dossier Claude Doc et 4 captures ; questions q99 à q104 ([[Page de vente Rago Route]], [[Décisions]]).
- 13:41 : carte de choix « Pousser la refonte de la page Rago Route sur staging ? », réponse « Oui, pousse sur staging » → refonte sur `staging`. Pas en prod.
- 14:20 : « L'ancienne version était beaucoup mieux et claire mais il y a quand meme quelque point positif a la nouvelle version » ; la première animation de la refonte est à garder et à remplacer par « 2 clip minecraft avec et sans la route avec simulation de 40% de packet lost » ; les animations à améliorer d'après les aperçus de ChatGPT (dossier CapCut « Claude Animation Proxy », connecté au fil) ; « remplacer la plus part des animation visuel par des Gameplay Mincraft a par les animation qui ont besoin de vraiment montrer comment le system fonctionne ». → version du matin reprise : scène du haut de la refonte prête pour les 2 clips, emplacements de clips (4 cartes, onglet), animations du fonctionnement redessinées, corrections gardées, image de partage refaite, protocole d'enregistrement dans le dossier, questions q105 (titre) et q106 (où simuler les pertes).
- 15:29 : carte de choix « Je pousse la version du matin avec gameplay sur staging ? », réponse « Oui, pousse sur staging » → sur `staging`. Pas en prod.

## État et suite (10/11)
- Rago Route est dans l'exe de test de `staging` et, depuis la PR #76 (10/11), prévu dans tous les exe de la [[Version 1.3.0]] avec un badge « Beta ». Pas en prod.
- Serveurs : Paris (sortie) et Frankfurt (relais) chez Vultr, environ 10 $ par mois. Les serveurs Mumbai, New York et Chicago du 05/11 ne servent plus (Sofiene a dit le 06/11 avoir supprimé les serveurs ; destruction de chacun À VÉRIFIER).
- Reste : les tests de Sofiene sur l'exe du 10/11 ; q55 (`ROUTE_TESTERS` ajoutée par Sofiene le 10/11) ; ticket [[Linear]] RAG-50 jamais mis à jour (écriture refusée au fil).

Liens : [[Proxy]] · [[Infrastructure Rago Route]] · [[Test réseau]] · [[Chronologie du projet]]
