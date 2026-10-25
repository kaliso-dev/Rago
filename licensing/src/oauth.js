// Sign in with Google or Discord (2026-10-25): OAuth 2 authorization code flow with PKCE. The server only reads who
// the player is (id, email, whether the provider checked that email), then forgets the provider's token.
// Google: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET. Discord: the DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET of the Pro
// role bot, with a second redirect URL (/auth/discord/callback) in the Developer Portal.
import { createHash } from 'node:crypto';

const PROVIDERS = {
  google: {
    name: 'Google',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    me: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    extra: { prompt: 'select_account' },
    keys: (cfg) => [cfg.googleClientId, cfg.googleClientSecret],
    profile: (me) => ({ subject: me.sub, email: me.email, verified: me.email_verified === true || me.email_verified === 'true', name: me.name || null }),
  },
  discord: {
    name: 'Discord',
    authorize: 'https://discord.com/oauth2/authorize',
    token: 'https://discord.com/api/v10/oauth2/token',
    me: 'https://discord.com/api/v10/users/@me',
    revoke: 'https://discord.com/api/v10/oauth2/token/revoke',
    scope: 'identify email',
    extra: {},
    keys: (cfg) => [cfg.discordClientId, cfg.discordClientSecret],
    profile: (me) => ({ subject: me.id, email: me.email, verified: me.verified === true, name: me.global_name || me.username || null }),
  },
};

export class OAuthError extends Error {}

const challengeOf = (verifier) => createHash('sha256').update(verifier).digest('base64url');

/** The providers that can be used (both keys set), each with { name, authorizeUrl(state, verifier), profile(code, verifier) }. */
export function createOAuth(cfg, { fetchImpl = fetch } = {}) {
  const out = {};
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const [clientId, clientSecret] = p.keys(cfg);
    if (!clientId || !clientSecret) continue;
    const redirectUri = `${cfg.publicUrl}/auth/${id}/callback`;
    const call = async (url, init) => {
      let res;
      try {
        res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(10000) });
      } catch (err) {
        throw new OAuthError(`${p.name} unreachable: ${err.message}`);
      }
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
      if (!res.ok) throw new OAuthError(`${p.name} ${res.status}: ${data?.error_description || data?.error || data?.message || text.slice(0, 200)}`);
      return data;
    };
    const form = (fields) => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields).toString() });
    out[id] = {
      id,
      name: p.name,
      redirectUri,
      authorizeUrl: (state, verifier) => `${p.authorize}?${new URLSearchParams({
        response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: p.scope, state,
        code_challenge: challengeOf(verifier), code_challenge_method: 'S256', ...p.extra })}`,
      async profile(code, verifier) {
        const token = await call(p.token, form({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret, code_verifier: verifier }));
        if (!token?.access_token) throw new OAuthError(`${p.name}: no access token`);
        try {
          const me = await call(p.me, { headers: { Authorization: `Bearer ${token.access_token}` } });
          const profile = p.profile(me || {});
          if (!profile.subject) throw new OAuthError(`${p.name}: no account id`);
          return profile;
        } finally {
          if (p.revoke) await call(p.revoke, form({ token: token.access_token, token_type_hint: 'access_token', client_id: clientId, client_secret: clientSecret })).catch(() => {});
        }
      },
    };
  }
  return out;
}
