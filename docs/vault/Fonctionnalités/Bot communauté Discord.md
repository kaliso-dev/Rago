---
type: fonctionnalité
tags: [fonctionnalité, serveur, discord, en-cours]
maj: 2026-11-01
---
# Bot communauté Discord

PR #40, **fusionnée dans `staging` le 15/10, absente de la prod** (vérifié dans git le 31/10 : `DISCORD_COMMUNITY` n'existe que sur `staging`). Code dans le [[Serveur de licences]] (`discord.js`, `config.js`).

- Comptage interne des invitations : une invitation compte après 7 jours de présence ; jamais pour un retour, un compte Discord de moins de 7 jours, son propre lien ou un lien partenaire. Doit remplacer Invite Tracker pour les récompenses VIP/MVP ([[Promotions et affiliation]]).
- Message d'accueil en salon ; commandes `/invites`, `/top-invites`, `/partner-link`, `/growth`, `/invites-adjust`.
- Variables : `DISCORD_COMMUNITY`, `DISCORD_WELCOME_CHANNEL_ID`, `DISCORD_WELCOME_TEXT`, `DISCORD_INVITE_ROLES`, `DISCORD_VIP_INVITES`, `DISCORD_MVP_INVITES`.
- Tests demandés à Sofiene le 12/10 (Server Members Intent, droits du rôle, variables sur Railway staging, essai avec un 2e compte) : aucun retour.
- **Statut (Sofiene, 01/11)** : « Il faut le tester et le passer en prod ». Travail en cours dans le fil « Passer le bot Discord en prod » (Linear RAG-91). C'est Abel qui gère les bots, rôles et webhooks du Discord ([[Personnes et services]]).

Liens : [[Discord]].
