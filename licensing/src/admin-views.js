// Pages of the /admin dashboard (admin.js). In French: only Sofiene uses them. Same look as the account pages
// (account.css), strict CSP: no inline style or script, so charts are SVG attributes and classes.
import { html, raw, adminShell, alertBox, field, avatar, ICON, stripeSection, discordSection, communitySection } from './views.js';

const TZ = 'Europe/Paris';
const DAY = 86400000;

// ---------- formatting ----------
const fmtDate = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtShort = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export const day = (ms) => (ms ? fmtDate.format(new Date(Number(ms))) : '–');
export const when = (ms) => (ms ? fmtDateTime.format(new Date(Number(ms))) : '–');
const short = (ms) => (ms ? fmtShort.format(new Date(Number(ms))) : '–');
const num = (v) => new Intl.NumberFormat('fr-FR').format(Number(v) || 0);
export function money(cents, cur = 'usd') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: String(cur || 'usd').toUpperCase() }).format((Number(cents) || 0) / 100);
}
/** { usd: 1234, eur: 500 } as "12,34 $US + 5,00 €", main currency first. */
export function moneyMap(map, main = 'usd') {
  const keys = Object.keys(map || {}).filter((k) => map[k]).sort((a, b) => (a === main ? -1 : b === main ? 1 : a.localeCompare(b)));
  return keys.length ? keys.map((k) => money(map[k], k)).join(' + ') : money(0, main);
}
function ago(ms) {
  if (!ms) return 'jamais';
  const s = Math.round((Date.now() - Number(ms)) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  if (s < 60 * 86400) return `il y a ${Math.round(s / 86400)} j`;
  return `le ${day(ms)}`;
}

export const PLAN = { month: 'Mensuel', year: 'Annuel', lifetime: 'À vie', reward: 'Offert' };
export const REASON = {
  refunded: 'remboursée', disputed: 'litige bancaire', manual: 'à la main', subscription_ended: 'abonnement terminé', replaced: 'remplacée par un autre achat',
  banned: 'compte banni', deleted: 'compte supprimé', affiliate_fraud: 'fraude à l’affiliation', test_purchase: 'achat de test',
};
const SOURCE = { stripe: 'Stripe', grant: 'offerte par l’équipe', affiliate: 'récompense d’affiliation', discord: 'récompense Discord' };
const LEVEL = { ok: ['badge-ok', 'OK'], warn: ['badge-wait', 'À vérifier'], error: ['badge-red', 'En panne'], off: ['badge-off', 'Éteint'] };
const levelBadge = (lv) => html`<span class="badge ${LEVEL[lv]?.[0] || 'badge-off'}"><i></i>${LEVEL[lv]?.[1] || lv}</span>`;

/** Badge for a player's Premium, from their latest license row (users list) or license. */
function premiumBadge(l, bannedAt) {
  if (bannedAt) return html`<span class="badge badge-red"><i></i>Banni</span>`;
  if (!l || !l.status) return html`<span class="badge badge-off"><i></i>Gratuit</span>`;
  if (l.status !== 'active') return html`<span class="badge badge-off"><i></i>Gratuit · ${REASON[l.status_reason] || 'révoquée'}</span>`;
  if (l.cancel_at_period_end) return html`<span class="badge badge-wait"><i></i>${PLAN[l.plan] || l.plan} · résilié</span>`;
  return html`<span class="badge badge-ok"><i></i>${PLAN[l.plan] || l.plan}</span>`;
}

// What the journal's event types mean.
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
  'admin.promo_code': 'Code promo créé (admin)', 'admin.test_licenses_ended': 'Licences de test arrêtées (admin)',
};
const eventLabel = (t) => EVENT[t] || t;
function eventDetail(detail) {
  if (!detail) return '';
  try {
    const d = JSON.parse(detail);
    return Object.entries(d).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ').slice(0, 220);
  } catch { return String(detail).slice(0, 220); }
}

// ---------- layout ----------
const NAV = [
  ['accueil', '/admin', 'Vue d’ensemble'], ['joueurs', '/admin/utilisateurs', 'Joueurs'], ['achats', '/admin/achats', 'Offrir et achats'],
  ['ventes', '/admin/ventes', 'Ventes'], ['services', '/admin/services', 'Services'], ['reseau', '/admin/reseau', 'Tests réseau'],
  ['site', '/admin/site', 'Site et promos'], ['journal', '/admin/journal', 'Journal'],
];
export function navBar(nav, current) {
  return html`<div class="adm-bar">
    <nav class="tabs adm-tabs" aria-label="Admin">${NAV.map(([k, href, label]) => html`<a href="${href}" ${k === current ? html`aria-current="page"` : ''}>${label}</a>`)}</nav>
    <div class="row adm-env">
      <span class="badge ${nav.cfg.envName === 'production' ? 'badge-ok' : 'badge-wait'}"><i></i>${nav.cfg.envName === 'production' ? 'Prod' : `Test · ${nav.cfg.envName}`}</span>
      <span class="badge ${nav.mode === 'live' ? 'badge-ok' : 'badge-off'}"><i></i>Stripe ${nav.mode || 'off'}</span>
      <form method="post" action="/admin/logout"><button class="btn btn-ghost btn-sm" type="submit">Quitter</button></form>
    </div>
  </div>`;
}
const shell = (nav, current, title, body) => adminShell(nav.cfg, title, html`<main class="dash adm">${body}</main>`, navBar(nav, current));
const head = (overline, title, text, side = '') => html`<div class="dash-head">
    <div><p class="overline rise">${overline}</p><h1 class="display rise d1">${title}</h1>${text ? html`<p class="muted rise d2">${text}</p>` : ''}</div>
    ${side ? html`<div class="row rise d2">${side}</div>` : ''}
  </div>`;
