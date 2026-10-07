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

i = s.index('</style>', s.index('<style>\n/* Layout')) + len('</style>')
head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A0A0B">
<meta property="og:title" content="Rago Optimizer">
<meta property="og:description" content="Every millisecond counts. The Minecraft PvP optimizer for Windows: 226 tweaks, free to start, with a restore point before every change.">
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
'''.replace('{SITE}', SITE)
open(os.path.join(ROOT, 'index.html'), 'w').write(head + s[:i] + '\n</head>\n<body>\n' + s[i:].lstrip('\n') + '\n</body>\n</html>\n')
print('index.html built')
