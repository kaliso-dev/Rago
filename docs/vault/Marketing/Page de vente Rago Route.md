---
type: marketing
tags: [marketing, rago-route, concurrence, site, conversion]
source: https://claude.ai/artifact/NyWmDzuXV8iHKP7dmRbhYG
maj: 2026-11-11
---
# Page de vente Rago Route

Page de vente de [[Proxy|Rago Route]] ([[route.html]]), faite le 11/11 à la demande de Sofiene : « pour annoncer sa sortie apres le test il faut créer une page dédier sur le site web pour expliquer ce que ca fait sans faire de fausse promesse, les nouveauté, sur quoi on se differencie mais surtout les résultats ». Le même jour à 11 h 01, Sofiene a demandé une refonte complète : « Aborde ce projet comme un Product Designer senior spécialisé en landing pages, storytelling produit et optimisation de la conversion » (analyse du produit, benchmark d'ExitLag d'abord, direction artistique dans la continuité du site, résultats au centre sans chiffre inventé, une animation par fonction principale, prompts « image 1 / image 2 » seulement là où c'est utile). Retour à [[Marketing]].

- **Dossier complet** (Claude Doc, mis à jour le 11/11 avec la refonte) : « Rago Route : analyse et page de vente », https://claude.ai/artifact/NyWmDzuXV8iHKP7dmRbhYG (le produit, les problèmes des joueurs, le benchmark, la direction artistique, la page section par section, les résultats et les tests à faire, les animations, le prompt d'images, les vérifications, ce qui reste à valider, les sources).
- **Huit analyses détaillées** (11/11, avec leurs sources) : `/mnt/project-files/rago-route-page/refonte/analyses/` ([[Sources]]).
- **Captures de la refonte** : `/mnt/project-files/rago-route-page/refonte/` (haut de page, scène du haut en trois moments, téléphone, prix). Les captures et la vidéo à la racine de `rago-route-page/` montrent la version du matin.
- **État (11/11)** : la version du matin (« Lose packets, not fights. ») a été poussée sur `staging` le matin (Sofiene, carte de choix : « Oui, pousse sur staging »). La **refonte**, vérifiée (ordinateur, téléphone, mouvement réduit, sans JavaScript), l'a remplacée **sur `staging`** le 11/11 après-midi (nouvelle carte de choix, même réponse : « Oui, pousse sur staging »). Pas en prod. Annonce de la sortie après les tests (plus bas).

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
- D'ExitLag, la page reprend le meilleur recadrage (« ce n'est pas ta ligne, c'est la route », d'où le sélecteur de symptômes) et fait l'inverse de ses conditions cachées : prix, prélèvement automatique et annulation sont écrits près de chaque bouton d'essai. De Speedify : dire ce qu'on ne fait pas rend crédible.

## Ce qui différencie Rago Route (dit sans nommer personne)
1. Fait pour Minecraft Java : une perte bloque tout ce qui suit. Aucune page Minecraft concurrente ne parle de TCP ni d'Hypixel derrière Cloudflare.
2. Un paquet de secours qui refait un paquet perdu parmi 2 à 4, sans aller-retour, en plus des copies et du renvoi rapide.
3. La connexion gardée quand tous les trajets coupent quelques secondes (labo seulement : P0-4 avant de la mettre en avant).
4. Chaque résultat avec ses conditions, chaque animation marquée « Illustration ».
5. Ce qu'il ne fait pas, dit avant le prix.
6. Inclus dans Premium à 5,99 $ par mois, avec les 218 tweaks et le [[Packet Optimizer]], là où les outils séparés coûtent de 4 à 15 $ par mois.

