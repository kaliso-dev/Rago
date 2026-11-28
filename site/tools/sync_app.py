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
# the ten sections of the app ("Inside the app"): name and tagline of each module, in the app's order, with its icon of the v5 set
ICON = {'network': 'network', 'latency': 'latency', 'gpu': 'graphics', 'windows': 'windows', 'hitreg': 'hitreg', 'minecraft': 'minecraft',
        'rbw': 'rbw', 'gamemode': 'games', 'expert': 'expert', 'restore': 'restore'}
esc = lambda t: t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
def sec_name(sec):
    n = sec.get('name', '')
    return n.get('en', '') if isinstance(n, dict) else n
def tally(mid):  # the count shown on the card: its tweaks, or what the section is for when it has none (Restore)
    n = count(mid)
    return f'<b>{n}</b>tweak{"" if n == 1 else "s"}' if n else '<b>Undo</b>every tweak'
FREE_IDS = set(json.load(open(os.path.join(APP, 'data', 'free.json')))['tweaks'])
def tweaks_of(mid):
    return [t for sec in MOD[mid]['sections'] for t in sec['tweaks'] if 'ref' not in t and t['kind'] == 'tweak']
def extra(mid):  # middle of the card: how many are open in Free, then the real tweak names of the section, in columns
    ts = tweaks_of(mid)
    if not ts: return ''
    names = []
    for t in ts:
        n = t['name']['en']
        if n not in names: names.append(n)
        if len(names) == 8: break
    n_free = sum(1 for t in ts if t['id'] in FREE_IDS)
    head = f'<b>{n_free}</b> of them open in Free, the rest with Premium.' if n_free else 'All of them with Premium.'
    items = ''.join(f'<li>{esc(n)}</li>' for n in names)
    return f'<div class="x-cap-x"><p>{head}</p><ul>{items}</ul></div>'
# site v6 (23/11/2026): one card per section of the app, stacked while you scroll (number, name, tagline, what is inside, its parts, count, icon)
rows = ''.join(f'<article class="x-cap"><span class="x-cap-n" aria-hidden="true">{i:02d}</span><h3>{esc(m["name"]["en"])}</h3>'
               f'<p>{esc(m["tagline"]["en"])}</p>{extra(m["id"])}<ul>{"".join(f"<li>{esc(sec_name(sec))}</li>" for sec in m["sections"] if sec_name(sec))}</ul>'
               f'<span class="x-cap-i" aria-hidden="true"><svg class="i"><use href="#i-{ICON.get(m["id"], "settings")}"/></svg></span>'
               f'<span class="x-cap-c">{tally(m["id"])}</span></article>\n' for i, m in enumerate(cat['modules'], 1))
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
s = re.sub(r'(All |unlocks all )\d+( tweaks|<)', lambda m: m.group(1) + str(total) + m.group(2), s)  # comparison table, links, FAQ
# tweaks open in the free plan: the same count as the Tweaks page (sync_tweaks.py: the free tweaks of its list, Restore tools
# not counted), "68 free tweaks" everywhere on the site and the account page (Sofiene, q75, 28/11/2026)
import runpy
tw = runpy.run_path(os.path.join(HERE, 'sync_tweaks.py'))
n_free = tw['n_free']
s = re.sub(r'(<span class="txt">)\d+ of \d+(</span>)', lambda m: f'{m.group(1)}{n_free} of {total}{m.group(2)}', s)
s = re.sub(r'(<(?:span|b) class="n-free">)\d+', lambda m: m.group(1) + str(n_free), s)
s = re.sub(r'(Free opens )\d+( tweaks)', lambda m: f'{m.group(1)}{n_free}{m.group(2)}', s)
s = re.sub(r'(<i style="width:)[\d.]+(%" id="free-bar">)', lambda m: f'{m.group(1)}{round(100 * n_free / total, 1)}{m.group(2)}', s)
open(p, 'w').write(s)
print('sections', [m['id'] for m in cat['modules']], 'total', total, 'free', n_free, 'heading', heading)
# the Tweaks page (same catalog) was re-synced above by sync_tweaks.py
