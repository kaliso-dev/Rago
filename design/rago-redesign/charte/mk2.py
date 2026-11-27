# 22/11 : pièces ajoutées à la charte après les icônes imprimées (exécuté par mk.py avant l'écriture des composants).
import sys
sys.path.insert(0, str(HERE.parent / 'ricons')); sys.path.insert(0, str(HERE.parent / 'perso'))
import solid, rmark

PMAP = {'grid': 'dashboard', 'net': 'network', 'gauge': 'latency', 'gpu': 'graphics', 'windows_': 'windows', 'crosshair': 'hitreg', 'box': 'minecraft', 'pad': 'games'}

# ---- Sidebar : icônes imprimées, rouge derrière toutes, onglet sélectionné qui glisse
items = []
for ic, lab, n in nav:
    on = ' class="is-on"' if lab == 'network' else ''
    em = f'<em>{n}</em>' if n else ''
    items.append(f'<a{on}>{solid.icon(PMAP[ic], 21)}<span class="t">{lab}</span>{em}</a>')
C['Sidebar'] = dict(group='Navigation', height=560, extra_css='.stage{padding:0}.rg-side{height:560px}', body=solid.defs() + f'''<nav class="rg-side">
  <div class="rg-logo" style="padding:0 10px 26px">{R()}<b>AGO</b></div>
  <div class="rg-label grp">optimize</div>
  {''.join(items)}
  <div style="margin-top:auto">
    <div class="pc rg-carbon"><span class="rg-label">this pc</span><b>21 <span>on</span></b><small>ryzen 7 7800x3d</small></div>
    <div class="motto">every millisecond counts.</div>
  </div>
</nav>''', readme='''# Sidebar

The app's left rail, 236px wide (`size-sidebar`), `bg-2` with a `line` border on its right. Collapses to a 100px rail of icons.

- Top: the Logo lockup.
- Groups start with a `label` heading. Items are `nav` style (18px, 900 italic, uppercase) with a 21px **printed icon** (see Iconography) and a right-aligned count of tweaks in `ink-3`.
- Every item shows its printed icon with the red layer behind it, selected or not. Only the name, the bar and the wash say which page is open.
- Bottom: the PC card (`bg-3`, `radius-btn-lg`, carbon stripes) with the tweaks on, then the motto "Every millisecond counts." in `ink-3`.

## Selected item

`is-on` drives one number, `--p`, from 0 to 1. Everything follows it:

- the name (`.t`) slides 10px to the right;
- a 3px `red` bar grows from the middle on the left edge;
- the `fx-red-wash` fades in, the name goes from `ink-2` to `ink`, the count from `ink-3` to `red`.

Timing: 320ms `cubic-bezier(.16,1,.3,1)` for the item that opens, 220ms ease-out for the one that closes. With reduced motion the change is instant. `--p` is registered with `@property` so it can be transitioned.
''')

# ---- Stamp
def stamp_svg(W=292, H=124, Cc=16, text='APPLIED', sub='18 TWEAKS ON'):
    f = lambda id_, fr, sc, seed, sf, sa, sb, xs='R', ys='G': (f'<filter id="{id_}" x="-10%" y="-15%" width="120%" height="130%" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">'
        f'<feTurbulence type="fractalNoise" baseFrequency="{fr}" numOctaves="2" seed="{seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="{sc}" xChannelSelector="{xs}" yChannelSelector="{ys}" result="d"/>'
        f'<feTurbulence type="fractalNoise" baseFrequency="{sf}" numOctaves="2" seed="{seed+6}" result="s"/><feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  {sa} 0 0 0 {sb}" result="sm"/><feComposite in="d" in2="sm" operator="in"/></filter>')
    return (f'<svg class="rg-stamp" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><defs>' + f('st-f', .32, 2.4, 7, .26, -16, 12.6) + f('st-b', .24, 3.2, 19, .2, -14, 11.4, 'G', 'R')
        + f'<mask id="st-m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="{W+20}" height="{H+20}"><rect x="-10" y="-10" width="{W+20}" height="{H+20}" fill="#fff"/>'
        + f'<text x="{W/2}" y="80" text-anchor="middle" font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="84" letter-spacing="1">{text}</text>'
        + f'<rect x="18" y="92" width="{W-36}" height="3" fill="#000"/><text x="{W/2}" y="114" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="15" letter-spacing="3.5">{sub}</text></mask>'
        + f'<g id="st-g" mask="url(#st-m)"><path fill="currentColor" d="M0 0H{W-Cc}L{W} {Cc}V{H}H0Z"/></g></defs>'
        + f'<use href="#st-g" transform="translate(5 6)" style="color:#FF3B30" filter="url(#st-b)"/><use href="#st-g" style="color:#ECE9E2" filter="url(#st-f)"/></svg>')
