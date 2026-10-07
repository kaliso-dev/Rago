-- Rago licensing schema (Postgres / Supabase). Idempotent: the server also runs it at startup.
-- Timestamps are BIGINT milliseconds since epoch. RLS is on with no policies: Supabase's public
-- API (anon / authenticated keys) can't read or write these tables, only the server can.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,                     -- stored lowercase
  password_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

-- One row per purchase (or manual grant). user_id is null until the buyer creates or links an account.
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',          -- active | revoked
  status_reason TEXT,                             -- refunded | disputed | manual
  source TEXT NOT NULL DEFAULT 'stripe',          -- stripe | grant
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  stripe_customer_id TEXT,
  amount INTEGER,
  currency TEXT,
  claim_token_hash TEXT,
  token_version INTEGER NOT NULL DEFAULT 1,       -- bump to invalidate every license token
  last_reset_at BIGINT,
  created_at BIGINT NOT NULL,
  claimed_at BIGINT
);
-- Subscriptions (added 2026-10-05). Existing rows (one-time purchases, grants) are lifetime licenses.
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'lifetime';      -- month | year | lifetime
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS current_period_end BIGINT;                  -- paid until (ms)
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS licenses_user ON licenses(user_id);
CREATE INDEX IF NOT EXISTS licenses_sub ON licenses(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS licenses_customer ON licenses(stripe_customer_id);
CREATE INDEX IF NOT EXISTS licenses_pi ON licenses(stripe_payment_intent);
CREATE INDEX IF NOT EXISTS licenses_claim ON licenses(claim_token_hash);

-- The single device a license is locked to.
CREATE TABLE IF NOT EXISTS devices (
  license_id TEXT PRIMARY KEY REFERENCES licenses(id),
  id TEXT NOT NULL UNIQUE,
  machine_guid TEXT,
  smbios_uuid TEXT,
  board_serial TEXT,
  name TEXT,
  os TEXT,
  app_version TEXT,
  bound_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  last_ip TEXT
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  used_at BIGINT
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit (
  id BIGSERIAL PRIMARY KEY,
  at BIGINT NOT NULL,
  license_id TEXT,
  user_id TEXT,
  type TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS audit_license ON audit(license_id, id);

-- Affiliate program: an account with a code; every 3 counted referrals = 6 months of Premium.
CREATE TABLE IF NOT EXISTS affiliates (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,                      -- uppercase
  created_at BIGINT NOT NULL,
  reward_granted_at BIGINT,
  reward_license_id TEXT
);

-- One row per buyer who entered a code when creating their account. A buyer can only ever use one code.
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  affiliate_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_id TEXT NOT NULL UNIQUE REFERENCES licenses(id),
  status TEXT NOT NULL DEFAULT 'pending',         -- pending | counted | void
  void_reason TEXT,                               -- refunded | disputed | same_device | same_payer
  machine_guid TEXT, smbios_uuid TEXT, board_serial TEXT,  -- first PC the buyer activated
  created_at BIGINT NOT NULL,
  counted_at BIGINT
);
CREATE INDEX IF NOT EXISTS referrals_affiliate ON referrals(affiliate_user_id);
-- Rewards given so far (6 months each since Oct 7, 2026; before that, one lifetime license).
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS rewards INTEGER NOT NULL DEFAULT 0;
UPDATE affiliates SET rewards = 1 WHERE rewards = 0 AND reward_granted_at IS NOT NULL;
-- The affiliate code as a Stripe promotion code (5 % off at checkout), one per Stripe mode (test / live).
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_promo_id TEXT;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_promo_live BOOLEAN;
-- Whether that promotion code is active in Stripe (turned off once the code is full: 3 players).
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_promo_active BOOLEAN;

-- Secrets generated by the server on first boot when not given as env vars (license signing key, session secret).
-- Referral code carried by the purchase itself (Checkout metadata.ref), so it survives a change of browser.
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- PCs an account signed in from in the app, licensed or not (the free app too). Used so an affiliate
-- can't count a purchase activated on their own PC.
CREATE TABLE IF NOT EXISTS account_devices (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fp TEXT NOT NULL,                               -- machine_guid|smbios_uuid|board_serial
  machine_guid TEXT,
  smbios_uuid TEXT,
  board_serial TEXT,
  seen_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, fp)
);

CREATE TABLE IF NOT EXISTS server_secrets (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
