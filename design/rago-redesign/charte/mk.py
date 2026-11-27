import json, pathlib
HERE = pathlib.Path(__file__).parent
OUT = HERE.parent / 'ds' / 'project' / 'components'
P = json.loads((HERE / 'icons.json').read_text())
R_PATH = 'M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z'
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap">'

def I(name, cls='rg-i'):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true">{P[name]}</svg>'

def R():
    return f'<svg viewBox="0 0 164 180" aria-hidden="true"><path d="{R_PATH}"/></svg>'

def seg(n, f, m=0):
    return '<div class="rg-seg">' + ''.join('<i class="f"></i>' if k < f else ('<i class="m"></i>' if k < f + m else '<i></i>') for k in range(n)) + '</div>'

def page(name, group, height, body, extra_css='', width=None, ground='rg-ground'):
    w = f' width={width}' if width else ''
    return f'''<!-- @dsCard group="{group}" height={height}{w} -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{name}</title>
{FONTS}
<style>
html,body{{margin:0;background:var(--bg)}}
.stage{{padding:24px 28px;min-height:100%}}
.cap{{display:block;margin:0 0 10px}}
{extra_css}
</style>
</head>
<body>
<div class="{ground} stage">
{body}
</div>
</body>
</html>
'''

C = {}

# ---------------- Brand ----------------
C['Logo'] = dict(group='Brand', height=170, body=f'''<div class="rg-row" style="gap:56px;align-items:flex-end">
  <div class="rg-logo is-xl">{R()}<b>AGO</b></div>
  <div class="rg-col" style="gap:18px">
    <div class="rg-logo">{R()}<b>AGO</b></div>
    <span class="rg-label">sidebar lockup, 22px mark, 31px letters</span>
  </div>
</div>''', readme='''# Logo

The Rago R in red, used as the first letter of RAGO: the mark followed by "AGO" set in `nav`-weight Barlow Condensed 900 italic, uppercase, reads as one word.

**Use**
- Sidebar top: mark 22px high in `red`, "AGO" at 31px in `ink`, 1px gap, letters aligned on the mark's baseline (`rg-logo`).
- Large lockup on splash or installer: same ratio (mark height = 0.71 × letter size).
- Files: `assets/Logos/rago-mark.svg` (red) is the source; `rago-mark-white.svg` only on a red or photo ground; `rago-app-icon.svg` for the taskbar and .exe; `rago-app-tile.svg` where an opaque square is required; `rago-favicon.svg` under 32px.

**Do not**
- Rotate, skew, outline, recolour (other than white on red or photo), add a gradient, a glow or a neon edge to the mark. The skew of the interface never applies to the logo.
- Set "AGO" in another face or in sentence case.
- Use the v1.2 Geist wordmark (`rago-wordmark-*.svg`) inside the v5 app; keep it for places that already use it (site, installer) until a v5 wordmark file exists.
''')

# ---------------- Actions ----------------
C['Button'] = dict(group='Actions', height=170, body=f'''<div class="rg-col" style="gap:22px">
  <div class="rg-row">
    <span class="rg-btn is-red is-lg">{I('zap')}apply 18 free tweaks</span>
    <span class="rg-btn is-red">{I('refresh')}test again</span>
    <span class="rg-btn">{I('power')}turn off</span>
    <span class="rg-btn is-sm">{I('check')}select safe</span>
    <span class="rg-link">restore</span>
  </div>
  <div class="rg-row">
    <span class="rg-btn is-red is-pressed">{I('zap')}applying</span>
    <span class="rg-btn is-sm">{I('activity')}stability test</span>
    <span class="rg-btn is-sm">{I('gauge')}bufferbloat test</span>
  </div>
</div>''', readme='''# Button

A skewed button: the label stays upright, the fill behind it leans by `angle-skew` with `radius-btn` corners. Labels are verbs, uppercase through the style (`btn`), written in lowercase in the source.

**Variants** (`rg-btn` plus)
- `is-red`: the one main action of a view (apply, test again, analyze). `red` fill, `red-ink` label, `shadow-glow`. One per view, plus the one in the apply bar.
- default: `bg-3` fill, `line-2` border, `ink` label, for secondary actions (turn off, run again, undo all).
- `is-lg` (54px, `btn-lg`, `radius-btn-lg`) for the hero action of a panel; `is-sm` (32px, `btn-sm`, `radius-btn-sm`) for tools and section actions.
- `is-pressed` on a red button while it works: `red-deep` fill, `ink` label.
- `rg-link`: a text action (restore, clear), never a box.

**Consumer provides** the label (verb first: "apply 6 tweaks", "test all", "restart now") and an optional 15px Lucide icon before it. Use `zap` only for apply.

**Do not** put two red buttons side by side, use white text on red, or add an arrow after the label.
''')

