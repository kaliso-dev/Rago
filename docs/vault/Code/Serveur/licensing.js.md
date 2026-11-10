---
type: code
tags: [code, serveur, javascript]
fichier: licensing/src/licensing.js
lignes: 584
maj: 2026-11-10
---
# licensing.js

Cœur métier du serveur : comptes, sessions, inscription par code, connexion Google/Discord, licences (achat, cadeau, récompense, remplacement), révocation, abonnements, verrou sur un seul PC. Logique de base de données pure, **sans HTTP**. Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Licence dans l'app]], [[Abonnement dans l'app]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

[[app.js]] (routes), [[billing.js]] (Stripe), [[affiliates.js]], [[discord.js]], [[admin.js (serveur)]] et [[admin.js (script serveur)]] appellent ces fonctions. Toutes prennent `db` en premier paramètre (ou `t`, l'objet de transaction de [[db.js]]). Les erreurs métier sont des `LicenseError(code)` ou des `SignInError(code)` que [[app.js]] traduit en codes d'API (`no_license`, `revoked`, `bound_to_other_device`…).

## Ce que le fichier expose

### Constantes et classes
- `SESSION_TTL` = 30 jours (session web) ; `API_SESSION_TTL` = 180 jours (jeton de compte de l'app) ; `SIGNUP_CODE_TTL` = 15 min ; `SIGNUP_CODE_TRIES` = 5 ; `NO_PASSWORD` = `'none'`.
- `LicenseError(code, message)` : codes `no_email`, `not_found`, `already_claimed`, `already_has_license`, `no_license`, `revoked`, `bound_to_other_device`.
- `SignInError(code)` : `unverified_email`, `other_account`.

### Comptes et sessions
| Fonction | Rôle |
|---|---|
| `findUserByEmail(db, email)`, `getUser(db, id)` | Lecture (e-mail toujours mis en minuscules et sans espaces). |
| `createUser(db, email, password, {passwordHash})` | Crée `usr_…` ; `passwordHash` déjà calculé (inscription par code) ou `NO_PASSWORD` (Google/Discord). Audit `user.created`. |
| `setPassword(db, userId, password)` | Nouveau hash, **ferme toutes les sessions web et API**, marque les liens de mot de passe non utilisés comme utilisés. |
| `isBanned(user)` | `banned_at` non nul. |
| `banUser(db, userId, reason)` | Transaction : `banned_at`, `banned_reason`, sessions supprimées, licences actives révoquées (raison `banned`), audit `user.banned` avec la liste des licences. Renvoie les licences révoquées (l'appelant arrête Stripe et le rôle Discord). |
| `unbanUser(db, userId, keep)` | Lève le bannissement ; rend **au plus une** licence révoquée pour `banned` (la plus récente pour laquelle `keep(l)` est vrai). Audit `user.unbanned`. |
| `createWebSession` / `userForWebSession` / `deleteWebSession` | Jeton aléatoire, stocké en SHA-256 dans [[Table web_sessions]] ; un compte banni n'est jamais retrouvé. |
| `createApiSession` / `userForApiSession` / `deleteApiSession` | Pareil dans [[Table api_sessions]] (180 j) ; renvoie `{token, expiresAt}`. |
| `createPasswordReset(db, userId)` | Lien valable **1 heure** ([[Table password_resets]]). |
| `passwordResetEmail(db, token)` | E-mail du compte si le lien est encore valable (avant d'afficher le formulaire). |
| `consumePasswordReset(db, token)` | Marque le lien utilisé (`UPDATE … RETURNING`) et renvoie l'id du compte, ou `null`. |

### Inscription avec code à 6 chiffres (25/10/2026)
- `startSignup(db, email, password)` → `{id, code}` : id `sgn_…`, code `randomInt(0, 1 000 000)` sur 6 chiffres, mot de passe **déjà haché**, hash du code = `sha256("<id>:<code>")`. Une nouvelle inscription avec le même e-mail remplace l'ancienne ; les lignes de plus d'un jour sont purgées au passage.
- `pendingSignup(db, id)` : la ligne si elle a moins d'un jour.
- `resendSignupCode(db, id)` → `{email, code}` : nouveau code, essais remis à 0, 15 min de plus.
- `checkSignupCode(db, id, code)` → `{signup}` ou `{error}` : **chaque essai est compté avant la comparaison** (des essais en parallèle ne dépassent pas 5) ; erreurs `gone` (inconnue ou > 1 jour), `locked` (plus de 5 essais), `expired`, `wrong` (avec `left` = essais restants ; le 5e mauvais essai renvoie `locked`). Un code bon supprime la ligne (`DELETE … RETURNING`) : un deuxième envoi du même formulaire ne trouve rien.

### Connexion Google et Discord
- `hasPassword(user)` : le hash commence par `scrypt$`.
- `userForIdentity(db, provider, profile)` → `{user, created}` :
  1. identité déjà liée ([[Table oauth_identities]]) → ce compte ;
  2. sinon e-mail exigé **et vérifié** par le fournisseur, sinon `unverified_email` ;
  3. compte avec cet e-mail, ou nouveau compte sans mot de passe ;
  4. si ce compte a déjà une **autre** identité du même fournisseur → `other_account` ;
  5. insertion de l'identité, audit `user.oauth_linked` (`{provider, created}`).
  Deux connexions en même temps (double clic) → erreur `23505` → **un** nouvel essai qui retrouve la ligne créée par l'autre.

### Licences
| Fonction | Rôle |
|---|---|
| `getLicense(db, id, {lock})` | Avec `FOR UPDATE` si `lock`. |
| `getDevice(db, licenseId)` | Le PC lié ([[Table devices]]). |
| `licenseForUser(db, userId)` | La licence **active** du compte, sinon la plus récente. |
| `blocksPurchase(active, incoming)` | Vrai si la licence active empêche l'achat `incoming`. Une récompense (`reward`) n'empêche jamais rien ; un abonnement n'empêche pas un **Lifetime payé** (Lifetime le remplace). |
| `subscriptionFacts(sub)` | `{plan: 'year'|'month', periodEnd (ms), cancelAtPeriodEnd, active}` ; `periodEnd` lu sur l'abonnement ou sur son premier article (versions récentes de l'API Stripe) ; `cancelAtPeriodEnd` vrai aussi avec `cancel_at` ; `active` = `active`, `trialing` ou `past_due` (Stripe réessaie la carte). |
| `fulfillCheckoutSession(db, session, subscription)` | Crée **une seule fois** la licence d'un paiement Checkout. Voir plus bas. |
| `grantLicense(db, email, note, {months, days})` | Licence offerte (`source: 'grant'`) : à vie, ou `plan: 'reward'` jusqu'à aujourd'hui + mois + jours. Rattachée au compte s'il existe et n'a pas de licence active ; sinon renvoie un `claimToken`. Audit `license.granted`. |
| `licenseByClaimToken(db, token)` | Licence non rattachée dont le lien correspond. |
| `unclaimedLicenses(db, email)` | Achats/cadeaux de cet e-mail qu'aucun compte ne porte. |
| `newClaimToken(db, licenseId)` | Nouveau lien `/claim/…` (l'ancien ne marche plus) ; `already_claimed` si déjà rattachée. Audit `license.claim_link`. |
| `claimLicense(db, licenseId, userId)` | Rattache une licence à un compte (verrou de ligne). Erreurs `not_found`, `already_claimed`, `already_has_license`. Audit `license.claimed`, puis `replaceOld`. Une licence révoquée entre-temps (remboursée…) ne remplace rien. |
| `setLicenseStatus(db, id, status, reason)` | `status` + `status_reason` + **`token_version + 1`** (tous les jetons de licence existants deviennent invalides au prochain contrôle). Audit `license.<status>`. |
| `revokeForCharge(db, {paymentIntent, customer}, reason)` | Remboursement total ou litige : révoque les licences actives (hors `source = 'affiliate'`) dont le `payment_intent` correspond, ou les abonnements (hors Lifetime) du même client Stripe. |
| `syncSubscription(db, sub)` | Applique l'état d'un abonnement Stripe : met à jour `plan`, `current_period_end`, `cancel_at_period_end` ; actif → inactif : révoque (`subscription_ended`, renvoie `ended`) ; inactif → actif **seulement** si la raison était `subscription_ended` (renvoie `resumed`). Un remboursement, un litige ou une révocation manuelle restent révoqués. Renvoie aussi `lifetime`, `unknown` ou `updated`. |
| `addMonths(ms, n)` | Même jour `n` mois plus tard, en UTC. |
| `grantRewardTime(db, userId, {months, days, source})` | Temps de Premium offert (affiliation, Discord, admin). Renvoie `lifetime` (rien à ajouter), `subscription` (abonné Stripe : l'appelant doit décaler les paiements), `extended` (licence active prolongée et passée en `reward`, audit `license.reward_extended`) ou `created` (nouvelle licence `reward`, audit `license.granted`). La date part de `max(fin actuelle, maintenant)`. |
| `grantRewardMonths(db, userId, months)` | Raccourci pour l'affiliation. |
| `givePremiumTime(db, stripe, userId, time)` | `grantRewardTime` puis, pour un abonné : `subscriptions.update(id, {trial_end: until, proration_behavior: 'none'})` (période d'essai = aucun paiement jusqu'à la date) et `rewardSubscription`. |
| `rewardSubscription(db, licenseId, until, months)` | `current_period_end = GREATEST(…, until)` ; audit `license.reward_extended` avec `stripe: true`. |
| `expireRewards(db)` | Révoque (`subscription_ended`) les licences `reward` actives dont la date est passée. Appelé toutes les heures par [[server.js]]. |
| `current(db, license)` | Même contrôle pour une seule licence, au moment où on la lit. |
| `resetDevice(db, licenseId, by)` | Supprime le PC lié, `token_version + 1`, `last_reset_at`, audit `device.reset` (`by` = `support`, `self`, `admin`). |
| `deviceState(db, license, device)` | `{state: 'free'}`, `{state: 'here', bound}`, ou lève `revoked` / `bound_to_other_device`. |
| `activate(db, licenseId, device, ip)` | Lie la licence au PC. Voir plus bas. |

## Fonctionnement détaillé

### Création d'une licence payée (`fulfillCheckoutSession`)
1. Paiement non `paid` ni `no_payment_required` → rien.
2. Licence déjà créée pour ce `stripe_session_id` → la renvoie (`created: false`). Le webhook et la page de succès peuvent arriver en même temps : la contrainte d'unicité (`23505`) départage, le perdant relit la licence.
3. E-mail = `customer_details.email` ou `customer_email`, sinon `LicenseError('no_email')`.
4. Plan : `month`/`year` d'après l'abonnement (ou `metadata.interval` s'il n'est pas déplié), sinon `lifetime`.
5. Si `client_reference_id` (l'acheteur était connecté) désigne un compte existant **et** qu'aucune licence active ne bloque cet achat : rattachement immédiat.
6. `insertLicense` : `lic_…`, clé `RAGO-…`, `source: 'stripe'`, ids Stripe (session, abonnement, payment intent, client), `amount_total`, `currency`, hash d'un `claimToken` aléatoire, `claimed_at` si rattachée, et `referral_code` = le code d'affilié tapé comme **code promo** sur Stripe (retrouvé via `affiliates.stripe_promo_id`), sinon `metadata.ref` (lien `/buy?ref=`), en majuscules, 16 caractères.
7. Audit `license.created`. Si rattachée : `replaceOld`.
8. Retour `{license, created: true, claimToken}` (`claimToken` seulement si non rattachée : il sert au lien de l'e-mail d'achat).

### Remplacement (`replaceOld`)
Un achat rattaché remplace la **récompense** active du compte ; un **Lifetime payé** remplace aussi un abonnement mensuel/annuel. Pour chaque ancienne licence : le PC est déplacé vers la nouvelle (pas de nouvelle activation), l'ancienne est révoquée (`replaced`) ; récompense → audit `license.reward_replaced` ; abonnement → les parrainages encore `pending` suivent la nouvelle licence, audit `license.subscription_replaced`. [[billing.js]] annule ensuite l'abonnement chez Stripe (`stopReplacedSubscriptions`). Un Lifetime **offert** par l'équipe (`source: 'grant'`) ne remplace pas un abonnement.

### Activation (`activate`)
1. Transaction avec **verrou de ligne** sur la licence (`FOR UPDATE`) : deux PC qui activent au même instant ne peuvent pas gagner tous les deux.
2. `deviceState` : licence non active → `revoked` ; aucun PC → `free` ; même PC (règle 2 sur 3 de [[fingerprint.js]]) → `here` ; sinon `bound_to_other_device` (audit `device.blocked` avec le nom du PC et l'IP).
3. `free` : insertion du PC (`dev_…`, 3 empreintes, nom, OS, version, dates, IP), audit `device.bound`, et recopie de l'empreinte dans le parrainage `pending` de cette licence ([[Table referrals]]) pour le contrôle anti-triche de [[affiliates.js]].
4. `here` : seuls les identifiants **manquants** sont complétés (`COALESCE`) ; nom, OS, version, `last_seen_at`, `last_ip` mis à jour. Ainsi le PC lié ne peut pas « glisser » vers un autre PC une pièce à la fois.

## Données touchées

[[Table users]], [[Table web_sessions]], [[Table api_sessions]], [[Table password_resets]], [[Table signup_codes]], [[Table oauth_identities]], [[Table licenses]], [[Table devices]], [[Table referrals]], [[Table audit]] ; lecture de [[Table affiliates]]. Stripe seulement dans `givePremiumTime`.

## Événements d'audit écrits

`user.created`, `user.banned`, `user.unbanned`, `user.oauth_linked`, `license.created`, `license.granted`, `license.claim_link`, `license.claimed`, `license.active`, `license.revoked`, `license.reward_replaced`, `license.subscription_replaced`, `license.reward_extended`, `device.reset`, `device.bound`, `device.blocked`.

## Liens avec le reste

- Appelé par [[app.js]], [[billing.js]], [[affiliates.js]], [[discord.js]], [[admin.js (serveur)]], [[admin.js (script serveur)]], [[server.js]] (`expireRewards`, `DEV_SEED`).
- Appelle [[db.js]] (`audit`), [[crypto.js]], [[fingerprint.js]].
- Parcours complet : [[Paiements Stripe]], [[Licence dans l'app]], [[Promotions et affiliation]].

## Tests

La plupart des tests de `flow.test.js` passent par ce fichier : achat → licence, rattachement, PC unique, réinstallation tolérée, activations simultanées, abonnements, Lifetime, récompenses, codes d'inscription, Google/Discord, bannissement ([[Tests du serveur]]).

## À savoir avant de modifier

- **Une seule licence active par compte** : toutes les fonctions qui rattachent ou rendent une licence le vérifient (`blocksPurchase`, `unbanUser`).
- Toute révocation doit passer par `setLicenseStatus` : c'est lui qui incrémente `token_version` (sinon l'app garderait un jeton valable) et écrit l'audit.
- `revokeForCharge` ignore `source = 'affiliate'` alors que les récompenses d'affiliation ont `source = 'affiliate'` et `plan = 'reward'` : voulu (une récompense n'est pas un paiement).
