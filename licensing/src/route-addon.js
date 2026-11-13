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

/**
 * The account's running option (the most recent), or null. `cancel_at_period_end`: it stops at `current_period_end`.
 * One taken with Premium at checkout before the account existed is tied to the license (license_id) until then.
 */
export function routeOption(db, userId) {
  return db.get(`SELECT * FROM route_subscriptions WHERE ${LIVE} AND (user_id = ? OR license_id IN (SELECT id FROM licenses WHERE user_id = ?))
    ORDER BY created_at DESC LIMIT 1`, [userId, userId]);
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

/**
 * Saves what Stripe says about an option subscription (webhook, success pages). Returns its status, or 'unknown'.
 * Tied to the account (user_id), or to the license of the Premium checkout it came with (license_id).
 */
export async function syncRouteSubscription(db, sub, userId = null) {
  const user = userId || sub?.metadata?.user_id || null;
  const license = sub?.metadata?.license_id || null;
  if (!sub?.id || (!user && !license)) return 'unknown';
  const f = subscriptionFacts(sub);
  const now = Date.now();
  const before = await db.get('SELECT status FROM route_subscriptions WHERE stripe_subscription_id = ?', [sub.id]);
  await db.run(`INSERT INTO route_subscriptions (stripe_subscription_id, user_id, license_id, checkout_session, stripe_customer_id, status, current_period_end, cancel_at_period_end, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = EXCLUDED.status,
    user_id = COALESCE(route_subscriptions.user_id, EXCLUDED.user_id), license_id = COALESCE(route_subscriptions.license_id, EXCLUDED.license_id),
    current_period_end = COALESCE(EXCLUDED.current_period_end, route_subscriptions.current_period_end),
    cancel_at_period_end = EXCLUDED.cancel_at_period_end, stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, route_subscriptions.stripe_customer_id),
    updated_at = EXCLUDED.updated_at`,
  [sub.id, user, license, sub.metadata?.checkout_session || null, idOf(sub.customer), sub.status || 'incomplete', f.periodEnd, f.cancelAtPeriodEnd, now, now]);
  if (before?.status !== sub.status) await audit(db, 'route.subscription', { userId: user, licenseId: license, detail: { subscription: sub.id, status: sub.status } });
  return sub.status || 'unknown';
}

/** A Premium checkout opened with « + Rago Route » ticked (/buy?route=1). */
export const wantsRoute = (session) => session?.metadata?.route === '1';

/**
 * Premium bought with « + Rago Route » ticked (2026-11-13): once the Premium checkout is done (webhook or success page,
 * both call this), the option starts as its own subscription, on the same Stripe customer and card. A free trial of
 * Premium includes it: it then starts paying when the trial ends, like Premium (« pendant l'essai gratuit ils ont accès
 * à tout »). `trial` is what settleTrial said ('trial', 'charged_now' or null). Never twice for one checkout (Stripe
 * idempotency key and the checkout_session column). Never throws for a Stripe error: logged, the account page still
 * offers the option. Returns the option's status, 'owned', 'failed' or null (not asked).
 */
export async function addRouteWithPremium(db, stripe, cfg, { session, sub, license, trial = null }, log = console) {
  if (!stripe || !cfg.stripePriceRoute || !wantsRoute(session) || !license || !sub || typeof sub !== 'object') return null;
  const done = await db.get('SELECT status FROM route_subscriptions WHERE checkout_session = ?', [session.id]);
  if (done) return done.status;
  if (license.user_id && await routeOption(db, license.user_id)) return 'owned';
  const customer = idOf(sub.customer) || idOf(session.customer);
  if (!customer) return 'failed';
  try {
    let pm = idOf(sub.default_payment_method);
    if (!pm) pm = (await stripe.paymentMethods.list({ customer, type: 'card', limit: 1 }))?.data?.[0]?.id || null;
    const metadata = { product: ROUTE_PRODUCT, license_id: license.id, ...(license.user_id ? { user_id: license.user_id } : {}), checkout_session: session.id };
    const trialEnd = trial === 'trial' && Number(sub.trial_end) > Date.now() / 1000 + 60 ? Number(sub.trial_end) : null;
    const route = await stripe.subscriptions.create({
      customer,
      items: [{ price: cfg.stripePriceRoute }],
      metadata,
      ...(pm ? { default_payment_method: pm } : {}),
      ...(trialEnd ? { trial_end: trialEnd, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } } : {}),
      payment_behavior: 'allow_incomplete',
      off_session: true,
    }, { idempotencyKey: `rago-route-${session.id}` });
    const status = await syncRouteSubscription(db, route, license.user_id || null);
    await audit(db, 'route.added_at_checkout', { licenseId: license.id, userId: license.user_id || null, detail: { subscription: route.id, status, checkout: session.id } });
    return status;
  } catch (err) {
    log.error?.(`[stripe] Rago Route not added with the Premium of checkout ${session.id}:`, err.message);
    return 'failed';
  }
}

