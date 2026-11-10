---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 223-228
maj: 2026-11-10
---
# Table discord_invite_links

Les liens partenaires suivis, créés avec `/partner-link` : leurs arrivées apparaissent dans `/growth` et ne comptent pour aucun membre. Définie dans [[schema.sql]] (lignes 223-228). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `code` | TEXT | clé primaire | Code de l'invitation Discord | [[community.js]] |
| `label` | TEXT | NOT NULL | Nom du partenaire (affiché dans `/growth`) | [[community.js]] |
| `created_by` | TEXT | — | Id Discord du membre du staff | [[community.js]] |
| `created_at` | BIGINT | NOT NULL | Création | [[community.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `code`.

## Qui écrit, qui lit

- **Écrit** : [[community.js]] (`/partner-link`, audit `discord.partner_link`).
- **Lit** : [[community.js]] (exclusion du comptage `VALID`, source dans `growthStats`).

## Durée de vie

Jamais supprimée.

## Liens avec le reste

Tables liées : [[Table discord_joins]], [[Table discord_invite_bonus]], [[Table audit]].

## À savoir avant de modifier

- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