C['Tabs'] = dict(group='Actions', height=96, body=f'''<div class="rg-tabs">
  <span class="rg-tab is-on">tweaks <em>3</em></span>
  <span class="rg-tab">packet optimizer</span>
  <span class="rg-tab">network test</span>
  <span class="rg-tab">rago route</span>
</div>''', readme='''# Tabs

Skewed tabs that switch the sub-pages of a module (Network: tweaks, packet optimizer, network test, rago route).

- `rg-tabs` holds `rg-tab` items, 4px apart (`space-4`), 34px high (`size-tab`), `tab` style.
- The current tab is `is-on`: `red` fill, `red-ink` label. Others sit on `bg-2` with a `line` border and `ink-2` label.
- An `<em>` after the label holds a count (pending changes on that tab), in `ink-3`, darkened on the red tab.
- Place the row under the page head, with the module's tool button (for example "restart network card", `rg-btn is-sm`) at the far right.
''')

C['Chip'] = dict(group='Actions', height=80, body=f'''<div class="rg-row" style="gap:10px">
  <span class="rg-chip">{I('lock')}premium</span>
  <span class="rg-chip is-red">free plan</span>
  <span class="rg-chip is-ghost">{I('net')}fiber detected</span>
  <span class="rg-chip is-ghost">beta</span>
  <span class="rg-chip is-red"><i class="rg-dot"></i>live</span>
</div>''', readme='''# Chip

A small uppercase tag, 24px high (`size-chip`), `chip` style, `radius-chip` corners. Not skewed.

- default: `bg-4` fill, `ink` text, for plan and state tags (premium, admin).
- `is-red`: a tag that must be seen (free plan, live). Keep to one per panel.
- `is-ghost`: `line-2` outline, `ink-2` text, for detected facts (fiber detected, beta).
- `is-cover`: `fx-cover-shade` fill on a game cover, for the launcher name.
- An optional 12px icon or a `rg-dot` comes first. Two to three words at most.
''')

# ---------------- Controls ----------------
C['Switch'] = dict(group='Controls', height=100, body='''<div class="rg-row" style="gap:28px">
  <span class="rg-col" style="gap:8px;align-items:flex-start"><i class="rg-sw"></i><span class="rg-label">off</span></span>
  <span class="rg-col" style="gap:8px;align-items:flex-start"><i class="rg-sw is-on"></i><span class="rg-label">on, applied</span></span>
  <span class="rg-col" style="gap:8px;align-items:flex-start"><i class="rg-sw is-pend"></i><span class="rg-label">pending</span></span>
</div>''', readme='''# Switch

A skewed 46 × 24 switch with a square knob, `radius-chip` track and `radius-xs` knob.

- off: `bg-4` track, `ink-2` knob on the left.
- `is-on` (applied): `red` track, `red-ink` knob on the right.
- `is-pend` (chosen, not applied yet): red hatch at `angle-carbon` with a 1.5px `red` inset outline, `ink` knob on the right. It turns into `is-on` once the apply bar has run.
- In the app a switch always lives inside a setting tile (`Tile`), and the whole tile toggles it.
''')

