// /admin (2026-11-10): the dashboard where Sofiene sees everything and manages players without the terminal.
// Opened with ADMIN_KEY (Railway variable, 16 characters at least): typed once, then a cookie for 7 days, limited to
// /admin, SameSite=Strict. Every form is a same-origin POST (checked in app.js), every action is written to `audit`
// as admin.*. Nothing secret is sent to the page: keys stay on the server, links are shown once.
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { createHmac } from 'node:crypto';

import * as L from './licensing.js';
import * as A from './affiliates.js';
import * as P from './profile.js';
import * as R from './reviews.js';
import * as N from './network.js';
import * as Promo from './promo.js';
import { audit } from './db.js';
import { ensureCoupon, endTestLicenses, findPromotionCode, stopReplacedSubscriptions, stripeChecks, stripeMode } from './billing.js';
import { discordSetupMissing, DiscordError } from './discord.js';
import { createSales } from './sales.js';
import { deleteAccount } from './support.js';
import * as AV from './admin-views.js';

const DAY = 86400000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE = 50;
export const USER_FILTERS = ['tous', 'premium', 'abonnes', 'essais', 'resilies', 'lifetime', 'offerts', 'gratuits', 'bannis'];

/**
 * deps: { cfg, db, stripe, discord, community, geo, installer, avatars, allow, ip, sameHash, log, fetchImpl,
 *   webhookState: () => hookSeen, onPopupChange: () => void, startedAt }
 */
