---
type: code
tags: [code, serveur, carte]
fichier: licensing/
lignes: 8534 (src) + 755 (scripts et JS du navigateur) + 1085 (CSS) + 342 (schema)
maj: 2026-11-10
---
# Code du serveur

La carte du code du **serveur de comptes et licences** (`licensing/`, Node ≥ 22.5, Hono 4, Postgres Supabase, Stripe, hébergé sur Railway) : chaque fichier, qui importe qui, le trajet d'une requête, les tâches de fond, le parcours achat → licence → app et toutes les tables. Vue fonctionnelle : [[Serveur de licences]] ; architecture : [[Architecture du serveur]] ; routes : [[API du serveur]].

(code de `staging` @ `ee77d4f`, 10/11 ; la page « Cerveau » de l'admin, en cours d'ajout et pas commitée, n'est pas décrite)

## Les fichiers

### Démarrage et socle
| Fichier | Lignes | Rôle |
|---|---|---|
| [[server.js]] | 85 | Point d'entrée : config, base, clés, Stripe, e-mails, bots Discord, application ; tâches de fond ; `serve` sur `PORT`. |
| [[config.js]] | 271 | Lit et vérifie toutes les variables d'environnement (`loadConfig`), avertissements, staging. |
| [[db.js]] | 163 | Connexion Postgres (`pg`) ou PGlite, schéma rejoué, garde-fou d'environnement, secrets en base, `audit()`. |
| [[crypto.js]] | 56 | Mots de passe scrypt, identifiants `usr_…`, clés `RAGO-…`, jetons aléatoires, valeurs signées (cookies). |
| [[tokens.js]] | 39 | Jetons EdDSA/Ed25519 (`license`, `access`, `route`), `kid`. |
| [[fingerprint.js]] | 51 | Objet `device` de l'app et règle « 2 identifiants sur 3 ». |

### Routes et pages
| Fichier | Lignes | Rôle |
|---|---|---|
| [[app.js]] | 1686 | Toutes les routes : site de compte, webhook Stripe, API `/api/v1` ; middlewares de sécurité. |
| [[views.js]] | 888 | Pages HTML du site de compte. |
| [[admin.js (serveur)]] | 723 | Routes et actions de `/admin` (dont celles du Cerveau). |
| [[admin-views.js]] | 914 | Pages HTML de `/admin`. |
| [[brain.js]] | 698 | [[Cerveau du vault]] : lecture du dépôt (GitHub ou disque), markdown du vault, graphe. |
| [[brain-views.js]] | 101 | Page HTML du Cerveau (`/admin/cerveau`). |

### Logique métier
| Fichier | Lignes | Rôle |
|---|---|---|
| [[licensing.js]] | 584 | Comptes, sessions, inscription par code, Google/Discord, licences, PC, bannissement, temps offert. |
| [[route-addon.js]] | 95 | Option Rago Route (13/11) : Checkout de l'abonnement à 3 $/mois, table `route_subscriptions`, annulation sans Premium. |
| [[billing.js]] | 560 | Stripe : Checkout, webhooks, abonnements, essai, Lifetime, codes promo, contrôles de mise en ligne. |
| [[affiliates.js]] | 237 | Programme d'affiliation : filleuls, comptage, récompenses. |
| [[promo.js]] | 174 | Pop-up de réduction du site. |
| [[sales.js]] | 193 | Ventes lues dans Stripe pour `/admin`. |
| [[profile.js]] | 199 | Nom public et photo de profil (sharp, Supabase Storage). |
| [[reviews.js]] | 70 | Avis des joueurs. |
| [[support.js]] | 45 | Suppression RGPD d'un compte. |
| [[retention.js]] | 19 | Purges promises par la politique de confidentialité. |

### Services extérieurs
| Fichier | Lignes | Rôle |
|---|---|---|
| [[mailer.js]] | 134 | E-mails (Resend) ; affichés dans le terminal sans clé. |
| [[installer.js]] | 134 | Installateur et mises à jour depuis Supabase Storage (liens signés de 5 min, `.sig`). |
| [[oauth.js]] | 78 | Connexion Google et Discord (OAuth avec PKCE). |
| [[discord.js]] | 459 | Bot du rôle Pro et récompenses Discord ; client REST partagé. |
| [[community.js]] | 459 | Bot communauté : invitations, accueil, commandes slash. |
| [[gateway.js]] | 133 | Connexion WebSocket à la gateway Discord. |
| [[geo.js]] | 108 | Ville et fournisseur d'une IP (bases DB-IP, `mmdb-lib`). |
| [[network.js]] | 123 | Rapports des tests réseau de l'app. |

### Autres fichiers
- Navigateur : [[account.js]], [[admin.js (page admin)]], [[cerveau.js]] (graphe et lecteur du Cerveau) ; styles : [[Styles du serveur (CSS)]], [[cerveau.css]].
- Scripts : [[admin.js (script serveur)]] (`npm run admin`), [[local.js]] (`npm run local`), [[keys.js]] (à ne jamais lancer).
- Base : [[schema.sql]] ; tests : [[Tests du serveur]] ; documentation, `.env.example`, Docker, npm : [[Documentation et configuration du serveur]].

## Qui importe qui

```
server.js ─> config, db, tokens, mailer, billing, discord, community, geo, network, retention, app
app.js ───> crypto, fingerprint, tokens, db, licensing, billing, affiliates, profile, reviews, promo,
            installer, geo, network, discord, oauth, views, admin
admin.js ─> licensing, affiliates, profile, reviews, network, promo, billing, discord, sales, support, db, admin-views,
            brain, brain-views          brain-views ─> views
admin-views ─> views, sales            views ─> crypto, reviews
licensing ─> crypto, db, fingerprint   affiliates ─> crypto, db, fingerprint, licensing
billing ──> affiliates, db, licensing  promo ─> billing
discord ──> billing, crypto, db, licensing
community ─> db, discord, gateway      reviews ─> profile     support ─> profile     network ─> crypto
sans import interne : config, crypto, db, tokens, fingerprint, gateway, geo, installer, mailer, oauth,
                      profile, retention, sales, brain
```
[[server.js]] importe aussi `licensing` (compte de test `DEV_SEED`), `affiliates` et `billing` dynamiquement pour la passe horaire. Bibliothèques chargées à la demande : `pg` ou PGlite ([[db.js]]), `sharp` au premier envoi de photo ([[profile.js]]). Le script [[admin.js (script serveur)]] importe `config`, `db`, `licensing`, `affiliates`, `profile`, `reviews`, `discord`, `community`, `support`, `billing`, `promo`.

## Le trajet d'une requête

Détail complet dans [[app.js]] :
1. **En-têtes** : CSP stricte (`'self'` partout, formulaires vers Stripe seulement, pas de cadre) sur les pages du serveur ; `CORP cross-origin` pour les images des e-mails et `/avatars/` ; pas de CSP sur le site servi par `SITE_DIR` (local seulement).
2. **Contrôle d'origine** : un `POST` de formulaire venant d'un autre hôte → 403 (l'API et le webhook en sont exemptés).
3. **Taille des corps** : 64 Ko (1 Mo pour le webhook, 5 Mo + 64 Ko pour une photo).
4. **Fichiers** `/assets/*` ; **verrou d'avant lancement** (`LAUNCH_AT`, passage `rago_preview`).
5. **Route** : page (session `rg_session`), API (jeton `Bearer`), admin (cookie `rago_admin`), webhook (signature Stripe).
6. **Limites de débit** en mémoire par IP, e-mail, compte ou licence (connexion : 10 / 15 min par IP + e-mail ; API compte : 300 / h ; mises à jour : 120 / h…).
7. **Erreurs** : JSON `{error:{code, message}}` sous `/api/`, page HTML ailleurs.

**Cookies** : `rg_session` (30 j), `rg_claim` (2 j), `rg_ref` (30 j), `rg_signup` (24 h), `rg_oauth` (10 min), `rg_discord` (10 min), `rago_preview` (30 j), `rago_admin` (7 j, `SameSite=Strict`). Tous `HttpOnly`, `Secure` en prod ; valeurs signées par HMAC avec `SESSION_SECRET` quand elles portent un identifiant.

## Tâches de fond (dans le processus web)

| Fréquence | Tâche | Où |
|---|---|---|
| 30 s après le démarrage, puis **toutes les heures** | Passe horaire : filleuls à compter et récompenses d'affiliation, fin des récompenses dépassées (`expireRewards`), codes promo des affiliés dans Stripe, abonnements remplacés par Lifetime à arrêter, options Rago Route sans Premium à annuler, purge des tests réseau (12 mois), purge du journal (12 mois), des départs Discord (12 mois), des codes d'inscription et des essais (2 ans) | [[server.js]], [[affiliates.js]], [[licensing.js]], [[billing.js]], [[network.js]], [[retention.js]] |
| **Toutes les 5 min** | Rôle Pro : comptes dont le rôle ne correspond pas, puis récompenses Discord (50 comptes au plus) | [[discord.js]] |
| 60 s après le démarrage, puis **toutes les 24 h** | Rôle Pro redonné à tous les Premium | [[discord.js]] |
| Après chaque webhook Stripe | `discord.syncAll()` | [[app.js]] |
| 2 min après le démarrage, puis **toutes les heures** (avec `DISCORD_INVITE_ROLES=1`) | Passe des rôles VIP/MVP du bot communauté | [[community.js]] |
| En continu | Gateway Discord (battements de cœur, reprise) | [[gateway.js]] |
| 5 s après le démarrage (avec `ADMIN_KEY` et `DATABASE_URL`) | Préchargement des ventes Stripe et des contrôles des services | [[admin.js (serveur)]] |
| Au premier rapport réseau d'un nouveau mois | Rechargement des bases DB-IP | [[geo.js]] |
| Au démarrage | Contrôles Stripe (prix, webhook, portail) écrits dans les logs | [[server.js]], [[billing.js]] |

Caches en mémoire : ventes 5 min, services 1 min, avis 30 s, pop-up 30 s, prix Lifetime 60 s, prix des abonnements 10 min, mise à jour 5 min, fichier de l'installateur 1 min. Tout est en mémoire (limites, caches, liens de connexion de l'app) : **un seul réplica** sur [[Railway]].

## Achat → licence → app

1. Le [[Site]] envoie vers `/buy` (ou `/buy/lifetime`) : [[app.js]] crée une session Stripe Checkout ([[billing.js]]) avec code promo, parrainage, essai éventuel.
2. Paiement chez Stripe. Le **webhook** `checkout.session.completed` et la page `/checkout/success` appellent tous deux `fulfillCheckoutSession` ([[licensing.js]]) : une seule licence par session (`stripe_session_id` unique). Licence `active`, sans compte si l'acheteur n'est pas connecté ; e-mail avec un lien de réclamation (`/claim/<jeton>`, [[mailer.js]]).
3. L'acheteur crée son compte ou se connecte (e-mail, Google, Discord) : la licence est rattachée (`claimLicense`), le parrainage appliqué ([[affiliates.js]]).
4. `/account` : téléchargement de l'installateur (lien signé Supabase, [[installer.js]]), clé, Discord.
5. L'app Windows : `POST /api/v1/auth/login` (ou connexion par le navigateur avec `app-link`) → `activation_required` + jeton d'accès de 15 min → `POST /licenses/activate` lie le PC ([[Table devices]]) → **jeton de licence** Ed25519 que l'app vérifie hors ligne avec la clé publique compilée ([[Licence dans l'app]]) ; `POST /licenses/refresh` le renouvelle.
6. Ensuite : les webhooks d'abonnement mettent à jour `current_period_end` et le statut (renouvellement, résiliation, remboursement, litige) ; la durée du jeton suit ; le rôle Discord suit ([[discord.js]]). Voir [[Paiements Stripe]] et [[Abonnement dans l'app]].

## Les tables

25 tables, définies dans [[schema.sql]] (une note par table) :
- **Comptes** : [[Table users]], [[Table web_sessions]], [[Table api_sessions]], [[Table password_resets]], [[Table signup_codes]], [[Table oauth_identities]].
- **Licences et paiements** : [[Table licenses]], [[Table devices]], [[Table stripe_events]], [[Table trials]].
- **Affiliation** : [[Table affiliates]], [[Table referrals]], [[Table account_devices]].
- **Profil et site** : [[Table reviews]], [[Table site_settings]].
- **Discord** : [[Table discord_links]], [[Table discord_rewards]], [[Table discord_joins]], [[Table discord_invite_links]], [[Table discord_invite_bonus]], [[Table discord_invite_roles]].
- **Tests réseau** : [[Table network_reports]], [[Table network_results]].
- **Système** : [[Table audit]], [[Table server_secrets]].
