import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
# Builds site/terms.html, privacy.html, refunds.html. Yellow <mark class="f"> = to fill in by the seller.
F=lambda t:f'<mark class="f">[{t}]</mark>'
SELLER=F("Seller legal name or company"); ADDR=F("Postal address"); COUNTRY=F("Country"); MAIL=F("Contact email"); REG=F("Business registration number, if any"); UPD="October 6, 2026"
HEAD='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0A0A0B">
<meta name="robots" content="noindex">
<title>{title} · Rago Optimizer</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="any">
<style>
@font-face{{font-family:"Geist";src:url("fonts/Geist-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}}
@font-face{{font-family:"Geist Mono";src:url("fonts/GeistMono-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}}
:root{{--ink:#0A0A0B;--ink-2:#111113;--l1:rgba(255,255,255,.07);--l2:rgba(255,255,255,.12);--t1:#F5F5F7;--t2:#A1A1AA;--t3:#7C7C86;--red:#FF3B30;--warn:#FFD60A}}
*{{box-sizing:border-box;margin:0}}
html{{background:var(--ink);color-scheme:dark}}
body{{background:var(--ink);color:var(--t1);font:400 15px/1.7 Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased;padding:0 16px}}
.wrap{{max-width:760px;margin:0 auto;padding:40px 0 100px}}
.top{{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:56px}}
.top a.logo{{display:flex;align-items:center;gap:10px;color:var(--t1);text-decoration:none;font-weight:600;letter-spacing:-.02em}}
.top a.logo img{{height:22px}}
a.back{{color:var(--t2);text-decoration:none;font-size:13.5px;padding:8px 14px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--l2)}}
a.back:hover{{color:var(--t1)}}
.draft{{background:rgba(255,214,10,.08);border:1px solid rgba(255,214,10,.35);color:#FFE680;border-radius:24px;padding:16px 20px;font-size:13.5px;margin-bottom:40px}}
h1{{font-size:clamp(30px,5vw,44px);letter-spacing:-.04em;line-height:1.1}}
.upd{{color:var(--t3);font:400 12.5px/1 "Geist Mono",monospace;margin:14px 0 40px}}
h2{{font-size:19px;letter-spacing:-.02em;margin:44px 0 12px}}
p,li{{color:var(--t2)}}
p+p{{margin-top:12px}}
ul{{padding-left:20px;margin-top:10px}} ul+p{{margin-top:14px}} li+li{{margin-top:6px}}
strong{{color:var(--t1);font-weight:560}}
a{{color:var(--t1)}}
mark.f{{background:rgba(255,214,10,.16);color:var(--warn);padding:1px 6px;border-radius:6px;font-weight:500}}
table{{width:100%;border-collapse:collapse;margin-top:12px;font-size:13.5px}}
th,td{{text-align:left;padding:10px 12px;border-bottom:1px solid var(--l1);color:var(--t2);vertical-align:top}}
th{{color:var(--t1);font-weight:560}}
.tbl{{overflow-x:auto;border:1px solid var(--l1);border-radius:24px;padding:4px 8px;background:var(--ink-2);margin-top:12px}}
.tbl table{{margin:0}} .tbl tr:last-child td{{border-bottom:0}}
.foot{{margin-top:64px;padding-top:24px;border-top:1px solid var(--l1);display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px}}
.foot a{{color:var(--t2);text-decoration:none}} .foot a:hover{{color:var(--t1)}}
</style>
</head>
<body>
<div class="wrap">
<div class="top"><a class="logo" href="./"><img src="rago-wordmark.svg" alt="Rago Optimizer"></a><a class="back" href="./">Back to the site</a></div>
<div class="draft"><strong style="color:#FFE680">Draft.</strong> Fill in every yellow field and have these pages checked before taking live payments. Then delete this notice.</div>
<h1>{title}</h1>
<p class="upd">Last updated: {upd}</p>
'''
FOOT='''<div class="foot"><a href="terms.html">Terms of Sale</a><a href="privacy.html">Privacy Policy</a><a href="refunds.html">Refunds and Cancellation</a><a href="./">Rago Optimizer</a></div>
</div>
</body>
</html>
'''
def page(name,title,body):
    open(os.path.join(OUT,name),'w').write(HEAD.format(title=title,upd=UPD)+body+FOOT)

page('terms.html','Terms of Sale',f'''
<h2>1. Who we are</h2>
<p>Rago Optimizer is sold by {SELLER}, {ADDR}, {COUNTRY}. {REG}. Contact: {MAIL}, or our Discord server.</p>

<h2>2. What you buy</h2>
<p>Rago Optimizer is a Windows 10 and 11 app that changes Windows, network and game settings. It comes in two plans:</p>
<ul>
<li><strong>Free:</strong> the app with a limited set of tweaks, no account and no payment.</li>
<li><strong>Premium:</strong> a monthly or yearly subscription that unlocks every tweak, presets and updates while the subscription is active.</li>
</ul>
<p>Results depend on your hardware, your connection and the game server. We don't promise a specific ping, frame rate or hit registration result. Distance to the server can't be changed by any software.</p>

<h2>3. Prices and payment</h2>
<p>Prices are shown on the site before checkout, in US dollars{F("add: including or excluding VAT and other taxes")}. Payment is handled by Stripe. We never see or store your card number.</p>
<p>Your subscription renews automatically at the end of each month or year, at the price you accepted, until you cancel. If we change the price, we'll tell you by email before your next renewal and you can cancel before it applies.</p>

<h2>4. Your license</h2>
<ul>
<li>One Premium subscription works on <strong>one PC</strong>. The license is linked to that PC the first time you sign in to the app and activate it.</li>
<li>If you change PCs, contact support to move your license.</li>
<li>You may not share, resell or sublicense your account or license, or try to bypass the license check.</li>
<li>If a renewal fails, Premium stops when the paid period ends. The app keeps working in free mode.</li>
</ul>

<h2>5. Right of withdrawal (EU and UK customers)</h2>
<p>Premium is digital content supplied right after payment. By completing checkout, you ask for immediate access and acknowledge that you lose your 14-day right of withdrawal once the license is delivered. Our <a href="refunds.html">Refunds and Cancellation</a> policy explains when we refund anyway.</p>

<h2>6. Using the app safely</h2>
<p>Before applying changes, Rago offers to create a Windows restore point (on by default), and its Restore section opens System Restore so you can go back to it. Some tweaks are marked <strong>Advanced</strong>: they turn off Windows protections or services and ask for confirmation. You choose which tweaks to apply, and you are responsible for that choice.</p>
<p>Rago doesn't modify Minecraft or inject anything into games. Server rules are set by each server: check them before you play. We aren't responsible for decisions a server's staff makes about your account.</p>

<h2>7. Affiliate program</h2>
<p>Affiliates get a personal code. New customers who use an affiliate code get 5% off their first Premium payment. A referral counts as soon as the buyer has activated the app on their PC, and stops counting if the purchase is refunded or disputed. Your own purchases and activations on your own PC don't count. Every 3 counted referrals give the affiliate 6 months of Premium for one PC. We can cancel a reward obtained by fraud.</p>

<h2>8. Liability</h2>
<p>The app is provided as is. To the extent the law allows, we aren't liable for indirect damage such as lost data, lost games or lost time, and our total liability is limited to the amount you paid us in the last 12 months. Nothing in these terms limits your statutory rights as a consumer.</p>

<h2>9. Suspension</h2>
<p>We may suspend a license in case of fraud, a chargeback, a refund, or sharing of the license. A full refund or a payment dispute turns Premium off automatically.</p>

<h2>10. Changes and law</h2>
<p>We may update these terms. The version accepted at checkout applies to that purchase. These terms are governed by the law of {F("Country")}. Consumers can also use the courts and mediation services of their own country.</p>
''')

page('refunds.html','Refunds and Cancellation',f'''
<h2>Cancel anytime</h2>
<p>Cancel from your account page (Cancel or manage subscription). You keep Premium until the end of the period you already paid for, then the app goes back to free mode. Nothing else is charged.</p>

<h2>Refunds</h2>
<ul>
<li><strong>Before you activate the app:</strong> if you haven't signed in to the app and activated Premium on a PC, we refund your first payment if you ask within {F("14")} days.</li>
<li><strong>Charged twice or by mistake:</strong> we refund the extra payment.</li>
<li><strong>After activation:</strong> Premium is digital content delivered right away, so we don't refund by default. If something doesn't work on your PC, contact us first: we'll try to fix it, and refund when we can't.</li>
</ul>
<p>Refunds go back to your original payment method through Stripe. Your bank may take 5 to 10 days to show it.</p>

<h2>What a refund does to your license</h2>
<p>A full refund turns Premium off on your PC automatically and stops future renewals. A partial refund, such as a goodwill discount, keeps your license active.</p>

<h2>Payment disputes</h2>
<p>Please contact us before opening a dispute with your bank: it's faster. Opening a dispute turns Premium off automatically, and it stays off.</p>

<h2>Affiliate referrals</h2>
<p>A refunded or disputed purchase doesn't count toward the affiliate program.</p>

<h2>Contact</h2>
<p>{MAIL}, or our Discord server. Include the email of your Rago account.</p>
''')

page('privacy.html','Privacy Policy',f'''
<h2>Who is responsible</h2>
<p>{SELLER}, {ADDR}, {COUNTRY}, is responsible for your data. Contact: {MAIL}.</p>

<h2>What we collect, and why</h2>
<div class="tbl"><table>
<tr><th>Data</th><th>Why</th></tr>
<tr><td>Email and password (stored hashed, never readable)</td><td>Your account and sign-in</td></tr>
<tr><td>Payment references from Stripe: customer and payment IDs, amount, currency, subscription status</td><td>Selling and renewing Premium, refunds, accounting</td></tr>
<tr><td>Hashed identifiers of your PC (from the Windows machine ID, motherboard UUID and serial number), PC name, Windows version, app version, activation dates and last IP address</td><td>Linking your license to one PC and preventing license sharing</td></tr>
<tr><td>Affiliate code, which accounts used it, and hashed identifiers of the buyer's first PC</td><td>Running the affiliate program and blocking self-referrals</td></tr>
<tr><td>A log of license events (purchase, activation, refund, blocked activation with IP address)</td><td>Security and support</td></tr>
<tr><td>IP address, kept briefly in memory</td><td>Limiting sign-in and download attempts</td></tr>
</table></div>
<p>The free mode of the app sends nothing to us. The app contacts our server only when you sign in, activate Premium or refresh your license. Your card number goes to Stripe, never to us.</p>

<h2>Legal basis</h2>
<p>We use your data to perform our contract with you (account, license, payment), for our legitimate interest in preventing fraud and license sharing, and to meet legal obligations such as keeping accounting records.</p>

<h2>Cookies and local storage</h2>
<ul>
<li><strong>rg_session</strong>: keeps you signed in to your account. Necessary.</li>
<li><strong>rg_claim</strong>: links a purchase to the account you create right after it, for 7 days. Necessary.</li>
<li><strong>rg_ref</strong> (cookie on the account server) and <strong>rago_ref</strong> (browser storage on this site): remember an affiliate code from a share link for 30 days.</li>
</ul>
<p>We don't use advertising or analytics cookies, and the site loads no third-party fonts or trackers.</p>

<h2>Who processes it for us</h2>
<ul>
<li><strong>Stripe</strong>: payments and subscriptions</li>
<li><strong>Supabase</strong>: database and download storage</li>
<li><strong>Railway</strong>: account and license server</li>
<li><strong>Netlify</strong>: website hosting</li>
<li><strong>Resend</strong>: account emails (purchase confirmation, password reset)</li>
</ul>
<p>Some of these providers are in the United States. Transfers rely on the European Commission's standard contractual clauses or an equivalent safeguard.</p>

<h2>How long we keep it</h2>
<ul>
<li>Account and license data: while your account exists, then deleted within {F("30")} days of your deletion request.</li>
<li>Payment and invoicing records: as long as accounting law requires, {F("10")} years.</li>
<li>Security log: {F("12")} months.</li>
</ul>

<h2>Your rights</h2>
<p>You can ask to access, correct, export or delete your data, or object to its use, by writing to {MAIL} from the email of your account. You can also complain to your data protection authority{F("e.g. the CNIL in France")}.</p>

<h2>Changes</h2>
<p>If we change this policy in a way that matters, we'll update the date above and tell account holders by email.</p>
''')
print('ok')

# 404: Netlify serves it for any unknown path, so every link is absolute
nf=HEAD.format(title='Page not found',upd='').replace('href="','href="/').replace('src="','src="/').replace('url("fonts/','url("/fonts/').replace('href="/https:','href="https:')
nf=nf.split('<div class="draft">')[0]+'<h1>This page doesn\'t exist.</h1>\n<p class="upd">Error 404</p>\n<p>The link may be old or mistyped.</p>\n<p style="margin-top:28px;display:flex;gap:10px;flex-wrap:wrap"><a class="back" href="/" style="color:#0A0A0B;background:#FF3B30;box-shadow:none;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:999px">Back to Rago Optimizer</a><a class="back" href="/#pricing" style="text-decoration:none;padding:10px 18px;border-radius:999px">See pricing</a></p>\n'+FOOT.replace('href="','href="/').replace('href="/./"','href="/"')
nf=nf.replace('href="/./"','href="/"')
open(os.path.join(OUT,'404.html'),'w').write(nf)
