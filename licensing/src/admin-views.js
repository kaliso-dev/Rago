// Pages of the /admin dashboard (admin.js), redone 2026-11-10 to look and work like a product: a side menu,
// cards, tables, charts. In French: only Sofiene uses it. Own stylesheet and script (public/admin.css, admin.js),
// strict CSP: no inline style or script, so bar heights are classes (h-0 … h-100) and charts are HTML or SVG.
import { html, raw } from './views.js';
import { parisDay } from './sales.js';

const TZ = 'Europe/Paris';
export const DAY = 86400000;
const ASSETS = '20261110c'; // bumped when admin.css / admin.js change, so browsers don't keep the old ones

// ---------- formatting ----------
const fmt = (o) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, ...o });
const fDay = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' });
const fWhen = fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fShort = fmt({ day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fTime = fmt({ hour: '2-digit', minute: '2-digit' });
const fLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
const fMonthLong = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const day = (ms) => (ms ? fDay.format(new Date(Number(ms))) : '–');
export const when = (ms) => (ms ? fWhen.format(new Date(Number(ms))) : '–');
const short = (ms) => (ms ? fShort.format(new Date(Number(ms))) : '–');
const num = (v) => new Intl.NumberFormat('fr-FR').format(Number(v) || 0);
const plural = (n, one, many = `${one}s`) => `${num(n)} ${Number(n) > 1 ? many : one}`;
const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);
export function money(cents, cur = 'usd') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: String(cur || 'usd').toUpperCase() }).format((Number(cents) || 0) / 100);
}
/** { usd: 1234, eur: 500 } as "12,34 $US + 5,00 €", main currency first. */
export function moneyMap(map, main = 'usd') {
  const keys = Object.keys(map || {}).filter((k) => map[k]).sort((a, b) => (a === main ? -1 : b === main ? 1 : a.localeCompare(b)));
  return keys.length ? keys.map((k) => money(map[k], k)).join(' + ') : money(0, main);
}
const moneyAxis = (cents, cur) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: String(cur || 'usd').toUpperCase(), maximumFractionDigits: 0, notation: 'compact' }).format(cents / 100);
function ago(ms, now = Date.now()) {
  if (!ms) return 'jamais';
  const s = Math.round((now - Number(ms)) / 1000);
  if (s < 0) {
    const d = Math.ceil(-s / 86400);
    return -s < 86400 ? `dans ${Math.max(1, Math.round(-s / 3600))} h` : `dans ${d} j`;
  }
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  if (s < 45 * 86400) return `il y a ${Math.round(s / 86400)} j`;
  return `le ${day(ms)}`;
}
const rel = (ms) => (ms ? html`<time datetime="${new Date(Number(ms)).toISOString()}" title="${when(ms)}">${ago(ms)}</time>` : html`<span class="dim">–</span>`);
const dash = html`<span class="dim">–</span>`;

export const PLAN = { month: 'Mensuel', year: 'Annuel', lifetime: 'À vie', reward: 'Offert' };
export const REASON = {
  refunded: 'remboursée', disputed: 'litige bancaire', manual: 'à la main', subscription_ended: 'abonnement terminé', replaced: 'remplacée par un autre achat',
  banned: 'compte banni', deleted: 'compte supprimé', affiliate_fraud: 'fraude à l’affiliation', test_purchase: 'achat de test', test_mode: 'achat de test',
};
const SOURCE = { stripe: 'Stripe', grant: 'Offerte par l’équipe', affiliate: 'Récompense d’affiliation', discord: 'Récompense Discord' };

// ---------- icons (16 px, stroked) ----------
const ic = (d, cls = 'ic') => html`<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const I = {
  home: ic('M2.5 3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1zM8.5 3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1zM2.5 9.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1zM8.5 9.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z'),
  sales: ic('M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5'),
  users: ic('M6 7.5a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6zM1.8 13.5c.4-2.3 2.1-3.6 4.2-3.6s3.8 1.3 4.2 3.6M10.6 3a2.2 2.2 0 0 1 0 4.4M12.2 9.9c1.2.4 1.9 1.6 2.1 3.6'),
  gift: ic('M2.5 5.5h11v2.5h-11zM3.5 8v5.5h9V8M8 5.5v8M8 5.5C7.2 3 4.8 2.8 4.8 4.3S8 5.5 8 5.5zm0 0c.8-2.5 3.2-2.7 3.2-1.2S8 5.5 8 5.5z'),
  globe: ic('M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM1.5 8h13M8 1.5c1.8 1.8 2.7 4 2.7 6.5S9.8 12.7 8 14.5C6.2 12.7 5.3 10.5 5.3 8S6.2 3.3 8 1.5z'),
  wifi: ic('M1.8 6.2a9 9 0 0 1 12.4 0M4 8.6a5.8 5.8 0 0 1 8 0M6.2 11a2.6 2.6 0 0 1 3.6 0M8 13.4v.1'),
  pulse: ic('M1.5 8h3l1.8-4.5 3.4 9 1.8-4.5h3'),
  list: ic('M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01'),
  search: ic('M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10.6 10.6l3.4 3.4'),
  menu: ic('M2.5 4.5h11M2.5 8h11M2.5 11.5h11'),
  refresh: ic('M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3'),
  external: ic('M9.5 2.5h4v4M13.5 2.5L7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3'),
  logout: ic('M6 13.5H3.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1H6M10.5 11l3-3-3-3M13.5 8H6'),
  x: ic('M4 4l8 8M12 4l-8 8'),
  right: ic('M6 3.5L10.5 8 6 12.5'),
  left: ic('M10 3.5L5.5 8 10 12.5'),
  up: ic('M4.5 11.5l7-7M5.5 4.5h6v6'),
  down: ic('M4.5 4.5l7 7M11.5 5.5v6h-6'),
  check: ic('M3.5 8.5l3 3 6-7'),
  alert: ic('M8 2.2l6 10.6a.8.8 0 0 1-.7 1.2H2.7a.8.8 0 0 1-.7-1.2zM8 6.5v3M8 11.6v.1'),
  info: ic('M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 7.5v4M8 5v.1'),
  copy: ic('M6 5.5h6a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 12 13.5H7A1.5 1.5 0 0 1 5.5 12V6M3.5 10V4A1.5 1.5 0 0 1 5 2.5h5'),
  pc: ic('M3 2.8h10a1.5 1.5 0 0 1 1.5 1.5v5.4a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V4.3A1.5 1.5 0 0 1 3 2.8zM5.5 14h5M8 11.2V14'),
  card: ic('M2.5 4h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM1.5 6.8h13'),
  inbox: ic('M1.5 9l2-6h9l2 6v4.5h-13zM1.5 9h4l1 2h3l1-2h4'),
  clock: ic('M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 4.5V8l2.5 1.5'),
  key: ic('M10 9.5a3.5 3.5 0 1 0-3.3-2.3L2.5 11.4v2.1h2.1v-1.4H6v-1.4h1.4l1-1a3.5 3.5 0 0 0 1.6.4zM11 5h.01'),
  chat: ic('M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5v-2.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z'),
  star: ic('M8 1.9l1.9 4 4.4.5-3.3 3.1.9 4.4L8 11.7l-3.9 2.2.9-4.4-3.3-3.1 4.4-.5z'),
  shield: ic('M8 1.8l5 2v4c0 3.2-2.1 5.4-5 6.4-2.9-1-5-3.2-5-6.4v-4z'),
  trash: ic('M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9'),
  download: ic('M8 2.5v7.5m0 0L4.8 6.8M8 10l3.2-3.2M3 13.2h10'),
  mail: ic('M2.5 4h11v8h-11zM2.5 4.5L8 9l5.5-4.5'),
  link: ic('M6.8 9.2a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 0 0-4-4l-.9.9M9.2 6.8a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 0 0 4 4l.9-.9'),
  tag: ic('M2.5 2.5h5l6 6-5 5-6-6zM5.5 5.5h.01'),
  user: ic('M8 7.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM2.8 14c.5-2.8 2.6-4.3 5.2-4.3s4.7 1.5 5.2 4.3'),
  stack: ic('M8 2l6 3-6 3-6-3zM2 8l6 3 6-3M2 11l6 3 6-3'),
  brain: ic('M8 9.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4zM3.2 4.6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM12.8 5.4a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM4 13.6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM12.4 13a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM7 7.3L4.1 4.3M9.1 7.3l2.8-2.6M7.1 8.9l-2.3 2.8M9 8.8l2.5 2.4M4.3 3.6l7.4.9'),
};
// The Rago mark (public/mark.svg), inline so it needs no extra request.
const MARK = html`<svg viewBox="0 0 164 180" aria-hidden="true"><path d="M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z" fill="#FF3B30"/></svg>`;

// ---------- small components ----------
const pill = (kind, text) => html`<span class="pill ${kind}"><i></i>${text}</span>`;
const LEVEL = { ok: ['ok', 'OK'], warn: ['warn', 'À vérifier'], error: ['err', 'En panne'], off: ['off', 'Éteint'] };
const CHECK = { ok: ['ok', 'OK'], warn: ['warn', 'À vérifier'], error: ['err', 'À corriger'] };
const levelPill = (lv) => pill(LEVEL[lv]?.[0] || 'off', LEVEL[lv]?.[1] || lv);

/** A player's Premium as a pill, from their latest license row (users list) or a license. */
function premiumPill(l, bannedAt) {
  if (bannedAt) return pill('err', 'Banni');
  if (!l || !l.status) return pill('off', 'Gratuit');
  if (l.status !== 'active') return pill('off', `Gratuit · ${REASON[l.status_reason] || 'révoquée'}`);
  if (l.cancel_at_period_end) return pill('warn', `${PLAN[l.plan] || l.plan} · résilié`);
  return pill({ lifetime: 'info', reward: 'violet' }[l.plan] || 'ok', PLAN[l.plan] || l.plan);
}

function av(u, size = 32) {
  const label = u?.display_name || u?.email || '?';
  const initial = [...label.trim()][0]?.toUpperCase() || '?';
  const hue = [...String(u?.email || label)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 6;
  const sz = size === 32 ? '' : ` av-${size}`;
  return u?.avatar_key
    ? html`<img class="av${sz}" src="/avatars/${u.avatar_key}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`
    : html`<span class="av${sz} c${hue}" aria-hidden="true">${initial}</span>`;
}
const who = (u, href, sub) => html`<a class="who" href="${href}">${av(u)}<span class="who-t"><b>${u.email}</b>${sub ? html`<span>${sub}</span>` : ''}</span></a>`;
const userHref = (id) => `/admin/utilisateurs/${id}`;

const alertBox = (msg, kind = 'err') => (msg ? html`<div class="alert ${kind}" role="${kind === 'err' ? 'alert' : 'status'}">${kind === 'err' ? I.alert : kind === 'ok' ? I.check : kind === 'warn' ? I.alert : I.info}<div>${msg}</div></div>` : '');
const toast = (msg) => (msg ? html`<div class="toasts" aria-live="polite"><div class="toast" role="status">${I.check}<p>${msg}</p><button class="x" type="button" data-dismiss aria-label="Fermer">${I.x}</button></div></div>` : '');
const secret = (link) => (link ? html`<div class="secret" role="status"><b>${link.label}</b>
    <div class="secret-row"><code>${link.url}</code><button class="btn btn-sm" type="button" data-copy="${link.url}" data-copied="Lien copié.">${I.copy}Copier</button></div>
    <p class="hint">Affiché une seule fois : il n’est gardé nulle part en clair.</p></div>` : '');
const empty = (text, { icon = I.inbox, title = '', small = false } = {}) => html`<div class="empty${small ? ' sm' : ''}">${icon}${title ? html`<b>${title}</b>` : ''}<p>${text}</p></div>`;
const hidden = (name, value) => html`<input type="hidden" name="${name}" value="${value}">`;
const actionForm = (action, label, { fields = '', confirm = '', kind = '', busy = 'En cours…', icon = '' } = {}) => html`<form method="post" action="${action}" class="inline" data-busy="${busy}" ${confirm ? html`data-confirm="${confirm}"` : ''}>${fields}<button class="btn btn-sm${kind ? ` btn-${kind}` : ''}" type="submit">${icon}${label}</button></form>`;
const copyBtn = (text, label = 'Copier', copied = 'Copié.') => html`<button class="btn btn-ghost btn-sm btn-icon" type="button" data-copy="${text}" data-copied="${copied}" aria-label="${label}" title="${label}">${I.copy}</button>`;

