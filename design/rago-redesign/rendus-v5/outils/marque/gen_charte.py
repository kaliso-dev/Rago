# Section F : charte v5 (page en français, comme brand/charte.html), sur les fichiers du kit logo de gen_brand.py.
import sys, re, urllib.parse
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE)); sys.path.insert(0, str(HERE.parent / 'ricons'))
import gen_site as G
from gen_route import page
import solid as SO
import print_admin as PA

OUT = G.OUT
FX = OUT / 'img/fx'
L = '../marque/logo/'


def data_uri(name):
    s = (FX / name).read_text()
    s = re.sub(r'<metadata>.*?</metadata>', '', s, flags=re.S).replace(' xmlns:c2pa="http://c2pa.org/manifest"', '')
    return 'url("data:image/svg+xml,' + urllib.parse.quote(s) + '")'


TAPE, TORN = data_uri('tape.svg'), data_uri('torn-a.svg')

CSS = r'''
.win.site{width:1440px;background:var(--bg)}
.ch{position:relative;padding:76px 72px 84px;border-top:1px solid var(--line)}
.ch-h{display:grid;grid-template-columns:400px minmax(0,1fr);gap:40px;align-items:end;margin-bottom:40px}
.ch-h .kick{display:block;margin-bottom:16px}
.ch-h h2{position:relative;display:inline-block;padding:10px 26px 6px 18px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:46px;line-height:1;text-transform:uppercase;color:var(--red-ink);white-space:nowrap;isolation:isolate;transform:rotate(-1.4deg);transform-origin:left center}
.ch-h h2::before{content:"";position:absolute;inset:0;z-index:-1;background:#ECE9E2;-webkit-mask:TAPE 0 0/100% 100% no-repeat;mask:TAPE 0 0/100% 100% no-repeat}
.ch-h p{max-width:720px;font-size:17px;line-height:1.5;color:var(--ink-2)}
.ch-h p b{color:var(--ink);font-weight:600}
.cap{display:flex;align-items:center;gap:10px;margin-bottom:12px;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
.cap em{font-style:normal;color:var(--red)}
.card{position:relative;background:var(--bg-2);border:1px solid var(--line);border-radius:22px;overflow:hidden}
.note{font-size:14px;line-height:1.55;color:var(--ink-2)}
.note b{color:var(--ink);font-weight:600}
.g{display:grid;gap:18px}

/* couverture */
.cov{position:relative;height:940px;padding:64px 72px 0;overflow:hidden}
.cov .s-dots{right:0;top:0;width:900px;height:940px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 70%)}
.cov .top{display:flex;align-items:center;justify-content:space-between}
.cov .top img{height:46px}
.cov .top span{font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.cov .kick{display:block;margin-top:96px}
.cov h1{position:relative;z-index:2;margin-top:22px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:138px;line-height:.84;text-transform:uppercase;letter-spacing:-.012em}
.cov h1 span{display:block}
.cov h1 .br{position:relative;display:inline-block;isolation:isolate}
.cov h1 .br::after{content:"";position:absolute;z-index:-1;left:-30px;right:-70px;top:30%;height:78%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.cov h1::before{content:attr(data-t);position:absolute;left:16px;top:-14px;z-index:-1;width:100%;color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.14);white-space:pre-line}
.cov .lead{position:relative;z-index:2;max-width:600px;margin-top:38px;font-size:19px;line-height:1.5;color:var(--ink-2)}
.cov .lead b{color:var(--ink);font-weight:600}
.cov .meta{position:absolute;left:72px;right:72px;bottom:40px;display:flex;gap:40px;padding-top:20px;border-top:1px solid var(--line);font-size:14px;color:var(--ink-3)}
.cov .meta b{color:var(--ink-2);font-weight:600}
.cov .bigr{position:absolute;right:92px;top:200px;width:400px;filter:drop-shadow(0 40px 60px rgba(0,0,0,.6))}

/* principes */
.pr{grid-template-columns:repeat(5,minmax(0,1fr))}
.pr .card{padding:26px 24px 28px}
.pr .pi{width:38px;height:38px}
.pr h3{margin-top:26px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:31px;line-height:.9;text-transform:uppercase}
.pr p{margin-top:14px;font-size:14.5px;line-height:1.5;color:var(--ink-2)}

/* logo */
.lg1{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)}
.lg-r{display:grid;grid-template-columns:330px minmax(0,1fr);gap:34px;align-items:center;padding:40px 40px 40px 52px;min-height:430px}
.lg-r .art{position:relative}
.lg-r .art img{display:block;width:100%}
.lg-r .s-dots{inset:0;-webkit-mask:linear-gradient(90deg,#000,transparent 60%)}
.anno{display:grid;gap:18px}
.anno div{display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:start}
.anno i{width:44px;height:44px;border-radius:10px;border:1px solid var(--line-2)}
.anno b{display:block;font-family:var(--cond);font-weight:800;font-size:16px;letter-spacing:.06em;text-transform:uppercase}
.anno span{display:block;margin-top:4px;font-size:13.5px;line-height:1.45;color:var(--ink-2)}
.lg-f{padding:40px 40px 36px}
.lg-f .row{display:flex;align-items:flex-end;gap:30px;height:220px}
.lg-f .row img{display:block}
.lg-f .row .on-red{display:grid;place-items:center;width:150px;height:150px;border-radius:18px;background:var(--red)}
.lg-f .note{margin-top:24px}

.sizes{padding:36px 40px 34px}
.sizes .row{display:flex;align-items:flex-end;gap:34px}
.sizes figure{display:flex;flex-direction:column;align-items:center;gap:12px}
.sizes figure img{display:block}
.sizes figcaption{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;color:var(--ink-3)}
.sizes .sep{width:1px;align-self:stretch;background:var(--line);margin:0 6px}
.sizes .note{margin-top:26px;max-width:980px}

.lk{grid-template-columns:repeat(2,minmax(0,1fr))}
.lk .card{padding:34px 40px 30px}
.lk .card.paper{background:#ECE9E2;border-color:transparent}
.lk .card.paper .cap{color:#5A5A63}
.lk .item{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 0;border-top:1px solid var(--line)}
.lk .paper .item{border-top-color:rgba(10,10,11,.1)}
.lk .item:first-of-type{border-top:0;padding-top:8px}
.lk .item img{display:block}
.lk .item span{font-size:13px;line-height:1.4;color:var(--ink-3);text-align:right;max-width:200px}
.lk .paper .item span{color:#5A5A63}

.use{grid-template-columns:1.25fr 1fr 1fr .8fr}
.use .card{padding:26px 26px 24px}
.use .stage{height:150px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:var(--bg);border:1px solid var(--line);overflow:hidden;position:relative}
.use .note{margin-top:16px;font-size:13.5px}
.tab{position:absolute;left:18px;bottom:0;display:flex;align-items:center;gap:10px;width:250px;height:42px;padding:0 14px;border-radius:12px 12px 0 0;background:#2A2A30;font-size:13.5px;color:#E5E5E8}
.tab img{width:16px;height:16px}
.tab em{margin-left:auto;font-style:normal;color:#8E8E98}
.tbar{position:absolute;left:0;right:0;bottom:0;height:56px;display:flex;align-items:center;justify-content:center;gap:16px;background:rgba(32,32,36,.96);border-top:1px solid rgba(255,255,255,.06)}
.tbar i{width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,.07)}
.tbar .on{position:relative;display:grid;place-items:center;width:44px;height:44px;border-radius:7px;background:rgba(255,255,255,.1)}
.tbar .on::after{content:"";position:absolute;bottom:2px;left:15px;right:15px;height:3px;border-radius:2px;background:#9AB7FF}
.tbar .on img{width:26px;height:26px}
.dc{display:flex;gap:14px;align-items:flex-start;padding:0 18px;width:100%}
.dc img{width:40px;height:40px;border-radius:50%}
.dc b{font-weight:600;font-size:14.5px;color:#F2F3F5}
.dc b em{margin-left:6px;padding:1px 5px;border-radius:4px;background:#5865F2;font-style:normal;font-size:10px;font-weight:700;color:#fff;vertical-align:2px}
.dc p{margin-top:4px;font-size:13.5px;line-height:1.4;color:#DBDEE1}
.ios{display:flex;flex-direction:column;align-items:center;gap:8px}
.ios img{width:64px;height:64px;border-radius:15px}
.ios span{font-size:12px;color:#fff}

.rules{grid-template-columns:1.1fr 1fr 1.6fr}
.rules .card{padding:28px 30px 28px}
.clear{position:relative;display:inline-block;margin:26px 0 8px 30px;padding:24px;border:1.5px dashed rgba(255,59,48,.6)}
.clear img{display:block;height:58px}
.clear i{position:absolute;font-style:normal;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.1em;color:var(--red)}
.clear i.t{left:50%;top:3px;transform:translateX(-50%)}
.clear i.l{left:4px;top:50%;transform:translateY(-50%)}
.mins{display:grid;gap:16px;margin-top:22px}
.mins div{display:grid;grid-template-columns:150px 1fr;align-items:center;gap:18px}
.mins div > span:first-child{display:flex;align-items:center;min-height:20px}
.mins b{display:block;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.06em;text-transform:uppercase}
.mins span{font-size:13px;color:var(--ink-2)}
.dont{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:4px}
.dont figure{display:flex;flex-direction:column;gap:10px}
.dont .st{position:relative;height:120px;display:grid;place-items:center;border-radius:14px;background:var(--bg);border:1px solid var(--line);overflow:hidden}
.dont .st::after{content:"";position:absolute;left:-10%;right:-10%;top:50%;height:3px;background:var(--red);transform:rotate(-24deg);box-shadow:0 0 0 3px var(--bg-2)}
.dont .st img{height:76px}
.dont figcaption{font-size:13px;line-height:1.4;color:var(--ink-2)}
.dont figcaption b{display:block;color:var(--ink);font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.08em;text-transform:uppercase}

/* couleurs */
.co{grid-template-columns:repeat(4,minmax(0,1fr))}
.swc{display:flex;flex-direction:column;border-radius:18px;overflow:hidden;border:1px solid var(--line);background:var(--bg-2)}
.swc .c{height:150px;position:relative}
.swc .c em{position:absolute;right:16px;bottom:14px;font-style:normal;font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;line-height:1;text-transform:uppercase}
.swc .t{padding:16px 18px 18px}
.swc .t b{display:flex;justify-content:space-between;font-family:var(--cond);font-weight:800;font-size:17px;letter-spacing:.06em;text-transform:uppercase}
.swc .t b code{font-family:var(--cond);font-weight:700;color:var(--ink-2);letter-spacing:.04em}
.swc .t p{margin-top:8px;font-size:13px;line-height:1.45;color:var(--ink-2)}
.co2{grid-template-columns:repeat(6,minmax(0,1fr));margin-top:18px}
.co2 .swc .c{height:84px}
.co3{grid-template-columns:1.2fr 1fr;margin-top:18px}
.co3 .card{padding:28px 30px}
.pair{display:flex;gap:14px;margin-top:6px}
.pair figure{flex:1;display:flex;flex-direction:column;gap:10px}
.pair .bx{height:86px;display:grid;place-items:center;border-radius:14px;font-family:var(--cond);font-weight:800;font-size:19px;letter-spacing:.06em;text-transform:uppercase}
.pair figcaption{font-size:13px;line-height:1.4;color:var(--ink-2)}
.pair figcaption b{font-weight:600}
.pair .ok b{color:var(--ok)}
.pair .no b{color:var(--red)}

/* typo */
.ty{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
.ty .card{padding:34px 40px 36px}
.spec{position:relative;font-family:var(--cond);font-weight:900;font-style:italic;font-size:150px;line-height:.8;letter-spacing:-.01em;text-transform:uppercase;margin:24px 0 10px}
.spec::before{content:attr(data-t);position:absolute;left:14px;top:-12px;z-index:0;color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.16)}
.spec span{position:relative;color:var(--red)}
.bod{margin-top:30px;max-width:560px}
.fam{display:flex;gap:40px;margin-top:30px;padding-top:22px;border-top:1px solid var(--line)}
.fam div{flex:1}
.fam div b{display:block;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.1em;text-transform:uppercase}
.fam div span{display:block;margin-top:6px;font-size:13.5px;color:var(--ink-2);line-height:1.45}
.scale{display:grid;gap:0;margin-top:4px}
.scale div{display:grid;grid-template-columns:96px 1fr 110px;align-items:baseline;gap:16px;padding:12px 0;border-top:1px solid var(--line)}
.scale div:first-child{border-top:0}
.scale code{font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.scale em{font-style:normal;font-size:12.5px;color:var(--ink-3);text-align:right}
.d{font-family:var(--cond);font-weight:900;font-style:italic;text-transform:uppercase;line-height:.85}
.u{font-family:var(--cond);font-weight:800;text-transform:uppercase}
.ty2{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:18px}
.ty2 .card{padding:26px 28px}
.ty2 ul{list-style:none;display:grid;gap:10px}
.ty2 li{position:relative;padding-left:22px;font-size:14px;line-height:1.5;color:var(--ink-2)}
.ty2 li::before{content:"";position:absolute;left:0;top:.66em;width:10px;height:3px;background:var(--red);transform:skewX(var(--skew))}
.ty2 li b{color:var(--ink);font-weight:600}

/* formes */
.fo{grid-template-columns:minmax(0,1fr) minmax(0,1.5fr)}
.fo .card{padding:32px 36px}
.skew{position:relative;height:250px;margin-top:6px}
.skew .blk{position:absolute;left:70px;top:30px;width:240px;height:150px;background:var(--red);transform:skewX(-12deg);border-radius:16px}
.skew .blk::after{content:"";position:absolute;inset:0;border-radius:16px;background:radial-gradient(circle,rgba(10,10,11,.2) 1.1px,transparent 1.5px) 0 0/8px 8px}
.skew .ax{position:absolute;left:191px;top:16px;width:0;height:178px;border-left:1.5px dashed rgba(255,255,255,.35)}
.skew .ang{position:absolute;left:330px;top:40px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:44px;color:var(--ink)}
.skew .sk-t{position:absolute;left:70px;top:206px;font-size:13.5px;color:var(--ink-2);max-width:360px;line-height:1.45}
.cmp{display:grid;grid-template-columns:150px 1fr;row-gap:22px;column-gap:20px;align-items:center;margin-top:6px}
.cmp > span{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.cmp .r{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.rad{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:26px;padding-top:24px;border-top:1px solid var(--line)}
.rad figure{display:flex;flex-direction:column;align-items:center;gap:8px}
.rad figure i{display:block;background:var(--bg-4);border:1px solid var(--line-2);border-top-color:var(--red);border-left-color:var(--red)}
.rad figcaption{font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.08em;color:var(--ink-3);text-align:center;line-height:1.2}
.rad figcaption b{display:block;color:var(--ink-2)}

/* effets */
.fx{grid-template-columns:repeat(3,minmax(0,1fr))}
.fx .card{padding:0}
.fx .st{position:relative;height:200px;overflow:hidden;background:var(--bg);border-bottom:1px solid var(--line)}
.fx .t{padding:20px 24px 22px}
.fx .t b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;line-height:.9;text-transform:uppercase}
.fx .t p{margin-top:10px;font-size:13.5px;line-height:1.5;color:var(--ink-2)}
.fx .t p em{font-style:normal;color:var(--ink)}
.fx-brush{display:grid;place-items:center}
.fx-brush span{position:relative;font-family:var(--cond);font-weight:900;font-style:italic;font-size:76px;line-height:.8;text-transform:uppercase;isolation:isolate}
.fx-brush span::after{content:"";position:absolute;z-index:-1;left:-26px;right:-50px;top:34%;height:74%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2.5deg)}
.fx-torn::before{content:"";position:absolute;left:0;top:0;bottom:0;width:62%;background:var(--red);-webkit-mask:TORN 0 0/100% 100% no-repeat}
.fx-torn::after{content:"";position:absolute;left:0;top:0;bottom:0;width:58%;background:#17171A url(img/covers/valorant-hero.jpg) 40% 30%/cover;-webkit-mask:TORN 0 0/100% 100% no-repeat}
.fx-tape{display:grid;place-items:center}
.fx-tape span{position:relative;padding:10px 26px 6px 18px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:34px;line-height:1;text-transform:uppercase;color:var(--red-ink);isolation:isolate;transform:rotate(-1.4deg)}
.fx-tape span::before{content:"";position:absolute;inset:0;z-index:-1;background:#ECE9E2;-webkit-mask:TAPE 0 0/100% 100% no-repeat}
.fx-carbon{background:var(--bg-2)}
.fx-carbon::after{content:"";position:absolute;right:0;top:0;bottom:0;width:70%;background:repeating-linear-gradient(-60deg,rgba(255,255,255,.05) 0 8px,transparent 8px 16px);-webkit-mask:linear-gradient(90deg,transparent,#000)}
.fx-dots::after{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(255,255,255,.09) 1.1px,transparent 1.5px) 0 0/9px 9px;-webkit-mask:linear-gradient(225deg,#000 0,transparent 75%)}
.fx-dots i{position:absolute;left:28px;bottom:26px;width:150px;height:90px;border-radius:14px;background:var(--red)}
.fx-dots i::after{content:"";position:absolute;inset:0;border-radius:14px;background:radial-gradient(circle,rgba(10,10,11,.2) 1.1px,transparent 1.5px) 0 0/8px 8px}
.fx-grain{background:#141416}
.fx-grain::after{content:"";position:absolute;inset:0;background:url(img/fx/grain.svg) 0 0/240px 240px;opacity:.35}
.fx-grain em{position:absolute;right:20px;bottom:16px;font-style:normal;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.12em;color:var(--ink-3)}

/* icônes */
.ic{grid-template-columns:minmax(0,1.9fr) minmax(0,1fr)}
.ic .card{padding:30px 32px}
.igrid{display:grid;grid-template-columns:repeat(9,1fr);gap:8px}
.igrid figure{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 4px 12px;border-radius:12px;background:var(--bg-3)}
.igrid svg.pi{width:34px;height:34px;overflow:visible}
.igrid figcaption{font-family:var(--cond);font-weight:700;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.isz{display:flex;align-items:flex-end;gap:26px;margin:10px 0 24px}
.isz figure{display:flex;flex-direction:column;align-items:center;gap:10px}
.isz figcaption{font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.1em;color:var(--ink-3);text-align:center}
.isz svg.pi{overflow:visible}

/* voix */
.vo{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}
.vo .card{padding:30px 34px}
.vrow{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 0;border-top:1px solid var(--line)}
.vrow:first-of-type{border-top:0}
.vrow div{font-size:15px;line-height:1.45}
.vrow .y{color:var(--ink)}
.vrow .n{color:var(--ink-3);text-decoration:line-through;text-decoration-color:rgba(255,59,48,.7);text-decoration-thickness:2px}
.vhead{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:4px}
.tag{font-family:var(--cond);font-weight:900;font-style:italic;font-size:44px;line-height:.9;text-transform:uppercase;margin:18px 0 18px}

/* appliqué */
.ap{grid-template-columns:1.5fr 1fr 1fr}
.ap figure{display:flex;flex-direction:column;gap:12px}
.ap img{display:block;width:100%;height:560px;object-fit:cover;object-position:top left;border-radius:16px;border:1px solid var(--line-2)}
.ap figcaption{font-size:13.5px;color:var(--ink-2)}
.ap figcaption b{color:var(--ink);font-weight:600}

/* fichiers */
.fi{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}
.fi .card{padding:30px 34px}
.tree{font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.75;color:var(--ink-2);white-space:pre}
.tree b{color:var(--ink);font-weight:600}
.tree em{font-style:normal;color:var(--ink-3)}
.map div{display:grid;grid-template-columns:1fr 24px 1fr;gap:10px;align-items:center;padding:12px 0;border-top:1px solid var(--line);font-size:13.5px}
.map div:first-child{border-top:0}
.map code{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;color:var(--ink)}
.map i{color:var(--red);font-style:normal;text-align:center}
.foot{display:flex;align-items:center;justify-content:space-between;padding:34px 72px 40px;border-top:1px solid var(--line)}
.foot img{height:40px}
.foot span{font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px;text-transform:uppercase}
'''.replace('TAPE', TAPE).replace('TORN', TORN)


