# Lot 4 : page Rago Route (route.html). Textes repris de site/route.html (22/11/2026). Écrit src/site-route.html.
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_site as G

OUT = G.OUT

CSS = r'''
.r5-nav .brand{display:flex;align-items:center;gap:12px}
.r5-nav .brand i{width:2px;height:26px;background:var(--line-2);transform:skewX(var(--skew))}
.r5-nav .brand em{font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;text-transform:uppercase;color:var(--red)}
.r5-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 560px;gap:40px;padding:84px 0 30px}
.r5-hero .s-dots{right:-120px;top:-40px;width:760px;height:560px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 65%)}
.r5-hero h1{position:relative;margin-top:26px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:116px;line-height:.84;text-transform:uppercase;letter-spacing:-.012em}
.r5-hero h1 span{display:block}
.r5-hero h1 .br{position:relative;display:inline-block;isolation:isolate}
.r5-hero h1 .br::after{content:"";position:absolute;z-index:-1;left:-26px;right:-60px;top:30%;height:76%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.r5-hero .fine{margin-top:16px;max-width:560px;font-size:12.5px;line-height:1.55;color:var(--ink-3)}
.r5-hero .s-trust{display:flex;gap:22px;margin-top:22px}
.r5-hero .s-trust li{font-size:14px}
.r5-map{position:relative;align-self:center;padding:30px 26px 20px}
.r5-map svg{display:block;width:100%;height:auto;overflow:visible}
.r5-map .s-tag{flex:none}
.r5-map .cap{display:flex;align-items:center;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;line-height:1.5;color:var(--ink-2)}
.r5-map .cap b{color:var(--ink);font-weight:600}

/* ordre des paquets */
.r5-seq{margin-top:56px;padding:30px 32px 26px}
.r5-seq .row{display:grid;grid-template-columns:200px 1fr 220px;align-items:center;gap:20px;margin-top:16px}
.r5-seq .row > b{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.r5-seq .row.w > b{color:var(--ink)}
.r5-seq .pk{display:flex;gap:8px}
.r5-seq .pk i{width:72px;height:48px;display:grid;place-items:center;font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px;font-style:normal;background:var(--bg-4);color:var(--ink-2);transform:skewX(var(--skew))}
.r5-seq .pk i.ok{background:var(--ink);color:var(--bg)}
.r5-seq .pk i.lost{background:transparent;box-shadow:inset 0 0 0 2px var(--red);color:var(--red)}
.r5-seq .pk i.re{background:var(--red);color:var(--red-ink)}
.r5-seq .pk i.wait{background:var(--bg-3);color:var(--ink-3);box-shadow:inset 0 0 0 1px var(--line-2)}
.r5-seq .st{font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px;text-transform:uppercase}
.r5-seq .st.bad{color:var(--ink-3)}
.r5-seq .st.good{color:var(--red)}
.r5-seq .top{display:flex;justify-content:space-between;align-items:baseline}
.r5-seq h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;text-transform:uppercase}
.r5-seq .s-note{margin-top:18px}

/* six fonctions */
.r5-fx{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}
.r5-f{display:flex;flex-direction:column;padding:28px 28px 0}
.r5-f .n{font-family:var(--cond);font-weight:900;font-style:italic;font-size:46px;line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--red)}
.r5-f h3{display:flex;align-items:center;gap:10px;margin-top:16px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:.9;text-transform:uppercase}
.r5-f > p{margin-top:12px;font-size:14.5px;line-height:1.55;color:var(--ink-2)}
.r5-f .pr{margin:22px -28px 0;margin-top:auto;padding:20px 28px 22px;border-top:1px dashed var(--line-2);background:rgba(255,255,255,.015)}
.r5-f .gap{height:22px;flex:none}
.r5-f .pr b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:46px;line-height:.85;color:var(--ink);text-transform:uppercase}
.r5-f .pr b small{font-size:22px;color:var(--ink-2);margin-left:4px}
.r5-f .pr p{margin-top:8px;font-size:13.5px;line-height:1.45;color:var(--ink-2)}
.r5-f .pr span{display:block;margin-top:8px;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}

/* confiance */
.r5-tr{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
.r5-tr .l{display:grid;gap:14px}
.r5-t{display:grid;grid-template-columns:44px 1fr;gap:18px;padding:24px 26px}
.r5-t .ic{width:44px;height:44px;display:grid;place-items:center;background:rgba(255,59,48,.12);color:var(--red)}
.r5-t .ic svg{width:20px;height:20px}
html.round .r5-t .ic{border-radius:12px}
.r5-t h4,.r5-no h4{font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;line-height:.95;text-transform:uppercase}
.r5-t p{margin-top:6px;font-size:14px;line-height:1.5;color:var(--ink-2)}
.r5-t code{font-family:Barlow,sans-serif;font-weight:600;color:var(--ink);padding:1px 6px;background:var(--bg-4)}
.r5-no{padding:28px 30px}
.r5-no > p{margin-top:8px;font-size:14px;color:var(--ink-2)}
.r5-no ul{margin-top:16px;display:grid;gap:4px}
.r5-no li{display:grid;grid-template-columns:22px 1fr;gap:12px;padding:16px 16px 16px 14px;background:var(--bg-3);font-size:14px;line-height:1.5;color:var(--ink-2)}
html.round .r5-no li{border-radius:14px}
.r5-no li svg{width:16px;height:16px;margin-top:3px;color:var(--ink-3)}
.r5-no li b{color:var(--ink);font-weight:600}

/* démarrer */
.r5-go{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:56px}
.r5-g{padding:28px}
.r5-g .n{width:44px;height:44px;display:grid;place-items:center;font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;color:var(--red-ink);background:var(--red);transform:skewX(var(--skew))}
.r5-g h3{margin-top:20px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:32px;line-height:.9;text-transform:uppercase}
.r5-g p{margin-top:10px;font-size:14.5px;line-height:1.55;color:var(--ink-2)}
.r5-g p a{color:var(--ink);border-bottom:1.5px solid var(--red)}
.r5-g .vis{margin-top:22px;padding:16px;background:var(--bg-3)}
html.round .r5-g .vis{border-radius:14px}
.r5-g .r5-tg{display:flex;align-items:center;justify-content:space-between;font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;text-transform:uppercase}
.r5-g .r5-tg i{position:relative;width:46px;height:26px;background:var(--red);border-radius:13px}
.r5-g .r5-tg i::after{content:"";position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff}
.r5-g .crumbs{display:flex;gap:6px;align-items:center;margin-bottom:12px;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.r5-g .crumbs b{color:var(--red)}
.r5-g .srv{display:grid;gap:6px}
.r5-g .srv div{display:flex;justify-content:space-between;align-items:center;height:40px;padding:0 12px;background:var(--bg-4);font-size:13.5px;color:var(--ink-2)}
.r5-g .srv div b{font-family:"Consolas","Courier New",monospace;font-weight:600;font-size:14px;color:var(--ink)}
html.round .r5-g .srv div{border-radius:10px}
.r5-g .pl{display:flex;gap:6px}
.r5-g .pl span{flex:1;height:40px;display:grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.06em;text-transform:uppercase;background:var(--bg-4);color:var(--ink-2)}
.r5-g .pl span.on{background:var(--red);color:var(--red-ink)}
html.round .r5-g .pl span{border-radius:10px}

/* formules */
.r5-pl{display:grid;grid-template-columns:1.25fr 1fr;gap:14px;margin-top:56px;align-items:stretch}
.r5-p{display:flex;flex-direction:column;padding:34px 34px 30px}
.r5-p.hot{border-color:rgba(255,59,48,.55);background:radial-gradient(120% 70% at 50% 0%,rgba(255,59,48,.13),transparent 60%),var(--bg-2)}
.r5-p .t{display:flex;align-items:center;justify-content:space-between}
.r5-p h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:42px;line-height:.9;text-transform:uppercase}
.r5-p .sub{margin-top:8px;font-size:15px;color:var(--ink-2)}
.r5-p .pr{display:flex;align-items:baseline;gap:10px;margin-top:24px}
.r5-p .pr b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:84px;line-height:.8;letter-spacing:-.01em}
.r5-p .pr span{font-family:var(--cond);font-weight:800;font-size:17px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.r5-p .split{display:flex;gap:8px;margin-top:14px}
.r5-p .split span{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;background:var(--bg-3);border:1px solid var(--line-2);font-size:13.5px;color:var(--ink-2)}
.r5-p .split span b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;color:var(--ink)}
.r5-p .split em{align-self:center;font-style:normal;font-family:var(--cond);font-weight:900;color:var(--ink-3)}
html.round .r5-p .split span{border-radius:9px}
.r5-p .btn{margin-top:24px;height:56px;font-size:19px;align-self:stretch}
.r5-tl{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:22px}
.r5-tl div{padding:14px 16px;background:var(--bg-3)}
.r5-tl div:first-child{box-shadow:inset 0 3px 0 var(--ok)}
.r5-tl div:nth-child(2){box-shadow:inset 0 3px 0 var(--red)}
.r5-tl div:nth-child(3){box-shadow:inset 0 3px 0 var(--ink-3)}
.r5-tl b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;text-transform:uppercase}
.r5-tl p{margin-top:6px;font-size:13px;line-height:1.45;color:var(--ink-2)}
html.round .r5-tl div:first-child{border-radius:12px 0 0 12px}
html.round .r5-tl div:last-child{border-radius:0 12px 12px 0}
.r5-p ul{display:grid;gap:10px;margin-top:24px;padding-top:22px;border-top:1px solid var(--line)}
.r5-p .skip{margin-top:22px;padding:16px 18px;background:var(--bg-3);font-size:13px;line-height:1.55;color:var(--ink-3)}
.r5-p .skip b{display:block;margin-bottom:4px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;text-transform:uppercase;color:var(--ink)}
html.round .r5-p .skip{border-radius:14px}
.r5-p .two{display:grid;gap:8px;margin-top:24px}
.r5-p .two .btn{margin:0;height:52px;font-size:17px}
.r5-p .fine{margin-top:auto;padding-top:20px;font-size:13px;line-height:1.5;color:var(--ink-3)}
.r5-p .note{margin-top:14px;font-size:13px;line-height:1.5;color:var(--ink-3)}
.r5-p h4{margin-top:26px;padding-top:22px;border-top:1px solid var(--line);font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;text-transform:uppercase}
.r5-p ul.ft{margin-top:14px;padding-top:0;border-top:0;gap:9px}
.r5-p ul.ft li{font-size:14px}
.r5-nt{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}
.r5-nt p{padding:20px 22px;font-size:13.5px;line-height:1.55;color:var(--ink-2)}
.r5-nt p b{display:block;margin-bottom:4px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;text-transform:uppercase;color:var(--ink)}
.r5-nt a{color:var(--ink);border-bottom:1px solid var(--red)}
.r5-p .nt{display:grid;gap:6px;margin-top:22px}
.r5-p .nt p{padding:12px 14px;background:var(--bg-3);font-size:13px;line-height:1.5;color:var(--ink-2)}
.r5-p .nt p b{color:var(--ink);font-weight:600}
.r5-p .nt a{color:var(--ink);border-bottom:1px solid var(--red)}
html.round .r5-p .nt p{border-radius:12px}
.r5-all{display:grid;grid-template-columns:1fr 360px;gap:40px;margin-top:14px;padding:32px 34px}
.r5-all h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;text-transform:uppercase}
.r5-all ul{display:grid;grid-template-columns:1fr 1fr;gap:12px 28px;margin-top:18px}
.r5-all .nt{display:grid;gap:10px;align-content:start}
.r5-all .nt p{padding:14px 16px;background:var(--bg-3);font-size:13.5px;line-height:1.5;color:var(--ink-2)}
.r5-all .nt p b{color:var(--ink);font-weight:600}
html.round .r5-all .nt p{border-radius:12px}
.r5-fine{margin-top:18px;text-align:center;font-size:13px;color:var(--ink-3)}
.r5-fine a{color:var(--ink-2);border-bottom:1px solid var(--line-2)}
.s-faq .s-h2{font-size:80px}
.s-final h2{max-width:1000px}
.s-final .fine{margin-top:20px;max-width:640px;font-size:13px;line-height:1.5;color:rgba(10,10,11,.7)}
'''


