---
type: fonctionnalité
tags: [discord, communauté, serveur, bot]
maj: 2026-11-01
---
# Bot communauté Discord

Le bot Rago (le même que pour le rôle Pro, voir [[Discord]]) peut écouter le serveur Discord en direct pour compter les invitations lui-même, accueillir les nouveaux et suivre les partenaires. Code dans `licensing/src/community.js` et `licensing/src/gateway.js` ([[Serveur de licences]]). Retour à [[Projet]].

## État au 01/11/2026
| Où | État | Statut |
|---|---|---|
| `staging` | fusionné le 15/10 (PR #40, commit `e1840d6`) | CONFIRMÉ (git) |
| Branche de prod | porté par une PR #71 (prod) ouverte le 01/11, **non fusionnée** : attend le test puis le « fusionne » de Sofiene | CONFIRMÉ (git) |
| Variables Railway staging (`DISCORD_COMMUNITY`, serveur Discord de test) | inconnues | À VÉRIFIER |
| Test sur un serveur Discord de test | pas encore fait ; confié à Abel | OBSERVÉ (01/11) |
| Allumé en prod (`DISCORD_COMMUNITY=1` sur Railway prod) | non | CONFIRMÉ (le code n'y est pas encore) |

Décision du 01/11 : « Il faut le tester et le passer en prod » (Sofiene). Voir [[Décisions]].

## Ce qu'il fait (avec `DISCORD_COMMUNITY=1`)
- Une invitation compte seulement quand l'ami est resté **7 jours**. Un retour après départ, un compte Discord de moins d'une semaine, son propre lien ou un lien partenaire ne comptent jamais. Le bot compte à partir de sa connexion : `/invites-adjust` reprend les chiffres d'Invite Tracker.
- Commandes pour tous : `/invites`, `/top-invites`. Staff (permission « Gérer le serveur ») : `/partner-link`, `/growth`, `/invites-adjust`.
- Accueil dans un salon (`DISCORD_WELCOME_CHANNEL_ID`), jamais en message privé, avec le lien de la version gratuite.
- Facultatif, `DISCORD_INVITE_ROLES=1` : le bot donne VIP (10) et MVP (15) lui-même. À n'allumer qu'après avoir coupé les rangs d'Invite Tracker. Voir [[Promotions et affiliation]].
- `/admin` du serveur a une section « Bot communauté Discord » (connexion live, invitations, accueil).
- Quatre tables créées seules au démarrage : `discord_joins`, `discord_invite_links`, `discord_invite_bonus`, `discord_invite_roles`.
- Sans `DISCORD_COMMUNITY`, rien ne change. Retour arrière = vider la variable.

## Prérequis Discord (Abel)
- Developer Portal → Bot → **Server Members Intent** activé (sinon Discord coupe la connexion, code 4014).
- Rôle du bot : **Gérer le serveur** et droit d'écrire dans le salon d'accueil.
- Staging doit pointer vers un **serveur Discord de test** (`DISCORD_GUILD_ID`), jamais le vrai.

## Procédure de test et de mise en prod
Doc « Bot communauté Discord : test et mise en prod » (01/11) : https://claude.ai/artifact/EWgch3widb3qSr3KLsnj1x. Résumé : 12 vérifications sur staging avec un 2e compte Discord de plus de 7 jours, un contrôle à J+7, puis fusion de la PR (prod), « Gérer le serveur » sur le vrai serveur, `DISCORD_WELCOME_CHANNEL_ID` et `DISCORD_COMMUNITY=1` sur Railway prod. Détail technique aussi dans `licensing/docs/MISE-EN-LIGNE.md` (« Le bot communauté »).

Tests automatiques sur la branche portée : 89 réussis, 3 ignorés, 0 échec (01/11).

Liens : [[Discord]], [[Personnes et services]], [[Branches et environnements]].
