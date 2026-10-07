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
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',

    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    // Subscription prices (recurring). STRIPE_PRICE_ID alone = the old one-time price, sold as a lifetime license.
    stripePriceMonthly: env.STRIPE_PRICE_MONTHLY || '',
    stripePriceYearly: env.STRIPE_PRICE_YEARLY || '',
    stripePriceId: env.STRIPE_PRICE_ID || '',

    signingKeyPem: readPem(env.LICENSE_SIGNING_KEY),
    sessionSecret: env.SESSION_SECRET || '',

    resendApiKey: env.RESEND_API_KEY || '',
    mailFrom: env.MAIL_FROM || 'Rago Optimizer <noreply@example.com>',
    supportUrl: env.SUPPORT_URL || '',
    // Stripe customer portal login link (Settings > Billing > Customer portal): lets a buyer cancel by
    // email, without a Rago account. Shown as "Cancel subscription" in the footer when set.
    portalLoginUrl: env.STRIPE_PORTAL_LOGIN_URL || '',
    // Price shown on the free dashboard, e.g. "$4.99 a month or $49.90 a year" (same currency as Stripe and the site). Empty = no price shown.
    priceLabel: env.PRICE_LABEL || '',
    freeTweaks: Number(env.FREE_TWEAKS || 9),
    premiumTweaks: Number(env.PREMIUM_TWEAKS || 226),

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
  };
  cfg.subscriptions = !!(cfg.stripePriceMonthly || cfg.stripePriceYearly);

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
  if (!env.SITE_URL) cfg.warnings.push('SITE_URL is not set: links to the site (pricing, terms) point to this server and open a 404. Set it to the Netlify address.');
  else if (/ragohub\.com|example\.com/i.test(cfg.siteUrl)) cfg.warnings.push(`SITE_URL is still the example (${cfg.siteUrl}): use the real site address.`);
  if (placeholder(cfg.supabaseUrl)) cfg.warnings.push('SUPABASE_URL is still the example: Download Rago Optimizer will fail. Use https://<project-ref>.supabase.co');
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
  // Emails really go out: pages may promise one.
  cfg.mailEnabled = !!cfg.resendApiKey && !exampleFrom;

  // LICENSE_SIGNING_KEY and SESSION_SECRET are optional: when absent, the server generates them once
  // and keeps them in the database (see ensureKeys in db.js).
  return cfg;
}
