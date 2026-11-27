// Failed payments of Premium subscriptions (2026-11-27, q110). Sofiene : « il faut absolument que si le paiement est
// refusé après un essai gratuit, directement l'abonnement soit révoqué et il passe en gratuit ; pour les abonnements
// mensuel, annuel etc. déjà payés une ou plusieurs fois, on réessaie pendant 3 jours avant de révoquer l'abonnement ;
// et il faudrait aussi envoyer des mails pour les prévenir que leur abonnement va prendre fin ; il faut que ça le fasse
// pour tous les users actuels ».
//
// - First payment after a free trial refused (no paid invoice before): the subscription is canceled now in Stripe,
//   the license revoked ('payment_failed'), the Rago Route option stops, an email says so.
// - A subscriber who paid before: an email at the first failure (deadline = 3 days later), a reminder 2 days after,
//   and at the deadline, still unpaid: canceled, revoked, an email. Paid in between (invoice.paid): nothing happens.
// Driven by the server (table payment_failures and the hourly sweep), not only by Stripe's retry settings.
// Lifetime and rewards have no subscription: never touched. The Rago Route option alone isn't handled here (Stripe's
// own retries end it, and it stops with Premium anyway).
import { audit } from './db.js';
import { setLicenseStatus } from './licensing.js';
import { stopOrphanRoutes, isRouteSubscription } from './route-addon.js';

const DAY = 86400 * 1000;
/** Days a subscriber who paid before has to fix the card. */
export const GRACE_DAYS = 3;
/** The reminder, this many days after the first failure. */
export const REMINDER_DAYS = 2;
/** Stripe statuses that mean the subscription doesn't pay anymore (the catch-up's list). */
export const UNPAID_STATUSES = ['past_due', 'unpaid', 'incomplete_expired', 'canceled'];

const idOf = (v) => (typeof v === 'string' ? v : v?.id ?? null);
const subOfInvoice = (inv) => idOf(inv?.parent?.subscription_details?.subscription ?? inv?.subscription);
const missing = (err) => err?.statusCode === 404 || err?.code === 'resource_missing';

/** The last real payment of a subscription (an invoice paid with money; the $0 invoice of a trial doesn't count), or null. */
export async function lastPayment(stripe, subscriptionId) {
  const list = await stripe.invoices.list({ subscription: subscriptionId, status: 'paid', limit: 10 });
  const paid = (list?.data || []).filter((i) => Number(i.amount_paid) > 0)
    .map((i) => Number(i.status_transitions?.paid_at || i.created) * 1000);
  return paid.length ? Math.max(...paid) : null;
}

/** Ends Premium for an unpaid subscription: canceled in Stripe now, license revoked, its Rago Route option stopped. */
async function endUnpaid(db, stripe, lic, { mailer, log, why }) {
  if (stripe) {
    try { await stripe.subscriptions.cancel(lic.stripe_subscription_id); } catch (err) { if (!missing(err)) throw err; }
  }
  const fresh = await db.get('SELECT status FROM licenses WHERE id = ?', [lic.id]);
  if (fresh?.status === 'active') await setLicenseStatus(db, lic.id, 'revoked', 'payment_failed');
  await db.run('UPDATE payment_failures SET ended_at = ? WHERE subscription_id = ? AND ended_at IS NULL AND resolved_at IS NULL', [Date.now(), lic.stripe_subscription_id]);
  await audit(db, 'subscription.ended_unpaid', { licenseId: lic.id, userId: lic.user_id, detail: { subscription: lic.stripe_subscription_id, why } });
  if (stripe) await stopOrphanRoutes(db, stripe, log);
  const to = await emailOf(db, lic);
  if (mailer && to) {
    try { await (why === 'trial' ? mailer.trialPaymentFailed(to) : mailer.premiumEndedUnpaid(to)); } catch (err) { log?.error?.('[mail] unpaid end email', err.message); }
  }
}

