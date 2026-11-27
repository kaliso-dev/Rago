# Lot 4 (fin) : Conditions de vente, Confidentialité, 404, compte à rebours de lancement, images de partage.
# Textes repris tels quels de site/terms.html, privacy.html, 404.html et netlify/edge-functions/launch-gate/countdown.js (22/11/2026).
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_site as G
import gen_route as RT
from gen_route import page

OUT = G.OUT
SITE = Path('/home/claude/kaliso-dev/rago/site')

CSS = r'''
.lg-nav .r > a{display:inline-flex;align-items:center;gap:8px}
.lg-nav .r > a svg{width:16px;height:16px;transform:rotate(180deg)}
.lg-hero{position:relative;padding:76px 0 0}
.lg-hero .s-dots{right:-120px;top:-40px;width:760px;height:480px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 65%)}
.lg-hero h1{position:relative;margin-top:22px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:110px;line-height:.84;text-transform:uppercase;letter-spacing:-.01em}
.lg-hero h1 .br{position:relative;display:inline-block;isolation:isolate}
.lg-hero h1 .br::after{content:"";position:absolute;z-index:-1;left:-22px;right:-46px;top:32%;height:72%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.lg-meta{display:flex;align-items:center;gap:18px;margin-top:30px}
.lg-seg{display:flex;gap:4px;padding:4px;background:var(--bg-2);border:1px solid var(--line-2)}
.lg-seg span{position:relative;height:36px;padding:0 18px;display:inline-grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);isolation:isolate}
.lg-seg span.on{color:var(--red-ink)}
.lg-seg span.on::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--red);transform:skewX(var(--skew))}
html.round .lg-seg{border-radius:12px}
.lg-upd{font-size:14px;color:var(--ink-3)}
.lg-upd b{color:var(--ink-2);font-weight:600}
.lg-gl{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:52px}
.lg-gl .s-card{display:flex;flex-direction:column;padding:24px 24px 20px}
.lg-gl .k{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.lg-gl b{display:block;margin-top:8px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:50px;line-height:.86;text-transform:uppercase}
.lg-gl p{margin-top:12px;font-size:14.5px;line-height:1.5;color:var(--ink-2)}
.lg-gl a{margin-top:auto;padding-top:16px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--red)}
.lg-gl-note{margin-top:14px;font-size:13px;color:var(--ink-3)}

.lg-wrap{display:grid;grid-template-columns:290px minmax(0,1fr);gap:90px;margin-top:64px;padding-top:12px;border-top:1px solid var(--line)}
.lg-toc{align-self:start;padding-top:34px}
.lg-toc .s-eb{font-size:13px;padding:0 12px 12px}
.lg-toc nav{display:grid;gap:2px}
.lg-toc nav a{position:relative;display:grid;grid-template-columns:34px 1fr;gap:4px;align-items:baseline;padding:8px 12px;font-family:var(--cond);font-weight:800;font-size:16.5px;line-height:1.1;letter-spacing:.02em;text-transform:uppercase;color:var(--ink-2)}
.lg-toc nav.plain a{grid-template-columns:1fr}
.lg-toc nav a em{font-weight:900;font-size:16.5px;color:var(--ink-3)}
.lg-toc nav a.on{color:var(--ink);background:var(--bg-3)}
.lg-toc nav a.on em{color:var(--red)}
.lg-toc nav a.on::before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:4px;background:var(--red);transform:skewY(-20deg)}
html.round .lg-toc nav a{border-radius:10px}
.lg-help{margin-top:28px;padding:22px}
.lg-help b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;line-height:.9;text-transform:uppercase}
.lg-help p{margin-top:10px;font-size:14px;line-height:1.5;color:var(--ink-2)}
.lg-help p a{color:var(--ink)}
.lg-help .btn{margin-top:16px;width:100%;height:42px}
.lg-help .btn svg{width:15px;height:15px}

.lg-doc{min-width:0}
.lg-sec{position:relative;padding:40px 0 42px;border-bottom:1px solid var(--line)}
.lg-sec:last-child{border-bottom:0}
.lg-sec h2{display:flex;align-items:baseline;gap:12px;margin-bottom:20px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:42px;line-height:.92;text-transform:uppercase;letter-spacing:-.005em}
.lg-sec h2 .n{flex:none;min-width:62px;font-size:58px;line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--red)}
.lg-sec > p,.lg-sec > ul{max-width:620px}
.lg-sec p,.lg-sec li{font-size:16.5px;line-height:1.72;color:var(--ink-2)}
.lg-sec p + p,.lg-sec ul + p{margin-top:14px}
.lg-sec p + ul{margin-top:14px}
.lg-sec strong{color:var(--ink);font-weight:600}
.lg-sec a{white-space:nowrap;color:var(--ink);text-decoration:underline;text-decoration-color:var(--red);text-decoration-thickness:1.5px;text-underline-offset:4px}
.lg-sec ul{display:grid;gap:10px;list-style:none;padding:0}
.lg-sec li{position:relative;padding-left:28px}
.lg-sec li::before{content:"";position:absolute;left:2px;top:.78em;width:13px;height:4px;background:var(--red);transform:skewX(var(--skew))}
.lg-sec.tgt{margin:14px 0 14px -40px;padding:40px 40px 42px;background:var(--bg-2);border:1px solid var(--line-2)}
.lg-sec.tgt::before{content:"";position:absolute;left:-1px;top:34px;bottom:34px;width:4px;background:var(--red);transform:skewY(-20deg)}
html.round .lg-sec.tgt{border-radius:22px}
.lg-sec.tgt .s-tag{position:absolute;right:40px;top:44px}

/* confidentialité */
.lg-tbl{margin-top:4px;border:1px solid var(--line-2);background:var(--bg-2)}
html.round .lg-tbl{border-radius:20px;overflow:hidden}
.lg-tbl > div{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:28px;padding:16px 22px;border-top:1px solid var(--line)}
.lg-tbl > div:first-child{border-top:0;padding:14px 22px;background:var(--bg-3)}
.lg-tbl > div:first-child span,.lg-tbl > div:first-child span:first-child{font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.lg-tbl > div span{font-size:14.5px;line-height:1.55;color:var(--ink-2)}
.lg-tbl > div span:first-child{color:var(--ink)}
.lg-ck{display:grid;gap:8px;margin-top:4px}
.lg-ck > div{display:grid;grid-template-columns:270px minmax(0,1fr) 104px;gap:22px;align-items:start;padding:16px 20px;background:var(--bg-2);border:1px solid var(--line)}
html.round .lg-ck > div{border-radius:14px}
.lg-ck .nm{display:flex;flex-wrap:wrap;gap:6px}
.lg-ck .nm code{height:28px;padding:0 9px;display:inline-grid;place-items:center;background:var(--bg-4);font-family:var(--cond);font-weight:700;font-size:15px;letter-spacing:.03em;color:var(--ink)}
html.round .lg-ck .nm code{border-radius:7px}
.lg-ck p{font-size:14.5px !important;line-height:1.55 !important}
.lg-ck .s-tag{justify-self:end}
.lg-ck .s-tag.nec{color:var(--ok);box-shadow:inset 0 0 0 1px rgba(61,220,151,.35)}
.lg-pr{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}
.lg-pr > div{padding:18px 20px;background:var(--bg-2);border:1px solid var(--line)}
html.round .lg-pr > div{border-radius:14px}
.lg-pr b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;line-height:.9;text-transform:uppercase}
.lg-pr span{display:block;margin-top:8px;font-size:14px;line-height:1.5;color:var(--ink-2)}
.lg-ret{margin-top:4px;border-top:1px solid var(--line)}
.lg-ret > div:last-child{border-bottom:0}
.lg-ret > div{display:grid;grid-template-columns:210px minmax(0,1fr);gap:26px;align-items:baseline;padding:16px 0;border-bottom:1px solid var(--line)}
.lg-ret b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:34px;line-height:.9;text-transform:uppercase}
.lg-ret b.u{font-size:22px;color:var(--ink-2)}
.lg-ret span{font-size:15.5px;line-height:1.55;color:var(--ink-2)}
.lg-ret span strong{display:block;color:var(--ink);font-weight:600}
.lg-sec .after{margin-top:18px !important}
.lg-foot{margin-top:100px}

/* 404 */
.nf{position:relative;overflow:hidden;padding:96px 0 120px}
.nf .s-dots{right:-60px;top:0;width:900px;height:640px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 70%)}
.nf .big{position:absolute;right:-30px;top:40px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:520px;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.07);letter-spacing:-.02em;pointer-events:none}
.nf .in{position:relative}
.nf h1{margin-top:22px;max-width:820px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:128px;line-height:.82;text-transform:uppercase;letter-spacing:-.012em}
.nf h1 .br{position:relative;display:inline-block;isolation:isolate}
.nf h1 .br::after{content:"";position:absolute;z-index:-1;left:-24px;right:-52px;top:30%;height:74%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.nf .s-lead{margin-top:28px;font-size:19px}
.nf .s-acts{margin-top:40px}
.nf .s-acts .btn.red svg{transform:rotate(180deg)}
.nf-pk{display:flex;align-items:center;gap:10px;margin-top:70px}
.nf-pk i{width:78px;height:52px;display:grid;place-items:center;background:var(--ink);color:var(--bg);font-family:var(--cond);font-weight:900;font-size:22px;font-style:normal;transform:skewX(var(--skew))}
.nf-pk i.lost{width:110px;background:transparent;color:var(--red);box-shadow:inset 0 0 0 2px var(--red);outline:2px dashed rgba(255,59,48,.35);outline-offset:6px}
.nf-pk i.wait{background:var(--bg-3);color:var(--ink-3);box-shadow:inset 0 0 0 1px var(--line-2)}
.nf-pk span{margin-left:18px;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.nf-pk span b{color:var(--red)}
.nf-go{display:flex;align-items:center;gap:10px;margin-top:34px;font-size:14.5px;color:var(--ink-3)}
.nf-go a{height:34px;padding:0 14px;display:inline-grid;place-items:center;background:var(--bg-2);border:1px solid var(--line-2);font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink)}
html.round .nf-go a{border-radius:999px}
'''

