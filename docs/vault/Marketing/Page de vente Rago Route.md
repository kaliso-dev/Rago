---
type: marketing
tags: [marketing, rago-route, concurrence, site, conversion, gameplay]
source: https://claude.ai/artifact/NyWmDzuXV8iHKP7dmRbhYG
maj: 2026-11-11
---
# Page de vente Rago Route

Page de vente de [[Proxy|Rago Route]] ([[route.html]]), faite le 11/11 à la demande de Sofiene : « pour annoncer sa sortie apres le test il faut créer une page dédier sur le site web pour expliquer ce que ca fait sans faire de fausse promesse, les nouveauté, sur quoi on se differencie mais surtout les résultats ». Une refonte complète a suivi le même jour (brief de 11 h 01, « comme un Product Designer senior »), puis, à 14 h 20, Sofiene a préféré la première version : « L'ancienne version était beaucoup mieux et claire mais il y a quand meme quelque point positif a la nouvelle version. Deja la toute premiere animation est beaucoup mieux on pourrait directement la remplacer par […] 2 clip minecraft avec et sans la route avec simulation de 40% de packet lost […] il faut remplacer la plus part des animation visuel par des Gameplay Mincraft a par les animation qui ont besoin de vraiment montrer comment le system fonctionne et pas le resultat. Le gamplay minecraft va enormement nous faire gagner de valeur et beaucoup plus close ». Retour à [[Marketing]].

- **Dossier complet** (Claude Doc) : « Rago Route : analyse et page de vente », https://claude.ai/artifact/NyWmDzuXV8iHKP7dmRbhYG. En tête : « Nouvelle direction (11/11, après-midi) » et « Protocole d'enregistrement des clips » ; ses parties 4 à 8 décrivent encore la refonte de midi, dont seule la scène du haut est gardée.
- **Huit analyses détaillées** (11/11, avec leurs sources) : `/mnt/project-files/rago-route-page/refonte/analyses/` ([[Sources]]).
- **Captures** de la version actuelle : `/mnt/project-files/rago-route-page/version-gameplay/` (haut de page sur ordinateur et sur téléphone, planche des animations du fonctionnement). Celles de `refonte/` montrent la refonte remplacée, celles à la racine de `rago-route-page/` la version du matin avant ses corrections.
- **Aperçus de ChatGPT** pour les animations : vidéos dans le dossier CapCut « Claude Animation Proxy » du PC Windows « Abel », connecté au fil le 11/11 ([[Sources]]).
- **État (11/11, fin d'après-midi)** : la version du matin a été poussée sur `staging` le matin, puis remplacée sur `staging` par la refonte (deux cartes de choix, chaque fois « Oui, pousse sur staging »). La **version actuelle** (le matin, avec la scène du haut de la refonte, les emplacements de gameplay et les corrections) est prête et vérifiée en local, **en commit local seulement** : pas encore sur `staging` (attend l'accord de Sofiene), pas en prod. Les clips ne sont pas encore enregistrés : la page montre les dessins en attendant.

## Le vrai problème des joueurs (OBSERVÉ, 11/11)
- La plainte qui revient le plus : le ping affiché ne bouge pas pendant que le jeu gèle, puis saute. Sur 71 fils Reddit et Hypixel lus, les joueurs disent *lag spikes*, *rubberbanding*, *timed out*, *freezing* ; « jitter » et « bufferbloat » n'apparaissent jamais. La page vend donc la régularité (moins d'attente quand des paquets se perdent), **pas un ping plus bas**.
- Test réseau de Rago ([[Test réseau]], 29/10 au 04/11) : **34 des 88 tests** vers Hypixel ont au moins un signe (gigue de 10 ms ou plus dans 32, pics dans 11, pertes dans 6). Ce sont des tests, pas des joueurs ni des connexions : la page ne l'affiche plus ; le test P0-8 doit recompter par PC et par pays.
- Ce que Rago Route ne règle pas, et la page le dit : la distance (Hypixel est en Amérique du Nord, à 94 ms environ de Paris), un serveur qui lague, les FPS, une connexion de la maison pleine.
- **Objection n°1 : la peur du blocage de compte.** Hypixel bloque un compte dont l'activité paraît anormale, et des joueurs racontent ces blocages avec ExitLag. Avec Rago Route, Hypixel voit l'adresse de Paris, la même pour tous les joueurs, et il coupe déjà les connexions venant de Frankfurt (09/11, [[Proxy]]). Test P0-9 avant l'annonce (question q99, [[Questions ouvertes]]).

