---
type: pilotage
tags: [état, pilotage]
maj: 2026-10-31
---
# État actuel (31/10/2026)

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
| [[Proxy]] | collecte des tests réseau en prod ; il manque la mesure proxy → serveur de jeu | OBSERVÉ (29/10) |
| Marketing | trailer 1.2 (v4 4K) et plans Kling prêts ; vidéos Milli #000 à #005 ; script YouTube « What's new » écrit ; annonces Discord 1.2 rédigées | voir [[Marketing]] |
| [[Bot communauté Discord]] | sur `staging` seulement depuis le 15/10, jamais testé ni passé en prod | À VÉRIFIER |
| Vault Obsidian | créé le 31/10 ; règle n°1 : il doit correspondre en tout point à l'état du projet | DÉCIDÉ |

## PR ouvertes (31/10)
- #60 : Rago OS, **abandonné** le 31/10 (voir [[Décisions]]) ; encore ouverte sur GitHub, à fermer quand Sofiene le dit.
- #51, #50 (1.1.13, mises de côté) et #16 (1.1.10) : anciennes, gardées comme sources. Ne pas supprimer sans décision. Voir [[Versions 1.1.11 à 1.1.13]].

## Ce qui attend Sofiene
1. Vérifier que les 1.2.0 installées reçoivent bien la 1.2.1 (`/api/v1/update/status`, voir [[Mise à jour automatique]]).
2. Poster les annonces Discord 1.2 (voir [[Discord]]) une fois l'exe en ligne.
3. Ses tests en jeu des profils du [[Packet Optimizer]] pour la vidéo « What's new » (voir [[Vidéos YouTube]]).