def head(n, name, intro):
    return (f'<div class="ch-h"><div><span class="kick">{n} <b>//</b> 10</span><h2>{name}</h2></div>'
            f'<p>{intro}</p></div>')


def sicon(name, size=24):
    return SO.icon(name, size)


def aicon(name):
    return PA.picon(name, True)


def cover():
    return f'''<section class="cov"><span class="s-dots"></span>
<div class="top"><img src="{L}rago-wordmark-white.svg" alt="Rago Optimizer"><span>charte de marque · v5 · 22 novembre 2026</span></div>
<span class="kick">rago optimizer <b>//</b> match day</span>
<h1 data-t="chaque&#10;milliseconde&#10;compte."><span>chaque</span><span>milliseconde</span><span><span class="br">compte.</span></span></h1>
<p class="lead">Un outil de précision pour les joueurs compétitifs, habillé comme une affiche de jour de match : <b>fond noir, un seul rouge, capitales condensées en italique, coupes qui penchent.</b> L'interface reste calme et lisible ; l'affiche ne se montre qu'une fois par page.</p>
<img class="bigr" src="{L}rago-mark.svg" alt="">
<div class="meta"><span><b>Remplace</b> la charte v1.2 du 7 octobre (Geist, pilules, verre)</span><span><b>Couvre</b> l'app Windows, le site, le compte, l'admin, les e-mails, l'installeur</span><span><b>Fichiers</b> rendus-v5/marque/</span></div>
</section>'''


