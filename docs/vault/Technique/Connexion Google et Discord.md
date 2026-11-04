---
type: fonctionnalité
tags: [fonctionnalité, serveur, site]
maj: 2026-11-04
---
# Connexion Google et Discord

Demandée le 25/10, en ligne le 28/10 (PR #61). Code : `licensing/src/oauth.js`.

- Inscription et connexion au compte sur le site avec **Google** ou **Discord** (OAuth). Le bouton Discord n'apparaît qu'avec `DISCORD_LOGIN=1`.
- Inscription par email : **code à 6 chiffres** envoyé par email pour prouver que l'adresse est la bonne (Resend).
- En prod : un joueur inscrit avec Google ou Discord doit choisir un mot de passe (sa page compte le propose) pour se connecter à l'[[App Windows]].
- **Dans la [[Version 1.3.0]] (PR #70, pas sortie)** : boutons Google et Discord dans la fenêtre de connexion de l'app. L'app appelle `/api/v1/auth/app-link/start`, ouvre le navigateur sur `/app/link/<id>?p=google|discord` ; le joueur se connecte sur le site, vérifie que le code de 4 caractères est celui de l'app et confirme ; l'app interroge `/api/v1/auth/app-link/poll` toutes les 2 s et reçoit la session. Lien gardé en mémoire 10 minutes, utilisable une fois. Code : `licensing/src/app.js` (`appLinks`, `appSignIn`), `app/src/components/LicenseGate.tsx`, `license.rs` (`link_start`, `link_poll`).

Liens : [[Serveur de licences]], [[Site]], [[Discord]].
