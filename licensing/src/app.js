import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';

import { DUMMY_HASH, maskLicenseKey, signValue, unsignValue, verifyPassword } from './crypto.js';
import { DeviceError, parseDevice, sameDevice } from './fingerprint.js';
import { signToken, verifyToken } from './tokens.js';
import { billingPortal, createCheckout, handleStripeEvent } from './billing.js';
import * as A from './affiliates.js';
import { createInstaller } from './installer.js';
import * as L from './licensing.js';
import * as V from './views.js';
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
};

function rateLimiter() {
  const hits = new Map();
  return (key, limit, windowMs) => {
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
}

/**
 * @param deps { cfg, db, keys, stripe, mailer, log }
 */
export function createApp({ cfg, db, keys, stripe, mailer, log = console, fetchImpl = fetch }) {
  const app = new Hono();
  const installer = createInstaller(cfg, { fetchImpl, log });
  const allow = rateLimiter();
  const publicDir = relative(process.cwd(), fileURLToPath(new URL('../public', import.meta.url))) || '.';
  const cookieBase = { httpOnly: true, secure: cfg.prod, sameSite: 'Lax', path: '/' };

  const ipOf = (c) => {
    if (cfg.trustProxy) {
      const xff = c.req.header('x-forwarded-for');
      if (xff) return xff.split(',')[0].trim();
    }
    return c.env?.incoming?.socket?.remoteAddress || 'unknown';
  };

  // Strict CSP on our own pages. The marketing site (SITE_DIR) uses inline styles and scripts,
  // so it gets the other security headers without a CSP.
  const OWN = /^\/(assets|download|buy|checkout|claim|signup|login|logout|forgot|reset|account|affiliate|webhooks|api|healthz)(\/|$)/;
  const strictHeaders = secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      formAction: ["'self'", 'https://checkout.stripe.com'],
      frameAncestors: ["'none'"],
    },
    crossOriginEmbedderPolicy: false,
    // Not no-referrer: with it, browsers send `Origin: null` on form posts and the check below fails.
    referrerPolicy: 'same-origin',
  });
  const siteHeaders = secureHeaders({ crossOriginEmbedderPolicy: false, referrerPolicy: 'strict-origin-when-cross-origin' });
  app.use('*', (c, next) => (OWN.test(c.req.path) || !cfg.siteDir ? strictHeaders(c, next) : siteHeaders(c, next)));

  // Same-origin check for browser form posts (the API and the webhook are exempt).
  app.use('*', async (c, next) => {
    const p = c.req.path;
    if (c.req.method === 'POST' && !p.startsWith('/api/') && !p.startsWith('/webhooks/')) {
      const origin = c.req.header('origin');
      const self = new URL(c.req.url).origin;
      if (origin && origin !== self && origin !== cfg.publicUrl) return c.text('Forbidden', 403);
    }
    await next();
  });

  app.use('/assets/*', serveStatic({ root: publicDir, rewriteRequestPath: (p) => p.replace(/^\/assets/, '') }));
  app.get('/healthz', (c) => c.json({ ok: true }));

  // ---------- helpers ----------
  const currentUser = async (c) => await L.userForWebSession(db, getCookie(c, 'rg_session'));
  const signIn = async (c, user) => setCookie(c, 'rg_session', await L.createWebSession(db, user.id), { ...cookieBase, maxAge: L.SESSION_TTL / 1000 });
  const claimCookie = (c) => unsignValue(getCookie(c, 'rg_claim'), cfg.sessionSecret);
  const setClaim = (c, licenseId) => setCookie(c, 'rg_claim', signValue(licenseId, cfg.sessionSecret), { ...cookieBase, maxAge: 7 * 86400 });
  const pendingClaim = async (c) => {
    const id = claimCookie(c);
    const lic = id && await L.getLicense(db, id);
    return lic && !lic.user_id ? lic : null;
  };

  /** Attaches a pending purchase to the user. Returns a notice code for the dashboard. */
  async function settleClaim(c, user) {
    const lic = await pendingClaim(c);
    deleteCookie(c, 'rg_claim', { path: '/' });
    if (!lic) return null;
    try {
      await L.claimLicense(db, lic.id, user.id);
      return 'claimed';
    } catch (err) {
      if (err.code === 'already_has_license') return 'duplicate';
      throw err;
    }
  }

  const requireUser = async (c, next) => {
    const user = await currentUser(c);
    if (!user) return c.redirect('/login', 303);
    c.set('user', user);
    await next();
  };

  const ip = (c) => ipOf(c);
  // Where to go after signing in. Only our own pages.
  const NEXT = new Set(['/affiliate']);
  const nextPath = (v) => (NEXT.has(String(v || '')) ? String(v) : null);

  const settleAffiliate = (userId) => A.settleAffiliate(db, cfg, stripe, log, userId);
  // An affiliate's link (/buy?ref=CODE) pre-fills the code field the buyer sees after paying.
  const refCode = (c) => A.normalizeCode(getCookie(c, 'rg_ref'));

  async function sendClaimEmail(license, claimToken) {
    if (!claimToken) return;
    try {
      await mailer.purchase(license.email, `${cfg.publicUrl}/claim/${claimToken}`);
    } catch (err) {
      log.error('[mail] purchase email failed', err);
    }
  }

  // ---------- checkout ----------
  app.get('/buy', async (c) => {
    const user = await currentUser(c);
    if (user && (await L.licenseForUser(db, user.id))?.status === 'active') return c.redirect('/account?n=owned', 303);
    if (!stripe || !(cfg.subscriptions || cfg.stripePriceId)) {
      return c.html(V.messagePage(cfg, { title: 'Checkout is not open yet.', text: 'Payments are being set up. Come back soon.' }), 503);
    }
    const ref = A.normalizeCode(c.req.query('ref'));
    if (ref) setCookie(c, 'rg_ref', ref, { ...cookieBase, maxAge: 30 * 86400 });
    // A returning subscriber pays with their existing Stripe customer, so invoices stay together.
    const previous = user && await db.get('SELECT stripe_customer_id FROM licenses WHERE user_id = ? AND stripe_customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 1', [user.id]);
    const interval = c.req.query('interval') === 'year' ? 'year' : c.req.query('interval') === 'month' ? 'month' : undefined;
    const session = await createCheckout(stripe, cfg, user, { interval, customerId: previous?.stripe_customer_id });
    return c.redirect(session.url, 303);
  });

  app.get('/checkout/success', async (c) => {
    const id = c.req.query('session_id');
    if (!stripe || !id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return c.redirect('/login', 303);
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(id, { expand: ['subscription'] });
    } catch {
      return c.html(V.messagePage(cfg, { title: "We couldn't find that payment.", text: 'If you were charged, sign in or contact support on Discord with your receipt.', action: { href: '/login', label: 'Sign in' } }), 404);
    }
    // The webhook may not have arrived yet: fulfilling here too is safe (idempotent).
    const out = await L.fulfillCheckoutSession(db, session);
    if (!out.license) {
      return c.html(V.messagePage(cfg, { title: 'Payment processing.', text: "Your bank is still confirming the payment. We'll email you a link to create your account as soon as it's done.", step: 0 }));
    }
    if (out.created) await sendClaimEmail(out.license, out.claimToken);

    const user = await currentUser(c);
    if (out.license.user_id) return c.redirect(user ? '/account?n=claimed' : '/login', 303);
    setClaim(c, out.license.id);
    if (user) {
      const n = await settleClaim(c, user);
      return c.redirect(`/account?n=${n || 'claimed'}`, 303);
    }
    if (await L.findUserByEmail(db, out.license.email)) {
      return c.html(V.loginPage(cfg, { email: out.license.email, purchased: true }));
    }
    return c.html(V.signupPage(cfg, { purchased: true, claimEmail: out.license.email, code: refCode(c) }));
  });

  // Link from the purchase email, for buyers who closed the tab before creating their account.
  app.get('/claim/:token', async (c) => {
    const lic = await L.licenseByClaimToken(db, c.req.param('token'));
    if (!lic) {
      return c.html(V.messagePage(cfg, { title: 'This link was already used.', text: 'Your license is already on an account. Sign in to see it.', action: { href: '/login', label: 'Sign in' } }), 410);
    }
    setClaim(c, lic.id);
    const user = await currentUser(c);
    if (user) return c.redirect(`/account?n=${await settleClaim(c, user) || 'claimed'}`, 303);
    if (await L.findUserByEmail(db, lic.email)) return c.html(V.loginPage(cfg, { email: lic.email, purchased: true }));
    return c.html(V.signupPage(cfg, { purchased: true, claimEmail: lic.email, code: refCode(c) }));
  });

  // ---------- accounts ----------
  app.get('/signup', async (c) => {
    const next = nextPath(c.req.query('next'));
    if (await currentUser(c)) return c.redirect(next || '/account', 303);
    const lic = await pendingClaim(c);
    return c.html(V.signupPage(cfg, { purchased: !!lic, claimEmail: lic?.email, next, code: refCode(c) }));
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
    if (await L.findUserByEmail(db, email)) return fail('An account with this email already exists. Sign in instead.');
    let affiliate = null;
    if (code) {
      try {
        affiliate = await A.checkCode(db, code, email);
        if (pending.email !== email) await A.checkCode(db, code, pending.email);
      } catch (err) {
        if (err.code === 'self_referral') return fail("You can't use your own referral code.");
        return fail("That referral code doesn't exist. Check it, or leave the field empty.");
      }
    }
    const user = await L.createUser(db, email, password);
    await signIn(c, user);
    const n = await settleClaim(c, user);
    deleteCookie(c, 'rg_ref', { path: '/' });
    if (affiliate && n === 'claimed') {
      const license = await L.licenseForUser(db, user.id);
      await A.recordReferral(db, affiliate, user.id, license).catch((err) => {
        if (!(err instanceof L.LicenseError)) throw err; // self-referral caught late: the account works, the code doesn't count
      });
    }
    if (next && !n) return c.redirect(next, 303);
    return c.redirect(`/account${n ? `?n=${n}` : ''}`, 303);
  });

  app.get('/login', async (c) => {
    if (await currentUser(c)) return c.redirect('/account', 303);
    const n = c.req.query('n');
    return c.html(V.loginPage(cfg, { purchased: !!(await pendingClaim(c)), next: nextPath(c.req.query('next')), notice: n === 'reset' ? 'Password saved. Sign in with your new password.' : null }));
  });

  app.post('/login', async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const purchased = !!(await pendingClaim(c));
    const next = nextPath(body.next);
    if (!allow(`login:${ip(c)}:${email}`, 10, 15 * 60 * 1000) || !allow(`login:${ip(c)}`, 50, 15 * 60 * 1000)) {
      return c.html(V.loginPage(cfg, { email, purchased, next, error: API_ERRORS.rate_limited[1] }), 429);
    }
    const user = await L.findUserByEmail(db, email);
    const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) return c.html(V.loginPage(cfg, { email, purchased, next, error: API_ERRORS.invalid_credentials[1] }), 401);
    await signIn(c, user);
    const n = await settleClaim(c, user);
    if (next && !n) return c.redirect(next, 303);
    return c.redirect(`/account${n ? `?n=${n}` : ''}`, 303);
  });

  app.post('/logout', async (c) => {
    await L.deleteWebSession(db, getCookie(c, 'rg_session'));
    deleteCookie(c, 'rg_session', { path: '/' });
    return c.redirect('/login', 303);
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
    return c.html(V.forgotPage(cfg, { sent: true }));
  });

  app.get('/reset/:token', (c) => c.html(V.resetPage(cfg, { token: c.req.param('token') })));
  app.post('/reset/:token', async (c) => {
    const token = c.req.param('token');
    const password = String((await c.req.parseBody()).password || '');
    if (password.length < 8 || password.length > 200) return c.html(V.resetPage(cfg, { token, error: 'Use at least 8 characters for your password.' }), 400);
    const userId = await L.consumePasswordReset(db, token);
    if (!userId) return c.html(V.messagePage(cfg, { title: 'This link expired.', text: 'Reset links work once, for 1 hour. Ask for a new one.', action: { href: '/forgot', label: 'Send a new link' } }), 410);
    await L.setPassword(db, userId, password);
    return c.redirect('/login?n=reset', 303);
  });

  // ---------- dashboard ----------
  const NOTICES = {
    claimed: ['notice', 'License added to your account. Download Rago Optimizer below.'],
    owned: ['notice', 'You already have Rago Optimizer Premium. No need to buy it twice.'],
    reset: ['notice', 'Device freed. Sign in to Rago Optimizer on your new PC to activate it.'],
    duplicate: ['error', 'This account already has a license, so the new purchase was not added. Contact support on Discord for a refund of the extra payment.'],
    nofile: ['error', "The installer isn't available yet. Try again in a moment."],
    nobilling: ['error', "Billing isn't available right now. Try again in a moment, or contact support on Discord."],
  };

  function resetWindow(license, device) {
    if (!device || !cfg.selfServiceResetDays || license.status !== 'active') return { canReset: false, nextResetAt: null };
    const next = (license.last_reset_at || 0) + cfg.selfServiceResetDays * DAY;
    return { canReset: next <= Date.now(), nextResetAt: next > Date.now() ? next : null };
  }

  app.get('/account', requireUser, async (c) => {
    const user = c.get('user');
    await settleAffiliate(user.id);
    const license = await L.licenseForUser(db, user.id);
    const device = license && await L.getDevice(db, license.id);
    const [kind, text] = NOTICES[c.req.query('n')] || [];
    return c.html(V.dashboardPage(cfg, {
      user, license, device,
      notice: kind === 'notice' ? text : null, error: kind === 'error' ? text : null,
      ...(license ? resetWindow(license, device) : {}),
      affiliate: await A.affiliateSummary(db, cfg, user.id),
    }));
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

  // ---------- affiliate program ----------
  app.get('/affiliate', async (c) => {
    const user = await currentUser(c);
    if (user) await settleAffiliate(user.id);
    const summary = user && await A.affiliateSummary(db, cfg, user.id);
    return c.html(V.affiliatePage(cfg, { user, summary, joined: c.req.query('n') === 'joined' }));
  });

  app.post('/affiliate/join', requireUser, async (c) => {
    await A.joinAffiliate(db, c.get('user').id);
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
    if (!allow(`download:${ip(c)}`, 30, 60 * 60 * 1000)) return c.html(V.messagePage(cfg, { title: 'Too many downloads.', text: API_ERRORS.rate_limited[1] }), 429);
    return (await sendInstaller(c, null)) || c.html(V.messagePage(cfg, { title: "The download isn't available yet.", text: 'Try again in a moment. If it keeps happening, contact support on Discord.' }), 503);
  });

  // For the launch guide: says whether the installer is found, without exposing anything secret.
  app.get('/download/status', async (c) => {
    const out = await installer.resolve();
    return c.json(out.error ? { ok: false, error: out.error } : { ok: true, source: out.source, file: out.file || null }, out.error ? 503 : 200);
  });

  app.post('/account/reset-device', requireUser, async (c) => {
    const license = await L.licenseForUser(db, c.get('user').id);
    const device = license && await L.getDevice(db, license.id);
    if (!license || !resetWindow(license, device).canReset) return c.redirect('/account', 303);
    await L.resetDevice(db, license.id, 'self');
    return c.redirect('/account?n=reset', 303);
  });

  // ---------- Stripe webhook ----------
  app.post('/webhooks/stripe', async (c) => {
    if (!stripe) return c.text('Stripe not configured', 503);
    const raw = Buffer.from(await c.req.arrayBuffer());
    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, c.req.header('stripe-signature') || '', cfg.stripeWebhookSecret);
    } catch {
      return c.text('Bad signature', 400);
    }
    const label = await handleStripeEvent(db, event, { stripe, onLicense: sendClaimEmail, log });
    log.info?.(`[stripe] ${event.type} ${event.id} -> ${label}`);
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
      interval: license.plan, // month | year | lifetime
      renews_at: license.plan !== 'lifetime' && license.current_period_end && !license.cancel_at_period_end ? new Date(Number(license.current_period_end)).toISOString() : null,
      ends_at: license.plan !== 'lifetime' && license.current_period_end && license.cancel_at_period_end ? new Date(Number(license.current_period_end)).toISOString() : null,
    },
    device: device ? { name: device.name, activated_at: new Date(device.bound_at).toISOString() } : null,
  });
  const tokenReply = (user, license, device) => {
    const { token, exp } = licenseToken(user, license, device);
    return { status: 'active', license_token: token, expires_at: new Date(exp * 1000).toISOString(), account: { email: user.email }, license: licenseInfo(license, device) };
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
    if (!allow(`api-login:${ip(c)}:${email}`, 10, 15 * 60 * 1000) || !allow(`api-login:${ip(c)}`, 50, 15 * 60 * 1000)) return fail(c, 'rate_limited');

    const user = await L.findUserByEmail(db, email);
    const ok = await verifyPassword(body.password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) return fail(c, 'invalid_credentials');
    await settleAffiliate(user.id);
    const license = await L.licenseForUser(db, user.id);
    if (!license) return fail(c, 'no_license', { buy_url: buyUrl() });
    let state;
    try { ({ state } = await L.deviceState(db, license, device)); } catch (err) {
      if (err.code === 'bound_to_other_device') await audit(db, 'device.blocked', { licenseId: license.id, userId: user.id, detail: { name: device.name, ip: ip(c) } });
      return failLicense(c, license, err.code);
    }
    if (state === 'here') {
      const out = await L.activate(db, license.id, device, ip(c));
      return c.json(tokenReply(user, out.license, out.device));
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
    const license = user && await L.getLicense(db, claims.lic);
    if (!license || license.user_id !== user.id) return fail(c, 'invalid_token');
    try {
      const out = await L.activate(db, license.id, device, ip(c));
      return c.json(tokenReply(user, out.license, out.device));
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
    const license = await L.getLicense(db, claims.lic);
    const user = license && await L.getUser(db, claims.sub);
    if (!license || !user || license.user_id !== user.id) return fail(c, 'invalid_token');
    if (license.status !== 'active') return failLicense(c, license, 'revoked');
    const bound = await L.getDevice(db, license.id);
    if (bound && !sameDevice(bound, device.fp)) return fail(c, 'bound_to_other_device');
    // Device freed or re-bound since this token was issued: the app must sign in again.
    if (!bound || bound.id !== claims.did || claims.tv !== license.token_version) return fail(c, 'invalid_token');
    const out = await L.activate(db, license.id, device, ip(c));
    return c.json(tokenReply(user, out.license, out.device));
  });

  app.route('/api/v1', api);

  // Optional: serve the marketing site from the same server (SITE_DIR), so /buy and the site share a domain.
  // Without it (site hosted elsewhere, e.g. Netlify), the bare domain sends visitors to the site.
  if (!cfg.siteDir && cfg.siteUrl !== cfg.publicUrl) app.get('/', (c) => c.redirect(`${cfg.siteUrl}/`, 302));
  if (cfg.siteDir) {
    const siteRoot = relative(process.cwd(), cfg.siteDir) || '.';
    app.use('/*', serveStatic({ root: siteRoot }));
  }

  app.notFound((c) => c.html(V.messagePage(cfg, { title: 'Page not found.', text: "This page doesn't exist.", action: { href: '/account', label: 'Go to your account' } }), 404));
  app.onError((err, c) => {
    log.error(err);
    if (c.req.path.startsWith('/api/')) return c.json({ error: { code: 'server_error', message: "Couldn't reach the license server. Check your connection and try again." } }, 500);
    return c.html(V.messagePage(cfg, { title: 'Something went wrong.', text: 'Try again in a moment. If it keeps happening, contact support on Discord.' }), 500);
  });

  return app;
}
