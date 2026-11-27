# Lot 5 : espace compte (account.rago-optimizer.com). Textes repris de licensing/src/views.js et app.js (22/11/2026).
# Valeurs de maquette : 73 tweaks gratuits / 218, essai 3 jours, $5.99/mois, $29.99/an, Rago Route $3/mois ou $17.99/an,
# affiliation 3 joueurs = 6 mois, 5 % de remise. Comptes, e-mails, clés et codes = exemples.
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_site as G
from gen_route import page

OUT = G.OUT
EMAIL = 'alex@example.com'

CSS = r'''
.win.site{min-height:900px;display:flex;flex-direction:column}
.win.site > main{flex:1}
.ac-top .s-logo .sub{margin-left:4px;padding-left:12px;border-left:1px solid var(--line-2);font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.ac-top nav{margin-left:30px}
.ac-me{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink-2)}
.ac-av{flex:none;width:32px;height:32px;display:grid;place-items:center;background:var(--red);color:var(--red-ink);font-family:var(--cond);font-weight:900;font-style:italic;font-size:18px;line-height:1}
html.round .ac-av{border-radius:50%}
.ac-av.md{width:40px;height:40px;font-size:22px}
.ac-av.lg{width:104px;height:104px;font-size:56px}
.ac-foot{display:flex;align-items:center;justify-content:space-between;gap:30px;padding:24px 48px;border-top:1px solid var(--line);font-size:13px;color:var(--ink-3)}
.ac-foot nav{display:flex;gap:18px}
.ac-foot nav a{color:var(--ink-2)}
.ac-foot p{max-width:620px;text-align:right;line-height:1.5}

/* deux colonnes : récit à gauche, formulaire à droite */
.ac-split{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 500px;gap:96px;align-items:center;padding:70px 120px 84px}
.ac-split.solo{grid-template-columns:minmax(0,1fr)}
.ac-split > .s-dots{left:0;top:0;width:760px;height:560px;-webkit-mask:linear-gradient(140deg,#000 0,transparent 62%)}
.ac-aside{position:relative}
.ac-d{margin-top:20px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:100px;line-height:.84;text-transform:uppercase;letter-spacing:-.01em}
.ac-d.long{font-size:78px}
.ac-d .br{position:relative;display:inline-block;isolation:isolate}
.ac-d .br::after{content:"";position:absolute;z-index:-1;left:-22px;right:-48px;top:30%;height:74%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.ac-lede{margin-top:26px;max-width:560px;font-size:18px;line-height:1.55;color:var(--ink-2)}
.ac-lede strong{color:var(--ink);font-weight:600}
.ac-steps{display:flex;gap:6px;margin-top:44px}
.ac-steps li{white-space:nowrap;position:relative;display:flex;align-items:center;gap:10px;height:44px;padding:0 20px 0 9px;isolation:isolate;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.ac-steps li::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bg-2);border:1px solid var(--line);transform:skewX(var(--skew))}
.ac-steps li i{width:27px;height:27px;display:grid;place-items:center;background:var(--bg-4);font-weight:900;font-size:16px;color:var(--ink-2);transform:skewX(var(--skew))}
.ac-steps li i svg{width:15px;height:15px;stroke-width:3;transform:skewX(12deg)}
.ac-steps li.done{color:var(--ink-2)}
.ac-steps li.done i{background:var(--ink);color:var(--bg)}
.ac-steps li.now{color:var(--red-ink)}
.ac-steps li.now::before{background:var(--red);border-color:var(--red)}
.ac-steps li.now i{background:var(--red-ink);color:var(--red)}
.ac-steps.sm{margin-top:0}
.ac-steps.sm li{height:38px;font-size:13.5px;padding-right:16px}
.ac-steps.sm li i{width:23px;height:23px;font-size:14px}

.ac-panel{padding:36px 36px 30px}
.ac-panel h2{font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;line-height:.9;text-transform:uppercase}
.ac-panel > p.mut{margin-top:14px;font-size:15px;line-height:1.55;color:var(--ink-2)}
.ac-panel > p.mut strong{color:var(--ink)}
.ac-oa{display:grid;gap:10px;margin-top:24px}
.ac-oa span{display:flex;align-items:center;justify-content:center;gap:12px;height:50px;background:var(--bg-3);border:1px solid var(--line-2);font-size:15.5px;font-weight:600;color:var(--ink)}
html.round .ac-oa span{border-radius:12px}
.ac-oa svg{width:20px;height:20px}
.ac-or{display:flex;align-items:center;gap:14px;margin:22px 0 2px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.ac-or::before,.ac-or::after{content:"";flex:1;height:1px;background:var(--line-2)}
.ac-f{margin-top:20px}
.ac-f label{display:block;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
.ac-f .bx{display:flex;align-items:center;margin-top:8px;height:52px;padding:0 8px 0 16px;background:var(--bg);border:1px solid var(--line-2);font-size:16px;color:var(--ink)}
html.round .ac-f .bx{border-radius:12px}
.ac-f .bx .ph{color:var(--ink-3)}
.ac-f .bx .eye{margin-left:auto;height:36px;padding:0 13px;display:grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2);background:var(--bg-3)}
html.round .ac-f .bx .eye{border-radius:8px}
.ac-f .bx .caret{width:2px;height:22px;margin-left:2px;background:var(--red)}
.ac-f.focus .bx{border-color:var(--red);box-shadow:0 0 0 3px rgba(255,59,48,.18)}
.ac-f .bx.code{font-family:var(--cond);font-weight:800;font-size:19px;letter-spacing:.2em}
.ac-f .hint{display:block;margin-top:8px;font-size:13px;line-height:1.45;color:var(--ink-3)}
.ac-go{width:100%;height:56px;margin-top:26px;font-size:19px}
.ac-go svg{width:17px;height:17px}
.ac-gh{width:100%;height:50px;margin-top:10px;font-size:16px}
.ac-sm{margin-top:18px;font-size:14px;line-height:1.55;color:var(--ink-3)}
.ac-sm a,.ac-lk{color:var(--ink);text-decoration:underline;text-decoration-color:var(--red);text-decoration-thickness:1.5px;text-underline-offset:3px}
.ac-al{display:flex;gap:10px;align-items:flex-start;margin-top:18px;padding:12px 14px;font-size:14px;line-height:1.45;border:1px solid}
html.round .ac-al{border-radius:12px}
.ac-al svg{flex:none;width:17px;height:17px;margin-top:1px}
.ac-al.err{background:rgba(255,59,48,.08);border-color:rgba(255,59,48,.35);color:#FFB4AE}
.ac-al.ok{background:rgba(61,220,151,.07);border-color:rgba(61,220,151,.3);color:#A6F0CF}
.ac-al a{color:inherit;text-decoration:underline}
.ac-otp{display:flex;gap:8px;margin-top:8px;align-items:center}
.ac-otp span{width:58px;height:70px;display:grid;place-items:center;background:var(--bg);border:1px solid var(--line-2);font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px}
html.round .ac-otp span{border-radius:12px}
.ac-otp span.cur{border-color:var(--red);box-shadow:0 0 0 3px rgba(255,59,48,.18)}
.ac-otp span.cur::after{content:"";width:2px;height:30px;background:var(--red)}
.ac-otp em{width:12px;height:3px;background:var(--ink-3)}
.ac-sep{height:1px;margin:28px 0 4px;background:var(--line)}
.ac-row2{display:flex;flex-wrap:wrap;gap:12px;margin-top:36px}
.ac-row2 .btn{height:52px;padding:0 26px;font-size:17px}
.ac-code{display:flex;gap:10px;margin-top:22px}
.ac-code span{width:86px;height:104px;display:grid;place-items:center;position:relative;isolation:isolate;font-family:var(--cond);font-weight:900;font-style:italic;font-size:76px;line-height:1}
.ac-code span::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bg-2);border:1px solid var(--line-2);transform:skewX(var(--skew))}
html.round .ac-code span::before{border-radius:14px}
.ac-big{position:absolute;right:70px;top:50%;transform:translateY(-50%);font-family:var(--cond);font-weight:900;font-style:italic;font-size:360px;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.06);white-space:nowrap;pointer-events:none}

/* tableau de bord */
.ac-dash{position:relative;padding:56px 120px 70px}
.ac-dash > .s-dots{right:0;top:0;width:700px;height:420px;-webkit-mask:linear-gradient(225deg,#000 0,transparent 65%)}
.ac-dh{position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:30px}
.ac-dh h1{margin-top:16px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:84px;line-height:.84;text-transform:uppercase;letter-spacing:-.01em}
.ac-hero{display:grid;grid-template-columns:minmax(0,1fr) 440px;margin-top:34px}
.ac-hero .m{padding:36px 40px 34px}
.ac-hero h2{margin-top:14px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:52px;line-height:.88;text-transform:uppercase}
.ac-hero .m > p{margin-top:14px;font-size:15.5px;line-height:1.55;color:var(--ink-2);max-width:620px}
.ac-hero .m > p strong{color:var(--ink)}
.ac-hero .m > p.fine{font-size:13.5px;color:var(--ink-3)}
.ac-hero .acts{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.ac-hero .acts .btn{height:54px;padding:0 28px;font-size:18px}
.ac-hero .acts .btn svg{width:17px;height:17px}
.ac-hero .tg{display:flex;align-items:center;gap:12px}
.ac-hero ol{display:grid;align-content:center;gap:16px;padding:32px 34px;background:var(--bg-3);border-left:1px solid var(--line)}
.ac-hero ol li{display:grid;grid-template-columns:36px 1fr;gap:14px;font-size:14.5px;line-height:1.5;color:var(--ink-2)}
.ac-hero ol li strong{color:var(--ink);font-weight:600}
.ac-hero ol li > b{width:32px;height:32px;display:grid;place-items:center;background:var(--bg-4);font-family:var(--cond);font-weight:900;font-style:italic;font-size:18px;color:var(--ink);transform:skewX(var(--skew))}
.ac-chip{display:inline-grid;place-items:center;height:24px;padding:0 9px;margin-left:8px;background:var(--bg-4);font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.06em;color:var(--ink-2);vertical-align:1px}
html.round .ac-chip{border-radius:7px}
.ac-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;align-items:start}
.ac-pn{padding:0}
.ac-r{padding:24px 28px 24px;border-top:1px solid var(--line)}
.ac-r:first-child{border-top:0}
.ac-rh{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ac-rh .s-eb{font-size:13px}
.ac-rh .n{font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.08em;color:var(--ink-3)}
.ac-r > p,.ac-pl p{font-size:14.5px;line-height:1.55;color:var(--ink-2)}
.ac-r > p{margin-top:12px}
.ac-r > p strong,.ac-pl p strong{color:var(--ink);font-weight:600}
.ac-r > p.note{font-size:13.5px;color:var(--ink-3)}
.ac-r .acts{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:16px}
.ac-r .acts .btn{height:40px;padding:0 18px;font-size:14.5px}
.ac-r .acts .btn svg{width:15px;height:15px}
.ac-la{display:inline-flex;align-items:center;gap:7px;font-family:var(--cond);font-weight:800;font-size:14.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--red)}
.ac-la svg{width:15px;height:15px}
.ac-b{display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 10px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
html.round .ac-b{border-radius:999px}
.ac-b::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.ac-b.ok{color:var(--ok);background:rgba(61,220,151,.1)}
.ac-b.wait{color:#F5A524;background:rgba(245,165,36,.1)}
.ac-b.off{color:var(--ink-3);background:var(--bg-4)}
.ac-b.red{color:var(--red);background:rgba(255,59,48,.12)}
.ac-key{display:flex;align-items:center;gap:8px;margin-top:14px;padding:8px 8px 8px 18px;background:var(--bg);border:1px solid var(--line-2)}
html.round .ac-key{border-radius:12px}
.ac-key code{flex:1;font-family:var(--cond);font-weight:800;font-size:20px;letter-spacing:.1em;color:var(--ink)}
.ac-key .btn{height:38px;padding:0 15px;font-size:14px}
.ac-key .btn svg{width:14px;height:14px}
.ac-meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
.ac-meta dt{font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.ac-meta dd{margin-top:4px;font-size:14.5px;color:var(--ink)}
.ac-pl{display:grid;grid-template-columns:48px 1fr;gap:16px;margin-top:14px;align-items:start}
.ac-pl > i,.ac-pl > span.ic{width:48px;height:48px;display:grid;place-items:center;background:rgba(255,59,48,.1);color:var(--red)}
html.round .ac-pl > span.ic{border-radius:14px}
.ac-pl > span.ic svg{width:22px;height:22px}
.ac-pl > span.ic svg.pi{width:30px;height:30px}
.ac-pl b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:23px;line-height:.95;text-transform:uppercase}
.ac-pl p{margin-top:6px}
.ac-rw{display:grid;gap:8px;margin-top:14px}
.ac-rw li{display:grid;grid-template-columns:78px 1fr;gap:12px;align-items:baseline;padding:10px 14px;background:var(--bg-3);font-size:14px;line-height:1.45;color:var(--ink-2)}
html.round .ac-rw li{border-radius:10px}
.ac-rw li b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;color:var(--ink);text-transform:uppercase}
.ac-rw li code{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.08em;color:var(--ink);background:var(--bg-4);padding:2px 7px}
.ac-aff{display:grid;grid-template-columns:96px 1fr;gap:20px;align-items:center;margin-top:14px}
.ac-ring{position:relative;width:96px;height:96px}
.ac-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ac-ring circle{fill:none;stroke-width:9}
.ac-ring .tr{stroke:var(--bg-4)}
.ac-ring .bar{stroke:var(--red)}
.ac-ring .pend{stroke:rgba(255,59,48,.35)}
.ac-ring span{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--cond);font-weight:900;font-style:italic;font-size:34px}
.ac-ring span small{font-size:17px;color:var(--ink-3)}
.ac-ring.lg{width:168px;height:168px}
.ac-ring.lg circle{stroke-width:8}
.ac-ring.lg span{font-size:64px}
.ac-ring.lg span small{font-size:28px}
.ac-aff .k{font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.ac-aff .c{margin-top:2px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;letter-spacing:.06em}
.ac-aff p{margin-top:4px;font-size:14px;color:var(--ink-2)}
.ac-stars{display:flex;gap:4px}
.ac-stars i{width:20px;height:20px;background:var(--red);clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
.ac-stars i.off{background:var(--bg-4)}
.ac-stars.lg i{width:44px;height:44px}
.ac-stars.lg{gap:8px}
.ac-r .rv{margin-top:12px;font-size:15px;line-height:1.55;color:var(--ink)}
.ac-rate{display:flex;gap:6px;margin-top:14px}
.ac-rate i{width:34px;height:34px;background:var(--bg-4);clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
.ac-df{margin-top:26px;font-size:14px;color:var(--ink-3)}
.ac-df a{color:var(--ink-2);text-decoration:underline;text-underline-offset:3px}

/* planches */
.bd{padding:56px 72px 80px}
.bd-h{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:22px;border-bottom:1px solid var(--line)}
.bd-h h1{margin-top:12px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:76px;line-height:.85;text-transform:uppercase}
.bd-h p{max-width:520px;font-size:15px;line-height:1.5;color:var(--ink-2);text-align:right}
.bd-g.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.bd-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:30px;align-items:start}
.bd-i > .cap{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
.bd-i > .cap em{font-style:normal;color:var(--red)}
.bd-i.w2{grid-column:span 2}
.bd-i.w3{grid-column:1 / -1}
.bd-i .s-card{padding:0}
.bd-i .ac-hero{margin-top:0}
.bd-i .ac-key code{font-size:15.5px;letter-spacing:.06em;white-space:nowrap}
.bd-i .ac-key .btn{padding:0 11px}

/* pages de message en vignettes */
.ms{position:relative;padding:28px 30px 24px;min-height:250px;display:flex;flex-direction:column}
.ms h3{margin-top:12px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;line-height:.88;text-transform:uppercase}
.ms p{margin-top:12px;font-size:14.5px;line-height:1.5;color:var(--ink-2)}
.ms .acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:20px}
.ms .acts .btn{height:36px;padding:0 14px;font-size:13.5px}
.ms .code{position:absolute;right:24px;top:24px}
.ms .ac-steps{margin-top:16px}

/* profil, avis */
.ac-pp{display:flex;align-items:center;gap:20px;margin-top:22px;padding:18px;background:var(--bg-3)}
html.round .ac-pp{border-radius:16px}
.ac-pp b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:28px;line-height:.9;text-transform:uppercase}
.ac-pp p{margin-top:6px;font-size:13.5px;line-height:1.45;color:var(--ink-2)}
.ac-drop{display:flex;align-items:center;gap:14px;margin-top:8px;padding:18px;border:1.5px dashed var(--line-2)}
html.round .ac-drop{border-radius:14px}
.ac-drop .btn{height:40px;font-size:14.5px}
.ac-drop span{font-size:14px;color:var(--ink-3)}
.ac-drop svg{width:22px;height:22px;color:var(--ink-3)}
.ac-ta{margin-top:8px;padding:14px 16px;min-height:150px;background:var(--bg);border:1px solid var(--line-2);font-size:15.5px;line-height:1.55;color:var(--ink)}
html.round .ac-ta{border-radius:12px}
.ac-ta .caret{display:inline-block;width:2px;height:19px;background:var(--red);vertical-align:-4px}
.ac-fr{display:flex;justify-content:space-between;align-items:baseline}
.ac-fr em{font-style:normal;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.06em;color:var(--ink-3)}
.ac-rt{display:flex;align-items:center;gap:16px;margin-top:10px}
.ac-rt b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;text-transform:uppercase;color:var(--red)}
.ac-nm{display:flex;align-items:center;gap:12px}
.ac-nm .bx{flex:1}
.ac-pv{margin-top:34px;max-width:470px;padding:26px 26px 22px;transform:rotate(-1.2deg)}
.ac-pv q{display:block;margin-top:14px;font-size:16px;line-height:1.55;color:var(--ink)}
.ac-pv q::before{content:"“"}.ac-pv q::after{content:"”"}
.ac-pv footer{display:flex;align-items:center;gap:12px;margin-top:18px}
.ac-pv footer b{font-family:var(--cond);font-weight:800;font-size:16px;letter-spacing:.04em;text-transform:uppercase}
.ac-pv footer small{margin-left:auto;font-size:12.5px;color:var(--ink-3)}
.ac-pvn{margin-top:14px;font-size:13px;color:var(--ink-3)}
.ac-rvb{margin-top:24px}
.ac-rvb .rv{margin-top:10px;font-size:14.5px;line-height:1.55}
.ac-rvb p{margin-top:8px;font-size:13.5px;color:var(--ink-3)}
.ac-rvb p a{color:var(--ink-2);text-decoration:underline}

/* affiliation */
.ac-how{display:grid;gap:12px;margin-top:40px;max-width:600px}
.ac-how li{display:grid;grid-template-columns:48px 1fr;gap:16px;align-items:start;padding:16px 18px;background:var(--bg-2);border:1px solid var(--line)}
html.round .ac-how li{border-radius:16px}
.ac-how li > i{width:42px;height:42px;display:grid;place-items:center;background:var(--red);color:var(--red-ink);font-family:var(--cond);font-weight:900;font-size:22px;transform:skewX(var(--skew))}
.ac-how b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px;text-transform:uppercase}
.ac-how p{margin-top:4px;font-size:14px;line-height:1.5;color:var(--ink-2)}
.ac-rules,.ac-how,.ac-rw,.af-refs,.af-sl,.ac-steps{list-style:none;padding:0}
.ac-rules{display:grid;gap:10px;margin-top:20px}
.ac-rules li{position:relative;padding-left:22px;font-size:13.5px;line-height:1.5;color:var(--ink-2)}
.ac-rules li::before{content:"";position:absolute;left:0;top:.62em;width:10px;height:3px;background:var(--red);transform:skewX(var(--skew))}
.af-g{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:30px}
.af-c{padding:28px 30px}
.af-code{display:flex;align-items:center;gap:16px;margin-top:14px}
.af-code code{font-family:var(--cond);font-weight:900;font-style:italic;font-size:72px;line-height:.85;letter-spacing:.06em}
.af-share{display:flex;align-items:center;gap:10px;margin-top:20px;padding:8px 8px 8px 16px;background:var(--bg);border:1px solid var(--line-2)}
html.round .af-share{border-radius:12px}
.af-share span{flex:1;font-size:15px;color:var(--ink-2)}
.af-share .btn{height:38px;font-size:14px}
.af-share .btn svg,.af-code .btn svg{width:14px;height:14px}
.af-c > p{margin-top:16px;font-size:14px;line-height:1.55;color:var(--ink-2)}
.af-c > p strong{color:var(--ink)}
.af-pr{display:grid;grid-template-columns:168px 1fr;gap:30px;align-items:center;margin-top:18px}
.af-sl{display:flex;gap:8px}
.af-sl li{width:52px;height:52px;display:grid;place-items:center;background:var(--bg-4);font-family:var(--cond);font-weight:900;font-size:22px;color:var(--ink-3);transform:skewX(var(--skew))}
.af-sl li svg{width:20px;height:20px;stroke-width:2.6;transform:skewX(12deg)}
.af-sl li.on{background:var(--red);color:var(--red-ink)}
.af-sl li.wait{background:rgba(255,59,48,.15);color:var(--red);box-shadow:inset 0 0 0 1.5px rgba(255,59,48,.5)}
.af-pr p{margin-top:16px;font-size:14px;line-height:1.55;color:var(--ink-2)}
.af-pr p strong{color:var(--ink)}
.af-refs{display:grid;margin-top:12px}
.af-refs li{display:grid;grid-template-columns:40px 1fr auto;gap:14px;align-items:center;padding:14px 0;border-top:1px solid var(--line)}
.af-refs li:first-child{border-top:0}
.af-refs b{font-size:15px;font-weight:600}
.af-refs small{display:block;margin-top:2px;font-size:13px;color:var(--ink-3)}
.af-refs .ac-av{width:40px;height:40px;background:var(--bg-4);color:var(--ink)}
'''

