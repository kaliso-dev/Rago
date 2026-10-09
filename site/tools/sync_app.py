"""Re-sync the app preview in src/page.html with the app (app/ in the repo, app/rago-hub/ in the project folder) (catalog.json and i18n.ts are the truth). Run after the app changes its texts, then build.py."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
# the app lives in app/ in the GitHub repo and in app/rago-hub/ in the project folder
APP = next(d for d in (os.path.join(HERE, '..', '..', 'app', 'src'), os.path.join(HERE, '..', '..', 'app', 'rago-hub', 'src')) if os.path.isfile(os.path.join(d, 'data', 'catalog.json')))
p = os.path.join(HERE, '..', 'src', 'page.html')
s = open(p).read()
cat = json.load(open(os.path.join(APP, 'data', 'catalog.json')))
SESSION = {"game_mode", "rbw_mode", "win_gamemode"}  # store.tsx SESSION_TOGGLES
T, MOD, SEC = {}, {}, {}
for m in cat['modules']:
    MOD[m['id']] = m
    for sec in m['sections']:
        SEC[(m['id'], sec['id'])] = sec
        for t in sec['tweaks']:
            if 'ref' not in t: T[t['id']] = t
def flags(t):
    return ('a' if t['risk'] == 'advanced' else '') + ('r' if t['reboot'] else '') + ('x' if t['kind'] == 'action' else '') + ('s' if t['id'] in SESSION else '')
PICK = {'network': ['ping_hitreg', 'net_nagle', 'net_powersave', 'net_restart'], 'latency': ['kbm_accel', 'cpu_parking', 'pri_mmcss'],
 'gpu': ['gpu_nvidia', 'amd_power', 'gpu_general'], 'windows': ['win_gamemode', 'win_gamedvr', 'cln_temp'],
 'hitreg': ['in_mouse', 'in_queue', 'hitreg_suite'], 'minecraft': ['mc_optifine', 'pri_game', 'net_profile', 'cln_temp'],
 'rbw': ['rbw_mode'], 'gamemode': ['game_mode'], 'expert': ['exp_io', 'exp_kernel', 'exp_startup'], 'restore': ['rst_point', 'rst_open', 'rst_network', 'rst_queue']}
EX = {k: [[T[i]['name']['en'], T[i]['desc']['en'], flags(T[i])] for i in v] for k, v in PICK.items()}
a = s.index('  const EX = {'); b = s.index('\n', a)
s = s[:a] + '  const EX = ' + json.dumps(EX, ensure_ascii=False) + ';' + s[b:]
# module taglines and tweak counts (the app counts kind 'tweak' only)
def count(mid):
    return sum(1 for sec in MOD[mid]['sections'] for t in sec['tweaks'] if 'ref' not in t and t['kind'] == 'tweak')
def modrow(m):
    mid = m.group(1)
    return f'["{mid}","{m.group(2)}",{json.dumps(MOD[mid]["tagline"]["en"], ensure_ascii=False)},{count(mid)}]'
a = s.index('const MODS = ['); b = s.index('];', a)
s = s[:a] + re.sub(r'\["(\w+)","([^"]+)","(?:[^"\\]|\\.)*",\d+\]', modrow, s[a:b]) + s[b:]
# hero preview: section counts and row texts from the catalog
lat = MOD['latency']
def sec_count(sid):
    return sum(1 for t in SEC[('latency', sid)]['tweaks'] if 'ref' not in t and t['kind'] == 'tweak')
s = re.sub(r'(<div class="stitle"><span>Mouse and keyboard</span><span class="mono">)\d+', lambda m: m.group(1) + str(sec_count('input')), s)
s = re.sub(r'(<div class="stitle"><span>Power</span><span class="mono">)\d+', lambda m: m.group(1) + str(sec_count('power')), s)
s = re.sub(r'<p>Timers, priorities[^<]*</p>', '<p>' + lat['tagline']['en'] + '</p>', s)
def hero_row(m):
    n = m.group(1); t = next(x for x in T.values() if x['name']['en'] == n)
    return f'row({json.dumps(n)},{json.dumps(t["desc"]["en"], ensure_ascii=False)},'
s = re.sub(r'row\("([^"]+)","(?:[^"\\]|\\.)*",', hero_row, s)
# end-of-run sentence: same as the app (i18n.ts run.rebootNeeded)
i18n = open(os.path.join(APP, 'lib', 'i18n.ts')).read(); i18n = i18n[i18n.index('const en'):]
reboot = re.search(r'"run\.rebootNeeded":\s*"([^"]+)"', i18n).group(1)
s = re.sub(r'<br>(?:Restart|Redémarre)[^`]*`', lambda m: '<br>' + reboot + '`', s)
# total tweak count (tweaks and one-time actions, like the app) and the hub preview counter
total = len(T)
s = re.sub(r'(<h2>)\d+( tweaks\. One clear app\.</h2>)', lambda m: m.group(1) + str(total) + m.group(2), s)
s = re.sub(r'(All |9 of |unlocks all )\d+( tweaks|<)', lambda m: m.group(1) + str(total) + m.group(2), s)
s = re.sub(r'(id="msel">0 of )\d+', lambda m: m.group(1) + str(count('latency')), s)
open(p, 'w').write(s)
print('MODS', re.findall(r'\["(\w+)","[^"]+","([^"]+)",(\d+)\]', s[s.index('const MODS'):s.index('];', s.index('const MODS'))]))
print('total', total, 'reboot', reboot, 'power', sec_count('power'), 'input', sec_count('input'))
