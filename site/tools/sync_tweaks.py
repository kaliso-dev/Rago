"""Writes the tweak list of src/tweaks.html (the Tweaks page) from the app's catalog (catalog.json, free.json: the truth
for names, sections, badges and what the app says) and from src/tweaks-copy.json (the page's own words for each tweak:
summary, about, helps, plus undo when turning the switch off doesn't put everything back and restart when
the change needs one although the catalog says not). Run after the app changes its tweaks (sync_app.py runs it too), then build.py.

Same count as the app and the home page: tweaks and one-time actions, twins (same script under two names) once.
A tweak without its words in tweaks-copy.json still gets a card, with the app's description, and a warning here."""
import html, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
APP = next(d for d in (os.path.join(HERE, '..', '..', 'app', 'src'), os.path.join(HERE, '..', '..', 'app', 'rago-hub', 'src')) if os.path.isfile(os.path.join(d, 'data', 'catalog.json')))
SRC = os.path.join(HERE, '..', 'src')
P = os.path.join(SRC, 'tweaks.html')
s = open(P).read()
cat = json.load(open(os.path.join(APP, 'data', 'catalog.json')))
FREE = set(json.load(open(os.path.join(APP, 'data', 'free.json')))['tweaks'])
# Premium tweaks whose undo option stays open without a license (free.json « reverts »: RBW Mod On, Rago game mode Off)
FREE_REVERTS = set(json.load(open(os.path.join(APP, 'data', 'free.json'))).get('reverts', []))
COPY = json.load(open(os.path.join(SRC, 'tweaks-copy.json')))
SESSION = {"game_mode", "rbw_mode", "win_gamemode"}  # store.tsx SESSION_TOGGLES: turned on before playing, off after
# Same groups as the app's sidebar (and the home page preview)
GROUPS = [("Optimize", ["network", "latency", "gpu", "windows"]), ("In game", ["hitreg", "minecraft", "rbw", "gamemode"]), ("Advanced", ["expert", "restore"])]
GOALS = ["FPS", "Smoothness", "Input lag", "Connection", "Hitreg", "Background", "Privacy", "Cleanup", "Recovery"]
NEEDS = {"gpu:nvidia": "An NVIDIA graphics card", "gpu:amd": "An AMD graphics card", "gpu:intel": "Intel graphics",
         "cpu:intel": "An Intel CPU", "cpu:amd": "An AMD CPU"}
e = lambda t: html.escape(str(t), quote=True)

# Module icons: the Lucide set of the home page preview (page.html, const ICON)
page = open(os.path.join(SRC, 'page.html')).read()
ICON = dict(re.findall(r"^\s+(\w+):'([^']+)'", page[page.index('const ICON = {'):page.index('};', page.index('const ICON = {'))], re.M))

presets = {}
for p in cat['presets']:
    for x in p['tweaks']:
        presets.setdefault(x.split(':')[0], []).append(p['name']['en'])

mods, seen, items, alias, twin_ids = [], {}, [], {}, {}
for m in cat['modules']:
    mods.append(m)
    for sec in m['sections']:
        for t in sec['tweaks']:
            if 'ref' in t:
                continue
            k = t.get('twin') or t['id']
            if k in seen:  # a twin: same tweak under another name, counted once (catalog.ts distinctKey)
                alias.setdefault(k, []).append(f"{t['name']['en']} ({m['name']['en']})")
                twin_ids.setdefault(k, []).append(t['id'])
                continue
            seen[k] = True
            items.append((m, sec, t, k))

missing = [k for _, _, _, k in items if k not in COPY]
for k in missing:
    print('warning: no words in tweaks-copy.json for', k, '(the app description is used)')
unused = sorted(set(COPY) - {k for _, _, _, k in items})
for k in unused:
    print('note: tweaks-copy.json has words for', k, 'which is no longer in the catalog')


def restart(t):
    vs = [v.get('reboot') for v in t.get('variants', []) if v.get('reboot') is not None and v.get('reboot') != t['reboot']]
    if vs:
        return 'v', 'Depends on the option'
    return ('1', 'Needed') if t['reboot'] else ('0', 'Not needed')


