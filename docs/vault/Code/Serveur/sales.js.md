---
type: code
tags: [code, serveur, javascript, stripe]
fichier: licensing/src/sales.js
lignes: 193
maj: 2026-11-10
---
# sales.js

Les ventes affichées sur `/admin` (vue d'ensemble et page Ventes) : lues dans Stripe, dans le mode de la clé, **jamais stockées** en base. Jours et mois comptés à l'heure de Paris. Fiche parente : [[Code du serveur]]. Fonctionnalités : [[Tableau de bord admin]], [[Ventes Stripe]].

(code de `staging`, 10/11)

## Rôle et place dans l'ensemble

Ajouté le 10/11/2026 avec le nouveau tableau de bord. [[admin.js (serveur)]] crée l'objet avec `createSales(stripe)` et l'utilise pour `/admin` et `/admin/ventes` ; il précharge les ventes 5 s après le démarrage (si `ADMIN_KEY` et `DATABASE_URL` sont réglés). L'affichage est fait par [[admin-views.js]].

## Ce que le fichier expose

| Nom | Rôle |
|---|---|
| `SALES_TTL` | 5 minutes. |
| `parisDay(ms)` | Date `AAAA-MM-JJ` à Paris. |
| `parisDayStart(ms)` | Minuit à Paris du jour de `ms`. |
| `parisMonthStart(ms, back)` | Le 1er du mois à minuit à Paris, `back` mois plus tôt. |
| `saleOf(charge)` | Un paiement Stripe → `{id, at, amount, refunded, currency, paid, failed, disputed, email, customer, kind, livemode}`. |
| `sumSales(sales)` | `{count, gross, refunded, net}` par devise (en centimes), payés seulement ; `net` = payé − remboursé, **avant** frais. |
| `subscriptionStats(subs, now)` | `{active, trialing, pastDue, canceling, mrr, renewals}`. |
| `balanceSums(lines, since)` | Frais et net reçus (solde Stripe), hors virements et recharges. |
| `createSales(stripe, {now, log})` | `{read({fresh}), cached()}`. |

## Fonctionnement détaillé

- **Heure de Paris** : `parisOffset` calcule le décalage réel (+1 h l'hiver, +2 h l'été) avec `Intl.DateTimeFormat` ; les débuts de jour et de mois sont recalculés avec ce décalage (passage à l'heure d'été géré).
- **Lecture Stripe** (`load`) : `charges.list`, `balanceTransactions.list` et `subscriptions.list({status: 'all'})` en parallèle, par pages de 100, **5000 éléments au plus** chacun (`truncated` si atteint). Les erreurs du solde ou des abonnements sont tolérées (`null`), pas celles des paiements.
- **`saleOf`** : `paid` = `status === 'succeeded'` et `paid !== false` ; `kind` = `abonnement` si la description Stripe contient « subscription » (« Subscription creation / update »), sinon `unique`.
- **Périodes** : aujourd'hui, hier, hier à la même heure (`yesterdaySoFar`), 7 derniers jours, 7 jours d'avant, mois en cours, mois dernier, mois dernier au même jour (`lastMonthSoFar`), total. Les « même heure / même jour » servent à comparer une période pas encore finie.
- **Devise principale** = celle du plus grand nombre de paiements (défaut `usd`) ; graphiques sur **30 jours** et **12 mois** dans cette devise.
- **Retour** : `{at, currency, periods, days, months, sales (500 au plus), failed (échecs des 7 derniers jours), byKind, received {total, month, today}, subscriptions, truncated}`.
- **Revenu mensuel récurrent (`mrr`)** : abonnements `active` non résiliés ; prix × quantité ramené au mois (`day` × 30, `week` × 30/7, `month` × 1, `year` / 12) divisé par `interval_count`, arrondi. Les `trialing` et `past_due` sont comptés mais pas dans le revenu. `renewals` = abonnements actifs qui se renouvellent dans les **7 prochains jours**, triés par date.
- **Cache** : `read()` sans cache attend Stripe ; avec un cache de plus de 5 min, renvoie le cache **tout de suite** et relance une lecture en arrière-plan ; `fresh: true` (bouton « Actualiser ») attend une lecture neuve. Une seule lecture à la fois. En erreur : l'ancien cache avec `stale`, sinon `{error: 'Stripe n'a pas répondu : …'}`. Sans Stripe : `{error: 'Stripe n'est pas configuré…'}`.

## Données touchées

Stripe seulement (lecture). Rien en base.

## Liens avec le reste

Utilisé par [[admin.js (serveur)]] ; affiché par [[admin-views.js]]. Fiches : [[Tableau de bord admin]], [[Ventes Stripe]], [[Paiements Stripe]].

## Tests

`sales.test.js` : remboursements et échecs, revenu mensuel ; jours et mois qui commencent à minuit à Paris, été et hiver ; lecture unique puis cache et relecture en arrière-plan ([[Tests du serveur]]).

## À savoir avant de modifier

- Les chiffres sont ceux **du mode de la clé** : sur staging (clé de test), ce sont des ventes de test.
- `net` ne retire pas les frais Stripe : les frais et le net réellement reçu viennent de `received` (solde).
