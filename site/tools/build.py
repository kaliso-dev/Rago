"""Builds site/index.html (what Netlify serves) from site/src/page.html (also the Claude preview).
The source loads Geist from Google Fonts so the preview works; the built page uses the copies in site/fonts/ instead,
so visitors' IP addresses aren't sent to Google."""
import os
SITE = 'https://rago-optimiser.netlify.app'  # public site URL: change when the domain is live
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
s = open(os.path.join(ROOT, 'src/page.html')).read()

GOOGLE = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">'''
LOCAL = '''<link rel="preload" href="fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:"Geist";src:url("fonts/Geist-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Geist Mono";src:url("fonts/GeistMono-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
</style>'''
assert GOOGLE in s, 'Google Fonts block changed in page.html: update build.py'
s = s.replace(GOOGLE, LOCAL)

# Without JavaScript the page still works: account links point at the real server and the price shows the default (yearly) plan
import re, json
cfg = lambda k: (lambda m: m.group(1) if m.group(1) is not None else m.group(2))(re.search(k + r':\s*(?:"([^"]*)"|([\d.]+))', s))
BASE, CUR = cfg('accountBase').rstrip('/'), cfg('currency')
PM, PY = float(cfg('priceMonth')), float(cfg('priceYear'))
ISO = {'$': 'USD', '€': 'EUR', '£': 'GBP'}.get(CUR, 'USD')
for path in ('/login', '/signup', '/affiliate', '/download', '/buy?interval=year'):
    s = s.replace(f'href="{path}"', f'href="{BASE}{path}"')
s = re.sub(r'<b id="p-amt">[^<]*</b>', f'<b id="p-amt">{CUR}{PY / 12:.2f}</b>', s)
s = re.sub(r'<div class="price-note" id="p-note">[^<]*</div>', f'<div class="price-note" id="p-note">Billed {CUR}{PY:.2f} yearly.</div>', s)
LD = json.dumps({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Rago Optimizer",
  "operatingSystem": "Windows 10, Windows 11", "applicationCategory": "UtilitiesApplication", "url": SITE + "/",
  "image": SITE + "/og-image.png", "description": "The Minecraft PvP optimizer for Windows: steadier ping, smoother frames, less input lag.",
  "offers": [{"@type": "Offer", "name": "Free", "price": "0", "priceCurrency": ISO},
             {"@type": "Offer", "name": "Premium monthly", "price": f"{PM:.2f}", "priceCurrency": ISO},
             {"@type": "Offer", "name": "Premium yearly", "price": f"{PY:.2f}", "priceCurrency": ISO}]})

i = s.index('</style>', s.index('<style>\n/* Layout')) + len('</style>')
head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A0A0B">
<link rel="canonical" href="{SITE}/">
<meta property="og:title" content="Rago Optimizer: Minecraft PvP optimizer for Windows">
<meta property="og:description" content="Every millisecond counts. The Minecraft PvP optimizer for Windows: 226 tweaks, free to start, with a restore point offered before changes.">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}/">
<meta property="og:image" content="{SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Rago Optimizer, the Minecraft PvP optimizer for Windows">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}/og-image.png">
<meta name="twitter:image:alt" content="Rago Optimizer, the Minecraft PvP optimizer for Windows">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script type="application/ld+json">{LD}</script>
'''.replace('{SITE}', SITE).replace('{LD}', LD)
open(os.path.join(ROOT, 'index.html'), 'w').write(head + s[:i] + '\n</head>\n<body>\n' + s[i:].lstrip('\n') + '\n</body>\n</html>\n')
print('index.html built')
