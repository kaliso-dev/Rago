# Génère les maquettes v5 des fenêtres de l'app (lot 2) : confirmations, écran d'exécution, etc.
# Textes : ceux de l'app (components/*.tsx et lib/i18n.ts). Styles : rago5.css + module.css + win.css.
# Les fenêtres se posent sur une capture floutée de la page d'où elles s'ouvrent (img/under/*.png).
import html
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/src')
def esc(s): return html.escape(s, quote=True)

HEAD = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Rago, {title}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="module.css">
<link rel="stylesheet" href="pages.css">
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="win.css">
<script>for (const c of ['round', 'poster']) if (location.hash.includes(c)) document.documentElement.classList.add(c);</script>
</head>
<!-- {title}, généré par gen_win.py. -->
<body>
<div class="win ov {cls}">
{body}
</div>
<script src="icons.js"></script>
</body></html>
'''
def page(title, body, cls=''):
    return HEAD.format(title=esc(title), body=body, cls=cls)

WC = ('<span class="wc2"><span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 7h10"/></svg></span>'
      '<span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="9" height="9"/></svg></span>'
      '<span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3l8 8M11 3l-8 8"/></svg></span></span>')
def under(name):
    return f'  <img class="under" src="img/under/{name}.png" alt="">\n  <div class="dim2"></div>\n'

# ------------------------------------------------------------------------------------------- Confirmation
def cbx(on): return f'<i class="cbx{" on" if on else ""}"></i>'
def item(name, variant='', reboot=False, badge='', undo=False):
    return (f'<li{" class=u" if undo else ""}><i class="tk"></i><b>{esc(name)}</b>'
            + (f'<span class="vr">{esc(variant)}</span>' if variant else '') + '<i class="sp"></i>'
            + ('<i data-i="rotate" class="rb"></i>' if reboot else '')
            + (f'<span class="adv">{badge}</span>' if badge else '') + '</li>')
def restore(on, hint):
    return (f'<div class="opt{" on" if on else ""}">{cbx(on)}<div><b><i data-i="shield"></i>Create a restore point first</b>'
            f'<small>{esc(hint)}</small></div></div>')
REBOOT = '<p class="rbn"><i data-i="power"></i>Restart your PC for everything to take effect.</p>'
def modal(title, lead, inner, go, cls=''):
    return (f'  <div class="mdl{(" " + cls) if cls else ""}">\n'
            f'    <h2 class="h2 tape mt">{esc(title)}</h2>\n    <p class="ml">{esc(lead)}</p>\n    {inner}\n'
            f'    <div class="mf"><span class="btn gh2">cancel</span><span class="btn red">{go}</span></div>\n  </div>\n')

def confirm_apply():
    lst = '<ul class="cl">' + ''.join([
        item('Per-game advanced priority', 'Valorant', True),
        item('Win32 priority separation', '', True),
        item('System clock priority (IRQ8)', '', True),
        item('Advanced resource policy', '', True, 'advanced')]) + '</ul>'
    inner = lst + restore(True, "Recommended for Advanced resource policy: advanced, or the app can't fully put it back the way it was.") + REBOOT
    return page('Apply 4 tweaks', under('latency') + modal('Apply 4 tweaks?', 'Rago Optimizer will change these Windows settings. Everything is logged so you can see what changed.', inner, 'apply now'))

def confirm_single():
    inner = restore(False, 'Optional: Rago Optimizer already made one recently (13:05).')
    return page('Remove ghost devices', under('tools') + modal('Remove ghost devices', 'Removes unplugged devices that Windows still keeps on record (old USB drives, headsets, etc.).', inner, 'run', 'sm'))

def confirm_undo():
    lst = '<ul class="cl">' + ''.join([item('Advanced resource policy', '', True, 'advanced', True), item('System clock priority (IRQ8)', '', True, '', True)]) + '</ul>'
    return page('Undo 2 tweaks', under('latency') + modal('Undo 2 tweaks?', 'Rago Optimizer puts these Windows settings back the way they were.', lst + REBOOT, 'undo now'))

UNDO_ALL = [('Ultimate power plan', 1, 'advanced'), ('Windows Game Mode', 0, ''), ('Disable preemption', 1, 'advanced'), ('Input queue size', 1, ''),
            ('1:1 movement, no smoothing', 1, ''), ('Disable mouse acceleration', 1, ''), ('System clock priority (IRQ8)', 1, ''), ('Win32 priority separation', 1, ''),
            ('Graphics thread priority', 1, ''), ('System responsiveness 0%', 1, ''), ('Multimedia scheduler (MMCSS)', 1, ''), ('Per-game advanced priority', 1, ''),
            ('Priority optimization', 1, ''), ('DirectX settings', 1, ''), ('General latency optimizations', 1, ''), ('MSI mode on network adapter', 1, ''),
            ('Use Cloudflare and Google DNS', 1, ''), ('Disable NIC power saving', 1, ''), ('Remove network throttling', 1, ''), ("Disable Nagle's algorithm", 1, ''),
            ('Ping optimization', 1, ''), ('Lower service priority', 1, 'removed')]
def confirm_undo_all():
    lst = '<div class="clw"><ul class="cl">' + ''.join(item(n, '', bool(r), b, True) for n, r, b in UNDO_ALL) + '</ul><i class="sbar2"></i></div>'
    return page('Undo everything', under('restore') + modal('Undo everything?', "Rago Optimizer puts Windows back the way it was for the 22 tweaks applied on this PC, newest first. Your license doesn't change.", lst + REBOOT, 'undo all'))

def confirm_warn():
    lst = ('<p class="grp">to apply</p><ul class="cl">' + item('Disable Bluetooth', '', True, 'advanced') + item('Turn off OneDrive', '', True, 'advanced') + '</ul>'
           '<p class="grp">to undo, back to how it was</p><ul class="cl">' + item('Disable mouse acceleration', '', True, '', True) + '</ul>')
    warn = ('<div class="wrn"><p class="grp">read this first</p>'
            '<p><i data-i="alert"></i><span><b>Disable Bluetooth.</b> Bluetooth headsets, controllers and mice stop working until you turn it back on.</span></p>'
            "<p><i data-i=\"alert\"></i><span><b>Turn off OneDrive.</b> OneDrive stops syncing: files kept only online won't open until you undo it.</span></p></div>")
    inner = lst + warn + restore(True, "Recommended for Disable Bluetooth, Turn off OneDrive: advanced, or the app can't fully put them back the way they were.") + REBOOT
    return page('Apply 3 changes', under('windows') + modal('Apply 3 changes?', 'Rago Optimizer will change these Windows settings. Everything is logged so you can see what changed.', inner, 'apply now'))

# ------------------------------------------------------------------------------------------- Écran d'exécution
RUN = [('Create a restore point', 6.8), ('Ping optimization', 1.9), ("Disable Nagle's algorithm", .4), ('Remove network throttling', .2), ('Disable NIC power saving', 2.6),
       ('Use Cloudflare and Google DNS', 1.1), ('MSI mode on network adapter', .7), ('General latency optimizations', 1.4), ('DirectX settings', .3),
       ('Priority optimization', .2), ('Per-game advanced priority', .5), ('Multimedia scheduler (MMCSS)', .2), ('System responsiveness 0%', .1),
       ('Graphics thread priority', .2), ('Win32 priority separation', .1), ('System clock priority (IRQ8)', .1), ('Disable mouse acceleration', .3),
       ('1:1 movement, no smoothing', .3), ('Input queue size', .2), ('Disable preemption', .9), ('Windows Game Mode', .4), ('Ultimate power plan', 2.1)]
IC = {'ok': '<i data-i="check"></i>', 'error': '<i data-i="x"></i>', 'running': '<i data-i="loader"></i>', 'pending': '<i class="pd"></i>'}
def rows(status):
    out = []
    for i, (n, s) in enumerate(RUN):
        st = status(i)
        ms = f'<span class="ms">{s:.1f} s</span>' if st in ('ok', 'error') else ''
        out.append(f'<li class="{st}"><span class="si">{IC[st]}</span><span class="nm2">{esc(n)}</span>{ms}</li>')
    return '<ol class="rl">' + ''.join(out) + '</ol>'

LOG_OK = [('rst_point', 'The operation completed successfully.'), ('ping_main', '- Saved how 9 settings were before, to put them back if you turn this off'),
          ('ping_main', 'The operation completed successfully.'), ('net_nagle', '- Disabling Nagle on 2 network adapters'),
          ('net_nagle', 'The operation completed successfully.'), ('net_throttle', 'The operation completed successfully.'),
          ('net_powersave', '- Realtek PCIe 2.5GbE: Green Ethernet off, Wake on LAN off'), ('net_powersave', 'The operation completed successfully.'),
          ('net_dns', '- Ethernet: 1.1.1.1, 8.8.8.8'), ('net_msi', 'The operation completed successfully.'),
          ('lat_general', 'The operation completed successfully.'), ('lat_general', 'The operation completed successfully.')]
def console(lines, open_log=False):
    body = ''.join(f'<div{" class=err" if l.startswith("!") else ""}><span class="cid">{esc(i)}</span> {esc(l)}</div>' for i, l in lines)
    return (f'<div class="ch"><span class="lbl">log</span>' + ('<span class="lnk"><i data-i="folder"></i>open log</span>' if open_log else '')
            + f'</div><div class="cs">{body}</div>')

def segs(done, running=None, failed=()):
    return '<div class="pg2">' + ''.join(
        f'<i class="{"x" if i in failed else "d" if i < done else "r" if i == running else ""}"></i>' for i in range(len(RUN))) + '</div>'

def run_page(title, state, done, prog, current, actions, status, log, open_log=False, cls=''):
    hero = (f'<div class="hero2"><img class="rlogo" src="img/rago-app-dark-128.svg" alt="">'
            f'<p class="rst">{state}</p>'
            f'<div class="ctr"><b>{done:02d}</b><span>/{len(RUN):02d}</span></div>'
            f'{prog}<div class="cur">{current}</div><div class="ra">{actions}</div></div>')
    side = f'<div class="side2">{rows(status)}{console(log, open_log)}</div>'
    return page(title, f'  <img class="under blur" src="img/under/latency.png" alt="">\n  <div class="run2">{WC}{hero}{side}</div>\n', 'runw ' + cls)

def run_running():
    st = lambda i: 'ok' if i < 8 else 'running' if i == 8 else 'pending'
    return run_page('Optimizing', '<i class="lv"></i>optimizing…', 8, segs(8, 8), '<span class="nm3">DirectX settings</span>',
                    '<span class="btn"><i data-i="stop"></i>stop</span>', st, LOG_OK)

def run_done():
    st = lambda i: 'ok'
    log = LOG_OK[4:] + [('in_queue', 'The operation completed successfully.'), ('nv_preemption', 'The operation completed successfully.'),
                        ('win_gamemode', 'The operation completed successfully.'), ('pow_ultimate', 'Power scheme GUID: e9a42b02-d5df-448d-aa00-03f14749eb61  (Ultimate Performance) *')]
    cur = ('<p class="sum">22 of 22 done in 21.4 s</p>'
           '<span class="up2"><i data-i="check"></i>measure the difference<i data-i="right"></i></span>')
    return run_page('Done', 'done', 22, segs(22), cur, '<span class="btn">close</span>', st, log, True, 'fin')

def run_failed():
    bad = (6, 21)
    st = lambda i: 'error' if i in bad else 'ok'
    log = LOG_OK[6:10] + [('net_msi', '! ERROR: The system was unable to find the specified registry key or value.'),
                          ('lat_general', 'The operation completed successfully.'), ('nv_preemption', 'The operation completed successfully.'),
                          ('pow_ultimate', '! Unable to create a new power scheme. The plan may be blocked by your PC maker or a group policy.')]
    cur = ('<p class="sum">20 of 22 done in 22.9 s</p>'
           '<p class="er3"><i data-i="alert"></i>2 failed. The log has the details.</p>')
    return run_page('2 failed', 'done', 22, segs(22, None, bad), cur, '<span class="btn">close</span>', st, log, True, 'fin')

def run_reboot():
    st = lambda i: 'ok'
    log = LOG_OK[4:] + [('nv_preemption', 'The operation completed successfully.'), ('win_gamemode', 'The operation completed successfully.'),
                        ('pow_ultimate', 'Power scheme GUID: e9a42b02-d5df-448d-aa00-03f14749eb61  (Ultimate Performance) *')]
    cur = ('<p class="sum">22 of 22 done in 21.4 s</p>'
           '<p class="rb3"><i data-i="power"></i>Restart your PC for everything to take effect.</p>'
           '<span class="up2 prem"><i data-i="sparkles"></i>Premium unlocks 145 more tweaks, including the Minecraft PvP preset.<i data-i="right"></i></span>')
    acts = '<span class="btn red lg"><i data-i="power"></i>restart now</span><span class="btn gh2">close</span>'
    return run_page('Restart needed', 'done', 22, segs(22), cur, acts, st, log, True, 'fin')

# ------------------------------------------------------------------------------------------- Premium (Upsell)
BENEFITS = ['Every module: ping, hitreg, graphics card, CPU, Windows', 'Rago game mode, RBW Mod and the Minecraft settings',
            'One-click presets, including Minecraft PvP', 'Expert mode and every new tweak we add']
LEAD = 'The free plan opens 73 tweaks. Premium opens everything else, on your PC.'
def plans():
    return ('<p class="grp">choose your plan</p><div class="pls">'
            '<div class="pl3 on"><i class="rd"></i><b>yearly</b><span class="pr">$29.99</span><small>$2.50 a month, billed $29.99 once a year</small></div>'
            '<div class="pl3"><i class="rd"></i><b>monthly</b><span class="pr">$5.99</span><small>Billed $5.99 every month</small></div></div>'
            '<p class="prm"><span><i data-i="check"></i>Undo stays free, always</span><span><i data-i="check"></i>Cancel anytime, from the app or your account</span></p>'
            '<span class="btn red lg cta">start 3-day free trial<i data-i="arrow"></i></span>'
            '<p class="tn">Card required. Free for 3 days, then the monthly plan at $5.99 a month, charged automatically on day 3 unless you cancel before. One trial per person.</p>'
            '<div class="uln"><span class="lnk">pay now, without the trial</span><span class="lnk">i already have premium, sign in</span></div>')

def upsell(title, kicker, sig, body, back='dashboard'):
    left = (f'<div class="upl"><img src="img/rago-app-dark-64.svg" alt=""><div class="usig">{sig}</div></div>')
    right = (f'<div class="upr"><p class="ukk"><i data-i="lock"></i>{kicker}</p><h2 class="h2 tape mt">{esc(title)}</h2>{body}</div>')
    return page(title, under(back) + f'  <div class="mdl ups">{left}{right}</div>\n')

SIG_ALL = '<b>218</b><span>tweaks</span><small>73 open on the free plan</small>'
def benefits():
    return f'<p class="ml">{LEAD}</p><ul class="bn">' + ''.join(f'<li><i data-i="check"></i>{b}</li>' for b in BENEFITS) + '</ul>'

def up_tweak():  return upsell('Disable preemption is part of Premium', 'This tweak is part of Premium', SIG_ALL, benefits() + plans(), 'latency')
def up_plan():   return upsell('Unlock everything with Premium', 'Free plan', SIG_ALL, benefits() + plans())
def up_preset(): return upsell('Unlock all 218 tweaks', 'Presets are part of Premium', '<b>20</b><span>presets</span><small>One click each, Minecraft PvP included</small>', benefits() + plans())
def up_slots():
    body = ('<p class="ml">The free plan keeps 30 tweaks on at the same time. Undo one to turn on another, or get Premium: no limit.</p>'
            '<div class="slt">' + '<i></i>' * 30 + '</div>' + plans())
    return upsell('Your 30 free slots are full', 'Free plan', '<b>30<em>/30</em></b><span>free slots</span><small>All in use on this PC</small>', body, 'latency')
def up_analysis():
    rows = [('Jitter', '14 ms'), ('1% low', '141 fps'), ('Power plan', 'Balanced')]
    body = ('<ul class="fnd">' + ''.join(f'<li><b>{a}</b><span>{b}</span></li>' for a, b in rows) + '</ul>'
            '<p class="ml sm2">The free plan fixes 3, and 2 are for you to do: the analysis says how.</p>' + plans())
    return upsell('Premium acts on 3 of the 8 things we found', 'Free plan', '<b>3<em>/8</em></b><span>found by the analysis</span><small>Fixed by Premium on this PC</small>', body, 'analysis')
def up_sent():
    body = ("<p class=\"ml\">Finish in your browser. Once it's paid, create your account with the same email, then sign in here: Premium turns on for this PC.</p>"
            '<div class="brw"><i data-i="globe"></i><span>rago-optimizer.com</span><i class="lv"></i><em>waiting for payment</em></div>'
            '<span class="btn red lg cta">sign in<i data-i="arrow"></i></span><div class="uln"><span class="lnk">back to the plans</span></div>')
    return upsell('Unlock everything with Premium', 'Free plan', SIG_ALL, body)

# ------------------------------------------------------------------------------------------- Connexion (LicenseGate)
GOOGLE = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/></svg>'
DISCORD = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#5865F2" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.6 19.6 0 0 0-4.9 1.5C.6 9.1-.3 13.6.2 18a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.7 19.7 0 0 0 6-3c.5-5.1-.8-9.6-3.5-13.6zM8 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4zm8 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4z"/></svg>'
def gate(title, inner):
    brand = '<div class="gb"><img src="img/rago-app-dark-64.svg" alt=""><b>rago <span>optimizer</span></b><em>premium</em></div>'
    return page(title, under('dashboard') + f'  <div class="mdl gate2">{brand}{inner}</div>\n')
def gerr(t, links=''):
    return f'<div class="err2"><i data-i="alert"></i><span>{t}{links}</span></div>'
def signin_form(email='', err=''):
    return ('<h2 class="h2 tape mt">sign in to rago optimizer</h2><p class="ml">Use the email and password from your Rago account.</p>'
            f'<div class="oa"><span class="btn lg">{GOOGLE}continue with google</span><span class="btn lg">{DISCORD}continue with discord</span></div>'
            '<p class="or2"><span>or with your email</span></p>'
            f'<label class="fl2"><span>email</span><div class="in3{" fo" if email and not err else ""}">{esc(email)}</div></label>'
            f'<label class="fl2"><span>password</span><div class="in3">{"•" * 10 if email else ""}</div></label>'
            + err + '<span class="btn red lg cta">sign in<i data-i="arrow"></i></span>'
            '<p class="lk3"><i data-i="lock"></i>Your license will be locked to this device.</p>'
            '<div class="uln"><span class="lnk">create account</span><span class="lnk">forgot your password?</span></div>')
def gate_signin(): return gate('Sign in', signin_form())
def gate_error(): return gate('Sign in, wrong password', signin_form('player@example.com', gerr("That email and password don't match. Try again or reset your password.")))
def gate_browser():
    code = ''.join(f'<span>{c}</span>' for c in 'K7MQ')
    inner = ('<h2 class="h2 tape mt">finish in your browser</h2><p class="ml">Sign in on the page that just opened, check that it shows this code, then confirm.</p>'
             f'<div class="cd2">{code}</div>'
             '<p class="wt"><i data-i="loader"></i>Rago Optimizer signs in on its own as soon as you confirm.</p>'
             '<div class="uln"><span class="lnk"><i data-i="left"></i>back</span></div>')
    return gate('Finish in your browser', inner)
def device():
    return '<div class="dv"><span class="ic2"><i data-i="monitor"></i></span><div><b>DESKTOP-RAGO</b><span>Windows 11 Pro</span></div></div>'
def gate_confirm(err=''):
    inner = ('<h2 class="h2 tape mt">activate rago optimizer on this pc?</h2><p class="ml">Your license will be locked to this device: DESKTOP-RAGO.</p>'
             + device() + '<dl class="fx"><div><dt>email</dt><dd>player@example.com</dd></div><div><dt>license key</dt><dd>RAGO-••••-••••-7F2K</dd></div></dl>'
             + err + '<span class="btn red lg cta">activate<i data-i="lock"></i></span><div class="uln"><span class="lnk"><i data-i="left"></i>back</span></div>')
    return gate('Activate on this PC', inner)
def gate_other():
    links = '<span class="gl2"><span class="lnk">manage account<i data-i="arrow"></i></span><span class="lnk">get help on discord<i data-i="arrow"></i></span></span>'
    return gate_confirm(gerr('This license is already active on another PC. Rago Optimizer works on one device per license. Changed PCs? Your account page shows how to move your license.', links))
def gate_success():
    inner = ('<div class="ok4"><i data-i="check"></i></div><h2 class="h2 tape mt">license active. rago optimizer is ready.</h2><p class="ml">All 218 tweaks are unlocked.</p>'
             '<div class="dv"><span class="ic2"><i data-i="monitor"></i></span><div><b>Locked to DESKTOP-RAGO · Nov 22, 2026</b><span>RAGO-••••-••••-7F2K</span></div></div>'
             '<span class="btn red lg cta">start optimizing<i data-i="arrow"></i></span>')
    return gate('License active', inner)

# ------------------------------------------------------------------------------------------- Recherche, éditeur de preset
def search():
    res = [('Priority optimization', 'Latency', 'on'), ('Per-game advanced priority', 'Latency', 'on'), ('Graphics thread priority', 'Latency', ''),
           ('Win32 priority separation', 'Latency', ''), ('System clock priority (IRQ8)', 'Latency', ''), ('DNS resolution priority', 'Network', ''),
           ('Input driver priority', 'Latency', ''), ('I/O priority', 'Expert mode', '')]
    li = ''.join(f'<li{" class=act" if i == 0 else ""}><div class="l"><b>{esc(n)}</b><span>{m}</span></div>'
                 f'<span class="tg2{" on" if st else ""}">{"<i data-i=check></i>" if st else "<i data-i=plus></i>"}</span>'
                 + ('<i data-i="enter" class="ent"></i>' if i == 0 else '<i class="ent"></i>') + '</li>' for i, (n, m, st) in enumerate(res))
    box = (f'  <div class="pal"><div class="pin"><i data-i="search"></i><span class="q">priority<i class="caret"></i></span><kbd>esc</kbd></div>'
           f'<ul class="pls2">{li}</ul></div>\n')
    return page('Search', under('dashboard') + box)

def preset_editor():
    rows = [('Hitreg profile', 'Network', 'Hypixel'), ('Ping optimization', 'Network', 'Config 2'), ('Remove network throttling', 'Network', ''),
            ('Per-game advanced priority', 'Latency', 'Minecraft'), ('Input queue size', 'Hitreg', 'Low'), ('1:1 movement, no smoothing', 'Latency', '')]
    li = ''.join(f'<li><div class="l"><b>{esc(n)}</b><span>{m}</span></div>' + (f'<span class="sel2">{v}<i data-i="chev"></i></span>' if v else '')
                 + '<span class="rm"><i data-i="x"></i></span></li>' for n, m, v in rows)
    inner = ('<div class="fl2"><span>preset name</span><div class="in3">Bedwars, low ping</div></div>'
             '<div class="peh"><span class="grp">6 tweaks</span><span class="lnk"><i data-i="list"></i>add my tweaks that are on (21)</span></div>'
             f'<ul class="pel">{li}</ul>'
             '<div class="pes"><div class="in3 fo"><i data-i="search"></i>nagle<i class="caret"></i></div>'
             '<ul class="pef"><li><i data-i="plus"></i><div class="l"><b>Disable Nagle\'s algorithm</b><span>Network</span></div></li></ul></div>')
    body = (f'  <div class="mdl pe2"><h2 class="h2 tape mt">edit the preset</h2>'
            '<p class="ml">Rename it, remove or add tweaks, pick their variants. Nothing is applied until you add it to your selection.</p>'
            f'{inner}<div class="mf"><span class="btn gh2">cancel</span><span class="btn red">save</span></div></div>\n')
    return page('Edit the preset', under('dashboard') + body)

# ------------------------------------------------------------------------------------------- Avis, toasts
STARS = lambda n: '<span class="st4">' + ''.join(f'<i class="{"on" if i < n else ""}"><svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg></i>' for i in range(5)) + '</span>'
def review_prompt():
    card = ('  <aside class="rvp"><span class="cx"><i data-i="x"></i></span>' + STARS(5) +
            '<b>Enjoying Rago Optimizer?</b><p>Leave a quick review. It shows on the website with your public name.</p>'
            '<div class="ra2"><span class="btn sm red">leave a review</span><span class="btn sm gh2">not now</span></div></aside>\n')
    return page('Review prompt', '  <img class="under" src="img/under/dashboard.png" alt="" style="filter:none">\n' + card, 'flat')
def toasts():
    t = ('  <div class="tst">'
         '<div class="ts2 warn"><i data-i="rotate"></i><span>Rago Optimizer fixed a value that can crash Windows. Restart your PC to finish: Restart, not Shut down.</span></div>'
         '<div class="ts2 warn"><i data-i="alert"></i><span>2 tweaks couldn\'t be put back: details in History (Restore module)</span></div>'
         '<div class="ts2"><i data-i="check"></i><span>Tweaks have been reset</span></div></div>\n')
    return page('Toasts', '  <img class="under" src="img/under/dashboard.png" alt="" style="filter:none">\n' + t, 'flat')
def review_write(edit=False):
    inner = ('<p class="grp">rating</p>' + STARS(5).replace('st4', 'st4 big') +
             '<div class="fl2"><span>your review</span><div class="in3 ta fo">Ping went from spiky to flat on Hypixel. The network test alone is worth it.<i class="caret"></i><small>79 / 600</small></div></div>'
             '<div class="fl2"><span>public name</span><div class="pnm"><span class="av">p</span><div class="in3">Player</div></div>'
             '<p class="hint2">Shown with your review on the website. Your email is never shown.</p></div>')
    title = 'edit your review' if edit else 'your review'
    body = (f'  <div class="mdl rv2"><h2 class="h2 tape mt">{title}</h2><p class="ml">Rate Rago Optimizer and say what it changed for you. You can edit it later.</p>'
            f'{inner}<div class="mf"><span class="btn gh2">cancel</span><span class="btn red">{"update review" if edit else "post review"}</span></div></div>\n')
    return page('Your review', under('dashboard') + body)
def review_signin():
    inner = ('<h2 class="h2 tape mt">sign in to leave a review</h2><p class="ml">Use the email and password from your Rago account. Your email is never shown.</p>'
             '<label class="fl2"><span>email</span><div class="in3 fo">player@example.com<i class="caret"></i></div></label>'
             '<label class="fl2"><span>password</span><div class="in3"></div></label>'
             '<span class="btn red lg cta">sign in<i data-i="arrow"></i></span>'
             '<div class="uln"><span class="lnk">create an account</span><span class="lnk">forgot your password?</span></div>')
    return page('Sign in to leave a review', under('dashboard') + f'  <div class="mdl gate2">{inner}</div>\n')
def review_thanks():
    inner = ('<div class="ok4"><i data-i="check"></i></div><h2 class="h2 tape mt">thanks for your review.</h2>'
             '<p class="ml">It shows on the website within a minute, with your name and photo.</p>'
             '<div class="rvq"><span class="av">p</span><div><b>Player</b>' + STARS(5) + '<p>"Ping went from spiky to flat on Hypixel. The network test alone is worth it."</p></div></div>'
             '<div class="mf"><span class="btn">close</span></div>')
    return page('Thanks for your review', under('dashboard') + f'  <div class="mdl gate2">{inner}</div>\n')

# ------------------------------------------------------------------------------------------- Résilier et se déconnecter
# SubscriptionCard.tsx (« Before you cancel » : un seul écran, deux boutons de même taille, pas de remise) et la
# déconnexion de Settings.tsx. Textes : i18n.ts (sub.*, signout.*). 21 tweaks appliqués, l'avant/après de l'analyse.
def cfact(icon, text):
    return f'<li><i data-i="{icon}"></i><span>{text}</span></li>'

def cancel_before():
    facts = ('<ul class="cf">'
             + cfact('clock', 'Premium stays active until <b>December 14, 2026</b>. Nothing more is charged.')
             + cfact('undo', 'That day, Rago puts back the Windows settings of your <b>21 applied tweaks</b>.')
             + cfact('activity', 'Measured on this PC with your tweaks: <b>jitter 14 ms &rarr; 6 ms, processes 214 &rarr; 151</b>.')
             + cfact('shield', 'Undoing a tweak stays free, always.') + '</ul>')
    return page('Before you cancel', under('settings') + f'''  <div class="mdl sm cxm">
    <h2 class="h2 tape mt">before you cancel</h2>
    {facts}
    <div class="mf even"><span class="btn">keep premium</span><span class="btn">cancel subscription</span></div>
  </div>
