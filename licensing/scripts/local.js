// npm run local: the account server and the site on this computer, http://localhost:8787, for development.
// Nothing here reaches the live Rago, even when the terminal still has the live variables (DATABASE_URL for
// npm run admin, for example): in-memory database, no live Stripe key, no emails, no Discord bot, no Supabase.
// Restarts by itself when a file of src/ changes; the test account comes back each time (DEV_SEED).
import { fileURLToPath } from 'node:url';

const env = process.env;
const dropped = [];
const drop = (...names) => {
  for (const k of names) if (env[k]) { dropped.push(k); delete env[k]; }
};
drop('DATABASE_URL', 'RESEND_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'LICENSE_SIGNING_KEY', 'SESSION_SECRET',
  'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_ROLE_ID',
  'DISCORD_VIP_ROLE_ID', 'DISCORD_MVP_ROLE_ID', 'DISCORD_BOOST2_ROLE_ID', 'RAILWAY_ENVIRONMENT_NAME', 'APP_ENV');
// Stripe test keys may stay (checkout with test cards, webhooks through the Stripe CLI); a live key never.
if (/^(sk|rk)_live_/.test((env.STRIPE_SECRET_KEY || '').trim())) drop('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY', 'STRIPE_PRICE_ID', 'STRIPE_PRICE_LIFETIME');

env.NODE_ENV = 'development';
env.PORT ||= '8787';
env.PUBLIC_URL = `http://localhost:${env.PORT}`;
env.SITE_URL = env.PUBLIC_URL; // the site is served by this server (SITE_DIR)
env.SITE_DIR = fileURLToPath(new URL('../../site', import.meta.url));
env.EMAIL_VERIFICATION ||= '1'; // sign-up codes are printed in this Terminal
env.DEV_SEED ||= 'test@rago.dev:password123';
delete env.LAUNCH_AT; // no countdown here

const [seedEmail, seedPassword] = env.DEV_SEED.split(':');
console.log(`
  Rago, local copy (nothing here touches the live site, accounts or Stripe)
  Site       ${env.PUBLIC_URL}
  Account    ${env.PUBLIC_URL}/login   ${seedEmail} / ${seedPassword} (Premium)
  The database is in memory: it starts empty at each restart.${dropped.length ? `\n  Ignored here: ${dropped.join(', ')}` : ''}
`);

await import('../src/server.js');
