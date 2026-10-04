// Server-rendered account pages. Copy follows /brand/voice-en.md.
import { maskLicenseKey } from './crypto.js';

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const escape = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const render = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(render).join('') : escape(v));
export const html = (strings, ...vals) => new Raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? render(vals[i]) : ''), ''));

const WORDMARK = html`<svg class="wordmark" viewBox="0 1.6 79.8 19.4" fill="currentColor" role="img" aria-label="Rago"><path fill-rule="evenodd" d="M0 3H11L16 8V11.5L12.8 14.7L17 21H11.6L8.1 15.5H5.4V21H0ZM5.4 7.6V11.1H10.6V7.6Z"/><path fill-rule="evenodd" d="M19.6 21V8L24.6 3H31.6L36.6 8V21H31.2V16.4H25V21ZM25 8.4V11H31.2V8.4Z"/><path fill-rule="evenodd" d="M39.2 8L44.2 3H56.2V8.4H44.6V15.6H50.8V14.4H48.2V10.2H56.2V21H44.2L39.2 16Z"/><path fill-rule="evenodd" d="M63.8 3H70.8L75.8 8V16L70.8 21H63.8L58.8 16V8ZM64.2 8.4V15.6H70.4V8.4Z"/><path class="wordmark-pixel" d="M77 1.6h2.8v2.8h-2.8z"/></svg>`;

const ICON = {
  check: html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>`,
  download: html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M2.5 13.5h11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>`,
  copy: html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 5.5h8v8h-8zM2.5 10.5v-8h8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`,
  pc: html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 2.5h13v8.5h-13zM5 14h6M8 11v3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`,
  alert: html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8l6.6 12H1.4zM8 6.2v3.6M8 11.4v1" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`,
};

const STEPS = ['Pay', 'Create account', 'Download', 'Activate'];
function steps(current) {
  return html`<ol class="steps" aria-label="Progress">${STEPS.map((label, i) => html`
    <li class="${i < current ? 'done' : i === current ? 'now' : ''}" ${i === current ? html`aria-current="step"` : ''}>
      <span class="steps-dot">${i < current ? ICON.check : String(i + 1).padStart(2, '0')}</span><span>${label}</span>
    </li>`)}</ol>`;
}