ICON_GOOGLE = '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>'
ICON_DISCORD = '<svg viewBox="0 0 24 24"><path fill="#5865F2" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7zM8 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>'


# ---------- gabarit ----------
def top(user=False, nav=None, buy=True, cta='sign in'):
    logo = '<a class="s-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b><span class="sub">account</span></a>'
    if user:
        tabs = ''.join(f'<a{" class=on" if t == nav else ""}>{t}</a>' for t in ['account', 'profile', 'affiliate'])
        r = (f'{"<a>pricing</a><span class=\"btn red\">get premium</span>" if buy else ""}'
             f'<span class="ac-me"><span class="ac-av">A</span>{EMAIL}</span><span class="btn"><i data-i="logout"></i>sign out</span>')
        return f'<header class="s-nav ac-top">{logo}<nav>{tabs}</nav><div class="r">{r}</div></header>'
    r = ('<a>pricing</a><span class="btn red">get premium</span>' if buy else '') + f'<span class="btn">{cta}</span>'
    return f'<header class="s-nav ac-top">{logo}<div class="r">{r}</div></header>'


def foot():
    return ('<footer class="ac-foot"><nav><a>Affiliate program</a><a>Terms</a><a>Privacy</a><a>Cancellation</a><a>Cancel subscription</a><a>Support on Discord</a></nav>'
            "<p>© 2026 Rago Optimizer, by KALISO and RAGO. Every millisecond counts. Rago Optimizer changes Windows settings on your PC. It isn't affiliated with Mojang or Microsoft.</p></footer>")


