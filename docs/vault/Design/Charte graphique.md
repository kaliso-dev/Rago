---
type: design
tags: [design, marque]
maj: 2026-11-22
---
# Charte graphique

**Charte v5 « Match day »**, validée par Sofiene le 22/11/2026 à la fin de la revue des 135 maquettes (artefact « revue des maquettes », version 16). Elle remplace la charte v1.2 du 07/10 et la [[Refonte glass]]. Sofiene, 22/11 : « il faut envoyer ça sur staging donc l'app plus le site entièrement fonctionnel avec ce nouveau design ». Voir [[Voix et ton]].

Source : dossier partagé `rago-redesign/rendus-v5/` (maquettes, sources HTML `src/`, kit `marque/` : logo, `tokens/tokens.css` et `tokens.json` v2.0, charte `charte-1…5.jpg` en 10 chapitres, bannières Discord). Les noms `--rg-*` de la v1.2 sont gardés quand le rôle est le même.

- **Couleurs** : un seul accent, le rouge `#FF3B30` (`--rg-red-500`) ; survol `#FF5E55`, pressé `#C9221A`. Plus de dégradé rouge (`--rg-red-gradient` = rouge plein). Fonds `--rg-ink-0` `#070708` à `--rg-ink-5` `#2A2A30` ; texte `#F5F5F6` / `#A1A1AA` / `#6E6E78`. Texte posé sur le rouge : `#0A0A0B`. Nouveau papier `--rg-paper` `#ECE9E2`. Succès `#3DDC97` ; « à surveiller » `#FFC53D` (admin seulement) ; plus de bleu d'info (gris). Thème sombre seulement.
- **Typo** : **Barlow Condensed** (titres en 900 italique et capitales, boutons, libellés et chiffres en 800 capitales) et **Barlow** pour les phrases (jamais en italique). Polices embarquées, jamais chargées depuis Google (l'app n'a pas de réseau, le serveur les sert lui-même). Plus de Geist ni de Geist Mono, sauf les étiquettes dessinées sur la toile du [[Cerveau du vault]], gardée telle quelle (Sofiene, 22/11).
- **Formes** : coins arrondis qui grandissent avec l'élément (boutons 12 px, panneaux 22 px) ; **biais** `--rg-skew` -12° derrière les boutons, onglets, étapes, chiffres ; plus de boutons en pilule. Effets d'affiche : trame de points, coup de pinceau rouge sous le dernier mot d'un titre, rayures carbone, ruban papier.
- **Logo (décision du 22/11 au soir)** : le R est **rouge plein partout** ; l'icône (app, `.exe`, `.ico`, favicon, installeur, avatar du bot Discord, barres du site, du compte, de l'admin, des e-mails) est un **R rouge sur une tuile blanche**. Plus de R blanc, de R imprimé, ni de tuile rouge. Sur la transition rouge plein écran de l'app, le R est noir. Lockup : tuile + « RAGO » en Barlow Condensed Black Italic.
- **Icônes** : icônes « imprimées » (formes pleines, couche rouge décalée) pour l'interface, jamais pour le logo.
- Illustrations en cours de refonte : les maquettes gardent les illustrations actuelles, à remplacer ensuite.

## Où la v5 est appliquée (22/11)
- **Serveur de comptes** (`licensing/`) : pages compte, e-mails, admin, Cerveau (cadre seulement) et messages du [[Bot communauté Discord]], sur `staging` par la PR « compte, e-mails et admin en v5 » du 22/11 ([[Styles du serveur (CSS)]], [[mailer.js]], [[community.js]]). Jetons : `licensing/public/tokens.css` = `tokens.css` v2.0 du kit, avec les `@font-face` Barlow en tête.
- **App Windows** (`app/`) et **site** (`site/`, `netlify/`), et copie du kit dans `brand/` : chacun dans son propre fil et sa propre PR vers `staging` (22/11) ; tant qu'ils ne sont pas fusionnés, ces parties gardent la v1.2 et le verre.
- Rien en prod.

## Code
Notes de code : [[Kit de marque (brand)]] (README, charte HTML, voix, fichiers du logo), [[tokens.css (marque)]] (jetons et `tokens.json`), [[export-logo.js]] (rendu des icônes, images de l'installateur et images de partage), [[Styles du serveur (CSS)]] (copie du serveur). Où le site applique la charte : [[Code du site]].

Liens : [[Site]], [[App Windows]], [[Marketing]].
