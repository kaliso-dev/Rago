# Lot 4 : page Tweaks (tweaks.html) : téléchargement + catalogue des 218 réglages. Textes repris de site/tweaks.html.
# Le plan gratuit est affiché à 73 réglages (décision du 10/11, q68) ; la page en ligne dit encore 68 (question q75 du vault).
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_site as G
from gen_route import page

OUT = G.OUT

CSS = r'''
.tw-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 500px;gap:60px;align-items:center;padding:80px 0 70px}
.tw-hero .s-dots{right:-120px;top:-40px;width:760px;height:560px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 65%)}
.tw-hero h1{position:relative;margin-top:24px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:104px;line-height:.84;text-transform:uppercase;letter-spacing:-.01em}
.tw-hero h1 span{display:block}
.tw-hero h1 .br{position:relative;display:inline-block;isolation:isolate}
.tw-hero h1 .br::after{content:"";position:absolute;z-index:-1;left:-24px;right:-50px;top:30%;height:76%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.tw-facts{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;gap:10px 28px;margin-top:28px}
.tw-facts li{font-size:14px}
.tw-dl{padding:28px}
.tw-dl .hd{display:flex;align-items:center;gap:16px}
.tw-dl .hd img{width:58px;height:58px}
.tw-dl .hd b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:.9;text-transform:uppercase}
.tw-dl .hd span{display:block;margin-top:4px;font-size:13.5px;color:var(--ink-2)}
.tw-dl .hd .s-tag{margin-left:auto;color:var(--ok);box-shadow:inset 0 0 0 1px rgba(52,199,89,.45)}
.tw-dl .fl{margin-top:22px;padding:16px 18px;background:var(--bg-3)}
html.round .tw-dl .fl{border-radius:14px}
.tw-dl .fl .t{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600}
.tw-dl .fl .t svg{width:16px;height:16px;color:var(--red)}
.tw-dl .fl .t em{margin-left:auto;font-style:normal;font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px}
.tw-dl .fl .s-seg{margin-top:12px}
.tw-dl ol{display:grid;gap:14px;margin-top:22px}
.tw-dl li{display:grid;grid-template-columns:30px 1fr;gap:14px}
.tw-dl li > i{width:30px;height:30px;display:grid;place-items:center;font-family:var(--cond);font-weight:900;font-style:italic;font-size:17px;color:var(--red-ink);background:var(--red);transform:skewX(var(--skew))}
.tw-dl li b{display:block;font-size:14.5px;font-weight:600}
.tw-dl li span{display:block;margin-top:3px;font-size:13px;line-height:1.5;color:var(--ink-2)}
.tw-dl .safe{display:flex;align-items:center;gap:10px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line);font-size:13px;color:var(--ink-2)}
.tw-dl .safe svg{width:16px;height:16px;color:var(--red)}

.tw-stats{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.tw-stats div{padding:28px 0 26px 28px;border-left:1px solid var(--line)}
.tw-stats div:first-child{border-left:0;padding-left:0}
.tw-stats b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:76px;line-height:.8}
.tw-stats div:nth-child(3) b{color:var(--red)}
.tw-stats span{display:block;margin-top:10px;font-size:14px;line-height:1.4;color:var(--ink-2)}

.tw-pr{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:56px}
.tw-p{display:grid;grid-template-columns:44px 1fr;gap:16px;padding:24px 26px}
.tw-p .ic{width:44px;height:44px;display:grid;place-items:center;background:rgba(255,59,48,.12);color:var(--red)}
.tw-p .ic svg{width:20px;height:20px}
html.round .tw-p .ic{border-radius:12px}
.tw-p h4{font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;line-height:.95;text-transform:uppercase}
.tw-p p{margin-top:6px;font-size:14px;line-height:1.5;color:var(--ink-2)}

/* catalogue */
.tw-cat{display:grid;grid-template-columns:290px 1fr;gap:20px;margin-top:56px;align-items:start}
.tw-side{padding:22px 18px}
.tw-side h4{padding:0 8px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;text-transform:uppercase}
.tw-side .tw-gl{margin:18px 8px 6px;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.tw-side .sc{display:flex;align-items:center;gap:12px;height:40px;padding:0 10px;font-size:14px;color:var(--ink-2)}
.tw-side .sc svg.pi{width:20px;height:20px;flex:none}
.tw-side .sc em{margin-left:auto;font-style:normal;font-family:var(--cond);font-weight:800;font-size:14px;color:var(--ink-3)}
.tw-side .sc.on{color:var(--ink);background:linear-gradient(90deg,rgba(255,59,48,.14),rgba(255,59,48,0) 85%);box-shadow:inset 3px 0 0 var(--red)}
.tw-side .sc.on em{color:var(--ink)}
.tw-side .sc .all{width:20px;height:20px;display:grid;place-items:center;color:var(--red)}
.tw-side .sc .all svg{width:18px;height:18px}
html.round .tw-side .sc{border-radius:10px}
.tw-side .cb{display:flex;align-items:center;gap:12px;height:36px;padding:0 10px;font-size:14px;color:var(--ink-2)}
.tw-side .cb i{width:18px;height:18px;border:1.5px solid var(--line-2)}
html.round .tw-side .cb i{border-radius:5px}
.tw-side .hw{display:flex;flex-wrap:wrap;gap:6px;padding:4px 8px 0}
.tw-side .hw span{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;background:var(--bg-3);border:1px solid var(--line);font-size:13px;color:var(--ink-2)}
.tw-side .hw span em{font-style:normal;font-family:var(--cond);font-weight:800;color:var(--ink-3)}
html.round .tw-side .hw span{border-radius:8px}
.tw-main .s-srch{margin:0}
.tw-main .s-srch .in{height:54px;border:0;font-size:16px;color:var(--ink-3)}
html.round .tw-main .s-srch{border-radius:14px}
.tw-try{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13.5px;color:var(--ink-3)}
.tw-try span{height:30px;padding:0 12px;display:inline-grid;place-items:center;background:var(--bg-2);border:1px solid var(--line);color:var(--ink-2)}
html.round .tw-try span{border-radius:8px}
.tw-try b{margin-left:auto;font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.tw-sec{display:flex;align-items:center;gap:16px;margin-top:30px;padding:20px 22px;background:var(--bg-2);border:1px solid var(--line)}
html.round .tw-sec{border-radius:18px}
.tw-sec svg.pi{width:40px;height:40px}
.tw-sec b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:36px;line-height:.85;text-transform:uppercase}
.tw-sec span{display:block;margin-top:4px;font-size:14px;color:var(--ink-2)}
.tw-sec em{margin-left:auto;font-style:normal;font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;color:var(--ink-3)}
.tw-grp{display:flex;align-items:center;gap:10px;margin:22px 4px 8px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.tw-grp::after{content:"";flex:1;height:1px;background:var(--line)}
.tw-r{display:grid;grid-template-columns:1fr auto 18px;gap:20px;align-items:center;padding:14px 18px;margin-top:4px;background:var(--bg-2);border:1px solid var(--line)}
html.round .tw-r{border-radius:14px}
.tw-r .nm{display:flex;align-items:center;gap:8px;font-size:15.5px;font-weight:600}
.tw-r .ds{margin-top:4px;font-size:13.5px;line-height:1.45;color:var(--ink-2)}
.tw-r .hp{display:flex;gap:6px}
.tw-r .hp span{height:26px;padding:0 10px;display:inline-grid;place-items:center;background:var(--bg-3);font-size:12.5px;color:var(--ink-2)}
html.round .tw-r .hp span{border-radius:7px}
.tw-r > svg{width:18px;height:18px;color:var(--ink-3)}
.pl5{height:20px;padding:0 7px;display:inline-grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase}
.pl5.p{color:var(--red);box-shadow:inset 0 0 0 1px rgba(255,59,48,.5)}
.pl5.f{color:var(--ok);box-shadow:inset 0 0 0 1px rgba(52,199,89,.45)}
.pl5.a{color:#F5A524;box-shadow:inset 0 0 0 1px rgba(245,165,36,.45)}
.pl5.r{color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--line-2)}
html.round .pl5{border-radius:6px}
.tw-r.open{display:block;padding:20px 22px 22px;border-color:rgba(255,59,48,.45);box-shadow:inset 3px 0 0 var(--red)}
.tw-r.open .top{display:grid;grid-template-columns:1fr auto 18px;gap:20px;align-items:center}
.tw-r.open .top > svg{width:18px;height:18px;color:var(--red);transform:rotate(180deg)}
.tw-r .lg{margin-top:16px;max-width:820px;font-size:14.5px;line-height:1.6;color:var(--ink-2)}
.tw-spec{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:18px}
.tw-spec div{padding:12px 14px;background:var(--bg-3)}
html.round .tw-spec div{border-radius:10px}
.tw-spec dt{font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.tw-spec dd{margin-top:4px;font-size:14px;font-weight:600}
.tw-spec dd small{display:block;margin-top:2px;font-size:12.5px;font-weight:400;color:var(--ink-3)}
.tw-opt{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:16px}
.tw-opt b{margin-right:8px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.tw-opt span{height:30px;padding:0 12px;display:inline-grid;place-items:center;background:var(--bg-3);border:1px solid var(--line);font-size:13px}
.tw-opt span.pr{color:var(--red);border-color:rgba(255,59,48,.45)}
html.round .tw-opt span{border-radius:8px}
.tw-nts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}
.tw-nts > div{display:grid;grid-template-columns:30px 1fr;gap:12px;padding:14px 16px;background:var(--bg-3)}
html.round .tw-nts > div{border-radius:12px}
.tw-nts .ic{width:30px;height:30px;display:grid;place-items:center}
.tw-nts .ic svg{width:16px;height:16px}
.tw-nts .ok .ic{background:rgba(52,199,89,.12);color:var(--ok)}
.tw-nts .wa .ic{background:rgba(245,165,36,.12);color:#F5A524}
.tw-nts .ap .ic{background:rgba(255,59,48,.12);color:var(--red)}
html.round .tw-nts .ic{border-radius:8px}
.tw-nts b{display:block;font-size:13.5px;font-weight:600}
.tw-nts p{margin-top:4px;font-size:13px;line-height:1.5;color:var(--ink-2)}
.tw-more{display:flex;align-items:center;justify-content:center;gap:8px;height:48px;margin-top:4px;border:1px dashed var(--line-2);font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.tw-more svg{width:15px;height:15px}
html.round .tw-more{border-radius:14px}
.tw-fade{position:relative;height:0}
.tw-fade::before{content:"";position:absolute;left:-20px;right:0;bottom:0;height:200px;background:linear-gradient(180deg,rgba(10,10,11,0),var(--bg));pointer-events:none}
.s-final .fine{margin-top:20px;font-size:13px;color:rgba(10,10,11,.7)}
'''

