---
type: code
tags: [code, site, netlify, fichiers]
fichier: site/
lignes: 5192
maj: 2026-11-10
---
# Fichiers publiés du site

Inventaire de tout ce qui se trouve à la racine de `site/` (ce que [[Netlify]] publie sur rago-optimizer.com) : pour chaque fichier, s'il est **généré** (et par quel outil) ou **posé à la main**, et ce qu'il contient. Fiche parente : [[Code du site]]. Fonctionnalité : [[Site]].

Tout ce qui suit est CONFIRMÉ (fichiers de `staging`, 10/11). Le chiffre « lignes » de l'en-tête est la somme des huit pages HTML publiées. Règle de base : **on ne modifie jamais une page générée** ; on modifie sa source puis on relance l'outil, et on commite les deux.

## Pages HTML
| Fichier publié | Généré par | Source | Taille (10/11) | Remarques |
|---|---|---|---|---|
| `index.html` | [[build.py]] + [[prerender.js]] | [[page.html]] (+ [[partners.json]] via [[sync_partners.py]], textes de l'app via [[sync_app.py]]) | 2 449 lignes, 246 Ko | accueil ; seule page avec JSON-LD et image de partage versionnée `?v=` |
| `tweaks.html` | [[build.py]] | [[tweaks.html]] (liste écrite par [[sync_tweaks.py]]) | 1 037 lignes, 580 Ko | la plus lourde (218 fiches dépliables) |
| `reviews.html` | [[build.py]] | [[reviews.html]] | 347 lignes | avis lus en direct sur le serveur |
| `partners.html` | [[build.py]] | [[partners.html]] (cartes de [[sync_partners.py]]) | 163 lignes | statique |
| `route.html` | [[build.py]] | [[route.html]] | 912 lignes, 61 Ko | statique ; **sur `staging` seulement** tant que la 1.3.0 n'est pas en prod |
| `terms.html` | [[make_legal.py]] | texte dans le script | 113 lignes | conditions de vente ; ancre `#cancel` |
| `privacy.html` | [[make_legal.py]] | texte dans le script | 120 lignes | confidentialité |
| `404.html` | [[make_legal.py]] | texte dans le script | 51 lignes | servie par Netlify pour toute adresse inconnue ; liens absolus ; `noindex` |

Plus de `refunds.html` sur `staging` depuis le 10/11 (redirigée en 301 vers `/terms.html#cancel` par [[netlify.toml]]) ; la branche de prod l'a encore.

Ce que [[build.py]] change entre une source et sa page : polices Google remplacées par `fonts/` (toutes les pages), `accountBase` et liens absolus du serveur de comptes (`index`, `reviews`, `tweaks`), et pour l'accueil seulement : `<head>` complet, prix et FAQ sans JavaScript, liens Discord, JSON-LD, blocs pré-rendus. Sur les aperçus, [[preview.sh]] retouche encore `index.html`, `reviews.html` et `tweaks.html`.

## Fichiers posés à la main
| Fichier | Rôle | Origine |
|---|---|---|
| `sitemap.xml` | plan du site pour les moteurs : `/` (lastmod 2026-10-16), `tweaks.html` (2026-10-16), `reviews.html` (2026-10-11), `route.html` (2026-11-07), `partners.html`, `terms.html`, `privacy.html` (2026-10-16) | à la main ; modifié le 10/11 (retrait de `refunds.html`) sans mise à jour des dates |
| `robots.txt` | `User-agent: *`, `Allow: /`, `Sitemap: https://rago-optimizer.com/sitemap.xml` | à la main |
| `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png` | icônes | copies de `brand/logo/web/` ([[export-logo.js]]) ; seules les métadonnées C2PA diffèrent pour trois d'entre elles |
| `og-image.png` | image de partage 1 200 × 630 (84 Ko) | copie de `brand/logo/web/og-image.png` ; **affiche encore « 199 tweaks »** |
| `og-launch.png` | image de partage du compte à rebours (46 Ko) | copie de `brand/logo/web/og-launch.png` ; utilisée seulement par [[launch-gate.js]] |
| `rago-wordmark.svg` | logotype blanc (en-têtes des pages légales et 404) | copie de `brand/logo/rago-wordmark-white.svg` |
| `bimi.svg` | logo au format SVG Tiny PS pour BIMI (avatar des e-mails envoyés depuis le domaine) | ajouté le 08/10 (`e5b1fd4`) ; référencé par l'enregistrement DNS du domaine, pas par le code |
| `fonts/Geist-Variable.woff2` (69 652 octets), `fonts/GeistMono-Variable.woff2` (71 368 octets) | polices auto-hébergées (aucune IP envoyée à Google) | ajoutées le 07/10 |
| `img/games/{minecraft,valorant,cs2,fortnite}.webp` | vignettes de la section bibliothèque de jeux de l'accueil (Lunar Client, VALORANT, Counter-Strike 2, Fortnite) | ajoutées le 20/10 (`4e0914e`) ; voir [[Bibliothèque de jeux]] |
| `img/partners/*.webp` (7 fichiers) | logos des partenaires | listés dans [[partners.json]] |
| `media/in-game-bar.mp4` (865 Ko), `.webm` (601 Ko), `.webp` (86 Ko, image d'attente) | vidéo derrière la démonstration de la barre en jeu sur l'accueil (`<video id="ig-v" preload="none">`) | ajoutées le 20/10 ; voir [[Barre en jeu]] |

## Fichiers présents dans `site/` mais jamais publiés
La commande de [[netlify.toml]] (et [[preview.sh]]) supprime avant publication :
- `site/src/` : les sources ([[page.html]], [[tweaks.html]], [[reviews.html]], [[partners.html]], [[route.html]], [[partners.json]], [[tweaks-copy.json]]) ;
- `site/tools/` : les outils ([[build.py]], [[prerender.js]], [[sync_app.py]], [[sync_partners.py]], [[sync_tweaks.py]], [[make_legal.py]]) ;
- `site/*.md` : `site/CLAUDE.md` (8 lignes, consignes pour Claude : modifier `src/`, lancer `build.py`, `sync_app.py` si le catalogue change, prix Lifetime égal à `LIFETIME_PRICE`) et `site/recherche-conversion.md` ([[recherche-conversion (site)]]).

## Liens avec le reste
- Fabrication et contrôle : [[Code du site]], [[site-check.yml]] (compare `index`, `reviews`, `tweaks`, `partners`, `route` ; ne compare pas les pages légales).
- Publication : [[Netlify]], [[netlify.toml]].
- Images et marque : [[Kit de marque (brand)]].

## À savoir avant de modifier
- `sitemap.xml` n'est pas généré : penser à y ajouter une nouvelle page et à mettre à jour les dates.
- Une nouvelle image ou vidéo se dépose directement dans `site/` (pas de chaîne de traitement) ; la garder légère (règle de vitesse, voir [[recherche-conversion (site)]]).
- Tout ce qui est à la racine de `site/` (hors `src/`, `tools/`, `*.md`) est public.