def steps(cur, cls=''):
    labels = ['pay', 'your account', 'download', 'activate']
    out = ''
    for i, l in enumerate(labels):
        st = 'done' if i < cur else 'now' if i == cur else ''
        mark = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' if i < cur else str(i + 1)
        out += f'<li class="{st}"><i>{mark}</i>{l}</li>'
    return f'<ol class="ac-steps {cls}">{out}</ol>'


def aside(over, title, lede, extra='', long=False):
    return f'<div class="ac-aside"><p class="s-eb">{over}</p><h1 class="ac-d{" long" if long else ""}">{title}</h1><p class="ac-lede">{lede}</p>{extra}</div>'


def split(asd, form, solo=False, big=''):
    bg = f'<span class="ac-big">{big}</span>' if big else ''
    right = '' if solo else f'<div class="s-card ac-panel">{form}</div>'
    return f'<main class="ac-split{" solo" if solo else ""}"><span class="s-dots"></span>{bg}{asd}{right}</main>'


def field(label, val='', ph='', hint='', eye=False, focus=False, code=False):
    v = f'<span>{val}</span>' if val else f'<span class="ph">{ph}</span>' if ph else ''
    caret = '<i class="caret"></i>' if focus else ''
    e = '<span class="eye">show</span>' if eye else ''
    h = f'<span class="hint">{hint}</span>' if hint else ''
    return f'<div class="ac-f{" focus" if focus else ""}"><label>{label}</label><div class="bx{" code" if code else ""}">{v}{caret}{e}</div>{h}</div>'


