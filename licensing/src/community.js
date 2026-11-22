// The Rago community bot (2026-10-12). Listens to the Discord server through the gateway and keeps track of who
// joined through which invite, so that:
// - an invite counts only once the friend has stayed 7 days (no more "join, get counted, leave"), and /invites
//   works for every member, not only staff;
// - VIP and MVP can be given by the Rago bot from that count (DISCORD_INVITE_ROLES=1), which then turns them into
//   Premium as before (discord.js REWARDS);
// - each partner gets a tracked link (/partner-link), and /growth shows how many of the people it brought stayed,
//   linked a Rago account or bought;
// - a new member is welcomed in a channel, never by DM (Discord's developer policy: no unsolicited DMs).
// Same bot and token as the Pro role. Member-facing text is English (brand/voice-en.md); logs are French.
import { audit } from './db.js';
import { DiscordError, REWARDS } from './discord.js';
import { connectGateway, INTENTS } from './gateway.js';

const DAY = 24 * 60 * 60 * 1000;
/** A friend counts for their inviter once they've been on the server this long. */
export const HOLD_MS = 7 * DAY;
/** Discord accounts younger than this when they join never count (alts made to farm invites). */
export const MIN_ACCOUNT_AGE_MS = 7 * DAY;
const DISCORD_EPOCH = 1420070400000;
/** When a Discord account was created, read from its id. */
export const createdAt = (id) => Number(BigInt(id) >> 22n) + DISCORD_EPOCH;

const MANAGE_GUILD = 1n << 5n;
const ADMINISTRATOR = 1n << 3n;
const EPHEMERAL = 64;
const NO_PINGS = { parse: [] };
const INVITE_ROLES_EVERY_MS = 60 * 60 * 1000;

/** VIP and MVP by invites: the role, how many invites (env), and the Premium reward the role brings. */
const INVITE_TIERS = [
  { kind: 'vip', name: 'VIP', cfgKey: 'discordVipRoleId', needKey: 'discordVipInvites' },
  { kind: 'mvp', name: 'MVP', cfgKey: 'discordMvpRoleId', needKey: 'discordMvpInvites' },
];

// A join that can count for its inviter: the first time this account joins (a rejoin never counts again), through
// someone else's link, from an account at least a week old, and not through a partner link.
const VALID = `j.first_join AND j.inviter_id IS NOT NULL AND j.inviter_id <> j.discord_id
  AND j.joined_at - j.account_created_at >= ${MIN_ACCOUNT_AGE_MS}
  AND NOT EXISTS (SELECT 1 FROM discord_invite_links p WHERE p.code = j.invite_code)`;
// ...and has stayed 7 days (still here, or left after the 7 days). `?` = now - HOLD_MS.
const STAYED = `j.joined_at <= ? AND (j.left_at IS NULL OR j.left_at - j.joined_at >= ${HOLD_MS})`;

