// Where a network test comes from (RAG-50, the future proxies): city, region, country and internet provider of the
// player's IP address, read from DB-IP's free databases, IP to City Lite and IP to ASN Lite (CC BY 4.0, credited in
// the privacy policy). Both are downloaded from db-ip.com when the server starts, then again each month, and kept in
// memory (about 150 MB). The address is only looked up, never stored.
import { promisify } from 'node:util';
import { gunzip as gunzipCallback } from 'node:zlib';
import { Reader } from 'mmdb-lib';

const gunzip = promisify(gunzipCallback);
const HOUR = 60 * 60 * 1000;

const month = (d) => d.toISOString().slice(0, 7);
/** DB-IP's free database `kind` (city-lite, asn-lite) of the month of `d`. */
export const dbipUrl = (kind, d) => `https://download.db-ip.com/free/dbip-${kind}-${month(d)}.mmdb.gz`;

/** The English name, else the first one. */
const nameOf = (o) => o?.names?.en || Object.values(o?.names || {})[0] || null;

export function createGeo(cfg, { fetchImpl = fetch, log = console, now = () => new Date() } = {}) {
  let city = null;
  let asn = null;
  let loadedFor = null; // the month of the files in memory
  let loading = null;
  let tried = 0;
  let error = null;

  async function open(kind) {
    const own = cfg.geoip[kind];
    // A month's file is out on the 1st or a little after: until then, last month's.
    const d = now();
    const urls = own ? [own] : [dbipUrl(`${kind}-lite`, d), dbipUrl(`${kind}-lite`, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15)))];
    let last = '';
    for (const url of urls) {
      const res = await fetchImpl(url);
      if (!res.ok) {
        last = `${url} : HTTP ${res.status}`;
        continue;
      }
      const body = Buffer.from(await res.arrayBuffer());
      return new Reader(body[0] === 0x1f && body[1] === 0x8b ? await gunzip(body) : body);
    }
    throw new Error(last);
  }

  /** Downloads both databases; the ones in memory stay until the new ones are read. */
  function load() {
    if (!cfg.geoip.on) return Promise.resolve(false);
    if (loading) return loading;
    tried = Date.now();
    loading = (async () => {
      try {
        const [c, a] = [await open('city'), await open('asn')];
        [city, asn, loadedFor, error] = [c, a, month(now()), null];
        log.log(`[geo] bases DB-IP chargées (${loadedFor})`);
        return true;
      } catch (err) {
        error = err.message;
        log.error(`[geo] bases DB-IP introuvables, tests réseau gardés sans ville : ${error}`);
        return false;
      } finally {
        loading = null;
      }
    })();
    return loading;
  }

  return {
    load,
    /** Waits for the databases, at most `ms` (a test sent right after the server starts). */
    async ready(ms = 15000) {
      if (city) {
        // a new month: the new files, in the background, at most once an hour
        if (loadedFor !== month(now()) && !loading && Date.now() - tried > HOUR) load();
        return true;
      }
      if (!cfg.geoip.on) return false;
      if (!loading && Date.now() - tried > HOUR) load();
      if (!loading) return false;
      let timer;
      const late = new Promise((resolve) => { timer = setTimeout(resolve, ms, false); timer.unref?.(); });
      try {
        return await Promise.race([loading, late]);
      } finally {
        clearTimeout(timer);
      }
    },
    /** { country, region, city, asn, isp } of an address, with null for what isn't known. */
    lookup(ip) {
      const out = { country: null, region: null, city: null, asn: null, isp: null };
      const addr = String(ip || '').trim().replace(/^::ffff:(?=\d+\.)/i, '');
      if (!city || !addr || addr === 'unknown') return out;
      try {
        const c = city.get(addr);
        out.country = c?.country?.iso_code || null;
        out.region = nameOf(c?.subdivisions?.[0]);
        out.city = nameOf(c?.city);
        const a = asn?.get(addr);
        out.asn = Number.isInteger(a?.autonomous_system_number) ? a.autonomous_system_number : null;
        out.isp = a?.autonomous_system_organization || null;
      } catch {
        // not an IP address
      }
      return out;
    },
    /** For /admin/reseau. */
    state: () => ({ on: cfg.geoip.on, loaded: !!city, month: loadedFor, error }),
  };
}
