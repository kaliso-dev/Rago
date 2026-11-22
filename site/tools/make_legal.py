"""Builds site/terms.html, site/privacy.html and site/404.html (design v5, 22/11/2026).

The legal text itself is in src/legal/terms.html and src/legal/privacy.html (only the sections: <h2> then paragraphs and
lists, as written by hand). Edit the text there, change the date below, then run: python3 site/tools/make_legal.py
No refunds page since 2026-11-10 (Sofiene: no refunds, the free trial replaces them): cancellation is in the Terms.
"""
import hashlib, html, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..')
sys.path.insert(0, HERE)
import sync_icons

UPD = {'terms': 'November 13, 2026', 'privacy': 'November 10, 2026'}
SITE = 'https://rago-optimizer.com'  # same as build.py
ACC = 'https://account.rago-optimizer.com'
DISCORD = 'https://discord.gg/cbCxCBx8vJ'
MAIL = '<a href="mailto:support@rago-optimizer.com">support@rago-optimizer.com</a>'
OGV = hashlib.sha256(open(os.path.join(OUT, 'og-image.png'), 'rb').read()).hexdigest()[:10]  # same as build.py
CSSV = hashlib.sha256(open(os.path.join(OUT, 'v5.css'), 'rb').read()).hexdigest()[:10]  # same cache key as build.py
JSV = hashlib.sha256(open(os.path.join(OUT, 'v5.js'), 'rb').read()).hexdigest()[:10]  # motion shared by every page
LEGAL = ("Rago Optimizer changes Windows settings. Results depend on your hardware and connection. A restore point is offered "
         "before advanced tweaks. Minecraft is a trademark of Mojang Studios; Rago Optimizer isn't affiliated with Mojang or "
         "Microsoft. © 2026 Rago Optimizer, by KALISO and RAGO.")


def icon(n):
    return f'<svg class="i" aria-hidden="true"><use href="#i-{n}"/></svg>'


