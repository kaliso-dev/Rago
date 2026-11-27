# Rago Route sur téléphone (route.html, 22/11/2026) : la barre d'essai en bas de l'écran (#dock).
# Elle apparaît une fois le bouton du haut sorti de l'écran, et s'efface quand celui des prix ou de la fin est visible.
# Textes repris de site/src/route.html. Écrit src/site-route-mobile.html.
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_site_states as SS
import gen_site as G

CSS = SS.CSS + r'''
/* Rago Route, une colonne */
.rh{position:relative;padding:26px 20px 0}
.rh .s-dots{right:0;top:0;width:300px;height:300px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 65%)}
.rh .s-eb{font-size:12px;letter-spacing:.16em}
.rh h1{position:relative;margin-top:16px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:70px;line-height:.82;text-transform:uppercase;letter-spacing:-.012em}
.rh h1 span{display:block}
.rh h1 .br{position:relative;display:inline-block;isolation:isolate}
.rh h1 .br::after{content:"";position:absolute;z-index:-1;left:-16px;right:-30px;top:30%;height:74%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2.5deg)}
.rh .s-lead{margin-top:18px;font-size:15px;line-height:1.55}
.rh .ma{display:grid;gap:10px;margin-top:22px}
.rh .ma .btn{height:54px;font-size:17px}
.rh .fine{margin-top:14px;font-size:12px;line-height:1.5;color:var(--ink-3)}
.mw{padding:26px 20px 0}
.mw .s-eb{font-size:12px;letter-spacing:.16em}
.mw h2{margin-top:12px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:48px;line-height:.86;text-transform:uppercase}
.mw .s-lead{margin-top:14px;font-size:14.5px;line-height:1.55}
.mw .s-lead b{color:var(--ink);font-weight:600}
.mseq{margin-top:20px;padding:18px 16px 16px}
.mseq h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;text-transform:uppercase}
.mseq .row{margin-top:14px}
.mseq .row b{display:block;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.mseq .pk{display:flex;gap:5px;margin-top:8px}
.mseq .pk i{flex:1;height:34px;display:grid;place-items:center;font-family:var(--cond);font-weight:900;font-size:17px;font-style:normal;background:var(--bg-4);color:var(--ink-2);transform:skewX(var(--skew))}
.mseq .pk i.ok{background:var(--ink);color:var(--bg)}
.mseq .pk i.lost{background:transparent;box-shadow:inset 0 0 0 2px var(--red);color:var(--red)}
.mseq .pk i.re{background:var(--red);color:var(--red-ink)}
.mseq .pk i.wait{background:var(--bg-3);color:var(--ink-3);box-shadow:inset 0 0 0 1px var(--line-2)}
.mseq .st{display:block;margin-top:7px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:17px;text-transform:uppercase}
.mseq .st.bad{color:var(--ink-3)}
.mseq .st.good{color:var(--red)}
html.round .mseq .pk i{border-radius:5px}
.mf5{margin-top:12px;padding:20px 18px}
.mf5 .n{font-family:var(--cond);font-weight:900;font-style:italic;font-size:38px;line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--red)}
.mf5 h3{margin-top:12px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;line-height:.9;text-transform:uppercase}
.mf5 p{margin-top:10px;font-size:14px;line-height:1.55;color:var(--ink-2)}
/* la barre d'essai */
.dock5{position:absolute;left:12px;right:12px;bottom:30px;z-index:25;display:flex;align-items:center;gap:12px;padding:8px 8px 8px 18px;background:rgba(23,23,26,.95);border:1px solid var(--line-2);box-shadow:0 20px 50px -14px #000,0 0 0 1px rgba(0,0,0,.4);backdrop-filter:blur(12px)}
.dock5::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;background:var(--red);transform:skewX(var(--skew))}
.dock5 span{flex:1;min-width:0;font-size:11.5px;line-height:1.3;color:var(--ink-2)}
.dock5 span b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:15.5px;line-height:1;text-transform:uppercase;color:var(--ink);margin-bottom:3px}
.dock5 .btn{height:44px;padding:0 16px;font-size:14.5px;white-space:nowrap}
html.round .dock5{border-radius:20px}
html.round .dock5::before{border-radius:2px}
.fadebot{position:absolute;left:0;right:0;bottom:0;height:150px;z-index:19;background:linear-gradient(180deg,transparent,rgba(10,10,11,.92) 70%)}
/* prix */
.mp{margin-top:18px;padding:20px 18px}
.mp .t{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.mp h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:34px;line-height:.86;text-transform:uppercase}
.mp .sub{margin-top:8px;font-size:13.5px;color:var(--ink-2)}
.mp .pr{display:flex;align-items:baseline;gap:8px;margin-top:14px}
.mp .pr b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:58px;line-height:.8}
.mp .pr span{font-size:13px;color:var(--ink-2)}
.mp .split{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:12.5px;color:var(--ink-3)}
.mp .split b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px;color:var(--ink)}
.mp .split em{font-style:normal;color:var(--red);font-weight:700}
.mp > .btn{display:flex;justify-content:center;height:52px;margin-top:16px;font-size:17px}
.mp .tl{display:grid;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.mp .tl b{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--red)}
.mp .tl p{margin-top:2px;font-size:13px;line-height:1.45;color:var(--ink-2)}
.hot5{border-color:rgba(255,59,48,.5)!important}
.tph .title{white-space:nowrap}
.phs .phw{width:410px;flex:none}
.k5 small{display:block;margin-top:4px;font-family:var(--body);font-weight:500;font-size:13px;letter-spacing:0;text-transform:none;color:var(--ink-2)}
'''


