---
type: code
tags: [code, site, html, javascript]
fichier: site/src/page.html
lignes: 2415
maj: 2026-11-11
---
# page.html

Source de la page d'accueil de rago-optimizer.com : tout le HTML, le CSS et le JavaScript de l'accueil dans un seul fichier, transformé en `site/index.html` par [[build.py]]. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]], [[Offres et prix]].

Tout ce qui suit est CONFIRMÉ (code de `staging`, 10/11, commit `ee77d4f`). Taille : 219 906 octets, 2 415 lignes. Textes en anglais US ([[Voix et ton]]).

## Rôle et place dans l'ensemble
- C'est **la seule page qu'on modifie** pour l'accueil. `site/index.html` (la page publiée par [[Netlify]]) est **générée** : ne jamais l'éditer à la main ([[Fichiers publiés du site]]).
- Le fichier est un **fragment** : il n'a ni `<!doctype>`, ni `<html>`, ni `<head>`, ni `<body>`. Il commence par `<title>` et la `<meta name="description">`, puis le bloc Google Fonts, un `<noscript><style>` et le grand `<style>` qui commence par `/* Layout`. [[build.py]] coupe le fichier juste après ce `</style>`, met devant un `<head>` complet (canonical, Open Graph, Twitter, icônes, JSON-LD) et entoure le reste de `<body>`.
- La source charge Geist depuis Google Fonts pour que l'aperçu marche tel quel (`http://localhost:8787/src/page.html` avec `npm run local`) ; [[build.py]] remplace ce bloc par les polices locales `site/fonts/`.
- Trois outils réécrivent des morceaux de ce fichier source (il faut commiter le résultat) :
  - [[sync_app.py]] : la constante `EX`, les lignes de `MODS`, les compteurs (« Nearly 220 tweaks », « 73 of 218 », « 0 of 82 on »…), les textes de l'aperçu de l'app ;
  - [[sync_partners.py]] : les cartes entre `<!-- partners:home -->` et `<!-- /partners:home -->` ;
  - [[sync_tweaks.py]] lit (sans l'écrire) l'objet `const ICON = {` pour les icônes de la page Tweaks.

## Plan du fichier
| Lignes | Contenu |
|---|---|
| 1-6 | `<title>Rago Optimizer: Minecraft PvP optimizer for Windows</title>`, description (« … Nearly 220 tweaks, free to start. »), Google Fonts, `<noscript>` qui cache `.js-only`, les onglets de l'explorateur, `#selall`, `#msel`, la barre Apply et les interrupteurs |
| 7-964 | CSS (jetons `:root`, boutons pilule, en-tête flottant, héros, aperçu de l'app, sections, animations, points de rupture) |
| 965-977 | Sprite SVG : `i-check`, `i-x`, `i-lock`, `i-down`, `i-arrow`, `i-word` (logotype complet, viewBox 1124 × 180), `i-discord`, `i-play`, `i-broom`, `i-mark` (le R rouge, viewBox 164 × 180) |
| 979-1005 | En-tête `header.top#top` et menu mobile `#menu` |
| 1007-1563 | `<main id="home">` : toutes les sections |
| 1565-1573 | Pied de page |
| 1575-1612 | Barre mobile `#dock`, `#toast`, fenêtres `#send`, `#promo`, `#dlg` |
| 1614-2415 | Le script (un seul `<script>`, sans bibliothèque) |

## CSS : repères
- Jetons sur `:root` (copie locale de la charte, pas un import de [[tokens.css (marque)]]) : encres `--ink-0` `#070708` à `--ink-5` `#2A2A30`, textes `--t1` `#F5F5F6` / `--t2` `#A1A1AA` / `--t3` `#7C7C86`, lignes `--l1` à `--l3` (blanc à 6, 10, 16 %), `--red` `#FF3B30`, `--red-hover` `#FF5E55`, `--red-press` `#F2352B`, `--ok` `#3DDC97`, `--warn` `#FFD60A`, polices `--sans` (Geist puis Segoe UI Variable…) et `--mono` (Geist Mono puis Cascadia Mono…), courbes `--out` `cubic-bezier(.16,1,.3,1)` et `--spring`, rayons `--r-xs` 8 px à `--r-2xl` 40 px et `--r-full` 999 px, gouttière `--g: clamp(20px,6vw,120px)`.
- Commentaire de tête : « full-bleed bands, wide fluid gutters, one idea per screen. Rounded everywhere, one red (#FF3B30), no orange. »
- Points de rupture : 1 279 px (le lien « Rago Route » sort de la barre du haut, `.nav .nav-rt`), 1 180 px (l'histoire « Why » se compacte, Premium passe en premier dans les prix), 1 020 px (la barre de navigation devient le bouton menu), 980, 760 px (téléphones : barre `#dock`, aperçu de l'app sans barre latérale, tableau compact), 620, 400, 340 px ; `(hover:none)` (les avis se font glisser au doigt au lieu de défiler), `(max-height:520px)`, `(min-width:1181px) and (max-height:760px/860px)` (écrans de portable : le héros tient dans l'écran), trois blocs `prefers-reduced-motion`.
- Classe `html.js` posée par le script ; `html.life` posée quand Lifetime est vendu ; règle `:root:not(.life) .life-on, :root.life .life-off {display:none}` (ligne 397).

## Sections, dans l'ordre, avec chaque bouton
### En-tête (`#top`) et menu
- Logo (`#i-word`) → `#home`.
- Barre (`nav.nav`) : Why Rago → `#why` · Features → `#features` · What's new → `#new` · Rago Route → `route.html` (classe `nav-rt`, cachée sous 1 280 px) · Tweaks → `tweaks.html` · Reviews → `#reviews` (classe `js-rev`, cachée tant qu'il n'y a pas d'avis) · Pricing → `#pricing` · FAQ → `#faq`.
- À droite : icône Discord (`js-discord`, `href="#discord"` remplacé par `CONFIG.discord`, nouvel onglet) · **Sign in** (`js-account`, `/login` → serveur de comptes) · **Try 3 days free** → `#pricing` · bouton menu `#menu-btn` (visible sous 1 020 px).
- Menu mobile `#menu` : les mêmes liens + Partners → `#partners` + Affiliate program (`js-affiliate`, `/affiliate`) ; boutons Sign in, **Create account** (`js-signup`, `/signup`), Join our Discord. Fermé par un lien, Échap, un clic dehors ou un écran plus large que 1 020 px.

### Héros (`section.hero`)
- Fond : `canvas#dots` (champ de points) et deux halos `.orb`.
- Pastille « **New** · Try Premium free for 3 days » → `#pricing`.
- `h1` : l'eyebrow « Minecraft PvP optimizer for Windows » (pour les moteurs de recherche) + « Every millisecond **counts.** » (mots qui apparaissent un par un, 0,09 s d'écart).
- Accroche : « Steadier ping, smoother frames, less input lag. Rago tunes Windows, your network and Minecraft, and puts your settings back when you turn a tweak off. »
- Boutons : **Try Premium free** → `#pricing` ; **Download free** (`js-free-app`) → réécrit vers `<accountBase>/download` ; sur Windows le clic ouvre aussi la fenêtre `#dlg`, ailleurs il est bloqué et ouvre `#send`.
- Coches : « Free to start, Premium free for 3 days », « Restore point offered », « Windows 10 and 11 ».
- **Aperçu interactif de l'app** `#hub` (copie de l'interface de [[App Windows]]) : barre de titre (recherche « Ctrl K », pastille « Premium »), barre latérale `#side` générée (Dashboard ; Optimize : Network, Latency, Graphics card, Windows ; In game : Hitreg, Minecraft, RBW Mod, Game mode ; Advanced : Expert mode, Restore ; Settings ; pied « Administrator · GAMING-PC »), module Latency ouvert avec deux sections (« Mouse and keyboard » 7, « Power » 20) et 4 lignes (`#tl1`, `#tl2`), compteur `#msel` « 0 of 82 on », bouton `#selall` « Select safe tweaks », barre Apply `#abar` (« Apply N tweaks », « N needs a restart », Clear), écran d'exécution `#run` (« Optimizing… », compteur 00/04, barre, liste, « Restart now » et « Close »).
- Flèche `#cue` « Scroll » → `#why` (cachée si elle touche le contenu ou dès 40 px de défilement).

### Bande de jeux (`#mq`)
Pastilles qui défilent : « Built for Minecraft PvP », BedWars, Ranked BedWars, Boxing, Sumo, Bridge, OptiFine presets, Max FPS preset, Fortnite, Valorant, CS2, Apex Legends, GTA V (doublées pour la boucle, la copie en `aria-hidden`).

### Why (`#why`)
- « The server decides. Your timing decides what it sees. » Quatre étapes `.st` (01 The journey, 02 Input lag, 03 Frame time, 04 Ping jitter) à gauche ; à droite une scène épinglée `#stage` avec quatre barres (`input`, `frame`, `net`, `dist`) et un sélecteur **Before / With Rago** (`#ba`).
- Valeurs de l'illustration : avant `{input:18, frame:22, net:26, dist:34}`, après `{input:8, frame:12, net:12, dist:34}`, échelle `MAX = 40`. La distance au serveur ne bouge jamais (« Rago can't change this »). Mention : « An illustration of where delay comes from, not a measurement. »