''')

def cancel_done():
    return page('Subscription canceled', under('settings') + '''  <div class="mdl sm cxm">
    <h2 class="h2 tape mt">subscription canceled</h2>
    <p class="ml">Premium stays active until December 14, 2026. No more charges. A confirmation is in your email.</p>
    <div class="mf"><span class="btn red">close</span></div>
  </div>
''')

def sign_out():
    return page('Sign out', under('settings') + '''  <div class="mdl cxm">
    <h2 class="h2 tape mt">sign out?</h2>
    <p class="ml hi">Your 21 applied tweaks will be undone, free ones included: Rago Optimizer puts those Windows settings back the way they were, in the background. You can keep using your PC, or close the app: it keeps going.</p>
    <p class="ml">Signing out doesn't free this PC: your license stays locked to DESKTOP-RAGO. To move it to another PC, use your account page.</p>
    <div class="mf"><span class="btn gh2 pl"><i data-i="user"></i>manage account</span><span class="btn gh2">cancel</span><span class="btn red"><i data-i="logout"></i>undo and sign out</span></div>
  </div>
''')

PAGES = {
    'app-confirm-apply': confirm_apply, 'app-confirm-single': confirm_single, 'app-confirm-undo': confirm_undo,
    'app-confirm-undoall': confirm_undo_all, 'app-confirm-warn': confirm_warn,
    'app-upsell-tweak': up_tweak, 'app-upsell-plan': up_plan, 'app-upsell-preset': up_preset, 'app-upsell-slots': up_slots,
    'app-upsell-analysis': up_analysis, 'app-upsell-sent': up_sent,
    'app-gate-signin': gate_signin, 'app-gate-error': gate_error, 'app-gate-browser': gate_browser, 'app-gate-confirm': gate_confirm,
    'app-gate-other': gate_other, 'app-gate-success': gate_success,
    'app-search': search, 'app-preset-editor': preset_editor, 'app-review-prompt': review_prompt, 'app-toasts': toasts,
    'app-review-write': review_write, 'app-review-signin': review_signin, 'app-review-thanks': review_thanks,
    'app-cancel-before': cancel_before, 'app-cancel-done': cancel_done, 'app-signout': sign_out,
    'app-run-running': run_running, 'app-run-done': run_done, 'app-run-failed': run_failed, 'app-run-reboot': run_reboot,
}
if __name__ == '__main__':
    (OUT / 'win.css').write_text((HERE / 'win.css').read_text())
    for k, f in PAGES.items(): (OUT / f'{k}.html').write_text(f())
    print('wrote', len(PAGES), 'pages')
