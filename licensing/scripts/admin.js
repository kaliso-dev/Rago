// Support tools. Usage: npm run admin -- <command> [args]
//   show <email>                 account, license, device and recent events, plus purchases with this
//                                email that no account holds yet
//   attach <email> [license-id]  put a paid license nobody claimed on this account (tab closed, account
//                                made on another device or after 48 h). license-id: when it was paid
//                                with another email (see show <purchase email>)
//   claim-link <email>           new "create your account" link for an unclaimed purchase (old link stops)
//   reset-link <email>           a "choose a new password" link (1 hour), when the email doesn't arrive
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
  if (!email) { console.error('Give the email.'); process.exit(1); }
  const user = await L.findUserByEmail(db, email);
  const lic = (user && await L.licenseForUser(db, user.id)) || (await L.unclaimedLicenses(db, email))[0];
  if (!lic) { console.error(`No license for ${email}`); process.exit(1); }
  return { user, lic };
}
const unclaimedLine = (l) => `${l.id}  ${l.email}  ${l.status}  ${l.plan}  ${l.source}  paid ${fmt(l.created_at)}${l.referral_code ? `  code ${l.referral_code}` : ''}`;

switch (cmd) {
  case 'show': {
    const { user, lic } = await licenseOf(email);
    const dev = await L.getDevice(db, lic.id);
    console.log({ account: user ? { id: user.id, email: user.email, created: fmt(user.created_at) } : 'none (unclaimed)',
      license: { id: lic.id, key: lic.key, status: lic.status, reason: lic.status_reason, source: lic.source, plan: lic.plan, paid_until: fmt(lic.current_period_end), cancel_at_period_end: lic.cancel_at_period_end,
        subscription: lic.stripe_subscription_id, created: fmt(lic.created_at), payment_intent: lic.stripe_payment_intent },
      device: dev ? { name: dev.name, os: dev.os, bound: fmt(dev.bound_at), last_seen: fmt(dev.last_seen_at), ip: dev.last_ip } : 'not activated' });
    for (const e of await db.all('SELECT * FROM audit WHERE license_id = ? ORDER BY id DESC LIMIT 15', [lic.id])) console.log(fmt(e.at), e.type, e.detail || '');
    const loose = (await L.unclaimedLicenses(db, email)).filter((l) => l.id !== lic.id || user);
    if (loose.length) {
      console.log(`\nNot on any account yet (${user ? 'attach' : 'claim-link'} ${email}):`);
      for (const l of loose) console.log(' ', unclaimedLine(l));
    }
    break;
  }
  case 'attach': {
    const user = await L.findUserByEmail(db, email);
    if (!user) { console.error(`No account for ${email}: send them a claim-link instead, or ask them to create the account first.`); process.exit(1); }
    let lic;
    if (rest[0]) lic = await L.getLicense(db, rest[0]);
    else {
      const loose = await L.unclaimedLicenses(db, email);
      if (loose.length > 1) { console.error('Several unclaimed licenses, add the id:'); for (const l of loose) console.error(' ', unclaimedLine(l)); process.exit(1); }
      lic = loose[0];
    }
    if (!lic) { console.error(`No unclaimed license for ${email}. Paid with another email? Run show <that email>, then attach ${email} <license-id>.`); process.exit(1); }
    try {
      await L.claimLicense(db, lic.id, user.id);
    } catch (err) {
      const why = { already_claimed: 'that license is already on another account', already_has_license: `${email} already has an active license (duplicate purchase? refund it in Stripe, then revoke the extra one)`, not_found: 'no license with that id' }[err.code];
      if (!why) throw err;
      console.error(`Not attached: ${why}.`); process.exit(1);
    }
    console.log(`License ${lic.key} is now on ${email}. They see it on their account page and can activate it in the app.`);
    if (lic.referral_code) console.log(`The purchase came with referral code ${lic.referral_code}: it isn't applied by hand (run affiliate <affiliate email> to check that player's status).`);
    break;
  }
  case 'claim-link': {
    const loose = await L.unclaimedLicenses(db, email || '');
    if (!loose.length) { console.error(`No unclaimed license for ${email}.`); process.exit(1); }
    const lic = rest[0] ? loose.find((l) => l.id === rest[0]) : loose[0];
    if (!lic) { console.error('That id is not one of them.'); process.exit(1); }
    console.log(`Send this link to ${lic.email} (create the account or sign in, the license follows):\n${cfg.publicUrl}/claim/${await L.newClaimToken(db, lic.id)}`);
    break;
  }
  case 'reset-link': {
    const user = await L.findUserByEmail(db, email || '');
    if (!user) { console.error(`No account for ${email}.`); process.exit(1); }
    console.log(`Send this link to ${user.email} only (works for 1 hour):\n${cfg.publicUrl}/reset/${await L.createPasswordReset(db, user.id)}`);
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
    const risk = await db.all("SELECT * FROM audit WHERE user_id = ? AND type = 'affiliate.reward_at_risk' ORDER BY id", [user.id]);
    if (risk.length) {
      console.log(`\nWarning: ${risk.length} counted player(s) refunded or disputed after the reward. The lifetime license stays;`);
      console.log(`to take it back: revoke ${email} affiliate_fraud (only if it's the reward license, see show ${email}).`);
      for (const e of risk) console.log(' ', fmt(e.at), e.detail || '');
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
    console.log('Commands: show, attach, claim-link, reset-link, reset-device, revoke, restore, grant, affiliate, create-user, delete-user, export-keys (see scripts/admin.js)');
}
await db.close();