function card({ title, icon = '', actions = '', sub = '', body, foot = '', flush = false, cls = '', id = '' }) {
  return html`<section class="card${cls ? ` ${cls}` : ''}"${id ? html` id="${id}"` : ''}>
    ${title ? html`<div class="card-h"><h2>${icon}${title}</h2>${actions ? html`<div class="row">${actions}</div>` : ''}${sub ? html`<p>${sub}</p>` : ''}</div>` : ''}
    <div class="card-b${flush ? ' flush' : ''}">${body}</div>
    ${foot ? html`<div class="card-f">${foot}</div>` : ''}
  </section>`;
}
const more = (href, text) => html`<a class="more" href="${href}">${text}${I.right}</a>`;

function head({ crumbs = [], title, sub = '', actions = '' }) {
  return html`<header class="head"><div class="head-t">
      ${crumbs.length ? html`<nav class="crumbs" aria-label="Fil d’Ariane">${crumbs.map(([label, href], i) => html`${i ? I.right : ''}${href ? html`<a href="${href}">${label}</a>` : html`<span>${label}</span>`}`)}</nav>` : ''}
      <h1>${title}</h1>${sub ? html`<p class="head-sub">${sub}</p>` : ''}</div>
    ${actions ? html`<div class="head-a">${actions}</div>` : ''}</header>`;
}

// Change in percent, as a green or red chip. `before` 0: nothing to compare.
function delta(now, before, title) {
  if (!before) return now ? html`<span class="delta up" title="${title}">${I.up}nouveau</span>` : '';
  const p = Math.round(((now - before) / before) * 100);
  const cls = p > 0 ? 'up' : p < 0 ? 'down' : 'flat';
  // past +999 %, "× 57" reads better than "+5 607 %"
  const text = p >= 1000 ? `× ${num(Math.round(now / before))}` : `${p > 0 ? '+' : ''}${num(p)} %`;
  return html`<span class="delta ${cls}" title="${title}">${p > 0 ? I.up : p < 0 ? I.down : ''}${text}</span>`;
}
let sparkId = 0;
function spark(values) {
  if (values.length < 2) return '';
  const max = Math.max(1, ...values);
  const W = 100; const H = 30;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(2)} ${(H - (v / max) * (H - 4) - 2).toFixed(2)}`);
  const line = `M${pts.join('L')}`;
  const id = `sf${++sparkId}`;
  return html`<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="f0"/><stop offset="1" class="f1"/></linearGradient></defs>
    <path class="a" d="${line}L${W} ${H}L0 ${H}Z" fill="url(#${id})"/><path class="l" d="${line}"/></svg>`;
}
function kpi({ label, icon = '', value, sub = '', chart = '', href = '' }) {
  const inner = html`<p class="l">${icon}${label}</p><p class="v">${value}</p>${sub ? html`<p class="s">${sub}</p>` : ''}${chart}`;
  return href ? html`<a class="kpi" href="${href}">${inner}</a>` : html`<div class="kpi">${inner}</div>`;
}
const facts = (list) => html`<div class="facts-wrap"><dl class="facts">${list.filter(Boolean).map(([dt, dd, small]) => html`<div><dt>${dt}</dt><dd>${dd}${small ? html`<small>${small}</small>` : ''}</dd></div>`)}</dl></div>`;
const kv = (list, cls = '') => html`<dl class="kv${cls ? ` ${cls}` : ''}">${list.filter(Boolean).map(([dt, dd, wide]) => html`<div${wide ? html` class="wide"` : ''}><dt>${dt}</dt><dd>${dd}</dd></div>`)}</dl>`;

// A bar chart in HTML (the bars' heights are classes), with a tooltip per bar.
function niceMax(v) {
  if (v <= 0) return 0;
  const e = 10 ** Math.floor(Math.log10(v));
  const f = v / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}
function barChart(points, { cur, label, few = false }) {
  const top = niceMax(Math.max(0, ...points.map((p) => p.amount)));
  return html`<figure class="chart" role="img" aria-label="${label}">
    <div class="chart-y" aria-hidden="true"><span>${top ? moneyAxis(top, cur) : ''}</span><span>${top ? moneyAxis(top / 2, cur) : ''}</span><span>0</span></div>
    <div class="chart-plot"><ol class="bars${few ? ' few' : ''}">${points.map((p) => {
      const h = top && p.amount > 0 ? Math.max(2, Math.round((p.amount / top) * 100)) : 0;
      return html`<li class="bar${p.amount > 0 ? '' : ' zero'}${p.now ? ' now' : ''}"><span class="f h-${h}"></span>
        <span class="tip"><b>${p.title}</b><span>${money(p.amount, cur)} · ${plural(p.count, 'paiement')}</span></span>${p.x ? html`<span class="xl">${p.x}</span>` : ''}</li>`;
    })}</ol></div>
  </figure>`;
}
const dayLabel = (d) => `${d.slice(8)}/${d.slice(5, 7)}`;
function daysChart(s) {
  const n = s.days.length;
  return barChart(s.days.map((d, i) => ({ amount: d.amount, count: d.count, now: i === n - 1, title: i === n - 1 ? `Aujourd’hui (${dayLabel(d.day)})` : fLong.format(new Date(`${d.day}T12:00:00Z`)),
    x: i === n - 1 ? 'Auj.' : (n - 1 - i) % 7 === 0 ? dayLabel(d.day) : '' })), { cur: s.currency, label: `Encaissé par jour sur 30 jours, en ${s.currency.toUpperCase()}. Plus haut : ${money(Math.max(0, ...s.days.map((d) => d.amount)), s.currency)}.` });
}
function monthsChart(s) {
  const n = s.months.length;
  return barChart(s.months.map((m, i) => {
    const date = new Date(`${m.month}-15T12:00:00Z`);
    return { amount: m.amount, count: m.count, now: i === n - 1, title: fMonthLong.format(date), x: fMonth.format(date).replace('.', '') };
  }), { cur: s.currency, label: `Encaissé par mois sur 12 mois, en ${s.currency.toUpperCase()}.`, few: true });
}

// ---------- the page around every screen ----------
const NAV = [
  ['Pilotage', [['accueil', '/admin', 'Vue d’ensemble', I.home], ['ventes', '/admin/ventes', 'Ventes', I.sales]]],
  ['Joueurs', [['joueurs', '/admin/utilisateurs', 'Joueurs', I.users], ['achats', '/admin/achats', 'Offrir et achats', I.gift]]],
  ['Produit', [['site', '/admin/site', 'Site et promos', I.globe], ['reseau', '/admin/reseau', 'Tests réseau', I.wifi]]],
  ['Système', [['services', '/admin/services', 'Services', I.pulse], ['journal', '/admin/journal', 'Journal', I.list]]],
  ['Projet', [['cerveau', '/admin/cerveau', 'Cerveau', I.brain]]],
];
const isProd = (nav) => nav.cfg.envName === 'production';

function sideNav(nav, current) {
  const badge = (k) => {
    if (k === 'joueurs' && nav.users != null) return html`<span class="side-n">${num(nav.users)}</span>`;
    if (k === 'achats' && nav.unclaimed) return html`<span class="side-n alert" title="Achats payés sans compte">${num(nav.unclaimed)}</span>`;
    if (k === 'services' && nav.health && nav.health !== 'ok') return html`<span class="side-dot ${nav.health}" title="${nav.health === 'error' ? 'Un service est en panne' : 'Un service est à vérifier'}"></span>`;
    return '';
  };
  return html`<aside class="side" aria-label="Menu">
    <div class="side-head"><a class="logo" href="/admin">${MARK}<span>Rago</span><small>Admin</small></a>
      <label class="btn btn-ghost btn-sm btn-icon side-close" for="nav-t" aria-label="Fermer le menu">${I.x}</label></div>
    <form class="side-search" method="get" action="/admin/utilisateurs" role="search">${I.search}
      <input id="q-global" name="q" type="search" placeholder="Chercher un joueur" autocomplete="off" spellcheck="false" aria-label="Chercher un joueur : e-mail, nom, clé de licence, cus_…, sub_… ou pseudo Discord"><kbd aria-hidden="true">/</kbd></form>
    <nav class="side-nav" aria-label="Pages">${NAV.map(([group, items]) => html`<p class="side-label">${group}</p>${items.map(([k, href, label, icon]) => html`<a href="${href}" ${k === current ? html`aria-current="page"` : ''}>${icon}<span>${label}</span>${badge(k)}</a>`)}`)}</nav>
    <div class="side-foot">
      <div class="side-env">${isProd(nav) ? pill('ok', 'Production') : pill('warn', `Test · ${nav.cfg.envName}`)}${pill(nav.mode === 'live' ? 'ok' : nav.mode ? 'warn' : 'off', `Stripe ${nav.mode || 'off'}`)}</div>
      <div class="side-links"><a href="${nav.cfg.siteUrl}/" rel="noopener">${I.external}Voir le site</a>
        <form method="post" action="/admin/logout"><button type="submit">${I.logout}Quitter</button></form></div>
    </div>
  </aside>`;
}

function doc({ title, body, bodyClass = '' }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#070708">
<meta name="robots" content="noindex, nofollow">
<title>${html`${String(title)}`} · Rago Admin</title>
<link rel="icon" href="/assets/favicon.svg?v=3" type="image/svg+xml">
<link rel="icon" href="/assets/favicon-32.png?v=3" type="image/png" sizes="32x32">
<link rel="preload" href="/assets/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/GeistMono-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/tokens.css">
<link rel="stylesheet" href="/assets/admin.css?v=${ASSETS}">
<script src="/assets/admin.js?v=${ASSETS}" defer></script>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${body}
</body>
</html>`;
}

function shell(nav, current, title, body, { notice = '', path = '' } = {}) {
  const envNote = isProd(nav) ? '' : html`<p class="env-note" role="note">${I.info}<span>Serveur ${nav.staging ? 'de test' : 'de développement'} « ${nav.cfg.envName} »${nav.mode === 'live' ? '' : ' : Stripe en mode test, ces ventes et abonnements ne sont pas les vrais'}. Les vrais chiffres sont sur l’admin de production.</span></p>`;
  return doc({ title, body: html`<input type="checkbox" id="nav-t" class="nav-t" tabindex="-1" aria-hidden="true">
${sideNav(nav, current)}
<label class="scrim" for="nav-t" aria-hidden="true"></label>
<div class="main">
  <header class="mbar"><label class="btn btn-ghost btn-icon" for="nav-t" aria-label="Ouvrir le menu" role="button" tabindex="0">${I.menu}</label>
    <a class="logo" href="/admin">${MARK}<span>Rago</span><small>Admin</small></a>
    <a class="btn btn-ghost btn-icon" href="/admin/utilisateurs" aria-label="Chercher un joueur">${I.search}</a></header>
  <main class="content" id="main"${path ? html` data-path="${path}"` : ''}>${envNote}${body}</main>
</div>
${toast(notice)}` });
}

// ---------- sign in, not found ----------
export function loginPage(cfg, { error } = {}) {
  return doc({ title: 'Connexion', body: html`<main class="login"><div class="login-card">
    <a class="logo" href="${cfg.siteUrl}/">${MARK}<span>Rago</span><small>Admin</small></a>
    <div><h1>Tableau de bord</h1><p>Entre la clé ADMIN_KEY (variables Railway) pour ouvrir l’admin : joueurs, ventes, services, tests réseau et site.</p></div>
    ${alertBox(error)}
    <form method="post" action="/admin/login" class="form" data-busy="Vérification…">
      <div class="fld"><label for="f-key">Clé admin</label>
        <div class="pw"><input class="in" id="f-key" name="key" type="password" autocomplete="current-password" required autofocus spellcheck="false">
          <button type="button" data-reveal aria-controls="f-key" aria-pressed="false">Afficher</button></div></div>
      <button class="btn btn-primary btn-block" type="submit">Entrer</button>
    </form>
    <p class="foot">Accès réservé. Chaque connexion, et chaque mauvaise clé, est notée dans le journal.</p>
  </div></main>` });
}

export const notFoundPage = (nav, text) => shell(nav, 'joueurs', 'Introuvable', html`${head({ crumbs: [['Joueurs', '/admin/utilisateurs']], title: 'Introuvable' })}
  ${card({ body: empty(text, { icon: I.search, title: 'Rien à cette adresse' }), foot: more('/admin/utilisateurs', 'Retour aux joueurs') })}`);

