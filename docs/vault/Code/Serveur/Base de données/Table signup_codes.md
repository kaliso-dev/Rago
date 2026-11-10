---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 246-256
maj: 2026-11-10
---
# Table signup_codes

Les inscriptions qui attendent le code à 6 chiffres envoyé par e-mail (`EMAIL_VERIFICATION`, 25/10/2026). Le compte n'est créé qu'après le bon code. Définie dans [[schema.sql]] (lignes 246-256). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | TEXT | clé primaire | `sgn_…`, gardé dans le cookie signé `rg_signup` | [[licensing.js]] (`startSignup`) |
| `email` | TEXT | NOT NULL | Adresse en minuscules | [[licensing.js]] |
| `password_hash` | TEXT | NOT NULL | Mot de passe déjà haché (scrypt) du futur compte | [[licensing.js]] |
| `code_hash` | TEXT | NOT NULL | Empreinte du code liée à l'id (`signupCodeHash`) | [[licensing.js]] (création, renvoi) |
| `attempts` | INTEGER | NOT NULL, défaut 0 | Essais ; compté **avant** la comparaison ; 5 au plus (`SIGNUP_CODE_TRIES`) | [[licensing.js]] |
| `sent_at` | BIGINT | NOT NULL | Dernier envoi du code | [[licensing.js]] |
| `expires_at` | BIGINT | NOT NULL | Envoi + 15 minutes (`SIGNUP_CODE_TTL`) | [[licensing.js]] |
| `created_at` | BIGINT | NOT NULL | Début de l'inscription (un renvoi n'est accepté que dans les 24 h) | [[licensing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id` ; index `signup_codes_email (email)`.

## Qui écrit, qui lit

- **Écrit** : [[licensing.js]] : création (supprime d'abord les demandes du même e-mail et celles expirées depuis plus d'un jour), renvoi d'un nouveau code, essais, suppression quand le compte est créé. [[retention.js]] : suppression un jour après expiration.
- **Lit** : [[licensing.js]] (`verifySignup`, `resendSignup`), via [[app.js]] (`/signup/verify`, `/signup/resend`).

## Durée de vie

Purge horaire ([[retention.js]]) des lignes expirées depuis plus d'un jour. Pas de lien avec `users` : `deleteAccount` ([[support.js]]) ne la touche pas (les lignes partent seules par la purge).

## Liens avec le reste

Tables liées : [[Table users]], [[Table audit]].

## À savoir avant de modifier

- Contient un hachage de mot de passe : ne jamais l'exporter.
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
