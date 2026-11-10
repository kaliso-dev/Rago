---
type: technique
tags: [technique, supabase, base-de-données]
maj: 2026-11-10
---
# Supabase

Base de données Postgres et fichiers (Storage) du [[Serveur de licences]]. Seul le serveur y accède, avec la clé `service_role` ; ni l'app ni le site ne parlent à Supabase. Voir [[Architecture du serveur]], [[Railway]].

## Projets
| Projet | Pour | Remarques |
|---|---|---|
| Projet de prod (nommé `rago` dans le guide) | serveur Railway de prod | région conseillée par le guide : West EU (Paris), `aws-0-eu-west-3` ; **offre gratuite** (Sofiene, 10/11, q66), donc sans sauvegarde quotidienne. **URGENT** : Sofiene a reçu un e-mail de Supabase demandant de passer à l'offre payante (25 $/mois) sous peine de **suppression du projet le 05/12/2026**. La suppression perdrait toute la base, dont `server_secrets` (clé de signature des licences) : voir [[Clés et secrets]] (le guide conseillait de passer en Pro dès les premiers revenus pour les sauvegardes quotidiennes) |
| `rago-staging` | serveur Railway de staging | offre gratuite : **se met en pause après une semaine sans activité** (le serveur de staging ne démarre plus : relancer le projet dans Supabase). Ne jamais y copier la base de prod |

Connexion : `DATABASE_URL` = URI du **Session pooler** (port 5432). Clés : `SUPABASE_URL` (`https://<ref>.supabase.co`) et `SUPABASE_SERVICE_ROLE_KEY` (clé legacy `eyJ…` ou nouvelle `sb_secret_…`, les deux marchent). Valeurs : seulement dans Railway, jamais ici ([[Clés et secrets]]).

## Storage
| Bucket | Privé | Contenu | Qui écrit |
|---|---|---|---|
| `downloads` | oui | les installateurs `Rago Optimizer_<version>_x64-setup.exe` et leur signature `<exe>.sig` | **Sofiene, à la main** ([[Publier une version]]) |
| `avatars` | oui | photos de profil WebP 256 × 256 | le serveur (créé seul à la première photo) |

- Le serveur sert **le `.exe` le plus récent du bucket** (tri par date de dépôt), pas forcément celui de `INSTALLER_OBJECT` (seulement un repli). La version est lue dans le nom : garder le nom donné par la CI.
- La mise à jour automatique exige le `.sig` à côté de l'exe ; sinon `/api/v1/update/status` répond `ok: false` avec la raison.
- Liens de téléchargement : signés par l'API Storage, valables 5 min.
- **Jamais l'exe de test** (« Rago Optimizer Staging ») dans le bucket de prod.

## Schéma (`licensing/supabase/schema.sql`)
- Fichier **idempotent** (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`) **rejoué à chaque démarrage** du serveur (`db.js`, 6 essais si une table est verrouillée). **Il n'y a pas d'outil de migration** : une évolution = une ligne ajoutée à la fin de ce fichier, jamais une modification d'une ligne existante, jamais de `DROP`.
- Dates en **millisecondes** (`BIGINT`). E-mails en minuscules. Identifiants texte préfixés (`usr_`, `lic_`, `dev_`…).
- **RLS activé sans politique** sur toutes les tables : l'API publique de Supabase (clés `anon`) ne lit ni n'écrit rien. Toute nouvelle table doit avoir sa ligne `ENABLE ROW LEVEL SECURITY` à la fin du fichier.
- Le serveur parle SQL avec des `?` (convertis en `$1…` par `db.js`) ; transactions par `db.tx()` ; `FOR UPDATE` pour les licences.

### Tables
| Table | Contenu |
|---|---|
| `users` | compte : e-mail unique, `password_hash` (scrypt, ou `none` pour un compte Google/Discord sans mot de passe), `display_name`, `avatar_key` |
| `web_sessions`, `api_sessions` | sessions du site (30 jours) et jetons de compte de l'app (180 jours), stockés hachés |
| `password_resets`, `signup_codes` | liens de mot de passe (1 h) ; inscriptions en attente du code à 6 chiffres (15 min, 5 essais) |
| `oauth_identities` | comptes Google et Discord reliés (provider, subject) |
| `licenses` | une ligne par achat ou don : `key`, `status` (`active`/`revoked`), `status_reason` (`refunded`, `disputed`, `manual`, `subscription_ended`, `replaced`, `test_mode`), `source` (`stripe`, `grant`, `affiliate`…), `plan` (`month`, `year`, `lifetime`, `reward`), ids Stripe, `current_period_end`, `cancel_at_period_end`, `token_version` (à incrémenter = tous les jetons de cette licence invalides), `claim_token_hash`, `referral_code` |
| `devices` | **le** PC lié à une licence (empreintes hachées, nom, OS, version, dernière vue, dernière IP) |
| `account_devices` | PC où un compte s'est connecté (même gratuit), pour l'anti-fraude de l'affiliation |
| `stripe_events` | événements webhook déjà traités (idempotence), avec `livemode` |
| `audit` | journal de sécurité (12 mois) |
| `server_secrets` | **clé de signature des licences, secret de session, nom de l'environnement propriétaire** : ne jamais vider, ne jamais copier vers staging |
| `affiliates`, `referrals` | codes d'affiliés (et leur code promo Stripe), filleuls `pending`/`counted`/`void` |
| `site_settings` | réglages de `/admin` (pop-up du site) |
| `reviews` | un avis par compte, `published` ou `hidden` |
| `discord_links`, `discord_rewards` | liaison Discord et rôle Pro ; récompenses VIP/MVP/boost données |
| `discord_joins`, `discord_invite_links`, `discord_invite_bonus`, `discord_invite_roles` | bot communauté : arrivées et invitations, liens partenaires, bonus repris d'Invite Tracker, rôles donnés |
| `network_reports`, `network_results` | tests réseau de l'app (ville, région, pays, fournisseur, sans IP ; 12 mois) |
| `trials` | essais gratuits (e-mail, empreinte de carte ; 2 ans) |

## Requêtes utiles (support)
Préférer `npm run admin -- show <email>` (depuis `licensing/`, avec le `DATABASE_URL` voulu dans le terminal) au SQL Editor : il croise compte, licence, PC, événements et achats non rattachés. Le SQL Editor de Supabase sert à lire ; toute écriture passe par une commande `admin` ou une PR.

## Sauvegarde de la clé de signature
`npm run admin -- export-keys` affiche `LICENSE_SIGNING_KEY` et `SESSION_SECRET` : à garder dans le gestionnaire de mots de passe de Sofiene et en variables Railway, pour ne plus dépendre de la base. **Pas fait au 10/11** (q67) : la clé de signature n'existe que dans la base Supabase de prod. À faire avant toute autre chose.