// ---------- events (journal, history, activity) ----------
const EVENT = {
  'user.created': 'Compte créé', 'user.oauth_linked': 'Connexion Google/Discord liée', 'user.banned': 'Compte banni', 'user.unbanned': 'Bannissement levé',
  'license.granted': 'Licence offerte', 'license.claimed': 'Achat rattaché au compte', 'license.active': 'Licence active', 'license.revoked': 'Licence révoquée',
  'license.claim_link': 'Lien de réclamation créé', 'license.reward_extended': 'Temps Premium ajouté', 'license.reward_replaced': 'Récompense remplacée par un achat',
  'license.subscription_replaced': 'Abonnement remplacé par Lifetime', 'license.created': 'Achat', 'device.bound': 'PC activé', 'device.reset': 'PC libéré', 'device.blocked': 'Activation refusée (autre PC)',
  download: 'Téléchargement', 'subscription.canceled_in_app': 'Résilié depuis l’app', 'subscription.resumed_in_app': 'Repris depuis l’app',
  'admin.login': 'Connexion à l’admin', 'admin.login_failed': 'Mauvaise clé admin', 'admin.popup': 'Pop-up modifiée', 'admin.premium_time': 'Temps Premium offert (admin)',
  'admin.premium_given': 'Premium offert à un e-mail (admin)', 'admin.lifetime_given': 'Premium à vie offert (admin)', 'admin.license_revoked': 'Licence révoquée (admin)',
  'admin.license_restored': 'Licence rétablie (admin)', 'admin.reset_link': 'Lien de mot de passe créé (admin)', 'admin.license_attached': 'Achat rattaché (admin)',
  'admin.subscription_canceled': 'Abonnement résilié en fin de période (admin)', 'admin.subscription_canceled_now': 'Abonnement arrêté tout de suite (admin)',
  'admin.subscription_resumed': 'Abonnement repris (admin)', 'admin.user_banned': 'Compte banni (admin)', 'admin.user_unbanned': 'Bannissement levé (admin)',
  'admin.discord_unlinked': 'Discord délié (admin)', 'admin.review_hidden': 'Avis masqué (admin)', 'admin.review_shown': 'Avis affiché (admin)', 'admin.photo_removed': 'Photo retirée (admin)',
  'admin.name_changed': 'Nom public changé (admin)', 'admin.user_deleted': 'Compte supprimé (admin)', 'admin.claim_link': 'Lien de réclamation créé (admin)',
  'admin.promo_code': 'Code promo créé (admin)', 'admin.test_licenses_ended': 'Licences de test arrêtées (admin)', 'admin.users_export': 'Liste des joueurs exportée (admin)',
};
const eventLabel = (t) => EVENT[t] || t;
const eventKind = (t) => (t.startsWith('admin.') ? 'e-admin' : t.startsWith('license.') ? 'e-license' : t.startsWith('user.') ? 'e-user'
  : t.startsWith('subscription.') ? 'e-sub' : t.startsWith('affiliate.') ? 'e-aff' : 'e-device');
const DETAIL_KEY = {
  reason: 'raison', days: 'jours', months: 'mois', email: 'e-mail', note: 'note', ip: 'IP', source: 'source', action: 'effet', plan: 'offre', count: 'nombre',
  code: 'code', percent: '%', duration: 'durée', lifetime: 'à vie', restored: 'rétablies', licenses: 'licences', subscriptions_canceled: 'abonnements arrêtés',
  created: 'créé', name: 'nom', device: 'PC', amount: 'montant', enabled: 'affichée',
};
const DETAIL_VALUE = { grant: 'offerte', stripe: 'Stripe', subscription: 'paiements décalés', reward: 'temps offert', manual: 'à la main', true: 'oui' };
function eventDetail(detail) {
  if (!detail) return '';
  try {
    const d = JSON.parse(detail);
    return Object.entries(d).filter(([, v]) => v != null && v !== '' && v !== false && v !== 0 && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => `${DETAIL_KEY[k] || k} : ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : DETAIL_VALUE[String(v)] || v}`).join(' · ').slice(0, 240);
  } catch { return String(detail).slice(0, 240); }
}
/** The activity as a feed: a dot by kind, what happened, who, when. */
function feed(rows, { withUser = true } = {}) {
  if (!rows.length) return empty('Rien pour l’instant.', { small: true });
  return html`<ul class="feed">${rows.map((e) => {
    const owner = e.owner || e.user_id;
    const email = e.email || e.license_email;
    const detail = eventDetail(e.detail);
    return html`<li><span class="dot ${eventKind(e.type)}"></span><p>${eventLabel(e.type)}${withUser && email ? html` · ${owner ? html`<a href="${userHref(owner)}">${email}</a>` : html`<span class="dim">${email}</span>`}` : ''}
      ${detail ? html`<span class="meta">${detail}</span>` : ''}</p><time datetime="${new Date(Number(e.at)).toISOString()}" title="${when(e.at)}">${Date.now() - Number(e.at) < DAY ? fTime.format(new Date(Number(e.at))) : short(e.at)}</time></li>`;
  })}</ul>`;
}

// ---------- overview ----------
function todoList(items) {
  if (!items.length) return html`<div class="allgood"><span class="tag">${I.check}</span><p>Rien à traiter : pas de panne, pas d’achat en attente, pas de paiement raté.</p></div>`;
  return html`<ul class="todo">${items.map((t) => html`<li><span class="tag ${t.kind || ''}">${t.icon}</span><p>${t.title}<span>${t.text}</span></p>${t.href ? html`<a class="btn btn-sm" href="${t.href}" ${t.external ? html`rel="noopener"` : ''}>${t.action}</a>` : ''}</li>`)}</ul>`;
}
function premiumMix(k) {
  const parts = [['Mensuels', k.lic.month, 'k1'], ['Annuels', k.lic.year, 'k2'], ['À vie (achetés)', k.lic.lifetime, 'k3'], ['Offerts', k.lic.gifted, 'k4']];
  const total = parts.reduce((s, [, n]) => s + n, 0);
  return html`${total ? html`<div class="split-bar" role="img" aria-label="${parts.map(([l, n]) => `${l} : ${n}`).join(', ')}">${parts.filter(([, n]) => n).map(([, n, k]) => html`<span class="${k} w-${Math.max(1, pct(n, total))}"></span>`)}</div>` : ''}
    <ul class="key">${parts.map(([label, n, k]) => html`<li><span><i class="${k}"></i>${label}</span><span><b>${num(n)}</b><em>${pct(n, total)} %</em></span></li>`)}</ul>
    <dl class="lines"><div><dt>Essais gratuits en cours</dt><dd class="num">${num(k.trials)}</dd></div>
      <div><dt>Résiliés (Premium jusqu’à la fin)</dt><dd class="num">${num(k.lic.canceling)}</dd></div>
      <div><dt>Comptes avec Premium</dt><dd class="num">${pct(k.lic.active, k.users.n)} %</dd></div></dl>`;
}
function salesRows(rows, { dashboard, compact = false } = {}) {
  if (!rows.length) return empty('Aucun paiement pour l’instant.', { icon: I.card, small: compact });
  return html`<div class="tw"><table class="t${compact ? ' compact' : ''}">
    <thead><tr><th scope="col">Client</th>${compact ? '' : html`<th scope="col" class="hide-sm">Type</th>`}<th scope="col">État</th><th scope="col" class="r">Montant</th><th scope="col" class="r${compact ? ' hide-sm' : ''}">Date</th>${dashboard && !compact ? html`<th scope="col" class="w1"><span class="sr-only">Stripe</span></th>` : ''}</tr></thead>
    <tbody>${rows.map((x) => html`<tr ${x.email ? html`data-href="/admin/utilisateurs?q=${encodeURIComponent(x.email)}"` : ''}>
      <th scope="row" class="clip">${x.email ? html`<a href="/admin/utilisateurs?q=${encodeURIComponent(x.email)}">${x.email}</a>` : html`<span class="dim">${x.customer || 'Sans e-mail'}</span>`}</th>
      ${compact ? '' : html`<td class="hide-sm muted">${x.kind === 'abonnement' ? 'Abonnement' : 'Paiement unique'}</td>`}
      <td>${x.failed ? pill('err', 'Échoué') : x.disputed ? pill('err', 'Litige') : x.refunded >= x.amount ? pill('off', 'Remboursé')
        : x.refunded ? pill('warn', `Remb. ${money(x.refunded, x.currency)}`) : pill('ok', 'Payé')}</td>
      <td class="r num">${money(x.amount, x.currency)}</td>
      <td class="r num muted${compact ? ' hide-sm' : ''}" title="${when(x.at)}">${short(x.at)}</td>
      ${dashboard && !compact ? html`<td class="w1"><a class="btn btn-ghost btn-sm" href="${dashboard}/payments/${x.id}" rel="noopener" aria-label="Ouvrir dans Stripe">Stripe${I.external}</a></td>` : ''}
    </tr>`)}</tbody></table></div>`;
}
function servicesGrid(list, { compact = false } = {}) {
  if (!list) return empty('Vérification des services en cours… Recharge dans quelques secondes.', { icon: I.clock, small: true });
  return html`<div class="svc-wrap"><ul class="svc${compact ? ' compact' : ''}">${list.map((x) => html`<li><span class="st ${x.level}" title="${LEVEL[x.level]?.[1] || x.level}"></span>
    <div>${compact ? '' : html`<small>${x.group}</small>`}<b>${compact ? `${x.group} · ${x.label}` : x.label}</b>${compact ? '' : html`<p>${x.text}</p>`}</div>
    ${x.ms != null && !compact ? html`<span class="ms">${x.ms} ms</span>` : compact ? html`<span class="sr-only">${LEVEL[x.level]?.[1]}</span>` : ''}</li>`)}</ul></div>`;
}
const scrollFill = (body) => html`<div class="scroll-fill"><div class="sf">${body}</div></div>`;
const stamp = (at, what) => html`<span class="stamp"><i></i>${what} ${ago(at)}</span>`;