CD_CSS = r'''
.win.cd{height:900px;display:flex;flex-direction:column;align-items:center;text-align:center}
.win.cd::after{display:none}
.cd .s-dots{inset:0;-webkit-mask:radial-gradient(60% 70% at 50% 40%,transparent 30%,#000 100%)}
.cd header{position:relative;padding-top:34px}
.cd main{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:20px}
.cd .mark{position:relative;width:84px;height:84px;margin-bottom:58px}
.cd .mark img{position:relative;display:block;width:100%;height:100%}
.cd .mark i{position:absolute;inset:0;border:1.5px solid var(--red);border-radius:24px}
.cd .mark i:nth-child(1){transform:scale(1.35);opacity:.45}
.cd .mark i:nth-child(2){transform:scale(1.75);opacity:.2}
.cd .s-eb{font-size:15px}
.cd h1{margin-top:18px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:112px;line-height:.82;text-transform:uppercase;letter-spacing:-.012em}
.cd h1 .br{position:relative;display:inline-block;isolation:isolate}
.cd h1 .br::after{content:"";position:absolute;z-index:-1;left:-24px;right:-52px;top:30%;height:74%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.cd .sub{margin-top:28px;font-size:18px;color:var(--ink-2)}
.cd .sub strong{color:var(--ink);font-weight:600}
.cd .clock{display:flex;align-items:center;gap:14px;margin-top:46px}
.cd .unit{position:relative;width:176px;padding:24px 0 18px;isolation:isolate}
.cd .unit::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bg-2);border:1px solid var(--line-2);transform:skewX(var(--skew))}
html.round .cd .unit::before{border-radius:18px}
.cd .unit b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:104px;line-height:.8;font-variant-numeric:tabular-nums}
.cd .unit span{display:block;margin-top:12px;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.cd .unit.s{color:var(--red-ink)}
.cd .unit.s::before{background:var(--red);border-color:var(--red)}
.cd .unit.s span{color:rgba(10,10,11,.65)}
.cd .clock > em{font-family:var(--cond);font-weight:900;font-style:italic;font-size:56px;color:var(--ink-3)}
.cd .local{margin-top:30px;font-size:14px;color:var(--ink-3)}
.cd footer{position:relative;padding-bottom:28px;font-size:13px;color:var(--ink-3)}
'''

