---
type: fonctionnalité
tags: [fonctionnalité, serveur, site]
maj: 2026-11-10
---
# Connexion Google et Discord

Demandée le 25/10, en ligne le 28/10 (PR #61). Code : `licensing/src/oauth.js`.

- Inscription et connexion au compte sur le site avec **Google** ou **Discord** (OAuth). Le bouton Discord n'apparaît qu'avec `DISCORD_LOGIN=1`.
- Inscription par email : **code à 6 chiffres** envoyé par email pour prouver que l'adresse est la bonne (Resend).
- En prod : un joueur inscrit avec Google ou Discord doit choisir un mot de passe (sa page compte le propose) pour se connecter à l'[[App Windows]].
- **Dans la [[Version 1.3.0]] (PR #70, pas sortie)** : boutons Google et Discord dans la fenêtre de connexion de l'app. L'app appelle `/api/v1/auth/app-link/start`, ouvre le navigateur sur `/app/link/<id>?p=google|discord` ; le joueur se connecte sur le site, vérifie que le code de 4 caractères est celui de l'app et confirme ; l'app interroge `/api/v1/auth/app-link/poll` toutes les 2 s et reçoit la session. Lien gardé en mémoire 10 minutes, utilisable une fois. Code : `licensing/src/app.js` (`appLinks`, `appSignIn`), `app/src/components/LicenseGate.tsx`, `license.rs` (`link_start`, `link_poll`).

## Fonctionnement côté serveur (code de `staging`, 10/11)
- OAuth 2 avec **PKCE** (S256) : `GET /auth/google` ou `/auth/discord` pose le cookie signé `rg_oauth` (fournisseur, `state`, vérificateur, page de retour ; 10 min, chemin `/auth`) puis envoie chez le fournisseur. Scopes : `openid email profile` (Google, avec choix du compte), `identify email` (Discord, jeton révoqué juste après la lecture du profil).
- Retour `/auth/:provider/callback` (30 par heure et par IP) : `state` vérifié, profil lu, puis `userForIdentity` : identité déjà connue → ce compte ; sinon il faut un e-mail **vérifié** chez le fournisseur ; compte existant avec cet e-mail relié, ou nouveau compte **sans mot de passe** (`password_hash = 'none'`) ; un compte qui a déjà un autre compte Google (ou Discord) est refusé. Un compte banni est refusé.
- Messages sur la page de connexion : `oauthcancel`, `oauthfail`, `oauthlimit`, `banned`, `googleemail` / `discordemail` (e-mail non vérifié), `googleother` / `discordother` (autre compte déjà relié).
- Un nouveau compte passe par la page profil de bienvenue ; un achat en attente (cookie `rg_claim`) est rattaché.
- Le code à 6 chiffres de l'inscription par e-mail (`EMAIL_VERIFICATION`) : 15 min, 5 essais, 5 envois par heure et par adresse ; pas de code quand l'adresse est celle de l'achat qui vient d'être payé.
- Ne pas confondre avec la liaison du Discord pour le **rôle Pro** (`/account/discord`, [[discord.js]]).

## Code
[[oauth.js]] (fournisseurs), [[licensing.js]] (`userForIdentity`, codes d'inscription), [[app.js]] (routes `/auth/…`, `/signup/verify`, `/app/link/:id`, `/api/v1/auth/app-link/*`), [[views.js]] (boutons). Tables : [[Table oauth_identities]], [[Table signup_codes]], [[Table users]]. Carte : [[Code du serveur]].

Liens : [[Serveur de licences]], [[Site]], [[Discord]].
