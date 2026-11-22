"""Builds site/index.html (what Netlify serves) from site/src/page.html (also the Claude preview), site/reviews.html
from site/src/reviews.html, site/tweaks.html from site/src/tweaks.html (its tweak list: tools/sync_tweaks.py) and
site/partners.html from site/src/partners.html (partner cards: src/partners.json, written first by tools/sync_partners.py).
site/route.html from site/src/route.html. The legal pages and the 404 page are built apart, by tools/make_legal.py."""
import os
SITE = 'https://rago-optimizer.com'  # public site URL
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# Partner cards of the home page and of partners.html, from src/partners.json (stops here if an entry is incomplete)
import subprocess, sys
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'sync_partners.py')], check=True)
# The icon sprite of each source page (design v5): every icon a page uses, from tools/icons_v5.json
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'sync_icons.py')], check=True)
s = open(os.path.join(ROOT, 'src/page.html')).read()

# Design v5 (22/11/2026): every page links the shared stylesheet v5.css (Barlow, from site/fonts/: visitors' IP addresses
# aren't sent to Google). Its address changes with its content, so browsers never keep an old copy.
import hashlib
CSSV = hashlib.sha256(open(os.path.join(ROOT, 'v5.css'), 'rb').read()).hexdigest()[:10]
def css(html, name):
    assert html.count('<link rel="stylesheet" href="v5.css">') == 1, f'link to v5.css not found in {name}: update build.py'
    return html.replace('<link rel="stylesheet" href="v5.css">', f'<link rel="stylesheet" href="v5.css?v={CSSV}">')
s = css(s, 'page.html')

# Without JavaScript the page still works: account links point at the real server and the price shows the default (yearly) plan
import re, json
cfg = lambda k: (lambda m: m.group(1) if m.group(1) is not None else m.group(2))(re.search(k + r':\s*(?:"([^"]*)"|([\d.]+))', s))
BASE, CUR = cfg('accountBase').rstrip('/'), cfg('currency')
PM, PY, PL = float(cfg('priceMonth')), float(cfg('priceYear')), float(cfg('priceLifetime'))
ISO = {'$': 'USD', '€': 'EUR', '£': 'GBP'}.get(CUR, 'USD')
for path in ('/login', '/signup', '/affiliate', '/download', '/buy?interval=year', '/buy/route'):
    s = s.replace(f'href="{path}"', f'href="{BASE}{path}"')
import math, subprocess
jsround = lambda n: math.floor(n * 100 + 0.5) / 100  # same rounding as the page's JS (Math.round)
FREE = math.floor(1e-9 + 12 - PY / PM)                  # same as MONTHS_FREE in the page
free_txt = f"{FREE} month{'' if FREE == 1 else 's'} free"
s = re.sub(r'<b id="p-amt">[^<]*</b>', f'<b id="p-amt">{CUR}{jsround(PY / 12):.2f}</b>', s)
s, n = re.subn(r'<p class="bil" id="p-note">[^<]*</p>', f'<p class="bil" id="p-note">Billed {CUR}{jsround(PY):.2f} yearly.{" " + free_txt + "." if FREE >= 1 else ""}</p>', s)
assert n == 1, 'price note (p-note) not found in page.html'
s, n = re.subn(r'<em id="save"( hidden)?>[^<]*</em>', f'<em id="save"{"" if FREE >= 1 else " hidden"}>{free_txt}</em>', s)
assert n == 1, 'yearly saving (save) not found in page.html'

s, n = re.subn(r'<b id="l-amt">[^<]*</b>', f'<b id="l-amt">{CUR}{PL:.2f}</b>', s)  # Lifetime: its button stays "Coming soon" without JavaScript
assert n == 1, 'Lifetime price (l-amt) not found in page.html'
# The account server sells Lifetime only at its own LIFETIME_PRICE: both must say the same amount
srv = os.path.join(ROOT, '..', 'licensing', 'src', 'billing.js')
if os.path.isfile(srv):
    m = re.search(r"LIFETIME_PRICE = \{ amount: (\d+), currency: '(\w+)' \}", open(srv).read())
    assert m and (int(m.group(1)), m.group(2)) == (round(PL * 100), ISO.lower()), \
        f'priceLifetime ({CUR}{PL:.2f} in src/page.html) and LIFETIME_PRICE (licensing/src/billing.js) differ: change both'
# Rago Route option (2026-11-13): the site's price is the server's ROUTE_PRICE
PR = float(cfg('priceRoute'))
ra = os.path.join(ROOT, '..', 'licensing', 'src', 'route-addon.js')
if os.path.isfile(ra):
    m = re.search(r"ROUTE_PRICE = \{ amount: (\d+), currency: '(\w+)'", open(ra).read())
    assert m and (int(m.group(1)), m.group(2)) == (round(PR * 100), ISO.lower()), \
        f'priceRoute ({CUR}{PR:.2f} in src/page.html) and ROUTE_PRICE (licensing/src/route-addon.js) differ: change both'
