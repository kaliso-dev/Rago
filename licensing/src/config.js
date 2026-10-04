import { generateKeyPairSync, randomBytes } from 'node:crypto';

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
    dbPath: env.DATABASE_PATH || './data/rago.db',
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
    for (const k of ['stripeSecretKey', 'stripeWebhookSecret', 'stripePriceId', 'signingKeyPem', 'sessionSecret']) {
      if (!cfg[k]) missing.push(k);
    }
    if (!publicUrl.startsWith('https://')) missing.push('PUBLIC_URL (https)');
    if (missing.length) throw new Error(`Missing production config: ${missing.join(', ')}`);
  }

  // Development fallbacks: ephemeral keys so the server boots without any setup.
  if (!cfg.signingKeyPem) {
    const { privateKey } = generateKeyPairSync('ed25519');
    cfg.signingKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    cfg.ephemeralSigningKey = true;
  }
  if (!cfg.sessionSecret) cfg.sessionSecret = randomBytes(32).toString('hex');
  return cfg;
}
