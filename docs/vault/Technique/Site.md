---
type: technique
tags: [technique, site, marketing]
maj: 2026-10-31
---
# Site (rago-optimizer.com)

Site de vente statique sur **Netlify** (branche de prod). Staging : https://staging--rago-optimiser.netlify.app ; aperçus de PR : `deploy-preview-N--rago-optimiser.netlify.app`. Voir [[Architecture]].

- **Modifier** : `site/src/*.html` puis `python3 site/tools/build.py` (les pages publiées sont générées). Réglages dans l'objet `CONFIG` de `site/src/page.html` (prix, lien Discord `https://discord.gg/cbCxCBx8vJ`, chemins d'achat). CI `site-check.yml`.
- **Pages** : accueil (héros plein écran, « Why », « New in 1.2 » animé, prix, comparatif, FAQ, Partners), page Tweaks (téléchargement gratuit + tous les tweaks expliqués), avis, pages légales, compte (servi par le [[Serveur de licences]]).
- **État au 29/10** : à jour pour la [[Version 1.2.1]] (PR #59, #66) : 218 tweaks, raccourci Alt+X, ping de tous les jeux, cartes Packet Optimizer et Outils, plans de prix réécrits, FAQ « Which games does it work with? ».
- Accroche : « Minecraft PvP optimizer for Windows » + « Every millisecond counts. » ; la section « Why » dit que Rago ne change pas la distance au serveur.
- Netlify edge function `launch-gate` (compte à rebours du lancement, inactive depuis le 10/10).
- En suspens : icône Discord « mixée » aux couleurs Rago (demande du 20/10).

Liens : [[Offres et prix]], [[Charte graphique]], [[Voix et ton]], [[Marketing]], [[Connexion Google et Discord]].
