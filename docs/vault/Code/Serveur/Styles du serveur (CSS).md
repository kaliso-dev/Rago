---
type: code
tags: [code, serveur, css]
fichier: licensing/public/tokens.css, licensing/public/account.css, licensing/public/admin.css
lignes: 105 + 459 + 538
maj: 2026-11-10
---
# Styles du serveur (CSS)

Les trois feuilles de style servies par le serveur de comptes sous `/assets/` : les jetons de la charte (`tokens.css`), le site de compte (`account.css`) et le tableau de bord (`admin.css`). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Servies par `serveStatic` d'[[app.js]] depuis `licensing/public/`. Les pages de [[views.js]] chargent `tokens.css` + `account.css` ; celles d'[[admin-views.js]] chargent `tokens.css` + `admin.css?v=<ASSETS>`. Polices Geist et Geist Mono servies par le serveur lui-même (`public/fonts/`, licence OFL dans `fonts/OFL.txt`), sans appel à Google. La **CSP stricte** interdit tout style en ligne : tout passe par des classes.

## tokens.css (105 lignes)

- En-tête : « design tokens **v1.1** (05/10/2026 : rouge `#FF3B30`, plus d'orange, arrondis partout) », source déclarée `brand/tokens/tokens.json` (chemin écrit avec l'ancien préfixe `/mnt/project-files/`).
- Variables `--rg-…` : encre (`--rg-ink-0` `#070708` à `--rg-ink-5`), texte, rouge de marque et ses transparences, états (succès, avertissement, erreur), typographie Geist (tailles, interlignes), espacements de base 4, rayons de 8 à 40 px, ombres, durées et courbes d'animation.
- Thème sombre par défaut, thème clair `[data-theme=light]` ; `prefers-reduced-motion` coupe les animations.
- Classes utilitaires `.rg-metric`, `.rg-overline` ; animations `rg-pulse`, `rg-pixel-blink`.
- **Copies** : `brand/tokens/tokens.css` (v1.2 du 07/10, avec en plus les fonds d'avertissement `--rg-warning-a06/a10/a18` et les jetons « verre » `--rg-glass-*` du 16/10) et `app/src/styles/tokens.css` (avec les jetons « verre »). La copie du serveur n'a pas ces ajouts (elle ne s'en sert pas). Voir [[Charte graphique]].

## account.css (459 lignes)

Pages du site de compte, charte v1.1 :
- fond : deux halos rouges sur un champ de points ; bandeau jaune « Test server » sur staging ;
- en-tête (marque, Pricing, onglets Account / Profile / Affiliate, avatar), boutons en pilule (`btn-primary`, `btn-ghost`, `btn-sm`, `btn-block`, boutons Google/Discord) ;
- pages d'accès en deux colonnes (`split`, texte + formulaire), onde « pulse », étapes d'achat (`steps`), champs, encadrés d'alerte ;
- tableau de bord `/account` (grille avec `subgrid`, refait le 11/10/2026), cartes licence, PC, téléchargement, Discord, affiliation (anneau SVG et places), badges d'état ;
- profil et photo (09/10), avis avec étoiles en boutons radio (11/10), code d'inscription à 6 chiffres et boutons Google/Discord (25/10), page de connexion de l'app (code à 4 caractères) ;
- animations d'entrée (`rise`, `d1`…`d4`) coupées par `prefers-reduced-motion` ;
- adaptations : 1000, 900, 760, 720, 560, 420, 360 px ; champs en 16 px sur téléphone (pas de zoom iOS), iPhone SE (320 px).

## admin.css (538 lignes)

Feuille propre à `/admin` (10/11/2026), sans fond animé ni flou pour que les longues tables défilent bien ; couleurs et polices de `tokens.css` :
- variables locales (`--bg`, `--side`, `--card`, `--side-w: 244px`…) ;
- sections : mise en page (menu latéral, tiroir sur téléphone), en-tête de page, grilles (`g21`, `g12`, `g3`, `g4`), cartes, chiffres clés (`kpis`), mini-statistiques, clé/valeur, pastilles et avatars, boutons et champs, alertes et messages (`toast`), tables (en-tête fixe, lignes cliquables), filtres et pagination, graphiques, listes, fiche joueur, page du site, réseau (`p-1` à `p-4`, `net-loss`), connexion, fenêtre de confirmation (`.dlg`) ;
- classes `.h-0` à `.h-100` et `.w-0` à `.w-100` (hauteur des barres, largeur des jauges) à la place du style en ligne ;
- **sans trou** (PR #83, 10/11, « fait en sorte que y a pas de trou dans l'interface ») : les grilles `.g` étirent leurs cartes (`align-items: stretch`), la dernière carte d'une colonne `.side-col` et le dernier bloc d'une carte prennent la place restante, les listes longues défilent dans `.scroll-fill` pour finir à la hauteur de la colonne voisine, les graphiques (`.chart`) remplissent leur carte ; rangées en flex qui se répartissent (`.facts`, `.svc`, `.checks.two`) ; `.editor` (formulaire à gauche, état et aperçu à droite, 400 px) pour la pop-up ; `.zone` et `.form-line` pour les formulaires sur une ligne ;
- adaptations : 1280, 1100, 960, 640, 420 px ; `prefers-reduced-motion`.

## Données touchées

Aucune.

## Liens avec le reste

[[views.js]], [[admin-views.js]], [[account.js]], [[admin.js (page admin)]] ; charte : [[Charte graphique]], [[Voix et ton]].

## Tests

Aucun test automatique ([[Tests du serveur]]) ; l'admin a été vérifiée à la main en 1440 et 390 px ([[Tableau de bord admin]]).

## À savoir avant de modifier

- Après un changement d'`admin.css`, changer `ASSETS` dans [[admin-views.js]]. `account.css` et `tokens.css` sont chargés sans numéro de version.
- Garder `tokens.css` du serveur en accord avec `brand/tokens/` si la charte change.
- La page du [[Cerveau du vault]] a sa propre feuille, décrite dans [[cerveau.css]].