def card(m, sec, t, k):
    c = COPY.get(k) or {"summary": t['desc']['en'], "about": t['desc']['en'], "helps": []}
    free = t['id'] in FREE
    rb, rb_txt = restart(t)
    if c.get('restart'):  # the catalog says no restart, but the change only applies after one (checked against the script)
        rb, rb_txt = ('v' if 'some' in c['restart'] else '1'), c['restart']
    kind = 'session' if t['id'] in SESSION else t['kind']
    needs = [NEEDS[r] for r in t['requires'] + ([sec['requires']] if sec.get('requires') else []) if r in NEEDS]
    badges = ''
    if t['risk'] == 'advanced':
        badges += '<span class="bdg warn">Advanced</span>'
    if rb == '1':
        badges += '<span class="bdg"><svg aria-hidden="true"><use href="#i-restart"/></svg>Restart</span>'
    if kind == 'action':
        badges += '<span class="bdg">Runs once</span>'
    elif kind == 'session':
        badges += '<span class="bdg">On / Off</span>'
    badges += ''.join(f'<span class="bdg tag">{e(h)}</span>' for h in c['helps'])
    how = {'tweak': ('Switch', 'Turn it off and your previous settings come back.'),
           'action': ('One-time action', 'It runs once and has no off switch.'),
           'session': ('On and off', 'Turn it on before playing, off after.')}[kind]
    if c.get('undo') and kind == 'tweak':  # what turning it off can't give back (checked against the script)
        how = (how[0], c['undo'])
    open_v = next((v['label']['en'] for v in t.get('variants', []) if v.get('revert')), None) if t['id'] in FREE_REVERTS else None
    spec = [
        ('Plan', 'Free' if free else 'Premium', 'Open in the free version' if free else f'{open_v} is open in the free version' if open_v else 'Unlocked with Premium', ''),
        ('Level', 'Advanced' if t['risk'] == 'advanced' else 'Safe', 'For players who know what they change' if t['risk'] == 'advanced' else 'Fine for every PC', ''),
        ('In the app', how[0], how[1], ''),
        ('Restart', rb_txt, '', ''),
        ('Restore point', 'Recommended' if t.get('restore') else 'Optional', 'Ticked for you before it runs' if t.get('restore') else 'Offered, not required', ''),
        ('Works on', needs[0] if len(needs) == 1 else ', '.join(needs) if needs else 'Any Windows 10 or 11 PC', '', ''),
    ]
    vs = t.get('variants', [])
    if vs:
        opts = ''.join(f'<span>{e(v["label"]["en"])}</span>' for v in vs)
        spec.append((f'{len(vs)} options', '', '', f'<div class="opts">{opts}</div>'))
    if presets.get(t['id']):
        spec.append(('In presets', ', '.join(presets[t['id']]), '', ''))
    if alias.get(k):
        spec.append(('Also in the app as', ', '.join(alias[k]), '', ''))
    wide = lambda lbl, extra: ' class="w"' if extra or lbl in ("In presets", "Also in the app as") else ''
    dl = ''.join(f'<div{wide(lbl, extra)}><dt>{e(lbl)}</dt><dd>{e(v)}{f"<small>{e(sm)}</small>" if sm else ""}{extra}</dd></div>' for lbl, v, sm, extra in spec)
    notes = ''
    if t.get('gain'):
        notes += f'<div class="note ok"><span class="ni"><svg aria-hidden="true"><use href="#i-gauge"/></svg></span><b>What to expect</b><p>{e(t["gain"]["en"])}</p></div>'
    if t.get('cons') and t['cons']['en'].strip() != 'No known drawback.':
        notes += f'<div class="note warn"><span class="ni"><svg aria-hidden="true"><use href="#i-alert"/></svg></span><b>Good to know</b><p>{e(t["cons"]["en"])}</p></div>'
    else:
        notes += '<div class="note ok"><span class="ni"><svg aria-hidden="true"><use href="#i-check"/></svg></span><b>Good to know</b><p>No known drawback.</p></div>'
    notes += f'<div class="note app"><span class="ni"><svg aria-hidden="true"><use href="#i-app"/></svg></span><b>How the app describes it</b><p>{e(t["desc"]["en"])}</p></div>'
    ids = ' '.join([t['id']] + twin_ids.get(k, []))
    data = (f' data-m="{m["id"]}" data-mn="{e(m["name"]["en"])}" data-h="{e("|".join(c["helps"]))}" data-p="{"free" if free else "pro"}"'
            f' data-r="{t["risk"]}" data-b="{rb}"' + (f' data-a="{e(" ".join(alias[k]))}"' if alias.get(k) else '') + (f' data-ids="{ids}"' if ' ' in ids else ''))
    plan = '<span class="pl free">Free</span>' if free else '<span class="pl pro"><svg aria-hidden="true"><use href="#i-lock"/></svg>Premium</span>'
    return (f'<details class="tc" id="{k}"{data}><summary><span class="tc-top"><span class="tc-sec">{e(sec["name"]["en"])}</span>{plan}</span>'
            f'<span class="tc-n">{e(t["name"]["en"])}</span><span class="tc-s">{e(c["summary"])}</span><span class="tc-b">{badges}</span>'
            f'<svg class="tc-go" aria-hidden="true"><use href="#i-arrow"/></svg></summary>'
            f'<div class="tc-d"><p class="ab">{e(c["about"])}</p><dl class="spec">{dl}</dl>{notes}</div></details>')


