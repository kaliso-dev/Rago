"""Re-sync the home page (src/page.html) with the app (app/ in the repo, app/rago-hub/ in the project folder): the ten sections of
the app with their taglines, the tweak counts and the free count (catalog.json and free.json are the truth). Run after the app changes its texts, then build.py.
Also re-syncs the tweak list of the Tweaks page (src/tweaks.html), with sync_tweaks.py."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
# the app lives in app/ in the GitHub repo and in app/rago-hub/ in the project folder
APP = next(d for d in (os.path.join(HERE, '..', '..', 'app', 'src'), os.path.join(HERE, '..', '..', 'app', 'rago-hub', 'src')) if os.path.isfile(os.path.join(d, 'data', 'catalog.json')))
p = os.path.join(HERE, '..', 'src', 'page.html')
s = open(p).read()
cat = json.load(open(os.path.join(APP, 'data', 'catalog.json')))
T, MOD, SEC = {}, {}, {}
for m in cat['modules']:
    MOD[m['id']] = m
    for sec in m['sections']:
        SEC[(m['id'], sec['id'])] = sec
        for t in sec['tweaks']:
            if 'ref' not in t: T[t['id']] = t
def count(mid):  # the app counts kind 'tweak' only
    return sum(1 for sec in MOD[mid]['sections'] for t in sec['tweaks'] if 'ref' not in t and t['kind'] == 'tweak')
# the ten sections of the "Inside the app" card: name and tagline of each module, in the app's order, with its icon of the v5 set
ICON = {'network': 'network', 'latency': 'latency', 'gpu': 'graphics', 'windows': 'windows', 'hitreg': 'hitreg', 'minecraft': 'minecraft',
        'rbw': 'rbw', 'gamemode': 'games', 'expert': 'expert', 'restore': 'restore'}
esc = lambda t: t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
rows = ''.join(f'<div class="s-m{" on" if m["id"] == "latency" else ""}"><svg class="i" aria-hidden="true"><use href="#i-{ICON.get(m["id"], "settings")}"/></svg>'
               f'<div><b>{esc(m["name"]["en"])}</b><span>{esc(m["tagline"]["en"])}</span></div></div>\n' for m in cat['modules'])
a, b = s.index('<!-- mods -->') + len('<!-- mods -->'), s.index('<!-- /mods -->')
s = s[:a] + '\n' + rows + s[b:]
# total tweak count, like the app (catalog.ts totalTweaks): tweaks and one-time actions, twins (same script
# under two names or in two modules, field `twin`) counted once, sections that only point at another module's tweak ('ref') skipped
total = len({t.get('twin') or i for i, t in T.items()})
# heading: "Nearly 200 tweaks" while the count sits 1 to 3 under a round ten (decided with Sofiene, 9 Oct.),
# the exact count otherwise; the counters (class n-all, All N, F of N) always show the exact count
ten = -(-total // 10) * 10
heading = f'Nearly {ten} tweaks' if 0 < ten - total <= 3 else f'{total} tweaks'
s = re.sub(r'(<h2 class="s-h2" id="feat-h">)(?:Nearly )?\d+ tweaks\.', lambda m: f'{m.group(1)}{heading}.', s)
s = re.sub(r'(?:Nearly )?\d+ tweaks, free to start', f'{heading}, free to start', s)  # meta description
s = re.sub(r'(<span class="n-all">)\d+', lambda m: m.group(1) + str(total), s)
s = re.sub(r'(<b class="n-all">)\d+', lambda m: m.group(1) + str(total), s)
s = re.sub(r'(<span>)\d+( tweaks</span>)', lambda m: m.group(1) + str(total) + m.group(2), s)  # hero ticker
s = re.sub(r'(All )\d+(<)', lambda m: m.group(1) + str(total) + m.group(2), s)  # comparison table
# tweaks open in the free plan, like the app (store.tsx FREE.size: the list of free.json, Restore tools included)
n_free = len(json.load(open(os.path.join(APP, 'data', 'free.json')))['tweaks'])
s = re.sub(r'(<span class="txt">)\d+ of \d+(</span>)', lambda m: f'{m.group(1)}{n_free} of {total}{m.group(2)}', s)
s = re.sub(r'(<(?:span|b) class="n-free">)\d+', lambda m: m.group(1) + str(n_free), s)
s = re.sub(r'(Free opens )\d+( tweaks)', lambda m: f'{m.group(1)}{n_free}{m.group(2)}', s)
s = re.sub(r'(<i style="width:)[\d.]+(%" id="free-bar">)', lambda m: f'{m.group(1)}{round(100 * n_free / total, 1)}{m.group(2)}', s)
open(p, 'w').write(s)
print('sections', [m['id'] for m in cat['modules']], 'total', total, 'free', n_free, 'heading', heading)
# the Tweaks page: same catalog
import runpy
runpy.run_path(os.path.join(HERE, 'sync_tweaks.py'))