function page({ title, body, user, cfg, bodyClass = '' }) {
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
<div class="bg" aria-hidden="true"></div>
<header class="top">
  <a class="brand" href="${escape(cfg.siteUrl)}/" aria-label="Rago home">${render(WORDMARK)}</a>
  ${user ? render(html`<div class="top-user"><span class="top-email">${user.email}</span>
    <form method="post" action="/logout"><button class="btn btn-ghost btn-sm" type="submit">Sign out</button></form></div>`)
    : '<a class="btn btn-ghost btn-sm" href="/login">Sign in</a>'}
</header>
${render(body)}
<footer class="foot"><span class="mono">Every millisecond counts.</span>${cfg.supportUrl ? render(html`<a href="${cfg.supportUrl}" rel="noopener">Support on Discord</a>`) : ''}</footer>
</body>
</html>`;
}

const field = ({ label, name, type = 'text', value = '', autocomplete, hint, attrs = '' }) => html`
  <label class="field">
    <span class="field-label">${label}</span>
    <span class="field-box">
      <input name="${name}" type="${type}" value="${value}" ${autocomplete ? html`autocomplete="${autocomplete}"` : ''} required ${new Raw(attrs)}>
      ${type === 'password' ? html`<button class="field-eye" type="button" data-reveal aria-label="Show password">Show</button>` : ''}
    </span>
    ${hint ? html`<span class="field-hint">${hint}</span>` : ''}
  </label>`;

const alertBox = (msg, kind = 'error') => msg ? html`<div class="alert alert-${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${kind === 'error' ? ICON.alert : ICON.check}<span>${msg}</span></div>` : '';

// Two-column layout for the sign-up / sign-in flow: story on the left, form on the right.
function split({ step, aside, form }) {
  return html`<main class="split">
    <section class="split-aside">
      <div class="pulse" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
      ${aside}
      ${step == null ? '' : steps(step)}
    </section>
    <section class="split-form"><div class="panel rise">${form}</div></section>
  </main>`;
}

export function signupPage(cfg, { email = '', error, purchased = false, claimEmail } = {}) {
  const aside = purchased
    ? html`<p class="overline rise">Rago Hub Premium</p>
       <h1 class="display rise">Payment confirmed.</h1>
       <p class="lede rise">Create your account to get your license. You'll use the same email and password to sign in to Rago Hub.</p>`
    : html`<p class="overline rise">Rago account</p>
       <h1 class="display rise">Create your account.</h1>
       <p class="lede rise">Your Rago Hub Premium license, downloads and device live here.</p>`;
  const form = html`
    <h2 class="h2">Create account</h2>
    ${alertBox(error)}
    <form method="post" action="/signup" class="form" data-busy="Creating account…">
      ${field({ label: 'Email', name: 'email', type: 'email', value: email || claimEmail || '', autocomplete: 'email' })}
      ${field({ label: 'Password', name: 'password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters.', attrs: 'minlength="8"' })}
      <button class="btn btn-primary btn-block" type="submit">Create account</button>
    </form>
    <p class="muted small">Already have an account? <a href="/login">Sign in</a>${purchased ? ' and your license is added to it.' : '.'}</p>`;
  return page({ title: 'Create account', cfg, body: split({ step: purchased ? 1 : null, aside, form }) });
}

export function loginPage(cfg, { email = '', error, notice, purchased = false } = {}) {
  const aside = html`<p class="overline rise">Rago account</p>
    <h1 class="display rise">${purchased ? 'Payment confirmed.' : 'Welcome back.'}</h1>
    <p class="lede rise">${purchased ? 'Sign in and we add the license to your account.' : 'Sign in to get your license key and download Rago Hub.'}</p>`;
  const form = html`
    <h2 class="h2">Sign in</h2>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    <form method="post" action="/login" class="form" data-busy="Signing in…">
      ${field({ label: 'Email', name: 'email', type: 'email', value: email, autocomplete: 'email' })}
      ${field({ label: 'Password', name: 'password', type: 'password', autocomplete: 'current-password' })}
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    </form>
    <p class="muted small"><a href="/forgot">Forgot your password?</a> · No account? <a href="/signup">Create account</a></p>`;
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
  const aside = html`<p class="overline rise">Rago account</p><h1 class="display rise">Forgot your password?</h1>
    <p class="lede rise">Enter the email of your account and we'll send you a link to choose a new one.</p>`;
  return page({ title: 'Reset password', cfg, body: split({ aside, form }) });
}

export function resetPage(cfg, { token, error } = {}) {
  const aside = html`<p class="overline rise">Rago account</p><h1 class="display rise">Choose a new password.</h1>
    <p class="lede rise">You'll be signed out everywhere else. Rago Hub stays activated on your PC.</p>`;
  const form = html`<h2 class="h2">New password</h2>${alertBox(error)}
    <form method="post" action="/reset/${token}" class="form" data-busy="Saving…">
      ${field({ label: 'New password', name: 'password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters.', attrs: 'minlength="8"' })}
      <button class="btn btn-primary btn-block" type="submit">Save password</button>
    </form>`;
  return page({ title: 'New password', cfg, body: split({ aside, form }) });
}

export function messagePage(cfg, { title, text, action, user, step }) {
  const aside = html`<p class="overline rise">Rago Hub Premium</p><h1 class="display rise">${title}</h1><p class="lede rise">${text}</p>
    ${action ? html`<p class="rise"><a class="btn btn-primary" href="${action.href}">${action.label}</a></p>` : ''}`;
  return page({ title, cfg, user, body: html`<main class="split split-solo"><section class="split-aside">
    <div class="pulse" aria-hidden="true"><i></i><i></i><i></i><b></b></div>${aside}${step == null ? '' : steps(step)}</section></main>` });
}

const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
function ago(ms, now = Date.now()) {
  const m = Math.round((now - ms) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return fmtDate(ms);
}

export function dashboardPage(cfg, { user, license, device, notice, error, canReset, nextResetAt }) {
  const active = license?.status === 'active';
  const stepIndex = !license ? 0 : device ? 4 : 2;

  const support = cfg.supportUrl ? html`<a href="${cfg.supportUrl}" rel="noopener">Contact support on Discord</a>` : 'Contact support on Discord';

  const download = () => html`<article class="card card-hero rg-chamfer rise d1">
      <p class="overline">Rago Hub for Windows</p>
      <h2 class="h1">Download Rago Hub for Windows</h2>
      <p class="muted">Windows 10 and 11, 64-bit.${cfg.installerVersion ? html` <span class="mono chip">v${cfg.installerVersion}</span>` : ''}</p>
      ${active
        ? html`<a class="btn btn-primary btn-lg" href="/account/download" data-download>${ICON.download}<span>Download Rago Hub</span></a>`
        : html`<span class="btn btn-lg btn-disabled" aria-disabled="true">${ICON.download}<span>Download Rago Hub</span></span>`}
      <ol class="howto">
        <li><span class="mono">01</span><span>Run the installer. Windows SmartScreen may ask you to confirm.</span></li>
        <li><span class="mono">02</span><span>Sign in to Rago Hub with <strong>${user.email}</strong>.</span></li>
        <li><span class="mono">03</span><span>Activate it. Your license is locked to that PC.</span></li>
      </ol>
    </article>`;

  const licenseCard = () => html`<article class="card rise d2">
      <div class="card-head"><p class="overline">License key</p>
        ${active ? html`<span class="badge badge-ok"><i></i>Active</span>` : html`<span class="badge badge-off"><i></i>${license.status_reason === 'refunded' ? 'Refunded' : 'Revoked'}</span>`}</div>
      <div class="key">
        <code class="mono" data-key="${license.key}" data-masked="${maskLicenseKey(license.key)}">${maskLicenseKey(license.key)}</code>
        <button class="btn btn-ghost btn-sm" type="button" data-reveal-key>Show</button>
        <button class="btn btn-ghost btn-sm" type="button" data-copy="${license.key}">${ICON.copy}<span>Copy</span></button>
      </div>
      <dl class="meta">
        <div><dt>Plan</dt><dd>Rago Hub Premium</dd></div>
        <div><dt>Since</dt><dd class="mono">${fmtDate(license.created_at)}</dd></div>
      </dl>
      ${active ? '' : html`<p class="muted small">This license no longer works in Rago Hub. ${support} if you think that's a mistake.</p>`}
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

  const noLicense = html`<article class="card card-hero rg-chamfer rise d1">
      <p class="overline">Rago Hub Premium</p>
      <h2 class="h1">No license on this account yet</h2>
      <p class="muted">Get Rago Hub Premium to unlock the app. Already paid with another email? Sign in with that email, or open the link in your purchase email.</p>
      <a class="btn btn-heat btn-lg" href="/buy">Get Rago Hub Premium</a>
      <p class="muted small">Secure checkout with Stripe.</p>
    </article>`;

  const body = html`<main class="dash">
    <div class="dash-head rise">
      <div><p class="overline">Your account</p><h1 class="display">${license ? 'Rago Hub Premium' : 'Welcome to Rago'}</h1></div>
      ${steps(stepIndex)}
    </div>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    <div class="grid">
      ${license ? [download(), licenseCard(), deviceCard()] : noLicense}
    </div>
  </main>`;
  return page({ title: 'Your account', cfg, user, body, bodyClass: 'is-dash' });
}
