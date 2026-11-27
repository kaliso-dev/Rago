# Lot 5 : emails (licensing/src/mailer.js). Textes repris tels quels ; dates, montants et liens = exemples.
# Contraintes e-mail : tableaux, styles en ligne, pas d'inclinaison CSS (Outlook), titre en Barlow Condensed avec
# repli Arial Narrow / Arial là où les polices web sont bloquées (Gmail).
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_site as G
from gen_route import page

OUT = G.OUT
ACC = 'https://account.rago-optimizer.com'
SITE = 'https://rago-optimizer.com'
SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
COND = "'Barlow Condensed','Arial Narrow',Arial,sans-serif"
P = 'margin:0 0 16px;color:#C7C7CE;font-size:15px;line-height:1.6'
SMALL = 'margin:0 0 12px;color:#8E8E98;font-size:13px;line-height:1.6'
LINK = 'color:#FF5E55;text-decoration:underline'


def layout(title, body):
    links = ' &middot; '.join(f'<a style="color:#8E8E98;text-decoration:underline">{l}</a>' for l in ['Terms', 'Privacy', 'Cancellation', 'Support on Discord'])
    return f'''<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0A0A0B" style="background:#0A0A0B">
<tr><td align="center" style="padding:0 0 36px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;font-family:{SANS}">
<tr><td style="padding:0"><img src="img/email/email-header.png" width="600" height="120" alt="Rago Optimizer" style="display:block;border:0;width:600px;height:120px"></td></tr>
<tr><td style="padding:34px 40px 0;color:#F5F5F6"><h1 style="margin:0 0 18px;color:#F5F5F6;font-family:{COND};font-weight:900;font-style:italic;font-size:38px;line-height:1;text-transform:uppercase;letter-spacing:-.005em">{title}</h1>
{body}</td></tr>
<tr><td style="padding:0 40px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:28px 0 0;border-top:1px solid #26262B">
<p style="margin:0 0 10px;color:#F5F5F6;font-family:{COND};font-weight:900;font-style:italic;font-size:16px;text-transform:uppercase;letter-spacing:.02em">Rago Optimizer. Every millisecond counts.</p>
<p style="{SMALL}">{links}</p></td></tr></table></td></tr>
</table></td></tr></table>'''


def button(href, label):
    return f'''<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 14px"><tr>
<td bgcolor="#FF3B30" style="background:#FF3B30;border-radius:10px"><a style="display:inline-block;padding:16px 30px;color:#0A0A0B;font-family:{COND};font-weight:800;font-size:18px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none">{label}</a></td>
</tr></table><p style="{SMALL}">Or paste this link in your browser:<br><a style="{LINK};word-break:break-all">{href}</a></p>'''


def table(lines):
    rows = ''.join(f'<tr><td style="padding:12px 18px;color:#8E8E98;font-size:13px;width:110px;border-top:1px solid #1F1F23;vertical-align:top">{k}</td>'
                   f'<td style="padding:12px 18px;color:#F5F5F6;font-size:14px;border-top:1px solid #1F1F23">{v}</td></tr>' for k, v in lines)
    rows = rows.replace('border-top:1px solid #1F1F23', 'border-top:0', 2)
    return f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#111113" style="margin:6px 0 4px;background:#111113;border:1px solid #26262B;border-radius:14px">{rows}</table>'


WAIVER = "You asked for immediate access to Premium and agreed that your 14-day right of withdrawal ends once the license is delivered. Payments aren't refunded."
CANCEL = f' Cancel anytime from your account (Cancel or manage subscription), or <a style="{LINK}">with your email here</a>.'
DISCORD = 'Premium players get the Premium role on our Discord: join the server, open a ticket and give the email of your Rago Optimizer account. Staff check your license and add the role.'


def purchase():
    intro = 'Thanks for getting Rago Optimizer Premium. Create your account to get your license and download Rago Optimizer for Windows. If you already have an account with this email, just sign in.'
    t = table([('Plan', 'Rago Optimizer Premium · Monthly'), ('Paid', '$5.99'), ('Renews', 'December 22, 2026, unless you cancel')])
    body = (f'<p style="{P}">{intro}</p>{t}{button(ACC + "/claim/8f3c…e21a", "Create your account")}'
            f'<p style="{SMALL}">This link only works for your purchase. Keep it private.</p>'
            f'<p style="{SMALL}">{WAIVER}{CANCEL} <a style="{LINK}">Terms of Sale</a> &middot; <a style="{LINK}">Cancellation</a></p>'
            f'<p style="{SMALL}">{DISCORD} <a style="{LINK}">Join the Discord</a></p>')
    return 'Your Rago Optimizer Premium license', layout('Payment confirmed', body)


def trial():
    intro = ('Your 3-day free trial of Rago Optimizer Premium started. On November 25, 2026, your card is charged $5.99, then at each renewal, unless you cancel before. '
             'Cancel anytime from your account: you pay nothing. Download Rago Optimizer for Windows from your account, sign in with the same email and click Activate.')
    t = table([('Plan', 'Rago Optimizer Premium · Monthly'), ('Paid', '$0.00'), ('Free trial', '3 days'), ('First payment', 'November 25, 2026, $5.99, unless you cancel before')])
    body = (f'<p style="{P}">{intro}</p>{t}{button(ACC + "/account", "Open your account")}'
            f'<p style="{SMALL}">{WAIVER}{CANCEL} <a style="{LINK}">Terms of Sale</a> &middot; <a style="{LINK}">Cancellation</a></p>'
            f'<p style="{SMALL}">{DISCORD} <a style="{LINK}">Join the Discord</a></p>')
    return 'Your 3-day free trial of Rago Optimizer Premium', layout('Free trial started', body)


