import { serve } from '@hono/node-server';
import { loadConfig } from './config.js';
import { ensureKeys, openDb, openMemoryDb } from './db.js';
import { loadKeys } from './tokens.js';
import { createStripe, stripeChecks } from './billing.js';
import { createMailer } from './mailer.js';
import { createApp } from './app.js';
import { createDiscord } from './discord.js';
import { createCommunity } from './community.js';
import { createGeo } from './geo.js';
import { purgeNetworkReports } from './network.js';

const cfg = loadConfig();
for (const w of cfg.warnings) console.warn(`[warn] ${w}`);
if (cfg.staging) console.log(`[env] "${cfg.envName}" test server: Stripe test keys only, a banner on every page, [Test] in email subjects.`);
const db = cfg.databaseUrl ? await openDb(cfg.databaseUrl, { envName: cfg.envName }) : await openMemoryDb();
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
const discord = createDiscord(cfg, { db, stripe });
// The community bot (DISCORD_COMMUNITY=1): the same bot, listening live to the server for joins, invites and commands.
const community = cfg.discordCommunity ? createCommunity(cfg, { db, discord }) : null;
// Where the app's network tests come from (DB-IP's free databases, about 150 MB in memory): read now, not at the first test.
const geo = createGeo(cfg);
geo.load();
const app = createApp({ cfg, db, keys, stripe, mailer: createMailer(cfg), discord, community, geo });

// Prices, webhook destination and customer portal in the key's Stripe mode (the same list as /admin).
if (stripe) {
  stripeChecks(stripe, cfg, { db })
    .then(({ mode, checks, testLicenses }) => {
      console.log(`[stripe] ${mode} mode`);
      for (const c of checks) if (c.level !== 'ok') console.warn(`[warn] Stripe, ${c.label} : ${c.text}`);
      if (testLicenses) console.warn(`[warn] Stripe : ${testLicenses} licence(s) active(s) viennent d'achats en mode test (bouton sur /admin).`);
    })
    .catch((err) => console.error('[stripe] setup check failed', err.message));
}

// Hourly: referrals that cleared the hold period count, affiliates at the goal get their reward even if
// they don't open their account page, ended affiliate rewards stop, affiliate codes become Stripe
// promotion codes (after a switch between test and live keys too), and subscriptions replaced by Lifetime stop.
const { affiliatesToEvaluate, settleAffiliate } = await import('./affiliates.js');
const { expireRewards } = await import('./licensing.js');
const { stopAllReplacedSubscriptions, syncAffiliatePromos } = await import('./billing.js');
const sweep = async () => {
  try {
    for (const id of await affiliatesToEvaluate(db, cfg)) await settleAffiliate(db, cfg, stripe, console, id);
    await expireRewards(db);
    await syncAffiliatePromos(db, stripe, cfg, console);
  } catch (err) { console.error('[affiliate] sweep failed', err); }
  // A subscription replaced by Lifetime that Stripe didn't let us cancel at the purchase: tried again.
  try { await stopAllReplacedSubscriptions(db, stripe, console); } catch (err) { console.error('[stripe] Lifetime sweep failed', err); }
  // Network tests older than 12 months (privacy policy).
  try { await purgeNetworkReports(db); } catch (err) { console.error('[network] purge failed', err); }
};
setInterval(sweep, 60 * 60 * 1000).unref();
setTimeout(sweep, 30 * 1000).unref();

// Discord Pro role: every 5 minutes, the linked accounts whose Premium changed without a Stripe event (support
// revoke or restore, an affiliate reward that ended, a retry after Discord refused). Once a day, the role is
// given again to every Premium account, for players who left the server and came back.
if (discord) {
  console.log('[discord] Pro role bot on: roles follow Premium.');
  setInterval(() => discord.syncAll(), 5 * 60 * 1000).unref();
  setInterval(() => discord.syncAll({ all: true }), 24 * 60 * 60 * 1000).unref();
  setTimeout(() => discord.syncAll({ all: true }), 60 * 1000).unref();
}
if (community) community.start();

if (!cfg.databaseUrl) console.warn('[warn] DATABASE_URL not set: in-memory database and keys, everything is lost on restart.');
if (!cfg.stripeSecretKey) console.warn('[warn] STRIPE_SECRET_KEY not set: /buy and the webhook are disabled.');

serve({ fetch: app.fetch, port: cfg.port }, () => console.log(`Rago licensing on ${cfg.publicUrl} (port ${cfg.port})`));
