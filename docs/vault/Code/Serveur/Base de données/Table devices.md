---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 51-62
maj: 2026-11-10
---
# Table devices

Le PC auquel une licence est liée : **un seul** par licence (la clé primaire est `license_id`). Définie dans [[schema.sql]] (lignes 51-62). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `license_id` | TEXT | clé primaire, FK `licenses(id)` | Licence | [[licensing.js]] (`activate`) ; déplacée vers une nouvelle licence par [[licensing.js]] (remplacement) et [[admin.js (serveur)]] (action `vie`) |
| `id` | TEXT | NOT NULL, UNIQUE | `dev_…`, mis dans le jeton de licence (`did`) | [[licensing.js]] |
| `machine_guid` | TEXT | — | Empreinte (64 caractères hexadécimaux hachés par l'app) du `MachineGuid` Windows | [[licensing.js]] (complétée seulement si vide) |
| `smbios_uuid` | TEXT | — | Empreinte de l'UUID SMBIOS | [[licensing.js]] |
| `board_serial` | TEXT | — | Empreinte du numéro de la carte mère | [[licensing.js]] |
| `name` | TEXT | — | Nom du PC (64 caractères) | [[licensing.js]] (à chaque activation ou rafraîchissement) |
| `os` | TEXT | — | Version de Windows | [[licensing.js]] |
| `app_version` | TEXT | — | Version de l'app | [[licensing.js]] |
| `bound_at` | BIGINT | NOT NULL | Première activation sur ce PC | [[licensing.js]] |
| `last_seen_at` | BIGINT | NOT NULL | Dernier contact de l'app | [[licensing.js]] |
| `last_ip` | TEXT | — | Dernière adresse IP vue | [[licensing.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `license_id` ; `UNIQUE (id)`.

## Qui écrit, qui lit

- **Écrit** : [[licensing.js]] (`activate` dans une transaction avec verrou de ligne : deux PC en même temps → un seul gagne ; `resetDevice` supprime la ligne), [[admin.js (serveur)]] (déplacement), [[support.js]] (suppression du compte).
- **Lit** : [[licensing.js]] (`sameDevice` de [[fingerprint.js]], règle 2 sur 3), [[affiliates.js]] (même PC que l'affilié ?), [[admin.js (serveur)]] (fiche, PC actifs sur 7 jours).

## Durée de vie

Supprimée quand le PC est libéré (support, admin, joueur lui-même) ou le compte supprimé. Pas de purge.

## Liens avec le reste

Tables liées : [[Table licenses]], [[Table account_devices]], [[Table referrals]], [[Table audit]].

## À savoir avant de modifier

- Sur un PC déjà lié, seuls les identifiants **vides** sont complétés (`COALESCE`) : un PC ne peut pas « glisser » vers un autre pièce par pièce ([[fingerprint.js]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