const panel = (title, body, side = '') => html`<section class="net-panel adm-panel"><div class="adm-panel-head"><h2 class="h2">${title}</h2>${side}</div>${body}</section>`;
const tiles = (list) => html`<dl class="net-facts adm-tiles">${list.filter(Boolean).map(([dt, dd, sub]) => html`<div><dt>${dt}</dt><dd class="mono">${dd}</dd>${sub ? html`<p class="muted small">${sub}</p>` : ''}</div>`)}</dl>`;
const copyLink = (link) => (link ? html`<div class="adm-link" role="status"><p class="small"><strong>${link.label}</strong></p>
    <div class="row"><code class="mono adm-code">${link.url}</code><button class="btn btn-ghost btn-sm" type="button" data-copy="${link.url}">${ICON.copy}<span>Copier</span></button></div>
    <p class="muted small">Affiché une seule fois : il n’est gardé nulle part en clair.</p></div>` : '');
const actionForm = (action, label, { fields = '', confirm = '', kind = 'ghost', busy = 'En cours…' } = {}) => html`<form method="post" action="${action}" class="adm-inline" data-busy="${busy}" ${confirm ? html`data-confirm="${confirm}"` : ''}>${fields}<button class="btn btn-${kind} btn-sm" type="submit">${label}</button></form>`;
const hiddenInput = (name, value) => html`<input type="hidden" name="${name}" value="${value}">`;

export const notFoundPage = (nav, text) => shell(nav, 'joueurs', 'Introuvable', html`${head('Admin', 'Introuvable.', text)}<p><a href="/admin/utilisateurs">Retour aux joueurs</a></p>`);

// ---------- overview ----------
function salesTiles(s) {
  if (!s || s.error) return html`<p class="muted small">${s?.error || 'Ventes indisponibles.'}</p>`;
  const p = s.periods;
  const cur = s.currency;
  return tiles([
    ['Aujourd’hui', moneyMap(p.today.net, cur), `${p.today.count} paiement${p.today.count > 1 ? 's' : ''}`],
    ['Hier', moneyMap(p.yesterday.net, cur), `${p.yesterday.count} paiement${p.yesterday.count > 1 ? 's' : ''}`],
    ['Ce mois', moneyMap(p.month.net, cur), `${p.month.count} paiement${p.month.count > 1 ? 's' : ''}`],
    ['Mois dernier', moneyMap(p.lastMonth.net, cur), `${p.lastMonth.count} paiement${p.lastMonth.count > 1 ? 's' : ''}`],
    ['Depuis le début', moneyMap(p.total.net, cur), `${p.total.count} paiements${s.received ? ` · ${moneyMap(s.received.total.net, 'eur')} reçus après frais` : ''}`],
    s.subscriptions ? ['Revenu mensuel récurrent', moneyMap(s.subscriptions.mrr, cur), `${s.subscriptions.active} abonnement${s.subscriptions.active > 1 ? 's' : ''} actif${s.subscriptions.active > 1 ? 's' : ''}`] : null,
  ]);
}
function chart(s) {
  if (!s || s.error || !s.days?.length) return '';
  const max = Math.max(1, ...s.days.map((d) => d.amount));
  const W = 600; const H = 120; const bw = W / s.days.length;
  return html`<figure class="adm-chart"><svg viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Ventes des 30 derniers jours">
      ${s.days.map((d, i) => {
        const h = d.amount ? Math.max(2, Math.round((d.amount / max) * H)) : 0;
        return html`<g><title>${d.day.split('-').reverse().join('/')} : ${money(d.amount, s.currency)} (${d.count})</title>
          <rect class="adm-chart-bg" x="${(i * bw + 2).toFixed(1)}" y="0" width="${(bw - 4).toFixed(1)}" height="${H}" rx="3"></rect>
          ${h ? html`<rect class="adm-chart-bar${i === s.days.length - 1 ? ' adm-chart-today' : ''}" x="${(i * bw + 2).toFixed(1)}" y="${H - h}" width="${(bw - 4).toFixed(1)}" height="${h}" rx="3"></rect>` : ''}</g>`;
      })}
      <text class="adm-axis" x="0" y="${H + 14}">${s.days[0].day.slice(8)}/${s.days[0].day.slice(5, 7)}</text>
      <text class="adm-axis" x="${W}" y="${H + 14}" text-anchor="end">aujourd’hui</text>
    </svg><figcaption class="muted small">Encaissé par jour (heure de Paris), 30 derniers jours, en ${s.currency.toUpperCase()}, remboursements déduits. Plus haut : ${money(max, s.currency)}.</figcaption></figure>`;
}
function serviceList(list, { compact = false } = {}) {
  return html`<ul class="checks-list adm-services">${list.map((x) => html`<li>${levelBadge(x.level)}
      <div><strong class="small">${x.group} · ${x.label}</strong>${compact && x.level === 'ok' ? '' : html`<p class="muted small">${x.text}</p>`}
      ${x.ms != null && !compact ? html`<p class="muted small mono">${x.ms} ms</p>` : ''}</div></li>`)}</ul>`;
}