async function emailOf(db, lic) {
  const u = lic.user_id && await db.get('SELECT email FROM users WHERE id = ?', [lic.user_id]);
  return u?.email || lic.email || null;
}

/**
 * invoice.payment_failed (webhook). Returns a label for logs. Idempotent: Stripe's retries and duplicate events only
 * keep the first failure (its deadline) and send the first email once.
 */
export async function onPaymentFailed(db, stripe, invoice, { mailer, log = console, now = Date.now() } = {}) {
  const subId = subOfInvoice(invoice);
  if (!subId) return 'failed:no_subscription';
  const lic = await db.get("SELECT * FROM licenses WHERE stripe_subscription_id = ? AND plan IN ('month', 'year')", [subId]);
  if (!lic) {
    const sub = stripe ? await stripe.subscriptions.retrieve(subId).catch(() => null) : null;
    return isRouteSubscription(sub) ? 'failed:route' : 'failed:unknown';
  }
  if (lic.status !== 'active') return 'failed:not_active';
  const open = await db.get('SELECT * FROM payment_failures WHERE subscription_id = ? AND ended_at IS NULL AND resolved_at IS NULL', [subId]);
  if (open) return 'failed:known';
  // Never paid with money: the first payment after the free trial. Premium ends now.
  const paidBefore = stripe ? await lastPayment(stripe, subId) : null;
  if (!paidBefore) {
    await endUnpaid(db, stripe, lic, { mailer, log, why: 'trial' });
    return 'failed:trial_ended';
  }
  const deadline = now + GRACE_DAYS * DAY;
  await db.run(`INSERT INTO payment_failures (subscription_id, license_id, user_id, invoice_id, first_failed_at, deadline_at)
    VALUES (?, ?, ?, ?, ?, ?)`, [subId, lic.id, lic.user_id, idOf(invoice.id) || null, now, deadline]);
  await audit(db, 'subscription.payment_failed', { licenseId: lic.id, userId: lic.user_id, detail: { subscription: subId, deadline } });
  const to = await emailOf(db, lic);
  if (mailer && to) {
    try { await mailer.paymentFailed(to, { deadline, reminder: false }); } catch (err) { log.error?.('[mail] payment failed email', err.message); }
  }
  return 'failed:grace';
}

/** invoice.paid (webhook): a failure still open for this subscription is over, nothing is revoked. */
export async function onInvoicePaid(db, invoice, now = Date.now()) {
  const subId = subOfInvoice(invoice);
  if (!subId || !(Number(invoice?.amount_paid) > 0)) return false;
  const r = await db.run('UPDATE payment_failures SET resolved_at = ? WHERE subscription_id = ? AND ended_at IS NULL AND resolved_at IS NULL', [now, subId]);
  return (r?.changes ?? r?.rowCount ?? 0) > 0;
}

/**
 * Hourly sweep: each open failure is checked in Stripe. Paid since (the subscription is active again): closed. Two days
 * in: the reminder. At the deadline, still unpaid: Premium ends. Never throws for one account (logged, retried).
 */
export async function settleFailedPayments(db, stripe, { mailer, log = console, now = Date.now() } = {}) {
  if (!stripe) return { reminded: 0, ended: 0, resolved: 0 };
  const out = { reminded: 0, ended: 0, resolved: 0 };
  for (const f of await db.all('SELECT * FROM payment_failures WHERE ended_at IS NULL AND resolved_at IS NULL')) {
    try {
      const lic = await db.get('SELECT * FROM licenses WHERE id = ?', [f.license_id]);
      if (!lic || lic.status !== 'active') { await db.run('UPDATE payment_failures SET ended_at = ? WHERE subscription_id = ?', [now, f.subscription_id]); continue; }
      let sub = null;
      try { sub = await stripe.subscriptions.retrieve(f.subscription_id); } catch (err) { if (!missing(err)) throw err; }
      if (sub?.status === 'active' || sub?.status === 'trialing') {
        await db.run('UPDATE payment_failures SET resolved_at = ? WHERE subscription_id = ?', [now, f.subscription_id]);
        out.resolved++;
        continue;
      }
      if (now >= Number(f.deadline_at)) {
        await endUnpaid(db, stripe, lic, { mailer, log, why: 'grace_over' });
        out.ended++;
        continue;
      }
      if (!f.reminded_at && now >= Number(f.first_failed_at) + REMINDER_DAYS * DAY) {
        await db.run('UPDATE payment_failures SET reminded_at = ? WHERE subscription_id = ?', [now, f.subscription_id]);
        const to = await emailOf(db, lic);
        if (mailer && to) {
          try { await mailer.paymentFailed(to, { deadline: Number(f.deadline_at), reminder: true }); } catch (err) { log.error?.('[mail] payment reminder', err.message); }
        }
        out.reminded++;
      }
    } catch (err) {
      log.error?.(`[stripe] failed payment of ${f.subscription_id} not settled yet:`, err.message);
    }
  }
  return out;
}

