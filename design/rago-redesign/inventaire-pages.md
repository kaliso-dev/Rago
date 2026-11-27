# Rago Optimizer : inventaire complet des écrans à redesigner

Source : dépôt `kaliso-dev/Rago`, branche **`staging`** (commit du 14/11/2026, la plus avancée, avec la 1.3.0).
La branche par défaut (`claude/rago-monorepo-initial-eyj6pq`, 12/11) a moins d'écrans : on part de `staging`.
Hors périmètre ici : Rago Client (client Minecraft), Rago Practice (serveurs), Rago OS. À ajouter si tu veux qu'on les refasse aussi.

Légende : `[ ]` à redesigner · chaque ligne = un écran, un état ou une variante distincte à maquetter.
Total : **≈ 115 écrans / états** répartis en 6 surfaces.

---

## A. App Windows (Tauri + React, `app/src/`) : 52 éléments

### A1. Cadre de l'app (présent partout)
- [x] Splash de démarrage (`components/Splash.tsx`) : v5, `rendus-v5/perso/demarrage.jpg`
- [x] Barre de titre personnalisée, fenêtre sans bordure 1280×820 (`TitleBar.tsx`) : v5, barre du haut (recherche, ping, client du jeu, boutons de fenêtre) sur toutes les maquettes
- [x] Barre latérale : groupes Optimize / Play / Advanced, compteurs, cadenas, badges « Nouveau », carte plan Free, lien Discord, pied « admin / hostname » (`Sidebar.tsx`) : v5, icônes imprimées tout rouge, onglet actif décalé ; présente sur toutes les maquettes (`rendus-v5/src/shell5.js`)
- [x] Carte de mise à jour dans la barre latérale (`UpdateCard.tsx`) : v5 le 22/11, `rendus-v5/cadre/app-mise-a-jour.jpg` + 4 états dans `app-cadre-etats.jpg` (prête, exécution en cours, installation, échec)
- [x] Bandeau de licence en haut de page (`LicenseNotice.tsx`) : v5 le 22/11, `rendus-v5/cadre/app-bandeau-licence.jpg` + 4 cas dans `app-cadre-etats.jpg` (vérification impossible, abonnement terminé, autre PC, licence coupée)
- [x] Barre d'application en bas « Apply N tweaks » (`ApplyBar.tsx`) : v5, en bas des pages modules (`rendus-v5/modules/`), dessin normal comme demandé
- [x] Écran d'erreur de page (`PageBoundary.tsx`) : v5 le 22/11, `rendus-v5/cadre/app-erreur-page.jpg`
- [x] Icône de la zone de notification + menu Ouvrir / Quitter (`src-tauri/src/background.rs`) : v5 le 22/11, `rendus-v5/cadre/app-zone-notification.jpg` (survol, menu, icône 16 / 24 / 32 px sur barre sombre et claire)