def nav():
    links = ['How it works', 'Get started', 'Pricing', 'FAQ']
    return ('<header class="s-nav r5-nav"><span class="brand"><a class="s-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b></a><i></i><em>route</em></span><nav>'
            + ''.join(f'<a>{l}</a>' for l in links)
            + '</nav><div class="r"><a>Sign in</a><span class="btn red">Start free trial</span></div></header>')


def roads_svg():
    # PC -> sortie Paris en direct (route 1) et par le relais de Francfort (route 2) ; Paris -> Hypixel
    pk = lambda pts, c: ''.join(f'<rect x="{x-7}" y="{y-7}" width="14" height="14" fill="{c}" transform="rotate(-12 {x} {y})"/>' for x, y in pts)
    cond = 'font-family="Barlow Condensed" font-weight="800" font-size="13" letter-spacing="1.6"'
    big = 'font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="24"'
    return f'''<svg viewBox="0 88 548 290">
  <path d="M70 150 L 380 150" fill="none" stroke="#ECE9E2" stroke-width="3" stroke-dasharray="10 8"/>
  <path d="M70 150 C 110 290, 200 300, 225 300 C 250 300, 340 290, 380 150" fill="none" stroke="#FF3B30" stroke-width="5"/>
  <path d="M380 150 L 500 150" fill="none" stroke="#ECE9E2" stroke-width="5"/>
  {pk([(130, 150), (180, 150)], "#ECE9E2")}{pk([(118, 252), (298, 266)], "#FF3B30")}
  <g transform="translate(240 150)"><circle r="17" fill="#0A0A0B" stroke="#FF3B30" stroke-width="2.5"/><path d="M-6 -6 6 6M6 -6-6 6" stroke="#FF3B30" stroke-width="3"/></g>
  <rect x="58" y="138" width="24" height="24" fill="#ECE9E2"/>
  <rect x="368" y="138" width="24" height="24" fill="#FF3B30"/>
  <rect x="216" y="290" width="18" height="18" fill="#0A0A0B" stroke="#FF3B30" stroke-width="2.5"/>
  <circle cx="500" cy="150" r="10" fill="#ECE9E2"/>
  <text x="70" y="118" text-anchor="middle" fill="#ECE9E2" {big}>YOUR PC</text>
  <text x="380" y="118" text-anchor="middle" fill="#ECE9E2" {big}>PARIS</text>
  <text x="396" y="184" fill="#A1A1AA" {cond}>RAGO'S EXIT</text>
  <text x="500" y="118" text-anchor="middle" fill="#ECE9E2" {big}>HYPIXEL</text>
  <text x="225" y="340" text-anchor="middle" fill="#ECE9E2" {big}>FRANKFURT</text>
  <text x="225" y="360" text-anchor="middle" fill="#A1A1AA" {cond}>RAGO'S RELAY</text>
  <text x="240" y="114" text-anchor="middle" fill="#A1A1AA" {cond}>ROAD 1, DIRECT</text>
  <text x="225" y="244" text-anchor="middle" fill="#FF3B30" {cond}>ROAD 2</text>
</svg>'''