export function overviewPage(nav, { counts: k, sales: s, services: sv, recentUsers, recentEvents, dashboard }) {
  const ok = s && !s.error;
  const p = ok ? s.periods : null;
  const cur = ok ? s.currency : 'usd';
  const main = (period) => period?.net?.[cur] || 0;
  const sub = ok ? s.subscriptions : null;
  const list = sv?.list || null;
  const down = (list || []).filter((x) => x.level === 'error');
  const testLicenses = list?.find((x) => x.id === 'stripe')?.stripe?.testLicenses || 0;
  const todo = [
    down.length && { icon: I.alert, title: `${plural(down.length, 'service')} en panne`, text: down.map((x) => `${x.group} · ${x.label}`).join(', '), href: '/admin/services', action: 'Voir' },
    k.unclaimed && { icon: I.gift, kind: 'warn', title: `${plural(k.unclaimed, 'achat payé', 'achats payés')} sans compte`, text: 'Le joueur n’a pas encore créé son compte : renvoie-lui un lien.', href: '/admin/achats', action: 'Voir' },
    ok && s.failed && { icon: I.card, kind: 'warn', title: `${plural(s.failed, 'paiement raté', 'paiements ratés')} cette semaine`, text: 'Carte refusée ou 3-D Secure abandonné.', href: '/admin/ventes?etat=echoues', action: 'Voir' },
    sub?.pastDue && { icon: I.clock, kind: 'warn', title: `${plural(sub.pastDue, 'abonnement impayé', 'abonnements impayés')}`, text: 'Stripe réessaie la carte ; Premium reste tant que l’abonnement n’est pas arrêté.', href: `${dashboard}/subscriptions?status=past_due`, action: 'Stripe', external: true },
    testLicenses && { icon: I.info, kind: 'info', title: `${plural(testLicenses, 'licence de test active', 'licences de test actives')}`, text: 'Achats faits en mode test qui donnent encore Premium.', href: '/admin/services#stripe', action: 'Gérer' },
    sv?.warnings?.length && { icon: I.info, kind: 'info', title: `${plural(sv.warnings.length, 'avertissement')} au démarrage`, text: 'Variables Railway à vérifier.', href: '/admin/services', action: 'Voir' },
  ].filter(Boolean);

  const body = html`
    ${head({ title: 'Vue d’ensemble', sub: 'Tout Rago au même endroit : ventes Stripe, joueurs, services et activité.',
      actions: html`${ok ? stamp(s.at, 'Ventes lues') : ''}<a class="btn btn-sm" href="/admin?frais=1">${I.refresh}Actualiser</a>` })}
    ${s?.error ? alertBox(s.error) : s?.stale ? alertBox(`Stripe n’a pas répondu (${s.stale}) : chiffres de ${ago(s.at)}.`, 'warn') : ''}
    <div class="kpis">
      ${kpi({ label: 'Encaissé aujourd’hui', icon: I.card, href: '/admin/ventes', value: ok ? moneyMap(p.today.net, cur) : '–',
        sub: ok ? html`${plural(p.today.count, 'paiement')} ${delta(main(p.today), main(p.yesterdaySoFar), 'Comparé à hier à la même heure')}` : '' })}
      ${kpi({ label: 'Ce mois-ci', icon: I.sales, href: '/admin/ventes', value: ok ? moneyMap(p.month.net, cur) : '–',
        sub: ok ? html`${plural(p.month.count, 'paiement')} ${delta(main(p.month), main(p.lastMonthSoFar), 'Comparé au mois dernier à la même date')}` : '',
        chart: ok ? spark(s.days.map((d) => d.amount)) : '' })}
      ${kpi({ label: 'Revenu mensuel récurrent', icon: I.refresh, href: '/admin/ventes#abonnements', value: sub ? moneyMap(sub.mrr, cur) : '–',
        sub: sub ? `${plural(sub.active, 'abonnement actif', 'abonnements actifs')}${sub.trialing ? ` · ${num(sub.trialing)} en essai` : ''}` : 'Abonnements Stripe illisibles' })}
      ${kpi({ label: 'Joueurs Premium', icon: I.users, href: '/admin/utilisateurs?filtre=premium', value: num(k.lic.active),
        sub: html`sur ${plural(k.users.n, 'compte')} ${k.users.d7 ? html`<span class="delta up" title="Comptes créés ces 7 derniers jours">${I.up}+${num(k.users.d7)} en 7 j</span>` : ''}` })}
    </div>
    <div class="g g21 eq">
      ${card({ title: 'Ventes des 30 derniers jours', icon: I.sales, actions: more('/admin/ventes', 'Détail'),
        sub: ok ? `Encaissé par jour (heure de Paris), remboursements déduits, en ${cur.toUpperCase()}. Depuis le début : ${moneyMap(p.total.net, cur)}${s.received ? `, soit ${moneyMap(s.received.total.net, 'eur')} reçus après frais` : ''}.` : '',
        body: ok ? daysChart(s) : empty(s?.error || 'Ventes indisponibles.', { icon: I.card }) })}
      ${card({ title: 'À traiter', icon: I.inbox, body: todoList(todo), flush: true })}
    </div>
    ${card({ title: 'Joueurs et communauté', icon: I.users, actions: more('/admin/utilisateurs', 'Tous les joueurs'), flush: true, body: facts([
      ['Comptes', num(k.users.n), `+${num(k.users.d1)} en 24 h · +${num(k.users.d30)} en 30 j`],
      ['PC actifs (7 j)', num(k.devices.d7), `${num(k.devices.d1)} aujourd’hui · ${num(k.devices.n)} activés`],
      ['Discord liés', num(k.discord.n), `${num(k.discord.role)} avec le rôle Pro`],
      ['Avis', num(k.reviews?.n), k.reviews?.n ? `moyenne ${String(k.reviews.avg).replace('.', ',')} / 5${k.reviews.hidden ? ` · ${num(k.reviews.hidden)} masqué${k.reviews.hidden > 1 ? 's' : ''}` : ''}` : 'aucun pour l’instant'],
      k.net ? ['Tests réseau (7 j)', num(k.net.n), `${plural(k.net.players, 'PC')}`] : null,
      ['Bannis', num(k.users.banned), k.users.banned ? 'plus de connexion ni Premium' : 'aucun'],
    ]) })}
    <div class="g g21 eq">
      ${card({ title: 'Derniers paiements', icon: I.card, actions: more('/admin/ventes#paiements', 'Tous'), flush: true,
        body: ok ? salesRows(s.sales.slice(0, 7), { compact: true }) : empty(s?.error || '', { small: true }) })}
      ${card({ title: 'Premium', icon: I.star, actions: more('/admin/utilisateurs?filtre=premium', 'Voir'), body: premiumMix(k) })}
    </div>
    <div class="g g21">
      ${card({ title: 'Activité récente', icon: I.list, actions: more('/admin/journal', 'Journal complet'), flush: true, body: scrollFill(feed(recentEvents)) })}
      <div class="side-col">
        ${card({ title: 'Services', icon: I.pulse, actions: more('/admin/services', 'Détail'), flush: true, body: servicesGrid(list, { compact: true }) })}
        ${card({ title: 'Derniers inscrits', icon: I.user, actions: more('/admin/utilisateurs', 'Tous'), flush: true,
          body: recentUsers.length ? html`<ul class="feed">${recentUsers.map((u) => html`<li>${av(u, 24)}<p><a href="${userHref(u.id)}">${u.email}</a></p><span class="row">${premiumPill(u.status ? u : null, u.banned_at)}<time class="hide-sm" title="${when(u.created_at)}">${ago(u.created_at)}</time></span></li>`)}</ul>` : empty('Personne encore.', { small: true }) })}
      </div>
    </div>`;
  return shell(nav, 'accueil', 'Vue d’ensemble', body);
}

// ---------- players ----------
const FILTER_LABEL = { tous: 'Tous', premium: 'Premium', abonnes: 'Abonnés', essais: 'En essai', resilies: 'Résiliés', lifetime: 'À vie', offerts: 'Offerts', gratuits: 'Gratuits', bannis: 'Bannis' };
export const SORT_LABEL = { recents: 'Inscrits récemment', anciens: 'Inscrits en premier', actifs: 'Vus récemment dans l’app', fin: 'Premium qui finit bientôt', email: 'E-mail (A → Z)' };
const USERS_NOTICE = { supprime: 'Compte supprimé : abonnement arrêté, données effacées, licences gardées sans nom pour la comptabilité.' };

export function usersPage(nav, { rows, total, page, pages, per, q, filtre, tri, facets, notice }) {
  const params = (o) => new URLSearchParams(Object.entries({ q, filtre: filtre !== 'tous' ? filtre : '', tri: tri !== 'recents' ? tri : '', ...o }).filter(([, v]) => v)).toString();
  const url = (o) => `/admin/utilisateurs${params(o) ? `?${params(o)}` : ''}`;
  const from = total ? (page - 1) * per + 1 : 0;
  const body = html`
    ${head({ title: 'Joueurs', sub: 'Cherche par e-mail, nom public, clé de licence, client ou abonnement Stripe (cus_…, sub_…), pseudo ou identifiant Discord.',
      actions: html`<a class="btn btn-sm" href="/admin/utilisateurs.csv${params({}) ? `?${params({})}` : ''}">${I.download}Exporter (CSV)</a><a class="btn btn-sm btn-primary" href="/admin/achats">${I.gift}Offrir Premium</a>` })}
    <div class="card">
      <div class="card-h">
        <form method="get" action="/admin/utilisateurs" class="toolbar" role="search">
          <div class="search">${I.search}<input class="in" name="q" type="search" value="${q}" placeholder="E-mail, nom, clé, cus_…, sub_…, Discord" aria-label="Chercher un joueur" autocomplete="off" spellcheck="false"></div>
          ${filtre !== 'tous' ? hidden('filtre', filtre) : ''}
          <select class="in w-sel" name="tri" aria-label="Trier" data-autosubmit>${Object.entries(SORT_LABEL).map(([v, l]) => html`<option value="${v}" ${v === tri ? html`selected` : ''}>${l}</option>`)}</select>
          <button class="btn" type="submit">Chercher</button>
          ${q || filtre !== 'tous' || tri !== 'recents' ? html`<a class="btn btn-ghost" href="/admin/utilisateurs">Effacer</a>` : ''}
        </form>
        <nav class="chips" aria-label="Filtres">${Object.entries(FILTER_LABEL).map(([v, l]) => html`<a class="chip" href="${url({ filtre: v === 'tous' ? '' : v, page: '' })}" ${v === filtre ? html`aria-current="page"` : ''}>${l}<b>${num(facets?.[v])}</b></a>`)}</nav>
      </div>
      ${rows.length ? html`<div class="tw"><table class="t">
        <thead><tr><th scope="col">Joueur</th><th scope="col">Premium</th><th scope="col" class="hide-sm">Jusqu’au</th><th scope="col" class="hide-sm">Inscrit</th><th scope="col" class="hide-sm">Vu dans l’app</th><th scope="col" class="hide-sm">Discord</th></tr></thead>
        <tbody>${rows.map((u) => html`<tr data-href="${userHref(u.id)}">
          <th scope="row">${who(u, userHref(u.id), u.display_name || '')}</th>
          <td>${premiumPill(u.lic_id ? u : null, u.banned_at)}</td>
          <td class="hide-sm num muted">${u.status === 'active' && u.plan !== 'lifetime' ? day(u.current_period_end) : u.status === 'active' ? 'à vie' : '–'}</td>
          <td class="hide-sm muted">${rel(u.created_at)}</td>
          <td class="hide-sm muted">${u.last_seen ? rel(u.last_seen) : dash}</td>
          <td class="hide-sm muted">${u.discord_name ? `@${u.discord_name}` : dash}</td>
        </tr>`)}</tbody></table></div>` : empty(q ? `Aucun joueur ne correspond à « ${q} ».` : 'Aucun joueur dans ce filtre.', { icon: I.search, title: 'Aucun résultat' })}
      <div class="pager"><span>${total ? `${num(from)}–${num(from + rows.length - 1)} sur ${num(total)}` : '0 résultat'}</span>
        ${pages > 1 ? html`<span class="row">${page > 1 ? html`<a class="btn btn-sm" href="${url({ page: String(page - 1) })}">${I.left}Précédents</a>` : ''}
          <span>Page ${page} / ${pages}</span>${page < pages ? html`<a class="btn btn-sm" href="${url({ page: String(page + 1) })}">Suivants${I.right}</a>` : ''}</span>` : ''}</div>
    </div>`;
  return shell(nav, 'joueurs', 'Joueurs', body, { notice: USERS_NOTICE[notice] });
}

const USER_NOTICE = {
  temps: 'Temps Premium ajouté.', 'temps-abo': 'Temps Premium ajouté : ses prochains paiements Stripe sont décalés d’autant.', 'deja-vie': 'Ce compte a déjà Premium à vie : rien à ajouter.',
  vie: 'Premium à vie offert.', revoquee: 'Licence révoquée : l’app repasse en gratuit à sa prochaine vérification (au plus quelques heures).', retablie: 'Licence rétablie.',
  pc: 'PC libéré : le joueur peut activer Premium sur un autre PC.', rattachee: 'Achat rattaché à ce compte.', 'abo-resilie': 'Abonnement résilié : Premium jusqu’à la fin de la période payée, plus aucun paiement.',
  'abo-repris': 'Résiliation annulée : l’abonnement continue.', 'abo-arrete': 'Abonnement arrêté tout de suite dans Stripe (sans remboursement).',
  banni: 'Compte banni : plus de connexion (site, app), sessions fermées, licence coupée, abonnement Stripe arrêté.', debanni: 'Bannissement levé. Aucune licence n’était encore valable : offre du temps si besoin.',
  'debanni-licence': 'Bannissement levé, et sa licence encore valable est rétablie.', discord: 'Rôle Discord remis en accord avec Premium.', 'discord-delie': 'Discord délié et rôle Pro retiré.',
  'avis-masque': 'Avis masqué du site.', 'avis-affiche': 'Avis de nouveau affiché sur le site.', photo: 'Photo retirée : la première lettre du nom s’affiche à la place.', nom: 'Nom public changé.',
  affilie: 'Affiliation recalculée.',
};

