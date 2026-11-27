# Portage de rendus-v5/src/pages.css (pages Souris, Paramètres, Partage et support : app-mouse.html, app-settings*.html, app-share*.html) dans app/src/s5/pages/pages.css.
# La page se pose sur module.css (déjà porté sous .pg-mod) : chaque sélecteur est rattaché à .pg-pages.
# Retiré : .main{padding-bottom} (réglé dans s5/app.css).
import re, sys
sys.path.insert(0, '.')
from port_s5 import SRC, OUT, split_top, split_sel, scope_sel, copy_urls

S = '.pg-pages'

def sel(s):
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

css = scope((SRC / 'pages.css').read_text())
d = OUT / 'pages'
css = copy_urls(css, d)
(d / 'pages.css').write_text('/* Généré par port_pages.py depuis rendus-v5/src/pages.css : ne pas éditer à la main. */\n' + css)
print(len(css))