CSS = '''.lg-nav .r > a{display:inline-flex;align-items:center;gap:8px}
.lg-nav .r > a svg{width:16px;height:16px}
.lg-hero,.lg-wrap,.nf .in{width:min(var(--cw),calc(100% - 2 * var(--g)));margin-inline:auto}
.lg-hero{position:relative;padding:76px 0 0}
.lg-hero .s-dots{right:0;top:-40px;width:min(760px,100%);height:480px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 65%)}
.s-eb b{color:var(--red);font-weight:inherit;margin:0 4px}
.lg-hero h1{position:relative;margin-top:22px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:110px;line-height:.84;text-transform:uppercase;letter-spacing:-.01em}
.lg-hero h1 .br,.nf h1 .br{position:relative;display:inline-block;isolation:isolate}
.lg-hero h1 .br::after{content:"";position:absolute;z-index:-1;left:-22px;right:-46px;top:32%;height:72%;background:url(img/v5/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.lg-meta{display:flex;flex-wrap:wrap;align-items:center;gap:18px;margin-top:30px}
.lg-seg{display:flex;gap:4px;padding:4px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:12px}
.lg-seg a{position:relative;height:36px;padding:0 18px;display:inline-grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);isolation:isolate;white-space:nowrap}
.lg-seg a:hover{color:var(--ink)}
.lg-seg a[aria-current]{color:var(--red-ink)}
.lg-seg a[aria-current]::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--red);border-radius:7px}
.lg-upd{font-size:14px;color:var(--ink-3)}
.lg-upd b{color:var(--ink-2);font-weight:600}
.lg-gl{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:52px}
.lg-gl .s-card{display:flex;flex-direction:column;padding:24px 24px 20px}
.lg-gl .k{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.lg-gl b{display:block;margin-top:8px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:50px;line-height:.86;text-transform:uppercase}
.lg-gl p{margin-top:12px;font-size:14.5px;line-height:1.5;color:var(--ink-2)}
.lg-gl a{margin-top:auto;padding-top:16px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--red)}
.lg-gl a:hover{text-decoration:underline;text-underline-offset:3px}
.lg-gl-note{margin-top:14px;font-size:13px;color:var(--ink-3)}
.lg-wrap{display:grid;grid-template-columns:290px minmax(0,1fr);gap:90px;margin-top:64px;padding-top:12px;border-top:1px solid var(--line)}
.lg-toc{position:sticky;top:96px;align-self:start;padding-top:34px}
.lg-toc .s-eb{font-size:13px;padding:0 12px 12px}
.lg-toc nav{display:grid;gap:2px}
.lg-toc nav a{position:relative;display:grid;grid-template-columns:34px 1fr;gap:4px;align-items:baseline;padding:8px 12px;border-radius:10px;font-family:var(--cond);font-weight:800;font-size:16.5px;line-height:1.1;letter-spacing:.02em;text-transform:uppercase;color:var(--ink-2)}
.lg-toc nav.plain a{grid-template-columns:1fr}
.lg-toc nav a em{font-style:normal;font-weight:900;color:var(--ink-3)}
.lg-toc nav a:hover{color:var(--ink)}
.lg-toc nav a.on{color:var(--ink);background:var(--bg-3)}
.lg-toc nav a.on em{color:var(--red)}
.lg-toc nav a.on::before{content:"";position:absolute;left:5px;top:9px;bottom:9px;width:3px;border-radius:3px;background:var(--red)}
.lg-help{margin-top:28px;padding:22px}
.lg-help b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;line-height:.9;text-transform:uppercase}
.lg-help p{margin-top:10px;font-size:14px;line-height:1.5;color:var(--ink-2)}
.lg-help p a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--red);text-underline-offset:3px;overflow-wrap:anywhere}
.lg-help .btn{margin-top:16px;width:100%;height:42px}
.lg-help .btn svg{width:15px;height:15px}
.lg-doc{min-width:0}
.lg-sec{position:relative;padding:40px 0 42px;border-bottom:1px solid var(--line);scroll-margin-top:90px}
.lg-sec:last-child{border-bottom:0}
.lg-sec h2{display:flex;align-items:baseline;gap:12px;margin-bottom:20px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:42px;line-height:.92;text-transform:uppercase;letter-spacing:-.005em}
.lg-sec h2 .n{flex:none;min-width:62px;font-size:58px;line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--red)}
.lg-sec > p,.lg-sec > ul{max-width:680px}
.lg-sec p,.lg-sec li{font-size:16.5px;line-height:1.72;color:var(--ink-2)}
.lg-sec p + p,.lg-sec ul + p,.lg-sec .lg-tbl + p{margin-top:14px}
.lg-sec p + ul{margin-top:14px}
.lg-sec strong{color:var(--ink);font-weight:600}
.lg-sec a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--red);text-decoration-thickness:1.5px;text-underline-offset:4px;overflow-wrap:anywhere}
.lg-sec ul{display:grid;gap:10px;list-style:none;padding:0}
.lg-sec li{position:relative;padding-left:28px}
.lg-sec li::before{content:"";position:absolute;left:2px;top:.78em;width:13px;height:4px;border-radius:2px;background:var(--red);transform:skewX(var(--skew))}
.lg-sec:target{margin:14px 0 14px -40px;padding:40px 40px 42px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:22px}
.lg-sec:target::before{content:"";position:absolute;left:7px;top:34px;bottom:34px;width:3px;border-radius:3px;background:var(--red)}
.lg-tbl{margin-top:4px;border:1px solid var(--line-2);background:var(--bg-2);border-radius:20px;overflow:hidden}
.lg-tbl > div{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:28px;padding:16px 22px;border-top:1px solid var(--line)}
.lg-tbl > div:first-child{border-top:0;padding:14px 22px;background:var(--bg-3)}
.lg-tbl > div:first-child span{font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)!important}
.lg-tbl > div span{font-size:14.5px;line-height:1.55;color:var(--ink-2)}
.lg-tbl > div span:first-child{color:var(--ink)}
.lg-foot{margin-top:100px}
.nf{position:relative;overflow:hidden;padding:96px 0 120px}
.nf .s-dots{right:0;top:0;width:min(900px,100%);height:640px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 70%)}
.nf .big{position:absolute;right:-30px;top:40px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:520px;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.07);letter-spacing:-.02em;pointer-events:none}
.nf .in{position:relative}
.nf h1{margin-top:22px;max-width:820px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:128px;line-height:.82;text-transform:uppercase;letter-spacing:-.012em}
.nf h1 .br::after{content:"";position:absolute;z-index:-1;left:-24px;right:-52px;top:30%;height:74%;background:url(/img/v5/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.nf .s-lead{margin-top:28px;font-size:19px}
.nf .s-acts{margin-top:40px;flex-wrap:wrap}
.nf-pk{display:flex;align-items:center;gap:10px;margin-top:70px}
.nf-pk i{width:78px;height:52px;display:grid;place-items:center;border-radius:10px;background:var(--ink);color:var(--bg);font-family:var(--cond);font-weight:900;font-size:22px;font-style:normal;transform:skewX(var(--skew))}
.nf-pk i.lost{width:110px;background:transparent;color:var(--red);box-shadow:inset 0 0 0 2px var(--red)}
.nf-pk i.wait{background:var(--bg-3);color:var(--ink-3);box-shadow:inset 0 0 0 1px var(--line-2)}
.nf-pk span{margin-left:18px;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.nf-pk span b{color:var(--red)}
.nf-go{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:34px;font-size:14.5px;color:var(--ink-3)}
.nf-go a{height:34px;padding:0 14px;display:inline-grid;place-items:center;border-radius:999px;background:var(--bg-2);border:1px solid var(--line-2);font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink)}
.nf-go a:hover{border-color:var(--red)}
@media (max-width:1080px){
  .lg-gl{grid-template-columns:1fr 1fr}
  .lg-wrap{grid-template-columns:1fr;gap:0}
  .lg-toc{position:static}
  .lg-toc nav{grid-template-columns:1fr 1fr}
  .lg-hero h1{font-size:88px}
  .nf h1{font-size:96px}
  .nf .big{font-size:360px}
}
@media (max-width:760px){
  .lg-nav .r > a:not(.btn) span{display:none}
  .lg-hero{padding-top:50px}
  .lg-hero h1{font-size:clamp(52px,15vw,80px)}
  .lg-hero h1 .br::after{left:-12px;right:-24px}
  .lg-gl{grid-template-columns:1fr;margin-top:36px}
  .lg-gl b{font-size:42px}
  .lg-toc nav{grid-template-columns:1fr}
  .lg-sec h2{font-size:32px}
  .lg-sec h2 .n{min-width:48px;font-size:44px}
  .lg-sec p,.lg-sec li{font-size:16px}
  .lg-sec:target{margin-left:-14px;margin-right:-14px;padding:30px 18px}
  .lg-tbl > div{grid-template-columns:1fr;gap:6px;padding:14px 16px}
  .lg-tbl > div:first-child{display:none}
  .lg-foot{margin-top:70px}
  .nf{padding:56px 0 80px}
  .nf h1{font-size:clamp(52px,15vw,80px)}
  .nf h1 .br::after{left:-12px;right:-24px}
  .nf .big{font-size:220px;top:auto;bottom:20px;right:-20px}
  .nf .s-acts .btn{flex:1 1 100%}
  .nf-pk{gap:6px;margin-top:50px;flex-wrap:wrap}
  .nf-pk i{width:46px;height:40px;font-size:17px}
  .nf-pk i.lost{width:70px}
  .nf-pk span{margin:10px 0 0;width:100%;font-size:13px}
}
'''


