// Transactional email through Resend (https://resend.com). Without RESEND_API_KEY, emails are
// printed to the console so the flow still works in development.
// Layout: tables with inline colors on every cell, because many webmails drop the <body> style.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const P = 'margin:0 0 16px;color:#C7C7CE;font-size:15px;line-height:1.6';
const SMALL = 'margin:0 0 12px;color:#8E8E98;font-size:13px;line-height:1.6';
const LINK = 'color:#FF5E55;text-decoration:underline';

function layout(cfg, title, bodyHtml) {
  const footLinks = [
    [`${cfg.siteUrl}/terms.html`, 'Terms'], [`${cfg.siteUrl}/privacy.html`, 'Privacy'], [`${cfg.siteUrl}/refunds.html`, 'Refunds'],
    ...(cfg.supportUrl ? [[cfg.supportUrl, 'Support on Discord']] : []),
  ].map(([h, l]) => `<a href="${esc(h)}" style="color:#8E8E98;text-decoration:underline">${l}</a>`).join(' &middot; ');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#0A0A0B">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0A0A0B" style="background:#0A0A0B">
<tr><td align="center" bgcolor="#0A0A0B" style="background:#0A0A0B;padding:40px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<tr><td style="padding:0 0 32px"><img src="${esc(cfg.publicUrl)}/assets/email-wordmark.png" width="180" height="29" alt="Rago Optimizer" style="display:block;border:0;outline:none;color:#F5F5F6;font-size:18px;font-weight:600"></td></tr>
<tr><td style="color:#F5F5F6"><h1 style="margin:0 0 16px;color:#F5F5F6;font-size:22px;line-height:1.3;letter-spacing:-.02em">${esc(title)}</h1>
${bodyHtml}</td></tr>
<tr><td style="padding:32px 0 0;border-top:1px solid #26262B"><p style="${SMALL}">Rago Optimizer. Every millisecond counts.</p><p style="${SMALL}">${footLinks}</p></td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href, label) => `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 12px"><tr>
<td bgcolor="#FF3B30" style="background:#FF3B30;border-radius:999px"><a href="${esc(href)}" style="display:inline-block;padding:13px 24px;color:#0A0A0B;font-weight:600;font-size:15px;text-decoration:none;border-radius:999px">${esc(label)}</a></td>
</tr></table><p style="${SMALL}">Or paste this link in your browser:<br><a href="${esc(href)}" style="${LINK};word-break:break-all">${esc(href)}</a></p>`;

const PLAN = { month: 'Monthly', year: 'Yearly', lifetime: 'Lifetime', reward: 'Affiliate reward' };
const money = (amount, currency) => (amount == null || !currency ? null
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100));
const day = (ms) => new Date(Number(ms)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

/** Order summary lines for the purchase email: plan, amount, renewal. */
export function orderLines(license = {}) {
  const lines = [['Plan', `Rago Optimizer Premium · ${PLAN[license.plan] || 'Lifetime'}`]];
  const paid = money(license.amount, license.currency);
  if (paid) lines.push(['Paid', paid]);
  if (license.plan === 'month' || license.plan === 'year') {
    lines.push(['Renews', license.current_period_end ? `${day(license.current_period_end)}, unless you cancel` : 'Automatically, unless you cancel']);
  }
  return lines;
}

export function createMailer(cfg, { log = console.log, fetchImpl = fetch } = {}) {
  async function send(to, subject, html, text) {
    if (!cfg.resendApiKey) {
      log(`[mail] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.mailFrom, to, subject, html, text, ...(cfg.mailReplyTo ? { reply_to: cfg.mailReplyTo } : {}) }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }

  return {
    send,
    /**
     * Sent right after payment: order summary, withdrawal waiver (durable medium), and the link to create
     * the account. claimUrl null: bought while signed in, the license is already on the account.
     */
    purchase(to, claimUrl, license = {}) {
      const lines = orderLines(license);
      const table = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:8px 0 20px;border:1px solid #26262B;border-radius:16px">
${lines.map(([k, v]) => `<tr><td style="padding:10px 16px;color:#8E8E98;font-size:13px;width:90px">${esc(k)}</td><td style="padding:10px 16px;color:#F5F5F6;font-size:14px">${esc(v)}</td></tr>`).join('\n')}</table>`;
      const waiver = 'You asked for immediate access to Premium and agreed that your 14-day right of withdrawal ends once the license is delivered.';
      const sub = license.plan === 'month' || license.plan === 'year';
      // Text version: the portal link alone at the end of its line, no punctuation glued to it.
      const cancelText = sub ? ` Cancel anytime from your account (Cancel or manage subscription)${cfg.portalLoginUrl ? `, or cancel with your email at:\n${cfg.portalLoginUrl}` : '.'}` : '';
      const cancelHtml = sub ? ` Cancel anytime from your account (Cancel or manage subscription)${cfg.portalLoginUrl ? `, or <a href="${esc(cfg.portalLoginUrl)}" style="${LINK}">with your email here</a>` : ''}.` : '';
      const intro = claimUrl
        ? 'Thanks for getting Rago Optimizer Premium. Create your account to get your license and download Rago Optimizer for Windows. If you already have an account with this email, just sign in.'
        : 'Thanks for getting Rago Optimizer Premium. Your license is on your account: download Rago Optimizer for Windows, sign in with the same email and click Activate.';
      const href = claimUrl || `${cfg.publicUrl}/account`;
      const discord = cfg.supportUrl
        ? 'Premium players get the Premium role on our Discord: join the server, open a ticket and give the email of your Rago Optimizer account. Staff check your license and add the role.'
        : '';
      const html = `<p style="${P}">${esc(intro)}</p>
${table}${button(href, claimUrl ? 'Create your account' : 'Open your account')}
${claimUrl ? `<p style="${SMALL}">This link only works for your purchase. Keep it private.</p>` : ''}
<p style="${SMALL}">${esc(waiver)}${cancelHtml} <a href="${esc(cfg.siteUrl)}/terms.html" style="${LINK}">Terms of Sale</a> &middot; <a href="${esc(cfg.siteUrl)}/refunds.html" style="${LINK}">Refunds and cancellation</a></p>
${discord ? `<p style="${SMALL}">${esc(discord)} <a href="${esc(cfg.supportUrl)}" style="${LINK}">Join the Discord</a></p>` : ''}`;
      const text = [
        `Payment confirmed. ${intro}`,
        ...lines.map(([k, v]) => `${k}: ${v}`),
        `${claimUrl ? 'Create your account' : 'Your account'}: ${href}`,
        `${waiver}${cancelText}`,
        `Terms: ${cfg.siteUrl}/terms.html  Refunds: ${cfg.siteUrl}/refunds.html`,
        ...(discord ? [`${discord} ${cfg.supportUrl}`] : []),
      ].join('\n');
      return send(to, 'Your Rago Optimizer Premium license', layout(cfg, 'Payment confirmed', html), text);
    },
    passwordReset(to, url) {
      return send(to, 'Reset your Rago Optimizer password',
        layout(cfg, 'Reset your password', `<p style="${P}">Someone asked to reset the password of your Rago Optimizer account. The link works for 1 hour. If it wasn't you, ignore this email: your password stays the same.</p>${button(url, 'Choose a new password')}`),
        `Reset your Rago Optimizer password (the link works for 1 hour): ${url}`);
    },
  };
}
