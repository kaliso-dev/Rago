import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadConfig } from '../src/config.js';
import { openMemoryDb } from '../src/db.js';
import { DiscordError } from '../src/discord.js';
import * as L from '../src/licensing.js';
import { createCommunity, createdAt, growthStats, growthText, HOLD_MS, inviteCode } from '../src/community.js';
import { connectGateway } from '../src/gateway.js';

const DAY = 24 * 60 * 60 * 1000;
const GUILD = '200000000000000002';
const WELCOME = '400000000000000004';
const VIP_ROLE = '500000000000000005';
const START = Date.parse('2026-10-12T12:00:00Z');
const quiet = { info() {}, warn() {}, error() {} };
const STAFF = String(1n << 5n);

/** A Discord id made at `when` (ids carry their creation time). */
let serial = 0;
const sf = (when) => String((BigInt(when - 1420070400000) << 22n) + BigInt(++serial));
const oldId = () => sf(START - 365 * DAY);

/** The Discord REST API, as much as the community bot uses. */
function fakeRest() {
  const s = { invites: [], vanity: null, members: new Map(), posts: [], replies: [], edits: [], puts: [], commands: null, made: 0 };
  const notFound = () => new DiscordError(404, 10007, 'Unknown Member');
  async function call(method, path, { json } = {}) {
    let m;
    if (method === 'GET' && path === `/guilds/${GUILD}/invites`) return s.invites.map((i) => ({ ...i }));
    if (method === 'GET' && path === `/guilds/${GUILD}/vanity-url`) return s.vanity ? { ...s.vanity } : { code: null, uses: 0 };
    if (method === 'GET' && (m = path.match(/^\/guilds\/\d+\/members\?limit=1000&after=(\d+)$/))) {
      return [...s.members.entries()].filter(([id]) => BigInt(id) > BigInt(m[1])).map(([id, mem]) => ({ user: { id, primary_guild: mem.tag ? { identity_guild_id: GUILD, identity_enabled: true } : null }, roles: mem.roles }));
    }
    if (method === 'GET' && (m = path.match(/^\/guilds\/\d+\/members\/(\d+)$/))) {
      const mem = s.members.get(m[1]);
      if (!mem) throw notFound();
      return { user: { id: m[1] }, roles: [...mem.roles] };
    }
    if (method === 'PUT' && (m = path.match(/^\/guilds\/\d+\/members\/(\d+)\/roles\/(\d+)$/))) {
      if (!s.members.has(m[1])) throw notFound();
      s.members.get(m[1]).roles.push(m[2]);
      s.puts.push({ member: m[1], role: m[2] });
      return null;
    }
    if (method === 'GET' && (m = path.match(/^\/invites\/(.+)$/))) {
      const inv = s.invites.find((i) => i.code === decodeURIComponent(m[1]));
      if (!inv) throw new DiscordError(404, 10006, 'Unknown Invite');
      return { code: inv.code, guild: { id: GUILD } };
    }
    if (method === 'POST' && (m = path.match(/^\/channels\/(\d+)\/invites$/))) {
      const code = `partner${++s.made}`;
      s.invites.push({ code, uses: 0, max_uses: 0, inviter: { id: '999', bot: true } });
      return { code };
    }
    if (method === 'POST' && (m = path.match(/^\/channels\/(\d+)\/messages$/))) { s.posts.push({ channel: m[1], ...json }); return { id: '1' }; }
    if (method === 'POST' && /^\/interactions\//.test(path)) { s.replies.push(json); return null; }
    if (method === 'PATCH' && /^\/webhooks\//.test(path)) { s.edits.push(json); return {}; }
    if (method === 'PUT' && /\/commands$/.test(path)) { s.commands = json; return json; }
    throw new Error(`unexpected ${method} ${path}`);
  }
  return { s, call };
}

async function setup(extra = {}) {
  const db = await openMemoryDb();
  const rest = fakeRest();
  const clock = { t: START };
  const rewardCalls = [];
  const discord = {
    call: rest.call,
    checkRewards: async (userId) => { rewardCalls.push(userId); return extra.rewards || []; },
    syncUser: async () => null,
  };
  const cfg = {
    discord: true, discordGuildId: GUILD, discordClientId: '100000000000000001', discordBotToken: 'token',
    discordWelcomeChannelId: WELCOME, siteUrl: 'https://site.test', publicUrl: 'https://account.test',
    discordInviteRoles: true, discordVipRoleId: VIP_ROLE, discordMvpRoleId: '', discordVipInvites: 2, discordMvpInvites: 15,
    ...extra.cfg,
  };
  const bot = createCommunity(cfg, { db, discord, log: quiet, now: () => clock.t, connect: () => ({ state: { connected: true }, close() {} }) });
  await bot.dispatch('GUILD_CREATE', { id: GUILD, member_count: 100 });
  // A member joins through `code` (its count goes up first, as on Discord).
  const join = async (userId, code, { vanity = false } = {}) => {
    if (code) rest.s.invites.find((i) => i.code === code).uses += 1;
    if (vanity) rest.s.vanity.uses += 1;
    rest.s.members.set(userId, { roles: [] });
    await bot.dispatch('GUILD_MEMBER_ADD', { guild_id: GUILD, joined_at: new Date(clock.t).toISOString(), user: { id: userId } });
    await bot.idle();
  };
  const leave = async (userId) => {
    rest.s.members.delete(userId);
    await bot.dispatch('GUILD_MEMBER_REMOVE', { guild_id: GUILD, user: { id: userId } });
    await bot.idle();
  };
  const command = async (name, { user = oldId(), staff = false, options = [] } = {}) => {
    const before = rest.s.replies.length;
    await bot.dispatch('INTERACTION_CREATE', { id: '1', token: 'tok', type: 2, guild_id: GUILD, channel_id: '600000000000000006',
      member: { user: { id: user }, permissions: staff ? STAFF : '0' }, data: { name, options } });
    await bot.idle();
    return rest.s.replies.slice(before);
  };
  return { db, bot, rest, clock, cfg, join, leave, command, rewardCalls };
}

const invite = (code, inviterId, uses = 0) => ({ code, uses, max_uses: 0, inviter: { id: inviterId } });

test('config: off by default, on with DISCORD_COMMUNITY=1 and the five DISCORD_ variables', () => {
  const DISCORD = { DISCORD_CLIENT_ID: '100000000000000001', DISCORD_CLIENT_SECRET: 's', DISCORD_BOT_TOKEN: 't', DISCORD_GUILD_ID: GUILD, DISCORD_ROLE_ID: '300000000000000003' };
  assert.equal(loadConfig(DISCORD).discordCommunity, false);
  const on = loadConfig({ ...DISCORD, DISCORD_COMMUNITY: '1', DISCORD_WELCOME_CHANNEL_ID: WELCOME, DISCORD_WELCOME_TEXT: 'Hi\\nthere', DISCORD_VIP_INVITES: '5', DISCORD_MVP_INVITES: 'many' });
  assert.equal(on.discordCommunity, true);
  assert.equal(on.discordWelcomeText, 'Hi\nthere');
  assert.deepEqual([on.discordVipInvites, on.discordMvpInvites], [5, 15]);
  const half = loadConfig({ DISCORD_COMMUNITY: '1', DISCORD_INVITE_ROLES: '1', DISCORD_WELCOME_CHANNEL_ID: '#general' });
  assert.equal(half.discordCommunity, false);
  assert.equal(half.discordWelcomeChannelId, '');
  assert.match(half.warnings.join(' '), /DISCORD_COMMUNITY=1 but the Discord bot is not configured/);
  assert.match(half.warnings.join(' '), /DISCORD_INVITE_ROLES=1 needs DISCORD_COMMUNITY=1/);
});

test('ids, invite links and the account age', () => {
  assert.equal(createdAt('175928847299117063'), 1462015105796); // Discord's documented example
  assert.equal(inviteCode('https://discord.gg/rago'), 'rago');
  assert.equal(inviteCode('discord.com/invite/AbC12?event=1'), 'AbC12');
  assert.equal(inviteCode(' AbC12 '), 'AbC12');
});

test('an invite counts once the friend has stayed 7 days', async () => {
  const t = await setup();
  const inviter = oldId();
  t.rest.s.invites.push(invite('aaa', inviter, 3));
  const friend = oldId();
  await t.join(friend, 'aaa');
  const row = await t.db.get('SELECT * FROM discord_joins WHERE discord_id = ?', [friend]);
  assert.equal(row.inviter_id, inviter);
  assert.equal(row.invite_code, 'aaa');
  assert.equal(row.source, 'invite');
  assert.equal(row.first_join, true);

  let s = await t.bot.inviteStats(inviter);
  assert.equal(s.counted, 0);
  assert.equal(s.pending, 1);

  // The welcome message pings the new member only.
  const post = t.rest.s.posts.at(-1);
  assert.equal(post.channel, WELCOME);
  assert.match(post.content, new RegExp(`Welcome <@${friend}>, you're member #101\\.`));
  assert.match(post.content, new RegExp(`Invited by <@${inviter}>`));
  assert.deepEqual(post.allowed_mentions, { users: [friend] });

  t.clock.t += HOLD_MS + 1000;
  s = await t.bot.inviteStats(inviter);
  assert.equal(s.counted, 1);
  assert.equal(s.pending, 0);
  assert.equal(s.total, 1);

  // Leaving after the 7 days doesn't take it back.
  await t.leave(friend);
  assert.equal((await t.bot.inviteStats(inviter)).counted, 1);
});

test('leaving within 7 days, rejoining, alts and self-invites never count', async () => {
  const t = await setup();
  const inviter = oldId();
  t.rest.s.invites.push(invite('bbb', inviter));

  const quitter = oldId();
  await t.join(quitter, 'bbb');
  t.clock.t += DAY;
  await t.leave(quitter);
  await t.join(quitter, 'bbb'); // back through the same link: not a first join
  const alt = sf(START - DAY); // a day-old account
  await t.join(alt, 'bbb');
  t.clock.t += HOLD_MS + DAY;

  const s = await t.bot.inviteStats(inviter);
  assert.equal(s.counted, 0);
  assert.equal(s.left, 1);
  assert.equal(s.ignored, 2);
  const rejoin = await t.db.get('SELECT first_join FROM discord_joins WHERE discord_id = ? ORDER BY joined_at DESC LIMIT 1', [quitter]);
  assert.equal(rejoin.first_join, false);

  // On the server before the bot, seen leaving, then back through a friend's link: not a first join either.
  const veteran = oldId();
  await t.leave(veteran);
  await t.join(veteran, 'bbb');
  t.clock.t += HOLD_MS + DAY;
  assert.equal((await t.bot.inviteStats(inviter)).counted, 0);
  // Its "on the server before the bot" row stays out of /growth: 4 joins (the quitter twice, the alt, the veteran).
  assert.equal((await growthStats(t.db, { now: () => t.clock.t })).total.joined, 4);
});

test('vanity URL, two invites at once, and an invite used up', async () => {
  const t = await setup();
  t.rest.s.vanity = { code: 'rago', uses: 10 };
  const a = oldId();
  const b = oldId();
  t.rest.s.invites.push(invite('ccc', a), invite('ddd', b), { ...invite('eee', a), max_uses: 1 });
  await t.bot.dispatch('GUILD_CREATE', { id: GUILD, member_count: 100 }); // reads the vanity count too

  const v = oldId();
  await t.join(v, null, { vanity: true });
  assert.equal((await t.db.get('SELECT source FROM discord_joins WHERE discord_id = ?', [v])).source, 'vanity');

  // Two counts went up between two readings: Discord doesn't say which was whose.
  t.rest.s.invites.find((i) => i.code === 'ccc').uses += 1;
  const both = oldId();
  await t.join(both, 'ddd');
  assert.equal((await t.db.get('SELECT source, inviter_id FROM discord_joins WHERE discord_id = ?', [both])).source, 'unknown');

  // A one-use invite disappears when it's used.
  t.rest.s.invites = t.rest.s.invites.filter((i) => i.code !== 'eee');
  const last = oldId();
  t.rest.s.members.set(last, { roles: [] });
  await t.bot.dispatch('GUILD_MEMBER_ADD', { guild_id: GUILD, joined_at: new Date(t.clock.t).toISOString(), user: { id: last } });
  await t.bot.idle();
  const row = await t.db.get('SELECT inviter_id, invite_code FROM discord_joins WHERE discord_id = ?', [last]);
  assert.deepEqual(row, { inviter_id: a, invite_code: 'eee' });

  // Another server (a staging bot sharing the token) and bots are ignored.
  await t.bot.dispatch('GUILD_MEMBER_ADD', { guild_id: '300000000000000003', joined_at: new Date().toISOString(), user: { id: oldId() } });
  await t.bot.dispatch('GUILD_MEMBER_ADD', { guild_id: GUILD, joined_at: new Date().toISOString(), user: { id: oldId(), bot: true } });
  await t.bot.idle();
  assert.equal((await t.db.get('SELECT COUNT(*)::int AS n FROM discord_joins')).n, 3);
});

test('/invites, /top-invites, and staff-only commands', async () => {
  const t = await setup();
  const inviter = oldId();
  t.rest.s.invites.push(invite('fff', inviter));
  await t.join(oldId(), 'fff');
  await t.join(oldId(), 'fff');
  t.clock.t += HOLD_MS + 1000;
  await t.join(oldId(), 'fff');

  let [r] = await t.command('invites', { user: inviter });
  assert.equal(r.type, 4);
  assert.match(r.data.content, /^You invited \*\*2 friends\*\* who stayed 7 days\. 1 more will count once they've been here 7 days\./);
  assert.equal(r.data.flags, undefined, 'visible to the channel');
  assert.deepEqual(r.data.allowed_mentions, { parse: [] });

  [r] = await t.command('invites', { options: [{ name: 'member', value: inviter }] });
  assert.match(r.data.content, new RegExp(`^<@${inviter}> invited \\*\\*2 friends\\*\\*`));

  [r] = await t.command('top-invites');
  assert.match(r.data.content, new RegExp(`1\\. <@${inviter}> 2`));

  for (const name of ['growth', 'partner-link', 'invites-adjust']) {
    [r] = await t.command(name);
    assert.equal(r.data.content, 'This command is for staff.');
    assert.equal(r.data.flags, 64);
  }
});

test('partner links count for nobody and show up in /growth', async () => {
  const t = await setup();
  const member = oldId();
  t.rest.s.invites.push(invite('ggg', member));
  // A partner link made by the bot, and a member's existing link tracked as a partner's.
  let [r] = await t.command('partner-link', { staff: true, options: [{ name: 'name', value: 'Axora' }] });
  assert.match(r.data.content, /Tracked link for \*\*Axora\*\*: https:\/\/discord\.gg\/partner1/);
  [r] = await t.command('partner-link', { staff: true, options: [{ name: 'name', value: 'Nexa' }, { name: 'code', value: 'https://discord.gg/ggg' }] });
  assert.match(r.data.content, /discord\.gg\/ggg/);
  [r] = await t.command('partner-link', { staff: true, options: [{ name: 'name', value: 'X' }, { name: 'code', value: 'nope' }] });
  assert.match(r.data.content, /isn't a link to this server/);

  await t.join(oldId(), 'partner1');
  await t.join(oldId(), 'partner1');
  const left = oldId();
  await t.join(left, 'ggg');
  t.clock.t += 60 * 60 * 1000;
  await t.leave(left);
  t.clock.t += HOLD_MS;
  assert.equal((await t.bot.inviteStats(member)).counted, 0);

  const g = await t.bot.growth();
  const axora = g.rows.find((x) => x.source === 'Axora');
  assert.deepEqual({ joined: axora.joined, stayed: axora.stayed, here: axora.here }, { joined: 2, stayed: 2, here: 2 });
  assert.equal(g.rows.find((x) => x.source === 'Nexa').left_24h, 1);
  assert.equal(g.total.joined, 3);

  // /growth answers "thinking", then the numbers (with the server tag).
  t.rest.s.members.values().next().value.tag = true;
  const replies = await t.command('growth', { staff: true });
  assert.equal(replies[0].type, 5);
  const text = t.rest.s.edits.at(-1).content;
  assert.match(text, /\*\*Last 30 days:\*\* 3 joins, 33% left within 24 h\./);
  assert.match(text, /\*\*Server tag:\*\* 1 member wear/);
  assert.match(text, /Axora\s+2\s+0\s+2\/2/);
  assert.ok(text.length < 2000);
});

test('VIP from the Rago count: the role, the Premium reward, announced once', async () => {
  const t = await setup({ rewards: [{ kind: 'vip', action: 'created' }] });
  const inviter = oldId();
  t.rest.s.members.set(inviter, { roles: [] });
  const user = await L.createUser(t.db, 'vip@example.com', 'password-123');
  await t.db.run('INSERT INTO discord_links (user_id, discord_id, linked_at) VALUES (?, ?, ?)', [user.id, inviter, START]);
  t.rest.s.invites.push(invite('hhh', inviter));
  await t.join(oldId(), 'hhh');
  assert.equal(await t.bot.inviteRolesPass(), 0, 'nothing before 7 days');
  // One invite from Invite Tracker's count, one counted by the Rago bot.
  await t.command('invites-adjust', { staff: true, options: [{ name: 'member', value: inviter }, { name: 'count', value: 1 }] });
  t.clock.t += HOLD_MS + 1000;
  assert.equal(await t.bot.inviteRolesPass(), 1);
  assert.deepEqual(t.rest.s.puts, [{ member: inviter, role: VIP_ROLE }]);
  assert.deepEqual(t.rewardCalls, [user.id]);
  const post = t.rest.s.posts.at(-1);
  assert.equal(post.content, `<@${inviter}> reached 2 invites and gets VIP. 1 month of Premium and a one-time 10% code are on your Rago account.`);
  assert.equal(await t.bot.inviteRolesPass(), 0, 'given once');

  // Not linked: told how to get the reward. Already VIP (given by hand): nothing said.
  const other = oldId();
  const veteran = oldId();
  t.rest.s.members.set(other, { roles: [] });
  t.rest.s.members.set(veteran, { roles: [VIP_ROLE] });
  for (const id of [other, veteran]) {
    await t.command('invites-adjust', { staff: true, options: [{ name: 'member', value: id }, { name: 'count', value: 5 }] });
  }
  await t.bot.inviteRolesPass();
  assert.match(t.rest.s.posts.at(-1).content, new RegExp(`^<@${other}> reached 5 invites and gets VIP\\. Link your Discord on your Rago account to get 1 month of Premium`));
  assert.equal(t.rest.s.posts.filter((p) => p.content.includes(veteran)).length, 0);

  // Not on the server: tried again at the next pass.
  const gone = oldId();
  await t.command('invites-adjust', { staff: true, options: [{ name: 'member', value: gone }, { name: 'count', value: 3 }] });
  await t.bot.inviteRolesPass();
  assert.equal(await t.db.get('SELECT 1 FROM discord_invite_roles WHERE discord_id = ?', [gone]), null);
});

test('growth text with no joins yet, and the bought column', async () => {
  const t = await setup();
  assert.match(growthText(await growthStats(t.db, { now: () => START }), null), /No joins recorded yet/);

  const buyer = oldId();
  t.rest.s.invites.push(invite('iii', oldId()));
  await t.join(buyer, 'iii');
  const user = await L.createUser(t.db, 'buyer@example.com', 'password-123');
  await t.db.run('INSERT INTO discord_links (user_id, discord_id, linked_at) VALUES (?, ?, ?)', [user.id, buyer, START]);
  await t.db.run(`INSERT INTO licenses (id, key, user_id, email, source, created_at) VALUES ('lic_1', 'K-1', ?, 'buyer@example.com', 'stripe', ?)`, [user.id, START]);
  const g = await growthStats(t.db, { now: () => t.clock.t });
  assert.deepEqual({ linked: g.total.linked, bought: g.total.bought }, { linked: 1, bought: 1 });
});

test('slash commands registered and /admin checks', async () => {
  const t = await setup({ cfg: { discordWelcomeChannelId: '' } });
  await t.bot.registerCommands();
  assert.deepEqual(t.rest.s.commands.map((c) => c.name), ['invites', 'top-invites', 'partner-link', 'growth', 'invites-adjust']);
  assert.equal(t.rest.s.commands.find((c) => c.name === 'growth').default_member_permissions, STAFF);
  t.bot.start();
  const checks = t.bot.checks();
  assert.equal(checks.find((c) => c.label === 'Connexion live').level, 'ok');
  assert.equal(checks.find((c) => c.label === 'Accueil').level, 'warn');
  assert.match(checks.find((c) => c.label === 'VIP / MVP').text, /VIP à 2 invitations/);

  // Without « Manage Server », Discord hides the invites: said on /admin.
  const db = await openMemoryDb();
  const call = async (method, path) => {
    if (path.endsWith('/invites')) throw new DiscordError(403, 50013, 'Missing Permissions');
    return null;
  };
  const bot = createCommunity(t.cfg, { db, discord: { call }, log: quiet, connect: () => ({ state: { connected: false }, close() {} }) });
  await bot.dispatch('GUILD_CREATE', { id: GUILD, member_count: 5 });
  assert.match(bot.checks().find((c) => c.label === 'Invitations').text, /Gérer le serveur/);
});

/** A WebSocket that the test drives: what the bot sends, and what Discord answers. */
class FakeSocket {
  static all = [];
  constructor(url) { this.url = url; this.readyState = 1; this.sent = []; this.on = {}; FakeSocket.all.push(this); }
  addEventListener(type, fn) { (this.on[type] ||= []).push(fn); }
  send(text) { this.sent.push(JSON.parse(text)); }
  close(code) { this.readyState = 3; setImmediate(() => (this.on.close || []).forEach((fn) => fn({ code }))); }
  receive(msg) { (this.on.message || []).forEach((fn) => fn({ data: JSON.stringify(msg) })); }
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('gateway: identify, events, resume after a drop, stop on a missing intent', async () => {
  FakeSocket.all = [];
  const events = [];
  const errors = [];
  const gw = connectGateway({
    token: 'token', intents: 7, WebSocketImpl: FakeSocket, random: () => 0,
    call: async () => ({ url: 'wss://gateway.test' }), onDispatch: (type, d) => events.push([type, d]),
    log: { info() {}, error: (...a) => errors.push(a.join(' ')) },
  });
  await tick();
  const ws = FakeSocket.all[0];
  assert.equal(ws.url, 'wss://gateway.test/?v=10&encoding=json');
  ws.receive({ op: 10, d: { heartbeat_interval: 60000 } });
  await tick();
  assert.ok(ws.sent.some((m) => m.op === 1), 'heartbeat');
  assert.deepEqual(ws.sent.find((m) => m.op === 2), { op: 2, d: { token: 'token', intents: 7, properties: { os: 'linux', browser: 'rago', device: 'rago' } } });
  ws.receive({ op: 11 });
  ws.receive({ op: 0, t: 'READY', s: 1, d: { session_id: 'abc', resume_gateway_url: 'wss://resume.test', user: { id: '1' } } });
  ws.receive({ op: 0, t: 'GUILD_MEMBER_ADD', s: 2, d: { user: { id: '2' } } });
  await tick();
  assert.equal(gw.state.connected, true);
  assert.deepEqual(events.map(([type]) => type), ['READY', 'GUILD_MEMBER_ADD']);

  // A drop: back on the resume address, picking up after event 2.
  ws.close(1006);
  await tick(1100);
  const again = FakeSocket.all[1];
  assert.equal(again.url, 'wss://resume.test/?v=10&encoding=json');
  again.receive({ op: 10, d: { heartbeat_interval: 60000 } });
  await tick();
  assert.deepEqual(again.sent.find((m) => m.op === 6), { op: 6, d: { token: 'token', session_id: 'abc', seq: 2 } });

  // Server Members Intent off in the Developer Portal: Discord closes with 4014, the bot says what to do and stops.
  again.close(4014);
  await tick(1100);
  assert.equal(FakeSocket.all.length, 2);
  assert.equal(gw.state.connected, false);
  assert.match(gw.state.error, /Server Members Intent/);
  assert.ok(errors.some((e) => /4014/.test(e)));
  gw.close();
});
