import json, pathlib
from solid import SOLID, NAV, icon, defs, PAPER, RED
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
R_PATH = 'M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z'
ORDER = NAV + ['apply']

big = ''.join(f'<div class="bi">{icon(n, 132)}<b>{SOLID[n][2]}</b><span>{SOLID[n][3]}</span></div>' for n in ORDER)
s32 = ''.join(icon(n, 32) for n in ORDER)
s22 = ''.join(icon(n, 22) for n in ORDER)
labels = {'dashboard': 'dashboard', 'network': 'network', 'latency': 'latency', 'graphics': 'graphics card', 'windows': 'windows', 'hitreg': 'hitreg', 'minecraft': 'minecraft', 'games': 'games', 'route': 'rago route'}
counts = {'network': '24', 'latency': '18', 'graphics': '21', 'windows': '42', 'hitreg': '12', 'minecraft': '15', 'games': '10'}
items = ''
for n in NAV:
    on = n == 'network'
    ic = icon(n, 24) if on else icon(n, 24, face='#A1A1AA', back='#34343A')
    items += f'<a{" class=\"is-on\"" if on else ""}>{ic}{labels[n]}{f"<em>{counts[n]}</em>" if n in counts else ""}</a>'

html = f'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap">
<style>{css}</style><style>{bundle}</style>
<style>
html,body{{margin:0;background:var(--bg)}}
.board{{box-sizing:border-box;width:1440px;padding:40px 56px 56px;position:relative;overflow:hidden}}
.top{{display:flex;align-items:flex-end;justify-content:space-between}}
.top .note{{max-width:430px;font-size:14px;line-height:1.45;color:var(--ink-2);padding-bottom:10px;margin:0}}
.top .note b{{color:var(--ink);font-weight:600}}
.hero{{margin-top:40px;padding:46px 40px 40px;display:grid;grid-template-columns:repeat(5,1fr);row-gap:44px;--carbon-w:420px}}
.bi{{display:flex;flex-direction:column;align-items:center}}
.bi b{{margin-top:26px;font-family:var(--font-display);font-weight:900;font-style:italic;font-size:30px;line-height:.9;text-transform:uppercase}}
.bi span{{margin-top:8px;font-size:13.5px;color:var(--ink-2)}}
.low{{display:grid;grid-template-columns:1fr 300px;gap:14px;margin-top:14px}}
.strips{{display:flex;flex-direction:column;gap:14px}}
.strip{{height:112px;display:flex;align-items:center;gap:30px;padding:0 34px}}
.strip .rg-label{{width:150px;flex:none;color:var(--ink-2)}}
.strip .ics{{display:flex;align-items:center;justify-content:space-between;flex:1}}
.sidep{{padding:0;overflow:hidden}}
.states{{flex:1;display:flex;align-items:center;gap:30px;padding:0 34px}}
.states .rg-label{{width:150px;flex:none;color:var(--ink-2)}}
.states .st{{display:flex;align-items:center;gap:16px;flex:1}}
.states .st b{{display:block;font-family:var(--font-display);font-weight:900;font-style:italic;font-size:22px;line-height:.9;text-transform:uppercase}}
.states .st small{{display:block;margin-top:5px;font-size:12.5px;color:var(--ink-2)}}
.sidep .rg-side{{width:100%;height:100%;border-right:0;padding-top:22px}}
.sidep .rg-side a{{gap:12px}}
.sidep .rg-side a svg{{flex:none}}
.cap2{{display:block;padding:0 12px 14px;font-size:12.5px;line-height:1.4;color:var(--ink-2)}}
.pi{{overflow:visible}}
</style></head><body>{defs()}
<div class="rg-ground board rg-halftone rg-grain">
  <div class="top">
    <div><div class="rg-kick">charter <b>//</b> icons, printed</div><div class="rg-title" data-t="icons" style="font-size:132px">icons</div></div>
    <p class="note"><b>Printed like a match poster:</b> solid shapes in paper colour, rough edges, a few specks, and the red layer printed a little off behind. Same lean and same cuts as the rest of Rago.</p>
  </div>
  <section class="rg-panel rg-carbon hero">{big}</section>
  <div class="low">
    <div class="strips">
      <div class="rg-panel strip"><span class="rg-label">open bar · 32 px</span><div class="ics">{s32}</div></div>
      <div class="rg-panel strip"><span class="rg-label">folded bar · 22 px</span><div class="ics">{s22}</div></div>
      <div class="rg-panel states"><span class="rg-label">states</span>
        <div class="st">{icon('network', 72, face='#A1A1AA', back='#34343A')}<div><b>at rest</b><small>grey on grey</small></div></div>
        <div class="st">{icon('network', 72, face='#F5F5F6', back='#C9221A')}<div><b>hover</b><small>white on deep red</small></div></div>
        <div class="st">{icon('network', 72)}<div><b>open</b><small>paper on Rago red</small></div></div>
      </div>
    </div>
    <div class="rg-panel sidep"><nav class="rg-side">
      <div class="rg-logo" style="padding:0 10px 18px"><svg viewBox="0 0 164 180"><path d="{R_PATH}"/></svg><b>AGO</b></div>
      <span class="cap2">Option: red behind the open module only, grey behind the others.</span>
      {items}
    </nav></div>
  </div>
</div></body></html>'''
pathlib.Path('board2.html').write_text(html)
print('ok')