def hero():
    return f'''<section class="sw5 r5-hero"><span class="s-dots"></span>
  <div><p class="s-eb">rago route <b>//</b> premium option, in beta</p>
    <h1><span>lose packets,</span><span class="br">not fights.</span></h1>
    <p class="s-lead">Rago Route is the anti-lag tunnel for Minecraft Java. Every packet takes two roads to the server, a lost one is rebuilt or sent again fast, and your connection holds through a Wi-Fi blink. Built to stop the freezes and rubberbands that lost packets cause.</p>
    <div class="s-acts"><span class="btn red xl"><i data-i="zap"></i>start 3-day free trial</span><span class="btn xl">already premium? add it</span></div>
    <p class="fine">Included in the free trial of Premium, then $3 a month on top. Card required: free for 3 days, then $5.99 + $3 a month, charged automatically unless you cancel before. The 3 days start when you pay, so start your trial at your PC.</p>
    <ul class="s-trust">{G.ck('Built for Minecraft Java')}{G.ck('Tested on Hypixel')}{G.ck('Nothing injected in your game')}</ul></div>
  <div class="s-card r5-map">{roads_svg()}
    <p class="cap"><span class="s-tag">illustration</span><span><b>A packet lost on road 1:</b> its copy on road 2 gets there, and the first copy in is used.</span></p></div>
</section>'''


