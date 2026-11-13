// Rago Route option (2026-11-13): $3 a month on top of Premium, as its own Stripe subscription (STRIPE_PRICE_ROUTE).
// Sofiene : « pour y avoir accès il faut payer 3$ en plus de l'abonnement premium il faut que ça soit une option ».
// Its own subscription, not an item of the Premium one: Stripe puts only one billing interval in a subscription, and
// yearly and Lifetime players buy it too. /route/token asks for an active Premium AND an active option.
import { audit } from './db.js';
import { subscriptionFacts } from './licensing.js';

export const ROUTE_PRODUCT = 'rago-route';
export const isRouteCheckout = (session) => session?.metadata?.product === ROUTE_PRODUCT;
export const isRouteSubscription = (sub) => sub?.metadata?.product === ROUTE_PRODUCT;
/** What the option costs. The site and the app show the same amount: change them together. */
export const ROUTE_PRICE = { amount: 300, currency: 'usd', interval: 'month' };

const idOf = (v) => (typeof v === 'string' ? v : v?.id ?? null);
const LIVE = "status IN ('active', 'trialing', 'past_due')";

/** The account's running option (the most recent), or null. `cancel_at_period_end`: it stops at `current_period_end`. */
export function routeOption(db, userId) {
  return db.get(`SELECT * FROM route_subscriptions WHERE user_id = ? AND ${LIVE} ORDER BY created_at DESC LIMIT 1`, [userId]);
}

/**
 * The free trial of Premium still running for this license (Sofiene, 2026-11-13: « pendant l'essai gratuit ils ont
 * accès à tout »): Rago Route works without the option until the trial ends. Returns the trial end (ms) or null.
 */
export async function trialEnd(db, license, trialDays, now = Date.now()) {
  const end = Number(license?.current_period_end);
  if (!license?.stripe_subscription_id || !(end > now)) return null;
  const row = await db.get('SELECT 1 FROM trials WHERE subscription_id = ? AND NOT charged_now AND started_at > ?',
    [license.stripe_subscription_id, now - Math.max(trialDays, 1) * 86400 * 1000 - 3600 * 1000]);
  return row ? end : null;
}

/** Saves what Stripe says about an option subscription (webhook, success page). Returns its status, or 'unknown'. */
export async function syncRouteSubscription(db, sub, userId = null) {
  const user = userId || sub?.metadata?.user_id;
  if (!sub?.id || !user) return 'unknown';
  const f = subscriptionFacts(sub);
  const now = Date.now();
  const before = await db.get('SELECT status FROM route_subscriptions WHERE stripe_subscription_id = ?', [sub.id]);
  await db.run(`INSERT INTO route_subscriptions (stripe_subscription_id, user_id, stripe_customer_id, status, current_period_end, cancel_at_period_end, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = EXCLUDED.status,
    current_period_end = COALESCE(EXCLUDED.current_period_end, route_subscriptions.current_period_end),
    cancel_at_period_end = EXCLUDED.cancel_at_period_end, stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, route_subscriptions.stripe_customer_id),
    updated_at = EXCLUDED.updated_at`,
  [sub.id, user, idOf(sub.customer), sub.status || 'incomplete', f.periodEnd, f.cancelAtPeriodEnd, now, now]);
  if (before?.status !== sub.status) await audit(db, 'route.subscription', { userId: user, detail: { subscription: sub.id, status: sub.status } });
  return sub.status || 'unknown';
}

/** Checkout for the option: monthly, for a signed-in account with Premium. */
export function createRouteCheckout(stripe, cfg, user, customerId) {
  const metadata = { product: ROUTE_PRODUCT, user_id: user.id };
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: cfg.stripePriceRoute, quantity: 1 }],
    success_url: `${cfg.publicUrl}/checkout/route?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cfg.publicUrl}/account`,
    ...(customerId ? { customer: customerId } : { customer_email: user.email }),
    client_reference_id: user.id,
    metadata,
    subscription_data: { metadata },
    custom_text: { submit: { message: 'Rago Route, the anti-lag tunnel for Minecraft: $3 a month on top of your Premium. Cancel anytime from your account. It stops with your Premium.' } },
  });
}

/**
 * Hourly sweep: an option still running for an account without an active Premium is canceled in Stripe, so nobody
 * pays for a Rago Route they can't use. Never throws for a Stripe error (logged, retried next hour). Returns how many.
 */
export async function stopOrphanRoutes(db, stripe, log = console) {
  if (!stripe) return 0;
  const rows = await db.all(`SELECT r.* FROM route_subscriptions r WHERE r.${LIVE}
    AND NOT EXISTS (SELECT 1 FROM licenses l WHERE l.user_id = r.user_id AND l.status = 'active')`);
  let n = 0;
  for (const r of rows) {
    try {
      const sub = await stripe.subscriptions.cancel(r.stripe_subscription_id);
      await syncRouteSubscription(db, sub, r.user_id);
      await audit(db, 'route.subscription_stopped', { userId: r.user_id, detail: { subscription: r.stripe_subscription_id, by: 'no_premium' } });
      n++;
    } catch (err) {
      if (err?.statusCode === 404 || err?.code === 'resource_missing') {
        await db.run("UPDATE route_subscriptions SET status = 'canceled', updated_at = ? WHERE stripe_subscription_id = ?", [Date.now(), r.stripe_subscription_id]);
      } else log.error?.(`[stripe] Rago Route option ${r.stripe_subscription_id} without Premium not canceled yet:`, err.message);
    }
  }
  return n;
}
