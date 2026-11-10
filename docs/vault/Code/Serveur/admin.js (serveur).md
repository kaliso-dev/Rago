---
type: code
tags: [code, serveur, javascript, admin]
fichier: licensing/src/admin.js
lignes: 723
maj: 2026-11-10
---
# admin.js (serveur)

Les routes du tableau de bord `/admin` : connexion par `ADMIN_KEY`, données des pages (comptes, joueurs, ventes, services, journal, site, tests réseau, Cerveau) et toutes les actions sur un joueur. L'affichage est dans [[admin-views.js]]. Ne pas confondre avec [[admin.js (page admin)]] (script du navigateur) et [[admin.js (script serveur)]] (`npm run admin`). Fiche parente : [[Code du serveur]]. Fonctionnalité : [[Tableau de bord admin]].

(code de `staging` @ `9f65eac`, PR #83 comprise, 10/11 ; routes du Cerveau : PR #85 du Cerveau, pas encore fusionnée)

## Rôle et place dans l'ensemble

Ajouté le 10/11/2026 (PR #77), refait le même jour (PR #82), retouché par la PR #83 (contrôles Stripe seulement dans Services). [[app.js]] appelle `mountAdmin(app, {cfg, db, stripe, discord, community, geo, installer, avatars, allow, ip, sameHash, log, fetchImpl, webhookState, onPopupChange, startedAt})` : le module réutilise la limite de débit, l'adresse IP et la comparaison à temps constant d'[[app.js]]. Textes en français (seul Sofiene s'en sert).

## Ce que le fichier expose

- `USER_FILTERS` : `tous`, `premium`, `abonnes`, `essais`, `resilies`, `lifetime`, `offerts`, `gratuits`, `bannis`.
- `mountAdmin(app, deps)` → `{sales, services, brain}` (l'objet de [[sales.js]], la fonction des contrôles, et celui de [[brain.js]] pour le [[Cerveau du vault]]).

## Fonctionnement détaillé

### Accès
- Cookie `rago_admin` = HMAC-SHA256(`ADMIN_KEY`, `rago-admin-v1`) en base64url, 7 jours, `path=/admin`, `SameSite=Strict`, `HttpOnly`. `ADMIN_KEY` de moins de 16 caractères → `/admin` répond 404 partout.
- Garde sur `/admin` et `/admin/*` : `Cache-Control: no-store`, `X-Robots-Tag: noindex` ; sans cookie, tout renvoie vers `/admin` (page de connexion), sauf `/admin`, `/admin/login`, `/admin/logout`.
- `POST /admin/login` : 10 essais par heure et par IP (`admin-login:<ip>`) ; audits `admin.login` / `admin.login_failed` avec l'IP.
- Chaque formulaire est un POST de même origine (contrôle d'[[app.js]]).

### Pages et données
| Route | Contenu |
|---|---|
| GET `/admin` | `counts()` (comptes 1/7/30 j et bannis, licences actives par offre, PC vus 1/7 j, Discord liés, tests réseau 7 j, achats non rattachés, essais en cours, avis), ventes, services (attente 1,5 s au plus), 6 derniers inscrits, 30 derniers événements (PR #83 : la colonne « Activité récente » défile pour finir à la hauteur des autres). |
| GET `/admin/utilisateurs` | Recherche (e-mail ou nom public en partie, id, clé, `cus_…`, `sub_…`, id de licence, pseudo ou id Discord), filtre, tri (`recents`, `anciens`, `email`, `actifs`, `fin`), 50 par page, nombre par filtre. Une recherche exacte (e-mail, clé, `cus_`/`sub_`) avec un seul résultat ouvre la fiche. |
| GET `/admin/utilisateurs.csv` | Même liste (50 000 lignes au plus), BOM UTF-8, colonnes `email, nom, inscrit, premium, etat, jusqu_au, resilie, banni, discord, vu_dans_app, id` ; cellules commençant par `= + - @` préfixées d'une apostrophe (pas de formule) ; audit `admin.users_export`. |
| GET `/admin/utilisateurs/:id` | Fiche : licences, PC, empreintes vues ([[Table account_devices]]), connexions Google/Discord, Discord et récompenses, avis, affiliation, parrain, essais, achats non rattachés au même e-mail, 60 derniers événements, sessions ouvertes, lien de mot de passe en cours. |
| GET `/admin/achats` | Licences actives sans compte (200 au plus). POST `/admin/achats/:id/lien` : nouveau lien de réclamation (l'ancien ne marche plus), audit `admin.claim_link`. |
| POST `/admin/offrir` | Premium pour 200 e-mails au plus (jours 1 à 3650, mois 1 à 120, ou à vie) ; saute les e-mails déjà Premium ou qui ont une licence en attente ; lien de réclamation affiché pour ceux sans compte ; audit `admin.premium_given`. |
| GET `/admin/ventes` | [[sales.js]] ; filtre `etat` (`tous`, `payes`, `rembourses`, `echoues`, `litiges`), `page` ≤ 100. |
| GET `/admin/services` | Les contrôles ci-dessous, dont **tous les contrôles Stripe** (depuis la PR #83) ; `?frais=1` relance tout de suite ; `?n=test-ended&count=` affiche le résultat de l'arrêt des licences de test. |
| GET `/admin/journal` | 100 événements par page (`avant=<id>`), types `tout`, `admin` (`admin.%`), `achats` (`license.%`), `comptes` (`user.%`), `pc` (`device.%`), `abonnements` (`subscription.%`), `affiliation` (`affiliate.%`). |
| GET `/admin/site`, POST `/admin/popup` | Pop-up de réduction ([[promo.js]]), 100 derniers avis ; audit `admin.popup`. Plus d'état Stripe ici depuis la PR #83 (« dans services y a tout les services y compris ceux de stripe donc pas besoin de les avoir aussi dans sites et promo », Sofiene, 10/11). |
| POST `/admin/code-promo` | Code `^[A-Z0-9-]{2,40}$`, 1 à 99 %, `once` ou `forever` ; coupon `rago-promo-<pct>-<durée>`, code réservé aux premiers achats ; audit `admin.promo_code`. |
| POST `/admin/test-licenses` | `endTestLicenses` ([[billing.js]]) puis `discord.syncAll()` ; audit `admin.test_licenses_ended` ; relit les services (pour que la liste des licences de test disparaisse) et renvoie vers `/admin/services?n=test-ended&count=<n>`. |
| GET `/admin/reseau`, `/admin/reseau.csv` | [[network.js]] sur 30, 90 (défaut) ou 365 jours ; CSV `rago-tests-reseau-<date>.csv`. |
| GET `/admin/cerveau` | La page du [[Cerveau du vault]] ([[brain-views.js]]). |
| GET `/admin/cerveau/donnees.json` | Tout le vault en graphe ([[brain.js]] `read()`) ; `?frais=1` relit GitHub tout de suite (60 fois par heure et par IP, clé `cerveau:<ip>`) ; `Cache-Control: private, no-cache`, `ETag` et réponse 304, gzip si le navigateur l'accepte, en-tête `X-Cerveau-Erreur` quand la dernière lecture a échoué ; 503 `{error}` si rien n'a pu être lu. |
| GET `/admin/cerveau/fichier?chemin=` | Un fichier du dépôt ([[brain.js]] `file()`), 404 s'il n'est pas dans la liste. |

Menu de chaque page (`navFor`) : nombre de joueurs, achats non rattachés, état global des services.

### Actions sur un joueur (`POST /admin/utilisateurs/:id/:action`)
| Action | Effet | Audit |
|---|---|---|
| `temps` | `givePremiumTime` ([[licensing.js]]) : jours (1–3650) ou mois (1–120) ; un abonné voit ses paiements décalés | `admin.premium_time` |
| `vie` | Licence à vie ; une récompense en cours est remplacée (même PC) ; refusé si abonnement actif | `admin.lifetime_given` |
| `revoquer` / `retablir` | Statut de la licence (raison, défaut `manual`) ; rétablir refusé si compte banni ou autre licence active | `admin.license_revoked` / `restored` |
| `liberer-pc` | `resetDevice(…, 'admin')` | `device.reset` (par [[licensing.js]]) |
| `lien-mdp` | Lien `/reset/…` (1 h) affiché une fois | `admin.reset_link` |
| `rattacher` | `claimLicense` ; un Lifetime arrête l'abonnement remplacé | `admin.license_attached` |
| `resilier` | `quand` = fin de période, `reprendre` ou `maintenant` (dans Stripe) | `admin.subscription_canceled` / `_resumed` / `_canceled_now` |
| `bannir` / `debannir` | `banUser` + arrêt des abonnements Stripe ; levée : rend les licences encore valables (à vie, récompense pas finie, abonnement `active`/`trialing` dans Stripe) | `admin.user_banned` / `unbanned` |
| `discord-sync` / `discord-delier` | `checkRewards` + `syncUser(force)` ; `unlink` ([[discord.js]]) | `admin.discord_unlinked` |
| `avis`, `photo`, `nom` | Masquer/afficher l'avis, retirer la photo, changer le nom | `admin.review_hidden`/`shown`, `admin.photo_removed`, `admin.name_changed` |
| `affilie` | `evaluateAffiliate` ([[affiliates.js]]) | — |
| `supprimer` | Recopier l'e-mail exact ; `deleteAccount` ([[support.js]]) | `admin.user_deleted` |

Après chaque changement de Premium : `discord.syncUser(force)`. Après avis, nom ou suppression : `onPopupChange('reviews')` vide le cache des avis d'[[app.js]].

### Services (`checkServices`)
11 contrôles en parallèle, gardés **1 minute** (relus en arrière-plan), chacun avec sa durée : serveur Railway (environnement, commit `RAILWAY_GIT_COMMIT_SHA`, branche `RAILWAY_GIT_BRANCH`, depuis quand, mémoire, avertissements), base (temps de réponse, taille sur 500 Mo), stockage Supabase (installateur, photos), mise à jour automatique (version, `UPDATE_PAUSED`, `UPDATE_ROLLOUT`), site Netlify, ancienne adresse `rago-production.up.railway.app` (en prod seulement), Stripe (`stripeChecks` de [[billing.js]]), Resend (domaines vérifiés ; une clé « envoi seulement » est jugée la plus sûre), rôle Pro ([[discord.js]]), bot communauté ([[community.js]]), DB-IP ([[geo.js]]). Appels HTTP avec un délai de 5 s et l'User-Agent `rago-admin-check`.

**Préchargement** : avec `ADMIN_KEY` et `DATABASE_URL`, ventes et services sont lus 5 s après le démarrage.

## Données touchées

Lecture de presque toutes les tables ([[Table users]], [[Table licenses]], [[Table devices]], [[Table account_devices]], [[Table trials]], [[Table audit]], [[Table discord_links]], [[Table discord_rewards]], [[Table reviews]], [[Table referrals]], [[Table network_reports]], [[Table web_sessions]], [[Table api_sessions]], [[Table password_resets]], [[Table oauth_identities]]). Écritures directes : `UPDATE devices` (Premium à vie qui remplace une récompense), `DELETE FROM discord_links` (sans bot) ; le reste passe par les modules. Stripe : abonnements, coupons, codes promo.

## Liens avec le reste

Monté par [[app.js]] ; affiché par [[admin-views.js]] avec [[admin.js (page admin)]] et `admin.css` ([[Styles du serveur (CSS)]]). Les commandes équivalentes du terminal sont dans [[admin.js (script serveur)]].

## Tests

`flow.test.js` (admin : connexion, actions, bannissement, CSV) et `sales.test.js` ([[Tests du serveur]]).

## À savoir avant de modifier

- Le filtre « affiliation » du journal (`affiliate.%`) ne montre pas `referral.created`.
- Beaucoup de types d'audit n'ont pas de libellé dans [[admin-views.js]] et s'affichent bruts (`discord.*`, `affiliate.*`, `trial.*`, `review.*`…).
- Les liens (mot de passe, réclamation) sont montrés une seule fois dans la page, jamais dans l'adresse.
