// Server-rendered account pages. Copy follows /brand/voice-en.md, look follows brand kit v1.1.
import { maskLicenseKey } from './crypto.js';

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const escape = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const render = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(render).join('') : escape(v));
export const html = (strings, ...vals) => new Raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? render(vals[i]) : ''), ''));

const WORDMARK = html`<img class="wordmark" src="/assets/wordmark.svg?v=2" alt="Rago Optimizer" width="150" height="24">`;

const svg = (d, w = 1.6) => html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON = {
  check: svg('M3.5 8.5l3 3 6-7'),
  download: svg('M8 2.5v7.5m0 0L4.8 6.8M8 10l3.2-3.2M3 13.2h10'),
  copy: svg('M6 5.5h6a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 12 13.5H7A1.5 1.5 0 0 1 5.5 12V6M3.5 10V4A1.5 1.5 0 0 1 5 2.5h5', 1.4),
  pc: svg('M3 2.8h10a1.5 1.5 0 0 1 1.5 1.5v5.4a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V4.3A1.5 1.5 0 0 1 3 2.8zM5.5 14h5M8 11.2V14', 1.4),
  alert: svg('M8 2.2l6 10.6a.8.8 0 0 1-.7 1.2H2.7a.8.8 0 0 1-.7-1.2zM8 6.5v3M8 11.6v.1', 1.4),
  arrow: svg('M3 8h10m0 0L9 4m4 4l-4 4'),
  card: svg('M2.5 4h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM1.5 6.8h13', 1.4),
  users: svg('M6 7.5a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6zM1.8 13.5c.4-2.3 2.1-3.6 4.2-3.6s3.8 1.3 4.2 3.6M10.6 3a2.2 2.2 0 0 1 0 4.4M12.2 9.9c1.2.4 1.9 1.6 2.1 3.6', 1.4),
  clock: svg('M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 4.5V8l2.5 1.5', 1.4),
  infinity: svg('M8 8c-1.4-2-2.6-3-4-3a3 3 0 0 0 0 6c1.4 0 2.6-1 4-3zm0 0c1.4 2 2.6 3 4 3a3 3 0 0 0 0-6c-1.4 0-2.6 1-4 3z', 1.4),
};

const pulse = html`<div class="pulse" aria-hidden="true"><i></i><i></i><i></i><b></b></div>`;

const STEPS = ['Pay', 'Your account', 'Download', 'Activate'];
function steps(current) {
  return html`<ol class="steps" aria-label="Progress">${STEPS.map((label, i) => html`
    <li class="${i < current ? 'done' : i === current ? 'now' : ''}" ${i === current ? html`aria-current="step"` : ''}>
      <span class="steps-dot">${i < current ? ICON.check : String(i + 1)}</span><span>${label}</span>
    </li>`)}</ol>`;
}

/** "Contact support on Discord" as a link: Discord when configured, else the site's FAQ. */
export const supportLink = (cfg, label = 'Contact support on Discord') =>
  html`<a href="${cfg.supportUrl || `${cfg.siteUrl}/#faq`}" rel="noopener">${label}</a>`;

/**
 * @param buy show Pricing and "Get Premium" in the header (visitors and free accounts)
 */
