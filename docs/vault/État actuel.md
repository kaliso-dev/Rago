---
type: pilotage
tags: [état, pilotage]
maj: 2026-11-04
---
# État actuel (04/11/2026)

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
| [[Proxy]] | collecte des tests réseau en prod ; la suite (mesure proxy → serveur de jeu) : « pas maintenant » | DÉCIDÉ (Sofiene, 01/11) |
| Marketing | pas de plan : des vidéos sur TikTok, YouTube et Instagram, faites par Abel ; trailer 1.2 (v4) sans doute jamais publié ; annonces Discord 1.2 postées, en anglais | Sofiene, 01/11 ([[Marketing]]) |
| [[Client Minecraft Rago]] | projet à part, en cours, va être lancé (client, launcher, cosmétiques) | Sofiene, 01/11 |
| [[Bot communauté Discord]] | sur `staging` seulement ; à tester puis passer en prod (fil « Passer le bot Discord en prod », RAG-91) | DÉCIDÉ (Sofiene, 01/11) |
| Version 1.3.0 | **PR #70 vers `staging`, pas fusionnée** : contient la 1.2.2 (preset Minecraft PvP corrigé, applis préinstallées gratuites, commit `29123d4`), la fusion de la branche de prod dans staging, 73 réglages gratuits dont 30 actifs à la fois, connexion à l'app avec Google ou Discord, essai de 3 jours avec carte, site et pages légales à jour. Rien testé sur Windows. Sortir la 1.2.2 seule ou tout ensemble : q47 | CONFIRMÉ (git, 04/11) |
| [[Conformité juridique]] | pages légales à jour pour l'essai et la connexion (04/11) ; **manquent l'identité et l'adresse du vendeur** : Sofiene n'est pas encore inscrit comme vendeur et a 17 ans (q44, q46, q49) | À RÉGLER par Sofiene |
| [[Linear]] | remis à jour le 01/11 à partir du vault | CONFIRMÉ |
| Vault Obsidian | créé le 31/10 ; règle n°1 : il doit correspondre en tout point à l'état du projet | DÉCIDÉ |

## PR ouvertes (04/11)
- #70 (vers `staging`) : [[Version 1.3.0]], voir le tableau. À valider par Sofiene avant toute sortie.
- #69 : charte « Affiche » v2.2 appliquée à la page d'accueil, **aperçu en brouillon** pour décider d'adopter la charte ; ne pas fusionner sans le feu vert de Sofiene ([[Charte graphique]]).
- Fusionnée le 04/11 : #72 (état des lieux Stripe, [[Ventes Stripe]]), sur « fusionne » de Sofiene.
- Fusionnée le 01/11 : #68 (ce vault, réponses de Sofiene et Linear remis à jour), sur « fusionne » de Sofiene.
- Fermées le 01/11 avec l'accord de Sofiene (branches gardées) : #16 (1.1.10), #50 et #51 (1.1.13), dont les fonctions sont dans la 1.2.1, et #60 (Rago OS, abandonné).

## Ce qui attend Sofiene
1. Vérifier que les 1.2.0 installées reçoivent bien la 1.2.1 (`/api/v1/update/status`, voir [[Mise à jour automatique]]).
2. Valider l'e-mail sur la collecte des tests réseau avant son envoi, une fois rédigé ([[Prochaines étapes]]).
3. Répondre à q47 (1.2.2 seule ou avec la 1.3.0) et q48 (offre débitée après l'essai), puis tester la PR #70 sur staging.
4. Avant la prod de l'essai : régler l'identité du vendeur ([[Conformité juridique]]) ; `TRIAL_DAYS` est à 3 par défaut sur le serveur, rien à créer dans Stripe.