OG_CSS = r'''
.win.og{width:1200px;height:630px;min-height:0}
.win.og::after{display:none}
.og .s-dots{right:0;top:0;width:640px;height:630px;-webkit-mask:linear-gradient(225deg,#000 0,transparent 70%)}
.og .lg{display:flex;align-items:center;gap:14px}
.og .lg img{width:54px;height:54px}
.og .lg b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;line-height:1;text-transform:uppercase}
.og .lg b span{color:var(--ink-3)}
.og .lg i{width:2px;height:34px;background:var(--line-2);transform:skewX(var(--skew))}
.og .lg em{font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;text-transform:uppercase;color:var(--red)}
.og h1{font-family:var(--cond);font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-.01em;line-height:.82}
.og h1 .br{position:relative;display:inline-block;isolation:isolate}
.og h1 .br::after{content:"";position:absolute;z-index:-1;left:-20px;right:-44px;top:30%;height:74%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.og p.l{font-size:21px;line-height:1.45;color:var(--ink-2)}
.og .tags{display:flex;gap:10px}
.og .tags .s-tag{height:38px;padding:0 16px;font-size:17px}
.og .tags .s-tag.red{color:var(--red-ink);background:var(--red);box-shadow:none}
.og-a{position:absolute;left:64px;top:60px;bottom:60px;width:600px;display:flex;flex-direction:column}
.og-a h1{margin-top:auto;font-size:112px}
.og-a p.l{margin-top:24px;max-width:520px}
.og-a .tags{margin-top:30px}
.og-app{position:absolute;right:56px;top:112px;width:430px;padding:22px 22px 22px}
.og-app .k{display:flex;align-items:center;gap:8px;font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.og-app .k i{width:7px;height:7px;background:var(--red);border-radius:50%}
.og-app .rw{display:flex;align-items:center;gap:14px;margin-top:10px;padding:14px 16px;background:var(--bg-3);border:1px solid var(--line)}
html.round .og-app .rw{border-radius:14px}
.og-app .rw svg.pi{width:28px;height:28px;flex:none}
.og-app .rw b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:21px;line-height:1;text-transform:uppercase}
.og-app .rw small{display:block;margin-top:5px;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.og-app .rw .sw{margin-left:auto}
.og-app .btn{width:100%;height:54px;margin-top:16px;font-size:19px}
.og-b{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.og-b .mark{position:relative;width:150px;height:150px}
.og-b .mark img{position:relative;width:100%;height:100%;display:block}
.og-b .mark i{position:absolute;inset:0;border:2px solid var(--red);border-radius:40px}
.og-b .mark i:nth-child(1){transform:scale(1.3);opacity:.45}
.og-b .mark i:nth-child(2){transform:scale(1.62);opacity:.18}
.og-b h1{margin-top:62px;font-size:92px}
.og-b p.l{margin-top:20px;font-family:var(--cond);font-weight:800;font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-2)}
.og-b p.l b{color:var(--red)}
.og-c{position:absolute;left:64px;top:60px;bottom:60px;width:560px;display:flex;flex-direction:column}
.og-c .s-chip{margin-top:auto;align-self:flex-start;height:38px;font-size:16px}
.og-c h1{margin-top:22px;font-size:106px}
.og-c p.l{margin-top:22px;max-width:500px;font-size:19.5px}
.og-map{position:absolute;right:52px;top:148px;width:500px;padding:22px 22px 14px}
.og-map svg{display:block;width:100%;height:auto;overflow:visible}
.og-map .cap{display:flex;align-items:center;gap:10px;margin-top:8px;padding-top:12px;border-top:1px solid var(--line);font-size:13px;color:var(--ink-2)}
'''


