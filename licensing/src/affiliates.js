// Affiliate program: each affiliate gets a code; a buyer enters it once, when creating their account
// after paying. A referral counts after the hold period if the buyer wasn't refunded, didn't dispute
// and activated Rago Optimizer on a PC that isn't the affiliate's. Each time the goal (3) is reached,
// the affiliate gets 6 months of Rago Optimizer Premium, locked to one PC like any license.
import { randomBytes } from 'node:crypto';
import { audit } from './db.js';
import { newId } from './crypto.js';
import { COMPONENTS } from './fingerprint.js';
import { LicenseError, getUser, grantRewardMonths, rewardSubscription } from './licensing.js';

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
  if (row) {
    await audit(db, 'referral.created', { licenseId: license.id, userId: aff.user_id, detail: { referred: referredUserId } });
    // Already activated (code applied after the app was set up): that PC is the one compared.
    await db.run(`UPDATE referrals SET machine_guid = d.machine_guid, smbios_uuid = d.smbios_uuid, board_serial = d.board_serial
      FROM devices d WHERE d.license_id = referrals.license_id AND referrals.id = ? AND referrals.machine_guid IS NULL`, [row.id]);
  }
  return row;
}

/** Remembers a PC an account signed in from in the app (fingerprint hashes only). */
export async function rememberDevice(db, userId, parsed) {
  const device = parsed.fp || parsed;
  const fp = COMPONENTS.map((k) => device[k] || '').join('|');
  if (!fp.replace(/\|/g, '')) return;
  await db.run(`INSERT INTO account_devices (user_id, fp, machine_guid, smbios_uuid, board_serial, seen_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id, fp) DO UPDATE SET seen_at = excluded.seen_at`,
  [userId, fp, device.machine_guid || null, device.smbios_uuid || null, device.board_serial || null, Date.now()]);
}

export async function voidReferrals(db, licenseIds, reason) {
  for (const id of licenseIds) {
    const was = await db.get('SELECT status, affiliate_user_id FROM referrals WHERE license_id = ?', [id]);
    await db.run("UPDATE referrals SET status = 'void', void_reason = ? WHERE license_id = ? AND status <> 'void'", [reason, id]);
    // A reward already given is kept (taking it back is Sofiene's call); support sees it in admin affiliate.
    if (was?.status === 'counted') {
      const aff = await db.get('SELECT reward_license_id FROM affiliates WHERE user_id = ? AND reward_granted_at IS NOT NULL', [was.affiliate_user_id]);
      if (aff) await audit(db, 'affiliate.reward_at_risk', { licenseId: aff.reward_license_id, userId: was.affiliate_user_id, detail: { referral_license: id, reason } });
    }
  }
}

// Stricter than the activation rule: any shared identifier means the same PC.
const anyMatch = (a, b) => COMPONENTS.some((k) => a[k] && b[k] && a[k] === b[k]);

/**
 * Counts the referrals that have cleared the hold period and, at each goal reached, grants the reward once.
 * Safe to call often (activations, page views, app sign-in, the hourly sweep).
 * A subscribed affiliate's reward skips their Stripe payments, so `stripe` is needed for them.
 */
