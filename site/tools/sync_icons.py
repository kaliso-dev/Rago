"""Writes the icon sprite of each page of src/ (design v5, 22/11/2026): every <use href="#i-NAME"> of the page gets its
<symbol id="i-NAME">, between the <!-- icons --> and <!-- /icons --> marks. Run by build.py; run it by hand after adding
an icon to a source page so its preview shows it too.

Icons come from tools/icons_v5.json (the Rago icon set of the v5 design, the same as the app): "printed" icons (filled
shapes, rough edges, a red copy shifted behind, leaning -12°) for everything with a meaning, line icons for interface signs
(arrows, chevrons, cross, menu). Colours of printed icons: CSS variables --pf (face) and --pb (back), set in v5.css on the <svg class="i"> (inline styles
inside the symbol: page CSS doesn't reach into a <use> copy, CSS variables do)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'icons_v5.json')))
P, G, ALIAS, LINE = D['P'], D['G'], D['ALIAS'], set(D['LINE'])
# the rough-edge filters, once per page
DISCORD = ("M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.007.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
           "M8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418z")
FILTERS = re.sub(r'^<svg[^>]*><defs>|</defs></svg>$', '', D['FILTERS'])


def symbol(n):
    if n == 'logo':  # the R of Rago
        return f'<symbol id="i-logo" viewBox="0 0 164 180">{D["R"]}</symbol>'
    if n == 'discord':  # the Discord logo, filled with the text colour
        return f'<symbol id="i-discord" viewBox="0 0 24 24"><path fill="currentColor" d="{DISCORD}"/></symbol>'
    k = ALIAS.get(n, n)
    if n in LINE or k not in G:
        if n not in P:
            sys.exit(f'sync_icons: no icon named {n!r} (see tools/icons_v5.json)')
        return f'<symbol id="i-{n}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{P[n]}</g></symbol>'
    sh, cut = G[k]
    return (f'<symbol id="i-{n}" viewBox="0 0 24 24" overflow="visible"><defs><mask id="im-{n}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">'
            f'<rect x="-4" y="-4" width="32" height="32" fill="#fff"/>{cut}</mask><g id="ig-{n}" mask="url(#im-{n})">{sh}</g></defs>'
            f'<g transform="translate(2.55 0) skewX(-12)"><use href="#ig-{n}" style="color:var(--pb);filter:url(#rgh-back-s)" transform="translate(1.3 1.5)"/>'
            f'<use href="#ig-{n}" style="color:var(--pf);filter:url(#rgh-face-s)"/></g></symbol>')


def sync(path):
    s = open(path).read()
    a, b = '<!-- icons -->', '<!-- /icons -->'
    if a not in s:
        return
    names = sorted(set(re.findall(r'href="#i-([a-z0-9]+)"', s)))
    sprite = ('<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>' + FILTERS + '</defs>\n'
              + '\n'.join(symbol(n) for n in names) + '\n</svg>')
    i, j = s.index(a) + len(a), s.index(b)
    s2 = s[:i] + '\n' + sprite + '\n' + s[j:]
    if s2 != s:
        open(path, 'w').write(s2)
    print(f'{os.path.basename(path)}: {len(names)} icons')


if __name__ == '__main__':
    for f in sys.argv[1:] or sorted(os.path.join(HERE, '..', 'src', x) for x in os.listdir(os.path.join(HERE, '..', 'src')) if x.endswith('.html')):
        sync(f)
