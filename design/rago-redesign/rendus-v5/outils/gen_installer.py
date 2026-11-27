"""Installeur Windows v5 (lot 3, 22/11/2026). L'installeur est celui de Tauri (NSIS, Modern UI 2) : seules les deux
images (latérale 164 × 314 sur bienvenue et fin, bandeau 150 × 57 à gauche de l'en-tête des autres pages), l'icône
et les textes changent ; le reste est dessiné par Windows. Écrit src/inst-art.html (les deux images, capturées en
BMP par shoot_installer.js) et src/inst-pages.html (les pages de l'installeur et du désinstalleur, pour la planche).
Textes : chaînes anglaises de Modern UI 2 et du modèle NSIS de Tauri, eula.txt et hooks.nsh du dépôt."""
from pathlib import Path

OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/src')

R_PATH = 'M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z'


def mark(h):
    """R rouge plein (22/11 au soir : R rouge partout, icône de l'app rouge sur blanc)."""
    w = h * 164 / 180
    return f'<svg class="rm" width="{w:.1f}" height="{h}" viewBox="0 0 164 180"><path d="{R_PATH}" fill="#FF3B30"/></svg>'


FONTS = '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">'

ART_CSS = r'''
*{margin:0;padding:0;box-sizing:border-box}
body{background:#777;padding:20px;display:flex;gap:20px;align-items:flex-start}
.cond{font-family:"Barlow Condensed",sans-serif}
/* image latérale : bienvenue et fin */
#side{position:relative;width:164px;height:314px;overflow:hidden;background:#0A0A0B}
#side .dots{position:absolute;right:0;top:0;width:150px;height:200px;background:radial-gradient(circle,rgba(255,255,255,.10) .9px,transparent 1.3px) 0 0/7px 7px;-webkit-mask:linear-gradient(225deg,#000 0,transparent 70%)}
#side .glow{position:absolute;left:-60px;top:150px;width:240px;height:120px;background:radial-gradient(closest-side,rgba(255,59,48,.16),transparent);}
#side .rm{position:absolute;left:18px;top:24px}
#side .t1{position:absolute;left:15px;top:112px;font-family:"Barlow Condensed";font-weight:900;font-style:italic;font-size:58px;line-height:.8;color:#F5F5F6;text-transform:uppercase;letter-spacing:-.01em}
#side .t2w{position:absolute;left:8px;top:162px;width:150px;height:40px}
#side .t2w::before{content:"";position:absolute;left:0;right:-6px;top:8px;height:30px;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-3deg)}
#side .t2{position:relative;padding-left:8px;font-family:"Barlow Condensed";font-weight:900;font-style:italic;font-size:31px;line-height:1.25;color:#F5F5F6;text-transform:uppercase;letter-spacing:.005em}
#side .mt{position:absolute;left:18px;bottom:22px;width:128px;font-family:"Barlow Condensed";font-weight:800;font-style:italic;font-size:12.5px;line-height:1.05;letter-spacing:.06em;color:#A1A1AA;text-transform:uppercase}
#side .mt b{color:#FF3B30;font-weight:900}
#side .hz{position:absolute;left:0;right:0;bottom:0;height:6px;background:repeating-linear-gradient(-60deg,#FF3B30 0 6px,transparent 6px 12px)}
/* bandeau : à gauche de l'en-tête blanc des autres pages */
#head{position:relative;width:150px;height:57px;overflow:hidden;background:#FFFFFF}
#head .blk{position:absolute;left:-14px;top:0;width:150px;height:57px;background:#0A0A0B;transform:skewX(-12deg);transform-origin:0 100%}
#head .blk::after{content:"";position:absolute;right:0;top:0;bottom:0;width:4px;background:#FF3B30}
#head .rm{position:absolute;left:12px;top:13px}
#head .w{position:absolute;left:44px;top:12px;font-family:"Barlow Condensed";color:#F5F5F6;text-transform:uppercase}
#head .w b{display:block;font-weight:900;font-style:italic;font-size:27px;line-height:.82;letter-spacing:-.005em}
#head .w span{display:block;margin-top:4px;font-weight:800;font-size:10.5px;letter-spacing:.17em;color:#A1A1AA}
'''


