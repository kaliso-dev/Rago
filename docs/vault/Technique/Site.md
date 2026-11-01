---
type: technique
tags: [technique, site, marketing]
maj: 2026-11-01
---
# Site (rago-optimizer.com)

Site de vente statique sur **Netlify** (branche de prod). Staging : https://staging--rago-optimiser.netlify.app ; aperçus de PR : `deploy-preview-N--rago-optimiser.netlify.app`. Voir [[Architecture]].

- **Modifier** : `site/src/*.html` puis `python3 site/tools/build.py` (les pages publiées sont générées). Réglages dans l'objet `CONFIG` de `site/src/page.html` (prix, lien Discord `https://discord.gg/cbCxCBx8vJ`, chemins d'achat). CI `site-check.yml`.
- **Accueil (`site/src/page.html`), dans l'ordre** : héros plein écran (« Minecraft PvP optimizer for Windows », « Every millisecond counts. ») · **Why** (« The server decides. Your timing decides what it sees. ») · **Features** (« Nearly 220 tweaks. One clear app. ») · **New** (« Now Rago plays with you. » : cartes animées barre en jeu, test réseau, Packet Optimizer, bibliothèque, Outils…) · **How** (« Four steps to your next match. ») · **Reviews** (avis réels, cachés s'il n'y en a pas) · **Plans** (Free, Premium, Lifetime + tableau comparatif) · **FAQ** · **Community** (« Join the Rago Discord. ») · **Partners** (4 serveurs) · **Affiliate** (« Bring 3 players. Get 6 months of Premium. ») · pied de page.
- **Autres pages** : `tweaks.html` (téléchargement gratuit + tous les tweaks expliqués, textes dans `tweaks-copy.json`), `partners.html` (tous les partenaires, `partners.json`), `reviews.html`, pages légales `terms.html`, `privacy.html`, `refunds.html`, `404.html`. Le compte est servi par le [[Serveur de licences]].
- **Partenaires affichés** (`site/src/partners.json`) : Pika Ranked Bedwars, Ranked Bedwars, Ranked Bedwars [SEASON 8], Axora Ranked Bedwars (accueil) ; Ranked Bedwars 2v2s [SEASON 1], Ayor Ranked Bedwars (page Partners). Voir [[Partenaires et créateurs]].
- **Pop-up promo** : réglé dans `/admin` du serveur ([[Promotions et affiliation]]).
- **État au 29/10** : à jour pour la [[Version 1.2.1]] (PR #59, #66) : 218 tweaks, raccourci Alt+X, ping de tous les jeux, cartes Packet Optimizer et Outils, plans de prix réécrits, FAQ « Which games does it work with? ».
- Accroche : « Minecraft PvP optimizer for Windows » + « Every millisecond counts. » ; la section « Why » dit que Rago ne change pas la distance au serveur.
- Netlify edge function `launch-gate` (compte à rebours du lancement, inactive depuis le 10/10).
- Boutons Discord aux couleurs de Rago : faits (Sofiene, 01/11).

Liens : [[Offres et prix]], [[Charte graphique]], [[Voix et ton]], [[Marketing]], [[Connexion Google et Discord]].
