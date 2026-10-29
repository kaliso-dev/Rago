import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { serveStatic } from '@hono/node-server/serve-static';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { DUMMY_HASH, maskLicenseKey, randomToken, signValue, unsignValue, verifyPassword } from './crypto.js';
import { DeviceError, parseDevice, sameDevice } from './fingerprint.js';
import { signToken, verifyToken } from './tokens.js';
import { billingPortal, createCheckout, endTestLicenses, ensureAffiliatePromo, findPromotionCode, handleStripeEvent, isRagoCheckout, lifetimePrice, stopReplacedSubscriptions, stripeChecks, stripeMode, syncPromoActive } from './billing.js';
import * as A from './affiliates.js';
import { createInstaller } from './installer.js';
import { createGeo } from './geo.js';
import * as N from './network.js';
import { createDiscord, DiscordError, discordSetupMissing } from './discord.js';
import { createOAuth, OAuthError } from './oauth.js';
import * as L from './licensing.js';
import * as V from './views.js';
import * as P from './profile.js';
import * as R from './reviews.js';
import * as Promo from './promo.js';
import { audit } from './db.js';

const DAY = 86400000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Messages from /brand/voice-en.md. The app may show `message` as is.
const API_ERRORS = {
  invalid_request: [400, 'Something in the request is missing or malformed. Update Rago Optimizer and try again.'],
  invalid_credentials: [401, "That email and password don't match. Try again or reset your password."],
  invalid_token: [401, 'Your session expired. Sign in again.'],
  no_license: [403, "This account doesn't have Rago Optimizer Premium yet. Get it on the website, then sign in again."],
  bound_to_other_device: [403, 'This license is already active on another PC. Rago Optimizer works on one device per license. Contact support on Discord if you changed PCs.'],
  revoked: [403, 'This license is no longer active. Contact support on Discord if you think that\'s a mistake.'],
  subscription_ended: [403, 'Your Rago Optimizer Premium subscription ended. Renew it on the website, then sign in again.'],
  rate_limited: [429, 'Too many attempts. Wait a few minutes and try again.'],
  // Reviews and profile (2026-10-09)
  name_required: [400, 'Add the public name shown with your review.'],
  invalid_name: [400, "Use 2 to 32 letters, numbers, spaces and _ . ' - for your public name. No email or link."],
  invalid_rating: [400, 'Pick a rating from 1 to 5 stars.'],
  empty_comment: [400, 'Write a few words about Rago Optimizer.'],
  comment_too_long: [400, `Keep your review under ${R.COMMENT_MAX} characters.`],
  invalid_image: [400, "This file isn't a picture we can use. Upload a JPG, PNG, WebP or GIF."],
  image_too_large: [413, 'This picture is over 5 MB. Choose a smaller one.'],
  storage_unavailable: [503, "Your photo couldn't be saved right now. Try again in a moment."],
};

function rateLimiter() {
  const hits = new Map();
  const allow = (key, limit, windowMs) => {
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { n: 1, reset: now + windowMs });
      if (hits.size > 50000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      return true;
    }
    h.n++;
    return h.n <= limit;
  };
  allow.count = (key) => { const h = hits.get(key); return h && h.reset >= Date.now() ? h.n : 0; };
  return allow;
}

/**
 * @param deps { cfg, db, keys, stripe, mailer, log, discord, oauth, geo } (discord: the Pro role bot, null when not configured;
 *   oauth: the Google and Discord sign-in providers that have their keys; geo: where network tests come from, geo.js)
 */
