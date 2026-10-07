import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPublicKey } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Stripe from 'stripe';

import { loadConfig } from '../src/config.js';
import { applySchema, ensureKeys, openDb, openMemoryDb } from '../src/db.js';
import pg from 'pg';
import { loadKeys, verifyToken } from '../src/tokens.js';
import { createApp } from '../src/app.js';
import * as L from '../src/licensing.js';

const WHSEC = 'whsec_test_secret';
const installer = join(mkdtempSync(join(tmpdir(), 'rago-')), 'RagoHub-Setup.exe');
writeFileSync(installer, 'MZ fake installer');

// Runs on in-memory Postgres (PGlite) by default; set TEST_DATABASE_URL to run on a real Postgres.
const opened = [];
async function testDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return openMemoryDb();
  // Every test starts by wiping the database (DROP SCHEMA public CASCADE). Never on a real one.
  const { hostname, pathname } = new URL(url);
  if (!['localhost', '127.0.0.1', '::1', '[::1]', 'postgres'].includes(hostname) && !/test/i.test(pathname)) {
    throw new Error(`TEST_DATABASE_URL must be a throwaway database (localhost, or a database name containing "test"): the tests erase it. Refused: ${hostname}${pathname}`);
  }
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await admin.end();
  for (const d of opened.splice(0)) await d.close();
  const db = await openDb(url);
  opened.push(db);
  return db;
}
test.after(async () => { for (const d of opened) await d.close(); });

