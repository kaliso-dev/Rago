---
type: technique
tags: [technique, serveur, stripe, paiement]
maj: 2026-11-13
---
# Paiements Stripe

Comment l'argent devient une licence, côté code (`licensing/src/billing.js`, `licensing.js`, `app.js`), état de `staging` au 10/11. Offres et prix décidés : [[Offres et prix]]. Chiffres de vente : [[Ventes Stripe]]. Codes promo et affiliation : [[Promotions et affiliation]].

## Les prix dans Stripe
Un produit « Rago Optimizer Premium », en **dollars US**, trois prix (les mêmes en mode test pour staging) :
| Prix | Variable Railway | Montant | Type |
|---|---|---|---|
| Mensuel | `STRIPE_PRICE_MONTHLY` | 5,99 $ | récurrent |
| Annuel | `STRIPE_PRICE_YEARLY` | 29,99 $ | récurrent |
| Lifetime | `STRIPE_PRICE_LIFETIME` | 59,99 $ | paiement unique |

- Le serveur ne vend Lifetime **que si** le prix Stripe est actif, en paiement unique, et vaut exactement `LIFETIME_PRICE = { amount: 5999, currency: 'usd' }` (`billing.js`). Sinon `/api/v1/plans` répond `lifetime: null` et le site affiche « Coming soon ». `site/tools/build.py` s'arrête si `priceLifetime` du `CONFIG` du site et `LIFETIME_PRICE` ne sont pas d'accord.
- Sans prix récurrent, `/buy` affiche « Checkout opens soon » : rien n'est vendu. L'ancien `STRIPE_PRICE_ID` (achat unique d'avant le 06/10) n'est plus vendu.
- Le site affiche ses prix depuis le `CONFIG` de `site/src/page.html` (`priceMonth`, `priceYear`, `priceLifetime`) : **à changer en même temps que Stripe**.

## Parcours d'achat
1. Le site envoie vers `GET /buy?interval=month|year` (ou `/buy/lifetime`). Options : `ref=CODE` (affilié, aussi gardé 30 jours dans le cookie `rg_ref`), `promo=CODE` (pop-up du site), `trial=1` (essai, **staging seulement** au 10/11 ; toujours sur le prix mensuel).
2. `createCheckout` crée une **session Stripe Checkout** :
   - `metadata.product = RAGO_PRODUCT` : seules ces sessions sont traitées par le webhook (les autres produits du compte Stripe sont ignorés) ; aussi `interval`, `plan`, `ref`, `trial` ;
   - case « conditions de vente + renonciation au droit de rétractation de 14 jours » (`consent_collection`), qui exige l'URL des conditions dans Stripe (Settings > Public details) ; si Stripe la refuse, le paiement s'ouvre quand même et l'erreur est journalisée ;
   - code promo appliqué d'office (`discounts`) ou champ « Add promotion code » (`allow_promotion_codes`) ;
   - client connu réutilisé (`customer`), sinon `customer_email` ; `client_reference_id` = id du compte connecté.
3. Retour sur `/checkout/success?session_id=…` **et** webhook `checkout.session.completed` : les deux appellent `fulfillCheckoutSession`, idempotent (une licence par `stripe_session_id` ; la course entre les deux est gérée par l'index unique).
4. Acheteur connecté sans licence bloquante : licence rattachée tout de suite. Sinon : e-mail d'achat avec un lien `/claim/:token` pour créer ou relier son compte.
5. L'achat remplace une **récompense d'affiliation** en cours ; un **Lifetime payé** remplace un abonnement (le PC passe sur la nouvelle licence, l'abonnement Stripe est annulé tout de suite par `stopReplacedSubscriptions`, retenté chaque heure s'il échoue). Un compte qui a déjà Premium et rachète un abonnement : l'achat n'est pas ajouté, son abonnement est arrêté et la page compte demande de contacter le support pour le remboursement (avis « duplicate »).

## Essai gratuit de 3 jours (staging, PR #70)
Décidé par Sofiene le 04/11. `GET /buy?trial=1` : carte demandée (`payment_method_collection: always`), `trial_period_days = TRIAL_DAYS` (3 par défaut, 0 = coupé), prélèvement à la fin sauf résiliation ; sans carte valable à la fin, l'abonnement s'arrête. **Un essai par personne** : `settleTrial` compare l'e-mail et l'empreinte de carte Stripe (`card.fingerprint`) à la table `trials` ; un deuxième essai est facturé tout de suite (`trial_end: 'now'`). Gardé 2 ans. Rien à créer dans Stripe. **Toujours sur le mensuel** (q48, PR #76) : `buildCheckout` remplace l'intervalle demandé par `month` dès que l'essai s'applique (sans prix mensuel, pas d'essai). La case des CGV du Checkout dit aussi « payments aren't refunded ». Avant la prod : identité du vendeur ([[Conformité juridique]]).

## Option Rago Route (13/11, sur `staging`)
- Décision de Sofiene du 13/11 : Rago Route se paie **3 $ par mois en plus** du Premium (« il faut que ça soit une option »). Abonnement Stripe **à part** (Stripe ne met qu'une période de facturation par abonnement, et les annuels et Lifetime doivent pouvoir le prendre), prix `STRIPE_PRICE_ROUTE` (récurrent mensuel 3 USD, **à créer dans Stripe** par Sofiene), métadonnées `product: rago-route` et `user_id`.
- Achat : `/buy/route` (compte connecté avec Premium actif ; sinon `/account?n=routenopremium`, déjà pris : `routeowned`, pas de prix : `routesoon`), payé avec le client Stripe du Premium (le portail montre les deux) ; retour sur `/checkout/route`, qui l'enregistre même avant le webhook. **L'essai gratuit du Premium comprend Rago Route** (Sofiene, 13/11 : « pendant l'essai gratuit ils ont accès à tout ») : pendant l'essai, `/route/token` donne un jeton sans l'option, jusqu'à la fin de l'essai (`trialEnd`, table `trials`) ; ensuite il faut l'option. L'option elle-même n'a pas d'essai : prise pendant l'essai, elle est débitée dès qu'on l'ajoute. CGV section 4a.
- **Avec Premium, au paiement** (13/11, sur `staging` depuis le 13/11 au soir) : Sofiene (« je veeux vraiment que au paiement au puisse l'ajouter comme une option que quelqu'un déjà en premium puisse l'ajouter facilement dans la page principale des prices on doit pouvoir sélectionner avec proxy et prendre l'aboonnement avec mais il faut aussi pouvoir depuis la page principale seulement payer le proxy l'ajouter »). La case « Add Rago Route » des prix de l'accueil et les boutons de la page Rago Route ajoutent `&route=1` à `/buy`. Le Checkout du Premium porte alors la métadonnée `route: '1'` et le texte « Rago Route is included in the free trial, then $3 a month on top of Premium, from <date>, as its own subscription on this card. » (sans essai : « …charged today and every month. ») ; il ne montre que le prix du Premium. Une fois le Premium payé (webhook ou page de succès, jamais deux fois : clé d'idempotence `rago-route-<session>` et colonne `checkout_session`), le serveur crée l'abonnement de l'option sur le même client et la même carte (`addRouteWithPremium`), lié à la licence (`license_id`) tant que le compte n'existe pas ; avec l'essai, il démarre avec la même fin d'essai que le Premium (rien à payer avant), sinon il est débité tout de suite. Pas pour Lifetime (l'option s'ajoute depuis le compte). Un compte qui a déjà Premium et arrive sur `/buy?…&route=1` est envoyé sur `/buy/route`. Sans `STRIPE_PRICE_ROUTE`, la case est ignorée.
- **Premium annulé** (depuis le compte, l'app ou le portail, `cancel_at_period_end`) : une option qui se renouvellerait après la fin du Premium est mise à l'arrêt en même temps (`followPremium`, colonne `stopped_with_premium`) ; un essai annulé à temps ne coûte donc rien pour Rago Route non plus. Premium repris : l'option reprend. Pas si le compte garde un autre Premium (Lifetime).
- Webhook : `checkout.session.completed` et les événements d'abonnement d'une option vont dans la table `route_subscriptions` ([[Table route_subscriptions]], [[route-addon.js]]), jamais dans `licenses`.
- Passe horaire : une option encore active sans Premium actif est annulée dans Stripe (`stopOrphanRoutes`).

## Webhook (`POST /webhooks/stripe`)
Les 10 événements à cocher dans la destination Stripe (`WEBHOOK_EVENTS`) :
| Événement | Effet |
|---|---|
| `checkout.session.completed`, `checkout.session.async_payment_succeeded` | Crée la licence (si payée), règle l'essai, e-mail d'achat, arrête l'abonnement remplacé par un Lifetime |
| `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`, `invoice.paid` | **Relit l'abonnement chez Stripe** (l'ordre d'arrivée n'importe pas) puis `syncSubscription` : plan, fin de période, résiliation prévue ; `active`, `trialing` ou `past_due` = Premium ; sinon licence `revoked` (`subscription_ended`) ; un abonnement qui redevient actif rend la licence |
| `charge.refunded` (remboursement **total** seulement), `charge.dispute.created` | Licence révoquée (`refunded` / `disputed`), parrainage annulé, abonnement Stripe annulé |

- Signature vérifiée avec `STRIPE_WEBHOOK_SECRET` ; refus journalisé au plus toutes les 10 min.
- Un événement d'un autre mode (test reçu par le serveur live ou l'inverse) est accusé mais **jamais appliqué**.
- Chaque événement est noté dans `stripe_events` **après** traitement : en cas d'erreur, Stripe renvoie et on recommence ; un doublon est ignoré.
- Après chaque événement, synchronisation du rôle Discord.

## Ce que la licence en tire
- Jeton de l'app d'un abonné : expire à la fin de la période payée + 3 jours (`SUBSCRIPTION_GRACE_DAYS`), au moins 24 h, au plus 30 jours ; un renouvellement repousse la date au refresh suivant.
- `license.billing` dans les réponses de l'app : `interval` (`month`, `year`, `lifetime`, `reward`), `renews_at`, `ends_at`.
- Révocation manuelle (`npm run admin -- revoke`) : **n'arrête pas** l'abonnement Stripe (à faire dans Stripe).

## Résiliation
- Page compte : `POST /account/billing` ouvre le **portail client Stripe** (doit être configuré dans Stripe, mode test et live). Lien sans compte : `STRIPE_PORTAL_LOGIN_URL`.
- Dans l'app (1.3.0, staging) : `POST /api/v1/account/subscription/cancel` et `/resume` ([[Abonnement dans l'app]]). E-mail « Subscription canceled » / « Free trial canceled ».

## Codes de réduction
- **Affiliés** : chaque code d'affilié devient un code promo Stripe (`ensureAffiliatePromo`, coupon `AFFILIATE_DISCOUNT_PERCENT` = 5 %, `once`) dans le mode de la clé ; désactivé quand le code a servi 3 fois ; recréé chaque heure après un passage test ↔ live.
- **Pop-up du site** : code réglé dans `/admin` (`promo.js`, table `site_settings`), réduction et nombre d'utilisations dans Stripe ; `/api/v1/promo` le publie, cache 30 s.
- **Récompenses Discord** : codes à usage unique créés par `discord.js` (VIP 10 %, MVP 30 %…).

## Contrôles de `/admin`
`stripeChecks` vérifie dans le mode de la clé : prix mensuel, annuel et Lifetime (actifs, bon type, bon montant, USD), destination du webhook et ses 10 événements, portail client ; signale les licences encore actives issues d'achats en **mode test** (`cs_test_…`), qu'un bouton coupe une fois en live (`endTestLicenses`).

## Tester un paiement
Uniquement sur staging (clés `sk_test_`) : carte `4242 4242 4242 4242`, date future, CVC quelconque. Un serveur de staging refuse de démarrer avec une clé live. Claude peut lire Stripe (live) depuis le 04/11 mais **n'y écrit jamais** sans demande explicite de Sofiene.

## Code

[[billing.js]] (Checkout, webhooks, essai, Lifetime, codes promo, contrôles), [[licensing.js]] (licences, `syncSubscription`, temps offert), [[app.js]] (`/buy`, `/checkout/success`, webhook, résiliation depuis l'app), [[promo.js]] (pop-up), [[sales.js]] (ventes lues dans Stripe pour `/admin`, jamais stockées). Tables : [[Table licenses]], [[Table stripe_events]], [[Table trials]], [[Table affiliates]], [[Table route_subscriptions]]. Carte : [[Code du serveur]].
