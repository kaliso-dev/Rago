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
| Marketing | pas de plan : des vidéos sur TikTok, YouTube et Instagram, faites par un collègue de Sofiene ; trailer 1.2 (v4) sans doute jamais publié ; annonces Discord 1.2 postées, en anglais | Sofiene, 01/11 ([[Marketing]]) |
| [[Client Minecraft Rago]] | projet à part, en cours, va être lancé (client, launcher, cosmétiques) | Sofiene, 01/11 |
| [[Bot communauté Discord]] | sur `staging` seulement depuis le 15/10, jamais testé ni passé en prod | À VÉRIFIER |
| Vault Obsidian | créé le 31/10 ; règle n°1 : il doit correspondre en tout point à l'état du projet | DÉCIDÉ |

## PR ouvertes (31/10)
- #60 : Rago OS, **abandonné** le 31/10 (voir [[Décisions]]) ; encore ouverte sur GitHub, à fermer quand Sofiene le dit.
- #51, #50 (1.1.13, mises de côté) et #16 (1.1.10) : anciennes, gardées comme sources. Ne pas supprimer sans décision. Voir [[Versions 1.1.11 à 1.1.13]].

## Ce qui attend Sofiene
1. Vérifier que les 1.2.0 installées reçoivent bien la 1.2.1 (`/api/v1/update/status`, voir [[Mise à jour automatique]]).
2. Les questions en attente sur la page « Questions du vault Rago » ([[Questions ouvertes]]).
3. Valider l'e-mail sur la collecte des tests réseau avant son envoi, une fois rédigé ([[Prochaines étapes]]).
