---
type: projet
tags: [projet, design, marque, en-cours]
maj: 2026-11-25
version_app: 1.4.1
---
# New Brand Rago

**Le chantier le plus récent de Rago Optimizer** (Sofiene, 25/11 : « le projet new brand rago en fait partie c'est le plus récent on est en train de refaire le site dessus et l'app avec le nouveau design »). C'est la refonte de toute la marque sur la [[Charte graphique]] v5 « Match day » : l'app Windows, le site, les pages compte, les e-mails, l'admin et le bot Discord. Retour à [[Projet]] et [[État actuel]].

Statut : EN COURS. Rien n'est sorti pour les joueurs, sauf l'admin et les e-mails (voir plus bas).

## Où vit le projet
- **Un projet Claude à part**, nommé « New Brand Rago », dans le compte de Sofiene, à côté du projet « Rago optimizer (suite) ». Ses fils travaillent dans **le même dépôt** `kaliso-dev/rago` et suivent ce vault ([[Règles de travail]]). Ce n'est ni un autre dépôt ni une branche à part : tout arrive dans `staging` par des PR, comme le reste ([[Branches et environnements]]).
- **Son dossier partagé** (hors du dépôt) : `rago-redesign/`. Le vault y renvoie souvent :
  - `rago-redesign/rendus-v5/` : les 135 maquettes v5 (HTML dans `src/`), le kit de marque `marque/` (logo, `tokens/tokens.css` et `tokens.json` v2.0, charte en 10 chapitres `charte-1…5.jpg`, bannières Discord), et les **scripts qui génèrent le CSS de l'app** (`outils/port_mod.py`, `port_tools.py`, `port_pages.py`, `prep_art.py`, `shot-mouse.js`, `outils/marque/`, `gen_tokens.py`) ;
  - `rago-redesign/app-strict/` : captures app contre maquette de chaque étape (`1-…` à `32-…`) ;
  - `rago-redesign/images/` et son `sources.md` : images des 16 jeux et photos des 7 pros, avec leur provenance.
  Ce dossier n'est pas visible depuis le projet « Rago optimizer (suite) » : son contenu exact n'a pas été relu par ce fil (À VÉRIFIER). **Il ne passe pas tout seul sur un nouveau compte Claude** : voir [[Reprendre sur un nouveau compte Claude]].
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

## Où en est chaque brique (25/11)
- **App** : [[Version 1.4.1]] dans `staging`, toutes les pages et fenêtres refaites sur les maquettes. Dernier exe de test : `rago-optimizer-setup-STAGING` du run `app-windows` 45641885291 (25/11, 16 h 17 à Paris). Un seul test Windows (25/11) ; pas publiée.
- **Site** : pages v5 et accueil v6 dans `staging` ; l'accueil du 24/11 attend la PR #136 ; refaire les autres pages en v6 : À VÉRIFIER (rien de décidé au-delà de l'accueil). En prod, le site est encore celui de la 1.3.0 ([[Site]]).
- **Pages compte et bot** : v5 dans `staging`, v1.2 en prod ([[Serveur de licences]], [[Bot communauté Discord]]).
- **Admin, Cerveau, e-mails** : v5 en prod et dans `staging` ([[Tableau de bord admin]], [[Cerveau du vault]]).

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