function licenseBlock(l, dev, uid, dash) {
  const active = l.status === 'active';
  const sub = l.stripe_subscription_id && ['month', 'year'].includes(l.plan);
  const act = (a) => `/admin/utilisateurs/${uid}/${a}`;
  const lic = hidden('licence', l.id);
  const end = l.plan === 'lifetime' ? 'À vie' : day(l.current_period_end);
  return html`<article class="lic${active ? '' : ' off'}">
    <div class="lic-h"><div class="row">${premiumPill(l)}<span class="dim small">${SOURCE[l.source] || l.source} · ${day(l.created_at)}</span></div>
      ${active && l.plan !== 'lifetime' ? html`<span class="small muted">${l.cancel_at_period_end ? 'Se termine' : l.plan === 'reward' ? 'Offert jusqu’au' : 'Prochain paiement'} ${end}</span>` : ''}</div>
    <div class="lic-b">
      ${kv([
        ['Clé de licence', html`<span class="keyline"><span class="num">${l.key}</span>${copyBtn(l.key, 'Copier la clé', 'Clé copiée.')}</span>`, true],
        ['Offre', html`${PLAN[l.plan] || l.plan}${l.amount ? html` <span class="dim">· ${money(l.amount, l.currency)}</span>` : ''}`],
        [l.cancel_at_period_end ? 'Se termine le' : l.plan === 'lifetime' ? 'Durée' : 'Payé / offert jusqu’au', end],
        ['État', active ? 'Active' : `Révoquée (${REASON[l.status_reason] || l.status_reason || '?'})`],
        l.stripe_customer_id ? ['Stripe', html`<a href="${dash}/customers/${l.stripe_customer_id}" rel="noopener">${l.stripe_customer_id}</a>${l.stripe_subscription_id ? html`<br><a href="${dash}/subscriptions/${l.stripe_subscription_id}" rel="noopener">${l.stripe_subscription_id}</a>` : ''}`] : null,
        l.referral_code ? ['Code d’affilié utilisé', html`<span class="num">${l.referral_code}</span>`] : null,
      ])}
      ${dev ? html`<div class="pc">${I.pc}<div><b>${dev.name || 'PC sans nom'}</b><span>${dev.os || 'Windows'} · app ${dev.app_version || '?'} · vu ${ago(dev.last_seen_at)} · activé le ${day(dev.bound_at)}${dev.last_ip ? ` · IP ${dev.last_ip}` : ''}</span></div></div>`
        : html`<p class="hint">Aucun PC activé avec cette licence.</p>`}
    </div>
    <div class="lic-a">
      ${dev ? actionForm(act('liberer-pc'), 'Libérer le PC', { icon: I.pc, fields: lic, confirm: 'Libérer ce PC ? Le joueur pourra activer Premium sur un autre PC.' }) : ''}
      ${sub && active ? (l.cancel_at_period_end
        ? actionForm(act('resilier'), 'Annuler la résiliation', { fields: html`${lic}${hidden('quand', 'reprendre')}` })
        : actionForm(act('resilier'), 'Résilier en fin de période', { fields: html`${lic}${hidden('quand', 'fin')}`, confirm: 'Résilier ? Premium reste jusqu’à la fin de la période payée, puis plus aucun paiement.' })) : ''}
      ${sub && active ? actionForm(act('resilier'), 'Arrêter tout de suite', { kind: 'danger', fields: html`${lic}${hidden('quand', 'maintenant')}`, confirm: 'Arrêter l’abonnement tout de suite ? Premium s’arrête maintenant, sans remboursement (à faire dans Stripe si besoin).' }) : ''}
      ${active ? actionForm(act('revoquer'), 'Révoquer', { kind: 'danger', fields: html`${lic}<input class="in in-sm" name="raison" placeholder="Raison (facultatif)" maxlength="60" aria-label="Raison de la révocation">`, confirm: 'Révoquer cette licence ? Le joueur repasse en gratuit. Un abonnement Stripe continue d’être payé : résilie-le aussi.' })
        : actionForm(act('retablir'), 'Rétablir', { fields: lic, confirm: 'Rétablir cette licence ? Elle redonne Premium.' })}
    </div>
  </article>`;
}

export function userPage(nav, d) {
  const { user: u, licenses, devices, accountDevices, identities, discordLink: dl, rewards, review, affiliate: af, referredBy, trials, loose, events, sessions, resets, hasPassword, notice, error, link, stripeDashboard: dash } = d;
  const act = (a) => `/admin/utilisateurs/${u.id}/${a}`;
  const current = licenses[0];
  const customer = licenses.find((l) => l.stripe_customer_id)?.stripe_customer_id;
  const ways = [hasPassword ? 'mot de passe' : null, ...identities.map((i) => (i.provider === 'google' ? 'Google' : 'Discord'))].filter(Boolean);
  const body = html`
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="/admin/utilisateurs">Joueurs</a>${I.right}<span>${u.email}</span></nav>
    <section class="uhead">
      ${av(u, 56)}
      <div class="uhead-t">
        <h1>${u.email}${copyBtn(u.email, 'Copier l’e-mail', 'E-mail copié.')}</h1>
        <div class="row">${premiumPill(current, u.banned_at)}${u.display_name ? pill('line', u.display_name) : ''}${dl ? pill('line', `@${dl.discord_name || 'discord'}`) : ''}</div>
        <div class="facts-line"><span>${I.user}Inscrit le ${day(u.created_at)}</span><span>${I.key}${ways.length ? `Connexion : ${ways.join(', ')}` : 'Sans mot de passe ni Google/Discord'}</span>
          <span>${I.clock}${plural(sessions.web, 'session')} site · ${num(sessions.app)} app</span>${resets?.until ? html`<span>${I.link}Lien de mot de passe en cours</span>` : ''}</div>
      </div>
      <div class="head-a">${customer ? html`<a class="btn btn-sm" href="${dash}/customers/${customer}" rel="noopener">Stripe${I.external}</a>` : ''}
        <a class="btn btn-sm" href="mailto:${u.email}">${I.mail}Écrire</a></div>
    </section>
    ${u.banned_at ? alertBox(`Banni le ${when(u.banned_at)}${u.banned_reason ? ` : ${u.banned_reason}` : ''}. Il ne peut plus se connecter ni utiliser Premium.`) : ''}
    ${alertBox(error)}${secret(link)}
    <div class="g g21">
      <div class="side-col">
        ${card({ title: 'Premium', icon: I.star, sub: licenses.length > 1 ? `${plural(licenses.length, 'licence')} sur ce compte, la plus récente en premier.` : '',
          body: html`${licenses.length ? licenses.map((l) => licenseBlock(l, devices.find((x) => x.license_id === l.id), u.id, dash)) : empty('Aucune licence : version gratuite. Offre du temps ou Premium à vie avec les actions.', { icon: I.star, small: true })}
            ${loose.length ? html`<div class="stack"><p class="sub">Achats faits avec cet e-mail, pas encore sur le compte</p>
              <dl class="lines">${loose.map((l) => html`<div><dt><span class="num small">${l.key}</span> <span class="dim small">· ${PLAN[l.plan] || l.plan} · ${l.status === 'active' ? 'actif' : REASON[l.status_reason] || l.status} · ${day(l.created_at)}</span></dt>
                <dd>${actionForm(act('rattacher'), 'Rattacher à ce compte', { fields: hidden('licence', l.id) })}</dd></div>`)}</dl></div>` : ''}
            <details class="more-box"><summary>${I.right}Rattacher un achat payé avec un autre e-mail</summary>
              ${actionForm(act('rattacher'), 'Rattacher', { fields: html`<input class="in in-sm" name="licence" placeholder="lic_… (voir Offrir et achats)" required aria-label="Identifiant de la licence">` })}</details>` })}
        ${card({ title: 'Historique', icon: I.list, flush: true, body: scrollFill(feed(events, { withUser: false })) })}
      </div>
      <div class="side-col">
        ${card({ title: 'Gérer l’accès', icon: I.shield, flush: true, body: html`
          <div class="act"><h3>Offrir du temps Premium</h3><p>S’ajoute à la date actuelle. Pour un abonné Stripe, ses prochains paiements sont décalés d’autant.</p>
            ${actionForm(act('temps'), 'Offrir', { kind: 'primary', fields: html`<input class="in in-sm w-num" name="nombre" type="number" min="1" max="3650" value="7" required aria-label="Nombre">
              <select class="in in-sm w-sel" name="unite" aria-label="Unité"><option value="jours">jours</option><option value="mois">mois</option></select>` })}</div>
          <div class="act"><h3>Premium à vie</h3><p>Licence offerte, sans paiement. Remplace un temps offert ; pas un abonnement en cours.</p>
            ${actionForm(act('vie'), 'Offrir à vie', { fields: html`<input class="in in-sm" name="note" placeholder="Note (facultatif)" maxlength="80" aria-label="Note">`, confirm: 'Offrir Premium à vie à ce compte ?' })}</div>
          <div class="act"><h3>Mot de passe</h3><p>Un lien d’une heure, à envoyer à ce joueur seulement, quand l’e-mail n’arrive pas.</p>
            ${actionForm(act('lien-mdp'), 'Créer un lien', { icon: I.link })}</div>
          <div class="act"><h3>${u.banned_at ? 'Lever le bannissement' : 'Bannir'}</h3>
            ${u.banned_at
              ? html`<p>Sa licence revient si elle est encore valable (à vie, temps offert pas fini, abonnement encore actif dans Stripe).</p>${actionForm(act('debannir'), 'Lever le bannissement', { confirm: 'Lever le bannissement ?' })}`
              : html`<p>Plus de connexion au site ni à l’app, sessions fermées, licence coupée, abonnement Stripe arrêté (sans remboursement), rôle Discord retiré.</p>
                ${actionForm(act('bannir'), 'Bannir', { kind: 'danger', fields: html`<input class="in in-sm" name="raison" placeholder="Raison" maxlength="120" aria-label="Raison du bannissement">`, confirm: `Bannir ${u.email} ? Il ne pourra plus se connecter ni utiliser Premium.` })}`}</div>` })}
        ${card({ title: 'Essais et PC', icon: I.pc, body: html`${trials.length ? html`<dl class="lines">${trials.map((t) => html`<div><dt>Essai ${t.charged_now ? 'refusé (déjà eu un essai, payé tout de suite)' : 'gratuit'}</dt><dd class="num small">${day(t.started_at)}</dd></div>`)}</dl>` : html`<p class="hint">Aucun essai.</p>`}
          <p class="hint">${plural(accountDevices.length, 'PC vu', 'PC vus')} dans l’app avec ce compte${accountDevices.length ? `, dernier ${ago(accountDevices[0].seen_at)}` : ''}.</p>` })}
      </div>
    </div>
    <div class="g g2">
      <div class="side-col">
        ${card({ title: 'Discord', icon: I.chat, body: dl ? html`${kv([
            ['Compte', html`@${dl.discord_name || '?'}<br><span class="dim num">${dl.discord_id}</span>`],
            ['Rôle Pro', html`${dl.role ? 'Donné' : 'Pas donné'}${dl.error ? html` ${pill('err', dl.error)}` : ''}`],
            ['Lié le', day(dl.linked_at)], ['Vérifié', ago(dl.synced_at)],
          ], 'tight')}
          ${rewards.length ? html`<p class="hint">${rewards.map((r) => `${r.kind.toUpperCase()} le ${day(r.given_at)}${r.until ? ` (Premium jusqu’au ${day(r.until)})` : ''}`).join(' · ')}</p>` : ''}
          <div class="row">${actionForm(act('discord-sync'), 'Remettre le rôle à jour', { icon: I.refresh })}${actionForm(act('discord-delier'), 'Délier', { confirm: 'Délier son Discord et retirer le rôle Pro ?' })}</div>`
          : html`<p class="hint">Pas de Discord lié (il le fait depuis sa page compte).</p>` })}
        ${card({ title: 'Affiliation', icon: I.link, body: html`${af ? html`${kv([['Code', html`<span class="num">${af.code}</span>`], ['Filleuls comptés', num(af.counted)],
            ['Prochaine récompense', `${af.progress} / ${af.goal}`], ['Récompenses', `${af.rewards} × ${af.months} mois`]], 'tight')}
          ${actionForm(act('affilie'), 'Recalculer', { icon: I.refresh })}` : html`<p class="hint">Pas dans le programme d’affiliation.</p>`}
          ${referredBy ? html`<p class="hint">Venu par <a href="${userHref(referredBy.id)}">${referredBy.email}</a> (${referredBy.status}).</p>` : ''}` })}
      </div>
      ${card({ title: 'Avis et profil', icon: I.user, body: html`${review ? html`<div class="stack">
            <div class="spread"><span class="stars" aria-label="${review.rating} sur 5">${'★'.repeat(review.rating)}<s>${'★'.repeat(5 - review.rating)}</s></span>${review.status === 'published' ? pill('ok', 'Affiché sur le site') : pill('off', 'Masqué')}</div>
            <p class="quote">${review.comment}</p><p class="hint">${day(review.updated_at)}${review.app_version ? ` · app ${review.app_version}` : ''}</p>
            ${actionForm(act('avis'), review.status === 'published' ? 'Masquer l’avis' : 'Afficher l’avis', { fields: hidden('statut', review.status === 'published' ? 'masquer' : 'afficher') })}</div>` : html`<p class="hint">Pas d’avis.</p>`}
          <hr class="sep">
          ${actionForm(act('nom'), 'Changer', { fields: html`<input class="in in-sm" name="nom" value="${u.display_name || ''}" placeholder="Nom public" maxlength="32" aria-label="Nom public">` })}
          ${u.avatar_key ? actionForm(act('photo'), 'Retirer la photo', { confirm: 'Retirer sa photo de profil ?' }) : ''}` })}
    </div>
    ${card({ title: 'Supprimer le compte', icon: I.trash, cls: 'danger', body: html`<div class="zone"><p class="hint">Arrête l’abonnement Stripe, efface le compte, le PC, les sessions, la photo et l’avis. Les licences restent, sans nom, pour la comptabilité. Irréversible (RGPD).</p>
      ${actionForm(act('supprimer'), 'Supprimer définitivement', { kind: 'danger', fields: html`<input class="in in-sm" name="confirmation" placeholder="Recopie ${u.email}" required autocomplete="off" spellcheck="false" aria-label="Recopie l’e-mail du compte">`, confirm: `Supprimer définitivement ${u.email} ? Rien ne pourra être récupéré.` })}</div>` })}`;
  return shell(nav, 'joueurs', u.email, body, { notice: USER_NOTICE[notice], path: userHref(u.id) });
}

