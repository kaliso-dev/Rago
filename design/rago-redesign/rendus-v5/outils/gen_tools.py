# Génère la maquette v5 de la page Outils (app-tools.html). Données : celles de la démo de l'app (lib/api.ts) et le catalogue.
import json, html
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/src')
CAT = json.load(open('/home/claude/kaliso-dev/rago/app/src/data/catalog.json'))
def esc(s): return html.escape(s, quote=True)
MB = 1024 ** 2

AREAS = [('temp', 'Temporary files', "What apps leave behind in your Temp folder.", 1840),
         ('windows_temp', 'Windows temporary files', 'Leftovers from installs and updates.', 412),
         ('update', 'Windows Update downloads', 'Updates already installed; Windows downloads again anything it still needs.', 2630),
         ('crash', 'Crash reports', 'Memory dumps and error reports from Windows and apps.', 96),
         ('browsers', 'Browser cache', 'Chrome, Edge, Brave, Opera and Firefox: the cache only, never history, passwords or cookies.', 1210),
         ('discord', 'Discord cache', 'Images and files Discord keeps in cache.', 388),
         ('launchers', 'Game launcher cache', 'Steam and Epic Games: the store and page cache, rebuilt on its own. Never your games.', 914),
         ('shaders', 'Shader cache', 'Games rebuild them on their next launch: a bit of stutter at first.', 742),
         ('recycle', 'Recycle Bin', 'All your drives. Avoid it right before a screenshare: checkers look at the Recycle Bin.', 205)]
DEFAULT = {'temp', 'windows_temp', 'update', 'crash', 'browsers', 'discord', 'launchers'}
STARTUP = [('Discord', 'Discord Inc.', True, False), ('EpicGamesLauncher', 'Epic Games, Inc.', True, False), ('Microsoft Edge', 'Microsoft Corporation', True, False),
           ('OneDrive', 'Microsoft Corporation', True, False), ('Riot Vanguard', 'Riot Games, Inc.', True, True), ('RtkAudUService', 'Realtek Semiconductor · All accounts', True, True),
           ('SecurityHealth', 'Microsoft Corporation · All accounts', True, True), ('Spotify', 'Spotify Ltd', False, False), ('Steam', 'Valve Corporation', False, False)]
BLOAT = [('News', True), ('Weather', True), ('Get Help', True), ('Tips', True), ('Solitaire Collection', True), ('Feedback Hub', True), ('Clipchamp', True),
         ('Teams (personal)', False), ('Outlook (new)', False), ('Candy Crush Saga', True), ('Spotify', False), ('TikTok', True)]
PANELS = [('gpu', 'Graphics settings', 'GPU for each game, GPU scheduling.'), ('monitor', 'Advanced display', 'Check your monitor runs at its max refresh rate (Hz).'),
          ('pad', 'Windows Game Mode', "Puts the game you're playing first."), ('volume', 'Sound', 'Outputs, inputs and exclusive mode.'),
          ('mouse', 'Mouse', 'Pointer speed and precision.'), ('wifi', 'Network connections', 'Adapters, IP address and DNS.'),
          ('power', 'Power options', 'Advanced settings of each plan.'), ('board', 'Device Manager', 'Hardware, drivers and errors.'),
          ('sparkles', 'Visual effects', 'Windows animations and virtual memory.'), ('list', 'Task Manager', "What's running and what it uses.")]
DRIVERS = [('Graphics card', 'NVIDIA GeForce RTX 4070', '32.0.15.6614 · 15 Oct 2026', '38 days', 'new', 'Official site'),
           ('Network', 'Realtek PCIe 2.5GbE Family Controller', '10.68.1003.2023 · 3 Oct 2023', '3 years', 'old', "Maker's site"),
           ('Audio', 'Realtek High Definition Audio', '6.0.9235.1 · 10 Sep 2021', '5 years', 'old', "Maker's site")]
RAN = {'net_restart': 'Last run 21 Nov', 'cln_temp': 'Last run 18 Nov', 'rst_point': 'Last run 20 Nov', 'cln_disk': 'Last run 2 Nov', 'nv_debloat': 'Last run 2 Nov', 'usb_controller': 'Last run 12 Nov'}

def gb(mb): return f'{mb / 1024:.1f}'
def size(mb): return (f'{gb(mb)}<small>GB</small>' if mb >= 1000 else f'{mb}<small>MB</small>')

