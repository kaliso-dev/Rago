# Génère les pages module v5 (app-module-<id>.html) depuis le catalogue de l'app (lecture seule).
# python3 gen.py [module ...]   (sans argument : tous les modules décrits dans STATES)
# Le PC de démonstration : Ryzen, 32 Go, GeForce, joue à Valorant et à Minecraft.
import json, html, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = Path('/home/claude/kaliso-dev/rago/app/src/data')
OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/src')
CAT = json.load(open(DATA / 'catalog.json'))
FREE = set(json.load(open(DATA / 'free.json'))['tweaks'])
SESSION = {'game_mode', 'rbw_mode', 'win_gamemode'}   # SESSION_TOGGLES de l'app : boutons Turn on / Turn off
TW, HOME = {}, {}
for m in CAT['modules']:
    for s in m['sections']:
        for t in s['tweaks']:
            if 'ref' not in t:
                TW[t['id']] = t
                HOME[t['id']] = m['name']['en']

def esc(s): return html.escape(s, quote=True)
def items(sec): return [TW[t['ref']] if 'ref' in t else t for t in sec['tweaks']]
def refs(sec): return {t['ref'] for t in sec['tweaks'] if 'ref' in t}
def is_tweak(t): return t.get('kind', 'tweak') == 'tweak'
def sname(s): return s.replace(' and ', ' & ')
PTR = '<svg viewBox="0 0 24 24"><path d="M5 3l14 8.2-6.3 1.4 3.9 6.9-2.8 1.6-3.9-6.9L5 19z"/></svg>'
GLYPH = {'valorant': ('V', '#FF4655', '#0A0A0B'), 'minecraft': ('M', '#5DA83A', '#0A0A0B')}

# ---------------------------------------------------------------- tuiles
def tile(t, st, adv_open=False, ref=False):
    tid = t['id']
    cls = ['tw']
    act = not is_tweak(t)
    nm = esc(t['name']['en'])
    icons = '<i data-i="zap"></i>' if (not t.get('reboot') and not act and tid not in SESSION) else ''
    on, pend, undo = tid in st.get('on', ()), tid in st.get('pend', ()), tid in st.get('undo', ())
    drift = tid in st.get('drift', ())
    blk = st.get('blocked', {}).get(tid)
    lock = st.get('free') and tid not in FREE
    note = ''
    sw = 'sw'
    if on: cls.append('on'); sw += ' on'
    if pend: cls.append('pend'); sw += ' pend'
    if undo: cls.append('undo'); sw += ' undo'; note = 'Will be undone'
    if drift: cls.append('drift'); note = '<b>Changed by Windows</b><u>apply again</u>'
    if blk: cls.append('blk'); note = esc(blk)
    if ref and not note: note = f'Also in {esc(HOME[tid])}'
    if t.get('risk') == 'advanced' and adv_open: cls.append('advx')
    if tid == st.get('hover'): cls.append('hov')
    if act:
        right = '<span class="run"><i data-i="play"></i>run</span>'
        note = st.get('ran', {}).get(tid, note)
    else:
        right = f'<i class="{sw}"></i>'
    if lock:
        cls.append('lock'); right = '<span class="lk"><i data-i="lock"></i>premium</span>'
    mid = ''
    vs = t.get('variants') or []
    if tid in SESSION:
        # réglage de session : deux boutons, l'état actuel en rouge
        cls.append('var'); cls.append('sess')
        cur = st.get('session', {}).get(tid, ('off', ''))
        note = esc(cur[1]) if cur[1] else note
        nxt = 'off' if cur[0] == 'on' else 'on'
        right = (f'<span class="sst{" is-on" if cur[0] == "on" else ""}"><i></i>{cur[0]}</span>'
                 f'<span class="sb{" go" if nxt == "on" else ""}"><i data-i="power"></i>turn {nxt}</span>')
    elif len(vs) > 1 and not blk:
        cls.append('var')
        cur = st.get('variant', {}).get(tid, t.get('defaultVariant') or vs[0]['id'])
        auto = st.get('auto', {}).get(tid)
        num = all(v['label']['en'].split()[0].isdigit() for v in vs)
        if len(vs) > 6 and not num:   # liste longue (16 jeux) : un sélecteur
            lab = next(v['label']['en'] for v in vs if v['id'] == cur)
            g, bg, fg = GLYPH.get(cur, (lab[:1], '#3A3A42', '#F5F5F6'))
            mid = (f'<span class="pick"><span class="pg" style="background:{bg};color:{fg}">{g}</span><b>{esc(lab)}</b>'
                   f'<small>{len(vs)} games</small><i data-i="chev"></i></span>')
            note = note or 'Your game runs at high priority'
        else:
            unit = vs[0]['label']['en'].split()[1] if num and len(vs[0]['label']['en'].split()) > 1 else ''
            ops = ''
            for v in vs:
                lab = v['label']['en'].split()[0] if num else v['label']['en']
                oc = 'o' + (' n' if num else '')
                if v['id'] == cur:
                    oc += ' pend' if pend else (' on' if on else ' now')
                sup = '<sup>auto</sup>' if auto == v['id'] else ''
                ops += f'<span class="{oc}">{esc(lab)}{sup}</span>'
            mid = f'<span class="opts">{ops}</span>'
            if not note:
                note = st.get('vnote', {}).get(tid) or ({'GB': 'Size of your RAM, in GB', 'Hz': "Your screen's exact rate, in Hz"}.get(unit) or ('Picked for this PC' if auto else ''))
    nr = f'<span class="nr"><span class="nm">{nm}</span>{icons}</span>'
    return (f'<div class="{" ".join(cls)}"><span class="tx">{nr}'
            + (f'<span class="note">{note}</span>' if note else '') + f'</span>{mid}{right}{pop(t, st)}</div>')

