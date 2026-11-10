---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/oauth.js
lignes: 78
maj: 2026-11-10
---
# oauth.js

Client OAuth 2 (code d'autorisation + PKCE) pour « Continue with Google » et « Continue with Discord ». Il lit seulement qui est le joueur (identifiant, e-mail, e-mail vérifié ou non), puis oublie le jeton du fournisseur. Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Connexion Google et Discord]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté le 25/10/2026. [[app.js]] appelle `createOAuth(cfg)` une fois, puis utilise les fournisseurs disponibles dans les routes `GET /auth/:provider` et `GET /auth/:provider/callback`. La décision « quel compte Rago correspond à ce profil » est prise par `userForIdentity` dans [[licensing.js]], pas ici.

## Ce que le fichier expose

- `OAuthError` : toute panne du fournisseur (injoignable, statut HTTP en erreur, pas de jeton, pas d'identifiant).
- `createOAuth(cfg, {fetchImpl})` : renvoie un objet `{google?, discord?}`. Un fournisseur n'y figure que si ses **deux** clés sont présentes. Chaque fournisseur a :
  - `id`, `name` (« Google » / « Discord ») ;
  - `redirectUri` = `<PUBLIC_URL>/auth/<id>/callback` ;
  - `authorizeUrl(state, verifier)` : l'adresse où envoyer le navigateur ;
  - `profile(code, verifier)` : échange le code et renvoie `{subject, email, verified, name}`.

## Fonctionnement détaillé

| | Google | Discord |
|---|---|---|
| Clés | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, **et** `DISCORD_LOGIN=1` |
| Autorisation | `accounts.google.com/o/oauth2/v2/auth` | `discord.com/oauth2/authorize` |
| Jeton | `oauth2.googleapis.com/token` | `discord.com/api/v10/oauth2/token` |
| Profil | `openidconnect.googleapis.com/v1/userinfo` | `discord.com/api/v10/users/@me` |
| Scope | `openid email profile` | `identify email` |
| Extra | `prompt=select_account` (le joueur choisit son compte Google) | aucun |
| `verified` | `email_verified` vrai (booléen ou chaîne `'true'`) | `verified === true` |
| `name` | `name` | `global_name`, sinon `username` |
| Révocation | non | oui, jeton révoqué dans un `finally` après la lecture du profil (erreurs ignorées) |

- **PKCE S256** : le `code_challenge` est le SHA-256 en base64url du `verifier`. [[app.js]] tire `state` et `verifier` au hasard et les garde 10 min dans le cookie signé `rg_oauth` (path `/auth`).
- Chaque appel a un **délai maximal de 10 s** (`AbortSignal.timeout(10000)`). La réponse est lue en texte puis en JSON ; le message d'erreur reprend `error_description`, `error`, `message` ou les 200 premiers caractères.
- L'échange du code se fait en `application/x-www-form-urlencoded` avec `client_secret` et `code_verifier`.

## Données touchées

Réseau seulement (Google, Discord). Le profil est ensuite écrit par [[licensing.js]] dans [[Table oauth_identities]] et [[Table users]].

## Erreurs et cas limites

- Pas de `access_token` : `OAuthError("<nom>: no access token")`. Pas d'identifiant : `"no account id"`.
- Côté [[app.js]], une `OAuthError` devient la notice `oauthfail` sur la page de connexion ; un refus du joueur sur la page du fournisseur devient `oauthcancel`.
- Discord sans `DISCORD_LOGIN=1` n'est pas proposé, même si le bot a ses clés : l'adresse `/auth/discord/callback` doit d'abord être ajoutée dans le Developer Portal.

## Liens avec le reste

- Appelé par [[app.js]] (routes `/auth/…`, page `/app/link/:id` qui sert aussi la connexion de l'app par le navigateur).
- Utilise les mêmes identifiants Discord que le bot du rôle Pro ([[discord.js]]).
- Réglages côté Google/Discord : [[Connexion Google et Discord]] ; variables : [[Variables d'environnement]].

## Tests

`flow.test.js` : « Google and Discord buttons show only with their keys », « Continue with Google… », « Continue with Discord links an existing account by its verified email; unverified is refused », « OAuth callback refuses a forged state, a canceled authorization and a bad code », « Google sign-in after a purchase attaches the license », « app sign-in through the browser… » ([[Tests du serveur]]).

## À savoir avant de modifier

- Le serveur ne garde **jamais** le jeton du fournisseur : ne pas ajouter de stockage de jeton sans décision de Sofiene.
- Un nouveau fournisseur = une entrée dans `PROVIDERS`, une valeur dans la colonne `provider` de [[Table oauth_identities]] et les libellés d'erreur dans [[app.js]] et [[views.js]].