CK = '<svg class="ck" viewBox="0 0 24 24"><path d="M4.5 12.5L9.5 17.5L19.5 6.5"/></svg>'
C['Stamp'] = dict(group='Feedback', height=300, width=900, extra_css='.rg-panel .rg-seg{margin-top:12px;width:420px}', body=f'''<div class="rg-panel" style="padding:30px 34px;display:flex;align-items:center;justify-content:space-between;gap:30px">
  <div><span class="rg-label">free tweaks</span>
    {seg(30, 30)}
    <div style="display:flex;align-items:center;gap:16px;margin-top:22px"><span class="rg-btn is-lg is-done">{CK}18 tweaks applied</span><span class="rg-sub">30 of 30 on<a class="rg-undo">Undo</a></span></div></div>
  <div style="padding:10px 14px">{stamp_svg()}</div>
</div>''', readme='''# Stamp

The confirmation after **Apply**: a printed stamp lands on the card that was applied. Paper block with the word cut out, the `red` layer 5px right and 6px down, rough edges, rotated -7deg. One word on top (`APPLIED`, `RESTORED`), the count under it.

Sequence (after the click):
1. The segment bar fills cell by cell over 600ms, each new cell pops 45% taller for 160ms; the "left to apply" count goes down with it.
2. The stamp drops from 2.1x to 1x in 200ms (an ease-in "slam"), the red layer slides into place over 180ms and the card shakes 3px for 300ms.
3. The button becomes `is-done` (`bg-4`, red check, "18 tweaks applied") and the sub line offers **Undo** in `red`.
4. The page score counts up over 750ms and bumps 6% at the end.

Only for actions the player started. Never stamp something Rago did on its own.
''')

# ---- PingChart (statique, même dessin que la maquette)
V = [17,17,19,16,18,18,16,18,16,18,16,16,18,19,17,17,19,20,18,18,20,16,20,31,17,16,17,19,17,18,19,18,None,16,16,17,19,18,17,18]
def ping_svg(W=792, H=290):
    X0, X1, Y0, Y1, MAX, n = 34, W - 78, 34, H - 28, 40, len(V)
    px = lambda i: X0 + i * (X1 - X0) / (n - 1); py = lambda v: Y1 - v / MAX * (Y1 - Y0)
    val = [v for v in V if v is not None]; avg = round(sum(val) / len(val)); hi = V.index(max(val)); lo = V.index(None)
    def flt(id_, fr, sc, seed, sf, sa, sb, xs='R', ys='G'):
        return (f'<filter id="{id_}" x="-5%" y="-20%" width="110%" height="140%" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="{fr}" numOctaves="2" seed="{seed}" result="n"/>'
                f'<feDisplacementMap in="SourceGraphic" in2="n" scale="{sc}" xChannelSelector="{xs}" yChannelSelector="{ys}" result="d"/><feTurbulence type="fractalNoise" baseFrequency="{sf}" numOctaves="2" seed="{seed+6}" result="s"/>'
                f'<feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  {sa} 0 0 0 {sb}" result="sm"/><feComposite in="d" in2="sm" operator="in"/></filter>')
    segs, cur = [], []
    for i, v in enumerate(V):
        if v is None:
            if cur: segs.append(cur)
            cur = []; continue
        cur.append((px(i), py(v)))
    if cur: segs.append(cur)
    g = (f'<defs>{flt("pc-f", .5, 1.6, 5, .5, -16, 13.2)}{flt("pc-b", .4, 2.2, 17, .4, -14, 12, "G", "R")}'
         f'<pattern id="pc-dot" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.35" fill="#FF3B30"/></pattern>'
         f'<pattern id="pc-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="2.4" height="7" fill="#FF3B30" fill-opacity=".55"/></pattern>'
         f'<linearGradient id="pc-fade" x1="0" y1="{Y0}" x2="0" y2="{Y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>'
         f'<mask id="pc-m" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="url(#pc-fade)"/></mask></defs>')
    for v in (10, 20, 30, 40):
        g += f'<line x1="{X0}" x2="{X1}" y1="{py(v):.1f}" y2="{py(v):.1f}" stroke="#fff" stroke-opacity=".06"/><text x="{X0-10}" y="{py(v)+4:.1f}" text-anchor="end" font-family="Barlow Condensed" font-weight="700" font-size="12" fill="#6E6E78">{v}</text>'
    g += f'<line x1="{X0}" x2="{X1}" y1="{Y1}" y2="{Y1}" stroke="#fff" stroke-opacity=".14"/>'
    for s in range(0, n, 2):
        if s % 10: g += f'<line x1="{px(s):.1f}" x2="{px(s):.1f}" y1="{Y1}" y2="{Y1+3}" stroke="#fff" stroke-opacity=".18"/>'
    for s in range(0, n, 10):
        g += f'<line x1="{px(s):.1f}" x2="{px(s):.1f}" y1="{Y1}" y2="{Y1+6}" stroke="#fff" stroke-opacity=".3" stroke-width="2"/><text x="{px(s):.1f}" y="{Y1+21}" text-anchor="{"middle" if s else "start"}" font-family="Barlow Condensed" font-weight="800" font-style="italic" font-size="13" fill="#A1A1AA">00:{s:02d}</text>'
    g += f'<rect x="{px(lo)-7:.1f}" y="{Y0-6}" width="14" height="{Y1-Y0+6}" fill="url(#pc-hatch)"/><rect x="{px(lo)-7:.1f}" y="{Y0-6}" width="14" height="3" fill="#FF3B30"/>'
    area = ''.join(f'M{s[0][0]:.1f},{Y1}L' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in s) + f'L{s[-1][0]:.1f},{Y1}Z' for s in segs if len(s) > 1)
    g += f'<g mask="url(#pc-m)"><path d="{area}" fill="url(#pc-dot)" opacity=".55"/></g>'
    g += f'<line x1="{X0}" x2="{X1}" y1="{py(avg):.1f}" y2="{py(avg):.1f}" stroke="#FF3B30" stroke-width="2" stroke-dasharray="7 6"/>'
    line = lambda col: ''.join(f'<polyline points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in s)}" fill="none" stroke="{col}" stroke-width="3" stroke-linejoin="miter" stroke-miterlimit="4"/>' for s in segs)
    g += f'<g transform="translate(2 2.6)" filter="url(#pc-b)">{line("#FF3B30")}</g><g filter="url(#pc-f)">{line("#ECE9E2")}</g>'
    g += f'<line x1="{px(hi):.1f}" x2="{px(hi):.1f}" y1="{py(V[hi])-26:.1f}" y2="{py(V[hi])-6:.1f}" stroke="#ECE9E2" stroke-width="2"/>'
    lx, ly = segs[-1][-1]
    g += f'<rect x="{lx-5:.1f}" y="{ly-5:.1f}" width="10" height="10" fill="#FF3B30" transform="rotate(-12 {lx:.1f} {ly:.1f})"/>'
    tags = (f'<span class="rg-ptag" style="left:{X1+10}px;top:{py(avg)-11:.0f}px">avg {avg}</span>'
            f'<span class="rg-ptag" style="left:{px(hi)-26:.0f}px;top:{py(V[hi])-52:.0f}px">{V[hi]} ms</span>'
            f'<span class="rg-ptag is-red" style="left:{px(lo)-22:.0f}px;top:{Y0-34}px">lost</span>')
    return f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">{g}</svg>{tags}'
