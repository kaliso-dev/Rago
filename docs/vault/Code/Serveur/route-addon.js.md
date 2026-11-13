---
type: code
tags: [code, serveur, stripe, rago-route]
maj: 2026-11-13
---
# route-addon.js

`licensing/src/route-addon.js` : l'**option Rago Route**, 3 $ par mois en plus du Premium (décision de Sofiene du 13/11). Créé le 13/11, sur la branche du fil, **pas encore sur `staging`**. Voir [[Paiements Stripe]], [[Proxy]], [[Offres et prix]], [[Code du serveur]].

## Ce que le fichier expose
- `ROUTE_PRODUCT` (`rago-route`), `isRouteCheckout`, `isRouteSubscription` : reconnaître un Checkout ou un abonnement de l'option (métadonnée `product`).
- `ROUTE_PRICE` : 3 USD par mois (le site et l'app écrivent le même montant).
- `routeOption(db, userId)` : l'option en cours du compte (statut `active`, `trialing` ou `past_due`), ou rien.
- `syncRouteSubscription(db, sub, userId?)` : enregistre ce que Stripe dit de l'abonnement (table `route_subscriptions`, une ligne par abonnement Stripe ; journal `route.subscription` à chaque changement de statut).
- `createRouteCheckout(stripe, cfg, user, customerId)` : le Checkout Stripe (abonnement, prix `STRIPE_PRICE_ROUTE`, retour sur `/checkout/route`).
- `stopOrphanRoutes(db, stripe)` : passe horaire ([[server.js]]) ; annule dans Stripe une option encore active pour un compte sans Premium actif (journal `route.subscription_stopped`).

## Liens avec le reste
- [[app.js]] : `/buy/route`, `/checkout/route`, bloc « Rago Route » de la page compte ([[views.js]]), et `/api/v1/route/token`, qui demande l'option en production (erreur `route_option`, 402) ; sur le serveur de test, les comptes `ROUTE_TESTERS` n'ont pas à la payer.
- [[billing.js]] : le webhook envoie ici les Checkout et abonnements de l'option.
- App : l'onglet Rago Route affiche « Ajouter Rago Route · 3 $/mois » quand le serveur répond `route_option` (`RouteTab.tsx`).

## Tests
`licensing/test/flow.test.js` : « Rago Route option: $3 a month on top of Premium… » et le test du jeton Rago Route (402 sans l'option).