def oauth():
    return (f'<div class="ac-oa"><span>{ICON_GOOGLE}Continue with Google</span><span>{ICON_DISCORD}Continue with Discord</span></div>'
            '<p class="ac-or">or with your email</p>')


def alert(msg, kind='err'):
    return f'<div class="ac-al {kind}"><i data-i="{"alert" if kind == "err" else "check"}"></i><span>{msg}</span></div>'


def wrap(body, user=False, nav=None, buy=True, cta='sign in'):
    return top(user, nav, buy, cta) + body + foot()


PW = '••••••••••'


# ---------- inscription, connexion ----------
def signup(purchased=False):
    if purchased:
        a = aside('rago optimizer premium', 'payment <span class="br">confirmed.</span>',
                  "Create your account to get your license. You'll use the same email and password to sign in to Rago Optimizer.", steps(1))
        f = (f'<h2>create account</h2>{oauth()}{field("email", EMAIL)}{field("password", PW, hint="At least 8 characters.", eye=True)}'
             + field('referral code (optional)', 'K7RMQ2', hint="Got a code from another player? Enter it now. You can't add it later.", focus=True, code=True)
             + '<span class="btn red ac-go">create account</span>'
             '<p class="ac-sm">Already have an account? <a>Sign in</a> and your license is added to it.</p>')
        return wrap(split(a, f), buy=False)
    a = aside('rago optimizer account', 'create your <span class="br">account.</span>',
              'Your downloads, your Premium license and your PC live here. The free version needs no account.')
    f = (f'<h2>create account</h2>{oauth()}{field("email", EMAIL, focus=True)}{field("password", ph="", hint="At least 8 characters.", eye=True)}'
         '<span class="btn red ac-go">create account</span><p class="ac-sm">Already have an account? <a>Sign in</a>.</p>')
    return wrap(split(a, f))


def verify():
    a = aside('rago optimizer account', 'check your <span class="br">inbox.</span>',
              f"We sent a 6-digit code to <strong>{EMAIL}</strong>. Type it here to confirm it's your email and create your account.")
    otp = '<div class="ac-f"><label>code</label><div class="ac-otp"><span>4</span><span>8</span><span>1</span><em></em><span class="cur"></span><span></span><span></span></div><span class="hint">It works for 15 minutes. Nothing? Check your spam folder.</span></div>'
    f = (f'<h2>confirm your email</h2>{otp}<span class="btn red ac-go">create account</span>'
         '<p class="ac-sm">No code? <a>Send a new one</a>. Wrong email? <a>Change it</a>.</p>')
    return wrap(split(a, f))


def login(err=False):
    a = aside('rago optimizer account', 'welcome <span class="br">back.</span>', 'Sign in to get your license key and download Rago Optimizer.')
    f = (f'<h2>sign in</h2>{alert("Wrong email or password.") if err else ""}{oauth()}{field("email", EMAIL)}{field("password", PW, eye=True, focus=True)}'
         '<span class="btn red ac-go">sign in</span><p class="ac-sm"><a>Forgot your password?</a> No account? <a>Create account</a></p>')
    return wrap(split(a, f), cta='create account')


def forgot(sent=False):
    if sent:
        a = aside('rago optimizer account', 'check your <span class="br">inbox.</span>', 'Open the link in the email to choose a new password.')
        f = (f'<h2>check your inbox</h2><p class="mut">If an account exists for <strong>{EMAIL}</strong>, a reset link is on its way. It works for 1 hour.</p>'
             '<p class="ac-sm">Nothing after 5 minutes? Check your spam folder, or <a>ask on Discord</a>.</p><span class="btn ac-gh" style="margin-top:26px">back to sign in</span>')
    else:
        a = aside('rago optimizer account', 'forgot your <span class="br">password?</span>', "Enter the email of your account and we'll send you a link to choose a new one.")
        f = f'<h2>reset your password</h2>{field("email", EMAIL, focus=True)}<span class="btn red ac-go">send reset link</span><p class="ac-sm"><a>Back to sign in</a></p>'
    return wrap(split(a, f))


def reset():
    a = aside('rago optimizer account', 'choose a new <span class="br">password.</span>', "You'll be signed out everywhere else. Rago Optimizer stays activated on your PC.")
    f = f'<h2>new password</h2>{field("new password", PW, hint="At least 8 characters.", eye=True, focus=True)}<span class="btn red ac-go">save password</span>'
    return wrap(split(a, f))


def password(has=True):
    if has:
        a = aside('your account', 'change your <span class="br">password.</span>', "You'll be signed out everywhere else. Rago Optimizer stays activated on your PC.")
        f = (f'<h2>new password</h2>{field("current password", PW, eye=True)}{field("new password", PW, hint="At least 8 characters.", eye=True, focus=True)}'
             '<span class="btn red ac-go">save password</span><p class="ac-sm"><a>Back to your account</a> · <a>Forgot it?</a></p>')
    else:
        a = aside('your account', 'set a <span class="br">password.</span>', 'Rago Optimizer for Windows signs in with your email and a password. On the website you can keep using Google or Discord.')
        f = (f'<h2>your password</h2>{field("password", PW, hint="At least 8 characters.", eye=True, focus=True)}'
             '<span class="btn red ac-go">save password</span><p class="ac-sm"><a>Back to your account</a></p>')
    return wrap(split(a, f), user=True, nav='account', buy=False)