def pop(t, st):
    if t['id'] != st.get('hover'):
        return ''
    g = t.get('gain', {}).get('en'); c = t.get('cons', {}).get('en'); cf = (t.get('confirm') or {}).get('en')
    n = t.get('lines') or 0
    meta = ['<span><i data-i="rotate"></i>restart needed</span>' if t.get('reboot') else '<span><i data-i="zap"></i>no restart</span>',
            f'<span>{n} command{"s" if n != 1 else ""}</span>']
    if cf: meta.append('<span><i data-i="alert"></i>asks first</span>')
    x, y = st.get('ptr', (130, 24))
    return (f'<div class="pop{" up" if st.get("popup") else ""}"><p>{esc(t["desc"]["en"])}</p>'
            + (f'<div class="ft"><b class="g">+</b>{esc(g)}</div>' if g else '')
            + (f'<div class="ft"><b>&minus;</b>{esc(c)}</div>' if c else '')
            + f'<div class="meta">{"".join(meta)}</div></div>'
            + f'<span class="ptr" style="left:{x}px;top:{y}px">{PTR}</span>')

def section(sec, st, single):
    lst = items(sec); rf = refs(sec)
    sid = sec['id']
    sw = [t for t in lst if is_tweak(t)]
    n_on = sum(1 for t in sw if t['id'] in st.get('on', ()))
    sblk = st.get('secblock', {}).get(sid)
    folded = sid in st.get('folded', ()) or bool(sblk)
    adv_open = sid in st.get('advopen', ())
    adv = [t for t in lst if t.get('risk') == 'advanced']
    reg = [t for t in lst if t.get('risk') != 'advanced']
    body = ''.join(tile(t, st, False, t['id'] in rf) for t in reg)
    if adv:
        if adv_open:
            body += (f'<div class="advh">advanced<em>{len(adv)}</em><small>Powerful settings: read the details before turning one on.</small>'
                     f'<i class="ln"></i><span class="hd">hide<i data-i="chev"></i></span></div>')
            body += ''.join(tile(t, st, True, t['id'] in rf) for t in adv)
        else:
            body += f'<div class="tw adv"><span class="nm">advanced</span><em>{len(adv)}</em><i data-i="chev" class="chev"></i></div>'
    tag = f'<span class="tg"><i data-i="info"></i>{esc(sblk)}</span>' if sblk else ''
    fold = '' if single else f'<span class="fold">{"show" if folded else "hide"}<i data-i="chev"></i></span>'
    cnt = f'<span class="cnt">{n_on}<small> / {len(sw)}</small></span>' if sw and len(sw) * 2 > len(lst) else ''
    return (f'<section class="msec{" folded" if folded else ""}" id="sec-{sid}"><div class="sh"><h2 class="h2 tape">{esc(sname(sec["name"]["en"]))}</h2>'
            f'{cnt}{tag}{fold}</div><div class="tgrid">{body}</div></section>')

