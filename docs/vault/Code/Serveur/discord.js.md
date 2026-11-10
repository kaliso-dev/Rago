---
type: code
tags: [code, serveur, javascript, discord]
fichier: licensing/src/discord.js
lignes: 459
maj: 2026-11-10
---
# discord.js

Bot du **rôle Pro** sur le Discord Rago : liaison du compte Discord depuis `/account`, ajout au serveur, rôle donné tant que Premium est actif et retiré quand il s'arrête ; plus les **récompenses Discord** (VIP, MVP, boosts → temps de Premium + code promo à usage unique). Fournit aussi le client REST partagé avec le bot communauté. Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Bot communauté Discord]], [[Discord]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté le 10/10/2026. [[server.js]] crée le bot avec `createDiscord(cfg, {db, stripe})` (`null` si les 5 variables `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID` ne sont pas toutes valides ; la page compte dit alors d'ouvrir un ticket). [[server.js]] lance `syncAll()` toutes les 5 min et `syncAll({all: true})` toutes les 24 h (et 60 s après le démarrage). [[app.js]] appelle `syncAll()` après chaque webhook Stripe. [[community.js]] réutilise `call` (REST) et `checkRewards`.

## Ce que le fichier expose

- `BOT_PERMISSIONS` = Gérer les rôles + Créer une invitation. `COMMUNITY_PERMISSIONS` = en plus Gérer le serveur (sinon Discord cache les invitations aux bots), Voir le salon, Envoyer des messages.
- `REWARDS` (liste des récompenses, voir plus bas), `replacedBy(r)`, `rewardsOn(cfg)` (récompenses actives : VIP/MVP/2 boosts si leur rôle est réglé, 1 boost toujours ; avec `DISCORD_INVITE_ROLES=1`, le texte « N invites » suit `DISCORD_VIP_INVITES` / `DISCORD_MVP_INVITES`).
- `DiscordError(status, code, message)` avec `kind` : `not_member` (codes Discord 10007, 10013), `unauthorized` (401), `forbidden` (403), `config` (10004 serveur inconnu, 10011 rôle inconnu), `unavailable` (le reste).
- `createDiscord(cfg, {db, fetchImpl, log, stripe})` → `{authorizeUrl, inviteUrl, redirectUri, link, unlink, linkOf, syncUser, syncAll, idle, checks, checkRewards, rewardsOf, rewards, call}`.
- `discordSetupMissing(cfg)` : liste des variables manquantes ou invalides (pour `/admin` sans le bot).

## Fonctionnement détaillé