def applink():
    code = ''.join(f'<span>{c}</span>' for c in 'R7KQ')
    extra = (f'<div class="ac-code">{code}</div>'
             '<div class="ac-row2"><span class="btn red">yes, sign in the app</span><span class="btn">use another account</span></div>'
             '<p class="ac-sm" style="max-width:560px">Different code, or you didn\'t click “Continue with Google” or “Continue with Discord” in the app? Close this page.</p>')
    a = aside('rago optimizer for windows', 'sign in to <span class="br">the app?</span>',
              f'Rago Optimizer on your PC will be signed in as <strong>{EMAIL}</strong>. Check that the app shows this code:', extra)
    return wrap(split(a, '', solo=True), user=True, buy=False)


# ---------- pages de message ----------
MSG = [
    ('checkout', 'payment processing.', "Your bank is still confirming the payment. We'll email you a link to create your account as soon as it's done.", 'refresh', '200 · /checkout/success', True),
    ('checkout', "we couldn't find that payment.", 'If you were charged, sign in or contact support on Discord with your receipt.', 'sign in', '404 · /checkout/success', False),
    ('checkout', 'checkout opens soon.', 'Payments are being set up. Meanwhile, the free version of Rago Optimizer is ready to download.', 'download the free version', '503 · /buy', False),
    ('checkout', 'lifetime opens soon.', 'The one-time Lifetime payment is being set up. Meanwhile, Premium is available monthly or yearly.', 'see the plans', '503 · /buy/lifetime', False),
    ('rago optimizer', 'opening soon.', 'Rago Optimizer isn’t open yet. Come back at the launch.', None, '503 · before launch', False),
    ('your purchase', "this link doesn't work anymore.", 'It was already used, or a newer link replaced it. Sign in with the email you paid with to see your license, or open the latest link we sent you.', 'sign in', '410 · /claim', False),
    ('password', 'this link expired.', 'Reset links work once, for 1 hour. Ask for a new one.', 'send a new link', '410 · /reset', False),
    ('rago optimizer for windows', 'this sign-in expired.', 'Sign-in links from the app work for 10 minutes. Click “Continue with Google” or “Continue with Discord” in Rago Optimizer again.', None, '410 · /app/link', False),
    ('rago optimizer for windows', 'you’re signed in.', 'Go back to Rago Optimizer: it finishes signing in on its own. You can close this tab.', None, '200 · /app/link', False),
    ('free download', 'the windows app is on its way.', 'Rago Optimizer can’t be downloaded right now. Ask on Discord and we’ll tell you as soon as it’s back.', None, '503 · /download', False),
    ('free download', 'too many downloads.', 'Too many attempts. Wait a few minutes and try again.', None, '429 · /download', False),
    ('error', 'something went wrong.', 'Try again in a moment. If it keeps happening, ask on Discord.', 'try again', '500', False),
    ('error 404', 'page not found.', "This page doesn't exist, or it moved.", 'go to your account', '404', False),
]


def message_full():
    over, title, text, act, _, st = MSG[0]
    extra = (f'<div class="ac-row2"><span class="btn red"><i data-i="refresh"></i>{act}</span><span class="btn">back to rago optimizer</span><span class="btn"><i data-i="chat"></i>ask on discord</span></div>'
             f'<div style="margin-top:44px">{steps(0)}</div>')
    a = aside(over, 'payment <span class="br">processing.</span>', text, extra)
    return wrap(split(a, '', solo=True, big='wait'), buy=False)


def messages_board():
    cards = ''
    for over, title, text, act, code, st in MSG:
        acts = (f'<span class="btn red">{act}</span>' if act else '') + '<span class="btn">back to rago optimizer</span><span class="btn">ask on discord</span>'
        cards += (f'<div class="bd-i"><p class="cap">{code}</p><div class="s-card ms"><p class="s-eb">{over}</p><h3>{title}</h3><p>{text}</p>'
                  f'{steps(0, "sm") if st else ""}<div class="acts">{acts}</div></div></div>')
    head = ('<div class="bd-h"><div><p class="s-eb">account <b>//</b> message pages</p><h1>13 messages, one layout.</h1></div>'
            '<p>Every message keeps three ways out: the main action when there is one, back to the site, and Discord. Shown full size: payment processing.</p></div>')
    return f'<main class="bd">{head}<div class="bd-g two">{cards}</div></main>'


# ---------- tableau de bord ----------
def badge(t, k):
    return f'<span class="ac-b {k}">{t}</span>'


def row(eb, right, body, acts=''):
    a = f'<div class="acts">{acts}</div>' if acts else ''
    return f'<section class="ac-r"><div class="ac-rh"><p class="s-eb">{eb}</p>{right}</div>{body}{a}</section>'


def pl(icon, title, text, printed=None):
    ic = G.pi(printed) if printed else f'<i data-i="{icon}"></i>'
    return f'<div class="ac-pl"><span class="ic">{ic}</span><div><b>{title}</b><p>{text}</p></div></div>'


def ring(v, goal, pend=0, size=''):
    import math
    c = 2 * math.pi * 42
    bar = f'<circle class="bar" cx="50" cy="50" r="42" stroke-dasharray="{c:.2f}" stroke-dashoffset="{c * (1 - v / goal):.2f}"/>' if v else ''
    pd = f'<circle class="pend" cx="50" cy="50" r="42" stroke-dasharray="{c:.2f}" stroke-dashoffset="{c * (1 - (v + pend) / goal):.2f}"/>' if pend else ''
    return f'<div class="ac-ring {size}"><svg viewBox="0 0 100 100"><circle class="tr" cx="50" cy="50" r="42"/>{pd}{bar}</svg><span><b>{v}<small>/{goal}</small></b></span></div>'


def stars(n, cls=''):
    return f'<span class="ac-stars {cls}">' + ''.join(f'<i{"" if i < n else " class=off"}></i>' for i in range(5)) + '</span>'


HOWTO_P = ('<ol><li><b>1</b><span>Run the installer. Windows SmartScreen may ask you to confirm: click <strong>More info</strong>, then <strong>Run anyway</strong>.</span></li>'
           f'<li><b>2</b><span>Sign in to Rago Optimizer with <strong>{EMAIL}</strong>.</span></li><li><b>3</b><span>Activate it. Your license is locked to that PC.</span></li></ol>')
HOWTO_F = ('<ol><li><b>1</b><span>Run the installer. Windows SmartScreen may ask you to confirm: click <strong>More info</strong>, then <strong>Run anyway</strong>.</span></li>'
           '<li><b>2</b><span>Open Rago Optimizer. The free tweaks work right away, no sign-in needed.</span></li></ol>')
UNLOCKS = 'Premium unlocks all 218 tweaks and every preset. The free version opens 73.'


def hero_download():
    return ('<article class="s-card ac-hero"><div class="m"><p class="s-eb">rago optimizer for windows</p><h2>download rago optimizer for windows</h2>'
            '<p>Windows 10 and 11, 64-bit.<span class="ac-chip">v1.3.0</span></p>'
            f'<div class="acts"><span class="btn red"><i data-i="download"></i>download rago optimizer</span></div></div>{HOWTO_P}</article>')


def hero_free():
    return ('<article class="s-card ac-hero"><div class="m"><div class="tg"><p class="s-eb">your plan</p>' + badge('free', 'off') + '</div>'
            "<h2>you're on free</h2><p>73 tweaks unlocked. Premium unlocks all 218 tweaks and every preset. <strong>$5.99 a month or $29.99 a year.</strong></p>"
            '<div class="acts"><span class="btn red">get premium<i data-i="arrow"></i></span><span class="btn"><i data-i="download"></i>download the free version</span></div>'
            "<p class=\"fine\">Monthly or yearly. Secure checkout with Stripe. Cancel anytime. Already paid? Sign in with the email you paid with, or open the link in your purchase email. Still not here? <a class=\"ac-lk\">Ask on Discord</a> with your payment email and we'll add it to this account.</p>"
            f'</div>{HOWTO_F}</article>')


