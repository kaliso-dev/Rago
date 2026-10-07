// Support tools. Usage: npm run admin -- <command> [args]
//   show <email>                 account, license, device and recent events
//   reset-device <email>         free the device so the license can be activated on another PC
//   revoke <email> [reason]      disable the license (Rago Optimizer goes back to free at its next check)
//   restore <email>              re-enable a revoked license
//   grant <email> [note]         create a license by hand (e.g. Discord buyers of the .bat Premium)
//   create-user <email> <pass>   create an account (testing)
//   affiliate <email>            affiliate code, referrals and why each counts or not
//   delete-user <email>          GDPR erasure: cancel the subscription, delete the account, PC and
//                                sessions, anonymize the license kept for accounting
//   export-keys                  print LICENSE_SIGNING_KEY and SESSION_SECRET to save outside the database
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import * as L from '../src/licensing.js';
import * as A from '../src/affiliates.js';
import Stripe from 'stripe';

const cfg = loadConfig({ ...process.env, NODE_ENV: 'development' });
if (!cfg.databaseUrl) { console.error('Set DATABASE_URL (Supabase connection string) first.'); process.exit(1); }
const db = await openDb(cfg.databaseUrl);
const [cmd, email, ...rest] = process.argv.slice(2);
const fmt = (ms) => (ms ? new Date(ms).toISOString() : '-');

async function licenseOf(email) {
  const user = await L.findUserByEmail(db, email);
  const lic = user ? await L.licenseForUser(db, user.id)
    : await db.get('SELECT * FROM licenses WHERE email = ? ORDER BY created_at DESC LIMIT 1', [email.toLowerCase()]);
  if (!lic) { console.error(`No license for ${email}`); process.exit(1); }
  return { user, lic };
}

switch (cmd) {
  case 'show': {
    const { user, lic } = await licenseOf(email);
    const dev = await L.getDevice(db, lic.id);
    console.log({ account: user ? { id: user.id, email: user.email, created: fmt(user.created_at) } : 'none (unclaimed)',
      license: { id: lic.id, key: lic.key, status: lic.status, reason: lic.status_reason, source: lic.source, plan: lic.plan, paid_until: fmt(lic.current_period_end), cancel_at_period_end: lic.cancel_at_period_end,
        subscription: lic.stripe_subscription_id, created: fmt(lic.created_at), payment_intent: lic.stripe_payment_intent },
      device: dev ? { name: dev.name, os: dev.os, bound: fmt(dev.bound_at), last_seen: fmt(dev.last_seen_at), ip: dev.last_ip } : 'not activated' });
    for (const e of await db.all('SELECT * FROM audit WHERE license_id = ? ORDER BY id DESC LIMIT 15', [lic.id])) console.log(fmt(e.at), e.type, e.detail || '');
    break;
  }
  case 'reset-device': await L.resetDevice(db, (await licenseOf(email)).lic.id, 'support'); console.log('Device freed.'); break;
  case 'revoke': await L.setLicenseStatus(db, (await licenseOf(email)).lic.id, 'revoked', rest[0] || 'manual'); console.log('Revoked.'); break;
  case 'restore': await L.setLicenseStatus(db, (await licenseOf(email)).lic.id, 'active', null); console.log('Restored.'); break;
  case 'grant': {
    const { license, claimToken } = await L.grantLicense(db, email, rest.join(' '));
    console.log(`License ${license.key} for ${email}.`);
    console.log(claimToken ? `Send this link so they create their account: ${cfg.publicUrl}/claim/${claimToken}` : 'Added to their existing account.');
    break;
  }
  case 'affiliate': {
    const user = await L.findUserByEmail(db, email);
    if (!user) { console.error(`No account for ${email}`); process.exit(1); }
    await A.evaluateAffiliate(db, cfg, user.id);
    const sum = await A.affiliateSummary(db, cfg, user.id);
    if (!sum) { console.log('Not in the affiliate program.'); break; }
    console.log({ code: sum.code, counted: `${sum.counted}/${sum.goal}`, rewarded: sum.rewarded });
    for (const r of await db.all(`SELECT r.status, r.void_reason, r.created_at, r.machine_guid IS NOT NULL AS activated, l.email
      FROM referrals r JOIN licenses l ON l.id = r.license_id WHERE r.affiliate_user_id = ? ORDER BY r.created_at`, [user.id])) {
      console.log(fmt(r.created_at), r.email, r.status, r.void_reason || '', r.activated ? 'activated' : 'not activated');
    }
    break;
  }
  case 'create-user': await L.createUser(db, email, rest[0]); console.log('User created.'); break;
  case 'delete-user': {
    const target = String(email || '').toLowerCase();
    const user = await L.findUserByEmail(db, target);
    const lics = await db.all('SELECT * FROM licenses WHERE email = ? OR (user_id IS NOT NULL AND user_id = ?)', [target, user?.id ?? '']);
    if (!user && !lics.length) { console.error(`Nothing stored for ${target}`); process.exit(1); }
    const stripe = cfg.stripeSecretKey ? new Stripe(cfg.stripeSecretKey) : null;
    for (const l of lics) {
      if (l.stripe_subscription_id && l.status === 'active') {
        if (!stripe) { console.error('Active subscription: set STRIPE_SECRET_KEY so it can be canceled first.'); process.exit(1); }
        try { await stripe.subscriptions.cancel(l.stripe_subscription_id); console.log(`Subscription ${l.stripe_subscription_id} canceled.`); }
        catch (err) { if (!/No such subscription|canceled/i.test(err.message)) throw err; }
      }
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
        await t.run('DELETE FROM users WHERE id = ?', [user.id]); // sessions, resets, affiliate, referrals follow
      }
    });
    console.log(`Deleted ${target}: account ${user ? 'removed' : 'none'}, ${lics.length} license(s) anonymized.`);
    break;
  }
  case 'export-keys': {
    // The signing key's public half is compiled into every Rago Optimizer build: lose it and every
    // installed app rejects new licenses. Keep these two values in a password manager.
    const rows = await db.all("SELECT name, value FROM server_secrets WHERE name IN ('license_signing_key', 'session_secret')");
    const get = (n) => rows.find((r) => r.name === n)?.value;
    if (process.env.LICENSE_SIGNING_KEY) console.log('LICENSE_SIGNING_KEY is set in the environment: that is the key in use, keep that value.');
    else if (get('license_signing_key')) console.log(`LICENSE_SIGNING_KEY=${Buffer.from(get('license_signing_key')).toString('base64')}`);
    if (process.env.SESSION_SECRET) console.log('SESSION_SECRET is set in the environment: that is the one in use.');
    else if (get('session_secret')) console.log(`SESSION_SECRET=${get('session_secret')}`);
    break;
  }
  default:
    console.log('Commands: show, reset-device, revoke, restore, grant, affiliate, create-user, delete-user, export-keys (see scripts/admin.js)');
}
await db.close();