def pk(row):
    return ''.join(f'<i class="{c}">{t}</i>' for c, t in row)


DOCK = ('<div class="fadebot"></div><div class="dock5"><span><b>Rago Route, in the free trial</b>then $3 a month on top of Premium</span>'
        '<span class="btn red">start free trial</span></div>')


def top():
    return '''<div class="rh"><span class="s-dots"></span>
  <p class="s-eb">rago route <b>//</b> premium option, in beta</p>
  <h1><span>lose packets,</span><span class="br">not fights.</span></h1>
  <p class="s-lead">Rago Route is the anti-lag tunnel for Minecraft Java. Every packet takes two roads to the server, a lost one is rebuilt or sent again fast, and your connection holds through a Wi-Fi blink.</p>
  <div class="ma"><span class="btn red"><i data-i="zap"></i>start 3-day free trial</span><span class="btn">already premium? add it</span></div>
  <p class="fine">Included in the free trial of Premium, then $3 a month on top. Card required: free for 3 days, then $5.99 + $3 a month, charged automatically unless you cancel before.</p>
</div>'''


def middle():
    before = pk([('ok', '1'), ('ok', '2'), ('lost', '3'), ('wait', '4'), ('wait', '5'), ('wait', '6'), ('wait', '7')])
    after = pk([('ok', '1'), ('ok', '2'), ('re', '3'), ('ok', '4'), ('ok', '5'), ('ok', '6'), ('ok', '7')])
    return f'''<div class="mw">
  <p class="s-eb">how it works <b>//</b> six parts</p>
  <h2>one lost packet freezes everything behind it.</h2>
  <p class="s-lead">Minecraft Java plays packets in order: when one goes missing, the ones behind it wait until it's sent again. <b>A faster plan doesn't change that.</b></p>
  <div class="s-card mseq"><h3>packets, in order</h3>
    <div class="row"><b>without route</b><div class="pk">{before}</div><span class="st bad">freeze, then jump</span></div>
    <div class="row"><b>with rago route</b><div class="pk">{after}</div><span class="st good">packet 3 rebuilt</span></div></div>
  <div class="s-card mf5"><b class="n">01</b><h3>two roads</h3><p>Every packet leaves on two roads at once: straight to Rago's exit in Paris, and through Rago's relay in Frankfurt. The first copy in is used.</p></div>
</div>'''


def prices():
    return '''<div class="mw">
  <p class="s-eb">pricing</p>
  <h2>premium with rago route, or just the option.</h2>
  <div class="s-card mp hot5"><div class="t"><h3>premium<br>+ rago route</h3><span class="s-tag red">free for 3 days</span></div>
    <p class="sub">Every optimization, and the road to the server.</p>
    <div class="pr"><b>$8.99</b><span>/ month after the trial</span></div>
    <div class="split"><span><b>$5.99</b>Premium</span><em>+</em><span><b>$3</b>Rago Route</span></div>
    <span class="btn red"><i data-i="zap"></i>start 3-day free trial</span>
    <div class="tl"><div><b>today</b><p>Nothing to pay. Premium and Rago Route unlock in the app.</p></div><div><b>after 3 days</b><p>Your card is charged $5.99 + $3, then every month until you cancel.</p></div></div></div>
</div>'''


def page():
    p1 = SS.phone(SS.mnav() + top(), 'top of the page', 'The trial button is on screen: no bar.')
    p2 = SS.phone(SS.mnav() + middle() + DOCK, 'while you scroll', 'Once the top button is off screen, the trial bar slides up from the bottom.')
    p3 = SS.phone(SS.mnav() + prices(), 'at the prices', 'The page\'s own trial button is on screen again: the bar steps aside. Same at the end of the page.')
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="site5.css">
<script>for (const c of ['round','poster']) if (location.hash.includes(c)) document.documentElement.classList.add(c);</script>
<style>{CSS}</style>
<title>Rago Route on a phone</title>
</head><body><div class="win site">
<div class="tp"><span class="bgdots"></span>
  <section class="tph"><div><p class="kick">rago route <b>//</b> on a phone</p><h1 class="title" data-t="trial bar">trial bar</h1></div>
  <p class="lead">On a phone, a <b>trial bar</b> stays at the bottom while you read, so the free trial is always one tap away. It hides whenever the page already shows its own trial button.</p></section>
  <div class="sh5"><b>three moments</b><span>Same page, one column. Texts from route.html.</span></div>
  <div class="phs">{p1}{p2}{p3}</div>
</div></div>
<script src="icons.js"></script>
</body></html>'''


if __name__ == '__main__':
    open(SS.S + 'site-route-mobile.html', 'w').write(page())
    print('wrote site-route-mobile.html')