Pas revendiqué : le nombre de routes (d'autres en ont 3 à 5), « instant » (le renvoi part vers 1,25 aller-retour du tunnel), le chiffrement comme exclusivité, le téléphone et Minemen avant leurs tests.

## La page refaite, section par section
Chaque section répond à une seule question du joueur, avec un seul point focal ; détail du code dans [[route.html]].
1. **« Lost packets shouldn't freeze your game. »** : une scène de jeu dessinée (un adversaire sur un pont) qui gèle puis saute en direct et continue avec Rago Route ; dessous, le trajet des paquets. Sur téléphone, le bouton d'essai et ses conditions passent avant la scène.
2. **« Your ping looks fine. Your game still freezes. »** : sélecteur de 9 symptômes (cause, où ça se passe, verdict Built for this, Sometimes ou Not this), puis le test réseau gratuit avec la façon de lire son résultat. Depuis l'Europe, le test dit toujours « High ping » sauf pertes ou gigue (« Unstable connection ») : la page explique que « High ping » est la distance.
3. **« Two paths to Paris. Then the usual road to Hypixel. »** : carte épinglée en 4 étapes ; le départ commun (Wi-Fi, box) est dessiné, et la route vers l'Amérique du Nord ne change pas.
4. **« Three ways back for a lost packet. »** : simulateur en 3 cas (perdu sur un chemin, sur le Wi-Fi, deux de suite), avec une légende en mots et les compteurs de l'app.
5. **« A short cut doesn't have to end your match. »** : frise de coupure ; résultat de labo ; « a long cut can still end your match ».
6. **« You see what it does. Even when it does nothing. »** : maquette de l'onglet ; sur une ligne propre, 0 paquet sauvé.
7. **« What we've measured so far. »** : registre des résultats, puis l'appel « Try it on your own connection. ».
8. **« Made for one game. Clear about what it does. »** : six faits, en texte seul.
9. **« Made for lag on the way to Hypixel, not on your PC. »** : pour qui, pas pour qui.
10. **« Rago Route comes with Premium. »** : carte Premium avec la frise de l'essai, puis trois étapes.
11. **« Before you try it. »** : 16 questions publiques, 2 en attente de test (blocage de compte, clients Lunar, Badlion et Feather).
12. **« Give every packet a second path. »** : essai ou test gratuit.

## Choix faits pour vendre honnêtement
- Le bouton « Start 3-day free trial » mène au vrai paiement (`/buy?interval=month&trial=1`) depuis le héros, les résultats, la carte Premium et la fin ; le bouton de l'en-tête et la barre du téléphone (« Try 3 days free ») mènent d'abord aux prix, comme sur l'accueil. Un seul bouton rouge à l'écran à la fois.
- Près de chaque bouton d'essai : « Card required », le prix après l'essai, le prélèvement automatique et « Cancel in two clicks in the app, or anytime from your account » ; hors Windows : « The 3 days start when you pay, so start your trial at your PC. » La FAQ dit « 3 days after you start », jamais « day 3 ».
- La carte Premium montre la frise de l'essai (Today, For 3 days, After 3 days), « One trial per person », l'annuel sans essai (« Paid today. Renews once a year at the price you paid; if prices change, we email you first. »), « Secure checkout with Stripe · Prices in US dollars · Cancel anytime · No refunds: try it free first », et « Already Premium? » pour qu'un abonné n'achète pas une 2e fois.
- Action secondaire partout : le test réseau gratuit (« Test your connection free »).
- Jamais : « the only », « the first », « zero risk », « guaranteed », « no ban », « instant », « FEC » seul, « up to X % » sans source, un meilleur hitreg, « we'll remind you » ([[Voix et ton]]).

## Résultats affichés
La page n'affiche que des mesures, chacune avec son étiquette et sa ligne de conditions ; les animations sont des illustrations et le bénéfice attendu est écrit comme un but (« so your game waits less »).
- 113 ms par Rago Route contre 119 ms en direct (médianes de 79 paires), plus lent 17 fois sur 79, pic à 302 ms contre 206 ms (Measured · prototype, Mac, 07/11).
- 2 246 paquets sauvés par le 2e chemin en 2 min environ, avec 30 % de pertes simulées sur le chemin 1 (prototype, 06/11).
- 1 413 paquets refaits à l'arrivée (Lab test, 08/11).
- Rien ressenti à 5 % de pertes, une nette différence à 25 % (Tester's impression, un testeur, Windows, 09/11).
- 8 s de coupure totale tenues, trafic revenu 20 ms environ après le retour du réseau (Lab test, 07 et 08/11).
- Ligne propre sur Windows : 0 paquet sauvé (07/11, dans le texte de la section 6).

2 246, 113 / 119 ms et la coupure de 30 s du téléphone viennent du prototype sur le Mac de Sofiene, pas de l'app Windows. Les blocs qui attendent un test (19 portes) sont cachés en prod et visibles en jaune sur `staging`.

## Animations et images
- Cinq animations en SVG et CSS, une par fonction principale, toutes marquées « Illustration » : la scène du haut, la carte « Two paths to Paris », le simulateur, la frise des coupures et la maquette de l'onglet. Elles ne tournent que visibles à l'écran, ont un bouton Pause et une image fixe complète en mouvement réduit et sans JavaScript.
- Direction artistique : aucune police ni couleur nouvelle. La scène du haut est dessinée avec les couleurs de l'accueil (ombres en noir transparent posé dessus), sans texture ni skin de Minecraft.
- Images ChatGPT : une seule paire est utile (prompts « image 1 / image 2 » dans le dossier, partie 8) : le téléphone branché au PC qui prend le relais quand le Wi-Fi tombe, à générer seulement si le test P0-5 réussit. Tout le reste est dessiné en code.

## Avant l'annonce
- **Tests P0-1 à P0-9** (protocoles dans le dossier, partie 6) : ping sur Windows avec et sans (P0-1), pertes simulées avec et sans (P0-2), ressenti à l'aveugle (P0-3), vraies coupures (P0-4), téléphone sur Windows (P0-5), Minemen (P0-6), cinq soirées de jeu normal et une vraie capture de l'onglet (P0-7), nouvel export du test réseau par PC et par pays (P0-8), blocage de compte avec 3 à 5 comptes de l'équipe (P0-9, en premier).
- **Questions ouvertes** ([[Questions ouvertes]]) : q97 (autres régions), q99 (P0-9 et message à Hypixel), q100 (bouton « Get notified on Discord » de l'accueil), q101 (Lifetime et Rago Route), q102 (annuler depuis le site en 2 clics), q103 (abonné non connecté qui paie un 2e abonnement), q104 (« Card required » alors que PayPal passe aussi).
- **En prod avant la sortie** : la [[Version 1.3.0]] sur `/download` et la route `/route/token` du [[Serveur de licences]].
- **Ailleurs sur le site** : `privacy.html` ne parle pas encore de Rago Route ; la liste Premium et la carte Lifetime de l'accueil ne le citent pas ; la phrase d'essai de l'accueil dit encore « charged automatically on day 3 » et « Cancel in two clicks from your account » ([[page.html]]).
- **En publiant en prod** : retirer du HTML les blocs en attente (cachés à l'écran, leur texte reste lisible dans le code source).
- **Pas de mail de rappel** avant le prélèvement de l'essai : seul le mail du début donne la date ; les études du vault en recommandent un ([[Paiements Stripe]]). À décider.
- **Proposition** : noter dans Stripe si un essai vient de la page Rago Route ou de l'accueil, pour mesurer la page sans traceur.