FEATS = [
    ('01', 'two roads', '', 'Every packet leaves on two roads at once: straight to Rago\'s exit in Paris, and through Rago\'s relay in Frankfurt. The first copy in is used, so one road can stumble without your game waiting.',
     '2,246', '', 'packets saved by the second road in about two minutes, with 30% dropped on purpose on the first.', 'Hypixel, prototype on a Mac, Nov 6, 2026'),
    ('02', 'backup packets', '', 'For every group of up to 4 packets, one backup packet made from all of them travels too. If one of them is lost, it\'s rebuilt on arrival from the others, with no round trip.',
     '1,413', '', 'packets rebuilt on arrival, never sent again: 20 MB through 20% loss on each road.', 'Lab, no game, Nov 8, 2026'),
    ('03', 'quick resend', '', 'Both copies lost? Every packet is numbered, so the gap is spotted as soon as a later one lands, and the missing packet is sent again in about one round trip, without waiting for a timeout.',
     'live', '', 'Every packet sent again shows in the Resends counter of the Rago Route tab.', 'Counted in the app'),
    ('04', 'session hold', '', 'Your Wi-Fi blinks: Rago\'s exit keeps your connection to the server open for up to a minute, then sends everything missing the moment you\'re back. A long cut can still end a match: the server expects your game to answer.',
     '20', 'ms', 'to flow again after an 8-second total cut of the network.', 'Lab, no game, Nov 7, 2026'),
    ('05', 'phone backup', 'beta', 'Share your phone\'s connection over USB, Bluetooth or Wi-Fi: its mobile data becomes one more road, used at the same time as your home connection. When your Wi-Fi stalls, the phone\'s copy gets there first. Rago checks each step and tells you what\'s missing.',
     '≈30', 's', 'of Wi-Fi switched off, and the game stayed connected over 4G, but unplayable on a weak signal.', 'Hypixel, prototype on a Mac, Nov 7, 2026'),
    ('06', 'live counters', '', 'The Rago Route tab in the app shows each road live: its round trip, how often it arrived first, its losses and its data, plus every packet saved, rebuilt or sent again. On a clean line it says so too.',
     '0', '', 'packets to save on our first evening on Windows: the direct road lost nothing, and the tab said so.', 'Hypixel, Nov 7, 2026'),
]


