import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, createPublicKey } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Stripe from 'stripe';

import { loadConfig } from '../src/config.js';
import { applySchema, ensureKeys, openDb, openMemoryDb } from '../src/db.js';
import pg from 'pg';
import { loadKeys, verifyToken } from '../src/tokens.js';
import { createApp } from '../src/app.js';
import { createMailer } from '../src/mailer.js';
import * as L from '../src/licensing.js';
import * as P from '../src/profile.js';
import * as R from '../src/reviews.js';
import sharp from 'sharp';

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
  stripe.promotionCodes.list = async ({ code, active }) => ({ data: promos.filter((x) => (active === undefined || x.active === active) && x.code.toUpperCase() === String(code).toUpperCase()) });
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
  // New account: the profile photo step first, which can be skipped.
  assert.equal(res.headers.get('location'), '/account/profile?welcome=1&to=%2Faccount%3Fn%3Dclaimed');
  const welcome = await (await t.browse(res.headers.get('location'))).text();
  assert.match(welcome, /Add a profile photo\./);
  assert.match(welcome, /<a class="btn btn-ghost" href="\/account\?n=claimed">Skip for now<\/a>/);
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

test('scripts_key: only in "active" replies, HMAC of the app version, never for a revoked license', async () => {
  const expected = (secret, v) => createHmac('sha256', Buffer.from(secret, 'utf8')).update(`rago-scripts-v1|${v}`).digest('base64');
  const t = await setup({ SCRIPTS_SECRET: 'a'.repeat(64) });
  await t.webhook('checkout.session.completed', t.paidSession('cs_keys', 'keys@rago.gg'));
  await t.browse('/checkout/success?session_id=cs_keys');
  await t.browse('/signup', { form: { email: 'keys@rago.gg', password: 'password123' } });
  const dev = { ...device('K1'), app_version: '1.1.6' };
  let j = await (await t.api('/auth/login', { email: 'keys@rago.gg', password: 'password123', device: dev })).json();
  assert.equal(j.status, 'activation_required');
  assert.equal(j.scripts_key, undefined);
  j = await (await t.api('/licenses/activate', { device: dev }, { authorization: `Bearer ${j.access_token}` })).json();
  assert.equal(j.status, 'active');
  assert.equal(j.scripts_key, expected('a'.repeat(64), '1.1.6'));
  assert.match(j.scripts_key, /^[A-Za-z0-9+/]{43}=$/); // standard base64 with padding, 32 bytes
  // Same PC signing in again, and refresh: the key follows the version the app sends.
  const again = await (await t.api('/auth/login', { email: 'keys@rago.gg', password: 'password123', device: { ...dev, app_version: '1.1.7' } })).json();
  assert.equal(again.status, 'active');
  assert.equal(again.scripts_key, expected('a'.repeat(64), '1.1.7'));
  const r = await (await t.api('/licenses/refresh', { license_token: again.license_token, device: dev })).json();
  assert.equal(r.scripts_key, expected('a'.repeat(64), '1.1.6'));
  // No version sent (older app): no key.
  const none = await (await t.api('/auth/login', { email: 'keys@rago.gg', password: 'password123', device: { ...dev, app_version: '' } })).json();
  assert.equal(none.status, 'active');
  assert.equal(none.scripts_key, undefined);
  // Refunded: the reply is an error, without a key.
  const lic = await t.db.get("SELECT stripe_customer_id, stripe_payment_intent FROM licenses WHERE email = 'keys@rago.gg'");
  await t.webhook('charge.refunded', { id: 'ch_k', object: 'charge', refunded: true, payment_intent: lic.stripe_payment_intent, customer: lic.stripe_customer_id });
  const off = await (await t.api('/licenses/refresh', { license_token: r.license_token, device: dev })).json();
  assert.equal(off.error.code, 'revoked');
  assert.equal(off.scripts_key, undefined);
  assert.doesNotMatch(JSON.stringify(off), /scripts_key/);

  // Development without SCRIPTS_SECRET: the test value. Production without it: no key, and a warning.
  const dev2 = await setup();
  assert.equal(dev2.cfg.scriptsSecret, 'rago-test-scripts-secret');
  const prod = loadConfig({ NODE_ENV: 'production', PUBLIC_URL: 'https://x.test', DATABASE_URL: 'postgres://x', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x', SESSION_SECRET: 's'.repeat(32) });
  assert.equal(prod.scriptsSecret, '');
  assert.ok(prod.warnings.some((w) => /SCRIPTS_SECRET/.test(w)));
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
    SUPABASE_URL: 'https://abcd.supabase.co', RESEND_API_KEY: 're_...', PREVIEW_KEY: 'k'.repeat(16), ADMIN_KEY: 'a'.repeat(16) });
  assert.equal(cfg.publicUrl, 'https://rago-production.up.railway.app');
  assert.equal(cfg.siteUrl, 'https://rago.netlify.app');
  assert.equal(cfg.cancelUrl, 'https://rago.netlify.app/#pricing');
  assert.equal(cfg.resendApiKey, '');
  assert.equal(cfg.warnings.length, 5);
  assert.match(cfg.warnings.join(' '), /SCRIPTS_SECRET is not set/);
  assert.match(cfg.warnings.join(' '), /SUPABASE_SERVICE_ROLE_KEY is not set: profile photos/);
  assert.equal(cfg.subscriptions, true);
  // No price at all: the server still starts, says so in the logs, and /buy explains checkout isn't open.
  const noPrice = loadConfig({ NODE_ENV: 'production', PUBLIC_URL: 'x.app', DATABASE_URL: 'postgres://x', STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'whsec' });
  assert.match(noPrice.warnings.join(' '), /STRIPE_PRICE_MONTHLY/);
  assert.match(noPrice.warnings.join(' '), /SITE_URL is not set/);
  assert.match(noPrice.warnings.join(' '), /ADMIN_KEY is not set/);
  // The example sender from .env.example would be refused by Resend: emails stay off.
  const exampleFrom = loadConfig({ RESEND_API_KEY: 're_real', MAIL_FROM: 'Rago Optimizer <hello@your-domain.com>', SITE_URL: 'https://ragohub.com' });
  assert.equal(exampleFrom.mailEnabled, false);
  assert.match(exampleFrom.warnings.join(' '), /MAIL_FROM.*example[\s\S]*SITE_URL is still the example|SITE_URL is still the example[\s\S]*MAIL_FROM/);
});

