---
type: code
tags: [code, serveur, javascript, stripe]
fichier: licensing/src/billing.js
lignes: 585
maj: 2026-11-13
---
# billing.js

Tout ce qui parle à Stripe : création du paiement Checkout (abonnement, essai gratuit, Lifetime), essai unique par personne, codes promo des affiliés, portail client, arrêt des abonnements remplacés par Lifetime, traitement des webhooks, licences de test, contrôles de mise en ligne affichés sur `/admin`. Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Paiements Stripe]], [[Offres et prix]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

[[app.js]] appelle `createCheckout` (routes `/buy`, `/buy/lifetime`), `handleStripeEvent` (route `POST /webhooks/stripe`), `billingPortal` (`POST /account/billing`), `lifetimePrice`, `settleTrial` (page de succès). [[server.js]] lance `stripeChecks` au démarrage et, toutes les heures, `syncAffiliatePromos` et `stopAllReplacedSubscriptions`. [[admin.js (serveur)]] affiche `stripeChecks` et appelle `endTestLicenses`. La création des licences elle-même est dans [[licensing.js]].

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `createStripe(cfg)` | `new Stripe(clé)` ou `null`. |
| `stripeMode(cfg)` | `'live'` (clé `sk_live_`/`rk_live_`), `'test'` ou `null`. Prix, codes et clients n'existent que dans un mode. |
| `priceFor(cfg, interval)` | `{price, interval, plan?}` : `lifetime` → `STRIPE_PRICE_LIFETIME` ; sinon `year`/`month` ; sans choix, **annuel** (le plan mis en avant par le site). `null` si rien n'est vendable. |
| `createCheckout(stripe, cfg, user, opts, log)` | Crée la session Checkout avec 3 replis (voir plus bas). |
| `settleTrial(db, stripe, session, sub, license, log)` | Applique la règle « un essai par personne ». Renvoie `'trial'`, `'charged_now'` ou `null`. |
| `withTrial(license, session, sub, result)` | Ajoute `trial: {days, amount, currency}` à la licence pour l'e-mail d'achat. |
| `ensureCoupon(stripe, id, percent, duration, name)` | Crée le coupon `id` une seule fois par mode. |
| `findPromotionCode(stripe, code)` | Code promo actif (regex `^[A-Za-z0-9-]{2,40}$`), `null` s'il est épuisé ou inconnu. |
| `ensureAffiliatePromo(db, stripe, cfg, aff, log)` | Le code d'un affilié devient un code promo Stripe. |
| `syncAffiliatePromos(db, stripe, cfg, log, limit = 50)` | Balayage horaire : codes manquants dans le mode actuel, puis activation/désactivation. |
| `syncPromoActive(db, stripe, cfg, userId, log)` | Désactive le code promo d'un affilié dont le code est plein, le réactive si une place se libère. |
| `billingPortal(stripe, cfg, customerId)` | Session du portail client Stripe, retour sur `/account`. |
| `RAGO_PRODUCT` | `'rago-hub-premium'` : marque nos sessions Checkout (`metadata.product`). |
| `isRagoCheckout(session)` | Vrai pour nos sessions seulement. |
| `LIFETIME_PRICE` | `{amount: 5999, currency: 'usd'}` : **constante du code**, pas une variable d'environnement. Le site affiche le même montant (`priceLifetime` dans `site/src/page.html`) : changer les deux ensemble. |
| `lifetimePrice(stripe, cfg, options)` | `{amount, currency}` si le prix Lifetime de Stripe est actif, en paiement unique et égal à `LIFETIME_PRICE` ; sinon `null`. |
| `stopReplacedSubscriptions(db, stripe, userId, log, lifetimeId)` | Annule chez Stripe les abonnements remplacés par un Lifetime. |
| `stopAllReplacedSubscriptions(db, stripe, log)` | Même chose pour tous les comptes (balayage horaire). |
| `handleStripeEvent(db, event, {stripe, onLicense, log})` | Traite un événement webhook vérifié ; renvoie un libellé pour les logs. |
| `WEBHOOK_EVENTS` | Les 10 événements attendus (liste ci-dessous). |
| `activeTestLicenses(db)` | Licences actives dont la session commence par `cs_test_`. |
| `endTestLicenses(db, cfg)` | En mode live seulement : révoque ces licences (raison `test_mode`) et annule leurs parrainages. |
| `stripeChecks(stripe, cfg, {db, webhook})` | Liste de contrôles `{label, level: ok|warn|error, text}` en français. |

## Fonctionnement détaillé

### Création du paiement (`createCheckout` → `buildCheckout`)
Paramètres : `interval` (`month`, `year`, `lifetime`), `customerId` (client Stripe d'une licence précédente), `ref` (code d'affilié), `promotionCode`, `trialEnd` (récompense encore en cours), `replaces` (abonné qui passe à Lifetime), `trial`, `withRoute` (case Rago Route, 13/11, sur `staging` depuis le 13/11 au soir : abonnements seulement et avec `STRIPE_PRICE_ROUTE`, métadonnée `route: '1'` et une phrase sur l'option dans le texte au-dessus du bouton, `routeText`).

- **Commun** : `line_items` = 1 prix ; `success_url` = `<PUBLIC_URL>/checkout/success?session_id={CHECKOUT_SESSION_ID}` ; `cancel_url` = `CHECKOUT_CANCEL_URL` ; `customer` (client connu) sinon `customer_email` ; `client_reference_id` = id du compte connecté ; `discounts: [{promotion_code}]` si un code est appliqué, sinon `allow_promotion_codes: true` (le joueur peut taper un code) ; `metadata` = `{product: 'rago-hub-premium', interval?, plan?, ref?, trial?}` ; case des CGV obligatoire (`consent_collection.terms_of_service: 'required'`) avec le texte `termsText` : accès immédiat, perte du droit de rétractation de 14 jours, « payments aren't refunded » (droit européen).
- **Lifetime** (`mode: 'payment'`) : `customer_creation: 'always'`, `payment_intent_data.metadata`, texte « One payment: Rago Optimizer Premium for life on one Windows PC. No subscription, nothing renews. » (+ « Your current subscription stops right after this payment. » pour un abonné).
- **Essai gratuit** (04/11/2026) : seulement si `trial` est demandé, pas pour Lifetime, **pas pendant une récompense** (`trialEnd`), `TRIAL_DAYS > 0` et un prix mensuel existe. **L'essai prend toujours le prix mensuel**, quel que soit le choix (décision du 10/11/2026). `mode: 'subscription'`, `payment_method_collection: 'always'` (carte demandée), `subscription_data.trial_period_days`, `trial_settings.end_behavior.missing_payment_method: 'cancel'` (pas de carte à la fin = abonnement arrêté). Texte : « N days free, then your card is charged on <date>… One free trial per person. »
- **Abonnement simple** : si une récompense court encore et finit dans plus de 2 jours, `subscription_data.trial_end` = sa fin (le premier paiement arrive quand la récompense s'arrête ; Stripe exige au moins 2 jours).
- **Replis** de `createCheckout` :
  1. Stripe refuse la case des CGV (URL des conditions pas réglée dans Stripe) → log `[stripe] Terms checkbox refused…` et paiement **sans** la case ;
  2. client Stripe introuvable dans ce mode (acheté en test avant le passage en live) → paiement avec l'e-mail ;
  3. code promo refusé pour cet acheteur → paiement sans le code, avec le champ pour en taper un.

### Essai unique (`settleTrial`)
Appelé par le webhook et par la page de succès (les deux peuvent arriver ensemble). Si l'essai est déjà noté dans [[Table trials]], renvoie le même résultat. Sinon, si l'abonnement est `trialing` : lit l'empreinte de carte Stripe (`card.fingerprint`, la même pour une carte partout), cherche un essai précédent avec **le même e-mail ou la même carte** ; s'il existe, `subscriptions.update(id, {trial_end: 'now', proration_behavior: 'none'})` : la première période est **prélevée tout de suite**. Écrit la ligne `trials` et l'audit `trial.started` ou `trial.refused`. Une erreur Stripe est journalisée, jamais relancée (l'essai reste).

### Codes promo des affiliés
- Coupon `rago-referral-<pct>-<durée>` (`AFFILIATE_DISCOUNT_PERCENT`, `AFFILIATE_DISCOUNT_DURATION`), nom « Referral code, N% off ».
- Code promo = le code de l'affilié, `metadata.rago_affiliate` = son id de compte, `restrictions.first_time_transaction: true` (nouveaux clients seulement).
- Un code par mode : `stripe_promo_live` dit dans quel mode il existe ; un passage test ↔ live le recrée.
- Si la création échoue parce que le code existe déjà et qu'il appartient à cet affilié (plantage entre deux étapes), il est réutilisé.
- `syncPromoActive` : `active = !codeFull(...)` ([[affiliates.js]]) ; n'appelle Stripe que si l'état change.

### Lifetime qui remplace un abonnement
[[licensing.js]] révoque la licence d'abonnement (`replaced`) et écrit `license.subscription_replaced` avec `{by: <id Lifetime>}`. Ici, `stopReplacedSubscriptions` prend chaque licence `month`/`year` révoquée pour `replaced` **sans** audit `license.subscription_stopped`, relit l'abonnement, l'annule s'il tourne encore (un deuxième appel simultané qui échoue est accepté si l'abonnement est fini), puis écrit `license.subscription_stopped` (`{subscription, by: 'lifetime', already?}`). Échec → log et nouvel essai au balayage horaire. C'est pour cela que [[retention.js]] ne purge jamais ces deux types d'audit.

### Webhooks (`handleStripeEvent`)
1. Événement déjà dans [[Table stripe_events]] → `duplicate`.
2. `checkout.session.completed` / `checkout.session.async_payment_succeeded` : ignoré si ce n'est pas une session Rago (`not_rago` : autres produits ou liens de paiement du compte) ; relit l'abonnement ; `fulfillCheckoutSession` ; `settleTrial` ; `addRouteWithPremium` (case Rago Route cochée, [[route-addon.js]]) ; si la licence vient d'être créée, `onLicense(licence avec essai, claimToken)` (e-mail d'achat, dans [[app.js]]) ; Lifetime actif rattaché → `stopReplacedSubscriptions`. Libellés `license_created`, `license_exists`, `unpaid`.
3. `customer.subscription.created|updated|deleted|paused|resumed` et `invoice.paid` : l'abonnement est **relu chez Stripe** (des événements dans le désordre ne ramènent pas un vieil état), puis `syncSubscription` et `followPremium` (l'option Rago Route suit l'arrêt ou la reprise du Premium). Libellé `subscription:<ended|resumed|updated|lifetime|unknown>`. Un abonnement de l'option (métadonnée `product: rago-route`) va dans `syncRouteSubscription` (libellé `route:<statut>`), de même qu'un Checkout de l'option (13/11).
4. `charge.refunded` (seulement si **totalement** remboursé) et `charge.dispute.created` : client retrouvé (via la charge pour un litige), `revokeForCharge` (raison `refunded`/`disputed`), `voidReferrals`, annulation des abonnements. Libellé `revoked:<n>`.
5. L'événement est inscrit **après** le traitement avec `livemode` : si le traitement plante, Stripe réessaie et on retraite.

`WEBHOOK_EVENTS` : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `charge.refunded`, `charge.dispute.created`.

### Contrôles de mise en ligne (`stripeChecks`)
Messages en français (seul Sofiene les lit). Libellés et règles :
- **Clé** : absente (erreur), live (ok), test (attention).
- **Compte** (live) : `charges_enabled`, libellé du relevé bancaire.
- **Prix mensuel / Prix annuel** : existe dans ce mode (sinon « c'est un prix du mode test/live »), actif, récurrent avec le bon intervalle et `interval_count` 1 ; **Devise** : les deux dans la même devise.
- **Prix Lifetime** : vide (attention, « Coming soon »), sinon actif, paiement unique, USD, 59,99 $.
- **Webhook** : une destination activée vers `/webhooks/stripe` avec les 10 événements ; plusieurs destinations = attention (Railway n'a qu'un secret).
- **Secret du webhook** : déduit de ce que le serveur a reçu (`webhook.refusedAt`, `webhook.otherModeAt` fournis par [[app.js]], dernier événement du mode dans `stripe_events`).
- **Portail client** : configuration par défaut active, résiliation proposée, liens CGV et confidentialité.
- **Lien « Cancel subscription »** : `STRIPE_PORTAL_LOGIN_URL` présent et pas le lien `/login/test_` en live.
Renvoie aussi `testLicenses` (nombre de licences de test actives, en live).

## Données touchées

Stripe (sessions Checkout, abonnements, coupons, codes promo, moyens de paiement, charges, portail, webhooks, compte). Base : [[Table licenses]] (via [[licensing.js]]), [[Table stripe_events]], [[Table trials]], [[Table affiliates]], [[Table referrals]] (via [[affiliates.js]]), [[Table audit]].

## Événements d'audit écrits

`trial.started`, `trial.refused`, `license.subscription_stopped` (et `license.revoked` via `setLicenseStatus`).

## Liens avec le reste

Appelé par [[app.js]], [[server.js]], [[admin.js (serveur)]], [[admin.js (script serveur)]] (`create-promo`, `attach`), [[promo.js]] (`stripeMode`). Appelle [[licensing.js]], [[affiliates.js]], [[db.js]]. Fiches : [[Paiements Stripe]], [[Abonnement dans l'app]], [[Promotions et affiliation]], [[Ventes Stripe]].

## Tests

Nombreux tests dans `flow.test.js` (Stripe simulé) : abonnement, remboursement et litige, affiliation et codes promo, Lifetime (10 tests), essai gratuit, mise en ligne (`/admin` vérifie prix, webhook et portail), clés de test ([[Tests du serveur]]).

## À savoir avant de modifier

- Le prix Lifetime est vérifié **au centime** contre `LIFETIME_PRICE` : un autre prix collé par erreur n'est jamais vendu.
- Ne jamais traiter un événement sans `isRagoCheckout` : le compte Stripe peut vendre d'autres produits.
- Plus de remboursement depuis la [[Version 1.3.0]] : le texte des CGV de Checkout le dit (« payments aren't refunded ») ; le garder aligné sur les CGV du site ([[Conformité juridique]]).