C['PingChart'] = dict(group='Data', height=545, width=900, body=f'''<section class="rg-panel rg-chart">
  <div class="ch"><h3>paris</h3><span class="rg-sub">France</span><span class="clk"><small>tested</small>00:39</span></div>
  <div class="plot">{ping_svg()}</div>
  <div class="rg-board">
    <div><span class="rg-label">best</span><b>16<small>ms</small></b></div>
    <div><span class="rg-label">worst</span><b>31<small>ms</small></b></div>
    <div><span class="rg-label">spikes</span><b>1</b></div>
    <div class="is-bad"><span class="rg-label">lost</span><b>1</b></div>
  </div>
</section>''', readme='''# PingChart

The network test result for one server, drawn like the printed icons.

- The line is `paper`, 3px, square joins, with a `red` copy 2px right and 2.6px down under it and rough edges on both.
- Under the line, `red` halftone dots fading towards the axis.
- Time runs like a match clock: `00:00`, `00:10`, `00:20`… with small ticks every 2 seconds. Values on the left every 10 ms, `ink-3`.
- The average is a dashed `red` line with an `AVG 18` paper tape at its end. The worst spike gets a paper tape with its value on a stem. A lost packet is a hatched `red` column with a `red` tape "LOST", and the line breaks there.
- The latest sample is a small `red` square tilted -12deg.
- Under the chart, a scoreboard: four skewed `bg-3` cells (best, worst, spikes, lost). A cell turns `red` with `red-ink` text only when it is a problem.

While a test runs, the line draws in from the left, the clock reads `LIVE 00:19` and the scoreboard shows dashes until the end.
''')

