import { serve } from '@hono/node-server';
import { loadConfig } from './config.js';
import { ensureKeys, openDb, openMemoryDb } from './db.js';
import { loadKeys } from './tokens.js';
import { createStripe } from './billing.js';
import { createMailer } from './mailer.js';
import { createApp } from './app.js';

const cfg = loadConfig();
for (const w of cfg.warnings) console.warn(`[warn] ${w}`);
const db = cfg.databaseUrl ? await openDb(cfg.databaseUrl) : await openMemoryDb();
await ensureKeys(db, cfg);
const keys = loadKeys(cfg.signingKeyPem);
// Development only: DEV_SEED=email:password creates a Premium account at startup (in-memory database).
if (!cfg.databaseUrl && process.env.DEV_SEED) {
  const { createUser, grantLicense } = await import('./licensing.js');
  const [email, password] = process.env.DEV_SEED.split(':');
  await createUser(db, email, password);
  await grantLicense(db, email, 'dev seed');
  console.log(`[dev] Premium account ${email} created`);
}

const stripe = createStripe(cfg);
const app = createApp({ cfg, db, keys, stripe, mailer: createMailer(cfg) });

// Hourly: referrals that cleared the hold period count, affiliates at the goal get their reward even if
// they don't open their account page, ended affiliate rewards stop, and affiliate codes become Stripe
// promotion codes (after a switch between test and live keys too).
const { affiliatesToEvaluate, settleAffiliate } = await import('./affiliates.js');
const { expireRewards } = await import('./licensing.js');
const { syncAffiliatePromos } = await import('./billing.js');
const sweep = async () => {
  try {
    for (const id of await affiliatesToEvaluate(db, cfg)) await settleAffiliate(db, cfg, stripe, console, id);
    await expireRewards(db);
    await syncAffiliatePromos(db, stripe, cfg, console);
  } catch (err) { console.error('[affiliate] sweep failed', err); }
};
setInterval(sweep, 60 * 60 * 1000).unref();
setTimeout(sweep, 30 * 1000).unref();

if (!cfg.databaseUrl) console.warn('[warn] DATABASE_URL not set: in-memory database and keys, everything is lost on restart.');
if (!cfg.stripeSecretKey) console.warn('[warn] STRIPE_SECRET_KEY not set: /buy and the webhook are disabled.');

serve({ fetch: app.fetch, port: cfg.port }, () => console.log(`Rago licensing on ${cfg.publicUrl} (port ${cfg.port})`));