# ---------------------------------------------------------------- bloc signature (en haut à droite)
def ticks(mod, st):
    out = ''
    for sec in mod['sections']:
        sw = [t for t in items(sec) if is_tweak(t)]
        if not sw: continue
        out += f'<span class="g" style="--n:{len(sw)}">' + ''.join(
            f'<i class="{"on" if t["id"] in st.get("on", ()) else ("pd" if t["id"] in st.get("pend", ()) else "")}"></i>' for t in sw) + '</span>'
    return out

def sig(mod, st, n_on, n_own):
    if 'sig' in st:
        return st['sig']
    return (f'<div class="ping sig"><div class="pv"><b>{n_on}</b><span>/ {n_own}<small>tweaks on</small></span></div>'
            f'<div class="ticks">{ticks(mod, st)}</div></div>')

def title_size(name):
    n = len(name)
    return 150 if n <= 8 else int(150 * 8.4 / n)

# ---------------------------------------------------------------- page
def page(mid):
    st = STATES[mid]
    mod = next(m for m in CAT['modules'] if m['id'] == st.get('mod', mid))
    name = mod['name']['en']
    tag = mod['tagline']['en'].rstrip('.').lower()
    own = [t for s in mod['sections'] for t in items(s) if is_tweak(t)]
    n_on = sum(1 for t in own if t['id'] in st.get('on', ()))
    single = len(mod['sections']) == 1
    secs = '' if st.get('nosec') else ''.join(section(s, st, single) for s in mod['sections'])
    idx = ''
    if not single:
        for i, s in enumerate(mod['sections']):
            sw = [t for t in items(s) if is_tweak(t)]
            k = sum(1 for t in sw if t['id'] in st.get('on', ()))
            em = f'<em><b>{k}</b>/{len(sw)}</em>' if sw else f'<em>{len(items(s))}</em>'
            dim = ' class="off"' if s['id'] in st.get('secblock', {}) else ''
            idx += f'<span class="{"on" if i == 0 else ("off" if dim else "")}">{esc(sname(s["name"]["en"]))} {em}</span>'
    bar = st.get('bar', ('select safe', 'check'))
    barh = '\n    <div class="nobar"></div>'
    if bar:
        barh = f'''
    <div class="bar">
      <div class="tabs idx">{idx}</div>
      <span class="btn sm"><i data-i="{bar[1]}"></i>{esc(bar[0])}</span>
    </div>'''
    n_ch, ch_note = st.get('apply', (0, ''))
    fs = title_size(name)
    applyh = (f'''
  <div class="apply"><div class="ap"><b>{n_ch}</b><span class="lb">change{"s" if n_ch != 1 else ""}<small><i data-i="rotate"></i>{esc(ch_note)}</small></span><span class="clr">clear</span><span class="btn"><i data-i="zap"></i>apply</span></div></div>''' if n_ch else '')
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Rago, {esc(name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="module.css">
<style>.title{{font-size:{fs}px}}</style>
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="rail.css">
<link rel="stylesheet" href="anim.css"></head>
<!-- Page module "{esc(name)}", générée par gen.py depuis catalog.json ({len(own)} réglages, {sum(len(items(s)) for s in mod['sections']) - len(own)} actions). -->
<body data-page="{st.get('mod', mid)}"{(' data-on="' + st['on_count'] + '"') if 'on_count' in st else ''}>
<div class="win">
  <main class="main">
    <div class="topbar"><div class="search"><i data-i="search"></i>search games, tweaks, settings<kbd>ctrl k</kbd></div><span class="wc"></span></div>

    <section class="head">
      <div><p class="kick">{esc(name.lower())} <b>//</b> {esc(tag)}</p><h1 class="title" data-t="{esc(name.lower())}">{esc(name.lower())}</h1></div>
      {sig(mod, st, n_on, len(own))}
    </section>
{barh}
{st.get('before', '')}
    {secs}
{st.get('after', '')}
  </main>
{applyh}
</div>
<script>if (/nopop/.test(location.hash)) document.documentElement.classList.add('nopop');if (/fit/.test(location.hash)) document.documentElement.classList.add('fit');</script>
<script src="shell5.js"></script>
<script src="printicons.js"></script>
<script src="icons.js"></script>
<script src="anim.js"></script>
</body></html>
'''

# ---------------------------------------------------------------- blocs propres à certains modules
MC_FOLDER = '''
    <section class="msec mcf"><div class="sh"><h2 class="h2 tape">minecraft folder</h2></div>
      <div class="panel folder">
        <span class="fi"><i data-i="file"></i></span>
        <div class="fp"><span class="lbl">folder</span><b>C:\\Users\\Player\\AppData\\Roaming\\<em>.minecraft</em></b></div>
        <span class="btn sm"><i data-i="file"></i>change</span>
        <div class="fs">
          <span class="st ok"><i class="d"></i>optionsof.txt found</span>
          <span class="st"><b>2</b> backups</span>
          <span class="lnk"><i data-i="undo"></i>restore latest backup</span>
        </div>
      </div>
    </section>
'''

RBW_SVC = [('SysMain', 'stopped', 'disabled'), ('PcaSvc', 'running', 'auto'), ('DPS', 'running', 'auto'), ('BAM', 'running', 'system'),
           ('EventLog', 'running', 'auto'), ('WSearch', 'running', 'auto'), ('DusmSvc', 'running', 'auto'), ('BFE', 'running', 'auto'),
           ('AppInfo', 'running', 'manual'), ('DCOMLaunch', 'running', 'auto'), ('PlugPlay', 'running', 'manual'), ('CDPUserSvc', 'running', 'auto')]
RBW_SET = [('CMD', 'on'), ('PowerShell Scriptblock Logging', 'on'), ('Activities Cache', 'on'), ('Prefetch', 'off'), ('Jump Lists', 'on'), ('PCA Logging', 'on')]

def rbw_panel():
    def cell(n, s, start=''):
        bad = s in ('stopped', 'off', 'missing')
        return (f'<div class="ck{" bad" if bad else ""}"><b>{esc(n)}</b><span>{s}</span>'
                + (f'<small>{start}</small>' if start else '') + '</div>')
    svc = ''.join(cell(*x) for x in RBW_SVC)
    sets = ''.join(cell(*x) for x in RBW_SET)
    return f'''
    <section class="msec rbw first">
      <div class="panel verdict">
        <div class="vt"><span class="lbl">ranked bedwars check <b>//</b> rbw mod off since 18:12</span><h3>2 items red at screenshare</h3>
          <p>What the Ranked Bedwars checker reads on your PC, refreshed every 5 seconds. Turning on RBW Mod starts every service and restores every setting it reads, even if other tweaks turned them off.</p></div>
        <div class="va"><span class="ic"><i data-i="refresh"></i></span><span class="btn red lg"><i data-i="power"></i>turn on rbw mod</span></div>
      </div>
      <div class="sh"><h2 class="h2 tape">services</h2><span class="cnt">11<small> / 12 running</small></span></div>
      <div class="ckgrid">{svc}</div>
      <div class="sh s2"><h2 class="h2 tape">settings</h2><span class="cnt">5<small> / 6 on</small></span></div>
      <div class="ckgrid c3">{sets}</div>
    </section>
'''

def rbw_sig():
    t = ''.join(f'<i class="{"" if s in ("stopped", "off") else "on"}"></i>' for _, s, *_ in RBW_SVC + RBW_SET)
    return ('<div class="ping sig"><div class="pv"><b>2</b><span>red<small>at screenshare</small></span></div>'
            f'<div class="ticks"><span class="g" style="--n:12">{t[:len(t)//1]}</span></div></div>')

HISTORY = [('Disable mouse acceleration', '', True, 'Today 21:14'), ('1:1 movement, no smoothing', '', True, 'Today 21:14'),
           ('Multimedia scheduler (MMCSS)', '', True, 'Today 21:14'), ('Undo · Disable sticky and filter keys', '', True, 'Yesterday 18:02'),
           ('Per-game advanced priority', 'Minecraft', True, 'Yesterday 18:02'), ('Disable core parking', '', True, '20 Nov 22:41'),
           ('Rago Low Latency power plan', '', False, '20 Nov 22:41'), ('Create a restore point', '', True, '20 Nov 22:40'),
           ('Clear temp files', '', True, '18 Nov 16:05')]

def history_panel():
    rows = ''.join(f'<li class="{"" if ok else "bad"}"><i class="d"></i><b>{esc(n)}</b>' + (f'<em>{esc(v)}</em>' if v else '')
                   + (f'<span class="fl">failed</span>' if not ok else '') + f'<time>{w}</time></li>' for n, v, ok, w in HISTORY)
    return f'''
    <section class="msec hist">
      <div class="sh"><h2 class="h2 tape">history</h2><span class="cnt">{len(HISTORY)}<small> changes</small></span><span class="btn sm"><i data-i="trash"></i>clear history</span></div>
      <ul class="panel hl">{rows}</ul>
    </section>
'''

GM_LIST = ['Clears temp files', 'Pauses search indexing until the next restart', 'Pauses telemetry until the next restart',
           'Turns off printing', 'Turns off Windows animations', 'Turns off Xbox Game Bar background recording', 'Turns on Windows Game Mode']

def gm_block():
    li = ''.join(f'<li><i data-i="check"></i>{esc(x)}</li>' for x in GM_LIST)
    return f'''
    <section class="msec gm">
      <div class="panel gmp">
        <div class="gl1"><span class="lbl">right now</span><h3>game mode is on</h3><p>Since 21:04. Turn it off when you stop playing: everything below starts again.</p>
          <div class="gb"><span class="btn lg"><i data-i="power"></i>turn off</span><span class="sub">or restart your PC</span></div></div>
        <ul class="gl2">{li}</ul>
      </div>
    </section>
'''

GM_SIG = ('<div class="ping sig sess"><div class="pv"><b>on</b><span>since<br>21:04</span></div>'
          '<div class="ticks"><span class="g" style="--n:7">' + '<i class="on"></i>' * 7 + '</span></div></div>')
RST_SIG = ('<div class="ping sig"><div class="pv"><b>20</b><span>nov<small>last restore point</small></span></div>'
           '<div class="ticks"><span class="g" style="--n:9">' + ''.join('<i class="on"></i>' if ok else '<i></i>' for _, _, ok, _ in HISTORY) + '</span></div></div>')

# Historique vide (ModulePage.tsx : restore.historyEmpty ; pas de bouton « Clear history » quand il n'y a rien)
def history_empty():
    return '''
    <section class="msec hist">
      <div class="sh"><h2 class="h2 tape">history</h2><span class="cnt">0<small> changes</small></span></div>
      <div class="panel hl hemp"><span class="hic"><i data-i="undo"></i></span><p>You haven't applied anything from Rago Optimizer yet.</p></div>
    </section>
'''
RST_SIG_EMPTY = ('<div class="ping sig"><div class="pv"><b>0</b><span>changes<small>nothing applied yet</small></span></div>'
                 '<div class="ticks"><span class="g" style="--n:9">' + '<i></i>' * 9 + '</span></div></div>')

# ---------------------------------------------------------------- états de démonstration
STATES = {
    'latency': dict(
        on={'lat_general', 'sys_priority', 'pri_mmcss', 'kbm_accel', 'kbm_1to1', 'cpu_parking'},
        pend={'pri_game', 'cpu_amd', 'mem_profile'}, undo={'kbm_filter'}, drift={'cpu_parking'},
        blocked={'cpu_intel': "This isn't an Intel processor"},
        ran={'usb_controller': 'Last run 12 Nov'},
        variant={'pri_game': 'valorant', 'mem_profile': '32', 'cpu_vendor': 'amd', 'sto_fsutil': 'ssd', 'sys_ram': '32'},
        auto={'mem_profile': '32', 'cpu_vendor': 'amd', 'sys_ram': '32'},
        hover='pri_sysresp', ptr=(150, 26), advopen={'cpu'}, folded={'storage'},
        apply=(4, '4 need a restart'),
    ),
    'gpu': dict(
        on={'gpu_nvidia', 'gpu_general', 'nv_telemetry', 'nv_pstates'},
        pend={'nv_msi', 'nv_powermizer'},
        blocked={'gpu_amd': 'No AMD card detected', 'gpu_intel': 'No Intel graphics detected'},
        secblock={'amd': 'No AMD card detected', 'intel': 'No Intel graphics detected'},
        ran={'nv_debloat': 'Last run 2 Nov'},
        apply=(2, '2 need a restart'),
    ),
    'windows': dict(
        on={'win_fullscreen', 'win_gamedvr', 'win_visual', 'win_background', 'win_notifications', 'win_popups', 'win_search',
            'win_tracking', 'win_errors', 'win_classicmenu', 'dbl_telemetry', 'win_ai'},
        pend={'win_extensions', 'win_thispc'}, undo={'win_feed'},
        session={'win_gamemode': ('on', 'On since 21:04')},
        ran={'cln_temp': 'Last run 18 Nov', 'cln_disk': 'Last run 2 Nov'},
        advopen={'debloat'},
        apply=(3, '2 need a restart'),
    ),
    'hitreg': dict(
        on={'in_driver', 'in_mouse'}, pend={'in_queue', 'in_frames'},
        variant={'in_queue': 'low', 'in_frames': 'balanced', 'hitreg_suite': 'good'},
        vnote={'in_frames': 'Frames DirectX may queue', 'in_queue': 'Mouse and keyboard buffer', 'hitreg_suite': 'Pick the profile closest to your PC'},
        advopen={'suite'},
        apply=(2, '2 need a restart'),
    ),
    'minecraft': dict(
        on={'mc_optifine'}, pend={'net_profile'},
        variant={'pri_game': 'minecraft', 'mc_optifine': 'performance', 'net_profile': 'knockback'},
        vnote={'mc_optifine': 'Written to optionsof.txt, old file backed up'},
        ran={'cln_temp': 'Last run 18 Nov'},
        before=MC_FOLDER, bar=None,
        apply=(1, 'no restart needed'),
    ),
    'rbw': dict(
        session={'rbw_mode': ('off', 'Off since 18:12')},
        sig=rbw_sig(), after=rbw_panel(), bar=None, nosec=True,
    ),
    'gamemode': dict(
        session={'game_mode': ('on', 'On since 21:04')},
        sig=GM_SIG, after=gm_block(), bar=None, nosec=True,
    ),
    'expert': dict(
        on=set(), pend={'exp_io', 'exp_nolazy'},
        variant={'exp_hz': '240'},
        hover='exp_smb', ptr=(120, 26), popup=True, advopen={'security'},
        apply=(2, '2 need a restart'),
    ),
    'restore': dict(
        ran={'rst_point': 'Last run 20 Nov 22:40', 'rst_queue': ''},
        session={'game_mode': ('on', 'On since 21:04')},
        sig=RST_SIG, after=history_panel(), bar=None,
    ),
    'restore-empty': dict(
        mod='restore', sig=RST_SIG_EMPTY, after=history_empty(), bar=None, on_count='0',
    ),
}

if __name__ == '__main__':
    css = (HERE / 'net-base.css').read_text() + (HERE / 'module-add.css').read_text()
    (OUT / 'module.css').write_text('/* Pages module v5 : styles de l\'onglet Tweaks de Network + ajouts des pages module. Généré par gen.py. */\n' + css)
    for mid in (sys.argv[1:] or STATES):
        f = OUT / f'app-module-{mid}.html'
        f.write_text(page(mid))
        print('wrote', f.name)