by_mod = {}
for it in items:
    by_mod.setdefault(it[0]['id'], []).append(it)
MOD = {m['id']: m for m in mods}
total = len(items)
n_free = sum(1 for _, _, t, _ in items if t['id'] in FREE)
mod_ids = [mid for _, g in GROUPS for mid in g if mid in by_mod] + [m['id'] for m in mods if m['id'] in by_mod and all(m['id'] not in g for _, g in GROUPS)]

icons = '\n'.join(f'  <symbol id="m-{mid}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{ICON[mid]}</g></symbol>' for mid in mod_ids)
mb = lambda mid, label, n, icon: f'<button class="mb" type="button" data-m="{mid}" aria-pressed="false"><svg aria-hidden="true"><use href="#{icon}"/></svg><span>{e(label)}</span><span class="c">{n}</span></button>'
nav = '<div class="mods" role="group" aria-label="Sections">' + mb('', 'All tweaks', total, 'm-dashboard')
for g, ids in GROUPS:
    nav += f'<div class="ngl">{g}</div>' + ''.join(mb(mid, MOD[mid]['name']['en'], len(by_mod[mid]), f'm-{mid}') for mid in ids if mid in by_mod)
nav += '</div>'
icons = f'  <symbol id="m-dashboard" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{ICON["dashboard"]}</g></symbol>\n' + icons
chips = '<div class="chips" role="group" aria-label="Sections">' + mb('', 'All', total, 'm-dashboard') + ''.join(mb(mid, MOD[mid]['name']['en'], len(by_mod[mid]), f'm-{mid}') for mid in mod_ids) + '</div>'
gcount = {g: sum(1 for k in COPY if k in seen and g in COPY[k]['helps']) for g in GOALS}
goals = '<div class="goals" role="group" aria-labelledby="goals-l">' + ''.join(f'<button class="goal" type="button" data-h="{e(g)}" aria-pressed="false">{e(g)}<span class="c">{gcount[g]}</span></button>' for g in GOALS if gcount[g]) + '</div>'
lst = ''
for mid in mod_ids:
    m = MOD[mid]
    lst += (f'<section class="grp" id="s-{mid}" data-m="{mid}" aria-labelledby="h-{mid}"><div class="grp-h"><span class="ic"><svg aria-hidden="true"><use href="#m-{mid}"/></svg></span>'
            f'<h3 id="h-{mid}">{e(m["name"]["en"])}</h3><p>{e(m["tagline"]["en"])}</p><span class="c">{len(by_mod[mid])}</span></div>'
            f'<div class="cards">' + ''.join(card(*it) for it in by_mod[mid]) + '</div></section>\n')


def put(name, body):
    global s
    a, b = f'<!-- tw:{name} -->', f'<!-- /tw:{name} -->'
    i, j = s.index(a) + len(a), s.index(b)
    s = s[:i] + '\n' + body + '\n' + s[j:]


put('icons', icons)
put('nav', nav)
put('goals', goals)
put('chips', chips)
put('list', lst.rstrip('\n'))
# the numbers written in the page's text, so they're right without JavaScript
for cls, n in (('n-all', total), ('n-free', n_free), ('n-mods', len(mod_ids)), ('n-presets', len(cat['presets']))):
    s = re.sub(r'(class="' + cls + r'">)\d+(<)', lambda mm: mm.group(1) + str(n) + mm.group(2), s)
s = re.sub(r'<title>All \d+ tweaks', f'<title>All {total} tweaks', s)
s = re.sub(r'(explore all |all |Search )\d+( tweaks)', lambda mm: mm.group(1) + str(total) + mm.group(2), s)
open(P, 'w').write(s)
print(f'tweaks.html: {total} tweaks, {n_free} free, {len(mod_ids)} sections')
