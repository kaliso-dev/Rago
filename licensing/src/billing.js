// Stripe Checkout (subscription, or the old one-time price), billing portal and webhooks.
import Stripe from 'stripe';
import { fulfillCheckoutSession, revokeForCharge, syncSubscription } from './licensing.js';
import { codeFull, getAffiliate, voidReferrals } from './affiliates.js';

export function createStripe(cfg) {
  return cfg.stripeSecretKey ? new Stripe(cfg.stripeSecretKey) : null;
}

/** The price for ?interval=month|year, falling back to whichever is configured. */
export function priceFor(cfg, interval) {
  // Premium is sold as a subscription only (decision of Oct 6, 2026). Without the recurring prices
  // nothing is sold: the old one-time STRIPE_PRICE_ID would sell a lifetime license the site doesn't offer.
  if (!cfg.subscriptions) return null;
  if (interval === 'year' && cfg.stripePriceYearly) return { price: cfg.stripePriceYearly, interval: 'year' };
  if (interval === 'month' && cfg.stripePriceMonthly) return { price: cfg.stripePriceMonthly, interval: 'month' };
  // No choice given: yearly, the plan the site highlights.
  return cfg.stripePriceYearly ? { price: cfg.stripePriceYearly, interval: 'year' } : { price: cfg.stripePriceMonthly, interval: 'month' };
}

/**
 * @param user the signed-in account, if any
 * @param customerId a Stripe customer from an earlier license of this account (resubscribing)
 */
// EU law: immediate access only waives the 14-day withdrawal right if the buyer asks for it explicitly.
const termsText = (cfg) => `I agree to the [Terms of Sale](${cfg.siteUrl}/terms.html) and ask for immediate access to Premium. I understand I lose my 14-day right of withdrawal once the license is delivered.`;

/**
 * Creates the Checkout Session with the required terms checkbox. Stripe refuses that checkbox until
 * the Terms URL is set in its dashboard (Settings > Public details): in that case we log it loudly
 * and still open the checkout, so sales don't stop while the setting is missing.
 */
export async function createCheckout(stripe, cfg, user, opts = {}, log = console) {
  const open = async (o) => {
    try {
      return await buildCheckout(stripe, cfg, user, { ...o, terms: true });
    } catch (err) {
      if (!/terms of service|terms_of_service/i.test(err.message || '')) throw err;
      log.error?.('[stripe] Terms checkbox refused: set the Terms of Service URL in Stripe (Settings > Public details).', err.message);
      return buildCheckout(stripe, cfg, user, { ...o, terms: false });
    }
  };
  if (!opts.promotionCode) return open(opts);
  // A code Stripe refuses for this buyer (e.g. already a customer): the checkout opens without it,
  // with the field to type a code.
  try {
    return await open(opts);
  } catch (err) {
    log.error?.('[stripe] discount not applied, checkout opens without it:', err.message);
    return open({ ...opts, promotionCode: null });
  }
}