def head(title, desc, meta, root=''):
    return (f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<meta name="theme-color" content="#0A0A0B">\n<title>{title}</title>\n'
            + (f'<meta name="description" content="{desc}">\n' if desc else '') + meta +
            f'<link rel="icon" href="{root}favicon.svg" type="image/svg+xml">\n<link rel="icon" href="{root}favicon.ico" sizes="any">\n'
            f'<link rel="apple-touch-icon" href="{root}apple-touch-icon.png">\n'
            f'<link rel="preload" href="{root}fonts/BarlowCondensed-900-italic.woff2" as="font" type="font/woff2" crossorigin>\n'
            f'<link rel="stylesheet" href="{root}v5.css?v={CSSV}">\n'
            f'<script src="{root}v5.js?v={JSV}" defer></script>\n'
            f'<style>\n{CSS.strip()}\n</style>\n</head>\n<body>\n<!-- icons -->\n<!-- /icons -->\n')


def logo(root):
    return (f'<a class="s-logo" href="{root or "./"}" aria-label="Rago Optimizer home"><img src="{root}img/v5/rago-icon.svg" alt="" width="34" height="34"><b>rago</b></a>')


def footer(root=''):
    r = root or './'
    return (f'<footer class="s-foot"><div class="sw5"><div class="row"><div>{logo(root)}<p class="motto">every millisecond counts.</p></div>\n'
            f'  <nav class="cols" aria-label="Footer"><div><b>product</b><a href="{r}#features">Features</a><a href="{root}tweaks.html">Tweaks</a>'
            f'<a href="{root}route.html">Rago Route</a><a href="{r}#pricing">Pricing</a><a href="{r}#faq">FAQ</a></div>'
            f'<div><b>community</b><a href="{DISCORD}" target="_blank" rel="noopener">Discord</a><a href="{root}partners.html">Partners</a>'
            f'<a href="{ACC}/affiliate">Affiliate program</a><a href="{root}reviews.html">Reviews</a></div>'
            f'<div><b>account</b><a href="{ACC}/login">Sign in</a><a href="{ACC}/signup">Create account</a></div>'
            f'<div><b>legal</b><a href="{root}terms.html">Terms</a><a href="{root}privacy.html">Privacy</a><a href="{root}terms.html#cancel">Cancellation</a></div></nav></div>\n'
            f'  <p class="legal">{LEGAL}</p></div></footer>\n')


