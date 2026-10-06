// Transactional email through Resend (https://resend.com). Without RESEND_API_KEY, emails are
// printed to the console so the flow still works in development.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#0A0A0B;color:#F5F5F6;font:15px/1.6 -apple-system,'Segoe UI',sans-serif">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
<div style="font:600 20px/1 'Segoe UI',sans-serif;letter-spacing:-.02em">RAGO<span style="display:inline-block;width:6px;height:6px;background:#FF3B30;vertical-align:top;margin-left:2px"></span></div>
<h1 style="font-size:22px;letter-spacing:-.02em;margin:32px 0 12px">${esc(title)}</h1>
${bodyHtml}
<p style="color:#7C7C86;font-size:12px;margin-top:40px">Rago Optimizer Premium. Every millisecond counts.</p>
</div></body></html>`;
}

const button = (href, label) =>
  `<p style="margin:28px 0"><a href="${esc(href)}" style="background:#FF3B30;color:#0A0A0B;text-decoration:none;font-weight:600;padding:13px 24px;border-radius:999px;display:inline-block">${esc(label)}</a></p>`;

export function createMailer(cfg, { log = console.log } = {}) {
  async function send(to, subject, html, text) {
    if (!cfg.resendApiKey) {
      log(`[mail] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.mailFrom, to, subject, html, text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }

  return {
    send,
    purchase(to, claimUrl) {
      return send(to, 'Your Rago Optimizer Premium license',
        layout('Payment confirmed', `<p style="color:#A1A1AA">Create your account to get your license and download Rago Optimizer for Windows. If you already created it, just sign in.</p>${button(claimUrl, 'Create your account')}<p style="color:#7C7C86;font-size:13px">This link only works for your purchase. Keep it private.</p>`),
        `Payment confirmed. Create your account to get your license: ${claimUrl}`);
    },
    passwordReset(to, url) {
      return send(to, 'Reset your Rago password',
        layout('Reset your password', `<p style="color:#A1A1AA">Someone asked to reset the password of your Rago account. The link works for 1 hour. If it wasn't you, ignore this email.</p>${button(url, 'Choose a new password')}`),
        `Reset your Rago password (valid 1 hour): ${url}`);
    },
  };
}
