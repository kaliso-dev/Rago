---
type: marketing
tags: [marketing, rago-route, concurrence, site, conversion]
source: https://claude.ai/artifact/NyWmDzuXV8iHKP7dmRbhYG
maj: 2026-11-14
---
# Page de vente Rago Route

Page de vente de [[Proxy|Rago Route]] ([[route.html]]), faite le 11/11 à la demande de Sofiene : « pour annoncer sa sortie apres le test il faut créer une page dédier sur le site web pour expliquer ce que ca fait sans faire de fausse promesse, les nouveauté, sur quoi on se differencie mais surtout les résultats ». **Refaite entièrement le 13/11** : « faut refaire toute la page des proxy il faut la simplifier enlever les illustration complète priviligie des illutration animé simple et épurer réduit la longueur de la page toute les feature doivent être expliqué mais la page doit aller droit au but et expliqué uniquement les procu enlève lme superflux », et pour le prix : « dans la page des proxy il faut un plan premium avec ou une card proxy option qui précise que si t'as déjà le premium et dans le détail de la card il faut bien préciser toute les feature ». Retour à [[Marketing]].

- **Dossier d'analyse** (Claude Doc) : « Rago Route : analyse et page de vente », https://claude.ai/artifact/NyWmDzuXV8iHKP7dmRbhYG. Ses analyses des joueurs et des concurrents restent valables ; ses parties sur la page et les clips décrivent les versions du 11/11, remplacées le 13/11.
- **Huit analyses détaillées** (11/11, avec leurs sources) : `/mnt/project-files/rago-route-page/refonte/analyses/` ([[Sources]]).
- **Captures de la version du 13/11** : `/mnt/project-files/rago-route-page/version-13-11/` (haut de page, fonctions et prix sur ordinateur ; haut et prix sur téléphone). Les autres dossiers de `rago-route-page/` montrent les versions du 11/11.
- **État (13/11, soir)** : la nouvelle page est vérifiée en local (ordinateur et téléphone, aucune erreur, pas de défilement horizontal), **sur `staging` depuis le 13/11 au soir** (carte de choix : « Oui, envoie sur staging ») ; rien en prod. Sur ordinateur, la page fait 6 600 px de haut au lieu de 14 750.

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
4. Chaque résultat avec ses conditions et sa date ; les animations sont présentées comme des illustrations (légende « Illustration » en haut, une phrase avant les six fonctions).
5. Ce qu'il ne fait pas, dit avant le prix.
6. Une option de Premium à 3 $ par mois ou 17,99 $ par an (8,99 $ par mois ou 47,98 $ par an avec les 218 tweaks et le [[Packet Optimizer]]), comprise dans l'essai gratuit, là où les outils séparés coûtent de 4 à 15 $ par mois ([[Offres et prix]]).

