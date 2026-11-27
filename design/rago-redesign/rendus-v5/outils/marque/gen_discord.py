# Section F : messages du bot Discord (licensing/src/community.js) en v5. Aujourd'hui : texte brut. Proposition : embeds
# rouges + bannières fixes hébergées sur le site + boutons de lien. Les textes sont ceux du code, inchangés.
import sys
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import gen_site as G
from gen_route import page

OUT = G.OUT
L = '../marque/logo/'
D = '../marque/discord/'

BN_CSS = r'''
.win.site{width:1200px;min-height:0;height:480px}
.win.site::after{display:none}
.bn{position:relative;width:1200px;height:480px;overflow:hidden;background:#0A0A0B}
.bn .s-dots{right:0;top:0;width:760px;height:480px;-webkit-mask:linear-gradient(240deg,#000 0,transparent 75%)}
.bn .kick{position:absolute;left:70px;top:58px;font-size:24px;letter-spacing:.2em}
.bn h1{position:absolute;left:66px;top:118px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:150px;line-height:.82;text-transform:uppercase;letter-spacing:-.012em}
.bn h1 span{display:block}
.bn h1 .br{position:relative;display:inline-block;isolation:isolate}
.bn h1 .br::after{content:"";position:absolute;z-index:-1;left:-30px;right:-60px;top:30%;height:78%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.bn .tag{position:absolute;left:70px;bottom:44px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:38px;text-transform:uppercase;color:var(--ink-2)}
.bn .r{position:absolute;right:70px;top:60px;height:360px}
/* récompenses : bloc rouge comme le bloc signature */
.bn.rw{background:#0A0A0B}
.bn.rw .blk{position:absolute;right:-40px;top:0;bottom:0;width:640px;background:var(--red);transform:skewX(-12deg);transform-origin:bottom}
.bn.rw .blk::after{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(10,10,11,.2) 1.2px,transparent 1.6px) 0 0/9px 9px;-webkit-mask:linear-gradient(200deg,#000,transparent 80%)}
.bn.rw .big{position:absolute;right:86px;top:50%;transform:translateY(-52%);font-family:var(--cond);font-weight:900;font-style:italic;font-size:290px;line-height:.8;letter-spacing:-.02em;color:var(--red-ink)}
.bn.rw h1{font-size:112px;top:150px}
.bn.rw .kick{top:70px}
'''


def banner(kind):
    if kind == 'welcome':
        body = (f'<div class="bn"><span class="s-dots"></span><span class="kick">rago optimizer <b>//</b> discord</span>'
                f'<h1><span>welcome</span><span>to <span class="br">rago.</span></span></h1>'
                f'<span class="tag">every millisecond counts.</span><img class="r" src="{L}rago-mark.svg" alt=""></div>')
    else:
        name = kind.upper()
        body = (f'<div class="bn rw"><span class="s-dots"></span><i class="blk"></i><span class="big">{name}</span>'
                f'<span class="kick">invite reward <b>//</b> rago discord</span>'
                f'<h1><span>new</span><span><span class="br">{name}.</span></span></h1>'
                f'<span class="tag">premium on your rago account</span></div>')
    return page(f'Discord {kind}', body, BN_CSS)


