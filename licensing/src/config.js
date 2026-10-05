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
    installerObject: env.INSTALLER_OBJECT || 'downloads/RagoHub-Setup.exe', // <bucket>/<path> in Supabase Storage
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
    mailFrom: env.MAIL_FROM || 'Rago <noreply@example.com>',
    supportUrl: env.SUPPORT_URL || '',

    cancelUrl: env.CHECKOUT_CANCEL_URL || `${asUrl(env.SITE_URL) || publicUrl}/#pricing`,
    selfServiceResetDays: Number(env.SELF_SERVICE_RESET_DAYS || 0), // 0 = support only

    siteDir: env.SITE_DIR || '',
    installerPath: env.INSTALLER_PATH || '',
    installerVersion: env.INSTALLER_VERSION || '',
    installerFileName: env.INSTALLER_FILENAME || 'RagoHub-Setup.exe',

    licenseTokenDays: Number(env.LICENSE_TOKEN_DAYS || 30),
    // Days a subscriber keeps working offline past the paid period (renewal retries, clock drift).
    subscriptionGraceDays: Number(env.SUBSCRIPTION_GRACE_DAYS || 3),

    affiliateGoal: Number(env.AFFILIATE_GOAL || 3),
    affiliateHoldDays: Number(env.AFFILIATE_HOLD_DAYS || 14), // a referral counts once it's this old and not refunded
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
  if (placeholder(cfg.supabaseUrl)) cfg.warnings.push('SUPABASE_URL is still the example: Download Rago Hub will fail. Use https://<project-ref>.supabase.co');
  if (placeholder(cfg.stripeWebhookSecret)) cfg.warnings.push('STRIPE_WEBHOOK_SECRET is still the example: Stripe webhooks will be rejected (step 6).');
  if (!cfg.subscriptions && !cfg.stripePriceId) cfg.warnings.push('No Stripe price: set STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY. Until then /buy shows "Checkout is not open yet."');
  if (!cfg.subscriptions && cfg.stripePriceId) cfg.warnings.push('Only STRIPE_PRICE_ID is set: Premium is sold as a one-time lifetime license. Set STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY for the subscription.');
  if (placeholder(cfg.resendApiKey)) {
    cfg.warnings.push('RESEND_API_KEY is still the example: emails are printed to the logs instead of sent.');
    cfg.resendApiKey = '';
  }

  // LICENSE_SIGNING_KEY and SESSION_SECRET are optional: when absent, the server generates them once
  // and keeps them in the database (see ensureKeys in db.js).
  return cfg;
}
