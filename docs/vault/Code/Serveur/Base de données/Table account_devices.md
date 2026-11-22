---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 127-135
maj: 2026-11-10
---
# Table account_devices

Les PC depuis lesquels un compte s'est connecté dans l'app, avec ou sans licence (app gratuite comprise). Sert à refuser qu'un affilié compte un achat activé sur son propre PC. Définie dans [[schema.sql]] (lignes 127-135). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `user_id` | TEXT | NOT NULL, FK `users(id)` ON DELETE CASCADE, clé primaire avec `fp` | Compte | [[affiliates.js]] (`rememberDevice`) |
| `fp` | TEXT | NOT NULL | `machine_guid|smbios_uuid|board_serial` | [[affiliates.js]] |
| `machine_guid` | TEXT | — | Empreinte (voir [[fingerprint.js]]) | [[affiliates.js]] |
| `smbios_uuid` | TEXT | — | Empreinte | [[affiliates.js]] |
| `board_serial` | TEXT | — | Empreinte | [[affiliates.js]] |
| `seen_at` | BIGINT | NOT NULL | Dernière connexion depuis ce PC | [[affiliates.js]] (mise à jour si la ligne existe) |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire (`user_id`, `fp`).

## Qui écrit, qui lit

- **Écrit** : [[affiliates.js]] (`rememberDevice`, à chaque connexion de l'app : `appSignIn` d'[[app.js]]).
- **Lit** : [[affiliates.js]] (`same_device`), [[admin.js (serveur)]] (10 derniers sur la fiche joueur).

## Durée de vie

Jamais purgée ; effacée avec le compte.

## Liens avec le reste

Tables liées : [[Table devices]], [[Table referrals]], [[Table users]].

## À savoir avant de modifier

- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
