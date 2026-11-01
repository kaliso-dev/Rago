"""Builds site/index.html (what Netlify serves) from site/src/page.html (also the Claude preview), site/reviews.html
from site/src/reviews.html, site/tweaks.html from site/src/tweaks.html (its tweak list: tools/sync_tweaks.py) and
site/partners.html from site/src/partners.html (partner cards: src/partners.json, written first by tools/sync_partners.py).
The source loads its fonts from Google Fonts so the preview works; the built page uses the copies in site/fonts/ instead,
so visitors' IP addresses aren't sent to Google."""
import os
SITE = 'https://rago-optimizer.com'  # public site URL
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# Partner cards of the home page and of partners.html, from src/partners.json (stops here if an entry is incomplete)
import subprocess, sys
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'sync_partners.py')], check=True)
s = open(os.path.join(ROOT, 'src/page.html')).read()

GOOGLE = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">'''
LOCAL = '''<link rel="preload" href="fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:"Geist";src:url("fonts/Geist-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Geist Mono";src:url("fonts/GeistMono-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
</style>'''
# The home page wears the type of the graphic charter 2.2 (Bricolage Grotesque, Instrument Sans, IBM Plex Mono); the other pages still use Geist
GOOGLE_HOME = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=Instrument+Sans:wght@400..700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">'''
LOCAL_HOME = '''<link rel="preload" href="fonts/Bricolage-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/InstrumentSans-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:"Bricolage Grotesque";font-style:normal;font-weight:400 800;font-stretch:75% 100%;font-display:swap;src:url("fonts/Bricolage-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:"Bricolage Grotesque";font-style:normal;font-weight:400 800;font-stretch:75% 100%;font-display:swap;src:url("fonts/Bricolage-latin.woff2") format("woff2");unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:"Instrument Sans";font-style:normal;font-weight:400 700;font-display:swap;src:url("fonts/InstrumentSans-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:"Instrument Sans";font-style:normal;font-weight:400 700;font-display:swap;src:url("fonts/InstrumentSans-latin.woff2") format("woff2");unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:400;font-display:swap;src:url("fonts/PlexMono-400-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:400;font-display:swap;src:url("fonts/PlexMono-400-latin.woff2") format("woff2");unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:500;font-display:swap;src:url("fonts/PlexMono-500-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:500;font-display:swap;src:url("fonts/PlexMono-500-latin.woff2") format("woff2");unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:600;font-display:swap;src:url("fonts/PlexMono-600-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:600;font-display:swap;src:url("fonts/PlexMono-600-latin.woff2") format("woff2");unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
</style>'''
assert GOOGLE_HOME in s, 'Google Fonts block changed in page.html: update build.py'
s = s.replace(GOOGLE_HOME, LOCAL_HOME)

# Without JavaScript the page still works: account links point at the real server and the price shows the default (yearly) plan
import re, json
cfg = lambda k: (lambda m: m.group(1) if m.group(1) is not None else m.group(2))(re.search(k + r':\s*(?:"([^"]*)"|([\d.]+))', s))
BASE, CUR = cfg('accountBase').rstrip('/'), cfg('currency')
PM, PY, PL = float(cfg('priceMonth')), float(cfg('priceYear')), float(cfg('priceLifetime'))
ISO = {'$': 'USD', '€': 'EUR', '£': 'GBP'}.get(CUR, 'USD')
for path in ('/login', '/signup', '/affiliate', '/download', '/buy?interval=year'):
    s = s.replace(f'href="{path}"', f'href="{BASE}{path}"')
import math, subprocess
jsround = lambda n: math.floor(n * 100 + 0.5) / 100  # same rounding as the page's JS (Math.round)
FREE = math.floor(1e-9 + 12 - PY / PM)                  # same as MONTHS_FREE in the page
free_txt = f"{FREE} month{'' if FREE == 1 else 's'} free"
s = re.sub(r'<b id="p-amt">[^<]*</b>', f'<b id="p-amt">{CUR}{jsround(PY / 12):.2f}</b>', s)
s = re.sub(r'<div class="price-note" id="p-note">[^<]*</div>', f'<div class="price-note" id="p-note">Billed {CUR}{jsround(PY):.2f} yearly.{" " + free_txt + "." if FREE >= 1 else ""}</div>', s)
s = re.sub(r'<span class="save" id="save"( hidden)?>[^<]*</span>', f'<span class="save" id="save"{"" if FREE >= 1 else " hidden"}>{free_txt} yearly</span>', s)
s, n = re.subn(r'<b id="l-amt">[^<]*</b>', f'<b id="l-amt">{CUR}{PL:.2f}</b>', s)  # Lifetime: its button stays "Coming soon" without JavaScript
assert n == 1, 'Lifetime price (l-amt) not found in page.html'
# The account server sells Lifetime only at its own LIFETIME_PRICE: both must say the same amount
srv = os.path.join(ROOT, '..', 'licensing', 'src', 'billing.js')
if os.path.isfile(srv):
    m = re.search(r"LIFETIME_PRICE = \{ amount: (\d+), currency: '(\w+)' \}", open(srv).read())
    assert m and (int(m.group(1)), m.group(2)) == (round(PL * 100), ISO.lower()), \
        f'priceLifetime ({CUR}{PL:.2f} in src/page.html) and LIFETIME_PRICE (licensing/src/billing.js) differ: change both'
