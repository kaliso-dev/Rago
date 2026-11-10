// Sales for /admin (2026-11-10): read from Stripe in the mode of STRIPE_SECRET_KEY, never stored here. Days and months
// are counted in Paris time. Kept 5 minutes; after that the page shows the kept figures at once and Stripe is read
// again in the background ("Actualiser" waits for fresh ones).

export const SALES_TTL = 5 * 60 * 1000;
const DAY = 86400000;
const TZ = 'Europe/Paris';

/** Paris wall-clock offset from UTC at that moment, in ms (+1 h in winter, +2 h in summer). */
function parisOffset(ms) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}
/** Paris date of a moment, as YYYY-MM-DD. */
export const parisDay = (ms) => new Date(ms + parisOffset(ms)).toISOString().slice(0, 10);
/** Midnight in Paris of the day `ms` falls in. */
export function parisDayStart(ms) {
  const [y, m, d] = parisDay(ms).split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return guess - parisOffset(guess - 3 * 3600000);
}
/** The 1st of the month at midnight in Paris; `back` months earlier when given. */
export function parisMonthStart(ms, back = 0) {
  const [y, m] = parisDay(ms).split('-').map(Number);
  const guess = Date.UTC(y, m - 1 - back, 1);
  return guess - parisOffset(guess - 3 * 3600000);
}

/** Every page of a Stripe list (up to `max` items), without relying on the SDK's auto-pagination. */
async function listAll(list, params = {}, max = 5000) {
  const out = [];
  let after = null;
  for (;;) {
    const page = await list({ limit: 100, ...params, ...(after ? { starting_after: after } : {}) });
    const data = page?.data || [];
    out.push(...data);
    if (!page?.has_more || !data.length || out.length >= max) return out;
    after = data[data.length - 1].id;
  }
}

const add = (map, cur, n) => { map[cur] = (map[cur] || 0) + n; };

/** One payment as the dashboard shows it. */
export function saleOf(ch) {
  const paid = ch.status === 'succeeded' && ch.paid !== false;
  return {
    id: ch.id,
    at: ch.created * 1000,
    amount: ch.amount,
    refunded: ch.amount_refunded || 0,
    currency: String(ch.currency || '').toLowerCase(),
    paid,
    failed: ch.status === 'failed',
    disputed: !!ch.disputed,
    email: ch.billing_details?.email || ch.receipt_email || null,
    customer: typeof ch.customer === 'string' ? ch.customer : ch.customer?.id || null,
    // Stripe writes "Subscription creation" / "Subscription update" on subscription invoices' payments.
    kind: /subscription/i.test(ch.description || '') ? 'abonnement' : 'unique',
    livemode: !!ch.livemode,
    txn: typeof ch.balance_transaction === 'string' ? ch.balance_transaction : ch.balance_transaction?.id || null,
  };
}

/**
 * A payment in another currency than the Stripe account's (a $ payment on a € account) is converted by Stripe; its
 * balance line holds the converted amount. Puts it on the payment as `settled` ({ amount, refunded, currency }, refunds
 * at the same rate) so the sums add up in one currency, like Stripe's dashboard. Returns the rate of the latest
 * conversion of each currency ({ usd: { to: 'eur', rate: 0.89 } }), for the subscriptions' monthly revenue.
 */
export function settle(sales, lines) {
  const lineOf = new Map();
  for (const b of lines || []) {
    if (b.type !== 'charge' && b.type !== 'payment') continue;
    lineOf.set(b.id, b);
    const src = typeof b.source === 'string' ? b.source : b.source?.id;
    if (src) lineOf.set(src, b);
  }
  const rates = {};
  for (const x of [...sales].sort((a, b) => b.at - a.at)) {
    const b = (x.txn && lineOf.get(x.txn)) || lineOf.get(x.id);
    const cur = String(b?.currency || '').toLowerCase();
    if (!b || !cur || cur === x.currency || !Number.isFinite(b.amount) || !x.amount) continue;
    const rate = b.amount / x.amount;
    x.settled = { amount: b.amount, refunded: Math.round(x.refunded * rate), currency: cur };
    rates[x.currency] ||= { to: cur, rate }; // in cents to cents, right for currencies without cents too
  }
  return rates;
}

