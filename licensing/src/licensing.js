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
  await db.run('DELETE FROM api_sessions WHERE user_id = ?', [userId]);
  // Reset links sent earlier stop working once the password changed.
  await db.run('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL', [Date.now(), userId]);
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

// The app's account sign-in (reviews, profile photo), for players without a license on this PC.
// Signed out by a password change, like web sessions.
export const API_SESSION_TTL = 180 * DAY;

export async function createApiSession(db, userId) {
  const token = randomToken();
  const now = Date.now();
  await db.run('INSERT INTO api_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [sha256(token), userId, now, now + API_SESSION_TTL]);
  return { token, expiresAt: now + API_SESSION_TTL };
}

export async function userForApiSession(db, token) {
  if (!token) return null;
  return db.get(`SELECT u.* FROM api_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`, [sha256(String(token)), Date.now()]);
}

export async function deleteApiSession(db, token) {
  if (token) await db.run('DELETE FROM api_sessions WHERE token_hash = ?', [sha256(String(token))]);
}

export async function createPasswordReset(db, userId) {
  const token = randomToken();
  await db.run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    [sha256(token), userId, Date.now() + 60 * 60 * 1000]);
  return token;
}

/** The account email while a reset link can still be used (checked before showing the form), else null. */
export async function passwordResetEmail(db, token) {
  const row = await db.get(`SELECT u.email FROM password_resets r JOIN users u ON u.id = r.user_id
    WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?`, [sha256(String(token)), Date.now()]);
  return row?.email ?? null;
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

/** The account's active license, unless it's an affiliate reward, which a purchase replaces. */
const blockingLicense = async (db, userId) => {
  const lic = await activeLicenseForUser(db, userId);
  return lic?.plan === 'reward' ? null : lic;
};

/**
 * A purchase replaces the account's affiliate reward: the PC moves to the new license (no new
 * activation needed) and the reward stops. The checkout started the subscription after the reward's end.
 */
async function replaceReward(t, userId, newLicenseId) {
  const old = await t.get("SELECT * FROM licenses WHERE user_id = ? AND status = 'active' AND plan = 'reward' AND id <> ? FOR UPDATE", [userId, newLicenseId]);
  if (!old) return;
  if (!(await getDevice(t, newLicenseId))) await t.run('UPDATE devices SET license_id = ? WHERE license_id = ?', [newLicenseId, old.id]);
  await setLicenseStatus(t, old.id, 'revoked', 'replaced');
  await audit(t, 'license.reward_replaced', { licenseId: old.id, userId, detail: { by: newLicenseId } });
}

async function insertLicense(db, fields) {
  const id = newId('lic');
  const claimToken = randomToken();
  await db.run(`INSERT INTO licenses (id, key, user_id, email, source, plan, stripe_session_id, stripe_payment_intent,
      stripe_customer_id, stripe_subscription_id, current_period_end, amount, currency, claim_token_hash, created_at, claimed_at, referral_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, newLicenseKey(), fields.userId ?? null, normEmail(fields.email), fields.source, fields.plan ?? 'lifetime',
    fields.sessionId ?? null, fields.paymentIntent ?? null, fields.customerId ?? null,
    fields.subscriptionId ?? null, fields.periodEnd ?? null,
    fields.amount ?? null, fields.currency ?? null, sha256(claimToken), Date.now(),
    fields.userId ? Date.now() : null, fields.referralCode || null,
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

/** The affiliate whose promotion code the checkout used, if any. */
async function promoAffiliateCode(db, session) {
  for (const d of session.discounts || []) {
    const id = idOf(d.promotion_code);
    const row = id && await db.get('SELECT code FROM affiliates WHERE stripe_promo_id = ?', [id]);
    if (row) return row.code;
  }
  return null;
}

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
      if (ref && (await getUser(t, ref)) && !(await blockingLicense(t, ref))) userId = ref;

      const sub = subscription || (typeof session.subscription === 'object' ? session.subscription : null);
      const facts = session.mode === 'subscription' ? subscriptionFacts(sub) : null;
      const { license, claimToken } = await insertLicense(t, {
        email, userId, source: 'stripe', sessionId: session.id,
        plan: facts ? (sub ? facts.plan : session.metadata?.interval === 'year' ? 'year' : 'month') : 'lifetime',
        subscriptionId: idOf(session.subscription), periodEnd: facts?.periodEnd,
        paymentIntent: idOf(session.payment_intent), customerId: idOf(session.customer),
        amount: session.amount_total, currency: session.currency,
        // The affiliate code typed at checkout (a promotion code), else the one the buyer arrived with
        // (/buy?ref=), kept with the purchase.
        referralCode: await promoAffiliateCode(t, session) || String(session.metadata?.ref || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || null,
      });
      await audit(t, 'license.created', { licenseId: license.id, userId, detail: { session: session.id } });
      if (userId) await replaceReward(t, userId, license.id);
      return { license, created: true, claimToken: userId ? null : claimToken };
    });
  } catch (err) {
    // The webhook and the success page raced: the other one created it.
    if (err.code === UNIQUE_VIOLATION) return { license: await existing(), created: false };
    throw err;
  }
}

/**
 * Manual license, e.g. for players who bought the .bat Premium on Discord. For life, or with `months`
 * and/or `days` for that long from today: a 'reward' license, which stops by itself on its date like an
 * affiliate reward (and which a purchase replaces).
 */
export function grantLicense(db, email, note, { months = 0, days = 0 } = {}) {
  const limited = months > 0 || days > 0;
  return db.tx(async (t) => {
    const user = await findUserByEmail(t, email);
    const userId = user && !(await activeLicenseForUser(t, user.id)) ? user.id : null;
    const out = await insertLicense(t, { email, userId, source: 'grant', ...(limited ? { plan: 'reward', periodEnd: addMonths(Date.now(), months) + days * 24 * 3600 * 1000 } : {}) });
    await audit(t, 'license.granted', { licenseId: out.license.id, userId, detail: { note, ...(months > 0 ? { months } : {}), ...(days > 0 ? { days } : {}) } });
    return { ...out, claimToken: userId ? null : out.claimToken };
  });
}

export const licenseByClaimToken = (db, token) =>
  db.get('SELECT * FROM licenses WHERE claim_token_hash = ? AND user_id IS NULL', [sha256(String(token))]);

/** Paid or granted licenses with this email that no account holds yet (support: tab closed, other device). */
export const unclaimedLicenses = (db, email) =>
  db.all('SELECT * FROM licenses WHERE email = ? AND user_id IS NULL ORDER BY created_at DESC', [normEmail(email)]);

/** A fresh /claim link for an unclaimed license; the previous link stops working. */
export async function newClaimToken(db, licenseId) {
  const token = randomToken();
  const { changes } = await db.run('UPDATE licenses SET claim_token_hash = ? WHERE id = ? AND user_id IS NULL', [sha256(token), licenseId]);
  if (!changes) throw new LicenseError('already_claimed');
  await audit(db, 'license.claim_link', { licenseId });
  return token;
}

/** Attaches an unclaimed license to an account. */
export function claimLicense(db, licenseId, userId) {
  return db.tx(async (t) => {
    const lic = await getLicense(t, licenseId, { lock: true });
    if (!lic) throw new LicenseError('not_found');
    if (lic.user_id === userId) return lic;
    if (lic.user_id) throw new LicenseError('already_claimed');
    if (await blockingLicense(t, userId)) throw new LicenseError('already_has_license');
    await t.run('UPDATE licenses SET user_id = ?, claimed_at = ?, claim_token_hash = NULL WHERE id = ?', [userId, Date.now(), licenseId]);
    await audit(t, 'license.claimed', { licenseId, userId });
    await replaceReward(t, userId, licenseId);
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

/** The same day `months` later (UTC). */
export function addMonths(ms, months) {
  const d = new Date(ms);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.getTime();
}

/**
 * Free Premium for the account: `months` and/or `days` (affiliate reward, Discord invite reward). Returns what to do:
 * - { action: 'lifetime' } nothing to add, the account has Premium for life;
 * - { action: 'subscription', license, subscriptionId, until } a Stripe subscriber: the caller skips their
 *   payments until `until` in Stripe, then calls rewardSubscription;
 * - { action: 'extended' | 'created', license } a reward license (plan 'reward', ends on current_period_end).
 */
export function grantRewardTime(db, userId, { months = 0, days = 0, source = 'affiliate' }) {
  const add = (from) => addMonths(from, months) + days * 24 * 3600 * 1000;
  return db.tx(async (t) => {
    const user = await getUser(t, userId);
    const now = Date.now();
    const current = await t.get("SELECT * FROM licenses WHERE user_id = ? AND status = 'active' FOR UPDATE", [userId]);
    if (current?.plan === 'lifetime') return { action: 'lifetime', license: current };
    if (current?.stripe_subscription_id && (current.plan === 'month' || current.plan === 'year')) {
      return { action: 'subscription', license: current, subscriptionId: current.stripe_subscription_id,
        until: add(Math.max(Number(current.current_period_end) || 0, now)) };
    }
    if (current) {
      const until = add(Math.max(Number(current.current_period_end) || 0, now));
      await t.run("UPDATE licenses SET plan = 'reward', current_period_end = ?, cancel_at_period_end = false WHERE id = ?", [until, current.id]);
      await audit(t, 'license.reward_extended', { licenseId: current.id, userId, detail: { source, months, days, until } });
      return { action: 'extended', license: await getLicense(t, current.id) };
    }
    const { license } = await insertLicense(t, { email: user.email, userId, source, plan: 'reward', periodEnd: add(now) });
    await audit(t, 'license.granted', { licenseId: license.id, userId, detail: { source, months, days } });
    return { action: 'created', license };
  });
}

/** Affiliate reward: `months` of Premium (see grantRewardTime). */
export const grantRewardMonths = (db, userId, months) => grantRewardTime(db, userId, { months });

/**
 * grantRewardTime, then for a Stripe subscriber a free trial until the new date: no payment until then, then the
 * subscription renews as before (or ends then, if they had canceled).
 */
export async function givePremiumTime(db, stripe, userId, time) {
  const r = await grantRewardTime(db, userId, time);
  if (r.action === 'subscription') {
    if (!stripe) throw new Error('Stripe is needed to skip the payments of a subscriber');
    await stripe.subscriptions.update(r.subscriptionId, { trial_end: Math.floor(r.until / 1000), proration_behavior: 'none' });
    await rewardSubscription(db, r.license.id, r.until, time.months ?? 0);
  }
  return r;
}

/** After Stripe accepted the skipped payments: the license shows the new paid-until date right away. */
export async function rewardSubscription(db, licenseId, until, months) {
  await db.run('UPDATE licenses SET current_period_end = GREATEST(COALESCE(current_period_end, 0), ?) WHERE id = ?', [until, licenseId]);
  await audit(db, 'license.reward_extended', { licenseId, detail: { months, until, stripe: true } });
}

/** Reward licenses past their end date stop, like an ended subscription (the app then offers to buy). */
export async function expireRewards(db) {
  const rows = await db.all("SELECT id FROM licenses WHERE plan = 'reward' AND status = 'active' AND current_period_end < ?", [Date.now()]);
  for (const r of rows) await setLicenseStatus(db, r.id, 'revoked', 'subscription_ended');
  return rows.length;
}

/** The license as it is now: a reward license past its end date is stopped first. */
export async function current(db, license) {
  if (license?.plan !== 'reward' || license.status !== 'active' || Number(license.current_period_end) >= Date.now()) return license;
  await setLicenseStatus(db, license.id, 'revoked', 'subscription_ended');
  return getLicense(db, license.id);
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