def how():
    def pk(row):
        return ''.join(f'<i class="{c}">{t}</i>' for c, t in row)
    before = pk([('ok', '1'), ('ok', '2'), ('lost', '3'), ('wait', '4'), ('wait', '5'), ('wait', '6'), ('wait', '7')])
    after = pk([('ok', '1'), ('ok', '2'), ('re', '3'), ('ok', '4'), ('ok', '5'), ('ok', '6'), ('ok', '7')])
    cards = ''
    for n, h, tag, p, big, unit, pt, src in FEATS:
        t = f'<span class="s-tag red">{tag}</span>' if tag else ''
        u = f'<small>{unit}</small>' if unit else ''
        cards += f'<div class="s-card r5-f"><b class="n">{n}</b><h3>{h}{t}</h3><p>{p}</p><div class="gap"></div><div class="pr"><b>{big}{u}</b><p>{pt}</p><span>{src}</span></div></div>'
    return f'''<section class="s-sec" id="how"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">how it works <b>//</b> six parts</p><h2 class="s-h2">one lost packet<br>freezes everything<br>behind it.</h2></div>
  <p class="s-lead">Minecraft Java plays packets in order: when one goes missing, the ones behind it wait until it's sent again, and your game freezes, then jumps. <b>A faster plan doesn't change that.</b> Rago Route gets the missing packet there before your game needs it.</p></div>
  <div class="s-card r5-seq"><div class="top"><h3>packets, in order</h3><span class="s-tag">illustration</span></div>
    <div class="row"><b>without route</b><div class="pk">{before}</div><span class="st bad">freeze, then jump</span></div>
    <div class="row w"><b>with rago route</b><div class="pk">{after}</div><span class="st good">packet 3 rebuilt</span></div>
    <p class="s-note">The numbers under each part come from our tests: the place and the date are written under each one.</p></div>
  <div class="r5-fx">{cards}</div>
</div></section>'''


