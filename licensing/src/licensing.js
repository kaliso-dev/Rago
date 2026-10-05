// Accounts, licenses and the one-device lock. Pure database logic, no HTTP.
import { audit } from './db.js';
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

const normEmail = (email) => String(email).trim().toLowerCase();

// ---------- Users and web sessions ----------

export const findUserByEmail = (db, email) => db.get('SELECT * FROM users WHERE email = ?', [normEmail(email)]);
export const getUser = (db, id) => db.get('SELECT * FROM users WHERE id = ?', [id]);

export async function createUser(db, email, password) {
  const id = newId('usr');
  const hash = await hashPassword(password);
  await db.run('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [id, normEmail(email), hash, Date.now()]);
  await audit(db, 'user.created', { userId: id });
  return getUser(db, id);
}

export async function setPassword(db, userId, password) {
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(password), userId]);
  await db.run('DELETE FROM web_sessions WHERE user_id = ?', [userId]);
}

export async function createWebSession(db, userId) {
  const token = randomToken();
  const now = Date.now();
  await db.run('INSERT INTO web_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [sha256(token), userId, now, now + SESSION_TTL]);
  return token;
}

export async function userForWebSession(db, token) {
  if (!token) return null;
  return db.get(`SELECT u.* FROM web_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`, [sha256(token), Date.now()]);
}

export async function deleteWebSession(db, token) {
  if (token) await db.run('DELETE FROM web_sessions WHERE token_hash = ?', [sha256(token)]);
}

export async function createPasswordReset(db, userId) {
  const token = randomToken();
  await db.run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    [sha256(token), userId, Date.now() + 60 * 60 * 1000]);
  return token;
}

export async function consumePasswordReset(db, token) {
  const row = await db.get(`UPDATE password_resets SET used_at = ?
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id`,
  [Date.now(), sha256(String(token)), Date.now()]);
  return row?.user_id ?? null;
}

// ---------- Licenses ----------

export const getLicense = (db, id, { lock = false } = {}) =>
  db.get(`SELECT * FROM licenses WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [id]);
export const getDevice = (db, licenseId) => db.get('SELECT * FROM devices WHERE license_id = ?', [licenseId]);

/** The license shown for an account: the active one if any, else the most recent. */
export const licenseForUser = (db, userId) =>
  db.get(`SELECT * FROM licenses WHERE user_id = ? ORDER BY (status = 'active') DESC, created_at DESC LIMIT 1`, [userId]);

const activeLicenseForUser = (db, userId) =>
  db.get("SELECT * FROM licenses WHERE user_id = ? AND status = 'active'", [userId]);

async function insertLicense(db, fields) {
  const id = newId('lic');
  const claimToken = randomToken();
  await db.run(`INSERT INTO licenses (id, key, user_id, email, source, plan, stripe_session_id, stripe_payment_intent,
      stripe_customer_id, stripe_subscription_id, current_period_end, amount, currency, claim_token_hash, created_at, claimed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, newLicenseKey(), fields.userId ?? null, normEmail(fields.email), fields.source, fields.plan ?? 'lifetime',
    fields.sessionId ?? null, fields.paymentIntent ?? null, fields.customerId ?? null,
    fields.subscriptionId ?? null, fields.periodEnd ?? null,
    fields.amount ?? null, fields.currency ?? null, sha256(claimToken), Date.now(),
    fields.userId ? Date.now() : null,
  ]);
  return { license: await getLicense(db, id), claimToken };
}

const idOf = (v) => (typeof v === 'string' ? v : v?.id ?? null);

/** Billing facts from a Stripe Subscription (the period end moved to the items in recent API versions). */
export function subscriptionFacts(sub) {
  const item = sub?.items?.data?.[0];
  const end = sub?.current_period_end ?? item?.current_period_end;
  return {
    plan: item?.price?.recurring?.interval === 'year' ? 'year' : 'month',
    periodEnd: end ? end * 1000 : null,
    cancelAtPeriodEnd: !!(sub?.cancel_at_period_end || sub?.cancel_at),
    // past_due keeps working while Stripe retries the card; it ends as unpaid or canceled.
    active: ['active', 'trialing', 'past_due'].includes(sub?.status),
  };
}

const UNIQUE_VIOLATION = '23505';

/**
 * Idempotent: creates the license for a paid Stripe Checkout Session, once.
 * Returns { license, created, claimToken } (claimToken only when just created and unclaimed).
 */