function page({ title, body, user, cfg, bodyClass = '', nav = '', cta = { href: '/login', label: 'Sign in' }, buy = !user }) {
  const pricing = `${cfg.siteUrl}/#pricing`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A0A0B">
<meta name="robots" content="noindex">
<title>${escape(String(title).replace(/\.$/, ''))} · Rago Optimizer</title>
<link rel="icon" href="/assets/favicon.ico?v=3" sizes="any">
<link rel="icon" href="/assets/favicon.svg?v=3" type="image/svg+xml">
<link rel="icon" href="/assets/favicon-32.png?v=3" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=3">
<link rel="preload" href="/assets/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/tokens.css">
<link rel="stylesheet" href="/assets/account.css">
<script src="/assets/account.js" defer></script>
</head>
<body class="${escape(bodyClass)}">
<div class="bg" aria-hidden="true"><span></span><span></span></div>
<header class="top">
  <a class="brand" href="${escape(cfg.siteUrl)}/" aria-label="Rago Optimizer home">${render(WORDMARK)}</a>
  ${buy ? render(html`<a class="top-link" href="${pricing}">Pricing</a><a class="btn btn-primary btn-sm top-buy" href="${pricing}">Get Premium</a>`) : ''}
  ${user ? render(html`<nav class="tabs" aria-label="Account">
      <a href="/account" ${nav === 'account' ? html`aria-current="page"` : ''}>Account</a>
      <a href="/affiliate" ${nav === 'affiliate' ? html`aria-current="page"` : ''}>Affiliate</a>
    </nav>
    <div class="top-user"><span class="top-email">${user.email}</span>
    <form method="post" action="/logout"><button class="btn btn-ghost btn-sm" type="submit">Sign out</button></form></div>`)
    : render(html`<a class="btn btn-ghost btn-sm" href="${cta.href}">${cta.label}</a>`)}
</header>
${render(body)}
<footer class="foot">
  <span class="foot-links"><a href="/affiliate">Affiliate program</a><a href="${escape(cfg.siteUrl)}/terms.html">Terms</a><a href="${escape(cfg.siteUrl)}/privacy.html">Privacy</a><a href="${escape(cfg.siteUrl)}/refunds.html">Refunds</a>${cfg.portalLoginUrl ? render(html`<a href="${cfg.portalLoginUrl}" rel="noopener">Cancel subscription</a>`) : ''}${cfg.supportUrl ? render(html`<a href="${cfg.supportUrl}" rel="noopener">Support on Discord</a>`) : ''}</span>
  <p class="foot-legal">© ${new Date().getUTCFullYear()} Rago Optimizer. Every millisecond counts. Rago Optimizer changes Windows settings on your PC. It isn't affiliated with Mojang or Microsoft.</p></footer>
</body>
</html>`;
}

const field = ({ label, name, type = 'text', value = '', autocomplete, hint, attrs = '', required = true }) => html`
  <div class="field">
    <label class="field-label" for="f-${name}">${label}</label>
    <span class="field-box">
      <input id="f-${name}" name="${name}" type="${type}" value="${value}" ${autocomplete ? html`autocomplete="${autocomplete}"` : ''} ${required ? html`required` : ''} ${hint ? html`aria-describedby="f-${name}-hint"` : ''} ${new Raw(attrs)}>
      ${type === 'password' ? html`<button class="field-eye" type="button" data-reveal aria-controls="f-${name}" aria-pressed="false" aria-label="Show password">Show</button>` : ''}
    </span>
    ${hint ? html`<span class="field-hint" id="f-${name}-hint">${hint}</span>` : ''}
  </div>`;
const referralField = (code) => field({ label: 'Referral code (optional)', name: 'code', value: code, autocomplete: 'off', required: false,
  hint: "Got a code from another player? Enter it now. You can't add it later.", attrs: 'maxlength="16" spellcheck="false" autocapitalize="characters" class="mono"' });

const hidden = (name, value) => (value ? html`<input type="hidden" name="${name}" value="${value}">` : '');

const alertBox = (msg, kind = 'error') => msg ? html`<div class="alert alert-${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${kind === 'error' ? ICON.alert : ICON.check}<span>${msg}</span></div>` : '';

// Two-column layout for the sign-up / sign-in flow: story on the left, form on the right.
function split({ step, aside, form }) {
  return html`<main class="split">
    <section class="split-aside">
      ${pulse}
      ${aside}
      ${step == null ? '' : html`<div class="rise d4">${steps(step)}</div>`}
    </section>
    <section class="split-form"><div class="panel rise d2">${form}</div></section>
  </main>`;
}

const qs = (next) => (next ? `?next=${encodeURIComponent(next)}` : '');

export function signupPage(cfg, { email = '', error, purchased = false, claimEmail, next, code = '' } = {}) {
  const aside = purchased
    ? html`<p class="overline rise">Rago Optimizer Premium</p>
       <h1 class="display rise d1">Payment confirmed.</h1>
       <p class="lede rise d2">Create your account to get your license. You'll use the same email and password to sign in to Rago Optimizer.</p>`
    : next === '/affiliate'
      ? html`<p class="overline rise">Affiliate program</p>
         <h1 class="display rise d1">Create your account.</h1>
         <p class="lede rise d2">Then join the program to get your referral code. No purchase needed.</p>`
      : html`<p class="overline rise">Rago Optimizer account</p>
         <h1 class="display rise d1">Create your account.</h1>
         <p class="lede rise d2">Your downloads, your Premium license and your PC live here. The free version needs no account.</p>`;
  const form = html`
    <h2 class="h2">Create account</h2>
    ${alertBox(error)}
    <form method="post" action="/signup" class="form" data-busy="Creating account…">
      ${field({ label: 'Email', name: 'email', type: 'email', value: email || claimEmail || '', autocomplete: 'email' })}
      ${field({ label: 'Password', name: 'password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters.', attrs: 'minlength="8"' })}
      ${purchased ? referralField(code) : ''}
      ${hidden('next', next)}
      <button class="btn btn-primary btn-block" type="submit">Create account</button>
    </form>
    <p class="muted small">Already have an account? <a href="/login${qs(next)}">Sign in</a>${purchased ? ' and your license is added to it.' : '.'}</p>`;
  return page({ title: 'Create account', cfg, buy: !purchased, bodyClass: purchased ? 'is-purchase' : '', body: split({ step: purchased ? 1 : null, aside, form }) });
}

export function loginPage(cfg, { email = '', error, notice, purchased = false, next, code = '' } = {}) {
  const aside = next === '/affiliate' && !purchased
    ? html`<p class="overline rise">Affiliate program</p>
      <h1 class="display rise d1">Welcome back.</h1>
      <p class="lede rise d2">Sign in to get your referral code and follow your progress.</p>`
    : html`<p class="overline rise">${purchased ? 'Rago Optimizer Premium' : 'Rago Optimizer account'}</p>
      <h1 class="display rise d1">${purchased ? 'Payment confirmed.' : 'Welcome back.'}</h1>
      <p class="lede rise d2">${purchased ? 'Sign in and we add the license to your account.' : 'Sign in to get your license key and download Rago Optimizer.'}</p>`;
  const form = html`
    <h2 class="h2">Sign in</h2>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    <form method="post" action="/login" class="form" data-busy="Signing in…">
      ${field({ label: 'Email', name: 'email', type: 'email', value: email, autocomplete: 'email' })}
      ${field({ label: 'Password', name: 'password', type: 'password', autocomplete: 'current-password' })}
      ${purchased ? referralField(code) : ''}
      ${hidden('next', next)}
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    </form>
    <p class="muted small"><a href="/forgot">Forgot your password?</a> · No account? <a href="/signup${qs(next)}">Create account</a></p>`;
  return page({ title: 'Sign in', cfg, buy: !purchased, bodyClass: purchased ? 'is-purchase' : '', cta: { href: `/signup${qs(next)}`, label: 'Create account' }, body: split({ step: purchased ? 1 : null, aside, form }) });
}

export function forgotPage(cfg, { sent = false, email = '' } = {}) {
  const noMail = html`<p class="muted">Emails aren't switched on yet. ${supportLink(cfg, 'Ask on Discord')} and we'll reset it for you.</p>`;
  const form = sent
    ? html`<h2 class="h2">Check your inbox</h2>
      ${cfg.mailEnabled
        ? html`<p class="muted">If an account exists for ${email ? html`<strong>${email}</strong>` : 'that email'}, a reset link is on its way. It works for 1 hour.</p>
          <p class="muted small">Nothing after 5 minutes? Check your spam folder, or ${supportLink(cfg, 'ask on Discord')}.</p>`
        : noMail}
      <p class="small"><a href="/login">Back to sign in</a></p>`
    : !cfg.mailEnabled
      ? html`<h2 class="h2">Reset your password</h2>${noMail}<p class="muted small"><a href="/login">Back to sign in</a></p>`
    : html`<h2 class="h2">Reset your password</h2>
      <form method="post" action="/forgot" class="form" data-busy="Sending…">
        ${field({ label: 'Email', name: 'email', type: 'email', value: email, autocomplete: 'email' })}
        <button class="btn btn-primary btn-block" type="submit">Send reset link</button>
      </form><p class="muted small"><a href="/login">Back to sign in</a></p>`;
  const aside = sent && cfg.mailEnabled
    ? html`<p class="overline rise">Rago Optimizer account</p><h1 class="display rise d1">Check your inbox.</h1>
      <p class="lede rise d2">Open the link in the email to choose a new password.</p>`
    : html`<p class="overline rise">Rago Optimizer account</p><h1 class="display rise d1">Forgot your password?</h1>
      <p class="lede rise d2">Enter the email of your account and we'll send you a link to choose a new one.</p>`;
  return page({ title: 'Reset password', cfg, body: split({ aside, form }) });
}

export function resetPage(cfg, { token, error, email = '' } = {}) {
  const aside = html`<p class="overline rise">Rago Optimizer account</p><h1 class="display rise d1">Choose a new password.</h1>
    <p class="lede rise d2">You'll be signed out everywhere else. Rago Optimizer stays activated on your PC.</p>`;
  const form = html`<h2 class="h2">New password</h2>${alertBox(error)}
    <form method="post" action="/reset/${token}" class="form" data-busy="Saving…">
      ${email ? html`<input type="email" name="email" value="${email}" autocomplete="username" hidden>` : ''}
      ${field({ label: 'New password', name: 'password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters.', attrs: 'minlength="8"' })}
      <button class="btn btn-primary btn-block" type="submit">Save password</button>
    </form>`;
  return page({ title: 'New password', cfg, body: split({ aside, form }) });
}

export function passwordPage(cfg, { user, error } = {}) {
  const aside = html`<p class="overline rise">Your account</p><h1 class="display rise d1">Change your password.</h1>
    <p class="lede rise d2">You'll be signed out everywhere else. Rago Optimizer stays activated on your PC.</p>`;
  const form = html`<h2 class="h2">New password</h2>${alertBox(error)}
    <form method="post" action="/account/password" class="form" data-busy="Saving…">
      <input type="email" name="email" value="${user.email}" autocomplete="username" hidden>
      ${field({ label: 'Current password', name: 'current', type: 'password', autocomplete: 'current-password' })}
      ${field({ label: 'New password', name: 'password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters.', attrs: 'minlength="8"' })}
      <button class="btn btn-primary btn-block" type="submit">Save password</button>
    </form>
    <p class="muted small"><a href="/account">Back to your account</a> · <a href="/forgot">Forgot it?</a></p>`;
  return page({ title: 'Change password', cfg, user, nav: 'account', body: split({ aside, form }) });
}

/** Information page. Always offers a way out: the main action if any, back to the site, Discord. */
export function messagePage(cfg, { title, text, action, user, step, overline = 'Rago Optimizer' }) {
  const aside = html`<p class="overline rise">${overline}</p><h1 class="display rise d1">${title}</h1><p class="lede rise d2">${text}</p>
    <div class="row rise d3">
      ${action ? html`<a class="btn btn-primary" href="${action.href}">${action.label}</a>` : ''}
      <a class="btn btn-ghost" href="${cfg.siteUrl}/">Back to Rago Optimizer</a>
      ${cfg.supportUrl ? html`<a class="btn btn-ghost" href="${cfg.supportUrl}" rel="noopener">Ask on Discord</a>` : ''}
    </div>`;
  return page({ title, cfg, user, body: html`<main class="split split-solo"><section class="split-aside">
    ${pulse}${aside}${step == null ? '' : html`<div class="rise d4">${steps(step)}</div>`}</section></main>` });
}

const fmtDate = (ms) => new Date(Number(ms)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
function ago(ms, now = Date.now()) {
  const m = Math.round((now - ms) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return fmtDate(ms);
}

const PLAN = { month: 'Monthly', year: 'Yearly', lifetime: 'Lifetime' };
const pricingUrl = (cfg) => (cfg.subscriptions ? `${cfg.siteUrl}/#pricing` : '/buy');

/**
 * Circular progress: counted players in solid red, players who used the code but don't count yet
 * (hold period, not activated) in a pulsing lighter arc, so a new referral shows right away.
 * Arc lengths are SVG attributes, so the strict CSP allows them.
 */
function ring(value, goal, size = 'lg', pending = 0) {
  const c = 2 * Math.PI * 42;
  const shown = Math.min(value, goal);
  const reach = Math.min(value + pending, goal);
  // Nobody yet: a ghost arc sweeps to the first slot and back, so the ring never sits still.
  const idle = reach === 0;
  return html`<div class="ring ring-${size}${value >= goal ? ' ring-full' : ''}${idle ? ' ring-idle' : ''}" role="img" aria-label="${shown} of ${goal} counted${pending ? `, ${pending} waiting` : ''}">
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="42"/>
      ${idle ? html`<circle class="ring-ghost" cx="50" cy="50" r="42" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}"/>` : ''}
      ${reach > shown ? html`<circle class="ring-pend" cx="50" cy="50" r="42" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - reach / goal)).toFixed(2)}"/>` : ''}
      ${shown ? html`<circle class="ring-bar" cx="50" cy="50" r="42" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - shown / goal)).toFixed(2)}"/>` : ''}</svg>
    <span class="ring-num"><b data-count="${shown}">${shown}</b><small>/${goal}</small></span>
  </div>`;
}

function slots(value, goal, pending = 0) {
  return html`<ol class="slots${value >= goal ? ' slots-full' : ''}${value + pending === 0 ? ' slots-idle' : ''}" aria-hidden="true">${Array.from({ length: goal }, (_, i) => (i < value
    ? html`<li class="on">${ICON.check}</li>`
    : i < value + pending ? html`<li class="wait">${ICON.clock}</li>` : html`<li>${String(i + 1)}</li>`))}</ol>`;
}

export function dashboardPage(cfg, { user, license, device, notice, error, canReset, nextResetAt, affiliate }) {
  const active = license?.status === 'active';
  const reason = license?.status_reason;
  const ended = !active && reason === 'subscription_ended';
  const subscription = license && (license.plan === 'month' || license.plan === 'year');
  const canceling = active && subscription && license.cancel_at_period_end;
  // The 4 steps only make sense for a working license; a free or ended account gets no stepper.
  const stepIndex = active ? (device ? 4 : 2) : null;
  const support = supportLink(cfg);
  const buyUrl = pricingUrl(cfg);
  const unlocks = `Premium unlocks all ${cfg.premiumTweaks} tweaks and every preset. The free version keeps ${cfg.freeTweaks}.`;

  const portalButton = (label, cls = 'btn-ghost') => (license?.stripe_customer_id && license.stripe_subscription_id
    ? html`<form method="post" action="/account/billing" class="inline" data-busy="Opening…"><button class="btn ${cls} btn-sm" type="submit">${ICON.card}<span>${label}</span></button></form>` : '');

  const howto = html`<ol class="howto">
        <li><span class="howto-n mono">1</span><span>Run the installer. Windows SmartScreen may ask you to confirm: click <strong>More info</strong>, then <strong>Run anyway</strong>.</span></li>
        ${active
          ? html`<li><span class="howto-n mono">2</span><span>Sign in to Rago Optimizer with <strong>${user.email}</strong>.</span></li>
            <li><span class="howto-n mono">3</span><span>Activate it. Your license is locked to that PC.</span></li>`
          : html`<li><span class="howto-n mono">2</span><span>Open Rago Optimizer. The free tweaks work right away, no sign-in needed.</span></li>`}
      </ol>`;
  const version = cfg.installerVersion ? html` <span class="mono chip">v${cfg.installerVersion}</span>` : '';

  // Premium players get the Discord role by showing their account email to staff.
  const discord = active && cfg.supportUrl ? html`<div class="discord">
      <span class="plan-icon">${ICON.users}</span>
      <div><strong>Premium channel on Discord</strong>
        <p class="muted small">Join the server and open a ticket with your account email, <strong>${user.email}</strong>. Staff check your license and give you the Premium role.</p>
        <a class="link-arrow" href="${cfg.supportUrl}" rel="noopener">Open Discord ${ICON.arrow}</a></div>
    </div>` : '';

  const download = () => html`<article class="card card-hero rise d1">
      <p class="overline">Rago Optimizer for Windows</p>
      <h2 class="h1">Download Rago Optimizer for Windows</h2>
      <p class="muted">Windows 10 and 11, 64-bit.${version}</p>
      <a class="btn btn-primary btn-lg" href="/account/download" data-download>${ICON.download}<span>Download Rago Optimizer</span></a>
      ${howto}
      ${discord}
    </article>`;

  // Premium stopped (ended, refunded, revoked): the way back comes first.
  const comeBack = () => html`<article class="card card-hero rise d1">
      <p class="overline">Rago Optimizer Premium</p>
      <h2 class="h1">${ended ? 'Renew Premium' : 'Get Premium again'}</h2>
      <p class="muted">Rago Optimizer now runs as the free version on your PC. ${unlocks}</p>
      <div class="row"><a class="btn btn-buy btn-lg" href="${buyUrl}">${ended ? 'Renew Premium' : 'Get Premium'} ${ICON.arrow}</a>
        <a class="btn btn-ghost btn-lg" href="/account/download" data-download>${ICON.download}<span>Download the free version</span></a></div>
      <p class="muted small">Windows 10 and 11, 64-bit.${version}</p>
      ${howto}
    </article>`;

  const OFF = { subscription_ended: 'Ended', refunded: 'Refunded', disputed: 'Disputed' };
  const offBadge = () => OFF[reason] || 'Revoked';
  const licenseCard = () => html`<article class="card rise d2">
      <div class="card-head"><p class="overline">License key</p>
        ${active ? html`<span class="badge badge-ok"><i></i>Active</span>` : html`<span class="badge badge-off"><i></i>${offBadge()}</span>`}</div>
      <div class="key">
        <code class="mono" data-key="${license.key}" data-masked="${maskLicenseKey(license.key)}">${maskLicenseKey(license.key)}</code>
        <span class="key-actions">
          <button class="btn btn-ghost btn-sm" type="button" data-reveal-key>Show</button>
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${license.key}">${ICON.copy}<span>Copy</span></button>
        </span>
      </div>
      <dl class="meta">
        <div><dt>Plan</dt><dd>Rago Optimizer Premium · ${PLAN[license.plan] || 'Lifetime'}</dd></div>
        <div><dt>Since</dt><dd>${fmtDate(license.created_at)}</dd></div>
      </dl>
      ${active || ended ? '' : html`<p class="muted small">This license no longer works in Rago Optimizer. ${support} if you think that's a mistake.</p>`}
    </article>`;

  const deviceCard = () => html`<article class="card rise d3">
      <div class="card-head"><p class="overline">Device</p>
        <span class="mono small muted">${device && active ? '1 / 1' : '0 / 1'}</span></div>
      ${device
        ? html`<div class="device"><span class="device-icon">${ICON.pc}</span><div><strong>${device.name}</strong>
            <p class="muted small">${device.os || 'Windows'}${device.app_version ? ` · Rago Optimizer ${device.app_version}` : ''}</p></div></div>
          <p class="small">${active ? 'This license is active on 1 device.' : 'This PC was linked to the license. It now runs the free version.'}</p>
          <dl class="meta">
            <div><dt>Activated</dt><dd>${fmtDate(device.bound_at)}</dd></div>
            <div><dt>Last seen</dt><dd>${ago(device.last_seen_at)}</dd></div>
          </dl>
          ${!active ? '' : canReset
            ? html`<form method="post" action="/account/reset-device" class="inline" data-confirm="Free this license? Rago Optimizer signs out on ${device.name} and you can activate another PC. You can do this once every ${cfg.selfServiceResetDays} days.">
                <button class="btn btn-ghost btn-sm" type="submit">Use on another PC</button></form>`
            : html`<p class="muted small">Changed PCs? ${support}.${nextResetAt ? html` You can free it yourself from ${fmtDate(nextResetAt)}.` : ''}</p>`}`
        : active
          ? html`<div class="device device-empty"><span class="device-icon">${ICON.pc}</span><div><strong>Not activated yet</strong>
            <p class="muted small">Sign in to Rago Optimizer on your PC to activate it. Rago Optimizer works on one device per license.</p></div></div>`
          : html`<div class="device device-empty"><span class="device-icon">${ICON.pc}</span><div><strong>No device</strong>
            <p class="muted small">${ended ? 'Renew Premium, then sign in to the app on your PC to activate it.' : "This license can't be activated."}</p></div></div>`}
    </article>`;

  const planCard = () => {
    const end = license.current_period_end;
    if (license.plan === 'lifetime' || !subscription) {
      return html`<article class="card card-plan rise d4">
        <div class="card-head"><p class="overline">Plan</p>${active ? html`<span class="badge badge-red"><i></i>Lifetime</span>` : html`<span class="badge badge-off"><i></i>${offBadge()}</span>`}</div>
        <div class="plan-line"><span class="plan-icon">${ICON.infinity}</span><div><strong>Rago Optimizer Premium for life</strong>
          <p class="muted small">${active
            ? `${license.source === 'affiliate' ? 'Earned with the affiliate program. ' : ''}No renewals, nothing to pay.`
            : reason === 'refunded' ? 'Refunded. This license no longer works.' : reason === 'disputed' ? 'The payment was disputed. This license no longer works.' : 'This license was revoked.'}</p></div></div>
        ${active ? html`<div class="row">${portalButton('Cancel or manage subscription')}</div>` : html`<div class="row">${portalButton('Invoices and billing')}</div>`}
      </article>`;
    }
    let line;
    let badge = html`<span class="chip mono">${PLAN[license.plan]}</span>`;
    let actions = portalButton('Cancel or manage subscription');
    if (ended) {
      line = html`Your subscription ended${end ? ` on ${fmtDate(end)}` : ''}. Renew it to unlock Premium again.`;
      actions = html`<a class="btn btn-primary btn-sm" href="${buyUrl}">Renew Premium</a>${portalButton('Invoices and billing')}`;
    } else if (!active) {
      line = reason === 'refunded' ? 'Refunded. This subscription is stopped and won’t renew.'
        : reason === 'disputed' ? 'The payment was disputed. This subscription is stopped and won’t renew.'
          : 'This license was revoked. The subscription won’t renew.';
      badge = html`<span class="badge badge-off"><i></i>${offBadge()}</span>`;
      actions = portalButton('Invoices and billing');
    } else if (canceling) {
      line = `Canceled. Premium keeps working until ${end ? fmtDate(end) : 'the end of the period'}, then Rago Optimizer goes back to the free version.`;
      badge = html`<span class="badge badge-wait"><i></i>Ends ${end ? fmtDate(end) : 'soon'}</span>`;
      actions = html`${portalButton('Keep Premium', 'btn-primary')}`;
    } else {
      line = end ? `Renews on ${fmtDate(end)}. Cancel anytime.` : 'Renews automatically. Cancel anytime.';
    }
    return html`<article class="card card-plan rise d4">
      <div class="card-head"><p class="overline">Subscription</p>${badge}</div>
      <div class="plan-line"><span class="plan-icon">${ICON.card}</span><div><strong>Rago Optimizer Premium · ${PLAN[license.plan]}</strong>
        <p class="muted small">${line}</p></div></div>
      <div class="row">${actions}</div>
    </article>`;
  };

  const affiliateCard = (cls) => html`<article class="card card-aff rise ${cls}">
      <div class="card-head"><p class="overline">Affiliate program</p>${affiliate ? html`<span class="mono small muted">${affiliate.rewarded ? affiliate.goal : affiliate.counted} / ${affiliate.goal}${affiliate.pending && !affiliate.rewarded ? ` · ${affiliate.pending} waiting` : ''}</span>` : ''}</div>
      ${affiliate
        ? html`<div class="aff-mini">${affiliate.rewarded ? ring(affiliate.goal, affiliate.goal, 'sm') : ring(affiliate.counted, affiliate.goal, 'sm', affiliate.pending)}<div class="aff-text">
            <p class="small muted">Your code</p><p class="code-sm mono">${affiliate.code}</p>
            <p class="small muted">${affiliate.rewarded ? 'Goal reached. Rago Optimizer Premium is yours for life.' : `${affiliate.goal - Math.min(affiliate.counted, affiliate.goal)} more player${affiliate.goal - affiliate.counted === 1 ? '' : 's'} to keep Premium for life.`}</p></div></div>
          <a class="link-arrow" href="/affiliate">Open affiliate program ${ICON.arrow}</a>`
        : html`<div class="plan-line"><span class="plan-icon">${ICON.users}</span><div><strong>Bring ${cfg.affiliateGoal} players, keep Premium for life</strong>
            <p class="muted small">Share your code. When ${cfg.affiliateGoal} players buy Premium with it, your access becomes permanent.</p></div></div>
          <a class="link-arrow" href="/affiliate">Join the affiliate program ${ICON.arrow}</a>`}
    </article>`;

  const helpCard = (cls) => html`<article class="card card-aff rise ${cls}">
      <div class="card-head"><p class="overline">Help</p></div>
      <div class="plan-line"><span class="plan-icon">${ICON.users}</span><div><strong>Questions about a tweak or your PC?</strong>
        <p class="muted small">The Rago team and players answer on Discord.</p></div></div>
      ${cfg.supportUrl ? html`<a class="link-arrow" href="${cfg.supportUrl}" rel="noopener">Open Discord ${ICON.arrow}</a>` : ''}
    </article>`;
  const sideCard = (cls) => (!affiliate && active && license?.plan === 'lifetime' ? helpCard(cls) : affiliateCard(cls));

  const freeCard = html`<article class="card card-hero solo rise d1">
      <div class="card-head"><p class="overline">Your plan</p><span class="badge badge-off"><i></i>Free</span></div>
      <h2 class="h1">You're on Free</h2>
      <p class="muted">${cfg.freeTweaks} tweaks unlocked. ${unlocks.split('. ')[0]}.${cfg.priceLabel ? html` <strong class="price">${cfg.priceLabel}</strong>.` : ''}</p>
      <div class="row"><a class="btn btn-buy btn-lg" href="${buyUrl}">Get Premium ${ICON.arrow}</a>
        <a class="btn btn-ghost btn-lg" href="/account/download" data-download>${ICON.download}<span>Download the free version</span></a></div>
      <p class="muted small">${cfg.subscriptions ? 'Monthly or yearly. Secure checkout with Stripe. Cancel anytime.' : 'Secure checkout with Stripe.'} Already paid? Sign in with the email you paid with, or open the link in your purchase email. Still not here? ${supportLink(cfg, 'Ask on Discord')} with your payment email and we'll add it to this account.</p>
    </article>`;

  const title = !license ? 'Welcome to Rago Optimizer'
    : active ? 'Rago Optimizer Premium'
      : ended ? 'Your Premium ended' : 'Your Premium access ended';
  const body = html`<main class="dash">
    <div class="dash-head rise">
      <div><p class="overline">Your account</p><h1 class="display">${title}</h1></div>
      ${stepIndex == null ? '' : steps(stepIndex)}
    </div>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    <div class="grid">
      ${license ? [active ? download() : comeBack(), licenseCard(), deviceCard(), planCard(), sideCard('d5')] : [freeCard, affiliateCard('d2 side')]}
    </div>
    <p class="dash-foot small muted rise d5">Signed in as ${user.email} · <a href="/account/password">Change password</a></p>
  </main>`;
  return page({ title: 'Your account', cfg, user, body, bodyClass: 'is-dash', nav: 'account', buy: !active });
}

const RULES = (cfg) => [
  `A player counts once they've paid, created their account with your code and activated Rago Optimizer on their PC.`,
  `Each purchase counts ${cfg.affiliateHoldDays} days after payment. Refunds and chargebacks don't count.`,
  'Players enter your code once, right after paying, when they create their account or sign in. It can’t be added later.',
  "Your own purchases don't count, even with another email or on your own PC.",
  'Your lifetime license works on one PC, like every Rago Optimizer license.',
];

const VOID = { subscription_ended: 'Subscription ended', refunded: 'Refunded', disputed: 'Chargeback', same_device: 'Same PC as yours', same_payer: 'Same payer as you', revoked: 'License revoked' };

function referralStatus(r) {
  if (r.status === 'counted') return html`<span class="badge badge-ok"><i></i>Counted</span>`;
  if (r.status === 'void') return html`<span class="badge badge-off"><i></i>${VOID[r.voidReason] || "Doesn't count"}</span>`;
  if (!r.activated) return html`<span class="badge badge-wait"><i></i>Not activated yet</span>`;
  if (r.countsFrom > Date.now()) return html`<span class="badge badge-wait"><i></i>Counts on ${fmtDate(r.countsFrom)}</span>`;
  return html`<span class="badge badge-wait"><i></i>Checking</span>`;
}

export function affiliatePage(cfg, { user, summary, joined }) {
  const goal = cfg.affiliateGoal;
  const how = html`<ol class="how rise d3">
      <li><span class="how-n mono">1</span><div><strong>Get your code</strong><p class="muted small">Join with your Rago Optimizer account. No purchase needed.</p></div></li>
      <li><span class="how-n mono">2</span><div><strong>Share it with players</strong><p class="muted small">They enter it when they create their account, right after paying.</p></div></li>
      <li><span class="how-n mono">3</span><div><strong>${goal} players, Premium for life</strong><p class="muted small">Your Rago Optimizer access becomes permanent. No more renewals.</p></div></li>
    </ol>`;

  if (!summary) {
    const panel = user
      ? html`<h2 class="h2">Join the program</h2>
        <p class="muted">You're signed in as <strong>${user.email}</strong>. Your code is ready as soon as you join.</p>
        <form method="post" action="/affiliate/join" class="form" data-busy="Joining…">
          <button class="btn btn-primary btn-block" type="submit">Get my referral code</button>
        </form>
        <ul class="rules small muted">${RULES(cfg).map((r) => html`<li>${r}</li>`)}</ul>`
      : html`<h2 class="h2">Join the program</h2>
        <p class="muted">You need a Rago Optimizer account to get your code. It's free.</p>
        <div class="stack">
          <a class="btn btn-primary btn-block" href="/signup?next=%2Faffiliate">Create account</a>
          <a class="btn btn-ghost btn-block" href="/login?next=%2Faffiliate">Sign in</a>
        </div>
        <ul class="rules small muted">${RULES(cfg).map((r) => html`<li>${r}</li>`)}</ul>`;
    const aside = html`<p class="overline rise">Affiliate program</p>
      <h1 class="display rise d1">Bring ${goal} players. Keep Premium for life.</h1>
      <p class="lede rise d2">Share your code. When ${goal} players buy Rago Optimizer Premium with it, your access becomes permanent.</p>
      ${how}`;
    return page({ title: 'Affiliate program', cfg, user, nav: 'affiliate',
      body: html`<main class="split">
        <section class="split-aside">${pulse}${aside}</section>
        <section class="split-form"><div class="panel rise d2">${panel}</div></section></main>` });
  }

  const left = Math.max(0, goal - summary.counted);
  const body = html`<main class="dash">
    <div class="dash-head rise">
      <div><p class="overline">Affiliate program</p><h1 class="display">${summary.rewarded ? 'Rago Optimizer is yours for life.' : `${left} more to go.`}</h1></div>
    </div>
    ${joined ? alertBox("You're in. Share your code with players before they buy.", 'ok') : ''}
    <div class="grid">
      <article class="card card-code rise d1">
        <p class="overline">Your referral code</p>
        <div class="code-big"><code class="mono">${summary.code}</code>
          <button class="btn btn-primary btn-sm" type="button" data-copy="${summary.code}">${ICON.copy}<span>Copy</span></button></div>
        <div class="share"><span class="mono small share-url"><bdi>${cfg.siteUrl.replace(/^https?:\/\//, '')}/?ref=${summary.code}</bdi></span>
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${cfg.siteUrl}/?ref=${summary.code}">${ICON.copy}<span>Copy link</span></button></div>
        <p class="muted small">Players type the code in the <strong>Referral code</strong> field when they create their account after paying. With your link, it's filled in for them.</p>
      </article>
      <article class="card card-progress rise d2">
        <div class="card-head"><p class="overline">Progress</p>${summary.rewarded ? html`<span class="badge badge-red"><i></i>Lifetime</span>` : ''}</div>
        <div class="progress">${ring(summary.rewarded ? goal : summary.counted, goal, 'lg', summary.rewarded ? 0 : summary.pending)}
          <div class="progress-text">${slots(summary.rewarded ? goal : summary.counted, goal, summary.rewarded ? 0 : summary.pending)}
            <p class="small">${summary.rewarded
              ? `Goal reached. Your Rago Optimizer Premium license is now lifetime, on one PC.${summary.counted < goal ? ` ${goal - summary.counted === 1 ? 'A player was' : 'Some players were'} refunded after your reward: your lifetime access stays.` : ''}`
              : html`<strong>${summary.counted} of ${goal}</strong> players counted.${summary.pending ? ` ${summary.pending} waiting: a player counts once they've activated Rago Optimizer and ${cfg.affiliateHoldDays} days have passed since their payment.` : ''}`}</p>
            ${summary.rewarded ? html`<a class="link-arrow" href="/account">See your license ${ICON.arrow}</a>` : ''}</div>
        </div>
      </article>
      <article class="card card-list rise d3">
        <div class="card-head"><p class="overline">Players who used your code</p><span class="mono small muted">${summary.referrals.length}</span></div>
        ${summary.referrals.length
          ? html`<ul class="refs">${summary.referrals.map((r) => html`<li><span class="ref-avatar" aria-hidden="true">${r.email.slice(0, 1).toUpperCase()}</span>
              <div><span class="mono">${r.email}</span><p class="muted small">Joined ${fmtDate(r.since)}</p></div>${referralStatus(r)}</li>`)}</ul>`
          : html`<div class="empty">${ICON.users}<p class="muted small">Nobody yet. Share your code on Discord or with your teammates.</p></div>`}
      </article>
      <article class="card card-rules rise d4">
        <p class="overline">How it counts</p>
        <ul class="rules small muted">${RULES(cfg).map((r) => html`<li>${r}</li>`)}</ul>
      </article>
    </div>
  </main>`;
  return page({ title: 'Affiliate program', cfg, user, body, bodyClass: 'is-dash', nav: 'affiliate' });
}
