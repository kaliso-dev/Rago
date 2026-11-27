# Portage strict des maquettes v5 dans l'app (23/11/2026).
# python3 port_s5.py icons | base | page <maquette> <classe> [<sortie>]
# - icons : app/src/s5/iconData.ts depuis rendus-v5/src/icons.js (+ printicons.js)
# - base  : app/src/s5/base.css = rago5 + round + poster + frame + anim (boutons) + CSS des icônes, images copiées dans app/src/assets/s5/
# - page  : le <style> de la maquette, chaque sélecteur rattaché à la racine de la page (.main de la maquette = racine)
import re, json, sys, shutil
from pathlib import Path
SRC = Path('/mnt/project-files/rago-redesign/rendus-v5/src')
APP = Path('/home/claude/rago/app/src')
OUT = APP / 's5'
ASSETS = APP / 'assets' / 's5'


def copy_urls(css, from_dir):
    """url(img/…) -> copie dans assets/s5 et chemin relatif depuis app/src/s5/(pages/)."""
    def rep(m):
        q, u = m.group(1), m.group(2)
        if u.startswith('data:') or u.startswith('http') or u.startswith('#'): return m.group(0)
        src = (SRC / u).resolve()
        if not src.exists(): print('!! image absente', u); return m.group(0)
        dst = ASSETS / u
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        rel = Path('../' * len(from_dir.relative_to(APP).parts)) / 'assets' / 's5' / u
        return f'url({q}{rel.as_posix()}{q})'
    return re.sub(r'url\((["\']?)([^)"\']+)\1\)', rep, css)