def hero_comeback():
    return ('<article class="s-card ac-hero"><div class="m"><p class="s-eb">rago optimizer premium</p><h2>renew premium</h2>'
            f'<p>Rago Optimizer now runs as the free version on your PC. {UNLOCKS}</p>'
            '<div class="acts"><span class="btn red">renew premium<i data-i="arrow"></i></span><span class="btn"><i data-i="download"></i>download the free version</span></div>'
            f'<p class="fine">Windows 10 and 11, 64-bit.<span class="ac-chip">v1.3.0</span></p></div>{HOWTO_P}</article>')


KEY = 'RAGO-7K2QF-•••••-•••••-M4XZ9'


def r_license(st='active'):
    b = badge('active', 'ok') if st == 'active' else badge(st, 'off')
    note = '' if st in ('active', 'ended') else '<p class="note">This license no longer works in Rago Optimizer. <a class="ac-lk">Contact support on Discord</a> if you think that\'s a mistake.</p>'
    return row('license key', b, f'<div class="ac-key"><code>{KEY}</code><span class="btn">show</span><span class="btn"><i data-i="copy"></i>copy</span></div>'
               '<dl class="ac-meta"><div><dt>plan</dt><dd>Rago Optimizer Premium · Monthly</dd></div><div><dt>since</dt><dd>Oct 10, 2026</dd></div></dl>' + note)


def r_device(state='bound'):
    if state == 'none':
        return row('device', '<span class="n">0 / 1</span>', pl('monitor', 'not activated yet', 'Sign in to Rago Optimizer on your PC to activate it. Rago Optimizer works on one device per license.', 'windows'))
    body = (pl('monitor', 'GAMING-PC', 'Windows 11 · Rago Optimizer 1.3.0<br><strong>This license is active on 1 device.</strong>', 'windows')
            + '<dl class="ac-meta"><div><dt>activated</dt><dd>Oct 10, 2026</dd></div><div><dt>last seen</dt><dd>4 min ago</dd></div></dl>')
    if state == 'reset':
        return row('device', '<span class="n">1 / 1</span>', body, '<span class="btn">use on another PC</span>')
    return row('device', '<span class="n">1 / 1</span>', body + '<p class="note">Changed PCs? <a class="ac-lk">Contact support on Discord</a>.</p>')


def r_sub(state='renew'):
    S = {
        'renew': ('<span class="ac-chip" style="margin:0">MONTHLY</span>', 'Renews on Dec 10, 2026. Cancel anytime.', '<span class="btn"><i data-i="card"></i>cancel or manage subscription</span>'),
        'trial': (badge('trial until Nov 25, 2026', 'wait'), 'Free trial. Your card is charged on Nov 25, 2026, unless you cancel before. Cancel anytime: you pay nothing.', '<span class="btn"><i data-i="card"></i>cancel trial or manage</span>'),
        'cancel': (badge('ends Dec 10, 2026', 'wait'), 'Canceled. Premium keeps working until Dec 10, 2026, then Rago Optimizer goes back to the free version and puts back its tweaks.', '<span class="btn red"><i data-i="card"></i>keep premium</span>'),
        'ended': (badge('ended', 'off'), 'Your subscription ended on Nov 10, 2026. Renew it to unlock Premium again.', '<span class="btn red">renew premium</span><span class="btn"><i data-i="card"></i>invoices and billing</span>'),
        'refunded': (badge('refunded', 'off'), 'Refunded. This subscription is stopped and won’t renew.', '<span class="btn"><i data-i="card"></i>invoices and billing</span>'),
    }
    b, line, acts = S[state]
    return row('subscription', b, pl('card', 'rago optimizer premium · monthly', line), acts)


def r_plan(kind):
    if kind == 'lifetime':
        return row('plan', badge('lifetime', 'red'), pl('infinity', 'rago optimizer premium for life', 'No renewals, nothing to pay.'))
    if kind == 'reward':
        return row('plan', badge('until May 22, 2027', 'red'), pl('users', 'rago optimizer premium · affiliate reward', 'Earned with the affiliate program. Premium until May 22, 2027, nothing to pay.'),
                   '<span class="btn">subscribe now, first payment on May 22, 2027</span><a class="ac-la">open affiliate program<i data-i="arrow"></i></a>')
    if kind == 'discord':
        return row('plan', badge('until Dec 22, 2026', 'red'), pl('users', 'rago optimizer premium · discord reward', 'Earned by inviting players to the Rago Discord. Premium until Dec 22, 2026, nothing to pay.'),
                   '<span class="btn">subscribe now, first payment on Dec 22, 2026</span>')
    return row('plan', badge('until Jan 1, 2027', 'red'), pl('gift', 'rago optimizer premium · gift', 'Offered by the Rago team. Premium until Jan 1, 2027, nothing to pay.'),
               '<span class="btn">subscribe now, first payment on Jan 1, 2027</span>')


def r_route(state='active'):
    if state == 'active':
        return row('rago route', badge('active', 'ok'), pl('globe', 'the anti-lag tunnel', 'The anti-lag tunnel for Minecraft, $3 a month on top of your Premium. Next payment on Dec 10, 2026. It stops with your Premium.', 'network'),
                   '<span class="btn"><i data-i="card"></i>manage or cancel</span>')
    if state == 'stops':
        return row('rago route', badge('stops Dec 10, 2026', 'off'), pl('globe', 'the anti-lag tunnel', 'The anti-lag tunnel for Minecraft, $3 a month on top of your Premium. It stops on Dec 10, 2026. It stops with your Premium.', 'network'),
                   '<span class="btn"><i data-i="card"></i>manage or cancel</span>')
    return row('rago route', badge('option', 'off'), pl('globe', 'add rago route', 'The anti-lag tunnel for Minecraft (beta): your game goes through the Rago servers by several paths at once, and lost packets are sent again right away. $3 a month or $17.99 a year (6 months free) on top of your Premium, cancel anytime.', 'network'),
               '<span class="btn red">add rago route · $17.99/year</span><span class="btn">$3/month</span>')


REWARDS = [('VIP', '10 invites: 1 month of Premium and a 10% discount code.'), ('MVP', '15 invites: 3 months of Premium and a 30% discount code.'),
           ('BOOST', '1 server boost: 2 weeks of Premium and a 10% discount code.'), ('BOOST2', '2 server boosts: 1 month of Premium and a 30% discount code.')]


def rewards(earned=False, linked=True):
    lis = ''
    for n, t in REWARDS:
        if earned and n == 'VIP':
            lis += (f'<li><b>{n}</b><span>{badge("earned", "ok")} 1 month of Premium added, Premium until Jan 10, 2027.<br>'
                    'Your 10% code, one use: <code>VIP-8H2KQ</code> <a class="ac-la" style="font-size:13px">use it<i data-i="arrow"></i></a></span></li>')
        else:
            lis += f'<li><b>{n}</b><span>{t}</span></li>'
    note = 'Your rewards show up here a few minutes after you earn them.' if linked else 'Link your Discord account to get your rewards here.'
    return pl('users', 'discord rewards', f'Invite players to the Rago Discord or boost the server. {note}') + f'<ul class="ac-rw">{lis}</ul>'