CSS = r'''
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap");
.win.site{width:1440px}
.dz{padding:56px 72px 72px}
.dz-h{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:22px;border-bottom:1px solid var(--line)}
.dz-h h1{margin-top:12px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:76px;line-height:.85;text-transform:uppercase}
.dz-h > p{max-width:600px;font-size:15px;line-height:1.5;color:var(--ink-2);text-align:right}
.dz-h > p b{color:var(--ink);font-weight:600}
.cols{display:grid;grid-template-columns:200px minmax(0,1fr) minmax(0,1.15fr);gap:20px;margin-top:26px;align-items:end}
.cols .cap{margin:0}
.row{display:grid;grid-template-columns:200px minmax(0,1fr) minmax(0,1.15fr);gap:20px;margin-top:14px;align-items:stretch}
.row > .lab b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:28px;line-height:.9;text-transform:uppercase}
.row > .lab span{display:block;margin-top:10px;font-size:13px;line-height:1.45;color:var(--ink-2)}
.row > .lab code{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:var(--ink-3)}
.cap{display:flex;align-items:center;gap:10px;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
.cap em{font-style:normal;color:var(--red)}
/* Discord, thème sombre */
.dc{background:#313338;border-radius:16px;padding:18px 20px 20px;font-family:"Noto Sans","Helvetica Neue",Arial,sans-serif;color:#DBDEE1;font-size:15px;line-height:1.375}
.dc.old{opacity:.92}
.ms{display:grid;grid-template-columns:40px 1fr;gap:16px}
.ms > img{width:40px;height:40px;border-radius:50%}
.who{display:flex;align-items:baseline;gap:8px}
.who b{font-weight:600;color:#F2F3F5;font-size:15.5px}
.who em{font-style:normal;padding:0 4.5px;border-radius:3px;background:#5865F2;font-size:10px;font-weight:600;line-height:15px;color:#fff;align-self:center}
.who small{font-size:12px;color:#949BA4}
.mt{margin-top:2px;white-space:pre-line}
.mn{padding:0 2px;border-radius:3px;background:rgba(88,101,242,.3);color:#C9CDFB;font-weight:500}
.lk{color:#00A8FC}
.sm{font-size:12.5px;color:#949BA4}
.used{display:flex;align-items:center;gap:6px;margin:0 0 6px 20px;font-size:13px;color:#B5BAC1;position:relative}
.used::before{content:"";position:absolute;left:-30px;top:9px;width:26px;height:12px;border-left:2px solid #4E5058;border-top:2px solid #4E5058;border-top-left-radius:6px}
.used img{width:16px;height:16px;border-radius:50%}
.used b{color:#F2F3F5;font-weight:500}
.used i{font-style:normal;color:#00A8FC}
.eph{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;color:#949BA4}
.eph u{color:#00A8FC;text-decoration:none}
.em5{display:grid;max-width:432px;margin-top:6px;border-radius:4px;background:#2B2D31;border-left:4px solid #FF3B30;padding:12px 16px 14px 12px}
.em5 .au{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:#F2F3F5}
.em5 .au img{width:24px;height:24px;border-radius:50%}
.em5 .ti{margin-top:6px;font-weight:700;color:#F2F3F5;font-size:16px}
.em5 .de{margin-top:6px;font-size:14px;line-height:1.4;white-space:pre-line}
.em5 .de b{color:#F2F3F5}
.em5 .fd{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.em5 .fd div{font-size:14px}
.em5 .fd b{display:block;font-size:13px;font-weight:700;color:#F2F3F5}
.em5 .bar{font-family:ui-monospace,Consolas,monospace;letter-spacing:-.5px;color:#FF3B30}
.em5 .bar i{font-style:normal;color:#4E5058}
.em5 .im{display:block;width:100%;margin-top:12px;border-radius:4px}
.em5 .ft{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:#B5BAC1}
.em5 .ft img{width:20px;height:20px;border-radius:50%}
.em5 ol{margin-top:6px;padding-left:0;list-style:none;display:grid;gap:4px;font-size:14px}
.em5 ol li{display:grid;grid-template-columns:22px 1fr 40px;align-items:center}
.em5 ol li span:first-child{color:#949BA4;font-weight:600}
.em5 ol li span:last-child{text-align:right;font-weight:700;color:#F2F3F5}
.em5 ol li.me{color:#F2F3F5}
.bts{display:flex;gap:8px;margin-top:8px}
.bts a{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 14px;border-radius:3px;background:#4E5058;color:#fff;font-size:14px;font-weight:500}
.bts a svg{width:14px;height:14px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.dev{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;margin-top:40px}
.card{background:var(--bg-2);border:1px solid var(--line);border-radius:22px;padding:28px 30px}
.card .cap{margin-bottom:14px}
.card ul{list-style:none;display:grid;gap:10px}
.card li{position:relative;padding-left:22px;font-size:14px;line-height:1.5;color:var(--ink-2)}
.card li::before{content:"";position:absolute;left:0;top:.66em;width:10px;height:3px;background:var(--red);transform:skewX(var(--skew))}
.card li b{color:var(--ink);font-weight:600}
.card li code{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;color:var(--ink)}
.bns{display:grid;gap:12px}
.bns img{display:block;width:100%;border-radius:12px;border:1px solid var(--line)}
.bns div{display:grid;grid-template-columns:1fr 1fr;gap:12px}
'''

