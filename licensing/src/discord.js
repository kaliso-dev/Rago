// The Pro role on the Rago Discord, kept in step with Premium (2026-10-10).
// The player links their Discord account from /account (OAuth2, scopes identify + guilds.join) and joins the
// server with the role. From then on the role follows the account's license: the bot takes it back when Premium
// stops (subscription ended or unpaid, refund, dispute, revoked, reward over) and gives it back when it returns.
// discord_links.role keeps what the bot last did, so a pass only calls Discord for the accounts that changed.
import { audit } from './db.js';

const API = 'https://discord.com/api/v10';
const MANAGE_ROLES = 1n << 28n;
const ADMINISTRATOR = 1n << 3n;
const CREATE_INSTANT_INVITE = 1n;
/** What the bot needs on the server: Manage Roles, and Create Invite to add players who aren't on it yet. */
export const BOT_PERMISSIONS = String(MANAGE_ROLES | CREATE_INSTANT_INVITE);
// A change Discord refused is tried again after this long (the account page's button tries right away).
const RETRY_MS = 15 * 60 * 1000;
const RETRY_NOT_MEMBER_MS = 60 * 60 * 1000; // left the server: retried hourly, in case they come back
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class DiscordError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  /** not_member | forbidden | unauthorized | config | unavailable */
  get kind() {
    if (this.code === 10007 || this.code === 10013) return 'not_member'; // unknown member, unknown user
    if (this.status === 401) return 'unauthorized';
    if (this.status === 403) return 'forbidden';
    if (this.code === 10004 || this.code === 10011) return 'config'; // unknown server, unknown role
    return 'unavailable';
  }
}

// Shown in the logs and on /admin (French: only Sofiene reads them).
const WHY = {
  forbidden: 'Discord refuse : le rôle du bot doit être au-dessus du rôle Pro, avec la permission « Gérer les rôles »',
  unauthorized: 'DISCORD_BOT_TOKEN refusé par Discord',
  config: 'DISCORD_GUILD_ID ou DISCORD_ROLE_ID ne correspond à rien sur Discord',
  unavailable: 'Discord ne répond pas',
  not_member: 'pas sur le serveur',
};