Pas revendiqué : le nombre de routes (d'autres en ont 3 à 5), « instant » (le renvoi part vers 1,25 aller-retour du tunnel), le chiffrement comme exclusivité, le téléphone et Minemen avant leurs tests.

## La page, section par section
Depuis le 13/11, la page va droit au but : ce que fait Rago Route, chaque fonction avec une petite animation simple et sa preuve, ce qu'il ne fait pas, puis le prix. Détail du code et des textes dans [[route.html]].
1. **« Lose packets, not fights. »** (titre À VÉRIFIER, question q105) : ce que c'est en trois phrases, les boutons « Start 3-day free trial » et « Already Premium? Add it », le prix près du bouton ; à droite, une animation : deux routes vers la sortie de Rago à Paris, un paquet perdu sur la route 1 dont la copie arrive par la route 2.
2. **« One lost packet freezes everything behind it. »** : le problème en deux phrases, puis les **six fonctions** (deux routes, paquets de secours, renvoi rapide, session gardée, téléphone derrière une porte, compteurs de l'app), chacune avec son animation et sa preuve datée.
3. **Trois faits** (rien dans le jeu, chiffré et signé, fair play) et **« What it won't do »**.
4. **« Three steps, then play. »**
5. **« Premium with Rago Route, or just the option. »** : la carte « Premium + Rago Route » (8,99 $ par mois après l'essai, frise de l'essai, ce qui est compris, annuel) et la carte « Rago Route option » (étiquette « Already Premium? », 3 $ par mois ou 17,99 $ par an, **toutes les fonctions** et les conditions de l'option).
6. **FAQ** (11 questions, 2 derrière une porte) et **« Give every packet a second road. »**

Retiré le 13/11 : la scène dessinée du jeu et les emplacements de clips de gameplay, les quatre cartes de problèmes, le schéma des deux parties, la grande section des résultats, « Why Rago Route », « Is it for you? », le test réseau gratuit, les avis et la maquette complète de l'onglet.

## Choix faits pour vendre honnêtement
- Les boutons d'essai (en-tête, héros, carte « Premium + Rago Route », fin, barre du téléphone) mènent au vrai paiement **avec Rago Route coché** (`/buy?interval=month&trial=1&route=1`), l'annuel à `/buy?interval=year&route=1` ; « Already Premium? Add it » et la carte de l'option mènent à `/buy/route`. Un compte qui a déjà Premium et clique sur l'essai est envoyé par le serveur sur `/buy/route`, pour qu'il n'achète pas un 2e Premium ([[Paiements Stripe]]).
- Près de chaque bouton d'essai : « Card required: free for 3 days, then $5.99 + $3 a month, charged automatically unless you cancel before. », et en bas « Cancel in two clicks in the app, or anytime from your account » ; hors Windows : « The 3 days start when you pay, so start your trial at your PC. » La frise dit « After 3 days », jamais « day 3 ».
- La carte « Premium + Rago Route » montre la frise (Today, After 3 days, Anytime), ce qui est compris, l'annuel (« Skip the trial: $47.98 a year for both », 6 mois offerts sur les deux), « one per person » ; la carte de l'option donne toutes les fonctions, l'abonnement à part résiliable, l'arrêt avec le Premium, la bêta sans promesse de ping ni de hitreg, et le lien vers les CGV (section 4a, [[Conformité juridique]]). Dessous : « Secure checkout with Stripe · Prices in US dollars · Cancel anytime · No refunds: try it free first · Premium without Rago Route ».
- Logos : les aperçus de ChatGPT montrent le bloc d'herbe, le H de Hypixel et un personnage proche de Steve ; la page garde des icônes neutres avec les noms écrits (Minecraft, Hypixel), pour ne pas utiliser leurs marques.
- Jamais : « the only », « the first », « zero risk », « guaranteed », « no ban », « instant », « FEC » seul, « up to X % » sans source, un meilleur hitreg, « we'll remind you » ([[Voix et ton]]).

## Résultats affichés
La page n'affiche que des mesures, chacune avec ses conditions et sa date ; les animations sont des illustrations.
- 2 246 paquets sauvés par la 2e route en 2 min environ, avec 30 % de pertes ajoutées sur la 1re (Hypixel, prototype sur Mac, 06/11).
- 1 413 paquets refaits à l'arrivée (labo, 20 Mo à travers 20 % de pertes sur chaque route, sans jeu, 08/11).
- 20 ms pour repartir après une coupure totale de 8 s (labo, sans jeu, 07/11).
- 0 paquet à sauver le premier soir sur Windows (Hypixel, 07/11).
- Dans « What it won't do » et la FAQ : 113 ms par Rago Route contre 119 ms en direct (médianes de 79 pings pris au même moment depuis la France, prototype sur Mac, 07/11) ; avec des pertes simulées, une différence difficile à sentir à 5 % et nette à 25 % (essais du 09/11).
- Derrière une porte : environ 30 s de Wi-Fi coupé tenues par la 4G du téléphone (prototype sur Mac, 07/11).

2 246, 113 / 119 ms et la coupure de 30 s du téléphone viennent du prototype sur le Mac de Sofiene, pas de l'app Windows. Les blocs qui attendent un test (**9 portes**) sont cachés en prod et visibles en jaune sur `staging`.

## Animations et images
- **Six petites animations** (SVG animés, sans vidéo ni gameplay), une par fonction, plus celle du haut : simples, sur les couleurs de l'accueil, en pause hors de l'écran, avec une image fixe en mouvement réduit.
- Direction artistique : aucune police ni couleur nouvelle, celles de l'accueil.
- Image de partage `media/og-route.png` (1 200 × 630) : le titre « Lose packets, not fights. » et le paquet perdu sur la route 1 dont la copie arrive par la route 2.

## Avant l'annonce
- **Tests P0-1 à P0-9** (protocoles dans le dossier, partie 6) : ping sur Windows avec et sans (P0-1), pertes simulées avec et sans (P0-2), ressenti à l'aveugle (P0-3), vraies coupures (P0-4), téléphone sur Windows (P0-5), Minemen (P0-6), cinq soirées de jeu normal et une vraie capture de l'onglet (P0-7), nouvel export du test réseau par PC et par pays (P0-8), blocage de compte avec 3 à 5 comptes de l'équipe (P0-9, en premier).
- **Questions ouvertes** ([[Questions ouvertes]]) : q97 (autres régions), q99 (P0-9 et message à Hypixel), q100 (bouton « Get notified on Discord » de l'accueil), q101 (Lifetime et Rago Route), q102 (annuler depuis le site en 2 clics), q103 (abonné non connecté qui paie un 2e abonnement), q104 (« Card required » alors que PayPal passe aussi), q105 (titre de la page).
- **En prod avant la sortie** : la [[Version 1.3.0]] sur `/download` et la route `/route/token` du [[Serveur de licences]].
- **Ailleurs sur le site** : `privacy.html` ne parle pas encore de Rago Route ; la carte Lifetime de l'accueil ne le cite pas (la carte Premium a la case « Add Rago Route » depuis le 13/11) ; la phrase d'essai de l'accueil dit encore « charged automatically on day 3 » et « Cancel in two clicks from your account » ([[page.html]]).
- **En publiant en prod** : retirer du HTML les blocs en attente (cachés à l'écran, leur texte reste lisible dans le code source).
- **Pas de mail de rappel** avant le prélèvement de l'essai : seul le mail du début donne la date ; les études du vault en recommandent un ([[Paiements Stripe]]). À décider.
- **Proposition** : noter dans Stripe si un essai vient de la page Rago Route ou de l'accueil, pour mesurer la page sans traceur.
