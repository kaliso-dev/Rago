---
type: code
tags: [code, serveur, stripe, rago-route]
fichier: licensing/src/route-addon.js
lignes: 169
maj: 2026-11-13
---
# route-addon.js

`licensing/src/route-addon.js` : l'**option Rago Route**, 3 $ par mois en plus du Premium (décision de Sofiene du 13/11). Créé le 13/11, **sur `staging` depuis le 13/11** (« passe en staging »). Voir [[Paiements Stripe]], [[Proxy]], [[Offres et prix]], [[Code du serveur]].

## Ce que le fichier expose
- `ROUTE_PRODUCT` (`rago-route`), `isRouteCheckout`, `isRouteSubscription` : reconnaître un Checkout ou un abonnement de l'option (métadonnée `product`).
- `ROUTE_PRICE` : 3 USD par mois (le site et l'app écrivent le même montant).
- `trialEnd(db, license, trialDays)` : la fin de l'essai gratuit du Premium en cours, ou rien ; pendant l'essai, Rago Route marche sans l'option (Sofiene, 13/11 : « pendant l'essai gratuit ils ont accès à tout »).
- `routeOption(db, userId)` : l'option en cours du compte (statut `active`, `trialing` ou `past_due`), ou rien ; celle du compte (`user_id`) ou d'une de ses licences (`license_id`, option prise au paiement du Premium avant la création du compte).
- `syncRouteSubscription(db, sub, userId?)` : enregistre ce que Stripe dit de l'abonnement ([[Table route_subscriptions]], une ligne par abonnement Stripe, avec `user_id` et/ou `license_id` et `checkout_session` lus dans les métadonnées ; journal `route.subscription` à chaque changement de statut).
- `wantsRoute(session)` : un Checkout du Premium ouvert avec la case Rago Route (métadonnée `route: '1'`).
- `addRouteWithPremium(db, stripe, cfg, {session, sub, license, trial})` (13/11, sur `staging` depuis le 13/11 au soir) : Premium payé avec la case : crée l'abonnement de l'option (`subscriptions.create`, prix `STRIPE_PRICE_ROUTE`, même client, carte de l'abonnement Premium ou la première carte du client, `payment_behavior: 'allow_incomplete'`, `off_session`, métadonnées `product`, `license_id`, `user_id`, `checkout_session`) ; avec l'essai (`trial === 'trial'`, réponse de `settleTrial`), `trial_end` = fin de l'essai du Premium ; clé d'idempotence `rago-route-<session>` ; rien si déjà fait pour ce paiement, si le compte a déjà l'option (`owned`) ou sans prix. Journal `route.added_at_checkout`. Une erreur Stripe est journalisée (`failed`), jamais relancée.
- `followPremium(db, stripe, sub)` : Premium mis à l'arrêt en fin de période : chaque option du compte ou de la licence qui se renouvellerait après (fin de période ≥ fin du Premium moins un jour) passe en `cancel_at_period_end`, notée `stopped_with_premium` ; Premium repris : ces options reprennent. Rien si le compte garde un autre Premium actif.
- `createRouteCheckout(stripe, cfg, user, customerId)` : le Checkout Stripe (abonnement, prix `STRIPE_PRICE_ROUTE`, retour sur `/checkout/route`).
- `stopOrphanRoutes(db, stripe)` : passe horaire ([[server.js]]) ; annule dans Stripe une option encore active sans Premium actif, ni pour son compte, ni pour sa licence, ni pour le compte qui a rattaché cette licence (journal `route.subscription_stopped`).

## Liens avec le reste
- [[app.js]] : `/buy/route`, `/checkout/route`, bloc « Rago Route » de la page compte ([[views.js]]), et `/api/v1/route/token`, qui demande l'option en production (erreur `route_option`, 402) ; sur le serveur de test, les comptes `ROUTE_TESTERS` n'ont pas à la payer.
- [[billing.js]] : le webhook envoie ici les Checkout et abonnements de l'option, appelle `addRouteWithPremium` après un Premium payé et `followPremium` après chaque événement d'un abonnement Premium ; `buildCheckout` ajoute la case (`withRoute`).
- [[app.js]] : `/buy?…&route=1` (ou `/buy/route` pour un compte qui a déjà Premium), `addRouteWithPremium` sur `/checkout/success`, `followPremium` après une résiliation ou une reprise depuis l'app.
- App : l'onglet Rago Route affiche « Ajouter Rago Route · 3 $/mois » quand le serveur répond `route_option` (`RouteTab.tsx`).

## Tests
`licensing/test/flow.test.js` : « Rago Route option: $3 a month on top of Premium… », « Rago Route ticked at checkout: Premium and the option together, the trial includes it, an account with Premium only adds it » (essai et annuel, une seule option par paiement, arrêt et reprise avec le Premium, passe horaire sur une option liée à une licence) et le test du jeton Rago Route (402 sans l'option). 111 tests OK, 3 sautés (13/11).
