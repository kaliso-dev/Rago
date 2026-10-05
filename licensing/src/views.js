// Server-rendered account pages. Copy follows /brand/voice-en.md, look follows brand kit v1.1.
import { maskLicenseKey } from './crypto.js';

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const escape = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const render = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(render).join('') : escape(v));
export const html = (strings, ...vals) => new Raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? render(vals[i]) : ''), ''));

const WORDMARK = html`<svg class="wordmark" viewBox="0 1.6 79.8 19.4" fill="currentColor" role="img" aria-label="Rago"><path fill-rule="evenodd" d="M0 3H11L16 8V11.5L12.8 14.7L17 21H11.6L8.1 15.5H5.4V21H0ZM5.4 7.6V11.1H10.6V7.6Z"/><path fill-rule="evenodd" d="M19.6 21V8L24.6 3H31.6L36.6 8V21H31.2V16.4H25V21ZM25 8.4V11H31.2V8.4Z"/><path fill-rule="evenodd" d="M39.2 8L44.2 3H56.2V8.4H44.6V15.6H50.8V14.4H48.2V10.2H56.2V21H44.2L39.2 16Z"/><path fill-rule="evenodd" d="M63.8 3H70.8L75.8 8V16L70.8 21H63.8L58.8 16V8ZM64.2 8.4V15.6H70.4V8.4Z"/><path class="wordmark-pixel" d="M77 1.6h2.8v2.8h-2.8z"/></svg>`;

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
  infinity: svg('M8 8c-1.4-2-2.6-3-4-3a3 3 0 0 0 0 6c1.4 0 2.6-1 4-3zm0 0c1.4 2 2.6 3 4 3a3 3 0 0 0 0-6c-1.4 0-2.6 1-4 3z', 1.4),
};

const pulse = html`<div class="pulse" aria-hidden="true"><i></i><i></i><i></i><b></b></div>`;

const STEPS = ['Pay', 'Create account', 'Download', 'Activate'];
function steps(current) {
  return html`<ol class="steps" aria-label="Progress">${STEPS.map((label, i) => html`
    <li class="${i < current ? 'done' : i === current ? 'now' : ''}" ${i === current ? html`aria-current="step"` : ''}>
      <span class="steps-dot">${i < current ? ICON.check : String(i + 1)}</span><span>${label}</span>
    </li>`)}</ol>`;
}