// ---------- gifts and purchases nobody holds ----------
export function purchasesPage(nav, { rows, link, results, error, notice }) {
  const body = html`
    ${head({ title: 'Offrir et achats', sub: 'Offre Premium à un ou plusieurs e-mails, avec ou sans compte. Retrouve les achats payés dont le joueur n’a pas encore créé son compte.' })}
    ${alertBox(error)}${secret(link)}
    ${results ? card({ title: 'Résultat', icon: I.check, sub: 'Les liens (création du compte) sont affichés une seule fois.', flush: true,
      body: html`<ul class="todo">${results.map((r) => html`<li><span class="tag ${r.ok ? '' : 'info'}">${r.ok ? I.check : I.info}</span>
        <p><span class="who-line">${r.userId ? html`<a href="${userHref(r.userId)}">${r.email}</a>` : r.email}</span><span class="muted small">${r.text}</span></p>
        ${r.url ? html`<div class="secret-row"><code class="codebox">${r.url}</code>${copyBtn(r.url, 'Copier le lien', 'Lien copié.')}</div>` : ''}</li>`)}</ul>` }) : ''}
    <div class="g g12">
      ${card({ title: 'Offrir Premium', icon: I.gift, body: html`<form method="post" action="/admin/offrir" class="form" data-busy="Envoi…">
          <div class="fld"><label for="f-emails">E-mails</label><textarea class="in" id="f-emails" name="emails" rows="4" required placeholder="un ou plusieurs, séparés par des espaces, virgules ou retours à la ligne" spellcheck="false"></textarea></div>
          <div class="fld"><span class="lbl">Durée</span><div class="inline"><input class="in w-num" name="nombre" type="number" min="1" max="3650" value="7" aria-label="Nombre">
            <select class="in w-sel" name="unite" aria-label="Unité"><option value="jours">jours</option><option value="mois">mois</option><option value="vie">à vie</option></select></div></div>
          <div class="fld"><label for="f-note">Note</label><input class="in" id="f-note" name="note" placeholder="facultatif : créateur, concours…" maxlength="80"></div>
          <button class="btn btn-primary" type="submit">${I.gift}Offrir</button>
          <p class="hint">Un e-mail qui a déjà Premium, ou une licence qui l’attend, n’est pas touché. Pour ajouter du temps à un joueur Premium, ouvre sa fiche.</p>
        </form>` })}
      ${card({ title: 'Pas encore sur un compte', icon: I.inbox, sub: 'Achats et cadeaux payés ou offerts, en attente que le joueur crée son compte.', flush: true,
        body: rows.length ? html`<div class="tw"><table class="t">
          <thead><tr><th scope="col">E-mail</th><th scope="col">Offre</th><th scope="col" class="hide-sm">Source</th><th scope="col" class="r">Date</th><th scope="col" class="w1"><span class="sr-only">Action</span></th></tr></thead>
          <tbody>${rows.map((l) => html`<tr><th scope="row" class="clip">${l.account_id ? html`<a href="${userHref(l.account_id)}">${l.email}</a><br><span class="dim small">a un compte : Rattacher sur sa fiche</span>` : l.email}
              <br><span class="dim small num">${l.id}</span></th>
            <td>${PLAN[l.plan] || l.plan}${l.amount ? html`<br><span class="dim small">${money(l.amount, l.currency)}</span>` : ''}</td><td class="hide-sm muted">${SOURCE[l.source] || l.source}</td><td class="r num muted">${day(l.created_at)}</td>
            <td class="w1">${actionForm(`/admin/achats/${l.id}/lien`, 'Nouveau lien', { icon: I.link, confirm: 'Créer un nouveau lien ? L’ancien ne marchera plus.' })}</td></tr>`)}</tbody></table></div>`
          : empty('Tous les achats sont sur un compte.', { icon: I.check, title: 'Rien en attente' }) })}
    </div>`;
  return shell(nav, 'achats', 'Offrir et achats', body, { notice: notice === 'deja' ? 'Cette licence est déjà sur un compte.' : '', path: '/admin/achats' });
}

// ---------- sales ----------
export const SALE_FILTERS = { tous: 'Tous', payes: 'Payés', rembourses: 'Remboursés', echoues: 'Échoués', litiges: 'Litiges' };
export function salesPage(nav, { sales: s, counts: k, dashboard, etat, page, per }) {
  if (s.error) {
    return shell(nav, 'ventes', 'Ventes', html`${head({ title: 'Ventes' })}${card({ body: empty(s.error, { icon: I.alert, title: 'Ventes indisponibles' }), foot: html`<a class="btn btn-sm" href="/admin/ventes?frais=1">${I.refresh}Réessayer</a>` })}`);
  }
  const p = s.periods;
  const cur = s.currency;
  const main = (period) => period?.net?.[cur] || 0;
  const sub = s.subscriptions;
  const match = { tous: () => true, payes: (x) => x.paid && x.refunded < x.amount && !x.disputed, rembourses: (x) => x.refunded > 0, echoues: (x) => x.failed, litiges: (x) => x.disputed }[etat];
  const filtered = s.sales.filter(match);
  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const rows = filtered.slice((page - 1) * per, page * per);
  const url = (o) => `/admin/ventes?${new URLSearchParams(Object.entries({ etat: etat !== 'tous' ? etat : '', ...o }).filter(([, v]) => v))}#paiements`;
  const kinds = [['Abonnements', s.byKind.abonnement, 'k1'], ['Paiements uniques (à vie)', s.byKind.unique, 'k3']];
  const kindTotal = kinds.reduce((t, [, x]) => t + (x.net[cur] || 0), 0);
  const body = html`
    ${head({ title: 'Ventes', sub: `Encaissé dans Stripe (mode ${nav.mode || 'non configuré'}), remboursements déduits, avant frais. Jours et mois en heure de Paris.`,
      actions: html`${stamp(s.at, 'Lu dans Stripe')}<a class="btn btn-sm" href="/admin/ventes?frais=1">${I.refresh}Actualiser</a><a class="btn btn-sm" href="${dashboard}/payments" rel="noopener">Stripe${I.external}</a>` })}
    ${s.stale ? alertBox(`Stripe n’a pas répondu (${s.stale}) : chiffres de ${ago(s.at)}.`, 'warn') : ''}
    ${s.truncated ? alertBox('Plus de 5 000 paiements : seuls les 5 000 plus récents sont comptés.', 'warn') : ''}
    <div class="kpis">
      ${kpi({ label: 'Aujourd’hui', icon: I.card, value: moneyMap(p.today.net, cur), sub: html`${plural(p.today.count, 'paiement')} ${delta(main(p.today), main(p.yesterdaySoFar), 'Comparé à hier à la même heure')}` })}
      ${kpi({ label: '7 derniers jours', icon: I.sales, value: moneyMap(p.week.net, cur), sub: html`${plural(p.week.count, 'paiement')} ${delta(main(p.week), main(p.lastWeek), 'Comparé aux 7 jours d’avant')}` })}
      ${kpi({ label: 'Ce mois-ci', icon: I.sales, value: moneyMap(p.month.net, cur), sub: html`${plural(p.month.count, 'paiement')} ${delta(main(p.month), main(p.lastMonthSoFar), 'Comparé au mois dernier à la même date')}`, chart: spark(s.days.map((d) => d.amount)) })}
      ${kpi({ label: 'Depuis le début', icon: I.stack, value: moneyMap(p.total.net, cur), sub: `${plural(p.total.count, 'paiement')} · ${moneyMap(p.total.refunded, cur)} remboursés` })}
    </div>
    <div class="g g2">
      ${card({ title: '30 derniers jours', icon: I.sales, sub: `Par jour, en ${cur.toUpperCase()}. Hier : ${moneyMap(p.yesterday.net, cur)} (${plural(p.yesterday.count, 'paiement')}).`, body: daysChart(s) })}
      ${card({ title: '12 derniers mois', icon: I.sales, sub: `Par mois, en ${cur.toUpperCase()}. Mois dernier : ${moneyMap(p.lastMonth.net, cur)} (${plural(p.lastMonth.count, 'paiement')}).`, body: monthsChart(s) })}
    </div>
    <div class="g g2">
      ${card({ title: 'Reçu sur le compte Stripe', icon: I.download, sub: 'Après les frais Stripe, dans la devise du compte.', body: s.received ? html`<dl class="lines">
          <div><dt>Aujourd’hui</dt><dd class="num">${moneyMap(s.received.today.net, 'eur')}</dd></div>
          <div><dt>Ce mois-ci</dt><dd class="num">${moneyMap(s.received.month.net, 'eur')}</dd></div>
          <div><dt>Depuis le début</dt><dd class="num">${moneyMap(s.received.total.net, 'eur')}</dd></div>
          <div><dt>Frais Stripe (total)</dt><dd class="num muted">${moneyMap(s.received.total.fee, 'eur')}</dd></div></dl>`
        : html`<p class="hint">Solde Stripe illisible avec cette clé (une clé restreinte doit pouvoir lire Balance).</p>` })}
      ${card({ title: 'Par type', icon: I.stack, sub: 'Abonnements et paiements uniques, depuis le début.', body: html`${kindTotal ? html`<div class="split-bar">${kinds.filter(([, x]) => x.net[cur]).map(([, x, kc]) => html`<span class="${kc} w-${Math.max(1, pct(x.net[cur] || 0, kindTotal))}"></span>`)}</div>` : ''}
        <ul class="key">${kinds.map(([label, x, kc]) => html`<li><span><i class="${kc}"></i>${label}</span><span><b>${moneyMap(x.net, cur)}</b><em>${plural(x.count, 'paiement')}</em></span></li>`)}</ul>
        <dl class="lines">
          <div><dt>Panier moyen</dt><dd class="num">${p.total.count ? money(Math.round((p.total.gross?.[cur] || 0) / p.total.count), cur) : '–'}</dd></div>
          <div><dt>Remboursé</dt><dd class="num">${moneyMap(p.total.refunded, cur)}</dd></div>
          <div><dt>Paiements ratés (7 jours)</dt><dd class="num">${s.failed ? html`<a href="${url({ etat: 'echoues' })}">${num(s.failed)}</a>` : '0'}</dd></div></dl>` })}
    </div>
    ${sub ? html`<section class="card" id="abonnements"><div class="card-h"><h2>${I.refresh}Abonnements</h2><div class="row"><a class="more" href="${dashboard}/subscriptions" rel="noopener">Stripe${I.external}</a></div></div>
      ${facts([
        ['Revenu mensuel récurrent', moneyMap(sub.mrr, cur), 'abonnements actifs non résiliés, ramenés au mois'],
        ['Sur un an', moneyMap(Object.fromEntries(Object.entries(sub.mrr).map(([c, v]) => [c, v * 12])), cur), 'revenu mensuel × 12'],
        ['Actifs', num(sub.active), `${num(k.lic.month)} mensuels · ${num(k.lic.year)} annuels dans la base`],
        ['En essai', num(sub.trialing)], ['Impayés', num(sub.pastDue), sub.pastDue ? 'Stripe réessaie la carte' : ''], ['Résiliés', num(sub.canceling), 'Premium jusqu’à la fin de la période'],
      ])}
      ${sub.renewals.length ? html`<div class="card-b"><p class="sub">Renouvellements des 7 prochains jours</p></div><div class="tw"><table class="t compact">
        <thead><tr><th scope="col">Quand</th><th scope="col">Offre</th><th scope="col" class="w1"><span class="sr-only">Liens</span></th></tr></thead>
        <tbody>${sub.renewals.map((r) => html`<tr data-href="/admin/utilisateurs?q=${r.id}"><th scope="row"><a href="/admin/utilisateurs?q=${r.id}">${day(r.at)}</a> <span class="dim small">${ago(r.at)}</span></th>
          <td class="muted">${r.interval === 'year' ? 'Annuel' : r.interval === 'month' ? 'Mensuel' : '–'}</td>
          <td class="w1"><a class="btn btn-ghost btn-sm" href="${dashboard}/subscriptions/${r.id}" rel="noopener">Stripe${I.external}</a></td></tr>`)}</tbody></table></div>` : html`<div class="card-b"><p class="hint">Aucun renouvellement ces 7 prochains jours.</p></div>`}
    </section>` : ''}
    <section class="card" id="paiements"><div class="card-h"><h2>${I.card}Paiements</h2>
        <nav class="chips" aria-label="État">${Object.entries(SALE_FILTERS).map(([v, l]) => html`<a class="chip" href="${url({ etat: v === 'tous' ? '' : v })}" ${v === etat ? html`aria-current="page"` : ''}>${l}</a>`)}</nav></div>
      ${salesRows(rows, { dashboard })}
      <div class="pager"><span>${filtered.length ? `${num((page - 1) * per + 1)}–${num((page - 1) * per + rows.length)} sur ${num(filtered.length)}${s.sales.length >= 500 ? ' (les 500 plus récents)' : ''}` : '0 paiement'}</span>
        ${pages > 1 ? html`<span class="row">${page > 1 ? html`<a class="btn btn-sm" href="${url({ page: String(page - 1) })}">${I.left}Plus récents</a>` : ''}<span>Page ${page} / ${pages}</span>${page < pages ? html`<a class="btn btn-sm" href="${url({ page: String(page + 1) })}">Plus anciens${I.right}</a>` : ''}</span>` : ''}</div>
    </section>`;
  return shell(nav, 'ventes', 'Ventes', body);
}