def principles():
    items = [
        ('apply', 'un seul rouge.', 'Le rouge #FF3B30 veut dire action ou appliqué. Tout le reste est noir, gris et blanc, sans deuxième couleur d’accent.'),
        ('display', 'fort une fois, calme partout.', 'Par page : un titre avec son coup de pinceau, un bloc signature, un ruban par section. Tuiles, listes et boutons restent à plat.'),
        ('latency', 'la coupe penche, le texte reste droit.', 'Les fonds des boutons, onglets, options et interrupteurs penchent de -12°. Leurs libellés restent droits.'),
        ('analysis', 'mesuré, pas promis.', 'Les chiffres viennent du PC ou du réseau du joueur : 18 ms, 12 sur 30, 0,3 ms. Jamais «&nbsp;+300&nbsp;% de&nbsp;FPS&nbsp;».'),
        ('settings', 'la tuile est l’interrupteur.', 'Un réglage se choisit en cliquant sa tuile entière. Les changements attendent dans la barre Apply avant d’être appliqués.'),
    ]
    cards = ''.join(f'<div class="card">{sicon(i, 38)}<h3>{t}</h3><p>{p}</p></div>' for i, t, p in items)
    return f'<section class="ch">{head("01", "principes", "Cinq règles décident de tout le reste. Quand un écran hésite, on revient ici.")}<div class="g pr">{cards}</div></section>'


