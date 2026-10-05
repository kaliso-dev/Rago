// Affiliate program: each affiliate gets a code; a buyer enters it once, when creating their account
// after paying. A referral counts after the hold period if the buyer wasn't refunded, didn't dispute
// and activated Rago Hub on a PC that isn't the affiliate's. At the goal (3), the affiliate gets
// Rago Hub Premium for life, locked to one PC like any license.
import { randomBytes } from 'node:crypto';
import { audit } from './db.js';
import { newId } from './crypto.js';
import { COMPONENTS } from './fingerprint.js';
import { LicenseError, getUser, makeLifetime } from './licensing.js';

const DAY = 86400000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

export const normalizeCode = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);

function newCode() {
  const bytes = randomBytes(6);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const getAffiliate = (db, userId) => db.get('SELECT * FROM affiliates WHERE user_id = ?', [userId]);
export const affiliateByCode = (db, code) => (code ? db.get('SELECT * FROM affiliates WHERE code = ?', [normalizeCode(code)]) : null);

export async function joinAffiliate(db, userId) {
  for (let i = 0; i < 5; i++) {
    const row = await db.get(`INSERT INTO affiliates (user_id, code, created_at) VALUES (?, ?, ?)
      ON CONFLICT DO NOTHING RETURNING *`, [userId, newCode(), Date.now()]);
    if (row) {
      await audit(db, 'affiliate.joined', { userId });
      return row;
    }
    const existing = await getAffiliate(db, userId);
    if (existing) return existing; // already joined; otherwise the code collided, try another
  }
  throw new Error('Could not allocate an affiliate code');
}

/** Checks a code typed at sign-up, before the account exists. */
export async function checkCode(db, code, buyerEmail) {
  const aff = await affiliateByCode(db, code);
  if (!aff) throw new LicenseError('invalid_code');
  const owner = await getUser(db, aff.user_id);
  if (owner && buyerEmail && owner.email === String(buyerEmail).trim().toLowerCase()) throw new LicenseError('self_referral');
  return aff;
}

/** Links a new account and its just-claimed license to an affiliate. One code per buyer, ever. */
export async function recordReferral(db, aff, referredUserId, license) {
  if (aff.user_id === referredUserId || license.user_id !== referredUserId) throw new LicenseError('self_referral');
  const owner = await getUser(db, aff.user_id);
  if (owner?.email === license.email) throw new LicenseError('self_referral');
  if (license.stripe_customer_id) {
    const sameCustomer = await db.get('SELECT 1 FROM licenses WHERE user_id = ? AND stripe_customer_id = ?', [aff.user_id, license.stripe_customer_id]);
    if (sameCustomer) throw new LicenseError('self_referral');
  }
  const row = await db.get(`INSERT INTO referrals (id, affiliate_user_id, referred_user_id, license_id, created_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING RETURNING *`, [newId('ref'), aff.user_id, referredUserId, license.id, Date.now()]);
  if (row) await audit(db, 'referral.created', { licenseId: license.id, userId: aff.user_id, detail: { referred: referredUserId } });
  return row;
}

export async function voidReferrals(db, licenseIds, reason) {
  for (const id of licenseIds) {
    await db.run("UPDATE referrals SET status = 'void', void_reason = ? WHERE license_id = ? AND status <> 'void'", [reason, id]);
  }
}

// Stricter than the activation rule: any shared identifier means the same PC.
const anyMatch = (a, b) => COMPONENTS.some((k) => a[k] && b[k] && a[k] === b[k]);

/**
 * Counts the referrals that have cleared the hold period and, at the goal, grants the reward once.
 * Safe to call often (page views, app sign-in, the hourly sweep).
 * Returns { subscriptionToCancel } when an affiliate who was subscribed just got the lifetime license.
 */
export async function evaluateAffiliate(db, cfg, userId) {
  const counted = await db.tx(async (t) => {
    const aff = await t.get('SELECT * FROM affiliates WHERE user_id = ? FOR UPDATE', [userId]);
    if (!aff) return 0;
    const due = Date.now() - cfg.affiliateHoldDays * DAY;
    const pending = await t.all(`SELECT r.*, l.status AS lic_status, l.status_reason AS lic_reason, l.created_at AS bought_at,
        l.stripe_customer_id AS lic_customer
      FROM referrals r JOIN licenses l ON l.id = r.license_id
      WHERE r.affiliate_user_id = ? AND r.status = 'pending' AND l.created_at <= ? AND r.machine_guid IS NOT NULL
      ORDER BY r.created_at`, [userId, due]);
    if (pending.length) {
      const own = await t.all('SELECT d.* FROM devices d JOIN licenses l ON l.id = d.license_id WHERE l.user_id = ?', [userId]);
      const ownCustomers = new Set((await t.all('SELECT stripe_customer_id FROM licenses WHERE user_id = ? AND stripe_customer_id IS NOT NULL', [userId])).map((r) => r.stripe_customer_id));
      const seen = await t.all("SELECT * FROM referrals WHERE affiliate_user_id = ? AND status = 'counted'", [userId]);
      for (const r of pending) {
        let voidReason = null;
        if (r.lic_status !== 'active' && r.lic_reason !== 'subscription_ended') voidReason = r.lic_reason || 'revoked';
        else if (own.some((d) => anyMatch(d, r)) || seen.some((s) => anyMatch(s, r))) voidReason = 'same_device';
        else if (r.lic_customer && ownCustomers.has(r.lic_customer)) voidReason = 'same_payer';
        if (voidReason) {
          await t.run("UPDATE referrals SET status = 'void', void_reason = ? WHERE id = ?", [voidReason, r.id]);
        } else {
          await t.run("UPDATE referrals SET status = 'counted', counted_at = ? WHERE id = ?", [Date.now(), r.id]);
          seen.push(r);
        }
      }
    }
    return (await t.get("SELECT COUNT(*)::int AS n FROM referrals WHERE affiliate_user_id = ? AND status = 'counted'", [userId])).n;
  });

  if (counted < cfg.affiliateGoal) return {};
  // Claim the reward atomically, then grant it.
  const won = await db.get(`UPDATE affiliates SET reward_granted_at = ? WHERE user_id = ? AND reward_granted_at IS NULL
    RETURNING user_id`, [Date.now(), userId]);
  if (!won) return {};
  const { license, subscriptionToCancel } = await makeLifetime(db, userId, 'affiliate');
  await db.run('UPDATE affiliates SET reward_license_id = ? WHERE user_id = ?', [license.id, userId]);
  await audit(db, 'affiliate.rewarded', { licenseId: license.id, userId });
  return { rewarded: true, subscriptionToCancel };
}

/** Everything the /affiliate page shows. */
export async function affiliateSummary(db, cfg, userId) {
  const aff = await getAffiliate(db, userId);
  if (!aff) return null;
  const rows = await db.all(`SELECT r.status, r.void_reason, r.created_at, r.machine_guid, l.email, l.created_at AS bought_at
    FROM referrals r JOIN licenses l ON l.id = r.license_id WHERE r.affiliate_user_id = ? ORDER BY r.created_at DESC`, [userId]);
  const referrals = rows.map((r) => ({
    email: maskEmail(r.email),
    status: r.status,
    voidReason: r.void_reason,
    since: r.created_at,
    countsFrom: r.status === 'pending' ? r.bought_at + cfg.affiliateHoldDays * DAY : null,
    activated: !!r.machine_guid,
  }));
  return {
    code: aff.code,
    goal: cfg.affiliateGoal,
    counted: referrals.filter((r) => r.status === 'counted').length,
    pending: referrals.filter((r) => r.status === 'pending').length,
    rewarded: !!aff.reward_granted_at,
    referrals,
  };
}

/** Affiliates with referrals that may have cleared the hold period since the last check. */
export async function affiliatesToEvaluate(db, cfg) {
  const rows = await db.all(`SELECT DISTINCT r.affiliate_user_id AS id FROM referrals r
    JOIN affiliates a ON a.user_id = r.affiliate_user_id JOIN licenses l ON l.id = r.license_id
    WHERE r.status = 'pending' AND a.reward_granted_at IS NULL AND l.created_at <= ?`, [Date.now() - cfg.affiliateHoldDays * DAY]);
  return rows.map((r) => r.id);
}

export function maskEmail(email) {
  const [name, domain = ''] = String(email).split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(2, Math.min(6, name.length - 2)))}@${domain}`;
}

/** evaluateAffiliate, then stops the Stripe renewals of an affiliate who just got the lifetime license. Never throws. */
export async function settleAffiliate(db, cfg, stripe, log, userId) {
  try {
    const out = await evaluateAffiliate(db, cfg, userId);
    if (out.subscriptionToCancel && stripe) {
      await stripe.subscriptions.update(out.subscriptionToCancel, { cancel_at_period_end: true })
        .catch((err) => log.error('[stripe] could not stop renewals after affiliate reward', err.message));
    }
    return out;
  } catch (err) {
    log.error('[affiliate] evaluation failed', err);
    return {};
  }
}