# ---------- extraction des textes ----------
def sections(fname):
    s = (SITE / fname).read_text()
    body = s.split('<p class="upd">', 1)[1]
    upd = re.match(r'([^<]+)</p>', body).group(1)
    body = body.split('<div class="foot">', 1)[0]
    parts = re.split(r'<h2(?: id="([^"]+)")?>(.*?)</h2>', body)
    out = []
    for i in range(1, len(parts), 3):
        sid, title, html = parts[i], parts[i + 1], parts[i + 2].strip()
        html = re.sub(r'\s*\n\s*', ' ', html)
        out.append((sid, title, html))
    return upd, out


def lg_nav():
    return ('<header class="s-nav lg-nav"><a class="s-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b></a>'
            '<div class="r"><a><i data-i="arrow"></i>back to the site</a></div></header>')


def help_card():
    return ('<div class="s-card lg-help"><b>questions?</b><p>Write to <a>support@rago-optimizer.com</a> from the email of your Rago account, or ask on our Discord server.</p>'
            '<span class="btn"><i data-i="chat"></i>open discord</span></div>')


def foot():
    return f'<div class="lg-foot">{G.footer()}</div>'


def terms():
    upd, secs = sections('terms.html')
    upd = upd.replace('Last updated: ', '')
    toc, doc = [], []
    for sid, title, html in secs:
        n, t = title.split('. ', 1)
        on = sid == 'cancel'
        toc.append(f'<a{" class=on" if on else ""}><em>{n}</em><span>{t}</span></a>')
        tag = '<span class="s-tag red">opened from the cancellation link</span>' if on else ''
        doc.append(f'<section class="lg-sec{" tgt" if on else ""}">{tag}<h2><span class="n">{n}</span><span>{t}</span></h2>{html}</section>')
    gl = [('free trial', '3 days', 'Nothing is charged if you cancel before the trial ends.', 'section 4'),
          ('per license', '1 PC', 'Your license is linked to one PC. Support can move it to a new one.', 'section 5'),
          ('cancel', 'anytime', 'From your account page. Premium stays until the end of the period you paid.', 'section 6'),
          ('payments', 'no refunds', 'Except a double or mistaken charge: we give the extra payment back.', 'section 6')]
    gls = ''.join(f'<div class="s-card"><span class="k">{k}</span><b>{v}</b><p>{p}</p><a>{a}</a></div>' for k, v, p, a in gl)
    hero = f'''<section class="sw5 lg-hero"><span class="s-dots"></span>
  <p class="s-eb">legal <b>//</b> terms of sale</p><h1>terms <span class="br">of sale.</span></h1>
  <div class="lg-meta"><div class="lg-seg"><span class="on">terms of sale</span><span>privacy policy</span></div><span class="lg-upd">Last updated <b>{upd}</b></span></div>
  <div class="lg-gl">{gls}</div><p class="lg-gl-note">At a glance. The full terms below are what apply.</p>
</section>'''
    main = (f'<div class="sw5 lg-wrap"><aside class="lg-toc"><p class="s-eb">on this page</p><nav>{"".join(toc)}</nav>{help_card()}</aside>'
            f'<div class="lg-doc">{"".join(doc)}</div></div>')
    return lg_nav() + hero + main + foot()


