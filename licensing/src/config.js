const trimSlash = (s) => s.replace(/\/+$/, '');

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
  const publicUrl = trimSlash(env.PUBLIC_URL || `http://localhost:${env.PORT || 8787}`);
  const cfg = {
    prod,
    port: Number(env.PORT || 8787),
    publicUrl,
    siteUrl: trimSlash(env.SITE_URL || publicUrl),
    databaseUrl: env.DATABASE_URL || '', // empty = in-memory Postgres (dev only, lost on restart)
    supabaseUrl: trimSlash(env.SUPABASE_URL || ''),
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    installerObject: env.INSTALLER_OBJECT || 'downloads/RagoHub-Setup.exe', // <bucket>/<path> in Supabase Storage
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',

    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceId: env.STRIPE_PRICE_ID || '',

    signingKeyPem: readPem(env.LICENSE_SIGNING_KEY),
    sessionSecret: env.SESSION_SECRET || '',

    resendApiKey: env.RESEND_API_KEY || '',
    mailFrom: env.MAIL_FROM || 'Rago <noreply@example.com>',
    supportUrl: env.SUPPORT_URL || '',

    cancelUrl: env.CHECKOUT_CANCEL_URL || `${trimSlash(env.SITE_URL || publicUrl)}/#pricing`,
    selfServiceResetDays: Number(env.SELF_SERVICE_RESET_DAYS || 0), // 0 = support only

    siteDir: env.SITE_DIR || '',
    installerPath: env.INSTALLER_PATH || '',
    installerVersion: env.INSTALLER_VERSION || '',
    installerFileName: env.INSTALLER_FILENAME || 'RagoHub-Setup.exe',

    licenseTokenDays: Number(env.LICENSE_TOKEN_DAYS || 30),
  };

  const missing = [];
  if (prod) {
    for (const k of ['databaseUrl', 'stripeSecretKey', 'stripeWebhookSecret', 'stripePriceId']) {
      if (!cfg[k]) missing.push(k);
    }
    if (!publicUrl.startsWith('https://')) missing.push('PUBLIC_URL (https)');
    if (missing.length) throw new Error(`Missing production config: ${missing.join(', ')}`);
  }

  // LICENSE_SIGNING_KEY and SESSION_SECRET are optional: when absent, the server generates them once
  // and keeps them in the database (see ensureKeys in db.js).
  return cfg;
}
