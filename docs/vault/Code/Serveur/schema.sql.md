---
type: code
tags: [code, serveur, sql, base-de-données]
fichier: licensing/supabase/schema.sql
lignes: 367
maj: 2026-11-14
---
# schema.sql

Le schéma de la base Postgres (Supabase) du serveur de comptes et licences : 26 tables. **Idempotent** : le serveur le rejoue à chaque démarrage. Fiche parente : [[Code du serveur]]. Hébergement : [[Supabase]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

`applySchema` de [[db.js]] exécute tout le fichier à chaque ouverture de la base (serveur, `npm run admin`, tests), après le contrôle de propriétaire de la base et avant `claimDatabase`. Il est aussi copié dans l'image Docker (`COPY supabase`, voir [[Documentation et configuration du serveur]]). Une base neuve est donc créée par le serveur lui-même ; une base existante reçoit les colonnes et index manquants.

## Règles du fichier

- Seulement des changements **idempotents** : `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, et un `UPDATE` sans effet la deuxième fois. Jamais de `DROP` ni de renommage (`licensing/CLAUDE.md`).
- Dates en `BIGINT` (millisecondes depuis 1970), pas de `timestamp`.
- **RLS activée sur les 26 tables, sans aucune politique** (lignes 318-342, et 365 pour `route_subscriptions`) : l'API publique de Supabase (clés `anon` / `authenticated`) ne peut ni lire ni écrire ; seule la connexion directe du serveur (`DATABASE_URL`) le peut.
- Identifiants en texte, avec un préfixe (`usr_`, `lic_`, `dev_`, `sgn_`, `ref_`, `drw_`), créés par [[crypto.js]].

## Les tables (ordre du fichier)

| Table | Lignes | Ajout | Rôle |
|---|---|---|---|
| [[Table users]] | 5-10, 145-147, 315-316 | origine ; profil 09/10 ; bannissement 10/11 | Comptes |
| [[Table web_sessions]] | 12-17 | origine | Sessions du site |
| [[Table licenses]] | 20-48, 123 | origine ; abonnements 05/10 ; `referral_code` | Achats et Premium |
| [[Table devices]] | 51-62 | origine | PC lié à une licence |
| [[Table password_resets]] | 65-70 | origine | Liens de mot de passe |
| [[Table stripe_events]] | 72-77 | origine ; `livemode` 10/10 | Webhooks traités |
| [[Table audit]] | 79-87 | origine | Journal |
| [[Table affiliates]] | 90-96, 112-119 | affiliation | Affiliés et code promo Stripe |
| [[Table referrals]] | 99-110 | affiliation | Filleuls |
| [[Table account_devices]] | 127-135 | affiliation | PC vus par compte |
| [[Table server_secrets]] | 137-141 | origine | Clés créées par le serveur, environnement |
| [[Table reviews]] | 150-159 | 09/10/2026 | Avis |
| [[Table api_sessions]] | 162-168 | 09/10/2026 | Sessions de l'app |
| [[Table site_settings]] | 172-176 | 09/10/2026 | Pop-up du site |
| [[Table discord_links]] | 180-192 | 10/10/2026 | Discord relié, rôle Pro |
| [[Table discord_rewards]] | 193-206 | 10/10/2026 | Récompenses Discord |
| [[Table discord_joins]] | 208-221 | 12/10/2026 | Arrivées sur le serveur Discord |
| [[Table discord_invite_links]] | 223-228 | bot communauté | Liens partenaires |
| [[Table discord_invite_bonus]] | 230-235 | bot communauté | Invitations d'avant le bot |
| [[Table discord_invite_roles]] | 237-242 | bot communauté | VIP/MVP donnés par le bot |
| [[Table signup_codes]] | 246-256 | 25/10/2026 | Inscriptions en attente du code |
| [[Table oauth_identities]] | 260-271 | 25/10/2026 | Connexion Google/Discord |
| [[Table network_reports]] | 273-284 | RAG-50 | Tests réseau |
| [[Table network_results]] | 285-300 | RAG-50 | Résultats par cible |
| [[Table trials]] | 303-312 | 04/11/2026 | Essais gratuits |
| [[Table route_subscriptions]] | 344-367 | 13/11/2026 ; `billing_interval` 14/11 | Option Rago Route (3 $/mois ou 17,99 $/an) |

## Relations

- `users` est la racine : `web_sessions`, `api_sessions`, `password_resets`, `affiliates`, `referrals` (affilié et filleul), `account_devices`, `reviews`, `discord_links`, `oauth_identities` → `ON DELETE CASCADE` ; `discord_rewards.user_id` → `ON DELETE SET NULL` ; `licenses.user_id` → sans cascade (la licence est anonymisée avant, par [[support.js]]).
- `devices.license_id` et `referrals.license_id` → `licenses(id)` sans cascade.
- `network_results.report_id` → `network_reports(id)` `ON DELETE CASCADE`.
- `audit`, `trials`, `stripe_events`, `signup_codes` et les tables `discord_*` du bot communauté n'ont pas de clé étrangère.

## Migration de données

Ligne 114 : `UPDATE affiliates SET rewards = 1 WHERE rewards = 0 AND reward_granted_at IS NOT NULL AND reward_license_id IS NOT NULL` (les récompenses données avant l'ajout du compteur).

## Liens avec le reste

Appliqué par [[db.js]] ; tables utilisées par tous les modules (voir chaque note `Table …` et [[Code du serveur]]). Purges : [[retention.js]] et [[network.js]].

## Tests

Rejoué à chaque test (PGlite) et, dans la CI, sur un vrai Postgres 16 ; tests « real Postgres » : table verrouillée au démarrage, staging sur la base de prod arrêté avant le schéma ([[Tests du serveur]]).

## À savoir avant de modifier

- Commentaires en retard sur le code : `licenses.status_reason` (le code écrit aussi `subscription_ended`, `replaced`, `duplicate`, `banned`, `deleted`, `test_mode`), `licenses.source` (aussi `affiliate`, `discord`), `licenses.plan` (aussi `reward`), `referrals.void_reason` (aussi `subscription_ended`, `revoked`, `test_mode`), `discord_rewards.kind` (aussi `boost`, `boost2`).
- Le commentaire « Secrets generated by the server on first boot… » (ligne 121) est placé au-dessus de `licenses.referral_code` au lieu de `server_secrets`.
- Une nouvelle table doit recevoir sa ligne `ENABLE ROW LEVEL SECURITY`.
- Les sessions et liens de mot de passe expirés ne sont jamais purgés ([[Table web_sessions]], [[Table api_sessions]], [[Table password_resets]]).
