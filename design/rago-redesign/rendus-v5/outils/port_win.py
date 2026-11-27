# Portage des fenêtres de l'app (maquettes app-confirm-*, app-run-*, app-cancel-*, app-signout, app-upsell-*,
# app-gate-*, app-review-*, app-search, app-toasts) dans app/src/s5/pages/win.css, sous .w5 (racine de chaque fenêtre).
# Les maquettes chargent rago5 (déjà dans base.css), module.css, pages.css, round, poster et win.css : on reprend
# win.css en entier, et de module.css et pages.css seulement les règles dont toutes les classes servent dans ces
# maquettes. Retirés : le cadre de la maquette (.win.ov, image .under floutée : l'app floute la vraie page dessous)
# et les marges du bas de .main.
import re, sys, glob
sys.path.insert(0, '.')
from port_s5 import SRC, OUT, split_top, split_sel, scope_sel, copy_urls

S = '.w5'
USED = set()
for f in glob.glob(str(SRC / 'app-*.html')):
    if not re.search(r'app-(cancel|confirm|gate|review|run|search|signout|toasts|upsell)', f): continue
    h = open(f).read()
    for m in re.findall(r'class="([^"]*)"', h[h.find('<body'):]): USED |= set(m.split())
USED |= {'hover', 'act', 'dis', 'off', 'poster', 'round'}

def drop(s):
    return bool(re.match(r'(html\S*\s+)?\.(win|main|under)\b', s)) or re.match(r'\.runw \.under', s)

def keep_part(s, strict):
    if drop(s): return False
    if not strict: return True
    cls = set(re.findall(r'\.([A-Za-z_][\w-]*)', s))
    return cls <= USED and cls != set()

def scope(css, strict):
    out = []
    for pre, body in split_top(css):
        if pre.startswith('@media') or pre.startswith('@supports'):
            inner = scope(body, strict)
            if inner.strip(): out.append(pre + '{' + inner + '}')
            continue
        if pre.startswith('@'):
            if not strict: out.append(pre + '{' + body + '}')
            continue
        ss = [scope_sel(s, S) for s in split_sel(pre) if keep_part(s, strict)]
        if ss: out.append(','.join(ss) + '{' + body.strip() + '}')
    return '\n'.join(out) + '\n'

css = ''
for name, strict in (('module.css', True), ('pages.css', True), ('win.css', False)):
    css += f'/* ---- {name} */\n' + scope((SRC / name).read_text(), strict)
d = OUT / 'pages'
css = copy_urls(css, d)
(d / 'win.css').write_text('/* Généré par port_win.py depuis rendus-v5/src/module.css, pages.css et win.css : ne pas éditer à la main. */\n' + css)
print(len(css), 'octets,', css.count('{'), 'règles')
