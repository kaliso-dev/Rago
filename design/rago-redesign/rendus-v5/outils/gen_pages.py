# Génère les maquettes v5 de Souris, Paramètres et Partage et support (app-mouse.html, app-settings.html, app-share.html).
# Textes : ceux de l'app (pages/Mouse.tsx, Settings.tsx, Share.tsx et i18n.ts). Styles : module.css + pages.css.
import html, math, random
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/src')
def esc(s): return html.escape(s, quote=True)

def shell(page, title, kick, sig, body, fs=150):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Rago, {esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="module.css">
<link rel="stylesheet" href="pages.css">
<style>.title{{font-size:{fs}px}}</style>
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="rail.css">
<link rel="stylesheet" href="anim.css"></head>
<!-- {esc(title)}, généré par gen_pages.py. -->
<body data-page="{page}">
<div class="win">
  <main class="main">
    <div class="topbar"><div class="search"><i data-i="search"></i>search games, tweaks, settings<kbd>ctrl k</kbd></div><span class="wc"></span></div>
    <section class="head">
      <div><p class="kick">{kick}</p><h1 class="title" data-t="{esc(title.lower())}">{esc(title.lower())}</h1></div>
      {sig}
    </section>
    <div class="nobar"></div>
{body}
  </main>
</div>
<script src="shell5.js"></script>
<script src="printicons.js"></script>
<script src="icons.js"></script>
<script src="anim.js"></script>
</body></html>
'''

# ------------------------------------------------------------------------------------------- Souris
def mouse():
    random.seed(7)
    gaps = [1.0 + random.gauss(0, .035) for _ in range(64)]
    gaps[23] = 1.42; gaps[47] = 1.18
    mx = max(gaps)
    spark = ''.join(f'<i style="--h:{g / mx:.2f}"{" class=pk" if g > 1.15 else ""}></i>' for g in gaps)
    ticks = '<span class="g" style="--n:40">' + ''.join(f'<i class="on" style="height:{30 + 70 * (g - .9) / (mx - .9):.0f}%"></i>' for g in gaps[:40]) + '</span>'
    sig = (f'<div class="ping sig"><div class="pv"><b>998</b><span>hz<small>polling rate, good</small></span></div>'
           f'<div class="ticks">{ticks}</div></div>')
    dots = ''.join('<i class="b"></i>' if i == 13 else '<i class="c"></i>' for i in range(20))
    body = f'''
    <div class="mgrid">
      <section><div class="sh"><h2 class="h2 tape">polling rate</h2><span class="vt2 ok">good</span></div>
        <div class="panel zone">
          <div class="zm"><div class="big">998<small>hz</small><span>average</span></div>
            <div class="mid">97<small>%</small><span>regularity</span></div><div class="mid">1.42<small>ms</small><span>longest gap</span></div></div>
          <div class="zs">{spark}</div>
          <p class="zh"><i data-i="mouse"></i>Move your mouse in fast circles here</p>
        </div>
        <p class="verdict2">About 998 Hz: the sweet spot. 4000 or 8000 Hz cost CPU time and can cause stutters in some games.</p>
      </section>
      <section><div class="sh"><h2 class="h2 tape">double-click check</h2><span class="vt2 bad">1 double click</span></div>
        <div class="panel pad">
          <div class="pc2"><b>20</b><small>/20</small></div>
          <div class="dots">{dots}</div>
          <p class="zh">Click 20 times, slowly, with the left button.</p>
        </div>
        <div class="alert2"><i data-i="alert"></i><p><b>1 click was counted twice</b> (6 ms). Your left switch is starting to wear out. Raise the debounce time a little in your mouse software (Logitech G HUB, Razer Synapse…), or change the switch.</p><span class="lnk"><i data-i="rotate"></i>start again</span></div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">mouse software</h2><span class="fold">check again<i data-i="refresh"></i></span></div>
        <div class="panel lst2">
          <div class="li2 risk"><div class="l"><b>X-Mouse Button Control</b><span>Catches every move and click across Windows to remap buttons. Its repeated or simulated keys count as macros (Riot, Hypixel). Close it before ranked games.</span></div><span class="vt2 bad">risky in ranked</span></div>
          <div class="li2"><div class="l"><b>Logitech G HUB</b><span>Your mouse's own software. Keep it: your DPI, polling rate and debounce live in it.</span></div><span class="vt2 ok">fine</span></div>
          <div class="li2 one"><div class="l"><b>1:1 mouse</b><span>Windows acceleration off, pointer speed 6/11: the same hand move always gives the same distance. Matters in games without raw input, like Minecraft.</span></div><span class="sst is-on"><i></i>on</span><span class="lnk">latency<i data-i="right"></i></span></div>
        </div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">sensitivity</h2></div>
        <div class="panel sens">
          <div class="inp"><label>dpi<span class="in">800</span></label><label>in-game sens<span class="in">0.35</span></label><label>game<span class="in sel">valorant<i data-i="chev"></i></span></label></div>
          <div class="out"><div class="big">280<span>edpi</span></div><div class="big">46.7<small>cm</small><span>for a 360° turn</span></div></div>
          <div class="conv"><span>same feel in</span><span class="in sel">cs2<i data-i="chev"></i></span><b>1.114</b></div>
        </div>
        <p class="verdict2">Just a calculation: nothing is changed in your games.</p>
      </section>
    </div>
'''
    return shell('mouse', 'Mouse', 'check your mouse <b>//</b> measured in this window only, nothing touches your game', sig, body)


# ------------------------------------------------------------------------------------------- Paramètres
def row(name, hint='', right='', cls=''):
    return (f'<div class="sr{(" " + cls) if cls else ""}"><div class="l"><b>{name}</b>' + (f'<span>{hint}</span>' if hint else '') + f'</div>{right}</div>')
SW_ON, SW_OFF = '<i class="sw on"></i>', '<i class="sw"></i>'
# Compte selon l'offre (Settings.tsx, SubscriptionCard.tsx, ProfileCard.tsx ; textes de i18n.ts et accountText.ts) :
# premium = abonnement mensuel en cours, canceled = résilié (à reprendre avant la fin), free = plan gratuit, pas connecté.
PLAN_SIG = {'premium': ('premium', 'monthly', 'next payment $5.99 on 14 dec'),
            'canceled': ('premium', 'canceled', 'active until 14 dec, no more charges'),
            'free': ('free', '73 / 218 tweaks', 'premium unlocks the rest')}
def account_panel(plan):
    if plan == 'free':
        meter = '<div class="fm"><i style="--w:33.5%"></i></div>'
        return f"""
      <section><div class="sh"><h2 class="h2 tape">account</h2></div>
        <div class="panel sp">
          <div class="frp"><b>73<small>/ 218</small></b><div class="l"><p>You're on the free plan: 73 of 218 tweaks are unlocked.</p>{meter}</div></div>
          <div class="sa"><span class="btn sm red">get premium</span><span class="btn sm">sign in</span><span class="lnk"><i data-i="info"></i>get help on discord</span></div>
        </div>
      </section>"""
    if plan == 'canceled':
        sub = row('premium, monthly', 'Canceled. Premium stays active until December 14, 2026, no more charges.', '<span class="btn sm red">resume subscription</span>', 'cxl')
    else:
        sub = row('premium, monthly', 'Next payment: $5.99 on December 14, 2026', '<span class="lnk">cancel subscription</span>')
    return f"""
      <section><div class="sh"><h2 class="h2 tape">account</h2><span class="fold">sign out<i data-i="external"></i></span></div>
        <div class="panel sp">
          <div class="who"><span class="av">p</span><div class="l"><b>player@example.com</b><span>This license is active on 1 device. Activated on 14 Oct.</span></div></div>
          {row('plan', '', '<span class="vv">rago optimizer premium<small>verified until 14 dec</small></span>')}
          {sub}
          {row('license key', '', '<span class="vv m">RAGO-••••-••••-7F2K</span>')}
          {row('device', '', '<span class="vv m">DESKTOP-RAGO</span>')}
          <div class="sa"><span class="btn sm"><i data-i="external"></i>manage account</span><span class="lnk"><i data-i="info"></i>get help on discord</span></div>
        </div>
      </section>"""
def profile_panel(plan):
    if plan == 'free':
        return """
      <section><div class="sh"><h2 class="h2 tape">profile</h2></div>
        <div class="panel sp">
          <div class="who"><span class="av big2 off"><i data-i="user"></i></span><div class="l"><span>Sign in to your Rago account to add a profile photo and leave a review.</span></div><span class="btn sm">sign in</span></div>
        </div>
      </section>"""
    return f"""
      <section><div class="sh"><h2 class="h2 tape">profile</h2></div>
        <div class="panel sp">
          <div class="who"><span class="av big2">p</span><div class="l"><b>player</b><span>JPG, PNG, WebP or GIF. Cropped to a square. Shown with your review and on your account.</span></div><span class="btn sm">change photo</span></div>
          <div class="sr"><div class="l"><b>public name</b></div><span class="in2">Player<span class="sv">save</span></span></div>
          <div class="sr rv"><div class="l"><b>your review</b><span class="stars">★★★★★</span><span class="cm">"Ping went from spiky to flat on Hypixel. The network test alone is worth it."</span></div><span class="lnk">edit review</span></div>
        </div>
      </section>"""
def settings(plan='premium'):
    b, l1, l2 = PLAN_SIG[plan]
    sig = (f'<div class="ping sig plan{" free" if plan == "free" else ""}"><div class="pv"><b>{b}</b></div>'
           f'<div class="pl"><span>{l1}</span><span>{l2}</span></div></div>')
    lic = ''.join(f'<span class="lcn"><b>{n}</b>{l}</span>' for n, l in [('NVIDIA Profile Inspector', 'MIT'), ('PresentMon (Intel)', 'MIT'), ('Barlow, Barlow Condensed', 'SIL OFL 1.1'), ('Tauri', 'MIT / Apache 2.0'), ('React', 'MIT'), ('Motion', 'MIT'), ('Lucide', 'ISC')])
    left = account_panel(plan) + profile_panel(plan) + f"""
      <section><div class="sh"><h2 class="h2 tape">app</h2></div>
        <div class="panel sp">
          {row('language', '', '<span class="seg2"><span>français</span><span class="on">english</span></span>')}
          {row('animations', '', '<span class="seg2"><span class="on">full</span><span>reduced</span></span>')}
          <div class="sr lk2"><span class="ic2"><i data-i="external"></i></span><div class="l"><b>share and support</b><span>A preset code to share, and a report for a Discord ticket.</span></div><i data-i="right"></i></div>
        </div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">about</h2></div>
        <div class="panel sp about2">
          <div class="lock"><i data-logo></i><b>ago</b><span>optimizer</span></div>
          <p class="ver">version 1.3.0 <b>//</b> 218 tweaks</p>
          <p class="mb">Made by KALISO and RAGO</p>
          <span class="lbl">open source licenses</span>
          <div class="lics">{lic}</div>
        </div>
      </section>"""
    right = f"""
      <section><div class="sh"><h2 class="h2 tape">in-game bar</h2></div>
        <div class="panel sp">
          {row('in-game bar', 'Over your game: FPS, ping, CPU, GPU, RAM and live tweaks. The game needs to run borderless or windowed.', SW_ON)}
          {row('shortcut', 'Only active while a game is in front.', '<span class="kb"><kbd>alt</kbd><kbd>x</kbd></span><span class="lnk">change</span>')}
          {row('FPS and ping on screen while you play', 'A small pill at the top left that lets clicks through.', SW_ON)}
          {row('stay by the clock when closed', 'Closing the window keeps Rago running, with its icon by the clock. Quit from the icon to close it.', SW_ON)}
          {row('start with windows', 'On by default: Rago starts hidden by the clock when you sign in to Windows, so the in-game bar is ready.', SW_ON)}
        </div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">while you play</h2></div>
        <p class="lead3">Rago does this when a game starts and undoes it when it ends, as long as it's open or by the clock.</p>
        <div class="panel sp">
          {row('high-performance graphics card for games', 'Your PC has a single graphics card: nothing to do here.', '<i class="sw"></i>', 'dis')}
          {row('high performance power mode while you play', 'From Balanced or Power saver, plugged in only. Your mode comes back when the game ends, unless you picked another one meanwhile.', SW_ON)}
          {row('game at high priority', 'The game runs at high priority and Windows stops holding it back when you switch windows. Only while you play: nothing stays afterwards.', SW_ON)}
          {row('tips when a game starts', 'Game settings pros recommend, apps hogging your PC, screen refresh rate, battery, downloads and sync: a reminder at the top left when the game starts.', SW_ON)}
        </div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">memory</h2></div>
        <div class="panel sp">
          {row('clean also trims background apps', 'Never the window in front, your games or anti-cheats. A trimmed app can take a moment to wake up.', SW_OFF)}
        </div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">folders</h2></div>
        <div class="panel sp">
          {row('logs', '', '<span class="btn sm"><i data-i="file"></i>open</span>')}
          {row('resources', '', '<span class="btn sm"><i data-i="file"></i>open</span>')}
          {row('app data', '', '<span class="btn sm"><i data-i="file"></i>open</span>')}
        </div>
      </section>"""
    body = f'    <div class="setgrid"><div class="col">{left}</div><div class="col">{right}</div></div>\n'
    return shell('settings', 'Settings', 'settings <b>//</b> account, in-game bar, while you play, memory and folders', sig, body)

# ------------------------------------------------------------------------------------------- Partage et support
B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
def b62(n, seed):
    random.seed(seed); return ''.join(random.choice(B62) for _ in range(n))
CODE = 'RAGO2_' + b62(150, 3)
FRIEND = 'RAGO2_' + b62(170, 9)

def ticket(name, n, code=CODE, copied=False):
    btn = ('<span class="btn sm"><i data-i="check"></i>copied</span>' if copied
           else '<span class="btn sm red"><i data-i="copy"></i>copy</span>')
    return (f'<div class="tkt"><div class="tkl"><div class="tkh"><span class="lbl">preset</span><b>{esc(name)}</b></div>'
            f'<p class="cdv"><em>RAGO2_</em>{code[6:]}</p></div>'
            f'<div class="tkr"><b>{n}</b><span>tweaks</span>{btn}</div></div>')

def segbar(fresh=0, already=0, unavail=0, locked=0, reboot=()):
    segs = (['n'] * fresh + ['a'] * already + ['u'] * unavail + ['l'] * locked)
    return '<div class="segb">' + ''.join(f'<i class="{c}{" r" if i in reboot else ""}"></i>' for i, c in enumerate(segs)) + '</div>'

def legend(fresh=0, already=0, unavail=0, locked=0, reboot=0):
    it = []
    if fresh: it.append(f'<span class="n"><i></i>{fresh} new for you</span>')
    if already: it.append(f'<span class="a"><i></i>{already} already on</span>')
    if reboot: it.append(f'<span class="r"><i data-i="power"></i>{reboot} need{"s" if reboot == 1 else ""} a restart</span>')
    if unavail: it.append(f'<span class="u"><i></i>{unavail} not available on this PC</span>')
    if locked: it.append(f'<span class="l"><i></i>{locked} need{"s" if locked == 1 else ""} Premium</span>')
    return '<div class="lg2">' + ''.join(it) + '</div>'

def preview(name, total, fresh=0, already=0, unavail=0, locked=0, reboot=(), actions=''):
    return (f'<div class="pv2"><div class="pvh"><b>{esc(name)}</b><span>{total} tweaks</span></div>'
            f'{segbar(fresh, already, unavail, locked, reboot)}{legend(fresh, already, unavail, locked, len(reboot))}'
            + (f'<div class="pva">{actions}</div>' if actions else '') + '</div>')

def paste(code=FRIEND, cls=''):
    return (f'<div class="pst"><div class="in3 code{(" " + cls) if cls else ""}"><span>{esc(code)}</span></div>'
            '<span class="btn sm">preview</span></div>'
            '<span class="lnk opn"><i data-i="upload"></i>open a .rago file</span>')

def keep(name, saved=False):
    if saved:
        return ('<div class="keep2 done"><span class="ok3"><i data-i="check"></i>Saved in My presets.</span>'
                '<span class="btn sm"><i data-i="pencil"></i>edit</span></div>')
    return (f'<div class="keep2"><label class="lbl">name in my presets</label><div class="kr"><div class="in3">{esc(name)}</div>'
            '<span class="btn sm"><i data-i="plus"></i>keep in my presets</span></div></div>')

PARTS = [('PC: Windows build, processor, graphics card, RAM', True), ('Tweaks applied and their variants', True),
         ('History of the last 50 changes', True), ('Last 3 optimization logs', True), ('Network adapter details', False)]
def parts(off=()):
    return '<div class="chl">' + ''.join(
        f'<div class="cr{"" if on and i not in off else " off"}"><i class="cbx{" on" if on and i not in off else ""}"></i><span>{t}</span></div>'
        for i, (t, on) in enumerate(PARTS)) + '</div>'

REPORT = [
    'Rago Optimizer support report',
    'Created: 2026-11-22 13:42 UTC',
    'App: 1.3.0 (production)',
    'License: Premium',
    'Update check: 2026-11-22 13:30 UTC: no update',
    '!Hidden in this file: your Windows user name, PC name, emails, license key, IP and MAC addresses.',
    '',
    '#== PC ==',
    'Windows: Windows 11 Pro (build 26100, Windows 11)',
    'Processor: AMD Ryzen 7 7800X3D 8-Core Processor (8 cores, 16 threads)',
    'Graphics: NVIDIA GeForce RTX 4070',
    'Memory: 32 GB',
    'Administrator: yes',
    'Minecraft folder found: yes',
    '',
    '#== Tweaks applied (21) ==',
    '2026-11-20 18:04  ping_main:config2',
    '2026-11-20 18:04  net_nagle',
    '2026-11-20 18:04  net_throttle',
    '2026-11-20 18:04  pri_game:valorant',
    '2026-11-20 18:03  pri_mmcss',
    '2026-11-20 18:03  in_queue:low',
    '2026-11-20 18:03  kbm_1to1',
]
def report_text():
    out = []
    for l in REPORT:
        if l.startswith('!'): out.append(f'<span class="hl2">{esc(l[1:])}</span>')
        elif l.startswith('#'): out.append(f'<span class="sec">{esc(l[1:])}</span>')
        else: out.append(esc(l) or '&nbsp;')
    return '<pre class="txt2">' + '\n'.join(out) + '<i class="sbar"></i></pre>'

def rfile(open_=True):
    return ('<div class="rfile"><span class="ic2"><i data-i="filetext"></i></span><div class="l"><b>rago-report-2026-11-22-1342.txt</b>'
            f'<span>14 KB</span></div><span class="lnk">{"hide" if open_ else "see what&#39;s inside"}</span>'
            '<span class="btn sm"><i data-i="folder"></i>show in folder</span></div>')

def share():
    random.seed(5)
    ticks = '<span class="g" style="--n:21">' + '<i class="on"></i>' * 21 + '</span>'
    sig = (f'<div class="ping sig"><div class="pv"><b>21</b><span>tweaks<small>in your code, ready to send</small></span></div>'
           f'<div class="ticks">{ticks}</div></div>')
    fresh_reboot = (1, 4, 8, 12)
    left = f"""
      <section><div class="sh"><h2 class="h2 tape">share a preset</h2><span class="vt2 ok">21 tweaks on</span></div>
        <p class="lead3">Your current tweaks and variants become a code. Nothing about your PC is in it.</p>
        <div class="panel shp">
          <div class="fld"><label class="lbl">preset name</label><div class="in3">Bedwars, low ping</div><p class="hint2">Your friend sees it when pasting the code.</p></div>
          {ticket('Bedwars, low ping', 21)}
          <div class="shrow"><span class="btn sm"><i data-i="download"></i>save as .rago file</span></div>
        </div>
      </section>
      <section><div class="sh"><h2 class="h2 tape">import a friend's preset</h2></div>
        <div class="panel shp">
          {paste()}
          {preview("Kev's bridge preset", 24, fresh=15, already=7, unavail=2, reboot=fresh_reboot,
                   actions='<span class="btn sm red"><i data-i="plus"></i>add to my selection</span>')}
          {keep("Kev's bridge preset")}
        </div>
      </section>"""
    right = f"""
      <section><div class="sh"><h2 class="h2 tape">support report</h2><span class="fold">for a ticket on discord</span></div>
        <p class="lead3">Creates a text file you drop into your ticket. Your name, PC name, email, license key and IP addresses are hidden. Nothing is sent.</p>
        <div class="panel shp">
          {parts()}
          {rfile()}
          {report_text()}
          <div class="shrow end"><span class="btn sm"><i data-i="refresh"></i>create again</span><span class="btn sm red"><i data-i="chat"></i>open discord support</span></div>
        </div>
      </section>"""
    body = f'    <div class="setgrid shgrid"><div class="col">{left}</div><div class="col">{right}</div></div>\n'
    kick = '<span class="bk"><i data-i="left"></i>settings</span> <b>//</b> send your setup to a friend, or give support everything in one file'
    return shell('settings', 'Share and support', kick, sig, body, fs=96)

def card(cap, inner, cls=''):
    cap = cap.replace(' // ', ' <b>//</b> ')
    return f'<div class="stx"><p class="stc">{cap}</p><div class="panel shp{(" " + cls) if cls else ""}">{inner}</div></div>'

def share_states():
    err = lambda t: f'<p class="err2"><i data-i="alert"></i>{t}</p>'
    cards = [
        card('import // added and kept',
             preview("Kev's bridge preset", 24, fresh=15, already=7, unavail=2, reboot=(1, 4, 8, 12),
                     actions='<span class="ok3"><i data-i="check"></i>15 tweaks added to your selection. Apply them from the bar at the bottom.</span>')
             + keep('', saved=True)),
        card('import // nothing new',
             preview('Hypixel clean', 9, already=9,
                     actions='<span class="ok3 dim">Nothing to add: everything is already on.</span>')),
        card('import // free plan',
             preview('Valorant ranked', 18, fresh=11, already=4, locked=3, reboot=(2, 6),
                     actions='<span class="btn sm gh2">get premium</span><span class="btn sm red"><i data-i="plus"></i>add to my selection</span>')),
        card('import // not a code', paste('yo check my settings lol', 'bad') + err("That isn't a Rago Optimizer preset code. Check it was copied in full.")),
        card('import // newer app', paste(FRIEND[:60], 'bad') + err('This preset comes from a newer Rago Optimizer. Update the app to open it.')),
        card('import // damaged code', paste(FRIEND[:44], 'bad') + err("This code is incomplete or damaged. Ask your friend to copy it again with the Copy button, or to send you the .rago file.")),
        card('share // no tweak on', '<div class="emp2"><i data-i="sliders"></i><p>No tweak is on yet. Turn on the ones you want to share and the code builds itself.</p></div>'),
        card('share // copied', ticket('Bedwars, low ping', 21, copied=True)),
        card('report // creating', parts((4,)) + '<div class="shrow end"><span class="btn sm red busy"><i data-i="loader"></i>create the report</span></div>'),
        card('report // created, closed', rfile(False) + '<div class="shrow end"><span class="btn sm"><i data-i="refresh"></i>create again</span><span class="btn sm red"><i data-i="chat"></i>open discord support</span></div>'),
        card('report // nothing picked', '<div class="chl">' + ''.join(f'<div class="cr off"><i class="cbx"></i><span>{t}</span></div>' for t, _ in PARTS) + '</div><div class="shrow end"><span class="btn sm red dis2">create the report</span></div>'),
        card('report // failed', parts() + err("The report couldn't be created. Try again.") + '<div class="shrow end"><span class="btn sm red">create the report</span></div>'),
    ]
    body = '    <div class="st3">' + ''.join(cards) + '</div>\n'
    kick = '<span class="bk"><i data-i="left"></i>settings</span> <b>//</b> every state of the code, the import and the report'
    return shell('settings', 'Share and support', kick, '', body, fs=96)

if __name__ == '__main__':
    (OUT / 'pages.css').write_text((HERE / 'pages.css').read_text())
    (OUT / 'app-mouse.html').write_text(mouse())
    (OUT / 'app-settings.html').write_text(settings())
    (OUT / 'app-settings-free.html').write_text(settings('free'))
    (OUT / 'app-settings-canceled.html').write_text(settings('canceled'))
    (OUT / 'app-share.html').write_text(share())
    (OUT / 'app-share-states.html').write_text(share_states())
    print('wrote mouse, settings, share, share-states')
