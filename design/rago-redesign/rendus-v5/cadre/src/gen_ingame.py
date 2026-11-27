"""Barre en jeu v5 (lot 2, 22/11/2026). Écrit src/ingame.css, app-ingame.html (barre ouverte) et app-ingame-states.html
(pastilles, rappel des conseils, offre gratuite, nettoyage, erreurs). Textes et réglages tirés de overlay/Overlay.tsx,
lib/i18n.ts, data/catalog.json et data/tips.json ; tailles de overlay.rs (barre 780 × 600, pastille 236 × 44,
rappel 380 × 44, marge 18)."""
from pathlib import Path

HERE = Path(__file__).parent
OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/src')

CSS = r'''/* Barre en jeu v5 (lot 2, 22/11/2026) : verre sombre posé sur le jeu, sans flou dessous. Classes en ig- (pas de collision). */
.win.ig{height:900px;min-height:0;background:#000}
.igbg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.igglass{background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,0) 38%),rgba(10,10,11,.94);border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}
.igo{font-family:var(--cond);font-weight:700;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}

/* barre ouverte */
.igp{position:absolute;z-index:2;left:50%;top:18px;width:780px;height:600px;transform:translateX(-50%);display:flex;flex-direction:column;padding:16px 18px 12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 26px 50px -22px rgba(0,0,0,.9)}
.igp::before{content:"";position:absolute;left:-1px;top:30px;width:4px;height:26px;background:var(--red);transform:skewY(-20deg)}
.pcrop .igp::before{display:none}
.igh{display:flex;align-items:center;gap:12px;padding:0 2px 14px}
.igm{width:36px;height:36px;flex:none;display:block}
.igt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.igt b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:31px;line-height:.82;text-transform:uppercase;white-space:nowrap}
.iga{display:flex;gap:6px}
.igi{width:34px;height:34px;display:grid;place-items:center;background:var(--bg-3);border:1px solid var(--line);color:var(--ink-2)}
.igi svg{width:15px;height:15px}
.igi.on{color:var(--red);border-color:rgba(255,59,48,.45);background:rgba(255,59,48,.1)}

.igtl{display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) 92px;gap:6px}
.igtile{display:flex;flex-direction:column;gap:6px;padding:10px 12px 9px;background:rgba(255,255,255,.035);border:1px solid var(--line)}
.igtile b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:31px;line-height:.86;white-space:nowrap}
.igtile b small{font-size:14px;font-weight:800;color:var(--ink-2);margin-left:2px}
.igtile.hi b{color:var(--red)}
.igtile.na b{color:var(--ink-3)}
.igcl{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);background:var(--bg-3);border:1px solid var(--line-2)}
.igcl svg{width:16px;height:16px}
.igcl.busy{color:var(--ink-2)}
.ignote{margin:8px 2px 0;font-size:12.5px;color:var(--ink-2);display:flex;align-items:center;gap:7px}
.ignote svg{width:13px;height:13px;color:var(--ok)}
.ignote.bad{color:#FF6B61}
.ignote.bad svg{color:var(--red)}

.igb{flex:1;min-height:0;display:grid;grid-template-columns:296px minmax(0,1fr);gap:14px;margin-top:14px}
.igb.one{grid-template-columns:minmax(0,1fr)}
.igcol{min-height:0;display:flex;flex-direction:column}
.igsh{display:flex;align-items:center;justify-content:space-between;height:24px;margin:0 2px 8px}
.igsc{flex:1;min-height:0;overflow:hidden;-webkit-mask:linear-gradient(180deg,#000 calc(100% - 26px),transparent)}
.igpr{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--red-ink);background:var(--red)}
.igpr svg{width:11px;height:11px;stroke-width:2.6}

/* partie en cours : mode d'alimentation, priorité, points à vérifier */
.igck{display:grid;gap:7px;padding:11px 12px;background:rgba(255,255,255,.035);border:1px solid var(--line)}
.igck p{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.4;color:var(--ink-2)}
.igck p svg{width:13px;height:13px;flex:none;margin-top:2px}
.igck p.ok svg{color:var(--ok)}
.igck p.wr svg{color:var(--red)}
.igck p.wr{color:var(--ink)}
.igck .igo{margin-top:3px;font-size:10.5px}

/* réglages conseillés du jeu */
.igtp{margin-top:10px;padding:10px 12px 10px;background:rgba(255,255,255,.035);border:1px solid var(--line)}
.igth{display:flex;align-items:center;gap:8px;padding-bottom:8px}
.igth > svg{width:14px;height:14px;color:var(--red);flex:none}
.igth .igo{flex:1;font-size:10.5px;letter-spacing:.12em;color:var(--ink-2)}
.igth em{font-style:normal;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--red);white-space:nowrap}
.igth em.ok{color:var(--ok)}
.igth .chv{width:14px;height:14px;color:var(--ink-3);flex:none}
.igtr{display:flex;gap:10px;padding:8px 0 8px;border-top:1px solid var(--line)}
.igcb{width:15px;height:15px;flex:none;margin-top:1px;box-shadow:inset 0 0 0 1.5px var(--ink-3);transform:skewX(var(--skew))}
.igtr .l1{display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px;font-size:12.5px;line-height:1.3}
.igtr .l1 b{font-weight:600;color:var(--ink)}
.igtr .l1 i{font-style:normal;color:var(--ink-3)}
.igtr .l1 span{color:var(--ink);font-weight:500}
.igtg{font-style:normal;height:17px;display:inline-flex;align-items:center;padding:0 6px;font-family:var(--cond);font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--line-2)}
.igtr .why{margin-top:3px;font-size:11.5px;line-height:1.35;color:var(--ink-3)}
.igtf{display:flex;flex-wrap:wrap;gap:4px 12px;padding-top:8px;border-top:1px solid var(--line);font-size:11.5px;color:var(--ink-3)}
.igtf u{text-decoration:none;color:var(--ink-2);border-bottom:1px solid rgba(255,59,48,.6)}

/* réglages en pleine partie */
.iggr{margin-bottom:10px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.iggr > span{display:block;padding:9px 12px 5px}
.igr{display:flex;align-items:center;justify-content:space-between;gap:12px;height:34px;padding:0 10px 0 12px;border-top:1px solid var(--line)}
.igr b{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.03em;text-transform:uppercase;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.igr.on b{color:var(--ink)}
.igr.hov{background:rgba(255,255,255,.05)}
.igr .sw{width:38px;height:20px}
.igr .sw::after{top:3px;left:3px;width:14px;height:14px}
.igr .sw.on::after{left:21px}
.igr .ld{width:15px;height:15px;color:var(--red);margin-right:11px}
.igl.locked .igr b{color:var(--ink-3)}
.igl.locked .sw,.igr .sw.dis{opacity:.35}
.igl.cols2{columns:2;column-gap:10px}
.igl.cols2 .iggr{break-inside:avoid}

.igf{display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 2px 0;border-top:1px solid var(--line);font-size:11.5px;color:var(--ink-3)}
.igf kbd{display:inline-grid;place-items:center;height:18px;padding:0 6px;margin:0 2px;font-family:var(--cond);font-weight:800;font-size:11.5px;letter-spacing:.06em;color:var(--ink);background:var(--bg-4);box-shadow:inset 0 -1px 0 rgba(0,0,0,.4)}
.igf .dt{width:3px;height:3px;background:var(--ink-3);flex:none}

/* pastille gardée à l'écran, et rappel des conseils */
.igpill{position:absolute;z-index:2;left:18px;top:18px;width:236px;height:44px;display:flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02)),rgba(10,10,11,.72);border:1px solid rgba(255,255,255,.12)}
.igpill img{width:20px;height:20px;flex:none}
.igpill b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px;line-height:1}
.igpill small{font-family:var(--cond);font-weight:800;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.igpill .sp{width:1px;height:16px;margin:0 5px;background:rgba(255,255,255,.18)}
.igpill.nd{width:380px;justify-content:flex-start;gap:8px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02)),rgba(10,10,11,.88);border-color:rgba(255,59,48,.45)}
.igpill.nd > svg{width:14px;height:14px;color:var(--red);flex:none}
.igpill.nd .tx{font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap}
.igpill.nd .ky{font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);white-space:nowrap}

/* infobulle de Windows (survol d'une mesure) */
.igtt{position:absolute;z-index:3;max-width:250px;padding:5px 8px 6px;font-family:Inter,"Segoe UI",sans-serif;font-size:11.5px;line-height:1.35;color:#f2f2f2;background:#2b2b2d;border:1px solid rgba(255,255,255,.1);border-radius:5px;box-shadow:0 6px 16px rgba(0,0,0,.5)}

/* planche des états */
.igst{position:relative;z-index:1;isolation:isolate;padding:44px 56px 56px}
.igst .bgdots{position:absolute;right:0;top:0;width:620px;height:420px;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.07) 1.1px,transparent 1.5px) 0 0/9px 9px;-webkit-mask:linear-gradient(240deg,#000 0,transparent 60%)}
.igst .tph{display:flex;align-items:flex-end;justify-content:space-between;gap:40px}
.igst .title{font-size:132px;margin-top:16px;white-space:nowrap}
.igst .lead{max-width:440px;padding-bottom:12px;font-size:15px;line-height:1.5;color:var(--ink-2)}
.igst .lead b{color:var(--ink);font-weight:600}
.sh5{display:flex;align-items:baseline;gap:14px;margin:48px 0 16px}
.sh5 b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;text-transform:uppercase}
.sh5 span{font-size:13.5px;color:var(--ink-2)}
.k5{margin-bottom:10px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.k5 em{font-style:normal;color:var(--red)}
.k5 small{font-family:var(--body);font-weight:500;font-size:12px;letter-spacing:0;text-transform:none;margin-left:6px}
.scn{position:relative;height:80px;overflow:hidden;border:1px solid var(--line);background:#000}
.scn > img.bgc{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--op,30% 0%)}
.scn .igpill{left:18px;top:18px}
.prow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.prow2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px}
.pcrop{position:relative;overflow:hidden;border:1px solid var(--line);background:#000}
.pcrop > img.bgc{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--op,50% 0%)}
.pcrop .igp{position:relative;left:auto;top:auto;transform:none;width:auto;height:auto;margin:18px}
.pgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:22px}

html.round .igp{border-radius:22px}
html.round .igi{border-radius:10px}
html.round .igtile,html.round .igcl,html.round .igck,html.round .igtp,html.round .iggr{border-radius:14px}
html.round .igpr{border-radius:7px}
html.round .igcb{border-radius:4px}
html.round .igtg,html.round .igf kbd{border-radius:5px}
html.round .igpill{border-radius:999px}
html.round .scn,html.round .pcrop{border-radius:20px}
'''