def trust():
    t = [('shield', 'nothing in your game', 'No mod, nothing injected, your usual client. In Minecraft, join <code>localhost</code> for Hypixel, or <code>localhost:25566</code> for Minemen Club.'),
         ('lock', 'encrypted and signed', "Every packet between your PC and Rago's exit: a forged or replayed one is thrown away. Your match stays encrypted by Minecraft, end to end with the server."),
         ('check', 'fair play', "No fake ping, no lag switch, no packet delayed on purpose. It carries your game's own packets and doesn't change how the server counts your hits.")]
    cards = ''.join(f'<div class="s-card r5-t"><span class="ic"><i data-i="{i}"></i></span><div><h4>{h}</h4><p>{p}</p></div></div>' for i, h, p in t)
    no = [('Shorten the distance.', "Hypixel's servers are in North America: from France, the median ping was 113 ms through Rago Route and 119 ms direct, over 79 pings (Nov 7, 2026)."),
          ('Raise your FPS.', "That's the job of Rago Optimizer's tweaks, also in Premium."),
          ('Change much on a clean line.', "With no loss, there's nothing to save. With loss added on purpose, the difference was hard to feel at 5% and obvious at 25%."),
          ('Work everywhere.', "Made and tested for players in Europe, on Hypixel, from Windows 10 and 11. Rago's exit is in Paris.")]
    lis = ''.join(f'<li><i data-i="x"></i><span><b>{a}</b> {b}</span></li>' for a, b in no)
    return f'''<section class="s-sec" style="padding-top:110px"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">what it is <b>//</b> and what it isn't</p><h2 class="s-h2">your game,<br>untouched.</h2></div></div>
  <div class="r5-tr" style="margin-top:56px"><div class="l">{cards}</div>
  <div class="s-card r5-no"><h4>what it won't do</h4><p>Made for connections that drop packets. Your results depend on your line.</p><ul>{lis}</ul></div></div>
</div></section>'''