C['Tile'] = dict(group='Controls', height=240, body=f'''<div class="rg-tiles">
  <div class="rg-tile"><span class="nm">no nagle delay</span><i class="rg-sw"></i></div>
  <div class="rg-tile is-on"><span class="nm">dns cache first</span>{I('zap')}<i class="rg-sw is-on"></i></div>
  <div class="rg-tile is-pend"><span class="nm">msi mode</span><i class="rg-sw is-pend"></i></div>
  <div class="rg-tile is-hover"><span class="nm">tcp/ip tuning</span><i class="rg-sw"></i></div>
  <div class="rg-tile"><span class="nm">connection</span><span class="val">fiber / ethernet</span>{I('chev','rg-i end')}</div>
  <div class="rg-tile is-adv"><span class="nm">advanced</span><em>5</em>{I('chev','rg-i end')}</div>
  <div class="rg-tile is-add">{I('plus')}<span class="nm">phone 4g</span><small>about 80 MB per hour</small></div>
</div>''', readme='''# Tile

A setting tile: the whole 56px tile is the switch (`size-tile`, `radius-tile`), laid out three per row with 8px gaps (`rg-tiles`, `--cols`).

**States** (`rg-tile` plus)
- rest: `bg-2`, `line` border, name in `ink-2`.
- `is-on`: `bg-3`, name in `ink`, switch on.
- `is-pend`: red border at 55%, name in `ink`, hatched switch.
- `is-hover`: `bg-4`, `line-2` border; opens the Popover below the tile.
- value tile: a `.val` in `ink` and a chevron instead of a switch (opens a choice).
- `is-adv`: dashed `line-2` border on faint carbon stripes, a count in `ink-3` and a chevron. Folds the advanced and expert items.
- `is-add`: dashed border, red plus, a hint at the right. Adds something optional (backup paths).

**Consumer provides** a short name of two to four words (no nagle delay, msi mode), and the `zap` icon after the name when the change needs no restart.
''')

C['ChoiceOptions'] = dict(group='Controls', height=230, extra_css='.rg-prof{max-width:560px}', body=f'''<div class="rg-row" style="align-items:stretch">
<div class="rg-prof rg-carbon" style="flex:1.42">
  <h3>hitreg {I('info')}</h3>
  <div class="rg-opts">
    <span class="rg-opt">better</span><span class="rg-opt is-on">best</span><span class="rg-opt">balanced</span>
    <span class="rg-opt">hypixel</span><span class="rg-opt">slowest</span><span class="rg-opt is-off">off</span>
  </div>
</div>
<div class="rg-prof rg-carbon" style="flex:1">
  <h3>ping</h3>
  <div class="rg-opts" style="--cols:4">
    <span class="rg-opt is-num">1</span><span class="rg-opt is-num is-pend">2</span><span class="rg-opt is-num">3</span><span class="rg-opt is-num">4</span>
    <span class="rg-opt is-off is-wide is-now">off</span>
  </div>
</div>
</div>''', readme='''# ChoiceOptions

A profile card with one choice among a few levels, "off" included. Replaces a dropdown or a stack of switches when the options exclude each other.

- Card: `rg-prof` (`bg-2`, `radius-bar`), title in `card-title` with an optional info icon, carbon stripes on the right (`rg-carbon`).
- Options: `rg-opts` grid (`--cols`, 6px gaps) of skewed `rg-opt` cells, 46px high, `option` style, `radius-option`.
- `is-on`: the applied option, `red` fill and `red-ink` label.
- `is-pend`: the option chosen but not applied, red hatch with a `red` outline.
- `is-now`: what Windows has now when Rago changed nothing, `bg-4` with a `line-2` outline.
- `is-off`: the off option in `ink-3`; `is-wide` makes it span the row; `is-num` sets numeric levels in 27px italic.
- Exactly one option is on or now; at most one is pending.
''')