export async function fulfillCheckoutSession(db, session, subscription = null) {
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!paid) return { license: null, created: false };
  const existing = () => db.get('SELECT * FROM licenses WHERE stripe_session_id = ?', [session.id]);
  const found = await existing();
  if (found) return { license: found, created: false };

  const email = session.customer_details?.email || session.customer_email;
  if (!email) throw new LicenseError('no_email', `Checkout session ${session.id} has no email`);
  try {
    return await db.tx(async (t) => {
      // Signed-in buyer without a license: attach straight away.
      let userId = null;
      const ref = session.client_reference_id;
      if (ref && (await getUser(t, ref)) && !(await activeLicenseForUser(t, ref))) userId = ref;

      const sub = subscription || (typeof session.subscription === 'object' ? session.subscription : null);
      const facts = session.mode === 'subscription' ? subscriptionFacts(sub) : null;
      const { license, claimToken } = await insertLicense(t, {
        email, userId, source: 'stripe', sessionId: session.id,
        plan: facts ? (sub ? facts.plan : session.metadata?.interval === 'year' ? 'year' : 'month') : 'lifetime',
        subscriptionId: idOf(session.subscription), periodEnd: facts?.periodEnd,
        paymentIntent: idOf(session.payment_intent), customerId: idOf(session.customer),
        amount: session.amount_total, currency: session.currency,
      });
      await audit(t, 'license.created', { licenseId: license.id, userId, detail: { session: session.id } });
      return { license, created: true, claimToken: userId ? null : claimToken };
    });
  } catch (err) {
    // The webhook and the success page raced: the other one created it.
    if (err.code === UNIQUE_VIOLATION) return { license: await existing(), created: false };
    throw err;
  }
}

/** Manual license, e.g. for players who bought the .bat Premium on Discord. */
export function grantLicense(db, email, note) {
  return db.tx(async (t) => {
    const user = await findUserByEmail(t, email);
    const userId = user && !(await activeLicenseForUser(t, user.id)) ? user.id : null;
    const out = await insertLicense(t, { email, userId, source: 'grant' });
    await audit(t, 'license.granted', { licenseId: out.license.id, userId, detail: { note } });
    return { ...out, claimToken: userId ? null : out.claimToken };
  });
}

export const licenseByClaimToken = (db, token) =>
  db.get('SELECT * FROM licenses WHERE claim_token_hash = ? AND user_id IS NULL', [sha256(String(token))]);

/** Attaches an unclaimed license to an account. */
export function claimLicense(db, licenseId, userId) {
  return db.tx(async (t) => {
    const lic = await getLicense(t, licenseId, { lock: true });
    if (!lic) throw new LicenseError('not_found');
    if (lic.user_id === userId) return lic;
    if (lic.user_id) throw new LicenseError('already_claimed');
    if (await activeLicenseForUser(t, userId)) throw new LicenseError('already_has_license');
    await t.run('UPDATE licenses SET user_id = ?, claimed_at = ?, claim_token_hash = NULL WHERE id = ?', [userId, Date.now(), licenseId]);
    await audit(t, 'license.claimed', { licenseId, userId });
    return getLicense(t, licenseId);
  });
}

export async function setLicenseStatus(db, licenseId, status, reason) {
  await db.run('UPDATE licenses SET status = ?, status_reason = ?, token_version = token_version + 1 WHERE id = ?',
    [status, reason ?? null, licenseId]);
  await audit(db, `license.${status}`, { licenseId, detail: { reason } });
}

/**
 * Full refund or dispute. One-time purchases match on the payment intent; subscriptions on the customer
 * (their invoices carry their own payment intents). Returns the revoked licenses.
 */
export async function revokeForCharge(db, { paymentIntent, customer }, reason) {
  const rows = await db.all(`SELECT * FROM licenses WHERE status = 'active' AND source <> 'affiliate'
    AND (stripe_payment_intent = ? OR (stripe_subscription_id IS NOT NULL AND plan <> 'lifetime' AND stripe_customer_id = ?))`,
  [paymentIntent ?? '', customer ?? '']);
  for (const r of rows) await setLicenseStatus(db, r.id, 'revoked', reason);
  return rows;
}

/** Applies the current state of a Stripe Subscription to its license. Lifetime licenses ignore it. */
export function syncSubscription(db, sub) {
  return db.tx(async (t) => {
    const lic = await t.get('SELECT * FROM licenses WHERE stripe_subscription_id = ? FOR UPDATE', [sub.id]);
    if (!lic || lic.plan === 'lifetime') return lic ? 'lifetime' : 'unknown';
    const f = subscriptionFacts(sub);
    await t.run('UPDATE licenses SET plan = ?, current_period_end = ?, cancel_at_period_end = ? WHERE id = ?',
      [f.plan, f.periodEnd ?? lic.current_period_end, f.cancelAtPeriodEnd, lic.id]);
    if (lic.status === 'active' && !f.active) {
      await setLicenseStatus(t, lic.id, 'revoked', 'subscription_ended');
      return 'ended';
    }
    // Only a lapse brings it back (card fixed after unpaid). Refunds, disputes and manual revokes stay revoked.
    if (lic.status === 'revoked' && f.active && lic.status_reason === 'subscription_ended') {
      await setLicenseStatus(t, lic.id, 'active', null);
      return 'resumed';
    }
    return 'updated';
  });
}

