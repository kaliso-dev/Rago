---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 5-10, 145-147, 315-316
maj: 2026-11-10
---
# Table users

Un compte Rago (site de compte, app, Discord). Créé à l'inscription par e-mail, par Google/Discord, par le support (`create-user`) ou au rattachement d'un achat. Définie dans [[schema.sql]] (lignes 5-10, 145-147, 315-316). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | TEXT | clé primaire | `usr_` + 16 caractères base64url ([[crypto.js]]) | [[licensing.js]] (`createUser`) |
| `email` | TEXT | NOT NULL, UNIQUE | Adresse en minuscules (normalisée par `normEmail`) | [[licensing.js]] |
| `password_hash` | TEXT | NOT NULL | `scrypt$…` (N=2^15, r=8, p=1, NFKC) ; `none` (`NO_PASSWORD`) pour un compte créé par Google/Discord sans mot de passe | [[licensing.js]] (`createUser`, `setPassword`) |
| `created_at` | BIGINT | NOT NULL | Date d'inscription (ms) | [[licensing.js]] |
| `display_name` | TEXT | — | Nom public affiché avec l'avis (2 à 32 caractères), ajouté le 09/10/2026 | [[profile.js]] (`setName`), depuis [[app.js]], [[admin.js (serveur)]], [[admin.js (script serveur)]] |
| `avatar_key` | TEXT | — | Nom du fichier WebP de la photo dans le bucket Supabase `avatars` (`AVATAR_FILE`) | [[profile.js]] (`replaceAvatar`, `removeAvatar`) |
| `avatar_updated_at` | BIGINT | — | Date du dernier changement de photo | [[profile.js]] |
| `banned_at` | BIGINT | — | Date du bannissement (10/11/2026) ; non nul = compte banni | [[licensing.js]] (`banUser`, `unbanUser`) depuis [[admin.js (serveur)]] |
| `banned_reason` | TEXT | — | Raison saisie sur `/admin` | [[licensing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id` ; `UNIQUE (email)`. Les sessions, liens de mot de passe, liaisons Google/Discord, affiliation, filleuls, avis, empreintes de PC et liaison Discord pointent vers `users(id)` avec `ON DELETE CASCADE` ; `licenses.user_id` pointe sans cascade ; `discord_rewards.user_id` passe à `NULL`.

## Qui écrit, qui lit

- **Écrit** : [[licensing.js]] (création, mot de passe, bannissement), [[profile.js]] (nom, photo), [[support.js]] (suppression).
- **Lit** : Presque tous les modules : [[licensing.js]] (connexion, sessions), [[app.js]], [[reviews.js]] (nom et photo des avis), [[profile.js]], [[support.js]], [[admin.js (serveur)]] (13 requêtes), [[admin.js (script serveur)]].

## Durée de vie

Jamais purgée automatiquement. Suppression RGPD par `deleteAccount` ([[support.js]]) : la ligne est effacée, ce qui efface en cascade les tables liées. Un compte banni n'ouvre plus de session : `userForWebSession` et `userForApiSession` ignorent les lignes avec `banned_at`.

## Liens avec le reste

Tables liées : [[Table web_sessions]], [[Table api_sessions]], [[Table licenses]], [[Table oauth_identities]], [[Table reviews]], [[Table discord_links]].

## À savoir avant de modifier

- Un compte Google/Discord a `password_hash = 'none'` : `verifyPassword` exige `scrypt$`, donc aucun mot de passe ne correspond ; il doit en choisir un pour l'app Windows ([[Connexion Google et Discord]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