C['SegmentBar'] = dict(group='Controls', height=220, extra_css='.w{width:520px}', body=f'''<div class="rg-col w" style="gap:22px">
  <div><span class="rg-label cap">free tweaks, 12 of 30</span>{seg(30, 12)}</div>
  <div><span class="rg-label cap">level 3 of 24</span>{seg(24, 3)}</div>
  <div><span class="rg-label cap">load, 14% used and 41% cached</span>{seg(20, 3, 6)}</div>
</div>''', readme='''# SegmentBar

A meter made of skewed segments, 14px high (16px `is-lg`), 3px apart (`space-3`), `radius-seg` corners.

- `i.f` filled segments in `red` show progress or what is on.
- `i.m` segments in `ink-2` show a second, neutral quantity (cached, reserved).
- Empty segments are `bg-4`.
- Pick a count that divides the real total (30 free tweaks = 30 segments, 24 levels = 24). Always pair the bar with the number in words or digits.
- As a slider (Packet Optimizer faders) add a 12 × 28 `ink` knob skewed by `angle-skew`, with a 4px `bg-2` ring.
''')

# ---------------- Headers ----------------
spark = ''.join(f'<i style="--h:{h}"{" class=\"pk\"" if k == 17 else ""}></i>' for k, h in enumerate([.38,.42,.36,.4,.45,.39,.35,.41,.37,.43,.4,.36,.38,.44,.39,.36,.42,.9,.4,.37,.41,.38,.36,.4]))
C['PageHead'] = dict(group='Headers', height=250, width=1180, extra_css='.head{display:flex;align-items:flex-end;justify-content:space-between;padding:10px 0 6px}', body=f'''<div class="rg-halftone rg-grain" style="position:absolute;inset:0;pointer-events:none"></div>
<div class="head">
  <div>
    <div class="rg-kick">network <b>//</b> ping, stability and hit registration</div>
    <div class="rg-title" data-t="network">network</div>
  </div>
  <div class="rg-sig">
    <div class="v"><b>18</b><span>ms<small>paris</small></span></div>
    <div class="rg-spark">{spark}</div>
  </div>
</div>''', readme='''# PageHead

The top of every module page: a kick line, the page title, and at the right the page's signature block.

- Kick: `rg-kick` (`kick` style, `ink-2`), module name, a red `//`, then what the page is for in a few words.
- Title: `rg-title` (`title` style, 150px, uppercase), one or two words. Set `data-t` to the same text: it draws the outline echo 14px right and 12px up at 20% white. The red brush stroke (`assets/Textures/brush.svg`) sits under the lower part of the letters, rotated by `angle-brush`.
- Right: one SignatureBlock with the page's live number (ping for Network, tweaks on for Dashboard).
- Behind: halftone dots in the top right of the window (`rg-halftone`) and grain over the whole window (`rg-grain`, `opacity-grain`).
- The brush appears once per page, under the title only.
''')

C['SignatureBlock'] = dict(group='Headers', height=210, body=f'''<div class="rg-row" style="gap:40px;padding-left:20px">
<div class="rg-sig">
  <div class="v"><b>18</b><span>ms<small>paris</small></span></div>
  <div class="rg-spark">{spark}</div>
</div>
<div class="rg-sig">
  <div class="v"><b>21</b><span>on<small>of 212</small></span></div>
  {seg(24, 3)}
</div>
</div>''', extra_css='.rg-sig .rg-seg i{background:rgba(10,10,11,.25)}.rg-sig .rg-seg i.f{background:rgba(10,10,11,.85)}', readme='''# SignatureBlock

The one loud block of a page: a `red` field skewed by `angle-skew` whose left edge is torn (mask `assets/Textures/num-left.svg`), with halftone dots (`fx-halftone-on-red`) fading in from the top right. 322 × 158.

- Holds one live number in `num-hero` (118px) with its unit and context stacked beside it (ms / paris, on / of 212), all `red-ink`.
- Under the number, a small chart in `red-ink`: a 24-bar spark of the last pings (the spike lighter), or a segment bar.
- One per page, top right, in the PageHead. It is the only torn element besides the section tapes; the apply bar is never torn.
''')