def art():
    return f'''<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>{ART_CSS}</style></head><body>
<div id="side"><span class="dots"></span><span class="glow"></span>{mark(70)}<div class="t1">rago</div><div class="t2w"><div class="t2">optimizer</div></div>
<p class="mt">every<br>millisecond<br><b>counts.</b></p><span class="hz"></span></div>
<div id="head"><span class="blk"></span>{mark(31)}<div class="w"><b>rago</b><span>optimizer</span></div></div>
</body></html>
'''


# ---------------------------------------------------------------- pages de l'installeur (dessin de Windows 11)

PAGE_CSS = r'''
.ip{position:relative;z-index:1;isolation:isolate;padding:44px 56px 56px}
.ip .bgdots{position:absolute;right:0;top:0;width:620px;height:420px;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.07) 1.1px,transparent 1.5px) 0 0/9px 9px;-webkit-mask:linear-gradient(240deg,#000 0,transparent 60%)}
.ip .tph{display:flex;align-items:flex-end;justify-content:space-between;gap:40px}
.ip .title{font-size:132px;margin-top:16px;white-space:nowrap}
.ip .lead{max-width:460px;padding-bottom:12px;font-size:15px;line-height:1.5;color:var(--ink-2)}
.ip .lead b{color:var(--ink);font-weight:600}
.k6{margin:0 0 12px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.k6 em{font-style:normal;color:var(--red)}
.k6 small{font-family:var(--body);font-weight:500;font-size:12px;letter-spacing:0;text-transform:none;margin-left:6px}
.wgrid{display:grid;grid-template-columns:repeat(2,max-content);justify-content:space-between;gap:40px 0;margin-top:46px}
.zw{zoom:1.3}

/* fenêtre NSIS : 497 × 360 de zone cliente à 100 % */
.nw{width:499px;background:#F0F0F0;border:1px solid #9a9a9a;border-radius:8px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.55);font-family:Tahoma,"Liberation Sans",Arial,sans-serif;font-size:11px;color:#000;line-height:1.3}
.nt{height:30px;display:flex;align-items:center;gap:8px;padding-left:9px;background:#fff;border-bottom:1px solid #e5e5e5;font-family:Inter,"Segoe UI",sans-serif;font-size:11.5px;color:#1a1a1a}
.nt img{width:16px;height:16px}
.nt .ct{margin-left:auto;display:flex}
.nt .ct span{width:44px;height:30px;display:grid;place-items:center;color:#333}
.nt .ct svg{width:10px;height:10px}
.nc{position:relative;height:360px}
.nb{position:absolute;left:0;right:0;bottom:0;height:46px}
.nb .et{position:absolute;left:0;right:0;top:0;height:2px;border-top:1px solid #a0a0a0;border-bottom:1px solid #fff}
.nb .brd{position:absolute;left:6px;top:-7px;padding:0 3px;background:#F0F0F0;color:#8d8d8d}
.nb .bt{position:absolute;right:11px;top:12px;display:flex;gap:0}
.nb .bt .gap{width:9px}
.btw{width:75px;height:23px;display:grid;place-items:center;background:#FDFDFD;border:1px solid #CCCCCC;border-radius:4px;font-size:11px;color:#000}
.btw.df{border:1px solid #0067C0;box-shadow:inset 0 0 0 1px #0067C0}
.btw.off{color:#a0a0a0;background:#F5F5F5;border-color:#E0E0E0}
.wl{position:absolute;inset:0 0 46px 0;display:flex;background:#fff;border-bottom:0}
.wl img.sb{width:164px;height:314px;display:block;flex:none}
.wl .tx{padding:14px 18px 0 14px}
.wl h1{font-family:Tahoma,"Liberation Sans",Arial,sans-serif;font-weight:700;font-size:16px;line-height:1.25;margin:0 0 16px}
.wl p{margin:0 0 12px}
.hd{position:absolute;left:0;right:0;top:0;height:57px;background:#fff;border-bottom:1px solid #a0a0a0;box-shadow:0 1px 0 #fff}
.hd img{position:absolute;left:0;top:0;width:150px;height:57px}
.hd b{position:absolute;left:162px;top:10px;font-weight:700}
.hd span{position:absolute;left:172px;top:27px}
.bd{position:absolute;left:22px;right:22px;top:72px}
.bd p{margin:0 0 8px}
.lic{height:150px;overflow:hidden;background:#fff;border:1px solid #828790;padding:3px 20px 3px 4px;position:relative;font-size:11px;white-space:pre-wrap}
.lic::after{content:"";position:absolute;right:0;top:0;bottom:0;width:17px;background:#F0F0F0;border-left:1px solid #e5e5e5}
.lic i{position:absolute;right:4px;top:18px;width:9px;height:42px;background:#c2c2c2;border-radius:4px;z-index:1}
.grp{position:relative;margin-top:14px;padding:16px 10px 12px;border:1px solid #dcdcdc;border-radius:3px}
.grp > b{position:absolute;left:7px;top:-7px;padding:0 3px;background:#F0F0F0;font-weight:400}
.fld{display:flex;gap:8px;align-items:center}
.fld .in{flex:1;height:21px;display:flex;align-items:center;padding:0 5px;background:#fff;border:1px solid #7a7a7a;border-bottom:1px solid #4a4a4a}
.pg{height:15px;margin:6px 0 10px;background:#E6E6E6;border:1px solid #BCBCBC}
.pg i{display:block;height:100%;background:#06B025}
.det{display:inline-grid;place-items:center;height:23px;padding:0 10px;background:#FDFDFD;border:1px solid #CCCCCC;border-radius:4px}
.log{height:150px;overflow:hidden;background:#fff;border:1px solid #828790;padding:3px 5px;white-space:pre;font-size:11px;line-height:1.36}
.ck{display:flex;align-items:center;gap:7px;margin:0 0 9px}
.ck i{width:13px;height:13px;border:1px solid #333;border-radius:3px;background:#fff;display:grid;place-items:center}
.ck.on i{background:#0067C0;border-color:#0067C0}
.ck.on i::after{content:"";width:3px;height:7px;border:solid #fff;border-width:0 1.6px 1.6px 0;transform:translate(0,-1px) rotate(45deg)}
.wl .ck{margin-top:4px}

/* planche des fichiers */
.assets{display:grid;grid-template-columns:auto 1fr;gap:40px 48px;align-items:start;margin-top:46px}
.assets > .asset:first-child{grid-row:span 2}
.hrow{display:flex;gap:28px;align-items:flex-start}
.hrow .note2{margin-top:0;max-width:440px}
.asset img{display:block;image-rendering:pixelated}
.asset .k6{margin-bottom:10px}
.asset .frm{padding:14px;background:#fff;display:inline-block}
.asset .frm.dk{background:var(--bg-2);border:1px solid var(--line)}
.ico{display:flex;align-items:flex-end;gap:18px;padding:20px 22px;background:var(--bg-2);border:1px solid var(--line)}
.ico.lt{background:#F3F3F3;border-color:transparent;margin-top:12px}
.ico div{display:flex;flex-direction:column;align-items:center;gap:8px}
.ico small{font-family:var(--cond);font-weight:700;font-size:12px;letter-spacing:.08em;color:var(--ink-3)}
.ico.lt small{color:#77777c}
.note2{margin-top:18px;max-width:560px;font-size:13px;line-height:1.5;color:var(--ink-2)}
.note2 b{color:var(--ink);font-weight:600}
html.round .ico,html.round .asset .frm.dk{border-radius:18px}
'''

