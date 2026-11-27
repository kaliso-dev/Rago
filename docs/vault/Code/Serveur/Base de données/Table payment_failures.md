---
type: code
tags: [code, serveur, base-de-données]
fichier: licensing/supabase/schema.sql
maj: 2026-11-27
---
# Table payment_failures

Les paiements refusés d'abonnés qui ont déjà payé (27/11, q110) : une ligne par épisode d'échec d'un abonnement, avec son échéance de 3 jours. Définie dans [[schema.sql]], créée au démarrage du serveur (rien à créer à la main dans Supabase). Écrite et lue par [[dunning.js]]. Fiche parente : [[Code du serveur]]. PR « Paiements refusés » vers `staging` (fil HUB-d1451f), non fusionnée.

| Colonne | Type | Sens |
|---|---|---|
| `id` | BIGSERIAL, clé primaire | — |
| `subscription_id` | TEXT NOT NULL | Abonnement Stripe du Premium |
| `license_id`, `user_id` | TEXT | Licence et compte |
| `invoice_id` | TEXT | Facture refusée (la première) |
| `first_failed_at` | BIGINT NOT NULL | Premier échec (ms) |
| `deadline_at` | BIGINT NOT NULL | `first_failed_at` + 3 jours : fin de Premium si toujours impayé |
| `reminded_at` | BIGINT | Rappel du jour 2 envoyé |
| `resolved_at` | BIGINT | Payé à temps |
| `ended_at` | BIGINT | Premium arrêté (ou licence déjà inactive) |

Index partiel `payment_failures_open (subscription_id)` sur les lignes ouvertes. RLS activée sans politique ([[Supabase]]). Liée : [[Table licenses]], [[Paiements Stripe]].