export function overviewPage(nav, { counts: k, sales: s, services: sv, recentUsers, recentEvents }) {
  const bad = sv.list.filter((x) => x.level === 'error');
  const body = html`
    ${head('Admin · Vue d’ensemble', 'Tout Rago au même endroit.', `Mis à jour ${short(Date.now())} (heure de Paris). Ventes lues dans Stripe, gardées 5 minutes ; services vérifiés chaque minute.`,
      html`<a class="btn btn-ghost btn-sm" href="/admin?frais=1">Actualiser</a>
        <form method="get" action="/admin/utilisateurs" class="adm-search" role="search"><input name="q" type="search" placeholder="E-mail, nom, clé, cus_…" aria-label="Chercher un joueur"><button class="btn btn-primary btn-sm" type="submit">Chercher</button></form>`)}
    ${bad.length ? alertBox(`${bad.length} service${bad.length > 1 ? 's' : ''} en panne : ${bad.map((x) => x.label).join(', ')}. Détail dans Services.`) : ''}
    ${panel('Ventes', html`${salesTiles(s)}${chart(s)}`, html`<a class="btn btn-ghost btn-sm" href="/admin/ventes">Détail des ventes</a>`)}
    ${panel('Joueurs', tiles([
      ['Comptes', num(k.users.n), `+${num(k.users.d1)} en 24 h · +${num(k.users.d7)} en 7 j · +${num(k.users.d30)} en 30 j`],
      ['Premium actifs', num(k.lic.active), `${num(k.lic.month)} mensuels · ${num(k.lic.year)} annuels · ${num(k.lic.lifetime)} à vie · ${num(k.lic.gifted)} offerts`],
      ['Essais en cours', num(k.trials), `${num(k.lic.canceling)} résilié${k.lic.canceling > 1 ? 's' : ''} en fin de période`],
      ['PC activés', num(k.devices.n), `${num(k.devices.d1)} vus en 24 h · ${num(k.devices.d7)} en 7 j`],
      ['Achats non rattachés', num(k.unclaimed), 'payés, sans compte'],
      ['Bannis', num(k.users.banned)],
      ['Discord liés', num(k.discord.n), `${num(k.discord.role)} avec le rôle Pro`],
      ['Avis', num(k.reviews?.n), k.reviews?.n ? `moyenne ${String(k.reviews.avg).replace('.', ',')} / 5 · ${num(k.reviews.hidden)} masqué${k.reviews.hidden > 1 ? 's' : ''}` : ''],
      k.net ? ['Tests réseau (7 j)', num(k.net.n), `${num(k.net.players)} PC`] : null,
    ]), html`<a class="btn btn-ghost btn-sm" href="/admin/utilisateurs">Tous les joueurs</a>`)}
    <div class="adm-grid">
      ${panel('Services', serviceList(sv.list, { compact: true }), html`<a class="btn btn-ghost btn-sm" href="/admin/services">Détail</a>`)}
      ${panel('Derniers inscrits', html`<ul class="adm-list">${recentUsers.map((u) => html`<li><a href="/admin/utilisateurs/${u.id}">${u.email}</a>${premiumBadge(u, u.banned_at)}<span class="muted small">${ago(u.created_at)}</span></li>`)}</ul>`)}
    </div>
    ${panel('Dernières ventes', s && !s.error ? salesTable(s.sales.slice(0, 8), null) : html`<p class="muted small">${s?.error || ''}</p>`)}
    ${panel('Derniers événements', eventsTable(recentEvents), html`<a class="btn btn-ghost btn-sm" href="/admin/journal">Journal complet</a>`)}`;
  return shell(nav, 'accueil', 'Vue d’ensemble', body);
}

// ---------- players ----------
const FILTER_LABEL = { tous: 'Tous', premium: 'Premium', abonnes: 'Abonnés', essais: 'En essai', resilies: 'Résiliés', lifetime: 'À vie', offerts: 'Offerts', gratuits: 'Gratuits', bannis: 'Bannis' };
const USERS_NOTICE = { supprime: 'Compte supprimé : abonnement arrêté, données effacées, licences gardées sans nom pour la comptabilité.' };