# FAQ without JavaScript: the same questions, rendered once here into a <noscript> block
a = s.index('  const F = ['); b = s.index('\n  ];', a) + len('\n  ];')
try:
    faq = json.loads(subprocess.run(['node', '-e', f'const MONTHS_FREE = {FREE}; const CONFIG = {json.dumps({"currency": CUR, "priceLifetime": PL})};' + s[a:b] + ';process.stdout.write(JSON.stringify(F))'],
                                    capture_output=True, text=True, check=True).stdout)
    esc = lambda t: t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    DISCORD = cfg('discord')
    dlink = lambda h: re.sub(r'\bDiscord\b', f'<a href="{DISCORD}" rel="noopener">Discord</a>', h) if DISCORD else h
    # without JavaScript, Lifetime can't be bought from this page: its questions (marked "life") stay out
    static = ''.join(f'<details class="fq-s"><summary>{esc(q)}</summary><p>{dlink(esc(x))}</p></details>' for q, x, *only in faq if not only)
    s = s.replace('<div class="faq rv" id="faqs"></div>', '<div class="faq rv" id="faqs"></div>\n    <noscript><div class="faq">' + static + '</div></noscript>', 1)
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
  {"@type": "SoftwareApplication", "name": "Rago Optimizer", "operatingSystem": "Windows 10, Windows 11",
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
<meta name="theme-color" content="#0C0909">
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
        .replace('{SITE}', SITE).replace('{OG}', OG).replace('{LD}', LD).replace('{TOTAL}', re.search(r'<h2>((?:Nearly )?\d+ tweaks)\. One clear app\.</h2>', s).group(1).lower()))
OUT = os.path.join(ROOT, 'index.html')
page = head + s[:i] + '\n</head>\n<body>\n' + s[i:].lstrip('\n') + '\n</body>\n</html>\n'
open(OUT, 'w').write(page)

# Without JavaScript: bake the comparison table, game strip and app previews into the HTML (the JS rewrites them on load).
# The reviews come from the account server and stay hidden without JavaScript.
try:
    baked = json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'prerender.js'), OUT], capture_output=True, text=True, check=True).stdout)
    for k, v in baked.items():
        page, n = re.subn(r'(<[a-z]+ [^>]*id="' + k + r'"[^>]*>)(</[a-z]+>)', lambda m: m.group(1) + v + m.group(2), page, count=1)
        assert n == 1, k
    page = page.replace('id="xpanel" role="tabpanel"', 'id="xpanel" role="tabpanel" aria-labelledby="xt1"', 1)  # the baked tab (Latency)
    open(OUT, 'w').write(page)
except (OSError, subprocess.CalledProcessError) as e:
    print('warning: no-JS sections not baked (node + playwright needed):', getattr(e, 'stderr', e))
print('index.html built')

# Reviews page (site/reviews.html, from src/reviews.html): local fonts too, and the same account server as the home page.
r = open(os.path.join(ROOT, 'src/reviews.html')).read()
assert GOOGLE in r, 'Google Fonts block changed in reviews.html: update build.py'
r = r.replace(GOOGLE, LOCAL)
r, n = re.subn(r'accountBase: "[^"]*"', f'accountBase: "{BASE}"', r, count=1)
assert n == 1, 'accountBase not found in reviews.html'
r = r.replace('href="https://account.rago-optimizer.com/', f'href="{BASE}/')  # the link baked for visitors without JavaScript
open(os.path.join(ROOT, 'reviews.html'), 'w').write(r)
print('reviews.html built')

# Tweaks page (site/tweaks.html, from src/tweaks.html): same as the reviews page.
t = open(os.path.join(ROOT, 'src/tweaks.html')).read()
assert GOOGLE in t, 'Google Fonts block changed in tweaks.html: update build.py'
t = t.replace(GOOGLE, LOCAL)
t, n = re.subn(r'accountBase: "[^"]*"', f'accountBase: "{BASE}"', t, count=1)
assert n == 1, 'accountBase not found in tweaks.html'
t = t.replace('href="https://account.rago-optimizer.com/', f'href="{BASE}/')  # the links baked for visitors without JavaScript
open(os.path.join(ROOT, 'tweaks.html'), 'w').write(t)
print('tweaks.html built')

# Partners page (site/partners.html, from src/partners.html): local fonts too. Static: no account server.
pa = open(os.path.join(ROOT, 'src/partners.html')).read()
assert GOOGLE in pa, 'Google Fonts block changed in partners.html: update build.py'
open(os.path.join(ROOT, 'partners.html'), 'w').write(pa.replace(GOOGLE, LOCAL))
print('partners.html built')