# and its yearly price (2026-11-13), the server's ROUTE_PRICE_YEARLY
PRY = float(cfg('priceRouteYear'))
if os.path.isfile(ra):
    m = re.search(r"ROUTE_PRICE_YEARLY = \{ amount: (\d+), currency: '(\w+)'", open(ra).read())
    assert m and (int(m.group(1)), m.group(2)) == (round(PRY * 100), ISO.lower()), \
        f'priceRouteYear ({CUR}{PRY:.2f} in src/page.html) and ROUTE_PRICE_YEARLY (licensing/src/route-addon.js) differ: change both'
# FAQ without JavaScript: the same questions, rendered once here into a <noscript> block
a = s.index('  const F = ['); b = s.index('\n  ];', a) + len('\n  ];')
try:
    faq = json.loads(subprocess.run(['node', '-e', f'const MONTHS_FREE = {FREE}; const CONFIG = {json.dumps({"currency": CUR, "priceLifetime": PL, "priceMonth": PM, "trialDays": int(cfg("trialDays"))})};' + s[a:b] + ';process.stdout.write(JSON.stringify(F))'],
                                    capture_output=True, text=True, check=True).stdout)
    esc = lambda t: t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    DISCORD = cfg('discord')
    dlink = lambda h: re.sub(r'\bDiscord\b', f'<a href="{DISCORD}" rel="noopener">Discord</a>', h) if DISCORD else h
    # without JavaScript, Lifetime can't be bought from this page: its questions (marked "life") stay out
    static = ''.join(f'<details class="s-q"><summary class="qh"><span>{esc(q)}</span><span class="pm" aria-hidden="true"></span></summary><p>{dlink(esc(x))}</p></details>' for q, x, *only in faq if not only)
    s = s.replace('<div class="faq rv" id="faqs"></div>', '<div class="faq rv" id="faqs"></div>\n    <noscript><div class="faq">' + static + '</div></noscript>', 1)
    s = re.sub(r'(<span id="faq-n">)\d+', lambda m: m.group(1) + str(sum(1 for f in faq if len(f) < 3)), s)
except (OSError, subprocess.CalledProcessError) as e:
    print('warning: static FAQ skipped (node not available):', e)
# Discord buttons and the Community section (class js-discord): with CONFIG.discord set they are baked in for visitors
# without JavaScript; empty, they stay hidden (the page's JS removes them)
DISCORD = cfg('discord')
if DISCORD:
    s = s.replace('href="#discord"', f'href="{DISCORD}" target="_blank" rel="noopener"')
    s, n = re.subn(r'(<[a-z]+ [^>]*\bjs-discord\b[^>]*?) hidden>', r'\1>', s)
    assert n >= 1, 'no js-discord element found in page.html'
# Share image: its address changes with its content, so Discord, WhatsApp and social networks fetch the new one
import hashlib
OG = f"{SITE}/og-image.png?v={hashlib.sha256(open(os.path.join(ROOT, 'og-image.png'), 'rb').read()).hexdigest()[:10]}"
# Structured data, only for what the page shows: the site's name (for Google's site name), who runs it, the app and its plans
ORG = SITE + "/#organization"
LD = json.dumps({"@context": "https://schema.org", "@graph": [
  {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "Rago Optimizer", "alternateName": "Rago",
   "inLanguage": "en", "publisher": {"@id": ORG}},
  {"@type": "Organization", "@id": ORG, "name": "Rago Optimizer", "url": SITE + "/", "logo": SITE + "/apple-touch-icon.png",
   "email": "support@rago-optimizer.com"},
  # aggregateRating (Google's stars) is added by the page itself from the published reviews: see "Reviews" in page.html
  {"@type": "SoftwareApplication", "@id": SITE + "/#app", "name": "Rago Optimizer", "operatingSystem": "Windows 10, Windows 11",
   "applicationCategory": "UtilitiesApplication", "url": SITE + "/", "image": OG, "publisher": {"@id": ORG},
   "description": "The Minecraft PvP optimizer for Windows: steadier ping, smoother frames, less input lag.",
   "offers": [{"@type": "Offer", "name": "Free", "price": "0", "priceCurrency": ISO},
              {"@type": "Offer", "name": "Premium monthly", "price": f"{PM:.2f}", "priceCurrency": ISO},
              {"@type": "Offer", "name": "Premium yearly", "price": f"{PY:.2f}", "priceCurrency": ISO}]}]})

i = s.index('</style>', s.index('<style>\n/* Layout')) + len('</style>')
head = ('''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A0A0B">
<link rel="canonical" href="{SITE}/">
<meta property="og:site_name" content="Rago Optimizer">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="{SITE}/">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{OGDESC}">
<meta property="og:image" content="{OG}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{ALT}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{TITLE}">
<meta name="twitter:description" content="{OGDESC}">
<meta name="twitter:image" content="{OG}">
<meta name="twitter:image:alt" content="{ALT}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script type="application/ld+json">{LD}</script>
'''.replace('{OGDESC}', 'Every millisecond counts. The Minecraft PvP optimizer for Windows: {TOTAL}, free to start, with a restore point offered before advanced tweaks.')
        .replace('{TITLE}', re.search(r'<title>([^<]+)</title>', s).group(1)).replace('{ALT}', 'Rago Optimizer, the Windows optimizer for Minecraft PvP. Every millisecond counts.')
        .replace('{SITE}', SITE).replace('{OG}', OG).replace('{LD}', LD).replace('{TOTAL}', re.search(r'<h2 class="s-h2" id="feat-h">((?:Nearly )?\d+ tweaks)\.', s).group(1).lower()))
