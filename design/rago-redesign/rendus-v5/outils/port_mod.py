# Portage de rendus-v5/src/module.css (pages module, onglet Tweaks de Network, Outils) dans app/src/s5/pages/module.css.
# Chaque sélecteur est rattaché à .pg-mod (la .main de la maquette) ; la barre pour appliquer (.apply, .ap) est hors de
# la page, sous .win. Retirés : .main{padding-bottom} (réglé dans app.css), #fit, #nopop, le faux curseur (.ptr), html.rail.
import re, sys
sys.path.insert(0, '.')
from port_s5 import SRC, OUT, split_top, split_sel, scope_sel, copy_urls

S = '.pg-mod'
DROP = re.compile(r'html\.(fit|nopop|rail)\b|\.ptr\b')
BAR = re.compile(r'^(html(?:\.[\w-]+)*\s+)?\.(apply|ap)\b')

def sel(s):
    if DROP.search(s): return None
    m = BAR.match(s)
    if m: return (m.group(1) or '') + '.win ' + s[len(m.group(1) or ''):]
    if re.fullmatch(r'\.main', s): return None
    return scope_sel(s, S)

def scope(css):
    out = []
    for pre, body in split_top(css):
        if pre.startswith('@'):
            out.append(pre + '{' + scope(body) + '}'); continue
        ss = [x for x in (sel(s) for s in split_sel(pre)) if x]
        if ss: out.append(','.join(ss) + '{' + body.strip() + '}')
    return '\n'.join(out) + '\n'

css = scope((SRC / 'module.css').read_text())
d = OUT / 'pages'
css = copy_urls(css, d)
(d / 'module.css').write_text('/* Généré par port_mod.py depuis rendus-v5/src/module.css : ne pas éditer à la main. */\n' + css)
print(len(css))
