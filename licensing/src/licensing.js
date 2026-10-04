// Accounts, licenses and the one-device lock. Pure database logic, no HTTP.
import { audit, tx } from './db.js';
import { hashPassword, newId, newLicenseKey, randomToken, sha256 } from './crypto.js';
import { sameDevice } from './fingerprint.js';

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_TTL = 30 * DAY;

export class LicenseError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

// ---------- Users and web sessions ----------

export const findUserByEmail = (db, email) =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim());
export const getUser = (db, id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

export async function createUser(db, email, password) {
  const id = newId('usr');
  const hash = await hashPassword(password);
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(id, String(email).trim().toLowerCase(), hash, Date.now());
  audit(db, 'user.created', { userId: id });
  return getUser(db, id);
}

export async function setPassword(db, userId, password) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(password), userId);
  db.prepare('DELETE FROM web_sessions WHERE user_id = ?').run(userId);
}

export function createWebSession(db, userId) {
  const token = randomToken();
  const now = Date.now();
  db.prepare('INSERT INTO web_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), userId, now, now + SESSION_TTL);
  return token;
}

export function userForWebSession(db, token) {
  if (!token) return null;
  const row = db.prepare(`SELECT u.* FROM web_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha256(token), Date.now());
  return row || null;
}

export const deleteWebSession = (db, token) =>
  token && db.prepare('DELETE FROM web_sessions WHERE token_hash = ?').run(sha256(token));

export function createPasswordReset(db, userId) {
  const token = randomToken();
  db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), userId, Date.now() + 60 * 60 * 1000);
  return token;
}

export function consumePasswordReset(db, token) {
  const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
    .get(sha256(String(token)), Date.now());
  if (!row) return null;
  db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?').run(Date.now(), row.token_hash);
  return row.user_id;
}

// ---------- Licenses ----------

export const getLicense = (db, id) => db.prepare('SELECT * FROM licenses WHERE id = ?').get(id);
export const getDevice = (db, licenseId) => db.prepare('SELECT * FROM devices WHERE license_id = ?').get(licenseId);

/** The license shown for an account: the active one if any, else the most recent. */
export function licenseForUser(db, userId) {
  return db.prepare(`SELECT * FROM licenses WHERE user_id = ?
    ORDER BY (status = 'active') DESC, created_at DESC LIMIT 1`).get(userId) || null;
}

function insertLicense(db, fields) {
  const id = newId('lic');
  const claimToken = randomToken();
  db.prepare(`INSERT INTO licenses (id, key, user_id, email, source, stripe_session_id, stripe_payment_intent,
      stripe_customer_id, amount, currency, claim_token_hash, created_at, claimed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, newLicenseKey(), fields.userId ?? null, fields.email.toLowerCase(), fields.source,
    fields.sessionId ?? null, fields.paymentIntent ?? null, fields.customerId ?? null,
    fields.amount ?? null, fields.currency ?? null, sha256(claimToken), Date.now(),
    fields.userId ? Date.now() : null,
  );
  return { license: getLicense(db, id), claimToken };
}

/**
 * Idempotent: creates the license for a paid Stripe Checkout Session, once.
 * Returns { license, created, claimToken } (claimToken only when just created and unclaimed).
 */
export function fulfillCheckoutSession(db, session) {
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!paid) return { license: null, created: false };
  return tx(db, () => {
    const existing = db.prepare('SELECT * FROM licenses WHERE stripe_session_id = ?').get(session.id);
    if (existing) return { license: existing, created: false };

    const email = session.customer_details?.email || session.customer_email;
    if (!email) throw new LicenseError('no_email', `Checkout session ${session.id} has no email`);

    // Signed-in buyer without a license: attach straight away.
    let userId = null;
    const ref = session.client_reference_id;
    if (ref && getUser(db, ref) && !activeLicenseForUser(db, ref)) userId = ref;

    const { license, claimToken } = insertLicense(db, {
      email, userId, source: 'stripe', sessionId: session.id,
      paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      amount: session.amount_total, currency: session.currency,
    });
    audit(db, 'license.created', { licenseId: license.id, userId, detail: { session: session.id } });
    return { license, created: true, claimToken: userId ? null : claimToken };
  });
}

/** Manual license, e.g. for players who bought the .bat Premium on Discord. */
export function grantLicense(db, email, note) {
  return tx(db, () => {
    const user = findUserByEmail(db, email);
    const userId = user && !activeLicenseForUser(db, user.id) ? user.id : null;
    const out = insertLicense(db, { email, userId, source: 'grant' });
    audit(db, 'license.granted', { licenseId: out.license.id, userId, detail: { note } });
    return { ...out, claimToken: userId ? null : out.claimToken };
  });
}

const activeLicenseForUser = (db, userId) =>
  db.prepare("SELECT * FROM licenses WHERE user_id = ? AND status = 'active'").get(userId);

export function licenseByClaimToken(db, token) {
  return db.prepare('SELECT * FROM licenses WHERE claim_token_hash = ? AND user_id IS NULL').get(sha256(String(token))) || null;
}

/** Attaches an unclaimed license to an account. */
export function claimLicense(db, licenseId, userId) {
  return tx(db, () => {
    const lic = getLicense(db, licenseId);
    if (!lic) throw new LicenseError('not_found');
    if (lic.user_id === userId) return lic;
    if (lic.user_id) throw new LicenseError('already_claimed');
    if (activeLicenseForUser(db, userId)) throw new LicenseError('already_has_license');
    db.prepare('UPDATE licenses SET user_id = ?, claimed_at = ?, claim_token_hash = NULL WHERE id = ?')
      .run(userId, Date.now(), licenseId);
    audit(db, 'license.claimed', { licenseId, userId });
    return getLicense(db, licenseId);
  });
}

export function setLicenseStatus(db, licenseId, status, reason) {
  db.prepare('UPDATE licenses SET status = ?, status_reason = ?, token_version = token_version + 1 WHERE id = ?')
    .run(status, reason ?? null, licenseId);
  audit(db, `license.${status}`, { licenseId, detail: { reason } });
}

export function revokeByPaymentIntent(db, paymentIntent, reason) {
  const rows = db.prepare("SELECT id FROM licenses WHERE stripe_payment_intent = ? AND status = 'active'").all(paymentIntent);
  for (const r of rows) setLicenseStatus(db, r.id, 'revoked', reason);
  return rows.length;
}

/** Frees the device slot so the license can be activated on another PC. */
export function resetDevice(db, licenseId, by) {
  tx(db, () => {
    db.prepare('DELETE FROM devices WHERE license_id = ?').run(licenseId);
    db.prepare('UPDATE licenses SET token_version = token_version + 1, last_reset_at = ? WHERE id = ?').run(Date.now(), licenseId);
    audit(db, 'device.reset', { licenseId, detail: { by } });
  });
}

// ---------- Activation ----------

/**
 * Checks whether `device` may use `license`. Returns 'here' when this PC is the bound device,
 * 'free' when nothing is bound yet. Throws LicenseError for revoked or bound elsewhere.
 */
export function deviceState(db, license, device) {
  if (license.status !== 'active') throw new LicenseError('revoked');
  const bound = getDevice(db, license.id);
  if (!bound) return { state: 'free', bound: null };
  if (sameDevice(bound, device.fp)) return { state: 'here', bound };
  throw new LicenseError('bound_to_other_device');
}

/** Binds the license to this device (or touches it if already bound here). Atomic. */
export function activate(db, licenseId, device, ip) {
  return tx(db, () => {
    const license = getLicense(db, licenseId);
    if (!license) throw new LicenseError('no_license');
    const now = Date.now();
    let { state, bound } = (() => {
      try {
        return deviceState(db, license, device);
      } catch (err) {
        if (err.code === 'bound_to_other_device') audit(db, 'device.blocked', { licenseId, detail: { name: device.name, ip } });
        throw err;
      }
    })();
    if (state === 'free') {
      db.prepare(`INSERT INTO devices (license_id, id, machine_guid, smbios_uuid, board_serial, name, os, app_version,
          bound_at, last_seen_at, last_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        licenseId, newId('dev'), device.fp.machine_guid, device.fp.smbios_uuid, device.fp.board_serial,
        device.name, device.os, device.appVersion, now, now, ip ?? null);
      audit(db, 'device.bound', { licenseId, userId: license.user_id, detail: { name: device.name, ip } });
    } else {
      // Same PC: keep the stored identifiers in step with small hardware or OS changes,
      // but only fill in missing ones, so the device can't drift to another PC one part at a time.
      db.prepare(`UPDATE devices SET machine_guid = COALESCE(machine_guid, ?), smbios_uuid = COALESCE(smbios_uuid, ?),
          board_serial = COALESCE(board_serial, ?), name = ?, os = ?, app_version = ?, last_seen_at = ?, last_ip = ?
        WHERE license_id = ?`).run(device.fp.machine_guid, device.fp.smbios_uuid, device.fp.board_serial,
        device.name, device.os, device.appVersion, now, ip ?? null, licenseId);
    }
    bound = getDevice(db, licenseId);
    return { license: getLicense(db, licenseId), device: bound };
  });
}