def logo():
    r = f'''<div class="g lg1">
<div class="card lg-r"><span class="s-dots"></span><div class="art"><img src="{L}rago-app-icon.svg" alt=""></div>
<div><p class="cap">rouge sur blanc <em>//</em> l'icône</p><div class="anno">
<div><i style="background:#FF3B30"></i><p><b>R rouge #FF3B30</b><span>Le R de Sofiene, vectorisé en octobre, inchangé. Toujours plein, toujours rouge.</span></p></div>
<div><i style="background:#FFFFFF"></i><p><b>Tuile blanche #FFFFFF</b><span>L'icône de l'app : .exe, barre des tâches, installeur, favicon, avatar, barre du site.</span></p></div>
<div><i style="background:#1A1A1E"></i><p><b>Deux couleurs, pas trois</b><span>Plus de face papier, de couche rouge décalée ni de bords rugueux.</span></p></div>
</div></div></div>
<div class="card lg-f"><p class="cap">r rouge <em>//</em> partout ailleurs</p><div class="row">
<img src="{L}rago-mark.svg" style="height:170px" alt=""><img src="{L}rago-lockup-app.svg" style="height:64px" alt=""></div>
<p class="note">Sans tuile, le R se pose seul sur le noir, en rouge : barre de l'app, démarrage, installeur, bannières. <b>Le R n'est jamais blanc</b>, ni gris, ni papier.</p></div>
</div>'''
    sz = ''.join(f'<figure><img src="../marque/logo/png/rago-icon-{s}.png" width="{s}" height="{s}" alt=""><figcaption>{s}</figcaption></figure>' for s in (256, 128, 64, 48, 32, 24, 16))
    sizes = f'''<div class="card sizes" style="margin-top:18px"><p class="cap">icône de l'app <em>//</em> taille réelle</p><div class="row">{sz}</div>
<p class="note">Tuile blanche, R rouge. C'est l'icône du .exe, de la barre des tâches, de l'installeur, du favicon et de l'avatar. <b>Deux couleurs à toutes les tailles.</b> Sous 48 px, le R prend un peu plus de place dans la tuile pour rester lisible à 16 px.</p></div>'''
    lk = f'''<div class="g lk" style="margin-top:18px">
<div class="card"><p class="cap">lockups <em>//</em> sur fond sombre</p>
<div class="item"><img src="{L}rago-lockup-app.svg" style="height:46px" alt=""><span>Dans l'app : le R rouge sert de première lettre</span></div>
<div class="item"><img src="{L}rago-lockup.svg" style="height:52px" alt=""><span>Site et compte : barre du haut, pied de page</span></div>
<div class="item"><img src="{L}rago-wordmark-white.svg" style="height:52px" alt=""><span>Nom complet : e-mails, installeur, images de partage</span></div></div>
<div class="card paper"><p class="cap">lockups <em>//</em> sur fond clair</p>
<div class="item"><img src="{L}rago-lockup-ink.svg" style="height:52px" alt=""><span>Tuile blanche, texte encre #0A0A0B</span></div>
<div class="item"><img src="{L}rago-wordmark-ink.svg" style="height:52px" alt=""><span>Nom complet, texte encre</span></div>
<div class="item"><img src="{L}rago-lockup-app-ink.svg" style="height:46px" alt=""><span>R rouge, AGO en encre</span></div></div>
</div>'''
    use = f'''<div class="g use" style="margin-top:18px">
<div class="card"><p class="cap">navigateur</p><div class="stage" style="background:#1B1B1F"><div class="tab"><img src="{L}web/favicon.svg" alt="">Rago Optimizer<em>×</em></div></div><p class="note">favicon.svg, .ico 16 / 32 / 48</p></div>
<div class="card"><p class="cap">windows</p><div class="stage" style="background:linear-gradient(160deg,#1c2a44,#0e1424)"><div class="tbar"><i></i><i></i><span class="on"><img src="../marque/logo/png/rago-icon-32.png" alt=""></span><i></i><i></i></div></div><p class="note">rago.ico, 9 tailles de 16 à 256</p></div>
<div class="card"><p class="cap">discord</p><div class="stage" style="background:#313338"><div class="dc"><img src="../marque/logo/png/rago-tile-512.png" alt=""><div><b>Rago<em>APP</em></b><p>Welcome @kenzo, you're member #1,204.</p></div></div></div><p class="note">Avatar plein cadre, rogné en rond</p></div>
<div class="card"><p class="cap">iphone</p><div class="stage" style="background:linear-gradient(180deg,#3a2a52,#1a1530)"><div class="ios"><img src="{L}web/apple-touch-icon.png" alt=""><span>Rago</span></div></div><p class="note">apple-touch-icon, 180</p></div>
</div>'''
    dont = ''.join(f'<figure><div class="st">{img}</div><figcaption><b>{t}</b>{d}</figcaption></figure>' for t, d, img in [
        ('r blanc', 'Le R est toujours rouge.', '<svg width="70" height="77" viewBox="0 0 164 180"><path d="M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z" fill="#FFFFFF"/></svg>'),
        ('trois couleurs', 'Pas de papier ni de couche décalée.', '<svg width="76" height="84" viewBox="0 0 173 191"><path transform="translate(9 11)" fill="#FF3B30" d="M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z"/><path fill="#ECE9E2" d="M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z"/></svg>'),
        ('pivoter', 'Le R reste droit.', f'<img src="{L}rago-mark.svg" style="transform:rotate(18deg)" alt="">'),
        ('dégradé, néon', 'Toujours plein, sans lueur.', '<svg width="70" height="77" viewBox="0 0 164 180" style="filter:drop-shadow(0 0 10px #FF3B30) drop-shadow(0 0 22px #ff00aa)"><defs><linearGradient id="dg" x1="0" x2="1"><stop offset="0" stop-color="#FF3B30"/><stop offset="1" stop-color="#FF9F0A"/></linearGradient></defs><path d="M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z" fill="url(#dg)"/></svg>'),
    ])
    rules = f'''<div class="g rules" style="margin-top:18px">
<div class="card"><p class="cap">zone de protection</p><div class="clear"><i class="t">½ R</i><i class="l">½</i><img src="{L}rago-lockup.svg" alt=""></div>
<p class="note">Autour du logo, un vide égal à la moitié de la hauteur du R. Rien ne s'y pose, pas même une trame.</p></div>
<div class="card"><p class="cap">tailles minimales</p><div class="mins">
<div><span><img src="../marque/logo/png/rago-icon-16.png" width="16" height="16" alt=""></span><p><b>Icône 16 px</b><span>en dessous, rien</span></p></div>
<div><span><img src="{L}rago-lockup-app.svg" style="height:18px" alt=""></span><p><b>R + AGO, 18 px</b><span>hauteur des capitales</span></p></div>
<div><span><img src="{L}rago-wordmark-white.svg" style="height:24px" alt=""></span><p><b>Nom complet, 24 px</b><span>hauteur de la tuile</span></p></div></div></div>
<div class="card"><p class="cap">à ne pas faire</p><div class="dont">{dont}</div></div>
</div>'''
    return (f'<section class="ch">{head("02", "le logo", "Le R de Rago est <b>rouge et plein</b>, partout. Sur l’icône de l’app, il est posé sur une <b>tuile blanche</b>. Pas de texture ni de couche décalée. Les textes des lockups sont vectorisés : les fichiers s’affichent sans la police.")}'
            f'{r}{sizes}{lk}{use}{rules}</section>')