const COMMANDS = [
  {
    name: 'invites', description: 'See how many friends you invited (they count after 7 days on the server)',
    options: [{ type: 6, name: 'member', description: 'Whose invites to show (you by default)', required: false }],
  },
  { name: 'top-invites', description: 'The 10 members who invited the most friends' },
  {
    name: 'partner-link', description: 'Staff: make a tracked invite link for a partner', default_member_permissions: String(MANAGE_GUILD),
    options: [
      { type: 3, name: 'name', description: 'The partner, e.g. Axora', required: true, max_length: 40 },
      { type: 3, name: 'code', description: 'Track an invite link that already exists instead of making one', required: false, max_length: 100 },
    ],
  },
  { name: 'growth', description: 'Staff: joins, who stays, and what each partner brought', default_member_permissions: String(MANAGE_GUILD) },
  {
    name: 'invites-adjust', description: 'Staff: invites counted before the Rago bot (from Invite Tracker)', default_member_permissions: String(MANAGE_GUILD),
    options: [
      { type: 6, name: 'member', description: 'The member', required: true },
      { type: 4, name: 'count', description: 'Invites to add on top of what the Rago bot counts (0 removes them)', required: true, min_value: 0, max_value: 1000 },
    ],
  },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const pct = (n, of) => (of ? `${Math.round((100 * n) / of)}%` : '–');
/** The code of an invite link (discord.gg/abc, discord.com/invite/abc) or a bare code. */
export const inviteCode = (s) => String(s || '').trim().replace(/^(https?:\/\/)?(www\.)?(discord\.gg|discord(app)?\.com\/invite)\//i, '').replace(/[/?#].*$/, '');

/** The numbers behind /growth (and `npm run admin -- growth`): the last `days` days, by where people came from. */
export async function growthStats(db, { now = Date.now, days = 30 } = {}) {
  const t = now();
  const rows = await db.all(`SELECT
      COALESCE(p.label, CASE j.source WHEN 'vanity' THEN 'Vanity URL' WHEN 'unknown' THEN 'Unknown' ELSE 'Member invites' END) AS source,
      COUNT(*)::int AS joined,
      COUNT(*) FILTER (WHERE j.left_at IS NOT NULL AND j.left_at - j.joined_at < ${DAY})::int AS left_24h,
      COUNT(*) FILTER (WHERE j.joined_at <= ?)::int AS old,
      COUNT(*) FILTER (WHERE ${STAYED})::int AS stayed,
      COUNT(*) FILTER (WHERE j.left_at IS NULL)::int AS here,
      COUNT(l.user_id)::int AS linked,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM licenses x WHERE x.user_id = l.user_id AND x.source = 'stripe'))::int AS bought
    FROM discord_joins j
    LEFT JOIN discord_invite_links p ON p.code = j.invite_code
    LEFT JOIN discord_links l ON l.discord_id = j.discord_id
    WHERE j.joined_at >= ?
    GROUP BY 1 ORDER BY 2 DESC, 1`, [t - HOLD_MS, t - HOLD_MS, t - days * DAY]);
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const total = { source: 'Total', joined: sum('joined'), left_24h: sum('left_24h'), old: sum('old'), stayed: sum('stayed'), here: sum('here'), linked: sum('linked'), bought: sum('bought') };
  return { days, rows, total };
}

/** /growth as text: a sentence per key number, then a table by source in a code block (under 2000 characters). */
export function growthText(g, tags) {
  const { total: s } = g;
  const head = [
    `**Last ${g.days} days:** ${plural(s.joined, 'join')}, ${pct(s.left_24h, s.joined)} left within 24 h.`,
    `**First week:** ${pct(s.stayed, s.old)} of those who joined 7+ days ago stayed 7 days.`,
    tags == null ? null : `**Server tag:** ${plural(tags, 'member')} wear it.`,
  ].filter(Boolean);
  if (!g.rows.length) return `${head.join('\n')}\nNo joins recorded yet: the bot counts from the moment it's connected.`;
  const cols = [['Source', 'source'], ['Joined', 'joined'], ['Left <24h', 'left_24h'], ['Stayed 7d', 'stayed7'], ['Here', 'here'], ['Linked', 'linked'], ['Bought', 'bought']];
  const cells = (r) => ({ ...r, source: String(r.source).slice(0, 18), stayed7: r.old ? `${r.stayed}/${r.old}` : '–' });
  const rows = [...g.rows.slice(0, 15), g.total].map(cells);
  const width = cols.map(([title, k]) => Math.max(title.length, ...rows.map((r) => String(r[k]).length)));
  const line = (vals) => vals.map((v, i) => (i ? String(v).padStart(width[i]) : String(v).padEnd(width[i]))).join('  ');
  const table = [line(cols.map(([title]) => title)), ...rows.map((r) => line(cols.map(([, k]) => r[k])))].join('\n');
  return `${head.join('\n')}\n\`\`\`\n${table}\n\`\`\``;
}

/**
 * The community bot, or null without the Discord bot. `discord` is createDiscord's result (REST client, rewards).
 * start() registers the slash commands and connects to the gateway; dispatch() is what the gateway calls.
 */
export function createCommunity(cfg, { db, discord, log = console, now = Date.now, connect = connectGateway } = {}) {
  if (!discord) return null;
  const call = discord.call;
  const G = cfg.discordGuildId;
  let botId = null;
  let memberCount = null;
  let invites = null; // code -> { uses, maxUses, inviterId } as last read; null = not read yet
  let vanityUses = null;
  let invitesError = null; // why invites can't be read (permission), for /admin
  let gateway = null;
  let lastEvent = null;
  const tiers = () => (cfg.discordInviteRoles ? INVITE_TIERS.filter((t) => cfg[t.cfgKey]) : []);

  // ---------- which invite a new member used ----------
  async function readInvites() {
    const list = await call('GET', `/guilds/${G}/invites`);
    const map = new Map();
    for (const i of list || []) {
      map.set(i.code, { uses: Number(i.uses || 0), maxUses: Number(i.max_uses || 0), inviterId: i.inviter && !i.inviter.bot ? i.inviter.id : null });
    }
    const vanity = await call('GET', `/guilds/${G}/vanity-url`).catch(() => null);
    return { map, vanity: vanity?.code ? Number(vanity.uses || 0) : null };
  }

  async function loadInvites() {
    try {
      ({ map: invites, vanity: vanityUses } = await readInvites());
      invitesError = null;
    } catch (err) {
      invites = null;
      invitesError = err instanceof DiscordError && err.kind === 'forbidden'
        ? 'Le bot n’a pas la permission « Gérer le serveur » : sans elle, Discord ne lui montre pas les invitations, et aucune n’est comptée.'
        : `Invitations illisibles : ${err.message}`;
      log.error(`[community] ${invitesError}`);
    }
  }

  /**
   * Compares the invites' use counts with the last reading: the one that went up is the one used. Two at once, an
   * invite gone, the server's Discovery page… then Discord doesn't say, and the join is "unknown".
   */
  async function attribute() {
    if (!invites) { await loadInvites(); return { source: 'unknown' }; }
    const before = invites;
    const beforeVanity = vanityUses;
    let fresh;
    try { fresh = await readInvites(); } catch (err) { log.error(`[community] invitations non relues : ${err.message}`); return { source: 'unknown' }; }
    invites = fresh.map;
    vanityUses = fresh.vanity;
    const used = [];
    for (const [code, inv] of fresh.map) if (inv.uses > (before.get(code)?.uses ?? 0)) used.push({ code, ...inv });
    // An invite with a use limit disappears when its last use is taken.
    for (const [code, inv] of before) if (!fresh.map.has(code) && inv.maxUses && inv.uses + 1 >= inv.maxUses) used.push({ code, ...inv });
    const vanityUsed = fresh.vanity != null && beforeVanity != null && fresh.vanity > beforeVanity;
    if (used.length === 1 && !vanityUsed) return { source: 'invite', code: used[0].code, inviterId: used[0].inviterId };
    if (!used.length && vanityUsed) return { source: 'vanity' };
    return { source: 'unknown' };
  }

  // Joins are handled one at a time: two read at once would see each other's invite.
  let queue = Promise.resolve();
  const serial = (fn) => (queue = queue.then(fn).catch((err) => log.error('[community]', err?.message || err)));

  async function memberAdded(d) {
    const user = d.user;
    if (!user?.id || user.bot) return;
    if (memberCount != null) memberCount += 1;
    const at = Date.parse(d.joined_at) || now();
    const how = await attribute();
    const id = `dj_${user.id}_${at}`;
    await db.run(`INSERT INTO discord_joins (id, discord_id, joined_at, invite_code, inviter_id, source, first_join, account_created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOT EXISTS (SELECT 1 FROM discord_joins WHERE discord_id = ?), ?) ON CONFLICT (id) DO NOTHING`,
    [id, user.id, at, how.code || null, how.inviterId || null, how.source, user.id, createdAt(user.id)]);
    await welcome(user.id, how);
  }

  async function memberRemoved(d) {
    if (!d.user?.id || d.user.bot) return;
    if (memberCount != null) memberCount = Math.max(0, memberCount - 1);
    const { changes } = await db.run(`UPDATE discord_joins SET left_at = ? WHERE id = (SELECT id FROM discord_joins WHERE discord_id = ? AND left_at IS NULL
      ORDER BY joined_at DESC LIMIT 1)`, [now(), d.user.id]);
    // On the server since before the bot: remembered, so that coming back through a friend's link isn't a first join.
    if (!changes) {
      await db.run(`INSERT INTO discord_joins (id, discord_id, joined_at, left_at, source, first_join, account_created_at)
        VALUES (?, ?, 0, ?, 'before_bot', false, ?) ON CONFLICT (id) DO NOTHING`, [`dj_${d.user.id}_0`, d.user.id, now(), createdAt(d.user.id)]);
    }
  }

  async function welcome(memberId, how) {
    if (!cfg.discordWelcomeChannelId) return;
    const lines = [`Welcome <@${memberId}>${memberCount ? `, you're member #${memberCount.toLocaleString('en-US')}` : ''}.`];
    if (how.inviterId) lines.push(`Invited by <@${how.inviterId}>.`);
    lines.push(cfg.discordWelcomeText || `New here? The free version of Rago Optimizer is at <${cfg.siteUrl}/download>. Link your Discord on your Rago account to get invite and boost rewards: <${cfg.publicUrl}/account>`);
    // Only the new member is pinged: the inviter sees it without a notification each time.
    await call('POST', `/channels/${cfg.discordWelcomeChannelId}/messages`, { json: { content: lines.join('\n'), allowed_mentions: { users: [memberId] } } })
      .catch((err) => log.error(`[community] message de bienvenue non posté : ${err.message}`));
  }

  // ---------- counting ----------
  async function inviteStats(discordId) {
    const cut = now() - HOLD_MS;
    const row = await db.get(`SELECT
        COUNT(*) FILTER (WHERE ${VALID} AND ${STAYED})::int AS counted,
        COUNT(*) FILTER (WHERE ${VALID} AND j.joined_at > ? AND j.left_at IS NULL)::int AS pending,
        COUNT(*) FILTER (WHERE ${VALID} AND j.left_at IS NOT NULL AND j.left_at - j.joined_at < ${HOLD_MS})::int AS left,
        COUNT(*) FILTER (WHERE NOT (${VALID}))::int AS ignored
      FROM discord_joins j WHERE j.inviter_id = ?`, [cut, cut, discordId]);
    const bonus = Number((await db.get('SELECT bonus FROM discord_invite_bonus WHERE discord_id = ?', [discordId]))?.bonus || 0);
    return { ...row, bonus, total: row.counted + bonus };
  }

  /** Members by invites that count (bonus included), most first. */
  async function leaderboard({ limit = 10, min = 1 } = {}) {
    return db.all(`SELECT discord_id, SUM(n)::int AS n FROM (
        SELECT j.inviter_id AS discord_id, COUNT(*) AS n FROM discord_joins j WHERE ${VALID} AND ${STAYED} GROUP BY j.inviter_id
        UNION ALL SELECT discord_id, bonus FROM discord_invite_bonus
      ) x GROUP BY discord_id HAVING SUM(n) >= ? ORDER BY 2 DESC, 1 LIMIT ?`, [now() - HOLD_MS, min, limit]);
  }

  // ---------- VIP / MVP from the Rago count ----------
  /**
   * Gives VIP / MVP to members who reached the count, once each, and the Premium that comes with them. Runs in the
   * same queue as the joins, so two passes (hourly, after /invites-adjust) never handle a member at the same time.
   */
  function inviteRolesPass() {
    const run = queue.then(rolesPass);
    queue = run.catch((err) => log.error('[community] rôles d’invitation :', err?.message || err));
    return run;
  }

  async function rolesPass() {
    const list = tiers();
    if (!list.length) return 0;
    const rows = await leaderboard({ limit: 1000, min: Math.min(...list.map((t) => cfg[t.needKey])) });
    let given = 0;
    for (const row of rows) {
      for (const t of list) {
        if (row.n < cfg[t.needKey]) continue;
        const claimed = await db.get(`INSERT INTO discord_invite_roles (discord_id, kind, given_at) VALUES (?, ?, ?)
          ON CONFLICT DO NOTHING RETURNING kind`, [row.discord_id, t.kind, now()]);
        if (!claimed) continue;
        let had;
        try {
          const member = await call('GET', `/guilds/${G}/members/${row.discord_id}`);
          had = member?.roles?.includes(cfg[t.cfgKey]); // given before by the invite bot or staff: no announcement
          if (!had) await call('PUT', `/guilds/${G}/members/${row.discord_id}/roles/${cfg[t.cfgKey]}`, { reason: `${row.n} invites (Rago)` });
        } catch (err) {
          // Not on the server (or the role can't be given): tried again at the next pass.
          await db.run('DELETE FROM discord_invite_roles WHERE discord_id = ? AND kind = ?', [row.discord_id, t.kind]);
          if (!(err instanceof DiscordError && err.kind === 'not_member')) log.error(`[community] ${t.name} non donné à ${row.discord_id} : ${err.message}`);
          continue;
        }
        if (had) continue;
        given += 1;
        await audit(db, 'discord.invite_role', { detail: { discord_id: row.discord_id, kind: t.kind, invites: row.n } });
        // The Premium reward of the role right away, when the member has linked their Rago account.
        const link = await db.get('SELECT user_id FROM discord_links WHERE discord_id = ?', [row.discord_id]);
        let got = null;
        if (link) {
          got = (await discord.checkRewards(link.user_id, { minAge: 0 }).catch((err) => {
            log.error(`[community] récompense ${t.name} : ${err.message}`);
            return [];
          })).find((x) => x.kind === t.kind) || null;
          if (got) await discord.syncUser(link.user_id).catch(() => {});
        }
        await announce(row.discord_id, t, row.n, link ? (got ? 'given' : 'linked') : 'unlinked');
      }
    }
    return given;
  }

  /** "@member reached 10 invites and gets VIP." in the welcome channel, with the Premium reward when there is one. */
  async function announce(memberId, t, n, reward) {
    if (!cfg.discordWelcomeChannelId) return;
    const r = cfg.discord ? REWARDS.find((x) => x.kind === t.kind) : null;
    const prize = r ? `${r.label} of Premium and a one-time ${r.percent}% code` : null;
    const how = !prize || reward === 'linked' ? ''
      : reward === 'given' ? ` ${prize[0].toUpperCase()}${prize.slice(1)} are on your Rago account.`
        : ` Link your Discord on your Rago account to get ${prize}: <${cfg.publicUrl}/account>`;
    await call('POST', `/channels/${cfg.discordWelcomeChannelId}/messages`, {
      json: { content: `<@${memberId}> reached ${plural(n, 'invite')} and gets ${t.name}.${how}`, allowed_mentions: { users: [memberId] } },
    }).catch((err) => log.error(`[community] annonce ${t.name} non postée : ${err.message}`));
  }

  // ---------- /growth ----------
  const growth = (opts = {}) => growthStats(db, { now, ...opts });

  /** How many members wear the server's tag next to their name (Discord's "primary guild"). Null when unreadable. */
  async function tagWearers() {
    let after = '0';
    let n = 0;
    try {
      for (let page = 0; page < 50; page++) {
        const list = await call('GET', `/guilds/${G}/members?limit=1000&after=${after}`);
        for (const m of list) if (m.user?.primary_guild?.identity_guild_id === G && m.user.primary_guild.identity_enabled) n += 1;
        if (list.length < 1000) return n;
        after = list.at(-1).user.id;
      }
      return n;
    } catch (err) {
      log.error(`[community] membres non lus : ${err.message}`);
      return null;
    }
  }

  // ---------- slash commands ----------
  const isStaff = (member) => {
    const p = BigInt(member?.permissions || 0);
    return (p & ADMINISTRATOR) !== 0n || (p & MANAGE_GUILD) !== 0n;
  };
  const reply = (i, content, { ephemeral = false, mentions = NO_PINGS } = {}) => call('POST', `/interactions/${i.id}/${i.token}/callback`, {
    json: { type: 4, data: { content, allowed_mentions: mentions, ...(ephemeral ? { flags: EPHEMERAL } : {}) } },
  });
  const option = (i, name) => i.data?.options?.find((o) => o.name === name)?.value;

  async function invitesText(memberId, self) {
    const s = await inviteStats(memberId);
    const who = self ? 'You' : `<@${memberId}>`;
    const parts = [`${who} invited **${plural(s.total, 'friend')}** who stayed 7 days${s.bonus ? ` (${s.bonus} from before the Rago bot)` : ''}.`];
    if (s.pending) parts.push(`${s.pending} more will count once they've been here 7 days.`);
    if (s.left) parts.push(`${s.left} left before that.`);
    const next = tiers().map((t) => ({ ...t, need: cfg[t.needKey] })).find((t) => s.total < t.need);
    if (next) parts.push(`Next: ${next.name} at ${next.need} invites.`);
    return `${parts.join(' ')}\n-# A friend counts after 7 days on the server. Rejoins and accounts under a week old don't count.`;
  }

  async function onCommand(i) {
    const name = i.data?.name;
    const userId = i.member?.user?.id || i.user?.id;
    if (['partner-link', 'growth', 'invites-adjust'].includes(name) && !isStaff(i.member)) {
      return reply(i, 'This command is for staff.', { ephemeral: true });
    }
    switch (name) {
      case 'invites': {
        const target = option(i, 'member') || userId;
        return reply(i, await invitesText(target, target === userId));
      }
      case 'top-invites': {
        const top = await leaderboard({ limit: 10 });
        if (!top.length) return reply(i, 'No invites counted yet. A friend counts after 7 days on the server.');
        return reply(i, `**Top inviters** (friends who stayed 7 days)\n${top.map((r, k) => `${k + 1}. <@${r.discord_id}> ${r.n}`).join('\n')}`);
      }
      case 'partner-link': {
        const label = String(option(i, 'name') || '').trim().slice(0, 40);
        let code = inviteCode(option(i, 'code'));
        if (code) {
          const inv = await call('GET', `/invites/${encodeURIComponent(code)}`).catch(() => null);
          if (inv?.guild?.id !== G) return reply(i, `That invite isn't a link to this server: ${code}`, { ephemeral: true });
        } else {
          const made = await call('POST', `/channels/${i.channel_id}/invites`, { json: { max_age: 0, max_uses: 0, unique: true }, reason: `Partner link: ${label}` });
          code = made.code;
          invites?.set(code, { uses: 0, maxUses: 0, inviterId: null });
        }
        await db.run(`INSERT INTO discord_invite_links (code, label, created_by, created_at) VALUES (?, ?, ?, ?)
          ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label`, [code, label, userId, now()]);
        await audit(db, 'discord.partner_link', { detail: { code, label, by: userId } });
        return reply(i, `Tracked link for **${label}**: https://discord.gg/${code}\nJoins through it show up in /growth. Members who join through it don't count as anyone's invite.`, { ephemeral: true });
      }
      case 'growth': {
        // Reading every member for the tag can take a few seconds: answer "thinking" first, then the numbers.
        await call('POST', `/interactions/${i.id}/${i.token}/callback`, { json: { type: 5, data: { flags: EPHEMERAL } } });
        const edit = (content) => call('PATCH', `/webhooks/${cfg.discordClientId}/${i.token}/messages/@original`, { json: { content, allowed_mentions: NO_PINGS } });
        try {
          const [g, tags] = await Promise.all([growth(), tagWearers()]);
          return await edit(growthText(g, tags));
        } catch (err) {
          log.error(`[community] /growth : ${err?.message || err}`);
          return edit('Something went wrong. Try again in a minute.').catch(() => {});
        }
      }
      case 'invites-adjust': {
        const member = option(i, 'member');
        const count = Math.max(0, Math.min(1000, Number(option(i, 'count')) || 0));
        if (count) {
          await db.run(`INSERT INTO discord_invite_bonus (discord_id, bonus, set_by, set_at) VALUES (?, ?, ?, ?)
            ON CONFLICT (discord_id) DO UPDATE SET bonus = EXCLUDED.bonus, set_by = EXCLUDED.set_by, set_at = EXCLUDED.set_at`, [member, count, userId, now()]);
        } else {
          await db.run('DELETE FROM discord_invite_bonus WHERE discord_id = ?', [member]);
        }
        await audit(db, 'discord.invite_bonus', { detail: { discord_id: member, bonus: count, by: userId } });
        const s = await inviteStats(member);
        inviteRolesPass().catch(() => {}); // logged by the queue
        return reply(i, `<@${member}> now has ${plural(s.total, 'invite')} (${s.counted} counted by the Rago bot + ${s.bonus} from before).`, { ephemeral: true });
      }
      default:
        return reply(i, 'Unknown command.', { ephemeral: true });
    }
  }

  async function registerCommands() {
    await call('PUT', `/applications/${cfg.discordClientId}/guilds/${G}/commands`, { json: COMMANDS });
  }

  // ---------- gateway events ----------
  async function dispatch(type, d) {
    lastEvent = now();
    switch (type) {
      case 'READY': botId = d.user?.id || null; return;
      case 'GUILD_CREATE':
        if (d.id !== G) return;
        memberCount = Number(d.member_count) || memberCount;
        return loadInvites();
      case 'GUILD_MEMBER_ADD': if (d.guild_id === G) return serial(() => memberAdded(d)); return;
      case 'GUILD_MEMBER_REMOVE': if (d.guild_id === G) return serial(() => memberRemoved(d)); return;
      case 'INVITE_CREATE':
        if (d.guild_id === G && invites && !invites.has(d.code)) invites.set(d.code, { uses: Number(d.uses || 0), maxUses: Number(d.max_uses || 0), inviterId: d.inviter && !d.inviter.bot ? d.inviter.id : null });
        return;
      case 'INTERACTION_CREATE':
        if (d.type !== 2 || d.guild_id !== G) return; // slash commands on this server only (staging shares nothing)
        return onCommand(d).catch((err) => {
          log.error(`[community] /${d.data?.name} : ${err?.message || err}`);
          return reply(d, 'Something went wrong. Try again in a minute.', { ephemeral: true }).catch(() => {});
        });
      default: return;
    }
  }

  function start() {
    registerCommands().catch((err) => log.error(`[community] commandes non enregistrées : ${err.message}`));
    gateway = connect({ token: cfg.discordBotToken, intents: INTENTS.GUILDS | INTENTS.GUILD_MEMBERS | INTENTS.GUILD_INVITES, onDispatch: dispatch, call, log });
    const pass = () => inviteRolesPass().catch(() => {}); // logged by the queue
    setInterval(pass, INVITE_ROLES_EVERY_MS).unref();
    setTimeout(pass, 2 * 60 * 1000).unref();
    log.info?.('[community] bot communauté : invitations, accueil, /growth.');
  }

  /** What /admin shows about the live connection and the invites. */
  function checks() {
    const list = [];
    const st = gateway?.state;
    if (!st) list.push({ label: 'Connexion live', level: 'warn', text: 'Pas encore démarrée.' });
    else if (st.error) list.push({ label: 'Connexion live', level: 'error', text: st.error });
    else if (!st.connected) list.push({ label: 'Connexion live', level: 'warn', text: 'En cours de connexion à Discord.' });
    else list.push({ label: 'Connexion live', level: 'ok', text: `Connectée${lastEvent ? `, dernier événement ${new Date(lastEvent).toISOString().slice(11, 16)} UTC` : ''}.` });
    if (invitesError) list.push({ label: 'Invitations', level: 'error', text: invitesError });
    else if (invites) list.push({ label: 'Invitations', level: 'ok', text: `${plural(invites.size, 'lien')} suivi${invites.size > 1 ? 's' : ''}. Un ami compte après 7 jours sur le serveur.` });
    if (!cfg.discordWelcomeChannelId) list.push({ label: 'Accueil', level: 'warn', text: 'DISCORD_WELCOME_CHANNEL_ID vide : pas de message de bienvenue ni d’annonce VIP / MVP.' });
    const t = tiers();
    if (cfg.discordInviteRoles) list.push({ label: 'VIP / MVP', level: t.length ? 'ok' : 'warn', text: t.length ? t.map((x) => `${x.name} à ${cfg[x.needKey]} invitations`).join(', ') + ', donnés par le bot Rago.' : 'DISCORD_INVITE_ROLES=1 mais aucun rôle VIP / MVP configuré.' });
    return list;
  }

  return { start, dispatch, checks, inviteStats, leaderboard, growth, growthText, inviteRolesPass, registerCommands, idle: () => queue, commands: COMMANDS, botId: () => botId };
}
