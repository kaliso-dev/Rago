# Portage de rendus-v5/src/analysis.css (page « Analyze my PC » : app-analysis-{start,running,results,allfine,after}.html)
# dans app/src/s5/pages/analysis.css. La page se pose sur module.css (déjà porté sous .pg-mod) : chaque sélecteur
# est rattaché à .pg-an. Retiré : .main{padding-bottom} (réglé dans s5/app.css).
import re, sys
sys.path.insert(0, '.')
from port_s5 import SRC, OUT, split_top, split_sel, scope_sel, copy_urls

S = '.pg-an'

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

css = scope((SRC / 'analysis.css').read_text())
d = OUT / 'pages'
css = copy_urls(css, d)
(d / 'analysis.css').write_text('/* Généré par port_an.py depuis rendus-v5/src/analysis.css : ne pas éditer à la main. */\n' + css)
print(len(css))