LOGO = '<img class="igm" src="img/rago-app-dark-64.svg" alt="">'
SCENE = 'img/scenes/valorant-ascent.jpg'

LIVE = [
    ('processor', [('cpu_parking', 'Disable core parking'), ('cpu_cstates_cfg', 'Configure C-states'), ('cpu_cstates_off', 'Disable sleep and CPU minimum'),
                   ('cpu_device_idle', 'Device idle policy: performance'), ('cpu_pstates', 'P-states follow C-states'), ('cpu_boost_epp', "Don't restrict boost"),
                   ('cpu_throttle', 'Disable throttle states'), ('cpu_turbo', 'Enable Turbo Boost'), ('cpu_cooling', 'Active cooling'), ('cpu_ac', 'CPU 100% on AC'),
                   ('cpu_away', 'Disable away mode')]),
    ('power', [('pow_plan', 'Rago Low Latency power plan'), ('pow_hwp', 'Hardware P-states'), ('pow_devices', 'Device power saving')]),
    ('memory', [('mem_compression', 'Disable memory compression'), ('mem_combining', 'Disable page combining')]),
    ('network, windows and graphics card', [('net_dca', 'Enable Direct Cache Access'), ('win_visual', 'Optimize visuals'), ('win_transparency', 'Disable transparency'),
                                            ('win_autoplay', 'Disable AutoPlay'), ('nv_profile', 'Rago driver profile (Profile Inspector)')]),
]
ON = {'cpu_parking', 'cpu_cstates_cfg', 'cpu_turbo', 'cpu_ac', 'pow_plan', 'win_visual', 'win_transparency', 'nv_profile'}