### Features (`#features`)
- « Nearly 220 tweaks. One clear app. » (titre écrit par [[sync_app.py]] : « Nearly N0 » quand le total est 1 à 3 sous une dizaine, règle décidée avec Sofiene le 9/10).
- Explorateur : onglets `#xtabs` (un par module de `MODS`) et panneau `#xpanel` avec 1 à 4 réglages réels par module (constante `EX`), badges Advanced / Restart, interrupteur, bouton « Run » pour une action, « Turn on / Turn off » pour une session. Détails en liste pour RBW Mod (Event Log, SysMain, Program Compatibility Assistant, Task Scheduler) et Game mode (Clears temp files, Stops printing, Turns off Windows animations, Restarts Explorer).
- Trois cartes : « Find any tweak » (recherche qui tape `mouse`, `game dvr`, `nic power`), « Start from a preset » (« 20 presets, 15 of them made for a game », pastilles qui tournent toutes les 1,6 s), « Always a way back » (anneau « Restore point created »).
- Lien « All 218 tweaks, explained one by one » → `tweaks.html`.

### New (`#new`)
« New in version 1.2 » · « Now Rago plays with you. » Dix cartes en grille, chacune avec une démo animée (illustrations, chiffres d'exemple) et des étiquettes Free / Premium :
| Carte | Étiquette | Démo |
|---|---|---|
| The in-game bar ([[Barre en jeu]]) | Free (live FPS, ping and usage) / Premium (switch tweaks in game) | vidéo `media/in-game-bar.mp4` puis `.webm`, image `media/in-game-bar.webp` ; Alt+X, la barre descend, 4 réglages s'allument, Clean (RAM 47 → 38 %), Alt+X, FPS et ping épinglés |
| Network test ([[Test réseau]]) | Free | serveurs mesurés un par un puis verdict « Great connection » |
| Clean RAM | Free | 71 % → 58 %, « 11.4 of 16 GB » → « 9.3 of 16 GB » |
| Your game library ([[Bibliothèque de jeux]]) | Free (launch your games) / Premium (Optimize and play) | images `img/games/minecraft.webp`, `valorant`, `fortnite`, `cs2` ; « Preset: Minecraft PvP · 12 tweaks » |
| Share your presets ([[Partage et support]]) | Free | code `RAGO1-K7QX-2M9P-VD4T` tapé puis « Copied », fichier `pvp-setup.rago` |
| Packet Optimizer ([[Packet Optimizer]]) | **Premium** (seulement Premium depuis le 10/11) | « Analyze my PC » → « Recommended: Hitreg » |
| Tools ([[Page Outils]]) | Free (cleanup, drivers and preinstalled apps) | 1,2 + 1,1 + 0,86 + 0,74 → « Clean 3.9 GB » → « 3.9 GB freed » |
| Automatic updates ([[Mise à jour automatique]]) | — | barre 18, 41, 63, 82, 100 % puis « Ready to install » |
| Ready in the background ([[Arrière-plan et démarrage]]) | — | interrupteur « Start with Windows » |
| A new glass design ([[Refonte glass]]) | — | vitres qui suivent la souris |
Bas de section : « Illustrations of Rago Optimizer 1.2. The numbers are examples, not measurements. » ; boutons **Download free** et « Talk about 1.2 on Discord ».

### Rago Route (`#route`)
- Ajoutée le 07/11 (commit `9658716`), texte passé de « in testing » à « **Rago Route · new in Premium, in beta** » le 10/11 (commit `a190565`, PR #76). Mots alignés le 11/11 sur la page de vente : « roads » au lieu de « paths » (commit local du 11/11, pas encore sur `staging`). Pas en prod.
- « Your PC is tuned. Now Rago takes the road. » ; texte : « … Rago Route sends every packet on two roads and quickly rebuilds or resends what's lost, so your game waits less. » ; schéma « Road 1 · straight to Paris », « Road 2 · through Frankfurt », légende « Lost on road 1, delivered by road 2 » ; trois points (Two roads for every packet, Lost packets rebuilt or sent again, fast, Your connection held open through a short cut).
- Boutons : **Discover Rago Route** → `route.html` ; « Get notified on Discord » (`js-discord`), à garder ou remplacer selon la question q100 ([[Questions ouvertes]]).
- Schéma SVG `#rt-svg` (Your PC → « Path 1 · straight to Paris » et « Path 2 · through Frankfurt » → Paris → Hypixel) animé en SMIL (`animateMotion`, cycle 3,6 s ; un paquet perdu sur le chemin 1 éclate, sa copie du chemin 2 arrive, anneau autour de Paris). Légende « Lost on path 1, delivered by path 2 ». Voir [[route.html]], [[Proxy]].

### How (`#how`)
« Four steps to your next match. » Ligne qui se remplit au défilement (`howFill`) : Download free (« Windows 10 and 11. No account needed. ») · Try the free tweaks (« 73 tweaks open, up to 30 on at once. The rest show a lock. ») · Try Premium free (« 3 days free with Stripe. Cancel anytime before day 3 and pay nothing. ») · Sign in and unlock (« With Google, Discord or email. All 218 tweaks, no limit. »).

### Reviews (`#reviews`, caché par défaut)
« Players feel the difference. » Résumé `#rev-sum` (« N reviews · 4.8 out of 5 ») et lien « See all reviews » → `reviews.html`. Deux rangées `#r1`, `#r2`, bouton « Pause ». Voir le script plus bas.

### Plans (`#plans`, ancre de prix `#pricing` sur le sélecteur)
- « Start free. Unlock everything with Premium. » Sélecteur **Monthly / Yearly** (`#billing`, Yearly par défaut) et pastille `#save` « 6 months free yearly ».
- **Free** : « $0 forever », liste (In-game bar, Network test, Clean RAM, Game library et partage de presets, « 73 tweaks open, up to 30 on at once », Remove preinstalled apps ; verrouillés : « Network and hitreg tweaks, presets and Packet Optimizer »), bouton **Download free** (`/download`).
- **Premium** (« Recommended ») : prix `#p-amt` (2,50 $/mois en annuel, 5,99 $ en mensuel), `#p-note` (« Billed $29.99 yearly. 6 months free. » ou « Billed monthly. »), liste (All 218 tweaks, Packet Optimizer, 20 presets, Optimize and play, 21 tweaks to switch mid-match, No limit, futures versions, rôle Premium sur Discord), « One license, one PC. », bouton **Start 3-day free trial** (`js-trial`) → `/buy?interval=month&trial=1` (**toujours le mensuel** depuis le 10/11), texte `#trial-note`, bouton **Skip the trial and buy now** (`js-checkout`) → `/buy?interval=year` ou `month` selon le sélecteur, ligne « Secure checkout with Stripe · Cancel anytime · No refunds: try it free first » → `terms.html#cancel`.
- **Lifetime** (`#lifetime`) : `#l-amt` 59,99 $ « once », liste (dont « Already subscribed? Switch from your account page », visible seulement quand Lifetime est vendu), bouton `js-lifetime` « **Coming soon** » (sans lien, `aria-disabled`) qui devient « Get Lifetime » → `/buy/lifetime` quand le serveur le vend.
- Tableau comparatif `#cmp` (Free contre Premium, 19 lignes), rempli par le script.

### FAQ (`#faq`)
« Before you buy. » Accordéon `#faqs` (une seule question ouverte à la fois). 18 questions, dont 2 réservées à Lifetime (marquées `"life"`, cachées tant que Lifetime n'est pas vendu) : bannissement, ping, Free contre Premium (« Free opens 73 tweaks… up to 30 of them on at once »), jeux (15 presets de jeux listés), portables, Mac et Linux, essai gratuit, **remboursement (« No, payments aren't refunded »)**, mensuel ou annuel, rôle Premium sur Discord, Lifetime, passage à Lifetime, un PC par licence, annuler un réglage, SmartScreen, désinstaller, antivirus, affiliation. Les mots « Discord » deviennent des liens (`dlink`).

### Community (`#community`, `js-discord`)
« Join the Rago Discord. » Animation d'orbites, trois points (tickets, salon Premium, notes de version), bouton **Join our Discord** (nouvel onglet). Section retirée de la page si `CONFIG.discord` est vide. Voir [[Discord]].

### Partners (`#partners`)
« Our partner servers. » Les 4 cartes marquées `home` de [[partners.json]] (écrites par [[sync_partners.py]]), lien « See all partners » → `partners.html`. Voir [[Partenaires et créateurs]].

### Affiliate (`#affiliate`)
« Bring 3 players. Get 6 months of Premium. » (−5 % pour les amis, 3 filleuls au plus) ; animation `#affvis` (0/3 → 3/3 → « 6 months of Premium ») ; bouton **Join the affiliate program** → `/affiliate`. Voir [[Promotions et affiliation]].

### Final et pied de page
- « Tune your PC once. Feel it on the first combo. » : Try Premium free, Download free, Join our Discord.
- Pied : Features, Tweaks, Rago Route, Pricing, FAQ, Affiliate program, Partners, Sign in, Create account, Discord, Terms, Privacy, Cancellation (`terms.html#cancel`). Mention : « … © 2026 Rago Optimizer, by KALISO and RAGO. » (signature du 10/11).

### Éléments flottants
- `#dock` (téléphones, ≤ 760 px) : « Free » (`js-free-app` ; « Send to my PC » hors Windows) et « Try Premium free ». Visible après 640 px de défilement, caché à 320 px du bas et quand l'aperçu `#hub`, l'histoire `#why` ou les prix `#plans` occupent le milieu de l'écran.
- `#send` : « Rago runs on your PC. Send it there. » (lien à ouvrir sur le PC, boutons Close, Copy link, Share avec `navigator.share`).
- `#promo` : pop-up de réduction (voir plus bas).
- `#dlg` : « Download started » · « Three steps to your first tweaks. » (ouvrir `RagoOptimizer-Setup.exe`, SmartScreen « More info » puis « Run anyway », mode gratuit 73/30), boutons Got it, See Premium, lien « Try again ».

## Ce que le script expose
### `CONFIG` (lignes 1616-1633)
| Clé | Valeur | Rôle |
|---|---|---|
| `accountBase` | `https://account.rago-optimizer.com` | serveur de comptes, sans `/` final ; vide = même domaine que le site |
| `previewAccountBase` | `""` | rempli au déploiement des aperçus par [[preview.sh]] (`STAGING_ACCOUNT_URL`) |
| `trialDays` | `3` | même nombre que `TRIAL_DAYS` du serveur |
| `checkoutPath` | `/buy` | + `?interval=month|year` (+ `&trial=1`, `&ref=`, `&promo=`) |
| `lifetimePath` | `/buy/lifetime` | achat Lifetime (+ `?ref=` ou `?promo=`) |
| `loginPath`, `signupPath`, `affiliatePath` | `/login`, `/signup`, `/affiliate` | pages de compte |
| `freeAppPath` | `/download` | installateur public |
| `discord` | invitation permanente du Discord Rago | vide = tous les éléments `js-discord` retirés |
| `currency` | `$` | devise affichée |
| `priceMonth`, `priceYear`, `priceLifetime` | `5.99`, `29.99`, `59.99` | doivent être égaux aux prix Stripe ; `priceLifetime` = `LIFETIME_PRICE` de `licensing/src/billing.js` (vérifié par [[build.py]]) |
Le pop-up n'est **pas** dans `CONFIG` : il se règle sur le serveur (`/admin` ou `npm run admin -- popup`), voir [[Tableau de bord admin]].

### Fonctions et globales
- `$`, `$$` (sélecteurs), `reduce` (préférence « moins d'animations »), `esc` (échappement HTML), `toast(m)` (message 2,8 s), `MONTHS_FREE = floor(1e-9 + 12 − priceYear / priceMonth)` (= 6 avec 5,99 et 29,99).
- `acct(path)` : adresse sur le serveur de comptes, ou `#account-off` quand les comptes sont coupés.
- `wire(sel, url, msg, ext)` : pose les `href` des liens d'une classe.
- `onWindows` : vrai si l'agent utilisateur contient « Windows » ou si `navigator.userAgentData.platform` contient « Win ».
- `trap(d)` : garde la touche Tab dans une fenêtre ouverte.
- `openSend()`, `sendUrl()` (adresse de la page + `?ref=CODE` s'il y a un code d'affilié).
- `promo()` : code de réduction réclamé, tant qu'il est encore celui proposé.
- `REF` : code d'affilié (voir plus bas).
- `window.__bill()` : recalcule les liens d'achat ; `window.__watch(el)` : apparition au défilement ; `window.__seg(wrap, cb)` : sélecteur à pastille glissante (Before/With Rago, Monthly/Yearly).
- `ICON` (icônes Lucide des modules, même jeu que l'app ; lue aussi par [[sync_tweaks.py]]), `ICO` (restart, play, power, poweroff), `MODS` (`[id, nom, accroche, nombre]` par module), `EX` (exemples de l'explorateur), `F` (FAQ ; lue aussi par [[build.py]]).
- `howFill()` : remplissage de la ligne « How ».

## Fonctionnement détaillé
### Quel serveur de comptes ? (lignes 1645-1655)
1. Hôte vide (fichier ouvert en `file://`), `localhost`, `127.0.0.1`, `[::1]`, `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x` ou `*.local` → `http://<hôte>:8787` (le serveur local `npm run local`, [[Développer et tester]]).
2. `*.netlify.app` (aperçus de PR, `staging--rago-optimiser.netlify.app`) → `previewAccountBase`, ou `null` s'il est vide.
3. Sinon (le vrai domaine) → `accountBase`.
Avec `null`, chaque lien de compte vaut `#account-off` et un clic affiche « Account pages are off on this preview (STAGING_ACCOUNT_URL isn't set on Netlify). ». Ainsi **un aperçu ne touche jamais les vrais comptes ni le vrai Stripe**.

### Pop-up de réduction (lignes 1716-1754)
- Lu à chaque visite : `GET <compte>/api/v1/promo` (`credentials: "omit"`, `cache: "no-cache"`). Réponse `{ promo: { code, percent, eyebrow, title, text, total, left } }` ou `{ promo: null }` ([[API du serveur]]).
- Offre valable seulement si `code` respecte `^[A-Za-z0-9-]{2,40}$` et `0 < percent < 100`. Les textes acceptent `{percent}`, `{code}`, `{total}`, `{left}` ; si `total` et `left` sont des entiers : « Limited to the first N players · M left ».
- Affiché **12 s** après l'ouverture de la page, ou 600 ms après que le héros est sorti de l'écran. Jamais : si le stockage du navigateur est bloqué, si le même code a été vu il y a moins de 30 jours, si le visiteur est arrivé avec un code d'affilié (`REF`), s'il a déjà réclamé un code, ou si une autre fenêtre est ouverte (attend 1,5 s si le menu mobile est ouvert).
- `localStorage` : `rago_promo_seen` (horodatage), `rago_promo_seen_code`, `rago_promo_claimed` ; `rago_promo_t` sert juste à tester l'écriture. Ces noms sont listés dans `privacy.html` ([[make_legal.py]]).
- « Claim my discount » mémorise le code, ajoute `&promo=CODE` aux liens d'achat (`window.__bill()`) et affiche « N% off applied at checkout with CODE. ». Le serveur revérifie le code au paiement ([[Paiements Stripe]], [[Promotions et affiliation]]).

### Code d'affilié `REF` (lignes 2267-2280)
`?ref=CODE` (motif `^[A-Za-z0-9_-]{2,40}$`) est gardé 30 jours dans `localStorage.rago_ref` (`{c, t}`) et pour l'onglet dans `sessionStorage.rago_ref`. Il est ajouté aux liens d'achat (`&ref=`), au lien envoyé vers le PC et à l'achat Lifetime. **Un code d'affilié passe avant le code du pop-up** (jamais les deux).

### Prix et liens d'achat (lignes 2283-2338)
- `setBill("year"|"month")` : prix affiché `fmt(priceYear / 12)` ou `fmt(priceMonth)` (arrondi `Math.round(n*100)/100`), `#p-note`, liens `js-checkout` → `/buy?interval=<choix>` + `&ref=` ou `&promo=`, liens `js-trial` → `/buy?interval=month&trial=1` + code (commentaire : « after the trial, monthly only (2026-11-10) »), texte de `#trial-note` recalculé avec `trialDays` et `priceMonth`.
- Lifetime : `GET /api/v1/plans`. Vendu seulement si `lifetime.amount === round(priceLifetime × 100)` et `lifetime.currency` = `usd` (ou `eur`/`gbp` selon `currency`). Alors `html.life`, bouton « Get Lifetime » → `/buy/lifetime` + `?ref=` ou `?promo=`. Sinon « Coming soon » et les lignes `.life-on` restent cachées.
- Tableau comparatif (19 lignes, dans l'ordre) : Tweaks unlocked (73 of 218 / All 218) · in-game bar live stats (oui/oui) · switch tweaks mid-match (cadenas/oui) · Network test · **Packet Optimizer (cadenas/oui)** · Presets (cadenas/oui) · Game library (Launch games / Optimize and play) · Clean RAM, cleanup and driver check · Tweaks on at the same time (Up to 30 / No limit) · Remove preinstalled apps · Network, hitreg and most latency and graphics card tweaks (cadenas) · Minecraft, Expert mode, RBW Mod Off and Game mode On (cadenas) · Share and import presets · Restore point and undo · New tweaks from future versions (cadenas) · Premium role on Discord (non/oui) · Free trial (non / 3 days, card required) · How you pay (Free / Monthly or yearly, ou « Monthly, yearly or once » avec Lifetime) · License (Not needed / 1 PC per license).

### Avis (lignes 2190-2265)
- `GET <compte>/api/v1/reviews` (sauté si les comptes sont coupés). Une carte n'est gardée que si `rating` est un entier de 1 à 5 et que `comment` et `name` ne sont pas vides. Photo acceptée seulement si `avatar_url` correspond à `^https?://<hôte>(:port)?/avatars/[A-Za-z0-9_-]{20,40}\.webp$` ; sinon (ou si elle ne charge pas) la première lettre du nom.
- Toutes les cartes font **4 lignes** de texte : un avis plus long est coupé après un mot (recherche dichotomique sur une carte cachée de même largeur), avec « … » et **See more** → `reviews.html#r-<id>` (`id` de 1 à 12 caractères `[a-z0-9]`). Recalculé quand la largeur change ou quand la police est chargée.
- Tant que les cartes tiennent sur deux rangées : centrées et fixes (`.few`). Au-delà : deux bandes qui défilent en sens inverse (avis pairs / impairs), contenu répété 4 fois (copies cachées aux lecteurs d'écran et au clavier), bouton Pause/Play.
- Dès le premier avis, tous les éléments `js-rev` (section, lien du menu) apparaissent. Date affichée « Nov 2026 » (mois et année, UTC).
- **À VÉRIFIER** : `build.py` (ligne 78) dit que la page ajoute elle-même `aggregateRating` (étoiles Google) aux données structurées ; ce code (commit `4f33070`, 17/10, RAG-33, « à partir de 10 avis ») n'est plus dans `page.html`, ni sur `staging` ni en prod. Il semble avoir été perdu lors d'une fusion fin octobre ou début novembre.

### Aperçu de l'app (lignes 1880-1926)
- Lignes cliquables (`role="switch"`, Espace ou Entrée). « Select safe tweaks » allume tout, puis devient « Clear selection ».
- **Démo automatique** : 1,5 s après que 40 % de l'aperçu est visible, les 4 lignes s'allument une par une (420 ms), puis 800 ms et l'exécution démarre (800 ms, puis 620 ms par réglage), fin « Done · N of N applied. Restart your PC for everything to take effect. » (phrase copiée de `run.rebootNeeded` de l'app par [[sync_app.py]]). Si le visiteur n'a rien touché, l'écran se ferme seul 3,2 s plus tard. Toute interaction arrête la démo.
- « Restart now » ne fait qu'un toast : « In the app, this restarts your PC to finish applying your changes. »

### Autres animations
- Champ de points (`#dots`) : grille de 30 px, points qui grossissent et rougissent à moins de 200 px du pointeur, vague lente ; ≈ 24 images/s sur écran tactile (pas de 42 ms), arrêt hors écran, image fixe avec « moins d'animations ».
- Explorateur : rotation automatique toutes les **4,2 s** (sauf téléphones, `(hover:none)` ou ≤ 760 px, et « moins d'animations ») ; s'arrête au premier clic, au clavier (flèches, Début, Fin) ou au focus ; onglet de départ : Latency (`show(1)`) ; hauteur du panneau jamais réduite (la page dessous ne saute pas).
- Cartes « New » : chaque démo ne tourne que si la carte est visible à 35 % (`.live`) ; rien avec « moins d'animations ». La vidéo de la barre en jeu passe en `preload="auto"` à 600 px de l'écran ; si elle ne charge pas, la démo continue sur l'image.
- Rago Route : animations SVG en pause hors écran (seuil 20 %) ; avec « moins d'animations », image fixe à t = 2,1 s.

## Données touchées
- Réseau (navigateur du visiteur, sans cookie) : `GET /api/v1/promo`, `/api/v1/plans`, `/api/v1/reviews` sur le serveur de comptes ([[Serveur de licences]]). Les liens mènent à `/login`, `/signup`, `/affiliate`, `/download`, `/buy…`, `/buy/lifetime`.
- `localStorage` : `rago_ref`, `rago_promo_seen`, `rago_promo_seen_code`, `rago_promo_claimed` ; `sessionStorage` : `rago_ref`. Aucun cookie posé par la page, aucun outil d'analyse.
- Fichiers chargés : `media/in-game-bar.{mp4,webm,webp}`, `img/games/*.webp`, `img/partners/*.webp`, polices.

## Erreurs et cas limites
- Serveur injoignable : pas de pop-up, pas d'avis, Lifetime reste « Coming soon » ; un code déjà réclamé reste sur les liens (revérifié au paiement).
- Sans JavaScript : [[build.py]] a écrit en dur les liens de compte, le prix annuel, la FAQ en `<noscript>` (sans les questions Lifetime), les boutons Discord ; [[prerender.js]] a figé la barre latérale, les 4 lignes, la bande de jeux, le tableau, les onglets et le panneau Latency. Les avis restent cachés.
- Hors Windows (téléphone, Mac) : les boutons « Download free » ouvrent `#send` au lieu de télécharger.

## Liens avec le reste
- Transformé par [[build.py]] (puis [[prerender.js]]) ; réécrit par [[sync_app.py]] et [[sync_partners.py]] ; lu par [[sync_tweaks.py]] (`ICON`).
- Données venues de l'app : `app/src/data/catalog.json`, `free.json`, `app/src/lib/i18n.ts` ([[Catalogue des tweaks]]).
- Serveur : routes publiques de [[API du serveur]] ; prix Lifetime de [[Paiements Stripe]].
- Publié par [[Netlify]] ; aperçus réécrits par [[preview.sh]] ; vérifié par [[site-check.yml]].
- Pages sœurs : [[tweaks.html]], [[reviews.html]], [[partners.html]], [[route.html]].

## Tests
Pas de test automatique du comportement. [[site-check.yml]] vérifie seulement que `site/index.html` est bien la sortie de [[build.py]]. Vérification visuelle : aperçu Netlify de la PR, ou `npm run local` puis `http://localhost:8787/src/page.html`.

## À savoir avant de modifier
- Modifier ce fichier, **puis** `python3 site/tools/build.py`, puis commiter `page.html` **et** `index.html` (sinon `site-check` échoue).
- Ne pas toucher à la main aux zones écrites par les outils (`EX`, `MODS`, compteurs, cartes partenaires) : relancer [[sync_app.py]] ou [[sync_partners.py]].
- [[build.py]] dépend de motifs exacts : le bloc Google Fonts, `<style>\n/* Layout`, `<b id="p-amt">`, `<div class="price-note" id="p-note">`, `<span class="save" id="save">`, `<b id="l-amt">`, `  const F = [` … `\n  ];`, `<div class="faq rv" id="faqs"></div>`, `href="#discord"`, la classe `js-discord … hidden>`, le `<h2>(Nearly )N tweaks. One clear app.</h2>`. Les changer casse le build (assertions explicites).
- Les prix de `CONFIG` doivent être ceux de Stripe ; `priceLifetime` doit rester égal à `LIFETIME_PRICE` du serveur ([[Offres et prix]]).
- Règles de Sofiene citées dans le code : essai seulement sur le mensuel et plus de remboursement (10/11) ; « Nearly N0 tweaks » (9/10).
- Les chiffres de démo sont des illustrations : la règle « jamais de gain chiffré non mesuré » ([[Voix et ton]]) impose la mention « not a measurement ».