def r_discord(state='role'):
    S = {
        'role': (badge('role given', 'ok'), 'Linked to <strong>@alexpvp</strong>. The role stays while your Premium is active.', '<span class="btn">role missing? sync it</span><span class="btn">unlink</span>'),
        'notmember': (badge('not on the server', 'wait'), "Linked to <strong>@alexpvp</strong>, but that account isn't on the Rago server. Join it with Discord to get the role.", '<span class="btn red">join with discord</span><span class="btn">unlink</span>'),
        'pending': (badge('pending', 'wait'), "Linked to <strong>@alexpvp</strong>. The role couldn't be given yet. It's tried again automatically.", '<span class="btn">try again</span><span class="btn">unlink</span>'),
    }
    b, t, a = S[state]
    return f'<div class="ac-pl"><span class="ic"><i data-i="chat"></i></span><div><b>premium role on discord</b><p>{t}</p></div></div>', b, a


def dash_premium():
    lic = f'<div class="s-card ac-pn">{r_license()}{r_device()}{r_sub()}{r_route()}</div>'
    role, b, a = r_discord('role')
    disc = row('discord', b, role + '<div style="margin-top:20px">' + rewards() + '</div>', a + '<a class="ac-la">open discord<i data-i="arrow"></i></a>')
    aff = row('affiliate program', '<span class="n">1 / 3 · 1 waiting</span>',
              f'<div class="ac-aff">{ring(1, 3, 1)}<div><p class="k">your code</p><p class="c">K7RMQ2</p><p>2 more players for 6 months of Premium.</p></div></div>',
              '<a class="ac-la">open affiliate program<i data-i="arrow"></i></a>')
    rv = row('your review', badge('on the site', 'ok'),
             f'<div style="margin-top:12px">{stars(5)}</div><p class="rv">Ran the network test, saw the jitter, turned on the Network preset. Hits finally land where I aim.</p><p class="note">Updated Nov 19, 2026.</p>',
             '<span class="btn">edit review</span><a class="ac-la">see all reviews<i data-i="arrow"></i></a>')
    side = f'<div class="s-card ac-pn">{disc}{aff}{rv}</div>'
    body = (f'<main class="ac-dash"><span class="s-dots"></span><div class="ac-dh"><div><p class="s-eb">your account</p><h1>rago optimizer premium</h1></div>{steps(4, "sm")}</div>'
            f'{hero_download()}<div class="ac-cols">{lic}{side}</div>'
            f'<p class="ac-df">Signed in as {EMAIL} · <a>Profile photo and name</a> · <a>Change password</a></p></main>')
    return wrap(body, user=True, nav='account', buy=False)


def dash_free():
    aff = row('affiliate program', '', pl('users', 'bring 3 players, get 6 months of premium', 'Share your code: players get 5% off. When 3 players have bought Premium with it, you get 6 months of Premium.'),
              '<a class="ac-la">join the affiliate program<i data-i="arrow"></i></a>')
    disc = row('discord', '', rewards(linked=False), '<span class="btn red">link discord</span><a class="ac-la">open discord<i data-i="arrow"></i></a>')
    body = (f'<main class="ac-dash"><span class="s-dots"></span><div class="ac-dh"><div><p class="s-eb">your account</p><h1>welcome to rago optimizer</h1></div></div>'
            f'{hero_free()}<div class="ac-cols"><div class="s-card ac-pn">{aff}</div><div class="s-card ac-pn">{disc}</div></div>'
            f'<p class="ac-df">Signed in as {EMAIL} · <a>Profile photo and name</a> · <a>Change password</a></p></main>')
    return wrap(body, user=True, nav='account', buy=True)


def dash_states():
    def it(cap, html, w=''):
        return f'<div class="bd-i {w}"><p class="cap">{cap}</p>{html}</div>'

    def card(*rows):
        return f'<div class="s-card ac-pn">{"".join(rows)}</div>'
    role_nm, b_nm, a_nm = r_discord('notmember')
    role_pd, b_pd, a_pd = r_discord('pending')
    review_empty = row('your review', '', pl('star', 'how is rago optimizer working for you?', 'Rate it and tell other players what changed. Your review shows on rago-optimizer.com with your public name.')
                       + '<div class="ac-rate"><i></i><i></i><i></i><i></i><i></i></div>', '<a class="ac-la">write your review<i data-i="arrow"></i></a>')
    review_hidden = row('your review', badge('hidden', 'off'), f'<div style="margin-top:12px">{stars(4)}</div><p class="rv">Good app, the free tweaks already cleaned up my laptop.</p><p class="note">Hidden from the site by the Rago team.</p>',
                        '<span class="btn">edit review</span><a class="ac-la">see all reviews<i data-i="arrow"></i></a>')
    nopw = alert('Rago Optimizer for Windows signs in with your email and a password. <a>Set a password</a> to use it with this account.', 'ok')
    items = [
        it('<em>premium ended</em> · the way back comes first', hero_comeback(), 'w3'),
        it('free trial', card(r_sub('trial'))),
        it('canceled, still active', card(r_sub('cancel'))),
        it('subscription ended', card(r_sub('ended'))),
        it('lifetime', card(r_plan('lifetime'))),
        it('affiliate reward', card(r_plan('reward'))),
        it('gift from the team', card(r_plan('gift'))),
        it('refunded', card(r_license('refunded'))),
        it('device not activated', card(r_device('none'))),
        it('device, free it yourself', card(r_device('reset'))),
        it('rago route on sale', card(r_route('option'))),
        it('rago route stopping', card(r_route('stops'))),
        it('discord, not on the server', card(row('discord', b_nm, role_nm, a_nm))),
        it('discord, role pending', card(row('discord', b_pd, role_pd, a_pd))),
        it('discord reward earned', card(row('discord', '', rewards(earned=True)))),
        it('no review yet', card(review_empty)),
        it('review hidden', card(review_hidden)),
        it('signed up with google, no password', nopw),
    ]
    head = ('<div class="bd-h"><div><p class="s-eb">account <b>//</b> dashboard states</p><h1>every case of the account page.</h1></div>'
            '<p>The same rows as the Premium dashboard, in each state the server can show. Dates and names are examples.</p></div>')
    return f'<main class="bd">{head}<div class="bd-g">{"".join(items)}</div></main>'


# ---------- profil, avis, affiliation ----------
def profile(welcome=False):
    if welcome:
        a = aside('account created', 'add a profile <span class="br">photo.</span>', 'It shows next to your name when you leave a review, on rago-optimizer.com and in Rago Optimizer. You can skip it and add one later from your account.')
    else:
        a = aside('your public profile', 'photo and <span class="br">name.</span>', "They show with your review on rago-optimizer.com, and in Rago Optimizer when you're signed in. Your email is never shown.")
    pp = ('<div class="ac-pp"><span class="ac-av lg">A</span><div><b>alex</b><p>No photo yet: the first letter of your name shows instead.</p></div></div>'
          '<div class="ac-f"><label>photo</label><div class="ac-drop"><i data-i="image"></i><span class="btn">choose a photo</span><span>or drop it here</span></div>'
          '<span class="hint">JPG, PNG, WebP or GIF, 5 MB at most. We crop it to a square and make it lighter.</span></div><span class="btn red ac-go">upload photo</span>')
    if welcome:
        f = f'<h2>profile photo</h2>{pp}<span class="btn ac-gh">skip for now</span>'
    else:
        f = (f'<h2>your profile</h2>{pp}<div class="ac-sep"></div>'
             + field('public name', 'Alex', hint='Shown with your review instead of your email. 2 to 32 characters.')
             + '<span class="btn ac-gh" style="margin-top:16px">save name</span>'
             f'<div class="ac-rvb"><p class="s-eb" style="font-size:13px">your review</p><div style="margin-top:10px">{stars(5)}</div>'
             '<p class="rv">Ran the network test, saw the jitter, turned on the Network preset. Hits finally land where I aim.</p>'
             '<p>Shown on rago-optimizer.com. <a>Edit your review</a></p></div>')
    return wrap(split(a, f), user=True, nav='profile', buy=False)


