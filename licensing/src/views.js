// Server-rendered account pages. Copy follows /brand/voice-en.md, look follows brand kit v1.1.
import { maskLicenseKey } from './crypto.js';
import { COMMENT_MAX } from './reviews.js';

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
  star: svg('M8 1.9l1.9 4 4.4.5-3.3 3.1.9 4.4L8 11.7l-3.9 2.2.9-4.4-3.3-3.1 4.4-.5z', 1.4),
};

/** Profile photo, or the first letter of the public name (or email) on a dark circle when there's none. */
export function avatar(user, size = 'sm') {
  const label = user?.display_name || user?.email || '?';
  const initial = [...label.trim()][0]?.toUpperCase() || '?';
  return user?.avatar_key
    ? html`<img class="avatar avatar-${size}" src="/avatars/${user.avatar_key}" alt="" width="${size === 'lg' ? 96 : 28}" height="${size === 'lg' ? 96 : 28}" decoding="async">`
    : html`<span class="avatar avatar-${size} avatar-none" aria-hidden="true">${initial}</span>`;
}

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
function page({ title, body, user, cfg, bodyClass = '', nav = '', cta = { href: '/login', label: 'Sign in' }, buy = !user, lang = 'en' }) {
  const pricing = `${cfg.siteUrl}/#pricing`;
  return `<!doctype html>
<html lang="${lang}">
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
${cfg.staging ? render(html`<div class="staging-bar" role="note"><b>Test server (${cfg.envName})</b> Not the real Rago: payments use Stripe test cards (4242 4242 4242 4242), accounts here are test accounts.</div>`) : ''}
<div class="bg" aria-hidden="true"><span></span><span></span></div>
<header class="top">
  <a class="brand" href="${escape(cfg.siteUrl)}/" aria-label="Rago Optimizer home">${render(WORDMARK)}</a>
  ${buy ? render(html`<a class="top-link" href="${pricing}">Pricing</a><a class="btn btn-primary btn-sm top-buy" href="${pricing}">Get Premium</a>`) : ''}
  ${user ? render(html`<nav class="tabs" aria-label="Account">
      <a href="/account" ${nav === 'account' ? html`aria-current="page"` : ''}>Account</a>
      <a href="/account/profile" ${nav === 'profile' ? html`aria-current="page"` : ''}>Profile</a>
      <a href="/affiliate" ${nav === 'affiliate' ? html`aria-current="page"` : ''}>Affiliate</a>
    </nav>
    <div class="top-user"><a class="top-avatar" href="/account/profile" aria-label="Your profile">${avatar(user)}</a><span class="top-email">${user.email}</span>
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
    : next === '/account/review' && !purchased
      ? html`<p class="overline rise">Reviews</p>
        <h1 class="display rise d1">Welcome back.</h1>
        <p class="lede rise d2">Sign in to leave your review of Rago Optimizer. It shows on the site with your public name.</p>`
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
  const form = sent && cfg.mailEnabled
    ? html`<h2 class="h2">Check your inbox</h2>
      ${cfg.mailEnabled
        ? html`<p class="muted">If an account exists for ${email ? html`<strong>${email}</strong>` : 'that email'}, a reset link is on its way. It works for 1 hour.</p>
          <p class="muted small">Nothing after 5 minutes? Check your spam folder, or ${supportLink(cfg, 'ask on Discord')}.</p>`
        : ''}
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
      <p class="lede rise d2">${cfg.mailEnabled ? "Enter the email of your account and we'll send you a link to choose a new one." : 'We reset it for you on Discord, from the email of your account.'}</p>`;
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
      <a class="btn btn-ghost" href="${cfg.supportUrl || `${cfg.siteUrl}/#faq`}" rel="noopener">Ask on Discord</a>
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

const PLAN = { month: 'Monthly', year: 'Yearly', lifetime: 'Lifetime', reward: 'Affiliate reward' };
// Months given by the team (admin grant-months) are a 'reward' license too, but not earned as an affiliate.
const planName = (license) => (license.plan === 'reward' && license.source === 'grant' ? 'Gift' : PLAN[license.plan] || 'Lifetime');
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

/** The ring for the current step towards the next reward; full (green) right after a reward, until the next player counts. */
const affiliateRing = (a, size) => (a.full ? ring(a.goal, a.goal, size) : ring(a.progress, a.goal, size, a.pending));

function affiliateLine(a) {
  const left = a.goal - a.progress;
  const next = `${left} more player${left === 1 ? '' : 's'} for ${a.months} months of Premium.`;
  if (a.maxed) return `Goal reached: ${a.months} months of Premium added to your license.`;
  if (a.rewards && a.progress === 0) return `Goal reached: ${a.months} months of Premium added. ${next}`;
  return next;
}

export function dashboardPage(cfg, { user, license, device, notice, error, canReset, nextResetAt, affiliate, discordLink, discordRewards = [], inviteRewards = [], review = null, lifetime = false }) {
  const active = license?.status === 'active';
  const reason = license?.status_reason;
  const ended = !active && reason === 'subscription_ended';
  const subscription = license && (license.plan === 'month' || license.plan === 'year');
  const canceling = active && subscription && license.cancel_at_period_end;
  // The 4 steps only make sense for a working license; a free or ended account gets no stepper.
  const stepIndex = active && license.source === 'stripe' ? (device ? 4 : 2) : null;
  const support = supportLink(cfg);
  const buyUrl = pricingUrl(cfg);
  const unlocks = `Premium unlocks all ${cfg.premiumTweaks} tweaks and every preset. The free version opens ${cfg.freeTweaks}.`;

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

  // The Premium role on Discord: the bot gives it once the player links their Discord account (cfg.discord) and
  // takes it back when Premium stops. Without the bot, staff give it on a ticket.
  const openDiscord = cfg.supportUrl ? html`<a class="link-arrow" href="${cfg.supportUrl}" rel="noopener">Open Discord ${ICON.arrow}</a>` : '';
  const unlinkForm = html`<form method="post" action="/account/discord/unlink" class="inline" data-busy="Unlinking…" data-confirm="Unlink Discord? The bot removes your Premium role on the Rago server.">
      <button class="btn btn-ghost btn-sm" type="submit">Unlink</button></form>`;
  const discordState = () => {
    const name = html`<strong>@${discordLink.discord_name || discordLink.discord_id}</strong>`;
    if (discordLink.role) {
      return { badge: html`<span class="badge badge-ok"><i></i>Role given</span>`, text: html`Linked to ${name}. The role stays while your Premium is active.`,
        actions: html`<form method="post" action="/account/discord/sync" class="inline" data-busy="Syncing…"><button class="btn btn-ghost btn-sm" type="submit">Role missing? Sync it</button></form>${unlinkForm}` };
    }
    if (discordLink.error === 'not_member') {
      return { badge: html`<span class="badge badge-wait"><i></i>Not on the server</span>`, text: html`Linked to ${name}, but that account isn't on the Rago server. Join it with Discord to get the role.`,
        actions: html`<a class="btn btn-primary btn-sm" href="/account/discord">Join with Discord</a>${unlinkForm}` };
    }
    return { badge: html`<span class="badge badge-wait"><i></i>Pending</span>`, text: html`Linked to ${name}. The role couldn't be given yet. It's tried again automatically.`,
      actions: html`<form method="post" action="/account/discord/sync" class="inline" data-busy="Syncing…"><button class="btn btn-ghost btn-sm" type="submit">Try again</button></form>${unlinkForm}` };
  };
  const discordBlock = () => {
    if (!active) return '';
    if (!cfg.discord) {
      return cfg.supportUrl ? html`<div class="discord">
        <span class="plan-icon">${ICON.users}</span>
        <div><strong>Premium channel on Discord</strong>
          <p class="muted small">Join the server and open a ticket with your account email, <strong>${user.email}</strong>. Staff check your license and give you the Premium role.</p></div>
      </div>` : '';
    }
    if (!discordLink) {
      return html`<div class="discord">
        <span class="plan-icon">${ICON.users}</span>
        <div><strong>Premium role on Discord</strong>
          <p class="muted small">Link your Discord account to join the Rago server with the Premium role. It stays while your Premium is active.</p></div>
      </div>`;
    }
    const st = discordState();
    return html`<div class="discord">
        <span class="plan-icon">${ICON.users}</span>
        <div><div class="row"><strong>Premium role on Discord</strong>${st.badge}</div>
          <p class="muted small">${st.text}</p>
          <div class="row">${st.actions}</div></div>
      </div>`;
  };

  // Discord rewards: VIP / MVP (given by an invite bot) and boosts bring Premium time and a one-use code.
  // Shown to every account, Premium or not: the free players are the ones inviting.
  const rewardsBlock = () => {
    if (!inviteRewards.length) return '';
    const has = (kind) => discordRewards.some((g) => g.kind === kind);
    // The 1-boost reward isn't offered any more once the 2-boost one, which replaces it, was given.
    const lines = inviteRewards.filter((r) => has(r.kind) || !inviteRewards.some((x) => x.replaces === r.kind && has(x.kind))).map((r) => {
      const got = discordRewards.find((g) => g.kind === r.kind);
      if (!got) return html`<li><strong>${r.name}</strong> · ${r.need}: ${r.label} of Premium and a ${r.percent}% discount code.</li>`;
      // 2 boosts after 1: the reward only topped it up to its own time.
      const label = r.topUp && has(r.replaces) ? r.topUp.label : r.label;
      const time = got.action === 'lifetime' ? 'You already have Premium for life.' : `${label} of Premium added${got.until ? `, Premium until ${fmtDate(got.until)}` : ''}.`;
      return html`<li><strong>${r.name}</strong> · <span class="badge badge-ok"><i></i>Earned</span> ${time}
        ${got.promo_code ? html`<br>Your ${r.percent}% code, one use: <code class="mono">${got.promo_code}</code> <a class="link-arrow" href="/buy?promo=${got.promo_code}">Use it ${ICON.arrow}</a>` : ''}</li>`;
    });
    // With Premium, the Premium role block above already shows the account.
    const linkedHere = discordLink && !active;
    return html`<div class="discord">
        <span class="plan-icon">${ICON.users}</span>
        <div><strong>Discord rewards</strong>
          <p class="muted small">Invite players to the Rago Discord or boost the server. ${discordLink
            ? 'Your rewards show up here a few minutes after you earn them.'
            : 'Link your Discord account to get your rewards here.'}</p>
          <ul class="small rewards">${lines}</ul>
          ${linkedHere ? html`<div class="row"><span class="muted small">Linked to <strong>@${discordLink.discord_name || discordLink.discord_id}</strong></span>${unlinkForm}</div>` : ''}</div>
      </div>`;
  };

  // Layout: the download card (Free, or the way back) across the page, the steps next to it, then two cards of full-width
  // rows: license key, device, plan; then Discord, affiliate program, your review. A row is as tall as what it says, with
  // its title on the left and its action on the right, so nothing has to stretch to match a neighbor: the page has no
  // hole whatever the account shows. On a phone each row stacks: title, content, action.
  const hero = (main, side) => html`<article class="card card-hero hero-split rise d1"><div class="hero-main">${main}</div>${side}</article>`;
  const sect = (cls, head, body, foot = '', id = '') => html`<section class="sect ${cls}"${id ? html` id="${id}"` : ''}>
      <div class="sect-head">${head}</div>
      <div class="sect-body">${body}</div>
      ${foot ? html`<div class="sect-foot">${foot}</div>` : ''}
    </section>`;
  const panel = (sections, cls) => {
    const list = sections.filter(Boolean);
    return list.length ? html`<div class="card dash-panel rise ${cls}">${list}</div>` : '';
  };

  // Everything Discord in one section: the Premium role, the Discord rewards, then Link / Open Discord.
  const discordSect = () => {
    const role = active ? discordBlock()
      : license && cfg.discord && discordLink ? html`<p class="muted small">Your Discord account <strong>@${discordLink.discord_name || discordLink.discord_id}</strong> stays linked: the Premium role comes back when Premium does.</p>` : '';
    const rewards = rewardsBlock();
    if (!role && !rewards) return '';
    const link = !discordLink && ((active && cfg.discord) || rewards) ? html`<a class="btn btn-primary btn-sm" href="/account/discord">Link Discord</a>` : '';
    const open = rewards || (active && (!cfg.discord || discordLink?.role)) ? openDiscord : '';
    return sect('sect-discord', html`<p class="overline">Discord</p>`, html`${role}${rewards}`,
      link || open ? html`<div class="row">${link}${open}</div>` : '');
  };

  const download = () => hero(html`
      <p class="overline">Rago Optimizer for Windows</p>
      <h2 class="h1">Download Rago Optimizer for Windows</h2>
      <p class="muted">Windows 10 and 11, 64-bit.${version}</p>
      <a class="btn btn-primary btn-lg" href="/account/download" data-download>${ICON.download}<span>Download Rago Optimizer</span></a>`, howto);

  // Premium stopped (ended, refunded, revoked): the way back comes first.
  const comeBack = () => hero(html`
      <p class="overline">Rago Optimizer Premium</p>
      <h2 class="h1">${ended ? 'Renew Premium' : 'Get Premium again'}</h2>
      <p class="muted">Rago Optimizer now runs as the free version on your PC. ${unlocks}</p>
      <div class="row"><a class="btn btn-buy btn-lg" href="${buyUrl}">${ended ? 'Renew Premium' : 'Get Premium'} ${ICON.arrow}</a>
        <a class="btn btn-ghost btn-lg" href="/account/download" data-download>${ICON.download}<span>Download the free version</span></a></div>
      <p class="muted small">Windows 10 and 11, 64-bit.${version}</p>`, howto);

  const freeCard = () => hero(html`
      <div class="hero-tag"><p class="overline">Your plan</p><span class="badge badge-off"><i></i>Free</span></div>
      <h2 class="h1">You're on Free</h2>
      <p class="muted">${cfg.freeTweaks} tweaks unlocked. ${unlocks.split('. ')[0]}.${cfg.priceLabel ? html` <strong class="price">${cfg.priceLabel}</strong>.` : ''}</p>
      <div class="row"><a class="btn btn-buy btn-lg" href="${buyUrl}">Get Premium ${ICON.arrow}</a>
        <a class="btn btn-ghost btn-lg" href="/account/download" data-download>${ICON.download}<span>Download the free version</span></a></div>
      <p class="muted small">${cfg.subscriptions ? (lifetime ? 'Monthly or yearly, cancel anytime, or Lifetime in one payment. Secure checkout with Stripe.' : 'Monthly or yearly. Secure checkout with Stripe. Cancel anytime.') : 'Secure checkout with Stripe.'} Already paid? Sign in with the email you paid with${cfg.mailEnabled ? ', or open the link in your purchase email' : ''}. Still not here? ${supportLink(cfg, 'Ask on Discord')} with your payment email and we'll add it to this account.</p>`, howto);

  const OFF = { subscription_ended: 'Ended', refunded: 'Refunded', disputed: 'Disputed', test_mode: 'Test purchase' };
  const offBadge = () => OFF[reason] || 'Revoked';
  const licenseSect = () => sect('sect-license', html`<p class="overline">License key</p>
      ${active ? html`<span class="badge badge-ok"><i></i>Active</span>` : html`<span class="badge badge-off"><i></i>${offBadge()}</span>`}`,
    html`<div class="key">
        <code class="mono" data-key="${license.key}" data-masked="${maskLicenseKey(license.key)}">${maskLicenseKey(license.key)}</code>
        <span class="key-actions">
          <button class="btn btn-ghost btn-sm" type="button" data-reveal-key>Show</button>
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${license.key}">${ICON.copy}<span>Copy</span></button>
        </span>
      </div>
      <dl class="meta">
        <div><dt>Plan</dt><dd>Rago Optimizer Premium · ${planName(license)}</dd></div>
        <div><dt>Since</dt><dd>${fmtDate(license.created_at)}</dd></div>
      </dl>
      ${active || ended ? '' : html`<p class="muted small sect-note">This license no longer works in Rago Optimizer. ${support} if you think that's a mistake.</p>`}`);

  const deviceSect = () => {
    const head = html`<p class="overline">Device</p><span class="mono small muted">${device && active ? '1 / 1' : '0 / 1'}</span>`;
    if (!device) {
      return sect('sect-device', head, active
        ? html`<div class="device device-empty"><span class="device-icon">${ICON.pc}</span><div><strong>Not activated yet</strong>
            <p class="muted small">Sign in to Rago Optimizer on your PC to activate it. Rago Optimizer works on one device per license.</p></div></div>`
        : html`<div class="device device-empty"><span class="device-icon">${ICON.pc}</span><div><strong>No device</strong>
            <p class="muted small">${ended ? 'Renew Premium, then sign in to the app on your PC to activate it.' : "This license can't be activated."}</p></div></div>`);
    }
    return sect('sect-device', head,
      html`<div class="device"><span class="device-icon">${ICON.pc}</span><div><strong>${device.name}</strong>
          <p class="muted small">${device.os || 'Windows'}${device.app_version ? ` · Rago Optimizer ${device.app_version}` : ''}</p>
          <p class="small">${active ? 'This license is active on 1 device.' : 'This PC was linked to the license. It now runs the free version.'}</p></div></div>
        <dl class="meta">
          <div><dt>Activated</dt><dd>${fmtDate(device.bound_at)}</dd></div>
          <div><dt>Last seen</dt><dd>${ago(device.last_seen_at)}</dd></div>
        </dl>
        ${active && !canReset ? html`<p class="muted small sect-note">Changed PCs? ${support}.${nextResetAt ? html` You can free it yourself from ${fmtDate(nextResetAt)}.` : ''}</p>` : ''}`,
      active && canReset ? html`<form method="post" action="/account/reset-device" class="inline" data-confirm="Free this license? At its next license check, Rago Optimizer signs out on ${device.name} and puts back its tweaks, and you can activate another PC. You can do this once every ${cfg.selfServiceResetDays} days.">
          <button class="btn btn-ghost btn-sm" type="submit">Use on another PC</button></form>` : '');
  };

  const planSect = () => {
    const end = license.current_period_end;
    const row = (...items) => (items.some(Boolean) ? html`<div class="row">${items}</div>` : '');
    if (license.plan === 'reward' && license.source === 'grant') {
      return sect('sect-plan', html`<p class="overline">Plan</p>${active ? html`<span class="badge badge-red"><i></i>Until ${fmtDate(end)}</span>` : html`<span class="badge badge-off"><i></i>${offBadge()}</span>`}`,
        html`<div class="plan-line"><span class="plan-icon">${ICON.clock}</span><div><strong>Rago Optimizer Premium · Gift</strong>
          <p class="muted small">${active
            ? `Offered by the Rago team. Premium until ${fmtDate(end)}, nothing to pay.`
            : ended ? `Your free Premium ended on ${fmtDate(end)}. Get Premium to keep every tweak unlocked.` : 'This license was revoked.'}</p></div></div>`,
        active ? row(html`<a class="btn btn-ghost btn-sm" href="${buyUrl}">Subscribe now, first payment on ${fmtDate(end)}</a>`)
          : ended ? row(html`<a class="btn btn-primary btn-sm" href="${buyUrl}">Get Premium</a>`) : '');
    }
    if (license.plan === 'reward') {
      const fromDiscord = license.source === 'discord';
      return sect('sect-plan', html`<p class="overline">Plan</p>${active ? html`<span class="badge badge-red"><i></i>Until ${fmtDate(end)}</span>` : html`<span class="badge badge-off"><i></i>${offBadge()}</span>`}`,
        html`<div class="plan-line"><span class="plan-icon">${ICON.users}</span><div><strong>Rago Optimizer Premium · ${fromDiscord ? 'Discord reward' : 'Affiliate reward'}</strong>
          <p class="muted small">${active
            ? fromDiscord ? `Earned by inviting players to the Rago Discord. Premium until ${fmtDate(end)}, nothing to pay.`
              : `Earned with the affiliate program. Premium until ${fmtDate(end)}, nothing to pay.${cfg.affiliateRewardMax === 1 ? '' : ` Bring ${cfg.affiliateGoal} more players to add ${cfg.affiliateRewardMonths} months.`}`
            : ended ? `Your ${fromDiscord ? 'Discord' : 'affiliate'} reward ended on ${fmtDate(end)}. Get Premium to keep every tweak unlocked.` : 'This license was revoked.'}</p></div></div>`,
        row(active ? html`<a class="btn btn-ghost btn-sm" href="${buyUrl}">Subscribe now, first payment on ${fmtDate(end)}</a>` : '', html`<a class="link-arrow" href="/affiliate">Open affiliate program ${ICON.arrow}</a>`));
    }
    if (license.plan === 'lifetime' || !subscription) {
      return sect('sect-plan', html`<p class="overline">Plan</p>${active ? html`<span class="badge badge-red"><i></i>Lifetime</span>` : html`<span class="badge badge-off"><i></i>${offBadge()}</span>`}`,
        html`<div class="plan-line"><span class="plan-icon">${ICON.infinity}</span><div><strong>Rago Optimizer Premium for life</strong>
          <p class="muted small">${active
            ? `${license.source === 'affiliate' ? 'Earned with the affiliate program. ' : ''}No renewals, nothing to pay.`
            : reason === 'refunded' ? 'Refunded. This license no longer works.' : reason === 'disputed' ? 'The payment was disputed. This license no longer works.' : 'This license was revoked.'}</p></div></div>`,
        row(portalButton(active ? 'Cancel or manage subscription' : 'Invoices and billing')));
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
      line = `Canceled. Premium keeps working until ${end ? fmtDate(end) : 'the end of the period'}, then Rago Optimizer goes back to the free version and puts back its tweaks.`;
      badge = html`<span class="badge badge-wait"><i></i>Ends ${end ? fmtDate(end) : 'soon'}</span>`;
      actions = html`${portalButton('Keep Premium', 'btn-primary')}`;
    } else {
      line = end ? `Renews on ${fmtDate(end)}. Cancel anytime.` : 'Renews automatically. Cancel anytime.';
    }
    // Lifetime on sale (2026-10-16): a subscriber can switch, the subscription stops once Lifetime is paid.
    if (active && lifetime) actions = html`${actions}<a class="btn btn-ghost btn-sm" href="/buy/lifetime">Switch to Lifetime</a>`;
    return sect('sect-plan', html`<p class="overline">Subscription</p>${badge}`,
      html`<div class="plan-line"><span class="plan-icon">${ICON.card}</span><div><strong>Rago Optimizer Premium · ${PLAN[license.plan]}</strong>
        <p class="muted small">${line}</p></div></div>`,
      row(actions));
  };

  const affiliateSect = () => sect('sect-aff', html`<p class="overline">Affiliate program</p>${affiliate ? html`<span class="mono small muted">${affiliate.full ? affiliate.goal : affiliate.progress} / ${affiliate.goal}${affiliate.pending ? ` · ${affiliate.pending} waiting` : ''}</span>` : ''}`,
    affiliate
      ? html`<div class="aff-mini">${affiliateRing(affiliate, 'sm')}<div class="aff-text">
          <p class="small muted">Your code</p><p class="code-sm mono">${affiliate.code}</p>
          <p class="small muted">${affiliateLine(affiliate)}</p></div></div>`
      : html`<div class="plan-line"><span class="plan-icon">${ICON.users}</span><div><strong>Bring ${cfg.affiliateGoal} players, get ${cfg.affiliateRewardMonths} months of Premium</strong>
          <p class="muted small">Share your code: players get ${cfg.affiliateDiscountPercent}% off. When ${cfg.affiliateGoal} players have bought Premium with it, you get ${cfg.affiliateRewardMonths} months of Premium.</p></div></div>`,
    html`<a class="link-arrow" href="/affiliate">${affiliate ? 'Open affiliate program' : 'Join the affiliate program'} ${ICON.arrow}</a>`);

  // A lifetime license has nothing to win from the affiliate program: no row for it until the player joins.
  const sideSect = () => (!affiliate && active && license?.plan === 'lifetime' ? '' : affiliateSect());

  // Premium: the player's review, left or edited on /account/review. Free accounts leave theirs in the app.
  const reviewSect = () => {
    const site = cfg.siteUrl.replace(/^https?:\/\//, '');
    if (!review) {
      return sect('sect-review', html`<p class="overline">Your review</p>`,
        html`<div class="plan-line"><span class="plan-icon">${ICON.star}</span><div><strong>How is Rago Optimizer working for you?</strong>
          <p class="muted small">Rate it and tell other players what changed. Your review shows on ${site} with your public name.</p></div></div>`,
        html`<div class="rate-quick" role="group" aria-label="Rate Rago Optimizer">${[1, 2, 3, 4, 5].map((n) => html`<a href="/account/review?rating=${n}" aria-label="${n} star${n === 1 ? '' : 's'}: ${RATING_WORDS[n]}" title="${RATING_WORDS[n]}">${STAR}</a>`)}</div>
        <a class="link-arrow" href="/account/review">Write your review ${ICON.arrow}</a>`, 'review');
    }
    const shown = review.status === 'published';
    return sect('sect-review', html`<p class="overline">Your review</p>${shown ? html`<span class="badge badge-ok"><i></i>On the site</span>` : html`<span class="badge badge-off"><i></i>Hidden</span>`}`,
      html`${stars(review.rating)}
        <p class="review-text review-clamp">${review.comment}</p>
        <p class="muted small">${shown ? `Updated ${fmtDate(review.updated_at)}.` : 'Hidden from the site by the Rago team.'}</p>`,
      html`<div class="row"><a class="btn btn-ghost btn-sm" href="/account/review">Edit review</a><a class="link-arrow" href="${cfg.siteUrl}/reviews.html">See all reviews ${ICON.arrow}</a></div>`, 'review');
  };

  // Free: the affiliate program, then Discord. Premium (or ended): license key, device, plan; then Discord, the affiliate
  // program and the review.
  const cards = !license
    ? [freeCard(), panel([affiliateSect(), discordSect()], 'd2')]
    : [active ? download() : comeBack(), panel([licenseSect(), deviceSect(), planSect()], 'd2'),
      panel([discordSect(), sideSect(), active ? reviewSect() : ''], 'd3')];

  const title = !license ? 'Welcome to Rago Optimizer'
    : active ? 'Rago Optimizer Premium'
      : ended ? 'Your Premium ended' : 'Your Premium access ended';
  const body = html`<main class="dash">
    <div class="dash-head rise">
      <div><p class="overline">Your account</p><h1 class="display">${title}</h1></div>
      ${stepIndex == null ? '' : steps(stepIndex)}
    </div>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    <div class="dash-stack">${cards}</div>
    <p class="dash-foot small muted rise d5">Signed in as ${user.email} · <a href="/account/profile">Profile photo and name</a> · <a href="/account/password">Change password</a></p>
  </main>`;
  return page({ title: 'Your account', cfg, user, body, bodyClass: 'is-dash', nav: 'account', buy: !active });
}

const STAR = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`;
const stars = (n, attrs = '') => html`<p class="stars" role="img" aria-label="${n} out of 5 stars" ${new Raw(attrs)}>${Array.from({ length: 5 }, (_, i) => html`<span class="${i < n ? 'on' : ''}">${STAR}</span>`)}</p>`;
// What each rating means, shown next to the stars while the player picks one.
const RATING_WORDS = ['', 'Not for me', 'Could be better', 'Good', 'Great', 'Excellent'];

/**
 * Public profile: photo and name, shown with the player's review on the site and in Rago Optimizer.
 * Right after sign-up (welcome) it's an optional step, with "Skip for now" back to where the player was going.
 */
export function profilePage(cfg, { user, review, premium = false, notice, error, welcome = false, to = null }) {
  const keep = welcome ? html`<input type="hidden" name="welcome" value="1"><input type="hidden" name="to" value="${to}">` : '';
  const site = cfg.siteUrl.replace(/^https?:\/\//, '');
  const aside = welcome
    ? html`<p class="overline rise">Account created</p>
      <h1 class="display rise d1">Add a profile photo.</h1>
      <p class="lede rise d2">It shows next to your name when you leave a review, on ${site} and in Rago Optimizer. You can skip it and add one later from your account.</p>`
    : html`<p class="overline rise">Your public profile</p>
      <h1 class="display rise d1">Photo and name.</h1>
      <p class="lede rise d2">They show with your review on ${site}, and in Rago Optimizer when you're signed in. Your email is never shown.</p>`;
  const form = html`
    <h2 class="h2">${welcome ? 'Profile photo' : 'Your profile'}</h2>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    <div class="profile-photo">
      <span class="profile-preview" data-avatar-preview>${avatar(user, 'lg')}</span>
      <div class="profile-photo-text"><strong>${user.display_name || 'No public name yet'}</strong>
        <p class="muted small">${user.avatar_key ? 'Your photo is a 256 × 256 picture, cropped to a square.' : 'No photo yet: the first letter of your name shows instead.'}</p></div>
    </div>
    <form method="post" action="/account/profile/photo" enctype="multipart/form-data" class="form" data-busy="Uploading…">
      <div class="field">
        <label class="field-label" for="f-photo">${user.avatar_key ? 'New photo' : 'Photo'}</label>
        <div class="file-drop" data-file-drop>
          <input class="file-input" id="f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required aria-describedby="f-photo-hint" data-avatar-input>
          <span class="btn btn-ghost btn-sm file-btn" aria-hidden="true">Choose a photo</span>
          <span class="file-name" aria-hidden="true" data-file-name>or drop it here</span>
        </div>
        <span class="field-hint" id="f-photo-hint">JPG, PNG, WebP or GIF, 5 MB at most. We crop it to a square and make it lighter.</span>
      </div>
      ${keep}
      <button class="btn btn-primary btn-block" type="submit">${user.avatar_key ? 'Replace photo' : 'Upload photo'}</button>
    </form>
    ${user.avatar_key ? html`<form method="post" action="/account/profile/photo/remove" class="inline" data-confirm="Remove your profile photo?">${keep}<button class="btn btn-ghost btn-sm" type="submit">Remove photo</button></form>` : ''}
    ${welcome
      ? html`<div class="row profile-next">${notice ? html`<a class="btn btn-primary" href="${to}">Continue ${ICON.arrow}</a>` : html`<a class="btn btn-ghost" href="${to}">Skip for now</a>`}</div>`
      : html`<hr class="sep">
    <form method="post" action="/account/profile/name" class="form" data-busy="Saving…">
      ${field({ label: 'Public name', name: 'name', value: user.display_name || '', autocomplete: 'nickname', hint: "Shown with your review instead of your email. 2 to 32 characters.", attrs: 'minlength="2" maxlength="32" spellcheck="false"' })}
      <button class="btn btn-ghost btn-block" type="submit">Save name</button>
    </form>
    <div class="profile-review">
      <p class="overline">Your review</p>
      ${review
        ? html`${stars(review.rating)}
          <p class="review-text">${review.comment}</p>
          <p class="muted small">${review.status === 'published' ? `Shown on ${site}.` : 'Hidden from the site by the Rago team.'} ${premium ? html`<a href="/account/review">Edit your review</a>` : 'To change it, open Rago Optimizer, then Settings.'}</p>
          <form method="post" action="/account/profile/review/delete" class="inline" data-confirm="Delete your review? It's removed from ${site}.">
            <button class="btn btn-ghost btn-sm" type="submit">Delete review</button>
          </form>`
        : premium
          ? html`<p class="muted small">No review yet. <a href="/account/review">Leave one here</a>, or in Rago Optimizer, in Settings.</p>`
          : html`<p class="muted small">No review yet. Rago Optimizer asks for one after a few minutes of use, or open Settings in the app.</p>`}
    </div>`}`;
  return page({ title: welcome ? 'Add a profile photo' : 'Your profile', cfg, user, nav: 'profile', buy: false, body: split({ aside, form }) });
}

/**
 * The review, from the account page (2026-10-11): Premium accounts rate Rago Optimizer and write it here, the same
 * review as in the app. Free accounts are sent to the app, and can still delete a review they left there.
 * The left side previews the card players see on the site; account.js updates it as the player types.
 * @param draft what the player typed, when the server refused it: the form shows it again
 * @param rating stars picked on the account page (?rating=), before the form
 */
export function reviewPage(cfg, { user, premium, review, draft = null, rating = null, notice, error }) {
  const site = cfg.siteUrl.replace(/^https?:\/\//, '');
  const shown = review?.status === 'published';
  const value = draft || { rating: rating || review?.rating || 0, comment: review?.comment || '', name: user.display_name || '' };
  const name = value.name.trim() || user.display_name || 'Your name';
  // Photo, or the first letter of the name being typed (of the email when there's none yet).
  const face = avatar({ ...user, display_name: value.name.trim() || user.display_name });
  const month = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const PLACEHOLDER = 'Your review shows here, as you write it.';

  const preview = html`<figure class="review-card rise d3" data-review-preview aria-label="Preview of your review on ${site}">
      ${stars(value.rating, 'data-preview-stars')}
      <p class="review-card-text${value.comment.trim() ? '' : ' is-empty'}" data-preview-text data-empty="${PLACEHOLDER}">${value.comment.trim() || PLACEHOLDER}</p>
      <footer><span data-preview-avatar>${face}</span><span class="review-card-name" data-preview-name>${name}</span><small>${month(review ? Number(review.updated_at) : Date.now())}</small></footer>
    </figure>`;
  const status = review ? html`<p class="review-state small"><span class="badge ${shown ? 'badge-ok' : 'badge-off'}"><i></i>${shown ? 'On the site' : 'Hidden'}</span>
      <span class="muted">${shown ? `Shown on ${site} since ${fmtDate(review.updated_at)}.` : html`Hidden from the site by the Rago team. ${supportLink(cfg, 'Ask on Discord')} if you think that's a mistake.`}</span></p>` : '';
  const del = review ? html`<form method="post" action="/account/review/delete" class="inline review-delete" data-confirm="Delete your review? It's removed from ${site}.">
      <button class="btn btn-ghost btn-sm" type="submit">Delete review</button></form>` : '';
  const allReviews = html`<a class="link-arrow review-all" href="${cfg.siteUrl}/reviews.html">See all reviews on ${site} ${ICON.arrow}</a>`;

  if (!premium) {
    const aside = html`<p class="overline rise">Your review</p>
      <h1 class="display rise d1">Leave your review in Rago Optimizer.</h1>
      <p class="lede rise d2">Writing it from your account page is part of Premium. On the free version, open Rago Optimizer, then Settings, then Leave a review. It shows on ${site} the same way.</p>
      ${review ? preview : ''}`;
    const form = html`<h2 class="h2">Leave a review</h2>
      ${alertBox(error)}${alertBox(notice, 'ok')}
      <div class="plan-line review-locked"><span class="plan-icon">${ICON.star}</span><div><strong>Part of Rago Optimizer Premium</strong>
        <p class="muted small">Premium members rate Rago Optimizer and write their review right here. Everyone can leave one in the app.</p></div></div>
      <div class="stack review-actions"><a class="btn btn-primary btn-block" href="${pricingUrl(cfg)}">Get Premium ${ICON.arrow}</a><a class="btn btn-ghost btn-block" href="/account">Back to your account</a></div>
      ${review ? html`<hr class="sep">${status}${del}` : ''}
      ${allReviews}`;
    return page({ title: 'Your review', cfg, user, nav: 'account', buy: true, bodyClass: 'is-review', body: split({ aside, form }) });
  }

  const aside = html`<p class="overline rise">Your review</p>
    <h1 class="display rise d1">${review ? 'Update your review.' : 'Tell players what changed.'}</h1>
    <p class="lede rise d2">It shows on ${site} with your public name and photo, as written. Your email is never shown.</p>
    ${preview}
    <p class="muted small rise d4 review-preview-note">Preview of your review on ${site}.</p>`;
  const form = html`<h2 class="h2">${review ? 'Edit your review' : 'Rate Rago Optimizer'}</h2>
    ${alertBox(error)}${alertBox(notice, 'ok')}
    ${status}
    <form method="post" action="/account/review" class="form review-form" data-busy="${review ? 'Saving…' : 'Posting…'}" data-review-form>
      <fieldset class="field rate-field">
        <legend class="field-label">Your rating</legend>
        <div class="rate-row">
          <div class="rate">${[1, 2, 3, 4, 5].map((n) => html`<input class="sr-only" type="radio" id="f-rate-${n}" name="rating" value="${n}" ${value.rating === n ? html`checked` : ''} required><label for="f-rate-${n}" title="${RATING_WORDS[n]}" data-word="${RATING_WORDS[n]}"><span class="sr-only">${n} star${n === 1 ? '' : 's'}, ${RATING_WORDS[n]}</span>${STAR}</label>`)}</div>
          <span class="rate-word" data-rate-word data-empty="Pick 1 to 5 stars" aria-hidden="true">${value.rating ? RATING_WORDS[value.rating] : 'Pick 1 to 5 stars'}</span>
        </div>
      </fieldset>
      <div class="field">
        <span class="field-row"><label class="field-label" for="f-comment">Your review</label><span class="field-count mono" data-counter>${value.comment.length} / ${COMMENT_MAX}</span></span>
        <textarea id="f-comment" name="comment" rows="6" maxlength="${COMMENT_MAX}" required aria-describedby="f-comment-hint" placeholder="What do you play, and what changed? Ping, FPS, input lag, hit registration…">${value.comment}</textarea>
        <span class="field-hint" id="f-comment-hint">Long reviews are shortened on the home page, with a link to read them in full.</span>
      </div>
      <div class="field">
        <label class="field-label" for="f-name">Public name</label>
        <span class="review-name"><span data-name-avatar>${face}</span><span class="field-box"><input id="f-name" name="name" type="text" value="${value.name}" autocomplete="nickname" required minlength="2" maxlength="32" spellcheck="false" aria-describedby="f-name-hint"></span></span>
        <span class="field-hint" id="f-name-hint">Shown with your review instead of your email, and in Rago Optimizer. ${user.avatar_key ? html`<a href="/account/profile">Change your photo</a>` : html`<a href="/account/profile">Add a photo</a>`}</span>
      </div>
      <button class="btn btn-primary btn-block" type="submit">${review ? 'Update review' : 'Post review'}</button>
    </form>
    <div class="row review-foot">${del}${allReviews}</div>`;
  return page({ title: 'Your review', cfg, user, nav: 'account', buy: false, bodyClass: 'is-review', body: split({ aside, form }) });
}

const RULES = (cfg, closed = false) => [
  `A player counts once they've paid, used your code and activated Rago Optimizer on their PC.`,
  cfg.affiliateHoldDays
    ? `Each purchase counts ${cfg.affiliateHoldDays} days after payment. Refunds and chargebacks don't count.`
    : "A player who's refunded or files a chargeback stops counting.",
  ...(closed ? [] : [`Players type your code at checkout for ${cfg.affiliateDiscountPercent}% off, or when they create their account right after paying. It can’t be added later.`]),
  "Your own purchases don't count: a player activated on one of your PCs, or paid with your account email, is left out. Rewards gained by cheating can be taken back.",
  `Your code works for ${cfg.affiliateMaxReferrals} players. A refunded player, or one on your PC, frees their spot.`,
  `${cfg.affiliateGoal} players counted = ${cfg.affiliateRewardMonths} months of Premium on one PC${cfg.affiliateRewardMax === 1 ? ', once' : ''}. Subscribed? Your payments pause for ${cfg.affiliateRewardMonths} months instead.`,
];

const VOID = { subscription_ended: 'Subscription ended', refunded: 'Refunded', disputed: 'Chargeback', same_device: 'Same PC as yours', same_payer: 'Same payer as you', revoked: 'License revoked', test_mode: 'Test purchase' };

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
      <li><span class="how-n mono">2</span><div><strong>Share it with players</strong><p class="muted small">They get ${cfg.affiliateDiscountPercent}% off Premium with it at checkout.</p></div></li>
      <li><span class="how-n mono">3</span><div><strong>${goal} players, ${cfg.affiliateRewardMonths} months of Premium</strong><p class="muted small">Once ${goal} players have activated Rago Optimizer, you get ${cfg.affiliateRewardMonths} months, nothing to pay.</p></div></li>
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
      <h1 class="display rise d1">Bring ${goal} players. Get ${cfg.affiliateRewardMonths} months of Premium.</h1>
      <p class="lede rise d2">Share your code with ${cfg.affiliateMaxReferrals} players: they get ${cfg.affiliateDiscountPercent}% off Rago Optimizer Premium, and you get ${cfg.affiliateRewardMonths} months of Premium once ${goal} of them have activated it.</p>
      ${how}`;
    return page({ title: 'Affiliate program', cfg, user, nav: 'affiliate',
      body: html`<main class="split">
        <section class="split-aside">${pulse}${aside}</section>
        <section class="split-form"><div class="panel rise d2">${panel}</div></section></main>` });
  }

  const left = goal - summary.progress;
  const fresh = summary.rewards > 0 && summary.progress === 0;
  const body = html`<main class="dash">
    <div class="dash-head rise">
      <div><p class="overline">Affiliate program</p><h1 class="display">${summary.maxed ? 'Goal reached.' : fresh ? `${summary.months} months of Premium added.` : `${left} more to go.`}</h1></div>
    </div>
    ${joined ? alertBox("You're in. Share your code with players before they buy.", 'ok') : ''}
    <div class="grid">
      <article class="card card-code rise d1">
        <p class="overline">Your referral code</p>
        <div class="code-big"><code class="mono">${summary.code}</code>
          ${summary.codeFull ? '' : html`<button class="btn btn-primary btn-sm" type="button" data-copy="${summary.code}">${ICON.copy}<span>Copy</span></button>`}</div>
        ${summary.maxed
          ? html`<p class="small"><strong>Your code is closed.</strong> You got your ${summary.months} months of Premium: the code no longer gives a discount or counts new players.</p>`
          : summary.codeFull
            ? html`<p class="small"><strong>Your code is full:</strong> ${summary.maxReferrals} players used it. It opens again only if one of them is refunded.</p>`
            : html`<div class="share"><span class="mono small share-url"><bdi>${cfg.siteUrl.replace(/^https?:\/\//, '')}/?ref=${summary.code}</bdi></span>
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${cfg.siteUrl}/?ref=${summary.code}">${ICON.copy}<span>Copy link</span></button></div>
        <p class="muted small">Players type the code at checkout for <strong>${summary.discount}% off</strong>, or in the <strong>Referral code</strong> field when they create their account after paying. With your link, the discount and the code are applied for them.</p>`}
      </article>
      <article class="card card-progress rise d2">
        <div class="card-head"><p class="overline">Progress</p>${summary.rewards ? html`<span class="badge badge-red"><i></i>${summary.rewards === 1 ? '1 reward' : `${summary.rewards} rewards`}</span>` : ''}</div>
        <div class="progress">${affiliateRing(summary, 'lg')}
          <div class="progress-text">${summary.full ? slots(goal, goal) : slots(summary.progress, goal, summary.pending)}
            <p class="small">${summary.maxed
              ? `Goal reached: ${summary.months} months of Premium added to your license.${summary.pending ? '' : ` Your code is now closed.`}`
              : html`${fresh ? `Goal reached: ${summary.months} months of Premium added to your license. Your next ${goal} players add ${summary.months} more months.` : html`<strong>${summary.progress} of ${goal}</strong> players counted${summary.rewards ? ' towards your next reward' : ''}.`}${summary.pending ? ` ${summary.pending} waiting: a player counts once they've activated Rago Optimizer${cfg.affiliateHoldDays ? ` and ${cfg.affiliateHoldDays} days have passed since their payment` : ' on their PC'}.` : ''}`}</p>
            ${summary.rewards ? html`<a class="link-arrow" href="/account">See your license ${ICON.arrow}</a>` : ''}</div>
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
        <ul class="rules small muted">${RULES(cfg, summary.maxed).map((r) => html`<li>${r}</li>`)}</ul>
      </article>
    </div>
  </main>`;
  return page({ title: 'Affiliate program', cfg, user, body, bodyClass: 'is-dash', nav: 'affiliate' });
}

// ---------- /admin: the site's discount pop-up. In French, only Sofiene uses it. ----------
const adminShell = (cfg, title, body) => page({ title, cfg, body, buy: false, lang: 'fr', bodyClass: 'is-admin', cta: { href: `${cfg.siteUrl}/`, label: 'Voir le site' } });

export function adminLoginPage(cfg, { error } = {}) {
  const aside = html`<p class="overline rise">Admin</p><h1 class="display rise d1">Pop-up du site.</h1>
    <p class="lede rise d2">Entre la clé ADMIN_KEY (dans les variables Railway) pour changer la réduction, le code et le texte de la pop-up.</p>`;
  const form = html`<h2 class="h2">Accès admin</h2>${alertBox(error)}
    <form method="post" action="/admin/login" class="form" data-busy="Vérification…">
      ${field({ label: 'Clé admin', name: 'key', type: 'password', autocomplete: 'current-password' })}
      <button class="btn btn-primary btn-block" type="submit">Entrer</button>
    </form>`;
  return adminShell(cfg, 'Admin', split({ aside, form }));
}

/** The line under the code, same words as the site's pop-up (site/src/page.html). */
export const popupLeftLine = (total, left) => `Limited to the first ${total} players · ${left} left`;
const DURATION = { once: 'sur le premier paiement', forever: 'sur chaque paiement', repeating: 'pendant plusieurs mois' };
const ADMIN_NOTICES = {
  saved: 'Enregistré. Le site affiche la nouvelle version de la pop-up en moins d’une minute.',
  created: 'Code créé dans Stripe et enregistré. Le site l’affiche en moins d’une minute.',
  'test-ended': (n) => (n ? `${n === 1 ? 'La licence de test ne donne' : `Les ${n} licences de test ne donnent`} plus Premium.` : 'Aucune licence de test à arrêter.'),
};
const CHECK_BADGE = { ok: ['badge-ok', 'OK'], warn: ['badge-wait', 'À vérifier'], error: ['badge-red', 'À corriger'] };

/** "Paiements Stripe" on /admin: is everything set up in the key's mode (billing.js stripeChecks). */
function stripeSection(s) {
  if (!s) return '';
  const bad = s.checks.filter((c) => c.level === 'error').length;
  return html`<section class="checks rise d3" aria-labelledby="checks-h">
      <div class="row"><h2 class="h2" id="checks-h">Paiements Stripe</h2>
        <span class="badge ${bad ? 'badge-red' : s.mode === 'live' ? 'badge-ok' : 'badge-wait'}"><i></i>${bad ? `${bad} à corriger` : s.mode === 'live' ? 'Prêt pour le live' : `Mode ${s.mode || 'non configuré'}`}</span></div>
      <ul class="checks-list">${s.checks.map((c) => html`<li><span class="badge ${CHECK_BADGE[c.level][0]}"><i></i>${CHECK_BADGE[c.level][1]}</span>
        <div><strong class="small">${c.label}</strong><p class="muted small">${c.text}</p></div></li>`)}</ul>
      ${s.testLicenses ? html`<div class="checks-test">
        <p class="small"><strong>${s.testLicenses === 1 ? '1 licence active vient' : `${s.testLicenses} licences actives viennent`} d’un achat fait en mode test</strong> (rien n’a été payé). Elles donnent encore Premium, comptent pour les affiliés, et bloquent un nouvel achat sur ces comptes.</p>
        <form method="post" action="/admin/test-licenses" data-busy="Arrêt…" data-confirm="Arrêter ${s.testLicenses === 1 ? 'la licence de test' : `les ${s.testLicenses} licences de test`} ? Ces comptes repassent en version gratuite. Une licence offerte se redonne avec npm run admin -- grant."><button class="btn btn-ghost btn-sm" type="submit">Arrêter les licences de test</button></form>
      </div>` : ''}
    </section>`;
}
/** "Rôle Pro sur Discord" on /admin: the bot, the server, the role and its place (discord.js checks). */
function discordSection(d) {
  if (!d) return '';
  if (d.missing) {
    return html`<section class="checks rise d3" aria-labelledby="discord-h">
      <div class="row"><h2 class="h2" id="discord-h">Rôle Pro sur Discord</h2><span class="badge badge-off"><i></i>Manuel</span></div>
      <p class="muted small">Le bot n’est pas configuré : la page compte dit d’ouvrir un ticket pour avoir le rôle. À régler dans Railway : ${d.missing.join(', ')}.</p>
    </section>`;
  }
  const bad = d.checks.filter((c) => c.level === 'error').length;
  const needsInvite = d.checks.some((c) => c.label === 'Serveur' && c.level === 'error');
  return html`<section class="checks rise d3" aria-labelledby="discord-h">
      <div class="row"><h2 class="h2" id="discord-h">Rôle Pro sur Discord</h2>
        <span class="badge ${bad ? 'badge-red' : 'badge-ok'}"><i></i>${bad ? `${bad} à corriger` : 'Automatique'}</span></div>
      <ul class="checks-list">${d.checks.map((c) => html`<li><span class="badge ${CHECK_BADGE[c.level][0]}"><i></i>${CHECK_BADGE[c.level][1]}</span>
        <div><strong class="small">${c.label}</strong><p class="muted small">${c.text}</p></div></li>`)}</ul>
      ${needsInvite ? html`<a class="btn btn-ghost btn-sm" href="${d.inviteUrl}" rel="noopener">Inviter le bot sur le serveur</a>` : ''}
    </section>`;
}
const fill = (t, p) => String(t).replace(/\{(percent|code|total|left)\}/g, (_, k) => String(p[k] ?? ''));

export function adminPage(cfg, { state, stripe, discord, values, error, notice, count }) {
  const { settings: s, promo: p } = state;
  const v = values || { enabled: s.enabled, code: s.code, percent: p?.percent ?? '', limit: p?.total ?? '', eyebrow: s.eyebrow, title: s.title, text: s.text };
  const vals = p ? { percent: p.percent, code: p.code, total: p.total, left: p.left } : {};
  const facts = p ? html`<dl class="meta">
      <div><dt>Code</dt><dd class="mono">${p.code}</dd></div>
      <div><dt>Réduction</dt><dd>${p.percent == null ? 'Montant fixe' : `${p.percent} %`} ${DURATION[p.duration] || ''}${p.firstTime ? ', nouveaux clients' : ''}</dd></div>
      <div><dt>Utilisations</dt><dd>${p.total == null ? `${p.used}, sans limite` : `${p.used} sur ${p.total}`}</dd></div>
      <div><dt>Restantes</dt><dd>${p.total == null ? 'Illimité' : String(p.left)}</dd></div>
    </dl>` : '';
  // What visitors see, with the saved text (the form below may hold unsaved changes).
  const preview = p && p.percent > 0 ? html`<div class="pop-preview" aria-label="Aperçu de la pop-up">
      <p class="overline">${fill(s.eyebrow, vals)}</p>
      <p class="pop-preview-title">${new Raw(escape(s.title).replace(/\{(percent|code|total|left)\}/g, (_, k) => (k === 'percent' ? `<span>${escape(p.percent)}</span>` : escape(vals[k] ?? ''))))}</p>
      <p class="muted small">${fill(s.text, vals)}</p>
      <p class="pop-preview-code mono">${p.code}</p>
      ${p.total != null ? html`<p class="muted small">${popupLeftLine(p.total, p.left)}</p>` : ''}
    </div>` : '';
  const aside = html`<p class="overline rise">Admin · Stripe ${state.mode || 'non configuré'}</p>
    <h1 class="display rise d1">Pop-up du site.</h1>
    <div class="row rise d2"><span class="badge ${state.shown ? 'badge-ok' : 'badge-off'}"><i></i>${state.shown ? 'Affichée sur le site' : 'Masquée'}</span>
      ${state.reason ? html`<span class="muted small">${state.reason}</span>` : ''}</div>
    <div class="rise d2">${facts}</div>
    <div class="rise d3">${preview}</div>
    ${stripeSection(stripe)}
    ${discordSection(discord)}
    <form class="rise d4" method="post" action="/admin/logout"><button class="btn btn-ghost btn-sm" type="submit">Quitter l’admin</button></form>`;
  const form = html`<h2 class="h2">Modifier la pop-up</h2>
    ${alertBox(typeof ADMIN_NOTICES[notice] === 'function' ? ADMIN_NOTICES[notice](count) : ADMIN_NOTICES[notice], 'ok')}${alertBox(error)}
    <form method="post" action="/admin/popup" class="form" data-busy="Enregistrement…">
      <label class="check"><input type="checkbox" name="enabled" ${v.enabled ? html`checked` : ''}><span>Afficher la pop-up sur le site</span></label>
      ${field({ label: 'Code', name: 'code', value: v.code, autocomplete: 'off', attrs: 'maxlength="40" spellcheck="false" autocapitalize="characters" class="mono"',
        hint: 'Un code qui n’existe pas encore est créé dans Stripe, réservé aux nouveaux clients, sur le premier paiement.' })}
      <div class="pair">
        ${field({ label: 'Réduction (%)', name: 'percent', type: 'number', value: v.percent, required: false, attrs: 'min="1" max="99" step="any" inputmode="numeric"' })}
        ${field({ label: 'Nombre de clients', name: 'limit', type: 'number', value: v.limit, required: false, attrs: 'min="1" step="1" inputmode="numeric"' })}
      </div>
      <p class="field-hint">Stripe ne change pas la réduction ni le nombre de clients d’un code existant : pour une autre offre, tape un nouveau code. Nombre de clients vide : sans limite.</p>
      ${field({ label: 'Petit titre', name: 'eyebrow', value: v.eyebrow, attrs: 'maxlength="40"' })}
      ${field({ label: 'Titre', name: 'title', value: v.title, attrs: 'maxlength="80"' })}
      <div class="field">
        <label class="field-label" for="f-text">Texte</label>
        <textarea id="f-text" name="text" rows="3" maxlength="280" required aria-describedby="f-text-hint">${v.text}</textarea>
        <span class="field-hint" id="f-text-hint">En anglais, comme le site. {percent} devient la réduction, {code} le code, {total} le nombre de clients et {left} les places restantes.</span>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Enregistrer</button>
    </form>`;
  return adminShell(cfg, 'Pop-up du site', split({ aside, form }));
}
