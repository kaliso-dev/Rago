# Lot 4 : pages Avis (reviews.html) et Partenaires (partners.html). Textes repris du site (22/11/2026).
# Les avis affichés sont des exemples de maquette (les vrais viennent du serveur) : une note en pointillés le dit.
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_site as G
from gen_route import page

OUT = G.OUT

CSS = r'''
.sm-nav .r > a{display:inline-flex;align-items:center;gap:8px}
.sm-nav .r > a svg{width:16px;height:16px;transform:rotate(180deg)}
.sm-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:60px;align-items:end;padding:80px 0 0}
.sm-hero .s-dots{right:-120px;top:-40px;width:760px;height:520px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 65%)}
.sm-hero h1{position:relative;margin-top:22px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:100px;line-height:.84;text-transform:uppercase;letter-spacing:-.01em}
.sm-hero .s-lead{margin-top:26px}
.sm-hero h1 span{display:block}
.sm-hero h1 .br{position:relative;display:inline-block;isolation:isolate}
.sm-hero h1 .br::after{content:"";position:absolute;z-index:-1;left:-24px;right:-50px;top:30%;height:76%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.sm-sum{display:grid;grid-template-columns:150px 1fr;gap:26px;padding:26px 28px}
.sm-sum .avg b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:96px;line-height:.8}
.sm-sum .avg small{display:block;margin-top:10px;font-size:13px;color:var(--ink-3)}
.st5{display:flex;gap:3px;margin-top:10px}
.st5 i{width:16px;height:16px;background:var(--red);clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
.st5 i.off{background:var(--bg-4)}
.st5.sm i{width:15px;height:15px}
.sm-sum ul{display:grid;gap:7px;align-content:center}
.sm-sum li{display:grid;grid-template-columns:32px 1fr 26px;gap:12px;align-items:center;font-family:var(--cond);font-weight:800;font-size:14px;color:var(--ink-2)}
.sm-sum li .b{height:10px;background:var(--bg-4);transform:skewX(var(--skew))}
.sm-sum li .b i{display:block;height:100%;background:var(--red)}
.sm-sum li em{font-style:normal;text-align:right;color:var(--ink-3)}
.sm-sum li.on{color:var(--ink)}
.sm-bar{display:flex;align-items:center;gap:6px;margin-top:64px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.sm-bar span{height:38px;padding:0 16px;display:inline-grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.sm-bar span.on{position:relative;color:var(--red-ink);isolation:isolate}
.sm-bar span.on::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--red);transform:skewX(var(--skew))}
.sm-bar b{margin-left:auto;font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.sm-list{columns:3;column-gap:14px;margin-top:24px}
.sm-rv{break-inside:avoid;margin-bottom:14px;padding:24px 24px 22px}
.sm-rv q{display:block;margin-top:14px;font-size:15.5px;line-height:1.55}
.sm-rv q::before{content:"“"}.sm-rv q::after{content:"”"}
.sm-rv footer{display:flex;align-items:center;gap:12px;margin-top:18px}
.sm-rv footer i{width:36px;height:36px;display:grid;place-items:center;background:var(--bg-4);font-family:var(--cond);font-weight:900;font-size:17px;font-style:normal}
html.round .sm-rv footer i{border-radius:50%}
.sm-rv footer b{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.04em;text-transform:uppercase}
.sm-rv footer small{margin-left:auto;font-size:12.5px;color:var(--ink-3)}
.sm-ex{display:inline-block;margin-top:18px;padding:6px 12px;border:1.5px dashed #F5A524;font-family:Barlow,sans-serif;font-size:12.5px;color:#F5A524;transform:rotate(-1deg)}
.sm-leave{display:grid;grid-template-columns:1fr auto;gap:40px;align-items:center;margin-top:40px;padding:34px 36px}
.sm-leave h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:44px;line-height:.88;text-transform:uppercase}
.sm-leave p{margin-top:12px;max-width:640px;font-size:15px;line-height:1.55;color:var(--ink-2)}
.sm-empty{display:grid;place-items:center;text-align:center;padding:80px 20px;margin-top:64px;border:1.5px dashed var(--line-2)}
html.round .sm-empty{border-radius:22px}
.sm-empty .ic{width:64px;height:64px;display:grid;place-items:center;background:rgba(255,59,48,.12);color:var(--red)}
.sm-empty .ic svg{width:28px;height:28px}
html.round .sm-empty .ic{border-radius:18px}
.sm-empty b{display:block;margin-top:18px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;text-transform:uppercase}
.sm-empty span{display:block;margin-top:6px;font-size:15px;color:var(--ink-2)}
.sm-sum.none .avg b{color:var(--ink-3)}
.sm-sum.none li .b i{width:0 !important}
.sm-foot{margin-top:110px}

/* partenaires */
.pt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:56px}
.pt-c{display:flex;flex-direction:column;padding:26px}
.pt-c .lg{display:flex;align-items:center;gap:20px}
.pt-c img{width:96px;height:96px;display:block;flex:none}
html.round .pt-c img{border-radius:20px}
.pt-c b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:.9;text-transform:uppercase}
.pt-c small{display:block;margin-top:8px;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.pt-c .btn{margin-top:24px;height:48px;font-size:16px}
.pt-c .btn svg{width:15px;height:15px}
.pt-note{display:flex;align-items:center;gap:12px;margin-top:22px;font-size:14px;color:var(--ink-3)}
.pt-note svg{width:16px;height:16px;color:var(--ink-3)}
'''