def review(premium=True):
    if not premium:
        a = aside('your review', 'leave your review in <span class="br">rago optimizer.</span>',
                  'Writing it from your account page is part of Premium. On the free version, open Rago Optimizer, then Settings, then Leave a review. It shows on rago-optimizer.com the same way.', long=True)
        f = ('<h2>leave a review</h2>' + pl('star', 'part of rago optimizer premium', 'Premium members rate Rago Optimizer and write their review right here. Everyone can leave one in the app.')
             + '<span class="btn red ac-go">get premium<i data-i="arrow"></i></span><span class="btn ac-gh">back to your account</span>'
             '<p class="ac-sm"><a>See all reviews on rago-optimizer.com</a></p>')
        return wrap(split(a, f), user=True, nav='account', buy=True)
    txt = 'Ran the network test, saw the jitter, turned on the Network preset. Hits finally land where I aim.'
    pv = (f'<figure class="s-card ac-pv">{stars(4)}<q>{txt}</q><footer><span class="ac-av md">A</span><b>alex</b><small>Nov 2026</small></footer></figure>'
          '<p class="ac-pvn">Preview of your review on rago-optimizer.com.</p>')
    a = aside('your review', 'tell players <span class="br">what changed.</span>', 'It shows on rago-optimizer.com with your public name and photo, as written. Your email is never shown.', pv)
    f = ('<h2>rate rago optimizer</h2>'
         f'<div class="ac-f"><label>your rating</label><div class="ac-rt">{stars(4, "lg")}<b>great</b></div></div>'
         f'<div class="ac-f"><div class="ac-fr"><label>your review</label><em>{len(txt)} / 600</em></div><div class="ac-ta">{txt}<i class="caret"></i></div>'
         '<span class="hint">Long reviews are shortened on the home page, with a link to read them in full.</span></div>'
         '<div class="ac-f"><label>public name</label><div class="ac-nm"><span class="ac-av md">A</span><div class="bx"><span>Alex</span></div></div>'
         '<span class="hint">Shown with your review instead of your email, and in Rago Optimizer. <a class="ac-lk">Add a photo</a></span></div>'
         '<span class="btn red ac-go">post review</span><p class="ac-sm"><a>See all reviews on rago-optimizer.com</a></p>')
    return wrap(split(a, f), user=True, nav='account', buy=False)


RULES = ["A player counts once they've paid, used your code and activated Rago Optimizer on their PC.",
         "A player who's refunded or files a chargeback stops counting.",
         'Players type your code at checkout for 5% off, or when they create their account right after paying. It can’t be added later.',
         "Your own purchases don't count: a player activated on one of your PCs, or paid with your account email, is left out. Rewards gained by cheating can be taken back.",
         'Your code works for 3 players. A refunded player, or one on your PC, frees their spot.',
         '3 players counted = 6 months of Premium on one PC, once. Subscribed? Your payments pause for 6 months instead.']


def affiliate_join():
    how = ('<ol class="ac-how"><li><i>1</i><div><b>get your code</b><p>Join with your Rago Optimizer account. No purchase needed.</p></div></li>'
           '<li><i>2</i><div><b>share it with players</b><p>They get 5% off Premium with it at checkout.</p></div></li>'
           '<li><i>3</i><div><b>3 players, 6 months of premium</b><p>Once 3 players have activated Rago Optimizer, you get 6 months, nothing to pay.</p></div></li></ol>')
    a = aside('affiliate program', 'bring 3 players. get 6 months of <span class="br">premium.</span>',
              'Share your code with 3 players: they get 5% off Rago Optimizer Premium, and you get 6 months of Premium once 3 of them have activated it.', how, long=True)
    f = ('<h2>join the program</h2><p class="mut">You need a Rago Optimizer account to get your code. It\'s free.</p>'
         '<span class="btn red ac-go">create account</span><span class="btn ac-gh">sign in</span>'
         '<ul class="ac-rules">' + ''.join(f'<li>{r}</li>' for r in RULES) + '</ul>')
    return wrap(split(a, f))


def affiliate():
    sl = ('<ol class="af-sl"><li class="on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></li>'
          '<li class="wait"><i data-i="clock"></i></li><li>3</li></ol>')
    code = ('<article class="s-card af-c"><p class="s-eb">your referral code</p><div class="af-code"><code>K7RMQ2</code><span class="btn red"><i data-i="copy"></i>copy</span></div>'
            '<div class="af-share"><span>rago-optimizer.com/?ref=K7RMQ2</span><span class="btn"><i data-i="copy"></i>copy link</span></div>'
            '<p>Players type the code at checkout for <strong>5% off</strong>, or in the <strong>Referral code</strong> field when they create their account after paying. With your link, the discount and the code are applied for them.</p></article>')
    prog = (f'<article class="s-card af-c"><p class="s-eb">progress</p><div class="af-pr">{ring(1, 3, 1, "lg")}<div>{sl}'
            "<p><strong>1 of 3</strong> players counted. 1 waiting: a player counts once they've activated Rago Optimizer on their PC.</p></div></div></article>")
    refs = ('<article class="s-card af-c"><div class="ac-rh"><p class="s-eb">players who used your code</p><span class="ac-rh n" style="font-family:var(--cond);font-weight:800;color:var(--ink-3)">2</span></div><ul class="af-refs">'
            f'<li><span class="ac-av">M</span><div><b>max@example.com</b><small>Joined Nov 12, 2026</small></div>{badge("counted", "ok")}</li>'
            f'<li><span class="ac-av">L</span><div><b>lea@example.com</b><small>Joined Nov 20, 2026</small></div>{badge("not activated yet", "wait")}</li></ul></article>')
    rules = '<article class="s-card af-c"><p class="s-eb">how it counts</p><ul class="ac-rules">' + ''.join(f'<li>{r}</li>' for r in RULES) + '</ul></article>'
    body = (f'<main class="ac-dash"><span class="s-dots"></span><div class="ac-dh"><div><p class="s-eb">affiliate program</p><h1>2 more to go.</h1></div></div>'
            + alert("You're in. Share your code with players before they buy.", 'ok') + f'<div class="af-g">{code}{prog}{refs}{rules}</div></main>')
    return wrap(body, user=True, nav='affiliate', buy=False)


PAGES = {
    'acc-signup': ('Create account', signup),
    'acc-signup-paid': ('Payment confirmed', lambda: signup(True)),
    'acc-verify': ('Confirm your email', verify),
    'acc-login': ('Sign in', login),
    'acc-forgot': ('Reset password', forgot),
    'acc-forgot-sent': ('Check your inbox', lambda: forgot(True)),
    'acc-reset': ('New password', reset),
    'acc-password': ('Change password', password),
    'acc-password-set': ('Set a password', lambda: password(False)),
    'acc-applink': ('Sign in to the app', applink),
    'acc-message': ('Payment processing', message_full),
    'acc-messages': ('Message pages', messages_board),
    'acc-dash-premium': ('Your account', dash_premium),
    'acc-dash-free': ('Your account, free', dash_free),
    'acc-dash-states': ('Dashboard states', dash_states),
    'acc-profile': ('Your profile', profile),
    'acc-profile-welcome': ('Add a profile photo', lambda: profile(True)),
    'acc-review': ('Your review', review),
    'acc-review-free': ('Your review, free', lambda: review(False)),
    'acc-affiliate': ('Affiliate program', affiliate),
    'acc-affiliate-join': ('Affiliate program, join', affiliate_join),
}

if __name__ == '__main__':
    only = sys.argv[1:]
    for k, (t, fn) in PAGES.items():
        if only and k not in only:
            continue
        (OUT / f'{k}.html').write_text(page(t, fn(), CSS))
    print('wrote', len(only or PAGES), 'pages')
