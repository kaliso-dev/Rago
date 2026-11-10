---
type: code
tags: [code, serveur, javascript, discord]
fichier: licensing/src/community.js
lignes: 459
maj: 2026-11-10
---
# community.js

Le bot communauté Discord : écoute le serveur en direct, retient par quelle invitation chaque membre est arrivé, ne compte une invitation qu'après 7 jours, accueille les nouveaux dans un salon, donne VIP/MVP selon son propre comptage, et fournit les commandes `/invites`, `/top-invites`, `/partner-link`, `/growth`, `/invites-adjust`. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Bot communauté Discord]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté le 12/10/2026 (PR #40). Même bot et même token que le rôle Pro ([[discord.js]]). Actif seulement avec `DISCORD_COMMUNITY=1` **et** les 5 variables du rôle Pro ([[config.js]]). [[server.js]] le crée (`createCommunity(cfg, {db, discord})`) et appelle `start()`. La connexion en direct passe par [[gateway.js]]. Les textes vus par les membres sont en anglais ([[Voix et ton]]) ; les logs sont en français.

## Ce que le fichier expose

- `HOLD_MS` = 7 jours (un ami compte après 7 jours sur le serveur). `MIN_ACCOUNT_AGE_MS` = 7 jours (un compte Discord plus jeune à son arrivée ne compte jamais).
- `createdAt(id)` : date de création d'un compte Discord lue dans son identifiant (`(id >> 22) + 1420070400000`).
- `inviteCode(s)` : code d'un lien `discord.gg/…`, `discord.com/invite/…` ou d'un code nu.
- `growthStats(db, {now, days = 30})` : chiffres de `/growth` par source (`Member invites`, `Vanity URL`, `Unknown`, ou le nom d'un lien partenaire) : arrivés, partis en moins de 24 h, arrivés il y a plus de 7 jours, restés 7 jours, encore là, comptes Rago liés, acheteurs (licence `source = 'stripe'`), plus un total.
- `growthText(g, tags)` : le texte de `/growth` (phrases + tableau dans un bloc de code, 15 sources au plus, sous 2000 caractères).
- `createCommunity(cfg, {db, discord, log, now, connect})` → `{start, dispatch, checks, inviteStats, leaderboard, growth, growthText, inviteRolesPass, registerCommands, idle, commands, botId}` ou `null` sans `discord`.

## Fonctionnement détaillé

### Quelle invitation a servi (`attribute`)
Le bot garde en mémoire les compteurs d'utilisation de chaque invitation (`GET /guilds/<g>/invites`) et de l'URL personnalisée (`/vanity-url`). À chaque arrivée, il relit les compteurs : l'invitation dont le compteur a monté est celle utilisée. Une invitation à usage limité qui disparaît après sa dernière utilisation compte aussi. Deux invitations à la fois, ou aucune, ou la page Découverte → source `unknown`. Seule l'URL personnalisée a monté → `vanity`. Les arrivées sont traitées **une par une** (file `serial`) pour ne pas se mélanger. Sans la permission « Gérer le serveur », Discord cache les invitations : `invitesError` l'explique sur `/admin`.

### Arrivée et départ
- `GUILD_MEMBER_ADD` : ligne `discord_joins` avec id `dj_<id discord>_<date d'arrivée>`, `first_join` = aucune ligne précédente pour ce membre, `account_created_at` lu dans l'id ; puis message d'accueil.
- `GUILD_MEMBER_REMOVE` : `left_at` sur la dernière arrivée ouverte ; si le membre était là **avant** le bot, une ligne `dj_<id>_0` (`source = 'before_bot'`, `joined_at = 0`, `first_join = false`) est créée pour qu'un retour plus tard ne soit pas compté comme une première arrivée.
- Les bots sont ignorés.

### Ce qui compte (`VALID` et `STAYED`)
Une arrivée compte pour celui qui a invité si : première arrivée de ce compte, invitation d'un **autre** membre (pas soi-même, pas un bot, pas l'URL personnalisée), compte Discord d'au moins 7 jours à l'arrivée, **pas** par un lien partenaire ; et le membre est resté 7 jours (encore là après 7 jours, ou parti après 7 jours). `inviteStats` donne `counted`, `pending` (encore dans les 7 jours), `left` (parti avant), `ignored`, `bonus` (ajouté à la main) et `total`.

### Accueil
Dans `DISCORD_WELCOME_CHANNEL_ID` (jamais en message privé : règle des développeurs Discord). Texte : « Welcome @membre, you're member #N. », « Invited by @parrain. » s'il est connu, puis `DISCORD_WELCOME_TEXT` ou un texte par défaut (version gratuite sur `<SITE_URL>/download`, liaison du Discord sur le compte Rago pour les récompenses). Seul le nouveau membre est mentionné.