/**
 * Catch-up of the accounts Sofiene couldn't revoke by hand (q110): every active monthly or yearly license whose
 * Stripe subscription doesn't pay anymore (past_due, unpaid, incomplete_expired, canceled, or gone). Dry-run by default:
 * returns the list and what would be done. `apply: true`: does it. Lifetime and rewards are never listed.
 * Past due for less than 3 days: the 3-day countdown starts instead (first email), the sweep finishes it.
 */
export async function catchUpUnpaid(db, stripe, { apply = false, mailer = null, log = console, now = Date.now() } = {}) {
  const rows = await db.all(`SELECT l.*, u.email AS account_email FROM licenses l LEFT JOIN users u ON u.id = l.user_id
    WHERE l.status = 'active' AND l.plan IN ('month', 'year') AND l.stripe_subscription_id IS NOT NULL ORDER BY l.created_at`);
  const found = [];
  for (const lic of rows) {
    let sub = null;
    let status;
    try { sub = await stripe.subscriptions.retrieve(lic.stripe_subscription_id); status = sub.status; } catch (err) {
      if (!missing(err)) throw err;
      status = 'not_found';
    }
    if (!UNPAID_STATUSES.includes(status) && status !== 'not_found') continue;
    const paidAt = status === 'not_found' ? null : await lastPayment(stripe, lic.stripe_subscription_id).catch(() => null);
    // Since when it doesn't pay: the open invoice of a past_due subscription, else now.
    let since = null;
    if (status === 'past_due' && sub?.latest_invoice) {
      const inv = typeof sub.latest_invoice === 'object' ? sub.latest_invoice : await stripe.invoices.retrieve(idOf(sub.latest_invoice)).catch(() => null);
      since = inv?.created ? Number(inv.created) * 1000 : null;
    }
    const grace = status === 'past_due' && !!paidAt && since && now - since < GRACE_DAYS * DAY;
    const action = grace ? `3-day countdown until ${new Date(since + GRACE_DAYS * DAY).toISOString().slice(0, 10)} (email now, revoke then if still unpaid)`
      : status === 'canceled' || status === 'not_found' || status === 'incomplete_expired' ? 'revoke + end email'
        : 'cancel in Stripe + revoke + end email';
    found.push({ email: lic.account_email || lic.email, license: lic.id, subscription: lic.stripe_subscription_id, status, plan: lic.plan,
      last_payment: paidAt ? new Date(paidAt).toISOString().slice(0, 10) : 'never', action });
    if (!apply) continue;
    if (grace) {
      await onPaymentFailed(db, stripe, { id: idOf(sub.latest_invoice), subscription: lic.stripe_subscription_id }, { mailer, log, now: since });
      continue;
    }
    await endUnpaid(db, status === 'not_found' || status === 'canceled' ? null : stripe, lic, { mailer, log, why: paidAt || status === 'not_found' ? 'catch_up' : 'trial' });
    if (status === 'canceled' || status === 'not_found') await stopOrphanRoutes(db, stripe, log);
  }
  return found;
}
