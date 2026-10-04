import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPublicKey } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Stripe from 'stripe';

import { loadConfig } from '../src/config.js';
import { ensureKeys, openDb, openMemoryDb } from '../src/db.js';
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
  stripe.checkout.sessions.create = async (params) => ({ id: 'cs_new', url: 'https://checkout.stripe.com/c/pay/cs_new', params });
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
  });
  return { cfg, db, keys, app, browse, api, webhook, paidSession, mails, jar, sessions };
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
  assert.match(dl.headers.get('content-disposition'), /RagoHub-Setup\.exe/);
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
  assert.equal((await t.browse(path)).status, 410);
});

test('signed-in buyer gets the license directly; second purchase is flagged', async () => {
  const t = await setup();
  await t.browse('/signup', { form: { email: 'me@x.io', password: 'password123' } });
  const buy = await t.browse('/buy');
  assert.equal(buy.status, 303);
  assert.match(buy.headers.get('location'), /checkout\.stripe\.com/);
  const user = await L.findUserByEmail(t.db, 'me@x.io');
  t.paidSession('cs_test_4', 'me@x.io', { client_reference_id: user.id });
  const r = await t.browse('/checkout/success?session_id=cs_test_4');
  assert.equal(r.headers.get('location'), '/account?n=claimed');
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
  assert.match(await r.text(), /Get Rago Hub Premium/);
  assert.equal((await t.browse('/account/download')).headers.get('location'), '/account');
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
  const t = await setup({ PUBLIC_URL: 'https://account.rago.test', SITE_URL: 'https://rago.test' });
  assert.equal((await t.app.request('/')).headers.get('location'), 'https://rago.test/');
  let params;
  const create = async (p) => { params = p; return { url: 'https://checkout.stripe.com/x' }; };
  const { createCheckout } = await import('../src/billing.js');
  await createCheckout({ checkout: { sessions: { create } } }, t.cfg, null);
  assert.equal(params.cancel_url, 'https://rago.test/#pricing');
  assert.equal(params.success_url, 'https://account.rago.test/checkout/success?session_id={CHECKOUT_SESSION_ID}');
  assert.match(await (await t.app.request('/login')).text(), /href="https:\/\/rago\.test\/"/);
});

test('installer from Supabase Storage: signed link for paying accounts only', async () => {
  const calls = [];
  const t = await setup({ SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJservice-key' }, {
    fetchImpl: async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ signedURL: '/object/sign/downloads/RagoHub-Setup.exe?token=t0k' })); },
  });
  await t.browse('/signup', { form: { email: 'st@x.io', password: 'password123' } });
  assert.equal((await t.browse('/account/download')).headers.get('location'), '/account');
  assert.equal(calls.length, 0);
  await L.grantLicense(t.db, 'st@x.io');
  const r = await t.browse('/account/download');
  assert.equal(r.headers.get('location'), 'https://abc.supabase.co/storage/v1/object/sign/downloads/RagoHub-Setup.exe?token=t0k&download=RagoHub-Setup.exe');
  assert.equal(calls[0].url, 'https://abc.supabase.co/storage/v1/object/sign/downloads/RagoHub-Setup.exe');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer eyJservice-key');
  assert.equal(calls[0].init.headers.apikey, 'eyJservice-key');
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
    DATABASE_URL: 'postgres://x', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_ID: 'price_x', STRIPE_WEBHOOK_SECRET: 'whsec_a_remplir_a_l_etape_6',
    SUPABASE_URL: 'https://abcd.supabase.co', RESEND_API_KEY: 're_...' });
  assert.equal(cfg.publicUrl, 'https://rago-production.up.railway.app');
  assert.equal(cfg.siteUrl, 'https://rago.netlify.app');
  assert.equal(cfg.cancelUrl, 'https://rago.netlify.app/#pricing');
  assert.equal(cfg.resendApiKey, '');
  assert.equal(cfg.warnings.length, 3);
});

test('webhook rejects bad signatures; cross-site form posts are refused', async () => {
  const t = await setup();
  const r = await t.app.request('/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=bad' }, body: '{}' });
  assert.equal(r.status, 400);
  const x = await t.app.request('/login', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a&password=b' });
  assert.equal(x.status, 403);
});
