---
type: fonctionnalité
tags: [fonctionnalité, serveur, discord, en-cours]
maj: 2026-11-27
---
# Bot communauté Discord

PR #40, fusionnée dans `staging` le 15/10 ; **le code est en prod depuis la sortie 1.3.0** (PR #105 du 22/11, `DISCORD_COMMUNITY` présent dans `licensing/src/config.js` de la branche de prod, vérifié dans git le 25/11) ; tables `discord_*` créées dans Supabase prod le 22/11. Allumé en prod (`DISCORD_COMMUNITY=1` sur Railway prod) ou non : À VÉRIFIER. Messages du bot en charte v5 dans `staging` (PR #107). Code dans le [[Serveur de licences]] : `licensing/src/community.js` (comptage, commandes) et `gateway.js` (connexion au Gateway Discord), réglages dans `config.js` (bot éteint sans `DISCORD_COMMUNITY=1` et les 5 variables du rôle Pro). La PR #71 (même code vers la prod, ouverte le 01/11) a été fermée sans fusion le 26/11 : le code était déjà en prod par la #105.

- Comptage interne des invitations : une invitation compte après 7 jours de présence ; jamais pour un retour, un compte Discord de moins de 7 jours, son propre lien ou un lien partenaire. Doit remplacer Invite Tracker pour les récompenses VIP/MVP ([[Promotions et affiliation]]).
- Message d'accueil en salon ; commandes `/invites`, `/top-invites`, `/partner-link`, `/growth`, `/invites-adjust`.
- Variables : `DISCORD_COMMUNITY`, `DISCORD_WELCOME_CHANNEL_ID`, `DISCORD_WELCOME_TEXT`, `DISCORD_INVITE_ROLES`, `DISCORD_VIP_INVITES`, `DISCORD_MVP_INVITES`.
- Tests demandés à Sofiene le 12/10 (Server Members Intent, droits du rôle, variables sur Railway staging, essai avec un 2e compte) : aucun retour.
- **Statut (Sofiene, 01/11)** : « Il faut le tester et le passer en prod ». Travail en cours dans le fil « Passer le bot Discord en prod » (Linear RAG-91). C'est Abel qui gère les bots, rôles et webhooks du Discord ([[Personnes et services]]).

## Fonctionnement (code de `staging`, 10/11)
- **Attribution** : le bot garde en mémoire le nombre d'utilisations de chaque invitation ; à chaque arrivée, celle dont le compteur a monté est la bonne (URL personnalisée → `vanity` ; deux à la fois ou aucune → `unknown`). Après un redémarrage, la première arrivée peut être `unknown`. Le bot doit avoir « Gérer le serveur » pour voir les invitations, et « Server Members Intent » doit être activé.
- **VIP / MVP par le bot** (`DISCORD_INVITE_ROLES=1`) : paliers `DISCORD_VIP_INVITES` (10) et `DISCORD_MVP_INVITES` (15) ; passe 2 min après le démarrage puis toutes les heures ; rôle donné une fois par membre et par palier, annonce dans le salon, récompense Premium + code promo si le compte Rago est lié ([[discord.js]]). Couper d'abord la remise des rôles par l'autre bot d'invitations.
- `/invites-adjust` (staff) ajoute de 0 à 1000 invitations comptées avant le bot ; `/partner-link` (staff) crée un lien partenaire suivi dans `/growth` et qui ne compte pour personne ; `/growth` (staff) donne arrivées, départs en moins de 24 h, restés 7 jours, comptes Rago liés et acheteurs par source, plus le nombre de membres portant le tag du serveur. Le même rapport : `npm run admin -- growth`.
- Accueil seulement dans `DISCORD_WELCOME_CHANNEL_ID` (jamais en message privé).
- Données : arrivées gardées 12 mois après le départ.

## Messages en charte v5 (22/11, PR #107 vers `staging`)
- Tous les messages du bot sont des **embeds** rouges (`#FF3B30`) : accueil (mention dans le texte, « Invited by », bannière `discord-welcome.png`, boutons « Download free » et « Link my Discord »), annonces VIP/MVP (bannières `discord-vip.png` / `discord-mvp.png`, bouton de liaison si le compte n'est pas lié), `/invites` (barre ▰▱ vers le prochain palier), `/top-invites`. Les bannières (1200×480) sont servies par le serveur dans `/assets/`.
- **Avatar du bot** : R rouge sur tuile blanche (`png/rago-tile-512.png` du kit). À poser **à la main** dans le portail développeur Discord (Abel gère les bots) : À VÉRIFIER (pas encore fait au 22/11).

## Code
[[community.js]] (comptage, accueil, commandes, rôles), [[gateway.js]] (WebSocket), [[discord.js]] (client REST, récompenses), [[config.js]] (variables). Tables : [[Table discord_joins]], [[Table discord_invite_links]], [[Table discord_invite_bonus]], [[Table discord_invite_roles]]. Tests : `community.test.js` ([[Tests du serveur]]).

Liens : [[Discord]].