def colors():
    big = [('#0A0A0B', 'bg', '#0A0A0B', 'Le fond de tout : fenêtre, pages, e-mails. Jamais une page claire.', '#F5F5F6'),
           ('#FF3B30', 'red', '#FF3B30', 'Le seul accent : action principale, appliqué, onglet actif, bloc signature.', '#0A0A0B'),
           ('#ECE9E2', 'paper', '#ECE9E2', 'Face des icônes imprimées, ruban des titres de section.', '#0A0A0B'),
           ('#F5F5F6', 'ink', '#F5F5F6', 'Titres, chiffres, valeurs, libellés actifs. 18:1 sur le fond.', '#0A0A0B')]
    b = ''.join(f'<div class="swc"><div class="c" style="background:{c}{";box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)" if n == "bg" else ""}"><em style="color:{fg}">{"Aa" if n != "red" else "apply"}</em></div><div class="t"><b>{n}<code>{h}</code></b><p>{p}</p></div></div>' for c, n, h, p, fg in big)
    small = [('#111113', 'bg-2', 'Panneaux, cartes, barre latérale'), ('#17171A', 'bg-3', 'Surface levée, bouton par défaut'), ('#1F1F23', 'bg-4', 'Piste d’interrupteur, survol'),
             ('#A1A1AA', 'ink-2', 'Texte secondaire, icônes au trait'), ('#6E6E78', 'ink-3', 'Petits libellés à côté d’une valeur'), ('#C9221A', 'red-deep', 'Bouton rouge pressé'),
             ('rgba(255,255,255,.07)', 'line', 'Bordure 1 px par défaut'), ('rgba(255,255,255,.13)', 'line-2', 'Bordure des boutons, option en cours'), ('#3DDC97', 'ok', 'Direct et gains mesurés, toujours avec un mot'),
             ('#FFC53D', 'warn', 'Admin seulement : à surveiller'), ('#4A4A52', 'pop-muted', 'Texte discret dans une bulle claire'), ('#070708', 'bg-0', 'Fond du cerveau (admin)')]
    s = ''.join(f'<div class="swc"><div class="c" style="background:{c};box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)"></div><div class="t"><b>{n}<code>{c if c.startswith("#") else c.replace("rgba(255,255,255,", "blanc ").rstrip(")")}</code></b><p>{p}</p></div></div>' for c, n, p in small)
    rules = '''<div class="g co3"><div class="card"><p class="cap">texte sur le rouge</p><div class="pair">
<figure class="ok"><div class="bx" style="background:#FF3B30;color:#0A0A0B">apply 18 tweaks</div><figcaption><b>Oui</b>, encre #0A0A0B : 5,6:1</figcaption></figure>
<figure class="no"><div class="bx" style="background:#FF3B30;color:#fff">apply 18 tweaks</div><figcaption><b>Non</b>, blanc : 3,3:1</figcaption></figure>
<figure class="ok"><div class="bx" style="background:#C9221A;color:#fff">applying…</div><figcaption><b>Oui</b>, blanc sur rouge profond : 5,2:1</figcaption></figure></div></div>
<div class="card"><p class="cap">ce qui a changé depuis la v1.2</p><p class="note">Le rouge, l'encre sur le rouge et l'échelle des noirs ne bougent pas. <b>Disparaissent :</b> le dégradé rouge, le jaune d'alerte #FFD60A et le bleu d'info #5AB8FF (l'admin garde un jaune doux, #FFC53D). <b>Arrive :</b> le papier #ECE9E2, pour les icônes et les rubans. Le relief vient des paliers de fond, pas des ombres. Un état ne se dit jamais par la couleur seule : hachures pour « en attente », interrupteur plein pour « appliqué », le mot « live » à côté du point vert.</p></div></div>'''
    return (f'<section class="ch">{head("03", "couleurs", "Du noir, un rouge, du papier. <b>Quatre paliers de fond</b> font le relief, trois encres font la hiérarchie du texte.")}'
            f'<div class="g co">{b}</div><div class="g co2">{s}</div>{rules}</section>')


