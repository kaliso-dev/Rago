// Support actions shared by the terminal (scripts/admin.js) and the /admin dashboard (admin.js).
import * as P from './profile.js';

const norm = (email) => String(email || '').trim().toLowerCase();

/**
 * GDPR erasure: cancels the active subscriptions, deletes the account, its PC, sessions, photo and review, and keeps the
 * licenses for accounting without the person (anonymized). deps: { stripe, avatars, discord, log }.
 * Returns { user, licenses, canceled }, or null when nothing is stored for this email.
 */
export async function deleteAccount(db, { stripe = null, avatars = null, discord = null, log = console } = {}, email) {
  const target = norm(email);
  const user = await db.get('SELECT * FROM users WHERE email = ?', [target]);
  const lics = await db.all('SELECT * FROM licenses WHERE email = ? OR (user_id IS NOT NULL AND user_id = ?)', [target, user?.id ?? '']);
  if (!user && !lics.length) return null;
  const live = lics.filter((l) => l.stripe_subscription_id && l.status === 'active');
  if (live.length && !stripe) throw new Error('Active subscription: STRIPE_SECRET_KEY is needed to cancel it first.');
  // The profile photo first (Storage); the review goes with the account below.
  if (user?.avatar_key) {
    if (!avatars || avatars.kind !== 'supabase') throw new Error('The profile photo lives in Supabase Storage: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed to delete it.');
    await P.removeAvatar(db, avatars, user.id);
  }
  // The Discord Pro role too (the link itself goes with the account).
  if (user && discord && (await db.get('SELECT role FROM discord_links WHERE user_id = ?', [user.id]))?.role) {
    try { await discord.unlink(user.id); } catch (err) { log.error?.('[discord] unlink before deletion', err.message); }
  }
  const canceled = [];
  for (const l of live) {
    try { await stripe.subscriptions.cancel(l.stripe_subscription_id); canceled.push(l.stripe_subscription_id); } catch (err) { if (!/No such subscription|canceled/i.test(err.message)) throw err; }
  }
  await db.tx(async (t) => {
    for (const l of lics) {
      await t.run('DELETE FROM devices WHERE license_id = ?', [l.id]);
      // Kept for accounting (amount, Stripe ids), without the person.
      await t.run(`UPDATE licenses SET user_id = NULL, email = ?, claim_token_hash = NULL, status = 'revoked', status_reason = 'deleted' WHERE id = ?`,
        [`deleted-${l.id}@deleted.invalid`, l.id]);
      await t.run('UPDATE audit SET detail = NULL WHERE license_id = ?', [l.id]);
    }
    if (user) {
      await t.run('UPDATE audit SET detail = NULL WHERE user_id = ?', [user.id]);
      await t.run('DELETE FROM users WHERE id = ?', [user.id]); // sessions, resets, affiliate, referrals, review follow
    }
  });
  return { user, licenses: lics, canceled };
}
