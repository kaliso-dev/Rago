import json, pathlib
from icons import ICONS, MODULES, svg
S = pathlib.Path('/tmp/claude-0/-home-claude/37c064ae-9035-5855-b56f-303ede4279a1/scratchpad')
T = json.loads((S / 'ds/project/tokens.json').read_text())
css = ':root{'
for c in T['color']['tokens']: css += f"--{c['name']}:{c['value']['dark']};"
for c in T['shadow']['tokens']: css += f"--{c['name']}:{c['value']['dark']};"
for f in ['spacing', 'radius', 'angle', 'size', 'opacity']:
    for x in T[f]['tokens']: css += f"--{x['name'].replace('.', chr(92) + '.')}:{x['value']};"
for k, v in T['type']['families'].items(): css += f'--font-{k}:{v};'
css += '}'
bundle = (S / 'ds/project/components/bundle.css').read_text()
LP = json.loads((S / 'dsbuild/icons.json').read_text())
R_PATH = 'M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z'

INK, INK2, INK3, RED, RINK = '#F5F5F6', '#A1A1AA', '#6E6E78', '#FF3B30', '#0A0A0B'
def lu(n, size=24, color=INK2):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{LP[n]}</svg>'

# ---------- rules ----------
grid = ''.join(f'<line x1="{i}" y1="0" x2="{i}" y2="24" />' for i in range(0, 25, 2)) + ''.join(f'<line x1="0" y1="{i}" x2="24" y2="{i}" />' for i in range(0, 25, 2))
upright = f'<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="{INK3}" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter">' + ICONS['minecraft'].replace('class="a"', f'fill="{INK3}" stroke="none"') + '</svg>'
rules = f'''
<div class="rule"><div class="demo"><svg class="gridbg" width="120" height="120" viewBox="0 0 24 24" stroke="rgba(255,255,255,.14)" stroke-width=".12">{grid}</svg>{svg('hitreg', 120, INK, INK)}</div>
  <b>sharp line</b><span>24 grid, 2 px stroke, square ends and sharp corners. No round caps.</span></div>
<div class="rule"><div class="demo two">{upright}{svg('minecraft', 120, INK, INK)}</div>
  <b>leans -12°</b><span>Every icon leans like the titles and the buttons.</span></div>
<div class="rule"><div class="demo two"><svg width="86" height="94" viewBox="0 0 164 180"><path d="{R_PATH}" fill="{RED}"/></svg>{svg('windows', 120, INK, INK)}</div>
  <b>the R's cut</b><span>Frames lose their top right corner, like the R.</span></div>
<div class="rule"><div class="demo two">{svg('network', 120, INK2, INK2)}{svg('network', 120, INK, RED)}</div>
  <b>one solid piece</b><span>Each module icon has one solid piece. It turns red when the module is open.</span></div>'''

# ---------- before / after ----------
pairs = [('dashboard', 'grid'), ('network', 'net'), ('latency', 'gauge'), ('graphics', 'gpu'), ('windows', 'monitor'), ('hitreg', 'crosshair'), ('minecraft', 'box'), ('games', 'pad'), ('apply', 'zap'), ('privacy', 'shield')]
ba_l = ''.join(f'<div class="ba">{lu(l, 44)}</div>' for r, l in pairs)
ba_r = ''.join(f'<div class="ba">{svg(r, 44, INK, RED)}</div>' for r, l in pairs)
ba_n = ''.join(f'<span class="rg-label">{r}</span>' for r, l in pairs)

# ---------- the set ----------
def cell(n):
    return f'<div class="cell">{svg(n, 44, INK, RED)}<div class="sz">{svg(n, 16, INK2, INK2)}{svg(n, 20, INK2, INK2)}{svg(n, 24, INK2, INK2)}</div><span>{n}</span></div>'
mods = ''.join(cell(n) for n in MODULES)
acts = ''.join(cell(n) for n in ICONS if n not in MODULES)

# ---------- in the app ----------
nav = [('dashboard', 'dashboard', ''), ('network', 'network', '24'), ('latency', 'latency', '18'), ('graphics', 'graphics card', '21'), ('windows', 'windows', '42'), ('hitreg', 'hitreg', '12'), ('minecraft', 'minecraft', '15'), ('games', 'games', '10'), ('route', 'rago route', '')]
side_items = ''
for ic, lab, n in nav:
    on = lab == 'network'
    icon = svg(ic, 16, 'currentColor', RED if on else 'currentColor', cls='rg-ri')
    side_items += f'<a{" class=\"is-on\"" if on else ""}>{icon}{lab}{f"<em>{n}</em>" if n else ""}</a>'
side = f'''<nav class="rg-side app-side">
  <div class="rg-logo" style="padding:0 10px 26px"><svg viewBox="0 0 164 180"><path d="{R_PATH}"/></svg><b>AGO</b></div>
  <div class="rg-label grp">optimize</div>{side_items}
</nav>'''
def pre(ic, name, sub, on=False):
    col = RINK if on else INK2
    ck = f'<em class="ck">{svg("check", 14, RED, RED)}</em>' if on else ''
    return f'<div class="rg-preset{" is-on" if on else ""}">{svg(ic, 26, col, col)}{ck}<b>{name}</b><span>{sub}</span></div>'
