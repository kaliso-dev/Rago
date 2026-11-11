---
type: référence
tags: [sources]
maj: 2026-11-11
---
# Sources

Où trouver le détail que ce vault résume. Retour à [[Projet]].

## Dans le dépôt
`README.md`, `DEVELOPPEMENT.md`, `licensing/docs/MISE-EN-LIGNE.md` ([[Publier une version]]), `app/docs/CORRECTIONS.md` ([[Catalogue des tweaks]]), `brand/` ([[Charte graphique]]).

## Dossier partagé du projet Claude (`/mnt/project-files/`)
Les fils du projet Claude y ont accès, mais pas ce dépôt. Le dossier est en **lecture seule** et les gros fichiers y restent.

Liste complète au **10/11/2026**, dossier par dossier, plus `rago-route-page/` (11/11) ; les dossiers `admin/`, `cerveau/` et `synapse/` (modifiés le 10/11) et `conseils-jeu/`, `couleurs-resolution/`, `presets-graphiques/` et `souris/` (11/11) n'y sont pas encore décrits. Chaque dossier renvoie à la note qui l'exploite.

| Dossier ou fichier | Ce qu'il contient | Note du vault |
|---|---|---|
| `.notes/` | `inputs.md` (21/10) : ce que Sofiene a envoyé (captures des statistiques Instagram, fichiers d'optimisation du 21/10) et où c'est rangé | [[Documents de la 1.2.0]], [[Vidéos YouTube]] |
| `admin-refonte/` | captures de la refonte du tableau de bord admin (10/11) : vue d'ensemble, ventes, fiche joueur, téléphone ; `v2/` (fiche joueur, services, site et promos, ventes) | [[Tableau de bord admin]] |
| `etude-marche-2026-11/` | `LISEZMOI.txt` et les 7 études de marché du 03/11 (423 Ko) | [[Étude de marché de novembre 2026]] |
| `linkedin/` | posts LinkedIn automatiques de Sofiene (règles, `posts/` du 06 au 08/11) : **arrêté le 10/11** (voir [[Décisions]]) | aucune |
| `marketing/logo-creation-adam/` | vidéo 4K de 10 s du logo dans « La Création d'Adam » (02/11), aperçu, sources | [[Logo création d'Adam]] |
| `marketing/plan-visibilite-gratuite.md` | plan de visibilité du 17/10 : **abandonné le 01/11** (voir [[Décisions]]) | aucune |
| `marketing/videos-milli/` | série de vidéos courtes « Milli » (183 Mo) : **abandonnée le 01/11** (voir [[Décisions]]). Les chiffres utiles sont dans [[Vidéos YouTube]] | aucune |
| `marketing/videos-youtube/` | étude de style (18/10), épisode 001 « Rago tour » en 3 versions, film de lancement 4K (preuve en 720p), sources | [[Vidéos YouTube]] |
| `proxy/` | **ancienne copie** (07/11) des scripts de Rago Route : `rago-route.py` et `install.sh` plus anciens que ceux du dépôt, `mcping.py` identique, `relay.py` (l'ancien proxy simple, retiré des serveurs le 09/11). Le dépôt (`proxy/`) fait foi | [[Infrastructure Rago Route]], [[Proxy]] |
| `rago-route-page/` | `version-gameplay/` : la version actuelle du 11/11 (haut de page sur ordinateur et sur téléphone, planche des animations du fonctionnement) ; à la racine : la version du matin avant ses corrections (vidéo de la page, 1 min 38, et 4 captures) ; `refonte/` : 4 captures de la refonte du 11/11 après-midi, remplacée (celle encore sur `staging`) ; `refonte/analyses/` : les 8 analyses (produit et code, preuves, problèmes des joueurs, ExitLag, autres outils, charte, critique de la page, offre) | [[Page de vente Rago Route]] |
| `rago-route/` | `install.sh` du 08/11, **identique** à `proxy/install.sh` du dépôt au 10/11 | [[Infrastructure Rago Route]] |
| `refonte-glass/` | les 6 documents de la 1.2.0, captures, `installateur-test/`, `optimisations-sources/` (fichiers de Sofiene du 21/10) | [[Documents de la 1.2.0]], [[Version 1.2.0]], [[Refonte glass]] |
| `site/` | `rago-route/` : captures de la page et de la section Rago Route du site (07/11) | [[Site]] |
| `site-1.2/` | captures et aperçu vidéo de la section Nouveautés de la 1.2 (19 et 20/10) | [[Site]] |
| `stripe/` | `ventes-stripe-2026-11-04.md` : copie de la note des ventes du 04/11 | [[Ventes Stripe]] |
| `synthese/` | `SYNTHESE_REPRISE.md` : synthèse de reprise du 15/10 | [[Synthèse de reprise du 15-10]] |
| `uploads/` | fichiers bruts envoyés dans le chat : **non lus**, ils peuvent contenir des données sensibles | aucune |
| `vault/` | `Questions pour Sofiene.md` : vieille copie fixe du 31/10 ; elle renvoie à la page en ligne de [[Questions ouvertes]]. `maj-2026-11-10-point/` : patch du point du 10/11, déjà appliqué au vault | [[Questions ouvertes]] |
| `vault-patchs/` | patch du 10/11 sur les minutes GitHub Actions, déjà appliqué au vault | [[CI GitHub Actions]] |
| `Claude Preview(1) (1).mp4` | 28/10, 6 min 34 s, 1280×822, avec son (93 Mo) : enregistrement d'écran de l'app 1.2 sur le PC d'Abel (onglet Réseau, [[Packet Optimizer]] et ses réglages experts) | [[Version 1.2.0]] |

Supprimés le 10/11 à la demande de Sofiene (q58) :
- `PROJECT_HANDOFF/` : le transfert du 15/10, remplacé par ce vault. Les réglages du projet Claude peuvent encore le citer comme source de contexte.
- `charte-2026/` et `app-2026/` : la charte et les maquettes abandonnées le 04/11.
- les anciens patchs `vault/maj-*`, sauf `maj-2026-11-10-point/`, qui est encore là.

## Ailleurs
- Artefacts GitHub Actions (exe) : expirent après 90 jours ; ceux de la 1.1.10 le 08/01/2027.
- Docs Claude : script YouTube « What's new » ([[Vidéos YouTube]]).
- Artefacts Claude cités par l'étude de marché : rapport « Rago : le marché et la nouvelle app » et fonctions de la dernière maquette ([[Étude de marché de novembre 2026]]).
- Artefact « Charte Rago » : https://claude.ai/artifact/VQJxXTdYLdRmEPawYzBSwt (non relu le 10/11).
- Dossier CapCut « Claude Animation Proxy » du PC Windows « Abel » (connecté au fil Rago Route le 11/11) : les aperçus vidéo faits par ChatGPT des animations de la page Rago Route ; c'est là que Sofiene dépose les clips de gameplay bruts ([[Page de vente Rago Route]]).