NAV_JS = ('const top5 = document.getElementById("top"); const onTop = () => top5.classList.toggle("scrolled", scrollY > 10); '
          'addEventListener("scroll", onTop, { passive: true }); onTop();\n')
# the table of contents shows the section being read
TOC_JS = '''const links = [...document.querySelectorAll(".lg-toc nav a")], secs = links.map(a => document.getElementById(a.hash.slice(1)));
const mark = () => { let k = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .35) k = i; }); links.forEach((a, i) => a.classList.toggle("on", i === k)); };
addEventListener("scroll", mark, { passive: true }); mark();
'''


def sections(src, numbered, ids):
    """<h2>N. Title</h2> + content -> <section class="lg-sec" id> with the number apart; returns (html, toc)."""
    parts = re.split(r'(<h2[^>]*>.*?</h2>)', src.strip())
    out, toc = [], []
    for i in range(1, len(parts), 2):
        m = re.match(r'<h2(?: id="([^"]+)")?>(.*?)</h2>', parts[i])
        own_id, t = m.groups()
        n = None
        if numbered:
            n, t = re.match(r'(\d+a?)\. (.*)', t).groups()
        sid = own_id or ids.get(n or t) or ('s' + n if n else re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-'))
        body = parts[i + 1].strip()
        # the data table of the privacy policy: a two-column list
        body = re.sub(r'<div class="tbl"><table>(.*?)</table></div>', lambda mm: '<div class="lg-tbl" role="table">' + ''.join(
            '<div role="row">' + ''.join(f'<span role="{"columnheader" if c == "th" else "cell"}">{x}</span>' for c, x in re.findall(r'<(t[hd])>(.*?)</t[hd]>', row)) + '</div>'
            for row in re.findall(r'<tr>(.*?)</tr>', mm.group(1), re.S)) + '</div>', body, flags=re.S)
        num = f'<span class="n" aria-hidden="true">{n}</span>' if n else ''
        lbl = f'<span class="sr-only">{n}. </span>' if n else ''
        out.append(f'<section class="lg-sec" id="{sid}"><h2>{num}{lbl}<span>{t}</span></h2>\n{body}\n</section>')
        toc.append(f'<a href="#{sid}">' + (f'<em>{n}</em>' if n else '') + f'<span>{t}</span></a>')
    return '\n'.join(out), toc


def glance(cards):
    return ('<div class="lg-gl">' + ''.join(f'<div class="s-card"><span class="k">{k}</span><b>{b}</b><p>{p}</p><a href="#{h}">{a}</a></div>' for k, b, p, h, a in cards)
            + '</div>')


def legal_page(name, title, h1, eb, desc, og, cards, note, numbered, ids):
    src = open(os.path.join(OUT, 'src', 'legal', name)).read()
    secs, toc = sections(src, numbered, ids)
    key = name[:-5]
    seg = ''.join(f'<a href="{p}"' + (' aria-current="page"' if p == name else '') + f'>{t}</a>' for p, t in (('terms.html', 'Terms of sale'), ('privacy.html', 'Privacy policy')))
    meta = (f'<link rel="canonical" href="{SITE}/{name}">\n<meta property="og:site_name" content="Rago Optimizer">\n<meta property="og:type" content="website">\n'
            f'<meta property="og:url" content="{SITE}/{name}">\n<meta property="og:title" content="{og}">\n<meta property="og:description" content="{desc}">\n'
            f'<meta property="og:image" content="{SITE}/og-image.png?v={OGV}">\n')
    a, b = h1
    page = (head(f'{title} · Rago Optimizer', desc, meta)
            + f'<header class="s-nav lg-nav" id="top"><span class="brand">{logo("")}</span><div class="r"><a href="./">{icon("left")}<span>Back to the site</span></a>'
              f'<a class="btn red" href="./#pricing">Get Premium</a></div></header>\n<main>\n'
            + f'<section class="lg-hero"><span class="s-dots" aria-hidden="true"></span>\n'
              f'  <p class="s-eb">Legal <b>//</b> {eb}</p><h1>{a} <span class="br">{b}</span></h1>\n'
              f'  <div class="lg-meta"><nav class="lg-seg" aria-label="Legal pages">{seg}</nav><span class="lg-upd">Last updated <b>{UPD[key]}</b></span></div>\n'
              f'  {glance(cards)}<p class="lg-gl-note">{note}</p>\n</section>\n'
            + f'<div class="lg-wrap"><aside class="lg-toc"><p class="s-eb" id="toc-t">On this page</p><nav aria-labelledby="toc-t"{"" if numbered else " class=\"plain\""}>{"".join(toc)}</nav>'
              f'<div class="s-card lg-help"><b>Questions?</b><p>Write to {MAIL} from the email of your Rago account, or ask on our Discord server.</p>'
              f'<a class="btn" href="{DISCORD}" target="_blank" rel="noopener">{icon("chat")}Open Discord</a></div></aside>\n'
              f'<div class="lg-doc">\n{secs}\n</div></div>\n</main>\n'
            + f'<div class="lg-foot">{footer()}</div>\n<script>\n{NAV_JS}{TOC_JS}</script>\n</body>\n</html>\n')
    path = os.path.join(OUT, name)
    open(path, 'w').write(page)
    sync_icons.sync(path)


legal_page('terms.html', 'Terms of Sale', ('Terms', 'of sale.'), 'terms of sale',
           'Terms of sale for Rago Optimizer: the Free, Premium and Lifetime plans, the free trial, the Rago Route option, prices, your one-PC license, renewal, cancellation and the no-refund policy.',
           'Rago Optimizer terms of sale',
           [('free trial', '3 days', 'Nothing is charged if you cancel before the trial ends.', 's4', 'section 4'),
            ('per license', '1 PC', 'Your license is linked to one PC. Support can move it to a new one.', 's5', 'section 5'),
            ('cancel', 'anytime', 'From your account page. Premium stays until the end of the period you paid.', 'cancel', 'section 6'),
            ('payments', 'no refunds', 'Except a double or mistaken charge: we give the extra payment back.', 'cancel', 'section 6')],
           'At a glance. The full terms below are what apply.', True, {})

legal_page('privacy.html', 'Privacy Policy', ('Privacy', 'policy.'), 'privacy policy',
           'What Rago Optimizer and its account server collect, why, who processes it, how long it is kept and how to delete it.',
           'Rago Optimizer privacy policy',
           [('cookies', '0 ads', 'No advertising or analytics cookies, and no third-party fonts or trackers.', 'cookies', 'cookies'),
            ('your card', 'Stripe only', 'Your card number goes to Stripe, never to us.', 'collect', 'what we collect'),
            ('network test', 'no IP kept', "City and provider are worked out on our own server. The IP address itself isn't kept.", 'collect', 'what we collect'),
            ('delete', '30 days', 'Account and license data is deleted within 30 days of your request.', 'keep', 'how long we keep it')],
           'At a glance. The full policy below is what applies.', False,
           {'What we collect, and why': 'collect', 'Cookies and local storage': 'cookies', 'How long we keep it': 'keep',
            'Who is responsible': 'who', 'Who processes it for us': 'processors', 'Your rights': 'rights'})

# 404: Netlify serves it for any unknown path, so every link and file is absolute. Not indexed.
nf = (head('Page not found · Rago Optimizer', '', '<meta name="robots" content="noindex">\n', '/')
      + f'<header class="s-nav" id="top"><span class="brand">{logo("/")}</span><nav aria-label="Site"><a href="/#why">Why Rago</a><a href="/#features">Features</a>'
        f'<a href="/route.html">Rago Route</a><a href="/tweaks.html">Tweaks</a><a href="/reviews.html">Reviews</a><a href="/#pricing">Pricing</a><a href="/#faq">FAQ</a></nav>'
        f'<div class="r"><a class="hide-m" href="{ACC}/login">Sign in</a><a class="btn red" href="/#pricing">Get Premium</a></div></header>\n<main>\n'
      + '<section class="nf"><span class="s-dots" aria-hidden="true"></span><span class="big" aria-hidden="true">404</span><div class="in">\n'
        "  <p class=\"s-eb\">Error <b>//</b> 404</p><h1>This page <span class=\"br\">doesn't exist.</span></h1>\n"
        '  <p class="s-lead">The link may be old or mistyped.</p>\n'
        f'  <div class="s-acts"><a class="btn red xl" href="/">{icon("left")}Back to Rago Optimizer</a><a class="btn xl" href="/#pricing">See pricing</a></div>\n'
        '  <div class="nf-pk" aria-hidden="true"><i>1</i><i>2</i><i>3</i><i class="lost">404</i><i class="wait">5</i><span>packet lost <b>//</b> this page never arrived</span></div>\n'
        '  <nav class="nf-go" aria-label="Popular pages">Or go to<a href="/tweaks.html">Tweaks</a><a href="/route.html">Rago Route</a><a href="/reviews.html">Reviews</a><a href="/#faq">FAQ</a></nav>\n'
        '</div></section>\n</main>\n'
      + footer('/') + f'<script>\n{NAV_JS}</script>\n</body>\n</html>\n')
nf = nf.replace('href="/./"', 'href="/"')
p = os.path.join(OUT, '404.html')
open(p, 'w').write(nf)
sync_icons.sync(p)
print('legal ok')
