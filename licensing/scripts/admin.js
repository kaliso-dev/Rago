// Support tools. Usage: npm run admin -- <command> [args]
//   show <email>                 account, license, device and recent events
//   reset-device <email>         free the device so the license can be activated on another PC
//   revoke <email> [reason]      disable the license (Rago Hub stops at its next check)
//   restore <email>              re-enable a revoked license
//   grant <email> [note]         create a license by hand (e.g. Discord buyers of the .bat Premium)
//   create-user <email> <pass>   create an account (testing)
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import * as L from '../src/licensing.js';

const cfg = loadConfig({ ...process.env, NODE_ENV: 'development' });
const db = openDb(cfg.dbPath);
const [cmd, email, ...rest] = process.argv.slice(2);
const fmt = (ms) => (ms ? new Date(ms).toISOString() : '-');

function licenseOf(email) {
  const user = L.findUserByEmail(db, email);
  const lic = user ? L.licenseForUser(db, user.id)
    : db.prepare('SELECT * FROM licenses WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(email.toLowerCase());
  if (!lic) { console.error(`No license for ${email}`); process.exit(1); }
  return { user, lic };
}

switch (cmd) {
  case 'show': {
    const { user, lic } = licenseOf(email);
    const dev = L.getDevice(db, lic.id);
    console.log({ account: user ? { id: user.id, email: user.email, created: fmt(user.created_at) } : 'none (unclaimed)',
      license: { id: lic.id, key: lic.key, status: lic.status, reason: lic.status_reason, source: lic.source, created: fmt(lic.created_at), payment_intent: lic.stripe_payment_intent },
      device: dev ? { name: dev.name, os: dev.os, bound: fmt(dev.bound_at), last_seen: fmt(dev.last_seen_at), ip: dev.last_ip } : 'not activated' });
    for (const e of db.prepare('SELECT * FROM audit WHERE license_id = ? ORDER BY id DESC LIMIT 15').all(lic.id)) console.log(fmt(e.at), e.type, e.detail || '');
    break;
  }
  case 'reset-device': L.resetDevice(db, licenseOf(email).lic.id, 'support'); console.log('Device freed.'); break;
  case 'revoke': L.setLicenseStatus(db, licenseOf(email).lic.id, 'revoked', rest[0] || 'manual'); console.log('Revoked.'); break;
  case 'restore': L.setLicenseStatus(db, licenseOf(email).lic.id, 'active', null); console.log('Restored.'); break;
  case 'grant': {
    const { license, claimToken } = L.grantLicense(db, email, rest.join(' '));
    console.log(`License ${license.key} for ${email}.`);
    console.log(claimToken ? `Send this link so they create their account: ${cfg.publicUrl}/claim/${claimToken}` : 'Added to their existing account.');
    break;
  }
  case 'create-user': await L.createUser(db, email, rest[0]); console.log('User created.'); break;
  default:
    console.log('Commands: show, reset-device, revoke, restore, grant, create-user (see scripts/admin.js)');
}