async function buildCheckout(stripe, cfg, user, { interval, customerId, terms, ref, promotionCode, trialEnd } = {}) {
  const choice = priceFor(cfg, interval);
  const metadata = { product: RAGO_PRODUCT, ...(choice.interval ? { interval: choice.interval } : {}), ...(ref ? { ref } : {}) };
  const common = {
    line_items: [{ price: choice.price, quantity: 1 }],
    success_url: `${cfg.publicUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cfg.cancelUrl,
    ...(customerId ? { customer: customerId } : { customer_email: user?.email }),
    client_reference_id: user?.id,
    // A code from the link is already applied; otherwise the buyer can type one (affiliate code, RAGO15…).
    ...(promotionCode ? { discounts: [{ promotion_code: promotionCode }] } : { allow_promotion_codes: true }),
    metadata,
    ...(terms ? { consent_collection: { terms_of_service: 'required' } } : {}),
  };
  const custom = (submit) => ({ submit: { message: submit }, ...(terms ? { terms_of_service_acceptance: { message: termsText(cfg) } } : {}) });
  if (!choice.interval) {
    return stripe.checkout.sessions.create({
      ...common,
      mode: 'payment',
      ...(customerId ? {} : { customer_creation: 'always' }),
      payment_intent_data: { metadata },
      custom_text: custom('Rago Optimizer Premium works on one Windows PC per license. You create your account right after paying.'),
    });
  }
  return stripe.checkout.sessions.create({
    ...common,
    mode: 'subscription',
    // An affiliate reward still running: the subscription starts paying when it ends (Stripe needs 2+ days).
    subscription_data: { metadata, ...(trialEnd && trialEnd > Date.now() / 1000 + 2 * 86400 ? { trial_end: trialEnd } : {}) },
    custom_text: custom('Rago Optimizer Premium works on one Windows PC. Cancel anytime from your account. You create your account right after paying.'),
  });
}

const isLive = (cfg) => /^(sk|rk)_live_/.test(cfg.stripeSecretKey || '');
const missing = (err) => err?.statusCode === 404 || err?.code === 'resource_missing';

/** Creates the coupon `id` once (test and live mode each have their own). */
export async function ensureCoupon(stripe, id, percent, duration, name) {
  try { return (await stripe.coupons.retrieve(id)).id; } catch (err) { if (!missing(err)) throw err; }
  try {
    return (await stripe.coupons.create({ id, percent_off: percent, duration, name })).id;
  } catch (err) {
    if (err?.code === 'resource_already_exists') return id;
    throw err;
  }
}

/** An active promotion code typed by people (RAGO15, an affiliate code…), or null. */
export async function findPromotionCode(stripe, code) {
  if (!/^[A-Za-z0-9-]{2,40}$/.test(String(code || ''))) return null;
  try {
    return (await stripe.promotionCodes.list({ code, active: true, limit: 1 })).data[0] || null;
  } catch {
    return null;
  }
}

/**
 * The affiliate's code as a Stripe promotion code (AFFILIATE_DISCOUNT_PERCENT off), so buyers can also type
 * it at checkout. Created once per Stripe mode; switching between test and live keys recreates it.
 * Returns the promotion code id, or null (never throws: the program works without the discount).
 */
export async function ensureAffiliatePromo(db, stripe, cfg, aff, log = console) {
  if (!stripe || !aff) return null;
  const live = isLive(cfg);
  if (aff.stripe_promo_id && aff.stripe_promo_live === live) return aff.stripe_promo_id;
  try {
    const pct = cfg.affiliateDiscountPercent;
    const coupon = await ensureCoupon(stripe, `rago-referral-${pct}-${cfg.affiliateDiscountDuration}`, pct,
      cfg.affiliateDiscountDuration, `Referral code, ${pct}% off`);
    let promo;
    try {
      promo = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon }, code: aff.code, metadata: { rago_affiliate: aff.user_id },
        // New customers only: not on a renewal, nor for a buyer who already paid before.
        restrictions: { first_time_transaction: true },
      });
    } catch (err) {
      // Created earlier but not saved here (crash in between): reuse it if it's this affiliate's.
      const found = await findPromotionCode(stripe, aff.code);
      if (found?.metadata?.rago_affiliate !== aff.user_id) throw err;
      promo = found;
    }
    await db.run('UPDATE affiliates SET stripe_promo_id = ?, stripe_promo_live = ?, stripe_promo_active = ? WHERE user_id = ?', [promo.id, live, promo.active !== false, aff.user_id]);
    return promo.id;
  } catch (err) {
    log.error?.(`[stripe] promotion code for affiliate ${aff.code} not created:`, err.message);
    return null;
  }
}

/** Affiliates whose code isn't a promotion code in the current Stripe mode yet (hourly sweep). */
export async function syncAffiliatePromos(db, stripe, cfg, log = console, limit = 50) {
  if (!stripe) return 0;
  const rows = await db.all('SELECT * FROM affiliates WHERE stripe_promo_id IS NULL OR stripe_promo_live IS DISTINCT FROM ? ORDER BY created_at LIMIT ?', [isLive(cfg), limit]);
  let n = 0;
  for (const aff of rows) if (await ensureAffiliatePromo(db, stripe, cfg, aff, log)) n++;
  // Codes that filled up or freed a spot (refund) since: their Stripe discount follows.
  for (const { user_id: id } of await db.all('SELECT user_id FROM affiliates WHERE stripe_promo_id IS NOT NULL')) await syncPromoActive(db, stripe, cfg, id, log);
  return n;
}

/**
 * Turns the affiliate's Stripe promotion code off once their code is full (3 players, or reward given),
 * and back on if a spot frees up. Calls Stripe only when that changes. Never throws.
 */
export async function syncPromoActive(db, stripe, cfg, userId, log = console) {
  try {
    const aff = await getAffiliate(db, userId);
    if (!stripe || !aff?.stripe_promo_id) return;
    const active = !(await codeFull(db, cfg, aff));
    if (aff.stripe_promo_active === active) return;
    await stripe.promotionCodes.update(aff.stripe_promo_id, { active });
    await db.run('UPDATE affiliates SET stripe_promo_active = ? WHERE user_id = ?', [active, userId]);
  } catch (err) {
    log.error?.(`[stripe] promotion code of affiliate ${userId} not updated:`, err.message);
  }
}

/** Stripe-hosted page to change plan, update the card, see invoices or cancel. */
export function billingPortal(stripe, cfg, customerId) {
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${cfg.publicUrl}/account` });
}

