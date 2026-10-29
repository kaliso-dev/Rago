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
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS livemode BOOLEAN;                     -- Stripe mode of the event (null before Oct 10, 2026)

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
-- Only rewards actually given (a license recorded), not a claim undone after Stripe refused it.
UPDATE affiliates SET rewards = 1 WHERE rewards = 0 AND reward_granted_at IS NOT NULL AND reward_license_id IS NOT NULL;
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

-- Public profile (2026-10-09): the name shown with a review, and the profile photo. The photo itself is in
-- Supabase Storage (private bucket "avatars", created by the server); only its file name is kept here.
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_updated_at BIGINT;

-- Reviews left from Rago Optimizer (2026-10-09): one per account, edited in place, shown on the site.
CREATE TABLE IF NOT EXISTS reviews (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (length(btrim(comment)) > 0),
  status TEXT NOT NULL DEFAULT 'published',      -- published | hidden (support: npm run admin -- hide-review)
  app_version TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_status ON reviews(status, updated_at);

-- The app's account sign-in (reviews and profile photo without a license on the PC). Token stored hashed.
CREATE TABLE IF NOT EXISTS api_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS api_sessions_user ON api_sessions(user_id);

-- Settings changed from /admin or `npm run admin` (2026-10-09). 'popup': what the site's discount pop-up shows
-- (JSON: enabled, code, eyebrow, title, text). The discount and its number of uses live in Stripe.
CREATE TABLE IF NOT EXISTS site_settings (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Discord account linked from /account (2026-10-10). A bot gives it the Pro role while the account's Premium is
-- active and takes it back when Premium stops. One Discord account per Rago account, and the other way round.
CREATE TABLE IF NOT EXISTS discord_links (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL UNIQUE,
  discord_name TEXT,                              -- @username when linked, for support
  linked_at BIGINT NOT NULL,
  role BOOLEAN NOT NULL DEFAULT false,            -- the Pro role, as the bot last set it
  error TEXT,                                     -- why the last change failed: not_member | forbidden | unauthorized | config | unavailable
  synced_at BIGINT
);

-- Invite rewards (2026-10-10): VIP / MVP roles (given by an invite bot) turned into Premium time and a one-use
-- discount code, once per Discord account and once per Rago account for each role.
ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS rewards_checked_at BIGINT;    -- last look at the member's roles
CREATE TABLE IF NOT EXISTS discord_rewards (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                             -- vip | mvp
  discord_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  given_at BIGINT NOT NULL,
  license_id TEXT,
  action TEXT,                                    -- created | extended | subscription | lifetime
  until BIGINT,                                   -- Premium until (ms), when time was added
  promo_code TEXT,                                -- the one-use Stripe code shown on the account page
  UNIQUE (discord_id, kind),
  UNIQUE (user_id, kind)
);

-- Community bot (2026-10-12, community.js): every join to the Discord server and the invite it came through.
CREATE TABLE IF NOT EXISTS discord_joins (
  id TEXT PRIMARY KEY,                            -- dj_<discord id>_<joined at>
  discord_id TEXT NOT NULL,
  joined_at BIGINT NOT NULL,                      -- 0: was on the server before the bot (seen leaving)
  left_at BIGINT,
  invite_code TEXT,
  inviter_id TEXT,                                -- the member whose invite it was (null: vanity, unknown, a bot's)
  source TEXT NOT NULL,                           -- invite | vanity | unknown | before_bot
  first_join BOOLEAN NOT NULL,                    -- false for a rejoin: it never counts again
  account_created_at BIGINT NOT NULL              -- read from the Discord id: alts under a week old don't count
);
CREATE INDEX IF NOT EXISTS discord_joins_inviter ON discord_joins (inviter_id);
CREATE INDEX IF NOT EXISTS discord_joins_member ON discord_joins (discord_id);
CREATE INDEX IF NOT EXISTS discord_joins_at ON discord_joins (joined_at);
-- Tracked partner links (/partner-link): joins through them show up in /growth and count for no member.
CREATE TABLE IF NOT EXISTS discord_invite_links (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_by TEXT,
  created_at BIGINT NOT NULL
);
-- Invites counted before the Rago bot (Invite Tracker), added by staff with /invites-adjust.
CREATE TABLE IF NOT EXISTS discord_invite_bonus (
  discord_id TEXT PRIMARY KEY,
  bonus INTEGER NOT NULL,
  set_by TEXT,
  set_at BIGINT NOT NULL
);
-- VIP / MVP given by the Rago bot from its count (DISCORD_INVITE_ROLES=1), once per member.
CREATE TABLE IF NOT EXISTS discord_invite_roles (
  discord_id TEXT NOT NULL,
  kind TEXT NOT NULL,                             -- vip | mvp
  given_at BIGINT NOT NULL,
  PRIMARY KEY (discord_id, kind)
);

-- Network tests sent by the app (RAG-50): where players are and their ping to each server, to choose where future
-- proxies would help (network.js). No IP address: the city, region, country and provider are read from it (geo.js),
-- then it's forgotten. Kept 12 months.
CREATE TABLE IF NOT EXISTS network_reports (
  id TEXT PRIMARY KEY,
  at BIGINT NOT NULL,
  device TEXT,                                    -- the app's X-Rago-Device: a hash, the same PC from test to test
  app_version TEXT,
  country TEXT,                                   -- ISO code (FR)
  region TEXT,
  city TEXT,
  asn INTEGER,
  isp TEXT                                        -- the provider's network (Orange, Free…)
);
CREATE INDEX IF NOT EXISTS network_reports_at ON network_reports(at);
CREATE TABLE IF NOT EXISTS network_results (
  report_id TEXT NOT NULL REFERENCES network_reports(id) ON DELETE CASCADE,
  target TEXT NOT NULL,                           -- hypixel, paris, frankfurt… (nettest.rs TARGETS)
  method TEXT,                                    -- mc | tcp | icmp
  ping DOUBLE PRECISION,                          -- in ms: average, median, best, worst, jitter
  median DOUBLE PRECISION,
  best DOUBLE PRECISION,
  worst DOUBLE PRECISION,
  jitter DOUBLE PRECISION,
  loss DOUBLE PRECISION NOT NULL,                 -- 0 to 1
  samples INTEGER,
  spikes INTEGER,
  error TEXT,                                     -- dns | timeout
  PRIMARY KEY (report_id, target)
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
ALTER TABLE account_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_joins ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_invite_bonus ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_invite_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_results ENABLE ROW LEVEL SECURITY;
