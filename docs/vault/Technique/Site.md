---
type: technique
tags: [technique, site, marketing]
maj: 2026-11-07
---
# Site (rago-optimizer.com)

Site de vente statique sur **Netlify** (branche de prod). Staging : https://staging--rago-optimiser.netlify.app ; aperçus de PR : `deploy-preview-N--rago-optimiser.netlify.app`. Voir [[Architecture]].

- **Modifier** : `site/src/*.html` puis `python3 site/tools/build.py` (les pages publiées sont générées). Réglages dans l'objet `CONFIG` de `site/src/page.html` (prix, lien Discord `https://discord.gg/cbCxCBx8vJ`, chemins d'achat). CI `site-check.yml`.
- **Accueil (`site/src/page.html`), dans l'ordre** : héros plein écran (« Minecraft PvP optimizer for Windows », « Every millisecond counts. ») · **Why** (« The server decides. Your timing decides what it sees. ») · **Features** (« Nearly 220 tweaks. One clear app. ») · **New** (« Now Rago plays with you. » : cartes animées barre en jeu, test réseau, Packet Optimizer, bibliothèque, Outils…) · **Rago Route** (`#route`, ajoutée le 07/11, pas encore en ligne : « Your PC is tuned. Now Rago takes the road. », schéma animé des deux routes, bouton « Discover Rago Route » vers `route.html`) · **How** (« Four steps to your next match. ») · **Reviews** (avis réels, cachés s'il n'y en a pas) · **Plans** (Free, Premium, Lifetime + tableau comparatif) · **FAQ** · **Community** (« Join the Rago Discord. ») · **Partners** (4 serveurs) · **Affiliate** (« Bring 3 players. Get 6 months of Premium. ») · pied de page.
- **Page Rago Route** (`site/src/route.html` → `route.html`, écrite le 07/11, sur la branche `claude/project-thread-iesde9`, **pas encore poussée** : Sofiene doit dire « push ») : présente le [[Proxy]] « Rago Route » comme une nouveauté en test. Héros « Two roads for every packet. » ; problèmes concrets (pics, gel après une perte, Wi-Fi qui coupe, détour du fournisseur) et le chiffre réel 34/88 du [[Test réseau]] ; cinq fonctionnalités animées (double trajet, réparation immédiate, session gardée, téléphone en secours « Testing now », meilleure route « Coming with the app ») avec les seuls chiffres mesurés (2 246 paquets sauvés sur Hypixel, 20 Mo intacts à 20 % de pertes, coupure de 8 s sans perte) ; fair-play (pas de faux ping ni lag switch) ; FAQ ; étapes ; bouton Discord (pas de prix tant que q51 n'est pas tranchée). Lien « Rago Route » dans le menu (barre du haut à partir de 1 280 px de large), le menu mobile et le pied de page ; dans `build.py`, `site-check.yml` et `sitemap.xml`.
- **Autres pages** : `tweaks.html` (téléchargement gratuit + tous les tweaks expliqués, textes dans `tweaks-copy.json`), `partners.html` (tous les partenaires, `partners.json`), `reviews.html`, pages légales `terms.html`, `privacy.html`, `refunds.html`, `404.html`. Le compte est servi par le [[Serveur de licences]].
- **Partenaires affichés** (`site/src/partners.json`) : Pika Ranked Bedwars, Ranked Bedwars, Ranked Bedwars [SEASON 8], Axora Ranked Bedwars (accueil) ; Ranked Bedwars 2v2s [SEASON 1], Ayor Ranked Bedwars (page Partners). Voir [[Partenaires et créateurs]].
- **Pop-up promo** : réglé dans `/admin` du serveur ([[Promotions et affiliation]]).
- **État au 29/10** : à jour pour la [[Version 1.2.1]] (PR #59, #66) : 218 tweaks, raccourci Alt+X, ping de tous les jeux, cartes Packet Optimizer et Outils, plans de prix réécrits, FAQ « Which games does it work with? ».
- Accroche : « Minecraft PvP optimizer for Windows » + « Every millisecond counts. » ; la section « Why » dit que Rago ne change pas la distance au serveur.
- Netlify edge function `launch-gate` (compte à rebours du lancement, inactive depuis le 10/10).
- Boutons Discord aux couleurs de Rago : faits (Sofiene, 01/11).

Liens : [[Offres et prix]], [[Charte graphique]], [[Voix et ton]], [[Marketing]], [[Connexion Google et Discord]].
