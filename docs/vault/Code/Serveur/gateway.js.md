---
type: code
tags: [code, serveur, javascript, discord]
fichier: licensing/src/gateway.js
lignes: 133
maj: 2026-11-10
---
# gateway.js

Connexion en direct à la gateway Discord (WebSocket) : le bot communauté y apprend qu'un membre arrive ou part, qu'une invitation est créée, ou qu'une commande slash est lancée. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Bot communauté Discord]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté le 12/10/2026 avec [[community.js]]. Les appels REST de [[discord.js]] **agissent** (donner un rôle, poster un message) ; ce fichier **écoute**. Un seul serveur Discord, donc pas de « sharding ». Il utilise le `WebSocket` intégré à Node 22 (aucune bibliothèque). Les messages de journal sont en français : seul Sofiene lit les logs.

## Ce que le fichier expose

- `INTENTS` : `GUILDS` (1), `GUILD_MEMBERS` (2, intent privilégié « Server Members Intent »), `GUILD_INVITES` (64).
- `connectGateway({token, intents, onDispatch, call, log, WebSocketImpl, random})` → `{state, close()}`.
  - `onDispatch(type, data)` reçoit chaque événement (`READY`, `GUILD_CREATE`, `GUILD_MEMBER_ADD`, `GUILD_MEMBER_REMOVE`, `INVITE_CREATE`, `INVITE_DELETE`, `INTERACTION_CREATE`…). Ses erreurs sont journalisées (`[gateway] <type> non traité`), jamais relancées.
  - `call` est le client REST du bot ([[discord.js]]), utilisé pour demander l'adresse de la gateway (`GET /gateway/bot`).
  - `state` = `{connected, since, error}`, lu par la page Services de l'admin ([[admin.js (serveur)]]).

## Fonctionnement détaillé

Codes d'opération utilisés : `DISPATCH` 0, `HEARTBEAT` 1, `IDENTIFY` 2, `RESUME` 6, `RECONNECT` 7, `INVALID_SESSION` 9, `HELLO` 10, `HEARTBEAT_ACK` 11.

1. **Ouverture** : si une session existe (`sessionId` et `resume_gateway_url`), le bot s'y reconnecte ; sinon il demande l'adresse par REST. URL finale : `<adresse>/?v=10&encoding=json`.
2. **`HELLO`** : battement de cœur (`heartbeat_interval`) dont le **premier** part à un moment aléatoire de l'intervalle (demande de Discord, pour que tous les bots ne repartent pas ensemble après une panne). Puis `RESUME` (`token`, `session_id`, `seq`) ou `IDENTIFY` (`token`, `intents`, `properties: {os:'linux', browser:'rago', device:'rago'}`).
3. **Connexion zombie** : si le battement précédent n'a pas reçu d'`ACK`, la socket est fermée (code 4000 « zombie ») puis reprise.
4. `HEARTBEAT` reçu → battement immédiat. `RECONNECT` → fermeture et reprise. `INVALID_SESSION` → si `d` est faux, la session est oubliée (nouvelle identification).
5. `DISPATCH` : `seq` est mémorisé ; `READY` donne `session_id` et `resume_gateway_url` ; `READY` ou `RESUMED` remettent le compteur d'échecs à zéro, `state.connected = true` et journalisent « connecté » / « reconnecté ».
6. **Fermeture** :
   - codes **fatals**, sans nouvel essai : 4004 (token refusé), 4010 (shard invalide), 4011 (trop de serveurs), 4012 (version refusée), 4013 (intents invalides), 4014 (intent privilégié non activé : message qui explique où cocher « Server Members Intent ») ; `state.error` reçoit le message ;
   - 4007 et 4009 : session oubliée, nouvelle identification ;
   - autres : nouvel essai.
7. **Nouveaux essais** : 1er échec après 1 à 5 s (aléatoire) ; ensuite `min(60 s, 2^échecs s)`, avec un log `[gateway] …, nouvel essai dans N s.`. `state.error` n'est rempli qu'après plus de 3 échecs. Les minuteurs sont `unref()` : ils ne gardent pas Node en vie.

## Données touchées

Réseau seulement (WebSocket Discord). Aucune table.

## Liens avec le reste

- Appelé par [[community.js]] (`start()`), qui reçoit les événements. Client REST : [[discord.js]].
- Démarré par [[server.js]] via `community.start()` seulement si `DISCORD_COMMUNITY=1` ([[config.js]]).

## Tests

« gateway: identify, events, resume after a drop, stop on a missing intent » dans `community.test.js` (WebSocket simulé) ([[Tests du serveur]]).

## À savoir avant de modifier

- Le serveur Railway n'a qu'**un réplica** : deux processus ouvriraient deux connexions et traiteraient chaque arrivée deux fois ([[Railway]]).
- Sans « Server Members Intent » activé dans le Developer Portal, la connexion s'arrête définitivement (4014) jusqu'au redémarrage du serveur.