NET = [
    ('hit registration', [('Hitreg profile', 'Adjusts how your PC takes in game data, with hitreg profiles and a Default to undo it.', [], ['Hitreg', 'Connection']),
                          ('Packet optimization', 'Sends game data in smaller pieces or marks Minecraft traffic as a priority for your router.', ['r'], ['Connection', 'Hitreg'])]),
    ('ping', [('Ping optimization', 'Tunes your network card and connection settings to help even out small ping spikes.', ['r'], ['Connection']),
              ('Advanced network config', 'Applies a whole pack of network card and connection changes at once.', ['a', 'r'], ['Connection'])]),
    ('game profile', [('Network profile', 'Sets how your connection treats game data, with profiles for hitreg, knockback or priority.', [], ['Connection', 'Hitreg'])]),
    ('individual settings', [("Disable Nagle's algorithm", 'Sends small pieces of network data right away instead of holding them back to group them.', ['r'], ['Connection']),
                             ('Disable NIC power saving', 'Keeps your network card from sleeping or saving power, which can cause small lag spikes.', ['r'], ['Connection']),
                             ('Disable interrupt moderation', 'Makes your network card hand over each packet right away instead of grouping them.', ['r'], ['Connection', 'Input lag'])]),
]


def tags(fl, plan='p'):
    t = {'p': '<span class="pl5 p">premium</span>', 'f': '<span class="pl5 f">free</span>'}[plan]
    if 'a' in fl:
        t += '<span class="pl5 a">advanced</span>'
    if 'r' in fl:
        t += '<span class="pl5 r">restart</span>'
    return t