def actions():
    seen, out = set(), []
    for m in CAT['modules']:
        lst = []
        for s in m['sections']:
            for t in s['tweaks']:
                if 'ref' in t: continue
                if t.get('kind') != 'action': continue
                k = t.get('twin') or t['id']
                if k in seen: continue
                seen.add(k); lst.append(t)
        if lst: out.append((m, lst))
    return out

def page():
    sel = sum(a[3] for a in AREAS if a[0] in DEFAULT); allmb = sum(a[3] for a in AREAS)
    ticks = '<span class="g" style="--n:9">' + ''.join(f'<i class="{"on" if a[0] in DEFAULT else ""}"></i>' for a in AREAS) + '</span>'
    sig = (f'<div class="ping sig"><div class="pv"><b>{gb(sel)}</b><span>gb<small>to free, {gb(allmb)} found</small></span></div>'
           f'<div class="ticks">{ticks}</div></div>')
    clean = ''.join(f'<div class="li{"" if a[0] in DEFAULT else " off"}"><i class="cb{" on" if a[0] in DEFAULT else ""}"></i><div class="l"><b>{esc(a[1])}</b><span>{esc(a[2])}</span></div><span class="sz">{size(a[3])}</span></div>' for a in AREAS)
    on = sum(1 for s in STARTUP if s[2])
    start = ''.join(f'<div class="li{"" if s[2] else " off"}"><div class="l"><b>{esc(s[0])}</b><span>{esc(s[1])}</span></div>'
                    + ('<span class="keep"><i data-i="lock"></i>kept</span>' if s[3] else '') + f'<i class="sw{" on" if s[2] else ""}"></i></div>' for s in STARTUP)
    nb = sum(1 for b in BLOAT if b[1])
    bloat = ''.join(f'<span class="bl{"" if b[1] else " off"}"><i class="cb{" on" if b[1] else ""}"></i>{esc(b[0])}</span>' for b in BLOAT)
    panels = ''.join(f'<div class="pn"><span class="pi"><i data-i="{p[0]}"></i></span><div class="l"><b>{esc(p[1])}</b><span>{esc(p[2])}</span></div><i data-i="upright"></i></div>' for p in PANELS)
    drv = ''.join(f'<div class="li"><span class="k">{d[0]}</span><div class="l"><b>{esc(d[1])}</b><span>{d[2]}</span></div><span class="age {d[4]}"><i></i>{d[3]}</span><span class="site"><i data-i="external"></i>{d[5]}</span></div>' for d in DRIVERS)
    allg = ''
    total = 0
    for m, lst in actions():
        total += len(lst)
        tiles = ''
        for t in lst:
            note = RAN.get(t['id'], '')
            adv = ' advx' if t.get('risk') == 'advanced' else ''
            tiles += (f'<div class="tw{adv}"><span class="tx"><span class="nr"><span class="nm">{esc(t["name"]["en"])}</span></span>'
                      + (f'<span class="note">{note}</span>' if note else '') + '</span><span class="run"><i data-i="play"></i>run</span></div>')
        allg += (f'<div class="agrp"><div class="gh"><b>{esc(m["name"]["en"])}</b><em>{len(lst)}</em><span class="go2">open {esc(m["name"]["en"].lower())}<i data-i="right"></i></span></div>'
                 f'<div class="tgrid">{tiles}</div></div>')
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Rago, Tools</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="module.css">
<link rel="stylesheet" href="tools.css">
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="rail.css">
<link rel="stylesheet" href="anim.css"></head>
<!-- Outils, généré par gen_tools.py. -->
<body data-page="tools">
<div class="win">
  <main class="main">
    <div class="topbar"><div class="search"><i data-i="search"></i>search games, tweaks, settings<kbd>ctrl k</kbd></div><span class="wc"></span></div>
    <section class="head">
      <div><p class="kick">maintenance <b>//</b> cleanup, startup, memory, network, drivers and handy settings</p><h1 class="title" data-t="tools">tools</h1></div>
      {sig}
    </section>
    <div class="nobar"></div>

    <section><div class="sh"><h2 class="h2 tape">one click</h2></div>
      <div class="quick">
        <div class="panel qt done"><span class="qi"><i data-i="ram"></i></span><h3>clear ram cache</h3><p>Empties the memory Windows keeps in cache, without closing your apps.</p>
          <div class="qf"><span class="ok"><i data-i="check"></i>2.4 GB freed</span><span class="run"><i data-i="play"></i>clear</span></div></div>
        <div class="panel qt"><span class="qi"><i data-i="globe"></i></span><h3>flush dns cache</h3><p>Windows looks up sites and game servers again. Useful when a site or server stops answering.</p>
          <div class="qf"><span></span><span class="run"><i data-i="play"></i>flush</span></div></div>
        <div class="panel qt"><span class="qi"><i data-i="battery"></i></span><h3>power plan</h3>
          <div class="plans"><span class="on"><i></i>balanced</span><span><i></i>high performance</span><span><i></i>ultimate performance</span></div>
          <div class="qf"><span class="ok" style="color:var(--ink-3);font-weight:500">The fastest one to play, a saving one on battery.</span></div></div>
        <div class="panel qt"><span class="qi"><i data-i="activity"></i></span><h3>test my connection</h3><p>Ping, stability, bufferbloat and MTU, in Rago's network test.</p>
          <div class="qf"><span></span><span class="run"><i data-i="upright"></i>open</span></div></div>
      </div>
    </section>

    <div class="cols blockh">
      <section><div class="sh"><h2 class="h2 tape">cleanup</h2><span class="cnt">{gb(sel)}<small> / {gb(allmb)} gb</small></span><span class="lnk2 fold">scan again<i data-i="refresh"></i></span></div>
        <div class="panel lst">{clean}
          <div class="pf"><span class="sub">Deleted files don't come back. Your games, documents and Minecraft are never touched.</span><span class="btn red"><i data-i="trash"></i>clean {gb(sel)} gb</span></div></div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">startup apps</h2><span class="cnt">{on}<small> / {len(STARTUP)} start with windows</small></span></div>
        <p class="lead2">Everything that starts with Windows slows your boot and keeps running while you play. Steam, Epic, Discord, Spotify or Edge don't need to: open them when you want.</p>
        <div class="panel lst">{start}
          <div class="pf"><span class="sub" style="max-width:none">Turning a program off doesn't uninstall it. Takes effect at your next restart.</span></div></div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">preinstalled apps</h2><span class="cnt">{len(BLOAT)}<small> found</small></span></div>
        <p class="lead2">Apps Windows installs without asking. Nothing gaming needs: the Store, Xbox and Game Bar are never offered.</p>
        <div class="panel lst"><div class="bgrid">{bloat}</div>
          <div class="pf"><span class="sub">Each one can be reinstalled from the Microsoft Store if you need it.</span><span class="btn"><i data-i="trash"></i>uninstall {nb} apps</span></div></div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">windows settings</h2><span class="cnt">10</span></div>
        <p class="lead2">The Windows settings you always hunt for, one click away.</p>
        <div class="panel lst"><div class="pgrid2">{panels}</div></div>
      </section>
    </div>

    <section class="blockh drv2"><div class="sh"><h2 class="h2 tape">drivers</h2><span class="cnt">2<small> / 3 over 2 years old</small></span><span class="btn sm"><i data-i="external"></i>windows optional updates</span></div>
      <div class="panel lst">{drv}
        <div class="li"><span class="k">Motherboard</span><div class="l"><b>ASUS ROG Strix B650-A Gaming WiFi</b><span>Chipset, audio and network: on the maker's site</span></div><span class="site"><i data-i="external"></i>Maker's site</span></div>
        <div class="pf"><span class="sub" style="max-width:none">Rago Optimizer never installs drivers: always get them from the official site. Red flags an old driver (over 6 months for the graphics card, 2 years for the rest).</span></div></div>
    </section>

    <div class="allh"><div class="sh" style="margin:0"><h2 class="h2 tape">all of the app's tools</h2><span class="cnt">{total}</span></div><p>The one-click actions from the other tabs, gathered here. They also stay where they were.</p></div>
    {allg}
  </main>
</div>
<script src="shell5.js"></script>
<script src="printicons.js"></script>
<script src="icons.js"></script>
<script src="anim.js"></script>
</body></html>
'''

if __name__ == '__main__':
    (OUT / 'tools.css').write_text((HERE / 'tools.css').read_text())
    (OUT / 'app-tools.html').write_text(page())
    print('wrote app-tools.html')