export async function evaluateAffiliate(db, cfg, userId, { stripe = null, log = console } = {}) {
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
      // The affiliate's PCs: those of their licenses, and any PC they signed in from in the app (free too).
      const own = [
        ...await t.all('SELECT d.* FROM devices d JOIN licenses l ON l.id = d.license_id WHERE l.user_id = ?', [userId]),
        ...await t.all('SELECT * FROM account_devices WHERE user_id = ?', [userId]),
      ];
      const ownCustomers = new Set((await t.all('SELECT stripe_customer_id FROM licenses WHERE user_id = ? AND stripe_customer_id IS NOT NULL', [userId])).map((r) => r.stripe_customer_id));
      const seen = await t.all("SELECT * FROM referrals WHERE affiliate_user_id = ? AND status = 'counted'", [userId]);
      for (const r of pending) {
        let voidReason = null;
        if (r.lic_status !== 'active') voidReason = r.lic_reason || 'revoked';
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

  const out = { counted, rewards: [] };
  for (;;) {
    const aff = await getAffiliate(db, userId);
    if (!aff || counted < cfg.affiliateGoal * (aff.rewards + 1)) return out;
    if (cfg.affiliateRewardMax && aff.rewards >= cfg.affiliateRewardMax) return out;
    // Claim this reward atomically, then give it; if giving fails, the claim is undone and retried later.
    const won = await db.get(`UPDATE affiliates SET rewards = rewards + 1, reward_granted_at = ? WHERE user_id = ? AND rewards = ?
      RETURNING rewards`, [Date.now(), userId, aff.rewards]);
    if (!won) return out;
    try {
      out.rewards.push(await giveReward(db, cfg, stripe, userId, won.rewards));
    } catch (err) {
      await db.run('UPDATE affiliates SET rewards = rewards - 1 WHERE user_id = ? AND rewards = ?', [userId, won.rewards]);
      await audit(db, 'affiliate.reward_failed', { userId, detail: { reward: won.rewards, error: String(err.message || err).slice(0, 200) } });
      throw err;
    }
  }
}

async function giveReward(db, cfg, stripe, userId, n) {
  const months = cfg.affiliateRewardMonths;
  const r = await grantRewardMonths(db, userId, months);
  if (r.action === 'subscription') {
    if (!stripe) throw new Error('Stripe is needed to skip the payments of a subscribed affiliate');
    // A free trial until `until`: no payment until then, then the subscription renews as before
    // (or ends then, if they had canceled).
    await stripe.subscriptions.update(r.subscriptionId, { trial_end: Math.floor(r.until / 1000), proration_behavior: 'none' });
    await rewardSubscription(db, r.license.id, r.until, months);
  }
  await db.run('UPDATE affiliates SET reward_license_id = ? WHERE user_id = ?', [r.license.id, userId]);
  await audit(db, 'affiliate.rewarded', { licenseId: r.license.id, userId, detail: { reward: n, months, action: r.action } });
  return { n, action: r.action, licenseId: r.license.id };
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
  const goal = cfg.affiliateGoal;
  const counted = referrals.filter((r) => r.status === 'counted').length;
  // Progress towards the next reward: the counted players beyond those already rewarded.
  const progress = Math.min(goal, Math.max(0, counted - goal * aff.rewards));
  const maxed = !!cfg.affiliateRewardMax && aff.rewards >= cfg.affiliateRewardMax;
  return {
    code: aff.code,
    goal,
    counted,
    progress,
    pending: maxed ? 0 : referrals.filter((r) => r.status === 'pending').length,
    rewards: aff.rewards,
    months: cfg.affiliateRewardMonths,
    maxed,
    // Just reached a goal, nobody new yet: the ring stays full until the next player.
    full: maxed || (aff.rewards > 0 && progress === 0),
    discount: cfg.affiliateDiscountPercent,
    referrals,
  };
}

/** Affiliates with referrals that may have cleared the hold period since the last check. */
export async function affiliatesToEvaluate(db, cfg) {
  const rows = await db.all(`SELECT DISTINCT r.affiliate_user_id AS id FROM referrals r
    JOIN affiliates a ON a.user_id = r.affiliate_user_id JOIN licenses l ON l.id = r.license_id
    WHERE r.status = 'pending' AND r.machine_guid IS NOT NULL AND l.created_at <= ?`, [Date.now() - cfg.affiliateHoldDays * DAY]);
  return rows.map((r) => r.id);
}

export function maskEmail(email) {
  const [name, domain = ''] = String(email).split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(2, Math.min(6, name.length - 2)))}@${domain}`;
}

/** evaluateAffiliate that never throws (a failed reward is retried at the next evaluation). */
export async function settleAffiliate(db, cfg, stripe, log, userId) {
  try {
    return await evaluateAffiliate(db, cfg, userId, { stripe, log });
  } catch (err) {
    log.error('[affiliate] evaluation failed', err);
    return {};
  }
}