def row(n, d, fl, hp, plan='p'):
    h = ''.join(f'<span>{x}</span>' for x in hp)
    return f'<div class="tw-r"><div><p class="nm">{n}{tags(fl, plan)}</p><p class="ds">{d}</p></div><div class="hp">{h}</div><i data-i="chev"></i></div>'


def open_row():
    spec = [('plan', 'Premium', 'Unlocked with Premium'), ('level', 'Safe', 'Fine for every PC'), ('in the app', 'Switch', 'Turn it off and your previous settings come back.'),
            ('restart', 'Not needed', ''), ('restore point', 'Optional', 'Offered, not required'), ('works on', 'Any Windows 10 or 11 PC', '')]
    sp = ''.join(f'<div><dt>{a}</dt><dd>{b}{f"<small>{c}</small>" if c else ""}</dd></div>' for a, b, c in spec)
    opts = ''.join(f'<span>{o}</span>' for o in ['Better hitreg', 'Best hitreg', 'Balanced', 'Hypixel', 'Slowest', 'Default'])
    return f'''<div class="tw-r open"><div class="top"><div><p class="nm">Hitreg profile{tags([])}</p><p class="ds">Adjusts how your PC takes in game data, with hitreg profiles and a Default to undo it.</p></div><div class="hp"><span>Hitreg</span><span>Connection</span></div><i data-i="chev"></i></div>
  <p class="lg">Each profile changes how Windows handles incoming network data: how much room it makes for it, and whether it bundles small pieces together before passing them on. Pick the profile that suits you, such as the one made for Hypixel, or choose Default to put Windows back as it was. Keep expectations modest, because the server decides whether a hit counts and your ping matters far more. Some profiles can also slow down large downloads.</p>
  <dl class="tw-spec">{sp}</dl>
  <div class="tw-opt"><b>6 options</b>{opts}<b style="margin-left:18px">in presets</b><span class="pr">Minecraft PvP</span></div>
  <div class="tw-nts"><div class="ok"><span class="ic"><i data-i="gauge"></i></span><div><b>What to expect</b><p>Rarely measurable: hit registration is decided by the server and mostly depends on your ping.</p></div></div>
    <div class="wa"><span class="ic"><i data-i="alert"></i></span><div><b>Good to know</b><p>Any profile other than Best hitreg or Default can slow down large downloads.</p></div></div>
    <div class="ap"><span class="ic"><i data-i="appwin"></i></span><div><b>How the app describes it</b><p>Six profiles that set TCP receive auto-tuning and incoming packet coalescing; Default puts Windows back as it was.</p></div></div></div>
</div>'''


