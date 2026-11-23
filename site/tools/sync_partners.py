"""Writes the partner cards of the home page (src/page.html, Partners section: the partners marked "home") and of the
partners page (src/partners.html: all of them) from src/partners.json, in its order. build.py runs it first, so after
editing partners.json, running build.py is enough.

Each card is a link to the server's Discord invite, opened in a new tab, with its logo (site/img/partners/, square
WebP) and its exact name. Nothing is guessed: a missing logo, a link that isn't https or an empty name stops here."""
import html, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..')
SRC = os.path.join(SITE, 'src')
e = lambda t: html.escape(str(t), quote=True)

data = json.load(open(os.path.join(SRC, 'partners.json')))['partners']
errors = []
for i, p in enumerate(data, 1):
    if not isinstance(p.get('name'), str) or not p['name'].strip() or p['name'] != p['name'].strip():
        errors.append(f'partner {i}: "name" must be the exact server name')
    if not isinstance(p.get('url'), str) or not re.fullmatch(r'https://[^\s"<>]+', p['url']):
        errors.append(f'partner {i}: "url" must be the full https invite link')
    for k in ('logo', 'still'):
        if k == 'logo' or k in p:
            f = p.get(k)
            if not isinstance(f, str) or not re.fullmatch(r'img/partners/[a-z0-9-]+\.webp', f) or not os.path.isfile(os.path.join(SITE, f)):
                errors.append(f'partner {i}: "{k}" must be a WebP in site/img/partners/ (got {f!r})')
if not any(p.get('home') for p in data):
    errors.append('no partner has "home": true, the home page section would be empty')
if errors:
    sys.exit('partners.json:\n  ' + '\n  '.join(errors))

def logo(p, size=64):
    img = f'<img src="{e(p["logo"])}" alt="" width="{size}" height="{size}" loading="lazy" decoding="async">'
    # an animated logo stays still for visitors who turn animations off
    return f'<picture><source srcset="{e(p["still"])}" media="(prefers-reduced-motion: reduce)">{img}</picture>' if p.get('still') else img

def card(p, ind):
    # site v6 (23/11/2026): an item of the banner of partner servers under the hero (logo and name, opens their Discord)
    return (f'{ind}<li><a class="x-pt-i" href="{e(p["url"])}" target="_blank" rel="noopener">{logo(p, 48)}<b>{e(p["name"])}</b>'
            f'<span class="sr-only"> on Discord (opens in a new tab)</span></a></li>')

def card_logo(p, ind):
    # site v6: the logos in the Partners card of the Community section
    return f'{ind}{logo(p)}'

def card_all(p, ind):
    # partners page: a bigger logo, the name, and "Join on Discord" as a button
    return (f'{ind}<a class="s-card pt-c" href="{e(p["url"])}" target="_blank" rel="noopener"><div class="lg">{logo(p, 96)}'
            f'<div><b>{e(p["name"])}</b><small>Minecraft PvP server</small></div></div>'
            f'<span class="btn"><svg class="i" aria-hidden="true"><use href="#i-external"/></svg>Join on Discord</span>'
            f'<span class="sr-only"> (opens in a new tab)</span></a>')

def write(path, name, items, card=card):
    s = open(path).read()
    a, b = f'<!-- partners:{name} -->', f'<!-- /partners:{name} -->'
    assert s.count(a) == 1 and s.count(b) == 1, f'{a} and {b} must each appear once in {path}'
    i, j = s.index(a) + len(a), s.index(b)
    ind = s[s.rindex('\n', 0, i) + 1:i - len(a)]  # the markers' indentation
    out = s[:i] + '\n' + '\n'.join(card(p, ind) for p in items) + '\n' + ind + s[j:]
    if out != s:
        open(path, 'w').write(out)
    return len(items)

n_home = write(os.path.join(SRC, 'page.html'), 'home', [p for p in data if p.get('home')])
write(os.path.join(SRC, 'page.html'), 'homecard', [p for p in data if p.get('home')][:3], card_logo)
n_all = write(os.path.join(SRC, 'partners.html'), 'all', data, card_all)
# the number of servers in the eyebrow of the partners page
t = open(os.path.join(SRC, 'partners.html')).read()
t2, k = re.subn(r'(<span id="pt-n">)[^<]*(</span>)', rf'\g<1>{n_all} server{"s" if n_all != 1 else ""}\2', t)
assert k == 1, '<span id="pt-n"> not found in partners.html'
if t2 != t:
    open(os.path.join(SRC, 'partners.html'), 'w').write(t2)
print(f'partners: {n_home} on the home page, {n_all} on partners.html')