### Client REST (`restClient`)
`https://discord.com/api/v10`, en-tête `Authorization: Bot <token>` (ou `Basic` client id/secret pour l'OAuth, ou `Bearer` du joueur), `User-Agent: DiscordBot (<SITE_URL>, 1.0)`, `X-Audit-Log-Reason` si donné, délai 10 s. **429** : attend `retry_after` (30 s au plus) et réessaie, 3 fois.

### Rôle Pro
- « Veut le rôle » (`WANT`) = le compte a une licence active, et pour une récompense, sa date de fin n'est pas passée.
- `apply(row, {force})` : `PUT` ou `DELETE /guilds/<g>/members/<id>/roles/<rôle>` ; raison « Rago Optimizer Premium active / ended ». `not_member` : le rôle attend (pas d'erreur si on voulait le retirer). Écrit `role`, `error`, `synced_at` dans [[Table discord_links]] ; audit `discord.role_added` / `discord.role_removed` si l'état change. Ne lève jamais pour une erreur Discord.
- `syncUser(userId, {force})` : n'appelle Discord que si le rôle ne correspond pas (ou `force`) ; après un refus, attend **15 min** (`RETRY_MS`), ou **1 h** si le joueur n'est pas sur le serveur.
- `reconcile({all})` : tous les comptes dont le rôle ne correspond pas (avec `all` : tous les Premium, pour ceux qui ont quitté puis rejoint le serveur ou dont le rôle a été retiré à la main). Log groupé des échecs avec la raison en français (`WHY`).
- `syncAll({all})` = `reconcile` puis `rewardPass`, **une passe à la fois** ; une demande pendant une passe relance une passe juste après.

### Liaison (`link`, `unlink`)
- `authorizeUrl(state)` : OAuth Discord avec `scope = identify guilds.join`, retour `<PUBLIC_URL>/account/discord/callback` (route de [[app.js]], cookie `rg_discord`).
- `link(userId, code)` : échange le code (`/oauth2/token`, auth Basic), lit `/users/@me` ; si ce compte Rago avait un autre Discord avec le rôle, le retire ; si ce Discord était lié à un autre compte Rago, la liaison **déménage** (le rôle déjà donné suit). Transaction : `DELETE` de l'ancienne liaison, `INSERT … ON CONFLICT (user_id) DO UPDATE`, audit `discord.linked` (`{discord_id, name, from?}`). Puis ajout au serveur (`PUT /guilds/<g>/members/<id>` avec le jeton du joueur, et le rôle si Premium) ; si Discord refuse avec le rôle, nouvel essai sans. Puis `checkRewards` et `apply(force)`. Le jeton du joueur est **révoqué** à la fin.
- `unlink(userId)` : retire le rôle (sauf `not_member`), supprime la liaison, audit `discord.unlinked`. Lève `DiscordError` si Discord refuse (la liaison reste).
- `inviteUrl` : lien d'ajout du bot au serveur (`bot` + `applications.commands` et `COMMUNITY_PERMISSIONS` avec le bot communauté, sinon `bot` + `BOT_PERMISSIONS`).

### Récompenses Discord (`REWARDS`)
| `kind` | Condition | Premium | Code promo |
|---|---|---|---|
| `vip` | rôle `DISCORD_VIP_ROLE_ID` (10 invitations) | 1 mois | 10 % |
| `mvp` | rôle `DISCORD_MVP_ROLE_ID` (15 invitations) | 3 mois | 30 % |
| `boost` | le membre booste le serveur (`premium_since`) | 14 jours | 10 % |
| `boost2` | rôle `DISCORD_BOOST2_ROLE_ID` (2 boosts) | 1 mois | 30 % |

- `boost2` **remplace** `boost` (décision de Sofiene, 10/10/2026) : pas de `boost` avec ou après `boost2` ; si `boost` a déjà été donné, `boost2` n'ajoute que le complément (« 2 more weeks », 1 mois − 14 jours).
- Chaque récompense est donnée **une fois par compte Discord et une fois par compte Rago** (deux contraintes `UNIQUE` dans [[Table discord_rewards]]).
- `checkRewards(userId, {minAge = 60 s})` : lit le membre (`GET /guilds/<g>/members/<id>`), donne chaque récompense gagnée et pas encore reçue ; `rewards_checked_at` limite la fréquence.
- `giveReward` : réservation d'abord (`INSERT … ON CONFLICT DO NOTHING`, id `drw_…`) ; code promo `NOM-XXXXXX` (6 caractères de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, coupon `rago-promo-<pct>-once`, `max_redemptions: 1`, 3 tirages au plus en cas de doublon) ; puis `givePremiumTime(..., {source: 'discord'})` de [[licensing.js]] ; mise à jour de la ligne (`license_id`, `action`, `until`, `promo_code`) ; audit `discord.reward`. Échec : la réservation est supprimée et le code désactivé ; nouvel essai plus tard.
- `rewardPass()` : jusqu'à **50** comptes liés pas regardés depuis **30 min** et à qui il manque une récompense ; si une récompense est donnée, `syncUser` (le rôle Pro suit).

### Contrôles pour `/admin` (`checks`)
Libellés : **Bot** (token accepté, nom), **Application** (`DISCORD_CLIENT_ID` = l'application du bot), **Adresse de retour** (présente dans le Developer Portal), **Serveur**, **Rôle** (existe, pas géré par une intégration), **Permissions**, **Ordre des rôles** (rôle du bot au-dessus du rôle Pro), **Récompense VIP/MVP/BOOST/BOOST2** (nombre déjà données), **Comptes liés** (liés, avec rôle, pas sur le serveur, en échec). Messages en français.

## Données touchées

[[Table discord_links]], [[Table discord_rewards]], [[Table licenses]] (lecture, et via [[licensing.js]]), [[Table audit]] ; API Discord ; Stripe (codes promo, et décalage des paiements d'un abonné).

## Événements d'audit écrits

`discord.role_added`, `discord.role_removed`, `discord.reward`, `discord.linked`, `discord.unlinked`. Ils n'ont pas de libellé dans le journal de l'admin ([[admin-views.js]]) et s'y affichent bruts.

## Liens avec le reste

Créé par [[server.js]] ; appelé par [[app.js]] (`/account/discord…`, webhook, page compte), [[community.js]] (`call`, `checkRewards`, `syncUser`), [[support.js]] (`unlink` avant suppression), [[admin.js (serveur)]] (actions `discord-sync`, `discord-delier`, page Services), [[admin.js (script serveur)]] (`discord`, `discord-unlink`, `revoke`/`restore`). Configuration côté Discord : [[Bot communauté Discord]], [[Discord]].

## Tests

`flow.test.js` : « Discord: linked from the account page, Pro role while Premium is active… », « Discord: one Discord account per Rago account, refused changes retried, /admin checks the bot… », « Discord rewards: VIP, MVP and boosts give Premium time and a one-use code… » (API Discord simulée) ([[Tests du serveur]]).

## À savoir avant de modifier

- Discord n'indique pas aux bots le nombre de boosts d'un membre : « 2 boosts » est un rôle donné par le staff ou un bot de boosts.
- Le rôle du bot doit être **au-dessus** du rôle Pro dans la liste des rôles, sinon Discord refuse (`forbidden`).
- Un serveur de test avec ces variables agit sur le **vrai** serveur Discord indiqué ([[config.js]]).
