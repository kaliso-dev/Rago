---
type: code
tags: [code, serveur, javascript, stripe]
fichier: licensing/src/sales.js
lignes: 246
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
| `saleOf(charge)` | Un paiement Stripe → `{id, at, amount, refunded, currency, paid, failed, disputed, email, customer, kind, livemode, txn}` (`txn` : sa ligne de solde). |
| `settle(sales, lines)` | Met sur chaque paiement que Stripe a converti (un paiement en $US sur le compte en €) `settled = {amount, refunded, currency}` lu sur sa ligne de solde, remboursements au même taux ; renvoie le taux de la dernière conversion par devise (PR #84). |
| `convert(map, rates)` | Une somme `{devise: centimes}` passée dans la devise du compte au dernier taux (revenu mensuel des abonnements). |
| `valueOf(sale)` | Le montant qui compte : `settled` s'il existe, sinon le paiement tel quel. |
| `sumSales(sales)` | `{count, counts, gross, refunded, net}` par devise (en centimes ; `counts` = nombre de paiements par devise), payés seulement, **dans la devise du compte pour les paiements convertis** ; `net` = payé − remboursé, **avant** frais. |
| `subscriptionStats(subs, now)` | `{active, trialing, pastDue, canceling, mrr, renewals}`. |
| `balanceSums(lines, since)` | Frais et net reçus (solde Stripe), hors virements et recharges. |
| `createSales(stripe, {now, log})` | `{read({fresh}), cached()}`. |

## Fonctionnement détaillé

- **Heure de Paris** : `parisOffset` calcule le décalage réel (+1 h l'hiver, +2 h l'été) avec `Intl.DateTimeFormat` ; les débuts de jour et de mois sont recalculés avec ce décalage (passage à l'heure d'été géré).
- **Lecture Stripe** (`load`) : `charges.list`, `balanceTransactions.list` et `subscriptions.list({status: 'all'})` en parallèle, par pages de 100, **5000 éléments au plus** chacun (`truncated` si atteint). Les erreurs du solde ou des abonnements sont tolérées (`null`), pas celles des paiements.
- **`saleOf`** : `paid` = `status === 'succeeded'` et `paid !== false` ; `kind` = `abonnement` si la description Stripe contient « subscription » (« Subscription creation / update »), sinon `unique`.
- **Périodes** : aujourd'hui, hier, hier à la même heure (`yesterdaySoFar`), 7 derniers jours, 7 jours d'avant, mois en cours, mois dernier, mois dernier au même jour (`lastMonthSoFar`), total. Les « même heure / même jour » servent à comparer une période pas encore finie.
- **Une seule devise** (PR #84, 10/11) : avant les sommes, `settle` joint chaque paiement à sa ligne de solde (`balance_transaction` du paiement ou `source` de la ligne) ; un paiement converti par Stripe compte pour son montant converti, comme dans le tableau de bord Stripe.
- **Devise principale** = celle du plus grand nombre de paiements après conversion (défaut `usd`), donc celle du compte dès que le solde est lisible ; graphiques sur **30 jours** et **12 mois** dans cette devise. `others` = les devises que Stripe n'a pas converties (pas de ligne de solde : clé sans accès Balance, ou paiement plus ancien que les 5 000 lignes lues), `converted` = celles qu'il a converties.
- **Retour** : `{at, currency, periods, days, months, others, converted, sales (500 au plus), failed (échecs des 7 derniers jours), byKind, received {total, month, today}, subscriptions, truncated}`.
- **Revenu mensuel récurrent (`mrr`)** : abonnements `active` non résiliés ; prix × quantité ramené au mois (`day` × 30, `week` × 30/7, `month` × 1, `year` / 12) divisé par `interval_count`, arrondi. Les `trialing` et `past_due` sont comptés mais pas dans le revenu. Dans `load`, le revenu est passé dans la devise du compte par `convert` (prix en $US) ; `subscriptions.converted` liste les devises converties. `renewals` = abonnements actifs qui se renouvellent dans les **7 prochains jours**, triés par date.
- **Cache** : `read()` sans cache attend Stripe ; avec un cache de plus de 5 min, renvoie le cache **tout de suite** et relance une lecture en arrière-plan ; `fresh: true` (bouton « Actualiser ») attend une lecture neuve. Une seule lecture à la fois. En erreur : l'ancien cache avec `stale`, sinon `{error: 'Stripe n'a pas répondu : …'}`. Sans Stripe : `{error: 'Stripe n'est pas configuré…'}`.

## Données touchées

Stripe seulement (lecture). Rien en base.

## Liens avec le reste

Utilisé par [[admin.js (serveur)]] ; affiché par [[admin-views.js]]. Fiches : [[Tableau de bord admin]], [[Ventes Stripe]], [[Paiements Stripe]].

## Tests

`sales.test.js` : remboursements et échecs, revenu mensuel ; jours et mois qui commencent à minuit à Paris, été et hiver ; lecture unique puis cache et relecture en arrière-plan ; paiements convertis par Stripe (sommes, taux, graphique, revenu mensuel) ([[Tests du serveur]]).

## À savoir avant de modifier

- Les chiffres sont ceux **du mode de la clé** : sur staging (clé de test), ce sont des ventes de test.
- `net` ne retire pas les frais Stripe : les frais et le net réellement reçu viennent de `received` (solde).
