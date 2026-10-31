---
type: pilotage
tags: [état, pilotage]
maj: 2026-10-31
---
# État actuel (31/10/2026)

Voir aussi [[Prochaines étapes]], [[Questions ouvertes]], [[Journal]]. Retour à [[Projet]].

## En une phrase
La [[Version 1.2.1]] (refonte en verre, barre en jeu, Packet Optimizer, bibliothèque, mises à jour automatiques) est **construite, signée et fusionnée dans `staging`** ; le serveur et le site de prod sont prêts pour elle depuis le 29/10. Il restait à Sofiene à **déposer l'exe et son `.sig` dans Supabase** : fait ou non, À VÉRIFIER.

## Tableau
| Sujet | État | Statut |
|---|---|---|
| Dernière version de l'app | [[Version 1.2.1]] (`staging` @ `fc3de16`, PR #65) | CONFIRMÉ (git) |
| Version servie aux joueurs | 1.1.14 au 16/10 ; 1.2.1 si Sofiene a déposé l'exe après le 29/10 | À VÉRIFIER (`/download/status`, `/api/v1/installer`) |
| Code app sur la branche de prod | encore **1.1.14** (`app/package.json`) : la prod ne reçoit que site + serveur, l'app part de `staging` | CONFIRMÉ |
| Serveur de prod | mises à jour auto (RAG-24) + collecte des tests réseau (RAG-50), PR #63 fusionnée le 29/10 | CONFIRMÉ (git) ; déploiement Railway À VÉRIFIER |
| Site de prod | à jour pour la 1.2.1 : section « New in 1.2 », Discord, prix réécrits, 218 tweaks (PR #59 et #66, 29/10) | CONFIRMÉ (git) |
| Connexion Google / Discord + code email | en ligne (PR #61, 28/10) | OBSERVÉ (fil) |
| Offre Lifetime | 59,99 $, vendue seulement si le prix Stripe correspond (sinon « Coming soon ») | CONFIRMÉ (`site/src/page.html`) |
| [[Rago OS]] | PR #60 ouverte (vers la branche de la refonte), exe de test livré le 21/10, tests de Sofiene sans retour | OBSERVÉ |
| [[Proxy]] | collecte des tests réseau en prod ; il manque la mesure proxy → serveur de jeu | OBSERVÉ (29/10) |
| Marketing | trailer 1.2 (v4 4K) et plans Kling prêts ; vidéos Milli #000 à #005 ; script YouTube « What's new » écrit ; annonces Discord 1.2 rédigées | voir [[Marketing]] |
| Vault Obsidian | créé le 31/10 dans `docs/vault/` | ce fil |

## PR ouvertes (31/10)
- #60 [[Rago OS]] (base `claude/app-redesign-glass-z5m1c8`).
- #51, #50 (1.1.13, mises de côté) et #16 (1.1.10) : anciennes, gardées comme sources. Ne pas supprimer sans décision. Voir [[Versions 1.1.11 à 1.1.13]].

## Ce qui attend Sofiene
1. Déposer `…1.2.1…setup.exe` + `.exe.sig` dans le bucket `downloads` de Supabase prod, `INSTALLER_VERSION=1.2.1` sur Railway, puis vérifier `/api/v1/update/status` (voir [[Publier une version]]).
2. Poster les annonces Discord 1.2 (voir [[Discord]]) une fois l'exe en ligne.
3. Tester [[Rago OS]] et dire la suite.
4. Ses tests en jeu des profils du [[Packet Optimizer]] pour la vidéo « What's new » (voir [[Vidéos YouTube]]).
