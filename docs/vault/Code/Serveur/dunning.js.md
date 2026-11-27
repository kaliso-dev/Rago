---
type: code
tags: [code, serveur, stripe, paiement]
fichier: licensing/src/dunning.js
maj: 2026-11-27
---
# dunning.js

Les **paiements refusés** des abonnements Premium (27/11, q110, Sofiene : « il faut absolument que si le paiement est refusé après un essai gratuit, directement l'abonnement soit révoqué et il passe en gratuit ; pour les abonnements mensuel, annuel etc. déjà payés une ou plusieurs fois, on réessaie pendant 3 jours avant de révoquer l'abonnement ; et il faudrait aussi envoyer des mails pour les prévenir que leur abonnement va prendre fin ; il faut que ça le fasse pour tous les users actuels, il y en a plein que je n'ai pas eu le temps de révoquer ou que j'ai loupés »). PR #160 vers `staging` (fil HUB-d1451f), non fusionnée. Fiche parente : [[Code du serveur]]. Règles : [[Paiements Stripe]], section « Paiements refusés ».

## Ce qu'il expose
- `GRACE_DAYS` = 3, `REMINDER_DAYS` = 2, `UNPAID_STATUSES` = `past_due`, `unpaid`, `incomplete_expired`, `canceled`.
- `lastPayment(stripe, subscriptionId)` : date du dernier vrai paiement (facture payée avec un montant > 0), sinon `null` (un essai jamais payé).
- `onPaymentFailed(db, stripe, invoice, {mailer, log, now})` : appelé par le webhook `invoice.payment_failed` ([[billing.js]]). Licence mensuelle ou annuelle active seulement. Jamais payé → fin immédiate (`failed:trial_ended`) ; sinon ligne dans [[Table payment_failures]] et e-mail `paymentFailed` (`failed:grace`) ; un échec déjà ouvert → `failed:known` ; option Rago Route seule → `failed:route`.
- `onInvoicePaid(db, invoice)` : `invoice.paid` avec un montant > 0 ferme l'échec ouvert (`resolved_at`).
- `settleFailedPayments(db, stripe, {mailer, log, now})` : passe horaire de [[server.js]]. Relit chaque abonnement : redevenu `active` → fermé ; jour 2 → rappel (une fois) ; échéance passée → fin. Renvoie `{reminded, ended, resolved}`.
- `catchUpUnpaid(db, stripe, {apply, mailer, log, now})` : rattrapage (commande `failed-payments` de [[admin.js (script serveur)]]). Sans `apply`, ne change rien et renvoie la liste (e-mail, offre, statut Stripe ou `not_found`, dernier paiement, action). Avec `apply` : révoque et envoie l'e-mail de fin ; un abonnement en retard depuis moins de 3 jours démarre le compte à rebours à la date de sa facture impayée.
- Interne : `endUnpaid` (annulation dans Stripe si l'abonnement existe encore, licence `revoked` raison `payment_failed`, journal `subscription.ended_unpaid`, `stopOrphanRoutes`, e-mail `trialPaymentFailed` ou `premiumEndedUnpaid`).

## Liens
- Appelé par [[billing.js]] (`handleStripeEvent`, qui reçoit le `mailer` de [[app.js]]), [[server.js]] et [[admin.js (script serveur)]]. Utilise [[licensing.js]] (`setLicenseStatus`), [[route-addon.js]] (`stopOrphanRoutes`), [[mailer.js]].
- Tests : 4 tests « failed payment… » et « catch-up of unpaid subscriptions… » ([[Tests du serveur]]).
- Lifetime et récompenses n'ont pas d'abonnement : jamais touchés.
