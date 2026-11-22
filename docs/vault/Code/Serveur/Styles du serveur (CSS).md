---
type: code
tags: [code, serveur, css]
fichier: licensing/public/tokens.css, licensing/public/account.css, licensing/public/admin.css
lignes: 227 + 720 + 737
maj: 2026-11-22
---
# Styles du serveur (CSS)

Les trois feuilles de style servies par le serveur de comptes sous `/assets/` : les jetons de la charte v5 « Match day » et les polices (`tokens.css`), le site de compte (`account.css`) et le tableau de bord (`admin.css`). Passées en v5 le 22/11/2026 ([[Charte graphique]]). Fiche parente : [[Code du serveur]].

(code de `staging`, 22/11)

## Rôle et place dans l'ensemble

Servies par `serveStatic` d'[[app.js]] depuis `licensing/public/`. Les pages de [[views.js]] chargent `tokens.css` + `account.css` ; celles d'[[admin-views.js]] chargent `tokens.css` + `admin.css?v=<ASSETS>`. Polices servies par le serveur lui-même (`public/fonts/`), sans appel à Google : Barlow 400, 500, 600, 700 (`Barlow-<poids>.woff2`) et Barlow Condensed 700, 800, 900 droit et 800, 900 italique (`BarlowCondensed-<poids>-<style>.woff2`), tirées du paquet npm `@fontsource` 5.3.0, licence OFL dans `fonts/OFL-Barlow.txt`. Geist et Geist Mono (`fonts/OFL.txt`) ne restent que pour la toile du [[Cerveau du vault]] ([[cerveau.css]]). Les pages chargent `tokens.css?v=5`, `account.css?v=5` et `account.js?v=5` ([[views.js]]) ; l'admin passe par `ASSETS` ([[admin-views.js]]). La **CSP stricte** interdit tout style en ligne : tout passe par des classes.

## tokens.css (227 lignes)

- En tête, les 9 `@font-face` Barlow et Barlow Condensed (`font-display: swap`).
- Puis la copie exacte de `rendus-v5/marque/tokens/tokens.css` (tokens **v2.0 « Match day »** du 22/11) : fonds `--rg-ink-0` à `-5`, texte (`--rg-text-3` `#6E6E78`), lignes, rouge (plus de dégradé : `--rg-red-gradient` = `#FF3B30`), papier `--rg-paper`, états (`--rg-warning` `#FFC53D` et ses fonds `-a06/-a10/-a18`, `--rg-info` gris), effets d'affiche (`--rg-fx-*` : trame, carbone, hachures, voile rouge), polices (`--rg-font-display` Barlow Condensed, `--rg-font-sans` Barlow, `--rg-font-mono` = Barlow Condensed), angles (`--rg-skew` -12°, `--rg-angle-brush` -2,5°…), rayons v5 (`--rg-radius-btn` 12 px, `--rg-radius-panel` 22 px…), hauteurs, ombres (`--rg-shadow-glow`…), mouvement, styles de texte `--rg-t-*` (titre, chiffres, boutons, libellés) ; un bloc de jetons v1.2 (tailles Geist, verre) gardé le temps de la migration.
- Plus de thème clair. Classes utilitaires `.rg-title`, `.rg-kick`, `.rg-label`, `.rg-metric`, `.rg-overline`, `.rg-skew`, `.rg-halftone`, `.rg-carbon`, `.rg-hatch`.

## account.css (720 lignes)

