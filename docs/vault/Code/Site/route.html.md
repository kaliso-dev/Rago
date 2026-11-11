---
type: code
tags: [code, site, html, javascript, rago-route]
fichier: site/src/route.html
lignes: 1706
maj: 2026-11-11
---
# route.html

Source de la page de vente de Rago Route (`rago-optimizer.com/route.html`) : le problème des joueurs, pourquoi il arrive, ce que fait chaque partie du moteur (une animation chacune), les résultats mesurés, ce que Rago Route ne fait pas, puis l'essai gratuit de Premium. Fiche parente : [[Code du site]]. Fonctionnalité : [[Proxy]], [[Infrastructure Rago Route]]. Analyse des concurrents et choix de la page : [[Page de vente Rago Route]].

**État (11/11)** : page **réécrite le 11/11** à la demande de Sofiene (« il faut créer une page dédier sur le site web pour expliquer ce que ca fait sans faire de fausse promesse »), **sur `staging` depuis le 11/11** (Sofiene, carte de choix : « Oui, pousse sur staging »), pas en prod. Historique : page créée le 07/11 (`9658716`), passée en « in beta in Premium » le 10/11 (`a190565`). La page publiée `site/route.html` est produite par [[build.py]] ; ne jamais la modifier à la main.

## Rôle et place dans l'ensemble
- Page de vente autonome, liée depuis l'accueil ([[page.html]] : menu, section `#route` « Discover Rago Route », pied de page). Pas de lien depuis [[tweaks.html]] ni [[reviews.html]].
- **Plus une page statique** depuis le 11/11 : elle a des liens vers le serveur de comptes (essai, achat annuel, téléchargement) et lit les avis (`/api/v1/reviews`). [[build.py]] y recopie le `CONFIG` de l'accueil et [[preview.sh]] la traite comme les autres pages.
- Règles écrites en tête du fichier : chaque chiffre de la page est mesuré (test réseau Rago, tests sur Hypixel, labo) et daté ; chaque animation porte la mention « Illustration ».
- Voix du site ([[Voix et ton]]) : jamais « the only », « the first », « zero risk », « up to X % » sans source ; le hitreg n'est pas promis ; on dit toujours comment annuler.

