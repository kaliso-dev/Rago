---
type: design
tags: [design, marque]
version_app: 1.4.0
maj: 2026-11-22
---
# Charte graphique

**Charte v5 « Match day », variante arrondie** (22/11/2026). Sofiene, sur les maquettes : « parfait il faut envoyer ça sur staging donc l'app plus le site entièrement fonctionnel avec ce nouveau design ». Elle remplace la v1.2 et la [[Refonte glass]]. **App** : dans `staging` par la PR #108 (version 1.4.0), jamais testée sur Windows ; la prod garde l'ancien look jusqu'à la sortie. Le site et les pages compte passent en v5 dans un autre fil ([[Site]]). Voir [[Voix et ton]].

Sources : maquettes du dossier partagé `rago-redesign/rendus-v5/` (`src/*.html` et leurs CSS, `marque/` avec les jetons `marque/tokens/tokens.css` et les logos `marque/logo/`, `installeur/fichiers/`, captures `cadre/`, `fenetres/`, `pages/`, `modules/`, `perso/`), plan `rago-redesign/passage-staging.md` et `inventaire-pages.md` ([[Sources]]).

- **Couleurs** : rouge unique `#FF3B30` (`--rg-red-500`) ; fonds `#0A0A0B`, `#111113`, `#17171A`, `#1F1F23` ; papier `#ECE9E2` (rubans clairs, bulles). Texte posé sur le rouge : sombre (`#0A0A0B`). Les jetons gardent les noms `--rg-*`.
- **Typo** : Barlow Condensed 900 italique en capitales pour les titres ; condensé 800 droit pour les boutons, libellés et chiffres de liste ; Barlow pour les phrases. Polices embarquées (licence OFL). Plus de Geist dans l'app.
- **Formes** : fonds penchés (`skewX(-12deg)`) aux coins arrondis ; grand titre de page sur un pinceau rouge avec un écho en contour ; titres de section et de fenêtre sur un **ruban rouge déchiré** ; chiffre en direct dans un **bloc rouge au bord déchiré** ; **jauges à segments** ; rayures carbone ; grain d'impression.
- **Icônes « imprimées »** : formes pleines, une couche rouge décalée derrière, penchées. Flèches, chevrons et croix restent au trait.
- **Logo** (décisions du 22/11) : **R rouge plein partout**. L'icône de l'app est un **R rouge sur une tuile blanche** (exe, barre des tâches, zone de notification, installeur, favicon). Le R est **noir** seulement sur la transition rouge plein écran du démarrage. Logotype : « R » rouge + « AGO » en condensé 900 italique, « optimizer » sur un ruban.
- **App** : cadre (barre latérale Optimize / Play / Pro, barre du haut), tuiles de réglages sur 3 colonnes avec bulle au survol, fenêtres, écran de démarrage, barre en jeu, installeur : voir [[App Windows]] et [[Styles de l'app (CSS)]].
- Texte public de l'app en anglais US, inchangé.

## Code
App : [[Styles de l'app (CSS)]] (`v5.css`), [[Petits composants de l'interface]] (logo, icônes imprimées), [[Splash.tsx]], [[Overlay.tsx]]. Ancien kit de marque v1.2, encore dans le dépôt : [[Kit de marque (brand)]] (README, charte HTML, voix, fichiers du logo), [[tokens.css (marque)]] (jetons et `tokens.json`), [[export-logo.js]] (rendu des icônes, images de l'installateur et images de partage). Où le site applique la charte : [[Code du site]].

Liens : [[Site]], [[App Windows]], [[Marketing]].
