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

export async function openDb(url) {
  if (!url) throw new Error('DATABASE_URL is required (Supabase: Project Settings > Database > Connection string)');
  const pg = (await import('pg')).default;
  pg.types.setTypeParser(20, Number); // BIGINT -> number (millisecond timestamps fit easily)
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const pool = new pg.Pool({
    connectionString: url,
    max: 5,
    ssl: local ? false : { rejectUnauthorized: false },
  });
  // Supabase may close an idle connection (restart, maintenance). Without this listener the error
  // would crash the server; the pool drops that client and the next query opens a new one.
  pool.on('error', (err) => console.error('[db] idle connection lost:', err.message));
  const db = wrap(pool, async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(wrap(client));
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  });
  await pool.query(SCHEMA);
  db.close = () => pool.end();
  return db;
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