/** Discord's REST API with the bot token, waiting when rate limited. */
function restClient(cfg, fetchImpl) {
  const agent = `DiscordBot (${cfg.siteUrl}, 1.0)`;
  const basic = `Basic ${Buffer.from(`${cfg.discordClientId}:${cfg.discordClientSecret}`).toString('base64')}`;
  return async function call(method, path, { auth = `Bot ${cfg.discordBotToken}`, json, form, reason } = {}) {
    const headers = { Authorization: auth === 'basic' ? basic : auth, 'User-Agent': agent };
    let body;
    if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
    if (reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(reason);
    for (let attempt = 1; ; attempt++) {
      let res;
      try {
        res = await fetchImpl(`${API}${path}`, { method, headers, body, signal: AbortSignal.timeout(10000) });
      } catch (err) {
        throw new DiscordError(0, null, `Discord unreachable: ${err.message}`);
      }
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
      // Rate limited: Discord says how many seconds to wait. Up to 30 s, 3 times.
      if (res.status === 429 && attempt <= 3) {
        await sleep(Math.min(30, Number(data?.retry_after ?? res.headers.get('retry-after') ?? 1)) * 1000 + 50);
        continue;
      }
      if (!res.ok) throw new DiscordError(res.status, data?.code ?? null, data?.message || data?.error_description || data?.error || `HTTP ${res.status}`);
      return data;
    }
  };
}

/**
 * The Discord link and the Pro role, or null when the five DISCORD_ variables aren't all set (the role then
 * stays manual and the account page says to open a ticket).
 */
export function createDiscord(cfg, { db, fetchImpl = fetch, log = console } = {}) {
  if (!cfg.discord) return null;
  const call = restClient(cfg, fetchImpl);
  const redirectUri = `${cfg.publicUrl}/account/discord/callback`;
  const memberPath = (discordId) => `/guilds/${cfg.discordGuildId}/members/${discordId}`;
  const rolePath = (discordId) => `${memberPath(discordId)}/roles/${cfg.discordRoleId}`;

  const setRole = (discordId, on, reason) => call(on ? 'PUT' : 'DELETE', rolePath(discordId), { reason });

  // Premium right now: an active license; an affiliate reward only until its end date (the hourly sweep
  // revokes it a bit later). `d` is the discord_links row.
  const WANT = `EXISTS (SELECT 1 FROM licenses l WHERE l.user_id = d.user_id AND l.status = 'active'
    AND (l.plan <> 'reward' OR l.current_period_end >= ?))`;
  const linkOf = (userId) => db.get(`SELECT d.*, ${WANT} AS want FROM discord_links d WHERE d.user_id = ?`, [Date.now(), userId]);

  /**
   * Makes the role on Discord match the account's Premium (row.want). `force` also gives the role again
   * when the bot thinks it's there (the player left the server and came back, or staff removed it).
   * Never throws for Discord: the reason is kept in the row and the next pass tries again.
   */
  async function apply(row, { force = false } = {}) {
    const want = !!row.want;
    let role = row.role;
    let error = null;
    try {
      if (want || row.role || force) await setRole(row.discord_id, want, want ? 'Rago Optimizer Premium active' : 'Rago Optimizer Premium ended');
      role = want;
    } catch (err) {
      if (!(err instanceof DiscordError)) throw err;
      error = err.kind;
      if (error === 'not_member') {
        // Not on the server: nothing to take back, and the role waits until they're on it.
        role = false;
        if (!want) error = null;
      }
      if (error && error !== 'not_member') log.error(`[discord] role ${want ? 'not given to' : 'not removed from'} ${row.discord_id}: ${err.message}`);
    }
    await db.run('UPDATE discord_links SET role = ?, error = ?, synced_at = ? WHERE user_id = ?', [role, error, Date.now(), row.user_id]);
    if (role !== row.role) await audit(db, role ? 'discord.role_added' : 'discord.role_removed', { userId: row.user_id, detail: { discord_id: row.discord_id } });
    return { ...row, role, error };
  }

  /** The account's link after making its role right. Calls Discord only when something changed (or forced). */
  async function syncUser(userId, { force = false } = {}) {
    const row = await linkOf(userId);
    if (!row) return null;
    if (!force && row.role === row.want) return row;
    // A change Discord refused a moment ago waits for its retry, unless the player asks.
    const wait = row.error === 'not_member' ? RETRY_NOT_MEMBER_MS : RETRY_MS;
    if (!force && row.error && Date.now() - Number(row.synced_at || 0) < wait) return row;
    return apply(row, { force });
  }

  /**
   * Every linked account whose role doesn't match its Premium. `all`: also gives the role again to every
   * Premium account (daily), for players who left the server and came back, or whose role was removed by hand.
   */
  async function reconcile({ all = false } = {}) {
    const now = Date.now();
    const rows = await db.all(`SELECT * FROM (SELECT d.*, ${WANT} AS want FROM discord_links d) x
      WHERE (x.role <> x.want OR (?::boolean AND x.want))
        AND (?::boolean OR x.error IS NULL OR x.synced_at < CASE WHEN x.error = 'not_member' THEN ?::bigint ELSE ?::bigint END)
      ORDER BY x.linked_at`, [now, all, all, now - RETRY_NOT_MEMBER_MS, now - RETRY_MS]);
    const failed = {};
    for (const row of rows) {
      const out = await apply(row, { force: all });
      if (out.error && out.error !== 'not_member') failed[out.error] = (failed[out.error] || 0) + 1;
    }
    for (const [kind, n] of Object.entries(failed)) log.error(`[discord] ${n} role change(s) failed: ${WHY[kind]}. Retried in 15 minutes; details on /admin.`);
    return rows.length;
  }

  // One pass at a time. A pass asked for while one runs happens right after it (the license may have changed).
  let running = null;
  let again = null;
  function syncAll({ all = false } = {}) {
    if (running) {
      again = { all: all || !!again?.all };
      return running;
    }
    running = (async () => {
      let opts = { all };
      while (opts) {
        again = null;
        try { await reconcile(opts); } catch (err) { log.error('[discord] sync failed', err); }
        opts = again;
      }
    })().finally(() => { running = null; });
    return running;
  }

  /**
   * Links the Discord account that authorized `code` to this Rago account, adds it to the server (with the role
   * when Premium is active) and sets the role. A Discord account linked to another Rago account moves here.
   */
  async function link(userId, code) {
    const token = await call('POST', '/oauth2/token', { auth: 'basic', form: { grant_type: 'authorization_code', code, redirect_uri: redirectUri } });
    try {
      const me = await call('GET', '/users/@me', { auth: `Bearer ${token.access_token}` });
      const before = await db.get('SELECT * FROM discord_links WHERE user_id = ?', [userId]);
      // This Rago account had another Discord account: the role leaves it first.
      if (before && before.discord_id !== me.id && before.role) {
        await setRole(before.discord_id, false, 'Rago account linked to another Discord account').catch((err) => {
          if (!(err instanceof DiscordError && err.kind === 'not_member')) throw err;
        });
      }
      const moved = await db.get('SELECT * FROM discord_links WHERE discord_id = ? AND user_id <> ?', [me.id, userId]);
      // What the bot already did for this Discord account carries over.
      const role = before?.discord_id === me.id ? before.role : !!moved?.role;
      await db.tx(async (t) => {
        await t.run('DELETE FROM discord_links WHERE discord_id = ? AND user_id <> ?', [me.id, userId]);
        await t.run(`INSERT INTO discord_links (user_id, discord_id, discord_name, linked_at, role) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT (user_id) DO UPDATE SET discord_id = EXCLUDED.discord_id, discord_name = EXCLUDED.discord_name,
            linked_at = EXCLUDED.linked_at, role = EXCLUDED.role, error = NULL, synced_at = NULL`,
        [userId, me.id, me.username, Date.now(), role]);
        await audit(t, 'discord.linked', { userId, detail: { discord_id: me.id, name: me.username, ...(moved ? { from: moved.user_id } : {}) } });
      });
      const row = await linkOf(userId);
      // Joins the server if they aren't on it (already on it: nothing changes). Refused (banned, 100 servers…):
      // the account stays linked and the page says they aren't on the server.
      const join = (roles) => call('PUT', memberPath(me.id), { json: { access_token: token.access_token, ...(roles ? { roles } : {}) } });
      try {
        await join(row.want ? [cfg.discordRoleId] : null);
      } catch (err) {
        if (!(err instanceof DiscordError)) throw err;
        // Refused with the role (the bot can't give it yet): on the server anyway, the role follows once fixed.
        const joined = row.want && err.kind === 'forbidden' && await join(null).then(() => true, () => false);
        if (!joined) log.error(`[discord] ${me.id} not added to the server: ${err.message}`);
      }
      return apply(row, { force: true });
    } finally {
      // The player's token was only needed to read who they are and add them: Discord forgets it now.
      await call('POST', '/oauth2/token/revoke', { auth: 'basic', form: { token: token.access_token, token_type_hint: 'access_token' } }).catch(() => {});
    }
  }

  /** Takes the role back and forgets the link. Throws a DiscordError if Discord refuses (the link stays). */
  async function unlink(userId) {
    const row = await linkOf(userId);
    if (!row) return false;
    if (row.role) {
      await setRole(row.discord_id, false, 'Discord unlinked from the Rago account').catch((err) => {
        if (!(err instanceof DiscordError && err.kind === 'not_member')) throw err;
      });
    }
    await db.run('DELETE FROM discord_links WHERE user_id = ?', [userId]);
    await audit(db, 'discord.unlinked', { userId, detail: { discord_id: row.discord_id, role: row.role } });
    return true;
  }

  const authorizeUrl = (state) => `https://discord.com/oauth2/authorize?${new URLSearchParams({
    response_type: 'code', client_id: cfg.discordClientId, scope: 'identify guilds.join', redirect_uri: redirectUri, state })}`;
  const inviteUrl = `https://discord.com/oauth2/authorize?${new URLSearchParams({ client_id: cfg.discordClientId, scope: 'bot', permissions: BOT_PERMISSIONS, guild_id: cfg.discordGuildId })}`;

  /** What /admin shows: bot, server, role, the bot's place above the role, redirect URL, linked accounts. Never throws. */
  async function checks() {
    const list = [];
    const add = (label, level, text) => list.push({ label, level, text });
    const failed = (err) => (err?.message || String(err)).slice(0, 200);
    const [me, app, guild, roles, stats] = await Promise.allSettled([
      call('GET', '/users/@me'),
      call('GET', '/applications/@me'),
      call('GET', `/guilds/${cfg.discordGuildId}`),
      call('GET', `/guilds/${cfg.discordGuildId}/roles`),
      db.get(`SELECT COUNT(*)::int AS linked, COUNT(*) FILTER (WHERE role)::int AS with_role,
        COUNT(*) FILTER (WHERE error = 'not_member')::int AS away, COUNT(*) FILTER (WHERE error IS NOT NULL AND error <> 'not_member')::int AS failing
        FROM discord_links`),
    ]);
    if (me.status === 'rejected') {
      add('Bot', 'error', me.reason?.status === 401 ? 'DISCORD_BOT_TOKEN est refusé par Discord : recopie le token (Developer Portal → Bot → Reset Token).' : `Discord n’a pas répondu : ${failed(me.reason)}`);
      return { checks: list, inviteUrl, redirectUri };
    }
    add('Bot', 'ok', `Connecté en tant que ${me.value.username}.`);

    const uris = app.status === 'fulfilled' ? app.value?.redirect_uris : null;
    if (app.status === 'fulfilled' && app.value?.id && app.value.id !== cfg.discordClientId) add('Application', 'error', `DISCORD_CLIENT_ID n’est pas l’application de ce bot (${app.value.id}) : prends l’Application ID de la page General Information du même bot.`);
    else if (!Array.isArray(uris)) add('Adresse de retour', 'warn', `Discord ne la montre pas au bot : vérifie que ${redirectUri} est dans Developer Portal → OAuth2 → Redirects.`);
    else if (!uris.includes(redirectUri)) add('Adresse de retour', 'error', `Ajoute ${redirectUri} dans Developer Portal → OAuth2 → Redirects, puis Save Changes. Sans elle, « Link Discord » s’arrête sur une erreur Discord.`);
    else add('Adresse de retour', 'ok', redirectUri);

    if (guild.status === 'rejected') {
      add('Serveur', 'error', [403, 404].includes(guild.reason?.status)
        ? `Le bot n’est pas sur le serveur ${cfg.discordGuildId} : invite-le avec le lien ci-dessous.`
        : `Discord n’a pas répondu : ${failed(guild.reason)}`);
      return { checks: list, inviteUrl, redirectUri };
    }
    add('Serveur', 'ok', guild.value.name);

    const all = roles.status === 'fulfilled' ? roles.value : [];
    const role = all.find((r) => r.id === cfg.discordRoleId);
    if (!role || role.id === cfg.discordGuildId) {
      add('Rôle', 'error', 'DISCORD_ROLE_ID ne correspond à aucun rôle de ce serveur : mode développeur, clic droit sur le rôle Pro → Copier l’identifiant.');
    } else if (role.managed) {
      add('Rôle', 'error', `« ${role.name} » est géré par une intégration : Discord ne laisse pas un bot le donner. Choisis un rôle normal.`);
    } else {
      add('Rôle', 'ok', `« ${role.name} »`);
      const member = await call('GET', memberPath(me.value.id)).catch(() => null);
      const mine = all.filter((r) => r.id === cfg.discordGuildId || member?.roles?.includes(r.id));
      const perms = mine.reduce((p, r) => p | BigInt(r.permissions || 0), 0n);
      const admin = (perms & ADMINISTRATOR) !== 0n;
      const top = mine.filter((r) => r.id !== cfg.discordGuildId).sort((a, b) => b.position - a.position)[0];
      if (!admin && !(perms & MANAGE_ROLES)) add('Permissions', 'error', 'Le bot n’a pas la permission « Gérer les rôles » : coche-la sur le rôle du bot (Paramètres du serveur → Rôles).');
      else if (!admin && !(perms & CREATE_INSTANT_INVITE)) add('Permissions', 'warn', 'Le bot n’a pas « Créer une invitation » : un joueur qui n’est pas encore sur le serveur n’y est pas ajouté en liant son compte.');
      else add('Permissions', 'ok', admin ? 'Administrateur.' : 'Gérer les rôles et Créer une invitation.');
      if (!top || top.position <= role.position) {
        add('Ordre des rôles', 'error', `Paramètres du serveur → Rôles : glisse le rôle du bot${top ? ` (« ${top.name} »)` : ''} au-dessus de « ${role.name} ». Discord interdit à un bot de donner un rôle placé au-dessus du sien.`);
      } else add('Ordre des rôles', 'ok', `« ${top.name} » est au-dessus de « ${role.name} ».`);
    }

    const s = stats.status === 'fulfilled' ? stats.value : null;
    if (s) {
      const away = s.away ? `, ${s.away} pas sur le serveur` : '';
      const text = `${s.linked} compte${s.linked > 1 ? 's' : ''} lié${s.linked > 1 ? 's' : ''}, ${s.with_role} avec le rôle${away}.`;
      add('Comptes liés', s.failing ? 'warn' : 'ok', s.failing ? `${text} ${s.failing} en échec : réessayé toutes les 15 minutes une fois le problème corrigé.` : text);
    }
    return { checks: list, inviteUrl, redirectUri };
  }

  return { authorizeUrl, inviteUrl, redirectUri, link, unlink, linkOf, syncUser, syncAll, idle: () => running || Promise.resolve(), checks };
}

/** /admin without the bot: the variables missing, or not a Discord id. */
export function discordSetupMissing(cfg) {
  const names = { DISCORD_CLIENT_ID: cfg.discordClientId, DISCORD_CLIENT_SECRET: cfg.discordClientSecret, DISCORD_BOT_TOKEN: cfg.discordBotToken, DISCORD_GUILD_ID: cfg.discordGuildId, DISCORD_ROLE_ID: cfg.discordRoleId };
  const ids = ['DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID', 'DISCORD_ROLE_ID'];
  return Object.keys(names).filter((k) => !names[k] || (ids.includes(k) && !/^\d{17,20}$/.test(names[k])))
    .map((k) => (names[k] ? `${k} (pas un identifiant Discord : 17 à 20 chiffres)` : k));
}