/** Gives the account Premium for life: turns its active license into a lifetime one, or creates one. */
export function makeLifetime(db, userId, source) {
  return db.tx(async (t) => {
    const user = await getUser(t, userId);
    const current = await t.get("SELECT * FROM licenses WHERE user_id = ? AND status = 'active' FOR UPDATE", [userId]);
    if (current) {
      await t.run("UPDATE licenses SET plan = 'lifetime', cancel_at_period_end = false WHERE id = ?", [current.id]);
      await audit(t, 'license.lifetime', { licenseId: current.id, userId, detail: { source } });
      return { license: await getLicense(t, current.id), subscriptionToCancel: current.plan !== 'lifetime' ? current.stripe_subscription_id : null };
    }
    const { license } = await insertLicense(t, { email: user.email, userId, source, plan: 'lifetime' });
    await audit(t, 'license.granted', { licenseId: license.id, userId, detail: { source } });
    return { license, subscriptionToCancel: null };
  });
}

/** Frees the device slot so the license can be activated on another PC. */
export function resetDevice(db, licenseId, by) {
  return db.tx(async (t) => {
    await t.run('DELETE FROM devices WHERE license_id = ?', [licenseId]);
    await t.run('UPDATE licenses SET token_version = token_version + 1, last_reset_at = ? WHERE id = ?', [Date.now(), licenseId]);
    await audit(t, 'device.reset', { licenseId, detail: { by } });
  });
}

// ---------- Activation ----------

/**
 * Checks whether `device` may use `license`. Returns 'here' when this PC is the bound device,
 * 'free' when nothing is bound yet. Throws LicenseError for revoked or bound elsewhere.
 */
export async function deviceState(db, license, device) {
  if (license.status !== 'active') throw new LicenseError('revoked');
  const bound = await getDevice(db, license.id);
  if (!bound) return { state: 'free', bound: null };
  if (sameDevice(bound, device.fp)) return { state: 'here', bound };
  throw new LicenseError('bound_to_other_device');
}

/** Binds the license to this device (or touches it if already bound here). Atomic. */
export async function activate(db, licenseId, device, ip) {
  try {
    return await db.tx(async (t) => {
      // Row lock: two PCs activating at the same moment can't both win.
      const license = await getLicense(t, licenseId, { lock: true });
      if (!license) throw new LicenseError('no_license');
      const now = Date.now();
      const { state } = await deviceState(t, license, device);
      if (state === 'free') {
        await t.run(`INSERT INTO devices (license_id, id, machine_guid, smbios_uuid, board_serial, name, os, app_version,
            bound_at, last_seen_at, last_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          licenseId, newId('dev'), device.fp.machine_guid, device.fp.smbios_uuid, device.fp.board_serial,
          device.name, device.os, device.appVersion, now, now, ip ?? null]);
        await audit(t, 'device.bound', { licenseId, userId: license.user_id, detail: { name: device.name, ip } });
        // A referred buyer's first PC, compared with the affiliate's own PCs before the referral counts.
        await t.run(`UPDATE referrals SET machine_guid = ?, smbios_uuid = ?, board_serial = ?
          WHERE license_id = ? AND machine_guid IS NULL AND status = 'pending'`,
        [device.fp.machine_guid, device.fp.smbios_uuid, device.fp.board_serial, licenseId]);
      } else {
        // Same PC: only fill in missing identifiers, so the device can't drift to another PC one part at a time.
        await t.run(`UPDATE devices SET machine_guid = COALESCE(machine_guid, ?), smbios_uuid = COALESCE(smbios_uuid, ?),
            board_serial = COALESCE(board_serial, ?), name = ?, os = ?, app_version = ?, last_seen_at = ?, last_ip = ?
          WHERE license_id = ?`, [device.fp.machine_guid, device.fp.smbios_uuid, device.fp.board_serial,
          device.name, device.os, device.appVersion, now, ip ?? null, licenseId]);
      }
      return { license: await getLicense(t, licenseId), device: await getDevice(t, licenseId) };
    });
  } catch (err) {
    if (err.code === 'bound_to_other_device') await audit(db, 'device.blocked', { licenseId, detail: { name: device.name, ip } });
    throw err;
  }
}