Les règles de base (v1.1, lignes 1 à 467) décrivent la structure ; la **couche v5** ajoutée à la fin (22/11, maquettes 99 à 123 de la revue) change le dessin sans toucher au HTML :
- fond : trame de points qui s'efface depuis le haut à gauche (plus de halos rouges ni d'onde « pulse ») ; bandeau jaune « Test server » sur staging ;
- en-tête : logo `lockup.svg` (R rouge sur tuile blanche + RAGO) et « Account » séparé par un trait, onglets Account / Profile / Affiliate en capitales soulignées de rouge, avatar rouge avec l'initiale, boutons ; pied en ligne (liens à gauche, mentions à droite) ;
- titres `.display` en Barlow Condensed 900 italique capitales (46 à 100 px), le dernier mot posé sur un coup de pinceau rouge (`brush.svg`, mot entouré par [[account.js]] ; pas sur le titre du tableau de bord) ; `.overline` en petites capitales espacées ;
- boutons : capitales Barlow Condensed 800 sur un fond penché (`::before` en `skewX(-12deg)`), rouge avec lueur pour `btn-primary` / `btn-buy`, gris pour `btn-ghost` ; Google / Discord restent droits et en Barlow ; liens soulignés de rouge, `link-arrow` en capitales rouges ;
- pages d'accès : panneau `#111113` aux coins de 22 px, champs de 52 px (bord rouge au focus), code d'inscription en grand, code de connexion de l'app en cases penchées (`.app-code .ch`), étapes Pay / Your account / Download / Activate en onglets penchés (étape en cours rouge, faites cochées en blanc) ;
- tableau de bord `/account` : carte de téléchargement sur toute la largeur (étapes à droite sur fond `#17171A`), puis **deux colonnes** de cartes (licence, PC, abonnement, Rago Route | Discord, affiliation, avis), une seule colonne sous 1000 px ; chaque section empilée (libellé et badge, contenu, actions) ; titres de section en 900 italique, icônes « imprimées » sur carré rouge teinté, clé de licence en Barlow Condensed, badges en capitales, récompenses Discord en lignes grises, anneau d'affiliation avec chiffres italiques ;
- affiliation, profil (avatar rouge, aperçu dans un cadre), avis : mêmes règles ;
- adaptations ajoutées : bouton large qui tient sur un téléphone (560 et 360 px) ; vérifié à 1440 et 390 px (pas de défilement horizontal).
- **retour de Sofiene du 22/11 au soir** (« les icones ne sont pas personnalisé comme je le voulais et les signes validé devrait être rouge ») : icônes « imprimées » de [[views.js]] (`svg.pi`, copie rouge `.pb`, plus foncée sur les boutons rouges) ; tout ce qui est validé est **rouge**, plus vert ni blanc : étapes faites (coche rouge sur carré sombre), messages de succès, places d'affiliation remplies, badges « Active », anneau complet ; correction : l'étape en cours après une étape faite reste bien rouge.

## admin.css (737 lignes)

Feuille propre à `/admin` (10/11/2026), sans fond animé ni flou pour que les longues tables défilent bien ; couleurs et polices de `tokens.css` :
- variables locales (`--bg`, `--side`, `--card`, `--cond`, `--side-w`…) ;
- sections : mise en page (menu latéral, tiroir sur téléphone), en-tête de page, grilles (`g21`, `g12`, `g3`, `g4`), cartes, chiffres clés (`kpis`), mini-statistiques, clé/valeur, pastilles et avatars, boutons et champs, alertes et messages (`toast`), tables (en-tête fixe, lignes cliquables), filtres et pagination, graphiques, listes, fiche joueur, page du site, réseau (`p-1` à `p-4`, `net-loss`), connexion, fenêtre de confirmation (`.dlg`) ;
- classes `.h-0` à `.h-100` et `.w-0` à `.w-100` (hauteur des barres, largeur des jauges) à la place du style en ligne ;
- **sans trou** (PR #83, 10/11) : les grilles `.g` étirent leurs cartes, les listes longues défilent dans `.scroll-fill`, les graphiques remplissent leur carte ; `.editor` pour la pop-up ; `.zone` et `.form-line` pour les formulaires sur une ligne ;
- **couche v5** à la fin (22/11, maquettes 124 à 129) : logo tuile + « RAGO » + étiquette rouge penchée « ADMIN » ; menu en Barlow Condensed 900 italique capitales, icônes rouges, page en cours sur voile rouge avec barre rouge à gauche, compteur d'alertes en carré rouge ; fil d'Ariane en petites capitales ; titre de page en 900 italique (48 à 96 px) suivi d'un point ajouté par CSS (« VUE D'ENSEMBLE. ») ; titres de carte en 900 italique ; chiffres clés et mini-statistiques en grands chiffres italiques ; libellés, pastilles, en-têtes de table, filtres (puces penchées, la choisie en rouge) et boutons (fond penché, `::after`) en capitales 800 ; avatars sans photo sur pastilles blanche, jaune, rouge, bleue, grise ou verte ; barres du graphique rouges, la barre du jour hachurée ; connexion sur trame de points ;
- adaptations : 1280, 1100, 960, 640, 420 px ; `prefers-reduced-motion`.

## Données touchées

Aucune.

## Liens avec le reste

[[views.js]], [[admin-views.js]], [[account.js]], [[admin.js (page admin)]] ; charte : [[Charte graphique]], [[Voix et ton]].

## Tests

Aucun test automatique ([[Tests du serveur]]) ; la v5 a été vérifiée à la main le 22/11 en local (`npm run local`) : captures à 1440 px des pages compte et admin, et à 390 px du tableau de bord du compte.

## À savoir avant de modifier

- Après un changement d'`admin.css` ou de `tokens.css`, changer `ASSETS` dans [[admin-views.js]] (et dans [[brain-views.js]] pour `cerveau.css`). Après un changement d'`account.css`, `account.js` ou `tokens.css`, monter le `?v=` dans `page()` de [[views.js]].
- Garder `tokens.css` du serveur en accord avec `brand/tokens/` si la charte change.
- La page du [[Cerveau du vault]] a sa propre feuille, décrite dans [[cerveau.css]].