def hero():
    seg = ''.join('<i></i>' for _ in range(20))
    facts = ''.join(G.ck(t) for t in ['Always the latest version', 'Windows 10 and 11, 64-bit', 'RagoOptimizer-Setup.exe', 'No account needed', 'Restore point offered', 'Most tweaks undo with one switch'])
    return f'''<section class="sw5 tw-hero"><span class="s-dots"></span>
  <div><p class="s-eb">free download <b>//</b> for windows</p>
    <h1><span>download</span><span>rago optimizer.</span><span class="br">start free.</span></h1>
    <p class="s-lead">The latest version of the app for Windows 10 and 11. No account needed: <b>73 tweaks are open</b> from the first launch, and Premium unlocks all 218 in the same app.</p>
    <div class="s-acts"><span class="btn red xl"><i data-i="download"></i>download latest version</span><span class="btn xl">explore the 218 tweaks</span></div>
    <ul class="tw-facts">{facts}</ul></div>
  <div class="s-card tw-dl"><div class="hd"><img src="img/rago-app-dark-64.svg" alt=""><div><b>rago optimizer</b><span>Free plan, Premium in the same app</span></div><span class="s-tag">free</span></div>
    <div class="fl"><p class="t"><i data-i="filetext"></i>RagoOptimizer-Setup.exe<em>0%</em></p><div class="s-seg">{seg}</div></div>
    <ol><li><i>1</i><div><b>Download the installer</b><span>It lands in your Downloads folder. Open it like any other app.</span></div></li>
      <li><i>2</i><div><b>Allow it to run</b><span>If Windows says “Windows protected your PC”, click More info, then Run anyway. It shows this because Rago doesn't have a paid code-signing certificate yet.</span></div></li>
      <li><i>3</i><div><b>Pick your tweaks</b><span>Rago opens in free mode. The free tweaks are ready, the others show a lock until you go Premium.</span></div></li></ol>
    <p class="safe"><i data-i="shield"></i>Only download Rago from this site.</p></div>
</section>
<div class="sw5 tw-stats"><div><b>218</b><span>tweaks in the app</span></div><div><b>10</b><span>sections, from network<br>to graphics card</span></div><div><b>73</b><span>open in the free plan,<br>up to 30 on at once</span></div><div><b>20</b><span>one-click presets</span></div><div><b>1</b><span>switch to undo<br>most tweaks</span></div></div>'''


