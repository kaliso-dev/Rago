---
type: design
tags: [design, marque]
version_app: 1.4.0
maj: 2026-11-28
---
# Charte graphique

**Charte v5 « Match day »**, validée par Sofiene le 22/11/2026 à la fin de la revue des 135 maquettes (artefact « revue des maquettes », version 16). Elle remplace la charte v1.2 du 07/10 et la [[Refonte glass]]. Sofiene, 22/11 : « il faut envoyer ça sur staging donc l'app plus le site entièrement fonctionnel avec ce nouveau design ». Voir [[Voix et ton]].

Source : dossier `rendus-v5/` du dépôt privé `kaliso-dev/rago-design` (ancien `rago-redesign/`, [[New Brand Rago]]) (maquettes, sources HTML `src/`, kit `marque/` : logo, `tokens/tokens.css` et `tokens.json` v2.0, charte `charte-1…5.jpg` en 10 chapitres, bannières Discord). Les noms `--rg-*` de la v1.2 sont gardés quand le rôle est le même.

- **Couleurs** : un seul accent, le rouge `#FF3B30` (`--rg-red-500`) ; survol `#FF5E55`, pressé `#C9221A`. Plus de dégradé rouge (`--rg-red-gradient` = rouge plein). Fonds `--rg-ink-0` `#070708` à `--rg-ink-5` `#2A2A30` ; texte `#F5F5F6` / `#A1A1AA` / `#6E6E78`. Texte posé sur le rouge : `#0A0A0B`. Nouveau papier `--rg-paper` `#ECE9E2`. Succès `#3DDC97` ; « à surveiller » `#FFC53D` (admin seulement) ; plus de bleu d'info (gris). Thème sombre seulement.
- **Typo** : **Barlow Condensed** (titres en 900 italique et capitales, boutons, libellés et chiffres en 800 capitales) et **Barlow** pour les phrases (jamais en italique). Polices embarquées, jamais chargées depuis Google (l'app n'a pas de réseau, le serveur les sert lui-même). Plus de Geist ni de Geist Mono, sauf les étiquettes dessinées sur la toile du [[Cerveau du vault]], gardée telle quelle (Sofiene, 22/11).
- **Formes** : coins arrondis qui grandissent avec l'élément (boutons 12 px, panneaux 22 px) ; **biais** `--rg-skew` -12° derrière les boutons, onglets, étapes, chiffres ; plus de boutons en pilule. Effets d'affiche : trame de points, coup de pinceau rouge sous le dernier mot d'un titre, rayures carbone, ruban papier.
- **Logo (décision du 22/11 au soir)** : le R est **rouge plein partout** ; l'icône (app, `.exe`, `.ico`, favicon, installeur, avatar du bot Discord, barres du site, du compte, de l'admin, des e-mails) est un **R rouge sur une tuile blanche**. Plus de R blanc, de R imprimé, ni de tuile rouge. Sur la transition rouge plein écran de l'app, le R est noir. Lockup : tuile + « RAGO » en Barlow Condensed Black Italic.
- **Icônes** : icônes « imprimées » (formes pleines, couche rouge décalée) pour l'interface, jamais pour le logo.
- Illustrations en cours de refonte : les maquettes gardent les illustrations actuelles, à remplacer ensuite.

## Où la v5 est appliquée (22/11)
- **Serveur de comptes** (`licensing/`) : pages compte, e-mails, admin, Cerveau (cadre seulement) et messages du [[Bot communauté Discord]], sur `staging` par la PR #107 du 22/11 ([[Styles du serveur (CSS)]], [[mailer.js]], [[community.js]]). Jetons : `licensing/public/tokens.css` = `tokens.css` v2.0 du kit, avec les `@font-face` Barlow en tête.
- **Site** (`site/`, `netlify/`) et kit dans `brand/` : PR #109 vers `staging` (22/11) : les 8 pages et le compte à rebours d'après les maquettes 78 à 98, feuille [[v5.css]], polices Barlow servies par le site (Geist retirée), icônes imprimées ([[sync_icons.py]]), favicons et images de partage du kit v5 ; `brand/` reçoit le kit v5 (logo, jetons v2.0, charte en images) et perd la charte HTML v1.2 et `export-logo.js`. Illustrations de Rago Route fixes en attendant leur refonte.
- **App Windows** (`app/`) : sur `staging` par la PR #108 du 22/11, version 1.4.0, jamais testée sur Windows. Polices Barlow embarquées, jetons du kit (`app/src/styles/tokens.css`), charte posée par `v5.css` ; icônes imprimées ; cadre (barre latérale Optimize / Play / Pro, barre du haut) ; réglages en carreaux sur 3 colonnes avec le détail ouvert au clic sur une icône info (25/11, PR #137 ; depuis le 23/11, HTML et CSS exacts des maquettes `app-module-*`, comme le tableau de bord, Jeux et Display : [[Maquettes v5 dans l'app (s5)]]) ; fenêtres ; écran de démarrage (depuis le 24/11, PR #133, celui de la maquette `perso/src/splash.html` : R en tampon, « AGO », bande « optimizer », jauge jusqu'à « Ready », puis transition rouge avec le R noir ; 2,3 s fixes) ; barre en jeu ; icône R rouge sur tuile blanche dans l'exe, la zone de notification et l'installeur ([[App Windows]], [[Styles de l'app (CSS)]], [[Petits composants de l'interface]], [[Splash.tsx]], [[Overlay.tsx]]).
- **En prod (22/11, PR #114)** : admin, cadre du Cerveau et e-mails seulement. Sur la branche de prod, l'admin et le Cerveau lisent `public/tokens-v5.css` (copie des jetons v5) ; `tokens.css` y reste en v1.2 pour les pages compte. À la prochaine sortie de staging vers la prod, `tokens-v5.css` pourra être supprimé.

## Code
Notes de code : [[Kit de marque (brand)]] (README, charte en images, voix, fichiers du logo ; le kit est produit par les scripts de la maquette, hors du dépôt), [[tokens.css (marque)]] (jetons et `tokens.json`), [[v5.css]] (styles du site), [[Styles du serveur (CSS)]] (copie du serveur). Où le site applique la charte : [[Code du site]].

Liens : [[Site]], [[App Windows]], [[Marketing]].