/** A { cur: cents } map with the currencies Stripe converts put in the account's currency at their latest rate. */
export function convert(map, rates) {
  const out = {};
  for (const [cur, v] of Object.entries(map || {})) {
    const r = rates?.[cur];
    if (r) add(out, r.to, Math.round(v * r.rate));
    else add(out, cur, v);
  }
  return out;
}

/** The amount, refunds and currency a payment counts for: converted by Stripe when it was (`settled`). */
export const valueOf = (x) => x.settled || x;

/**
 * Sums a list of payments: { count, counts: {cur: payments}, gross: {cur: cents}, refunded, net } (net = paid minus
 * refunds, before fees), in the account's currency for the payments Stripe converted.
 */
export function sumSales(sales) {
  const s = { count: 0, counts: {}, gross: {}, refunded: {}, net: {} };
  for (const x of sales) {
    if (!x.paid) continue;
    const v = valueOf(x);
    s.count++;
    add(s.counts, v.currency, 1);
    add(s.gross, v.currency, v.amount);
    add(s.refunded, v.currency, v.refunded);
    add(s.net, v.currency, v.amount - v.refunded);
  }
  return s;
}

const MONTHLY = { day: 30, week: 30 / 7, month: 1, year: 1 / 12 };
/** The subscriptions: how many in each state, the monthly revenue they bring, and the next renewals. */
export function subscriptionStats(subs, now = Date.now()) {
  const out = { active: 0, trialing: 0, pastDue: 0, canceling: 0, mrr: {}, renewals: [] };
  for (const sub of subs) {
    const item = sub.items?.data?.[0];
    const end = (item?.current_period_end ?? sub.current_period_end ?? 0) * 1000;
    if (sub.status === 'active') out.active++;
    else if (sub.status === 'trialing') out.trialing++;
    else if (sub.status === 'past_due' || sub.status === 'unpaid') out.pastDue++;
    else continue;
    if (sub.cancel_at_period_end) { out.canceling++; continue; }
    if (sub.status !== 'active') continue;
    for (const it of sub.items?.data || []) {
      const p = it.price || it.plan;
      const r = p?.recurring || (p?.interval ? { interval: p.interval, interval_count: p.interval_count } : null);
      if (!r || p.unit_amount == null) continue;
      add(out.mrr, String(p.currency || '').toLowerCase(), (p.unit_amount * (it.quantity || 1) * (MONTHLY[r.interval] || 0)) / (r.interval_count || 1));
    }
    if (end > now && end < now + 7 * DAY) out.renewals.push({ id: sub.id, at: end, customer: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id, interval: item?.price?.recurring?.interval || null });
  }
  for (const k of Object.keys(out.mrr)) out.mrr[k] = Math.round(out.mrr[k]);
  out.renewals.sort((a, b) => a.at - b.at);
  return out;
}

// Balance lines that are money moving out to the bank, not sales or fees.
const NOT_SALES = new Set(['payout', 'payout_cancel', 'payout_failure', 'transfer', 'transfer_cancel', 'transfer_failure', 'topup', 'topup_reversal']);

/** Received after Stripe's fees, from the balance: { fee, net } by currency, for lines since `since` (ms). */
export function balanceSums(lines, since = 0) {
  const s = { fee: {}, net: {} };
  for (const b of lines) {
    if (NOT_SALES.has(b.type) || b.created * 1000 < since) continue;
    add(s.fee, b.currency, b.fee || 0);
    add(s.net, b.currency, b.net || 0);
  }
  return s;
}