def catalog():
    secs = [('network', 'Network', 24), ('latency', 'Latency', 81), ('graphics', 'Graphics card', 29), ('windows', 'Windows', 56),
            ('hitreg', 'Hitreg', 9), ('minecraft', 'Minecraft', 1), ('rbw', 'RBW Mod', 1), ('games', 'Game mode', 1), ('expert', 'Expert mode', 12), ('restore', 'Restore', 4)]
    def sc(i):
        k, n, c = secs[i]
        return f'<div class="sc">{G.pi(k, "rest")}<span>{n}</span><em>{c}</em></div>'
    side = ('<div class="s-card tw-side"><h4>filters</h4><p class="tw-gl">sections</p><div class="sc on"><span class="all"><i data-i="grid"></i></span><span>All tweaks</span><em>218</em></div>'
            + '<p class="tw-gl">optimize</p>' + ''.join(sc(i) for i in range(4)) + '<p class="tw-gl">in game</p>' + ''.join(sc(i) for i in range(4, 8))
            + '<p class="tw-gl">advanced</p>' + ''.join(sc(i) for i in range(8, 10))
            + '<p class="tw-gl">show only</p>' + ''.join(f'<div class="cb"><i></i>{t}</div>' for t in ['Free tweaks', 'Safe tweaks', 'No restart needed'])
            + '<p class="tw-gl">helps with</p><div class="hw">' + ''.join(f'<span>{a}<em>{b}</em></span>' for a, b in [('FPS', 11), ('Smoothness', 66), ('Input lag', 38), ('Connection', 32), ('Hitreg', 3), ('Background', 49), ('Privacy', 33), ('Cleanup', 14), ('Recovery', 8)])
            + '</div></div>')
    rows = ''
    for g, items in NET:
        rows += f'<p class="tw-grp">{g}</p>'
        for i, (n, d, fl, hp) in enumerate(items):
            rows += open_row() if n == 'Hitreg profile' else row(n, d, fl, hp)
        if g == 'individual settings':
            rows += '<div class="tw-more"><i data-i="plus"></i>15 more in individual settings</div>'
    lat = ('<div class="tw-sec">' + G.pi('latency', 'on') + '<div><b>latency</b><span>Timers, priorities, CPU, memory and power.</span></div><em>81</em></div>'
           + '<p class="tw-grp">general</p>' + row('General latency optimizations', 'Applies a set of Windows timing and priority settings and makes menus open without delay.', ['r'], ['Input lag'])
           + row('DirectX settings', 'Lets your graphics card manage its own work queue and applies some older graphics settings.', ['r'], ['Smoothness', 'FPS'])
           + '<p class="tw-grp">storage</p>' + row('NTFS tweaks', 'Tunes how Windows stores and reads files, with a bigger file cache and fewer date updates.', ['r'], ['Smoothness'], 'f')
           + '<div class="tw-fade"></div>')
    main = f'''<div class="tw-main"><div class="s-srch"><div class="in"><i data-i="search"></i>Search the tweaks<kbd>/</kbd></div></div>
  <div class="tw-try">Try<span>mouse</span><span>ping</span><span>fps</span><span>nvidia</span><span>laptop</span><span>privacy</span><b>showing all 218 tweaks</b></div>
  <div class="tw-sec">{G.pi('network', 'on')}<div><b>network</b><span>Ping, stability and hit registration.</span></div><em>24</em></div>
  {rows}{lat}</div>'''
    pr = [('undo', 'a switch, not a script', 'Most tweaks are switches. Turn one off and Rago puts your previous Windows settings back.'),
          ('shield', 'safe or advanced', 'Safe tweaks suit every PC. Advanced ones are for players who know what they change, with a restore point recommended first.'),
          ('gauge', 'honest about results', 'Each tweak says what to expect, even when the effect is small. Results depend on your PC and your connection.')]
    prc = ''.join(f'<div class="s-card tw-p"><span class="ic"><i data-i="{i}"></i></span><div><h4>{h}</h4><p>{p}</p></div></div>' for i, h, p in pr)
    return f'''<section class="s-sec" id="all"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">all 218 tweaks</p><h2 class="s-h2">every tweak,<br>in plain words.</h2></div>
  <p class="s-lead">Rago Optimizer sorts its tweaks into 10 sections, the same as in the app. <b>Each one says what it's for</b>, what it can help with and what to know before you turn it on, without the jargon.</p></div>
  <div class="tw-pr">{prc}</div>
  <div class="tw-cat">{side}{main}</div>
</div></section>'''


def final():
    return '''<section class="s-final"><span class="s-dots"></span><span class="big">218</span><div class="in">
  <p class="s-eb">your next match</p><h2 style="font-size:92px;max-width:1100px">start with the free tweaks.<br>unlock the rest when you want.</h2><p>Same app, free or Premium. Download it now and see every tweak inside, with what it changes and how to undo it.</p>
  <div class="s-acts"><span class="btn xl"><i data-i="download"></i>download free</span><span class="btn xl gh">get premium</span></div></div></section>
''' + G.footer()


if __name__ == '__main__':
    body = G.nav('Tweaks', 'Get Premium') + hero() + catalog() + final()
    (OUT / 'site-tweaks.html').write_text(page('All 218 tweaks', body, CSS))
    print('wrote site-tweaks.html')