test('emails go out from MAIL_FROM, with replies to MAIL_REPLY_TO when set', async () => {
  const sent = [];
  const fetchImpl = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); };
  const env = { RESEND_API_KEY: 're_real', MAIL_FROM: 'Rago Optimizer <noreply@rago.test>', SITE_URL: 'https://rago.test' };
  await createMailer(loadConfig({ ...env, MAIL_REPLY_TO: ' support@rago.test ' }), { fetchImpl }).passwordReset('player@example.org', 'https://account.rago.test/reset/x');
  await createMailer(loadConfig(env), { fetchImpl }).passwordReset('player@example.org', 'https://account.rago.test/reset/x');
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
  assert.equal(sent[0].body.from, 'Rago Optimizer <noreply@rago.test>');
  assert.equal(sent[0].body.reply_to, 'support@rago.test');
  assert.equal('reply_to' in sent[1].body, false);
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
  assert.equal(t.created.at(-1).metadata.ref, undefined); // and not carried to the account form
  t.paidSubscription('cs_fullref', 'late@x.io');
  assert.doesNotMatch(await (await t.browse('/checkout/success?session_id=cs_fullref')).text(), new RegExp(`value="${code}"`));
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
  assert.match(page, /Your code is closed/);
  assert.doesNotMatch(page, /Copy link/);
  assert.doesNotMatch(page, /5% off/);
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

/** A free account that joined the program and has 3 counted players (granted licenses, activated on their own PCs). */
async function affiliateWithThree(t, email) {
  await t.browse('/signup', { form: { email, password: 'password123' } });
  await t.browse('/affiliate/join', { form: {} });
  const aff = await L.findUserByEmail(t.db, email);
  const { code } = await t.db.get('SELECT code FROM affiliates WHERE user_id = ?', [aff.id]);
  const A = await import('../src/affiliates.js');
  for (const n of [1, 2, 3]) {
    const user = await L.createUser(t.db, `${n}-${email}`, 'password123');
    const { license } = await L.grantLicense(t.db, `${n}-${email}`);
    await A.recordReferral(t.db, await A.affiliateByCode(t.db, code), user.id, license);
    await L.activate(t.db, license.id, { fp: { machine_guid: String(n).repeat(64), smbios_uuid: null, board_serial: null }, name: 'P', os: '', appVersion: '' });
  }
  return { aff, code, A };
}

test('a reward Stripe refuses is retried by the hourly sweep, and never shown as given', async () => {
  const t = await setup(SUBS);
  // Subscribed affiliate: the reward pauses their Stripe payments.
  t.paidSubscription('cs_sub', 'subaff@x.io');
  await t.browse('/checkout/success?session_id=cs_sub');
  const { aff, A } = await affiliateWithThree(t, 'subaff@x.io');
  const update = t.stripe.subscriptions.update;
  t.stripe.subscriptions.update = async () => { throw new Error('Stripe is down'); };
  await t.browse('/affiliate');
  let row = await t.db.get('SELECT rewards, reward_granted_at FROM affiliates');
  assert.deepEqual(row, { rewards: 0, reward_granted_at: null });
  assert.equal((await t.db.get("SELECT COUNT(*)::int AS n FROM audit WHERE type = 'affiliate.reward_failed'")).n, 1);
  assert.doesNotMatch(await (await t.browse('/affiliate')).text(), /months of Premium added/);
  // Nobody pending any more, but the sweep still picks this affiliate up.
  assert.deepEqual(await A.affiliatesToEvaluate(t.db, t.cfg), [aff.id]);
  t.stripe.subscriptions.update = update;
  for (const id of await A.affiliatesToEvaluate(t.db, t.cfg)) await A.settleAffiliate(t.db, t.cfg, t.stripe, console, id);
  row = await t.db.get('SELECT rewards, reward_granted_at FROM affiliates');
  assert.equal(row.rewards, 1);
  assert.ok(row.reward_granted_at);
  assert.deepEqual(await A.affiliatesToEvaluate(t.db, t.cfg), []);
});