COOKIES = [(['rg_session'], 'Keeps you signed in to your account.', 'nec'),
           (['rg_claim'], 'Links a purchase to the account you create right after it, for 2 days.', 'nec'),
           (['rg_signup'], "Remembers the account you're creating while you type the code we emailed you, for 24 hours.", 'nec'),
           (['rg_oauth'], 'Checks that the Google or Discord account coming back to our site is the sign-in you started, for 10 minutes. Only set when you sign in with Google or Discord.', 'nec'),
           (['rg_discord'], "Checks that the Discord account coming back from Discord's authorization page is linked to your account, for 10 minutes. Only set when you link Discord.", 'nec'),
           (['rago_preview', 'rago_admin'], 'Let our team open the site before a launch and the admin pages. Only set for team members.', 'nec'),
           (['rg_ref', 'rago_ref'], 'Remember an affiliate code from a share link for 30 days. rg_ref is a cookie on the account server, rago_ref is browser storage on this site.', '30 days'),
           (['rago_promo_seen', 'rago_promo_seen_code', 'rago_promo_claimed'], "Browser storage on this site. Remember that the welcome offer was shown, so it isn't shown again for 30 days, and the discount code you claimed, so it is applied at checkout. Clearing your browser data removes them.", '30 days')]

RET = [('30 days', 'Account and license data', 'While your account exists, then deleted within 30 days of your deletion request.'),
       ('10 years', 'Payment and invoicing records', 'As long as accounting law requires.'),
       ('until you delete', 'Your review and profile photo', 'Until you delete them or your account. A replaced photo is deleted right away.'),
       ('12 months', 'Security log', ''),
       ('2 years', 'Free trial records (email, card fingerprint)', 'After the trial started.'),
       ('12 months', 'Discord server records', "While you're a member, then 12 months after you leave."),
       ('1 day', 'Sign-up codes', 'Deleted within a day.'),
       ('12 months', 'Network test results', '')]