async function setup(env = {}, extra = {}) {
  const cfg = loadConfig({ PUBLIC_URL: 'http://localhost', STRIPE_PRICE_ID: 'price_123', STRIPE_WEBHOOK_SECRET: WHSEC, INSTALLER_PATH: installer, ...env });
  const db = await testDb();
  await ensureKeys(db, cfg);
  const keys = loadKeys(cfg.signingKeyPem);
  const stripe = new Stripe('sk_test_fake');
  const sessions = {};
  stripe.checkout.sessions.retrieve = async (id) => { if (!sessions[id]) throw new Error('No such session'); return sessions[id]; };
  const created = [];
  stripe.checkout.sessions.create = async (params) => { created.push(params); return { id: 'cs_new', url: 'https://checkout.stripe.com/c/pay/cs_new', params }; };
  // Subscriptions live here; tests change them and send the matching event.
  const subs = {};
  const stripeCalls = [];
  stripe.subscriptions.retrieve = async (id) => { if (!subs[id]) throw new Error('No such subscription'); return subs[id]; };
  stripe.subscriptions.cancel = async (id) => { stripeCalls.push(['cancel', id]); subs[id] = { ...subs[id], status: 'canceled' }; return subs[id]; };
  stripe.subscriptions.update = async (id, p) => {
    stripeCalls.push(['update', id, p]);
    subs[id] = { ...subs[id], ...p };
    // Like Stripe: a trial end moves the period end there, no payment until then.
    if (p.trial_end) subs[id] = { ...subs[id], status: 'trialing', items: { data: [{ ...subs[id].items.data[0], current_period_end: p.trial_end }] } };
    return subs[id];
  };
  // Coupons and promotion codes (affiliate codes, RAGO15).
  const coupons = {};
  const promos = [];
  stripe.coupons.retrieve = async (id) => {
    if (coupons[id]) return coupons[id];
    throw Object.assign(new Error(`No such coupon: '${id}'`), { statusCode: 404, code: 'resource_missing' });
  };
  stripe.coupons.create = async (p) => { stripeCalls.push(['coupon', p]); return (coupons[p.id] = { object: 'coupon', ...p }); };
  stripe.promotionCodes.create = async (p) => {
    if (promos.some((x) => x.code.toUpperCase() === p.code.toUpperCase())) throw new Error('An active promotion code with this code already exists.');
    const promo = { id: `promo_${promos.length + 1}`, object: 'promotion_code', active: true, ...p };
    promos.push(promo);
    return promo;
  };
  stripe.promotionCodes.update = async (id, p) => { stripeCalls.push(['promo', id, p]); const x = promos.find((q) => q.id === id); Object.assign(x, p); return x; };
  stripe.promotionCodes.list = async ({ code }) => ({ data: promos.filter((x) => x.active && x.code.toUpperCase() === String(code).toUpperCase()) });
  stripe.billingPortal.sessions.create = async (p) => { stripeCalls.push(['portal', p.customer]); return { url: 'https://billing.stripe.com/p/session/x' }; };
  const mails = [];
  const mailer = { purchase: async (to, url) => mails.push({ to, url }), passwordReset: async (to, url) => mails.push({ to, url }) };
  const app = createApp({ cfg, db, keys, stripe, mailer, log: { info() {}, error: console.error }, ...extra });

  // Minimal browser: keeps cookies, sends same-origin form posts.
  const jar = new Map();
  async function browse(path, { form, method } = {}) {
    const headers = { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    let body;
    if (form) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      headers.origin = 'http://localhost';
      body = new URLSearchParams(form).toString();
    }
    const res = await app.request(path, { method: method || (form ? 'POST' : 'GET'), headers, body });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      if (/Max-Age=0/i.test(c) || v === '') jar.delete(k); else jar.set(k, v);
    }
    return res;
  }
  const api = (path, json, headers = {}) => app.request(`/api/v1${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(json),
  });
  async function webhook(type, object, id = `evt_${Math.random()}`) {
    const payload = JSON.stringify({ id, object: 'event', type, data: { object } });
    const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC });
    return app.request('/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': sig, 'content-type': 'application/json' }, body: payload });
  }
  const paidSession = (id, email, extra = {}) => (sessions[id] = {
    id, object: 'checkout.session', payment_status: 'paid', customer_details: { email }, payment_intent: `pi_${id}`,
    customer: `cus_${id}`, amount_total: 1499, currency: 'eur', ...extra,
    metadata: { product: 'rago-hub-premium', ...extra.metadata },
  });
  const DAYS = 86400;
  const subscription = (id, interval, { status = 'active', periodDays = interval === 'year' ? 365 : 30, ...rest } = {}) => (subs[id] = {
    id, object: 'subscription', status, cancel_at_period_end: false,
    items: { data: [{ price: { id: `price_${interval}`, recurring: { interval } }, current_period_end: Math.floor(Date.now() / 1000) + periodDays * DAYS }] }, ...rest,
  });
  /** A paid subscription checkout, returned expanded like the success page asks for. */
  const paidSubscription = (id, email, interval = 'month', extra = {}) => {
    const sub = subscription(`sub_${id}`, interval);
    return paidSession(id, email, { mode: 'subscription', payment_intent: null, subscription: sub, metadata: { interval }, ...extra });
  };
  return { cfg, db, keys, app, browse, api, webhook, paidSession, paidSubscription, subscription, subs, stripeCalls, created, mails, jar, sessions, promos, coupons, stripe };
}

const h = (name, v) => createHash('sha256').update(`rago-fp-v1|${name}|${v}`).digest('hex');
const device = (guid, uuid = 'UUID-A', board = 'BOARD-A', name = 'GAMING-PC') => ({
  name, os: 'Windows 11 Pro 23H2', app_version: '1.0.0',
  fingerprint: { v: 1, machine_guid: h('machine_guid', guid), smbios_uuid: uuid && h('smbios_uuid', uuid), board_serial: board && h('board_serial', board) },
});

test('purchase -> webhook -> success page -> create account -> dashboard -> download', async () => {
  const t = await setup();
  const s = t.paidSession('cs_test_1', 'Player@Example.com');
  const wh = await t.webhook('checkout.session.completed', s);
  assert.equal(wh.status, 200);
  assert.equal(t.mails.length, 1);
  assert.match(t.mails[0].url, /\/claim\//);

  // Replaying the same purchase does nothing new.
  await t.webhook('checkout.session.completed', s);
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM licenses')).n, 1);

  const page = await t.browse('/checkout/success?session_id=cs_test_1');
  const html = await page.text();
  assert.match(html, /Payment confirmed\./);
  assert.match(html, /value="player@example.com"/);

  const res = await t.browse('/signup', { form: { email: 'player@example.com', password: 'hunter2hunter2' } });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/account?n=claimed');
  const dash = await (await t.browse('/account?n=claimed')).text();
  assert.match(dash, /License added to your account/);
  assert.match(dash, /RAGO-/);
  assert.match(dash, /Not activated yet/);

  const dl = await t.browse('/account/download');
  assert.equal(dl.status, 200);
  assert.match(dl.headers.get('content-disposition'), /RagoOptimizer-Setup\.exe/);
  assert.equal(await dl.text(), 'MZ fake installer');
});

test('success page before the webhook still creates exactly one license', async () => {
  const t = await setup();
  const s = t.paidSession('cs_test_2', 'a@b.co');
  await t.browse('/checkout/success?session_id=cs_test_2');
  await t.webhook('checkout.session.completed', s);
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM licenses')).n, 1);
  assert.equal(t.mails.length, 1);
});

test('claim link from the email works after the tab was closed, and only once', async () => {
  const t = await setup();
  await t.webhook('checkout.session.completed', t.paidSession('cs_test_3', 'late@example.com'));
  const path = new URL(t.mails[0].url).pathname;
  assert.match(await (await t.browse(path)).text(), /Create account/);
  await t.browse('/signup', { form: { email: 'late@example.com', password: 'password123' } });
  assert.match(await (await t.browse('/account')).text(), /RAGO-/);
  t.jar.clear();
  const used = await t.browse(path);
  assert.equal(used.status, 410);
  assert.match(await used.text(), /work anymore[\s\S]*Sign in/);
});

test('signed-in buyer gets the license directly; second purchase is flagged', async () => {
  const t = await setup(SUBS);
  await t.browse('/signup', { form: { email: 'me@x.io', password: 'password123' } });
  const buy = await t.browse('/buy');
  assert.equal(buy.status, 303);
  assert.match(buy.headers.get('location'), /checkout\.stripe\.com/);
  const user = await L.findUserByEmail(t.db, 'me@x.io');
  t.paidSession('cs_test_4', 'me@x.io', { client_reference_id: user.id });
  const r = await t.browse('/checkout/success?session_id=cs_test_4');
  assert.equal(r.headers.get('location'), '/account?n=claimed');
  // A receipt still goes out (order and withdrawal waiver), without a claim link.
  assert.deepEqual(t.mails, [{ to: 'me@x.io', url: null }]);
  assert.equal((await t.browse('/buy')).headers.get('location'), '/account?n=owned');

  // Paid again from a signed-out tab with another email, then claimed into the same account.
  t.paidSession('cs_test_5', 'other@x.io');
  const jar = new Map(t.jar); t.jar.delete('rg_session');
  await t.browse('/checkout/success?session_id=cs_test_5');
  t.jar.set('rg_session', jar.get('rg_session'));
  const r2 = await t.browse('/login', { form: { email: 'me@x.io', password: 'password123' } });
  assert.equal(r2.headers.get('location'), '/account?n=duplicate');
});

test('app: login, activate, one device only, reinstall tolerated, refresh, refund', async () => {
  const t = await setup();
  await t.webhook('checkout.session.completed', t.paidSession('cs_app', 'pro@rago.gg'));
  await t.browse('/checkout/success?session_id=cs_app');
  await t.browse('/signup', { form: { email: 'pro@rago.gg', password: 'correct horse' } });

  let r = await t.api('/auth/login', { email: 'pro@rago.gg', password: 'wrong', device: device('G1') });
  assert.equal(r.status, 401);
  assert.equal((await r.json()).error.code, 'invalid_credentials');

  r = await t.api('/auth/login', { email: 'PRO@rago.gg', password: 'correct horse', device: device('G1') });
  let j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.status, 'activation_required');

  r = await t.api('/licenses/activate', { device: device('G1') }, { authorization: `Bearer ${j.access_token}` });
  j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.equal(j.status, 'active');
  const claims = verifyToken(j.license_token, t.keys, { typ: 'license' });
  assert.equal(claims.email, 'pro@rago.gg');
  assert.equal(claims.plan, 'premium');
  assert.equal(claims.fp.machine_guid, device('G1').fingerprint.machine_guid);
  // Offline check with only the public key, as the app does it.
  const pub = await (await t.app.request('/api/v1/public-key')).json();
  assert.ok(verifyToken(j.license_token, { publicKey: createPublicKey(pub.public_key_pem) }, { typ: 'license' }));

  // Another PC is refused, at login and at activation.
  r = await t.api('/auth/login', { email: 'pro@rago.gg', password: 'correct horse', device: device('G2', 'UUID-B', 'BOARD-B', 'FRIEND-PC') });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).error.code, 'bound_to_other_device');

  // Same hardware after a Windows reinstall (new MachineGuid) is still this PC.
  r = await t.api('/auth/login', { email: 'pro@rago.gg', password: 'correct horse', device: device('G1-REINSTALL') });
  j = await r.json();
  assert.equal(j.status, 'active');

  r = await t.api('/licenses/refresh', { license_token: j.license_token, device: device('G1') });
  const refreshed = await r.json();
  assert.equal(r.status, 200);
  r = await t.api('/licenses/refresh', { license_token: j.license_token, device: device('G9', 'UUID-Z', 'BOARD-Z') });
  assert.equal((await r.json()).error.code, 'bound_to_other_device');

  const dash = await (await t.browse('/account')).text();
  assert.match(dash, /This license is active on 1 device/);
  assert.match(dash, /GAMING-PC/);

  // Full refund revokes it.
  await t.webhook('charge.refunded', { id: 'ch_1', object: 'charge', refunded: true, payment_intent: 'pi_cs_app' });
  r = await t.api('/licenses/refresh', { license_token: refreshed.license_token, device: device('G1') });
  assert.equal((await r.json()).error.code, 'revoked');
  assert.match(await (await t.browse('/account')).text(), /Refunded/);
});

test('support reset frees the device; old tokens stop refreshing', async () => {
  const t = await setup();
  const user = await L.createUser(t.db, 'r@r.io', 'password123');
  const { license } = await L.grantLicense(t.db, 'r@r.io', 'test');
  assert.equal(license.user_id, user.id);
  let j = await (await t.api('/auth/login', { email: 'r@r.io', password: 'password123', device: device('A') })).json();
  j = await (await t.api('/licenses/activate', { device: device('A') }, { authorization: `Bearer ${j.access_token}` })).json();
  const oldToken = j.license_token;
  await L.resetDevice(t.db, license.id, 'support');
  let r = await t.api('/licenses/refresh', { license_token: oldToken, device: device('A') });
  assert.equal((await r.json()).error.code, 'invalid_token');
  j = await (await t.api('/auth/login', { email: 'r@r.io', password: 'password123', device: device('B', 'U2', 'B2') })).json();
  assert.equal(j.status, 'activation_required');
});

test('self-service reset is off by default and limited when on', async () => {
  const t = await setup({ SELF_SERVICE_RESET_DAYS: '30' });
  await t.browse('/signup', { form: { email: 's@s.io', password: 'password123' } });
  const { license } = await L.grantLicense(t.db, 's@s.io');
  await L.activate(t.db, license.id, { fp: { machine_guid: 'a'.repeat(64), smbios_uuid: 'b'.repeat(64), board_serial: null }, name: 'PC', os: '', appVersion: '' });
  assert.match(await (await t.browse('/account')).text(), /Use on another PC/);
  await t.browse('/account/reset-device', { form: {} });
  assert.equal(await L.getDevice(t.db, license.id), null);
  await L.activate(t.db, license.id, { fp: { machine_guid: 'c'.repeat(64), smbios_uuid: null, board_serial: null }, name: 'PC2', os: '', appVersion: '' });
  assert.match(await (await t.browse('/account')).text(), /You can free it yourself from/);

  const off = await setup();
  await off.browse('/signup', { form: { email: 's@s.io', password: 'password123' } });
  const l2 = (await L.grantLicense(off.db, 's@s.io')).license;
  await L.activate(off.db, l2.id, { fp: { machine_guid: 'a'.repeat(64), smbios_uuid: null, board_serial: null }, name: 'PC', os: '', appVersion: '' });
  assert.doesNotMatch(await (await off.browse('/account')).text(), /Use on another PC/);
});

test('account without a license sees the offer', async () => {
  const t = await setup();
  await t.browse('/signup', { form: { email: 'free@x.io', password: 'password123' } });
  const r = await t.browse('/account');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /You're on Free[\s\S]*Get Premium/);
  // The free plan is the app too: free accounts can download it.
  assert.equal((await t.browse('/account/download')).status, 200);
  const j = await (await t.api('/auth/login', { email: 'free@x.io', password: 'password123', device: device('Z') })).json();
  assert.equal(j.error.code, 'no_license');
});

test('SITE_DIR serves the marketing site without the strict CSP', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'site-'));
  writeFileSync(join(dir, 'index.html'), '<style>body{}</style><a href="/buy">Get Rago Hub Premium</a>');
  const t = await setup({ SITE_DIR: dir });
  const home = await t.app.request('/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Get Rago Hub Premium/);
  assert.equal(home.headers.get('content-security-policy'), null);
  assert.match((await t.app.request('/login')).headers.get('content-security-policy'), /script-src 'self'/);
});

test('site hosted on another origin: checkout and links point back to it', async () => {
  const t = await setup({ ...SUBS, PUBLIC_URL: 'https://account.rago.test', SITE_URL: 'https://rago.test' });
  assert.equal((await t.app.request('/')).headers.get('location'), 'https://rago.test/');
  let params;
  const create = async (p) => { params = p; return { url: 'https://checkout.stripe.com/x' }; };
  const { createCheckout } = await import('../src/billing.js');
  await createCheckout({ checkout: { sessions: { create } } }, t.cfg, null);
  assert.equal(params.cancel_url, 'https://rago.test/#pricing');
  assert.equal(params.success_url, 'https://account.rago.test/checkout/success?session_id={CHECKOUT_SESSION_ID}');
  assert.match(await (await t.app.request('/login')).text(), /href="https:\/\/rago\.test\/"/);
});

test('installer from Supabase Storage: signed link, any file name, clear reason when missing', async () => {
  const calls = [];
  // The bucket holds the file under the name Tauri gives it, not the configured one.
  const storage = { 'downloads/Rago Optimizer_1.0.0_x64-setup.exe': true };
  let keyOk = true;
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (!keyOk) return new Response('{"error":"Unauthorized"}', { status: 403 });
    const m = url.match(/\/object\/sign\/(.+)$/);
    if (m) {
      const path = decodeURIComponent(m[1]);
      return storage[path] ? new Response(JSON.stringify({ signedURL: `/object/sign/${m[1]}?token=t0k` })) : new Response('{"error":"not_found"}', { status: 400 });
    }
    if (url.endsWith('/object/list/downloads')) {
      return new Response(JSON.stringify([
        { name: '.emptyFolderPlaceholder', id: 'p', created_at: '2026-10-01' },
        { name: 'old_0.9.exe', id: 'a', created_at: '2026-10-01T00:00:00Z' },
        { name: 'Rago Optimizer_1.0.0_x64-setup.exe', id: 'b', created_at: '2026-10-06T00:00:00Z' },
      ]));
    }
    return new Response('?', { status: 404 });
  };
  const t = await setup({ SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJservice-key' }, { fetchImpl });
  const signed = 'https://abc.supabase.co/storage/v1/object/sign/downloads/Rago%20Optimizer_1.0.0_x64-setup.exe?token=t0k&download=RagoOptimizer-Setup.exe';

  // Free accounts download too (the free plan is the app with Premium tweaks locked).
  await t.browse('/signup', { form: { email: 'st@x.io', password: 'password123' } });
  assert.equal((await t.browse('/account/download')).headers.get('location'), signed);
  assert.match(calls[0].url, /object\/list\/downloads$/);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer eyJservice-key');
  assert.equal(calls[0].init.headers.apikey, 'eyJservice-key');
  await L.grantLicense(t.db, 'st@x.io');
  assert.equal((await t.browse('/account/download')).headers.get('location'), signed);
  // Public link for the site's free button, and the status check for the launch guide.
  assert.equal((await t.app.request('/download')).headers.get('location'), signed);
  assert.deepEqual(await (await t.app.request('/download/status')).json(), { ok: true, source: 'supabase', file: 'downloads/Rago Optimizer_1.0.0_x64-setup.exe' });

  // An old file under the configured name doesn't hide a newer upload.
  storage['downloads/RagoOptimizer-Setup.exe'] = true;
  const t3 = await setup({ SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJservice-key' }, { fetchImpl });
  assert.equal((await (await t3.app.request('/download/status')).json()).file, 'downloads/Rago Optimizer_1.0.0_x64-setup.exe');

  // Wrong key or empty bucket: the dashboard says so, and the status says why.
  keyOk = false;
  const t2 = await setup({ SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' }, { fetchImpl, log: { info() {}, error() {} } });
  const st = await (await t2.app.request('/download/status')).json();
  assert.equal(st.ok, false);
  assert.match(st.error, /refused the key/);
  assert.equal(calls.at(-1).init.headers.Authorization, undefined);
  await t2.browse('/signup', { form: { email: 'k@x.io', password: 'password123' } });
  assert.equal((await t2.browse('/account/download')).headers.get('location'), '/account?n=nofile');
  // Both say so, with a way to ask; nothing points to the old free .bat (removed from the site).
  const nofile = await (await t2.browse('/account?n=nofile')).text();
  assert.match(nofile, /can.t be downloaded right now/);
  const off = await t2.app.request('/download');
  assert.equal(off.status, 503);
  const offText = await off.text();
  assert.match(offText, /Ask on Discord/);
  assert.doesNotMatch(nofile + offText, /\.bat|rago-optimizer-free/);
});

test('concurrent activations from two PCs: exactly one wins', async () => {
  const t = await setup();
  await L.createUser(t.db, 'race@x.io', 'password123');
  const { license } = await L.grantLicense(t.db, 'race@x.io');
  const dev = (g) => ({ fp: { machine_guid: g.repeat(64), smbios_uuid: g.repeat(64), board_serial: null }, name: g, os: '', appVersion: '' });
  const results = await Promise.allSettled([L.activate(t.db, license.id, dev('a')), L.activate(t.db, license.id, dev('b'))]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.find((r) => r.status === 'rejected').reason.code, 'bound_to_other_device');
});

test('keys generated once and kept in the database; public key served as PEM', async () => {
  const db = await testDb();
  const a = loadConfig({}); await ensureKeys(db, a);
  const b = loadConfig({}); await ensureKeys(db, b);
  assert.equal(a.signingKeyPem, b.signingKeyPem);
  assert.equal(a.sessionSecret, b.sessionSecret);
  const t = await setup();
  const pem = await (await t.app.request('/api/v1/public-key?format=pem')).text();
  assert.match(pem, /^-----BEGIN PUBLIC KEY-----/);
});

test('config accepts a bare host for PUBLIC_URL and flags example values', () => {
  const cfg = loadConfig({ NODE_ENV: 'production', PUBLIC_URL: 'rago-production.up.railway.app', SITE_URL: 'https://rago.netlify.app/',
    DATABASE_URL: 'postgres://x', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_MONTHLY: 'price_m', STRIPE_PRICE_YEARLY: 'price_y', STRIPE_WEBHOOK_SECRET: 'whsec_a_remplir_a_l_etape_6',
    SUPABASE_URL: 'https://abcd.supabase.co', RESEND_API_KEY: 're_...' });
  assert.equal(cfg.publicUrl, 'https://rago-production.up.railway.app');
  assert.equal(cfg.siteUrl, 'https://rago.netlify.app');
  assert.equal(cfg.cancelUrl, 'https://rago.netlify.app/#pricing');
  assert.equal(cfg.resendApiKey, '');
  assert.equal(cfg.warnings.length, 3);
  assert.equal(cfg.subscriptions, true);
  // No price at all: the server still starts, says so in the logs, and /buy explains checkout isn't open.
  const noPrice = loadConfig({ NODE_ENV: 'production', PUBLIC_URL: 'x.app', DATABASE_URL: 'postgres://x', STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'whsec' });
  assert.match(noPrice.warnings.join(' '), /STRIPE_PRICE_MONTHLY/);
  assert.match(noPrice.warnings.join(' '), /SITE_URL is not set/);
  // The example sender from .env.example would be refused by Resend: emails stay off.
  const exampleFrom = loadConfig({ RESEND_API_KEY: 're_real', MAIL_FROM: 'Rago Optimizer <hello@your-domain.com>', SITE_URL: 'https://ragohub.com' });
  assert.equal(exampleFrom.mailEnabled, false);
  assert.match(exampleFrom.warnings.join(' '), /MAIL_FROM.*example[\s\S]*SITE_URL is still the example|SITE_URL is still the example[\s\S]*MAIL_FROM/);
});

test('no Stripe price yet: /buy says checkout is not open', async () => {
  const t = await setup({ STRIPE_PRICE_ID: '' });
  const r = await t.browse('/buy?interval=year');
  assert.equal(r.status, 503);
  assert.match(await r.text(), /Checkout opens soon/);
  // Only the old one-time price: not sold any more (the site sells a subscription).
  const old = await setup();
  assert.equal((await old.browse('/buy?interval=month')).status, 503);
  assert.equal(old.created.length, 0);
});

test('webhook rejects bad signatures; cross-site form posts are refused', async () => {
  const t = await setup();
  const r = await t.app.request('/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=bad' }, body: '{}' });
  assert.equal(r.status, 400);
  const x = await t.app.request('/login', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a&password=b' });
  assert.equal(x.status, 403);
  // The email logo must load inside mail clients; page assets stay same-origin.
  assert.equal((await t.app.request('/assets/email-wordmark.png')).headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.equal((await t.app.request('/assets/account.css')).headers.get('cross-origin-resource-policy'), 'same-origin');
});

const SUBS = { STRIPE_PRICE_MONTHLY: 'price_month', STRIPE_PRICE_YEARLY: 'price_year', SITE_URL: 'https://rago.test' };
const DAY_MS = 86400000;

test('subscription: monthly or yearly checkout, renewal date, cancel, lapse and resume', async () => {
  const t = await setup(SUBS);
  // /buy picks the price from ?interval, yearly by default (the plan the site highlights).
  await t.browse('/buy?interval=month');
  await t.browse('/buy');
  assert.equal(t.created[0].mode, 'subscription');
  assert.deepEqual(t.created[0].line_items, [{ price: 'price_month', quantity: 1 }]);
  assert.equal(t.created[1].line_items[0].price, 'price_year');
  assert.equal(t.created[0].customer_creation, undefined);

  const s = t.paidSubscription('cs_sub', 'sub@rago.gg', 'year');
  await t.browse('/checkout/success?session_id=cs_sub');
  await t.browse('/signup', { form: { email: 'sub@rago.gg', password: 'password123' } });
  let dash = await (await t.browse('/account')).text();
  assert.match(dash, /Rago Optimizer Premium · Yearly/);
  assert.match(dash, /Renews on/);
  assert.match(dash, /Cancel or manage subscription/);
  const portal = await t.browse('/account/billing', { form: {} });
  assert.equal(portal.headers.get('location'), 'https://billing.stripe.com/p/session/x');
  assert.deepEqual(t.stripeCalls.at(-1), ['portal', 'cus_cs_sub']);

  // The webhook for the same checkout re-reads the subscription and doesn't create a second license.
  await t.webhook('checkout.session.completed', { ...s, subscription: 'sub_cs_sub' });
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM licenses')).n, 1);

  // App: the token never outlives the paid period by more than the grace days.
  t.subscription('sub_cs_sub', 'year', { periodDays: 2 });
  await t.webhook('customer.subscription.updated', { id: 'sub_cs_sub', object: 'subscription' });
  let j = await (await t.api('/auth/login', { email: 'sub@rago.gg', password: 'password123', device: device('S1') })).json();
  j = await (await t.api('/licenses/activate', { device: device('S1') }, { authorization: `Bearer ${j.access_token}` })).json();
  assert.equal(j.license.billing.interval, 'year');
  assert.ok(j.license.billing.renews_at);
  const days = (Date.parse(j.expires_at) - Date.now()) / DAY_MS;
  assert.ok(days > 4.9 && days < 5.1, `token lasts ${days} days`);
  assert.equal(verifyToken(j.license_token, t.keys, { typ: 'license' }).plan, 'premium');

  // Canceled at period end: still works, dashboard says until when.
  t.subscription('sub_cs_sub', 'year', { cancel_at_period_end: true });
  await t.webhook('customer.subscription.updated', { id: 'sub_cs_sub', object: 'subscription' });
  assert.match(await (await t.browse('/account')).text(), /Canceled\. Premium keeps working until/);

  // Unpaid: the license stops; card fixed: it comes back, same PC, no new activation.
  t.subscription('sub_cs_sub', 'year', { status: 'unpaid' });
  await t.webhook('customer.subscription.updated', { id: 'sub_cs_sub', object: 'subscription' });
  let r = await t.api('/licenses/refresh', { license_token: j.license_token, device: device('S1') });
  let err = (await r.json()).error;
  assert.equal(err.code, 'revoked');
  assert.equal(err.reason, 'subscription_ended');
  assert.equal(err.buy_url, 'https://rago.test/#pricing');
  assert.match(err.message, /subscription ended/);
  dash = await (await t.browse('/account')).text();
  assert.match(dash, /Renew Premium/);
  assert.match(dash, /Ended/);

  t.subscription('sub_cs_sub', 'year');
  // An old event replayed late can't override: the handler reads the current subscription from Stripe.
  await t.webhook('customer.subscription.updated', { id: 'sub_cs_sub', object: 'subscription', status: 'canceled' });
  j = await (await t.api('/auth/login', { email: 'sub@rago.gg', password: 'password123', device: device('S1') })).json();
  assert.equal(j.status, 'active');

  // Deleted for good.
  t.subscription('sub_cs_sub', 'year', { status: 'canceled' });
  await t.webhook('customer.subscription.deleted', { id: 'sub_cs_sub', object: 'subscription' });
  r = await t.api('/auth/login', { email: 'sub@rago.gg', password: 'password123', device: device('S1') });
  assert.equal((await r.json()).error.reason, 'subscription_ended');

  // Renewing: a new checkout with the same Stripe customer.
  await t.browse('/buy?interval=month');
  assert.equal(t.created.at(-1).customer, 'cus_cs_sub');
  assert.equal(t.created.at(-1).customer_email, undefined);
});

test('subscription refund or dispute revokes and stops renewals', async () => {
  const t = await setup(SUBS);
  t.paidSubscription('cs_r', 'r@rago.gg');
  await t.browse('/checkout/success?session_id=cs_r');
  await t.browse('/signup', { form: { email: 'r@rago.gg', password: 'password123' } });
  // Subscription invoices have their own payment intent: matched on the customer.
  await t.webhook('charge.refunded', { id: 'ch_9', object: 'charge', refunded: true, payment_intent: 'pi_invoice_1', customer: 'cus_cs_r' });
  assert.match(await (await t.browse('/account')).text(), /Refunded/);
  assert.deepEqual(t.stripeCalls.at(-1), ['cancel', 'sub_cs_r']);
  // The cancellation event that follows doesn't turn "refunded" into "ended".
  await t.webhook('customer.subscription.deleted', { id: 'sub_cs_r', object: 'subscription' });
  assert.equal((await t.db.get('SELECT status_reason FROM licenses')).status_reason, 'refunded');
});

/** A PC with its own identifiers (device() shares the SMBIOS UUID and board serial). */
const pc = (name) => device(name, `UUID-${name}`, `BOARD-${name}`);

/** Signs in to the app and activates this PC, like Rago Optimizer does. Returns the final reply. */
async function appActivate(t, email, dev) {
  const j = await (await t.api('/auth/login', { email, password: 'password123', device: dev })).json();
  if (j.status !== 'activation_required') return j;
  return (await t.api('/licenses/activate', { device: dev }, { authorization: `Bearer ${j.access_token}` })).json();
}

test('affiliate: 5 % code in Stripe, 3 players per code, a player counts when they activate, 6 months once', async () => {
  const t = await setup(SUBS);
  // The affiliate subscribes first, activates their PC, then joins the program.
  t.paidSubscription('cs_aff', 'aff@rago.gg');
  await t.browse('/checkout/success?session_id=cs_aff');
  await t.browse('/signup', { form: { email: 'aff@rago.gg', password: 'password123' } });
  const aff = await L.findUserByEmail(t.db, 'aff@rago.gg');
  const affLic = await L.licenseForUser(t.db, aff.id);
  assert.equal((await appActivate(t, 'aff@rago.gg', pc('AFF'))).status, 'active');
  assert.match(await (await t.browse('/affiliate')).text(), /Get my referral code/);
  assert.equal((await t.browse('/affiliate/join', { form: {} })).headers.get('location'), '/affiliate?n=joined');
  const { code } = await t.db.get('SELECT code FROM affiliates WHERE user_id = ?', [aff.id]);
  assert.match(code, /^[A-Z2-9]{6}$/);

  // Joining made the code a Stripe promotion code: 5 % off the first payment, new customers only.
  assert.equal(t.promos.length, 1);
  assert.equal(t.promos[0].code, code);
  assert.deepEqual(t.promos[0].promotion, { type: 'coupon', coupon: 'rago-referral-5-once' });
  assert.equal(t.promos[0].restrictions.first_time_transaction, true);
  assert.deepEqual(t.coupons['rago-referral-5-once'], { object: 'coupon', id: 'rago-referral-5-once', percent_off: 5, duration: 'once', name: 'Referral code, 5% off' });
  assert.equal((await t.db.get('SELECT stripe_promo_id, stripe_promo_live FROM affiliates')).stripe_promo_id, 'promo_1');

  let page = await (await t.browse('/affiliate')).text();
  assert.match(page, new RegExp(code));
  assert.match(page, /3 more to go/);
  assert.match(page, /5% off/);
  assert.match(page, /data-count="0"/);
  const affJar = new Map(t.jar);
  const asAffiliate = async () => { t.jar.clear(); for (const [k, v] of affJar) t.jar.set(k, v); return (await t.browse('/affiliate')).text(); };

  // The code field only exists right after a purchase.
  t.jar.clear();
  assert.doesNotMatch(await (await t.browse('/signup')).text(), /Referral code/);

  // The share link opens a checkout with the 5 % already applied.
  await t.browse(`/buy?interval=month&ref=${code.toLowerCase()}`);
  assert.deepEqual(t.created.at(-1).discounts, [{ promotion_code: 'promo_1' }]);
  assert.equal(t.created.at(-1).allow_promotion_codes, undefined);
  assert.equal(t.created.at(-1).metadata.ref, code);
  t.paidSubscription('cs_link', 'link@x.io');
  assert.match(await (await t.browse('/checkout/success?session_id=cs_link')).text(), new RegExp(`value="${code}"`));
  // Without a link, the buyer can type a code at checkout.
  t.jar.clear();
  await t.browse('/buy?interval=year');
  assert.equal(t.created.at(-1).allow_promotion_codes, true);
  assert.equal(t.created.at(-1).discounts, undefined);

  async function buyer(n, { codeTyped = code, dev, email = `p${n}@x.io`, payer = email, stripeCode = false } = {}) {
    t.jar.clear();
    // stripeCode: the code was typed at checkout (Stripe promotion code), not on our form.
    t.paidSubscription(`cs_p${n}`, payer, 'month', stripeCode ? { discounts: [{ coupon: 'rago-referral-5-once', promotion_code: 'promo_1' }] } : {});
    let html = await (await t.browse(`/checkout/success?session_id=cs_p${n}`)).text();
    if (payer !== email) html = await (await t.browse('/signup')).text(); // payer's email has an account: they're offered sign-in first
    assert.match(html, /Referral code/);
    if (stripeCode) assert.match(html, new RegExp(`value="${code}"`));
    const res = await t.browse('/signup', { form: { email, password: 'password123', code: codeTyped } });
    if (res.status !== 303) return { error: await res.text() };
    const user = await L.findUserByEmail(t.db, email);
    const lic = await L.licenseForUser(t.db, user.id);
    if (dev) assert.equal((await appActivate(t, email, dev)).status, 'active');
    return { user, lic };
  }
  const referral = async (email) => (await t.db.get('SELECT r.status, r.void_reason FROM referrals r JOIN licenses l ON l.id = r.license_id WHERE l.email = ?', [email]));

  // Wrong code or own code: refused before the account exists.
  assert.match((await buyer(0, { codeTyped: 'NOPE42' })).error, /referral code doesn&#39;t exist/);
  assert.match((await buyer(9, { email: 'p9@x.io', payer: 'aff@rago.gg' })).error, /can&#39;t use your own referral code/);
  assert.equal(await L.findUserByEmail(t.db, 'p9@x.io'), null);

  // Signed up with the code but not activated yet: pending. Activating in the app counts it at once,
  // without the affiliate opening anything.
  await buyer(1);
  assert.deepEqual(await referral('p1@x.io'), { status: 'pending', void_reason: null });
  page = await asAffiliate();
  assert.match(page, /Not activated yet/);
  assert.match(page, /0 \/ 3|<b data-count="0">0<\/b><small>\/3<\/small>/);
  assert.match(page, /1 waiting/);
  assert.equal((await appActivate(t, 'p1@x.io', pc('P1'))).status, 'active');
  assert.deepEqual(await referral('p1@x.io'), { status: 'counted', void_reason: null });
  page = await asAffiliate();
  assert.match(page, /<b data-count="1">1<\/b><small>\/3<\/small>/);
  assert.match(page, /2 more to go/);
  assert.match(page, /<strong>1 of 3<\/strong> players counted/);
  assert.equal((page.match(/<li class="on">/g) || []).length, 1);
  assert.match(page, /Counted/);
  assert.match(page, /p1••@x\.io/); // emails are masked

  // Code typed at checkout (Stripe), carried to the account form.
  await buyer(2, { dev: pc('P2'), stripeCode: true });
  assert.equal((await t.db.get("SELECT referral_code FROM licenses WHERE email = 'p2@x.io'")).referral_code, code);
  assert.deepEqual(await referral('p2@x.io'), { status: 'counted', void_reason: null });
  page = await asAffiliate();
  assert.match(page, /<b data-count="2">2<\/b><small>\/3<\/small>/);
  assert.equal((page.match(/<li class="on">/g) || []).length, 2);
  assert.match(page, /1 more to go/);

  // Don't count and free their spot: activated on the affiliate's own PC, refunded before activating.
  await buyer(3, { dev: pc('AFF') });
  assert.deepEqual(await referral('p3@x.io'), { status: 'void', void_reason: 'same_device' });
  const refunded = await buyer(4);
  await t.webhook('charge.refunded', { id: 'ch_4', object: 'charge', refunded: true, customer: refunded.lic.stripe_customer_id });
  page = await asAffiliate();
  assert.match(page, /Same PC as yours/);
  assert.match(page, /Refunded/);
  assert.equal(t.promos[0].active, true);

  // Third spot taken by a player who hasn't activated yet: the code is full (3 players at most).
  const p5 = await buyer(5);
  page = await asAffiliate();
  assert.match(page, /Your code is full/);
  assert.match(page, /Not activated yet/);
  assert.match(page, /1 more to go/);
  // (it was off for a moment each time a player signed up before activating on the same PC or being refunded)
  assert.deepEqual(t.stripeCalls.filter((c) => c[0] === 'promo').at(-1), ['promo', 'promo_1', { active: false }]);
  assert.equal(t.promos[0].active, false); // typed at checkout, Stripe now refuses it
  t.jar.clear();
  await t.browse(`/buy?interval=month&ref=${code}`);
  assert.equal(t.created.at(-1).discounts, undefined); // no 5 % from the link either
  assert.match((await buyer(6)).error, /already used by 3 players/);
  assert.equal(await L.findUserByEmail(t.db, 'p6@x.io'), null);

  // That player is refunded: the spot frees up and the Stripe code works again.
  await t.webhook('charge.refunded', { id: 'ch_5', object: 'charge', refunded: true, customer: p5.lic.stripe_customer_id });
  page = await asAffiliate();
  assert.doesNotMatch(page, /Your code is full/);
  assert.equal(t.promos[0].active, true);

  // Third real player: 3/3, the affiliate's next 6 months are free (Stripe trial), same license and PC.
  const before = (await L.licenseForUser(t.db, aff.id)).current_period_end;
  await buyer(7, { dev: pc('P7') });
  const update = t.stripeCalls.find((c) => c[0] === 'update' && c[1] === 'sub_cs_aff');
  assert.equal(update[2].proration_behavior, 'none');
  assert.equal(update[2].trial_end, Math.floor(L.addMonths(Number(before), 6) / 1000));
  let lic = await L.licenseForUser(t.db, aff.id);
  assert.equal(lic.id, affLic.id);
  assert.equal(lic.plan, 'month');
  assert.equal(lic.status, 'active');
  assert.equal(Number(lic.current_period_end), L.addMonths(Number(before), 6));
  assert.equal((await t.db.get('SELECT rewards FROM affiliates')).rewards, 1);
  page = await asAffiliate();
  assert.match(page, /Goal reached/);
  assert.match(page, /6 months of Premium added to your license/);
  assert.match(page, /ring-full/);
  assert.match(page, /<b data-count="3">3<\/b><small>\/3<\/small>/);
  assert.equal((page.match(/<li class="on">/g) || []).length, 3);
  assert.equal(t.promos[0].active, false); // reward given: the code is closed
  // Stripe confirms with the subscription in trial: still active, renews after the free months.
  await t.webhook('customer.subscription.updated', { id: 'sub_cs_aff', object: 'subscription' });
  lic = await L.licenseForUser(t.db, aff.id);
  assert.equal(lic.status, 'active');
  assert.equal(Number(lic.current_period_end), update[2].trial_end * 1000);
  assert.match(await (await t.browse('/account')).text(), /Renews on/);

  // A counted player refunded after the reward: the reward stays, support gets a trace, the code stays closed.
  const p1 = await L.findUserByEmail(t.db, 'p1@x.io');
  await t.webhook('charge.refunded', { id: 'ch_after', object: 'charge', refunded: true, customer: (await L.licenseForUser(t.db, p1.id)).stripe_customer_id });
  assert.equal((await t.db.get("SELECT COUNT(*)::int AS n FROM audit WHERE type = 'affiliate.reward_at_risk'")).n, 1);
  assert.equal((await L.licenseForUser(t.db, aff.id)).status, 'active');
  page = await asAffiliate();
  assert.equal(t.promos[0].active, false);
  const A = await import('../src/affiliates.js');
  // (checked directly: the sign-up form allows 10 accounts per IP per hour)
  await assert.rejects(A.checkCode(t.db, code, 'p8@x.io', t.cfg), /code_full/);

  // One reward only, even with more counted players (code added by support, for instance).
  for (const n of [9, 10, 11]) {
    const user = await L.createUser(t.db, `p${n}@x.io`, 'password123');
    const { license } = await L.grantLicense(t.db, `p${n}@x.io`);
    await A.recordReferral(t.db, await A.affiliateByCode(t.db, code), user.id, license);
    assert.equal((await appActivate(t, `p${n}@x.io`, pc(`P${n}`))).status, 'active');
  }
  await asAffiliate();
  assert.equal((await t.db.get('SELECT rewards FROM affiliates')).rewards, 1);
  assert.equal(t.stripeCalls.filter((c) => c[0] === 'update' && c[1] === 'sub_cs_aff').length, 1);
});

test('AFFILIATE_REWARD_MAX=0 and more spots: a reward every 3 players', async () => {
  const t = await setup({ ...SUBS, AFFILIATE_REWARD_MAX: '0', AFFILIATE_MAX_REFERRALS: '6' });
  await t.browse('/signup', { form: { email: 'many@aff.io', password: 'password123' } });
  await t.browse('/affiliate/join', { form: {} });
  const aff = await L.findUserByEmail(t.db, 'many@aff.io');
  const { code } = await t.db.get('SELECT code FROM affiliates');
  const A = await import('../src/affiliates.js');
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const user = await L.createUser(t.db, `m${n}@x.io`, 'password123');
    const { license } = await L.grantLicense(t.db, `m${n}@x.io`);
    await A.recordReferral(t.db, await A.affiliateByCode(t.db, code), user.id, license, t.cfg);
    assert.equal((await appActivate(t, `m${n}@x.io`, pc(`M${n}`))).status, 'active');
  }
  assert.equal((await t.db.get('SELECT rewards FROM affiliates')).rewards, 2);
  const lic = await L.licenseForUser(t.db, aff.id);
  const months = (Number(lic.current_period_end) - Date.now()) / DAY_MS;
  assert.ok(months > 360 && months < 370, `${months} days`);
  await assert.rejects(async () => {
    const user = await L.createUser(t.db, 'm7@x.io', 'password123');
    const { license } = await L.grantLicense(t.db, 'm7@x.io');
    await A.recordReferral(t.db, await A.affiliateByCode(t.db, code), user.id, license, t.cfg);
  }, /code_full/);
});

test('affiliate without a license gets 6 months of Premium, which end on their date', async () => {
  const t = await setup(SUBS);
  await t.browse('/signup?next=/affiliate');
  const r = await t.browse('/signup', { form: { email: 'free@aff.io', password: 'password123', next: '/affiliate' } });
  assert.equal(r.headers.get('location'), '/affiliate');
  await t.browse('/affiliate/join', { form: {} });
  const aff = await L.findUserByEmail(t.db, 'free@aff.io');
  const { code } = await t.db.get('SELECT code FROM affiliates');
  const A = await import('../src/affiliates.js');
  for (const n of [1, 2, 3]) {
    const user = await L.createUser(t.db, `b${n}@x.io`, 'password123');
    const { license } = await L.grantLicense(t.db, `b${n}@x.io`);
    await A.recordReferral(t.db, await A.affiliateByCode(t.db, code), user.id, license);
    await L.activate(t.db, license.id, { fp: { machine_guid: String(n).repeat(64), smbios_uuid: null, board_serial: null }, name: 'P', os: '', appVersion: '' });
  }
  assert.deepEqual(await A.affiliatesToEvaluate(t.db, t.cfg), [aff.id]);
  // The app's sign-in also settles it, so the affiliate doesn't need to open the site.
  let j = await (await t.api('/auth/login', { email: 'free@aff.io', password: 'password123', device: device('F') })).json();
  assert.equal(j.status, 'activation_required');
  const lic = await L.licenseForUser(t.db, aff.id);
  assert.equal(lic.plan, 'reward');
  assert.equal(lic.source, 'affiliate');
  const days = (Number(lic.current_period_end) - Date.now()) / DAY_MS;
  assert.ok(days > 180 && days < 185, `${days} days`);
  j = await (await t.api('/licenses/activate', { device: device('F') }, { authorization: `Bearer ${j.access_token}` })).json();
  assert.equal(j.status, 'active');
  assert.equal(j.license.billing.interval, 'reward');
  assert.equal(j.license.billing.renews_at, null);
  assert.equal(Date.parse(j.license.billing.ends_at), Number(lic.current_period_end));
  let dash = await (await t.browse('/account')).text();
  assert.match(dash, /Affiliate reward/);
  assert.match(dash, /Earned with the affiliate program\. Premium until/);
  // Refunds of other people's payments never touch it.
  await t.webhook('charge.refunded', { id: 'ch_x', object: 'charge', refunded: true, customer: null, payment_intent: null });
  assert.equal((await L.licenseForUser(t.db, aff.id)).status, 'active');

  // Past its date, it stops like an ended subscription: the app gets subscription_ended and the buy link.
  await t.db.run('UPDATE licenses SET current_period_end = ? WHERE id = ?', [Date.now() - 1000, lic.id]);
  const refresh = await t.api('/licenses/refresh', { license_token: j.license_token, device: device('F') });
  const err = (await refresh.json()).error;
  assert.equal(err.code, 'revoked');
  assert.equal(err.reason, 'subscription_ended');
  assert.ok(err.buy_url);
  dash = await (await t.browse('/account')).text();
  assert.match(dash, /Your affiliate reward ended/);
  assert.equal(await L.expireRewards(t.db), 0);
});

test('site discount code: /buy?promo=RAGO15 opens the checkout with it, an unknown code is ignored', async () => {
  const t = await setup(SUBS);
  t.promos.push({ id: 'promo_site', object: 'promotion_code', active: true, code: 'RAGO15', promotion: { type: 'coupon', coupon: 'rago-promo-15-once' } });
  await t.browse('/buy?interval=year&promo=RAGO15');
  assert.deepEqual(t.created.at(-1).discounts, [{ promotion_code: 'promo_site' }]);
  assert.equal(t.created.at(-1).allow_promotion_codes, undefined);
  await t.browse('/buy?interval=year&promo=NOPE');
  assert.equal(t.created.at(-1).discounts, undefined);
  assert.equal(t.created.at(-1).allow_promotion_codes, true);
  await t.browse('/buy?promo=%3Cx%3E');
  assert.equal(t.created.at(-1).allow_promotion_codes, true);
});

test('a discount Stripe refuses for this buyer: the checkout still opens, with the code field', async () => {
  const t = await setup(SUBS, {});
  t.promos.push({ id: 'promo_site', object: 'promotion_code', active: true, code: 'RAGO15' });
  const create = t.stripe.checkout.sessions.create;
  t.stripe.checkout.sessions.create = async (p) => {
    if (p.discounts) throw new Error('This promotion code cannot be redeemed because the associated customer has prior transactions.');
    return create(p);
  };
  const res = await t.browse('/buy?promo=RAGO15');
  assert.equal(res.status, 303);
  assert.equal(t.created.at(-1).allow_promotion_codes, true);
});

test('account pages: change password, foreign checkouts ignored, code typed at sign-in after a purchase, expired reset link', async () => {
  const t = await setup();
  // Change password while signed in: wrong current password refused, then the new one works.
  await t.browse('/signup', { form: { email: 'pw@x.io', password: 'password123' } });
  assert.equal((await t.browse('/account/password', { form: { current: 'nope-nope', password: 'newpassword1' } })).status, 401);
  const ok = await t.browse('/account/password', { form: { current: 'password123', password: 'newpassword1' } });
  assert.equal(ok.headers.get('location'), '/account?n=password');
  assert.match(await (await t.browse('/account?n=password')).text(), /Password changed/);
  t.jar.clear();
  assert.equal((await t.browse('/login', { form: { email: 'pw@x.io', password: 'newpassword1' } })).status, 303);

  // A Checkout for another product on the same Stripe account creates nothing.
  await t.webhook('checkout.session.completed', t.paidSession('cs_other', 'other@x.io', { metadata: { product: 'something-else' } }));
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM licenses')).n, 0);

  // pw@x.io becomes an affiliate; a buyer who already has an account types the code when signing in.
  await t.browse('/affiliate/join', { form: {} });
  const code = (await t.db.get('SELECT code FROM affiliates')).code;
  t.jar.clear();
  await t.browse('/signup', { form: { email: 'buyer@x.io', password: 'password123' } });
  t.jar.clear();
  await t.webhook('checkout.session.completed', t.paidSession('cs_buy', 'buyer@x.io'));
  const page = await (await t.browse('/checkout/success?session_id=cs_buy')).text();
  assert.match(page, /name="code"/);
  const res = await t.browse('/login', { form: { email: 'buyer@x.io', password: 'password123', code: code.toLowerCase() } });
  assert.equal(res.headers.get('location'), '/account?n=claimed');
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM referrals')).n, 1);

  // A dead reset link says so before asking for a password.
  assert.equal((await t.browse('/reset/not-a-real-token')).status, 410);
});

test('checkout asks to accept the terms, and still opens if Stripe has no Terms URL yet', async () => {
  const t = await setup(SUBS);
  await t.browse('/buy');
  const p = t.created.at(-1);
  assert.equal(p.consent_collection.terms_of_service, 'required');
  assert.match(p.custom_text.terms_of_service_acceptance.message, /terms\.html.*14-day right of withdrawal/);

  // Stripe refuses the checkbox while no Terms URL is set in its dashboard: retry without it, log loudly.
  const errors = [];
  let calls = 0;
  const create = async (params) => {
    calls++;
    if (params.consent_collection) throw new Error('You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard.');
    return { url: 'https://checkout.stripe.com/c/pay/cs_x' };
  };
  const { createCheckout } = await import('../src/billing.js');
  const s = await createCheckout({ checkout: { sessions: { create } } }, t.cfg, null, {}, { error: (...a) => errors.push(a.join(' ')) });
  assert.equal(s.url, 'https://checkout.stripe.com/c/pay/cs_x');
  assert.equal(calls, 2);
  assert.match(errors.join('\n'), /Terms of Service URL/);
});

test('purchase link opened while signed in attaches the license; the code from the affiliate link follows the purchase', async () => {
  const t = await setup(SUBS);
  // Affiliate A.
  await t.browse('/signup', { form: { email: 'aff@x.io', password: 'password123' } });
  await t.browse('/affiliate/join', { form: {} });
  const { code } = await t.db.get('SELECT code FROM affiliates');
  t.jar.clear();

  // Buyer pays from the affiliate link on a phone, without creating the account there.
  await t.browse(`/buy?interval=month&ref=${code}`);
  assert.equal(t.created.at(-1).metadata.ref, code);
  const s = t.paidSession('cs_ref', 'buyer@x.io', { metadata: { product: 'rago-hub-premium', ref: code } });
  await t.webhook('checkout.session.completed', s);
  const claimPath = new URL(t.mails.at(-1).url).pathname;

  // Later, on the PC: account created first (other browser, no cookie), then the email link.
  t.jar.clear();
  await t.browse('/signup', { form: { email: 'buyer@x.io', password: 'password123' } });
  const r = await t.browse(claimPath);
  assert.equal(r.headers.get('location'), '/account?n=claimedref');
  const buyer = await L.findUserByEmail(t.db, 'buyer@x.io');
  assert.equal((await L.licenseForUser(t.db, buyer.id)).user_id, buyer.id);
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM referrals')).n, 1);
  assert.match(await (await t.browse('/account?n=claimedref')).text(), /referral code was applied/);
});

test('a second purchase on an email that has Premium: no purchase email, duplicate license revoked', async () => {
  const t = await setup(SUBS);
  await t.browse('/signup', { form: { email: 'dup@x.io', password: 'password123' } });
  await t.webhook('checkout.session.completed', t.paidSession('cs_d1', 'dup@x.io', { client_reference_id: (await L.findUserByEmail(t.db, 'dup@x.io')).id }));
  const mailsBefore = t.mails.length;
  t.jar.clear();
  await t.webhook('checkout.session.completed', t.paidSession('cs_d2', 'dup@x.io'));
  assert.equal(t.mails.length, mailsBefore);
  await t.browse('/checkout/success?session_id=cs_d2');
  const res = await t.browse('/login', { form: { email: 'dup@x.io', password: 'password123' } });
  assert.equal(res.headers.get('location'), '/account?n=duplicate');
  const dup = await t.db.get("SELECT status, status_reason FROM licenses WHERE stripe_session_id = 'cs_d2'");
  assert.deepEqual([dup.status, dup.status_reason], ['revoked', 'duplicate']);
  assert.match(await (await t.browse('/account?n=duplicate')).text(), /<a href="[^"]+"[^>]*>Contact support on Discord<\/a>/);
});

test('account security: lockout by strangers, old reset links, Origin by host, API 404 in JSON, lost purchase found by support', async () => {
  const t = await setup({ TRUST_PROXY: '1' });
  await L.createUser(t.db, 'victim@x.io', 'password123');
  const login = (pass, ip) => t.app.request('/api/v1/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify({ email: 'victim@x.io', password: pass, device: device('V') }),
  });
  // 20 wrong passwords from 2 IPs: those IPs are stopped, the player's own IP still gets in.
  for (let i = 0; i < 10; i++) { await login('nope', '10.0.0.1'); await login('nope', '10.0.0.2'); }
  assert.equal((await login('password123', '10.0.0.1')).status, 429);
  assert.equal((await (await login('password123', '10.9.9.9')).json()).error.code, 'no_license');

  // A reset link asked earlier stops working once the password changed with another one.
  const user = await L.findUserByEmail(t.db, 'victim@x.io');
  const first = await L.createPasswordReset(t.db, user.id);
  const second = await L.createPasswordReset(t.db, user.id);
  assert.equal((await t.browse(`/reset/${second}`, { form: { token: second, password: 'newpassword1' } })).status, 303);
  assert.equal((await t.browse(`/reset/${first}`)).status, 410);

  // Forms posted from the custom domain while PUBLIC_URL is still the Railway address (and back) pass.
  const post = (host, origin) => t.app.request('/forgot', { method: 'POST', headers: { host, origin, 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a%40b.c' });
  assert.equal((await post('account.rago.gg', 'https://account.rago.gg')).status, 200);
  assert.equal((await post('account.rago.gg', 'https://evil.example')).status, 403);

  const nope = await t.app.request('/api/v1/nope', { method: 'POST' });
  assert.equal(nope.status, 404);
  assert.equal((await nope.json()).error.code, 'invalid_request');

  // Paid, tab closed, account made elsewhere: support finds the purchase and attaches it.
  await t.webhook('checkout.session.completed', t.paidSession('cs_lost', 'lost@x.io'));
  await L.createUser(t.db, 'lost@x.io', 'password123');
  const lostUser = await L.findUserByEmail(t.db, 'lost@x.io');
  assert.equal(await L.licenseForUser(t.db, lostUser.id), null);
  const [loose] = await L.unclaimedLicenses(t.db, 'lost@x.io');
  assert.ok(loose);
  const link = await L.newClaimToken(t.db, loose.id);
  assert.equal((await L.licenseByClaimToken(t.db, link)).id, loose.id);
  await L.claimLicense(t.db, loose.id, lostUser.id);
  assert.equal((await L.licenseForUser(t.db, lostUser.id)).id, loose.id);
  await assert.rejects(L.newClaimToken(t.db, loose.id), /already_claimed/);
});

test('real Postgres: a connection closed by the database, idle or mid-transaction, does not stop the server', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const db = await testDb();
  await db.get('SELECT 1');
  const admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await admin.connect();
  await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = current_database()');
  await admin.end();
  await new Promise((r) => setTimeout(r, 300));
  assert.equal((await db.get('SELECT 1 AS ok')).ok, 1);

  // Cut in the middle of a transaction (e.g. a database restart during an activation): that request
  // fails, the server keeps running and the next query works.
  await assert.rejects(db.tx(async (t) => {
    const { pid } = await t.get('SELECT pg_backend_pid() AS pid');
    const killer = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await killer.connect();
    await killer.query('SELECT pg_terminate_backend($1)', [pid]);
    await killer.end();
    await new Promise((r) => setTimeout(r, 200));
    await t.get('SELECT 1');
  }));
  await new Promise((r) => setTimeout(r, 200));
  assert.equal((await db.get('SELECT 1 AS ok')).ok, 1);
});

test('real Postgres: a table locked at boot delays the schema replay instead of stopping the server', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  await testDb(); // tables exist
  const url = process.env.TEST_DATABASE_URL;
  const holder = new pg.Client({ connectionString: url });
  await holder.connect();
  await holder.query('BEGIN; LOCK TABLE licenses IN ACCESS EXCLUSIVE MODE');
  const errors = [];
  const started = Date.now();
  const replay = applySchema(pg, url, true, { log: { error: (m) => errors.push(m) } });
  // Held past the 5 s lock_timeout: the first attempt gives up (nothing left waiting on the database), the next one passes.
  await new Promise((r) => setTimeout(r, 6500));
  const waiting = await holder.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND datname = current_database()");
  assert.equal(waiting.rows[0].n, 0);
  await holder.query('ROLLBACK');
  await holder.end();
  await replay;
  assert.equal(errors.length, 1);
  assert.match(errors[0], /attempt 1\/6/);
  assert.ok(Date.now() - started >= 6500);
});
