// What the privacy policy promises about how long data is kept (site/tools/make_legal.py, « How long we keep it »),
// applied by the server's hourly sweep. Network tests have their own purge (network.js).
const DAY = 86400000;
/** Security log: 12 months. The two subscription markers stay: billing.js reads them to know a subscription
 *  replaced by Lifetime was already stopped. */
export const AUDIT_DAYS = 365;
/** Free trials (email and card fingerprint): 2 years, to refuse a second trial to the same person or card. */
export const TRIAL_DAYS_KEPT = 730;

/** Discord server members: their join record, 12 months after they left the server. */
export const LEFT_DAYS = 365;

export async function purgeOldRecords(db, now = Date.now()) {
  await db.run("DELETE FROM audit WHERE at < ? AND type NOT IN ('license.subscription_stopped', 'license.subscription_replaced')", [now - AUDIT_DAYS * DAY]);
  await db.run('DELETE FROM discord_joins WHERE left_at IS NOT NULL AND left_at > 0 AND left_at < ?', [now - LEFT_DAYS * DAY]);
  // Sign-up codes (with the password hash of an account not created yet): a day after they expired.
  await db.run('DELETE FROM signup_codes WHERE expires_at < ?', [now - DAY]);
  await db.run('DELETE FROM trials WHERE started_at < ?', [now - TRIAL_DAYS_KEPT * DAY]);
}
