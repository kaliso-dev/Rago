# Génère les maquettes v5 de "Analyze my PC" : départ, en cours, résultats (plan gratuit), avant/après (Premium).
# Textes et normes : ceux de l'app (i18n.ts, lib/analysis.ts). Valeurs : le PC de démonstration (Ryzen, Hypixel à 96 ms).
import html
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/src')
def esc(s): return html.escape(s, quote=True)

STEPS = [('Hardware', 'Processor, graphics card, memory, screen'), ('Windows and apps', 'Game DVR, notifications, power plan, background apps'),
         ('Drivers', 'Age of your graphics card driver'), ('Connection', '40 pings, and the game server'),
         ('Processor with no game open', '10 seconds'), ('Your last match', 'With the in-game bar')]

# (groupe, libellé, valeur, unité, norme, verdict, à faire)  verdict : fine / free / prem / diy
FIRST = [
    ('network', 'Jitter', '14', 'ms', 'Up to 10 ms is steady (at 96 ms ping)', 'prem', ''),
    ('network', 'Lost packets', '0', '%', 'None is normal', 'fine', ''),
    ('network', 'Ping spikes', '1', '', 'Up to 1 is normal', 'fine', ''),
    ('network', 'Connection type', 'Cable', None, 'A cable is steadier', 'fine', ''),
    ('network', 'Ping to the game server', '96', 'ms', 'Mostly set by the distance to the server', 'fine', ''),
    ('fps', 'Screen refresh rate', '165', 'Hz', 'Your screen goes up to 165 Hz', 'fine', ''),
    ('fps', '1% low', '141', 'fps', 'Above 156 FPS (half your average)', 'prem', ''),
    ('fps', 'Stutters', '1.4', '/min', 'Under 2 a minute is smooth', 'fine', ''),
    ('fps', 'Average FPS', '312', 'fps', 'Last match followed by the in-game bar', 'fine', ''),
    ('system', 'Processor with no game open', '7.8', '%', 'Under 5% is quiet', 'free', ''),
    ('system', 'Processes', '214', '', '120 to 160 is typical', 'free', ''),
    ('system', 'Memory speed', '4800', 'MT/s', 'Your memory is rated for 6000 MT/s', 'diy', 'Turn on XMP or EXPO in the BIOS'),
    ('windows', 'Game DVR', 'On', None, 'Off while you play', 'free', ''),
    ('windows', 'Power plan', 'Balanced', None, 'High performance while you play', 'prem', ''),
    ('windows', 'Notifications', 'Off', None, 'Off while you play', 'fine', ''),
    ('windows', 'Apps in the background', 'Steam, OneDrive', None, 'Closed or paused while you play', 'diy', 'Close or pause them before you play'),
    ('windows', 'Graphics card driver', '38', 'd', 'Under 6 months old', 'fine', ''),
]
CHANGED = {'Jitter': ('6', 'fine', None), 'Ping spikes': ('0', 'fine', None), 'Processor with no game open': ('3.2', 'fine', None),
           'Processes': ('151', 'fine', None), 'Game DVR': ('Off', 'fine', None), 'Power plan': ('High performance', 'fine', None)}
AFTER = []
for g, l, v, u, n, vt, how in FIRST:
    if l in CHANGED:
        nv, nvt, nn = CHANGED[l]
        AFTER.append((g, l, nv, u, nn or n, nvt, how))
    else:
        AFTER.append((g, l, v, u, n, vt, how))
DELTAS = [('Jitter', '14', '6', 'ms', '−57 %'), ('Processes', '214', '151', '', '−63 processes'), ('Processor with no game open', '7.8', '3.2', '%', '−4.6 points'), ('Ping spikes', '1', '0', '', '−1 spike')]
GROUPS = [('network', 'network'), ('fps', 'fps'), ('system', 'system'), ('windows', 'windows')]
VT = {'fine': 'fine', 'free': 'free', 'prem': 'premium', 'diy': 'do it yourself'}

def head(kick, sig):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Rago, Analyze my PC</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="module.css">
<link rel="stylesheet" href="analysis.css">
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="rail.css">
<link rel="stylesheet" href="anim.css"></head>
<body data-page="analysis">
<div class="win">
  <main class="main">
    <div class="topbar"><div class="search"><i data-i="search"></i>search games, tweaks, settings<kbd>ctrl k</kbd></div><span class="wc"></span></div>
    <section class="head">
      <div><p class="kick">{kick}</p><h1 class="title" data-t="analyze my pc">analyze my pc</h1></div>
      {sig}
    </section>