export function createApp({ cfg, db, keys, stripe, mailer, log = console, fetchImpl = fetch, avatars = P.createAvatarStore(cfg, { fetchImpl, log }), discord = createDiscord(cfg, { db, fetchImpl, log, stripe }), oauth = createOAuth(cfg, { fetchImpl }), geo = createGeo(cfg, { fetchImpl, log }) }) {
  const app = new Hono();
  // The Discord role pass started by a webhook runs after the reply to Stripe; tests wait for it here.
  app.idle = () => discord?.idle() ?? Promise.resolve();
  const installer = createInstaller(cfg, { fetchImpl, log });
  const allow = rateLimiter();
  let reviewsCache = null; // { at, bodies }: the site asks for the reviews on every visit (home page, reviews page)
  let popupCache = null; // { at, body }: same for the discount pop-up (one Stripe call per refresh)
  let lifetimeCache = null; // { at, offer }: the Lifetime price as Stripe has it (the site's card, /buy/lifetime)
  let lifetimeRead = null; // the Stripe call reading it, while one runs
  const publicDir = relative(process.cwd(), fileURLToPath(new URL('../public', import.meta.url))) || '.';
  const cookieBase = { httpOnly: true, secure: cfg.prod, sameSite: 'Lax', path: '/' };

  const ipOf = (c) => {
    if (cfg.trustProxy) {
      // Railway's edge sets X-Real-IP to the visitor's address. Otherwise take the last
      // X-Forwarded-For hop, the one our proxy appended: earlier ones are written by the client.
      const real = c.req.header('x-real-ip');
      if (real) return real.trim();
      const xff = c.req.header('x-forwarded-for');
      if (xff) return xff.split(',').pop().trim();
    }
    return c.env?.incoming?.socket?.remoteAddress || 'unknown';
  };

  // Strict CSP on our own pages. The marketing site (SITE_DIR) uses inline styles and scripts,
  // so it gets the other security headers without a CSP.
  const OWN = /^\/(assets|download|buy|checkout|claim|signup|login|logout|forgot|reset|account|affiliate|webhooks|api|healthz|acces|admin|auth)(\/|$)/;
  const strictHeaders = secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      formAction: ["'self'", 'https://checkout.stripe.com', 'https://billing.stripe.com'],
      frameAncestors: ["'none'"],
    },
    crossOriginEmbedderPolicy: false,
    // Not no-referrer: with it, browsers send `Origin: null` on form posts and the check below fails.
    referrerPolicy: 'same-origin',
  });
  const siteHeaders = secureHeaders({ crossOriginEmbedderPolicy: false, referrerPolicy: 'strict-origin-when-cross-origin' });
  // Images shown in emails load from the mail client, not from our pages; profile photos load on the site too.
  const emailAssetHeaders = secureHeaders({ crossOriginResourcePolicy: 'cross-origin' });
  app.use('*', (c, next) => (c.req.path.startsWith('/assets/email-') || c.req.path.startsWith('/avatars/') ? emailAssetHeaders(c, next)
    : OWN.test(c.req.path) || !cfg.siteDir ? strictHeaders(c, next) : siteHeaders(c, next)));

  // Same-origin check for browser form posts (the API and the webhook are exempt).
  app.use('*', async (c, next) => {
    const p = c.req.path;
    if (c.req.method === 'POST' && !p.startsWith('/api/') && !p.startsWith('/webhooks/')) {
      // Compared by host: behind Railway's proxy the request looks like http, and the server answers on
      // both its Railway address and the custom domain once there is one.
      const origin = c.req.header('origin');
      let host = null;
      try { host = origin ? new URL(origin).host : null; } catch { host = 'invalid'; }
      const own = [c.req.header('host'), cfg.trustProxy ? c.req.header('x-forwarded-host') : null, new URL(cfg.publicUrl).host];
      if (origin && !own.includes(host)) return c.text('Forbidden', 403);
    }
    await next();
  });

  // Forms and API calls are tiny; Stripe events and profile photos can be larger.
  const tooLarge = (c) => (c.req.path.startsWith('/api/')
    ? c.json({ error: { code: 'image_too_large', message: API_ERRORS.image_too_large[1] } }, 413)
    : c.req.path.startsWith('/account/profile/')
      ? c.redirect('/account/profile?n=toolarge', 303)
      : c.text('Payload too large', 413));
  const UPLOADS = new Set(['/account/profile/photo', '/api/v1/account/avatar']);
  app.use('/webhooks/*', bodyLimit({ maxSize: 1024 * 1024, onError: tooLarge }));
  app.use('*', async (c, next) => (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method) && !c.req.path.startsWith('/webhooks/')
    ? bodyLimit({ maxSize: UPLOADS.has(c.req.path) ? P.AVATAR_MAX_UPLOAD + 64 * 1024 : 64 * 1024, onError: tooLarge })(c, next) : next()));

  app.use('/assets/*', serveStatic({ root: publicDir, rewriteRequestPath: (p) => p.replace(/^\/assets/, '') }));

  // ---------- before the launch ----------
  // Until cfg.launchAt the pages that sell or hand out Rago Optimizer send visitors to the site's countdown.
  // Sign-in, the account pages, the app's API and the Stripe webhook keep working. The team gets through with
  // the cookie set by /acces/<PREVIEW_KEY>, here or on the site (netlify/edge-functions/launch-gate/).
  const LOCKED = new Set(['/signup', '/buy', '/buy/lifetime', '/download', '/affiliate', '/affiliate/join']);
  const PREVIEW_COOKIE = 'rago_preview';
  // HMAC-SHA256(PREVIEW_KEY, "rago-preview-v1"), base64url: same as passFor() in the Netlify function.
  const previewPass = cfg.previewKey.length >= 16 ? createHmac('sha256', cfg.previewKey).update('rago-preview-v1').digest('base64url') : null;
  const sameHash = (a, b) => timingSafeEqual(createHash('sha256').update(String(a)).digest(), createHash('sha256').update(String(b)).digest());
  const hasPreviewPass = (c) => !!previewPass && sameHash(getCookie(c, PREVIEW_COOKIE) || '', previewPass);
  app.use('*', async (c, next) => {
    if (!LOCKED.has(c.req.path) || Date.now() >= cfg.launchAt || hasPreviewPass(c)) return next();
    c.header('Cache-Control', 'no-store');
    if (cfg.siteUrl !== cfg.publicUrl) return c.redirect(`${cfg.siteUrl}/`, 302);
    return c.html(V.messagePage(cfg, { overline: 'Rago Optimizer', title: 'Opening soon.', text: 'Rago Optimizer isn’t open yet. Come back at the launch.' }), 503);
  });
  app.get('/acces/:key', (c) => {
    // On a subdomain of the site (account.rago-optimizer.com) the cookie covers the site too.
    const siteHost = new URL(cfg.siteUrl).hostname;
    const host = (c.req.header('host') || '').split(':')[0];
    const domain = host.endsWith(`.${siteHost}`) ? siteHost : undefined;
    if (c.req.param('key') === 'sortir') {
      deleteCookie(c, PREVIEW_COOKIE, { path: '/', domain, secure: cfg.prod });
      return c.redirect('/login', 302);
    }
    if (!allow(`acces:${ipOf(c)}`, 20, 60 * 60 * 1000) || !previewPass || !sameHash(c.req.param('key'), cfg.previewKey)) return c.notFound();
    setCookie(c, PREVIEW_COOKIE, previewPass, { ...cookieBase, domain, maxAge: 30 * 86400 });
    return c.redirect('/signup', 302);
  });
  // Checks the database too, so an uptime monitor notices when Supabase is down.
  app.get('/healthz', async (c) => {
    try {
      await db.get('SELECT 1 AS ok');
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false, error: 'database unreachable' }, 503);
    }
  });

  // ---------- helpers ----------
  const currentUser = async (c) => await L.userForWebSession(db, getCookie(c, 'rg_session'));
  const signIn = async (c, user) => setCookie(c, 'rg_session', await L.createWebSession(db, user.id), { ...cookieBase, maxAge: L.SESSION_TTL / 1000 });
  const claimCookie = (c) => unsignValue(getCookie(c, 'rg_claim'), cfg.sessionSecret);
  const setClaim = (c, licenseId) => setCookie(c, 'rg_claim', signValue(licenseId, cfg.sessionSecret), { ...cookieBase, maxAge: 2 * 86400 });
  const pendingClaim = async (c) => {
    const id = claimCookie(c);
    const lic = id && await L.getLicense(db, id);
    return lic && !lic.user_id ? lic : null;
  };

  /**
   * Attaches a pending purchase to the user. Returns a notice code for the dashboard, or null.
   * `known` is the license when the caller already has it (a cookie set on this response isn't
   * readable from this request yet).
   */
  async function settleClaim(c, user, known = null) {
    const lic = known && !known.user_id ? known : await pendingClaim(c);
    deleteCookie(c, 'rg_claim', { path: '/' });
    if (!lic) return null;
    try {
      const claimed = await L.claimLicense(db, lic.id, user.id);
      // Lifetime claimed by a subscriber: the subscription it replaced stops now.
      const life = claimed.status === 'active' && claimed.plan === 'lifetime' && claimed.source === 'stripe';
      return (life && await settleLifetime(user.id, claimed.id)) || 'claimed';
    } catch (err) {
      if (err.code !== 'already_has_license') throw err;
      // A second purchase on an account that already has Premium: stop the extra subscription so it
      // doesn't renew. The first payment is refunded by support (the notice says so).
      if (stripe && lic.stripe_subscription_id) {
        try { await stripe.subscriptions.cancel(lic.stripe_subscription_id); } catch (e) { log.error('[stripe] cancel duplicate failed', e.message); }
      }
      await L.setLicenseStatus(db, lic.id, 'revoked', 'duplicate');
      await audit(db, 'license.duplicate', { licenseId: lic.id, userId: user.id });
      // A paid Lifetime is only stopped by Premium for life (a subscription or a reward would have been replaced),
      // unless it was refunded meanwhile: then anything active stops it, as before.
      return lic.plan === 'lifetime' && lic.source === 'stripe' && lic.status === 'active' ? 'duplicatelife' : 'duplicate';
    }
  }

  /**
   * Lifetime `lifetimeId` is on the account: the subscription it replaced (if any) is canceled in Stripe. Returns the
   * dashboard notice, 'upgraded' or 'upgradefail' (the hourly sweep keeps trying), or null when it replaced none.
   */
  async function settleLifetime(userId, lifetimeId) {
    if (!stripe) return null;
    const { replaced, failed } = await stopReplacedSubscriptions(db, stripe, userId, log, lifetimeId);
    return failed.length ? 'upgradefail' : replaced ? 'upgraded' : null;
  }

  /**
   * The Lifetime offer ({ amount, currency }) when it can be bought, else null. Stripe is asked at most once a minute,
   * and briefly: while it doesn't answer, the last answer stands for a minute (none yet: not for sale), so the
   * account pages and the site's card never wait on it for long.
   */
  function lifetimeOffer() {
    if (!stripe || !cfg.stripePriceLifetime) return Promise.resolve(null);
    if (lifetimeCache && Date.now() - lifetimeCache.at < 60 * 1000) return Promise.resolve(lifetimeCache.offer);
    // One call at a time: the requests that arrive meanwhile share its answer.
    lifetimeRead ||= lifetimePrice(stripe, cfg, { timeout: 5000, maxNetworkRetries: 0 })
      .catch((err) => {
        log.error('[stripe] Lifetime price not read:', err.message);
        return lifetimeCache?.offer ?? null;
      })
      .then((offer) => { lifetimeCache = { at: Date.now(), offer }; return offer; })
      .finally(() => { lifetimeRead = null; });
    return lifetimeRead;
  }

  /** Records the referral code typed right after a purchase, once the license is on the account. */
  async function settleReferral(user, affiliate) {
    if (!affiliate) return null;
    const license = await L.licenseForUser(db, user.id);
    if (!license || license.user_id !== user.id || Date.now() - (license.claimed_at || 0) > 60 * 60 * 1000) return null;
    const row = await A.recordReferral(db, affiliate, user.id, license, cfg).catch((err) => {
      if (!(err instanceof L.LicenseError)) throw err; // self-referral caught late: the account works, the code doesn't count
      return null;
    });
    // Already activated on a PC: it can count right away. A full code loses its Stripe discount.
    if (row) await settleAffiliate(affiliate.user_id);
    return row;
  }

  /** Signed-in buyer: no form to type the code, so use the one that came with the purchase (or the link cookie). */
  async function applyReferral(user, license, code) {
    if (!user || !code) return false;
    const { affiliate } = await checkReferral(code, user.email, license);
    return !!(await settleReferral(user, affiliate));
  }

  /** The code if it still takes players, else null (a full code would block the account form). */
  const openCode = async (code) => {
    const aff = code && await A.affiliateByCode(db, code);
    return aff && !(await A.codeFull(db, cfg, aff)) ? aff.code : null;
  };
  /** The code to pre-fill after a purchase: the one stored with it, else the affiliate link cookie. */
  const purchaseCode = async (c, lic) => (await openCode(lic?.referral_code)) || (await openCode(refCode(c))) || '';

  /** Checks a referral code against the account email and the purchase email. Returns { affiliate } or { error }. */
  async function checkReferral(code, email, pending) {
    if (!code) return {};
    try {
      const affiliate = await A.checkCode(db, code, email, cfg);
      if (pending.email !== email) await A.checkCode(db, code, pending.email, cfg);
      return { affiliate };
    } catch (err) {
      if (err.code === 'self_referral') return { error: "You can't use your own referral code." };
      if (err.code === 'code_full') return { error: `This referral code was already used by ${cfg.affiliateMaxReferrals} players. Leave the field empty.` };
      return { error: "That referral code doesn't exist. Check it, or leave the field empty." };
    }
  }

  const requireUser = async (c, next) => {
    const user = await currentUser(c);
    // Pages a link can point at directly (the site's "Leave a review"): back there after signing in.
    if (!user) return c.redirect(NEXT.has(c.req.path) ? `/login?next=${encodeURIComponent(c.req.path)}` : '/login', 303);
    c.set('user', user);
    await next();
  };

  const ip = (c) => ipOf(c);

  // Sign-in limits (site and app share the per-email ones). Per IP: 10 tries per email, 50 in all.
  // Per email, across IPs: after 20 wrong passwords, only an IP that hasn't failed on this email yet,
  // or that signed in to it before, gets a try. Strangers can't lock a player out; a spread-out guesser
  // gets one try per new IP.
  const LOGIN_WINDOW = 15 * 60 * 1000;
  function loginAllowed(c, scope, email) {
    if (!allow(`${scope}:${ip(c)}:${email}`, 10, LOGIN_WINDOW) || !allow(`${scope}:${ip(c)}`, 50, LOGIN_WINDOW)) return false;
    if (allow.count(`login-fail:${email}`) < 20) return true;
    return allow.count(`login-ok:${ip(c)}:${email}`) > 0 || allow.count(`login-fail:${ip(c)}:${email}`) === 0;
  }
  function loginResult(c, email, ok) {
    if (ok) { allow(`login-ok:${ip(c)}:${email}`, Infinity, 30 * 24 * 3600 * 1000); return; }
    allow(`login-fail:${email}`, Infinity, LOGIN_WINDOW);
    allow(`login-fail:${ip(c)}:${email}`, Infinity, LOGIN_WINDOW);
  }
  // Where to go after signing in. Only our own pages.
  const NEXT = new Set(['/affiliate', '/account/review']);
  const nextPath = (v) => (NEXT.has(String(v || '')) ? String(v) : null);

  const settleAffiliate = async (userId) => {
    const out = await A.settleAffiliate(db, cfg, stripe, log, userId);
    await syncPromoActive(db, stripe, cfg, userId, log);
    return out;
  };
  /** A referred player just activated their PC: their referral counts now, not at the affiliate's next visit. */
  async function settleReferrer(licenseId) {
    const r = await db.get("SELECT affiliate_user_id FROM referrals WHERE license_id = ? AND status = 'pending' AND machine_guid IS NOT NULL", [licenseId]);
    if (r) await settleAffiliate(r.affiliate_user_id);
  }
  const dashWith = (n) => (n ? `/account?n=${n}` : '/account');
  // The purchase is on the account (a Lifetime that replaced a subscription too): its referral code counts.
  const CLAIMED = ['claimed', 'upgraded', 'upgradefail'];
  async function claimSignedIn(c, user, lic) {
    const n = await settleClaim(c, user, lic);
    if (!CLAIMED.includes(n)) return n;
    const applied = await applyReferral(user, await L.getLicense(db, lic.id), await purchaseCode(c, lic));
    deleteCookie(c, 'rg_ref', { path: '/' });
    return applied && n === 'claimed' ? 'claimedref' : n;
  }
  // An affiliate's link (/buy?ref=CODE) pre-fills the code field the buyer sees after paying.
  const refCode = (c) => A.normalizeCode(getCookie(c, 'rg_ref'));

  async function sendClaimEmail(license, claimToken) {
    // Bought while signed in: attached already. Apply the referral code that came with the purchase.
    if (license.user_id) {
      const user = await L.getUser(db, license.user_id);
      if (license.referral_code) await applyReferral(user, license, license.referral_code);
      // Still a receipt with the order and the waiver, without a claim link.
      try { await mailer.purchase(user.email, null, license); } catch (err) { log.error('[mail] purchase email failed', err); }
      return;
    }
    if (!claimToken) return;
    const owner = await L.findUserByEmail(db, license.email);
    const owned = owner && await L.licenseForUser(db, owner.id);
    // A subscriber who bought Lifetime signed out still gets the link: Lifetime replaces the subscription.
    if (owned?.status === 'active' && (license.plan !== 'lifetime' || L.blocksPurchase(owned, license))) {
      log.info?.(`[mail] no purchase email: ${license.email} already has Premium (second purchase, refund it in Stripe)`);
      return;
    }
    try {
      await mailer.purchase(license.email, `${cfg.publicUrl}/claim/${claimToken}`, license);
    } catch (err) {
      log.error('[mail] purchase email failed', err);
    }
  }

  // ---------- checkout ----------
  // /buy?interval=month|year: a subscription. /buy/lifetime (2026-10-16): Premium for life in one payment, which a
  // subscriber can switch to (the subscription stops once Lifetime is paid). Its own path: a server without Lifetime
  // answers 404 there instead of opening the yearly checkout.
  app.get('/buy', (c) => buy(c, false));
  app.get('/buy/lifetime', (c) => buy(c, true));
  async function buy(c, lifetime) {
    const user = await currentUser(c);
    const owned = user && await L.current(db, await L.licenseForUser(db, user.id));
    const active = owned?.status === 'active' ? owned : null;
    // An affiliate reward (6 months) can turn into a subscription: no payment until the reward ends.
    const reward = active?.plan === 'reward' ? active : null;
    if (L.blocksPurchase(active, lifetime ? { plan: 'lifetime', source: 'stripe' } : null)) return c.redirect('/account?n=owned', 303);
    if (lifetime && !(await lifetimeOffer())) {
      return c.html(V.messagePage(cfg, { user, overline: 'Checkout', title: 'Lifetime opens soon.',
        text: cfg.subscriptions && stripe ? 'The one-time Lifetime payment is being set up. Meanwhile, Premium is available monthly or yearly.' : 'Payments are being set up. Meanwhile, the free version of Rago Optimizer is ready to download.',
        action: cfg.subscriptions && stripe ? { href: `${cfg.siteUrl}/#pricing`, label: 'See the plans' } : { href: user ? '/account/download' : '/download', label: 'Download the free version' } }), 503);
    }
    if (!lifetime && (!stripe || !cfg.subscriptions)) {
      return c.html(V.messagePage(cfg, { user, overline: 'Checkout', title: 'Checkout opens soon.', text: 'Payments are being set up. Meanwhile, the free version of Rago Optimizer is ready to download.', action: { href: user ? '/account/download' : '/download', label: 'Download the free version' } }), 503);
    }
    // A full code (3 players, or reward given) is dropped: no discount, nothing pre-filled after paying.
    let ref = await openCode(A.normalizeCode(c.req.query('ref')) || refCode(c));
    if (ref) setCookie(c, 'rg_ref', ref, { ...cookieBase, maxAge: 30 * 86400 });
    else deleteCookie(c, 'rg_ref', { path: '/' });
    // Discount already applied at checkout: a site code (?promo=RAGO15), else the affiliate's code (5 %).
    let promotionCode = (await findPromotionCode(stripe, c.req.query('promo')))?.id || null;
    const affiliate = ref && await A.affiliateByCode(db, ref);
    if (affiliate && affiliate.user_id === user?.id) ref = null;
    if (!promotionCode && affiliate && ref) promotionCode = await ensureAffiliatePromo(db, stripe, cfg, affiliate, log);
    // A returning subscriber pays with their existing Stripe customer, so invoices stay together.
    const previous = user && await db.get('SELECT stripe_customer_id FROM licenses WHERE user_id = ? AND stripe_customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 1', [user.id]);
    if (lifetime) {
      // Lifetime replaces the reward or the subscription once paid: no trial, the checkout says the subscription stops.
      const replaces = !!active && active.plan !== 'reward';
      const session = await createCheckout(stripe, cfg, user, { interval: 'lifetime', customerId: previous?.stripe_customer_id, ref, promotionCode, replaces }, log);
      return c.redirect(session.url, 303);
    }
    const interval = c.req.query('interval') === 'year' ? 'year' : c.req.query('interval') === 'month' ? 'month' : undefined;
    const trialEnd = reward ? Math.floor(Number(reward.current_period_end) / 1000) : null;
    const session = await createCheckout(stripe, cfg, user, { interval, customerId: previous?.stripe_customer_id, ref, promotionCode, trialEnd }, log);
    return c.redirect(session.url, 303);
  }

  app.get('/checkout/success', async (c) => {
    const id = c.req.query('session_id');
    if (!stripe || !id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return c.redirect('/login', 303);
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(id, { expand: ['subscription'] });
    } catch {
      return c.html(V.messagePage(cfg, { overline: 'Checkout', title: "We couldn't find that payment.", text: 'If you were charged, sign in or contact support on Discord with your receipt.', action: { href: '/login', label: 'Sign in' } }), 404);
    }
    if (!isRagoCheckout(session)) return c.redirect('/login', 303);
    // The webhook may not have arrived yet: fulfilling here too is safe (idempotent).
    const out = await L.fulfillCheckoutSession(db, session);
    if (!out.license) {
      return c.html(V.messagePage(cfg, { overline: 'Checkout', title: 'Payment processing.', step: 0,
        text: cfg.mailEnabled
          ? "Your bank is still confirming the payment. We'll email you a link to create your account as soon as it's done."
          : 'Your bank is still confirming the payment. Refresh this page in a few minutes to create your account, or ask on Discord with your receipt.',
        action: { href: c.req.url, label: 'Refresh' } }));
    }
    if (out.created) await sendClaimEmail(out.license, out.claimToken);

    const user = await currentUser(c);
    if (out.license.user_id) {
      // Lifetime bought signed in while subscribed: the subscription stops now (unless the webhook already did it).
      const n = out.license.plan === 'lifetime' && out.license.status === 'active' ? await settleLifetime(out.license.user_id, out.license.id) : null;
      return c.redirect(user ? `/account?n=${n || 'claimed'}` : '/login', 303);
    }
    setClaim(c, out.license.id);
    if (user) return c.redirect(dashWith(await claimSignedIn(c, user, out.license)), 303);
    if (await L.findUserByEmail(db, out.license.email)) {
      return c.html(V.loginPage(cfg, { email: out.license.email, purchased: true, code: await purchaseCode(c, out.license) }));
    }
    return c.html(V.signupPage(cfg, { purchased: true, claimEmail: out.license.email, code: await purchaseCode(c, out.license) }));
  });

  // Link from the purchase email, for buyers who closed the tab before creating their account.
  app.get('/claim/:token', async (c) => {
    const lic = await L.licenseByClaimToken(db, c.req.param('token'));
    if (!lic) {
      const user = await currentUser(c);
      return c.html(V.messagePage(cfg, { user, overline: 'Your purchase', title: "This link doesn't work anymore.", text: 'It was already used, or a newer link replaced it. Sign in with the email you paid with to see your license, or open the latest link we sent you.', action: user ? { href: '/account', label: 'Go to your account' } : { href: '/login', label: 'Sign in' } }), 410);
    }
    const user = await currentUser(c);
    // Signed in (e.g. the account was created on another device): attach it right away.
    if (user) return c.redirect(dashWith(await claimSignedIn(c, user, lic)), 303);
    setClaim(c, lic.id);
    if (await L.findUserByEmail(db, lic.email)) return c.html(V.loginPage(cfg, { email: lic.email, purchased: true, code: await purchaseCode(c, lic) }));
    return c.html(V.signupPage(cfg, { purchased: true, claimEmail: lic.email, code: await purchaseCode(c, lic) }));
  });

  // ---------- accounts ----------
  app.get('/signup', async (c) => {
    const next = nextPath(c.req.query('next'));
    if (await currentUser(c)) return c.redirect(next || '/account', 303);
    const lic = await pendingClaim(c);
    return c.html(V.signupPage(cfg, { purchased: !!lic, claimEmail: lic?.email, next, code: lic ? await purchaseCode(c, lic) : '' }));
  });

  app.post('/signup', async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const pending = await pendingClaim(c);
    const purchased = !!pending;
    const next = nextPath(body.next);
    // The referral code only exists on the form right after a purchase: one chance, at account creation.
    const code = purchased ? A.normalizeCode(body.code) : '';
    const fail = (error, status = 400) => c.html(V.signupPage(cfg, { email, error, purchased, next, code }), status);
    if (!allow(`signup:${ip(c)}`, 10, 60 * 60 * 1000)) return fail(API_ERRORS.rate_limited[1], 429);
    if (!EMAIL.test(email) || email.length > 254) return fail('Enter a valid email address.');
    if (password.length < 8 || password.length > 200) return fail('Use at least 8 characters for your password.');
    const exists = () => fail(V.html`An account with this email already exists. <a href="/login${next ? `?next=${encodeURIComponent(next)}` : ''}">Sign in instead</a>.`);
    if (await L.findUserByEmail(db, email)) return exists();
    const { affiliate, error } = await checkReferral(code, email, pending);
    if (error) return fail(error);
    // The email gets a 6-digit code first, and the account waits for it (2026-10-25). Not for the email a purchase
    // was paid with: its receipt and claim link already went there.
    if (cfg.verifyEmail && pending?.email !== email) {
      if (!allow(`signup-mail:${email}`, 5, 60 * 60 * 1000)) return fail(API_ERRORS.rate_limited[1], 429);
      const started = await L.startSignup(db, email, password);
      try {
        await mailer.signupCode(email, started.code);
      } catch (err) {
        log.error('[mail] sign-up code failed', err);
        return fail("We couldn't send a code to this email right now. Check the address, or try again in a moment.", 503);
      }
      setCookie(c, SIGNUP_COOKIE, signValue(started.id, cfg.sessionSecret), signupCookie);
      return c.redirect(verifyUrl({ next, code }), 303);
    }
    let user;
    try {
      user = await L.createUser(db, email, password);
    } catch (err) {
      if (err.code === '23505') return exists(); // the form was sent twice
      throw err;
    }
    return welcomeNewUser(c, user, { next, affiliate });
  });

  /** A new account: signed in, the pending purchase attached, then the profile photo step (skippable). */
  async function welcomeNewUser(c, user, { next, affiliate = null }) {
    await signIn(c, user);
    const n = await settleClaim(c, user);
    deleteCookie(c, 'rg_ref', { path: '/' });
    if (CLAIMED.includes(n)) await settleReferral(user, affiliate);
    // New account: offer a profile photo first (skippable), then where the player was going.
    const to = next && !n ? next : `/account${n ? `?n=${n}` : ''}`;
    return c.redirect(`/account/profile?welcome=1&to=${encodeURIComponent(to)}`, 303);
  }

  // ---------- sign-up step 2: the code sent by email (2026-10-25) ----------
  // A signed cookie (limited to /signup) names the sign-up waiting for its code. `next` and the referral code typed
  // after a purchase travel with the form, and are checked again.
  const SIGNUP_COOKIE = 'rg_signup';
  const signupCookie = { ...cookieBase, path: '/signup', maxAge: 24 * 3600 };
  const verifyUrl = ({ next, code, n }) => {
    const q = new URLSearchParams({ ...(n ? { n } : {}), ...(next ? { next } : {}), ...(code ? { code } : {}) }).toString();
    return `/signup/verify${q ? `?${q}` : ''}`;
  };
  const waitingSignup = async (c) => {
    const id = unsignValue(getCookie(c, SIGNUP_COOKIE), cfg.sessionSecret);
    return id ? L.pendingSignup(db, id) : null;
  };
  const verifyForm = async (c, src) => {
    const purchased = !!(await pendingClaim(c));
    return { purchased, next: nextPath(src.next), code: purchased ? A.normalizeCode(src.code) : '' };
  };
  const backToSignup = (c, next) => c.redirect(`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`, 303);

  app.get('/signup/verify', async (c) => {
    const form = await verifyForm(c, c.req.query());
    const row = await waitingSignup(c);
    if (!row) return backToSignup(c, form.next);
    const notice = c.req.query('n') === 'sent' ? 'New code sent. Only the latest code works.' : null;
    return c.html(V.verifyPage(cfg, { email: row.email, notice, ...form }));
  });

  app.post('/signup/verify', async (c) => {
    const body = await c.req.parseBody();
    const form = await verifyForm(c, body);
    const row = await waitingSignup(c);
    if (!row) return backToSignup(c, form.next);
    const show = (error, status) => c.html(V.verifyPage(cfg, { email: row.email, error, ...form }), status);
    if (!allow(`signup-verify:${ip(c)}`, 30, 15 * 60 * 1000)) return show(API_ERRORS.rate_limited[1], 429);
    const out = await L.checkSignupCode(db, row.id, body.otp);
    if (out.error === 'wrong') return show(`That code isn't right. ${out.left} ${out.left === 1 ? 'try' : 'tries'} left.`, 400);
    if (out.error === 'expired') return show('This code expired. Send a new one below.', 400);
    if (out.error === 'locked') return show('Too many wrong codes. Send a new one below.', 429);
    if (out.error) return backToSignup(c, form.next);
    deleteCookie(c, SIGNUP_COOKIE, { path: signupCookie.path });
    const email = out.signup.email;
    const exists = () => c.html(V.signupPage(cfg, { email, purchased: form.purchased, next: form.next, code: form.code,
      error: V.html`An account with this email already exists. <a href="/login${form.next ? `?next=${encodeURIComponent(form.next)}` : ''}">Sign in instead</a>.` }), 400);
    if (await L.findUserByEmail(db, email)) return exists(); // made meanwhile, with Google for example
    // The code was checked on the first step; if it filled up meanwhile, the account is made without it.
    const { affiliate } = await checkReferral(form.code, email, (await pendingClaim(c)) || {});
    let user;
    try {
      user = await L.createUser(db, email, null, { passwordHash: out.signup.password_hash });
    } catch (err) {
      if (err.code === '23505') return exists();
      throw err;
    }
    await audit(db, 'user.email_verified', { userId: user.id });
    return welcomeNewUser(c, user, { next: form.next, affiliate });
  });

  app.post('/signup/resend', async (c) => {
    const form = await verifyForm(c, await c.req.parseBody());
    const row = await waitingSignup(c);
    if (!row) return backToSignup(c, form.next);
    if (!allow(`signup-mail:${row.email}`, 5, 60 * 60 * 1000) || !allow(`signup-resend:${ip(c)}`, 10, 60 * 60 * 1000)) {
      return c.html(V.verifyPage(cfg, { email: row.email, error: API_ERRORS.rate_limited[1], ...form }), 429);
    }
    const sent = await L.resendSignupCode(db, row.id);
    if (!sent) return backToSignup(c, form.next);
    try {
      await mailer.signupCode(sent.email, sent.code);
    } catch (err) {
      log.error('[mail] sign-up code failed', err);
      return c.html(V.verifyPage(cfg, { email: row.email, error: "We couldn't send a new code right now. Try again in a moment.", ...form }), 503);
    }
    return c.redirect(verifyUrl({ ...form, n: 'sent' }), 303);
  });

  app.get('/login', async (c) => {
    const next = nextPath(c.req.query('next'));
    if (await currentUser(c)) return c.redirect(next || '/account', 303);
    const n = c.req.query('n');
    const pending = await pendingClaim(c);
    return c.html(V.loginPage(cfg, { purchased: !!pending, email: pending?.email || '', next, code: pending ? await purchaseCode(c, pending) : '',
      notice: { reset: 'Password saved. Sign in with your new password.', out: "You're signed out." }[n] || null, error: Object.hasOwn(OAUTH_ERRORS, n) ? OAUTH_ERRORS[n] : null }));
  });

  app.post('/login', async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const pending = await pendingClaim(c);
    const purchased = !!pending;
    const next = nextPath(body.next);
    // Buyers whose email already has an account get the code field here instead of on sign-up.
    const code = purchased ? A.normalizeCode(body.code) : '';
    const fail = (error, status) => c.html(V.loginPage(cfg, { email, purchased, next, code, error }), status);
    if (!loginAllowed(c, 'login', email)) return fail(API_ERRORS.rate_limited[1], 429);
    const user = await L.findUserByEmail(db, email);
    const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
    loginResult(c, email, user && ok);
    if (!user || !ok) return fail(API_ERRORS.invalid_credentials[1], 401);
    const { affiliate, error } = await checkReferral(code, email, pending || {});
    if (error) return fail(error, 400);
    await signIn(c, user);
    const n = await settleClaim(c, user);
    deleteCookie(c, 'rg_ref', { path: '/' });
    if (CLAIMED.includes(n)) await settleReferral(user, affiliate);
    if (next && !n) return c.redirect(next, 303);
    return c.redirect(`/account${n ? `?n=${n}` : ''}`, 303);
  });

  app.post('/logout', async (c) => {
    await L.deleteWebSession(db, getCookie(c, 'rg_session'));
    deleteCookie(c, 'rg_session', { path: '/' });
    return c.redirect('/login?n=out', 303);
  });

  app.get('/forgot', (c) => c.html(V.forgotPage(cfg)));
  app.post('/forgot', async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();
    if (allow(`forgot:${ip(c)}`, 5, 60 * 60 * 1000) && allow(`forgot:${email}`, 3, 60 * 60 * 1000)) {
      const user = await L.findUserByEmail(db, email);
      if (user) {
        const token = await L.createPasswordReset(db, user.id);
        try { await mailer.passwordReset(user.email, `${cfg.publicUrl}/reset/${token}`); } catch (err) { log.error('[mail] reset failed', err); }
      }
    }
    return c.html(V.forgotPage(cfg, { sent: true, email }));
  });

  const expiredReset = (c) => c.html(V.messagePage(cfg, { overline: 'Password', title: 'This link expired.', text: 'Reset links work once, for 1 hour. Ask for a new one.', action: { href: '/forgot', label: 'Send a new link' } }), 410);
  app.get('/reset/:token', async (c) => {
    const token = c.req.param('token');
    const email = await L.passwordResetEmail(db, token);
    return email ? c.html(V.resetPage(cfg, { token, email })) : expiredReset(c);
  });
  app.post('/reset/:token', async (c) => {
    const token = c.req.param('token');
    const password = String((await c.req.parseBody()).password || '');
    if (password.length < 8 || password.length > 200) return c.html(V.resetPage(cfg, { token, error: 'Use at least 8 characters for your password.' }), 400);
    const userId = await L.consumePasswordReset(db, token);
    if (!userId) return expiredReset(c);
    await L.setPassword(db, userId, password);
    return c.redirect('/login?n=reset', 303);
  });

  // ---------- sign in with Google or Discord (2026-10-25) ----------
  // The state and the PKCE verifier stay in a signed cookie limited to /auth for 10 minutes. The account is the one
  // linked to that Google or Discord account, else the one with the same (checked) email, else a new one.
  const OAUTH_COOKIE = 'rg_oauth';
  const oauthCookie = { ...cookieBase, path: '/auth' };
  const OAUTH_ERRORS = {
    oauthcancel: 'Sign-in canceled. Try again, or use your email and password.',
    oauthfail: "That sign-in didn't go through. Try again, or use your email and password.",
    oauthlimit: API_ERRORS.rate_limited[1],
    googleemail: "Your Google account didn't give us a verified email. Sign up with your email instead.",
    discordemail: 'Your Discord account has no verified email. Verify it in Discord (User Settings > My Account), or sign up with your email.',
    googleother: 'This Rago account already signs in with another Google account. Use that one, or your email and password.',
    discordother: 'This Rago account already signs in with another Discord account. Use that one, or your email and password.',
  };
  const providerOf = (c) => (Object.hasOwn(oauth, c.req.param('provider')) ? oauth[c.req.param('provider')] : null);

  app.get('/auth/:provider', (c) => {
    const p = providerOf(c);
    if (!p) return c.notFound();
    const state = randomToken(16);
    const verifier = randomToken(32);
    const next = nextPath(c.req.query('next')) || '';
    setCookie(c, OAUTH_COOKIE, signValue(`${p.id}.${state}.${verifier}.${next}`, cfg.sessionSecret), { ...oauthCookie, maxAge: 10 * 60 });
    return c.redirect(p.authorizeUrl(state, verifier), 302);
  });

  app.get('/auth/:provider/callback', async (c) => {
    const p = providerOf(c);
    if (!p) return c.notFound();
    const saved = unsignValue(getCookie(c, OAUTH_COOKIE), cfg.sessionSecret);
    deleteCookie(c, OAUTH_COOKIE, { path: oauthCookie.path });
    const [savedId, savedState, verifier, savedNext] = (saved || '').split('.');
    const next = nextPath(savedNext);
    const back = (n) => c.redirect(`/login?n=${n}${next ? `&next=${encodeURIComponent(next)}` : ''}`, 303);
    const { code, state, error } = c.req.query();
    if (error) return back('oauthcancel'); // Cancel on Google's or Discord's page
    if (!code || !state || !saved || savedId !== p.id || !sameHash(savedState, state)) return back('oauthfail');
    if (!allow(`oauth:${ip(c)}`, 30, 60 * 60 * 1000)) return back('oauthlimit');
    let profile;
    try {
      profile = await p.profile(String(code), verifier);
    } catch (err) {
      if (!(err instanceof OAuthError)) throw err;
      log.error(`[oauth] ${p.id} sign-in failed:`, err.message);
      return back('oauthfail');
    }
    let found;
    try {
      found = await L.userForIdentity(db, p.id, profile);
    } catch (err) {
      if (!(err instanceof L.SignInError)) throw err;
      return back(`${p.id}${err.code === 'unverified_email' ? 'email' : 'other'}`);
    }
    const { user, created } = found;
    if (created) return welcomeNewUser(c, user, { next });
    await signIn(c, user);
    const lic = await pendingClaim(c);
    const n = lic ? await claimSignedIn(c, user, lic) : null;
    if (next && !n) return c.redirect(next, 303);
    return c.redirect(dashWith(n), 303);
  });

  // ---------- dashboard ----------
  const NOTICES = {
    claimed: ['notice', 'License added to your account. Download Rago Optimizer below.'],
    claimedref: ['notice', 'License added to your account, and your referral code was applied. Download Rago Optimizer below.'],
    owned: ['notice', 'You already have Rago Optimizer Premium. No need to buy it twice.'],
    reset: ['notice', 'Device freed. Sign in to Rago Optimizer on your new PC to activate it.'],
    duplicate: ['error', V.html`This account already has Premium, so the new purchase was not added and its subscription was stopped. ${V.supportLink(cfg, 'Contact support on Discord')} for a refund of the extra payment.`],
    duplicatelife: ['error', V.html`This account already has Premium for life, so the new purchase was not added. ${V.supportLink(cfg, 'Contact support on Discord')} for a refund of the extra payment.`],
    upgraded: ['notice', 'Premium for life is on your account. Your subscription was canceled, so you won’t be charged again.'],
    upgradefail: ['error', V.html`Premium for life is on your account, but your subscription couldn’t be canceled yet. We’ll keep trying; if it renews, ${V.supportLink(cfg, 'contact support on Discord')} for a refund.`],
    password: ['notice', 'Password changed. Other browsers were signed out.'],
    passwordset: ['notice', 'Password saved. Use it with your email to sign in to Rago Optimizer for Windows.'],
    nofile: ['error', V.html`The Windows app can't be downloaded right now. Try again a bit later, or ${V.supportLink(cfg, 'ask on Discord')} and we'll tell you when it's back.`],
    nobilling: ['error', V.html`Billing isn't available right now. Try again in a moment, or ${V.supportLink(cfg, 'contact support on Discord')}.`],
    discord: ['notice', 'Discord linked.'],
    discordoff: ['notice', 'Discord unlinked. The Premium role was removed from that Discord account.'],
    discordcancel: ['error', "Discord isn't linked: the authorization was canceled on Discord. Link it again anytime below."],
    discordfail: ['error', V.html`Discord couldn't be linked. Try again, or ${V.supportLink(cfg, 'ask on Discord')}.`],
    discordbusy: ['error', "Discord isn't answering right now. Try again in a moment."],
  };

  function resetWindow(license, device) {
    if (!device || !cfg.selfServiceResetDays || license.status !== 'active') return { canReset: false, nextResetAt: null };
    const next = (license.last_reset_at || 0) + cfg.selfServiceResetDays * DAY;
    return { canReset: next <= Date.now(), nextResetAt: next > Date.now() ? next : null };
  }

  app.get('/account', requireUser, async (c) => {
    const user = c.get('user');
    await settleAffiliate(user.id);
    // VIP / MVP on Discord since the last look: the reward (Premium time, a code) is given before the page shows.
    if (discord) await discord.checkRewards(user.id);
    const license = await L.current(db, await L.licenseForUser(db, user.id));
    const device = license && await L.getDevice(db, license.id);
    // The Discord role follows Premium as of now (a claim or an ended reward since the last pass).
    const discordLink = discord && await discord.syncUser(user.id);
    const discordRewards = discord?.rewards.length ? await discord.rewardsOf(user.id) : [];
    const [kind, text] = NOTICES[c.req.query('n')] || [];
    return c.html(V.dashboardPage(cfg, {
      user, license, device, discordLink, discordRewards, inviteRewards: discord?.rewards || [], noPassword: !L.hasPassword(user),
      notice: kind === 'notice' ? text : null, error: kind === 'error' ? text : null,
      ...(license ? resetWindow(license, device) : {}),
      affiliate: await A.affiliateSummary(db, cfg, user.id),
      review: await R.reviewOf(db, user.id),
      // Lifetime is offered (free plan text, "Switch to Lifetime") only while its Stripe price can really be paid, and
      // only where it shows: Stripe isn't asked for accounts that hold Premium for life or a reward.
      lifetime: (license?.status !== 'active' || license.plan === 'month' || license.plan === 'year') && !!(await lifetimeOffer()),
    }));
  });

  // An account made with Google or Discord has no password yet: it sets one here without a current password.
  app.get('/account/password', requireUser, (c) => c.html(V.passwordPage(cfg, { user: c.get('user'), hasPassword: L.hasPassword(c.get('user')) })));
  app.post('/account/password', requireUser, async (c) => {
    const user = c.get('user');
    const body = await c.req.parseBody();
    const password = String(body.password || '');
    const had = L.hasPassword(user);
    const fail = (error, status = 400) => c.html(V.passwordPage(cfg, { user, error, hasPassword: had }), status);
    if (!allow(`password:${user.id}`, 10, 15 * 60 * 1000)) return fail(API_ERRORS.rate_limited[1], 429);
    if (had && !(await verifyPassword(String(body.current || ''), user.password_hash))) return fail('Your current password is wrong.', 401);
    if (password.length < 8 || password.length > 200) return fail(`Use at least 8 characters for your ${had ? 'new ' : ''}password.`);
    await L.setPassword(db, user.id, password); // signs out every session, this one included
    await signIn(c, user);
    return c.redirect(`/account?n=${had ? 'password' : 'passwordset'}`, 303);
  });

  // ---------- public profile: photo and name ----------
  // After sign-up the same page is a skippable step (?welcome=1&to=<where the player was going>).
  const WELCOME_TO = /^\/(account(\?n=[a-z]+)?|account\/review|affiliate)$/;
  const welcomeOf = (src) => {
    const to = String(src?.to || '');
    return src?.welcome === '1' && WELCOME_TO.test(to) ? { welcome: true, to } : { welcome: false, to: null };
  };
  const profileUrl = (n, w) => `/account/profile?${new URLSearchParams({ ...(n ? { n } : {}), ...(w.welcome ? { welcome: '1', to: w.to } : {}) })}`.replace(/\?$/, '');
  const PROFILE_NOTICES = {
    photo: ['notice', 'Photo saved. It shows on your reviews and in Rago Optimizer.'],
    removed: ['notice', 'Photo removed.'],
    name: ['notice', 'Public name saved.'],
    review: ['notice', 'Review deleted. It no longer shows on the site.'],
    toolarge: ['error', API_ERRORS.image_too_large[1]],
  };
  const showProfile = async (c, user, { n, error, status = 200, w = welcomeOf(c.req.query()) } = {}) => {
    const [kind, text] = PROFILE_NOTICES[n] || [];
    return c.html(V.profilePage(cfg, { user, review: await R.reviewOf(db, user.id), premium: await hasPremium(user.id), notice: kind === 'notice' ? text : null, error: error || (kind === 'error' ? text : null), ...w }), status);
  };
  app.get('/account/profile', requireUser, (c) => showProfile(c, c.get('user'), { n: c.req.query('n') }));

  app.post('/account/profile/photo', requireUser, async (c) => {
    const user = c.get('user');
    const body = await c.req.parseBody();
    const w = welcomeOf(body);
    if (!allow(`avatar:${user.id}`, 20, 60 * 60 * 1000)) return showProfile(c, user, { error: API_ERRORS.rate_limited[1], status: 429, w });
    const file = body.photo;
    try {
      await P.replaceAvatar(db, avatars, user.id, file && typeof file === 'object' ? Buffer.from(await file.arrayBuffer()) : Buffer.alloc(0));
    } catch (err) {
      if (err instanceof P.ProfileError) return showProfile(c, user, { error: err.message, status: err.code === 'image_too_large' ? 413 : 400, w });
      log.error('[avatars] upload failed', err.message);
      return showProfile(c, user, { error: API_ERRORS.storage_unavailable[1], status: 503, w });
    }
    reviewsCache = null;
    await audit(db, 'profile.photo', { userId: user.id });
    return c.redirect(profileUrl('photo', w), 303);
  });

  app.post('/account/profile/photo/remove', requireUser, async (c) => {
    const user = c.get('user');
    const w = welcomeOf(await c.req.parseBody());
    try { await P.removeAvatar(db, avatars, user.id); } catch (err) {
      log.error('[avatars] remove failed', err.message);
      return showProfile(c, user, { error: API_ERRORS.storage_unavailable[1], status: 503, w });
    }
    reviewsCache = null;
    return c.redirect(profileUrl('removed', w), 303);
  });

  app.post('/account/profile/review/delete', requireUser, async (c) => {
    const user = c.get('user');
    if (await R.deleteReview(db, user.id)) {
      reviewsCache = null;
      await audit(db, 'review.deleted', { userId: user.id });
    }
    return c.redirect(profileUrl('review', welcomeOf(null)), 303);
  });

  // ---------- review from the account page (2026-10-11) ----------
  // The same review as the one left in Rago Optimizer (one per account, see reviews.js), written here by Premium
  // accounts. Free accounts still leave theirs in the app; anyone can delete their own, here or on the profile page.
  const hasPremium = async (userId) => (await L.current(db, await L.licenseForUser(db, userId)))?.status === 'active';
  const REVIEW_NOTICES = {
    saved: 'Thanks! Your review is on the site.',
    deleted: 'Review deleted. It no longer shows on the site.',
  };
  /** draft: what the player typed, put back in the form when it's refused. */
  const showReview = async (c, user, { n, error, status = 200, draft = null } = {}) => {
    const rating = Number(c.req.query('rating'));
    return c.html(V.reviewPage(cfg, {
      user, premium: await hasPremium(user.id), review: await R.reviewOf(db, user.id), draft, error,
      notice: REVIEW_NOTICES[n] || null, rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    }), status);
  };
  app.get('/account/review', requireUser, (c) => showReview(c, c.get('user'), { n: c.req.query('n') }));

  app.post('/account/review', requireUser, async (c) => {
    const user = c.get('user');
    const body = await c.req.parseBody();
    const draft = { rating: Number(body.rating) || 0, comment: String(body.comment ?? ''), name: String(body.name ?? '') };
    if (!(await hasPremium(user.id))) return showReview(c, user, { status: 403 });
    if (!allow(`review:${user.id}`, 20, 60 * 60 * 1000)) return showReview(c, user, { error: API_ERRORS.rate_limited[1], status: 429, draft });
    let review;
    try {
      // Same checks as the app (PUT /api/v1/account/review): the whole review, the name included, before anything is saved.
      const clean = R.cleanReview(body);
      const typed = draft.name.trim();
      const name = typed ? P.cleanName(typed) : user.display_name;
      if (!name) throw new P.ProfileError('name_required', API_ERRORS.name_required[1]);
      if (name !== user.display_name) await P.setName(db, user.id, name);
      review = await R.saveReview(db, user.id, clean);
    } catch (err) {
      if (err instanceof P.ProfileError) return showReview(c, user, { error: err.message || API_ERRORS[err.code]?.[1], status: 400, draft });
      throw err;
    }
    reviewsCache = null;
    await audit(db, 'review.saved', { userId: user.id, detail: { rating: review.rating, from: 'site' } });
    return c.redirect('/account/review?n=saved', 303);
  });

  app.post('/account/review/delete', requireUser, async (c) => {
    const user = c.get('user');
    if (await R.deleteReview(db, user.id)) {
      reviewsCache = null;
      await audit(db, 'review.deleted', { userId: user.id, detail: { from: 'site' } });
    }
    return c.redirect('/account/review?n=deleted', 303);
  });

  app.post('/account/profile/name', requireUser, async (c) => {
    const user = c.get('user');
    const body = await c.req.parseBody();
    const w = welcomeOf(body);
    try { await P.setName(db, user.id, body.name); } catch (err) {
      if (err instanceof P.ProfileError) return showProfile(c, user, { error: err.message, status: 400, w });
      throw err;
    }
    reviewsCache = null;
    return c.redirect(profileUrl('name', w), 303);
  });

  // Profile photos: public, cached a year (a new photo gets a new file name). Loaded by the site too.
  app.get('/avatars/:file', async (c) => {
    const file = c.req.param('file');
    if (!P.AVATAR_FILE.test(file)) return c.text('Not found', 404);
    let bytes;
    try { bytes = await avatars.get(file); } catch (err) {
      log.error('[avatars] read failed', err.message);
      return c.text('Unavailable', 503, { 'Cache-Control': 'no-store' });
    }
    if (!bytes) return c.text('Not found', 404, { 'Cache-Control': 'no-store' });
    return c.body(bytes, 200, { 'Content-Type': 'image/webp', 'Content-Length': String(bytes.length), 'Cache-Control': 'public, max-age=31536000, immutable' });
  });

  // Stripe's customer portal: change plan, update the card, invoices, cancel.
  app.post('/account/billing', requireUser, async (c) => {
    const license = await L.licenseForUser(db, c.get('user').id);
    if (!stripe || !license?.stripe_customer_id) return c.redirect('/account', 303);
    try {
      const portal = await billingPortal(stripe, cfg, license.stripe_customer_id);
      return c.redirect(portal.url, 303);
    } catch (err) {
      log.error('[stripe] billing portal', err.message);
      return c.redirect('/account?n=nobilling', 303);
    }
  });

  // ---------- Discord: the Pro role, given by the bot while Premium is active ----------
  // "Link Discord" sends the player to Discord's authorization page (identify + guilds.join). The state is tied to
  // this account and browser by a signed cookie, so nobody can link their own Discord account to someone else's.
  const DISCORD_COOKIE = 'rg_discord';
  const discordCookie = { ...cookieBase, path: '/account/discord' };
  app.get('/account/discord', requireUser, (c) => {
    if (!discord) return c.redirect('/account', 303);
    const state = randomToken(16);
    setCookie(c, DISCORD_COOKIE, signValue(`${c.get('user').id}.${state}`, cfg.sessionSecret), { ...discordCookie, maxAge: 10 * 60 });
    return c.redirect(discord.authorizeUrl(state), 302);
  });

  app.get('/account/discord/callback', requireUser, async (c) => {
    if (!discord) return c.redirect('/account', 303);
    const user = c.get('user');
    const saved = unsignValue(getCookie(c, DISCORD_COOKIE), cfg.sessionSecret);
    deleteCookie(c, DISCORD_COOKIE, { path: discordCookie.path });
    const { code, state, error } = c.req.query();
    if (error) return c.redirect('/account?n=discordcancel', 303); // Cancel on Discord's page
    if (!code || !state || !saved || !sameHash(saved, `${user.id}.${state}`) || !allow(`discord:${user.id}`, 10, 60 * 60 * 1000)) {
      return c.redirect('/account?n=discordfail', 303);
    }
    try {
      await discord.link(user.id, String(code));
    } catch (err) {
      if (!(err instanceof DiscordError)) throw err;
      log.error('[discord] link failed:', err.message);
      return c.redirect('/account?n=discordfail', 303);
    }
    return c.redirect('/account?n=discord', 303);
  });

  // "Sync role": gives the role again right away (left the server and came back, role removed by hand).
  app.post('/account/discord/sync', requireUser, async (c) => {
    const user = c.get('user');
    if (discord && allow(`discord-sync:${user.id}`, 10, 60 * 60 * 1000)) await discord.syncUser(user.id, { force: true });
    return c.redirect('/account', 303);
  });

  app.post('/account/discord/unlink', requireUser, async (c) => {
    if (!discord) return c.redirect('/account', 303);
    try {
      await discord.unlink(c.get('user').id);
    } catch (err) {
      if (!(err instanceof DiscordError)) throw err;
      log.error('[discord] unlink refused:', err.message);
      return c.redirect('/account?n=discordbusy', 303);
    }
    return c.redirect('/account?n=discordoff', 303);
  });

  // ---------- affiliate program ----------
  app.get('/affiliate', async (c) => {
    const user = await currentUser(c);
    // Codes from before the Stripe discount existed (or made in the other Stripe mode) get it here.
    if (user) await ensureAffiliatePromo(db, stripe, cfg, await A.getAffiliate(db, user.id), log);
    if (user) await settleAffiliate(user.id);
    const summary = user && await A.affiliateSummary(db, cfg, user.id);
    return c.html(V.affiliatePage(cfg, { user, summary, joined: c.req.query('n') === 'joined' }));
  });

  app.post('/affiliate/join', requireUser, async (c) => {
    const aff = await A.joinAffiliate(db, c.get('user').id);
    await ensureAffiliatePromo(db, stripe, cfg, aff, log);
    return c.redirect('/affiliate?n=joined', 303);
  });

  // Download: Premium accounts, and free users too (the free plan is the app with Premium tweaks locked).
  async function sendInstaller(c, who) {
    const out = await installer.resolve();
    if (out.error) return null;
    await audit(db, 'download', { licenseId: who?.licenseId, userId: who?.userId, detail: { source: out.source } });
    if (out.url) return c.redirect(out.url, 302);
    return new Response(Readable.toWeb(createReadStream(out.file)), {
      headers: {
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Length': String(out.size),
        'Content-Disposition': `attachment; filename="${cfg.installerFileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  app.get('/account/download', requireUser, async (c) => {
    const user = c.get('user');
    const license = await L.licenseForUser(db, user.id);
    return (await sendInstaller(c, { userId: user.id, licenseId: license?.id })) || c.redirect('/account?n=nofile', 303);
  });

  // Public link for the site's free download button.
  app.get('/download', async (c) => {
    if (!allow(`download:${ip(c)}`, 30, 60 * 60 * 1000)) return c.html(V.messagePage(cfg, { overline: 'Free download', title: 'Too many downloads.', text: API_ERRORS.rate_limited[1] }), 429);
    return (await sendInstaller(c, null)) || c.html(V.messagePage(cfg, { overline: 'Free download', title: 'The Windows app is on its way.',
      text: 'Rago Optimizer can’t be downloaded right now. Ask on Discord and we’ll tell you as soon as it’s back.' }), 503);
  });

  // For the launch guide: says whether the installer is found, without exposing anything secret.
  app.get('/download/status', async (c) => {
    if (!allow(`download-status:${ip(c)}`, 30, 60 * 60 * 1000)) return c.json({ ok: false, error: 'Too many checks. Wait a few minutes.' }, 429);
    const out = await installer.resolve({ fresh: true });
    return c.json(out.error ? { ok: false, error: out.error } : { ok: true, source: out.source, file: out.file || null }, out.error ? 503 : 200);
  });

  app.post('/account/reset-device', requireUser, async (c) => {
    const license = await L.licenseForUser(db, c.get('user').id);
    const device = license && await L.getDevice(db, license.id);
    if (!license || !resetWindow(license, device).canReset) return c.redirect('/account', 303);
    await L.resetDevice(db, license.id, 'self');
    return c.redirect('/account?n=reset', 303);
  });

  // ---------- admin: the site's discount pop-up ----------
  // Opened with ADMIN_KEY (Railway variable, 16 characters at least): typed once, then a cookie for 7 days,
  // limited to /admin. Changing the key closes every open admin session. Without the key, /admin is a 404.
  const ADMIN_COOKIE = 'rago_admin';
  const adminPass = cfg.adminKey.length >= 16 ? createHmac('sha256', cfg.adminKey).update('rago-admin-v1').digest('base64url') : null;
  const isAdmin = (c) => !!adminPass && sameHash(getCookie(c, ADMIN_COOKIE) || '', adminPass);
  const adminCookie = { httpOnly: true, secure: cfg.prod, sameSite: 'Strict', path: '/admin' };
  app.use('/admin/*', async (c, next) => { c.header('Cache-Control', 'no-store'); await next(); });
  app.use('/admin', async (c, next) => { c.header('Cache-Control', 'no-store'); await next(); });
  const adminPage = async (c, extra = {}, status = 200) => {
    const [state, stripeState, discordState] = await Promise.all([Promo.popupState(db, stripe, cfg), stripeChecks(stripe, cfg, { db, webhook: hookSeen }),
      discord ? discord.checks() : { missing: discordSetupMissing(cfg) }]);
    return c.html(V.adminPage(cfg, { state, stripe: stripeState, discord: discordState, ...extra }), status);
  };

  app.get('/admin', async (c) => {
    if (!adminPass) return c.notFound();
    if (!isAdmin(c)) return c.html(V.adminLoginPage(cfg));
    return adminPage(c, { notice: c.req.query('n'), count: Number(c.req.query('count')) || 0 });
  });
  app.post('/admin/login', async (c) => {
    if (!adminPass) return c.notFound();
    if (!allow(`admin-login:${ip(c)}`, 10, 60 * 60 * 1000)) return c.html(V.adminLoginPage(cfg, { error: 'Trop d’essais. Réessaie dans une heure.' }), 429);
    const body = await c.req.parseBody();
    if (!sameHash(String(body.key || '').trim(), cfg.adminKey)) {
      await audit(db, 'admin.login_failed', { detail: { ip: ip(c) } });
      return c.html(V.adminLoginPage(cfg, { error: 'Cette clé ne correspond pas à ADMIN_KEY.' }), 401);
    }
    setCookie(c, ADMIN_COOKIE, adminPass, { ...adminCookie, maxAge: 7 * 86400 });
    return c.redirect('/admin', 303);
  });
  app.post('/admin/logout', (c) => {
    deleteCookie(c, ADMIN_COOKIE, adminCookie);
    return c.redirect('/admin', 303);
  });
  app.post('/admin/popup', async (c) => {
    if (!adminPass) return c.notFound();
    if (!isAdmin(c)) return c.redirect('/admin', 303);
    const body = await c.req.parseBody();
    const input = { enabled: body.enabled === 'on' };
    for (const k of ['code', 'percent', 'limit', 'eyebrow', 'title', 'text']) input[k] = String(body[k] ?? '');
    try {
      const out = await Promo.savePopup(db, stripe, input);
      popupCache = null;
      await audit(db, 'admin.popup', { detail: { ...out.settings, created: out.created } });
      return c.redirect(`/admin?n=${out.created ? 'created' : 'saved'}`, 303);
    } catch (err) {
      if (!(err instanceof Promo.PopupError)) throw err;
      return adminPage(c, { error: err.message, values: input }, 400);
    }
  });

  app.post('/admin/test-licenses', async (c) => {
    if (!adminPass) return c.notFound();
    if (!isAdmin(c)) return c.redirect('/admin', 303);
    const ended = await endTestLicenses(db, cfg);
    await audit(db, 'admin.test_licenses_ended', { detail: { count: ended } });
    discord?.syncAll(); // their Discord role goes too
    return c.redirect(`/admin?n=test-ended&count=${ended}`, 303);
  });
  // The network tests sent by the app (RAG-50), by city and by provider, to see where future proxies would help.
  app.get('/admin/reseau', async (c) => {
    if (!adminPass) return c.notFound();
    if (!isAdmin(c)) return c.redirect('/admin', 303);
    const days = [30, 90, 365].includes(Number(c.req.query('jours'))) ? Number(c.req.query('jours')) : 90;
    return c.html(V.adminNetworkPage(cfg, { summary: await N.networkSummary(db, { days }), geo: geo.state() }));
  });
  app.get('/admin/reseau.csv', async (c) => {
    if (!adminPass) return c.notFound();
    if (!isAdmin(c)) return c.redirect('/admin', 303);
    return c.body(await N.networkCsv(db), 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rago-tests-reseau-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
  });

  // ---------- Stripe webhook ----------
  // What /admin shows about the signing secret, which Stripe never shows again: when the last event with a
  // wrong signature, or from the other Stripe mode, arrived since the server started.
  const hookSeen = { refusedAt: 0, otherModeAt: 0 };
  app.post('/webhooks/stripe', async (c) => {
    if (!stripe) return c.text('Stripe not configured', 503);
    const raw = Buffer.from(await c.req.arrayBuffer());
    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, c.req.header('stripe-signature') || '', cfg.stripeWebhookSecret);
    } catch {
      // Anyone can post here: noted, and logged at most every 10 minutes.
      if (c.req.header('stripe-signature') && Date.now() - hookSeen.refusedAt > 10 * 60 * 1000) {
        log.error(`[stripe] webhook refused (bad signature): STRIPE_WEBHOOK_SECRET must be the whsec_ of the ${stripeMode(cfg) || ''} destination that sends to this server.`);
      }
      if (c.req.header('stripe-signature')) hookSeen.refusedAt = Date.now();
      return c.text('Bad signature', 400);
    }
    // Signed with our secret but from the other mode: the secret is the other destination's. Never applied with
    // this key (a test purchase would become a real license); acknowledged so Stripe doesn't retry it for days.
    const mode = stripeMode(cfg);
    if (mode && typeof event.livemode === 'boolean' && event.livemode !== (mode === 'live')) {
      hookSeen.otherModeAt = Date.now();
      log.error(`[stripe] ${event.type} ${event.id} ignored: it comes from Stripe ${event.livemode ? 'live' : 'test'} mode and STRIPE_SECRET_KEY is the ${mode} key. Put the whsec_ of the ${mode} destination in STRIPE_WEBHOOK_SECRET.`);
      return c.json({ received: true, ignored: 'other_mode' });
    }
    const label = await handleStripeEvent(db, event, { stripe, onLicense: sendClaimEmail, log });
    log.info?.(`[stripe] ${event.type} ${event.id} -> ${label}`);
    // Premium may have started, stopped or come back: the Discord role follows, after this reply to Stripe.
    discord?.syncAll();
    if (event.type.startsWith('checkout.session.')) popupCache = null; // a code use: the pop-up's count moves
    return c.json({ received: true });
  });

  // ---------- App API (Rago Optimizer) ----------
  const api = new Hono();
  const fail = (c, code, extra) => {
    const [status, message] = API_ERRORS[code];
    return c.json({ error: { code, message, ...extra } }, status);
  };
  async function readJson(c) {
    try { return await c.req.json(); } catch { return null; }
  }
  const now = () => Math.floor(Date.now() / 1000);

  // A subscriber's token ends with the paid period (plus a few days of grace), never later than 30 days.
  // At least 1 day, so a late webhook can't lock a paying player out.
  function tokenExp(license, iat) {
    const max = iat + cfg.licenseTokenDays * 86400;
    if (license.plan === 'lifetime' || !license.current_period_end) return max;
    // An affiliate reward ends on its date, without the renewal grace days.
    if (license.plan === 'reward') return Math.max(iat + 3600, Math.min(max, Math.floor(license.current_period_end / 1000)));
    const paidUntil = Math.floor(license.current_period_end / 1000) + cfg.subscriptionGraceDays * 86400;
    return Math.max(iat + 86400, Math.min(max, paidUntil));
  }
  function licenseToken(user, license, device) {
    const iat = now();
    const exp = tokenExp(license, iat);
    return {
      exp,
      token: signToken({
        typ: 'license', iss: cfg.publicUrl, sub: user.id, email: user.email, plan: 'premium',
        lic: license.id, did: device.id, tv: license.token_version,
        fp: { machine_guid: device.machine_guid, smbios_uuid: device.smbios_uuid, board_serial: device.board_serial },
        iat, exp,
      }, keys),
    };
  }
  const licenseInfo = (license, device) => ({
    key_hint: maskLicenseKey(license.key), status: license.status, plan: 'premium',
    billing: {
      interval: license.plan, // month | year | lifetime | reward (affiliate months, ends on ends_at)
      renews_at: license.plan !== 'lifetime' && license.plan !== 'reward' && license.current_period_end && !license.cancel_at_period_end ? new Date(Number(license.current_period_end)).toISOString() : null,
      ends_at: license.plan !== 'lifetime' && license.current_period_end && (license.cancel_at_period_end || license.plan === 'reward') ? new Date(Number(license.current_period_end)).toISOString() : null,
    },
    device: device ? { name: device.name, activated_at: new Date(device.bound_at).toISOString() } : null,
  });
  // Key for the Premium scripts encrypted in this app version (1.1.6+). Only in "active" replies, so only
  // for a working license on its own PC. No key without SCRIPTS_SECRET or without an app version.
  const scriptsKey = (appVersion) => (cfg.scriptsSecret && appVersion
    ? createHmac('sha256', Buffer.from(cfg.scriptsSecret, 'utf8')).update(`rago-scripts-v1|${appVersion}`).digest('base64') : null);
  const tokenReply = (user, license, device, appVersion) => {
    const { token, exp } = licenseToken(user, license, device);
    const key = scriptsKey(appVersion);
    return { status: 'active', license_token: token, expires_at: new Date(exp * 1000).toISOString(), account: { email: user.email }, license: licenseInfo(license, device), ...(key ? { scripts_key: key } : {}) };
  };
  // With a subscription, the player picks monthly or yearly on the site.
  const buyUrl = () => (cfg.subscriptions ? `${cfg.siteUrl}/#pricing` : `${cfg.publicUrl}/buy`);
  const failLicense = (c, license, code) => (code === 'revoked' && license?.status_reason === 'subscription_ended'
    ? fail(c, 'revoked', { reason: 'subscription_ended', message: API_ERRORS.subscription_ended[1], buy_url: buyUrl() })
    : fail(c, code));

  // ?format=pem returns the bare key, ready to paste into the app's build secret.
  api.get('/public-key', (c) => (c.req.query('format') === 'pem'
    ? c.text(keys.publicPem)
    : c.json({ alg: 'EdDSA', crv: 'Ed25519', kid: keys.kid, public_key_pem: keys.publicPem })));

  api.post('/auth/login', async (c) => {
    const body = await readJson(c);
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') return fail(c, 'invalid_request');
    let device;
    try { device = parseDevice(body.device); } catch (e) { return fail(c, 'invalid_request', { detail: e instanceof DeviceError ? e.message : undefined }); }
    const email = body.email.trim().toLowerCase();
    if (!loginAllowed(c, 'api-login', email)) return fail(c, 'rate_limited');

    const user = await L.findUserByEmail(db, email);
    const ok = await verifyPassword(body.password, user ? user.password_hash : DUMMY_HASH);
    loginResult(c, email, user && ok);
    if (!user || !ok) return fail(c, 'invalid_credentials');
    await A.rememberDevice(db, user.id, device);
    await settleAffiliate(user.id);
    const license = await L.current(db, await L.licenseForUser(db, user.id));
    if (!license) return fail(c, 'no_license', { buy_url: buyUrl() });
    let state;
    try { ({ state } = await L.deviceState(db, license, device)); } catch (err) {
      if (err.code === 'bound_to_other_device') await audit(db, 'device.blocked', { licenseId: license.id, userId: user.id, detail: { name: device.name, ip: ip(c) } });
      return failLicense(c, license, err.code);
    }
    if (state === 'here') {
      const out = await L.activate(db, license.id, device, ip(c));
      await settleReferrer(license.id);
      return c.json(tokenReply(user, out.license, out.device, device.appVersion));
    }
    const iat = now();
    const access = signToken({ typ: 'access', sub: user.id, lic: license.id, iat, exp: iat + 900 }, keys);
    return c.json({ status: 'activation_required', access_token: access, expires_in: 900, account: { email: user.email }, license: licenseInfo(license, null) });
  });

  api.post('/licenses/activate', async (c) => {
    const auth = c.req.header('authorization') || '';
    const claims = verifyToken(auth.replace(/^Bearer\s+/i, ''), keys, { typ: 'access' });
    if (!claims) return fail(c, 'invalid_token');
    const body = await readJson(c);
    let device;
    try { device = parseDevice(body?.device); } catch (e) { return fail(c, 'invalid_request', { detail: e.message }); }
    const user = await L.getUser(db, claims.sub);
    const license = user && await L.current(db, await L.getLicense(db, claims.lic));
    if (!license || license.user_id !== user.id) return fail(c, 'invalid_token');
    try {
      const out = await L.activate(db, license.id, device, ip(c));
      await settleReferrer(license.id);
      return c.json(tokenReply(user, out.license, out.device, device.appVersion));
    } catch (err) {
      if (err instanceof L.LicenseError) return failLicense(c, license, err.code);
      throw err;
    }
  });

  api.post('/licenses/refresh', async (c) => {
    const body = await readJson(c);
    const claims = verifyToken(body?.license_token, keys, { typ: 'license', allowExpired: true });
    if (!claims) return fail(c, 'invalid_token');
    let device;
    try { device = parseDevice(body.device); } catch (e) { return fail(c, 'invalid_request', { detail: e.message }); }
    if (!allow(`refresh:${claims.lic}`, 30, 60 * 60 * 1000)) return fail(c, 'rate_limited');
    let license = await L.current(db, await L.getLicense(db, claims.lic));
    const user = license && await L.getUser(db, claims.sub);
    if (!license || !user || license.user_id !== user.id) return fail(c, 'invalid_token');
    // A license replaced by a purchase (an affiliate reward, or a subscription replaced by Lifetime): the same PC
    // moved to the new license.
    const replaced = license.status === 'revoked' && license.status_reason === 'replaced';
    if (replaced) {
      const next = await L.licenseForUser(db, user.id);
      if (next?.status === 'active' && (await L.getDevice(db, next.id))?.id === claims.did) license = next;
    }
    if (license.status !== 'active') return failLicense(c, license, 'revoked');
    const bound = await L.getDevice(db, license.id);
    if (bound && !sameDevice(bound, device.fp)) return fail(c, 'bound_to_other_device');
    // Device freed or re-bound since this token was issued: the app must sign in again.
    if (!bound || bound.id !== claims.did || (!replaced && claims.tv !== license.token_version)) return fail(c, 'invalid_token');
    const out = await L.activate(db, license.id, device, ip(c));
    return c.json(tokenReply(user, out.license, out.device, device.appVersion));
  });

  // ---------- App API: account, review and profile photo (2026-10-09) ----------
  // Signed in with the license token of this PC (Premium), or with an account token from /account/login
  // (any account, free ones included).
  async function apiUser(c) {
    const bearer = (c.req.header('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!bearer) return null;
    if (bearer.split('.').length === 3) {
      const claims = verifyToken(bearer, keys, { typ: 'license' });
      if (!claims) return null;
      const lic = await L.getLicense(db, claims.lic);
      if (!lic || lic.status !== 'active' || lic.user_id !== claims.sub || lic.token_version !== claims.tv) return null;
      return L.getUser(db, claims.sub);
    }
    return L.userForApiSession(db, bearer);
  }
  const accountReply = async (user) => ({ account: P.profileOf(cfg, user), review: R.reviewView(await R.reviewOf(db, user.id)) });
  const failProfile = (c, err) => (err instanceof P.ProfileError ? fail(c, err.code) : Promise.reject(err));

  api.post('/account/login', async (c) => {
    const body = await readJson(c);
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') return fail(c, 'invalid_request');
    const email = body.email.trim().toLowerCase();
    if (!loginAllowed(c, 'api-login', email)) return fail(c, 'rate_limited');
    const user = await L.findUserByEmail(db, email);
    const ok = await verifyPassword(body.password, user ? user.password_hash : DUMMY_HASH);
    loginResult(c, email, user && ok);
    if (!user || !ok) return fail(c, 'invalid_credentials');
    const { token, expiresAt } = await L.createApiSession(db, user.id);
    return c.json({ account_token: token, expires_at: new Date(expiresAt).toISOString(), ...(await accountReply(user)) });
  });

  api.use('/account/*', async (c, next) => {
    const user = await apiUser(c);
    if (!user) return fail(c, 'invalid_token');
    if (!allow(`account-api:${user.id}`, 300, 60 * 60 * 1000)) return fail(c, 'rate_limited');
    c.set('user', user);
    await next();
  });

  api.get('/account/me', async (c) => c.json(await accountReply(c.get('user'))));

  api.post('/account/logout', async (c) => {
    await L.deleteApiSession(db, (c.req.header('authorization') || '').replace(/^Bearer\s+/i, '').trim());
    return c.json({ ok: true });
  });

  api.put('/account/review', async (c) => {
    const user = c.get('user');
    const body = await readJson(c);
    if (!body || typeof body !== 'object') return fail(c, 'invalid_request');
    if (!allow(`review:${user.id}`, 20, 60 * 60 * 1000)) return fail(c, 'rate_limited');
    let review;
    try {
      // The whole review is checked before anything is saved, the name included.
      const clean = R.cleanReview(body);
      const typed = body.name == null ? '' : String(body.name).trim();
      const name = typed ? P.cleanName(typed) : user.display_name;
      if (!name) throw new P.ProfileError('name_required');
      if (name !== user.display_name) await P.setName(db, user.id, name);
      review = await R.saveReview(db, user.id, clean, typeof body.app_version === 'string' ? body.app_version : null);
    } catch (err) {
      return failProfile(c, err);
    }
    reviewsCache = null;
    await audit(db, 'review.saved', { userId: user.id, detail: { rating: review.rating } });
    return c.json(await accountReply(await L.getUser(db, user.id)));
  });

  api.delete('/account/review', async (c) => {
    const user = c.get('user');
    if (await R.deleteReview(db, user.id)) {
      reviewsCache = null;
      await audit(db, 'review.deleted', { userId: user.id, detail: { from: 'app' } });
    }
    return c.json(await accountReply(user));
  });

  api.put('/account/name', async (c) => {
    const user = c.get('user');
    const body = await readJson(c);
    try { await P.setName(db, user.id, body?.name); } catch (err) { return failProfile(c, err); }
    reviewsCache = null;
    return c.json(await accountReply(await L.getUser(db, user.id)));
  });

  // Body: the picture's bytes (JPG, PNG, WebP or GIF, 5 MB at most). Stored as a 256 × 256 WebP.
  api.put('/account/avatar', async (c) => {
    const user = c.get('user');
    if (!allow(`avatar:${user.id}`, 20, 60 * 60 * 1000)) return fail(c, 'rate_limited');
    try {
      await P.replaceAvatar(db, avatars, user.id, Buffer.from(await c.req.arrayBuffer()));
    } catch (err) {
      if (err instanceof P.ProfileError) return failProfile(c, err);
      log.error('[avatars] upload failed', err.message);
      return fail(c, 'storage_unavailable');
    }
    reviewsCache = null;
    await audit(db, 'profile.photo', { userId: user.id, detail: { from: 'app' } });
    return c.json(await accountReply(await L.getUser(db, user.id)));
  });

  api.delete('/account/avatar', async (c) => {
    const user = c.get('user');
    try { await P.removeAvatar(db, avatars, user.id); } catch (err) {
      log.error('[avatars] remove failed', err.message);
      return fail(c, 'storage_unavailable');
    }
    reviewsCache = null;
    return c.json(await accountReply(await L.getUser(db, user.id)));
  });

  // Public: the reviews shown on the site (rago-optimizer.com reads it from the browser). The home page's carousel
  // gets the latest ones; the reviews page asks for all of them (?all=1).
  api.get('/reviews', async (c) => {
    const all = c.req.query('all') === '1';
    if (!reviewsCache || Date.now() - reviewsCache.at > 30 * 1000) reviewsCache = { at: Date.now(), bodies: {} };
    const { bodies } = reviewsCache; // a review saved meanwhile drops reviewsCache, not this answer
    const key = all ? 'all' : 'site';
    bodies[key] ??= await R.publicReviews(db, cfg, all ? R.ALL_LIMIT : R.SITE_LIMIT);
    return c.json(bodies[key], 200, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' });
  });

  // Public: the discount pop-up the site shows (set in /admin), or { promo: null } when it's hidden. The site
  // reads it from the browser on every visit; the count of uses left is at most 30 seconds old.
  api.get('/promo', async (c) => {
    if (!popupCache || Date.now() - popupCache.at > 30 * 1000) {
      const state = await Promo.popupState(db, stripe, cfg);
      if (state.error) log.error('[stripe] pop-up code not read:', state.error);
      popupCache = { at: Date.now(), body: { promo: Promo.publicPopup(state) } };
    }
    return c.json(popupCache.body, 200, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=30' });
  });

  // Public: whether the site's Lifetime card can sell (2026-10-16). { lifetime: { amount, currency } } once
  // STRIPE_PRICE_LIFETIME is an active one-time price in Stripe, else { lifetime: null } ("Coming soon" on the site).
  api.get('/plans', async (c) => c.json({ lifetime: await lifetimeOffer() }, 200, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' }));

  // Public: the version of the installer /download serves (Railway variable INSTALLER_VERSION), shown under the
  // site's download button. { version: null } while the variable isn't set.
  api.get('/installer', (c) => {
    const v = cfg.installerVersion.trim().replace(/^v/i, '');
    return c.json({ version: /^\d+(\.\d+){1,3}$/.test(v) ? v : null }, 200, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' });
  });

  // ---------- automatic updates of the app (RAG-24) ----------
  // The app asks GET /api/v1/update/windows/x86_64/<its version> when it starts, then every few hours. 204: nothing to
  // install. 200: the newest installer of the bucket and the signature the build made for it (<exe>.sig, uploaded next
  // to it). The app checks that signature with the key it embeds before running anything, so a wrong file is refused.
  const semver = (v) => {
    const m = /^(\d{1,9})\.(\d{1,9})\.(\d{1,9})(?:-([0-9A-Za-z.-]+))?$/.exec(String(v || ''));
    return m && { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] || '' };
  };
  /** a is a later version than b (1.2.0-beta comes before 1.2.0). */
  const later = (a, b) => {
    for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i];
    if (!a.pre || !b.pre) return !a.pre && !!b.pre;
    return a.pre.localeCompare(b.pre, 'en', { numeric: true }) > 0;
  };
  // Rollout: the PC's place from 0 to 99, drawn again for each version, so the first 20% aren't always the same PCs.
  // The app sends a hash of its PC (X-Rago-Device), never the fingerprint used for the license.
  const rolloutSlot = (c, version) => {
    const device = (c.req.header('x-rago-device') || '').trim().slice(0, 128) || `ip:${ip(c)}`;
    return createHash('sha256').update(`rago-update|${version}|${device}`).digest().readUInt32BE(0) % 100;
  };
  api.get('/update/:target/:arch/:current', async (c) => {
    c.header('Cache-Control', 'no-store');
    if (!allow(`update:${ip(c)}`, 120, 60 * 60 * 1000)) return c.body(null, 204);
    const current = semver(c.req.param('current'));
    if (c.req.param('target') !== 'windows' || c.req.param('arch') !== 'x86_64' || !current || cfg.updatePaused) return c.body(null, 204);
    const next = await installer.latest();
    const version = semver(next.version);
    if (next.error || !version || !later(version, current) || rolloutSlot(c, next.version) >= cfg.updateRollout) return c.body(null, 204);
    return c.json({
      version: next.version,
      notes: cfg.updateNotes,
      ...(next.date ? { pub_date: next.date } : {}),
      url: `${cfg.publicUrl}/api/v1/update/file/${encodeURIComponent(next.version)}`,
      signature: next.signature,
    });
  });
  // The installer offered above, through a 5-minute signed link. Only that version: an older link stops working.
  api.get('/update/file/:version', async (c) => {
    c.header('Cache-Control', 'no-store');
    if (!allow(`update-file:${ip(c)}`, 20, 60 * 60 * 1000)) return fail(c, 'rate_limited');
    const next = await installer.latest();
    if (next.error || next.version !== c.req.param('version')) return c.json({ error: { code: 'not_found', message: 'This update is no longer offered.' } }, 404);
    const url = await installer.signedLink(next.path);
    if (!url) return c.json({ error: { code: 'unavailable', message: 'The update can\'t be downloaded right now. Try again later.' } }, 503);
    await audit(db, 'update_download', { detail: { version: next.version } });
    return c.redirect(url, 302);
  });
  // For the release guide: whether the app's update is ready (installer and .sig in the bucket), without anything secret.
  api.get('/update/status', async (c) => {
    if (!allow(`update-status:${ip(c)}`, 30, 60 * 60 * 1000)) return fail(c, 'rate_limited');
    const next = await installer.latest({ fresh: true });
    return c.json(next.error
      ? { ok: false, error: next.error, paused: cfg.updatePaused, rollout: cfg.updateRollout }
      : { ok: true, version: next.version, file: next.name, paused: cfg.updatePaused, rollout: cfg.updateRollout }, 200, { 'Cache-Control': 'no-store' });
  });

  // ---------- network tests (RAG-50) ----------
  // After each network test, the app sends its results (ping, jitter and losses to each server, no series). The server
  // adds where they come from (geo.js), then forgets the address. /admin/reseau sums them up.
  api.post('/network/report', async (c) => {
    if (!allow(`network:${ip(c)}`, 30, 60 * 60 * 1000)) return fail(c, 'rate_limited');
    const report = N.parseReport(await readJson(c), (c.req.header('x-rago-device') || '').trim().toLowerCase());
    if (!report) return fail(c, 'invalid_request');
    await geo.ready();
    await N.saveReport(db, report, geo.lookup(ip(c)));
    return c.body(null, 204);
  });

  app.route('/api/v1', api);

  // Optional: serve the marketing site from the same server (SITE_DIR), so /buy and the site share a domain.
  // Without it (site hosted elsewhere, e.g. Netlify), the bare domain sends visitors to the site.
  if (!cfg.siteDir && cfg.siteUrl !== cfg.publicUrl) app.get('/', (c) => c.redirect(`${cfg.siteUrl}/`, 302));
  if (cfg.siteDir) {
    const siteRoot = relative(process.cwd(), cfg.siteDir) || '.';
    app.use('/*', serveStatic({ root: siteRoot }));
  }

  app.notFound(async (c) => {
    // The app reads errors in the contract's shape, also for a wrong path or method.
    if (c.req.path.startsWith('/api/')) return c.json({ error: { code: 'invalid_request', message: `Unknown API route: ${c.req.method} ${c.req.path}` } }, 404);
    const user = await currentUser(c).catch(() => null);
    return c.html(V.messagePage(cfg, { user, overline: 'Error 404', title: 'Page not found.', text: "This page doesn't exist, or it moved.", action: user ? { href: '/account', label: 'Go to your account' } : null }), 404);
  });
  app.onError((err, c) => {
    log.error(err);
    if (c.req.path.startsWith('/api/')) return c.json({ error: { code: 'server_error', message: "Couldn't reach the license server. Check your connection and try again." } }, 500);
    return c.html(V.messagePage(cfg, { overline: 'Error', title: 'Something went wrong.', text: 'Try again in a moment. If it keeps happening, ask on Discord.', action: c.req.method === 'GET' ? { href: c.req.url, label: 'Try again' } : null }), 500);
  });

  return app;
}
