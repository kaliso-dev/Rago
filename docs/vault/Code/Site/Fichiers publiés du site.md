---
type: code
tags: [code, site, netlify, fichiers]
fichier: site/
lignes: 3381
maj: 2026-11-24
---
# Fichiers publiés du site

Inventaire de tout ce qui se trouve à la racine de `site/` (ce que [[Netlify]] publie sur rago-optimizer.com) : pour chaque fichier, s'il est **généré** (et par quel outil) ou **posé à la main**, et ce qu'il contient. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]].

Tout ce qui suit est CONFIRMÉ (fichiers de `staging` le 10/11, revus le 22/11 sur la branche du site v5, PR #109). Le chiffre « lignes » de l'en-tête est la somme des huit pages HTML publiées. Règle de base : **on ne modifie jamais une page générée** ; on modifie sa source puis on relance l'outil, et on commite les deux.

## Pages HTML
| Fichier publié | Généré par | Source | Taille (22/11, v5) | Remarques |
|---|---|---|---|---|
| `index.html` | [[build.py]] + [[prerender.js]] | [[page.html]] (+ [[partners.json]] via [[sync_partners.py]], textes de l'app via [[sync_app.py]], icônes via [[sync_icons.py]]) | 1 017 lignes, 150 Ko | accueil ; seule page avec JSON-LD |
| `tweaks.html` | [[build.py]] | [[tweaks.html]] (liste écrite par [[sync_tweaks.py]]) | 879 lignes, 585 Ko | la plus lourde (218 fiches dépliables) |
| `reviews.html` | [[build.py]] | [[reviews.html]] | 282 lignes | avis lus en direct sur le serveur |
| `partners.html` | [[build.py]] | [[partners.html]] (cartes de [[sync_partners.py]]) | 111 lignes | statique |
| `route.html` | [[build.py]] | [[route.html]] | 466 lignes, 59 Ko | page de vente de Rago Route ; sur `staging` seulement tant que la 1.3.0 n'est pas en prod |
| `terms.html` | [[make_legal.py]] | `src/legal/terms.html` ([[Textes juridiques (src-legal)]]) | 246 lignes | conditions de vente ; ancres `#cancel`, `#route` |
| `privacy.html` | [[make_legal.py]] | `src/legal/privacy.html` | 224 lignes | confidentialité |
| `404.html` | [[make_legal.py]] | dans le script | 156 lignes | servie par Netlify pour toute adresse inconnue ; liens absolus ; `noindex` |
| `v5.css` | à la main | — | 764 lignes | feuille partagée par toutes les pages ([[v5.css]]) ; liée en `v5.css?v=<empreinte>` |

Plus de `refunds.html` sur `staging` depuis le 10/11 (redirigée en 301 vers `/terms.html#cancel` par [[netlify.toml]]) ; la branche de prod l'a encore.

Ce que [[build.py]] change entre une source et sa page : empreinte `?v=` sur `v5.css` et sur les images de partage (toutes les pages), `accountBase` et liens absolus du serveur de comptes (`index`, `reviews`, `tweaks`), et pour l'accueil seulement : `<head>` complet, prix et FAQ sans JavaScript, liens Discord, JSON-LD, blocs pré-rendus. Sur les aperçus, [[preview.sh]] retouche encore `index.html`, `reviews.html` et `tweaks.html`. Depuis la page de vente du 11/11, `route` reçoit aussi le `CONFIG` de l'accueil (serveur, essai, devise, prix), les prix écrits et les liens de compte, et [[preview.sh]] la retouche.

## Fichiers posés à la main
| Fichier | Rôle | Origine |
|---|---|---|
| `sitemap.xml` | plan du site pour les moteurs : `/` (lastmod 2026-10-16), `tweaks.html` (2026-10-16), `reviews.html` (2026-10-11), `route.html` (2026-11-07), `partners.html`, `terms.html`, `privacy.html` (2026-10-16) | à la main ; modifié le 10/11 (retrait de `refunds.html`) sans mise à jour des dates |
| `robots.txt` | `User-agent: *`, `Allow: /`, `Sitemap: https://rago-optimizer.com/sitemap.xml` | à la main |
| `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png` | icônes v5 : R rouge sur tuile blanche | copies de `brand/logo/web/` ([[Kit de marque (brand)]]), 22/11 |
| `og-image.png` | image de partage 1 200 × 630 (449 Ko) : « Every millisecond counts. », pastille « 218 tweaks », carte de trois tweaks | copie de `brand/logo/web/og-image.png` (v5, 22/11) |
| `og-launch.png` | image de partage du compte à rebours (421 Ko, v5) | copie de `brand/logo/web/og-launch.png` ; utilisée seulement par [[launch-gate.js]] |
| `bimi.svg` | logo au format SVG Tiny PS pour BIMI (avatar des e-mails envoyés depuis le domaine) | ajouté le 08/10 (`e5b1fd4`) ; référencé par l'enregistrement DNS du domaine, pas par le code |
| `fonts/Barlow-*.woff2` (400, 500, 600, 700), `fonts/BarlowCondensed-*.woff2` (600 à 900, dont 700, 800 et 900 italiques), `fonts/OFL-Barlow.txt` (licence) | polices v5 auto-hébergées (276 Ko en tout, aucune IP envoyée à Google), déclarées dans [[v5.css]] | ajoutées le 22/11 (PR #109) ; les polices Geist sont retirées |
| `img/v5/` : `rago-icon.svg` (tuile blanche au R rouge, en-têtes), `rago-cap.svg`, `brush.svg` (coup de pinceau des titres), `grain.svg` (grain du fond), `shot-dashboard.webp` (capture de l'app du héros) | images du design v5 | copiées des maquettes le 22/11 |
| `img/games/{minecraft,valorant,cs2,fortnite}.webp` | vignettes de la section bibliothèque de jeux de l'accueil (Lunar Client, VALORANT, Counter-Strike 2, Fortnite) | ajoutées le 20/10 (`4e0914e`) ; voir [[Bibliothèque de jeux]] |
| `img/wide/{minecraft,cs2,valorant,fortnite,gta,lol,apex,overwatch,rl,pubg}.webp` | dix captures en jeu paysage 760 × 400 avec les personnages du jeu (réduites depuis `app/src/assets/s5/games/wide/`) : les losanges entre les mots du titre de l'accueil v6 et la traînée d'images sur la section « What delays your hit » ; droits d'utilisation à vérifier avant la prod | ajoutées le 24/11 (Sofiene : « mets les covers mais adapté à la forme, il faut les autres ») |
| `img/covers/{fortnite,valorant,gta,cs2,lol,roblox,apex,rl,overwatch,minecraft}.webp` | dix jaquettes verticales 320 × 480 avec le logo du jeu (réduites depuis `app/src/assets/s5/games/cover/`) : les cartes qui s'empilent au chargement de l'accueil v6, Minecraft en dernier ; droits d'utilisation à vérifier avant la prod, comme dans l'app | ajoutées le 24/11 (demande de Sofiene : « mets plutôt les covers de jeux les plus connus ») |
| `img/x/{dash-title,dash-on,dash-free,dash-analyze,dash-pc,ingame}.webp` | six découpes 640 × 400 de la capture de l'app (`img/v5/shot-dashboard.webp`) et de la barre en jeu (`media/in-game-bar.webp`) : images du titre et traînée d'images de l'accueil v6 (plus le chargement depuis le 24/11) | ajoutées le 23/11 (Site v6, [[page.html]]) |
| `img/partners/*.webp` (7 fichiers) | logos des partenaires | listés dans [[partners.json]] |
| `media/in-game-bar.mp4` (865 Ko), `.webm` (601 Ko), `.webp` (86 Ko, image d'attente) | vidéo derrière la démonstration de la barre en jeu sur l'accueil (`<video id="ig-v" preload="none">`) | ajoutées le 20/10 ; voir [[Barre en jeu]] |
| `media/og-route.png` | image de partage de [[route.html]], 1 200 × 630 | depuis le 22/11 : copie de `brand/logo/web/og-route.png` (v5, 407 Ko) |

## Fichiers présents dans `site/` mais jamais publiés
La commande de [[netlify.toml]] (et [[preview.sh]]) supprime avant publication :
- `site/src/` : les sources ([[page.html]], [[tweaks.html]], [[reviews.html]], [[partners.html]], [[route.html]], [[partners.json]], [[tweaks-copy.json]], `legal/` : [[Textes juridiques (src-legal)]]) ;
- `site/tools/` : les outils ([[build.py]], [[prerender.js]], [[sync_app.py]], [[sync_partners.py]], [[sync_tweaks.py]], [[sync_icons.py]], [[icons_v5.json]], [[make_legal.py]]) ;
- `site/*.md` : `site/CLAUDE.md` (8 lignes, consignes pour Claude : modifier `src/`, lancer `build.py`, `sync_app.py` si le catalogue change, prix Lifetime égal à `LIFETIME_PRICE`) et `site/recherche-conversion.md` ([[recherche-conversion (site)]]).

## Liens avec le reste
- Fabrication et contrôle : [[Code du site]], [[site-check.yml]] (compare `index`, `reviews`, `tweaks`, `partners`, `route` ; ne compare pas les pages légales).
- Publication : [[Netlify]], [[netlify.toml]].
- Images et marque : [[Kit de marque (brand)]].

## À savoir avant de modifier
- `sitemap.xml` n'est pas généré : penser à y ajouter une nouvelle page et à mettre à jour les dates.
- Une nouvelle image ou vidéo se dépose directement dans `site/` (pas de chaîne de traitement) ; la garder légère (règle de vitesse, voir [[recherche-conversion (site)]]).
- Tout ce qui est à la racine de `site/` (hors `src/`, `tools/`, `*.md`) est public.