## Concurrents (pages lues le 11/11)
Lu avec WebFetch : citations à revoir dans un navigateur avant de les reprendre. Détail, pages et dates : analyses 4 et 5.

| Outil | Contre les pertes | Promesse affichée | Essai, prix | Trustpilot |
|---|---|---|---|---|
| ExitLag | plusieurs routes en même temps (« Multipath »), jusqu'à 4 connexions (« Multi-Internet ») ; ni paquet de secours ni session gardée décrits ; messages contradictoires sur le chiffrement | « 70 % Lowering your ping », un visuel ON/OFF sans valeur ni condition, 4 000+ jeux | 3 jours sans carte (nouveaux comptes) ; 9,99 $ par mois et 75 $ par an (App Store, États-Unis) ; renouvellements non remboursés, écrit seulement dans l'aide ; un appareil à la fois | 3,6/5 (575 avis, copie de mi-septembre) |
| NoPing | copies sur 3 à 5 routes, doublons filtrés | « up to 80% » (rapporté) ; schémas « Loss 0% » non marqués comme illustration ; « never lose connection » | sans carte, durée contradictoire ; 8,99 $ par mois selon un tiers | note retirée par Trustpilot (« breach of our guidelines »), 310 avis, 64 % à 1 étoile |
| Speedify (VPN) | toutes les données sur toutes les connexions, la première copie gagne ; téléphone en USB ; une page « Fast Error Correction » (le mécanisme décrit est un renvoi) ; chiffré | « up to 40% », mais aussi « cannot shorten the physical distance » | 5 Go par mois sans carte, 30 jours remboursés ; 14,99 $ par mois, 89,99 $ par an | 2,0/5 (36 avis) |
| Mudfish | jusqu'à 3 chemins (trafic jusqu'à ×3), par défaut depuis le 31/10/2024 ; « Simple FEC » = 2 ou 3 copies identiques | aucun chiffre ; prévient du coût ×3 et du risque de pics | payé au Go | aucun avis |
| WTFast | une route choisie ; pas de chiffrement, assumé | « Eliminate Lag. » ; 4 paires de pings sans conditions (« 220 ms → 120 ms »…) | essai contradictoire (3 jours dans l'aide, une semaine payante sur l'accueil) ; 14,99 $ par mois | 2,4/5 (1 150 avis) |
| GearUP | choix de route ; « Dual Assurance » : Wi-Fi ou données mobiles, une seule à la fois, sur Android | « you will NOT be detected or banned » | prélève 30 min avant la fin de l'essai ; essai coupé si l'on désactive le renouvellement | 4,8/5 (4 063 avis sollicités) |
| LagoFast | « Multipath » non décrit | « 0 packer loss » ; vend des « easy lobbies » | essai de 3 heures | note retirée par Trustpilot |

Haste n'existe plus (racheté par ExitLag en 07/2021). Le comparatif tech-insider (2026) conclut : « There is no independently verified average reduction percentage ». Étude plus large des outils réseau : [[Étude - Outils réseau et ping]].

**Ce qu'on en tire pour la page :**
- Copier les paquets sur plusieurs routes et utiliser le téléphone en 2e connexion existent déjà chez ExitLag, NoPing, Speedify et Mudfish : la page ne dit **jamais** « the only » ni « the first ». Speedify et Mudfish emploient le mot FEC (Mudfish pour des copies identiques) : la page ne dit jamais « FEC » seul et parle de « backup packet ».
- Ils vendent un pourcentage de ping ; les avis négatifs disent « aucun gain » ou « ping plus haut ». Rago vend moins de gels, avec chaque résultat étiqueté et ses conditions.
- D'ExitLag, la page reprend le meilleur recadrage (« ce n'est pas ta ligne, c'est la route », d'où « Lag isn't always your PC. Often, it's the road. ») et fait l'inverse de ses conditions cachées : prix, prélèvement automatique et annulation sont écrits près de chaque bouton d'essai. De Speedify : dire ce qu'on ne fait pas rend crédible.