def start():
    return '''<section class="s-sec" id="start"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">get started</p><h2 class="s-h2">three steps,<br>then play.</h2></div></div>
  <div class="r5-go">
    <div class="s-card r5-g"><span class="n">1</span><h3>take rago route</h3><p>Start the free trial of Premium, Rago Route included. Already Premium? Add the option from <a>your account</a>.</p>
      <div class="vis"><div class="pl"><span class="on">trial</span><span>monthly</span><span>yearly</span></div></div></div>
    <div class="s-card r5-g"><span class="n">2</span><h3>turn it on</h3><p>In Rago Optimizer, open Network, then Rago Route, and turn it on. Plug in your phone if you want a backup road.</p>
      <div class="vis"><p class="crumbs">network <b>//</b> rago route</p><div class="r5-tg">rago route<i></i></div></div></div>
    <div class="s-card r5-g"><span class="n">3</span><h3>join localhost</h3><p>In Minecraft, add the server localhost for Hypixel, or localhost:25566 for Minemen Club, and play.</p>
      <div class="vis"><div class="srv"><div><span>Hypixel</span><b>localhost</b></div><div><span>Minemen Club</span><b>localhost:25566</b></div></div></div></div>
  </div></div></section>'''


def pricing():
    inc = ''.join(G.ck(t) for t in ['Rago Route, with every feature of the option card', 'All 218 tweaks, with no limit on how many stay on',
                                    'Packet Optimizer, tuned to your line', '20 presets, and tweaks to switch from the in-game bar'])
    feats = ''.join(G.ck(t) for t in ['Two roads for every packet: straight to Paris and through Frankfurt, the first copy in wins',
                                      'Backup packets: one for every 4, a lost packet rebuilt on arrival',
                                      'Quick resend: a packet lost on both roads sent again in about one round trip',
                                      'Session hold: your connection to the server kept open up to a minute through a cut',
                                      "Phone backup: your phone's mobile data as one more road, over USB, Bluetooth or Wi-Fi",
                                      'Live counters in the app: each road, its losses, every packet saved',
                                      'Encrypted and signed, nothing injected in Minecraft: you join localhost',
                                      "Hypixel and Minemen Club, Minecraft Java, Windows 10 and 11, on your Premium's PC"])
    return f'''<section class="s-sec" id="pricing"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">pricing</p><h2 class="s-h2" style="font-size:70px">premium with rago route,<br>or just the option.</h2></div>
  <p class="s-lead">Try both free for 3 days. Already Premium? Add Rago Route for <b>$3 a month or $17.99 a year</b>. Cancel either anytime.</p></div>
  <div class="r5-pl">
    <div class="s-card r5-p hot"><div class="t"><h3>premium<br>+ rago route</h3><span class="s-tag red">free for 3 days</span></div>
      <p class="sub">Every optimization, and the road to the server.</p>
      <div class="pr"><b>$8.99</b><span>/ month after the trial</span></div>
      <div class="split"><span><b>$5.99</b>Premium</span><em>+</em><span><b>$3</b>Rago Route</span></div>
      <span class="btn red"><i data-i="zap"></i>start 3-day free trial</span>
      <div class="r5-tl"><div><b>today</b><p>Nothing to pay. Premium and Rago Route unlock in the app.</p></div><div><b>after 3 days</b><p>Your card is charged $5.99 + $3, then every month until you cancel.</p></div><div><b>anytime</b><p>Cancel either one from the app or your account. Cancel before the trial ends and you pay nothing.</p></div></div>
      <ul>{inc}</ul>
      <div class="skip"><b>skip the trial: $47.98 a year for both</b>Yearly: $29.99 Premium + $17.99 Rago Route, paid today, 6 months free on both. Card required for the trial, one per person: if you've had Premium or a trial before, you pay from the start. The 3 days start when you pay, so start your trial at your PC.</div></div>
    <div class="s-card r5-p"><div class="t"><h3>rago route<br>option</h3><span class="s-tag">already premium?</span></div>
      <p class="sub">For an account with Premium: monthly, yearly, Lifetime or Premium time from Rago.</p>
      <div class="pr"><b>$3</b><span>/ month, on top of your Premium</span></div>
      <p class="sub" style="margin-top:12px">Or <b style="color:var(--ink)">$17.99 a year</b>: 6 months free, like yearly Premium.</p>
      <div class="two"><span class="btn">add it monthly: $3 a month</span><span class="btn">add it yearly: $17.99 a year</span></div>
      <p class="note">Sign in, pay on Stripe with your Premium's card, then turn it on in the app.</p>
      <h4>every feature</h4><ul class="ft">{feats}</ul>
</div>
  </div>
  <div class="r5-nt"><p class="s-card"><b>Its own subscription</b>Monthly or yearly. Cancel anytime from your account: you keep it until the end of the period you paid.</p>
      <p class="s-card"><b>It stops with your Premium</b>If Premium ends, the option is canceled automatically.</p>
      <p class="s-card"><b>In beta</b>It can change, and we don't promise a ping or hit registration result. <a>Terms, section 4a</a></p></div>
  <p class="r5-fine">Secure checkout with Stripe. Prices in US dollars. Cancel anytime. No refunds: try it free first. <a>Premium without Rago Route</a></p>
</div></section>'''