EXT = '<svg viewBox="0 0 24 24"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
BOT = f'<img src="../marque/logo/png/rago-tile-512.png" alt="">'
AV = {'kenzo': '#E8A33D', 'lena': '#5AB8FF', 'mira': '#B69CFF'}


def av(name, size=40):
    return f'<span style="display:block;width:{size}px;height:{size}px;border-radius:50%;background:{AV.get(name, "#777")};"></span>'


def msg(body, time='Today at 18:42', bot=True):
    return (f'<div class="ms">{BOT}<div><div class="who"><b>Rago</b><em>APP</em><small>{time}</small></div>{body}</div></div>')


def used(user, cmd):
    return f'<div class="used"><span style="width:16px;height:16px;border-radius:50%;background:{AV[user]}"></span><b>{user}</b> used <i>/{cmd}</i></div>'


def mn(x):
    return f'<span class="mn">@{x}</span>'


EPH = '<div class="eph"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#949BA4" stroke-width="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>Only you can see this · <u>Dismiss message</u></div>'
INV_NOTE = "A friend counts after 7 days on the server. Rejoins and accounts under a week old don't count."


def rows():
    out = []
    # 1. bienvenue
    old = msg(f'<div class="mt">Welcome {mn("kenzo")}, you\'re member #1,204.\nInvited by {mn("lena")}.\nNew here? The free version of Rago Optimizer is at <span class="lk">https://rago-optimizer.com/download</span>. Link your Discord on your Rago account to get invite and boost rewards: <span class="lk">https://account.rago-optimizer.com/account</span></div>')
    new = msg(f'<div class="mt">Welcome {mn("kenzo")}, you\'re member #1,204.</div>'
              f'<div class="em5"><div class="de">Invited by {mn("lena")}.\nNew here? The free version of Rago Optimizer is one click away. Link your Discord on your Rago account to get invite and boost rewards.</div>'
              f'<img class="im" src="{D}discord-welcome.png" alt=""></div>'
              f'<div class="bts"><a>Download free {EXT}</a><a>Link my Discord {EXT}</a></div>')
    out.append(('bienvenue', 'Salon d’accueil, à chaque arrivée.', 'welcome()', old, new))
    # 2. VIP
    old = msg(f'<div class="mt">{mn("mira")} reached 10 invites and gets VIP. 1 month of Premium and a one-time 10% code are on your Rago account.</div>')
    new = msg(f'<div class="mt">{mn("mira")} reached 10 invites and gets VIP.</div>'
              f'<div class="em5"><div class="de">1 month of Premium and a one-time 10% code are on your Rago account.</div>'
              f'<img class="im" src="{D}discord-vip.png" alt=""></div>')
    out.append(('vip et mvp', 'Même salon, une fois par membre et par rôle. MVP : même message, bannière MVP.', 'announce()', old, new))
    # 3. /invites
    old = used('kenzo', 'invites') + msg(f'<div class="mt">You invited <b style="color:#F2F3F5">4 friends</b> who stayed 7 days. 2 more will count once they\'ve been here 7 days. Next: VIP at 10 invites.\n<span class="sm">{INV_NOTE}</span></div>' + EPH)
    bar = '▰' * 4 + '<i>' + '▱' * 6 + '</i>'
    new = used('kenzo', 'invites') + msg(f'<div class="em5"><div class="ti">Your invites</div><div class="de">You invited <b>4 friends</b> who stayed 7 days. 2 more will count once they\'ve been here 7 days.</div>'
                                         f'<div class="fd"><div><b>Next: VIP</b><span class="bar">{bar}</span> 4 / 10</div><div><b>Then: MVP</b>15 invites</div></div>'
                                         f'<div class="ft">{INV_NOTE}</div></div>' + EPH)
    out.append(('/invites', 'Réponse visible par le joueur seul.', 'invitesText()', old, new))
    # 4. /top-invites
    top = [('lena', 23), ('mira', 12), ('axel_pvp', 9), ('kenzo', 4), ('noa', 3)]
    old = used('lena', 'top-invites') + msg('<div class="mt"><b style="color:#F2F3F5">Top inviters</b> (friends who stayed 7 days)\n' + '\n'.join(f'{k}. {mn(n)} {c}' for k, (n, c) in enumerate(top, 1)) + '</div>')
    li = ''.join(f'<li><span>{k}</span><span>{mn(n)}</span><span>{c}</span></li>' for k, (n, c) in enumerate(top, 1))
    new = used('lena', 'top-invites') + msg(f'<div class="em5"><div class="ti">Top inviters</div><div class="sm" style="margin-top:2px">Friends who stayed 7 days</div><ol>{li}</ol></div>')
    out.append(('/top-invites', 'Visible par tout le salon.', 'top-invites', old, new))
    h = '<div class="cols"><span></span><p class="cap">aujourd’hui <em>//</em> texte brut</p><p class="cap">proposé <em>//</em> v5</p></div>'
    for t, d, fn, o, n in out:
        h += f'<div class="row"><div class="lab"><b>{t}</b><span>{d}</span><code>{fn}</code></div><div class="dc old">{o}</div><div class="dc">{n}</div></div>'
    return h