### A2. Pages principales
- [x] **Tableau de bord** (`pages/Dashboard.tsx`) : v5, `rendus-v5/app-dashboard-icones-tout-rouge.jpg` (version retenue) et variantes : en-tête, infos PC (CPU, GPU, RAM, OS, réseau), santé (admin, point de restauration, NPI, WMIC), stats en direct (`LiveStatsCard`), presets, presets de jeux, « Mes presets » (vide / liste / renommer / supprimer), carte plan gratuit, carte tweaks retirés
- [x] **Analyse du PC** (`pages/Analysis.tsx`) : écran de départ, analyse en cours, résultats (tout va bien / à changer), avant-après, version Free vs Premium : v5 le 22/11, `rendus-v5/analyse/` (départ, en cours, résultats plan gratuit, avant/après Premium, et « tout va bien » : `app-analyse-tout-va-bien.jpg`)
- [x] **Page module générique** (`pages/ModulePage.tsx`, maquettes générées depuis `catalog.json` par `rendus-v5/modules/src/gen.py`) utilisée par 9 modules, avec sommaire des sections, sélection, lignes de tweak (`TweakRow.tsx` : titre, explication, badge risque, interrupteur, variantes, verrou Premium) :
  - [x] Latence (86 tweaks, 8 sections) : v5 le 22/11, `rendus-v5/modules/app-module-latency.jpg`
  - [x] Carte graphique (30, NVIDIA / AMD / Intel) : v5 le 22/11, `app-module-gpu.jpg`
  - [x] Windows (57, dont Debloat, Apps, Nettoyage) : v5 le 22/11, `app-module-windows.jpg`
  - [x] Hitreg (9) : v5 le 22/11, `app-module-hitreg.jpg`
  - [x] Minecraft (4) + bloc dossier .minecraft / OptiFine / sauvegardes : v5 le 22/11, `app-module-minecraft.jpg`
  - [x] RBW Mod (1) + statut RBW (`RbwStatus.tsx`) : v5 le 22/11, `app-module-rbw.jpg`
  - [x] Mode jeu (1) : v5 le 22/11, `app-module-gamemode.jpg`
  - [x] Mode expert (18) : v5 le 22/11, `app-module-expert.jpg`
  - [x] Restaurer (5) + historique des restaurations : v5 le 22/11, `app-module-restore.jpg` (liste) et `app-module-restore-vide.jpg` (rien d'appliqué : historique vide, compteurs à 0)
- [x] **Réseau** (`pages/Network.tsx`), page à onglets : v5, `rendus-v5/app-network-*.jpg`
  - [x] Onglet Tweaks réseau (24 tweaks, module Réseau embarqué) : `app-network-poster.jpg`
  - [x] Onglet Packet Optimizer (`NetOpt.tsx`) : réglages, analyse auto, état verrouillé Free, encart « honnête », journal
  - [x] Onglet Test réseau (`NetTest.tsx`) : serveurs, graphe ping / pertes / gigue, diagnostic
  - [x] Onglet Rago Route (`RouteTab.tsx`) : démarrer / arrêter, chemins, téléphone, compteurs, état Premium
- [x] **Outils** (`pages/Tools.tsx`) : actions rapides (RAM, DNS, alimentation), outil réseau (`NetTools.tsx`), nettoyage, pilotes, applis au démarrage, raccourcis vers les panneaux Windows (10 tuiles) : v5 le 22/11, `rendus-v5/pages/app-outils.jpg` (+ applis préinstallées et toutes les actions de l'app par module)
- [x] **Bibliothèque de jeux** (`pages/Games.tsx`) : vide, liste, héros du jeu (en cours / pas lancé), lanceurs, ajout manuel, conseils (`GameTips.tsx`), graphismes du jeu (`GameGraphics.tsx`), logos de jeux (`GameLogo.tsx`) : v5, `rendus-v5/app-games.jpg` et variantes
- [x] **Couleurs et résolution** (`pages/Display.tsx`) : couleurs (vibrance, gamma, contraste, luminosité), aperçu en direct, résolution par jeu, réglages des pros, import de fichier : v5, `rendus-v5/app-display.jpg` et variantes
- [x] **Souris** (`pages/Mouse.tsx`) : taux d'interrogation, test double-clic (avec alerte rebond), logiciels souris, sensibilité et conversion entre jeux : v5 le 22/11, `rendus-v5/pages/app-souris.jpg`
- [x] **Paramètres** (`pages/Settings.tsx`) : compte (`ProfileCard`), abonnement (`SubscriptionCard`), sessions (`SessionCard`), arrière-plan et démarrage (`BackgroundCard`), langue, animations, mémoire, dossiers, à propos, licences, déconnexion : v5 le 22/11, `rendus-v5/pages/app-parametres.jpg` (Premium mensuel), `app-parametres-gratuit.jpg` (plan gratuit, pas connecté), `app-parametres-resilie.jpg` (résilié, « Resume subscription »)
- [x] **Partage et support** (`pages/Share.tsx`) : partager un preset, importer un preset (tous les états : ajouté, déjà présent, invalide, verrouillé, redémarrage), rapport de support : v5 le 22/11, `rendus-v5/pages/app-partage.jpg` (page) et `app-partage-etats.jpg` (12 états : ajouté et gardé, rien de nouveau, plan gratuit, pas un code, version plus récente, code abîmé, aucun tweak allumé, copié, rapport en cours, créé, rien coché, échec)

### A3. Fenêtres, modales et superpositions
- [x] Connexion dans l'app (`LicenseGate.tsx`) : se connecter, confirmer le compte, code navigateur (Google / Discord), succès, erreurs : v5 le 22/11, `rendus-v5/fenetres/app-connexion*.jpg` (6 écrans, dont « autre PC »)
- [x] Upsell Premium, 6 variantes : tweak verrouillé, plan, preset, connexion, emplacements gratuits, analyse (`Upsell.tsx`) : v5 le 22/11, `rendus-v5/fenetres/app-premium-*.jpg` (+ paiement ouvert dans le navigateur)
- [x] Confirmation avant d'appliquer, 5 variantes : N tweaks, un seul, annuler, tout annuler, avertissements + point de restauration (`ConfirmDialog.tsx`) : v5 le 22/11, `rendus-v5/fenetres/app-confirmer-*.jpg`
- [x] Écran d'exécution avec console (`RunOverlay.tsx`) : en cours, réussi, échecs, redémarrage requis : v5 le 22/11, `rendus-v5/fenetres/app-execution-*.jpg`
- [x] Éditeur de preset (`PresetEditor.tsx`) : v5 le 22/11, `rendus-v5/fenetres/app-editeur-preset.jpg`
- [x] Palette de recherche (`SearchPalette.tsx`) : v5 le 22/11, `rendus-v5/fenetres/app-recherche.jpg`
- [x] Invitation à laisser un avis (`ReviewPrompt.tsx`) : v5 le 22/11, `rendus-v5/fenetres/app-avis-invitation.jpg`
- [x] Fenêtre d'avis : écrire, modifier, se connecter d'abord (`ReviewDialog.tsx`) : v5 le 22/11, `rendus-v5/fenetres/app-avis-ecrire.jpg`, `app-avis-connexion.jpg`, `app-avis-merci.jpg`
- [x] Résilier l'abonnement (« Before you cancel », `SubscriptionCard.tsx`), résiliation confirmée, et se déconnecter (`Settings.tsx`) : v5 le 22/11, `rendus-v5/fenetres/app-resilier-avant.jpg`, `app-resiliation-confirmee.jpg`, `app-deconnexion.jpg`
- [x] Toast de remise à zéro (`ResetToast.tsx`) : v5 le 22/11, `rendus-v5/fenetres/app-toasts.jpg`
- [x] Modale de base (`Modal.tsx`) et composants communs (`ui.tsx` : boutons, interrupteurs, puces, badges) : v5, base de toutes les fenêtres de `rendus-v5/fenetres/` (styles dans `src/win.css` et `src/rago5.css`)
- [x] **Barre en jeu (overlay)**, fenêtre séparée au-dessus du jeu (`overlay/Overlay.tsx`, `overlay.html`) : stats, conseils compacts : v5 le 22/11, `rendus-v5/cadre/app-barre-en-jeu.jpg` (barre ouverte) et `app-barre-en-jeu-etats.jpg` (pastille, rappel des conseils, plan gratuit, réglage en cours, nettoyage, infobulles)

### A4. Installeur Windows (NSIS)
- [x] Image latérale 164×314 (`installer/sidebar.bmp`) : v5 le 22/11, `rendus-v5/installeur/fichiers/sidebar.bmp` (+ `sidebar@2x.bmp`)
- [x] Bandeau 150×57 (`installer/header.bmp`) : v5 le 22/11, `rendus-v5/installeur/fichiers/header.bmp` (+ `header@2x.bmp`)
- [x] Écran de licence (EULA) et pages de l'installeur : v5 le 22/11, `rendus-v5/installeur/installeur-pages.jpg` (bienvenue, licence, dossier, fin, confirmation et progression de la désinstallation)
- [x] Icône de l'app (.ico 16 → 256) : v5 le 22/11, `rendus-v5/installeur/fichiers/icon.ico` (9 tailles) + `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.png` ; planche `installeur-fichiers.jpg`

---

## B. Site public rago-optimizer.com (`site/src/`, HTML statique) : 22 éléments

Maquettes v5 faites le 22/11/2026, dans `rendus-v5/site/` (sources HTML dans `rendus-v5/src/site-*.html`).

- [x] **Accueil** (`page.html` → `index.html`), section par section : `site-accueil-1/2/3.jpg`
  - [x] Barre de navigation + menu mobile (menu mobile : `site-etats.jpg`)
  - [x] Héros plein écran
  - [x] Why
  - [x] Features (218 tweaks)
  - [x] New (barre en jeu, test réseau, Packet Optimizer, bibliothèque, Outils)
  - [x] Rago Route (`#route`, schéma)
  - [x] How (4 étapes)
  - [x] Reviews
  - [x] Plans : Free / Premium / Lifetime, case Rago Route, tableau comparatif, bandeau « Already Premium? »
  - [x] FAQ
  - [x] Community (Discord)
  - [x] Partners
  - [x] Affiliate
  - [x] Pied de page
  - [x] Pop-up promo, modale de téléchargement (SmartScreen, UAC), feuille d'envoi mobile : `site-etats.jpg`
- [x] **Rago Route** (`route.html`) : `site-rago-route-1/2.jpg`, et sur téléphone avec la barre d'essai (`#dock`) : `site-rago-route-mobile.jpg`
- [x] **Tous les tweaks** (`tweaks.html`) : `site-tweaks-1/2.jpg`
- [x] **Avis** (`reviews.html`) : `site-avis.jpg`, état vide `site-avis-vide.jpg`
- [x] **Partenaires** (`partners.html`) : `site-partenaires.jpg`
- [x] **CGV** (`terms.html`) : `site-conditions-1/2/3.jpg`, avec l'état ouvert depuis le lien Cancellation (`#cancel`)
- [x] **Confidentialité** (`privacy.html`) : `site-confidentialite-1/2/3.jpg`
- [x] **404** (`404.html`) : `site-404.jpg`
- [x] **Compte à rebours de lancement** (`netlify/edge-functions/launch-gate/countdown.js`) : `site-compte-a-rebours.jpg`
- [x] Images de partage 1200 × 630 : `partage/og-image.png`, `partage/og-launch.png`, `partage/og-route.png` (planche : `site-images-de-partage.jpg`). Les deux anciennes affichaient « 199 tweaks », les nouvelles disent 218.

À trancher : `tweaks.html` en ligne dit 68 tweaks gratuits, les maquettes disent 73 (question q75).

---

## C. Espace compte (serveur `licensing/`, account.rago-optimizer.com) : 24 éléments

Maquettes v5 faites le 22/11/2026, dans `rendus-v5/compte/` (sources HTML : `rendus-v5/src/acc-*.html`).
Gabarit commun `page()` dans `licensing/src/views.js` + `public/account.css`.
- [x] Inscription `/signup` (normal, après achat, réclamation de licence) : `compte-inscription-apres-achat.jpg`, normal dans `compte-connexion-planche.jpg`
- [x] Vérification du code `/signup/verify` : `compte-connexion-planche.jpg`
- [x] Connexion `/login` (+ Google / Discord `/auth/:provider`) : `compte-connexion-planche.jpg`
- [x] Mot de passe oublié `/forgot` (formulaire / envoyé) : `compte-connexion-planche.jpg`
- [x] Nouveau mot de passe `/reset/:token` : `compte-connexion-planche.jpg`
- [x] Changer / définir un mot de passe `/account/password` : `compte-connexion-planche.jpg`
- [x] Lier l'app « Sign in to the app? » `/app/link/:id` : `compte-connexion-planche.jpg`
- [x] **Tableau de bord du compte** `/account` : `compte-tableau-premium.jpg`, `compte-tableau-free.jpg`, et 18 états dans `compte-tableau-etats-1/2.jpg` (essai, annulé, terminé, Lifetime, récompenses, cadeau, remboursé, PC, Rago Route, Discord, avis, sans mot de passe)
- [x] Profil (photo et nom) `/account/profile`, avec écran de bienvenue : `compte-profil-avis-planche.jpg`, bienvenue dans `compte-connexion-planche.jpg`
- [x] Avis `/account/review` (Premium et Free) : `compte-profil-avis-planche.jpg`
- [x] Affiliation `/affiliate` (rejoindre / suivi) : `compte-affiliation-rejoindre.jpg`, `compte-affiliation.jpg`
- [x] Pages de message (gabarit `messagePage`), les 13 variantes : `compte-messages.jpg`, et en grand `compte-message-paiement-en-cours.jpg`. « Paiement confirmé » est l'inscription après achat.
- [x] Page des formules `/plans` et passages `/buy`, `/buy/lifetime`, `/buy/route`, `/checkout/success`, `/claim/:token`, `/download` : `/plans` est une API (pas d'écran) ; `/buy*` ouvrent le paiement Stripe, hébergé par Stripe, qui se règle dans Stripe (couleur, icône) ; les cas d'erreur de ces routes sont dans les pages de message. Rien à dessiner chez nous ; pour la page Stripe (Réglages, Image de marque) : icône `marque/logo/png/rago-tile-512.png`, logo `png/rago-wordmark-white-1200.png`, couleur de marque #0A0A0B, accent #FF3B30, coins arrondis.

## D. Emails (Resend, `licensing/src/mailer.js`) : 5 éléments

Maquettes v5 dans `rendus-v5/emails/` : `emails-1/2.jpg` et la nouvelle image d'en-tête `email-header.png` (1200 × 240).
- [x] Gabarit commun (`layout()` + `email-wordmark.png` → `email-header.png`)
- [x] Licence Premium / essai gratuit démarré (les deux variantes)
- [x] Code d'inscription
- [x] Abonnement annulé
- [x] Réinitialisation du mot de passe

## E. Admin interne `/admin` (français) : 12 éléments
Maquettes v5 du lot 6 (22/11/2026) dans `rendus-v5/admin/`, générateur `rendus-v5/outils/gen_admin.py`. Chiffres, e-mails et villes = exemples. Toutes les icônes sont imprimées comme dans l'app (`rendus-v5/outils/print_admin.py`) ; seuls flèches, chevrons et croix restent au trait.
- [x] Connexion admin (`admin-connexion.jpg`, mauvaise clé : `admin-connexion-erreur.jpg`)
- [x] Accueil, « Vue d'ensemble » (`admin-vue-d-ensemble-1.jpg`, `-2.jpg`)
- [x] Ventes (`admin-ventes-1.jpg`, `-2.jpg`)
- [x] Joueurs, liste (`admin-joueurs.jpg`)
- [x] Fiche joueur (`admin-fiche-joueur-1.jpg`, `-2.jpg`)
- [x] Offrir et achats (`admin-offrir-et-achats.jpg`)
- [x] Site et promos : pop-up, codes promo, avis (`admin-site-et-promos.jpg`)
- [x] Tests réseau (`admin-tests-reseau.jpg`)
- [x] Services (`admin-services-1.jpg`, `-2.jpg`)
- [x] Journal (`admin-journal.jpg`)
- [x] Introuvable (`admin-introuvable.jpg`)
- [x] **Cerveau du vault** (`/admin/cerveau`) : graphe, explorateur et lecteur ouvert (`admin-cerveau.jpg`). La toile est celle du vrai Cerveau, inchangée (demande de Sofiene du 22/11) : capturée en lançant `licensing/public/cerveau.js` sur le vault de staging (outils : `rendus-v5/outils/cerveau-toile/`)
- [x] En plus : planche des états (confirmation, messages, lien affiché une fois, serveur de test, banni, Stripe muet, listes vides, service en panne) (`admin-etats.jpg`)
- Remarque : plusieurs types d'événements n'ont pas de libellé français dans le journal (`affiliate.*`, `referral.created`, `route.*`, `discord.*`, `license.subscription_stopped`, `review.*`…) et s'affichent bruts ; les maquettes n'utilisent que des événements déjà traduits.

## F. Marque et hors produit
- [x] Logo, symbole R, wordmark, favicons, tuiles : v5 le 22/11, `rendus-v5/marque/logo/` (mêmes noms de fichiers que `brand/logo/` : R plein et R imprimé, icône d'app sombre et rouge, lockups R + AGO, tuile + RAGO et nom complet, texte vectorisé en Barlow Condensed ; PNG 16 → 1024, avatar 512, `rago.ico`, favicons, apple-touch, images de partage, fichiers de l'installeur). Planche : `marque/charte-2.jpg`
- [x] Charte et tokens : v5 le 22/11, `rendus-v5/marque/charte-1…5.jpg` (10 chapitres, en français) et `marque/tokens/tokens.css` + `tokens.json` (v2.0 : mêmes noms `--rg-*` que le dépôt, valeurs v5, nouveaux tokens papier, biais, rayons, styles de texte ; anciens tokens Geist et verre gardés à part le temps de la migration)
- [x] Messages du bot Discord : proposition v5 le 22/11, `rendus-v5/marque/discord-messages.jpg` (bienvenue, VIP / MVP, /invites, /top-invites : même texte dans un embed rouge, bannières fixes `marque/discord/*.png`, boutons de lien). Demande une modification de `community.js` le jour où tu la valides

---

### À savoir
- Une charte « Affiche » v2.2 (Bricolage Grotesque + Instrument Sans + IBM Plex Mono, fond asphalte chaud) a déjà été essayée en brouillon sur la page d'accueil (PR #69), jamais adoptée.
- Textes publics en anglais US ; l'app existe aussi en français.
- Le dernier commit sur `staging` (14/11) a retiré la police à chasse fixe du site et du compte : tout est en Geist.