def typo():
    scale = [('title', 'd', 64, '150 · .8', 'Network'), ('num-hero', 'd', 64, '118 · .74', '18<small style="font-size:22px;color:var(--ink-2);text-transform:none"> ms</small>'),
             ('metric', 'd', 52, '64 · .78', 'great'), ('card-title', 'd', 32, '32 · .85', 'competitive'), ('h2', 'd', 30, '30 · 1', 'ping test'),
             ('nav', 'd', 18, '18 · 1', 'dashboard'), ('btn', 'u', 15, '15 · .06em', 'apply 18 tweaks'), ('tab', 'u', 14, '14 · .06em', 'all tweaks'),
             ('kick', 'u', 13, '13 · .2em', 'network <b style="color:var(--red)">//</b> test'), ('label', 'u', 11.5, '11.5 · .16em', 'avg ping')]
    rows = ''.join(f'<div><code>{n}</code><span class="{c}" style="font-size:{s}px{";letter-spacing:.06em" if c == "u" else ""}{";letter-spacing:.2em;color:var(--ink-2)" if n == "kick" else ""}{";letter-spacing:.16em;color:var(--ink-3)" if n == "label" else ""}">{t}</span><em>{m}</em></div>' for n, c, s, m, t in scale)
    return f'''<section class="ch">{head("04", "typographie", "Deux familles Google, rien à installer : <b>Barlow Condensed</b> pour crier et mesurer, <b>Barlow</b> pour expliquer.")}
<div class="g ty"><div class="card"><p class="cap">barlow condensed 900 italique <em>//</em> titres et chiffres</p>
<div class="spec" data-t="network">netw<span>o</span>rk</div>
<div class="bod"><p style="font-size:22px;line-height:1.35;color:var(--ink)">Minecraft goes through Rago Route. Your packets arrive in order, even when your Wi-Fi drops one.</p><p style="margin-top:12px;font-size:14px;line-height:1.35;color:var(--ink-2)">Barlow 400, 14 px. One sentence per idea, sentence case, the number before the promise: 18 ms on your network, measured after the test.</p></div>
<div class="fam"><div><b>Barlow Condensed</b><span>700 à 900. Italique pour l'affichage, droit pour les boutons, onglets et libellés.</span></div>
<div><b>Barlow</b><span>400 à 700, jamais en italique. Les phrases : 14 px, interligne 1,35.</span></div>
<div><b>Repli e-mail</b><span>Arial Narrow puis Arial, toujours en gras italique capitales.</span></div></div></div>
<div class="card"><p class="cap">échelle <em>//</em> taille · interligne</p><div class="scale">{rows}</div></div></div>
<div class="g ty2"><div class="card"><p class="cap">capitales</p><ul><li>Les titres, libellés, boutons et onglets passent <b>en capitales par le CSS</b>. Dans le code, on les écrit en minuscules.</li><li>Les phrases restent en casse normale : « Minecraft goes through Rago Route. »</li></ul></div>
<div class="card"><p class="cap">chiffres</p><ul><li>Serrés : interligne de .74 à .78.</li><li>L'unité à un tiers de la taille, en ink-2, collée au chiffre : <b>18 ms</b>.</li><li>Fini la police mono : les chiffres sont en condensé.</li></ul></div>
<div class="card"><p class="cap">jamais</p><ul><li>Une phrase en condensé.</li><li>Un libellé en Barlow.</li><li>Barlow en italique.</li><li>Plus de deux tailles de titre sur un écran.</li></ul></div></div>
</section>'''