/**
 * Premium set to stop at the end of its period (canceled from the account, the app or the portal): an option that
 * would renew after that stops with it, so a free trial canceled in time costs nothing for Rago Route either. Premium
 * resumed: the options stopped this way go on again. Not when the account keeps another Premium (Lifetime).
 */
export async function followPremium(db, stripe, sub, log = console) {
  if (!stripe || !sub?.id) return 0;
  const lic = await db.get('SELECT id, user_id FROM licenses WHERE stripe_subscription_id = ?', [sub.id]);
  if (!lic) return 0;
  const f = subscriptionFacts(sub);
  if (f.cancelAtPeriodEnd && lic.user_id && await db.get("SELECT 1 FROM licenses WHERE user_id = ? AND id <> ? AND status = 'active'", [lic.user_id, lic.id])) return 0;
  const rows = await db.all(`SELECT * FROM route_subscriptions WHERE ${LIVE} AND (license_id = ? OR (user_id IS NOT NULL AND user_id = ?))`, [lic.id, lic.user_id]);
  let n = 0;
  for (const r of rows) {
    const stop = f.cancelAtPeriodEnd && f.active && !r.cancel_at_period_end && !!f.periodEnd && Number(r.current_period_end) >= f.periodEnd - 86400 * 1000;
    const resume = !f.cancelAtPeriodEnd && f.active && r.stopped_with_premium && r.cancel_at_period_end;
    if (!stop && !resume) continue;
    try {
      const updated = await stripe.subscriptions.update(r.stripe_subscription_id, { cancel_at_period_end: stop });
      await db.run('UPDATE route_subscriptions SET stopped_with_premium = ? WHERE stripe_subscription_id = ?', [stop, r.stripe_subscription_id]);
      await syncRouteSubscription(db, updated, r.user_id);
      n++;
    } catch (err) {
      log.error?.(`[stripe] Rago Route option ${r.stripe_subscription_id} not ${stop ? 'stopped' : 'resumed'} with Premium:`, err.message);
    }
  }
  return n;
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
  // The account's Premium, or the license the option came with (and the account that claimed it).
  const rows = await db.all(`SELECT r.* FROM route_subscriptions r LEFT JOIN licenses o ON o.id = r.license_id WHERE r.${LIVE}
    AND NOT EXISTS (SELECT 1 FROM licenses l WHERE l.status = 'active' AND (l.id = r.license_id OR l.user_id = COALESCE(r.user_id, o.user_id)))`);
  let n = 0;
  for (const r of rows) {
    try {
      const sub = await stripe.subscriptions.cancel(r.stripe_subscription_id);
      await syncRouteSubscription(db, sub, r.user_id);
      await audit(db, 'route.subscription_stopped', { userId: r.user_id, licenseId: r.license_id, detail: { subscription: r.stripe_subscription_id, by: 'no_premium' } });
      n++;
    } catch (err) {
      if (err?.statusCode === 404 || err?.code === 'resource_missing') {
        await db.run("UPDATE route_subscriptions SET status = 'canceled', updated_at = ? WHERE stripe_subscription_id = ?", [Date.now(), r.stripe_subscription_id]);
      } else log.error?.(`[stripe] Rago Route option ${r.stripe_subscription_id} without Premium not canceled yet:`, err.message);
    }
  }
  return n;
}
