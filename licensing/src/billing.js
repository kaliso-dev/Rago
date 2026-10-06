// Stripe Checkout (subscription, or the old one-time price), billing portal and webhooks.
import Stripe from 'stripe';
import { fulfillCheckoutSession, revokeForCharge, syncSubscription } from './licensing.js';
import { voidReferrals } from './affiliates.js';

export function createStripe(cfg) {
  return cfg.stripeSecretKey ? new Stripe(cfg.stripeSecretKey) : null;
}

/** The price for ?interval=month|year, falling back to whichever is configured. */
export function priceFor(cfg, interval) {
  if (!cfg.subscriptions) return cfg.stripePriceId ? { price: cfg.stripePriceId, interval: null } : null;
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
  try {
    return await buildCheckout(stripe, cfg, user, { ...opts, terms: true });
  } catch (err) {
    if (!/terms of service|terms_of_service/i.test(err.message || '')) throw err;
    log.error?.('[stripe] Terms checkbox refused: set the Terms of Service URL in Stripe (Settings > Public details).', err.message);
    return buildCheckout(stripe, cfg, user, { ...opts, terms: false });
  }
}

async function buildCheckout(stripe, cfg, user, { interval, customerId, terms } = {}) {
  const choice = priceFor(cfg, interval);
  const metadata = { product: RAGO_PRODUCT, ...(choice.interval ? { interval: choice.interval } : {}) };
  const common = {
    line_items: [{ price: choice.price, quantity: 1 }],
    success_url: `${cfg.publicUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cfg.cancelUrl,
    ...(customerId ? { customer: customerId } : { customer_email: user?.email }),
    client_reference_id: user?.id,
    allow_promotion_codes: true,
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
    subscription_data: { metadata },
    custom_text: custom('Rago Optimizer Premium works on one Windows PC. Cancel anytime from your account. You create your account right after paying.'),
  });
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
