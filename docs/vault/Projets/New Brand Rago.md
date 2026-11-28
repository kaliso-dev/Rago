---
type: projet
tags: [projet, design, marque, en-cours]
maj: 2026-11-28
version_app: 1.4.1
---
# New Brand Rago

**Le chantier le plus récent de Rago Optimizer** (Sofiene, 25/11 : « le projet new brand rago en fait partie c'est le plus récent on est en train de refaire le site dessus et l'app avec le nouveau design »). C'est la refonte de toute la marque sur la [[Charte graphique]] v5 « Match day » : l'app Windows, le site, les pages compte, les e-mails, l'admin et le bot Discord. Retour à [[Projet]] et [[État actuel]].

Statut : EN COURS. Rien n'est sorti pour les joueurs, sauf l'admin et les e-mails (voir plus bas).

## Où vit le projet
- **Un projet Claude à part**, nommé « New Brand Rago », dans le compte de Sofiene, à côté du projet « Rago optimizer (suite) ». Ses fils travaillent dans **le même dépôt** `kaliso-dev/rago` et suivent ce vault ([[Règles de travail]]). Ce n'est ni un autre dépôt ni une branche à part : tout arrive dans `staging` par des PR, comme le reste ([[Branches et environnements]]).
- **Son dossier `rago-redesign/`**, sauvegardé en entier sur GitHub dans le **dépôt privé [`kaliso-dev/rago-design`](https://github.com/kaliso-dev/rago-design)** (racine du dépôt = ancien dossier `rago-redesign/`, même arborescence, plus un `README.md` qui dit comment relancer les scripts). Historique : copié le 27/11 dans `design/rago-redesign/` du dépôt `rago` (PR #156, Sofiene : « oui bien sur sauvegarde tout sur le github »), puis sorti de `rago` le 28/11 vers ce dépôt privé, car l'archive de `staging` dépassait la limite de 120 Mo du [[Cerveau du vault]] (décision du 27/11, [[Décisions]]). Les chemins `rago-redesign/…` cités dans le vault se lisent donc comme des chemins du dépôt `kaliso-dev/rago-design`. Le vault y renvoie souvent :
  - `rago-redesign/rendus-v5/` : les 135 maquettes v5 (HTML dans `src/`), le kit de marque `marque/` (logo, `tokens/tokens.css` et `tokens.json` v2.0, charte en 10 chapitres `charte-1…5.jpg`, bannières Discord), et les **scripts qui génèrent le CSS de l'app** (`outils/port_mod.py`, `port_tools.py`, `port_pages.py`, `prep_art.py`, `shot-mouse.js`, `outils/marque/`, `gen_tokens.py`) ;
  - `rago-redesign/app-strict/` : captures app contre maquette de chaque étape (`1-…` à `32-…`) ;
  - `rago-redesign/images/` et son `sources.md` : images des 16 jeux et photos des 7 pros, avec leur provenance.
  Contenu vérifié le 28/11 dans `kaliso-dev/rago-design` (identique, fichier par fichier, à `design/rago-redesign/` de `staging` au commit `05a8be9`) : 1 154 fichiers, 246 923 143 octets (238 Mo) (`rendus-v5/` 143 Mo, `images/` 27 Mo, `app-strict/` 13 Mo, `rendus-v1` à `v4`, `inspirations/`, `charte/`, `logo-actuel/`, planches 1 à 10), aucun fichier de plus de 50 Mo, aucun secret ; `.DS_Store` et `__pycache__` exclus. `rendus-v5/src/` contient 142 fichiers HTML. Une copie reste sur le Mac de Sofiene (« Rago data », sur le Bureau). **Droits** : `images/` (visuels des jeux et photos de pros) et `inspirations/` (planches d'autres studios) appartiennent à leurs auteurs, voir leurs `sources.md`. Voir aussi [[Reprendre sur un nouveau compte Claude]].
- **Avant le projet** : le fil « Capturer toutes les pages pour la refonte » de « Rago optimizer (suite) » (14 au 21/11) a capturé chaque page et chaque état (site, compte, e-mails, admin, Cerveau, app) sur `staging` au commit `907c95e`, avec les inventaires et `constats-design.md` (381 défauts). Tout est dans `refonte-design/` du dossier de « Rago optimizer (suite) » ([[Sources]]), qui reste sur l'ancien compte : Sofiene ne l'emporte pas, la référence du design est désormais New Brand Rago (25/11). Le conseil donné le 21/11 : partir du code et du vault plutôt que de Figma (Sofiene : « je n'ai pas vraiment besoin de figma »).

## Les étapes
| Date | Étape | Statut |
|---|---|---|
| 22/11 | Revue des 135 maquettes (artefact « revue des maquettes », version 16) et **charte v5 validée** : « il faut envoyer ça sur staging donc l'app plus le site entièrement fonctionnel avec ce nouveau design » ; logo : R rouge plein, icône = R rouge sur tuile blanche | DÉCIDÉ ([[Décisions]]) |
| 22/11 | Serveur de comptes en v5 : pages compte, e-mails, admin, cadre du Cerveau, messages du bot (PR #107, #111, #118) | CONFIRMÉ (git), dans `staging` |
| 22/11 | **Admin, cadre du Cerveau et e-mails v5 en prod** (PR #114 et #117, « tu peux push sur la prod pour l'interface admin et les mails ») | CONFIRMÉ (git) ; seule partie en prod |
| 22/11 | Site v5 : 8 pages et compte à rebours, kit `brand/` (PR #109, #110, #112, #113, #116) | CONFIRMÉ (git), dans `staging` |
| 22/11 | App 1.4.0 : charte v5 posée sur l'ancienne interface (PR #108) | dans `staging`, remplacée le 23/11 |
| 23/11 | Sofiene : l'app « n'est pas conforme au design », à refaire « strictement » au pixel près ; l'app reprend le HTML et le CSS des maquettes page par page ([[Maquettes v5 dans l'app (s5)]]), version **1.4.1** (PR #119 à #133) | CONFIRMÉ (git), dans `staging` |
| 23/11 | Site v6 : accueil refait sur la structure et les animations de partner.clleancode.com (PR #129, #135) | CONFIRMÉ (git), dans `staging` |
| 24/11 | Accueil v6 suite : globe dessiné en SVG, toute la démo Rago Route dans une section (PR #136) | **PR ouverte**, aperçu Netlify `deploy-preview-136--rago-optimiser.netlify.app` |
| 25/11 | Détail des réglages au clic sur une icône info, grilles sans vide (PR #137) ; premier test Windows de Sofiene et ses retours corrigés (PR #139) | CONFIRMÉ (git), dans `staging` |

| 28/11 | Site v7 « fonctionnel » (premier jet, voir plus bas) : PR #176 en brouillon, partie de la #136 | **PR brouillon**, à comparer avec la #136 ; rien de décidé |
## Où en est chaque brique (25/11)
- **App** : [[Version 1.4.1]] dans `staging`, toutes les pages et fenêtres refaites sur les maquettes. Dernier exe de test : `rago-optimizer-setup-STAGING` du run `app-windows` 45641885291 (25/11, 16 h 17 à Paris). Un seul test Windows (25/11) ; pas publiée.
- **Site** : pages v5 et accueil v6 dans `staging` ; l'accueil du 24/11 attend la PR #136 ; refaire les autres pages en v6 : À VÉRIFIER (rien de décidé au-delà de l'accueil). En prod, le site est encore celui de la 1.3.0 ([[Site]]).
- **Pages compte et bot** : v5 dans `staging`, v1.2 en prod ([[Serveur de licences]], [[Bot communauté Discord]]).
- **Admin, Cerveau, e-mails** : v5 en prod et dans `staging` ([[Tableau de bord admin]], [[Cerveau du vault]]).


## Premier jet v7 « fonctionnel » (28/11, note de travail)
Demande de Sofiene (28/11) : l'ancien site ressemblait à n'importe quel SaaS, et le nouveau est « trop trop décoratif et pas assez fonctionnel », avec une information qui ne passe que par des cartes. Il faut des sections plus classiques et épurées, moins d'animations, en gardant la charte v5. Rien n'est décidé tant que Sofiene n'a pas validé.
- **PR #176** (brouillon, vers `staging`, branche `claude/rago-site-functional-clean-ug9dj8`, partie de la tête de la #136 `acecac5`). La #136 reste intacte pour comparer. Aperçu Netlify : `deploy-preview-176--rago-optimiser.netlify.app` (construit le 28/11, CONFIRMÉ par le statut Netlify de la PR).
- **Gardé exactement** (consigne de Sofiene) : l'animation du R qui se dessine et se remplit ; le globe dessiné avec les flux vers Frankfurt et Paris ; le bloc « Four steps / Your next match / starts here. », avec toute son animation au défilement (précision de Sofiene du 28/11). Ce bloc est déplacé en fin de page et remplace la bannière « Tune your PC once ».
- **Retiré** : le chargement (dix jaquettes), la roue « Every hit takes a trip », le paquet de cartes « Why your hits don't register », les bandeaux qui défilent, les pastilles du titre « What's new » et la bande des lanceurs, l'épinglage de la liste des jeux, l'arc de la communauté, la bulle qui suit la souris, le défilement lissé à la molette et la barre de défilement maison. Ce dernier point passe par le mode `data-calm` de [[v5.js]].
- **Nouveaux formats** :
  - liste à icônes « What Rago does » ;
  - les 10 sections de l'app en lignes, par le CSS seulement ([[sync_app.py]] n'a pas changé) ;
  - blocs texte + écran de l'app alternés (les écrans dessinés de la v5) ;
  - tableau Gratuit / Premium ouvert ;
  - jeux en étiquettes.
  Nouvel ordre : héros, ce que fait Rago, délai du coup, réglages, dans l'app, barre en jeu, tarifs, comparatif, Rago Route, jeux et chiffres, avis, communauté, FAQ, bloc final.
- **Inchangées** : la page Rago Route, la page Tweaks, les avis, les partenaires et les pages légales, déjà en mise en page v5 classique sans les animations v6.
- **Barre en jeu** : remise exactement comme dans la #136, sur demande de Sofiene (28/11) : le gameplay prend tout l'écran, puis l'explication arrive au défilement, avec les mêmes animations. La vidéo sera remplacée par un extrait Valorant de 3 à 4 s, préparé par un fil sur le Mac de Sofiene, qui le poussera dans la branche de la #176.
- **`staging` fusionnée dans la branche de la #176** (28/11, avec la PR #174) : 68 réglages gratuits, étoiles Google, retrait de `launch-gate`. `sync_app.py` et `build.py` ont été relancés.
- **Benchmark provisoire** (28/11) : dans « Measured, not promised. », un tableau avant / avec Rago (Minecraft PvP, Bedwars) : FPS moyen 312 → 326, 1 % bas 141 → 158, pics de temps d'image 38 → 21 par minute, latence clic-écran 17,8 → 16,4 ms, gigue du ping 4,6 → 3,1 ms, ping moyen 24 ms inchangé. **Chiffres inventés** à la demande de Sofiene, marqués dans le code (commentaire « CHIFFRES PROVISOIRES », `data-placeholder="benchmark"`) et sur la page (« Example figures for now »). **À remplacer par de vraies mesures avant la mise en prod du site.**
- **Curseur de souris Rago sur tout le site** (28/11) : dans [[v5.css]] (toutes les pages de `site/`) et, depuis q139 (« oui »), dans `licensing/public/account.css` (connexion, inscription, compte, achat, pages d'erreur ; `account.css?v=8`). Flèche rouge au contour encre ; sur ce qui se clique, la même flèche couleur papier avec une couche rouge décalée. Souris seulement ; les champs de texte gardent le curseur texte.
- **Mobile** (28/11) : sous 768 px, la scène de la barre en jeu n'est plus une réduction de la version ordinateur : la vidéo prend toute la largeur, puis la barre de l'app s'affiche dessous à sa taille réelle. Les boutons de fin de la page Rago Route passent à la ligne.
- **Retours de Sofiene du 28/11, appliqués dans la #176** (un commit chacun) :
  - **Extrait Valorant** derrière la barre en jeu (`media/in-game-bar.*`, poussé par le fil du Mac) ; la barre dit « Valorant ».
  - **Héros pleine hauteur** : sur ordinateur, le héros et la bande des partenaires font exactement la hauteur de la fenêtre.
  - **Proportions du MacBook Pro 16 pouces** : toutes les tailles en px du site s'écrivent `calc(N * var(--u))`. `--u` est définie dans [[v5.css]] : 1px sous 768 px (vraie version mobile) ; sur ordinateur, la taille d'un pixel de l'écran de référence 1728×1117 rapportée à la fenêtre (plus petit rapport entre largeur et hauteur, jamais sous 0,78). À 1728×1117 rien ne change. Pas de `zoom` CSS (il fausse `vh` et les sections animées). **Tout nouveau CSS du site doit utiliser `calc(N * var(--u))`** au lieu de px, sauf les traits de 1 ou 2 px et les valeurs en unités d'un dessin SVG (par exemple le `transform-origin:200px 200px` des cercles de l'anneau du bloc final : converti par erreur, il décentrait le disque hors 1728×1117, corrigé le 28/11).
  - **Tarifs** : carte Premium plus large et surélevée, pastille « 3 days free » (nombre de jours tiré de `CONFIG.trialDays`), coches et cadenas dessinés, rassurance à côté du titre.
  - **FAQ** : « + » du bouton « More answers » dessiné en deux traits et centré au pixel.
  - **Rago Route** : le R se dessine, se remplit, puis va directement à sa place au début du titre ; plus de carrés ni de « RAGO ROUTE » entre les deux.
- **2e tour de retours de Sofiene (28/11), dans la #176** :
  - « The right tweaks for every game. » sans le paragraphe de droite (« ce texte ne sert plus à rien »).
  - Benchmark sur toute la largeur du site.
  - Bloc final « Four steps / Your next match / starts here » réparé (même animation que la #136, vérifiée image par image à 1440×820, 1728×990, 1728×1117 et 1920×960).
  - Tarifs : plus de petits points ; Premium seule carte en couleur (Gratuit en sombre), 40 % plus large et plus haute, halo ; pastille « 3 days free » en étiquette papier inclinée sur une ligne ; mot « ONCE » retiré de Lifetime.
  - Vidéo : Sofiene cherche un extrait Valorant en 4K ; on n'y touche pas en attendant.
- **3e tour de retours de Sofiene (28/11), dans la #176** :
  - Le titre « The right tweaks for every game. » devient la bannière qui défile de la #136, reprise de son historique (même code, même vitesse, accélère avec le défilement).
  - Prix : sur ordinateur, toute la section est réduite d'un seul facteur (0,74), mêmes proportions entre les plans ; titre et cartes : 988 px de haut à 1728×1117 (1 485 avant).
  - Vidéo Valorant 4K toujours attendue (Sofiene cherche la source).
- **4e tour (28/11), dans la #176** : réticule retiré du bloc final (le reste de l'animation inchangé) ; Community : carte Discord plus complète (support, annonces et notes de mise à jour, récompenses Discord, giveaways et rôle Premium, joueurs qui partagent presets et astuces ; aucun chiffre), icônes Discord et affiliation en haut à droite, logos des partenaires en grand à la place de la pilule noire (rayons imbriqués). Vidéo Valorant 4K : préparée par un fil sur le Mac, à récupérer par `git pull` au signal du chef.

## Ce qui reste
1. Sofiene teste l'exe de test sur Windows et répond à q121 (barre en jeu) ([[Questions ouvertes]]).
2. Relire puis fusionner la PR #136 (accueil v6), et répondre à q118 à q120.
3. Les illustrations sont encore celles d'avant (« en cours de refonte », [[Charte graphique]]).
4. Droits d'utilisation des images des 16 jeux et des photos des 7 pros à vérifier avant la prod ([[Couleurs et résolution]]).
5. La sortie : quand Sofiene valide, `staging` part en prod en une fois (app 1.4.x, site, pages compte, bot), comme la 1.3.0 ([[Publier une version]]). Rien n'est daté.

## Branches du chantier
| Branche | Brique | PR |
|---|---|---|
| `claude/project-thread-y7dmrv` | serveur de comptes (compte, e-mails, admin, Cerveau) | #107, #111, #114, #115, #117, #118 |
| `claude/project-thread-7emsbt` | site v5 puis v6 | #109, #110, #112, #113, #116, #129, #135, #136 (ouverte) |
| `claude/project-thread-2btl2s` | app (1.4.0, puis retours du 25/11) | #108, #137 à #141 |
| `claude/app-v5-*` (`strict`, `games`, `display`, `modules`, `network`, `tools`, `mouse`, `settings`, `share`, `analysis`, `windows`, `windows-b`, `ingame`, `splash`) | app à l'identique des maquettes | #119 à #128, #130 à #133 |

Détail de chaque PR : [[Pull requests]]. Décisions du chantier (22 au 25/11) : [[Décisions]]. Journal : [[Journal]].