def shapes():
    rad = [('seg', 2.5, 28), ('xs', 5, 32), ('chip', 8, 36), ('btn-sm', 9, 38), ('tab', 10, 40), ('option', 11, 42), ('btn', 12, 44), ('tile', 14, 48), ('btn-lg', 16, 52), ('card', 18, 56), ('bar', 20, 60), ('panel', 22, 64)]
    r = ''.join(f'<figure><i style="width:{s}px;height:{s}px;border-radius:{v}px"></i><figcaption><b>{v}</b>{n}</figcaption></figure>' for n, v, s in rad)
    return f'''<section class="ch">{head("05", "formes", "Une coupe à <b>-12°</b> partout où l’on agit, des coins arrondis qui grandissent avec l’élément. Les panneaux, cartes et tuiles restent droits.")}
<div class="g fo"><div class="card"><p class="cap">le biais</p><div class="skew"><span class="blk"></span><span class="ax"></span><span class="ang">-12°</span>
<p class="sk-t">Fond des boutons, onglets, options, interrupteurs, segments, bloc signature et coche des presets. Le texte posé dessus reste droit.</p></div></div>
<div class="card"><p class="cap">composants <em>//</em> taille réelle</p><div class="cmp">
<span>boutons</span><div class="r"><a class="btn red lg">apply 18 tweaks</a><a class="btn">test again</a><a class="btn sm" style="height:32px;padding:0 16px;font-size:13.5px">undo</a></div>
<span>onglets</span><div class="r"><div class="tabs"><span class="on">all tweaks <em>48</em></span><span>applied <em>21</em></span><span>premium <em>27</em></span></div></div>
<span>interrupteurs</span><div class="r"><i class="sw on"></i><i class="sw"></i><span class="chip red">safe</span><span class="chip">advanced</span><span class="chip ghost"><i class="dot" style="color:var(--ok)"></i>live</span></div>
<span>segments</span><div class="r" style="width:260px"><div class="seg" style="width:100%"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="m"></i><i></i><i></i><i></i><i></i></div></div>
</div><div class="rad">{r}</div></div></div></section>'''


def effects():
    fx = [('fx-brush', '<span>network</span>', 'coup de pinceau', 'Sous le titre de page, incliné de -2,5°. <em>Une fois par page.</em>'),
          ('fx-torn', '', 'bord déchiré', 'Bord gauche du bloc signature, images des jeux et duels. <em>Une fois par page.</em>'),
          ('fx-tape', '<span>ping test</span>', 'ruban papier', 'Derrière les titres de section, en papier, texte encre. <em>Un par section.</em>'),
          ('fx-carbon', '', 'rayures carbone', 'Côté droit des héros, cartes de profil, barre Apply. <em>Quelques surfaces, pas toutes.</em>'),
          ('fx-dots', '<i></i>', 'trame de points', 'Coin haut droit de la fenêtre ; sur les blocs rouges, en noir. <em>Toujours, en fond.</em>'),
          ('fx-grain', '<em>opacité 6 %, ici forcée à 35 %</em>', 'grain', 'Sur toute la fenêtre, à peine visible. <em>Toujours.</em>')]
    cards = ''.join(f'<div class="card"><div class="st {c}">{inner}</div><div class="t"><b>{t}</b><p>{p}</p></div></div>' for c, inner, t, p in fx)
    return (f'<section class="ch">{head("06", "effets d’affiche", "L’affiche se montre avec mesure. <b>La barre Apply, les bulles, les tuiles, les champs et les boutons ne sont jamais déchirés, brossés ni rubanés.</b>")}'
            f'<div class="g fx">{cards}</div></section>')