// ---------- the setup checks (Stripe, Discord, community bot), on Services and Site ----------
const checkItems = (checks, cls = '') => html`<ul class="checks${cls ? ` ${cls}` : ''}">${checks.map((c) => html`<li>${pill(CHECK[c.level][0], CHECK[c.level][1])}<div><b>${c.label}</b><p>${c.text}</p></div></li>`)}</ul>`;
function stripeCard(s) {
  if (!s) return '';
  const bad = s.checks.filter((c) => c.level === 'error').length;
  return card({ title: 'Paiements Stripe', icon: I.card, id: 'stripe', actions: bad ? pill('err', `${bad} à corriger`) : s.mode === 'live' ? pill('ok', 'Prêt pour le live') : pill('warn', `Mode ${s.mode || 'non configuré'}`), flush: true,
    body: html`<div class="checks-wrap">${checkItems(s.checks, 'two')}</div>
      ${s.testLicenses ? html`<div class="callout"><p><strong>${s.testLicenses === 1 ? '1 licence active vient' : `${s.testLicenses} licences actives viennent`} d’un achat fait en mode test</strong> (rien n’a été payé). Elles donnent encore Premium, comptent pour les affiliés, et bloquent un nouvel achat sur ces comptes.</p>
        <form method="post" action="/admin/test-licenses" class="inline" data-busy="Arrêt…" data-danger data-confirm="Arrêter ${s.testLicenses === 1 ? 'la licence de test' : `les ${s.testLicenses} licences de test`} ? Ces joueurs repassent en version gratuite."><button class="btn btn-sm btn-danger" type="submit">Arrêter les licences de test</button></form></div>` : ''}` });
}
function discordCard(d) {
  if (!d) return '';
  if (d.missing) {
    return card({ title: 'Rôle Pro sur Discord', icon: I.chat, actions: pill('off', 'Manuel'),
      body: html`<p class="hint">Le bot n’est pas configuré : la page du joueur dit d’ouvrir un ticket pour avoir le rôle. À régler dans Railway : ${d.missing.join(', ')}.</p>` });
  }
  const bad = d.checks.filter((c) => c.level === 'error').length;
  const needsInvite = d.checks.some((c) => c.label === 'Serveur' && c.level === 'error');
  return card({ title: 'Rôle Pro sur Discord', icon: I.chat, actions: bad ? pill('err', `${bad} à corriger`) : pill('ok', 'Automatique'), flush: true,
    body: html`${checkItems(d.checks)}${needsInvite ? html`<div class="card-b"><a class="btn btn-sm" href="${d.inviteUrl}" rel="noopener">Inviter le bot sur le serveur${I.external}</a></div>` : ''}` });
}
function communityCard(d) {
  if (!d) return '';
  const bad = d.checks.filter((c) => c.level === 'error').length;
  const needsPerms = d.checks.some((c) => c.label === 'Invitations' && c.level === 'error');
  return card({ title: 'Bot communauté Discord', icon: I.users, actions: bad ? pill('err', `${bad} à corriger`) : pill('ok', 'Actif'), flush: true,
    body: html`${checkItems(d.checks)}${needsPerms && d.inviteUrl ? html`<div class="card-b"><a class="btn btn-sm" href="${d.inviteUrl}" rel="noopener">Redonner ses permissions au bot${I.external}</a></div>` : ''}` });
}

// ---------- services ----------
const SERVICES_NOTICE = {
  'test-ended': (n) => (n ? `${n === 1 ? 'La licence de test ne donne' : `Les ${n} licences de test ne donnent`} plus Premium.` : 'Aucune licence de test à arrêter.'),
};
export function servicesPage(nav, { services: sv, notice, count: ended }) {
  const stripe = sv.list.find((x) => x.id === 'stripe')?.stripe;
  const discord = sv.list.find((x) => x.id === 'discord')?.discord;
  const community = sv.list.find((x) => x.id === 'community')?.community;
  const count = (lv) => sv.list.filter((x) => x.level === lv).length;
  const body = html`
    ${head({ title: 'Services', sub: 'Railway, Supabase, Netlify, Stripe, Resend, Discord et DB-IP, interrogés depuis ce serveur avec ses propres variables. Rien à installer.',
      actions: html`${stamp(sv.at, 'Vérifiés')}<a class="btn btn-sm" href="/admin/services?frais=1">${I.refresh}Vérifier maintenant</a>` })}
    <div class="kpis">
      ${kpi({ label: 'En marche', icon: I.check, value: num(count('ok')) })}
      ${kpi({ label: 'À vérifier', icon: I.info, value: num(count('warn')) })}
      ${kpi({ label: 'En panne', icon: I.alert, value: num(count('error')) })}
      ${kpi({ label: 'Éteints', icon: I.clock, value: num(count('off')) })}
    </div>
    ${card({ title: 'État des services', icon: I.pulse, flush: true, body: servicesGrid(sv.list) })}
    ${sv.warnings.length ? card({ title: 'Avertissements du démarrage', icon: I.alert, sub: 'Les mêmes lignes [warn] que dans les logs Railway.', flush: true,
      body: html`<ul class="checks">${sv.warnings.map((w) => html`<li>${pill('warn', 'À vérifier')}<div><p>${w}</p></div></li>`)}</ul>` }) : ''}
    ${stripeCard(stripe)}
    ${discord && community ? html`<div class="g g2">${discordCard(discord)}${communityCard(community)}</div>` : html`${discordCard(discord)}${communityCard(community)}`}
    <p class="hint">Pas encore surveillés d’ici : les serveurs Rago Route (Vultr) et la facturation de Railway, Supabase et Netlify (à voir sur leurs sites).</p>`;
  const n = SERVICES_NOTICE[notice];
  return shell(nav, 'services', 'Services', body, { notice: n ? n(ended) : '', path: '/admin/services' });
}

// ---------- journal ----------
const TYPE_LABEL = { tout: 'Tout', admin: 'Actions admin', achats: 'Licences', comptes: 'Comptes', pc: 'PC', abonnements: 'Abonnements', affiliation: 'Affiliation' };
export function journalPage(nav, { rows, type, types, before }) {
  const last = rows[rows.length - 1];
  const today = parisDay(Date.now());
  const yesterday = parisDay(Date.now() - DAY);
  const groups = [];
  for (const e of rows) {
    const d = parisDay(Number(e.at));
    if (!groups.length || groups[groups.length - 1].d !== d) groups.push({ d, at: Number(e.at), rows: [] });
    groups[groups.length - 1].rows.push(e);
  }
  const label = (g) => (g.d === today ? 'Aujourd’hui' : g.d === yesterday ? 'Hier' : fLong.format(new Date(g.at)).replace(/^./, (c) => c.toUpperCase()));
  const body = html`
    ${head({ title: 'Journal', sub: 'Tout ce qui arrive aux comptes et aux licences, et chaque action faite ici. Gardé 12 mois.' })}
    <section class="card"><div class="card-h"><nav class="chips" aria-label="Type">${types.map((t) => html`<a class="chip" href="/admin/journal${t === 'tout' ? '' : `?type=${t}`}" ${t === type ? html`aria-current="page"` : ''}>${TYPE_LABEL[t]}</a>`)}</nav></div>
      ${rows.length ? html`<div class="tw"><table class="t">
        <thead><tr><th scope="col" class="w1">Heure</th><th scope="col">Événement</th><th scope="col">Joueur</th><th scope="col" class="hide-sm">Détail</th></tr></thead>
        ${groups.map((g) => html`<tbody><tr class="day"><th colspan="4" scope="colgroup">${label(g)}</th></tr>${g.rows.map((e) => {
          const owner = e.owner || e.user_id;
          const email = e.email || e.license_email;
          return html`<tr><td class="num muted w1" title="${when(e.at)}">${fTime.format(new Date(Number(e.at)))}</td>
            <th scope="row"><span class="row"><span class="feed-dot ${eventKind(e.type)}"></span>${eventLabel(e.type)}</span></th>
            <td class="clip">${owner && email ? html`<a href="${userHref(owner)}">${email}</a>` : email ? html`<span class="dim">${email}</span>` : dash}</td>
            <td class="hide-sm wraps muted small">${eventDetail(e.detail)}</td></tr>`;
        })}</tbody>`)}
      </table></div>` : empty('Rien dans ce filtre.', { icon: I.list })}
      <div class="pager"><span>${plural(rows.length, 'événement')}${before ? ' (plus anciens)' : ''}</span>
        <span class="row">${before ? html`<a class="btn btn-sm" href="/admin/journal${type === 'tout' ? '' : `?type=${type}`}">${I.left}Les plus récents</a>` : ''}
        ${rows.length === 100 ? html`<a class="btn btn-sm" href="/admin/journal?${new URLSearchParams({ ...(type !== 'tout' ? { type } : {}), avant: String(last.id) })}">Plus anciens${I.right}</a>` : ''}</span></div>
    </section>`;
  return shell(nav, 'journal', 'Journal', body);
}

// ---------- site: pop-up, promotion codes, reviews ----------
const DURATION = { once: 'sur le premier paiement', forever: 'sur chaque paiement', repeating: 'pendant plusieurs mois' };
const SITE_NOTICE = {
  saved: 'Enregistré. Le site affiche la nouvelle version de la pop-up en moins d’une minute.',
  created: 'Code créé dans Stripe et enregistré. Le site l’affiche en moins d’une minute.',
  code: (code) => `Code ${code || ''} créé dans Stripe. À taper au paiement, ou à partager avec un lien /buy?promo=CODE.`,
};
/** The line under the code, same words as the site's pop-up (site/src/page.html). */
export const popupLeftLine = (total, left) => `Limited to the first ${total} players · ${left} left`;
const fill = (t, v) => String(t).replace(/\{(percent|code|total|left)\}/g, (_, k) => String(v[k] ?? ''));