## Contenu, section par section
- **`<head>`** : titre « Rago Route: less lag from packet loss in Minecraft · Rago Optimizer » ; description « Rago Route sends your Minecraft connection down two roads at once, repairs lost packets on arrival and holds your match through a short Wi-Fi drop. Every result measured. In Rago Optimizer Premium, with a free trial. » ; `og:title` et `twitter:title` « Rago Route: lose packets, not fights » ; image de partage `og-image.png` ; Google Fonts (remplacé par [[build.py]]) ; CSS (lignes 33-486).
- **En-tête** : logo vers `./` ; liens How it works, Results, Pricing, FAQ ; bouton « Start free trial » (`js-trial`).
- **Héros** : surtitre « Rago Route · new in Premium, in beta » ; titre **« Lose packets, not fights. »** ; texte (moteur anti-lag pour Minecraft Java : deux routes, réparation, partie tenue pendant une courte coupure du Wi-Fi ; « Fewer freezes and rubberbands when your connection drops packets. ») ; bouton **« Start 3-day free trial »** (`#hero-cta`) et « Why you lag » (`#why`) ; sous les boutons : « Included in Premium. Card required: free for 3 days, then $5.99 a month unless you cancel. Cancel in two clicks from your account. » ; garanties « Built for Minecraft Java », « Hypixel and Minemen Club », « Your game is never changed », « Every result measured » ; schéma `#hero-dia` (Your PC, Road 1 · straight to the exit, Road 2 · through a Rago relay, Rago exit, Hypixel) avec les compteurs « Dropped on road 1 » et « Missing in your game » (toujours 0).
- **`#problems`** (« Sound familiar? », « Lag isn't always your PC. Often, it's the road. ») : quatre cartes animées (pic de ping en plein combat, gel puis saut, Wi-Fi qui coupe, pire le soir) et le chiffre **34 / 88** (« Rago network test, players' PCs, Oct 29 to Nov 4, 2026 », voir [[Test réseau]]).
- **`#why`** (« The real problem », « One lost packet stops everything behind it. ») : Minecraft Java joue les paquets dans l'ordre ; un forfait plus rapide n'y change rien. Schéma `#lag` : deux parties reçoivent les paquets 1 à 8, le 4 est perdu dans les deux ; sans Rago Route le joueur se fige (« frozen · waiting for 4 »), le 4 est renvoyé, puis tout arrive d'un coup (« catching up: rubberband ») ; avec Rago Route la copie du 4 arrive par la route 2 (« 4 came by road 2: no wait »).
- **`#how`** (« Rago Optimizer tunes your PC. Rago Route takes care of the road. ») : trois façons de récupérer un paquet (A second road, A backup packet, An instant resend), puis six fonctions, chacune avec Problem, Fix, une preuve et son animation :
  1. **Dual path** (« Two roads. The first copy wins. ») : preuve « Tested on Hypixel » : 30 % de paquets jetés exprès sur une route, **2 246** sauvés en environ deux minutes, aucun manquant.
  2. **Backup packets** (« A lost packet, rebuilt on arrival. », étiquette New) : un paquet de secours pour 4 ; preuve de labo : 20 Mo à travers 20 % de pertes sur chaque route, **1 413** paquets réparés à l'arrivée.
  3. **Instant resend** (« Still missing? Back in one round trip. ») : preuve de labo : 20 Mo intacts à 20 % de pertes sur les deux routes.
  4. **Session hold** (« Your Wi-Fi blinks. Your match stays. ») : preuve de labo : coupure totale de **8 s**, rien perdu, trafic revenu en **20 ms**.
  5. **Phone backup** (« Your phone becomes a backup road. », étiquettes New et Beta) : USB, Bluetooth ou Wi-Fi ; preuve « Prototype test on Hypixel » : Wi-Fi coupé environ **30 s**, partie tenue par la 4G (« How smooth it stays depends on your phone's signal. ») ; encadré `#diag` « Rago checks every step for you » (Phone seen on the USB port, Drivers ready, Hotspot turned on, Internet through the phone, Phone 4G added as a backup road).
  6. **Live counters** (« See every packet it saves. ») : maquette `#appmock` de l'onglet Rago Route (Direct to Paris 13 ms, Through Frankfurt 35 ms, Phone 4G to Paris 52 ms, compteurs, Exit → server 91 ms) ; preuve : premier essai sur Windows, route directe première 100 % du temps, aucune perte.
- **Fair play** (« Faster delivery. The same game. ») : pas de faux ping, pas de lag switch, chiffré et signé, jeu jamais modifié ; tube de caractères hexadécimaux (`#tube-row`).
- **`#results`** (« Measured, not promised. ») : six chiffres avec méthode et date : 2 246 (Hypixel, 06/11), 1 413 (labo, 08/11), 20 Mo (labo, 08/11), 20 ms (labo, 07/11), 30 s (prototype téléphone, 07/11), 116 / 119 ms (14 mesures, France, 07/11) ; puis **« What it won't do. »** : raccourcir la distance, monter les FPS, changer grand-chose sur une ligne filaire propre (« hard to feel at 5% loss and obvious at 25% »), aider hors d'Europe.
- **`#different`** (« Built for one game. Included in Premium. ») : six cartes (Made for Minecraft Java, Three ways back for a lost packet, Your phone as a backup road, Encrypted and signed, Proof you can check, One subscription for all of it).
- **`#fit`** (« Made for lag that comes from the road. ») : « Rago Route is for you if » / « Not the right fit if », puis « Not sure? » et le lien **« Test my connection for free »** (`js-free-app`, `/download`).
- **`#start`** (« Three steps, then play. ») : essai, activer Rago Route (Network, puis Rago Route), rejoindre `localhost` (Hypixel) ou `localhost:25566` (Minemen Club).
- **`#reviews`** (classe `js-rev`, cachée par défaut) : « What players say about Rago Optimizer. », six avis au plus et lien vers `reviews.html`.
- **`#pricing`** (« Rago Route comes with Premium. ») : carte Premium « Rago Route included », prix mensuel, « Or $29.99 a year, 6 months free. », bouton d'essai, note d'essai (`#trial-note` : prélèvement automatique au jour 3, annulation en deux clics, un essai par personne), « Skip the trial: $29.99 a year » (`js-year`), « No refunds: try it free first » ; liste « Everything in Premium » ; lien vers Lifetime (`./#lifetime`), qui inclut aussi Rago Route.
- **`#faq`** (« Clear answers. »), 16 questions : Will it lower my ping? · When will I feel a difference? · Is it a VPN? · Is it fair play? · Which servers does it work with? (invite à demander un serveur sur Discord) · Does it work outside Europe? · How do I use it? · How do I add my phone? · How much mobile data does the phone use? (« About 70 to 90 MB per hour », 11,2 Mo en 10 min mesurés) · What if my phone's signal is weak? · What happens if my internet cuts out completely? · What does Rago see? · Is Rago Route in the Free plan? · It's in beta. What does that mean? · How does the free trial work? (`#faq-trial`) · Can I get a refund? (`#faq-refund` : non, sauf double prélèvement ou erreur).
- **Final** : « Give every packet a second road. », boutons « Start 3-day free trial » (`#final-cta`) et « Discover Rago Optimizer ».
- **Pied** : liens (Rago Optimizer, Pricing, FAQ, Tweaks, Reviews, Partners, Discord, Terms, Privacy, Cancellation) et mentions (bêta, résultats selon la connexion, Hypixel et Minemen Club non affiliés, Mojang).
- **Hors flux** : barre d'essai `#dock` (téléphones, ≤ 760 px : « Rago Route, in Premium », « 3 days free, then $5.99/month », « Start free trial ») ; `#toast` ; fenêtre `#send` (« Rago runs on your PC. Send it there. » : partager ou copier le lien hors Windows) ; fenêtre `#dlg` (« Three steps to your network test. », avertissement SmartScreen).

Les prix, la durée de l'essai et la devise écrits dans le HTML (`.js-td`, `.js-pm`, `.js-py`, `.js-free`) et les liens de compte sont recopiés de l'accueil par [[build.py]] : la page reste juste sans JavaScript.

## Script des comptes et des prix (lignes 1141-1271)
- `CONFIG` : `accountBase`, `previewAccountBase` (rempli par [[preview.sh]]), `trialDays`, `checkoutPath` (`/buy`), `freeAppPath` (`/download`), `currency`, `priceMonth`, `priceYear`. Mêmes valeurs que le `CONFIG` de [[page.html]], recopiées par [[build.py]].
- Mêmes règles d'hôte que l'accueil : sur `localhost` ou un réseau local, serveur de comptes `http://<hôte>:8787` ; sur `*.netlify.app`, `previewAccountBase` ou rien (liens `#account-off` avec le message « Account pages are off on this preview (STAGING_ACCOUNT_URL isn't set on Netlify). »).
- `REF` : code d'affiliation `?ref=` (2 à 40 caractères), gardé **30 jours** dans `localStorage` (`rago_ref`) et dans `sessionStorage`, ajouté aux liens d'achat ([[Promotions et affiliation]]).
- Prix et liens : `.js-td`, `.js-pm`, `.js-py`, `.js-free` ; liens `.js-trial` (`/buy?interval=month&trial=1`) et `.js-year` (`/buy?interval=year`). L'essai part toujours sur le mensuel, comme sur l'accueil.
- `trap(d)` garde Tab dans une fenêtre ouverte. `.js-free-app` : hors Windows, ouvre `#send` ; sous Windows, ouvre `#dlg` après le téléchargement.
- Avis : `fetch` de `/api/v1/reviews` (sans cookie), 6 avis valides au plus, résumé « N reviews · x.x out of 5 » ; section cachée s'il n'y en a aucun ou sans serveur.
- Barre d'essai : visible quand ni `#hero-cta`, ni `#pricing .plan`, ni `#final-cta` ne sont à l'écran (`IntersectionObserver`).

## Script des animations (lignes 1273-1704)
- `REDUCE` : `prefers-reduced-motion`. Apparition au défilement : la classe `pre` est retirée à l'entrée à l'écran (marge basse −8 %).
- `run(el, make, still = 260)` : crée la scène au premier passage à l'écran (seuil **0,12**), appelle `step(dt)` à chaque image (`dt` plafonné à 48 ms) tant qu'elle est visible. Avec `REDUCE`, la scène est avancée de `still` pas de 16 ms puis figée. Outils : `packet` (point qui suit un chemin SVG), `kill` (éclat puis suppression), `ring`, `burstAt`, `box` (paquet numéroté : blanc, rouge, vert ou contour rouge du paquet de secours).
- Scènes :
  - **héros** : un paquet jumeau toutes les **380 ms**, **20 %** jetés sur la route 1, la copie de la route 2 arrive ;
  - **`#lag`** (le vrai problème) : `STEP = 21`, `X0 = 392`, `DOOR = 360`, `GAP = 300`, `T0 = 500`, `V1 = .2`, `LATE = 120`, `LOSE = 214`, cycle **7 200 ms** ; image fixe à 281 pas (la partie du haut figée sur le 4, celle du bas déjà passée) ;
  - **race** (01) : un paquet toutes les **520 ms** ; route 1 lente **28 %** du temps et perdue **14 %** ; bande des 24 derniers paquets (blanc : route 1 d'abord, rouge : route 2) ;
  - **fec** (02) : 4 paquets et un paquet de secours, un perdu à chaque tour dans l'ordre 3, 1, 4, 2, reconstruit à l'arrivée (« packet N repaired · nothing sent again ») ; cycle **6 200 ms** ; compteurs Lost on the way et Repaired on arrival (Sent again reste à 0) ; image fixe à 240 pas ;
  - **repair** (03) : paquets 1 à 7, le 4 est perdu, renvoyé quand le 5 arrive, puis 4 à 7 entrent ensemble ; cycle **7 600 ms** ;
  - **hold** (04) : coupure entre **1 800** et **5 600 ms** d'un cycle de **8 600 ms** ; textes « signal lost · x s », « held · n waiting » ;
  - **phone** (05) : cycle **9 000 ms**, le Wi-Fi cale entre **3 000** et **6 200 ms** ; lien du téléphone qui change à chaque tour (USB, Bluetooth, Wi-Fi) ; pourcentages Wi-Fi first / Phone first sur les 20 derniers paquets ; image fixe à 340 pas ;
  - **diag** (05) : cycle **8 000 ms**, trois étapes validées, le partage de connexion éteint (avec quoi faire), puis allumé et le téléphone ajouté ;
  - **appmock** (06) : toutes les **700 ms**, temps des routes, parts (route directe entre 93 et 98 %), compteurs et « Exit → server » entre 89 et 94 ms (illustration) ; image fixe à 60 pas ;
  - **chiffrement** : 28 groupes hexadécimaux en double pour une boucle sans saut ;
  - **chiffres** : `#st-a` et les `.cu` des résultats comptent jusqu'à leur valeur (`data-to`) en **1,2 s** ; sans animation, la vraie valeur reste dans le HTML.
- Le hasard (`Math.random`) ne sert qu'aux animations marquées « Illustration » ; aucun chiffre écrit en texte n'est simulé.

## Données touchées
- Lit `/api/v1/reviews` du [[Serveur de licences]] (pas sur un aperçu sans `STAGING_ACCOUNT_URL`).
- Écrit `rago_ref` dans `localStorage` (30 jours) et `sessionStorage`.

## Erreurs et cas limites
- Sans JavaScript : textes, prix et liens justes (recopiés par [[build.py]]), schémas dans leur état initial, avis cachés.
- Avec « réduire les animations » : une image fixe par schéma, chiffres directement à leur valeur.
- Aperçu Netlify sans `STAGING_ACCOUNT_URL` : liens de compte coupés avec un message, pas d'avis.

## Liens avec le reste
- Fabriquée par [[build.py]], publiée par [[Netlify]], réécrite sur les aperçus par [[preview.sh]] ; vérifiée par [[site-check.yml]] ; dans `sitemap.xml` avec `lastmod` 2026-11-07 ([[Fichiers publiés du site]]).
- Produit décrit : [[Proxy]], [[route.rs]], [[Infrastructure Rago Route]], [[Version 1.3.0]]. Offre : [[Offres et prix]] (Rago Route dans Premium et Lifetime).

## À savoir avant de modifier
- Tout chiffre nouveau doit venir d'une mesure réelle, avec sa méthode et sa date. Les chiffres 2 246, 116 / 119 ms et 30 s viennent du prototype sur le Mac de Sofiene, pas de l'app Windows ; la preuve du téléphone (05) attend le test de Sofiene sur Windows ([[Page de vente Rago Route]]).
- La FAQ dit « Hypixel and Minemen Club », « Rago's exit is in Paris » et « made for players in Europe » : à garder alignés sur [[Infrastructure Rago Route]].
- Les classes courtes ont déjà un style : `.r` (bande de la course), `.st` (étapes de `#start`), `.av` (avatars des avis). C'est pourquoi les cartes de résultats s'appellent `.rc`, et le texte d'état et le joueur du schéma `#lag` `lst` et `avt` : ne pas réutiliser `.r`, `.st` ou `.av` ailleurs.
- `sitemap.xml` garde `lastmod` 2026-11-07.