def icons():
    names = [(n, 'app', sicon(n, 34)) for n in SO.SOLID] + [(n, 'admin', aicon(n)) for n in ('users', 'gift', 'globe', 'pulse', 'brain', 'card', 'chat', 'download', 'pc', 'star')]
    grid = ''.join(f'<figure>{svg}<figcaption>{n}</figcaption></figure>' for n, _, svg in names[:27])
    sizes = ''.join(f'<figure>{sicon("network", s)}<figcaption>{s} px<br>{u}</figcaption></figure>' for s, u in ((16, 'admin, boutons'), (21, 'menu'), (34, 'cartes'), (56, 'état vide'), (96, 'grand')))
    return f'''<section class="ch">{head("07", "icônes imprimées", "Les icônes de Rago : <b>formes pleines en papier, penchées de -12°, avec une couche rouge décalée derrière</b> et des bords rugueux. Le logo, lui, reste à deux couleurs.")}
<div class="g ic"><div class="card"><p class="cap">le jeu <em>//</em> app et admin</p><div class="igrid">{grid}</div></div>
<div class="card"><p class="cap">tailles</p><div class="isz">{sizes}</div>
<p class="note">Elles servent au menu, aux cartes, aux états vides et à toute l'admin. <b>Restent au trait</b> (2 px, bouts ronds) : les flèches, les chevrons et la croix de fermeture, à l'intérieur des boutons et des champs. Sur le rouge, la face passe en encre et la couche en rouge profond.</p>
<p class="note" style="margin-top:12px">Pas de flammes, pas de fusées. Les logos de Windows, Steam ou Riot ne sont pas des icônes : on les nomme dans une puce.</p></div></div></section>'''


def voice():
    rows = [('Apply 18 free tweaks', 'Boost your PC now!!!'), ('Drops for a few seconds.', 'Might cause some issues.'),
            ('18 ms → 11 ms on your network', '+300% FPS guaranteed'), ('Restart needed for 2.', 'A restart may be required.'),
            ('Results go to Rago with your city and provider, never your IP.', 'We value your privacy.')]
    r = ''.join(f'<div class="vrow"><div class="y">{a}</div><div class="n">{b}</div></div>' for a, b in rows)
    return f'''<section class="ch">{head("08", "voix", "L’app, le site, le compte et les e-mails sont <b>en anglais américain</b>. L’admin est en français. On parle à un joueur, on mesure, on ne promet rien.")}
<div class="g vo"><div class="card"><div class="vhead"><p class="cap"><em>on écrit</em></p><p class="cap">on n'écrit pas</p></div>{r}</div>
<div class="card"><p class="cap">signature</p><p class="tag">every millisecond counts.</p><ul class="note" style="list-style:none;display:grid;gap:8px">
<li><b>« You »</b> et les contractions, des verbes simples.</li><li>Un bouton dit ce qui se passe : <b>apply</b>, puis <b>applied</b>.</li><li>Les conséquences avant le clic.</li><li>Mots du produit : tweak, apply, restore, safe, advanced, expert, free, premium, lifetime.</li><li>Ni emoji, ni point d'exclamation, ni « insane ».</li></ul></div></div></section>'''


def applied():
    shots = [('../app-dashboard-icones-tout-rouge.jpg', 'App Windows', 'tableau de bord'), ('../site/site-accueil-1.jpg', 'Site', 'accueil'), ('../compte/compte-tableau-premium.jpg', 'Compte', 'tableau Premium')]
    f = ''.join(f'<figure><img src="{s}" alt=""><figcaption><b>{a}</b>, {b}</figcaption></figure>' for s, a, b in shots)
    return f'<section class="ch">{head("09", "appliqué", "Les mêmes règles partout : <b>une seule famille d’écrans</b>, de l’app à l’e-mail de paiement.")}<div class="g ap">{f}</div></section>'


def files():
    tree = '''<b>rendus-v5/marque/</b>
├─ <b>logo/</b>
│  ├─ rago-mark.svg                        <em>R rouge</em>
│  ├─ rago-app-icon.svg · -32              <em>tuile blanche 256</em>
│  ├─ rago-favicon.svg                     <em>16 px</em>
│  ├─ rago-app-tile.svg                    <em>plein cadre</em>
│  ├─ rago-lockup-app.svg · -ink           <em>R + AGO</em>
│  ├─ rago-lockup.svg · -ink               <em>tuile + RAGO</em>
│  ├─ rago-wordmark-white.svg · -ink
│  ├─ rago.ico                             <em>16 → 256</em>
│  ├─ png/   <em>icônes 16 → 1024, avatar 512, lockups 1200</em>
│  ├─ web/   <em>favicon .ico .svg 32, apple-touch, og ×3</em>
│  ├─ installer/  <em>.ico, .bmp, PNG de Tauri</em>
│  └─ abandonnes/ <em>R blanc, R imprimé, tuile rouge</em>
├─ <b>tokens/</b>  tokens.css · tokens.json
└─ charte-1…5.jpg'''
    mp = [('marque/logo/*', 'brand/logo/'), ('marque/tokens/*', 'brand/tokens/'), ('tokens.css (bloc v1.2)', 'app/src/styles/tokens.css'), ('tokens.css', 'licensing/public/tokens.css'), ('logo/installer/*', 'app/src-tauri/icons, installer/'), ('logo/web/*', 'site/')]
    m = ''.join(f'<div><code>{a}</code><i>→</i><code>{b}</code></div>' for a, b in mp)
    return f'''<section class="ch">{head("10", "fichiers", "Les noms reprennent ceux du dossier <b>brand/</b> du dépôt : chaque fichier remplace l’ancien un pour un. Rien n’est copié dans le dépôt sans ta demande.")}
<div class="g fi"><div class="card"><p class="cap">le dossier</p><div class="tree">{tree}</div></div>
<div class="card"><p class="cap">où ça va dans le dépôt</p><div class="map">{m}</div>
<p class="note" style="margin-top:18px">tokens.css garde un bloc de correspondance : les anciens noms (<code>--rg-text-1</code>, <code>--rg-ink-2</code>…) pointent vers les nouveaux, pour que l'app et le serveur passent en v5 sans tout renommer d'un coup.</p></div></div></section>'''


def body():
    foot = f'<div class="foot"><img src="{L}rago-lockup.svg" alt=""><span>every millisecond counts.</span></div>'
    return SO.defs() + cover() + principles() + logo() + colors() + typo() + shapes() + effects() + icons() + voice() + applied() + files() + foot


if __name__ == '__main__':
    (OUT / 'marque-charte.html').write_text(page('Charte Rago v5', body(), CSS))
    print('ok')