app = f'''
<div class="appwrap">
  {side}
  <div class="appmain">
    <div class="rg-tabs"><span class="rg-tab is-on">tweaks <em>3</em></span><span class="rg-tab">packet optimizer</span><span class="rg-tab">network test</span><span class="rg-tab">rago route</span></div>
    <div class="rg-presets" style="--cols:4;margin-top:26px">
      {pre('hitreg', 'hitreg', 'Your hits leave instantly', True)}{pre('download', 'knockback', 'Server hits land instantly')}{pre('wifi', 'wi-fi', 'Full power, no hopping')}{pre('alert', 'packet loss', '4G, ADSL or a busy home')}
    </div>
    <div class="rg-tiles" style="margin-top:14px">
      <div class="rg-tile is-on"><span class="nm">dns cache first</span>{svg('apply', 14, INK3, INK3)}<i class="rg-sw is-on"></i></div>
      <div class="rg-tile is-pend"><span class="nm">msi mode</span><i class="rg-sw is-pend"></i></div>
      <div class="rg-tile"><span class="nm">connection</span><span class="val">fiber</span>{svg('chevron', 16, INK2)}</div>
    </div>
    <div class="rg-row" style="margin-top:22px">
      <span class="rg-btn is-red">{svg('refresh', 15, RINK, RINK)}test again</span>
      <span class="rg-btn">{svg('power', 15, INK, INK)}turn off</span>
      <span class="rg-btn is-sm">{svg('activity', 13, INK, INK)}stability test</span>
      <span class="rg-btn is-sm">{svg('measure', 13, INK, INK)}measure mtu</span>
      <span class="rg-chip is-ghost">{svg('privacy', 12, INK2, INK2)}never your ip</span>
    </div>
    <div class="rg-bar rg-carbon" style="margin-top:26px"><b>3</b><span class="lb">changes ready<small>{svg('restart', 12, INK2)}restart needed for 2</small></span><span class="rg-link">clear</span><span class="rg-btn is-red">{svg('apply', 16, RINK, RINK)}apply</span></div>
  </div>
</div>'''

html = f'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap">
<style>{css}</style><style>{bundle}</style>
<style>
html,body{{margin:0;background:var(--bg)}}
.board{{box-sizing:border-box;width:1440px;padding:40px 56px 56px;position:relative;overflow:hidden}}
.top{{display:flex;align-items:flex-end;justify-content:space-between}}
.top .note{{max-width:420px;font-size:14px;line-height:1.45;color:var(--ink-2);padding-bottom:10px}}
.top .note b{{color:var(--ink);font-weight:600}}
section{{margin-top:46px}}
.rg-sh{{margin-bottom:18px}}
.rules{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}}
.rule{{padding:22px 22px 20px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-card)}}
.rule .demo{{position:relative;height:150px;display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:16px;background:var(--bg-3);border-radius:var(--radius-tile)}}
.rule .demo .gridbg{{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}}
.rule .demo svg{{position:relative}}
.rule b{{display:block;font-family:var(--font-display);font-weight:900;font-style:italic;font-size:26px;line-height:.9;text-transform:uppercase}}
.rule span{{display:block;margin-top:8px;font-size:13px;line-height:1.4;color:var(--ink-2)}}
.bawrap{{display:grid;grid-template-columns:90px 1fr;row-gap:12px;align-items:center;padding:24px 26px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-panel)}}
.barow{{display:grid;grid-template-columns:repeat(10,1fr);gap:10px;justify-items:center}}
.ba{{width:100%;height:84px;display:grid;place-items:center;background:var(--bg-3);border-radius:var(--radius-tile)}}
.barow .rg-label{{text-align:center}}
.set{{display:grid;grid-template-columns:repeat(8,1fr);gap:10px}}
.cell{{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 8px 14px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-tile)}}
.cell .sz{{display:flex;align-items:center;gap:12px}}
.cell span{{font-family:var(--font-display);font-weight:700;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}}
.sub2{{margin:26px 0 12px}}
.appwrap{{display:flex;height:500px;background:var(--bg);border:1px solid var(--line-2);border-radius:var(--radius-panel);overflow:hidden}}
.app-side{{height:100%;flex:none}}
.rg-side a .rg-ri{{flex:none}}
.rg-side a.is-on .rg-ri{{color:var(--ink)}}
.appmain{{flex:1;padding:30px 36px}}
.rg-btn svg,.rg-chip svg,.rg-tile > svg,.rg-bar small svg{{flex:none}}
.rg-tile > svg:last-child{{margin-left:auto}}
.rg-tile .val + svg{{margin-left:10px}}
.rg-preset > svg{{flex:none}}
</style></head><body>
<div class="rg-ground board rg-halftone">
  <div class="top">
    <div><div class="rg-kick">charter <b>//</b> our own icons, first draft</div><div class="rg-title" data-t="icons" style="font-size:132px">icons</div></div>
    <p class="note"><b>Built from the R and the titles</b>, not taken from a library: same lean, same cut, one solid piece that lights up red when a module is open. {len(ICONS)} icons cover the sidebar, the actions and the tiles.</p>
  </div>
  <section><div class="rg-sh"><h2 class="rg-tape">the rules</h2></div><div class="rules">{rules}</div></section>
  <section><div class="rg-sh"><h2 class="rg-tape">before / after</h2></div>
    <div class="bawrap">
      <span class="rg-label">today, lucide</span><div class="barow">{ba_l}</div>
      <span class="rg-label" style="color:var(--red)">rago</span><div class="barow">{ba_r}</div>
      <span></span><div class="barow">{ba_n}</div>
    </div></section>
  <section><div class="rg-sh"><h2 class="rg-tape">modules</h2><span class="rg-sub">{len(MODULES)} icons, shown at 44, then 16, 20 and 24 px</span></div><div class="set">{mods}</div>
    <div class="rg-sh sub2"><h2 class="rg-tape">actions</h2><span class="rg-sub">{len(ICONS)-len(MODULES)} icons, a solid piece only where it means something</span></div><div class="set">{acts}</div></section>
  <section><div class="rg-sh"><h2 class="rg-tape">in the app</h2></div>{app}</section>
</div></body></html>'''
pathlib.Path('board.html').write_text(html)
print('ok', len(html))