function popupPreview(s, p) {
  const vals = { percent: p.percent, code: p.code, total: p.total, left: p.left };
  // {percent} in the title is drawn in red, like on the site.
  const title = String(s.title).split(/(\{(?:percent|code|total|left)\})/).map((part) => {
    const m = part.match(/^\{(percent|code|total|left)\}$/);
    return m ? (m[1] === 'percent' ? html`<span>${p.percent}</span>` : String(vals[m[1]] ?? '')) : part;
  });
  return html`<div class="pop" aria-label="Aperçu de la pop-up"><p class="eyebrow">${fill(s.eyebrow, vals)}</p><p class="title">${title}</p>
    <p class="text">${fill(s.text, vals)}</p><p class="code">${p.code}</p>${p.total != null ? html`<p class="left">${popupLeftLine(p.total, p.left)}</p>` : ''}</div>`;
}

export function sitePage(nav, { state, reviews, notice, code, error, values, promoError }) {
  const { settings: s, promo: p } = state;
  const v = values || { enabled: s.enabled, code: s.code, percent: p?.percent ?? '', limit: p?.total ?? '', eyebrow: s.eyebrow, title: s.title, text: s.text };
  const n = SITE_NOTICE[notice];
  const shown = reviews.filter((r) => r.status === 'published').length;
  const body = html`
    ${head({ title: 'Site et promos', sub: `La pop-up de réduction du site, les codes promo Stripe (mode ${state.mode || 'non configuré'}) et les avis affichés sur le site.` })}
    ${card({ title: 'Pop-up de réduction', icon: I.tag, actions: html`${state.shown ? pill('ok', 'Affichée sur le site') : pill('off', 'Masquée')}`, sub: state.reason || '', flush: true,
      body: html`<div class="editor">
        <div class="editor-main">${alertBox(error)}
        <form method="post" action="/admin/popup" class="form" data-busy="Enregistrement…">
          <label class="switch"><span><b>Afficher la pop-up sur le site</b><span>Masquée d’elle-même quand le code est épuisé.</span></span><input type="checkbox" name="enabled" ${v.enabled ? html`checked` : ''}></label>
          <div class="fld"><label for="f-code">Code</label><input class="in code" id="f-code" name="code" value="${v.code}" maxlength="40" spellcheck="false" autocapitalize="characters" autocomplete="off" required>
            <p class="hint">Un code qui n’existe pas encore est créé dans Stripe, réservé aux nouveaux clients, sur le premier paiement.</p></div>
          <div class="pair">
            <div class="fld"><label for="f-percent">Réduction (%)</label><input class="in" id="f-percent" name="percent" type="number" value="${v.percent}" min="1" max="99" step="any" inputmode="numeric"></div>
            <div class="fld"><label for="f-limit">Nombre de clients</label><input class="in" id="f-limit" name="limit" type="number" value="${v.limit}" min="1" step="1" inputmode="numeric" placeholder="sans limite"></div>
          </div>
          <p class="hint">Stripe ne change pas la réduction ni le nombre de clients d’un code existant : pour une autre offre, tape un nouveau code.</p>
          <div class="fld"><label for="f-eyebrow">Petit titre</label><input class="in" id="f-eyebrow" name="eyebrow" value="${v.eyebrow}" maxlength="40" required></div>
          <div class="fld"><label for="f-title">Titre</label><input class="in" id="f-title" name="title" value="${v.title}" maxlength="80" required></div>
          <div class="fld"><label for="f-text">Texte</label><textarea class="in" id="f-text" name="text" rows="3" maxlength="280" required>${v.text}</textarea>
            <p class="hint">En anglais, comme le site. {percent} devient la réduction, {code} le code, {total} le nombre de clients et {left} les places restantes.</p></div>
          <div class="row"><button class="btn btn-primary" type="submit">Enregistrer</button></div>
        </form></div>
        <aside class="editor-side" aria-label="État et aperçu">${p ? kv([['Code', html`<span class="num">${p.code}</span>`], ['Réduction', `${p.percent == null ? 'Montant fixe' : `${p.percent} %`} ${DURATION[p.duration] || ''}${p.firstTime ? ', nouveaux clients' : ''}`],
            ['Utilisations', p.total == null ? `${p.used}, sans limite` : `${p.used} sur ${p.total}`], ['Restantes', p.total == null ? 'Illimité' : String(p.left)]], 'tight') : ''}
          ${p?.total ? html`<div class="meter${p.left ? '' : ' ok'}"><span class="w-${Math.min(100, pct(p.used, p.total))}"></span></div>` : ''}
          ${p && p.percent > 0 ? popupPreview(s, p) : html`${popupPreview({ ...s, eyebrow: v.eyebrow, title: v.title, text: v.text }, { percent: v.percent ? `${v.percent}` : '?', code: v.code || s.code, total: null })}<p class="hint">${p ? 'Ce code n’est pas une réduction en pourcentage : la pop-up ne peut pas l’afficher.' : 'Aperçu avec les valeurs du formulaire : ce code n’existe pas encore dans Stripe, il sera créé en enregistrant.'}</p>`}</aside>
      </div>` })}
    ${card({ title: 'Créer un code promo', icon: I.tag, sub: `Réservé aux nouveaux clients, dans le mode de la clé Stripe (${nav.mode || 'non configuré'}). Pour la pop-up, tape plutôt le code dans le formulaire au-dessus.`, body: html`${alertBox(promoError)}
      <form method="post" action="/admin/code-promo" class="form-line" data-busy="Création…">
        <div class="fld"><label for="f-pcode">Code</label><input class="in code" id="f-pcode" name="code" placeholder="RAGO15" maxlength="40" required spellcheck="false" autocomplete="off"></div>
        <div class="fld"><label for="f-pct">Réduction (%)</label><input class="in" id="f-pct" name="pourcent" type="number" min="1" max="99" step="any" placeholder="15" required></div>
        <div class="fld"><label for="f-duree">S’applique</label><select class="in" id="f-duree" name="duree"><option value="once">au premier paiement</option><option value="forever">à chaque paiement</option></select></div>
        <button class="btn btn-primary" type="submit">Créer dans Stripe</button>
      </form>` })}
    ${card({ title: 'Avis', icon: I.star, actions: reviews.length ? pill('line', `${num(shown)} affiché${shown > 1 ? 's' : ''} sur ${num(reviews.length)}`) : '', flush: true,
      body: reviews.length ? html`<div class="tw"><table class="t">
        <thead><tr><th scope="col">Joueur</th><th scope="col">Note</th><th scope="col">Avis</th><th scope="col" class="r hide-sm">Date</th><th scope="col" class="w1">Site</th></tr></thead>
        <tbody>${reviews.map((r) => html`<tr><th scope="row" class="clip">${who({ email: r.display_name || r.email, avatar_key: r.avatar_key }, userHref(r.uid), r.display_name ? r.email : '')}</th>
          <td><span class="stars" aria-label="${r.rating} sur 5">${'★'.repeat(r.rating)}<s>${'★'.repeat(5 - r.rating)}</s></span></td>
          <td class="wraps">${r.comment}</td><td class="r num muted hide-sm">${day(r.updated_at)}</td>
          <td class="w1">${actionForm(`/admin/utilisateurs/${r.uid}/avis`, r.status === 'published' ? 'Masquer' : 'Afficher', { fields: hidden('statut', r.status === 'published' ? 'masquer' : 'afficher') })}</td></tr>`)}</tbody></table></div>`
        : empty('Pas encore d’avis : le site cache sa section Avis.', { icon: I.star }) })}`;
  return shell(nav, 'site', 'Site et promos', body, { notice: typeof n === 'function' ? n(code) : n, path: '/admin/site' });
}

// ---------- the app's network tests by city and by provider (network.js) ----------
const NET_TARGETS = [
  ['hypixel', 'Hypixel'], ['minemen', 'Minemen'], ['paris', 'Paris'], ['frankfurt', 'Francfort'], ['london', 'Londres'],
  ['stockholm', 'Stockholm'], ['madrid', 'Madrid'], ['virginia', 'Virginie'], ['internet', 'Internet'],
];
const heat = (ms) => (ms <= 30 ? 'p-1' : ms <= 60 ? 'p-2' : ms <= 100 ? 'p-3' : 'p-4');
function netTable(rows, place, label) {
  if (!rows.length) return empty('Aucun test réseau sur cette période.', { icon: I.wifi });
  const cell = (g, id) => {
    const p = g.targets[id];
    if (!p) return html`<td class="r dim">–</td>`;
    const loss = `${(p.loss * 100).toFixed(1).replace('.', ',')} %`;
    return html`<td class="r ping ${heat(p.median)}${p.loss > 0.02 ? ' net-loss' : ''}" title="${num(p.n)} mesure${p.n > 1 ? 's' : ''}, pertes ${loss}">${p.median}</td>`;
  };
  return html`<div class="tw"><table class="t compact">
      <thead><tr><th scope="col">${label}</th><th scope="col" class="r">Joueurs</th><th scope="col" class="r">Tests</th>${NET_TARGETS.map(([, name]) => html`<th scope="col" class="r">${name}</th>`)}</tr></thead>
      <tbody>${rows.map((g) => html`<tr><th scope="row" class="clip">${place(g)}</th><td class="r num">${num(g.players)}</td><td class="r num">${num(g.tests)}</td>${NET_TARGETS.map(([id]) => cell(g, id))}</tr>`)}</tbody>
    </table></div>`;
}
export function networkPage(nav, { summary: s, geo }) {
  const t = s.total;
  const [kind, status] = !geo.on ? ['off', 'Villes désactivées (GEOIP=off)']
    : geo.loaded ? ['ok', `Villes : base DB-IP de ${geo.month}`]
    : geo.error ? ['err', 'Base des villes introuvable'] : ['warn', 'Base des villes en chargement'];
  const unknown = html`<span class="dim">Inconnue</span>`;
  const city = (g) => (g.city ? html`${g.city}<span class="dim small"> · ${[g.region, g.country].filter(Boolean).join(', ')}</span>` : g.country ? html`${unknown}<span class="dim small"> · ${g.country}</span>` : unknown);
  const isp = (g) => (g.isp ? html`${g.isp}<span class="dim small"> · ${g.country || '?'}</span>` : unknown);
  const located = t.tests ? Math.round((t.located / t.tests) * 100) : 0;
  const scale = html`<div class="scale"><span class="p-1"><i></i>≤ 30 ms</span><span class="p-2"><i></i>≤ 60 ms</span><span class="p-3"><i></i>≤ 100 ms</span><span class="p-4"><i></i>plus</span><span><span class="net-loss">souligné</span> : plus de 2 % de paquets perdus</span></div>`;
  const body = html`
    ${head({ title: 'Où jouent les joueurs', sub: `Ping médian en ms vers chaque serveur du test réseau de l’app, sur les ${s.days} derniers jours. Survole un chiffre pour le nombre de mesures et les pertes.`,
      actions: html`<nav class="seg" aria-label="Période">${[30, 90, 365].map((d) => html`<a href="/admin/reseau?jours=${d}" ${d === s.days ? html`aria-current="page"` : ''}>${d} jours</a>`)}</nav>
        <a class="btn btn-sm" href="/admin/reseau.csv">${I.download}Tout exporter (CSV)</a>` })}
    <div class="row">${pill(kind, status)}${geo.error ? html`<span class="hint">${geo.error}</span>` : ''}</div>
    <div class="kpis">
      ${kpi({ label: 'Joueurs', icon: I.users, value: num(t.players), sub: 'PC différents' })}
      ${kpi({ label: 'Tests', icon: I.wifi, value: num(t.tests), sub: t.last ? html`dernier ${rel(t.last)}` : 'aucun' })}
      ${kpi({ label: 'Villes', icon: I.globe, value: num(t.cities) })}
      ${kpi({ label: 'Avec la ville', icon: I.check, value: `${located} %`, sub: 'tests localisés' })}
    </div>
    ${card({ title: 'Par ville', icon: I.globe, actions: scale, flush: true, body: netTable(s.cities, city, 'Ville') })}
    ${card({ title: 'Par fournisseur d’accès', icon: I.wifi, flush: true, body: netTable(s.isps, isp, 'Fournisseur') })}
    <p class="hint">Villes et fournisseurs : <a href="https://db-ip.com" rel="noopener">IP Geolocation by DB-IP</a> (CC BY 4.0), déduits de l’adresse IP qui n’est jamais gardée. Tests gardés 12 mois.</p>`;
  return shell(nav, 'reseau', 'Tests réseau', body);
}

export { raw };
