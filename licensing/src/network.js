// Network tests sent by the app (RAG-50, step 0 of the proxy plan): after each test, its ping, jitter and losses to
// each server, with where the player is (city, region, country and provider, from geo.js; the IP address itself is
// never stored). /admin/reseau sums them up by city and by provider, to see where future proxies would help.
// Kept 12 months (purgeNetworkReports, in the server's hourly sweep).
import { randomToken } from './crypto.js';

const DAY = 86400000;
export const KEEP_DAYS = 365;
/** The servers of the app's network test (app/src-tauri/src/nettest.rs TARGETS), in the order /admin/reseau shows them. */
export const TARGETS = ['hypixel', 'minemen', 'paris', 'frankfurt', 'london', 'stockholm', 'madrid', 'virginia', 'internet'];

const TARGET = /^[a-z0-9-]{1,24}$/;
const METHODS = new Set(['mc', 'tcp', 'icmp']);
const ms = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 60000 ? Math.round(v * 10) / 10 : null);
const count = (v) => (Number.isInteger(v) && v >= 0 && v <= 10000 ? v : null);
const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * The app's report ({ app, results: [{ id, method, ping, median, best, worst, jitter, loss, samples, spikes, error }] })
 * and its X-Rago-Device, checked: { app, device, results } or null. Unknown servers are kept (a newer app may test more).
 */
export function parseReport(body, device) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.results)) return null;
  const results = [];
  for (const r of body.results.slice(0, 16)) {
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !TARGET.test(r.id) || results.some((x) => x.target === r.id)) continue;
    if (typeof r.loss !== 'number' || !(r.loss >= 0 && r.loss <= 1)) continue;
    results.push({
      target: r.id,
      method: METHODS.has(r.method) ? r.method : null,
      ping: ms(r.ping),
      median: ms(r.median),
      best: ms(r.best),
      worst: ms(r.worst),
      jitter: ms(r.jitter),
      loss: Math.round(r.loss * 1000) / 1000,
      samples: count(r.samples),
      spikes: count(r.spikes),
      error: typeof r.error === 'string' && /^[a-z]{1,16}$/.test(r.error) ? r.error : null,
    });
  }
  if (!results.length) return null;
  return {
    app: typeof body.app === 'string' && /^\d{1,4}\.\d{1,4}\.\d{1,4}(-[0-9A-Za-z.-]{1,20})?$/.test(body.app) ? body.app : null,
    device: /^[0-9a-f]{16,64}$/.test(device || '') ? device : null,
    results,
  };
}

/** Stores a checked report with where it comes from ({ country, region, city, asn, isp }). */
export async function saveReport(db, report, place, at = Date.now()) {
  const id = randomToken(12);
  await db.tx(async (t) => {
    await t.run('INSERT INTO network_reports (id, at, device, app_version, country, region, city, asn, isp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, at, report.device, report.app, text(place.country, 2), text(place.region, 80), text(place.city, 80),
      Number.isInteger(place.asn) ? place.asn : null, text(place.isp, 120),
    ]);
    for (const r of report.results) {
      await t.run(`INSERT INTO network_results (report_id, target, method, ping, median, best, worst, jitter, loss, samples, spikes, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, r.target, r.method, r.ping, r.median, r.best, r.worst, r.jitter, r.loss, r.samples, r.spikes, r.error]);
    }
  });
  return id;
}

export function purgeNetworkReports(db, now = Date.now()) {
  return db.run('DELETE FROM network_reports WHERE at < ?', [now - KEEP_DAYS * DAY]);
}

/**
 * Groups of reports over the last `days` days, with the median ping and average loss to each server:
 * by: 'city' (country, region, city) or 'isp' (country, provider). Most players first.
 */
async function groups(db, by, since, limit) {
  const keys = by === 'isp' ? ['country', 'isp'] : ['country', 'region', 'city'];
  const cols = keys.map((k) => `r.${k}`).join(', ');
  const rows = await db.all(`SELECT ${cols}, COUNT(DISTINCT r.device)::int AS players, COUNT(*)::int AS tests
    FROM network_reports r WHERE r.at >= ? GROUP BY ${cols} ORDER BY players DESC, tests DESC LIMIT ${Number(limit)}`, [since]);
  const pings = await db.all(`SELECT ${cols}, x.target,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY x.median) AS median, AVG(x.loss) AS loss, COUNT(x.median)::int AS n
    FROM network_reports r JOIN network_results x ON x.report_id = r.id
    WHERE r.at >= ? AND x.median IS NOT NULL GROUP BY ${cols}, x.target`, [since]);
  const key = (row) => keys.map((k) => row[k] ?? '').join('\u0000');
  const out = new Map(rows.map((row) => [key(row), { ...row, targets: {} }]));
  for (const p of pings) {
    const g = out.get(key(p));
    if (g) g.targets[p.target] = { median: Math.round(Number(p.median)), loss: Number(p.loss), n: p.n };
  }
  return [...out.values()];
}

/** What /admin/reseau shows. */
export async function networkSummary(db, { days = 90, now = Date.now() } = {}) {
  const since = now - days * DAY;
  const total = await db.get(`SELECT COUNT(*)::int AS tests, COUNT(DISTINCT device)::int AS players,
      COUNT(DISTINCT CASE WHEN city IS NOT NULL THEN country || '|' || city END)::int AS cities, COUNT(city)::int AS located, MAX(at) AS last
    FROM network_reports WHERE at >= ?`, [since]);
  return {
    days,
    total: { ...total, last: total.last == null ? null : Number(total.last) },
    cities: await groups(db, 'city', since, 200),
    isps: await groups(db, 'isp', since, 100),
  };
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  // a cell starting with = + - @ would run as a formula in a spreadsheet
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Every result of the last `days` days, one line per server tested, for a spreadsheet. */
export async function networkCsv(db, { days = 365, now = Date.now() } = {}) {
  const rows = await db.all(`SELECT r.at, r.device, r.app_version, r.country, r.region, r.city, r.asn, r.isp,
      x.target, x.method, x.ping, x.median, x.best, x.worst, x.jitter, x.loss, x.samples, x.spikes, x.error
    FROM network_reports r JOIN network_results x ON x.report_id = r.id
    WHERE r.at >= ? ORDER BY r.at DESC, x.target LIMIT 200000`, [now - days * DAY]);
  const head = ['date', 'pc', 'app', 'country', 'region', 'city', 'asn', 'isp', 'server', 'method', 'ping_ms', 'median_ms', 'best_ms', 'worst_ms', 'jitter_ms', 'loss', 'samples', 'spikes', 'error'];
  const lines = rows.map((r) => [new Date(Number(r.at)).toISOString(), r.device, r.app_version, r.country, r.region, r.city, r.asn, r.isp,
    r.target, r.method, r.ping, r.median, r.best, r.worst, r.jitter, r.loss, r.samples, r.spikes, r.error].map(csvCell).join(','));
  return `${[head.join(','), ...lines].join('\n')}\n`;
}
