---
type: code
tags: [code, site, html, javascript]
fichier: site/src/page.html
lignes: 984
maj: 2026-11-22
---
# page.html

Source de la page d'accueil de rago-optimizer.com, transformée en `site/index.html` par [[build.py]]. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Offres et prix]]. Design : [[Charte graphique]] v5 « Match day ».

CONFIRMÉ d'après la branche du site v5 (PR #109 vers `staging`, 22/11/2026). Taille : 132 325 octets, 984 lignes. Textes en anglais US ([[Voix et ton]]).

## Rôle et place dans l'ensemble
- **La seule page qu'on modifie** pour l'accueil. `site/index.html` est générée : ne jamais l'éditer à la main ([[Fichiers publiés du site]]).
- Le fichier est un **fragment** : `<title>`, description, `<link rel="stylesheet" href="v5.css">` (feuille partagée par toutes les pages, voir [[Code du site]]), un `<style>` propre à l'accueil (mise en page des sections, points de rupture 1 240, 1 080 et 760 px), puis le corps. [[build.py]] met devant un `<head>` complet (canonical, Open Graph, Twitter, icônes, JSON-LD) et ajoute `?v=<empreinte>` à l'adresse de `v5.css`.
- Plus de Google Fonts ni de Geist : Barlow et Barlow Condensed sont servies par le site (`site/fonts/`, déclarées dans `v5.css`).
- Le sprite d'icônes (entre `<!-- icons -->` et `<!-- /icons -->`) est écrit par `sync_icons.py` (lancé par [[build.py]]) : une `<symbol id="i-NOM">` pour chaque `<use href="#i-NOM">` de la page, prise dans `site/tools/icons_v5.json` (icônes « imprimées » de l'app, icônes au trait pour les flèches, la croix et le menu).
- Outils qui réécrivent des morceaux de la source (commiter le résultat) : [[sync_app.py]] (les dix sections de l'app entre `<!-- mods -->` et `<!-- /mods -->`, compteurs « Nearly 220 tweaks », « 73 of 218 », largeur de la barre du plan gratuit, chiffre « 218 tweaks » du bandeau du héros) et [[sync_partners.py]] (cartes entre `<!-- partners:home -->` et `<!-- /partners:home -->`).

## Sections, dans l'ordre
- **En-tête** `header.s-nav#top` (fond flou dès 10 px de défilement) : logo (tuile blanche, R rouge, « RAGO »), Why Rago, Features, What's new, Rago Route (`route.html`), Tweaks (`tweaks.html`), Reviews (`js-rev`, caché sans avis), Pricing, FAQ ; à droite Discord (`js-discord`), **Sign in** (`js-account`), **Try 3 days free** → `#pricing`, bouton menu `#menu-btn` et menu `#menu` sur tablette et téléphone.
- **Héros** `section.s-hero` : pastille « new · Try Premium free for 3 days », titre « Every millisecond counts. » (coup de pinceau rouge sous « counts. »), accroche, boutons **Try Premium free** et **Download free** (`js-free-app` → `/download` ; ailleurs que sous Windows, fenêtre `#send`), capture de l'app `img/v5/shot-dashboard.webp`, bandeau défilant (Minecraft PvP, BedWars, Valorant, CS2, Fortnite, Apex Legends, 218 tweaks, 20 presets…).
- **Why** `#why` : « Why your hits don't register », quatre étapes (the journey, input lag, frame time, ping jitter) et le schéma « What delays your hit » `#hit` (barres avant / avec Rago qui poussent une fois à l'écran ; la distance au serveur ne bouge pas). Mention « An illustration of where delay comes from, not a measurement. »
- **Features** `#features` : titre `#feat-h` « Nearly 220 tweaks. One clear app. », carte des dix sections `#mods` (Latency allumée), barre du plan gratuit `#free-bar` (« 73 free tweaks, up to 30 on at once »), cartes « find any tweak » (recherche qui se tape seule `#typed`), « start from a preset » (`#presets`), « always a way back », lien vers `tweaks.html`.
- **New in 1.2** `#new` : la [[Barre en jeu]] (`#igst`, scène animée qui reprend la barre de l'app), [[Test réseau]], Clean RAM, [[Bibliothèque de jeux]] (`img/games/*.webp`), partage de presets ([[Partage et support]]), [[Packet Optimizer]] (Premium), [[Page Outils]], [[Mise à jour automatique]], [[Arrière-plan et démarrage]]. Étiquettes free / premium / every plan. Mention « The numbers are examples, not measurements. »
- **Rago Route** `#route` : « Your PC is tuned. Now Rago takes the road. », trois points, boutons **Discover Rago Route** → `route.html` et « Get notified on Discord » (question q100 dans [[Questions ouvertes]]), schéma « lost on road 1 // delivered by road 2 ».
- **How** `#how` : quatre étapes (Download free, Try the free tweaks, Try Premium free, Sign in and unlock).
- **Reviews** `#reviews` (`js-rev`, cachée tant qu'il n'y a pas d'avis) : résumé `#rev-sum`, deux rangées `#r1` / `#r2` qui défilent en sens contraire quand les cartes dépassent deux rangées, bouton Pause, « See more » → `reviews.html#r-<id>`, lien « See all reviews ».
- **Pricing** `#plans` (ancre `#pricing` sur le sélecteur) : sélecteur Monthly / Yearly `#billing` (Yearly par défaut, pastille `#save` « 6 months free »), cartes Free, **Premium** (`#p-amt`, `#p-per`, `#p-note`, case « Add Rago Route » `#with-route` avec son prix `#addon-pr`, note d'essai `#trial-note`) et **Lifetime** (`#lifetime`, `#l-amt`, bouton « Coming soon » tant que le serveur ne le vend pas) ; bandeau « Already Premium? » `#route-only` → `/buy/route` ; tableau Free contre Premium `#cmp`.
- **FAQ** `#faq` : « Before you buy. », compteur `#faq-n`, accordéon `#faqs` (18 questions dont 2 réservées à Lifetime, marquées `life`).
- **Community** `#community` (`js-discord`) : « Join the Rago Discord. » avec son animation (gardée telle quelle à la demande de Sofiene), programme d'affiliation `#affiliate` (« Bring 3 players. Get 6 months. », animation `#affvis` puis `#unlock`), partenaires `#partners` (4 cartes, lien « See all partners »).
- **Bande finale** `section.s-final` : fond rouge, « Your next match », « Tune your PC once. Feel it on the first combo. », mot « RAGO » en contour.
- Pied de page `footer.s-foot` (product, community, account, legal), barre mobile `#dock` (cachée au-dessus des prix), `#toast`, fenêtres `#send`, `#promo` (pop-up de réduction) et `#dlg` (téléchargement).

## Le script
Un seul script, sans bibliothèque. `CONFIG` (ligne 491) : `accountBase`, `previewAccountBase` (rempli par [[preview.sh]]), `trialDays` 3, `checkoutPath` `/buy`, `routePath` `/buy/route`, `lifetimePath` `/buy/lifetime`, `loginPath`, `signupPath`, `affiliatePath`, `freeAppPath` `/download`, `discord`, `currency` « $ », `priceMonth` 5,99, `priceYear` 29,99, `priceLifetime` (égal à `LIFETIME_PRICE` du serveur, vérifié par [[build.py]]).
- Choix du serveur de comptes : `localhost` et réseau local → `http://<hôte>:8787` ; `*.netlify.app` → `previewAccountBase` ou liens coupés ; sinon `https://account.rago-optimizer.com`.
- Appels publics ([[API du serveur]]) : `GET /api/v1/plans` (prix, essai, Lifetime vendu ou non), `/api/v1/promo` (pop-up), `/api/v1/reviews`.
- Blocs commentés : menu, en-tête et dock, apparition au défilement, sélecteur à deux positions, barres du schéma `#hit`, démos (recherche tapée, presets), prix (mensuel, annuel, Lifetime, option Rago Route), liens Discord, FAQ en accordéon, animation d'affiliation, avis, pop-up promo, téléchargement.
- Sans JavaScript : [[build.py]] grave les prix annuels, les liens de compte et une FAQ statique ; [[prerender.js]] grave le tableau `#cmp`.

## À savoir avant de modifier
- Modifier ce fichier, **puis** `python3 site/tools/build.py`, puis commiter `page.html` **et** `index.html` (sinon [[site-check.yml]] échoue).
- [[build.py]] dépend de motifs exacts (assertions) : `<link rel="stylesheet" href="v5.css">` une seule fois, `<b id="p-amt">`, `<p class="bil" id="p-note">`, `<em id="save">`, `<b id="l-amt">`, la liste `const F = [`, `<span id="faq-n">`, `href="#discord"`, la classe `js-discord … hidden>`, `<h2 class="s-h2" id="feat-h">(Nearly )N tweaks.`.
- L'id `#discord` est réservé (remplacé par l'invitation) : l'icône Discord s'appelle `i-discord`.
- Les couleurs des icônes imprimées viennent des variables `--pf` (face) et `--pb` (copie décalée) posées sur le `<svg class="i">`.
- Les prix de `CONFIG` doivent être ceux de Stripe ([[Offres et prix]]).
- Deux chiffres du plan gratuit coexistent : 73 ici (taille de `free.json`) et 68 sur la page Tweaks (tweaks distincts). À VÉRIFIER (déjà relevé le 10/11).
