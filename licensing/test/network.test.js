import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

import { loadConfig } from '../src/config.js';
import { ensureKeys, openMemoryDb } from '../src/db.js';
import { loadKeys } from '../src/tokens.js';
import { createApp } from '../src/app.js';
import { createMailer } from '../src/mailer.js';
import { createGeo, dbipUrl } from '../src/geo.js';
import { parseReport, purgeNetworkReports } from '../src/network.js';
import { writeMmdb } from './mmdb.js';

const quiet = { log() {}, info() {}, error() {} };
const CITY = writeMmdb([
  { network: '81.2.69.0/24', data: { city: { names: { en: 'London', fr: 'Londres' } }, continent: { code: 'EU' }, country: { iso_code: 'GB', names: { en: 'United Kingdom' } }, subdivisions: [{ names: { en: 'England' } }], location: { latitude: 51.5142, longitude: -0.0931 } } },
  { network: '90.0.0.0/16', data: { city: { names: { en: 'Lyon' } }, country: { iso_code: 'FR' }, subdivisions: [{ names: { en: 'Auvergne-Rhône-Alpes' } }] } },
  { network: '2a01:e0a::/32', data: { city: { names: { en: 'Paris' } }, country: { iso_code: 'FR' }, subdivisions: [{ names: { en: 'Île-de-France' } }] } },
], 'DBIP-City-Lite');
const ASN = writeMmdb([
  { network: '81.2.69.0/24', data: { autonomous_system_number: 20712, autonomous_system_organization: 'Andrews & Arnold Ltd' } },
  { network: '90.0.0.0/16', data: { autonomous_system_number: 3215, autonomous_system_organization: 'Orange' } },
], 'DBIP-ASN-Lite');

/** db-ip.com as the tests see it: the month's files (gzipped, like the real ones), or a 404. */
function dbip(files = { city: true, asn: true }) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const kind = url.includes('city') ? 'city' : 'asn';
    if (files[kind] !== true && files[kind] !== url) return new Response('not found', { status: 404 });
    return new Response(gzipSync(kind === 'city' ? CITY : ASN));
  };
  return { fetchImpl, calls };
}

const RESULTS = [
  { id: 'hypixel', method: 'mc', ping: 92.4, median: 91.0, best: 88.2, worst: 120.6, jitter: 3.1, loss: 0, lost: 0, samples: 8, spikes: 1, series: [90, 91], error: null },
  { id: 'paris', method: 'tcp', ping: 12.3, median: 11.9, best: 10.2, worst: 30.5, jitter: 1.4, loss: 0.025, lost: 1, samples: 40, spikes: 0, error: null },
  { id: 'virginia', method: 'tcp', ping: null, median: null, best: null, worst: null, jitter: null, loss: 1, lost: 40, samples: 40, spikes: 0, error: 'timeout' },
];

async function setup(env = {}, geoFiles) {
  const cfg = loadConfig({ PUBLIC_URL: 'http://localhost', TRUST_PROXY: '1', ADMIN_KEY: 'admin-key-0123456789abcdef', ...env });
  const db = await openMemoryDb();
  await ensureKeys(db, cfg);
  const { fetchImpl, calls } = dbip(geoFiles);
  const geo = createGeo(cfg, { fetchImpl, log: quiet });
  const app = createApp({ cfg, db, keys: loadKeys(cfg.signingKeyPem), stripe: null, mailer: createMailer(cfg), log: quiet, geo });
  const send = (body, { ip = '81.2.69.160', device = 'a1b2c3d4e5f60718293a4b5c' } = {}) => app.request('/api/v1/network/report', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': ip, ...(device ? { 'x-rago-device': device } : {}) }, body: JSON.stringify(body),
  });
  const admin = async (path) => {
    const login = await app.request('/admin/login', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/x-www-form-urlencoded' }, body: `key=${cfg.adminKey}` });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    return app.request(path, { headers: { cookie } });
  };
  return { cfg, db, app, geo, send, admin, calls };
}