function page({ title, body, user, cfg, bodyClass = '', nav = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A0A0B">
<meta name="robots" content="noindex">
<title>${escape(title)} · Rago</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/tokens.css">
<link rel="stylesheet" href="/assets/account.css">
<script src="/assets/account.js" defer></script>
</head>
<body class="${escape(bodyClass)}">
<div class="bg" aria-hidden="true"><span></span><span></span></div>
<header class="top">
  <a class="brand" href="${escape(cfg.siteUrl)}/" aria-label="Rago home">${render(WORDMARK)}</a>
  ${user ? render(html`<nav class="tabs" aria-label="Account">
      <a href="/account" ${nav === 'account' ? html`aria-current="page"` : ''}>Account</a>
      <a href="/affiliate" ${nav === 'affiliate' ? html`aria-current="page"` : ''}>Affiliate</a>
    </nav>
    <div class="top-user"><span class="top-email">${user.email}</span>
    <form method="post" action="/logout"><button class="btn btn-ghost btn-sm" type="submit">Sign out</button></form></div>`)
    : '<a class="btn btn-ghost btn-sm" href="/login">Sign in</a>'}
</header>
${render(body)}
<footer class="foot"><span class="mono">Every millisecond counts.</span>
  <span class="foot-links"><a href="/affiliate">Affiliate program</a>${cfg.supportUrl ? render(html`<a href="${cfg.supportUrl}" rel="noopener">Support on Discord</a>`) : ''}</span></footer>
</body>
</html>`;
}

const field = ({ label, name, type = 'text', value = '', autocomplete, hint, attrs = '', required = true }) => html`
  <label class="field">
    <span class="field-label">${label}</span>
    <span class="field-box">
      <input name="${name}" type="${type}" value="${value}" ${autocomplete ? html`autocomplete="${autocomplete}"` : ''} ${required ? html`required` : ''} ${new Raw(attrs)}>
      ${type === 'password' ? html`<button class="field-eye" type="button" data-reveal aria-label="Show password">Show</button>` : ''}
    </span>
    ${hint ? html`<span class="field-hint">${hint}</span>` : ''}
  </label>`;

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
    ? html`<p class="overline rise">Rago Hub Premium</p>
       <h1 class="display rise d1">Payment confirmed.</h1>
       <p class="lede rise d2">Create your account to get your license. You'll use the same email and password to sign in to Rago Hub.</p>`
    : next === '/affiliate'
      ? html`<p class="overline rise">Affiliate program</p>
         <h1 class="display rise d1">Create your account.</h1>
         <p class="lede rise d2">Then join the program to get your referral code. No purchase needed.</p>`
      : html`<p class="overline rise">Rago account</p>
         <h1 class="display rise d1">Create your account.</h1>
         <p class="lede rise d2">Your Rago Hub Premium license, downloads and device live here.</p>`;
  const form = html`
    <h2 class="h2">Create account</h2>
    ${alertBox(error)}
    <form method="post" action="/signup" class="form" data-busy="Creating account…">
      ${field({ label: 'Email', name: 'email', type: 'email', value: email || claimEmail || '', autocomplete: 'email' })}
      ${field({ label: 'Password', name: 'password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters.', attrs: 'minlength="8"' })}
      ${purchased ? field({ label: 'Referral code (optional)', name: 'code', value: code, autocomplete: 'off', required: false,
        hint: "Got a code from another player? Enter it now. You can't add it later.", attrs: 'maxlength="16" spellcheck="false" autocapitalize="characters" class="mono"' }) : ''}
      ${hidden('next', next)}
      <button class="btn btn-primary btn-block" type="submit">Create account</button>
    </form>
    <p class="muted small">Already have an account? <a href="/login${qs(next)}">Sign in</a>${purchased ? ' and your license is added to it.' : '.'}</p>`;
  return page({ title: 'Create account', cfg, body: split({ step: purchased ? 1 : null, aside, form }) });
}

export function loginPage(cfg, { email = '', error, notice, purchased = false, next } = {}) {
  const aside = next === '/affiliate' && !purchased
    ? html`<p class="overline rise">Affiliate program</p>
      <h1 class="display rise d1">Welcome back.</h1>
      <p class="lede rise d2">Sign in to get your referral code and follow your progress.</p>`
    : html`<p class="overline rise">Rago account</p>
      <h1 class="display rise d1">${purchased ? 'Payment confirmed.' : 'Welcome back.'}</h1>
      <p class="lede rise d2">${purchased ? 'Sign in and we add the license to your account.' : 'Sign in to get your license key and download Rago Hub.'}</p>`;
  const form = html`
    <h2 class="h2">Sign in</h2>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    <form method="post" action="/login" class="form" data-busy="Signing in…">
      ${field({ label: 'Email', name: 'email', type: 'email', value: email, autocomplete: 'email' })}
      ${field({ label: 'Password', name: 'password', type: 'password', autocomplete: 'current-password' })}
      ${hidden('next', next)}
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    </form>
    <p class="muted small"><a href="/forgot">Forgot your password?</a> · No account? <a href="/signup${qs(next)}">Create account</a></p>`;
  return page({ title: 'Sign in', cfg, body: split({ step: purchased ? 1 : null, aside, form }) });
}

export function forgotPage(cfg, { sent = false, email = '' } = {}) {
  const form = sent
    ? html`<h2 class="h2">Check your inbox</h2><p class="muted">If an account exists for that email, a reset link is on its way. It works for 1 hour.</p><p class="small"><a href="/login">Back to sign in</a></p>`
    : html`<h2 class="h2">Reset your password</h2>
      <form method="post" action="/forgot" class="form" data-busy="Sending…">
        ${field({ label: 'Email', name: 'email', type: 'email', value: email, autocomplete: 'email' })}
        <button class="btn btn-primary btn-block" type="submit">Send reset link</button>
      </form><p class="muted small"><a href="/login">Back to sign in</a></p>`;
  const aside = html`<p class="overline rise">Rago account</p><h1 class="display rise d1">Forgot your password?</h1>
    <p class="lede rise d2">Enter the email of your account and we'll send you a link to choose a new one.</p>`;
  return page({ title: 'Reset password', cfg, body: split({ aside, form }) });
}

export function resetPage(cfg, { token, error } = {}) {
  const aside = html`<p class="overline rise">Rago account</p><h1 class="display rise d1">Choose a new password.</h1>
    <p class="lede rise d2">You'll be signed out everywhere else. Rago Hub stays activated on your PC.</p>`;
  const form = html`<h2 class="h2">New password</h2>${alertBox(error)}
    <form method="post" action="/reset/${token}" class="form" data-busy="Saving…">
      ${field({ label: 'New password', name: 'password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters.', attrs: 'minlength="8"' })}
      <button class="btn btn-primary btn-block" type="submit">Save password</button>
    </form>`;
  return page({ title: 'New password', cfg, body: split({ aside, form }) });
}

export function messagePage(cfg, { title, text, action, user, step }) {
  const aside = html`<p class="overline rise">Rago Hub Premium</p><h1 class="display rise d1">${title}</h1><p class="lede rise d2">${text}</p>
    ${action ? html`<p class="rise d3"><a class="btn btn-primary" href="${action.href}">${action.label}</a></p>` : ''}`;
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

/** Circular progress (x / goal). The arc length is an SVG attribute, so the strict CSP allows it. */
function ring(value, goal, size = 'lg') {
  const c = 2 * Math.PI * 42;
  const done = Math.min(value, goal) / goal;
  return html`<div class="ring ring-${size}${value >= goal ? ' ring-full' : ''}" role="img" aria-label="${value} of ${goal}">
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="42"/>
      <circle class="ring-bar" cx="50" cy="50" r="42" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - done)).toFixed(2)}"/></svg>
    <span class="ring-num mono"><b data-count="${Math.min(value, goal)}">${Math.min(value, goal)}</b><small>/${goal}</small></span>
  </div>`;
}

function slots(value, goal) {
  return html`<ol class="slots" aria-hidden="true">${Array.from({ length: goal }, (_, i) => html`<li class="${i < value ? 'on' : ''}">${i < value ? ICON.check : String(i + 1)}</li>`)}</ol>`;
}

export function dashboardPage(cfg, { user, license, device, notice, error, canReset, nextResetAt, affiliate }) {
  const active = license?.status === 'active';
  const ended = license?.status_reason === 'subscription_ended';
  const stepIndex = !license ? 0 : device ? 4 : 2;

  const support = cfg.supportUrl ? html`<a href="${cfg.supportUrl}" rel="noopener">Contact support on Discord</a>` : 'Contact support on Discord';

  const download = () => html`<article class="card card-hero rise d1">
      <p class="overline">Rago Hub for Windows</p>
      <h2 class="h1">Download Rago Hub for Windows</h2>
      <p class="muted">Windows 10 and 11, 64-bit.${cfg.installerVersion ? html` <span class="mono chip">v${cfg.installerVersion}</span>` : ''}</p>
      ${active
        ? html`<a class="btn btn-primary btn-lg" href="/account/download" data-download>${ICON.download}<span>Download Rago Hub</span></a>`
        : html`<span class="btn btn-lg btn-disabled" aria-disabled="true">${ICON.download}<span>Download Rago Hub</span></span>`}
      <ol class="howto">
        <li><span class="howto-n mono">1</span><span>Run the installer. Windows SmartScreen may ask you to confirm.</span></li>
        <li><span class="howto-n mono">2</span><span>Sign in to Rago Hub with <strong>${user.email}</strong>.</span></li>
        <li><span class="howto-n mono">3</span><span>Activate it. Your license is locked to that PC.</span></li>
      </ol>
    </article>`;

  const offBadge = () => (ended ? 'Ended' : license.status_reason === 'refunded' ? 'Refunded' : 'Revoked');
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
        <div><dt>Plan</dt><dd>Rago Hub Premium · ${PLAN[license.plan] || 'Lifetime'}</dd></div>
        <div><dt>Since</dt><dd class="mono">${fmtDate(license.created_at)}</dd></div>
      </dl>
      ${active || ended ? '' : html`<p class="muted small">This license no longer works in Rago Hub. ${support} if you think that's a mistake.</p>`}
    </article>`;

  const deviceCard = () => html`<article class="card rise d3">
      <div class="card-head"><p class="overline">Device</p>
        <span class="mono small muted">${device ? '1 / 1' : '0 / 1'}</span></div>
      ${device
        ? html`<div class="device"><span class="device-icon">${ICON.pc}</span><div><strong>${device.name}</strong>
            <p class="muted small">${device.os || 'Windows'}${device.app_version ? ` · Rago Hub ${device.app_version}` : ''}</p></div></div>
          <p class="small">This license is active on 1 device.</p>
          <dl class="meta">
            <div><dt>Activated</dt><dd class="mono">${fmtDate(device.bound_at)}</dd></div>
            <div><dt>Last seen</dt><dd class="mono">${ago(device.last_seen_at)}</dd></div>
          </dl>
          ${canReset
            ? html`<form method="post" action="/account/reset-device" class="inline" data-confirm="Free this license? Rago Hub signs out on ${device.name} and you can activate another PC. You can do this once every ${cfg.selfServiceResetDays} days.">
                <button class="btn btn-ghost btn-sm" type="submit">Use on another PC</button></form>`
            : html`<p class="muted small">Changed PCs? ${support}.${nextResetAt ? html` You can free it yourself from ${fmtDate(nextResetAt)}.` : ''}</p>`}`
        : html`<div class="device device-empty"><span class="device-icon">${ICON.pc}</span><div><strong>Not activated yet</strong>
            <p class="muted small">Sign in to Rago Hub on your PC to activate it. Rago Hub works on one device per license.</p></div></div>`}
    </article>`;

  const planCard = () => {
    const portal = license.stripe_customer_id && license.stripe_subscription_id
      ? html`<form method="post" action="/account/billing" class="inline" data-busy="Opening…"><button class="btn btn-ghost btn-sm" type="submit">${ICON.card}<span>Manage subscription</span></button></form>` : '';
    if (license.plan === 'lifetime') {
      return html`<article class="card card-plan rise d4">
        <div class="card-head"><p class="overline">Plan</p><span class="badge badge-red"><i></i>Lifetime</span></div>
        <div class="plan-line"><span class="plan-icon">${ICON.infinity}</span><div><strong>Rago Hub Premium for life</strong>
          <p class="muted small">${license.source === 'affiliate' ? 'Earned with the affiliate program. ' : ''}No renewals, nothing to pay.</p></div></div>
      </article>`;
    }
    const end = license.current_period_end;
    let line;
    if (ended) line = html`Your subscription ended${end ? html` on <span class="mono">${fmtDate(end)}</span>` : ''}. Renew it to use Rago Hub again.`;
    else if (license.cancel_at_period_end) line = html`Canceled. Rago Hub keeps working until <span class="mono">${end ? fmtDate(end) : 'the end of the period'}</span>.`;
    else line = end ? html`Renews on <span class="mono">${fmtDate(end)}</span>. Cancel anytime.` : 'Renews automatically. Cancel anytime.';
    return html`<article class="card card-plan rise d4">
      <div class="card-head"><p class="overline">Subscription</p><span class="chip mono">${PLAN[license.plan]}</span></div>
      <div class="plan-line"><span class="plan-icon">${ICON.card}</span><div><strong>Rago Hub Premium · ${PLAN[license.plan]}</strong>
        <p class="muted small">${line}</p></div></div>
      <div class="row">${ended ? html`<a class="btn btn-primary btn-sm" href="${pricingUrl(cfg)}">Renew Rago Hub Premium</a>` : ''}${portal}</div>
    </article>`;
  };

  const affiliateCard = (cls) => html`<article class="card card-aff rise ${cls}">
      <div class="card-head"><p class="overline">Affiliate program</p>${affiliate ? html`<span class="mono small muted">${affiliate.counted} / ${affiliate.goal}</span>` : ''}</div>
      ${affiliate
        ? html`<div class="aff-mini">${ring(affiliate.counted, affiliate.goal, 'sm')}<div class="aff-text">
            <p class="small muted">Your code</p><p class="code-sm mono">${affiliate.code}</p>
            <p class="small muted">${affiliate.rewarded ? 'Goal reached. Rago Hub Premium is yours for life.' : `${affiliate.goal - Math.min(affiliate.counted, affiliate.goal)} more player${affiliate.goal - affiliate.counted === 1 ? '' : 's'} to get Rago Hub for life.`}</p></div></div>
          <a class="link-arrow" href="/affiliate">Open affiliate program ${ICON.arrow}</a>`
        : html`<div class="plan-line"><span class="plan-icon">${ICON.users}</span><div><strong>Bring ${cfg.affiliateGoal} players, get Rago Hub for life</strong>
            <p class="muted small">Share your code. When ${cfg.affiliateGoal} players buy Premium with it, your access becomes permanent.</p></div></div>
          <a class="link-arrow" href="/affiliate">Join the affiliate program ${ICON.arrow}</a>`}
    </article>`;

  const noLicense = html`<article class="card card-hero solo rise d1">
      <p class="overline">Rago Hub Premium</p>
      <h2 class="h1">No license on this account yet</h2>
      <p class="muted">Get Rago Hub Premium to unlock the app. Already paid with another email? Sign in with that email, or open the link in your purchase email.</p>
      <a class="btn btn-buy btn-lg" href="${pricingUrl(cfg)}">Get Rago Hub Premium ${ICON.arrow}</a>
      <p class="muted small">${cfg.subscriptions ? 'Monthly or yearly. Secure checkout with Stripe. Cancel anytime.' : 'Secure checkout with Stripe.'}</p>
    </article>`;

  const body = html`<main class="dash">
    <div class="dash-head rise">
      <div><p class="overline">Your account</p><h1 class="display">${license ? 'Rago Hub Premium' : 'Welcome to Rago'}</h1></div>
      ${steps(stepIndex)}
    </div>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    <div class="grid">
      ${license ? [download(), licenseCard(), deviceCard(), planCard(), affiliateCard('d5')] : [noLicense, affiliateCard('d2 side')]}
    </div>
  </main>`;
  return page({ title: 'Your account', cfg, user, body, bodyClass: 'is-dash', nav: 'account' });
}

const RULES = (cfg) => [
  `A player counts once they've paid, created their account with your code and activated Rago Hub on their PC.`,
  `Each purchase counts ${cfg.affiliateHoldDays} days after payment. Refunds and chargebacks don't count.`,
  'Players enter your code once, when they create their account right after paying. It can’t be added later.',
  "Your own purchases don't count, even with another email or on your own PC.",
  'Your lifetime license works on one PC, like every Rago Hub license.',
];

const VOID = { refunded: 'Refunded', disputed: 'Chargeback', same_device: 'Same PC as yours', same_payer: 'Same payer as you', revoked: 'License revoked' };

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
      <li><span class="how-n mono">1</span><div><strong>Get your code</strong><p class="muted small">Join with your Rago account. No purchase needed.</p></div></li>
      <li><span class="how-n mono">2</span><div><strong>Share it with players</strong><p class="muted small">They enter it when they create their account, right after paying.</p></div></li>
      <li><span class="how-n mono">3</span><div><strong>${goal} players, Premium for life</strong><p class="muted small">Your Rago Hub access becomes permanent. No more renewals.</p></div></li>
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
        <p class="muted">You need a Rago account to get your code. It's free.</p>
        <div class="stack">
          <a class="btn btn-primary btn-block" href="/signup?next=%2Faffiliate">Create account</a>
          <a class="btn btn-ghost btn-block" href="/login?next=%2Faffiliate">Sign in</a>
        </div>
        <ul class="rules small muted">${RULES(cfg).map((r) => html`<li>${r}</li>`)}</ul>`;
    const aside = html`<p class="overline rise">Affiliate program</p>
      <h1 class="display rise d1">Bring ${goal} players. Get Rago Hub for life.</h1>
      <p class="lede rise d2">Share your code. When ${goal} players buy Rago Hub Premium with it, your access becomes permanent.</p>
      ${how}`;
    return page({ title: 'Affiliate program', cfg, user, nav: 'affiliate',
      body: html`<main class="split">
        <section class="split-aside">${pulse}${aside}</section>
        <section class="split-form"><div class="panel rise d2">${panel}</div></section></main>` });
  }

  const left = Math.max(0, goal - summary.counted);
  const body = html`<main class="dash">
    <div class="dash-head rise">
      <div><p class="overline">Affiliate program</p><h1 class="display">${summary.rewarded ? 'Rago Hub is yours for life.' : `${left} more to go.`}</h1></div>
    </div>
    ${joined ? alertBox("You're in. Share your code with players before they buy.", 'ok') : ''}
    <div class="grid">
      <article class="card card-code rise d1">
        <p class="overline">Your referral code</p>
        <div class="code-big"><code class="mono">${summary.code}</code>
          <button class="btn btn-primary btn-sm" type="button" data-copy="${summary.code}">${ICON.copy}<span>Copy</span></button></div>
        <div class="share"><span class="mono small">${cfg.siteUrl.replace(/^https?:\/\//, '')}/?ref=${summary.code}</span>
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${cfg.siteUrl}/?ref=${summary.code}">${ICON.copy}<span>Copy link</span></button></div>
        <p class="muted small">Players type the code in the <strong>Referral code</strong> field when they create their account after paying. With your link, it's filled in for them.</p>
      </article>
      <article class="card card-progress rise d2">
        <div class="card-head"><p class="overline">Progress</p>${summary.rewarded ? html`<span class="badge badge-red"><i></i>Lifetime</span>` : ''}</div>
        <div class="progress">${ring(summary.counted, goal)}
          <div class="progress-text">${slots(summary.counted, goal)}
            <p class="small">${summary.rewarded
              ? 'Goal reached. Your Rago Hub Premium license is now lifetime, on one PC.'
              : html`<strong>${summary.counted} of ${goal}</strong> players counted.${summary.pending ? ` ${summary.pending} waiting.` : ''}`}</p>
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