def code():
    cells = ''.join(f'<td width="64" height="76" align="center" bgcolor="#17171A" style="width:64px;height:76px;background:#17171A;border:1px solid #2A2A30;border-radius:10px;color:#F5F5F6;font-family:{COND};font-weight:900;font-style:italic;font-size:44px">{d}</td><td width="8" style="width:8px"></td>'
                    for d in '481207')
    big = f'<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 26px"><tr>{cells}</tr></table>'
    body = (f'<p style="{P}">Type this code on the sign-up page to create your Rago Optimizer account. It works for 15 minutes.</p>{big}'
            f"<p style=\"{SMALL}\">If you didn't sign up, ignore this email: no account is created without the code.</p>")
    return '481207 is your Rago Optimizer code', layout('Confirm your email', body)


def canceled():
    txt = ('Your subscription is canceled. Premium stays active until December 22, 2026. No more charges. When it ends, Rago Optimizer puts back the settings its tweaks changed and goes back to the free plan. '
           "Changed your mind? Resume from the app's Settings or your account page before that date.")
    return 'Your subscription is canceled: Rago Optimizer Premium', layout('Subscription canceled', f'<p style="{P}">{txt}</p>{button(ACC + "/account", "Open your account")}')


def reset():
    txt = "Someone asked to reset the password of your Rago Optimizer account. The link works for 1 hour. If it wasn't you, ignore this email: your password stays the same."
    return 'Reset your Rago Optimizer password', layout('Reset your password', f'<p style="{P}">{txt}</p>{button(ACC + "/reset/5d1a…90bf", "Choose a new password")}')


CSS = r'''
.em-g{display:grid;grid-template-columns:repeat(2,640px);gap:28px 20px;justify-content:center;margin-top:34px;align-items:start}
.em{background:#0A0A0B;border:1px solid var(--line-2);overflow:hidden}
html.round .em{border-radius:20px}
.em-hd{padding:16px 20px;background:var(--bg-3);border-bottom:1px solid var(--line)}
.em-hd b{display:block;font-size:16px;font-weight:600;color:var(--ink)}
.em-hd span{display:flex;gap:10px;margin-top:4px;font-size:13px;color:var(--ink-3)}
.em-hd span em{font-style:normal;color:var(--ink-2)}
.em-bd{padding:0 20px}
.em-note{padding:26px 28px}
.em-note h3{margin-top:12px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:34px;line-height:.9;text-transform:uppercase}
.em-note img{display:block;width:100%;margin-top:18px;border:1px solid var(--line)}
html.round .em-note img{border-radius:10px}
.em-note ul{list-style:none;padding:0;display:grid;gap:10px;margin-top:18px}
.em-note li{position:relative;padding-left:22px;font-size:14px;line-height:1.55;color:var(--ink-2)}
.em-note li::before{content:"";position:absolute;left:0;top:.66em;width:10px;height:3px;background:var(--red);transform:skewX(var(--skew))}
.em-note li strong{color:var(--ink);font-weight:600}
'''

HEADER_CSS = r'''
.win.eh{width:600px;height:120px;min-height:0;background:#0A0A0B}
.win.eh::after{display:none}
.eh .s-dots{right:0;top:0;width:340px;height:120px;-webkit-mask:linear-gradient(270deg,#000 0,transparent 90%)}
.eh .in{position:absolute;left:40px;top:0;bottom:0;display:flex;align-items:center;gap:16px}
.eh img{width:58px;height:58px}
.eh b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:42px;line-height:1;text-transform:uppercase}
.eh b span{color:#8E8E98}
.eh .st{position:absolute;left:40px;right:40px;bottom:0;height:5px;background:var(--red);transform:skewX(var(--skew))}
.eh .st::after{content:"";position:absolute;right:0;top:0;bottom:0;width:62%;background:#0A0A0B}
'''


def header():
    return '<span class="s-dots"></span><div class="in"><img src="img/rago-app-dark-128.svg" alt=""><b>rago <span>optimizer</span></b></div><i class="st"></i>'


def board():
    cards = ''
    for fn in (purchase, trial, code, canceled, reset):
        subj, html = fn()
        cards += f'<div class="em"><div class="em-hd"><b>{subj}</b><span><em>Rago Optimizer</em>to {"alex@example.com"}</span></div><div class="em-bd">{html}</div></div>'
    note = ('<div class="s-card em-note"><p class="s-eb">template <b>//</b> for the developer</p><h3>one header image, live text.</h3>'
            '<img src="img/email/email-header.png" alt="">'
            '<ul><li><strong>email-header.png</strong> (1200 × 240, shown at 600 × 120) replaces email-wordmark.png.</li>'
            '<li>Titles use Barlow Condensed. Where web fonts are blocked (Gmail, Outlook), they fall back to Arial Narrow, then Arial, still bold italic capitals.</li>'
            '<li>The button stays a plain red rectangle with rounded corners: Outlook can’t slant it.</li>'
            '<li>Text, order lines and links are unchanged from mailer.js. Dates, amounts and links here are examples.</li></ul></div>')
    head = ('<div class="bd-h"><div><p class="s-eb">emails <b>//</b> resend</p><h1>five emails, one template.</h1></div>'
            '<p>Payment confirmed, free trial started, sign-up code, subscription canceled and password reset, with the same header, title and footer.</p></div>')
    return f'<main class="bd">{head}<div class="em-g">{cards}{note}</div></main>'


if __name__ == '__main__':
    import gen_account as A
    (OUT / 'email-header.html').write_text(page('Email header', header(), HEADER_CSS).replace('<div class="win site">', '<div class="win eh">'))
    (OUT / 'acc-emails.html').write_text(page('Emails', board(), A.CSS + CSS))
    print('ok')
