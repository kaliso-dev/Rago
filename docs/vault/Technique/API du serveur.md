---
type: technique
tags: [technique, serveur, api]
maj: 2026-11-10
---
# API du serveur

Toutes les routes de `licensing/src/app.js` sur `staging` au 10/11, avec leur usage. Contrat détaillé avec l'app (corps, réponses, codes d'erreur) : `licensing/docs/API.md`, qui **fait foi** : `/api/v1` ne change jamais de façon incompatible (une rupture = `/api/v2`). Organisation du code : [[Architecture du serveur]].

Les routes marquées **(staging)** n'existent que sur `staging`, pas encore sur la branche de prod.

## Pages web (HTML rendu par le serveur, en anglais)
| Route | Rôle |
|---|---|
| `GET /healthz` | Santé, interroge aussi la base (healthcheck Railway) |
| `GET /acces/:key`, `/acces/sortir` | Cookie d'accès de l'équipe avant le lancement (inutile depuis le 10/10) |
| `GET /buy`, `GET /buy/lifetime` | Crée la session Stripe Checkout et redirige. Paramètres : `interval=month|year`, `trial=1` (essai, staging), `ref=CODE` (affilié), `promo=CODE` (pop-up). Voir [[Paiements Stripe]] |
| `GET /checkout/success` | Retour de Stripe : « Payment confirmed », création du compte ou rattachement |
| `GET /claim/:token` | Rattacher un achat à un compte (lien de l'e-mail d'achat) |
| `GET/POST /signup`, `GET/POST /signup/verify`, `POST /signup/resend` | Inscription par e-mail avec code à 6 chiffres (15 min, 5 essais) |
| `GET/POST /login`, `POST /logout` | Connexion par e-mail et mot de passe (`?next=` limité à quelques pages internes) |
| `GET/POST /forgot`, `GET/POST /reset/:token` | Mot de passe oublié (lien d'1 h) |
| `GET /auth/:provider`, `GET /auth/:provider/callback` | Connexion Google ou Discord ([[Connexion Google et Discord]]) |
| `GET/POST /app/link/:id` **(staging)** | Page ouverte par l'app pour se connecter avec Google/Discord ; confirme le compte au lien de l'app |
| `GET /account` | Page compte : licence, abonnement, PC, téléchargement, avis, Discord, récompenses |
| `GET/POST /account/password` | Changer ou choisir le mot de passe (obligatoire pour un compte Google/Discord qui veut l'app avant la 1.3.0) |
| `GET /account/profile`, `POST /account/profile/photo`, `…/photo/remove`, `…/review/delete`, `…/name` | Profil public |
| `GET/POST /account/review`, `POST /account/review/delete` | Avis depuis le site (comptes Premium) |
| `GET /avatars/:file` | Photos de profil (copie du bucket `avatars`, cache 1 an) |
| `POST /account/billing` | Ouvre le portail client Stripe (gérer, résilier) |
| `GET /account/discord`, `GET /account/discord/callback`, `POST /account/discord/sync`, `POST /account/discord/unlink` | Liaison Discord et rôle Pro |
| `GET /affiliate`, `POST /affiliate/join` | Programme d'affiliation ([[Promotions et affiliation]]) |
| `POST /account/reset-device` | Libérer son PC soi-même (seulement si `SELF_SERVICE_RESET_DAYS` > 0 ; 0 en prod = support) |
| `GET /account/download`, `GET /download` | Lien signé 5 min vers l'exe le plus récent du bucket `downloads` (`/download` public, 30 par heure et par IP) |
| `GET /download/status` | Fichier servi et état, sans secret |
| `GET /admin`, `POST /admin/login`, `POST /admin/logout` | Tableau de bord admin en français, clé `ADMIN_KEY` (≥ 16 caractères) |
| `GET /admin/utilisateurs`, `GET /admin/utilisateurs/:id`, `POST /admin/utilisateurs/:id/:action` | Joueurs et toutes les actions de support (`temps`, `vie`, `revoquer`, `retablir`, `liberer-pc`, `lien-mdp`, `rattacher`, `resilier`, `bannir`, `debannir`, `discord-sync`, `discord-delier`, `avis`, `photo`, `nom`, `affilie`, `supprimer`) ; `staging` seulement (10/11), [[Tableau de bord admin]] |
| `GET /admin/achats`, `POST /admin/achats/:id/lien`, `POST /admin/offrir` | Achats sans compte, Premium pour des e-mails ; `staging` seulement |
| `GET /admin/ventes`, `GET /admin/services`, `GET /admin/journal` | Ventes Stripe, état des services, journal ; `staging` seulement |
| `GET /admin/site`, `POST /admin/popup`, `POST /admin/code-promo`, `POST /admin/test-licenses` | Pop-up de réduction, codes promo, avis, licences de test (sur `staging` ; en prod la pop-up est sur `/admin`) |
| `GET /admin/reseau`, `GET /admin/reseau.csv` | Résumé et export des tests réseau ([[Proxy]]) |
| `POST /webhooks/stripe` | Webhook Stripe (signature vérifiée, idempotent par `stripe_events`) |
| `GET /` | Redirige vers `SITE_URL` (le site est sur Netlify) |

## API de l'app : `/api/v1`
JSON en entrée et en sortie. Chaque appel de licence envoie l'objet `device` (nom, OS, `app_version`, empreinte hachée `machine_guid`, `smbios_uuid`, `board_serial`). Les mises à jour et tests réseau envoient `X-Rago-Device` (hash du PC, jamais l'empreinte de licence).

| Méthode et route | Auth | Rôle |
|---|---|---|
| `GET /public-key` (`?format=pem`) | public | Clé publique Ed25519 (à compiler dans l'app ; lue aussi par les sorties Rago Route) |
| `POST /auth/login` | email + mot de passe | `activation_required` (+ jeton `access` 15 min) ou directement `active` si ce PC est déjà lié |
| `POST /auth/app-link/start`, `POST /auth/app-link/poll` **(staging)** | jeton de sondage | Connexion de l'app par le navigateur (Google, Discord ou e-mail) : l'app ouvre `/app/link/<id>?p=google|discord`, puis sonde ; liens de 10 min gardés en mémoire |
| `POST /licenses/activate` | Bearer `access` | Lie la licence à ce PC, renvoie le jeton de licence et `scripts_key` |
| `POST /licenses/refresh` | jeton de licence (même expiré) | Nouveau jeton ; `revoked` (avec `reason: subscription_ended` et `buy_url`), `bound_to_other_device` ou `invalid_token` sinon |
| `POST /route/token` **(staging)** | Bearer licence | Jeton Rago Route de 6 h, licence Premium active seulement ; sur staging, comptes de `ROUTE_TESTERS` seulement |
| `POST /account/login` | email + mot de passe | Jeton de compte (180 jours) pour les comptes gratuits |
| `GET /account/me` | Bearer licence ou compte | Profil et avis |
| `GET /account/subscription` **(staging)** | idem | État de l'abonnement pour la fenêtre de l'app ([[Abonnement dans l'app]]) |
| `POST /account/subscription/cancel`, `/resume` **(staging)** | idem | Résilier en fin de période, ou annuler la résiliation |
| `POST /account/logout` | idem | Efface le jeton de compte |
| `PUT /account/review`, `DELETE /account/review` | idem | Avis (1 à 5 étoiles, 600 caractères) |
| `PUT /account/name` | idem | Nom public (2 à 32 caractères) |
| `PUT /account/avatar`, `DELETE /account/avatar` | idem | Photo (JPG, PNG, WebP, GIF, 5 Mo) |
| `GET /reviews` (`?all=1`) | public, CORS | Avis publiés (site) |
| `GET /promo` | public, CORS | Pop-up de réduction du site |
| `GET /plans` | public, CORS | Prix Lifetime (et, sur staging, mensuel, annuel, `trial_days`) |
| `GET /installer` | public, CORS | Version servie (`INSTALLER_VERSION`) affichée sous le bouton de téléchargement |
| `GET /update/:target/:arch/:current` | `X-Rago-Device` | 204 rien à faire, ou 200 `{version, notes, url, signature}` ; déploiement progressif `UPDATE_ROLLOUT`, arrêt `UPDATE_PAUSED` |
| `GET /update/file/:version` | public | Redirige vers un lien signé de 5 min (seulement la version proposée) |
| `GET /update/status` | public | `ok`, version, fichier, pause, pourcentage : à vérifier après chaque dépôt |
| `POST /network/report` | `X-Rago-Device` | Résultats d'un [[Test réseau]] (204) |

Codes d'erreur stables : `invalid_request`, `invalid_credentials`, `invalid_token`, `no_license`, `bound_to_other_device`, `revoked`, `rate_limited`, `server_error`, `link_expired`, `route_closed`, `invalid_rating`, `empty_comment`, `comment_too_long`, `name_required`, `invalid_name`, `invalid_image`, `image_too_large`, `storage_unavailable`. Le `message` anglais est affiché tel quel par l'app.

## Ajouter une route
1. La logique dans le module du domaine (`licensing.js`, `billing.js`…), la route dans `app.js`, la page dans `views.js`.
2. Une route d'API : erreur par `fail(c, code)` avec un code de `API_ERRORS` ; limite de débit avec `allow()` ; jamais de changement incompatible de `/api/v1`.
3. Un test dans `test/flow.test.js`, puis `npm test`.
4. Mettre à jour `licensing/docs/API.md` si l'app l'appelle, et cette note.