RV = [(5, 'My knockback feels the same every fight now, no more random spikes on Bedwars. The in-game bar is the best part.', 'Nov 19, 2026'),
      (5, 'Ran the network test, saw the jitter, turned on the Network preset. Hits finally land where I aim.', 'Nov 18, 2026'),
      (4, 'The free tweaks already cleaned up my laptop. Clear app, every tweak says what it does.', 'Nov 16, 2026'),
      (5, 'Restore point before every advanced tweak, so I tried everything without stress. Turned two off and my settings came back.', 'Nov 15, 2026'),
      (5, 'FPS stays flat in team fights now. I liked that it tells you when a tweak barely does anything.', 'Nov 14, 2026'),
      (3, 'Good app, but the tweaks I wanted most are Premium. The free plan is still worth it for the cleanup tools.', 'Nov 12, 2026')]


def sub_nav():
    return ('<header class="s-nav sm-nav"><a class="s-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b></a>'
            '<div class="r"><a><i data-i="arrow"></i>back to the site</a><span class="btn red">get premium</span></div></header>')


def stars(n, cls=''):
    return f'<span class="st5 {cls}">' + ''.join(f'<i{"" if i < n else " class=off"}></i>' for i in range(5)) + '</span>'


def reviews(empty=False):
    dist = [(5, 9), (4, 2), (3, 1), (2, 0), (1, 0)]
    tot = 12
    lis = ''.join(f'<li><span>{s} ★</span><span class="b"><i style="width:{c / tot * 100:.0f}%"></i></span><em>{0 if empty else c}</em></li>' for s, c in dist)
    avg = '–' if empty else '4.7'
    totl = 'No reviews yet' if empty else '12 reviews'
    head = f'''<section class="sw5 sm-hero"><span class="s-dots"></span>
  <div><p class="s-eb">reviews</p><h1><span>players feel</span><span class="br">the difference.</span></h1>
    <p class="s-lead">Every review of Rago Optimizer, in full and as written, from players signed in to their Rago account. Results depend on your PC and connection.</p></div>
  {'' if empty else f'<div class="s-card sm-sum"><div class="avg"><b>{avg}</b>{stars(5)}<small>{totl}</small></div><ul>{lis}</ul></div>'}
</section>'''
    if empty:
        body = '<div class="sw5"><div class="sm-empty"><div><span class="ic"><i data-i="chat"></i></span><b>no reviews yet.</b><span>Be the first: leave yours below.</span></div></div>'
    else:
        cards = ''.join(f'<figure class="s-card sm-rv">{stars(r, "sm")}<q>{q}</q><footer><i>{chr(65 + k)}</i><b>Example player {chr(65 + k)}</b><small>{d}</small></footer></figure>'
                        for k, (r, q, d) in enumerate(RV))
        body = (f'<div class="sw5"><div class="sm-bar"><span class="on">all reviews</span><span>newest</span><span>highest rated</span><span>lowest rated</span><b>showing 6 of 12</b></div>'
                f'<p class="sm-ex">mockup: example reviews, the real ones come from the server</p><div class="sm-list">{cards}</div>')
    body += '''<div class="s-card sm-leave"><div><h3>played with rago optimizer?<br>leave your review.</h3>
    <p>Premium members write theirs from their account page. On the free version, open Rago Optimizer, then Settings, then Leave a review. It shows here with your public name, never your email.</p></div>
    <span class="btn red lg"><i data-i="pencil"></i>leave a review</span></div></div>'''
    foot = G.footer().replace('Rago Optimizer changes Windows settings. Results depend on your hardware and connection. A restore point is offered before advanced tweaks.',
                              "Reviews are posted by players signed in to their Rago account, from the app or the website, and shown as written, from the most recently updated. We don't pay for reviews or hide negative ones.")
    return sub_nav() + head + body + f'<div class="sm-foot">{foot}</div>'


def partners():
    P = [('Pika Ranked Bedwars', 'pika-ranked-bedwars'), ('Ranked Bedwars', 'ranked-bedwars'), ('Ranked Bedwars [SEASON 8]', 'ranked-bedwars-season-8'),
         ('Axora Ranked Bedwars', 'axora-ranked-bedwars'), ('Ranked Bedwars 2v2s [SEASON 1]', 'ranked-bedwars-2v2s'), ('Ayor Ranked Bedwars', 'ayor-ranked-bedwars')]
    cards = ''.join(f'<div class="s-card pt-c"><div class="lg"><img src="img/site/partners/{f}.webp" alt=""><div><b>{n}</b><small>minecraft pvp server</small></div></div>'
                    f'<span class="btn"><i data-i="external"></i>join on discord</span></div>' for n, f in P)
    head = '''<section class="sw5 sm-hero" style="grid-template-columns:1fr"><span class="s-dots"></span>
  <div><p class="s-eb">partners <b>//</b> 6 servers</p><h1><span>our partner</span><span class="br">servers.</span></h1>
    <p class="s-lead">Minecraft PvP communities that work with Rago Optimizer. Each card opens the server's Discord invite in a new tab.</p></div></section>'''
    body = f'<div class="sw5"><div class="pt-grid">{cards}</div><p class="pt-note"><i data-i="info"></i>Each partner server is run by its own team.</p></div>'
    foot = G.footer().replace('Rago Optimizer changes Windows settings. Results depend on your hardware and connection. A restore point is offered before advanced tweaks.',
                              'Each partner server is run by its own team.')
    return sub_nav() + head + body + f'<div class="sm-foot">{foot}</div>'


if __name__ == '__main__':
    (OUT / 'site-reviews.html').write_text(page('Reviews', reviews(), CSS))
    (OUT / 'site-reviews-empty.html').write_text(page('Reviews, empty', reviews(True), CSS))
    (OUT / 'site-partners.html').write_text(page('Partners', partners(), CSS))
    print('wrote site-reviews.html, site-reviews-empty.html, site-partners.html')
