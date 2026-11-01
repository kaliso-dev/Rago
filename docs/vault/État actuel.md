---
type: pilotage
tags: [état, pilotage]
maj: 2026-11-01
---
# État actuel (01/11/2026)

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
| [[Proxy]] | collecte des tests réseau en prod ; la suite (mesure proxy → serveur de jeu) : « pas maintenant » | DÉCIDÉ (Sofiene, 01/11) |
| Marketing | pas de plan : des vidéos sur TikTok, YouTube et Instagram, faites par Abel ; trailer 1.2 (v4) sans doute jamais publié ; annonces Discord 1.2 postées, en anglais | Sofiene, 01/11 ([[Marketing]]) |
| [[Client Minecraft Rago]] | projet à part, en cours, va être lancé (client, launcher, cosmétiques) | Sofiene, 01/11 |
| [[Bot communauté Discord]] | sur `staging` seulement ; à tester puis passer en prod (fil « Passer le bot Discord en prod », RAG-91) | DÉCIDÉ (Sofiene, 01/11) |
| Version 1.2.2 | en préparation (fil « Sortir l'app 1.2.2 ») : correctif du preset Minecraft PvP, applis préinstallées gratuites, envoi par la mise à jour automatique (RAG-87, RAG-88) | DÉCIDÉ (Sofiene, 01/11) |
| [[Linear]] | remis à jour le 01/11 à partir du vault | CONFIRMÉ |
| Vault Obsidian | créé le 31/10 ; règle n°1 : il doit correspondre en tout point à l'état du projet | DÉCIDÉ |

## PR ouvertes (01/11)
- #68 : ce vault (attend « fusionne »).
- #69 : charte « Affiche » v2.2 appliquée à la page d'accueil, **aperçu en brouillon** pour décider d'adopter la charte ; ne pas fusionner sans le feu vert de Sofiene ([[Charte graphique]]).
- Fermées le 01/11 avec l'accord de Sofiene (branches gardées) : #16 (1.1.10), #50 et #51 (1.1.13), dont les fonctions sont dans la 1.2.1, et #60 (Rago OS, abandonné).

## Ce qui attend Sofiene
1. Vérifier que les 1.2.0 installées reçoivent bien la 1.2.1 (`/api/v1/update/status`, voir [[Mise à jour automatique]]).
2. Les questions en attente sur la page « Questions du vault Rago » ([[Questions ouvertes]]).
3. Valider l'e-mail sur la collecte des tests réseau avant son envoi, une fois rédigé ([[Prochaines étapes]]).