test('network test: stored with the city, region, country and provider of the IP, never the IP itself', async () => {
  const t = await setup();
  const res = await t.send({ app: '1.2.1', results: RESULTS });
  assert.equal(res.status, 204);
  const report = await t.db.get('SELECT * FROM network_reports');
  assert.deepEqual({ ...report, id: undefined, at: undefined }, {
    id: undefined, at: undefined, device: 'a1b2c3d4e5f60718293a4b5c', app_version: '1.2.1',
    country: 'GB', region: 'England', city: 'London', asn: 20712, isp: 'Andrews & Arnold Ltd',
  });
  const results = await t.db.all('SELECT target, method, ping, median, best, worst, jitter, loss, samples, spikes, error FROM network_results ORDER BY target');
  assert.deepEqual(results.map((r) => ({ ...r })), [
    { target: 'hypixel', method: 'mc', ping: 92.4, median: 91, best: 88.2, worst: 120.6, jitter: 3.1, loss: 0, samples: 8, spikes: 1, error: null },
    { target: 'paris', method: 'tcp', ping: 12.3, median: 11.9, best: 10.2, worst: 30.5, jitter: 1.4, loss: 0.025, samples: 40, spikes: 0, error: null },
    { target: 'virginia', method: 'tcp', ping: null, median: null, best: null, worst: null, jitter: null, loss: 1, samples: 40, spikes: 0, error: 'timeout' },
  ]);
  // Nowhere in the database: not in the reports, not in the audit log.
  const everything = JSON.stringify([await t.db.all('SELECT * FROM network_reports'), await t.db.all('SELECT * FROM audit')]);
  assert.doesNotMatch(everything, /81\.2\.69/);

  // An IPv6 address, an IPv4 written as IPv6, an address outside the databases.
  assert.equal((await t.send({ results: RESULTS.slice(0, 1) }, { ip: '2a01:e0a:12::5', device: null })).status, 204);
  assert.equal((await t.send({ results: RESULTS.slice(0, 1) }, { ip: '::ffff:90.0.4.2' })).status, 204);
  assert.equal((await t.send({ results: RESULTS.slice(0, 1) }, { ip: '8.8.8.8' })).status, 204);
  const places = (await t.db.all('SELECT device, app_version, country, region, city, isp FROM network_reports')).map((r) => ({ ...r }));
  assert.equal(places.length, 4);
  assert.deepEqual(places.find((r) => r.city === 'Paris'), { device: null, app_version: null, country: 'FR', region: 'Île-de-France', city: 'Paris', isp: null });
  assert.deepEqual(places.find((r) => r.city === 'Lyon'), { device: 'a1b2c3d4e5f60718293a4b5c', app_version: null, country: 'FR', region: 'Auvergne-Rhône-Alpes', city: 'Lyon', isp: 'Orange' });
  assert.deepEqual(places.find((r) => r.country === null), { device: 'a1b2c3d4e5f60718293a4b5c', app_version: null, country: null, region: null, city: null, isp: null });
  // The databases were downloaded once, this month's.
  assert.deepEqual(t.calls, [dbipUrl('city-lite', new Date()), dbipUrl('asn-lite', new Date())]);
});

test('network test: what the app sends is checked', async () => {
  const t = await setup();
  for (const body of [null, {}, { results: 'x' }, { results: [] }, { results: [{ id: 'paris' }] }, { results: [{ id: 'Paris!', loss: 0 }] }, { results: [{ id: 'paris', loss: 2 }] }]) {
    const res = await t.send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal((await res.json()).error.code, 'invalid_request');
  }
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM network_reports')).n, 0);

  // Out-of-range numbers are dropped, a server tested twice counts once, a newer app's servers are kept, at most 16.
  const parsed = parseReport({
    app: '1.3.0-beta.1',
    results: [
      { id: 'paris', method: 'udp', ping: -1, median: 1e9, best: 'x', worst: 12, jitter: Infinity, loss: 0.1234, samples: 1.5, spikes: 3, error: 'DNS!' },
      { id: 'paris', loss: 0 },
      ...Array.from({ length: 20 }, (_, i) => ({ id: `new-${i}`, loss: 0 })),
    ],
  }, 'NOT-HEX');
  assert.equal(parsed.app, '1.3.0-beta.1');
  assert.equal(parsed.device, null);
  assert.deepEqual(parsed.results[0], { target: 'paris', method: null, ping: null, median: null, best: null, worst: 12, jitter: null, loss: 0.123, samples: null, spikes: 3, error: null });
  assert.equal(parsed.results.length, 15);
  assert.equal(parseReport({ app: '<script>', results: [{ id: 'paris', loss: 0 }] }).app, null);
});

test('network test: limited per address', async () => {
  const t = await setup();
  for (let i = 0; i < 30; i++) assert.equal((await t.send({ results: RESULTS.slice(0, 1) })).status, 204);
  assert.equal((await t.send({ results: RESULTS.slice(0, 1) })).status, 429);
  assert.equal((await t.send({ results: RESULTS.slice(0, 1) }, { ip: '90.0.0.1' })).status, 204);
});