C['SectionTape'] = dict(group='Headers', height=165, body=f'''<div class="rg-col" style="gap:26px">
  <div class="rg-sh"><h2 class="rg-tape">settings</h2><span class="cnt">5<small> / 14</small></span><span class="rg-btn is-sm">{I('check')}select safe</span></div>
  <div class="rg-sh"><h2 class="rg-tape">your pc</h2><span class="rg-live"><i class="rg-dot"></i>live</span></div>
</div>''', readme='''# SectionTape

A section title in `h2` (30px, uppercase, `red-ink`) on a strip of torn paper (`paper`, mask `assets/Textures/tape.svg`, rotated by `angle-tape`).

- Row `rg-sh`: the tape, then optional context (a count `5 / 14`, a live dot), then a small action pushed to the right.
- 16px (`space-16`) between the row and the section content; 40px (`space-40`) between sections.
- One tape per section, one or two words. Never on a panel title or inside a card.
''')

# ---------------- Surfaces ----------------
C['Panel'] = dict(group='Surfaces', height=230, extra_css='.score{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:44px;padding:26px 30px;--carbon-w:340px}.gr b{display:block;font-family:var(--font-display);font-weight:900;font-style:italic;font-size:88px;line-height:.78;text-transform:uppercase}.gr span{display:block;margin-top:10px;font-family:var(--font-display);font-weight:900;font-style:italic;font-size:22px;line-height:.9;text-transform:uppercase;color:var(--ink-2)}.mets{display:flex;gap:46px;padding-left:44px;border-left:1px solid var(--line-2)}.met b{display:block;font-family:var(--font-display);font-weight:900;font-style:italic;font-size:64px;line-height:.78}.met b small{font-size:22px;color:var(--ink-2);margin-left:4px}.met .rg-label{display:block;margin-top:10px}.ag{display:flex;flex-direction:column;align-items:flex-end;gap:10px}', width=1080, body=f'''<section class="rg-panel rg-carbon score">
  <div class="gr"><b>great</b><span>connection</span></div>
  <div class="mets">
    <div class="met"><b>18<small>ms</small></b><span class="rg-label">ping</span></div>
    <div class="met"><b>2<small>ms</small></b><span class="rg-label">jitter</span></div>
    <div class="met"><b>0<small>%</small></b><span class="rg-label">loss</span></div>
  </div>
  <div class="ag"><span class="rg-btn is-red">{I('refresh')}test again</span><span class="rg-sub">tested 2 min ago</span></div>
</section>''', readme='''# Panel

The base surface: `bg-2`, 1px `line` border, `radius-panel`, 22 to 30px padding. Panels sit on `bg` 14px apart.

- Add `rg-carbon` for the carbon effect: `fx-carbon` stripes at `angle-carbon` over the right 220 to 340px (`--carbon-w`), faded in from the left. Use it on hero panels, profile cards and the apply bar, not on every panel of a page.
- A split panel puts its state column on `bg-3` with a `line` divider (Rago Route).
- Inside, hierarchy comes from type size and ink steps, not from nested borders or shadows. Dividers are 1px `line` or `line-2`.
- Example: the Network test score panel, a verdict in `grade`, three `metric` numbers with `label` captions, the main action at the right.
''')

