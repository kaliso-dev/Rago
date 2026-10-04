import { serve } from '@hono/node-server';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { loadKeys } from './tokens.js';
import { createStripe } from './billing.js';
import { createMailer } from './mailer.js';
import { createApp } from './app.js';

const cfg = loadConfig();
const db = openDb(cfg.dbPath);
const keys = loadKeys(cfg.signingKeyPem);
const app = createApp({ cfg, db, keys, stripe: createStripe(cfg), mailer: createMailer(cfg) });

if (cfg.ephemeralSigningKey) console.warn('[warn] LICENSE_SIGNING_KEY not set: using a temporary key. License tokens break on restart.');
if (!cfg.stripeSecretKey) console.warn('[warn] STRIPE_SECRET_KEY not set: /buy and the webhook are disabled.');

serve({ fetch: app.fetch, port: cfg.port }, () => console.log(`Rago licensing on ${cfg.publicUrl} (port ${cfg.port})`));
