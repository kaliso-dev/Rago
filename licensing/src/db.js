import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS web_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- One row per purchase (or manual grant). user_id is null until the buyer creates or links an account.
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',          -- active | revoked
  status_reason TEXT,                             -- refunded | disputed | manual
  source TEXT NOT NULL DEFAULT 'stripe',          -- stripe | grant
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  stripe_customer_id TEXT,
  amount INTEGER,
  currency TEXT,
  claim_token_hash TEXT,
  token_version INTEGER NOT NULL DEFAULT 1,       -- bump to invalidate every license token
  last_reset_at INTEGER,
  created_at INTEGER NOT NULL,
  claimed_at INTEGER
);
CREATE INDEX IF NOT EXISTS licenses_user ON licenses(user_id);
CREATE INDEX IF NOT EXISTS licenses_pi ON licenses(stripe_payment_intent);

-- The single device a license is locked to.
CREATE TABLE IF NOT EXISTS devices (
  license_id TEXT PRIMARY KEY REFERENCES licenses(id),
  id TEXT NOT NULL UNIQUE,
  machine_guid TEXT,
  smbios_uuid TEXT,
  board_serial TEXT,
  name TEXT,
  os TEXT,
  app_version TEXT,
  bound_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  last_ip TEXT
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  license_id TEXT,
  user_id TEXT,
  type TEXT NOT NULL,
  detail TEXT
);
`;

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

/** Runs fn inside a write transaction (IMMEDIATE, so concurrent activations serialize). */
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function audit(db, type, { licenseId = null, userId = null, detail = null } = {}) {
  db.prepare('INSERT INTO audit (at, license_id, user_id, type, detail) VALUES (?, ?, ?, ?, ?)')
    .run(Date.now(), licenseId, userId, type, detail == null ? null : JSON.stringify(detail));
}
