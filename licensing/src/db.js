// Postgres access (Supabase in production). Queries are written with `?` placeholders,
// converted to $1, $2… here. Timestamps are stored as BIGINT milliseconds.
import { readFileSync } from 'node:fs';
import { generateKeyPairSync, randomBytes } from 'node:crypto';

export const SCHEMA = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

const toPg = (sql) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

/** Wraps anything with `query(text, params) -> { rows }` (a pg Pool/Client, or PGlite). */
function wrap(conn, txRunner) {
  const db = {
    async all(sql, params = []) {
      return (await conn.query(toPg(sql), params)).rows;
    },
    async get(sql, params = []) {
      return (await db.all(sql, params))[0] ?? null;
    },
    async run(sql, params = []) {
      const res = await conn.query(toPg(sql), params);
      return { changes: res.rowCount ?? res.affectedRows ?? 0 };
    },
    /** Runs fn(txDb) in a transaction. Rows read with `FOR UPDATE` stay locked until commit. */
    tx: txRunner || ((fn) => fn(db)), // already inside a transaction: reuse it
  };
  return db;
}

/**
 * Replays schema.sql at boot. Its ALTER TABLEs need a short exclusive lock: if something holds the table
 * (a long query, a migration in the Supabase editor), give up after 5 s on the database side too, so
 * nothing stays queued behind the lock, then try again a few times before stopping the server.
 */
export async function applySchema(pg, url, local, { tries = 6, log = console } = {}) {
  for (let attempt = 1; ; attempt++) {
    const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    client.on('error', () => {}); // reported by the failing query below
    try {
      await client.connect();
      await client.query("SET lock_timeout = '5s'; SET statement_timeout = '60s'");
      await client.query(SCHEMA);
      return;
    } catch (err) {
      if (attempt >= tries) throw err;
      const wait = Math.min(30, 2 ** attempt) * 1000;
      log.error(`[db] schema not applied (attempt ${attempt}/${tries}: ${err.message}), retrying in ${wait / 1000} s`);
      await new Promise((r) => setTimeout(r, wait));
    } finally {
      await client.end().catch(() => {});
    }
  }
}

/**
 * envName (cfg.envName): the database must belong to this server's environment, checked before the schema is
 * replayed, so a server pointed at another environment's database changes nothing in it (claimDatabase).
 */
export async function openDb(url, { envName = null } = {}) {
  if (!url) throw new Error('DATABASE_URL is required (Supabase: Project Settings > Database > Connection string)');
  const pg = (await import('pg')).default;
  pg.types.setTypeParser(20, Number); // BIGINT -> number (millisecond timestamps fit easily)
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const pool = new pg.Pool({
    connectionString: url,
    max: 5,
    ssl: local ? false : { rejectUnauthorized: false },
    // A database that stops answering gives an error in seconds (/healthz says 503) instead of a wait
    // with no end: 5 s to open a connection, 10 s per query.
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });
  // Supabase may close an idle connection (restart, maintenance). Without this listener the error
  // would crash the server; the pool drops that client and the next query opens a new one.
  pool.on('error', (err) => console.error('[db] idle connection lost:', err.message));
  const db = wrap(pool, async (fn) => {
    const client = await pool.connect();
    // While the transaction holds this client, the pool's listener doesn't cover it: a connection cut
    // here must fail the request (500), not stop the server.
    let lost = null;
    const onError = (err) => { lost = err; console.error('[db] connection lost during a transaction:', err.message); };
    client.on('error', onError);
    try {
      await client.query('BEGIN');
      const out = await fn(wrap(client));
      await client.query('COMMIT');
      return out;
    } catch (err) {
      // A failed ROLLBACK means the connection itself is gone.
      if (!lost) await client.query('ROLLBACK').catch((e) => { lost = e; });
      throw err;
    } finally {
      client.off('error', onError);
      client.release(lost || undefined); // a broken client is closed, not reused
    }
  });
  db.close = () => pool.end();
  try {
    if (envName) {
      // A brand-new database has no server_secrets table yet (42P01): nobody owns it.
      const row = await db.get("SELECT value FROM server_secrets WHERE name = 'environment'").catch((err) => {
        if (err.code === '42P01') return null;
        throw err;
      });
      if (row) refuseOtherOwner(row.value, envName);
    }
    await applySchema(pg, url, local);
    if (envName) await claimDatabase(db, envName);
  } catch (err) {
    await pool.end().catch(() => {});
    throw err;
  }
  return db;
}

function refuseOtherOwner(owner, envName) {
  if (owner === envName) return;
  throw new Error(`This database belongs to the "${owner}" server, and this server is "${envName}". Each server needs its own database: `
    + `set DATABASE_URL to this environment's database (a staging server uses its own Supabase project, never the live one). `
    + `If this really is the "${owner}" server and its Railway environment was renamed, set APP_ENV=${owner}.`);
}

/**
 * Marks the database with the environment of the first server that opens it ("production", "staging",
 * "development") and refuses a server of another environment: a staging copy of the live server that kept the
 * live DATABASE_URL, or a local server started with it, stops at boot instead of touching real accounts.
 */
export async function claimDatabase(db, envName) {
  refuseOtherOwner(await secret(db, 'environment', () => envName), envName);
}

/** In-memory Postgres (PGlite) for tests and local development without Supabase. */
export async function openMemoryDb() {
  const { PGlite } = await import('@electric-sql/pglite');
  const pglite = new PGlite({ parsers: { 20: Number } });
  await pglite.exec(SCHEMA);
  // PGlite runs one connection: transactions are serialized through its own lock.
  const db = wrap(pglite, (fn) => pglite.transaction((t) => fn(wrap(t))));
  db.close = () => pglite.close();
  return db;
}

export function audit(db, type, { licenseId = null, userId = null, detail = null } = {}) {
  return db.run('INSERT INTO audit (at, license_id, user_id, type, detail) VALUES (?, ?, ?, ?, ?)',
    [Date.now(), licenseId, userId, type, detail == null ? null : JSON.stringify(detail)]);
}

/** Returns the stored secret `name`, creating it with make() on first use (race-safe). */
async function secret(db, name, make) {
  await db.run('INSERT INTO server_secrets (name, value, created_at) VALUES (?, ?, ?) ON CONFLICT (name) DO NOTHING', [name, make(), Date.now()]);
  return (await db.get('SELECT value FROM server_secrets WHERE name = ?', [name])).value;
}

/** Fills cfg.signingKeyPem and cfg.sessionSecret from env, or from the database (generated once). */
export async function ensureKeys(db, cfg) {
  if (!cfg.signingKeyPem) {
    cfg.signingKeyPem = await secret(db, 'license_signing_key',
      () => generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }));
  }
  if (!cfg.sessionSecret) cfg.sessionSecret = await secret(db, 'session_secret', () => randomBytes(32).toString('hex'));
}
