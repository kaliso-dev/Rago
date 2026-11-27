# Portage des styles propres aux onglets de Réseau (rendus-v5/src/app-network-{packet,test,route}-pi.html) dans
# app/src/s5/pages/net.css. Le socle commun de ces maquettes est module.css (déjà porté sous .pg-mod) : seules les
# règles en plus de chaque onglet sont gardées, dans l'ordre, rattachées à .pg-net. La barre du Packet Optimizer
# (.apply, .ap) est sous .win, avec la classe .net. Retirés : .main{padding-bottom} (réglé dans s5/app.css), .ptr.
import re, sys
sys.path.insert(0, '.')
from port_s5 import SRC, OUT, split_top, split_sel, scope_sel, copy_urls, page_style

S = '.pg-net'
BAR = re.compile(r'^(html(?:\.[\w-]+)*\s+)?\.(apply|ap)\b')

def rules(name):
    return [(p.strip(), b.strip()) for p, b in split_top(page_style(name))]

base = set(rules('app-network-pi'))
seen, out = set(), []
for tab in ['packet', 'test', 'route']:
    for p, b in rules(f'app-network-{tab}-pi'):
        if (p, b) in base or (p, b) in seen: continue
        seen.add((p, b))
        out.append((tab, p, b))

def sel(s):
    if re.search(r'\.ptr\b', s): return None
    if re.fullmatch(r'\.main', s): return None
    m = BAR.match(s)
    if m:
        pre = m.group(1) or ''
        rest = s[len(pre):]
        return pre + '.win ' + re.sub(r'^\.(apply|ap)\b', lambda x: x.group(0) + '.net', rest, count=1)
    return scope_sel(s, S)

def scope(p, b):
    if p.startswith('@'):
        inner = ''.join(scope(pp, bb) for pp, bb in split_top(b))
        return p + '{' + inner + '}\n' if inner else ''
    ss = [x for x in (sel(s) for s in split_sel(p)) if x]
    return ','.join(ss) + '{' + b + '}\n' if ss else ''

css, cur = '', None
for tab, p, b in out:
    if tab != cur:
        css += f'/* ---- onglet {tab} ---- */\n'; cur = tab
    css += scope(p, b)
d = OUT / 'pages'
css = copy_urls(css, d)
(d / 'net.css').write_text('/* Généré par port_net.py depuis rendus-v5/src/app-network-{packet,test,route}-pi.html : ne pas éditer à la main. */\n' + css)
print('net.css', len(css), len(out), 'règles')