# ---- EmptyState
C['EmptyState'] = dict(group='Feedback', height=500, width=1100, body=solid.defs() + f'''<section class="rg-panel rg-empty">
  <span class="bg0">0</span><span class="bgdots"></span>
  <span class="ico">{solid.icon('games', 150)}</span>
  <div class="tx">
    <h2>no games<br>found</h2>
    <p>Rago looked in <b>Steam, Epic Games, Riot, Battle.net, Ubisoft Connect</b> and the <b>EA app</b>. Nothing is installed in their usual folders.</p>
    <div class="acts"><span class="rg-btn is-red is-lg">{I('plus')}add a game</span><span class="rg-btn is-lg">{I('refresh')}scan again</span></div>
    <p class="hint">Installed somewhere else? Add the game's .exe and Rago sets up its preset.</p>
  </div>
</section>''', readme='''# EmptyState

What a page shows when there is nothing to list or the page can't work (no games, offline).

- A big printed icon (130 to 150px, same build as the menu icons with the finer large-size grain), then a two-line poster title, one or two sentences, at most two actions, and a hint in `ink-3`.
- The sentence says what Rago checked and what the player can do. No apology, no mood.
- The first action is `is-red`; the second is a plain button.
- Optional background: a giant outlined count (`0`) on the right and halftone dots in the top right corner.

Examples: "No games found" (Games), "You're offline" (Network, with the top score showing `–` and "offline").
''')

# ---- ErrorDialog
C['ErrorDialog'] = dict(group='Feedback', height=520, width=900, body=solid.defs() + f'''<div class="rg-scrim"><div class="rg-dialog">
  <span class="x">{I('x')}</span>
  <div class="top"><span>{solid.icon('alert', 116)}</span><h2>no restore<br>point</h2></div>
  <p>System Protection is off on <b>drive C:</b>, so Windows can't save a restore point before Rago applies the 18 tweaks.</p>
  <div class="acts"><span class="rg-btn is-red is-lg">{I('external')}turn it on</span><span class="rg-btn is-lg">apply without it</span></div>
  <p class="hint">Rago's own Undo still works for every tweak.</p>
</div></div>''', readme='''# ErrorDialog

For an error that blocks an action the player just asked for. 600px wide, `bg-2`, `radius-panel`, `shadow-pop`, a 6px band of `red` hatching on top, over the page dimmed to 72% black.

- Printed `alert` icon (116px) next to a two-line poster title that names the problem ("No restore point").
- One paragraph: what is off, where (`drive C:` in `ink`), and what it blocks.
- Two actions: the fix first (`is-red`), then the way around it. A hint line says what still protects the player.
- Close cross top right in `ink-3`.
''')

# ---- Splash
SC = 85 / 180
_f = rmark.flt('lf', 0.44, 1.5, 4, 0.36, -16, 12.9) + rmark.flt('lb', 0.34, 2.1, 15, 0.28, -14, 11.6, 'G', 'R')
LOCKUP = (f'<svg class="lockup" width="360" height="110" viewBox="0 0 360 110"><defs>{_f}</defs><g transform="translate(6 14)">'
          f'<g transform="translate(4.5 5.2)" filter="url(#lb)"><path d="{rmark.R}" fill="#FF3B30" transform="scale({SC:.4f})"/></g>'
          f'<g filter="url(#lf)"><path d="{rmark.R}" fill="#ECE9E2" transform="scale({SC:.4f})"/></g></g>'
          f'<text x="87.5" y="104.2" fill="#FF3B30" filter="url(#lb)" font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="120" letter-spacing="0.6">AGO</text>'
          f'<text x="83" y="99" fill="#ECE9E2" filter="url(#lf)" font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="120" letter-spacing="0.6">AGO</text></svg>')
C['Splash'] = dict(group='Brand', height=420, width=900, body=f'''<div class="rg-splash">
  {LOCKUP}
  <span class="rg-tape">optimizer</span>
  <div class="st"><div class="row"><span class="msg">Ready</span><span class="pc">100<small>%</small></span></div>{seg(28, 28)}</div>
</div>''', readme='''# Splash

The window Rago shows while it starts: 600 x 360, `bg`, 16px corners, halftone dots in the top right.

- The printed lockup: R and "AGO" in `paper` with the `red` layer 4.5px right and 5.2px down, rough edges. "OPTIMIZER" on a paper tape under "GO".
- Bottom: what Rago is checking ("Checking Windows", "Reading drivers and games", "Testing your connection", then "Ready"), the percentage, and a 28-cell segment bar.

Sequence, about 2.7s:
1. 120ms: the R drops from 1.7x to 1x in 220ms, then shakes 3px for 260ms. The red layer slides from under it into place (190ms).
2. 430ms: "AGO" wipes in from the left (330ms), its red layer follows.
3. 700ms: the tape unrolls left to right (260ms).
4. 820ms: status and bar fade in; the bar fills from 1.0s to 2.7s.
''')
