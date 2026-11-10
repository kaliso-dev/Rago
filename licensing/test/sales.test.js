// Sales on /admin (sales.js, 2026-11-10): sums, monthly revenue, Paris days, and the cache that never makes a page wait twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSales, parisDay, parisDayStart, parisMonthStart, saleOf, subscriptionStats, sumSales, SALES_TTL } from '../src/sales.js';

const charge = (o) => ({ id: 'ch', status: 'succeeded', paid: true, amount: 599, amount_refunded: 0, currency: 'usd', created: 0, ...o });

test('sales: refunds and failed payments, monthly revenue of the subscriptions', () => {
  const s = sumSales([saleOf(charge({ amount: 599 })), saleOf(charge({ amount: 5999, amount_refunded: 5999 })), saleOf(charge({ status: 'failed' }))]);
  assert.deepEqual({ count: s.count, gross: s.gross.usd, net: s.net.usd }, { count: 2, gross: 6598, net: 599 });

  const now = Date.UTC(2026, 10, 10);
  const item = (amount, interval, end) => ({ quantity: 1, current_period_end: end / 1000, price: { unit_amount: amount, currency: 'usd', recurring: { interval, interval_count: 1 } } });
  const stats = subscriptionStats([
    { id: 'sub_m', status: 'active', items: { data: [item(599, 'month', now + 2 * 86400000)] } },
    { id: 'sub_y', status: 'active', items: { data: [item(2999, 'year', now + 200 * 86400000)] } },
    { id: 'sub_c', status: 'active', cancel_at_period_end: true, items: { data: [item(599, 'month', now + 86400000)] } },
    { id: 'sub_t', status: 'trialing', items: { data: [item(599, 'month', now + 86400000)] } },
    { id: 'sub_p', status: 'past_due', items: { data: [item(599, 'month', now)] } },
    { id: 'sub_x', status: 'canceled', items: { data: [item(599, 'month', now)] } },
  ], now);
  assert.deepEqual({ active: stats.active, trialing: stats.trialing, pastDue: stats.pastDue, canceling: stats.canceling }, { active: 3, trialing: 1, pastDue: 1, canceling: 1 });
  assert.equal(stats.mrr.usd, 599 + Math.round(2999 / 12)); // the canceled-at-period-end one doesn't count
  assert.deepEqual(stats.renewals.map((r) => r.id), ['sub_m']);
});

test('sales: days and months start at midnight in Paris, summer and winter', () => {
  const winter = Date.UTC(2026, 0, 15, 23, 30); // 00:30 on the 16th in Paris
  assert.equal(parisDay(winter), '2026-01-16');
  assert.equal(parisDayStart(winter), Date.UTC(2026, 0, 15, 23));
  const summer = Date.UTC(2026, 6, 1, 21, 59); // 23:59 on 1 July in Paris
  assert.equal(parisDay(summer), '2026-07-01');
  assert.equal(parisMonthStart(summer), Date.UTC(2026, 5, 30, 22));
  assert.equal(parisMonthStart(summer, 7), Date.UTC(2025, 10, 30, 23)); // 1 December 2025, winter time
});

test('sales: read from Stripe once, then shown at once and read again in the background', async () => {
  let t = Date.UTC(2026, 10, 10, 12);
  let calls = 0;
  let release;
  const list = async () => { calls++; if (calls > 1) await new Promise((r) => { release = r; }); return { data: [{ ...charge({ id: `ch_${calls}`, created: Math.floor(t / 1000) }) }], has_more: false }; };
  const stripe = { charges: { list }, balanceTransactions: { list: async () => ({ data: [], has_more: false }) }, subscriptions: { list: async () => ({ data: [], has_more: false }) } };
  const sales = createSales(stripe, { now: () => t, log: { error() {} } });

  const first = await sales.read();
  assert.equal(first.periods.today.count, 1);
  assert.equal(first.months.length, 12);
  assert.equal(first.days.length, 30);
  assert.equal(calls, 1);
  assert.equal(await sales.read(), first); // kept

  // Older than 5 minutes: the kept figures come back at once, Stripe is read again behind.
  t += SALES_TTL + 1000;
  assert.equal(await sales.read(), first);
  assert.equal(calls, 2);
  release();
  await new Promise((r) => setTimeout(r, 10));
  assert.notEqual(sales.cached(), first);
  assert.equal(sales.cached().sales[0].id, 'ch_2');

  // Stripe down on a forced read: the last figures stay, marked stale; with none yet, an error.
  stripe.charges.list = async () => { throw new Error('down'); };
  const stale = await sales.read({ fresh: true });
  assert.equal(stale.stale, 'down');
  assert.equal(stale.sales[0].id, 'ch_2');
  assert.match((await createSales(stripe, { log: { error() {} } }).read()).error, /Stripe n’a pas répondu : down/);
  assert.match((await createSales(null).read()).error, /pas configuré/);
});