EULA = '''RAGO OPTIMIZER - TERMS OF USE

Please read these terms before installing Rago Optimizer.

1. What the app does
Rago Optimizer changes Windows settings: registry values, services, power plans, network settings and boot options. Some tweaks are marked "Advanced": they change deeper settings, such as timers, the kernel or boot options. The app tells you what each tweak does, and its drawbacks, before it runs.

2. Your responsibility
You choose which tweaks to apply.'''

X = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><path d="M0 0l10 10M10 0 0 10"/></svg>'
MIN = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><path d="M0 5h10"/></svg>'


def win(cap, inner, buttons, brand=True):
    bts = ''
    for b in buttons:
        if b == '|':
            bts += '<span class="gap"></span>'
            continue
        cls = ' df' if b.startswith('*') else (' off' if b.startswith('~') else '')
        bts += f'<span class="btw{cls}">{b.lstrip("*~")}</span>'
    br = '<span class="brd">Nullsoft Install System</span>' if brand else ''
    return (f'<div class="nw"><div class="nt"><img src="img/rago-app-dark-32.svg" alt="">{cap}<span class="ct"><span>{MIN}</span><span>{X}</span></span></div>'
            f'<div class="nc">{inner}<div class="nb"><span class="et"></span>{br}<div class="bt">{bts}</div></div></div></div>')


