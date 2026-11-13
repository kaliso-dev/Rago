---
type: code
tags: [code, site, html, javascript, rago-route]
fichier: site/src/route.html
lignes: 787
maj: 2026-11-13
---
# route.html

Source de la page de **Rago Route** (`rago-optimizer.com/route.html`) : ce que c'est, comment ça marche (une petite animation par fonction, avec ce qui a été mesuré), ce que ça ne fait pas, comment commencer, le prix et la FAQ. Fiche parente : [[Code du site]]. Fonctionnalité : [[Proxy]], [[Infrastructure Rago Route]]. Choix de vente, concurrents et résultats : [[Page de vente Rago Route]]. Offre : [[Offres et prix]].

**État (13/11, soir)** : page **refaite entièrement** le 13/11 à la demande de Sofiene (« faut refaire toute la page des proxy il faut la simplifier enlever les illustration complète priviligie des illutration animé simple et épurer réduit la longueur de la page toute les feature doivent être expliqué mais la page doit aller droit au but et expliqué uniquement les procu enlève lme superflux » ; et pour le prix : « dans la page des proxy il faut un plan premium avec ou une card proxy option qui précise que si t'as déjà le premium et dans le détail de la card il faut bien préciser toute les feature »). 787 lignes au lieu de 2 138 ; sur ordinateur (1 440 px de large), la page fait **6 600 px de haut au lieu de 14 750**. Vérifiée en local (ordinateur et iPhone 13, aucune erreur de page, pas de défilement horizontal). **Sur `staging` depuis le 13/11 au soir** (« Oui, envoie sur staging ») ; pas en prod. La page publiée `site/route.html` est produite par [[build.py]] ; ne jamais la modifier à la main.

## Rôle et place dans l'ensemble
- Page autonome, liée depuis l'accueil ([[page.html]] : menu, section `#route` « Discover Rago Route », case « Add Rago Route » et bandeau « Already Premium? » des prix, pied de page). Pas de lien depuis [[tweaks.html]] ni [[reviews.html]].
- Elle a des liens vers le serveur de comptes : l'essai et l'annuel **avec Rago Route coché** (`/buy?interval=month&trial=1&route=1`, `/buy?interval=year&route=1`) et l'option seule (`/buy/route`) ([[Paiements Stripe]]). [[build.py]] y recopie le `CONFIG` de l'accueil et écrit prix et liens dans le HTML ; [[preview.sh]] la traite comme les autres pages.
- Règles écrites en tête du fichier : chaque chiffre est mesuré, avec ses conditions et sa date ; les animations sont des illustrations.
- Voix du site ([[Voix et ton]]) : jamais « the only », « the first », « zero risk », « no ban », « guaranteed », « instant », « FEC » seul, ni « up to X % » sans source ; le hitreg n'est pas promis ; la façon d'annuler est toujours près d'un bouton d'essai.
- **Portes de test** : un bloc qui attend une mesure porte `data-gate` (et le test dans `data-gate-note`). CSS : `[data-gate]:not(.gate-on){display:none!important}`. Le script n'ajoute `gate-on` qu'en local et sur `*.netlify.app` (avec une étiquette jaune « Staging only · waits for … », sauf sur les `span`, `li` et `p`) : en prod ces blocs restent cachés, mais leur texte est dans le HTML. **9 portes** : `phone` (4, test P0-5 : la carte 05, l'étape 2, la ligne de la carte option, la question sur les données mobiles), `minemen` (3, P0-6 : `localhost:25566` dans « Nothing in your game », l'étape 3 et la carte option), `lifetime` (1, q101 : « Lifetime » dans la carte option) et `ban` (1, P0-9 : « Can Hypixel block my account if I use it? »).

## Contenu, section par section
1. **En-tête** : logo, menu (How it works, Get started, Pricing, FAQ ; caché sous 860 px), bouton « Start free trial » (`js-trial`).
2. **Héros** : surtitre « Rago Route · Premium option · beta » ; titre « Lose packets, not fights. » (q105) ; texte : « Rago Route is the anti-lag tunnel for Minecraft Java. Every packet takes two roads to the server, a lost one is rebuilt or sent again fast, and your connection holds through a Wi-Fi blink. Built to stop the freezes and rubberbands that lost packets cause. » ; boutons **Start 3-day free trial** (`#hero-cta`, `js-trial`) et **Already Premium? Add it** (`js-route` → `/buy/route`) ; ligne de prix (« Included in the free trial of Premium, then $3 a month on top. Card required: free for 3 days, then $5.99 + $3 a month, charged automatically unless you cancel before. ») ; trois coches (Built for Minecraft Java, Tested on Hypixel, Nothing injected in your game). À droite, **l'animation** : ton PC, deux routes (« Road 1 · straight to Paris », « Road 2 · through Frankfurt », point du relais), la sortie de Rago puis Hypixel ; un paquet se perd au milieu de la route 1 (« lost »), sa copie arrive par la route 2 et la sortie s'allume en vert. Légende « Illustration · A packet lost on road 1: its copy on road 2 gets there, and the first copy in is used. »
3. **How it works** (`#how`) : « One lost packet freezes everything behind it. » et le problème en deux phrases (Minecraft Java joue les paquets dans l'ordre ; un forfait plus rapide n'y change rien), puis « The drawings below are illustrations; the line under each one is what we measured. » Puis **six cartes**, chacune avec une petite animation, un numéro, un texte et sa preuve datée :
   - **01 Two roads** : Paris en direct et Frankfurt en relais, la première copie gagne. Preuve : 2 246 paquets sauvés en 2 min environ avec 30 % de pertes ajoutées sur la 1re route (Hypixel, prototype sur Mac, 06/11).
   - **02 Backup packets** : un paquet de secours pour 4 au plus, un paquet perdu refait à l'arrivée (animation : le paquet 2 devient « lost », puis « rebuilt » en vert). Preuve : 1 413 paquets refaits (labo, 20 Mo à travers 20 % de pertes sur chaque route, 08/11).
   - **03 Quick resend** : les paquets sont numérotés, le trou est vu dès que le suivant arrive, renvoi en un aller-retour environ (animation : 4 manque, 5 et 6 attendent, « gap », 4 renvoyé, « in order »). Preuve : « Counted live in the app » (compteur Resends de l'onglet).
   - **04 Session hold** : la sortie garde la connexion au serveur jusqu'à une minute pendant une coupure (animation : « Wi-Fi cut » sur le lien du PC, « held open at the exit »). Preuve : 20 ms pour repartir après une coupure totale de 8 s (labo, 07/11).
   - **05 Phone backup** (porte `phone`, badge BETA) : les données mobiles du téléphone en route de plus, en même temps que la connexion de la maison (animation : « Wi-Fi stalls », les copies du téléphone continuent). Preuve : environ 30 s de Wi-Fi coupé tenues par la 4G, injouable avec un signal faible (prototype sur Mac, 07/11).
   - **06 Live counters** : l'onglet Rago Route de l'app (animation : barres « Direct to Paris » et « Via Frankfurt », pastille « +1 » des paquets sauvés). Preuve : 0 paquet à sauver le premier soir sur Windows (Hypixel, 07/11).
4. **Trois faits** : « Nothing in your game » (pas de mod, `localhost`), « Encrypted and signed », « Fair play » (pas de faux ping, pas de lag switch).
5. **What it won't do** : la distance (113 ms contre 119 ms depuis la France, 79 pings, 07/11), les FPS, une ligne propre (différence difficile à sentir à 5 % de pertes, nette à 25 %), partout (fait pour l'Europe, Hypixel et Windows, sortie à Paris).
6. **Get started** (`#start`) : « Three steps, then play. » : Take Rago Route (essai, ou l'option depuis le compte), Turn it on (Network, puis Rago Route), Join localhost.
7. **Pricing** (`#pricing`) : « Premium with Rago Route, or just the option. » Deux cartes, chacune avec son étiquette **centrée** en haut (13/11 à 22 h, Sofiene : « il faut que dans la page dédié les tag soit centré ») :
   - **Premium + Rago Route** (étiquette « Free for 3 days ») : **8,99 $ par mois après l'essai** (`js-pmr`), « $5.99 Premium + $3 Rago Route: two subscriptions on one card. » ; bouton **Start 3-day free trial** (`/buy?interval=month&trial=1&route=1`) ; frise Today (rien à payer, Premium et Rago Route ouverts), After 3 days (5,99 $ + 3 $, puis chaque mois), Anytime (annuler l'un ou l'autre ; annulé avant la fin de l'essai, rien à payer ; jamais « day 3 ») ; liste « Included » (Rago Route, 218 tweaks, Packet Optimizer, 20 presets) ; bouton « Skip the trial: $29.99 a year + $3 a month » (`/buy?interval=year&route=1`) et la ligne « Yearly Premium is 6 months free, paid today; Rago Route stays monthly… One trial per person ».
   - **Rago Route option** (étiquette « Already Premium? », `#option`) : « For an account with Premium: monthly, yearly, Lifetime (porte) or Premium time from Rago. » ; **3 $ par mois en plus du Premium** ; bouton **Add Rago Route** (`/buy/route`) ; « Every feature » : deux routes, paquets de secours, renvoi rapide, session gardée, téléphone (porte), compteurs, chiffré et signé avec `localhost`, Hypixel (et Minemen derrière une porte), Minecraft Java, Windows 10 et 11, sur le PC du Premium ; puis les conditions : abonnement mensuel à part et résiliable, arrêté avec le Premium, bêta sans promesse de ping ni de hitreg, lien « Terms, section 4a » ([[Conformité juridique]]).
   - Dessous : « Secure checkout with Stripe · Prices in US dollars · Cancel anytime · No refunds: try it free first · Premium without Rago Route » (→ `./#plans`).
8. **FAQ** (`#faq`, 11 questions dont 2 derrière une porte) : le ping, quand on sent une différence, VPN, fair play, Hypixel et l'adresse partagée (porte `ban`), comment l'ajouter quand on a déjà Premium, ce que comprend l'essai (avec ou sans la case), ce qui se passe si on annule Premium, données mobiles (porte `phone`), serveur de Rago en panne, remboursement.
9. **Fin** : « Give every packet a second road. », essai et « Already Premium? Add it ».
10. **Pied de page** (mêmes liens et mention que l'accueil) et **barre du téléphone** `#dock` (≤ 760 px) : « Rago Route, in the free trial · then $3 a month on top of Premium » et « Start free trial » ; visible quand le bouton du héros, les cartes de prix et la fin ne sont pas à l'écran.

Retiré le 13/11 avec la refonte : la scène dessinée du jeu et ses emplacements de clips de gameplay, les quatre cartes de problèmes, le schéma des deux parties, la grande section des résultats, « Why Rago Route », « Is it for you? » et le test réseau gratuit avec ses fenêtres d'envoi au PC, les avis, la maquette complète de l'onglet.

## Script (une seule balise `<script>` en fin de page)
- `CONFIG` : `accountBase`, `previewAccountBase`, `trialDays`, `checkoutPath` (`/buy`), `routePath` (`/buy/route`), `currency`, `priceMonth`, `priceYear`, `priceRoute` (3). Recopié de l'accueil par [[build.py]] (sauf `checkoutPath`, `routePath` et `previewAccountBase`).
- Même règle de serveur de comptes que l'accueil : en local `http://<hôte>:8787`, sur `*.netlify.app` `previewAccountBase` (vide = liens coupés `#account-off` avec un message), sinon le vrai serveur.
- Portes (voir plus haut), code d'affilié `?ref=` gardé 30 jours (`rago_ref`) et ajouté aux liens d'essai et d'annuel.
- Prix : `js-td` (jours d'essai), `js-pm` (5,99 $), `js-py` (29,99 $), `js-pr` (**3 $**, sans décimales quand le prix est rond), `js-pmr` (8,99 $), `js-free` (« 6 months free ») ; liens `js-trial`, `js-year`, `js-route`. Hors Windows, la phrase `js-nw` (« The 3 days start when you pay… ») s'affiche.
- Barre du téléphone, apparition au défilement (`.rv`), et **animations** : SVG avec SMIL (`animateMotion`, `animate`), classe `svg.ill`. Chaque SVG est mis en pause hors de l'écran (`pauseAnimations`, IntersectionObserver) ; avec « réduire les animations », une image fixe à l'instant `data-still` (en secondes), choisie pour montrer la fonction.

## Données touchées
- Aucune lecture du serveur (plus d'avis ni de test réseau sur cette page).
- Écrit `rago_ref` dans `localStorage` (30 jours) et `sessionStorage`.

## Erreurs et cas limites
- Sans JavaScript : textes, prix et liens justes (recopiés par [[build.py]]) ; les animations SMIL tournent quand même.
- Aperçu Netlify sans `STAGING_ACCOUNT_URL` : liens de compte coupés avec un message.
- Un compte qui a déjà Premium et clique « Start free trial » est envoyé par le serveur sur `/buy/route` (il n'achète pas un 2e Premium) ([[app.js]]).

## Liens avec le reste
- Fabriquée par [[build.py]], publiée par [[Netlify]], réécrite sur les aperçus par [[preview.sh]] ; vérifiée par [[site-check.yml]] ; dans `sitemap.xml` avec `lastmod` 2026-11-07 ([[Fichiers publiés du site]]).
- Produit décrit : [[Proxy]], [[route.rs]], [[RouteTab.tsx]], [[Infrastructure Rago Route]], [[Version 1.3.0]]. Offre : [[Offres et prix]], [[Paiements Stripe]], [[route-addon.js]].

## À savoir avant de modifier
- Tout chiffre nouveau vient d'une mesure réelle, avec sa méthode et sa date. 2 246, 113 / 119 ms et la coupure de 30 s du téléphone viennent du prototype sur le Mac de Sofiene, pas de l'app Windows ([[Page de vente Rago Route]]).
- Dans les SVG, une couleur animée par SMIL s'écrit en attribut (ou en `style` pour les textes colorés), pas dans une règle CSS : la règle `svg.ill text{fill:…}` passerait devant l'attribut.
- Un bouton qui contient des `span` de prix (`js-td`, `js-py`…) met tout son texte dans un seul `<span>` : `.btn` est une boîte flex avec un écart entre ses enfants.
- Une porte ne s'ouvre (on retire `data-gate`) qu'avec la mesure du test qu'elle attend.
- Le prix de l'option (`priceRoute`) doit rester égal à `ROUTE_PRICE` du serveur ([[route-addon.js]]) : [[build.py]] le vérifie.