test('an affiliate on their 6 free months can subscribe: first payment when the reward ends, same PC', async () => {
  const t = await setup(SUBS);
  const { aff } = await affiliateWithThree(t, 'rew@x.io');
  let j = await (await t.api('/auth/login', { email: 'rew@x.io', password: 'password123', device: pc('R') })).json();
  j = await (await t.api('/licenses/activate', { device: pc('R') }, { authorization: `Bearer ${j.access_token}` })).json();
  assert.equal(j.license.billing.interval, 'reward');
  const reward = await L.licenseForUser(t.db, aff.id);
  assert.match(await (await t.browse('/account')).text(), /Subscribe now, first payment on/);

  // Checkout opens (no "you already have Premium"), with the subscription starting at the reward's end.
  const res = await t.browse('/buy?interval=month');
  assert.equal(res.headers.get('location'), 'https://checkout.stripe.com/c/pay/cs_new');
  assert.equal(t.created.at(-1).subscription_data.trial_end, Math.floor(Number(reward.current_period_end) / 1000));
  t.paidSubscription('cs_rew', 'rew@x.io', 'month', { client_reference_id: aff.id, payment_status: 'no_payment_required' });
  assert.equal((await t.browse('/checkout/success?session_id=cs_rew')).headers.get('location'), '/account?n=claimed');
  const sub = await L.licenseForUser(t.db, aff.id);
  assert.notEqual(sub.id, reward.id);
  assert.equal(sub.plan, 'month');
  assert.equal(sub.status, 'active');
  assert.equal((await L.getLicense(t.db, reward.id)).status_reason, 'replaced');
  assert.equal((await L.getDevice(t.db, sub.id)).name, 'GAMING-PC'); // the PC moved with it
  // The app's token of the reward keeps working on that PC: refresh moves it to the subscription.
  const r = await (await t.api('/licenses/refresh', { license_token: j.license_token, device: pc('R') })).json();
  assert.equal(r.status, 'active');
  assert.equal(r.license.billing.interval, 'month');
  assert.match(await (await t.browse('/account')).text(), /Monthly/);

  // After its end, a reward that wasn't replaced doesn't block buying either.
  const t2 = await setup(SUBS);
  const { aff: a2 } = await affiliateWithThree(t2, 'late@x.io');
  await t2.api('/auth/login', { email: 'late@x.io', password: 'password123', device: pc('L') });
  await t2.db.run("UPDATE licenses SET current_period_end = ? WHERE user_id = ? AND plan = 'reward'", [Date.now() - 1000, a2.id]);
  assert.equal((await t2.browse('/buy?interval=year')).headers.get('location'), 'https://checkout.stripe.com/c/pay/cs_new');
  assert.equal(t2.created.at(-1).subscription_data.trial_end, undefined);
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
  assert.equal(r.headers.get('location'), '/account/profile?welcome=1&to=%2Faffiliate');
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

test('site pop-up: set from /admin with ADMIN_KEY, code created in Stripe for the first 15 customers, hidden once used up', async () => {
  const KEY = 'admin-key-0123456789abcdef';
  const t = await setup({ ...SUBS, ADMIN_KEY: KEY });
  const promo = async () => {
    const res = await t.app.request('/api/v1/promo');
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    return (await res.json()).promo;
  };
  // Default settings point at RAGO15, which this Stripe doesn't have: no pop-up rather than a code that fails.
  assert.equal(await promo(), null);

  // /admin asks for the key; a wrong key is refused, the right one opens it for 7 days, on /admin only.
  assert.match(await (await t.browse('/admin')).text(), /Clé admin/);
  assert.equal((await t.browse('/admin/popup', { form: { code: 'RAGO50', percent: '50' } })).headers.get('location'), '/admin');
  assert.equal((await t.browse('/admin/login', { form: { key: 'wrong-key-0123456789' } })).status, 401);
  const login = await t.app.request('/admin/login', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/x-www-form-urlencoded' }, body: `key=${KEY}` });
  assert.equal(login.status, 303);
  assert.match(login.headers.get('set-cookie'), /rago_admin=.*Path=\/admin.*HttpOnly.*SameSite=Strict/i);
  await t.browse('/admin/login', { form: { key: KEY } });
  const page = await (await t.browse('/admin')).text();
  assert.match(page, /Masquée/);
  assert.match(page, /RAGO15 n’existe pas dans Stripe/);
  assert.equal((await t.browse('/admin')).headers.get('cache-control'), 'no-store');

  // A new code without a percent: refused, nothing created.
  const typed = { enabled: 'on', code: 'rago50', percent: '', limit: '15', eyebrow: 'Launch offer', title: 'Get {percent}% off now!', text: 'For the first {total} players, on your first payment.' };
  let res = await t.browse('/admin/popup', { form: typed });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /RAGO50 n’existe pas encore dans Stripe/);
  assert.equal(t.promos.length, 0);

  // With 50 %: created in Stripe, 15 uses, new customers only, on the first payment.
  res = await t.browse('/admin/popup', { form: { ...typed, percent: '50' } });
  assert.equal(res.headers.get('location'), '/admin?n=created');
  assert.deepEqual(t.coupons['rago-promo-50-once'], { object: 'coupon', id: 'rago-promo-50-once', percent_off: 50, duration: 'once', name: '50% off' });
  const made = t.promos.find((p) => p.code === 'RAGO50');
  assert.equal(made.max_redemptions, 15);
  assert.equal(made.restrictions.first_time_transaction, true);
  assert.deepEqual(made.promotion, { type: 'coupon', coupon: 'rago-promo-50-once' });
  assert.deepEqual(await promo(), { code: 'RAGO50', percent: 50, eyebrow: 'Launch offer', title: 'Get {percent}% off now!', text: 'For the first {total} players, on your first payment.', total: 15, left: 15 });
  assert.match(await (await t.browse('/admin?n=created')).text(), /Affichée sur le site[\s\S]*0 sur 15[\s\S]*Get <span>50<\/span>% off now!/);

  // Stripe can't change the percent or the limit of an existing code: a new code is asked for.
  res = await t.browse('/admin/popup', { form: { ...typed, percent: '40' } });
  assert.match(await res.text(), /RAGO50 existe déjà dans Stripe avec 50 % de réduction/);
  res = await t.browse('/admin/popup', { form: { ...typed, percent: '50', limit: '20' } });
  assert.match(await res.text(), /RAGO50 existe déjà dans Stripe pour 15 clients/);
  // The words change freely; the site sees it at once (the cache is cleared on save).
  res = await t.browse('/admin/popup', { form: { ...typed, percent: '50', text: 'Only {left} left.' } });
  assert.equal(res.headers.get('location'), '/admin?n=saved');
  assert.equal((await promo()).text, 'Only {left} left.');
  assert.equal(t.promos.length, 1);

  // Uses taken: the count follows after a purchase; all 15 used: no pop-up, and /buy no longer applies the code.
  made.times_redeemed = 14;
  await t.webhook('checkout.session.completed', t.paidSubscription('cs_pop', 'pop@example.com', 'year'));
  assert.equal((await promo()).left, 1);
  await t.browse('/buy?interval=year&promo=RAGO50');
  assert.deepEqual(t.created.at(-1).discounts, [{ promotion_code: made.id }]);
  made.times_redeemed = 15;
  await t.webhook('checkout.session.completed', t.paidSubscription('cs_pop2', 'pop2@example.com', 'year'));
  assert.equal(await promo(), null);
  assert.match(await (await t.browse('/admin')).text(), /Les 15 utilisations de RAGO50 sont prises/);
  await t.browse('/buy?interval=year&promo=RAGO50');
  assert.equal(t.created.at(-1).discounts, undefined);
  assert.equal(t.created.at(-1).allow_promotion_codes, true);

  // Turned off: hidden, even with Stripe out of reach.
  t.stripe.promotionCodes.list = async () => { throw new Error('Stripe down'); };
  res = await t.browse('/admin/popup', { form: { ...typed, enabled: '' } });
  assert.equal(res.headers.get('location'), '/admin?n=saved');
  assert.equal(await promo(), null);
  assert.match(await (await t.browse('/admin')).text(), /Tu l’as désactivée/);

  // Signed out of /admin: the form is closed again.
  await t.browse('/admin/logout', { form: {} });
  assert.match(await (await t.browse('/admin')).text(), /Clé admin/);
});

test('/admin is a 404 without ADMIN_KEY (or with one under 16 characters)', async () => {
  for (const env of [{}, { ADMIN_KEY: 'short' }]) {
    const t = await setup(env);
    assert.equal((await t.browse('/admin')).status, 404);
    assert.equal((await t.browse('/admin/login', { form: { key: 'short' } })).status, 404);
  }
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

test('before the launch: signup, checkout, download and affiliate pages wait, sign-in and the app keep working', async () => {
  const KEY = 'team-preview-key-0123456789';
  const t = await setup({ LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString(), PREVIEW_KEY: KEY, SITE_URL: 'https://rago-optimizer.com' });
  for (const path of ['/signup', '/buy?interval=month', '/download', '/affiliate']) {
    const res = await t.app.request(path);
    assert.equal(res.status, 302, path);
    assert.equal(res.headers.get('location'), 'https://rago-optimizer.com/', path);
    assert.equal(res.headers.get('cache-control'), 'no-store', path);
  }
  const post = await t.app.request('/signup', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a%40b.io&password=password123' });
  assert.equal(post.status, 302);
  assert.ok(!(await L.findUserByEmail(t.db, 'a@b.io')));
  // Existing accounts and installed apps.
  await L.createUser(t.db, 'old@rago.gg', 'password123');
  await L.grantLicense(t.db, 'old@rago.gg', 'test');
  assert.equal((await t.app.request('/login')).status, 200);
  assert.equal((await t.browse('/login', { form: { email: 'old@rago.gg', password: 'password123' } })).headers.get('location'), '/account');
  assert.equal((await t.browse('/account')).status, 200);
  const j = await (await t.api('/auth/login', { email: 'old@rago.gg', password: 'password123', device: device('A') })).json();
  assert.equal(j.status, 'activation_required');
  assert.equal((await t.app.request('/healthz')).status, 200);

  // A wrong key is a plain 404; the team link sets the cookie for the whole domain and opens the pages.
  assert.equal((await t.app.request('/acces/not-the-key-0123456789')).status, 404);
  const res = await t.app.request(`/acces/${KEY}`, { headers: { host: 'account.rago-optimizer.com' } });
  assert.equal(res.status, 302);
  const set = res.headers.get('set-cookie');
  assert.match(set, /Domain=rago-optimizer\.com/);
  const pass = set.match(/^rago_preview=([^;]+)/)[1];
  assert.equal(pass, createHmac('sha256', KEY).update('rago-preview-v1').digest('base64url'));
  // The same cookie as the one the site's link sets.
  const signup = await t.app.request('/signup', { headers: { cookie: `rago_preview=${pass}` } });
  assert.equal(signup.status, 200);
  assert.equal((await t.app.request('/signup', { headers: { cookie: `rago_preview=${pass}x` } })).status, 302);
  // Railway address: host-only cookie.
  assert.doesNotMatch((await t.app.request(`/acces/${KEY}`, { headers: { host: 'rago-production.up.railway.app' } })).headers.get('set-cookie'), /Domain/);

  // After the launch, everyone.
  const open = await setup({ LAUNCH_AT: new Date(Date.now() - 1000).toISOString(), PREVIEW_KEY: KEY });
  assert.equal((await open.app.request('/signup')).status, 200);
  // Without PREVIEW_KEY, nobody gets through before the launch.
  const shut = await setup({ LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString(), SITE_URL: 'https://rago-optimizer.com' });
  assert.equal((await shut.app.request(`/acces/${KEY}`)).status, 404);
  assert.equal((await shut.app.request('/signup', { headers: { cookie: `rago_preview=${pass}` } })).status, 302);
  // Site served by this server (SITE_DIR variant): a waiting page instead.
  assert.equal((await (await setup({ LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString() })).app.request('/buy')).status, 503);
  // Production defaults to the launch date.
  const prod = loadConfig({ NODE_ENV: 'production', PUBLIC_URL: 'https://x.test', DATABASE_URL: 'postgres://x', STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'whsec' });
  assert.equal(prod.launchAt, Date.parse('2026-10-10T13:00:00Z'));
  assert.equal(loadConfig({}).launchAt, 0);
});

// ---------- reviews and profile photos (2026-10-09) ----------

const picture = (w, h, format = 'png') => sharp({ create: { width: w, height: h, channels: 3, background: { r: 230, g: 50, b: 40 } } })[format]().toBuffer();
const call = (t, method, path, { token, json, body, headers = {} } = {}) => t.app.request(`/api/v1${path}`, {
  method,
  headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(json ? { 'content-type': 'application/json' } : {}), ...headers },
  body: json ? JSON.stringify(json) : body,
});
const errCode = async (res) => (await res.json()).error?.code;

test('reviews: signed in from the app, 1 to 5 stars and a comment checked by the server, one per account, shown on the site', async () => {
  const t = await setup();
  await t.browse('/signup', { form: { email: 'fan@rago.gg', password: 'password123' } });

  // No review yet: the site gets an empty list and hides its Reviews section.
  let pub = await t.app.request('/api/v1/reviews');
  assert.equal(pub.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual(await pub.json(), { count: 0, average: null, reviews: [] });

  assert.equal((await call(t, 'POST', '/account/login', { json: { email: 'fan@rago.gg', password: 'nope' } })).status, 401);
  const login = await (await call(t, 'POST', '/account/login', { json: { email: ' Fan@rago.gg', password: 'password123' } })).json();
  assert.ok(login.account_token);
  assert.deepEqual(login.account, { email: 'fan@rago.gg', name: null, avatar_url: null });
  assert.equal(login.review, null);
  const token = login.account_token;
  assert.equal((await call(t, 'GET', '/account/me')).status, 401);
  assert.equal((await call(t, 'GET', '/account/me', { token: 'forged' })).status, 401);

  const put = (json) => call(t, 'PUT', '/account/review', { token, json });
  assert.equal(await errCode(await put({ comment: 'Great', name: 'Fan' })), 'invalid_rating'); // no stars
  for (const rating of [0, 6, 4.5, '5 stars', null]) assert.equal(await errCode(await put({ rating, comment: 'Great', name: 'Fan' })), 'invalid_rating', String(rating));
  assert.equal(await errCode(await put({ rating: 5, name: 'Fan' })), 'empty_comment');
  assert.equal(await errCode(await put({ rating: 5, comment: '  \n ​ ', name: 'Fan' })), 'empty_comment');
  assert.equal(await errCode(await put({ rating: 5, comment: 'x'.repeat(601), name: 'Fan' })), 'comment_too_long');
  assert.equal(await errCode(await put({ rating: 5, comment: 'Great' })), 'name_required');
  for (const name of ['x', 'me@mail.com', 'rago.gg', 'https://spam', '<b>Fan</b>', 'a'.repeat(33)]) assert.equal(await errCode(await put({ rating: 5, comment: 'Great', name })), 'invalid_name', name);
  assert.equal((await put({ rating: 5, comment: 'Great', name: 'Fan' }).then((r) => r.status)), 200);
  await t.db.run('DELETE FROM reviews');
  await t.db.run('UPDATE users SET display_name = NULL');
  // A refused review saves nothing, not even the name.
  assert.equal(await errCode(await put({ rating: 9, comment: 'Great', name: 'Fan' })), 'invalid_rating');
  assert.equal((await L.findUserByEmail(t.db, 'fan@rago.gg')).display_name, null);

  const ok = await (await put({ rating: 4, comment: '  Ping steadier on Hypixel.\n\n\n\n<script>alert(1)</script>  ', name: '  Fan   Boy ', app_version: '1.1.8' })).json();
  assert.deepEqual(ok.account, { email: 'fan@rago.gg', name: 'Fan Boy', avatar_url: null });
  assert.equal(ok.review.rating, 4);
  assert.equal(ok.review.comment, 'Ping steadier on Hypixel.\n\n<script>alert(1)</script>');
  assert.equal(ok.review.hidden, false);
  // The account page shows it as text, never as HTML.
  const prof = await (await t.browse('/account/profile')).text();
  assert.match(prof, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(prof, /<script>alert/);

  // Editing replaces it: still one review for the account, the name kept.
  const edited = await (await put({ rating: 5, comment: 'Even better after a restart.' })).json();
  assert.equal(edited.review.rating, 5);
  assert.equal(edited.account.name, 'Fan Boy');
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM reviews')).n, 1);

  pub = await (await t.app.request('/api/v1/reviews')).json();
  assert.equal(pub.count, 1);
  assert.equal(pub.average, 5);
  assert.deepEqual(pub.reviews.map((r) => [r.name, r.rating, r.comment, r.avatar_url]), [['Fan Boy', 5, 'Even better after a restart.', null]]);
  assert.match(pub.reviews[0].date, /^\d{4}-\d{2}-\d{2}$/);
  assert.doesNotMatch(JSON.stringify(pub), /fan@rago\.gg/); // the email is never public

  // Support hides it: gone from the site, marked hidden for its author.
  const fan = await L.findUserByEmail(t.db, 'fan@rago.gg');
  assert.ok(await R.setReviewStatus(t.db, fan.id, 'hidden'));
  assert.equal((await R.publicReviews(t.db, t.cfg)).count, 0);
  assert.equal((await (await call(t, 'GET', '/account/me', { token })).json()).review.hidden, true);

  // Signing out in the app ends that token; a new password ends every app sign-in.
  const other = (await (await call(t, 'POST', '/account/login', { json: { email: 'fan@rago.gg', password: 'password123' } })).json()).account_token;
  assert.equal((await call(t, 'POST', '/account/logout', { token })).status, 200);
  assert.equal((await call(t, 'GET', '/account/me', { token })).status, 401);
  assert.equal((await call(t, 'GET', '/account/me', { token: other })).status, 200);
  await t.browse('/account/password', { form: { current: 'password123', password: 'new password 1' } });
  assert.equal((await call(t, 'GET', '/account/me', { token: other })).status, 401);
});

test('reviews: the player can delete their review, from the app or from the account page, and it leaves the site', async () => {
  const t = await setup();
  await t.browse('/signup', { form: { email: 'gone@rago.gg', password: 'password123' } });
  const token = (await (await call(t, 'POST', '/account/login', { json: { email: 'gone@rago.gg', password: 'password123' } })).json()).account_token;
  const put = () => call(t, 'PUT', '/account/review', { token, json: { rating: 4, comment: 'Smooth.', name: 'Gone Soon' } });
  const shown = async () => (await (await t.app.request('/api/v1/reviews')).json()).count;

  // From the app.
  assert.equal((await put()).status, 200);
  assert.equal(await shown(), 1);
  assert.equal((await call(t, 'DELETE', '/account/review')).status, 401);
  let res = await (await call(t, 'DELETE', '/account/review', { token })).json();
  assert.equal(res.review, null);
  assert.equal(res.account.name, 'Gone Soon'); // the public name and photo stay
  assert.equal(await shown(), 0);
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM reviews')).n, 0);
  assert.equal((await call(t, 'DELETE', '/account/review', { token })).status, 200); // nothing left to delete: same answer

  // From the account page, after leaving a new one.
  assert.equal((await put()).status, 200);
  let html = await (await t.browse('/account/profile')).text();
  assert.match(html, /action="\/account\/profile\/review\/delete"/);
  res = await t.browse('/account/profile/review/delete', { form: {} });
  assert.equal(res.headers.get('location'), '/account/profile?n=review');
  html = await (await t.browse('/account/profile?n=review')).text();
  assert.match(html, /Review deleted/);
  assert.match(html, /No review yet/);
  assert.doesNotMatch(html, /review\/delete/);
  assert.equal(await shown(), 0);
  assert.ok(await t.db.get("SELECT 1 FROM audit WHERE type = 'review.deleted'"));
});

test('reviews: a Premium PC uses its license token, which stops working once the license is revoked', async () => {
  const t = await setup();
  await t.browse('/signup', { form: { email: 'pro@rago.gg', password: 'password123' } });
  await L.grantLicense(t.db, 'pro@rago.gg', 'test');
  const login = await (await t.api('/auth/login', { email: 'pro@rago.gg', password: 'password123', device: device('G1') })).json();
  assert.equal((await call(t, 'GET', '/account/me', { token: login.access_token })).status, 401); // an access token isn't enough
  const active = await appActivate(t, 'pro@rago.gg', device('G1'));
  const me = await (await call(t, 'GET', '/account/me', { token: active.license_token })).json();
  assert.equal(me.account.email, 'pro@rago.gg');
  assert.equal((await call(t, 'PUT', '/account/review', { token: active.license_token, json: { rating: 5, comment: 'Clean app.', name: 'Pro' } })).status, 200);
  const lic = await L.licenseForUser(t.db, (await L.findUserByEmail(t.db, 'pro@rago.gg')).id);
  await L.setLicenseStatus(t.db, lic.id, 'revoked', 'manual');
  assert.equal(await errCode(await call(t, 'GET', '/account/me', { token: active.license_token })), 'invalid_token');
});

test('profile photo from the app: checked, cropped to 256 x 256 WebP without metadata, old one deleted, served to the site', async () => {
  const t = await setup();
  await t.browse('/signup', { form: { email: 'pic@rago.gg', password: 'password123' } });
  const { account_token: token } = await (await call(t, 'POST', '/account/login', { json: { email: 'pic@rago.gg', password: 'password123' } })).json();
  const upload = (body, type = 'image/png') => call(t, 'PUT', '/account/avatar', { token, body, headers: { 'content-type': type } });

  const big = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#3355ff' } }).jpeg({ quality: 95 }).withExif({ IFD0: { Copyright: 'Rago test', Artist: 'someone' } }).toBuffer();
  assert.ok((await sharp(big).metadata()).exif);
  let res = await upload(big, 'image/jpeg');
  assert.equal(res.status, 200);
  const first = (await res.json()).account.avatar_url;
  assert.match(first, /^http:\/\/localhost\/avatars\/[A-Za-z0-9_-]{20,40}\.webp$/);
  const img = await t.app.request(new URL(first).pathname);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/webp');
  assert.equal(img.headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.match(img.headers.get('cache-control'), /max-age=31536000, immutable/);
  const bytes = Buffer.from(await img.arrayBuffer());
  const meta = await sharp(bytes).metadata();
  assert.deepEqual([meta.format, meta.width, meta.height, meta.exif], ['webp', 256, 256, undefined]);
  assert.ok(bytes.length < 20 * 1024 && bytes.length * 5 < big.length, `${bytes.length} bytes`);

  // A new photo replaces the old one, which is deleted.
  res = await upload(await sharp({ create: { width: 64, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).gif().toBuffer(), 'image/gif');
  const second = (await res.json()).account.avatar_url;
  assert.notEqual(second, first);
  assert.equal((await t.app.request(new URL(first).pathname)).status, 404);
  assert.equal((await t.app.request(new URL(second).pathname)).status, 200);

  // Refused: not a picture, a picture's first bytes over garbage, an SVG, empty, over 5 MB.
  assert.equal(await errCode(await upload(Buffer.from('MZ not a picture at all'))), 'invalid_image');
  assert.equal(await errCode(await upload(Buffer.concat([(await picture(10, 10)).subarray(0, 16), Buffer.alloc(200, 7)]))), 'invalid_image');
  assert.equal(await errCode(await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'), 'image/svg+xml')), 'invalid_image');
  assert.equal(await errCode(await upload(Buffer.alloc(0))), 'invalid_image');
  const tooBig = await upload(Buffer.concat([await picture(32, 32), Buffer.alloc(5 * 1024 * 1024)]));
  assert.equal(tooBig.status, 413);
  assert.equal(await errCode(tooBig), 'image_too_large');
  assert.equal((await (await call(t, 'GET', '/account/me', { token })).json()).account.avatar_url, second);

  // The site shows it with the review.
  await call(t, 'PUT', '/account/review', { token, json: { rating: 5, comment: 'Nice.', name: 'Pic' } });
  assert.equal((await (await t.app.request('/api/v1/reviews')).json()).reviews[0].avatar_url, second);

  res = await call(t, 'DELETE', '/account/avatar', { token });
  assert.equal((await res.json()).account.avatar_url, null);
  assert.equal((await t.app.request(new URL(second).pathname)).status, 404);
  assert.equal((await (await t.app.request('/api/v1/reviews')).json()).reviews[0].avatar_url, null);
  assert.equal((await t.app.request('/avatars/..%2F..%2Fdownloads%2Fx.exe')).status, 404);
  assert.equal((await t.app.request('/avatars/short.webp')).status, 404);
});

test('profile photo on the site: offered after sign-up, skippable, uploaded as a form, shown on the account pages', async () => {
  const t = await setup();
  const r = await t.browse('/signup', { form: { email: 'web@rago.gg', password: 'password123' } });
  assert.equal(r.headers.get('location'), '/account/profile?welcome=1&to=%2Faccount');
  let html = await (await t.browse(r.headers.get('location'))).text();
  assert.match(html, /Add a profile photo\./);
  assert.match(html, /href="\/account">Skip for now</);
  assert.match(html, /<span class="avatar avatar-lg avatar-none" aria-hidden="true">W<\/span>/); // default: first letter
  // Only our own pages after the step.
  html = await (await t.browse('/account/profile?welcome=1&to=https%3A%2F%2Fevil.example')).text();
  assert.doesNotMatch(html, /evil\.example/);
  assert.doesNotMatch(html, /Skip for now/);

  const cookie = [...t.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const form = async (file, extra = {}) => {
    const fd = new FormData();
    if (file) fd.append('photo', new Blob([file.bytes], { type: file.type }), file.name);
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    return t.app.request('/account/profile/photo', { method: 'POST', headers: { cookie, origin: 'http://localhost' }, body: fd });
  };
  let res = await form({ bytes: Buffer.from('hello'), type: 'image/png', name: 'fake.png' }, { welcome: '1', to: '/account' });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /isn&#39;t a picture we can use/);
  res = await form({ bytes: await picture(500, 400, 'webp'), type: 'image/webp', name: 'me.webp' }, { welcome: '1', to: '/account' });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/account/profile?n=photo&welcome=1&to=%2Faccount');
  html = await (await t.browse(res.headers.get('location'))).text();
  assert.match(html, /Photo saved\./);
  assert.match(html, /href="\/account">Continue/);
  const user = await L.findUserByEmail(t.db, 'web@rago.gg');
  assert.match(user.avatar_key, P.AVATAR_FILE);
  const dash = await (await t.browse('/account')).text();
  assert.match(dash, new RegExp(`<img class="avatar avatar-sm" src="/avatars/${user.avatar_key}"`));

  res = await t.browse('/account/profile/name', { form: { name: 'Web Player' } });
  assert.equal(res.headers.get('location'), '/account/profile?n=name');
  assert.equal((await L.findUserByEmail(t.db, 'web@rago.gg')).display_name, 'Web Player');
  res = await t.browse('/account/profile/name', { form: { name: 'web@rago.gg' } });
  assert.equal(res.status, 400);
  res = await t.browse('/account/profile/photo/remove', { form: {} });
  assert.equal(res.headers.get('location'), '/account/profile?n=removed');
  assert.equal((await L.findUserByEmail(t.db, 'web@rago.gg')).avatar_key, null);
  assert.equal((await t.app.request(`/avatars/${user.avatar_key}`)).status, 404);
  // Signed out: the profile pages ask to sign in.
  t.jar.clear();
  assert.equal((await t.browse('/account/profile')).headers.get('location'), '/login');
});

test('profile photos in Supabase Storage: private bucket created on the first upload, old photo deleted', async () => {
  const objects = new Map();
  const calls = [];
  let bucket = null;
  const fetchImpl = async (url, opts = {}) => {
    const { pathname } = new URL(url);
    const method = opts.method || 'GET';
    calls.push(`${method} ${pathname}`);
    assert.equal(opts.headers.apikey, 'sb_secret_test');
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (method === 'POST' && pathname === '/storage/v1/bucket') { bucket = JSON.parse(opts.body); return json(200, { name: bucket.name }); }
    const m = pathname.match(/^\/storage\/v1\/object\/(authenticated\/)?avatars\/(.+)$/);
    if (!m) return json(400, { error: 'unexpected' });
    if (!bucket) return json(400, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' });
    if (method === 'POST') { assert.equal(opts.headers['Content-Type'], 'image/webp'); objects.set(m[2], Buffer.from(opts.body)); return json(200, { Key: `avatars/${m[2]}` }); }
    if (method === 'DELETE') { objects.delete(m[2]); return json(200, {}); }
    return objects.has(m[2]) ? new Response(objects.get(m[2]), { status: 200 }) : json(400, { error: 'not_found', message: 'Object not found' });
  };
  const t = await setup({ SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test' }, { fetchImpl });
  await t.browse('/signup', { form: { email: 'sb@rago.gg', password: 'password123' } });
  const { account_token: token } = await (await call(t, 'POST', '/account/login', { json: { email: 'sb@rago.gg', password: 'password123' } })).json();
  const up = async () => (await (await call(t, 'PUT', '/account/avatar', { token, body: await picture(300, 300), headers: { 'content-type': 'image/png' } })).json()).account.avatar_url;
  const first = (await up()).split('/').pop();
  assert.deepEqual(bucket, { id: 'avatars', name: 'avatars', public: false, file_size_limit: 1048576, allowed_mime_types: ['image/webp'] });
  assert.deepEqual(calls, [`POST /storage/v1/object/avatars/${first}`, 'POST /storage/v1/bucket', `POST /storage/v1/object/avatars/${first}`]);
  const second = (await up()).split('/').pop();
  assert.deepEqual([...objects.keys()], [second]);
  assert.ok(calls.includes(`DELETE /storage/v1/object/avatars/${first}`));
  // Another server (or after a restart): read from the bucket, then from memory.
  const store = P.createAvatarStore(t.cfg, { fetchImpl });
  calls.length = 0;
  assert.ok((await store.get(second)).equals(objects.get(second)));
  assert.ok(await store.get(second));
  assert.deepEqual(calls, [`GET /storage/v1/object/authenticated/avatars/${second}`]);
  assert.equal(await store.get('missingmissingmissing00.webp'), null);
});