def privacy():
    upd, secs = sections('privacy.html')
    upd = upd.replace('Last updated: ', '')
    toc, doc = [], []
    for k, (sid, title, html) in enumerate(secs):
        toc.append(f'<a{" class=on" if k == 1 else ""}><span>{title}</span></a>')
        if title.startswith('What we collect'):
            rows = re.findall(r'<tr><td>(.*?)</td><td>(.*?)</td></tr>', html)
            tbl = '<div class="lg-tbl"><div><span>data</span><span>why</span></div>' + ''.join(f'<div><span>{a}</span><span>{b}</span></div>' for a, b in rows) + '</div>'
            rest = html.split('</table></div>', 1)[1]
            html = tbl + rest.replace('<p>', '<p class="after">', 1)
        elif title.startswith('Cookies'):
            ck = ''.join(f'<div><span class="nm">{"".join(f"<code>{n}</code>" for n in ns)}</span><p>{d}</p>'
                         f'<span class="s-tag{" nec" if t == "nec" else ""}">{"necessary" if t == "nec" else t}</span></div>' for ns, d, t in COOKIES)
            html = f'<div class="lg-ck">{ck}</div>' + html.split('</ul>', 1)[1].replace('<p>', '<p class="after">', 1)
        elif title.startswith('Who processes'):
            items = re.findall(r'<li><strong>(.*?)</strong>: (.*?)</li>', html)
            html = '<div class="lg-pr">' + ''.join(f'<div><b>{a}</b><span>{b[0].upper() + b[1:]}</span></div>' for a, b in items) + '</div>' + html.split('</ul>', 1)[1].replace('<p>', '<p class="after">', 1)
        elif title.startswith('How long'):
            html = '<div class="lg-ret">' + ''.join(f'<div><b{" class=u" if v == "until you delete" else ""}>{v}</b><span><strong>{w}</strong>{d}</span></div>' for v, w, d in RET) + '</div>'
        doc.append(f'<section class="lg-sec"><h2><span>{title}</span></h2>{html}</section>')
    gl = [('cookies', '0 ads', "No advertising or analytics cookies, and no third-party fonts or trackers.", 'cookies'),
          ('your card', 'stripe only', 'Your card number goes to Stripe, never to us.', 'what we collect'),
          ('network test', 'no ip kept', 'City and provider are worked out on our own server. The IP address itself isn\'t kept.', 'what we collect'),
          ('delete', '30 days', 'Account and license data is deleted within 30 days of your request.', 'how long we keep it')]
    gls = ''.join(f'<div class="s-card"><span class="k">{k}</span><b>{v}</b><p>{p}</p><a>{a}</a></div>' for k, v, p, a in gl)
    hero = f'''<section class="sw5 lg-hero"><span class="s-dots"></span>
  <p class="s-eb">legal <b>//</b> privacy policy</p><h1>privacy <span class="br">policy.</span></h1>
  <div class="lg-meta"><div class="lg-seg"><span>terms of sale</span><span class="on">privacy policy</span></div><span class="lg-upd">Last updated <b>{upd}</b></span></div>
  <div class="lg-gl">{gls}</div><p class="lg-gl-note">At a glance. The full policy below is what applies.</p>
</section>'''
    main = (f'<div class="sw5 lg-wrap"><aside class="lg-toc"><p class="s-eb">on this page</p><nav class="plain">{"".join(toc)}</nav>{help_card()}</aside>'
            f'<div class="lg-doc">{"".join(doc)}</div></div>')
    return lg_nav() + hero + main + foot()


def notfound():
    pk = ('<div class="nf-pk"><i>1</i><i>2</i><i>3</i><i class="lost">404</i><i class="wait">5</i>'
          '<span>packet lost <b>//</b> this page never arrived</span></div>')
    body = f'''<section class="nf"><span class="s-dots"></span><span class="big">404</span><div class="sw5 in">
  <p class="s-eb">error <b>//</b> 404</p><h1>this page <span class="br">doesn't exist.</span></h1>
  <p class="s-lead">The link may be old or mistyped.</p>
  <div class="s-acts"><span class="btn red xl"><i data-i="arrow"></i>back to rago optimizer</span><span class="btn xl gh">see pricing</span></div>
  {pk}
  <div class="nf-go">or go to<a>tweaks</a><a>rago route</a><a>reviews</a><a>faq</a></div>
</div></section>'''
    return G.nav() + body + G.footer()