## Ce qui différencie Rago Route (dit sans nommer personne)
1. Fait pour Minecraft Java : une perte bloque tout ce qui suit. Aucune page Minecraft concurrente ne parle de TCP ni d'Hypixel derrière Cloudflare.
2. Un paquet de secours qui refait un paquet perdu parmi 2 à 4, sans aller-retour, en plus des copies et du renvoi rapide.
3. La connexion gardée quand tous les trajets coupent quelques secondes (labo seulement : P0-4 avant de la mettre en avant).
4. Chaque résultat avec ses conditions, chaque animation marquée « Illustration ».
5. Ce qu'il ne fait pas, dit avant le prix.
6. Inclus dans Premium à 5,99 $ par mois, avec les 218 tweaks et le [[Packet Optimizer]], là où les outils séparés coûtent de 4 à 15 $ par mois.

Pas revendiqué : le nombre de routes (d'autres en ont 3 à 5), « instant » (le renvoi part vers 1,25 aller-retour du tunnel), le chiffrement comme exclusivité, le téléphone et Minemen avant leurs tests.

## La page, section par section
Le parcours de la version du matin : le problème, pourquoi il arrive, une fonction et une animation à la fois, les résultats, ce qu'il ne fait pas, puis l'essai. Détail du code dans [[route.html]].
1. **« Lose packets, not fights. »** (titre À VÉRIFIER, question q105) : à droite, la scène de la refonte (« The same lost packet, two outcomes », Direct / With Rago Route, Pause), qui devient les **deux clips de gameplay** dès qu'ils sont là ; dessous, la bande des paquets (route directe vers Hypixel, ou Road 1 et Road 2 vers la sortie de Rago).
2. **« Lag isn't always your PC. Often, it's the road. »** : quatre cartes (pic de ping, gel puis saut, Wi-Fi qui coupe, pire le soir), chacune avec un emplacement de clip court.
3. **« One lost packet stops everything behind it. »** : le schéma des deux parties qui reçoivent les paquets 1 à 8, le 4 perdu dans les deux.
4. **« Rago Optimizer tunes your PC. Rago Route takes care of the road. »** : trois façons de récupérer un paquet, puis les fonctions 01 à 06 (deux routes, paquets de secours, renvoi rapide, session gardée, téléphone derrière une porte, onglet de l'app avec un emplacement de clip), chacune avec Problem, Fix, sa preuve et ses conditions.
5. **« Faster delivery. The same game. »** : fair play.
6. **« Measured, not promised. »** : six résultats (dont un caché), puis « What it won't do. ».
7. **« Built for one game. Included in Premium. »**, **« Made for lag that comes from the road. »** (pour qui, pas pour qui, test gratuit), **« Three steps, then play. »**.
8. **« Rago Route comes with Premium. »** : carte Premium avec la frise de l'essai, puis la FAQ (18 questions, 4 derrière des portes) et « Give every packet a second road. ».

## Clips de gameplay (protocole du 11/11)
Protocole complet dans le dossier (Claude Doc, « Protocole d'enregistrement des clips »). Les clips sont de **vrais enregistrements**, jamais une vidéo faite par IA, sans accélération, coupe à l'intérieur ni retouche.

| Fichier (`site/media/`) | Ce qu'on filme | Pertes (Clumsy) | Durée, poids |
|---|---|---|---|
| `route-hero-direct.mp4` et `.webp` | un combat sur un pont, adresse Hypixel habituelle | Drop 40 %, entrée et sortie | 12 à 15 s, 3 Mo au plus |
| `route-hero-rago.mp4` et `.webp` | le même combat, Rago Route allumé, serveur `localhost` | les mêmes 40 % | 12 à 15 s, 3 Mo au plus |
| `route-tab.mp4` et `.webp` | l'onglet Rago Route pendant le clip avec Rago Route | les mêmes 40 % | 8 à 10 s, 1,5 Mo au plus |
| `route-card-spike.mp4` | un échange de coups pendant un pic de ping | Lag 300 ms par à-coups | 4 à 6 s, 1 Mo au plus |
| `route-card-freeze.mp4` | course sur un pont : gel, puis saut | Drop 40 % pendant 2 s | 4 à 6 s, 1 Mo au plus |
| `route-card-wifi.mp4` | coupure courte : tout s'arrête, puis rattrape | Drop 100 % pendant 1,5 s | 4 à 6 s, 1 Mo au plus |
| `route-card-evening.mp4` (facultatif) | un combat qui saccade | Lag 150 ms et Drop 5 % | 4 à 6 s, 1 Mo au plus |

- Sur un PC Windows avec l'exe staging 1.3.0, Clumsy et OBS (1 920 × 1 080, 60 images par seconde) ; filtre Clumsy `!loopback and (inbound or outbound)`, qui laisse passer l'échange local entre Minecraft et Rago Route : seule la vraie connexion perd des paquets, de la même façon dans les deux clips.
- Trois prises de chaque dans la même demi-heure, garder celle du milieu. Si Rago Route n'est pas nettement meilleur à 40 %, ne rien publier.
- Noter date, heure, Wi-Fi ou câble et les compteurs de l'onglet ; déposer les fichiers bruts dans « Claude Animation Proxy ». Claude fait l'export web (ffmpeg, même début et même durée pour les deux clips), remplit les attributs de la page et la pousse sur `staging` après l'accord de Sofiene.
- Légende prévue du haut : « 40% of packets dropped on purpose, in both clips » et « Recorded on Hypixel from France, [date]. Loss added with Clumsy on the whole connection, the same in both clips. Not sped up. »
- **À VÉRIFIER** : Rago Route n'a jamais été testé à 40 % (les essais du 09/11 allaient jusqu'à 25 %) ; en direct à 40 %, Hypixel peut couper la partie (« Timed out »), et c'est alors le résultat à montrer. Où simuler les pertes (toute la connexion, ou la route directe seulement avec une légende qui le dit) et avec quel compte enregistrer (compte de l'équipe conseillé tant que P0-9 n'est pas fait) : question q106 ([[Questions ouvertes]]).

## Choix faits pour vendre honnêtement
- Tous les boutons d'essai (en-tête « Start free trial », héros, carte Premium, fin, barre du téléphone) mènent au vrai paiement (`/buy?interval=month&trial=1`).
- Près de chaque bouton d'essai : « Card required », le prix après l'essai, le prélèvement automatique et « Cancel in two clicks in the app, or anytime from your account » ; hors Windows : « The 3 days start when you pay, so start your trial at your PC. » La FAQ dit « 3 days after you start », jamais « day 3 ».
- La carte Premium montre la frise de l'essai (Today, For 3 days, After 3 days), « One trial per person », l'annuel sans essai (« Paid today, then once a year until you cancel. »), « Secure checkout with Stripe · Prices in US dollars · Cancel anytime · No refunds: try it free first », et « Already Premium? » pour qu'un abonné n'achète pas une 2e fois.
- Action secondaire : le test réseau gratuit (« Test my connection for free »).
- Logos : les aperçus de ChatGPT montrent le bloc d'herbe, le H de Hypixel et un personnage proche de Steve ; la page garde des icônes neutres avec les noms écrits (Minecraft, Hypixel), pour ne pas utiliser leurs marques.
- Jamais : « the only », « the first », « zero risk », « guaranteed », « no ban », « instant », « FEC » seul, « up to X % » sans source, un meilleur hitreg, « we'll remind you » ([[Voix et ton]]).

## Résultats affichés
La page n'affiche que des mesures, chacune avec ses conditions et sa date ; les animations sont des illustrations.
- 2 246 paquets sauvés par la 2e route en 2 min environ, avec 30 % de pertes ajoutées sur la 1re (Hypixel, prototype sur Mac, 06/11).
- 1 413 paquets refaits à l'arrivée (labo, 20 Mo à travers 20 % de pertes sur chaque route, sans jeu, 08/11).
- 113 ms par Rago Route contre 119 ms en direct (médianes de 79 pings pris au même moment depuis la France), plus lent 17 fois sur 79 (prototype sur Mac, 07/11).
- 20 ms pour repartir après une coupure totale de 8 s (labo, sans jeu, 07/11).
- 0 paquet sauvé sur une ligne propre (Hypixel, Windows, 07/11).
- Dans « What it won't do » : avec des pertes simulées, une différence difficile à sentir à 5 % et nette à 25 % (essais du 09/11).
- Derrière une porte : environ 30 s de Wi-Fi coupé tenues par la 4G du téléphone (prototype sur Mac).

2 246, 113 / 119 ms et la coupure de 30 s du téléphone viennent du prototype sur le Mac de Sofiene, pas de l'app Windows. Les blocs qui attendent un test (14 portes) sont cachés en prod et visibles en jaune sur `staging`.

## Animations et images
- **Animations du fonctionnement** (gardées en dessin, comme l'a demandé Sofiene) : le vrai problème (`#lag`), les deux routes (01), les paquets de secours (02), le renvoi rapide (03), la session gardée (04), le téléphone et sa vérification (05, derrière la porte), l'onglet de l'app (06). Redessinées le 11/11 d'après les aperçus de ChatGPT : gros nœuds nommés (Minecraft, Rago exit, Hypixel), route 2 en rouge, paquets numérotés, pastille d'état en haut de chaque figure, compteurs avec icônes. Toutes marquées « Illustration », en pause hors de l'écran, avec une image fixe en mouvement réduit et sans JavaScript.
- **Gameplay** (le résultat) : le haut de page, les 4 cartes et l'onglet de l'app ; dessins en attendant les clips.
- Direction artistique : aucune police ni couleur nouvelle, celles de l'accueil.
- Image de partage `media/og-route.png` (1 200 × 630) : le titre « Lose packets, not fights. » et le paquet perdu sur la route 1 dont la copie arrive par la route 2.

## Avant l'annonce
- **Tests P0-1 à P0-9** (protocoles dans le dossier, partie 6) : ping sur Windows avec et sans (P0-1), pertes simulées avec et sans (P0-2), ressenti à l'aveugle (P0-3), vraies coupures (P0-4), téléphone sur Windows (P0-5), Minemen (P0-6), cinq soirées de jeu normal et une vraie capture de l'onglet (P0-7), nouvel export du test réseau par PC et par pays (P0-8), blocage de compte avec 3 à 5 comptes de l'équipe (P0-9, en premier).
- **Clips de gameplay** à enregistrer (plus haut), puis à brancher sur la page.
- **Questions ouvertes** ([[Questions ouvertes]]) : q97 (autres régions), q99 (P0-9 et message à Hypixel), q100 (bouton « Get notified on Discord » de l'accueil), q101 (Lifetime et Rago Route), q102 (annuler depuis le site en 2 clics), q103 (abonné non connecté qui paie un 2e abonnement), q104 (« Card required » alors que PayPal passe aussi), q105 (titre de la page), q106 (où simuler les 40 % des clips).
- **En prod avant la sortie** : la [[Version 1.3.0]] sur `/download` et la route `/route/token` du [[Serveur de licences]].
- **Ailleurs sur le site** : `privacy.html` ne parle pas encore de Rago Route ; la liste Premium et la carte Lifetime de l'accueil ne le citent pas ; la phrase d'essai de l'accueil dit encore « charged automatically on day 3 » et « Cancel in two clicks from your account » ([[page.html]]).
- **En publiant en prod** : retirer du HTML les blocs en attente (cachés à l'écran, leur texte reste lisible dans le code source).
- **Pas de mail de rappel** avant le prélèvement de l'essai : seul le mail du début donne la date ; les études du vault en recommandent un ([[Paiements Stripe]]). À décider.
- **Proposition** : noter dans Stripe si un essai vient de la page Rago Route ou de l'accueil, pour mesurer la page sans traceur.