export function createSales(stripe, { now = Date.now, log = console } = {}) {
  let cache = null;
  let running = null;

  async function load() {
    const t = now();
    const [charges, balance, subs] = await Promise.all([
      listAll((p) => stripe.charges.list(p)),
      listAll((p) => stripe.balanceTransactions.list(p)).catch((err) => { log.error?.('[admin] Stripe balance', err.message); return null; }),
      listAll((p) => stripe.subscriptions.list(p), { status: 'all' }).catch((err) => { log.error?.('[admin] Stripe subscriptions', err.message); return null; }),
    ]);
    const sales = charges.map(saleOf).sort((a, b) => b.at - a.at);
    const rates = settle(sales, balance);
    const today = parisDayStart(t);
    const month = parisMonthStart(t);
    const lastMonth = parisMonthStart(t, 1);
    const between = (from, to = Infinity) => sales.filter((x) => x.at >= from && x.at < to);
    const periods = {
      today: sumSales(between(today)),
      yesterday: sumSales(between(today - DAY, today)),
      // the same stretch of time one day / one month earlier, to compare a day or a month that isn't over
      yesterdaySoFar: sumSales(between(today - DAY, t - DAY)),
      week: sumSales(between(today - 6 * DAY)),
      lastWeek: sumSales(between(today - 13 * DAY, today - 6 * DAY)),
      month: sumSales(between(month)),
      lastMonth: sumSales(between(lastMonth, month)),
      lastMonthSoFar: sumSales(between(lastMonth, Math.min(month, lastMonth + (t - month)))),
      total: sumSales(sales),
    };
    // Main currency: the one most payments count in (the account's, once Stripe converted them); the charts are in it.
    const counts = periods.total.counts;
    const currency = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'usd';
    const inMain = (x) => valueOf(x).currency === currency;
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const from = parisDayStart(today - i * DAY + 12 * 3600000);
      const to = parisDayStart(from + 36 * 3600000);
      const s = sumSales(between(from, to).filter(inMain));
      days.push({ day: parisDay(from + 3600000), count: s.count, amount: s.net[currency] || 0 });
    }
    // The last 12 months, this one included.
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const from = parisMonthStart(t, i);
      const to = i ? parisMonthStart(t, i - 1) : Infinity;
      const s = sumSales(between(from, to).filter(inMain));
      months.push({ month: parisDay(from + 3600000).slice(0, 7), count: s.count, amount: s.net[currency] || 0 });
    }
    // Subscriptions are priced in their own currency: their monthly revenue is converted at the latest rate.
    const stats = subs ? subscriptionStats(subs, t) : null;
    const subscriptions = stats && { ...stats, mrr: convert(stats.mrr, rates), converted: Object.keys(stats.mrr).filter((c) => rates[c]) };
    return {
      at: t, currency, periods, days, months,
      // currencies Stripe didn't convert (old payments past the 5,000 balance lines, or no Balance access): apart
      others: Object.keys(counts).filter((c) => c !== currency),
      converted: Object.keys(rates),
      sales: sales.slice(0, 500),
      failed: sales.filter((x) => x.failed && x.at >= today - 6 * DAY).length,
      byKind: { abonnement: sumSales(sales.filter((x) => x.kind === 'abonnement')), unique: sumSales(sales.filter((x) => x.kind === 'unique')) },
      received: balance ? { total: balanceSums(balance), month: balanceSums(balance, month), today: balanceSums(balance, today) } : null,
      subscriptions,
      truncated: charges.length >= 5000,
    };
  }

  const refresh = () => (running ||= load().then((v) => (cache = v)).catch((err) => {
    log.error?.('[admin] Stripe sales', err.message);
    return cache ? { ...cache, stale: err.message } : { error: `Stripe n’a pas répondu : ${err.message}` };
  }).finally(() => { running = null; }));

  /**
   * The sales. `fresh`: read Stripe now. Otherwise the kept figures, read again in the background once older than
   * 5 minutes (only the very first read waits for Stripe). Never throws: { error } instead.
   */
  async function read({ fresh = false } = {}) {
    if (!stripe) return { error: 'Stripe n’est pas configuré sur ce serveur (STRIPE_SECRET_KEY).' };
    if (fresh || !cache) return refresh();
    if (now() - cache.at >= SALES_TTL) refresh();
    return cache;
  }
  return { read, cached: () => cache };
}