def split_top(css):
    """Règles de premier niveau : [(prélude, corps)] ; les commentaires sont retirés."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        pre = css[i:j].strip()
        d, k = 1, j + 1
        inq = None
        while k < n and d:
            c = css[k]
            if inq:
                if c == inq and css[k - 1] != '\\': inq = None
            elif c in '"\'': inq = c
            elif c == '{': d += 1
            elif c == '}': d -= 1
            k += 1
        out.append((pre, css[j + 1:k - 1]))
        i = k
    return out


def split_sel(pre):
    parts, d, cur = [], 0, ''
    for c in pre:
        if c in '([': d += 1
        if c in ')]': d -= 1
        if c == ',' and d == 0: parts.append(cur.strip()); cur = ''
        else: cur += c
    parts.append(cur.strip())
    return [p for p in parts if p]


HTML = re.compile(r'^(html(?:[.:][\w-]+(?:\([^)]*\))?)*)\s*(body\b)?\s*')


def scope_sel(sel, S):
    m = HTML.match(sel)
    pre, rest = '', sel
    if m and (m.group(1) or m.group(2)):
        pre = m.group(1) or ''
        rest = sel[m.end():].strip()
    if rest == '' or rest in ('.win', '.main'): core = S
    elif re.match(r'^\.(main|win)\b', rest): core = S + rest[5 if rest.startswith('.main') else 4:]
    elif rest.startswith(':root'): return sel
    else: core = f'{S} {rest}'
    return f'{pre} {core}'.strip()


def scope(css, S):
    res = []
    for pre, body in split_top(css):
        if pre.startswith('@media') or pre.startswith('@supports') or pre.startswith('@container'):
            res.append(pre + '{' + scope(body, S) + '}')
        elif pre.startswith('@') or pre.startswith(':root'):
            res.append(pre + '{' + body + '}')
        else:
            res.append(','.join(scope_sel(s, S) for s in split_sel(pre)) + '{' + body.strip() + '}')
    return '\n'.join(res) + '\n'


def page_style(name):
    h = (SRC / f'{name}.html').read_text()
    return '\n'.join(re.findall(r'<style>(.*?)</style>', h, re.S))


def icons():
    s = (SRC / 'icons.js').read_text()
    i = s.find('const P = {'); j = s.find('\n};', i)
    P = dict(re.findall(r"^\s*([\w]+):'(.*?)',?\s*$", s[i:j], re.M))
    G = json.loads(re.search(r'const G = (\{.*?\});\n', s).group(1))
    ALIAS = json.loads(re.search(r'const ALIAS = (\{.*?\});', s).group(1))
    LINE = json.loads(re.search(r'const LINE = new Set\((\[.*?\])\);', s).group(1))
    filt = re.search(r'<defs>(<filter.*?)</defs>', s).group(1).replace('\\"', '"')
    logo = re.search(r'<path d="(M0 0H160[^"]+)"', s).group(1)
    big = json.loads(re.search(r'window\.BIG = (\{.*?\});', (SRC / 'bigicons.js').read_text(), re.S).group(1))
    ts = ('// Généré par port_s5.py depuis les maquettes v5 (rendus-v5/src/icons.js) : ne pas éditer à la main.\n'
          f'export const LINE_ICONS: Record<string, string> = {json.dumps(P, ensure_ascii=False)};\n'
          f'export const PRINT_ICONS: Record<string, [string, string]> = {json.dumps(G, ensure_ascii=False)};\n'
          f'export const ICON_ALIAS: Record<string, string> = {json.dumps(ALIAS)};\n'
          f'export const LINE_ONLY = new Set<string>({json.dumps(LINE)});\n'
          f'export const ICON_FILTERS = {json.dumps(filt)};\n'
          f'export const LOGO_R = {json.dumps(logo)};\n'
          '/** grandes icônes imprimées des écrans vides et des erreurs (bigicons.js) */\n'
          f'export const BIG_ICONS: Record<string, string> = {json.dumps(big, ensure_ascii=False)};\n')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'iconData.ts').write_text(ts)
    print('iconData.ts', len(P), 'line,', len(G), 'printed')


def base():
    parts = []
    for f in ['rago5.css', 'round.css', 'poster.css', 'frame.css']:
        parts.append(f'/* ---- {f} ---- */\n' + (SRC / f).read_text())
    a = (SRC / 'anim.css').read_text()
    keep = [l for l in a.splitlines() if re.match(r'\s*(\.bfx|html\.round \.bfx|\.ring|html\.round \.ring|\.btn \.spin|\.btn \.bl)', l)]
    parts.append('/* ---- anim.css (effets des boutons) ---- */\n' + '\n'.join(keep))
    pi = (SRC / 'printicons.js').read_text()
    st = re.search(r'st\.textContent = "(.*?)";\n', pi, re.S).group(1).replace('\\"', '"')
    parts.append('/* ---- printicons.js ---- */\n' + st.replace('}', '}\n'))
    parts.append('/* ---- icons.js ---- */\nsvg.i.pi{fill:none;stroke:none!important;overflow:visible}\nsvg.pi use.pb{color:var(--pb,#FF3B30)}\nsvg.pi use.pf{color:var(--pf,#ECE9E2)}\n')
    css = '/* Généré par port_s5.py depuis les maquettes v5 (rendus-v5/src) : ne pas éditer à la main, retoucher dans s5/app.css. */\n' + '\n'.join(parts)
    # .scrim de la maquette (voile du rail replié) retiré : dans l'app, .scrim est le fond des fenêtres (Modal.tsx) ;
    # le garder caché rendait toutes les fenêtres invisibles (bug trouvé le 23/11)
    css = css.replace('.side .pcmini,.side .tog,.scrim{display:none}', "/* .scrim de la maquette (voile du rail replié) retiré : dans l'app, .scrim est le fond des fenêtres (Modal.tsx) */\n.side .pcmini,.side .tog{display:none}")
    css = copy_urls(css, OUT)
    (OUT / 'base.css').write_text(css)
    print('base.css', len(css))


def page(name, cls, out=None):
    css = scope(page_style(name), '.' + cls)
    d = OUT / 'pages'; d.mkdir(parents=True, exist_ok=True)
    css = copy_urls(css, d)
    p = d / f'{out or cls}.css'
    p.write_text(f'/* Généré par port_s5.py depuis rendus-v5/src/{name}.html : ne pas éditer à la main. */\n' + css)
    print(p, len(css))


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'icons': icons()
    elif cmd == 'base': base()
    elif cmd == 'page': page(*sys.argv[2:])
