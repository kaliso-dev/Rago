---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 285-300
maj: 2026-11-10
---
# Table network_results

Le résultat d'un test réseau pour un serveur cible (une ligne par cible et par rapport). Définie dans [[schema.sql]] (lignes 285-300). Fiche parente : [[Code du serveur]].

(code de `staging`, 10/11)

## Colonnes

| Colonne | Type | Défaut, contrainte | Sens | Écrite par |
|---|---|---|---|---|
| `report_id` | TEXT | NOT NULL, FK `network_reports(id)` ON DELETE CASCADE | Rapport | [[network.js]] |
| `target` | TEXT | NOT NULL | Cible : `hypixel`, `minemen`, `paris`, `frankfurt`, `london`, `stockholm`, `madrid`, `virginia`, `internet` (liste `TARGETS` de l'app) | [[network.js]] |
| `method` | TEXT | — | `mc`, `tcp` ou `icmp` | [[network.js]] |
| `ping` | DOUBLE PRECISION | — | Moyenne (ms) | [[network.js]] |
| `median` | DOUBLE PRECISION | — | Médiane (ms), utilisée par la page `/admin/reseau` | [[network.js]] |
| `best` | DOUBLE PRECISION | — | Meilleur (ms) | [[network.js]] |
| `worst` | DOUBLE PRECISION | — | Pire (ms) | [[network.js]] |
| `jitter` | DOUBLE PRECISION | — | Gigue (ms) | [[network.js]] |
| `loss` | DOUBLE PRECISION | NOT NULL | Pertes de 0 à 1 | [[network.js]] |
| `samples` | INTEGER | — | Mesures | [[network.js]] |
| `spikes` | INTEGER | — | Pics | [[network.js]] |
| `error` | TEXT | — | `dns` ou `timeout` | [[network.js]] |

Dates en millisecondes depuis 1970 (`BIGINT`), comme partout dans la base. RLS activée sans politique : seule la connexion du serveur ([[Supabase]]) lit et écrit.

## Index et contraintes

Clé primaire (`report_id`, `target`).

## Qui écrit, qui lit

- **Écrit** : [[network.js]] (`saveReport`).
- **Lit** : [[network.js]] (médianes et pertes par ville ou fournisseur ; toutes les colonnes dans le CSV).

## Durée de vie

Effacée avec son rapport (cascade), donc après 12 mois.

## Liens avec le reste

Tables liées : [[Table network_reports]], [[Table audit]], [[Table devices]].

## À savoir avant de modifier

- Les cibles viennent de `nettest.rs` côté app ([[nettest.rs]]).
- Toute modification du schéma passe par [[schema.sql]] (changements idempotents seulement) : le serveur le rejoue à chaque démarrage ([[db.js]]).
