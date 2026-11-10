---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 273-284
maj: 2026-11-10
---
# Table network_reports

Les tests réseau envoyés par l'app (RAG-50) : d'où viennent les joueurs et leur ping vers chaque serveur, pour choisir où placer de futurs relais. **Aucune adresse IP** : ville, région, pays et fournisseur en sont tirés ([[geo.js]]), puis elle est oubliée. Définie dans [[schema.sql]] (lignes 273-284). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `id` | TEXT | clé primaire | Jeton aléatoire (12 octets) | [[network.js]] (`saveReport`) |
| `at` | BIGINT | NOT NULL | Date du rapport | [[network.js]] |
| `device` | TEXT | — | `X-Rago-Device` de l'app : un hachage, le même PC d'un test à l'autre | [[network.js]] |
| `app_version` | TEXT | — | Version de l'app | [[network.js]] |
| `country` | TEXT | — | Code ISO du pays | [[network.js]] |
| `region` | TEXT | — | Région | [[network.js]] |
| `city` | TEXT | — | Ville | [[network.js]] |
| `asn` | INTEGER | — | Numéro du réseau du fournisseur | [[network.js]] |
| `isp` | TEXT | — | Nom du fournisseur (120 caractères au plus) | [[network.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire `id` ; index `network_reports_at (at)`.

## Qui écrit, qui lit

- **Écrit** : [[network.js]] (insertion dans une transaction avec les résultats ; purge).
- **Lit** : [[network.js]] (`networkSummary` par ville et par fournisseur, `networkCsv`), [[admin.js (serveur)]] (tests des 7 derniers jours sur l'accueil).

## Durée de vie

Purge horaire après **12 mois** (`purgeNetworkReports`, appelée par [[server.js]]).

## Liens avec le reste

Tables liées : [[Table network_results]], [[Table audit]], [[Table devices]].

## À savoir avant de modifier

- Voir [[Test réseau]].
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