'''
FOOT = '''  </main>
</div>
<script src="shell5.js"></script>
<script src="printicons.js"></script>
<script src="icons.js"></script>
<script src="anim.js"></script>
</body></html>
'''

def sig(big, line, small, ticks):
    return (f'<div class="ping sig"><div class="pv"><b>{big}</b><span>{line}<small>{small}</small></span></div>'
            f'<div class="ticks">{ticks}</div></div>')

def tick_groups(data):
    out = ''
    for g, _ in GROUPS:
        rows = [r for r in data if r[0] == g]
        out += f'<span class="g" style="--n:{len(rows)}">' + ''.join(f'<i class="{"" if r[5] == "fine" else "on"}"></i>' for r in rows) + '</span>'
    return out

def row(r, plan):
    g, l, v, u, n, vt, how = r
    val = (f'<div class="v t">{esc(v)}</div>' if u is None else f'<div class="v">{esc(v)}<small>{esc(u)}</small></div>')
    ic = {'prem': '<i data-i="lock"></i>' if plan == 'free' else '', 'diy': '<i data-i="wrench"></i>', 'free': '<i data-i="zap"></i>'}.get(vt, '')
    hw = f'<span class="how"><i data-i="right"></i>{esc(how)}</span>' if how and vt != 'fine' else ''
    return (f'<div class="r{"" if vt == "fine" else " iss"}"><div class="l"><b>{esc(l)}</b><span>{esc(n)}</span>{hw}</div>'
            f'{val}<span class="vt {vt}">{ic}{VT[vt]}</span></div>')

def groups(data, plan):
    out = '<div class="groups">'
    for g, name in GROUPS:
        rows = [r for r in data if r[0] == g]
        k = sum(1 for r in rows if r[5] != 'fine')
        out += (f'<section class="grp"><div class="sh"><h2 class="h2 tape">{name}</h2><span class="cnt">{k}<small> / {len(rows)} above normal</small></span></div>'
                f'<div class="panel rows">' + ''.join(row(r, plan) for r in rows) + '</div></section>')
    return out + '</div>'

def counts(data):
    return {k: sum(1 for r in data if r[5] == k) for k in ('free', 'prem', 'diy')}

KICK = 'measured on your pc <b>//</b> nothing is changed during the analysis'

def page_start():
    li = ''.join(f'<li><i class="n">{i + 1}</i><div><b>{esc(a)}</b><small>{esc(b)}</small></div></li>' for i, (a, b) in enumerate(STEPS))
    t = '<span class="g" style="--n:6">' + '<i></i>' * 6 + '</span>'
    return head(KICK, sig('20', 'sec', 'about, start to finish', t)) + f'''
    <div class="start">
      <div class="panel go">
        <div><span class="lbl">6 checks, about 20 seconds</span><h3>what slows your pc<br>down in game</h3>
          <p>Measured, with what fixes each point: the free plan, Premium, or you. Close your games and downloads first: your connection and processor are measured as they are.</p></div>
        <div class="gb"><span class="btn red lg"><i data-i="activity"></i>analyze my pc</span><span class="sub">Nothing is changed. The network test sends its numbers to Rago's server, like the usual network test.</span></div>
      </div>
      <ol class="panel steps">{li}</ol>
    </div>
''' + FOOT

def page_running():
    li = ''
    for i, (a, b) in enumerate(STEPS):
        cls = 'done' if i < 3 else ('now' if i == 3 else '')
        st = ('<span class="st"><i data-i="check"></i>done</span>' if i < 3 else ('<span class="st">23 / 40 pings</span>' if i == 3 else '<span class="st">next</span>'))
        pg = '<div class="pg">' + '<i class="f"></i>' * 23 + '<i></i>' * 17 + '</div>' if i == 3 else ''
        li += f'<li class="{cls}"><i class="n">{i + 1}</i><div><b>{esc(a)}</b><small>{esc(b)}</small>{pg}</div>{st}</li>'
    t = '<span class="g" style="--n:6">' + '<i class="on"></i>' * 3 + '<i class="pd"></i>' + '<i></i>' * 2 + '</span>'
    return head(KICK, sig('4', '/ 6', 'connection', t)) + f'''
    <div class="start">
      <div class="panel go">
        <div><span class="lbl">analysis running</span><h3>measuring your<br>connection</h3>
          <p>About 20 seconds. Keep your games and downloads closed until the end: the processor is measured next, with nothing open.</p></div>
        <div class="gb"><span class="btn lg"><i data-i="x"></i>stop</span><span class="sub">Nothing has been changed on your PC.</span></div>
      </div>
      <ol class="panel steps">{li}</ol>
    </div>