C['StatTile'] = dict(group='Surfaces', height=160, width=980, body='''<div class="rg-stats">
  <div class="rg-stat"><b>1,284</b><span class="rg-label">packets saved</span></div>
  <div class="rg-stat"><b>37</b><span class="rg-label">packets repaired</span></div>
  <div class="rg-stat"><b>12</b><span class="rg-label">resends</span></div>
  <div class="rg-stat"><b>0.3<small>ms</small></b><span class="rg-label">engine delay</span></div>
</div>''', readme='''# StatTile

A measured number with its caption: `stat` style (52px), unit at 20px in `ink-2`, a `label` caption under it. `bg-2` card with `radius-card`, laid out four per row with 10px gaps (`rg-stats`, `--cols`).

- Only real, measured values; no decorative totals.
- `b.is-bad` turns a number `red` when it is a problem (lost packets).
- Captions are two or three words in lowercase source text.
''')

C['ApplyBar'] = dict(group='Surfaces', height=232, extra_css='.stack{display:flex;flex-direction:column;align-items:center;gap:22px;padding:6px 0}', body=f'''<div class="stack">
  <div class="rg-bar rg-carbon"><b>3</b><span class="lb">changes ready<small>{I('rotate')}restart needed for 2</small></span><span class="rg-link">clear</span><span class="rg-btn is-red">{I('zap')}apply</span></div>
  <div class="rg-bar rg-carbon"><b>hitreg</b><span class="lb">not applied yet<small>{I('wifi')}drops for a few seconds</small></span><span class="rg-link">restore</span><span class="rg-btn is-red">{I('zap')}apply</span></div>
</div>''', readme='''# ApplyBar

The bar that applies pending changes, floating 24px above the bottom of the window, centred on the main column. Straight and rounded: never torn, never skewed.

- 640 × 72 (`size-bar`), `fx-glass` with a 24px backdrop blur, `line-2` border, `radius-bar`, `shadow-float`, carbon stripes over its right 300px.
- Left: the count or profile name in `bar-name` (`red`), then a two-line label (what is ready, and the consequence: restart needed, drops for a few seconds) with a 12px icon.
- Right: a text action (clear or restore) and the red apply button with the `zap` icon.
- It appears only when something is pending, and leaves once applied (or shows "applied / restart to finish" with a restart button).
''')

C['Popover'] = dict(group='Surfaces', height=170, body='''<div style="padding-top:8px">
<div class="rg-pop">
  <p>Tunes Windows TCP/IP so small game packets leave sooner.</p>
  <div class="ft"><b class="g">+</b>Rarely measurable in games</div>
  <div class="ft"><b>&minus;</b>No known drawback</div>
</div>
</div>''', readme='''# Popover

The hover detail of a setting tile: one sentence on what it does, then one plus and one minus. Light on dark: `ink` card, `bg` text (`pop` style), `radius-tile`, `shadow-pop`, a small pointer towards the tile.

- 318px wide, placed 8px under the tile it explains, above later tiles.
- Plus line: red badge with `red-ink` +. Minus line: `bg-4` badge with `ink` −. Secondary text in `pop-muted`.
- Honest wording: say "rarely measurable" when it is. No marketing claims.
''')

# ---------------- Navigation ----------------
nav = [('grid','dashboard',''),('net','network','24'),('gauge','latency','18'),('gpu','graphics card','21'),('windows_','windows','42'),('crosshair','hitreg','12'),('box','minecraft','15'),('pad','games','10')]
items = []
for ic, lab, n in nav:
    icon = I('monitor') if ic == 'windows_' else I(ic)
    on = ' class="is-on"' if lab == 'network' else ''
    em = f'<em>{n}</em>' if n else ''
    items.append(f'<a{on}>{icon}{lab}{em}</a>')
C['Sidebar'] = dict(group='Navigation', height=560, extra_css='.stage{padding:0}.rg-side{height:560px}', body=f'''<nav class="rg-side">
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
- Groups start with a `label` heading; items are `nav` style (18px, 900 italic, uppercase) with a 16px icon and a right-aligned count of tweaks in `ink-3`.
- Current item `is-on`: `ink` text, `red` icon and count, a 3px `red` bar on the left and a `fx-red-wash` fading to the right.
- Bottom: the PC card (`bg-3`, `radius-btn-lg`, carbon stripes) with the tweaks on, then the motto "Every millisecond counts." in `ink-3`.
''')