def header(t, s):
    return f'<div class="hd"><img src="img/installer/header@2x.png" alt=""><b>{t}</b><span>{s}</span></div>'


def welcome():
    inner = ('<div class="wl"><img class="sb" src="img/installer/sidebar@2x.png" alt=""><div class="tx">'
             '<h1>Welcome to Rago Optimizer Setup</h1>'
             '<p>Setup will guide you through the installation of Rago Optimizer.</p>'
             '<p>It is recommended that you close all other applications before starting Setup. This will make it possible to update relevant system files without having to reboot your computer.</p>'
             '<p>Click Next to continue.</p></div></div>')
    return win('Rago Optimizer Setup', inner, ['~&lt; Back', '*Next &gt;', '|', 'Cancel'], brand=False)


def license_():
    inner = (header('License Agreement', 'Please review the license terms before installing Rago Optimizer.')
             + '<div class="bd"><p>Press Page Down to see the rest of the agreement.</p>'
             f'<div class="lic"><i></i>{EULA}</div>'
             '<p style="margin-top:8px">If you accept the terms of the agreement, click I Agree to continue. You must accept the agreement to install Rago Optimizer.</p></div>')
    return win('Rago Optimizer Setup', inner, ['&lt; Back', '*I Agree', '|', 'Cancel'])


def folder():
    inner = (header('Choose Install Location', 'Choose the folder in which to install Rago Optimizer.')
             + '<div class="bd"><p>Setup will install Rago Optimizer in the following folder. To install in a different folder, click Browse and select another folder. Click Install to start the installation.</p>'
             '<div class="grp"><b>Destination Folder</b><div class="fld"><span class="in">C:\\Program Files\\Rago Optimizer</span><span class="btw">Browse...</span></div></div>'
             '<p style="margin-top:22px">Space required: 31.4 MB</p><p>Space available: 412.8 GB</p></div>')
    return win('Rago Optimizer Setup', inner, ['&lt; Back', '*Install', '|', 'Cancel'])


def installing():
    inner = (header('Installing', 'Please wait while Rago Optimizer is being installed.')
             + '<div class="bd"><p>Extract: Rago Optimizer.exe... 64%</p><div class="pg"><i style="width:58%"></i></div>'
             '<span class="det">Show details</span></div>')
    return win('Rago Optimizer Setup', inner, ['~&lt; Back', '~Next &gt;', '|', 'Cancel'])


def finish():
    inner = ('<div class="wl"><img class="sb" src="img/installer/sidebar@2x.png" alt=""><div class="tx">'
             '<h1>Completing Rago Optimizer Setup</h1>'
             '<p>Rago Optimizer has been installed on your computer.</p><p>Click Finish to close Setup.</p>'
             '<p class="ck on" style="margin-top:20px"><i></i>Run Rago Optimizer</p><p class="ck on"><i></i>Create desktop shortcut</p></div></div>')
    return win('Rago Optimizer Setup', inner, ['~&lt; Back', '*Finish', '|', '~Cancel'], brand=False)


def uninstall():
    log = ('Putting back the Windows settings changed by Rago Optimizer (this can take a few minutes)...')
    inner = (header('Uninstalling', 'Please wait while Rago Optimizer is being uninstalled.')
             + f'<div class="bd"><p>{log}</p><div class="pg"><i style="width:22%"></i></div>'
             '<div class="log">' + log + '</div></div>')
    return win('Rago Optimizer Uninstall', inner, ['~&lt; Back', '~Close', '|', '~Cancel'])