''' + FOOT

def page_results():
    c = counts(FIRST); n = sum(c.values())
    s = sig(str(n), 'above<br>normal', f'of {len(FIRST)} measured', tick_groups(FIRST))
    return head(KICK, s) + f'''
    <div class="split">
      <div class="sc free"><b>{c["free"]}</b><span>fixed for free</span></div>
      <div class="sc prem"><b>{c["prem"]}</b><span>by premium</span></div>
      <div class="sc diy"><b>{c["diy"]}</b><span>to do yourself</span></div>
      <div class="acts">
        <p class="lead"><b>{n} things above normal.</b> {c["free"]} fixed for free, {c["prem"]} by Premium, {c["diy"]} to do yourself: each line says how.</p>
        <div class="row"><span class="btn red"><i data-i="zap"></i>apply the 3 free tweaks that fix it</span><span class="btn"><i data-i="lock"></i>see what premium adds</span></div>
      </div>
    </div>
    {groups(FIRST, "free")}
    <p class="mfoot">Measured on 20 Nov 2026 at 22:30.<u>analyze again</u><u>start over</u></p>
''' + FOOT

def page_after():
    c = counts(AFTER); n = sum(c.values())
    s = sig(str(n), 'above<br>normal', 'was 8 on 20 nov', tick_groups(AFTER))
    cells = ''.join(f'<div class="bc"><span class="k">{esc(l)}</span><div class="n"><s>{b}</s><i data-i="right"></i><b>{a}' + (f'<small>{u}</small>' if u else '') + f'</b></div><span class="d">{d}</span></div>' for l, b, a, u, d in DELTAS)
    return head(KICK, s) + f'''
    <section class="ba">
      <div class="sh"><h2 class="h2 tape">before / after</h2><span class="cnt">20 nov<small> &rarr; today</small></span></div>
      <div class="bagrid">{cells}</div>
      <p class="note">FPS and 1% low are measured during your next match, with the in-game bar.</p>
    </section>
    <div class="split">
      <div class="sc free zero"><b>{c["free"]}</b><span>fixed for free</span></div>
      <div class="sc prem"><b>{c["prem"]}</b><span>by premium</span></div>
      <div class="sc diy"><b>{c["diy"]}</b><span>to do yourself</span></div>
      <div class="acts">
        <p class="lead"><b>{n} things above normal.</b> {c["prem"]} fixed by Premium, {c["diy"]} to do yourself: each line says how.</p>
        <div class="row"><span class="btn red"><i data-i="gauge"></i>open latency</span><span class="lnk"><i data-i="refresh"></i>analyze again</span></div>
      </div>
    </div>
    {groups(AFTER, "premium")}
    <p class="mfoot">Measured today at 21:20.<u>start over</u></p>
''' + FOOT

# Tout va bien : même PC une fois réglé (Premium appliqué, XMP activé, applis fermées). Texte : pa.allFine.
FINE_FIX = {'1% low': ('168', 'Above 156 FPS (half your average)'), 'Memory speed': ('6000', 'Your memory is rated for 6000 MT/s'),
            'Apps in the background': ('None', 'Closed or paused while you play')}
ALLFINE = []
for g, l, v, u, n, vt, how in AFTER:
    if l in FINE_FIX:
        v, n = FINE_FIX[l]
    ALLFINE.append((g, l, v, u, n, 'fine', ''))

def page_allfine():
    s = sig('0', 'above<br>normal', f'of {len(ALLFINE)} measured', tick_groups(ALLFINE))
    return head(KICK, s) + f'''
    <div class="split okall">
      <div class="sc ok"><i data-i="check"></i><b>{len(ALLFINE)}<small>/ {len(ALLFINE)}</small></b><span>within normal</span></div>
      <div class="acts">
        <p class="lead"><b>Things are fine:</b> nothing above normal on this PC.</p>
        <div class="row"><span class="btn"><i data-i="refresh"></i>analyze again</span></div>
      </div>
    </div>
    {groups(ALLFINE, "premium")}
    <p class="mfoot">Measured today at 21:20.<u>start over</u></p>
''' + FOOT

if __name__ == '__main__':
    (OUT / 'analysis.css').write_text((HERE / 'analysis.css').read_text())
    for name, fn in [('start', page_start), ('running', page_running), ('results', page_results), ('after', page_after), ('allfine', page_allfine)]:
        (OUT / f'app-analysis-{name}.html').write_text(fn())
        print('wrote', name)