### VIP et MVP par le bot (`DISCORD_INVITE_ROLES=1`)
Passe des rôles **toutes les heures** et **2 min** après le démarrage, et après `/invites-adjust`, dans la même file que les arrivées. Pour chaque membre au-dessus du seuil (`DISCORD_VIP_INVITES` = 10, `DISCORD_MVP_INVITES` = 15) : réservation dans [[Table discord_invite_roles]] (une fois par membre et par palier) ; si le membre n'a pas déjà le rôle, `PUT` du rôle (raison « N invites (Rago) »), audit `discord.invite_role`, puis si son compte Rago est lié : `discord.checkRewards` (Premium + code, voir [[discord.js]]) et `syncUser` ; annonce « @membre reached N invites and gets VIP. » avec la récompense ou l'invitation à lier son Discord. Échec (pas sur le serveur…) : réservation supprimée, nouvel essai à la passe suivante.

### Commandes slash
Enregistrées au démarrage sur le serveur (`PUT /applications/<app>/guilds/<g>/commands`).

| Commande | Qui | Ce qu'elle fait |
|---|---|---|
| `/invites [member]` | tout le monde | Nombre d'amis restés 7 jours (+ bonus), en attente, partis, prochain palier. |
| `/top-invites` | tout le monde | Les 10 membres qui ont le plus invité (bonus compris). |
| `/partner-link name [code]` | staff (Gérer le serveur ou Administrateur) | Crée une invitation permanente unique dans le salon (ou suit un lien existant de ce serveur) ; enregistrée dans [[Table discord_invite_links]] ; audit `discord.partner_link`. Ses arrivées ne comptent pour personne et apparaissent dans `/growth`. Réponse visible seulement par l'auteur. |
| `/growth` | staff | Répond d'abord « en réflexion », puis modifie le message avec `growthText` et le nombre de membres qui portent le tag du serveur (lecture de tous les membres, 50 pages de 1000 au plus). |
| `/invites-adjust member count` | staff | Bonus de 0 à 1000 invitations comptées avant le bot Rago (Invite Tracker) dans [[Table discord_invite_bonus]] ; 0 le supprime ; audit `discord.invite_bonus` ; relance la passe des rôles. |

Un non-staff qui lance une commande de staff reçoit « This command is for staff. ». Les commandes d'un autre serveur sont ignorées (un staging ne partage rien).

### Contrôles pour `/admin` (`checks`)
**Connexion live** (pas démarrée, erreur fatale de la gateway, en cours, connectée avec l'heure du dernier événement), **Invitations** (permission manquante ou nombre de liens suivis), **Accueil** (salon vide), **VIP / MVP** (paliers donnés par le bot).

## Données touchées

[[Table discord_joins]], [[Table discord_invite_links]], [[Table discord_invite_bonus]], [[Table discord_invite_roles]], lecture de [[Table discord_links]] et [[Table licenses]], [[Table audit]] ; API REST et gateway Discord.

## Événements d'audit écrits

`discord.invite_role`, `discord.partner_link`, `discord.invite_bonus` (sans libellé dans le journal de l'admin).

## Liens avec le reste

Créé par [[server.js]] ; utilise [[gateway.js]] et [[discord.js]] ; `growthStats`/`growthText` servent aussi à `npm run admin -- growth` ([[admin.js (script serveur)]]) ; `checks` sur la page Services de [[admin.js (serveur)]]. Purge des départs de plus de 12 mois : [[retention.js]]. Fiche fonctionnelle : [[Bot communauté Discord]].

## Tests

`community.test.js` (11 tests, API Discord et gateway simulées) : config, ids et âge de compte, comptage après 7 jours, départs/retours/comptes jeunes/auto-invitations, URL personnalisée et invitations épuisées, commandes et droits du staff, liens partenaires, VIP par le comptage Rago, texte de `/growth`, enregistrement des commandes et contrôles, gateway ([[Tests du serveur]]).

## À savoir avant de modifier

- Il faut activer « Server Members Intent » dans le Developer Portal et donner « Gérer le serveur » au rôle du bot **avant** `DISCORD_COMMUNITY=1`.
- Avec `DISCORD_INVITE_ROLES=1`, couper d'abord la remise des rôles VIP/MVP par l'autre bot d'invitations (InviteLogger…), sinon les deux donnent les rôles.
- Les compteurs d'invitations sont en mémoire : après un redémarrage, la première arrivée relit les invitations et peut être `unknown`.
