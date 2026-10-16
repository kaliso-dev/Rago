// Stripe Checkout (subscription, or the one-time Lifetime price), billing portal and webhooks.
import Stripe from 'stripe';
import { audit } from './db.js';
import { fulfillCheckoutSession, revokeForCharge, setLicenseStatus, syncSubscription } from './licensing.js';
import { codeFull, getAffiliate, voidReferrals } from './affiliates.js';

export function createStripe(cfg) {
  return cfg.stripeSecretKey ? new Stripe(cfg.stripeSecretKey) : null;
}

const isLive = (cfg) => /^(sk|rk)_live_/.test(cfg.stripeSecretKey || '');
/** 'live' or 'test' from STRIPE_SECRET_KEY, null without a key. Prices, codes and customers exist in one mode only. */
export const stripeMode = (cfg) => (!cfg.stripeSecretKey ? null : isLive(cfg) ? 'live' : 'test');
const missing = (err) => err?.statusCode === 404 || err?.code === 'resource_missing';

/** The price for ?interval=month|year, falling back to whichever is configured. 'lifetime': the one-time Lifetime price. */
export function priceFor(cfg, interval) {
  // Lifetime (2026-10-16): one payment, its own price (STRIPE_PRICE_LIFETIME), sold with or without the subscriptions.
  if (interval === 'lifetime') return cfg.stripePriceLifetime ? { price: cfg.stripePriceLifetime, interval: null, plan: 'lifetime' } : null;
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
  const terms = async (o) => {
    try {
      return await buildCheckout(stripe, cfg, user, { ...o, terms: true });
    } catch (err) {
      if (!/terms of service|terms_of_service/i.test(err.message || '')) throw err;
      log.error?.('[stripe] Terms checkbox refused: set the Terms of Service URL in Stripe (Settings > Public details).', err.message);
      return buildCheckout(stripe, cfg, user, { ...o, terms: false });
    }
  };
  // The account's earlier Stripe customer may not exist with this key: bought with the test keys before
  // the switch to live (or deleted in Stripe). The checkout then opens with the email, as for a first purchase.
  const open = async (o) => {
    try {
      return await terms(o);
    } catch (err) {
      if (!o.customerId || !missing(err) || !/customer/i.test(`${err.param || ''} ${err.message || ''}`)) throw err;
      log.error?.(`[stripe] customer ${o.customerId} not found in ${stripeMode(cfg) || 'this'} mode, checkout opens without it:`, err.message);
      return terms({ ...o, customerId: null });
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

/**
 * What a Lifetime buyer reads above the Pay button. `replaces`: a subscriber switching to Lifetime, whose
 * subscription stops once this is paid (stopReplacedSubscriptions).
 */
const lifetimeText = (user, replaces) => ['One payment: Rago Optimizer Premium for life on one Windows PC. No subscription, nothing renews.',
  ...(replaces ? ['Your current subscription stops right after this payment.'] : []),
  ...(user ? [] : ['You create your account right after paying.'])].join(' ');

async function buildCheckout(stripe, cfg, user, { interval, customerId, terms, ref, promotionCode, trialEnd, replaces } = {}) {
  const choice = priceFor(cfg, interval);
  const metadata = { product: RAGO_PRODUCT, ...(choice.interval ? { interval: choice.interval } : {}), ...(choice.plan ? { plan: choice.plan } : {}), ...(ref ? { ref } : {}) };
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
      custom_text: custom(choice.plan === 'lifetime' ? lifetimeText(user, replaces)
        : 'Rago Optimizer Premium works on one Windows PC per license. You create your account right after paying.'),
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

/** An active promotion code typed by people (RAGO15, an affiliate code…), or null. Used up (all its uses taken): null. */
export async function findPromotionCode(stripe, code) {
  if (!/^[A-Za-z0-9-]{2,40}$/.test(String(code || ''))) return null;
  try {
    const promo = (await stripe.promotionCodes.list({ code, active: true, limit: 1 })).data[0] || null;
    return promo && promo.max_redemptions != null && (promo.times_redeemed || 0) >= promo.max_redemptions ? null : promo;
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

/** What Lifetime costs (2026-10-16): $59.99, once. The site shows the same amount (priceLifetime in site/src/page.html): change both together. */
export const LIFETIME_PRICE = { amount: 5999, currency: 'usd' };

/**
 * The Lifetime offer as Stripe has it, for the site's card and /buy/lifetime: { amount, currency } (cents, 'usd'), or
 * null when STRIPE_PRICE_LIFETIME isn't set, doesn't exist in this mode, isn't an active one-time price, or isn't
 * LIFETIME_PRICE (another price pasted by mistake is never sold). `options`: Stripe request options (timeout).
 * Throws when Stripe doesn't answer (the caller keeps its last answer).
 */
export async function lifetimePrice(stripe, cfg, options = {}) {
  if (!stripe || !cfg.stripePriceLifetime) return null;
  let p;
  try { p = await stripe.prices.retrieve(cfg.stripePriceLifetime, {}, options); } catch (err) { if (missing(err)) return null; throw err; }
  return p.active && p.type === 'one_time' && p.unit_amount === LIFETIME_PRICE.amount && p.currency === LIFETIME_PRICE.currency
    ? { amount: p.unit_amount, currency: p.currency } : null;
}

// Subscription licenses a Lifetime purchase replaced (licensing.js, the only way a monthly or yearly license is
// 'replaced') whose Stripe subscription isn't stopped yet. Even if that Lifetime was refunded since: the replaced
// license gives no Premium, so its subscription must not renew.
const REPLACED_SUBSCRIPTIONS = `FROM licenses l WHERE l.status = 'revoked' AND l.status_reason = 'replaced'
  AND l.stripe_subscription_id IS NOT NULL AND l.plan IN ('month', 'year')
  AND NOT EXISTS (SELECT 1 FROM audit a WHERE a.license_id = l.id AND a.type = 'license.subscription_stopped')`;
const over = (sub) => !sub || ['canceled', 'incomplete_expired'].includes(sub.status);

/**
 * A subscriber bought Lifetime: the subscription it replaced is canceled in Stripe, so it never renews. Safe to call
 * again, and twice at once (the webhook and the success page): each one is stopped once, one already canceled is only
 * noted. Never throws: a failure is logged and retried by the hourly sweep. Returns { replaced, failed }: how many
 * subscriptions the Lifetime `lifetimeId` replaced (any Lifetime of the account when not given), and the ids still running.
 */
export async function stopReplacedSubscriptions(db, stripe, userId, log = console, lifetimeId = null) {
  // replaceOld (licensing.js) notes each replaced subscription with { by: <the Lifetime license id> }.
  const replaced = (lifetimeId
    ? await db.get("SELECT COUNT(*)::int AS n FROM audit WHERE type = 'license.subscription_replaced' AND user_id = ? AND detail = ?", [userId, JSON.stringify({ by: lifetimeId })])
    : await db.get(`SELECT COUNT(*)::int AS n FROM licenses WHERE user_id = ? AND status = 'revoked'
      AND status_reason = 'replaced' AND stripe_subscription_id IS NOT NULL AND plan IN ('month', 'year')`, [userId])).n;
  const failed = [];
  for (const l of await db.all(`SELECT l.id, l.stripe_subscription_id ${REPLACED_SUBSCRIPTIONS} AND l.user_id = ?`, [userId])) {
    const id = l.stripe_subscription_id;
    const read = async () => { try { return await stripe.subscriptions.retrieve(id); } catch (err) { if (missing(err)) return null; throw err; } };
    try {
      // Gone or already over (canceled from the portal meanwhile): nothing left to stop.
      const running = !over(await read());
      if (running) {
        try {
          await stripe.subscriptions.cancel(id);
        } catch (err) {
          // Canceled by the other caller in the meantime: Stripe refuses a second cancel, the subscription is stopped.
          if (!over(await read())) throw err;
        }
      }
      await audit(db, 'license.subscription_stopped', { licenseId: l.id, userId, detail: { subscription: id, by: 'lifetime', ...(running ? {} : { already: true }) } });
    } catch (err) {
      log.error?.(`[stripe] subscription ${id} replaced by Lifetime not canceled yet:`, err.message);
      failed.push(id);
    }
  }
  return { replaced, failed };
}

/** Hourly sweep: the subscriptions replaced by Lifetime that a Stripe error left running. Returns how many accounts. */
export async function stopAllReplacedSubscriptions(db, stripe, log = console) {
  if (!stripe) return 0;
  const rows = await db.all(`SELECT DISTINCT l.user_id ${REPLACED_SUBSCRIPTIONS}`);
  for (const r of rows) await stopReplacedSubscriptions(db, stripe, r.user_id, log);
  return rows.length;
}

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
      // Lifetime bought while subscribed: the subscription it replaced stops now.
      if (out.license?.plan === 'lifetime' && out.license.status === 'active' && out.license.user_id && stripe) await stopReplacedSubscriptions(db, stripe, out.license.user_id, log, out.license.id);
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
  await db.run('INSERT INTO stripe_events (id, type, received_at, livemode) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING',
    [event.id, event.type, Date.now(), typeof event.livemode === 'boolean' ? event.livemode : null]);
  return label;
}

// ---------- Going live: what /admin checks in the key's Stripe mode. Messages in French (only Sofiene reads them). ----------

/** The events the webhook destination sends (docs/MISE-EN-LIGNE.md, step 6). */
export const WEBHOOK_EVENTS = Object.freeze(['checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
  'customer.subscription.paused', 'customer.subscription.resumed', 'invoice.paid', 'charge.refunded', 'charge.dispute.created']);

/** Licenses bought with the test keys (Checkout Session id cs_test_…) that still give Premium. */
export const activeTestLicenses = (db) =>
  db.all("SELECT * FROM licenses WHERE status = 'active' AND LEFT(stripe_session_id, 8) = 'cs_test_' ORDER BY created_at");

/**
 * Once the live key is in, the test purchases still in the shared database stop giving Premium
 * (status_reason 'test_mode'), and stop counting for an affiliate. Returns how many were ended.
 */
export async function endTestLicenses(db, cfg) {
  if (stripeMode(cfg) !== 'live') return 0;
  const rows = await activeTestLicenses(db);
  for (const r of rows) await setLicenseStatus(db, r.id, 'revoked', 'test_mode');
  // The affiliate's spot frees up; the hourly sweep turns their Stripe code back on.
  await voidReferrals(db, rows.map((r) => r.id), 'test_mode');
  return rows.length;
}

const money = (amount, currency) => `${(Number(amount || 0) / 100).toFixed(2).replace('.', ',')} ${String(currency || '').toUpperCase()}`;
const pathOf = (url) => { try { return new URL(url); } catch { return null; } };

/**
 * Whether the key, the prices, the webhook destination and the customer portal are set up in the mode of
 * STRIPE_SECRET_KEY. Each check is { label, level: ok | warn | error, text }. Never throws: a check Stripe
 * doesn't answer says so. `webhook` is what the server saw since it started ({ refusedAt, otherModeAt }).
 */
export async function stripeChecks(stripe, cfg, { db = null, webhook = {} } = {}) {
  const mode = stripeMode(cfg);
  const checks = [];
  const add = (label, level, text) => checks.push({ label, level, text });
  if (!stripe || !mode) {
    add('Clé', 'error', 'STRIPE_SECRET_KEY manque dans Railway : personne ne peut payer.');
    return { mode, checks, testLicenses: 0 };
  }
  const other = mode === 'live' ? 'test' : 'live';
  // Stripe says "a similar object exists in test mode" for an id made with the other key.
  const otherMode = (err) => new RegExp(`exists in ${other} mode`, 'i').test(err?.message || '');
  const failed = (err) => (err?.message || String(err)).slice(0, 200);
  add('Clé', mode === 'live' ? 'ok' : 'warn', mode === 'live' ? 'Clé live : les paiements sont réels.' : 'Clé de test : aucun paiement n’est réel.');

  const [account, monthly, yearly, lifetime, hooks, portal, lastEvent, testRows] = await Promise.allSettled([
    mode === 'live' ? stripe.accounts.retrieveCurrent() : null,
    cfg.stripePriceMonthly ? stripe.prices.retrieve(cfg.stripePriceMonthly, { expand: ['product'] }) : null,
    cfg.stripePriceYearly ? stripe.prices.retrieve(cfg.stripePriceYearly, { expand: ['product'] }) : null,
    cfg.stripePriceLifetime ? stripe.prices.retrieve(cfg.stripePriceLifetime, { expand: ['product'] }) : null,
    stripe.webhookEndpoints.list({ limit: 100 }),
    stripe.billingPortal.configurations.list({ is_default: true, limit: 1 }),
    db ? db.get('SELECT type, received_at FROM stripe_events WHERE livemode = ? ORDER BY received_at DESC LIMIT 1', [mode === 'live']) : null,
    db && mode === 'live' ? activeTestLicenses(db) : [],
  ]);

  if (mode === 'live') {
    if (account.status === 'rejected') add('Compte', 'warn', `Stripe n’a pas répondu : ${failed(account.reason)}`);
    else if (!account.value?.charges_enabled) add('Compte', 'error', 'Stripe n’accepte pas encore de paiements sur ce compte : termine « Activer les paiements » dans Stripe.');
    else {
      const label = account.value.settings?.payments?.statement_descriptor;
      add('Compte', 'ok', `Paiements activés.${label ? ` Libellé sur le relevé bancaire : ${label}.` : ''}`);
    }
  }

  const prices = [['Prix mensuel', 'STRIPE_PRICE_MONTHLY', cfg.stripePriceMonthly, 'month', monthly], ['Prix annuel', 'STRIPE_PRICE_YEARLY', cfg.stripePriceYearly, 'year', yearly]];
  const currencies = new Set();
  for (const [label, name, id, interval, res] of prices) {
    const each = interval === 'month' ? 'par mois' : 'par an';
    if (!id) { add(label, 'error', `${name} est vide : le bouton d’achat affiche « Checkout opens soon ».`); continue; }
    if (res.status === 'rejected') {
      add(label, 'error', missing(res.reason)
        ? `${id} n’existe pas en mode ${mode}${otherMode(res.reason) ? ` : c’est un prix du mode ${other}. Mets dans ${name} le price_ créé en mode ${mode}` : ''}.`
        : `Stripe n’a pas répondu : ${failed(res.reason)}`);
      continue;
    }
    const p = res.value;
    const wrong = [];
    if (!p.active) wrong.push('il est archivé dans Stripe');
    if (p.type !== 'recurring' || p.recurring?.interval !== interval || (p.recurring?.interval_count || 1) !== 1) wrong.push(`ce n’est pas un prix récurrent ${interval === 'month' ? 'mensuel' : 'annuel'}`);
    if (wrong.length) { add(label, 'error', `${id} : ${wrong.join(', ')}.`); continue; }
    currencies.add(p.currency);
    const product = typeof p.product === 'object' && p.product?.name ? `${p.product.name} · ` : '';
    add(label, 'ok', `${product}${money(p.unit_amount, p.currency)} ${each}.`);
  }
  if (currencies.size > 1) add('Devise', 'error', 'Les deux prix ne sont pas dans la même devise : le site affiche des dollars, crée-les en USD.');

  // Lifetime (2026-10-16): optional. Without it the site's Lifetime card says "Coming soon" and nothing is sold.
  const life = cfg.stripePriceLifetime;
  if (!life) add('Prix Lifetime', 'warn', 'STRIPE_PRICE_LIFETIME est vide : la carte Lifetime du site affiche « Coming soon » et rien n’est vendu.');
  else if (lifetime.status === 'rejected') {
    add('Prix Lifetime', 'error', missing(lifetime.reason)
      ? `${life} n’existe pas en mode ${mode}${otherMode(lifetime.reason) ? ` : c’est un prix du mode ${other}. Mets dans STRIPE_PRICE_LIFETIME le price_ créé en mode ${mode}` : life.startsWith('prod_') ? ' : c’est l’identifiant du produit, mets celui du prix (price_…)' : ''}.`
      : `Stripe n’a pas répondu : ${failed(lifetime.reason)}`);
  } else {
    const p = lifetime.value;
    const wrong = [];
    if (!p.active) wrong.push('il est archivé dans Stripe');
    if (p.type !== 'one_time') wrong.push('ce n’est pas un prix en paiement unique');
    if (p.currency !== LIFETIME_PRICE.currency) wrong.push('il n’est pas en USD alors que le site affiche des dollars');
    else if (p.unit_amount !== LIFETIME_PRICE.amount) wrong.push(`il vaut ${money(p.unit_amount, p.currency)} au lieu de ${money(LIFETIME_PRICE.amount, LIFETIME_PRICE.currency)}, le prix affiché sur le site`);
    const product = typeof p.product === 'object' && p.product?.name ? `${p.product.name} · ` : '';
    if (wrong.length) add('Prix Lifetime', 'error', `${life} : ${wrong.join(', ')}. Lifetime n’est pas vendu.`);
    else add('Prix Lifetime', 'ok', `${product}${money(p.unit_amount, p.currency)} une fois, le prix affiché sur le site.`);
  }

  // The destination(s) sending to /webhooks/stripe on this server (or its other address on Railway).
  const ours = hooks.status === 'fulfilled' ? (hooks.value?.data || []).filter((e) => pathOf(e.url)?.pathname === '/webhooks/stripe') : [];
  const host = pathOf(cfg.publicUrl)?.host;
  if (hooks.status === 'rejected') add('Webhook', 'warn', `Stripe ne laisse pas lire les webhooks avec cette clé (${failed(hooks.reason)}). Vérifie dans Stripe → Développeurs → Webhooks.`);
  else if (!ours.length) add('Webhook', 'error', `Aucune destination en mode ${mode} vers ${cfg.publicUrl}/webhooks/stripe : crée-la (étape 6 du guide). Sans elle, remboursements et fins d’abonnement ne coupent pas Premium.`);
  else {
    const hook = ours.find((e) => e.status === 'enabled' && pathOf(e.url)?.host === host) || ours.find((e) => e.status === 'enabled') || ours[0];
    const events = hook.enabled_events || [];
    const lacking = events.includes('*') ? [] : WEBHOOK_EVENTS.filter((e) => !events.includes(e));
    const where = pathOf(hook.url).host;
    if (hook.status !== 'enabled') add('Webhook', 'error', `La destination vers ${where} est désactivée dans Stripe : réactive-la.`);
    else if (lacking.length) add('Webhook', 'error', `Il manque ${lacking.length === 1 ? 'un événement' : `${lacking.length} événements`} à la destination vers ${where} : ${lacking.join(', ')}.`);
    else if (ours.length > 1) add('Webhook', 'warn', `${ours.length} destinations envoient vers /webhooks/stripe, chacune avec son propre secret : Railway n’en a qu’un, supprime les autres dans Stripe.`);
    else add('Webhook', 'ok', `Destination vers ${where}, avec les ${WEBHOOK_EVENTS.length} événements.`);
  }

  // The signing secret can't be read from Stripe: what the server received says whether it matches.
  const seen = lastEvent.status === 'fulfilled' ? lastEvent.value : null;
  const since = (at) => new Date(Number(at)).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
  if (webhook.otherModeAt && !(seen && Number(seen.received_at) > webhook.otherModeAt)) {
    add('Secret du webhook', 'error', `Un événement du mode ${other} est arrivé (${since(webhook.otherModeAt)}) : STRIPE_WEBHOOK_SECRET est celui de la destination ${other}. Mets le whsec_ de la destination ${mode}.`);
  } else if (webhook.refusedAt && !(seen && Number(seen.received_at) > webhook.refusedAt)) {
    add('Secret du webhook', 'error', `Un événement a été refusé (${since(webhook.refusedAt)}, signature fausse) : STRIPE_WEBHOOK_SECRET n’est pas le whsec_ de la destination ${mode}, ou une destination du mode ${other} envoie encore ici (désactive-la dans Stripe).`);
  } else if (seen) {
    add('Secret du webhook', 'ok', `Dernier événement ${mode} reçu : ${seen.type}, ${since(seen.received_at)}.`);
  } else {
    add('Secret du webhook', 'warn', `Aucun événement ${mode} reçu pour l’instant : le premier achat le confirmera.`);
  }

  const conf = portal.status === 'fulfilled' ? portal.value?.data?.[0] : null;
  if (portal.status === 'rejected') add('Portail client', 'warn', `Stripe n’a pas répondu : ${failed(portal.reason)}`);
  else if (!conf) add('Portail client', 'error', `Pas encore enregistré en mode ${mode} : Paramètres → Facturation → Portail client → Enregistrer. Sans lui, « Cancel or manage subscription » ne s’ouvre pas.`);
  else if (!conf.active) add('Portail client', 'error', 'Le portail par défaut est désactivé dans Stripe.');
  else {
    const gaps = [];
    if (!conf.features?.subscription_cancel?.enabled) gaps.push('la résiliation n’est pas proposée');
    if (!conf.business_profile?.terms_of_service_url || !conf.business_profile?.privacy_policy_url) gaps.push('il manque les liens Conditions et Confidentialité');
    add('Portail client', gaps.length ? 'warn' : 'ok', gaps.length ? `${gaps.join(', ')}.` : 'Enregistré, résiliation proposée.');
  }

  const login = cfg.portalLoginUrl;
  if (!login) add('Lien « Cancel subscription »', 'warn', 'STRIPE_PORTAL_LOGIN_URL est vide : le lien est masqué en bas des pages compte.');
  else if (mode === 'live' && /\/login\/test_/.test(login)) add('Lien « Cancel subscription »', 'error', 'STRIPE_PORTAL_LOGIN_URL est le lien du mode test : mets celui du portail en mode live.');
  else add('Lien « Cancel subscription »', 'ok', 'Renseigné.');

  const testLicenses = testRows.status === 'fulfilled' ? testRows.value.length : 0;
  return { mode, checks, testLicenses };
}
