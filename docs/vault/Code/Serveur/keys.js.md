---
type: code
tags: [code, serveur, javascript, sécurité]
fichier: licensing/scripts/keys.js
lignes: 12
maj: 2026-11-10
---
# keys.js

Script `npm run keys` qui génère une **nouvelle** paire de clés Ed25519 et un `SESSION_SECRET`. **Ne jamais le lancer** pour le vrai serveur : changer la clé de signature rend invalides toutes les licences des apps installées. Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Outil du tout début du projet. Depuis, le serveur crée ses clés lui-même au premier démarrage et les garde dans [[Table server_secrets]] ([[db.js]], [[tokens.js]]) ; `npm run admin -- export-keys` ([[admin.js (script serveur)]]) sert à les sauvegarder. `licensing/CLAUDE.md` et [[Clés et secrets]] interdisent de lancer ce script.

## Ce que le fichier fait

1. `generateKeyPairSync('ed25519')`.
2. Affiche `LICENSE_SIGNING_KEY=` suivi de la clé privée PEM (pkcs8) en base64, `SESSION_SECRET=` suivi de 32 octets aléatoires en hexadécimal, puis la clé publique PEM à mettre dans l'app ([[Licence dans l'app]]).

Rien n'est écrit sur le disque ni en base.

## Données touchées

Aucune.

## Liens avec le reste

[[tokens.js]] (signature des jetons), [[config.js]] (`LICENSE_SIGNING_KEY`, `SESSION_SECRET`), [[Clés et secrets]].

## Tests

Aucun ([[Tests du serveur]]). Les tests utilisent `docs/test/test-public-key.pem` et `docs/test/test.env` (clés de test seulement).

## À savoir avant de modifier

- Une sortie de ce script ne doit jamais être collée dans Railway pour la prod.
