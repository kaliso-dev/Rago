---
type: fonctionnalité
tags: [fonctionnalité, serveur, site]
maj: 2026-10-31
---
# Connexion Google et Discord

Demandée le 25/10, en ligne le 28/10 (PR #61). Code : `licensing/src/oauth.js`.

- Inscription et connexion au compte sur le site avec **Google** ou **Discord** (OAuth). Le bouton Discord n'apparaît qu'avec `DISCORD_LOGIN=1`.
- Inscription par email : **code à 6 chiffres** envoyé par email pour prouver que l'adresse est la bonne (Resend).
- Limite : un joueur inscrit avec Google ou Discord doit choisir un mot de passe (sa page compte le propose) pour se connecter à l'[[App Windows]]. Se connecter à l'app directement avec Google/Discord = chantier séparé ([[Prochaines étapes]]).

Liens : [[Serveur de licences]], [[Site]], [[Discord]].