export function mountAdmin(app, deps) {
  const { cfg, db, stripe, discord, community, geo, installer, avatars, allow, ip, sameHash, log, fetchImpl, webhookState, onPopupChange, startedAt } = deps;
  const sales = createSales(stripe, { log });
  const COOKIE = 'rago_admin';
  const pass = cfg.adminKey.length >= 16 ? createHmac('sha256', cfg.adminKey).update('rago-admin-v1').digest('base64url') : null;
  const isAdmin = (c) => !!pass && sameHash(getCookie(c, COOKIE) || '', pass);
  const cookieOpts = { httpOnly: true, secure: cfg.prod, sameSite: 'Strict', path: '/admin' };
  const shell = (c, html, status = 200) => c.html(html, status);
  // Every page gets the side menu's numbers: players, purchases waiting for an account, and the services' state
  // as last checked (checked again in the background when older than a minute).
  const navFor = async () => {
    const row = await db.get(`SELECT (SELECT COUNT(*) FROM users)::int AS users,
      (SELECT COUNT(*) FROM licenses WHERE user_id IS NULL AND status = 'active' AND email NOT LIKE 'deleted-%')::int AS unclaimed`);
    if (!servicesCache || Date.now() - servicesCache.at >= SERVICES_TTL) refreshServices();
    const list = servicesCache?.list || [];
    const health = list.some((x) => x.level === 'error') ? 'error' : list.some((x) => x.level === 'warn') ? 'warn' : list.length ? 'ok' : null;
    return { ...nav, users: n(row, 'users'), unclaimed: n(row, 'unclaimed'), health };
  };
  const view = async (c, page, data, status = 200) => c.html(page(await navFor(), data), status);

  // Without ADMIN_KEY, /admin doesn't exist. Signed out, every page but the login form sends back to it.
  const OPEN = new Set(['/admin', '/admin/login', '/admin/logout']);
  const guard = async (c, next) => {
    c.header('Cache-Control', 'no-store');
    c.header('X-Robots-Tag', 'noindex');
    if (!pass) return c.notFound();
    if (!OPEN.has(c.req.path) && !isAdmin(c)) return c.redirect('/admin', 303);
    await next();
  };
  app.use('/admin', guard);
  app.use('/admin/*', guard);

  app.post('/admin/login', async (c) => {
    if (!allow(`admin-login:${ip(c)}`, 10, 60 * 60 * 1000)) return shell(c, AV.loginPage(cfg, { error: 'Trop d’essais. Réessaie dans une heure.' }), 429);
    const body = await c.req.parseBody();
    if (!sameHash(String(body.key || '').trim(), cfg.adminKey)) {
      await audit(db, 'admin.login_failed', { detail: { ip: ip(c) } });
      return shell(c, AV.loginPage(cfg, { error: 'Cette clé ne correspond pas à ADMIN_KEY.' }), 401);
    }
    setCookie(c, COOKIE, pass, { ...cookieOpts, maxAge: 7 * 86400 });
    await audit(db, 'admin.login', { detail: { ip: ip(c) } });
    return c.redirect('/admin', 303);
  });
  app.post('/admin/logout', (c) => {
    deleteCookie(c, COOKIE, cookieOpts);
    return c.redirect('/admin', 303);
  });

  // ---------- data ----------
  const n = (row, k = 'n') => Number(row?.[k] || 0);
  const trialWindow = () => (cfg.trialDays + 1) * DAY;

  async function counts() {
    const t = Date.now();
    const [users, lic, devices, discordRow, net, unclaimed, trials, reviews] = await Promise.all([
      db.get(`SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE created_at > ?)::int AS d1, COUNT(*) FILTER (WHERE created_at > ?)::int AS d7,
        COUNT(*) FILTER (WHERE created_at > ?)::int AS d30, COUNT(*) FILTER (WHERE banned_at IS NOT NULL)::int AS banned FROM users`, [t - DAY, t - 7 * DAY, t - 30 * DAY]),
      db.get(`SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'active' AND plan = 'month')::int AS month,
        COUNT(*) FILTER (WHERE status = 'active' AND plan = 'year')::int AS year,
        COUNT(*) FILTER (WHERE status = 'active' AND plan = 'lifetime' AND source = 'stripe')::int AS lifetime,
        COUNT(*) FILTER (WHERE status = 'active' AND (plan = 'reward' OR source <> 'stripe'))::int AS gifted,
        COUNT(*) FILTER (WHERE status = 'active' AND cancel_at_period_end)::int AS canceling
        FROM licenses WHERE user_id IS NOT NULL`),
      db.get('SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE last_seen_at > ?)::int AS d7, COUNT(*) FILTER (WHERE last_seen_at > ?)::int AS d1 FROM devices', [t - 7 * DAY, t - DAY]),
      db.get('SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE role)::int AS role FROM discord_links'),
      db.get('SELECT COUNT(*)::int AS n, COUNT(DISTINCT device)::int AS players FROM network_reports WHERE at > ?', [t - 7 * DAY]).catch(() => null),
      db.get("SELECT COUNT(*)::int AS n FROM licenses WHERE user_id IS NULL AND status = 'active'"),
      db.get(`SELECT COUNT(*)::int AS n FROM trials tr JOIN licenses l ON l.stripe_subscription_id = tr.subscription_id
        WHERE NOT tr.charged_now AND l.status = 'active' AND l.current_period_end > ? AND tr.started_at > ?`, [t, t - trialWindow()]),
      db.get("SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE status <> 'published')::int AS hidden, ROUND(AVG(rating)::numeric, 2)::float AS avg FROM reviews"),
    ]);
    return { users, lic, devices, discord: discordRow, net, unclaimed: n(unclaimed), trials: n(trials), reviews };
  }

  // Search: email or public name (part of it), license key, Stripe customer or subscription id, Discord name.
  function userWhere(q, filtre) {
    const where = [];
    const args = [];
    const query = String(q || '').trim().toLowerCase().slice(0, 120);
    if (query) {
      const like = `%${query.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      where.push(`(u.email LIKE ? OR LOWER(COALESCE(u.display_name, '')) LIKE ? OR u.id = ?
        OR EXISTS (SELECT 1 FROM licenses x WHERE x.user_id = u.id AND (LOWER(x.key) = ? OR x.stripe_customer_id = ? OR x.stripe_subscription_id = ? OR x.id = ?))
        OR EXISTS (SELECT 1 FROM discord_links d WHERE d.user_id = u.id AND (LOWER(COALESCE(d.discord_name, '')) LIKE ? OR d.discord_id = ?)))`);
      args.push(like, like, query, query, query, query, query, like, query);
    }
    const active = "l.status = 'active'";
    const f = {
      premium: active,
      abonnes: `${active} AND l.plan IN ('month', 'year')`,
      resilies: `${active} AND l.cancel_at_period_end`,
      lifetime: `${active} AND l.plan = 'lifetime'`,
      offerts: `${active} AND (l.plan = 'reward' OR l.source <> 'stripe')`,
      gratuits: `(l.id IS NULL OR l.status <> 'active')`,
      bannis: 'u.banned_at IS NOT NULL',
      essais: `${active} AND EXISTS (SELECT 1 FROM trials tr WHERE tr.subscription_id = l.stripe_subscription_id AND NOT tr.charged_now AND tr.started_at > ${Date.now() - trialWindow()})`,
    }[filtre];
    if (f) where.push(f);
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  }
  const LATEST_LICENSE = `LEFT JOIN LATERAL (SELECT * FROM licenses WHERE user_id = u.id ORDER BY (status = 'active') DESC, created_at DESC LIMIT 1) l ON true`;
  const LAST_SEEN = '(SELECT MAX(d.last_seen_at) FROM licenses x JOIN devices d ON d.license_id = x.id WHERE x.user_id = u.id)';
  const SORT = {
    recents: 'u.created_at DESC', anciens: 'u.created_at ASC', email: 'u.email ASC',
    actifs: 'last_seen DESC NULLS LAST, u.created_at DESC',
    fin: "(CASE WHEN l.status = 'active' AND l.plan <> 'lifetime' THEN l.current_period_end END) ASC NULLS LAST, u.created_at DESC",
  };

  async function userList({ q, filtre, tri, page, limit = PAGE }) {
    const { sql, args } = userWhere(q, filtre);
    const [rows, total] = await Promise.all([
      db.all(`SELECT u.id, u.email, u.display_name, u.avatar_key, u.created_at, u.banned_at, u.banned_reason,
          l.id AS lic_id, l.plan, l.status, l.status_reason, l.source, l.current_period_end, l.cancel_at_period_end,
          ${LAST_SEEN} AS last_seen,
          (SELECT discord_name FROM discord_links d WHERE d.user_id = u.id) AS discord_name
        FROM users u ${LATEST_LICENSE} ${sql} ORDER BY ${SORT[tri] || SORT.recents} LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]),
      db.get(`SELECT COUNT(*)::int AS n FROM users u ${LATEST_LICENSE} ${sql}`, args),
    ]);
    return { rows, total: n(total), page, per: limit, pages: Math.max(1, Math.ceil(n(total) / limit)) };
  }

  // How many players each filter shows, for the current search: one query.
  async function userFacets(q) {
    const { sql, args } = userWhere(q, null);
    const active = "l.status = 'active'";
    const row = await db.get(`SELECT COUNT(*)::int AS tous,
        COUNT(*) FILTER (WHERE ${active})::int AS premium,
        COUNT(*) FILTER (WHERE ${active} AND l.plan IN ('month', 'year'))::int AS abonnes,
        COUNT(*) FILTER (WHERE ${active} AND EXISTS (SELECT 1 FROM trials tr WHERE tr.subscription_id = l.stripe_subscription_id AND NOT tr.charged_now AND tr.started_at > ?))::int AS essais,
        COUNT(*) FILTER (WHERE ${active} AND l.cancel_at_period_end)::int AS resilies,
        COUNT(*) FILTER (WHERE ${active} AND l.plan = 'lifetime')::int AS lifetime,
        COUNT(*) FILTER (WHERE ${active} AND (l.plan = 'reward' OR l.source <> 'stripe'))::int AS offerts,
        COUNT(*) FILTER (WHERE l.id IS NULL OR l.status <> 'active')::int AS gratuits,
        COUNT(*) FILTER (WHERE u.banned_at IS NOT NULL)::int AS bannis
      FROM users u ${LATEST_LICENSE} ${sql}`, [Date.now() - trialWindow(), ...args]);
    return row || {};
  }

  async function userDetail(id) {
    const user = await L.getUser(db, id);
    if (!user) return null;
    const licenses = await db.all('SELECT * FROM licenses WHERE user_id = ? ORDER BY (status = \'active\') DESC, created_at DESC', [id]);
    const ids = licenses.map((l) => l.id);
    const t = Date.now();
    const [devices, accountDevices, identities, discordLink, rewards, review, affiliate, referredBy, trials, loose, events, sessions, resets] = await Promise.all([
      ids.length ? db.all(`SELECT * FROM devices WHERE license_id IN (${ids.map(() => '?').join(', ')})`, ids) : [],
      db.all('SELECT * FROM account_devices WHERE user_id = ? ORDER BY seen_at DESC LIMIT 10', [id]),
      db.all('SELECT provider, email, created_at FROM oauth_identities WHERE user_id = ?', [id]),
      db.get('SELECT * FROM discord_links WHERE user_id = ?', [id]),
      db.all('SELECT * FROM discord_rewards WHERE user_id = ? ORDER BY given_at', [id]),
      R.reviewOf(db, id),
      A.affiliateSummary(db, cfg, id).catch(() => null),
      db.get(`SELECT r.status, r.created_at, u.email, u.id FROM referrals r JOIN users u ON u.id = r.affiliate_user_id WHERE r.referred_user_id = ?`, [id]),
      db.all('SELECT * FROM trials WHERE email = ? ORDER BY started_at DESC', [user.email]),
      L.unclaimedLicenses(db, user.email),
      db.all(`SELECT * FROM audit WHERE user_id = ?${ids.length ? ` OR license_id IN (${ids.map(() => '?').join(', ')})` : ''} ORDER BY id DESC LIMIT 60`, [id, ...ids]),
      db.get('SELECT (SELECT COUNT(*) FROM web_sessions WHERE user_id = ? AND expires_at > ?)::int AS web, (SELECT COUNT(*) FROM api_sessions WHERE user_id = ? AND expires_at > ?)::int AS app', [id, t, id, t]),
      db.get('SELECT MAX(expires_at) AS until FROM password_resets WHERE user_id = ? AND used_at IS NULL AND expires_at > ?', [id, t]),
    ]);
    return { user, licenses, devices, accountDevices, identities, discordLink, rewards, review, affiliate, referredBy, trials, loose, events, sessions, resets, hasPassword: L.hasPassword(user) };
  }

  // ---------- services ----------
  // Checked at most once a minute: pages show the last check at once and a new one runs in the background.
  const SERVICES_TTL = 60 * 1000;
  let servicesCache = null;
  let servicesRun = null;
  async function timed(fn) {
    const t0 = Date.now();
    try { return { ...(await fn()), ms: Date.now() - t0 }; } catch (err) { return { level: 'error', text: err.message, ms: Date.now() - t0 }; }
  }
  async function ping(url, { timeout = 5000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetchImpl(url, { method: 'GET', redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': 'rago-admin-check' } });
      return res;
    } finally { clearTimeout(timer); }
  }
  const ago = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 3600) return `${Math.round(s / 60)} min`;
    if (s < 2 * DAY / 1000) return `${Math.round(s / 3600)} h`;
    return `${Math.round(s / 86400)} jours`;
  };

  const refreshServices = () => (servicesRun ||= checkServices().then((v) => (servicesCache = v))
    .catch((err) => { log.error?.('[admin] services', err.message); return servicesCache; })
    .finally(() => { servicesRun = null; }));
  /** `fresh`: check now. Otherwise the last check (a new one starts in the background once it is a minute old). */
  async function services({ fresh = false } = {}) {
    if (fresh || !servicesCache) return refreshServices();
    if (Date.now() - servicesCache.at >= SERVICES_TTL) refreshServices();
    return servicesCache;
  }
  // The overview doesn't wait more than 1.5 s for the very first check: the card says it's running.
  const servicesSoon = (fresh) => Promise.race([services({ fresh }), new Promise((r) => setTimeout(r, fresh ? 8000 : 1500)).then(() => servicesCache)]);

  async function checkServices() {
    const env = process.env;
    const commit = (env.RAILWAY_GIT_COMMIT_SHA || '').slice(0, 7);
    const mem = Math.round(process.memoryUsage().rss / 1048576);
    const list = await Promise.all([
      timed(async () => ({
        id: 'serveur', group: 'Railway', label: 'Serveur de comptes',
        level: cfg.warnings.length ? 'warn' : 'ok',
        text: `Environnement « ${cfg.envName} »${commit ? `, commit ${commit}` : ''}${env.RAILWAY_GIT_BRANCH ? ` (branche ${env.RAILWAY_GIT_BRANCH})` : ''}. En ligne depuis ${ago(Date.now() - startedAt)}, Node ${process.versions.node}, ${mem} Mo de mémoire.${cfg.warnings.length ? ` ${cfg.warnings.length} avertissement${cfg.warnings.length > 1 ? 's' : ''} au démarrage (ci-dessous).` : ''}`,
        link: cfg.publicUrl,
      })),
      timed(async () => {
        const t0 = Date.now();
        await db.get('SELECT 1 AS ok');
        const ms = Date.now() - t0;
        const size = await db.get('SELECT pg_database_size(current_database())::bigint AS b').catch(() => null);
        return { id: 'base', group: 'Supabase', label: 'Base de données', level: ms > 800 ? 'warn' : 'ok',
          text: `Répond en ${ms} ms${size?.b ? `, ${Math.round(Number(size.b) / 1048576)} Mo utilisés (500 Mo dans l’offre gratuite)` : ''}.${cfg.databaseUrl ? '' : ' Base en mémoire : tout est perdu au redémarrage (développement).'}` };
      }),
      timed(async () => {
        if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) return { id: 'stockage', group: 'Supabase', label: 'Stockage (installateur, photos)', level: cfg.prod ? 'error' : 'warn', text: 'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent : pas de téléchargement depuis Supabase ni de photos de profil.' };
        const out = await installer.resolve({ fresh: true });
        return { id: 'stockage', group: 'Supabase', label: 'Stockage (installateur, photos)', level: out.error ? 'error' : 'ok',
          text: out.error ? `Téléchargement impossible : ${out.error}` : `Le bouton Télécharger sert ${out.file || 'l’installateur'} (${out.source}). Photos de profil : ${avatars?.kind === 'supabase' ? 'bucket « ' + cfg.avatarBucket + ' »' : 'en mémoire'}.` };
      }),
      timed(async () => {
        const next = await installer.latest({ fresh: true });
        const state = cfg.updatePaused ? 'en pause (UPDATE_PAUSED)' : `envoyée à ${cfg.updateRollout} % des apps`;
        return { id: 'maj', group: 'Supabase', label: 'Mise à jour automatique de l’app', level: next.error ? 'warn' : cfg.updatePaused ? 'warn' : 'ok',
          text: next.error ? next.error : `Version ${next.version} (${next.name}), ${state}.${cfg.installerVersion ? ` INSTALLER_VERSION = ${cfg.installerVersion}.` : ''}` };
      }),
      timed(async () => {
        if (!cfg.siteUrl || cfg.siteUrl === cfg.publicUrl) return { id: 'site', group: 'Netlify', label: 'Site', level: 'warn', text: 'SITE_URL est l’adresse de ce serveur : pas de site séparé à vérifier.' };
        const res = await ping(`${cfg.siteUrl}/`);
        return { id: 'site', group: 'Netlify', label: `Site ${new URL(cfg.siteUrl).host}`, level: res.status < 400 ? 'ok' : 'error', text: `Répond ${res.status}.`, link: cfg.siteUrl };
      }),
      timed(async () => {
        if (cfg.envName !== 'production') return null;
        // The old Railway address: apps 1.1.7 and before have it compiled in, and Stripe's first live webhook sends there.
        const res = await ping('https://rago-production.up.railway.app/healthz');
        return { id: 'ancienne', group: 'Railway', label: 'Ancienne adresse rago-production.up.railway.app', level: res.status === 200 ? 'ok' : 'error', text: res.status === 200 ? 'Répond (les apps 1.1.7 et avant l’utilisent encore).' : `Répond ${res.status} : les apps 1.1.7 et avant ne trouvent plus le serveur.` };
      }),
      timed(async () => {
        const s = await stripeChecks(stripe, cfg, { db, webhook: webhookState() });
        const bad = s.checks.filter((x) => x.level === 'error').length;
        const warn = s.checks.filter((x) => x.level === 'warn').length;
        return { id: 'stripe', group: 'Stripe', label: `Paiements (mode ${s.mode || 'non configuré'})`, level: bad ? 'error' : warn ? 'warn' : 'ok',
          text: bad ? `${bad} point${bad > 1 ? 's' : ''} à corriger : détail plus bas.` : s.checks.map((x) => x.label).join(', ') + ' : OK.', stripe: s };
      }),
      timed(async () => {
        if (!cfg.mailEnabled) return { id: 'mail', group: 'Resend', label: 'E-mails', level: cfg.prod ? 'error' : 'warn', text: 'RESEND_API_KEY manque (ou MAIL_FROM est l’exemple) : les e-mails sont écrits dans les logs au lieu de partir.' };
        const res = await fetchImpl('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${cfg.resendApiKey}` }, signal: AbortSignal.timeout(5000) });
        if (res.status === 401 || res.status === 403) {
          const body = await res.json().catch(() => ({}));
          // A key limited to sending can't list the domains: that is the safest setup.
          if (/restricted/i.test(body?.name || body?.message || '')) return { id: 'mail', group: 'Resend', label: 'E-mails', level: 'ok', text: `Clé d’envoi seulement, expéditeur ${cfg.mailFrom}.` };
          return { id: 'mail', group: 'Resend', label: 'E-mails', level: 'error', text: 'Resend refuse la clé RESEND_API_KEY.' };
        }
        const domains = res.ok ? (await res.json()).data || [] : [];
        const bad = domains.filter((d) => d.status !== 'verified');
        return { id: 'mail', group: 'Resend', label: 'E-mails', level: bad.length ? 'warn' : 'ok',
          text: domains.length ? domains.map((d) => `${d.name} : ${d.status === 'verified' ? 'vérifié' : d.status}`).join(', ') : `Expéditeur ${cfg.mailFrom}.` };
      }),
      timed(async () => {
        if (!discord) return { id: 'discord', group: 'Discord', label: 'Rôle Pro', level: 'warn', text: `Bot non configuré : ${discordSetupMissing(cfg).join(', ')}.`, discord: { missing: discordSetupMissing(cfg) } };
        const d = await discord.checks();
        const bad = d.checks.filter((x) => x.level === 'error').length;
        return { id: 'discord', group: 'Discord', label: 'Rôle Pro', level: bad ? 'error' : 'ok', text: bad ? d.checks.filter((x) => x.level === 'error').map((x) => `${x.label} : ${x.text}`).join(' ') : 'Bot, serveur et rôle OK.', discord: d };
      }),
      timed(async () => {
        if (!community) return { id: 'community', group: 'Discord', label: 'Bot communauté', level: 'off', text: 'Éteint (DISCORD_COMMUNITY n’est pas à 1 sur ce serveur).' };
        const checks = community.checks();
        const bad = checks.filter((x) => x.level === 'error').length;
        return { id: 'community', group: 'Discord', label: 'Bot communauté', level: bad ? 'error' : 'ok', text: bad ? checks.filter((x) => x.level === 'error').map((x) => `${x.label} : ${x.text}`).join(' ') : 'Connecté.', community: { checks, inviteUrl: discord?.inviteUrl } };
      }),
      timed(async () => {
        const g = geo.state();
        return { id: 'geo', group: 'DB-IP', label: 'Villes des tests réseau', level: !g.on ? 'off' : g.loaded ? 'ok' : g.error ? 'error' : 'warn',
          text: !g.on ? 'Désactivé (GEOIP=off).' : g.loaded ? `Base DB-IP de ${g.month}.` : g.error || 'En chargement.' };
      }),
    ]);
    return { at: Date.now(), list: list.filter((x) => x && x.id), warnings: cfg.warnings };
  }

  // On a real server, read Stripe and check the services a few seconds after start, so the first visit is quick.
  if (pass && cfg.databaseUrl) {
    setTimeout(() => { sales.read().catch(() => {}); refreshServices(); }, 5000).unref?.();
  }

  // ---------- pages ----------
  const nav = { cfg, staging: cfg.staging, mode: stripeMode(cfg) };
  const stripeDashboard = () => `https://dashboard.stripe.com${stripeMode(cfg) === 'test' ? '/test' : ''}`;

  app.get('/admin', async (c) => {
    if (!isAdmin(c)) return shell(c, AV.loginPage(cfg));
    const fresh = c.req.query('frais') === '1';
    const [k, s, sv, recentUsers, recentEvents] = await Promise.all([
      counts(), sales.read({ fresh }), servicesSoon(fresh),
      db.all(`SELECT u.id, u.email, u.display_name, u.avatar_key, u.created_at, u.banned_at, l.plan, l.status, l.status_reason, l.cancel_at_period_end
        FROM users u ${LATEST_LICENSE} ORDER BY u.created_at DESC LIMIT 6`),
      db.all(`SELECT a.*, COALESCE(u.email, lu.email, l.email) AS email, COALESCE(a.user_id, l.user_id) AS owner FROM audit a
        LEFT JOIN users u ON u.id = a.user_id LEFT JOIN licenses l ON l.id = a.license_id LEFT JOIN users lu ON lu.id = l.user_id
        ORDER BY a.id DESC LIMIT 30`),
    ]);
    return view(c, AV.overviewPage, { counts: k, sales: s, services: sv, recentUsers, recentEvents, dashboard: stripeDashboard() });
  });

  const listQuery = (c) => ({
    q: String(c.req.query('q') || '').slice(0, 120),
    filtre: USER_FILTERS.includes(c.req.query('filtre')) ? c.req.query('filtre') : 'tous',
    tri: Object.hasOwn(AV.SORT_LABEL, c.req.query('tri') || '') ? c.req.query('tri') : 'recents',
  });
  app.get('/admin/utilisateurs', async (c) => {
    const { q, filtre, tri } = listQuery(c);
    const page = Math.max(1, Math.min(10000, Number(c.req.query('page')) || 1));
    const [list, facets] = await Promise.all([userList({ q, filtre, tri, page }), userFacets(q)]);
    // An exact email, key, or Stripe customer / subscription id with one result opens that player.
    if (q && list.total === 1 && page === 1 && (EMAIL.test(q.trim()) || /^[A-Z0-9]{4,}(-[A-Z0-9]{4,})+$/i.test(q.trim()) || /^(cus|sub)_\w+$/.test(q.trim()))) return c.redirect(`/admin/utilisateurs/${list.rows[0].id}`, 303);
    return view(c, AV.usersPage, { ...list, q, filtre, tri, facets, notice: c.req.query('n') });
  });
  // The list as a spreadsheet, with the same search, filter and order.
  app.get('/admin/utilisateurs.csv', async (c) => {
    const { q, filtre, tri } = listQuery(c);
    const { rows } = await userList({ q, filtre, tri, page: 1, limit: 50000 });
    const iso = (ms) => (ms ? new Date(Number(ms)).toISOString() : '');
    const cell = (v) => {
      const str = v == null ? '' : String(v);
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str; // no formulas when opened in a spreadsheet
      return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const head = ['email', 'nom', 'inscrit', 'premium', 'etat', 'jusqu_au', 'resilie', 'banni', 'discord', 'vu_dans_app', 'id'];
    const lines = rows.map((u) => [u.email, u.display_name, iso(u.created_at), u.lic_id ? u.plan : '', u.lic_id ? u.status : '',
      u.status === 'active' && u.plan !== 'lifetime' ? iso(u.current_period_end) : '', u.cancel_at_period_end ? 'oui' : '', u.banned_at ? 'oui' : '',
      u.discord_name, iso(u.last_seen), u.id].map(cell).join(','));
    await audit(db, 'admin.users_export', { detail: { rows: rows.length, filtre, q: q || null } });
    return c.body(`﻿${[head.join(','), ...lines].join('\n')}\n`, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rago-joueurs-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
  });

  const renderUser = async (c, id, extra = {}, status = 200) => {
    const d = await userDetail(id);
    if (!d) return view(c, AV.notFoundPage, 'Ce compte n’existe pas (ou plus).', 404);
    return view(c, AV.userPage, { ...d, notice: c.req.query('n'), ...extra, stripeDashboard: stripeDashboard() }, status);
  };
  app.get('/admin/utilisateurs/:id', (c) => renderUser(c, c.req.param('id')));

  const back = (c, id, code) => c.redirect(`/admin/utilisateurs/${id}?n=${code}`, 303);
  const form = async (c) => Object.fromEntries(Object.entries(await c.req.parseBody()).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : '']));
  const ownLicense = async (userId, licenseId) => {
    const lic = licenseId && await L.getLicense(db, licenseId);
    return lic && lic.user_id === userId ? lic : null;
  };
  const syncDiscord = (userId) => discord?.syncUser(userId, { force: true }).catch((err) => log.error?.('[discord] admin sync', err.message));
  const failUser = (c, id, error) => renderUser(c, id, { error }, 400);

  // Every action on one player: POST /admin/utilisateurs/<id>/<action>.
  const ACTIONS = {
    // Premium time: a reward license, or more time on it; a Stripe subscriber's next payments are skipped instead.
    async temps(c, user, b) {
      const amount = Math.floor(Number(b.nombre));
      const unit = b.unite === 'mois' ? 'months' : 'days';
      if (!(amount >= 1 && amount <= (unit === 'days' ? 3650 : 120))) return failUser(c, user.id, 'Nombre de jours (1 à 3650) ou de mois (1 à 120).');
      let r;
      try {
        r = await L.givePremiumTime(db, stripe, user.id, { [unit]: amount, source: 'grant' });
      } catch (err) {
        log.error?.('[admin] premium time', err.message);
        return failUser(c, user.id, `Stripe a refusé de décaler les paiements : ${err.message}`);
      }
      await audit(db, 'admin.premium_time', { userId: user.id, licenseId: r.license?.id, detail: { [unit]: amount, action: r.action } });
      await syncDiscord(user.id);
      return back(c, user.id, r.action === 'lifetime' ? 'deja-vie' : r.action === 'subscription' ? 'temps-abo' : 'temps');
    },
    async vie(c, user, b) {
      const active = await db.get("SELECT * FROM licenses WHERE user_id = ? AND status = 'active'", [user.id]);
      if (active?.plan === 'lifetime') return back(c, user.id, 'deja-vie');
      if (active && active.plan !== 'reward') return failUser(c, user.id, `Ce compte a déjà une licence active (${active.plan === 'month' ? 'abonnement mensuel' : active.plan === 'year' ? 'abonnement annuel' : active.plan}). Résilie-la d’abord pour offrir Premium à vie.`);
      // A reward license in the way stops: the license for life replaces it on the same PC.
      if (active) {
        const dev = await L.getDevice(db, active.id);
        await L.setLicenseStatus(db, active.id, 'revoked', 'replaced');
        const { license } = await L.grantLicense(db, user.email, b.note || 'admin');
        if (dev) await db.run('UPDATE devices SET license_id = ? WHERE license_id = ?', [license.id, active.id]);
      } else await L.grantLicense(db, user.email, b.note || 'admin');
      await audit(db, 'admin.lifetime_given', { userId: user.id, detail: { note: b.note || null } });
      await syncDiscord(user.id);
      return back(c, user.id, 'vie');
    },
    async revoquer(c, user, b) {
      const lic = await ownLicense(user.id, b.licence);
      if (!lic) return failUser(c, user.id, 'Licence introuvable sur ce compte.');
      await L.setLicenseStatus(db, lic.id, 'revoked', b.raison || 'manual');
      await audit(db, 'admin.license_revoked', { userId: user.id, licenseId: lic.id, detail: { reason: b.raison || 'manual' } });
      await syncDiscord(user.id);
      return back(c, user.id, 'revoquee');
    },
    async retablir(c, user, b) {
      const lic = await ownLicense(user.id, b.licence);
      if (!lic) return failUser(c, user.id, 'Licence introuvable sur ce compte.');
      if (L.isBanned(user)) return failUser(c, user.id, 'Ce compte est banni : lève le bannissement d’abord.');
      const other = await db.get("SELECT id FROM licenses WHERE user_id = ? AND status = 'active' AND id <> ?", [user.id, lic.id]);
      if (other) return failUser(c, user.id, 'Ce compte a déjà une autre licence active : révoque-la d’abord.');
      await L.setLicenseStatus(db, lic.id, 'active', null);
      await audit(db, 'admin.license_restored', { userId: user.id, licenseId: lic.id });
      await syncDiscord(user.id);
      return back(c, user.id, 'retablie');
    },
    async 'liberer-pc'(c, user, b) {
      const lic = await ownLicense(user.id, b.licence);
      if (!lic) return failUser(c, user.id, 'Licence introuvable sur ce compte.');
      await L.resetDevice(db, lic.id, 'admin');
      return back(c, user.id, 'pc');
    },
    // Links shown once on the page, never in the address: the person sends them to the player by hand.
    async 'lien-mdp'(c, user) {
      const url = `${cfg.publicUrl}/reset/${await L.createPasswordReset(db, user.id)}`;
      await audit(db, 'admin.reset_link', { userId: user.id });
      return renderUser(c, user.id, { link: { label: 'Lien pour choisir un nouveau mot de passe (1 heure), à envoyer à ce joueur seulement', url } });
    },
    async rattacher(c, user, b) {
      try {
        const attached = await L.claimLicense(db, b.licence, user.id);
        if (attached.status === 'active' && attached.plan === 'lifetime' && stripe) await stopReplacedSubscriptions(db, stripe, user.id, log, attached.id);
      } catch (err) {
        const why = { already_claimed: 'cette licence est déjà sur un autre compte', already_has_license: 'ce compte a déjà une licence active (achat en double ? rembourse-le dans Stripe, puis révoque celle en trop)', not_found: 'aucune licence avec cet identifiant' }[err.code];
        if (!why) throw err;
        return failUser(c, user.id, `Pas rattachée : ${why}.`);
      }
      await audit(db, 'admin.license_attached', { userId: user.id, licenseId: b.licence });
      await syncDiscord(user.id);
      return back(c, user.id, 'rattachee');
    },
    // The subscription in Stripe: stop the renewal (Premium until the paid date), undo that, or stop it now.
    async resilier(c, user, b) {
      const lic = await ownLicense(user.id, b.licence);
      if (!lic?.stripe_subscription_id) return failUser(c, user.id, 'Pas d’abonnement Stripe sur cette licence.');
      if (!stripe) return failUser(c, user.id, 'Stripe n’est pas configuré.');
      const now = b.quand === 'maintenant';
      try {
        const sub = now ? await stripe.subscriptions.cancel(lic.stripe_subscription_id)
          : await stripe.subscriptions.update(lic.stripe_subscription_id, { cancel_at_period_end: b.quand !== 'reprendre' });
        await L.syncSubscription(db, sub);
      } catch (err) {
        return failUser(c, user.id, `Stripe a refusé : ${err.message}`);
      }
      await audit(db, `admin.subscription_${now ? 'canceled_now' : b.quand === 'reprendre' ? 'resumed' : 'canceled'}`, { userId: user.id, licenseId: lic.id });
      await syncDiscord(user.id);
      return back(c, user.id, now ? 'abo-arrete' : b.quand === 'reprendre' ? 'abo-repris' : 'abo-resilie');
    },
    async bannir(c, user, b) {
      if (L.isBanned(user)) return back(c, user.id, 'banni');
      const revoked = await L.banUser(db, user.id, b.raison || null);
      const stopped = [];
      for (const l of revoked) {
        if (!l.stripe_subscription_id || !['month', 'year'].includes(l.plan) || !stripe) continue;
        try { await stripe.subscriptions.cancel(l.stripe_subscription_id); stopped.push(l.stripe_subscription_id); } catch (err) { log.error?.('[admin] ban: subscription', err.message); }
      }
      await audit(db, 'admin.user_banned', { userId: user.id, detail: { reason: b.raison || null, subscriptions_canceled: stopped } });
      await syncDiscord(user.id);
      return back(c, user.id, 'banni');
    },
    async debannir(c, user) {
      // Licenses come back if still valid: for life, a gift not over yet, a subscription still running in Stripe.
      const keep = async (l) => {
        if (l.plan === 'lifetime') return true;
        if (l.plan === 'reward') return Number(l.current_period_end) > Date.now();
        if (!l.stripe_subscription_id || !stripe) return false;
        try { return ['active', 'trialing'].includes((await stripe.subscriptions.retrieve(l.stripe_subscription_id)).status); } catch { return false; }
      };
      const kept = [];
      for (const l of await db.all("SELECT * FROM licenses WHERE user_id = ? AND status = 'revoked' AND status_reason = 'banned'", [user.id])) if (await keep(l)) kept.push(l.id);
      const back2 = await L.unbanUser(db, user.id, (l) => kept.includes(l.id));
      await audit(db, 'admin.user_unbanned', { userId: user.id, detail: { restored: back2.map((l) => l.id) } });
      await syncDiscord(user.id);
      return back(c, user.id, back2.length ? 'debanni-licence' : 'debanni');
    },
    async 'discord-sync'(c, user) {
      if (!discord) return failUser(c, user.id, 'Le bot Discord n’est pas configuré sur ce serveur.');
      await discord.checkRewards(user.id, { minAge: 0 }).catch(() => {});
      await discord.syncUser(user.id, { force: true });
      return back(c, user.id, 'discord');
    },
    async 'discord-delier'(c, user) {
      if (!discord) {
        await db.run('DELETE FROM discord_links WHERE user_id = ?', [user.id]);
      } else {
        try { await discord.unlink(user.id); } catch (err) {
          if (!(err instanceof DiscordError)) throw err;
          return failUser(c, user.id, `Discord a refusé : ${err.message}`);
        }
      }
      await audit(db, 'admin.discord_unlinked', { userId: user.id });
      return back(c, user.id, 'discord-delie');
    },
    async avis(c, user, b) {
      if (!(await R.setReviewStatus(db, user.id, b.statut === 'masquer' ? 'hidden' : 'published'))) return failUser(c, user.id, 'Pas d’avis sur ce compte.');
      await audit(db, `admin.review_${b.statut === 'masquer' ? 'hidden' : 'shown'}`, { userId: user.id });
      onPopupChange?.('reviews');
      return back(c, user.id, b.statut === 'masquer' ? 'avis-masque' : 'avis-affiche');
    },
    async photo(c, user) {
      try { await P.removeAvatar(db, avatars, user.id); } catch (err) { return failUser(c, user.id, `Photo non supprimée : ${err.message}`); }
      await audit(db, 'admin.photo_removed', { userId: user.id });
      return back(c, user.id, 'photo');
    },
    async nom(c, user, b) {
      try { await P.setName(db, user.id, b.nom || ''); } catch (err) {
        if (!(err instanceof P.ProfileError)) throw err;
        return failUser(c, user.id, 'Nom refusé : 2 à 32 lettres, chiffres, espaces et _ . \' -, sans e-mail ni lien.');
      }
      await audit(db, 'admin.name_changed', { userId: user.id });
      onPopupChange?.('reviews');
      return back(c, user.id, 'nom');
    },
    async affilie(c, user) {
      await A.evaluateAffiliate(db, cfg, user.id, { stripe, log });
      return back(c, user.id, 'affilie');
    },
    async supprimer(c, user, b) {
      if ((b.confirmation || '').toLowerCase() !== user.email) return failUser(c, user.id, 'Pour supprimer, recopie exactement l’e-mail du compte.');
      try {
        const out = await deleteAccount(db, { stripe, avatars, discord, log }, user.email);
        await audit(db, 'admin.user_deleted', { detail: { licenses: out?.licenses.length || 0, subscriptions_canceled: out?.canceled.length || 0 } });
      } catch (err) {
        return failUser(c, user.id, `Suppression impossible : ${err.message}`);
      }
      onPopupChange?.('reviews');
      return c.redirect('/admin/utilisateurs?n=supprime', 303);
    },
  };
  app.post('/admin/utilisateurs/:id/:action', async (c) => {
    const act = ACTIONS[c.req.param('action')];
    if (!act) return c.notFound();
    const user = await L.getUser(db, c.req.param('id'));
    if (!user) return view(c, AV.notFoundPage, 'Ce compte n’existe pas (ou plus).', 404);
    return act(c, user, await form(c));
  });

  // ---------- purchases nobody holds yet, and Premium for an email ----------
  const waiting = () => db.all(`SELECT l.*, (SELECT u.id FROM users u WHERE u.email = l.email) AS account_id FROM licenses l
    WHERE l.user_id IS NULL AND l.status = 'active' AND l.email NOT LIKE 'deleted-%' ORDER BY l.created_at DESC LIMIT 200`);
  app.get('/admin/achats', async (c) => view(c, AV.purchasesPage, { rows: await waiting(), notice: c.req.query('n') }));
  app.post('/admin/achats/:id/lien', async (c) => {
    const lic = await L.getLicense(db, c.req.param('id'));
    if (!lic || lic.user_id) return c.redirect('/admin/achats?n=deja', 303);
    const url = `${cfg.publicUrl}/claim/${await L.newClaimToken(db, lic.id)}`;
    await audit(db, 'admin.claim_link', { licenseId: lic.id });
    return view(c, AV.purchasesPage, { rows: await waiting(), link: { label: `Lien pour ${lic.email} : créer son compte ou se connecter, la licence suit (l’ancien lien ne marche plus)`, url } });
  });
  // Premium for one or several emails, with or without an account (like grant / grant-days / grant-months).
  app.post('/admin/offrir', async (c) => {
    const b = await form(c);
    const emails = [...new Set(String(b.emails || '').toLowerCase().split(/[\s,;]+/).filter(Boolean))].slice(0, 200);
    const amount = Math.floor(Number(b.nombre));
    const unit = b.unite === 'vie' ? null : b.unite === 'mois' ? 'months' : 'days';
    if (!emails.length || (unit && !(amount >= 1 && amount <= (unit === 'days' ? 3650 : 120)))) {
      return view(c, AV.purchasesPage, { rows: await waiting(), error: 'Mets au moins un e-mail, et un nombre de jours (1 à 3650) ou de mois (1 à 120).' }, 400);
    }
    const results = [];
    for (const to of emails) {
      if (!EMAIL.test(to)) { results.push({ email: to, text: 'pas un e-mail, ignoré' }); continue; }
      const user = await L.findUserByEmail(db, to);
      const owned = user && await L.current(db, await L.licenseForUser(db, user.id));
      if (owned?.status === 'active') { results.push({ email: to, userId: user.id, text: `déjà Premium (${AV.PLAN[owned.plan] || owned.plan}), rien donné` }); continue; }
      const pending = (await L.unclaimedLicenses(db, to)).find((l) => l.status === 'active');
      if (pending) { results.push({ email: to, text: 'une licence attend déjà cet e-mail (voir la liste), rien donné' }); continue; }
      const { license, claimToken } = await L.grantLicense(db, to, `admin ${unit ? `${amount} ${unit}` : 'vie'}${b.note ? ` : ${b.note}` : ''}`, unit ? { [unit]: amount } : {});
      await audit(db, 'admin.premium_given', { licenseId: license.id, userId: user?.id, detail: { email: to, [unit || 'lifetime']: unit ? amount : true } });
      if (user) await syncDiscord(user.id);
      results.push({ email: to, userId: user?.id, ok: true, text: unit ? `Premium jusqu’au ${AV.day(license.current_period_end)}` : 'Premium à vie',
        url: claimToken ? `${cfg.publicUrl}/claim/${claimToken}` : null });
    }
    return view(c, AV.purchasesPage, { rows: await waiting(), results });
  });

  // ---------- sales, services, journal ----------
  app.get('/admin/ventes', async (c) => {
    const etat = Object.hasOwn(AV.SALE_FILTERS, c.req.query('etat') || '') ? c.req.query('etat') : 'tous';
    const page = Math.max(1, Math.min(100, Number(c.req.query('page')) || 1));
    const [s, k] = await Promise.all([sales.read({ fresh: c.req.query('frais') === '1' }), counts()]);
    return view(c, AV.salesPage, { sales: s, counts: k, dashboard: stripeDashboard(), etat, page, per: 50 });
  });
  app.get('/admin/services', async (c) => view(c, AV.servicesPage, {
    services: await services({ fresh: c.req.query('frais') === '1' }), notice: c.req.query('n'), count: Number(c.req.query('count')) || 0 }));

  const JOURNAL_TYPES = { tout: null, admin: 'admin.%', achats: 'license.%', comptes: 'user.%', pc: 'device.%', abonnements: 'subscription.%', affiliation: 'affiliate.%' };
  app.get('/admin/journal', async (c) => {
    const type = Object.hasOwn(JOURNAL_TYPES, c.req.query('type')) ? c.req.query('type') : 'tout';
    const before = Number(c.req.query('avant')) || null;
    const like = JOURNAL_TYPES[type];
    const where = [like ? 'a.type LIKE ?' : null, before ? 'a.id < ?' : null].filter(Boolean);
    const rows = await db.all(`SELECT a.*, u.email, COALESCE(lu.email, l.email) AS license_email, COALESCE(a.user_id, l.user_id) AS owner
      FROM audit a LEFT JOIN users u ON u.id = a.user_id LEFT JOIN licenses l ON l.id = a.license_id LEFT JOIN users lu ON lu.id = l.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY a.id DESC LIMIT 100`, [like, before].filter((v) => v != null));
    return view(c, AV.journalPage, { rows, type, types: Object.keys(JOURNAL_TYPES), before });
  });

  // ---------- the site: discount pop-up, promotion codes, reviews (the Stripe checks are on Services) ----------
  const sitePage = async (c, extra = {}, status = 200) => {
    const [state, reviews] = await Promise.all([Promo.popupState(db, stripe, cfg),
      db.all(`SELECT r.*, u.email, u.display_name, u.avatar_key, u.id AS uid FROM reviews r JOIN users u ON u.id = r.user_id ORDER BY r.updated_at DESC LIMIT 100`)]);
    return view(c, AV.sitePage, { state, reviews, notice: c.req.query('n'), code: c.req.query('code'), ...extra }, status);
  };
  app.get('/admin/site', (c) => sitePage(c));
  app.post('/admin/popup', async (c) => {
    const body = await c.req.parseBody();
    const input = { enabled: body.enabled === 'on' };
    for (const k of ['code', 'percent', 'limit', 'eyebrow', 'title', 'text']) input[k] = String(body[k] ?? '');
    try {
      const out = await Promo.savePopup(db, stripe, input);
      onPopupChange?.('popup');
      await audit(db, 'admin.popup', { detail: { ...out.settings, created: out.created } });
      return c.redirect(`/admin/site?n=${out.created ? 'created' : 'saved'}`, 303);
    } catch (err) {
      if (!(err instanceof Promo.PopupError)) throw err;
      return sitePage(c, { error: err.message, values: input }, 400);
    }
  });
  app.post('/admin/code-promo', async (c) => {
    const b = await form(c);
    const code = String(b.code || '').toUpperCase();
    const pct = Number(b.pourcent);
    const duration = b.duree === 'forever' ? 'forever' : 'once';
    if (!/^[A-Z0-9-]{2,40}$/.test(code) || !(pct > 0 && pct < 100)) return sitePage(c, { promoError: 'Code : 2 à 40 lettres, chiffres ou tirets. Réduction : entre 1 et 99 %.' }, 400);
    if (!stripe) return sitePage(c, { promoError: 'Stripe n’est pas configuré.' }, 400);
    try {
      if (await findPromotionCode(stripe, code)) return sitePage(c, { promoError: `${code} existe déjà dans Stripe.` }, 400);
      const coupon = await ensureCoupon(stripe, `rago-promo-${pct}-${duration}`, pct, duration, `${pct}% off`);
      const promo = await stripe.promotionCodes.create({ promotion: { type: 'coupon', coupon }, code, restrictions: { first_time_transaction: true } });
      await audit(db, 'admin.promo_code', { detail: { code, percent: pct, duration, id: promo.id } });
    } catch (err) {
      return sitePage(c, { promoError: `Stripe a refusé : ${err.message}` }, 400);
    }
    return c.redirect(`/admin/site?n=code&code=${encodeURIComponent(code)}`, 303);
  });
  app.post('/admin/test-licenses', async (c) => {
    const ended = await endTestLicenses(db, cfg);
    await audit(db, 'admin.test_licenses_ended', { detail: { count: ended } });
    discord?.syncAll(); // their Discord role goes too
    // Services shows the Stripe checks: read them again so the page no longer lists these licenses.
    await servicesRun?.catch(() => {});
    await refreshServices();
    return c.redirect(`/admin/services?n=test-ended&count=${ended}`, 303);
  });

  // ---------- the app's network tests (RAG-50) ----------
  app.get('/admin/reseau', async (c) => {
    const days = [30, 90, 365].includes(Number(c.req.query('jours'))) ? Number(c.req.query('jours')) : 90;
    return view(c, AV.networkPage, { summary: await N.networkSummary(db, { days }), geo: geo.state() });
  });
  app.get('/admin/reseau.csv', async (c) => c.body(await N.networkCsv(db), 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="rago-tests-reseau-${new Date().toISOString().slice(0, 10)}.csv"`,
  }));

  return { sales, services };
}
