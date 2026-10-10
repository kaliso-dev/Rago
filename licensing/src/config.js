const trimSlash = (s) => s.replace(/\/+$/, '');
// Accepts "rago.up.railway.app" as well as "https://rago.up.railway.app/".
const asUrl = (s) => (s ? trimSlash(/^https?:\/\//i.test(s.trim()) ? s.trim() : `https://${s.trim()}`) : '');

// LICENSE_SIGNING_KEY holds the Ed25519 private key, either as PEM or as base64 of the PEM
// (easier to paste into a hosting dashboard). Generate one with `npm run keys`.
function readPem(value) {
  if (!value) return '';
  const v = value.trim();
  if (v.startsWith('-----BEGIN')) return v.replace(/\\n/g, '\n');
  return Buffer.from(v, 'base64').toString('utf8');
}

export const DEFAULT_LAUNCH = '2026-10-10T13:00:00Z';
function launchTime(value, prod) {
  const t = Date.parse((value || '').trim() || (prod ? DEFAULT_LAUNCH : ''));
  return Number.isNaN(t) ? (prod ? Date.parse(DEFAULT_LAUNCH) : 0) : t;
}

export function loadConfig(env = process.env) {
  const prod = env.NODE_ENV === 'production';
  const publicUrl = asUrl(env.PUBLIC_URL) || `http://localhost:${env.PORT || 8787}`;
  const cfg = {
    prod,
    port: Number(env.PORT || 8787),
    publicUrl,
    siteUrl: asUrl(env.SITE_URL) || publicUrl,
    databaseUrl: env.DATABASE_URL || '', // empty = in-memory Postgres (dev only, lost on restart)
    supabaseUrl: asUrl(env.SUPABASE_URL),
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    // <bucket>/<path> in Supabase Storage. If that file isn't there, the newest .exe of the folder is served.
    installerObject: env.INSTALLER_OBJECT || 'downloads/RagoOptimizer-Setup.exe',
    // Private Supabase Storage bucket for profile photos, created by the server on the first upload.
    avatarBucket: (env.AVATAR_BUCKET || 'avatars').trim(),
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',

    // Trimmed: a space or a line break pasted with a key in Railway makes Stripe refuse it.
    stripeSecretKey: (env.STRIPE_SECRET_KEY || '').trim(),
    stripeWebhookSecret: (env.STRIPE_WEBHOOK_SECRET || '').trim(),
    // Subscription prices (recurring). STRIPE_PRICE_ID alone = the old one-time price, sold as a lifetime license.
    stripePriceMonthly: (env.STRIPE_PRICE_MONTHLY || '').trim(),
    stripePriceYearly: (env.STRIPE_PRICE_YEARLY || '').trim(),
    stripePriceId: (env.STRIPE_PRICE_ID || '').trim(),

    signingKeyPem: readPem(env.LICENSE_SIGNING_KEY),
    sessionSecret: env.SESSION_SECRET || '',
    // Key the app's Premium scripts are encrypted with (same value as the GitHub secret RAGO_SCRIPTS_SECRET).
    // Development falls back to the test value; production without it sends no scripts_key.
    scriptsSecret: env.SCRIPTS_SECRET || (prod ? '' : 'rago-test-scripts-secret'),

    resendApiKey: env.RESEND_API_KEY || '',
    mailFrom: env.MAIL_FROM || 'Rago Optimizer <noreply@example.com>',
    // Where players' replies to the automatic emails go (the support mailbox). Empty = no Reply-To header.
    mailReplyTo: (env.MAIL_REPLY_TO || '').trim(),
    supportUrl: env.SUPPORT_URL || '',
    // Stripe customer portal login link (Settings > Billing > Customer portal): lets a buyer cancel by
    // email, without a Rago account. Shown as "Cancel subscription" in the footer when set.
    portalLoginUrl: (env.STRIPE_PORTAL_LOGIN_URL || '').trim(),
    // Price shown on the free dashboard: "$5.99 a month or $29.99 a year" (same amounts as Stripe and the site). Empty = no price shown.
    priceLabel: env.PRICE_LABEL || '',
    freeTweaks: Number(env.FREE_TWEAKS || 9),
    premiumTweaks: Number(env.PREMIUM_TWEAKS || 199),

    cancelUrl: env.CHECKOUT_CANCEL_URL || `${asUrl(env.SITE_URL) || publicUrl}/#pricing`,
    selfServiceResetDays: Number(env.SELF_SERVICE_RESET_DAYS || 0), // 0 = support only

    siteDir: env.SITE_DIR || '',
    installerPath: env.INSTALLER_PATH || '',
    installerVersion: env.INSTALLER_VERSION || '',
    installerFileName: env.INSTALLER_FILENAME || 'RagoOptimizer-Setup.exe',
    installerUrl: env.INSTALLER_URL || '', // optional public link to the .exe, used instead of Storage

    licenseTokenDays: Number(env.LICENSE_TOKEN_DAYS || 30),
    // Days a subscriber keeps working offline past the paid period (renewal retries, clock drift).
    subscriptionGraceDays: Number(env.SUBSCRIPTION_GRACE_DAYS || 3),

    affiliateGoal: Number(env.AFFILIATE_GOAL || 3),
    // 0 = a referral counts as soon as the player activates Rago Optimizer (Sofiene, Oct 7, 2026).
    // A refund or chargeback later voids it; a reward already given stays.
    affiliateHoldDays: Number(env.AFFILIATE_HOLD_DAYS || 0),
    affiliateRewardMonths: Number(env.AFFILIATE_REWARD_MONTHS || 6), // Premium months given at each goal reached
    // One reward per affiliate, and a code works for 3 players at most (Sofiene, Oct 7, 2026).
    // AFFILIATE_REWARD_MAX=0 and a higher AFFILIATE_MAX_REFERRALS: a reward every 3 players.
    affiliateRewardMax: Number(env.AFFILIATE_REWARD_MAX ?? 1),
    affiliateMaxReferrals: Number(env.AFFILIATE_MAX_REFERRALS || env.AFFILIATE_GOAL || 3),
    // Each affiliate code is also a Stripe promotion code: this % off at checkout, on the first payment
    // (AFFILIATE_DISCOUNT_DURATION=forever: on every renewal).
    affiliateDiscountPercent: Number(env.AFFILIATE_DISCOUNT_PERCENT || 5),
    affiliateDiscountDuration: env.AFFILIATE_DISCOUNT_DURATION === 'forever' ? 'forever' : 'once',

    // Before the launch, /signup, /buy, /download and /affiliate send visitors to the site's countdown.
    // LAUNCH_AT (ISO date) moves it; production defaults to Saturday, October 10, 2026, 3 PM Paris time.
    launchAt: launchTime(env.LAUNCH_AT, prod),
    // The team gets through with the link /acces/<PREVIEW_KEY> or the site's cookie (same value as on Netlify).
    // Shorter than 16 characters: ignored.
    previewKey: (env.PREVIEW_KEY || '').trim(),
    // Opens /admin (the site's discount pop-up). Shorter than 16 characters: /admin stays closed.
    adminKey: (env.ADMIN_KEY || '').trim(),

    // Pro role on the Rago Discord (2026-10-10): Premium players link their Discord from /account, a bot gives
    // them the role and takes it back when Premium stops. Without all five, the role stays manual (ticket).
    discordClientId: (env.DISCORD_CLIENT_ID || '').trim(),
    discordClientSecret: (env.DISCORD_CLIENT_SECRET || '').trim(),
    // "Bot " pasted with the token from the Developer Portal is dropped.
    discordBotToken: (env.DISCORD_BOT_TOKEN || '').trim().replace(/^Bot\s+/i, ''),
    discordGuildId: (env.DISCORD_GUILD_ID || '').trim(),
    discordRoleId: (env.DISCORD_ROLE_ID || '').trim(),
  };
  cfg.subscriptions = !!(cfg.stripePriceMonthly || cfg.stripePriceYearly);
  const DISCORD_VARS = { DISCORD_CLIENT_ID: 'discordClientId', DISCORD_CLIENT_SECRET: 'discordClientSecret', DISCORD_BOT_TOKEN: 'discordBotToken', DISCORD_GUILD_ID: 'discordGuildId', DISCORD_ROLE_ID: 'discordRoleId' };
  const discordMissing = Object.keys(DISCORD_VARS).filter((k) => !cfg[DISCORD_VARS[k]]);
  cfg.discord = discordMissing.length === 0;

  const missing = [];
  if (prod) {
    for (const k of ['databaseUrl', 'stripeSecretKey', 'stripeWebhookSecret']) {
      if (!cfg[k]) missing.push(k);
    }
    if (!publicUrl.startsWith('https://')) missing.push('PUBLIC_URL (https)');
    if (missing.length) throw new Error(`Missing production config: ${missing.join(', ')}`);
  }

  // Values still set to the examples from .env.example: the server runs, but say what won't work.
  cfg.warnings = [];
  const placeholder = (v) => /\.\.\.|abcd|a_remplir|xxxx/i.test(v || '');
  if (prod && !cfg.scriptsSecret) cfg.warnings.push('SCRIPTS_SECRET is not set: Rago Optimizer 1.1.6 and later can\'t unlock the Premium tweaks ("Premium scripts unavailable"). Use the same value as the GitHub secret RAGO_SCRIPTS_SECRET.');
  if (!env.SITE_URL) cfg.warnings.push('SITE_URL is not set: links to the site (pricing, terms) point to this server and open a 404. Set it to the Netlify address.');
  else if (/ragohub\.com|example\.com/i.test(cfg.siteUrl)) cfg.warnings.push(`SITE_URL is still the example (${cfg.siteUrl}): use the real site address.`);
  if (prod && (!cfg.supabaseUrl || !cfg.supabaseServiceKey)) cfg.warnings.push('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set: profile photos are kept in memory and lost at each restart.');
  if (placeholder(cfg.supabaseUrl)) cfg.warnings.push('SUPABASE_URL is still the example: Download Rago Optimizer will fail. Use https://<project-ref>.supabase.co');
  if (cfg.stripeSecretKey && !/^(sk|rk)_(live|test)_/.test(cfg.stripeSecretKey)) cfg.warnings.push('STRIPE_SECRET_KEY is not a secret key: use the one starting with sk_live_ (or sk_test_), never the publishable key pk_.');
  if (placeholder(cfg.stripeWebhookSecret)) cfg.warnings.push('STRIPE_WEBHOOK_SECRET is still the example: Stripe webhooks will be rejected (step 6).');
  if (!cfg.subscriptions) cfg.warnings.push(`No subscription price: set STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY. Until then /buy shows "Checkout opens soon" and nothing is sold${cfg.stripePriceId ? ' (the old one-time STRIPE_PRICE_ID is no longer sold: remove it)' : ''}.`);
  if (placeholder(cfg.resendApiKey)) {
    cfg.warnings.push('RESEND_API_KEY is still the example: emails are printed to the logs instead of sent.');
    cfg.resendApiKey = '';
  } else if (!cfg.resendApiKey) {
    cfg.warnings.push('No RESEND_API_KEY: purchase and password emails are printed to the logs instead of sent. The pages tell players to ask on Discord instead (step 4).');
  }
  const exampleFrom = /example\.com|your-domain|ragohub\.com/i.test(cfg.mailFrom);
  if (cfg.resendApiKey && exampleFrom) {
    cfg.warnings.push('MAIL_FROM is not set or still the example: Resend refuses it. Use "Rago Optimizer <hello@your-domain>" with a domain verified in Resend (step 4).');
  }
  for (const k of ['supportUrl', 'portalLoginUrl']) {
    if (placeholder(cfg[k])) {
      cfg.warnings.push(`${k === 'supportUrl' ? 'SUPPORT_URL' : 'STRIPE_PORTAL_LOGIN_URL'} is still the example: the link is hidden until it's a real URL.`);
      cfg[k] = '';
    }
  }
  if (env.LAUNCH_AT && Number.isNaN(Date.parse(env.LAUNCH_AT.trim()))) cfg.warnings.push(`LAUNCH_AT is not a date (${env.LAUNCH_AT}): use for example 2026-10-10T13:00:00Z.`);
  if (cfg.launchAt > Date.now() && cfg.previewKey.length < 16) cfg.warnings.push('PREVIEW_KEY is not set (16 characters at least): until the launch, nobody can open /signup, /buy, /download and /affiliate, the team included. Use the same value as the Netlify variable.');
  if (prod && cfg.adminKey.length < 16) cfg.warnings.push('ADMIN_KEY is not set (16 characters at least): /admin, where the site\'s discount pop-up is changed, stays closed. npm run admin -- popup still works.');
  if (discordMissing.length && discordMissing.length < 5) cfg.warnings.push(`${discordMissing.join(', ')} not set: the Discord Pro role stays manual until the five DISCORD_ variables are in.`);
  for (const k of ['DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID', 'DISCORD_ROLE_ID']) {
    // Discord ids are 17 to 20 digits (Developer mode > right click > Copy ID).
    if (cfg[DISCORD_VARS[k]] && !/^\d{17,20}$/.test(cfg[DISCORD_VARS[k]])) {
      cfg.warnings.push(`${k} is not a Discord id (17 to 20 digits): the Discord Pro role stays manual.`);
      cfg.discord = false;
    }
  }
  // Emails really go out: pages may promise one.
  cfg.mailEnabled = !!cfg.resendApiKey && !exampleFrom;

  // LICENSE_SIGNING_KEY and SESSION_SECRET are optional: when absent, the server generates them once
  // and keeps them in the database (see ensureKeys in db.js).
  return cfg;
}
