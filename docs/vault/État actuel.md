---
type: pilotage
tags: [état, pilotage]
maj: 2026-11-08
---
# État actuel (07/11/2026)

Voir aussi [[Prochaines étapes]], [[Questions ouvertes]], [[Journal]]. Retour à [[Projet]].

## En une phrase
La [[Version 1.2.1]] (refonte en verre, barre en jeu, Packet Optimizer, bibliothèque, mises à jour automatiques) est **construite, signée et fusionnée dans `staging`** ; le serveur et le site de prod sont prêts pour elle depuis le 29/10. Sofiene a **déposé l'exe et son `.sig` dans Supabase** (confirmé par lui le 31/10) : la 1.2.1 est en ligne.

## Tableau
| Sujet | État | Statut |
|---|---|---|
| Dernière version de l'app | [[Version 1.2.1]] (`staging` @ `fc3de16`, PR #65) | CONFIRMÉ (git) |
| Version servie aux joueurs | **1.2.1** (exe + `.sig` déposés dans Supabase) | OBSERVÉ (Sofiene, 31/10) ; `INSTALLER_VERSION` non revérifié |
| Code app sur la branche de prod | encore **1.1.14** (`app/package.json`) : la prod ne reçoit que site + serveur, l'app part de `staging` | CONFIRMÉ |
| Serveur de prod | mises à jour auto (RAG-24) + collecte des tests réseau (RAG-50), PR #63 fusionnée le 29/10 | CONFIRMÉ (git) ; déploiement Railway À VÉRIFIER |
| Site de prod | à jour pour la 1.2.1 : section « New in 1.2 », Discord, prix réécrits, 218 tweaks (PR #59 et #66, 29/10) | CONFIRMÉ (git) |
| Connexion Google / Discord + code email | en ligne (PR #61, 28/10) | OBSERVÉ (fil) |
| Offre Lifetime | **59,99 $** (Sofiene, 31/10 : « c'est normal »), vendue seulement si le prix Stripe correspond | DÉCIDÉ / CONFIRMÉ (`site/src/page.html`) |
| Ventes (Stripe, 04/11) | 611,02 $ payés depuis le 10/10 (505,08 € reçus après frais) ; 33 abonnés actifs (23 mensuels, 10 annuels) dont 8 mensuels résiliés en fin de période ; 5 Lifetime ; aucun essai ; premiers renouvellements le 10/11 ([[Ventes Stripe]]) | CONFIRMÉ (Stripe) |
| Page Rago Route du site | `route.html` + section sur l'accueil, **sur `staging` depuis le 07/11** (commit `11702b4`), pas en prod ([[Site]]) | CONFIRMÉ (git) |
| [[Proxy]] | 2 serveurs Vultr (Paris = sortie, Frankfurt = relais, 5 $/mois chacun) ; prototype Rago Route (tunnel anti-lag) testé en partie depuis le Mac de Sofiene : au même moment, médiane 116 ms par le tunnel contre 119 ms en direct (version du 07/11, installée sur les deux serveurs et le Mac) ; tests sur le Mac du 07/11 : câble, 4G de l'iPhone (`--telephone`), coupure du Wi-Fi (la partie tient, mais la 4G monte à 1,2–1,5 s, mauvaise réception 4G ce jour-là) ; version Windows (moteur `route.rs` + onglet « Rago Route » de l'exe de test) **sur `staging` depuis le 07/11**, premier essai sur PC Windows réussi le 07/11 au soir ; **accès réservé au Premium sur `staging` depuis le 08/11** (jeton signé, ancien proxy simple retiré) ; **protocole 2** (chiffrement, paquets de secours, 4G sur Windows, choix de la sortie) codé le 08/11, pas encore poussé ; les 2 serveurs restent ouverts à tous jusqu'à leur réinstallation, à faire en même temps que le push du protocole 2 ; `ROUTE_TESTERS` sur Railway staging : À VÉRIFIER | DÉCIDÉ (Sofiene, 05/11 et 08/11) |
| Marketing | pas de plan : des vidéos sur TikTok, YouTube et Instagram, faites par Abel ; trailer 1.2 (v4) sans doute jamais publié ; annonces Discord 1.2 postées, en anglais | Sofiene, 01/11 ([[Marketing]]) |
| [[Rago OS]] | bureau Windows de Sofiene (dossier `nimbus`, son Mac), branche `rago-design` : charte Rago, 7 thèmes, lien avec l'app (île FPS/ping, Mode jeu total, page, widget, Spotlight). Côté app, le pont et le Mode jeu total sont sur une branche locale, pas sur GitHub. Rien testé sur Windows | EN COURS (07/11) |
| [[Client Minecraft Rago]] | projet à part, en cours, va être lancé (client, launcher, cosmétiques) | Sofiene, 01/11 |
| [[Bot communauté Discord]] | sur `staging` seulement ; à tester puis passer en prod (fil « Passer le bot Discord en prod », RAG-91) | DÉCIDÉ (Sofiene, 01/11) |
| Version 1.3.0 | **PR #70 fusionnée dans `staging` le 04/11 au soir** (pas en prod) : contient la 1.2.2 (preset Minecraft PvP corrigé, applis préinstallées gratuites, commit `29123d4`), la fusion de la branche de prod dans staging, 73 réglages gratuits dont 30 actifs à la fois, connexion à l'app avec Google ou Discord, essai de 3 jours avec carte, [[Analyse du PC]] avec avant/après, fenêtre Premium avec les prix et résiliation dans l'app ([[Abonnement dans l'app]]), site et pages légales à jour. Rien testé sur Windows. Sortir la 1.2.2 seule ou tout ensemble : q47 | CONFIRMÉ (git, 04/11) |
| [[Conformité juridique]] | pages légales à jour pour l'essai et la connexion (04/11) ; **manquent l'identité et l'adresse du vendeur** : Sofiene n'est pas encore inscrit comme vendeur et a 17 ans (q44, q46, q49) | À RÉGLER par Sofiene |
| [[Linear]] | remis à jour le 01/11 à partir du vault | CONFIRMÉ |
| Vault Obsidian | créé le 31/10 ; règle n°1 : il doit correspondre en tout point à l'état du projet | DÉCIDÉ |

## PR ouvertes (07/11)
- Fusionnée le 04/11 dans `staging` : #70 ([[Version 1.3.0]]), à tester sur staging avant toute sortie.
- #69 : charte « Affiche » v2.2 appliquée à la page d'accueil, **aperçu en brouillon** pour décider d'adopter la charte ; ne pas fusionner sans le feu vert de Sofiene ([[Charte graphique]]).
- Fusionnée le 04/11 : #72 (état des lieux Stripe, [[Ventes Stripe]]), sur « fusionne » de Sofiene.
- Fusionnée le 01/11 : #68 (ce vault, réponses de Sofiene et Linear remis à jour), sur « fusionne » de Sofiene.
- Fermées le 01/11 avec l'accord de Sofiene (branches gardées) : #16 (1.1.10), #50 et #51 (1.1.13), dont les fonctions sont dans la 1.2.1, et #60 (Rago OS, abandonné).

## Ce qui attend Sofiene
1. Vérifier que les 1.2.0 installées reçoivent bien la 1.2.1 (`/api/v1/update/status`, voir [[Mise à jour automatique]]).
2. Valider l'e-mail sur la collecte des tests réseau avant son envoi, une fois rédigé ([[Prochaines étapes]]).
3. Répondre à q47 (1.2.2 seule ou avec la 1.3.0) et q48 (offre débitée après l'essai), puis tester la 1.3.0 sur staging.
4. Avant la prod de l'essai : régler l'identité du vendeur ([[Conformité juridique]]) ; `TRIAL_DAYS` est à 3 par défaut sur le serveur, rien à créer dans Stripe.
5. [[Rago OS]] : accord pour mettre le pont et le Mode jeu total de l'app sur GitHub (staging), test sur Windows, q52 et q53.