export const RAGO_PRODUCT = 'rago-hub-premium';
export const isRagoCheckout = (session) => session?.metadata?.product === RAGO_PRODUCT;

const idOf = (v) => (typeof v === 'string' ? v : v?.id ?? null);

/** Stops future renewals after a refund or dispute. Best effort: the license is already revoked. */
async function cancelSubscriptions(stripe, licenses, log) {
  for (const l of licenses) {
    if (!stripe || !l.stripe_subscription_id) continue;
    try { await stripe.subscriptions.cancel(l.stripe_subscription_id); } catch (err) { log?.error?.('[stripe] cancel failed', err.message); }
  }
}

/**
 * Handles a verified Stripe event. Returns a short label for logs.
 * `onLicense(license, claimToken)` runs when a new license was created (to send the email).
 * Subscription events re-read the subscription from Stripe, so events arriving out of order can't
 * bring back an old state.
 */
export async function handleStripeEvent(db, event, { stripe, onLicense, log } = {}) {
  const seen = await db.get('SELECT 1 FROM stripe_events WHERE id = ?', [event.id]);
  if (seen) return 'duplicate';
  let label = 'ignored';
  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      // Only our own checkouts (/buy sets this). Other products or Payment Links on the account are ignored.
      if (!isRagoCheckout(obj)) { label = 'not_rago'; break; }
      const sub = obj.mode === 'subscription' && obj.subscription && stripe
        ? await stripe.subscriptions.retrieve(idOf(obj.subscription)) : null;
      const out = await fulfillCheckoutSession(db, obj, sub);
      if (out.created && onLicense) await onLicense(out.license, out.claimToken);
      label = out.created ? 'license_created' : out.license ? 'license_exists' : 'unpaid';
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
    case 'invoice.paid': {
      const subId = event.type.startsWith('invoice.')
        ? idOf(obj.subscription ?? obj.parent?.subscription_details?.subscription) : obj.id;
      if (!subId) break;
      const sub = stripe ? await stripe.subscriptions.retrieve(subId) : obj;
      label = `subscription:${await syncSubscription(db, sub)}`;
      break;
    }
    case 'charge.refunded':
    case 'charge.dispute.created': {
      // Full refunds only; a partial refund (e.g. a goodwill discount) keeps the license.
      if (event.type === 'charge.refunded' && !obj.refunded) break;
      const reason = event.type === 'charge.refunded' ? 'refunded' : 'disputed';
      let customer = idOf(obj.customer);
      if (!customer && obj.charge && stripe) customer = idOf((await stripe.charges.retrieve(idOf(obj.charge))).customer);
      const revoked = await revokeForCharge(db, { paymentIntent: idOf(obj.payment_intent), customer }, reason);
      await voidReferrals(db, revoked.map((l) => l.id), reason);
      await cancelSubscriptions(stripe, revoked, log);
      label = `revoked:${revoked.length}`;
      break;
    }
  }
  // Recorded after handling: if handling throws, Stripe retries and we try again.
  await db.run('INSERT INTO stripe_events (id, type, received_at) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING', [event.id, event.type, Date.now()]);
  return label;
}