def board():
    head = ('<div class="dz-h"><div><p class="s-eb">discord <b>//</b> bot rago</p><h1>messages du bot.</h1></div>'
            '<p>Aujourd’hui le bot écrit en texte brut. Proposition : <b>le même texte</b> (les adresses deviennent des boutons), posé dans un encadré rouge Rago, '
            'avec une bannière d’affiche et des boutons de lien. La mention reste dans le message pour notifier le joueur.</p></div>')
    dev = f'''<div class="dev"><div class="card"><p class="cap">pour le développeur <em>//</em> community.js</p><ul>
<li><b>Embeds</b> : <code>embeds: [{{ color: 0xFF3B30, description, image: {{ url }} }}]</code>. La mention <code>&lt;@id&gt;</code> reste dans <code>content</code> : une mention dans un embed ne notifie pas.</li>
<li><b>Boutons de lien</b> (bienvenue) : <code>components</code> de type 2, style 5, vers <code>/download</code> et <code>/account</code>. Les adresses sortent du texte.</li>
<li><b>Bannières</b> : trois PNG fixes, 1200 × 480, hébergés sur le site (<code>/img/discord/</code>). Pas d’image générée par membre : aucun module en plus.</li>
<li><b>/invites</b> : la barre ▰▱ est du texte (10 cases), calculée sur le prochain palier. <b>/growth</b>, <b>/partner-link</b> et les messages d’erreur restent en texte : réservés au staff ou très courts.</li>
<li><b>Avatar du bot</b> : <code>png/rago-tile-512.png</code> (plein cadre, Discord le rogne en rond). Le texte personnalisé <code>DISCORD_WELCOME_TEXT</code> va dans la description.</li></ul></div>
<div class="card"><p class="cap">les bannières <em>//</em> marque/discord</p><div class="bns"><img src="{D}discord-welcome.png" alt=""><div><img src="{D}discord-vip.png" alt=""><img src="{D}discord-mvp.png" alt=""></div></div></div></div>'''
    return f'<main class="dz">{head}{rows()}{dev}</main>'


if __name__ == '__main__':
    for k in ('welcome', 'vip', 'mvp'):
        (OUT / f'discord-banner-{k}.html').write_text(banner(k))
    (OUT / 'marque-discord.html').write_text(page('Discord', board(), CSS))
    print('ok')
