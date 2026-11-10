// Sales for /admin (2026-11-10): read from Stripe in the mode of STRIPE_SECRET_KEY, never stored here. Days and months
// are counted in Paris time. Cached 5 minutes (the dashboard's "Actualiser" reads them again).

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
  };
}

/** Sums a list of payments: { count, gross: {cur: cents}, refunded, net } (net = paid minus refunds, before fees). */
export function sumSales(sales) {
  const s = { count: 0, gross: {}, refunded: {}, net: {} };
  for (const x of sales) {
    if (!x.paid) continue;
    s.count++;
    add(s.gross, x.currency, x.amount);
    add(s.refunded, x.currency, x.refunded);
    add(s.net, x.currency, x.amount - x.refunded);
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
    const today = parisDayStart(t);
    const month = parisMonthStart(t);
    const lastMonth = parisMonthStart(t, 1);
    const between = (from, to = Infinity) => sales.filter((x) => x.at >= from && x.at < to);
    const periods = {
      today: sumSales(between(today)),
      yesterday: sumSales(between(today - DAY, today)),
      week: sumSales(between(today - 6 * DAY)),
      month: sumSales(between(month)),
      lastMonth: sumSales(between(lastMonth, month)),
      total: sumSales(sales),
    };
    // Main currency: the one most payments use; the 30-day chart is drawn in it.
    const counts = {};
    for (const x of sales) if (x.paid) add(counts, x.currency, 1);
    const currency = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'usd';
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const from = parisDayStart(today - i * DAY + 12 * 3600000);
      const to = parisDayStart(from + 36 * 3600000);
      const s = sumSales(between(from, to).filter((x) => x.currency === currency));
      days.push({ day: parisDay(from + 3600000), count: s.count, amount: s.net[currency] || 0 });
    }
    return {
      at: t, currency, periods, days,
      sales: sales.slice(0, 200),
      failed: sales.filter((x) => x.failed && x.at >= today - 6 * DAY).length,
      byKind: { abonnement: sumSales(sales.filter((x) => x.kind === 'abonnement')), unique: sumSales(sales.filter((x) => x.kind === 'unique')) },
      received: balance ? { total: balanceSums(balance), month: balanceSums(balance, month), today: balanceSums(balance, today) } : null,
      subscriptions: subs ? subscriptionStats(subs, t) : null,
      truncated: charges.length >= 5000,
    };
  }

  /** The sales, from the cache unless `fresh` or older than 5 minutes. Never throws: { error } instead. */
  async function read({ fresh = false } = {}) {
    if (!stripe) return { error: 'Stripe n’est pas configuré sur ce serveur (STRIPE_SECRET_KEY).' };
    if (!fresh && cache && now() - cache.at < SALES_TTL) return cache;
    running ||= load().then((v) => (cache = v)).catch((err) => {
      log.error?.('[admin] Stripe sales', err.message);
      return { error: `Stripe n’a pas répondu : ${err.message}` };
    }).finally(() => { running = null; });
    return running;
  }
  return { read, cached: () => cache };
}
