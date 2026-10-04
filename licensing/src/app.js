import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';

import { DUMMY_HASH, maskLicenseKey, signValue, unsignValue, verifyPassword } from './crypto.js';
import { DeviceError, parseDevice, sameDevice } from './fingerprint.js';
import { signToken, verifyToken } from './tokens.js';
import { createCheckout, handleStripeEvent } from './billing.js';
import * as L from './licensing.js';
import * as V from './views.js';
import { audit } from './db.js';

const DAY = 86400000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Messages from /brand/voice-en.md. The app may show `message` as is.
const API_ERRORS = {
  invalid_request: [400, 'Something in the request is missing or malformed. Update Rago Hub and try again.'],
  invalid_credentials: [401, "That email and password don't match. Try again or reset your password."],
  invalid_token: [401, 'Your session expired. Sign in again.'],
  no_license: [403, "This account doesn't have Rago Hub Premium yet. Get it on the website, then sign in again."],
  bound_to_other_device: [403, 'This license is already active on another PC. Rago Hub works on one device per license. Contact support on Discord if you changed PCs.'],
  revoked: [403, 'This license is no longer active. Contact support on Discord if you think that\'s a mistake.'],
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
export function createApp({ cfg, db, keys, stripe, mailer, log = console }) {
  const app = new Hono();
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
  const OWN = /^\/(assets|buy|checkout|claim|signup|login|logout|forgot|reset|account|webhooks|api|healthz)(\/|$)/;
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
  const currentUser = (c) => L.userForWebSession(db, getCookie(c, 'rg_session'));
  const signIn = (c, user) => setCookie(c, 'rg_session', L.createWebSession(db, user.id), { ...cookieBase, maxAge: L.SESSION_TTL / 1000 });
  const claimCookie = (c) => unsignValue(getCookie(c, 'rg_claim'), cfg.sessionSecret);
  const setClaim = (c, licenseId) => setCookie(c, 'rg_claim', signValue(licenseId, cfg.sessionSecret), { ...cookieBase, maxAge: 7 * 86400 });
  const pendingClaim = (c) => {
    const id = claimCookie(c);
    const lic = id && L.getLicense(db, id);
    return lic && !lic.user_id ? lic : null;
  };

  /** Attaches a pending purchase to the user. Returns a notice code for the dashboard. */
  function settleClaim(c, user) {
    const lic = pendingClaim(c);
    deleteCookie(c, 'rg_claim', { path: '/' });
    if (!lic) return null;
    try {
      L.claimLicense(db, lic.id, user.id);
      return 'claimed';
    } catch (err) {
      if (err.code === 'already_has_license') return 'duplicate';
      throw err;
    }
  }

  const requireUser = async (c, next) => {
    const user = currentUser(c);
    if (!user) return c.redirect('/login', 303);
    c.set('user', user);
    await next();
  };

  const ip = (c) => ipOf(c);

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
    const user = currentUser(c);
    if (user && L.licenseForUser(db, user.id)?.status === 'active') return c.redirect('/account?n=owned', 303);
    if (!stripe || !cfg.stripePriceId) {
      return c.html(V.messagePage(cfg, { title: 'Checkout is not open yet.', text: 'Payments are being set up. Come back soon.' }), 503);
    }
    const session = await createCheckout(stripe, cfg, user);
    return c.redirect(session.url, 303);
  });

  app.get('/checkout/success', async (c) => {
    const id = c.req.query('session_id');
    if (!stripe || !id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return c.redirect('/login', 303);
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(id);
    } catch {
      return c.html(V.messagePage(cfg, { title: "We couldn't find that payment.", text: 'If you were charged, sign in or contact support on Discord with your receipt.', action: { href: '/login', label: 'Sign in' } }), 404);
    }
    // The webhook may not have arrived yet: fulfilling here too is safe (idempotent).
    const out = L.fulfillCheckoutSession(db, session);
    if (!out.license) {
      return c.html(V.messagePage(cfg, { title: 'Payment processing.', text: "Your bank is still confirming the payment. We'll email you a link to create your account as soon as it's done.", step: 0 }));
    }
    if (out.created) await sendClaimEmail(out.license, out.claimToken);

    const user = currentUser(c);
    if (out.license.user_id) return c.redirect(user ? '/account?n=claimed' : '/login', 303);
    setClaim(c, out.license.id);
    if (user) {
      const n = settleClaim(c, user);
      return c.redirect(`/account?n=${n || 'claimed'}`, 303);
    }
    if (L.findUserByEmail(db, out.license.email)) {
      return c.html(V.loginPage(cfg, { email: out.license.email, purchased: true }));
    }
    return c.html(V.signupPage(cfg, { purchased: true, claimEmail: out.license.email }));
  });

  // Link from the purchase email, for buyers who closed the tab before creating their account.
  app.get('/claim/:token', (c) => {
    const lic = L.licenseByClaimToken(db, c.req.param('token'));
    if (!lic) {
      return c.html(V.messagePage(cfg, { title: 'This link was already used.', text: 'Your license is already on an account. Sign in to see it.', action: { href: '/login', label: 'Sign in' } }), 410);
    }
    setClaim(c, lic.id);
    const user = currentUser(c);
    if (user) return c.redirect(`/account?n=${settleClaim(c, user) || 'claimed'}`, 303);
    if (L.findUserByEmail(db, lic.email)) return c.html(V.loginPage(cfg, { email: lic.email, purchased: true }));
    return c.html(V.signupPage(cfg, { purchased: true, claimEmail: lic.email }));
  });

  // ---------- accounts ----------
  app.get('/signup', (c) => {
    if (currentUser(c)) return c.redirect('/account', 303);
    const lic = pendingClaim(c);
    return c.html(V.signupPage(cfg, { purchased: !!lic, claimEmail: lic?.email }));
  });

  app.post('/signup', async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const purchased = !!pendingClaim(c);
    const fail = (error) => c.html(V.signupPage(cfg, { email, error, purchased }), 400);
    if (!allow(`signup:${ip(c)}`, 10, 60 * 60 * 1000)) return c.html(V.signupPage(cfg, { email, error: API_ERRORS.rate_limited[1], purchased }), 429);
    if (!EMAIL.test(email) || email.length > 254) return fail('Enter a valid email address.');
    if (password.length < 8 || password.length > 200) return fail('Use at least 8 characters for your password.');
    if (L.findUserByEmail(db, email)) return fail('An account with this email already exists. Sign in instead.');
    const user = await L.createUser(db, email, password);
    signIn(c, user);
    const n = settleClaim(c, user);
    return c.redirect(`/account${n ? `?n=${n}` : ''}`, 303);
  });

  app.get('/login', (c) => {
    if (currentUser(c)) return c.redirect('/account', 303);
    const n = c.req.query('n');
    return c.html(V.loginPage(cfg, { purchased: !!pendingClaim(c), notice: n === 'reset' ? 'Password saved. Sign in with your new password.' : null }));
  });

  app.post('/login', async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const purchased = !!pendingClaim(c);
    if (!allow(`login:${ip(c)}:${email}`, 10, 15 * 60 * 1000) || !allow(`login:${ip(c)}`, 50, 15 * 60 * 1000)) {
      return c.html(V.loginPage(cfg, { email, purchased, error: API_ERRORS.rate_limited[1] }), 429);
    }
    const user = L.findUserByEmail(db, email);
    const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) return c.html(V.loginPage(cfg, { email, purchased, error: API_ERRORS.invalid_credentials[1] }), 401);
    signIn(c, user);
    const n = settleClaim(c, user);
    return c.redirect(`/account${n ? `?n=${n}` : ''}`, 303);
  });

  app.post('/logout', (c) => {
    L.deleteWebSession(db, getCookie(c, 'rg_session'));
    deleteCookie(c, 'rg_session', { path: '/' });
    return c.redirect('/login', 303);
  });

  app.get('/forgot', (c) => c.html(V.forgotPage(cfg)));
  app.post('/forgot', async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();
    if (allow(`forgot:${ip(c)}`, 5, 60 * 60 * 1000) && allow(`forgot:${email}`, 3, 60 * 60 * 1000)) {
      const user = L.findUserByEmail(db, email);
      if (user) {
        const token = L.createPasswordReset(db, user.id);
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
    const userId = L.consumePasswordReset(db, token);
    if (!userId) return c.html(V.messagePage(cfg, { title: 'This link expired.', text: 'Reset links work once, for 1 hour. Ask for a new one.', action: { href: '/forgot', label: 'Send a new link' } }), 410);
    await L.setPassword(db, userId, password);
    return c.redirect('/login?n=reset', 303);
  });

  // ---------- dashboard ----------
  const NOTICES = {
    claimed: ['notice', 'License added to your account. Download Rago Hub below.'],
    owned: ['notice', 'You already have Rago Hub Premium. No need to buy it twice.'],
    reset: ['notice', 'Device freed. Sign in to Rago Hub on your new PC to activate it.'],
    duplicate: ['error', 'This account already has a license, so the new purchase was not added. Contact support on Discord for a refund of the extra payment.'],
    nofile: ['error', "The installer isn't available yet. Try again in a moment."],
  };

  function resetWindow(license, device) {
    if (!device || !cfg.selfServiceResetDays || license.status !== 'active') return { canReset: false, nextResetAt: null };
    const next = (license.last_reset_at || 0) + cfg.selfServiceResetDays * DAY;
    return { canReset: next <= Date.now(), nextResetAt: next > Date.now() ? next : null };
  }

  app.get('/account', requireUser, (c) => {
    const user = c.get('user');
    const license = L.licenseForUser(db, user.id);
    const device = license && L.getDevice(db, license.id);
    const [kind, text] = NOTICES[c.req.query('n')] || [];
    return c.html(V.dashboardPage(cfg, {
      user, license, device,
      notice: kind === 'notice' ? text : null, error: kind === 'error' ? text : null,
      ...(license ? resetWindow(license, device) : {}),
    }));
  });

  app.get('/account/download', requireUser, (c) => {
    const license = L.licenseForUser(db, c.get('user').id);
    if (license?.status !== 'active') return c.redirect('/account', 303);
    let size;
    try { size = statSync(cfg.installerPath).size; } catch { return c.redirect('/account?n=nofile', 303); }
    audit(db, 'download', { licenseId: license.id, userId: license.user_id });
    return new Response(Readable.toWeb(createReadStream(cfg.installerPath)), {
      headers: {
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Length': String(size),
        'Content-Disposition': `attachment; filename="${cfg.installerFileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  });

  app.post('/account/reset-device', requireUser, (c) => {
    const license = L.licenseForUser(db, c.get('user').id);
    const device = license && L.getDevice(db, license.id);
    if (!license || !resetWindow(license, device).canReset) return c.redirect('/account', 303);
    L.resetDevice(db, license.id, 'self');
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
    const label = await handleStripeEvent(db, event, { onLicense: sendClaimEmail });
    log.info?.(`[stripe] ${event.type} ${event.id} -> ${label}`);
    return c.json({ received: true });
  });

  // ---------- App API (Rago Hub) ----------
  const api = new Hono();
  const fail = (c, code, extra) => {
    const [status, message] = API_ERRORS[code];
    return c.json({ error: { code, message, ...extra } }, status);
  };
  async function readJson(c) {
    try { return await c.req.json(); } catch { return null; }
  }
  const now = () => Math.floor(Date.now() / 1000);

  function licenseToken(user, license, device) {
    const iat = now();
    return signToken({
      typ: 'license', iss: cfg.publicUrl, sub: user.id, email: user.email, plan: 'premium',
      lic: license.id, did: device.id, tv: license.token_version,
      fp: { machine_guid: device.machine_guid, smbios_uuid: device.smbios_uuid, board_serial: device.board_serial },
      iat, exp: iat + cfg.licenseTokenDays * 86400,
    }, keys);
  }
  const licenseInfo = (license, device) => ({
    key_hint: maskLicenseKey(license.key), status: license.status, plan: 'premium',
    device: device ? { name: device.name, activated_at: new Date(device.bound_at).toISOString() } : null,
  });
  const tokenReply = (user, license, device) => {
    const token = licenseToken(user, license, device);
    return { status: 'active', license_token: token, expires_at: new Date((now() + cfg.licenseTokenDays * 86400) * 1000).toISOString(), account: { email: user.email }, license: licenseInfo(license, device) };
  };

  api.get('/public-key', (c) => c.json({ alg: 'EdDSA', crv: 'Ed25519', kid: keys.kid, public_key_pem: keys.publicPem }));

  api.post('/auth/login', async (c) => {
    const body = await readJson(c);
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') return fail(c, 'invalid_request');
    let device;
    try { device = parseDevice(body.device); } catch (e) { return fail(c, 'invalid_request', { detail: e instanceof DeviceError ? e.message : undefined }); }
    const email = body.email.trim().toLowerCase();
    if (!allow(`api-login:${ip(c)}:${email}`, 10, 15 * 60 * 1000) || !allow(`api-login:${ip(c)}`, 50, 15 * 60 * 1000)) return fail(c, 'rate_limited');

    const user = L.findUserByEmail(db, email);
    const ok = await verifyPassword(body.password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) return fail(c, 'invalid_credentials');
    const license = L.licenseForUser(db, user.id);
    if (!license) return fail(c, 'no_license', { buy_url: `${cfg.publicUrl}/buy` });
    let state;
    try { ({ state } = L.deviceState(db, license, device)); } catch (err) {
      if (err.code === 'bound_to_other_device') audit(db, 'device.blocked', { licenseId: license.id, userId: user.id, detail: { name: device.name, ip: ip(c) } });
      return fail(c, err.code);
    }
    if (state === 'here') {
      const out = L.activate(db, license.id, device, ip(c));
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
    const user = L.getUser(db, claims.sub);
    const license = user && L.getLicense(db, claims.lic);
    if (!license || license.user_id !== user.id) return fail(c, 'invalid_token');
    try {
      const out = L.activate(db, license.id, device, ip(c));
      return c.json(tokenReply(user, out.license, out.device));
    } catch (err) {
      if (err instanceof L.LicenseError) return fail(c, err.code);
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
    const license = L.getLicense(db, claims.lic);
    const user = license && L.getUser(db, claims.sub);
    if (!license || !user || license.user_id !== user.id) return fail(c, 'invalid_token');
    if (license.status !== 'active') return fail(c, 'revoked');
    const bound = L.getDevice(db, license.id);
    if (bound && !sameDevice(bound, device.fp)) return fail(c, 'bound_to_other_device');
    // Device freed or re-bound since this token was issued: the app must sign in again.
    if (!bound || bound.id !== claims.did || claims.tv !== license.token_version) return fail(c, 'invalid_token');
    const out = L.activate(db, license.id, device, ip(c));
    return c.json(tokenReply(user, out.license, out.device));
  });

  app.route('/api/v1', api);

  // Optional: serve the marketing site from the same server (SITE_DIR), so /buy and the site share a domain.
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
