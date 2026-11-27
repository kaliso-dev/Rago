import rmark
from rmark import app_icon, old_icon
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">'
def ic(v, px, show=None):
    s = app_icon(v, px)
    return s.replace(f'width="{px}" height="{px}"', f'width="{show or px}" height="{show or px}"')
def scene(mode):
    lt = mode == 'light'
    ph = ''.join(f'<i class="ph"></i>' for _ in range(3))
    return (f'<div class="scene {mode}"><div class="desk"><div class="sc">{ic("dark",48)}<span>Rago Optimizer</span></div></div>'
            f'<div class="tb"><div class="mid">{ph}<span class="on">{ic("dark",24)}</span><i class="ph"></i></div><span class="clock">12:42</span></div></div>')
ladder = lambda v: ''.join(f'<figure>{ic(v, px)}<figcaption>{px}</figcaption></figure>' for px in (128, 64, 48, 32, 24, 16))
html = f'''<!doctype html><html><head><meta charset="utf-8">{FONTS}
<link rel="stylesheet" href="/mnt/project-files/rago-redesign/rendus-v5/src/rago5.css"><style>
body{{background:var(--bg)}}
.bd{{width:1600px;padding:64px 72px 72px;background:var(--bg);position:relative;overflow:hidden}}
.bd::after{{content:"";position:absolute;right:0;top:0;width:620px;height:420px;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.08) 1.1px,transparent 1.5px) 0 0/9px 9px;-webkit-mask:linear-gradient(225deg,#000 0,transparent 70%)}}
h1{{font-family:var(--cond);font-weight:900;font-style:italic;font-size:96px;line-height:.8;text-transform:uppercase;letter-spacing:-.01em}}
.lede{{margin-top:16px;color:var(--ink-2);font-size:17px;max-width:640px}}
.top{{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:48px}}
.card{{background:var(--bg-2);border:1px solid var(--line);border-radius:22px;padding:34px 30px 28px;display:flex;flex-direction:column;align-items:center}}
.card.old svg{{opacity:.8}}
.card h3{{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;text-transform:uppercase;margin-top:26px;align-self:flex-start}}
.card p{{color:var(--ink-2);font-size:15px;margin-top:6px;align-self:flex-start}}
.card .tag{{align-self:flex-start;margin-bottom:22px;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.1em;text-transform:uppercase;padding:4px 9px;background:var(--bg-4);border-radius:6px}}
.card .tag.r{{background:var(--red);color:var(--red-ink)}}
.lad{{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:28px}}
.lad .card{{flex-direction:row;align-items:flex-end;gap:30px;padding:30px}}
.lad figure{{display:flex;flex-direction:column;align-items:center;gap:10px}}
.lad figcaption{{font-family:var(--cond);font-weight:700;font-size:13px;letter-spacing:.08em;color:var(--ink-3)}}
.scenes{{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:28px}}
.scene{{position:relative;height:260px;border-radius:22px;overflow:hidden;border:1px solid var(--line)}}
.scene.dark{{background:radial-gradient(120% 90% at 85% 0%,#2A1513 0,#121216 45%,#0A0A0B 100%)}}
.scene.light{{background:radial-gradient(120% 90% at 85% 0%,#C9B7B8 0,#A5ADBB 50%,#8C95A5 100%)}}
.desk{{padding:26px}}
.sc{{width:92px;display:flex;flex-direction:column;align-items:center;gap:7px;font-family:"Segoe UI",var(--body);font-size:12.5px;color:#fff;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.8)}}
.tb{{position:absolute;left:0;right:0;bottom:0;height:52px;display:flex;align-items:center;justify-content:center}}
.dark .tb{{background:rgba(28,28,32,.92);border-top:1px solid rgba(255,255,255,.08)}}
.light .tb{{background:rgba(243,243,245,.94);border-top:1px solid rgba(0,0,0,.08)}}
.mid{{display:flex;gap:10px;align-items:center}}
.ph{{display:block;width:40px;height:40px;border-radius:7px;position:relative}}
.ph::after{{content:"";position:absolute;inset:9px;border-radius:5px}}
.dark .ph::after{{background:#3A3A42}} .light .ph::after{{background:#C3C6CE}}
.on{{width:40px;height:40px;display:grid;place-items:center;border-radius:7px;position:relative}}
.dark .on{{background:rgba(255,255,255,.07)}} .light .on{{background:rgba(0,0,0,.05)}}
.on::after{{content:"";position:absolute;bottom:2px;left:50%;width:16px;height:3px;margin-left:-8px;border-radius:2px;background:var(--red)}}
.clock{{position:absolute;right:20px;font-family:"Segoe UI",var(--body);font-size:12.5px}}
.dark .clock{{color:#E8E8EC}} .light .clock{{color:#1A1A1E}}
.cap{{font-size:15px;color:var(--ink-2);margin:44px 0 0}}.cap b{{font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;text-transform:uppercase;color:var(--ink);margin-right:12px}}
</style></head><body><div class="bd">
<h1>App icon</h1>
<p class="lede">The R gets the same print as the menu icons: paper face, red layer slightly off register, rough edges. It sits on a tile so it stays visible on a light taskbar.</p>
<div class="top">
 <div class="card old"><span class="tag">today</span>{old_icon(220)}<h3>Flat red R</h3><p>Clean, but it no longer matches the printed icons in the menu.</p></div>
 <div class="card"><span class="tag r">recommended</span>{ic("dark",256,220)}<h3>Printed, dark tile</h3><p>Taskbar, Start menu, desktop, title bar.</p></div>
 <div class="card"><span class="tag">alternative</span>{ic("red",256,220)}<h3>Printed, red tile</h3><p>Louder. Good for the installer and store pages.</p></div>
</div>
<p class="cap"><b>Sizes</b>Below 64 px the texture goes. At 16 px the red layer goes too, so the R stays readable.</p>
<div class="lad"><div class="card">{ladder("dark")}</div><div class="card">{ladder("red")}</div></div>
<p class="cap"><b>On Windows</b>Dark and light taskbar.</p>
<div class="scenes">{scene("dark")}{scene("light")}</div>
</div></body></html>'''
open('board-icone.html', 'w').write(html)
# fichiers pour le dev : SVG et PNG
import os
D = '/mnt/project-files/rago-redesign/charte/icone-app'
for v in ('dark', 'red'):
    for px in (16, 24, 32, 48, 64, 128, 256):
        open(f'{D}/rago-app-{v}-{px}.svg', 'w').write(app_icon(v, px))