TIPS = [  # tips.json, valorant : les 3 premiers pas faits
    ('lag', 'Input lag', 'NVIDIA Reflex Low Latency', 'On + Boost', 'Cuts the delay between your mouse and the screen (NVIDIA cards).'),
    ('aim', 'Aim', 'Raw Input Buffer', 'On', 'Reads your mouse more directly, best with a high polling rate mouse. 8 pros out of 10 use it.'),
    ('see', 'Visibility', 'Material Quality · Detail Quality', 'Low', 'Less clutter on the maps (vines, props): enemies are easier to spot and FPS go up.'),
]


def page(title, body, cls='ig'):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="ingame.css">
<script>for (const c of ['round','poster']) if (location.hash.includes(c)) document.documentElement.classList.add(c);</script>
<title>{title}</title>
</head>
<body>
<div class="win {cls}">
{body}</div>
<script src="icons.js"></script>
</body></html>
'''


def head(game='valorant', pin=True):
    p = '<span class="igi on"><i data-i="pinoff"></i></span>' if pin else '<span class="igi"><i data-i="pin"></i></span>'
    return (f'<header class="igh">{LOGO}<div class="igt"><span class="igo">in-game bar</span><b>{game}</b></div>'
            f'<div class="iga">{p}<span class="igi"><i data-i="appwin"></i></span><span class="igi"><i data-i="x"></i></span></div></header>')


def tiles(fps='240', ping='18', cpu='34', gpu='92', ram='61', clean='idle'):
    def t(label, v, unit='', cls=''):
        u = f'<small>{unit}</small>' if unit and v != '—' else ''
        return f'<div class="igtile {cls}"><span class="igo">{label}</span><b>{v}{u}</b></div>'
    c = ('<span class="igcl busy"><i data-i="loader"></i>cleaning…</span>' if clean == 'busy'
         else '<span class="igcl"><i data-i="brush"></i>clean</span>')
    return ('<div class="igtl">' + t('fps', fps, '', 'hi' if fps != '—' else 'na') + t('ping', ping, 'ms') + t('cpu', cpu, '%')
            + t('gpu', gpu, '%') + t('ram', ram, '%') + c + '</div>')


def checks(warn=True):
    w = ('<span class="igo">worth a look</span><p class="wr"><i data-i="alert"></i>Download in the background (Steam): pause it if you play online.</p>'
         if warn else '')
    return ('<div class="igck"><p class="ok"><i data-i="zap"></i>High performance while you play</p>'
            f'<p class="ok"><i data-i="gauge"></i>Game at high priority</p>{w}</div>')


def tips():
    rows = ''.join(f'<div class="igtr"><i class="igcb"></i><div><div class="l1"><b>{s}</b><i>→</i><span>{v}</span><em class="igtg">{tg}</em></div>'
                   f'<p class="why">{w}</p></div></div>' for _, tg, s, v, w in TIPS)
    return ('<div class="igtp"><div class="igth"><i data-i="bulb"></i><span class="igo">recommended settings for valorant</span><em>4 to do</em><i data-i="chev" class="chv"></i></div>'
            + rows + '<div class="igtf"><u>show 1 more setting</u><span>From <u>ProSettings</u>, <u>Hone</u>, <u>Evetech</u></span><u>show done (5)</u></div></div>')


def live(locked=False, busy=None, hov=None, cols2=False, only=None):
    out = []
    for g, items in LIVE:
        if only and g not in only:
            continue
        rows = ''
        for i, n in items:
            on = i in ON and not locked
            ctl = '<i data-i="loader" class="ld"></i>' if i == busy else f'<i class="sw{" on" if on else ""}{" dis" if busy else ""}"></i>'
            rows += f'<div class="igr{" on" if on else ""}{" hov" if i == hov else ""}"><b>{n}</b>{ctl}</div>'
        out.append(f'<div class="iggr"><span class="igo">{g}</span>{rows}</div>')
    return f'<div class="igl{" locked" if locked else ""}{" cols2" if cols2 else ""}">' + ''.join(out) + '</div>'


def foot():
    return ('<footer class="igf"><span><kbd>Alt+X</kbd> or <kbd>Esc</kbd> to get back to the game</span><i class="dt"></i>'
            '<span>Ping to the server you play on (Minecraft: measured like the game does)</span></footer>')


def panel(locked=False, busy=None, hov='cpu_boost_epp', note='', advice=True, err=''):
    prem = '<span class="igpr"><i data-i="lock"></i>premium</span>' if locked else ''
    right = (f'<div class="igcol"><div class="igsh"><span class="igo">tweaks you can switch mid-game</span>{prem}</div>'
             f'<div class="igsc">{live(locked, busy, hov, cols2=not advice)}</div>{err}</div>')
    left = f'<div class="igcol"><div class="igsh"><span class="igo">this game</span></div><div class="igsc">{checks()}{tips()}</div></div>' if advice else ''
    return (f'<section class="igp igglass">{head()}{tiles()}{note}'
            f'<div class="igb{"" if advice else " one"}">{left}{right}</div>{foot()}</section>')


def ingame():
    return page('In-game bar', f'  <img class="igbg" src="{SCENE}" alt="">\n  {panel()}\n')


def pill(fps='240', ping='18', approx=False):
    f = f'<b>{fps}</b><small>fps</small>'
    p = f'<b>{"≈" if approx else ""}{ping}</b><small>ms</small>'
    return f'<div class="igpill igglass"><img src="img/rago-app-dark-32.svg" alt="">{f}<i class="sp"></i>{p}</div>'


def nudge(text='5 tips for VALORANT'):
    return ('<div class="igpill nd igglass"><img src="img/rago-app-dark-32.svg" alt=""><i data-i="bulb"></i>'
            f'<span class="tx">{text}</span><i class="sp"></i><span class="ky">alt+x to see</span></div>')


def scn(label, sub, inner, op='30% 0%'):
    return (f'<div><p class="k5">{label} <em>//</em><small>{sub}</small></p>'
            f'<div class="scn" style="--op:{op}"><img class="bgc" src="{SCENE}" alt="">{inner}</div></div>')


def crop(label, sub, inner, op='50% 0%'):
    return (f'<div><p class="k5">{label} <em>//</em><small>{sub}</small></p>'
            f'<div class="pcrop" style="--op:{op}"><img class="bgc" src="{SCENE}" alt="">{inner}</div></div>')


def states():
    pills = (scn('kept on screen', 'pinned: no focus, no clicks', pill())
             + scn('server quiet', 'measured at the last router', pill('238', '19', True))
             + scn('no game server yet', 'menu, lobby or offline', pill('144', '—')))
    nd = scn('game just started', 'shown 12 seconds, then the usual pill', nudge(), '40% 0%')
    nd2 = scn('game without tips', 'only the checks are counted', nudge('1 thing to check'), '70% 0%')
    free = crop('free plan', 'the list stays visible, switches locked',
                f'<section class="igp igglass" style="padding-bottom:14px"><div class="igsh"><span class="igo">tweaks you can switch mid-game</span>'
                f'<span class="igpr"><i data-i="lock"></i>premium</span></div>{live(True, cols2=True, only=("power", "memory"))}</section>')
    clean = crop('clean', 'standby memory emptied',
                 '<section class="igp igglass" style="padding-bottom:12px">' + tiles(clean='busy') + '</section>'
                 '<section class="igp igglass" style="padding-bottom:12px;margin-top:0">' + tiles(ram='48')
                 + '<p class="ignote"><i data-i="check"></i>1.2 GB of cache cleared</p></section>', '60% 20%')
    busy = crop('switching', 'one tweak at a time, never during an app run',
                '<section class="igp igglass" style="padding-bottom:14px">' + live(busy='pow_plan', only=('power',)) + '</section>'
                '<section class="igp igglass" style="padding:10px 16px 12px;margin-top:0"><p class="ignote bad" style="margin:0"><i data-i="alert"></i>A run is already going in the app.</p></section>', '50% 40%')
    hints = crop('hints', 'on hover, drawn by Windows',
                 '<section class="igp igglass" style="padding-bottom:12px;margin-bottom:124px">' + tiles(fps='—', ping='≈19') + '</section>'
                 '<div class="igtt" style="left:44px;top:114px">FPS measurement isn\'t available in this build</div>'
                 '<div class="igtt" style="left:150px;top:164px">≈: the server doesn\'t answer ping, measured at the last router before it (within 1 or 2 ms)</div>',
                 '50% 70%')
    body = f'''  <div class="igst">
    <span class="bgdots"></span>
    <section class="tph">
      <div><p class="kick">in-game bar <b>//</b> every state</p><h1 class="title" data-t="in-game">in-game</h1></div>
      <p class="lead"><b>Alt+X</b> opens the bar over the game, Esc or a click outside goes back. The <b>pill</b> keeps FPS and ping in the corner without taking clicks.</p>
    </section>
    <div class="sh5"><b>pill</b><span>236 × 44, top left, 18 px from the edges.</span></div>
    <div class="prow">{pills}</div>
    <div class="prow2">{nd}{nd2}</div>
    <div class="sh5"><b>open bar</b><span>780 × 600, top center. Smaller screens shrink it and the list scrolls.</span></div>
    <div class="pgrid">{free}{busy}{clean}{hints}</div>
  </div>
'''
    return page('In-game bar, every state', body, 'igs')


if __name__ == '__main__':
    (OUT / 'ingame.css').write_text(CSS)
    (OUT / 'app-ingame.html').write_text(ingame())
    (OUT / 'app-ingame-states.html').write_text(states())
    print('wrote ingame.css, app-ingame.html, app-ingame-states.html')