QA = [("Will it lower my ping?", "Usually not by much, and that isn't its job. Rago Route goes after the losses and freezes on the way to the server. Your average ping depends mostly on distance: from France, the median to Hypixel was 113 ms through Rago Route and 119 ms direct, over 79 pings taken at the same moment."),
      ("When will I feel a difference?", ''), ("Is it a VPN?", ''), ("Is it fair play?", ''), ("Can Hypixel block my account if I use it?", ''),
      ("I already have Premium. How do I add it?", ''), ("What does the free trial include?", ''), ("What happens if I cancel Premium?", ''),
      ("How much mobile data does the phone use?", ''), ("What if Rago's server is down?", ''), ("Can I get a refund?", '')]


def faq():
    qs = ''.join(f'<div class="s-q{" open" if a else ""}"><div class="qh">{q}<span class="pm"></span></div>{f"<p class=a>{a}</p>" if a else ""}</div>' for q, a in QA)
    return f'''<section class="s-sec" id="faq"><div class="sw5"><div class="s-faq">
  <div><p class="s-eb">questions <b>//</b> 11 answers</p><h2 class="s-h2">clear<br>answers.</h2>
    <div class="s-card s-stuck"><h3>still stuck?</h3><p>Open a support ticket on the Discord. The staff answers.</p><span class="btn red"><i data-i="chat"></i>open a ticket</span></div></div>
  <div>{qs}</div></div></div></section>'''


def final():
    return '''<section class="s-final"><span class="s-dots"></span><span class="big">2x</span><div class="in">
  <p class="s-eb">rago route</p><h2>give every packet a second road.</h2><p>Try Rago Route and all of Premium free for 3 days, on your own connection, in your own matches.</p>
  <div class="s-acts"><span class="btn xl"><i data-i="zap"></i>start 3-day free trial</span><span class="btn xl gh">already premium? add it</span></div>
  <p class="fine">Card required: free for 3 days, then $5.99 + $3 a month, charged automatically unless you cancel before. Cancel in two clicks in the app, or anytime from your account.</p></div></section>
''' + G.footer().replace('Rago Optimizer changes Windows settings. Results depend on your hardware and connection. A restore point is offered before advanced tweaks.',
                         'Rago Route is in beta: features and results may change. Results depend on your connection. Hypixel and Minemen Club are run by their own teams and aren\'t affiliated with Rago.')


def page(title, body, css):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="site5.css">
<script>for (const c of ['round','poster']) if (location.hash.includes(c)) document.documentElement.classList.add(c);</script>
<style>{css}</style>
<title>{title}</title>
</head>
<body><div class="win site">
{body}
</div>
<script src="icons.js"></script>
</body></html>
'''


if __name__ == '__main__':
    body = nav() + hero() + how() + trust() + start() + pricing() + faq() + final()
    (OUT / 'site-route.html').write_text(page('Rago Route', body, CSS))
    print('wrote site-route.html')