OUT = os.path.join(ROOT, 'index.html')
page = head + s[:i] + '\n</head>\n<body>\n' + s[i:].lstrip('\n') + '\n</body>\n</html>\n'
open(OUT, 'w').write(page)

# Without JavaScript: bake the comparison table into the HTML (the JS rewrites them on load).
# The reviews come from the account server and stay hidden without JavaScript.
try:
    baked = json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'prerender.js'), OUT], capture_output=True, text=True, check=True).stdout)
    for k, v in baked.items():
        page, n = re.subn(r'(<[a-z]+ [^>]*id="' + k + r'"[^>]*>)(</[a-z]+>)', lambda m: m.group(1) + v + m.group(2), page, count=1)
        assert n == 1, k
    open(OUT, 'w').write(page)
except (OSError, subprocess.CalledProcessError) as e:
    print('warning: no-JS sections not baked (node + playwright needed):', getattr(e, 'stderr', e))
print('index.html built')

# Reviews, Tweaks and Partners pages (site/X.html, from src/X.html): the shared stylesheet, and the same account server as
# the home page (in their script and in the links baked for visitors without JavaScript).
# share images of the other pages, with the same changing address as the home page's
OGR = f"{SITE}/media/og-route.png?v={hashlib.sha256(open(os.path.join(ROOT, 'media/og-route.png'), 'rb').read()).hexdigest()[:10]}"
share = lambda t: t.replace(f'content="{SITE}/og-image.png"', f'content="{OG}"').replace(f'content="{SITE}/media/og-route.png"', f'content="{OGR}"')
for name in ('reviews.html', 'tweaks.html', 'partners.html'):
    t = share(css(open(os.path.join(ROOT, 'src', name)).read(), name))
    t, n = re.subn(r'accountBase: "[^"]*"', f'accountBase: "{BASE}"', t, count=1)
    assert n == 1 or name == 'partners.html', f'accountBase not found in {name}'
    t = t.replace('href="https://account.rago-optimizer.com/', f'href="{BASE}/')
    open(os.path.join(ROOT, name), 'w').write(t)
    print(name, 'built')

# Rago Route page (site/route.html, from src/route.html): its sales page, so the shared stylesheet, the same account server as
# the home page, and the home page's prices, trial and currency (CONFIG of page.html), also baked into the text and
# the links for visitors without JavaScript.
ro = share(css(open(os.path.join(ROOT, 'src/route.html')).read(), 'route.html'))
TD = int(cfg('trialDays'))
for key, val in (('accountBase', f'"{BASE}"'), ('trialDays', str(TD)), ('currency', f'"{CUR}"'),
                 ('priceMonth', cfg('priceMonth')), ('priceYear', cfg('priceYear')), ('priceRoute', cfg('priceRoute')),
                 ('priceRouteYear', cfg('priceRouteYear'))):
    ro, n = re.subn(key + r': (?:"[^"]*"|[\d.]+)', lambda m: f'{key}: {val}', ro, count=1)
    assert n == 1, f'{key} not found in the CONFIG of route.html'
money = lambda n: f'{CUR}{jsround(n):.2f}'
money0 = lambda n: f'{CUR}{int(n)}' if n == int(n) else money(n)  # $3, as the page's JS writes it
for cls, val in (('js-td', str(TD)), ('js-pm', money(PM)), ('js-py', money(PY)), ('js-pr', money0(PR)), ('js-pmr', money(PM + PR)), ('js-pry', money(PRY)), ('js-pyr', money(PY + PRY)),
                 ('js-free', free_txt if FREE >= 1 else f'{money(PY / 12)} a month')):  # same texts as the page's JS
    ro, n = re.subn(rf'(<span class="{cls}">)[^<]*(</span>)', lambda m: m.group(1) + val + m.group(2), ro)
    assert n >= 1, f'no {cls} in route.html'
for path in ('/buy?interval=month&amp;trial=1&amp;route=1', '/buy?interval=year&amp;route=1', '/buy/route',
             '/buy/route?interval=month', '/buy/route?interval=year'):
    ro, n = re.subn(re.escape(f'href="{path}"'), f'href="{BASE}{path}"', ro)
    assert n >= 1, f'no link to {path} in route.html'
ro = ro.replace('href="https://account.rago-optimizer.com/', f'href="{BASE}/')  # bar on top and footer
open(os.path.join(ROOT, 'route.html'), 'w').write(ro)
print('route.html built')