export function usersPage(nav, { rows, total, page, pages, q, filtre, counts: k, notice }) {
  const qs = (p) => `/admin/utilisateurs?${new URLSearchParams({ ...(q ? { q } : {}), ...(filtre !== 'tous' ? { filtre } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  const body = html`
    ${head('Admin · Joueurs', 'Joueurs.', `${num(k.users.n)} comptes, ${num(k.lic.active)} Premium. Cherche par e-mail, nom public, clé de licence, client ou abonnement Stripe (cus_…, sub_…) ou pseudo Discord.`)}
    ${alertBox(USERS_NOTICE[notice], 'ok')}
    <form method="get" action="/admin/utilisateurs" class="adm-filters" role="search">
      <input class="adm-input" name="q" type="search" value="${q}" placeholder="Chercher un joueur" aria-label="Chercher un joueur">
      <select class="adm-input" name="filtre" aria-label="Filtre">${Object.entries(FILTER_LABEL).map(([v, l]) => html`<option value="${v}" ${v === filtre ? html`selected` : ''}>${l}</option>`)}</select>
      <button class="btn btn-primary btn-sm" type="submit">Afficher</button>
      ${q || filtre !== 'tous' ? html`<a class="btn btn-ghost btn-sm" href="/admin/utilisateurs">Tout effacer</a>` : ''}
    </form>
    <section class="net-panel">
      <p class="muted small adm-count">${num(total)} résultat${total > 1 ? 's' : ''}${pages > 1 ? ` · page ${page} sur ${pages}` : ''}</p>
      ${rows.length ? html`<div class="net-scroll"><table class="net-table adm-table">
        <thead><tr><th scope="col">Joueur</th><th scope="col">Premium</th><th scope="col">Jusqu’au</th><th scope="col">Inscrit</th><th scope="col">App vue</th><th scope="col">Discord</th></tr></thead>
        <tbody>${rows.map((u) => html`<tr>
          <th scope="row"><a class="adm-user" href="/admin/utilisateurs/${u.id}">${avatar(u)}<span>${u.email}${u.display_name ? html`<span class="muted small"> · ${u.display_name}</span>` : ''}</span></a></th>
          <td>${premiumBadge(u.lic_id ? u : null, u.banned_at)}</td>
          <td class="mono">${u.status === 'active' && u.plan !== 'lifetime' ? day(u.current_period_end) : '–'}</td>
          <td class="mono">${day(u.created_at)}</td>
          <td class="mono">${u.last_seen ? ago(u.last_seen) : '–'}</td>
          <td>${u.discord_name ? `@${u.discord_name}` : html`<span class="muted">–</span>`}</td>
        </tr>`)}</tbody></table></div>` : html`<p class="muted small">Aucun joueur ne correspond.</p>`}
      ${pages > 1 ? html`<div class="row adm-pages">${page > 1 ? html`<a class="btn btn-ghost btn-sm" href="${qs(page - 1)}">Précédents</a>` : ''}${page < pages ? html`<a class="btn btn-ghost btn-sm" href="${qs(page + 1)}">Suivants</a>` : ''}</div>` : ''}
    </section>`;
  return shell(nav, 'joueurs', 'Joueurs', body);
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

function licenseCard(l, dev, uid, dash) {
  const active = l.status === 'active';
  const sub = l.stripe_subscription_id && ['month', 'year'].includes(l.plan);
  const act = (a) => `/admin/utilisateurs/${uid}/${a}`;
  const lic = hiddenInput('licence', l.id);
  return html`<article class="adm-card">
    <div class="row">${premiumBadge(l)}<span class="muted small">${SOURCE[l.source] || l.source} · ${day(l.created_at)}</span></div>
    <dl class="meta adm-meta">
      <div><dt>Clé</dt><dd class="mono">${l.key}</dd></div>
      <div><dt>Offre</dt><dd>${PLAN[l.plan] || l.plan}${l.amount ? ` · ${money(l.amount, l.currency)}` : ''}</dd></div>
      <div><dt>${l.cancel_at_period_end ? 'Se termine le' : l.plan === 'lifetime' ? 'Durée' : 'Payé / offert jusqu’au'}</dt><dd>${l.plan === 'lifetime' ? 'À vie' : day(l.current_period_end)}</dd></div>
      <div><dt>État</dt><dd>${active ? 'Active' : `Révoquée (${REASON[l.status_reason] || l.status_reason || '?'})`}</dd></div>
      ${l.stripe_customer_id ? html`<div><dt>Stripe</dt><dd><a href="${dash}/customers/${l.stripe_customer_id}" rel="noopener">${l.stripe_customer_id}</a>${l.stripe_subscription_id ? html`<br><a href="${dash}/subscriptions/${l.stripe_subscription_id}" rel="noopener">${l.stripe_subscription_id}</a>` : ''}</dd></div>` : ''}
      ${l.referral_code ? html`<div><dt>Code d’affilié</dt><dd class="mono">${l.referral_code}</dd></div>` : ''}
      <div><dt>PC</dt><dd>${dev ? html`${dev.name || 'Sans nom'} · ${dev.os || ''}<br><span class="muted small">app ${dev.app_version || '?'} · vu ${ago(dev.last_seen_at)} · activé le ${day(dev.bound_at)}${dev.last_ip ? ` · IP ${dev.last_ip}` : ''}</span>` : html`<span class="muted">Aucun</span>`}</dd></div>
    </dl>
    <div class="row adm-actions">
      ${dev ? actionForm(act('liberer-pc'), 'Libérer le PC', { fields: lic, confirm: 'Libérer ce PC ? Le joueur pourra activer Premium sur un autre PC.' }) : ''}
      ${active ? actionForm(act('revoquer'), 'Révoquer', { fields: html`${lic}<input class="adm-input adm-input-sm" name="raison" placeholder="raison (facultatif)" maxlength="60" aria-label="Raison">`, confirm: 'Révoquer cette licence ? Le joueur repasse en gratuit. Un abonnement Stripe continue d’être payé : résilie-le aussi.' })
        : actionForm(act('retablir'), 'Rétablir', { fields: lic, confirm: 'Rétablir cette licence ? Elle redonne Premium.' })}
      ${sub && active ? (l.cancel_at_period_end
        ? actionForm(act('resilier'), 'Annuler la résiliation', { fields: html`${lic}${hiddenInput('quand', 'reprendre')}` })
        : actionForm(act('resilier'), 'Résilier en fin de période', { fields: html`${lic}${hiddenInput('quand', 'fin')}`, confirm: 'Résilier ? Premium reste jusqu’à la fin de la période payée, puis plus aucun paiement.' })) : ''}
      ${sub && active ? actionForm(act('resilier'), 'Arrêter tout de suite', { kind: 'ghost', fields: html`${lic}${hiddenInput('quand', 'maintenant')}`, confirm: 'Arrêter l’abonnement tout de suite ? Premium s’arrête maintenant, sans remboursement (à faire dans Stripe si besoin).' }) : ''}
    </div>
  </article>`;
}

export function userPage(nav, d) {
  const { user: u, licenses, devices, accountDevices, identities, discordLink: dl, rewards, review, affiliate: af, referredBy, trials, loose, events, sessions, resets, hasPassword, notice, error, link, stripeDashboard: dash } = d;
  const act = (a) => `/admin/utilisateurs/${u.id}/${a}`;
  const current = licenses[0];
  const ways = [hasPassword ? 'mot de passe' : null, ...identities.map((i) => (i.provider === 'google' ? 'Google' : 'Discord'))].filter(Boolean);
  const body = html`
    <div class="dash-head">
      <div class="adm-who">${avatar(u, 'lg')}<div>
        <p class="overline rise">Admin · Joueur</p><h1 class="h1 rise d1">${u.email}</h1>
        <div class="row rise d2">${premiumBadge(current, u.banned_at)}${u.display_name ? html`<span class="chip">${u.display_name}</span>` : ''}
          <span class="muted small">inscrit le ${day(u.created_at)} · se connecte avec ${ways.join(', ') || 'rien (compte sans mot de passe)'} · ${sessions.web} session${sessions.web > 1 ? 's' : ''} site, ${sessions.app} app${resets?.until ? ' · lien de mot de passe en cours' : ''}</span></div>
      </div></div>
      <div class="row rise d2"><a class="btn btn-ghost btn-sm" href="/admin/utilisateurs">Tous les joueurs</a></div>
    </div>
    ${u.banned_at ? alertBox(`Banni le ${when(u.banned_at)}${u.banned_reason ? ` : ${u.banned_reason}` : ''}. Il ne peut plus se connecter ni utiliser Premium.`) : ''}
    ${alertBox(USER_NOTICE[notice], 'ok')}${alertBox(error)}${copyLink(link)}

    ${panel('Premium', html`${licenses.length ? html`<div class="adm-cards">${licenses.map((l) => licenseCard(l, devices.find((x) => x.license_id === l.id), u.id, dash))}</div>` : html`<p class="muted small">Aucune licence : version gratuite.</p>`}
      ${loose.length ? html`<div class="adm-sub"><h3 class="small">Achats faits avec cet e-mail, pas encore sur le compte</h3>
        <ul class="adm-list">${loose.map((l) => html`<li><span class="mono small">${l.key}</span><span>${PLAN[l.plan] || l.plan} · ${l.status === 'active' ? 'actif' : REASON[l.status_reason] || l.status} · ${day(l.created_at)}</span>
          ${actionForm(act('rattacher'), 'Rattacher à ce compte', { fields: hiddenInput('licence', l.id) })}</li>`)}</ul></div>` : ''}
      <details class="adm-sub"><summary class="small">Rattacher un achat payé avec un autre e-mail</summary>
        ${actionForm(act('rattacher'), 'Rattacher', { fields: html`<input class="adm-input" name="licence" placeholder="lic_… (voir Offrir et achats)" required aria-label="Identifiant de la licence">` })}</details>`)}

    ${panel('Gérer l’accès', html`<div class="adm-actions-grid">
      <div><h3 class="small">Offrir du temps Premium</h3><p class="muted small">S’ajoute à la date actuelle. Pour un abonné Stripe, ses prochains paiements sont décalés d’autant.</p>
        ${actionForm(act('temps'), 'Offrir', { kind: 'primary', fields: html`<input class="adm-input adm-input-sm" name="nombre" type="number" min="1" max="3650" value="7" required aria-label="Nombre">
          <select class="adm-input adm-input-sm" name="unite" aria-label="Unité"><option value="jours">jours</option><option value="mois">mois</option></select>` })}</div>
      <div><h3 class="small">Premium à vie</h3><p class="muted small">Licence offerte, sans paiement. Remplace un temps offert ; pas un abonnement en cours.</p>
        ${actionForm(act('vie'), 'Offrir à vie', { fields: html`<input class="adm-input adm-input-sm" name="note" placeholder="note (facultatif)" maxlength="80" aria-label="Note">`, confirm: 'Offrir Premium à vie à ce compte ?' })}</div>
      <div><h3 class="small">Mot de passe</h3><p class="muted small">Un lien d’une heure, à envoyer à ce joueur seulement, quand l’e-mail n’arrive pas.</p>
        ${actionForm(act('lien-mdp'), 'Créer un lien')}</div>
      <div><h3 class="small">${u.banned_at ? 'Lever le bannissement' : 'Bannir'}</h3>
        ${u.banned_at
          ? html`<p class="muted small">Sa licence revient si elle est encore valable (à vie, temps offert pas fini, abonnement encore actif dans Stripe).</p>${actionForm(act('debannir'), 'Lever le bannissement', { confirm: 'Lever le bannissement ?' })}`
          : html`<p class="muted small">Plus de connexion au site ni à l’app, sessions fermées, licence coupée, abonnement Stripe arrêté (sans remboursement), rôle Discord retiré.</p>
            ${actionForm(act('bannir'), 'Bannir', { kind: 'danger', fields: html`<input class="adm-input adm-input-sm" name="raison" placeholder="raison" maxlength="120" aria-label="Raison">`, confirm: `Bannir ${u.email} ? Il ne pourra plus se connecter ni utiliser Premium.` })}`}</div>
    </div>`)}

    <div class="adm-grid">
      ${panel('Discord', dl ? html`<dl class="meta adm-meta"><div><dt>Compte</dt><dd>@${dl.discord_name || '?'} <span class="muted small mono">${dl.discord_id}</span></dd></div>
          <div><dt>Rôle Pro</dt><dd>${dl.role ? 'Donné' : 'Pas donné'}${dl.error ? html` <span class="badge badge-red"><i></i>${dl.error}</span>` : ''}</dd></div>
          <div><dt>Lié le</dt><dd>${day(dl.linked_at)}</dd></div><div><dt>Vérifié</dt><dd>${ago(dl.synced_at)}</dd></div></dl>
          ${rewards.length ? html`<p class="small">${rewards.map((r) => `${r.kind.toUpperCase()} le ${day(r.given_at)}${r.until ? ` (Premium jusqu’au ${day(r.until)})` : ''}`).join(' · ')}</p>` : ''}
          <div class="row adm-actions">${actionForm(act('discord-sync'), 'Remettre le rôle à jour')}${actionForm(act('discord-delier'), 'Délier Discord', { confirm: 'Délier son Discord et retirer le rôle Pro ?' })}</div>`
        : html`<p class="muted small">Pas de Discord lié (il le fait depuis sa page compte).</p>`)}
      ${panel('Avis et profil', html`${review ? html`<div class="adm-review"><p>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} <span class="badge ${review.status === 'published' ? 'badge-ok' : 'badge-off'}"><i></i>${review.status === 'published' ? 'Affiché sur le site' : 'Masqué'}</span></p>
          <p class="small">${review.comment}</p><p class="muted small">${day(review.updated_at)}${review.app_version ? ` · app ${review.app_version}` : ''}</p>
          ${actionForm(act('avis'), review.status === 'published' ? 'Masquer l’avis' : 'Afficher l’avis', { fields: hiddenInput('statut', review.status === 'published' ? 'masquer' : 'afficher') })}</div>` : html`<p class="muted small">Pas d’avis.</p>`}
        <div class="row adm-actions">${actionForm(act('nom'), 'Changer le nom', { fields: html`<input class="adm-input adm-input-sm" name="nom" value="${u.display_name || ''}" placeholder="nom public" maxlength="32" aria-label="Nom public">` })}
          ${u.avatar_key ? actionForm(act('photo'), 'Retirer la photo', { confirm: 'Retirer sa photo de profil ?' }) : ''}</div>`)}
    </div>

    <div class="adm-grid">
      ${panel('Affiliation', html`${af ? html`<dl class="meta adm-meta"><div><dt>Code</dt><dd class="mono">${af.code}</dd></div><div><dt>Filleuls comptés</dt><dd>${af.counted}</dd></div>
          <div><dt>Vers la prochaine récompense</dt><dd>${af.progress} / ${af.goal}</dd></div><div><dt>Récompenses</dt><dd>${af.rewards} × ${af.months} mois</dd></div></dl>
          ${actionForm(act('affilie'), 'Recalculer')}` : html`<p class="muted small">Pas dans le programme d’affiliation.</p>`}
        ${referredBy ? html`<p class="small">Venu par <a href="/admin/utilisateurs/${referredBy.id}">${referredBy.email}</a> (${referredBy.status}).</p>` : ''}`)}
      ${panel('Essais et PC', html`${trials.length ? html`<ul class="adm-list">${trials.map((t) => html`<li><span>Essai ${t.charged_now ? 'refusé (déjà eu un essai, payé tout de suite)' : 'gratuit'}</span><span class="muted small">${day(t.started_at)}</span></li>`)}</ul>` : html`<p class="muted small">Aucun essai.</p>`}
        <p class="muted small">${accountDevices.length} PC vu${accountDevices.length > 1 ? 's' : ''} dans l’app avec ce compte${accountDevices.length ? `, dernier ${ago(accountDevices[0].seen_at)}` : ''}.</p>`)}
    </div>

    ${panel('Historique', eventsTable(events, { withUser: false }))}

    <section class="net-panel adm-panel adm-danger">
      <h2 class="h2">Supprimer le compte (RGPD)</h2>
      <p class="muted small">Arrête l’abonnement Stripe, efface le compte, le PC, les sessions, la photo et l’avis. Les licences restent, sans nom, pour la comptabilité. Irréversible.</p>
      ${actionForm(act('supprimer'), 'Supprimer définitivement', { kind: 'danger', fields: html`<input class="adm-input" name="confirmation" placeholder="recopie ${u.email}" required autocomplete="off" aria-label="Recopie l’e-mail du compte">`, confirm: `Supprimer définitivement ${u.email} ?` })}
    </section>`;
  return shell(nav, 'joueurs', u.email, body);
}

function eventsTable(rows, { withUser = true } = {}) {
  if (!rows.length) return html`<p class="muted small">Rien pour l’instant.</p>`;
  return html`<div class="net-scroll"><table class="net-table adm-table adm-events"><tbody>${rows.map((e) => {
    const who = e.owner || e.user_id;
    const email = e.email || e.license_email;
    return html`<tr><td class="mono">${short(e.at)}</td><th scope="row">${eventLabel(e.type)}</th>
      ${withUser ? html`<td>${who && email ? html`<a href="/admin/utilisateurs/${who}">${email}</a>` : email ? html`<span class="muted">${email}</span>` : ''}</td>` : ''}
      <td class="muted small">${eventDetail(e.detail)}</td></tr>`;
  })}</tbody></table></div>`;
}

// ---------- gifts and purchases nobody holds ----------
export function purchasesPage(nav, { rows, link, results, error, notice }) {
  const body = html`
    ${head('Admin · Offrir et achats', 'Offrir Premium.', 'À un ou plusieurs e-mails, avec ou sans compte. Sans compte, un lien permet de le créer : la licence suit.')}
    ${alertBox(error)}${alertBox(notice === 'deja' ? 'Cette licence est déjà sur un compte.' : '', 'ok')}${copyLink(link)}
    ${results ? panel('Résultat', html`<ul class="adm-list">${results.map((r) => html`<li><span>${r.userId ? html`<a href="/admin/utilisateurs/${r.userId}">${r.email}</a>` : r.email}</span><span class="${r.ok ? '' : 'muted '}small">${r.text}</span>
        ${r.url ? html`<span class="row"><code class="mono adm-code">${r.url}</code><button class="btn btn-ghost btn-sm" type="button" data-copy="${r.url}">${ICON.copy}<span>Copier</span></button></span>` : ''}</li>`)}</ul>
        <p class="muted small">Les liens (création du compte) sont affichés une seule fois.</p>`) : ''}
    ${panel('Offrir Premium', html`<form method="post" action="/admin/offrir" class="form adm-form" data-busy="Envoi…">
        <div class="field"><label class="field-label" for="f-emails">E-mails</label><textarea id="f-emails" name="emails" rows="3" required placeholder="un ou plusieurs, séparés par des espaces, virgules ou retours à la ligne"></textarea></div>
        <div class="row"><input class="adm-input adm-input-sm" name="nombre" type="number" min="1" max="3650" value="7" aria-label="Nombre">
          <select class="adm-input adm-input-sm" name="unite" aria-label="Durée"><option value="jours">jours</option><option value="mois">mois</option><option value="vie">à vie</option></select>
          <input class="adm-input" name="note" placeholder="note (facultatif, ex. créateur, concours)" maxlength="80" aria-label="Note">
          <button class="btn btn-primary btn-sm" type="submit">Offrir</button></div>
        <p class="field-hint">Un e-mail qui a déjà Premium, ou une licence qui l’attend, n’est pas touché. Pour ajouter du temps à un joueur Premium, ouvre sa fiche.</p>
      </form>`)}
    ${panel('Achats et cadeaux pas encore sur un compte', rows.length ? html`<div class="net-scroll"><table class="net-table adm-table">
        <thead><tr><th scope="col">E-mail</th><th scope="col">Offre</th><th scope="col">Source</th><th scope="col">Date</th><th scope="col">Identifiant</th><th scope="col"></th></tr></thead>
        <tbody>${rows.map((l) => html`<tr><th scope="row">${l.account_id ? html`<a href="/admin/utilisateurs/${l.account_id}">${l.email}</a> <span class="muted small">(a un compte : Rattacher sur sa fiche)</span>` : l.email}</th>
          <td>${PLAN[l.plan] || l.plan}${l.amount ? ` · ${money(l.amount, l.currency)}` : ''}</td><td>${SOURCE[l.source] || l.source}</td><td class="mono">${day(l.created_at)}</td><td class="mono small">${l.id}</td>
          <td>${actionForm(`/admin/achats/${l.id}/lien`, 'Nouveau lien', { confirm: 'Créer un nouveau lien ? L’ancien ne marchera plus.' })}</td></tr>`)}</tbody></table></div>`
      : html`<p class="muted small">Aucun : tous les achats sont sur un compte.</p>`)}`;
  return shell(nav, 'achats', 'Offrir et achats', body);
}

// ---------- sales ----------
function salesTable(rows, dash) {
  if (!rows.length) return html`<p class="muted small">Aucun paiement.</p>`;
  return html`<div class="net-scroll"><table class="net-table adm-table">
    <thead><tr><th scope="col">Date</th><th scope="col">Client</th><th scope="col">Type</th><th scope="col">Montant</th><th scope="col">État</th></tr></thead>
    <tbody>${rows.map((x) => html`<tr><td class="mono">${short(x.at)}</td>
      <th scope="row">${x.email ? html`<a href="/admin/utilisateurs?q=${encodeURIComponent(x.email)}">${x.email}</a>` : html`<span class="muted">${x.customer || '?'}</span>`}</th>
      <td>${x.kind === 'abonnement' ? 'Abonnement' : 'Paiement unique'}</td>
      <td class="mono">${money(x.amount, x.currency)}</td>
      <td>${x.failed ? html`<span class="badge badge-red"><i></i>Échoué</span>` : x.disputed ? html`<span class="badge badge-red"><i></i>Litige</span>`
        : x.refunded >= x.amount ? html`<span class="badge badge-off"><i></i>Remboursé</span>` : x.refunded ? html`<span class="badge badge-wait"><i></i>Remb. ${money(x.refunded, x.currency)}</span>`
        : html`<span class="badge badge-ok"><i></i>Payé</span>`}
        ${dash ? html` <a class="small" href="${dash}/payments/${x.id}" rel="noopener">Stripe</a>` : ''}</td></tr>`)}</tbody></table></div>`;
}

export function salesPage(nav, { sales: s, counts: k, dashboard }) {
  if (s.error) return shell(nav, 'ventes', 'Ventes', html`${head('Admin · Ventes', 'Ventes.', '')}${alertBox(s.error)}`);
  const p = s.periods;
  const cur = s.currency;
  const sub = s.subscriptions;
  const body = html`
    ${head(`Admin · Ventes · Stripe ${nav.mode || ''}`, 'Ventes.', `Encaissé (remboursements déduits, avant frais Stripe), heure de Paris. Lu dans Stripe ${ago(s.at)}.`,
      html`<a class="btn btn-ghost btn-sm" href="/admin/ventes?frais=1">Actualiser</a><a class="btn btn-ghost btn-sm" href="${dashboard}/payments" rel="noopener">Ouvrir Stripe</a>`)}
    ${s.truncated ? alertBox('Plus de 5 000 paiements : seuls les 5 000 plus récents sont comptés.') : ''}
    ${panel('Encaissé', html`${tiles([
      ['Aujourd’hui', moneyMap(p.today.net, cur), `${p.today.count} paiement${p.today.count > 1 ? 's' : ''}`],
      ['Hier', moneyMap(p.yesterday.net, cur), `${p.yesterday.count}`],
      ['7 derniers jours', moneyMap(p.week.net, cur), `${p.week.count}`],
      ['Ce mois', moneyMap(p.month.net, cur), `${p.month.count}`],
      ['Mois dernier', moneyMap(p.lastMonth.net, cur), `${p.lastMonth.count}`],
      ['Depuis le début', moneyMap(p.total.net, cur), `${p.total.count} paiements · ${moneyMap(p.total.refunded, cur)} remboursés`],
    ])}${chart(s)}`)}
    <div class="adm-grid">
      ${panel('Reçu sur le compte Stripe', s.received ? tiles([
        ['Aujourd’hui', moneyMap(s.received.today.net, 'eur')], ['Ce mois', moneyMap(s.received.month.net, 'eur')],
        ['Depuis le début', moneyMap(s.received.total.net, 'eur'), `frais Stripe : ${moneyMap(s.received.total.fee, 'eur')}`],
      ]) : html`<p class="muted small">Solde Stripe illisible avec cette clé.</p>`)}
      ${panel('Par type', tiles([
        ['Abonnements', moneyMap(s.byKind.abonnement.net, cur), `${s.byKind.abonnement.count} paiements`],
        ['Paiements uniques (à vie)', moneyMap(s.byKind.unique.net, cur), `${s.byKind.unique.count} paiements`],
        s.failed ? ['Paiements échoués (7 j)', num(s.failed)] : null,
      ]))}
    </div>
    ${sub ? panel('Abonnements', html`${tiles([
        ['Actifs', num(sub.active)], ['En essai', num(sub.trialing)], ['Impayés', num(sub.pastDue)], ['Résiliés (fin de période)', num(sub.canceling)],
        ['Revenu mensuel récurrent', moneyMap(sub.mrr, cur), 'abonnements actifs non résiliés, ramenés au mois'],
        ['Licences dans la base', num(k.lic.month + k.lic.year), `${num(k.lic.month)} mensuelles · ${num(k.lic.year)} annuelles · ${num(k.lic.lifetime)} à vie`],
      ])}
      ${sub.renewals.length ? html`<h3 class="small adm-sub">Renouvellements des 7 prochains jours</h3><ul class="adm-list">${sub.renewals.map((r) => html`<li><span class="mono">${day(r.at)}</span><span>${r.interval === 'year' ? 'Annuel' : r.interval === 'month' ? 'Mensuel' : ''}</span>
        <a class="small" href="/admin/utilisateurs?q=${r.id}">Voir le joueur</a> <a class="small" href="${dashboard}/subscriptions/${r.id}" rel="noopener">Stripe</a></li>`)}</ul>` : ''}`) : ''}
    ${panel('Derniers paiements', salesTable(s.sales.slice(0, 100), dashboard))}`;
  return shell(nav, 'ventes', 'Ventes', body);
}

// ---------- services ----------
export function servicesPage(nav, { services: sv }) {
  const stripe = sv.list.find((x) => x.id === 'stripe')?.stripe;
  const discord = sv.list.find((x) => x.id === 'discord')?.discord;
  const community = sv.list.find((x) => x.id === 'community')?.community;
  const body = html`
    ${head('Admin · Services', 'Services.', `Vérifiés ${ago(sv.at)} depuis ce serveur. Railway, Supabase, Netlify, Stripe, Resend et Discord n’ont rien à installer : le serveur les interroge avec ses propres variables.`,
      html`<a class="btn btn-ghost btn-sm" href="/admin/services?frais=1">Vérifier maintenant</a>`)}
    ${panel('État', serviceList(sv.list))}
    ${sv.warnings.length ? panel('Avertissements du démarrage', html`<ul class="adm-list adm-warnings">${sv.warnings.map((w) => html`<li class="small">${w}</li>`)}</ul>
      <p class="muted small">Les mêmes lignes [warn] que dans les logs Railway.</p>`) : ''}
    <div class="adm-grid">
      ${stripe ? html`<section class="net-panel adm-panel">${stripeSection(stripe)}</section>` : ''}
      ${discord ? html`<section class="net-panel adm-panel">${discordSection(discord)}</section>` : ''}
      ${community ? html`<section class="net-panel adm-panel">${communitySection(community)}</section>` : ''}
    </div>
    <p class="muted small">Pas encore surveillés d’ici : les serveurs Rago Route (Vultr) et la facturation de Railway, Supabase et Netlify (à voir sur leurs sites).</p>`;
  return shell(nav, 'services', 'Services', body);
}

// ---------- journal ----------
const TYPE_LABEL = { tout: 'Tout', admin: 'Actions admin', achats: 'Licences', comptes: 'Comptes', pc: 'PC', abonnements: 'Abonnements', affiliation: 'Affiliation' };
export function journalPage(nav, { rows, type, types }) {
  const last = rows[rows.length - 1];
  const body = html`
    ${head('Admin · Journal', 'Journal.', 'Tout ce qui arrive aux comptes et licences, et chaque action faite ici. Gardé 12 mois.')}
    <nav class="tabs adm-tabs" aria-label="Type">${types.map((t) => html`<a href="/admin/journal${t === 'tout' ? '' : `?type=${t}`}" ${t === type ? html`aria-current="page"` : ''}>${TYPE_LABEL[t]}</a>`)}</nav>
    ${panel('Événements', eventsTable(rows))}
    ${rows.length === 100 ? html`<a class="btn btn-ghost btn-sm" href="/admin/journal?${new URLSearchParams({ ...(type !== 'tout' ? { type } : {}), avant: String(last.id) })}">Plus anciens</a>` : ''}`;
  return shell(nav, 'journal', 'Journal', body);
}

// ---------- site: pop-up, promotion codes, reviews ----------
export function sitePage(nav, { popup, reviews, notice, promoError }) {
  const code = notice === 'code';
  const body = html`
    ${head('Admin · Site et promos', 'Site et promos.', 'La pop-up de réduction du site, les codes promo Stripe et les avis affichés sur le site.')}
    <div class="adm-split">
      <div class="adm-col">${popup.aside}</div>
      <section class="net-panel adm-panel">${popup.form}</section>
    </div>
    ${panel('Créer un code promo', html`${alertBox(promoError)}${code ? alertBox('Code créé dans Stripe. À taper au paiement, ou à partager avec un lien /buy?promo=CODE.', 'ok') : ''}
      <form method="post" action="/admin/code-promo" class="row adm-form" data-busy="Création…">
        <input class="adm-input mono" name="code" placeholder="RAGO15" maxlength="40" required aria-label="Code">
        <input class="adm-input adm-input-sm" name="pourcent" type="number" min="1" max="99" step="any" placeholder="%" required aria-label="Réduction en pourcentage">
        <select class="adm-input adm-input-sm" name="duree" aria-label="Durée"><option value="once">premier paiement</option><option value="forever">chaque paiement</option></select>
        <button class="btn btn-primary btn-sm" type="submit">Créer</button>
      </form><p class="field-hint">Réservé aux nouveaux clients, dans le mode de la clé Stripe (${nav.mode || 'non configuré'}).</p>`)}
    ${panel('Avis', reviews.length ? html`<div class="net-scroll"><table class="net-table adm-table">
        <thead><tr><th scope="col">Joueur</th><th scope="col">Note</th><th scope="col">Avis</th><th scope="col">Date</th><th scope="col">Site</th></tr></thead>
        <tbody>${reviews.map((r) => html`<tr><th scope="row"><a href="/admin/utilisateurs/${r.uid}">${r.display_name || r.email}</a></th><td class="mono">${r.rating}/5</td>
          <td class="adm-wrap small">${r.comment}</td><td class="mono">${day(r.updated_at)}</td>
          <td>${actionForm(`/admin/utilisateurs/${r.uid}/avis`, r.status === 'published' ? 'Masquer' : 'Afficher', { fields: hiddenInput('statut', r.status === 'published' ? 'masquer' : 'afficher') })}</td></tr>`)}</tbody></table></div>`
      : html`<p class="muted small">Pas encore d’avis : le site cache sa section Avis.</p>`)}`;
  return shell(nav, 'site', 'Site et promos', body);
}

export const withNavHtml = (nav, current) => navBar(nav, current);
export { raw, field, DAY };