def uninstall_confirm():
    inner = (header('Uninstall Rago Optimizer', 'Remove Rago Optimizer from your computer.')
             + '<div class="bd"><p>Rago Optimizer will be uninstalled from the following folder. Click Uninstall to start the uninstallation.</p>'
             '<div class="fld" style="margin-top:16px"><span style="width:96px">Uninstalling from:</span><span class="in">C:\\Program Files\\Rago Optimizer</span></div>'
             '<p class="ck" style="margin-top:22px"><i></i>Delete the application data</p></div>')
    return win('Rago Optimizer Uninstall', inner, ['&lt; Back', '*Uninstall', '|', 'Cancel'])


def head_html(title):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
{FONTS.replace('Barlow:wght@400;500;600', 'Barlow:wght@400;500;600;700').replace('0,700;0,800;0,900;1,800;1,900', '0,600;0,700;0,800;0,900;1,700;1,800;1,900')}
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="round.css">
<script>for (const c of ['round','poster']) if (location.hash.includes(c)) document.documentElement.classList.add(c);</script>
<style>{PAGE_CSS}</style>
<title>{title}</title>
</head>'''


def cell(label, sub, w):
    return f'<div><p class="k6">{label} <em>//</em><small>{sub}</small></p><div class="zw">{w}</div></div>'


def pages():
    cells = (cell('welcome', 'side image 164 × 314', welcome())
             + cell('terms', 'eula.txt, header image 150 × 57', license_())
             + cell('install folder', 'per machine, in Program Files', folder())
             + cell('finish', 'run the app, desktop shortcut', finish())
             + cell('uninstall', 'ticked, the saved settings go too', uninstall_confirm())
             + cell('uninstalling', 'tweaks put back first (hooks.nsh)', uninstall()))
    return head_html('Installer') + f'''
<body><div class="win"><div class="ip"><span class="bgdots"></span>
<section class="tph"><div><p class="kick">windows installer <b>//</b> setup and uninstall</p><h1 class="title" data-t="setup">setup</h1></div>
<p class="lead">Windows draws the installer. Rago brings <b>two images</b>, the <b>icon</b> and the words, so the pages stay native and the first and last screens carry the poster.</p></section>
<div class="wgrid">{cells}</div></div></div></body></html>
'''


def assets():
    icons = ''.join(f'<div><img src="img/installer/ico-{s}.png" width="{s}" height="{s}" alt=""><small>{s}</small></div>' for s in (16, 20, 24, 32, 40, 48, 64, 128, 256))
    return head_html('Installer files') + f'''
<body><div class="win"><div class="ip"><span class="bgdots"></span>
<section class="tph"><div><p class="kick">windows installer <b>//</b> files to drop in</p><h1 class="title" data-t="files">files</h1></div>
<p class="lead">Same names and sizes as today in <b style="white-space:nowrap">src-tauri/installer/</b> and <b style="white-space:nowrap">src-tauri/icons/</b>. Nothing else in the build changes.</p></section>
<div class="assets">
  <div class="asset"><p class="k6">sidebar.bmp <em>//</em><small>164 × 314, shown ×2</small></p><div class="frm dk"><img src="img/installer/sidebar.png" width="328" height="628" alt=""></div></div>
  <div class="asset"><p class="k6">header.bmp <em>//</em><small>150 × 57, shown ×2 on the white header</small></p><div class="hrow"><div class="frm"><img src="img/installer/header.png" width="300" height="114" alt=""></div>
    <div><p class="note2">The header image sits on the <b>left</b> of the white header, the page title starts right after it. Its right edge is pure white so it melts into the header.</p>
    <p class="note2" style="margin-top:12px">Both images also come at <b>2×</b> (328 × 628 and 300 × 114) for screens at 150 % or more: Windows stretches the image to fit, so a bigger one stays sharp. To test on a real PC before switching.</p></div></div></div>
  <div class="asset"><p class="k6">icon.ico <em>//</em><small>9 sizes, also used near the clock</small></p><div class="ico">{icons}</div><div class="ico lt">{icons}</div>
    <p class="note2">A red R on the white tile at every size. The R takes a little more room in the small sizes so it stays readable at 16 px.</p></div>
</div></div></div></body></html>
'''


if __name__ == '__main__':
    (OUT / 'inst-art.html').write_text(art())
    (OUT / 'inst-pages.html').write_text(pages())
    (OUT / 'inst-files.html').write_text(assets())
    print('wrote inst-art.html, inst-pages.html, inst-files.html')