test('network test: kept without the city when the databases are missing or turned off', async () => {
  // Last month's files until this month's are out.
  const last = new Date();
  last.setUTCDate(15);
  last.setUTCMonth(last.getUTCMonth() - 1);
  const t = await setup({}, { city: dbipUrl('city-lite', last), asn: dbipUrl('asn-lite', last) });
  assert.equal((await t.send({ results: RESULTS })).status, 204);
  assert.equal((await t.db.get('SELECT city FROM network_reports')).city, 'London');
  assert.equal(t.calls.length, 4);

  const down = await setup({}, { city: false, asn: false });
  assert.equal((await down.send({ results: RESULTS })).status, 204);
  assert.deepEqual({ ...(await down.db.get('SELECT country, city, isp FROM network_reports')) }, { country: null, city: null, isp: null });
  assert.equal(down.geo.state().loaded, false);
  assert.match(down.geo.state().error, /HTTP 404/);
  // Not downloaded again for every test.
  await down.send({ results: RESULTS });
  assert.equal(down.calls.length, 2);

  const off = await setup({ GEOIP: 'off' });
  assert.equal((await off.send({ results: RESULTS })).status, 204);
  assert.equal(off.calls.length, 0);
  assert.equal((await off.db.get('SELECT city FROM network_reports')).city, null);

  // Another copy of the databases, not gzipped.
  const own = createGeo(loadConfig({ GEOIP_CITY_URL: 'https://files.example.com/city.mmdb', GEOIP_ASN_URL: 'https://files.example.com/asn.mmdb' }), {
    log: quiet, fetchImpl: async (url) => new Response(url.endsWith('city.mmdb') ? CITY : ASN),
  });
  assert.equal(await own.load(), true);
  assert.deepEqual(own.lookup('90.0.1.1'), { country: 'FR', region: 'Auvergne-Rhône-Alpes', city: 'Lyon', asn: 3215, isp: 'Orange' });
  assert.deepEqual(own.lookup('not an ip'), { country: null, region: null, city: null, asn: null, isp: null });
});

test('network test: /admin/reseau by city and provider, CSV export, gone after 12 months', async () => {
  const t = await setup();
  assert.equal((await t.app.request('/admin/reseau')).status, 303);
  assert.match(await (await t.admin('/admin/reseau')).text(), /Aucun test réseau sur cette période/);

  await t.send({ app: '1.2.1', results: RESULTS }, { device: 'aaaaaaaaaaaaaaaa' });
  await t.send({ app: '1.2.1', results: RESULTS.map((r) => (r.id === 'paris' ? { ...r, median: 15.9 } : r)) }, { device: 'bbbbbbbbbbbbbbbb' });
  await t.send({ app: '1.2.1', results: RESULTS }, { device: 'bbbbbbbbbbbbbbbb' });
  await t.send({ app: '1.2.1', results: [{ ...RESULTS[1], median: 40 }] }, { ip: '90.0.0.9', device: 'cccccccccccccccc' });

  const page = await (await t.admin('/admin/reseau')).text();
  assert.match(page, /Où jouent les joueurs/);
  assert.match(page, /Villes : base DB-IP de \d{4}-\d{2}/);
  // London: 2 players, 3 tests, median to Paris 12 (11.9, 15.9, 11.9), lossy (2.5 %), Hypixel 91, nothing to Virginia.
  const london = page.slice(page.indexOf('London'), page.indexOf('</tr>', page.indexOf('London')));
  assert.match(london, /England, GB/);
  assert.match(london, /<td class="mono">2<\/td><td class="mono">3<\/td><td class="mono" title="3 mesures, pertes 0,0 %">91<\/td>/);
  assert.match(london, /<td class="mono net-loss" title="3 mesures, pertes 2,5 %">12<\/td>/);
  assert.match(page, /Orange<span class="muted small"> · FR/);
  assert.match(page, /IP Geolocation by DB-IP/);
  assert.match(await (await t.admin('/admin')).text(), /href="\/admin\/reseau"/);

  const csv = await t.admin('/admin/reseau.csv');
  assert.equal(csv.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.match(csv.headers.get('content-disposition'), /attachment; filename="rago-tests-reseau-\d{4}-\d{2}-\d{2}\.csv"/);
  const lines = (await csv.text()).trim().split('\n');
  assert.equal(lines[0], 'date,pc,app,country,region,city,asn,isp,server,method,ping_ms,median_ms,best_ms,worst_ms,jitter_ms,loss,samples,spikes,error');
  assert.equal(lines.length, 1 + 3 * 3 + 1);
  assert.match(lines.find((l) => l.includes(',aaaaaaaaaaaaaaaa,') && l.includes(',hypixel,')), /,aaaaaaaaaaaaaaaa,1\.2\.1,GB,England,London,20712,Andrews & Arnold Ltd,hypixel,mc,92\.4,91,88\.2,120\.6,3\.1,0,8,1,$/);
  assert.match(lines.find((l) => l.includes(',Lyon,')), /,cccccccccccccccc,1\.2\.1,FR,Auvergne-Rhône-Alpes,Lyon,3215,Orange,paris,tcp,12\.3,40,/);

  // 12 months later, the sweep deletes them with their results.
  await purgeNetworkReports(t.db, Date.now() + 366 * 86400000);
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM network_reports')).n, 0);
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM network_results')).n, 0);
});