# ---------------- Content ----------------
C['PresetCard'] = dict(group='Content', height=190, width=1080, body=f'''<div class="rg-presets">
  <div class="rg-preset is-on">{I('crosshair')}<em class="ck">{I('check')}</em><b>hitreg</b><span>Your hits leave instantly</span></div>
  <div class="rg-preset">{I('download')}<b>knockback</b><span>Server hits land instantly</span></div>
  <div class="rg-preset">{I('sliders')}<b>balanced</b><span>Downloads stay fast</span></div>
  <div class="rg-preset">{I('wifi')}<b>wi-fi</b><span>Full power, no hopping</span></div>
  <div class="rg-preset">{I('alert')}<b>packet loss</b><span>4G, ADSL or a busy home</span></div>
  <div class="rg-preset">{I('drive')}<b>old-school</b><span>Fixed 64 KB window</span></div>
</div>''', readme='''# PresetCard

A ready-made setup to pick by the problem it solves. 140px high, `bg-2`, `radius-card`, six per row.

- Icon (22px, `ink-2`) at the top, name in `preset` style at the bottom, one sentence under it in `ink-2` saying the result for the player.
- Selected: `is-on`, `red` card with `red-ink` text and icon, halftone dots from the top right, and a check badge (`.ck`, `red-ink` square with a `red` check).
- One preset is selected at a time; choosing one sets the faders and tiles below it.
''')

C['GameCard'] = dict(group='Content', height=270, width=980, body=f'''<div class="rg-games">
  <div class="rg-game is-sel">
    <div class="rg-poster" style="--p1:#ff3b30;--p2:#16070a;--p3:#f5f5f6;--gs:74px"><span class="band"></span><span class="gl">valorant</span><span class="rg-chip is-cover">riot client</span></div>
    <div class="info"><div><b>valorant</b><span class="rg-sub">21 tweaks on</span></div><span class="rg-sq is-red">{I('check')}</span></div>
  </div>
  <div class="rg-game">
    <div class="rg-poster" style="--p1:#3ddc97;--p2:#08130e;--p3:#f5f5f6;--gs:64px"><span class="band"></span><span class="gl">minecraft</span><span class="rg-chip is-cover">lunar client</span></div>
    <div class="info"><div><b>minecraft</b><span class="rg-sub">not optimized yet</span></div><span class="rg-sq">{I('play')}</span></div>
  </div>
  <div class="rg-game">
    <div class="rg-poster" style="--p1:#f5f5f6;--p2:#17171a;--p3:#ff3b30;--gs:110px"><span class="band"></span><span class="gl">cs2</span><span class="rg-chip is-cover">steam</span></div>
    <div class="info"><div><b>counter-strike 2</b><span class="rg-sub">not optimized yet</span></div><span class="rg-sq">{I('play')}</span></div>
  </div>
</div>''', readme='''# GameCard

A game or profile as a match poster: a 2.14:1 cover, then the name, a sub line and a square skewed action. `bg-2`, `radius-card`.

- Cover: the game's own art when Rago has it; otherwise a generated poster (`rg-poster`): a flat colour (`--p2`), halftone dots, a band rotated -16deg in `--p1`, and the name in huge 900 italic letters bleeding off the bottom left in `--p3`.
- Launcher chip (`is-cover`) top left on the cover.
- Selected: `is-sel`, `red` border with `shadow-selected` and a 3px red line under the cover; its action square turns `red`.
- Name in 20px 800 uppercase, sub line (`sub`) with the state (21 tweaks on, not optimized yet).
''')

exec((HERE / 'mk2.py').read_text())

for name, c in C.items():
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    (d / 'preview.html').write_text(page(name, c['group'], c['height'], c['body'], c.get('extra_css', ''), c.get('width')))
    (d / 'README.md').write_text(c['readme'])
print(len(C), 'components')
