---
type: code
tags: [code, site, html, javascript, rago-route]
fichier: site/src/route.html
lignes: 910
maj: 2026-11-10
---
# route.html

Source de la page de présentation de Rago Route (`rago-optimizer.com/route.html`) : le moteur réseau de Rago expliqué en cinq « fixes », avec des schémas SVG animés et des chiffres mesurés. Fiche parente : [[Code du site]]. Fonctionnalité : [[Proxy]], [[Infrastructure Rago Route]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11). Page créée le 07/11 (`9658716`, « page Rago Route animée (route.html) et section sur l'accueil »), passée de « in testing » à « in beta in Premium » le 10/11 (`a190565`, sortie de la 1.3.0). La page publiée `site/route.html` est produite par [[build.py]] (seulement les polices locales) ; ne jamais la modifier à la main.

## Rôle et place dans l'ensemble
- Page marketing autonome, liée depuis la section « Rago Route » de l'accueil ([[page.html]]) ; pas de lien depuis [[tweaks.html]] ni [[reviews.html]].
- Page **statique** : aucun appel au serveur de comptes, aucun lien de compte. [[preview.sh]] ne la touche donc pas.
- Règle écrite en tête du fichier : « Every figure on this page was measured (Rago's network test, tests on Hypixel, lab tests); the animations are labelled as illustrations. » Chaque schéma porte la mention « Illustration ».
- Le fonctionnement réel de Rago Route est décrit dans les notes de code de l'app et du relais : [[route.rs]], [[Code de Rago Route]].

## Contenu, section par section
- **`<head>`** : titre « Rago Route · Rago Optimizer », description « Rago Route sends your Minecraft connection down two roads at once, repairs lost packets on the spot and holds your match through a Wi-Fi drop. Now in beta in Rago Optimizer Premium. », canonical, `og:*`, Google Fonts (remplacé par [[build.py]]), CSS ; `<script>` d'une ligne qui ajoute la classe `js`.
- **En-tête** : logo, « Back to the site » (`./`), bouton **« Get notified »** vers l'invitation du serveur Discord Rago (nouvel onglet).
- **Héros** : surtitre « Rago Route · in beta in Premium », titre « Two roads for every packet. », texte (nouveau moteur réseau pour Minecraft : deux routes à la fois, réparation des paquets perdus, maintien de la partie quand le Wi-Fi coupe) ; boutons « Try it with Premium » (`./#pricing`) et « See how it works » (`#fixes`) ; garanties « Built for Minecraft Java », « Hypixel and Minemen first », « Your game is never changed » ; schéma `#hero-dia` (Road 1 · your usual route, Road 2 · through Rago, Your PC, Rago exit, Hypixel) avec deux compteurs « Dropped on road 1 » et « Missing in your game » (toujours 0).
- **`#problems`** (« Lag isn't always your PC. Often, it's the road. ») : quatre problèmes (pic de ping en plein combat, un paquet perdu qui fige tout, Wi-Fi qui coupe, fournisseur qui fait un détour) et un chiffre : **34 / 88** mesures Hypixel du test réseau Rago avec pertes, pics ou gigue de 10 ms ou plus (« Rago network test, players' PCs, Oct 29 to Nov 4, 2026 », voir [[Test réseau]]).
- **`#fixes`** (« Rago Optimizer tunes your PC. Rago Route takes the road. ») : cinq blocs, chacun avec Problème / Fix / preuve et un schéma :
  1. **Dual path** (« Two roads. First one wins. ») : chaque paquet part sur deux routes, la première copie arrivée gagne. Preuve : sur Hypixel, avec 30 % de paquets jetés exprès sur une route, l'autre en a sauvé **2 246** en environ deux minutes.
  2. **Instant repair** (« A lost packet is back in one round trip. ») : paquets numérotés, trou détecté dès qu'un paquet suivant arrive, renvoi immédiat. Preuve de labo : **20 Mo** passés à travers **20 %** de pertes sur les deux routes, arrivés intacts.
  3. **Session hold** (« Your Wi-Fi drops. Your match holds. ») : la sortie Rago garde la connexion au serveur ouverte **jusqu'à une minute** pendant que le PC est muet. Preuve de labo : coupure totale de **8 s**, rien de perdu, trafic revenu en **20 ms**.
  4. **Phone backup** (« Your phone becomes your backup road. »), étiquette **« Testing now »** : les données mobiles du téléphone branché servent de seconde route.
  5. **Smart route** (« The best road, picked for you. »), étiquette **« Coming with the app »** : mesure des routes directes et via chaque sortie Rago, choix de la plus rapide.
- **Fair play** (« Faster delivery. The same game. ») : « No fake ping », « No lag switch », « Encrypted by Minecraft, end to end » ; schéma d'un flux chiffré qui traverse Rago Route sans être lu.
- **`#faq`** (« Questions / Clear answers. »), 4 `<details>` : Will it lower my ping? (parfois ; « In our first tests from France, Rago Route was a few milliseconds faster… ») ; Is it a VPN? (non) ; Which games and servers? (Minecraft Java, Hypixel et Minemen Club d'abord) ; **When can I use it?** « Now, with Premium, the free trial included. In Rago Optimizer 1.3, open Network, then Rago Route, and turn it on. It's in beta, on Hypixel and Minemen Club, through Rago's servers in Europe. »
- **Where it stands** (« Built, and now in the app. ») : The engine **Done** ; Real matches **Done** ; In Rago Optimizer **In beta** (« Next: the phone backup and the best road picked for you »).
- **Final** : « Rago Route », « Be first on the road. », **« Join the Rago Discord to hear the moment Rago Route opens. »**, boutons « Join the Discord » et « Discover Rago Optimizer ».
- **Pied** : Rago Optimizer, Pricing, FAQ, Partners, Reviews, Terms, Privacy, Cancellation ; « Rago Route is in beta: features and results may change. … Hypixel and Minemen Club are run by their own teams and aren't affiliated with Rago. … ».

## Fonctionnement du script (lignes 635-908)
- `REDUCE` : `prefers-reduced-motion`. `NS` : espace de noms SVG.
- Apparition au défilement (classe `in`).
- `run(el, make)` : crée la scène au premier passage à l'écran (`IntersectionObserver`, seuil **0,12**), appelle `scene.step(dt)` à chaque image (`dt` plafonné à 48 ms) tant que le schéma est visible, l'arrête hors écran. Avec `REDUCE`, la scène est avancée de **260 pas de 16 ms** puis figée (une image fixe représentative). Sans `IntersectionObserver`, démarrage direct.
- `packet(...)` : un point qui suit un chemin SVG ; à la disparition, éclat (`burst`, 700 ms) puis suppression (500 ms).
- Scènes :
  - **héros** : un paquet jumeau toutes les ~380 ms, **20 %** jetés sur la route 1, la route 2 les rattrape ; compteurs mis à jour ;
  - **race** (01) : un paquet toutes les ~520 ms ; route 1 souvent plus rapide mais **28 %** lents et **14 %** perdus ; bande des 24 derniers paquets (blanc : route 1 d'abord, rouge : route 2) ;
  - **repair** (02) : paquets 1 à 7, le 4 est perdu, renvoyé quand le 5 arrive, puis 4 à 7 entrent ensemble dans le jeu ; cycle **7 600 ms** ;
  - **hold** (03) : coupure entre **1 800** et **5 600 ms** d'un cycle de **8 600 ms** ; textes « signal lost · x s », « held · n waiting », puis « back · nothing lost » ;
  - **phone** (04) : cycle **9 000 ms**, le Wi-Fi cale entre **3 000** et **6 200 ms**, pourcentages « Wi-Fi first » / « Phone first » sur les 20 derniers paquets ;
  - **smart** (05) : trois routes (« Rago exit A », « Direct », « Rago exit B »), sondes, choix à **2 600 ms**, cycle **7 000 ms**, routes qui varient un peu à chaque tour ;
  - **chiffrement** : tube de caractères hexadécimaux qui défilent ;
  - **statistique** : « 34 » compte de 0 à 34 en **1,2 s** à l'apparition.
- Le hasard (`Math.random`) ne sert qu'à l'animation ; aucun chiffre affiché en texte n'est simulé, sauf les compteurs des schémas marqués « Illustration ».

## Données touchées
Aucune : pas de requête réseau, pas de stockage.

## Erreurs et cas limites
Sans JavaScript, tout le texte est lisible et les schémas restent dans leur état initial. Avec « réduire les animations », chaque schéma montre une image fixe.

## Liens avec le reste
- Publiée par [[build.py]] et [[Netlify]] ; vérifiée par [[site-check.yml]] (elle fait partie des pages comparées) ; référencée dans `sitemap.xml` avec `lastmod` 2026-11-07 ([[Fichiers publiés du site]]).
- Produit décrit : [[Proxy]] (fonctionnalité Rago Route de l'app), [[route.rs]], [[Infrastructure Rago Route]], [[Version 1.3.0]].
- Offre : [[Offres et prix]] (Rago Route est réservé à Premium).

## À savoir avant de modifier
- **Textes restés de la période « en test »** (À VÉRIFIER avec Sofiene) : le bouton d'en-tête dit encore « Get notified » (vers Discord) et la section finale dit « Be first on the road. Join the Rago Discord to hear the moment Rago Route opens. », alors que le héros et la FAQ disent que Rago Route est disponible en bêta dans Premium depuis la 1.3.
- La FAQ dit « Rago's servers in Europe » et « Hypixel and Minemen Club » : à garder alignés sur l'infrastructure réelle ([[Infrastructure Rago Route]]).
- Tout nouveau chiffre doit venir d'une mesure réelle et dire d'où il vient (règle du commentaire de tête).
- `sitemap.xml` garde `lastmod` 2026-11-07 malgré la modification du 10/11.