def countdown():
    units = [('02', 'days'), ('21', 'hours'), ('14', 'minutes'), ('08', 'seconds')]
    clock = '<em>:</em>'.join(f'<div class="unit{" s" if l == "seconds" else ""}"><b>{n}</b><span>{l}</span></div>' for n, l in units)
    return f'''<span class="s-dots"></span>
<header><a class="s-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b></a></header>
<main>
  <div class="mark"><i></i><i></i><img src="img/rago-app-dark-128.svg" alt=""></div>
  <p class="s-eb">launching saturday</p>
  <h1>every millisecond <span class="br">counts.</span></h1>
  <p class="sub">Rago Optimizer opens on <strong>Saturday, October 10 at 3:00 PM</strong>, Paris time.</p>
  <div class="clock">{clock}</div>
  <p class="local">That's Saturday, 9:00 AM EDT where you are.</p>
</main>
<footer>© 2026 Rago Optimizer</footer>'''


def og_image():
    rows = [('latency', 'Disable mouse acceleration', 'latency'), ('windows', 'Disable Game DVR', 'windows'), ('network', 'Disable NIC power saving', 'network')]
    rw = ''.join(f'<div class="rw">{G.pi(k)}<div><b>{t}</b><small>{c}</small></div><span class="sw on"></span></div>' for k, t, c in rows)
    return f'''<span class="s-dots"></span>
<div class="og-a"><div class="lg"><img src="img/rago-app-dark-128.svg" alt=""><b>rago <span>optimizer</span></b></div>
  <h1>every millisecond<br><span class="br">counts.</span></h1>
  <p class="l">The Windows optimizer for Minecraft PvP. Less input lag, smoother frames, steadier ping.</p>
  <div class="tags"><span class="s-tag red">218 tweaks</span><span class="s-tag">free to start</span></div></div>
<div class="s-card og-app"><p class="k"><i></i>3 tweaks selected</p>{rw}<span class="btn red">apply 3 tweaks</span></div>'''


def og_launch():
    return '''<span class="s-dots" style="left:0;width:1200px;-webkit-mask:radial-gradient(55% 70% at 50% 45%,transparent 25%,#000 100%)"></span>
<div class="og-b"><div class="mark"><i></i><i></i><img src="img/rago-app-dark-128.svg" alt=""></div>
  <h1>every millisecond <span class="br">counts.</span></h1>
  <p class="l">rago optimizer <b>//</b> for windows</p></div>'''


def og_route():
    return f'''<span class="s-dots"></span>
<div class="og-c"><div class="lg"><img src="img/rago-app-dark-128.svg" alt=""><b>rago</b><i></i><em>route</em></div>
  <span class="s-chip"><span class="s-tag red">beta</span>new in Premium</span>
  <h1>lose packets,<br><span class="br">not fights.</span></h1>
  <p class="l">Every packet on two roads, backup packets and quick resends. For Minecraft Java on Hypixel.</p></div>
<div class="s-card og-map">{RT.roads_svg()}<p class="cap"><span class="s-tag">illustration</span>The same packet, two roads.</p></div>'''


def win(html, cls, title, css):
    return page(title, html, css).replace('<div class="win site">', f'<div class="win {cls}">')


if __name__ == '__main__':
    (OUT / 'site-terms.html').write_text(page('Terms of Sale', terms(), CSS))
    (OUT / 'site-privacy.html').write_text(page('Privacy Policy', privacy(), CSS))
    (OUT / 'site-404.html').write_text(page('Page not found', notfound(), CSS))
    (OUT / 'site-countdown.html').write_text(win(countdown(), 'cd', 'Launch countdown', CD_CSS))
    ogc = RT.CSS + OG_CSS
    (OUT / 'og-image.html').write_text(win(og_image(), 'og', 'og-image', ogc))
    (OUT / 'og-launch.html').write_text(win(og_launch(), 'og', 'og-launch', ogc))
    (OUT / 'og-route.html').write_text(win(og_route(), 'og', 'og-route', ogc))
    print('ok')
