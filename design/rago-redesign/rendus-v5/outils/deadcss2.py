# DEAD=a,b python3 deadcss2.py (classes mortes données) ou python3 deadcss.py <css> <from:to>... [--prefix a,b] : retire les règles dont un sélecteur vise une classe absente du code
import re, sys, pathlib
src = pathlib.Path('/home/claude/rago/app/src')
code = "\n".join(p.read_text() for p in list(src.rglob('*.tsx')) + list(src.rglob('*.ts')))
import os
DEAD=set(os.environ.get('DEAD','').split(','))
def used(c):
    if DEAD != {''}: return c not in DEAD
    return re.search(r'(?<![A-Za-z0-9_-])' + re.escape(c) + r'(?![A-Za-z0-9_])', code) is not None
css_path = pathlib.Path(sys.argv[1])
args = [a for a in sys.argv[2:] if not a.startswith('--')]
prefixes = None
if '--prefix' in sys.argv:
    prefixes = sys.argv[sys.argv.index('--prefix') + 1].split(',')
    args = [a for a in args if a != sys.argv[sys.argv.index('--prefix') + 1]]
lines = css_path.read_text().split('\n')
ranges = [tuple(map(int, a.split(':'))) for a in args] or [(1, len(lines))]
text = '\n'.join(lines)
# position de début de chaque ligne
starts = [0]
for l in lines: starts.append(starts[-1] + len(l) + 1)
def in_ranges(pos):
    ln = next(i for i in range(len(starts)) if starts[i] > pos)
    return any(a <= ln <= b for a, b in ranges)
out = []; i = 0; removed = 0; kept_partial = 0
def dead_sel(sel):
    cls = re.findall(r'\.([A-Za-z_][A-Za-z0-9_-]*)', sel)
    if prefixes is not None:
        cls = [c for c in cls if any(c.startswith(p) for p in prefixes)]
    return any(not used(c) for c in cls)
def process(block, base):
    global removed, kept_partial
    res = []; j = 0
    while j < len(block):
        m = re.compile(r'[^{}]*\{').match(block, j)
        if not m:
            res.append(block[j:]); break
        head = m.group(0)[:-1]
        # fin du bloc
        depth = 1; k = m.end()
        while depth:
            if block[k] == '{': depth += 1
            elif block[k] == '}': depth -= 1
            k += 1
        body = block[m.end():k-1]
        hs = head.strip()
        lead = head[:len(head) - len(head.lstrip())]
        # commentaires devant le sélecteur
        comment = ''
        cm = re.match(r'(\s*(?:/\*.*?\*/\s*)*)(.*)', head, re.S)
        comment, sel = cm.group(1), cm.group(2)
        if sel.strip().startswith('@media') or sel.strip().startswith('@supports'):
            inner = process(body, base + m.end())
            if inner.strip() == '':
                res.append(comment.rstrip() + '\n' if comment.strip() else '')
            else:
                res.append(head + '{' + inner + '}')
        elif sel.strip().startswith('@') or not in_ranges(base + j + len(comment)):
            res.append(block[j:k])
        else:
            sels = [s for s in sel.split(',')]
            alive = [s for s in sels if not dead_sel(s)]
            if not alive:
                removed += 1
                res.append(comment if comment.strip() else '')
            elif len(alive) < len(sels):
                kept_partial += 1
                res.append(comment + ','.join(alive).strip() + ' {' + body + '}')
            else:
                res.append(block[j:k])
        j = k
    return ''.join(res)
new = process(text, 0)
new = re.sub(r'\n{3,}', '\n\n', new)
css_path.write_text(new)
print(f'{css_path.name}: {removed} règles retirées, {kept_partial} raccourcies, {len(text.splitlines())} -> {len(new.splitlines())} lignes')
