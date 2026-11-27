"""Site public v5 (lot 4, 22/11/2026) : accueil de rago-optimizer.com. Textes, prix, FAQ, tableau comparatif et partenaires
tirés de site/src/page.html et partners.json (branche staging), modules et presets de app/src/data/catalog.json.
Écrit src/site5.css et src/site-home.html (1440 de large, toute la hauteur)."""
import json
from pathlib import Path

OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/src')
PI = json.load(open(Path(__file__).parent / 'printicons.json'))

CSS = r'''/* Site public v5 (lot 4, 22/11/2026). Pose sur rago5.css et poster.css. Classes en s- pour ne rien croiser. */
.win.site{width:1440px;min-height:0;background:var(--bg)}
.sw5{width:1200px;margin:0 auto;position:relative}
.s-sec{position:relative;padding:120px 0 0}
.s-dots{position:absolute;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.07) 1.1px,transparent 1.5px) 0 0/9px 9px}
.s-eb{font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-2)}
.s-eb b{color:var(--red)}
.s-h2{margin-top:14px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:86px;line-height:.84;text-transform:uppercase;letter-spacing:-.005em}
.s-lead{margin-top:20px;max-width:560px;font-size:17px;line-height:1.55;color:var(--ink-2)}
.s-lead b{color:var(--ink);font-weight:600}
.s-head{display:flex;align-items:flex-end;justify-content:space-between;gap:60px}
.s-head .s-lead{margin:0 0 6px;max-width:440px}
.s-card{position:relative;background:var(--bg-2);border:1px solid var(--line);overflow:hidden}
.s-tag{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--line-2)}
.s-tag.red{color:var(--red-ink);background:var(--red);box-shadow:none}
.s-tag svg{width:12px;height:12px}
.s-ck{display:flex;align-items:flex-start;gap:10px;font-size:15px;line-height:1.45;color:var(--ink-2)}
.s-ck svg{width:15px;height:15px;color:var(--red);flex:none;margin-top:3px;stroke-width:2.6}
.s-link{white-space:nowrap;display:inline-flex;align-items:center;gap:8px;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);border-bottom:2px solid var(--red);padding-bottom:3px}
.s-link svg{width:15px;height:15px}
.btn.xl{height:60px;padding:0 34px;font-size:20px}
.btn.xl svg{width:18px;height:18px}
.s-note{font-size:12.5px;color:var(--ink-3)}

/* navigation */
.s-nav{position:relative;z-index:5;height:84px;display:flex;align-items:center;gap:34px;padding:0 48px;border-bottom:1px solid var(--line)}
.s-logo{display:flex;align-items:center;gap:10px}
.s-logo img{width:34px;height:34px}
.s-logo b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:1;text-transform:uppercase}
.s-nav nav{display:flex;gap:24px;margin-left:18px}
.s-nav nav a{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.s-nav nav a.on{color:var(--ink);box-shadow:0 2px 0 var(--red);padding-bottom:3px}
.s-nav .r{margin-left:auto;display:flex;align-items:center;gap:22px}
.s-nav .r > a{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink)}

/* héros */
.s-hero{position:relative;height:836px;overflow:hidden}
.s-hero .s-dots{right:0;top:0;width:760px;height:640px;-webkit-mask:linear-gradient(230deg,#000 0,transparent 65%)}
.s-hero .echo{position:absolute;left:-30px;bottom:-60px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:430px;line-height:.8;color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.06);white-space:nowrap;letter-spacing:-.02em;pointer-events:none}
.s-hl{position:absolute;left:120px;top:84px;width:640px;z-index:2}
.s-chip{display:inline-flex;align-items:center;gap:10px;height:34px;padding:0 14px 0 6px;background:var(--bg-2);border:1px solid var(--line-2);font-size:14px;color:var(--ink)}
.s-chip .s-tag{height:22px}
.s-h1{position:relative;margin-top:30px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:128px;line-height:.8;text-transform:uppercase;letter-spacing:-.012em}
.s-h1 span{display:block}
.s-h1 .br{position:relative;display:inline-block;isolation:isolate}
.s-h1 .br::after{content:"";position:absolute;z-index:-1;left:-30px;right:-70px;top:30%;height:76%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2.5deg)}
.s-hl .s-lead{margin-top:30px;font-size:18px;max-width:520px}
.s-acts{display:flex;align-items:center;gap:18px;margin-top:34px}
.s-trust{display:flex;gap:24px;margin-top:30px}
.s-trust .s-ck{font-size:14px;color:var(--ink-2)}
.s-shot{position:absolute;z-index:1;left:790px;top:118px;width:900px}
.s-shot::before{content:"";position:absolute;left:18px;top:18px;right:-18px;bottom:-18px;background:var(--red)}
.s-shot img.sc{position:relative;display:block;width:900px;border:1px solid var(--line-2);box-shadow:0 40px 90px -30px rgba(0,0,0,.9)}
.s-shot .pill{position:absolute;left:-44px;bottom:-28px;z-index:2;height:52px;display:flex;align-items:center;gap:9px;padding:0 20px 0 12px;background:rgba(10,10,11,.92);border:1px solid rgba(255,255,255,.14);box-shadow:0 20px 40px -10px rgba(0,0,0,.8)}
.s-shot .pill img{width:24px;height:24px}
.s-shot .pill b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px}
.s-shot .pill small{font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.s-shot .pill i{width:1px;height:18px;background:rgba(255,255,255,.2);margin:0 4px}
.s-tick{position:absolute;left:0;right:0;bottom:0;z-index:3;height:58px;display:flex;align-items:center;overflow:hidden;background:var(--red);color:var(--red-ink)}
.s-tick div{display:flex;gap:30px;white-space:nowrap;padding-left:40px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;text-transform:uppercase}
.s-tick em{font-style:normal;opacity:.45}

/* pourquoi */
.s-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:56px}
.s-step{padding:24px 24px 26px}
.s-step .n{font-family:var(--cond);font-weight:900;font-style:italic;font-size:54px;line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--red)}
.s-step .k{margin-top:18px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.s-step h3{margin-top:6px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:.9;text-transform:uppercase}
.s-step p{margin-top:12px;font-size:14.5px;line-height:1.5;color:var(--ink-2)}
.s-hit{margin-top:14px;padding:30px 32px 26px}
.s-hit .top{display:flex;align-items:baseline;justify-content:space-between}
.s-hit h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;text-transform:uppercase}
.s-hit .row{display:grid;grid-template-columns:130px 1fr;align-items:center;gap:20px;margin-top:22px}
.s-hit .row > b{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.s-hit .row.w > b{color:var(--ink)}
.s-track{position:relative;display:flex;height:40px;gap:3px}
.s-track i{display:block;height:100%;transform:skewX(var(--skew))}
.s-track .a{background:var(--red)}
.s-track .b{background:repeating-linear-gradient(-60deg,var(--red) 0 6px,rgba(255,59,48,.35) 6px 12px)}
.s-track .c{background:rgba(255,59,48,.35);box-shadow:inset 0 0 0 1.5px var(--red)}
.s-track .d{background:var(--bg-4)}
.s-ticks{position:relative;height:16px;margin:44px 0 0 150px;background:repeating-linear-gradient(90deg,var(--ink-3) 0 1.5px,transparent 1.5px 105px)}
.s-ticks span{position:absolute;left:0;top:-26px;white-space:nowrap;font-family:var(--cond);font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.s-leg{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0 0 150px}
.s-leg > div{display:flex;gap:10px}
.s-leg > div > div{display:flex;flex-direction:column;gap:2px}
.s-leg i{width:14px;height:14px;flex:none;margin-top:3px;transform:skewX(var(--skew))}
.s-leg b{display:block;font-family:var(--cond);font-weight:800;font-size:16px;letter-spacing:.04em;text-transform:uppercase}
.s-leg span{display:block;font-size:13px;color:var(--ink-3)}
.s-leg em{display:block;margin-top:4px;font-style:normal;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--red)}
.s-leg em.no{color:var(--ink-3)}
.s-hit .s-note{margin-top:22px}

/* dans l'app */
.s-feat{display:grid;grid-template-columns:1.35fr 1fr;gap:14px;margin-top:56px}
.s-mods{padding:26px 26px 24px;display:flex;flex-direction:column}
.s-mods .s-mg{flex:1;grid-auto-rows:1fr}
.s-split{margin-top:22px;padding-top:20px;border-top:1px solid var(--line)}
.s-split .bar{display:flex;height:12px;background:var(--bg-4);transform:skewX(var(--skew))}
.s-split .bar i{background:var(--red)}
.s-split .lg{display:flex;justify-content:space-between;align-items:baseline;margin-top:12px;font-size:14px;color:var(--ink-2)}
.s-split .lg b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;color:var(--ink);margin-right:6px}
.s-mods .t{display:flex;align-items:baseline;justify-content:space-between}
.s-mods h3,.s-fc h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:.9;text-transform:uppercase}
.s-mg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:20px}
.s-m{display:flex;align-items:center;gap:14px;min-height:64px;padding:10px 14px;background:var(--bg-3)}
.s-m.on{background:linear-gradient(90deg,rgba(255,59,48,.13),rgba(255,59,48,0) 85%),var(--bg-3);box-shadow:inset 3px 0 0 var(--red)}
.s-m svg.pi{width:26px;height:26px;flex:none}
.s-m b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:20px;line-height:1;text-transform:uppercase}
.s-m span{display:block;margin-top:3px;font-size:12.5px;line-height:1.3;color:var(--ink-3)}
.s-fcol{display:grid;gap:14px}
.s-fc{padding:24px 26px}
.s-fc p{margin-top:8px;font-size:14.5px;line-height:1.5;color:var(--ink-2)}
.s-srch{margin-top:16px;background:var(--bg-3);border:1px solid var(--line-2)}
.s-srch .in{display:flex;align-items:center;gap:10px;height:46px;padding:0 14px;border-bottom:1px solid var(--line);font-size:15px}
.s-srch .in svg{width:16px;height:16px;color:var(--ink-3)}
.s-srch .in kbd{margin-left:auto;height:22px;padding:0 7px;display:grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.06em;color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--line-2)}
.s-srch .r{display:flex;align-items:center;justify-content:space-between;height:40px;padding:0 14px;font-size:14px}
.s-srch .r.on{background:rgba(255,59,48,.1)}
.s-srch .r em{font-style:normal;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.s-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}
.s-chips span{position:relative;height:34px;padding:0 14px;display:inline-grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:14.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2);isolation:isolate}
.s-chips span::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bg-3);border:1px solid var(--line-2);transform:skewX(var(--skew))}
.s-chips span.on{color:var(--red-ink)}
.s-chips span.on::before{background:var(--red);border-color:var(--red)}
.s-toast{display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px 14px;background:var(--bg-3);border:1px solid var(--line-2);box-shadow:inset 3px 0 0 var(--ok)}
.s-toast svg{width:16px;height:16px;color:var(--ok)}
.s-toast b{font-size:14px}
.s-toast span{display:block;font-size:12.5px;color:var(--ink-3)}
.s-more{margin-top:26px}

/* nouveautés */
.s-bento{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-top:56px}
.s-b{padding:26px 26px 24px;display:flex;flex-direction:column}
.s-b h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:32px;line-height:.9;text-transform:uppercase}
.s-b p{margin-top:10px;font-size:14.5px;line-height:1.5;color:var(--ink-2)}
.s-b .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}
.s-b .vis{margin-bottom:22px}
.s-b.c6{grid-column:span 6}.s-b.c4{grid-column:span 4}.s-b.c3{grid-column:span 3}.s-b.c2{grid-column:span 2}
.s-b.ig{display:grid;grid-template-columns:1fr 400px;gap:34px;align-items:center;padding:0 40px 0 0}
.s-b.ig .vis{margin:0;position:relative;height:420px;overflow:hidden}
.s-b.ig .vis img{position:absolute;left:0;top:0;width:620px}
.s-b.ig h3{font-size:44px}
.s-b.ig kbd{display:inline-grid;place-items:center;height:26px;padding:0 9px;margin:0 2px;font-family:var(--cond);font-weight:800;font-size:14px;color:var(--ink);background:var(--bg-4);box-shadow:inset 0 -2px 0 rgba(0,0,0,.4)}
.s-ping{display:flex;align-items:flex-end;gap:26px}
.s-ping .big{font-family:var(--cond);font-weight:900;font-style:italic;font-size:92px;line-height:.78;color:var(--ink)}
.s-ping .big small{font-size:26px;color:var(--ink-2);margin-left:3px}
.s-ping .kv{display:grid;gap:4px;padding-bottom:4px}
.s-ping .kv span{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.s-ping .kv span b{color:var(--ink);margin-left:6px}
.s-srv{margin-top:16px;display:grid;gap:4px}
.s-srv div{display:flex;justify-content:space-between;height:36px;align-items:center;padding:0 12px;background:var(--bg-3);font-size:13.5px}
.s-srv div b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px}
.s-srv div.on b{color:var(--red)}
.s-ram .vis{flex:1;display:flex;flex-direction:column;justify-content:center}
.s-ram .big{font-family:var(--cond);font-weight:900;font-style:italic;font-size:92px;line-height:.78}
.s-ram .big small{font-size:26px;color:var(--ink-2)}
.s-seg{display:flex;gap:3px;margin-top:14px}
.s-seg i{flex:1;height:14px;background:var(--bg-4);transform:skewX(var(--skew))}
.s-seg i.on{background:var(--red)}
.s-ram .ok{display:flex;align-items:center;gap:7px;margin-top:12px;font-size:13.5px;color:var(--ink-2)}
.s-ram .ok svg{width:14px;height:14px;color:var(--ok)}
.s-covers{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.s-covers div{position:relative;aspect-ratio:3/4;overflow:hidden;background:var(--bg-3)}
.s-covers img{width:100%;height:100%;object-fit:cover;display:block}
.s-covers b{position:absolute;left:8px;bottom:8px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:15px;text-transform:uppercase;text-shadow:0 2px 6px rgba(0,0,0,.8)}
.s-covers div.on{box-shadow:inset 0 0 0 2px var(--red)}
.s-play{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:10px 12px;background:var(--bg-3);font-size:13.5px;color:var(--ink-2)}
.s-tkt{display:flex;align-items:stretch;background:var(--bg-3);border:1px solid var(--line-2)}
.s-tkt .l{flex:1;padding:14px 16px}
.s-tkt .l small{display:flex;justify-content:space-between;align-items:center;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.s-tkt .l b{display:block;margin-top:8px;font-family:var(--cond);font-weight:900;font-size:24px;letter-spacing:.05em;white-space:nowrap}
.s-tkt .l em{display:inline-flex;align-items:center;gap:5px;font-style:normal;color:var(--ok)}
.s-tkt .l em svg{width:13px;height:13px}
.s-tkt .r{width:96px;display:grid;place-items:center;border-left:2px dashed var(--line-2);font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--ok)}
.s-file{display:flex;align-items:center;gap:10px;margin-top:8px;padding:10px 14px;background:var(--bg-3);font-size:13.5px;color:var(--ink-2)}
.s-file svg{width:15px;height:15px;color:var(--red)}
.s-po{display:grid;gap:4px}
.s-po div{display:flex;justify-content:space-between;align-items:center;height:36px;padding:0 12px;background:var(--bg-3);font-size:13.5px;color:var(--ink-2)}
.s-po div b{color:var(--ink);font-weight:600}
.s-po div.rec{background:rgba(255,59,48,.12);box-shadow:inset 3px 0 0 var(--red);color:var(--ink)}
.s-po div.rec b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;text-transform:uppercase;color:var(--red)}
.s-cl .big{font-family:var(--cond);font-weight:900;font-style:italic;font-size:72px;line-height:.8}
.s-cl .big small{font-size:24px;color:var(--ink-2)}
.s-cl .ln{display:flex;justify-content:space-between;height:30px;align-items:center;border-top:1px solid var(--line);font-size:13.5px;color:var(--ink-2)}
.s-cl .ln b{color:var(--ink);font-weight:600}
.s-upd{display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;background:linear-gradient(135deg,rgba(255,59,48,.16),rgba(255,59,48,.04)),var(--bg-3);border:1px solid rgba(255,59,48,.45)}
.s-upd .t{flex:1}
.s-upd .t b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px;line-height:.9;text-transform:uppercase}
.s-upd .t span{font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.s-desk{position:relative;padding-top:52px;background:radial-gradient(120% 140% at 100% 100%,rgba(255,59,48,.10),transparent 60%),var(--bg-3)}
.s-desk .tip{position:absolute;right:56px;top:12px;padding:6px 10px;background:#2b2b2b;border:1px solid rgba(255,255,255,.09);border-radius:4px;box-shadow:0 6px 16px rgba(0,0,0,.4);font-family:Inter,"Segoe UI",sans-serif;font-size:12px;color:#eee}
.s-clock .up{width:14px;height:14px;transform:rotate(180deg);color:#bbb;margin-right:2px}
.s-clock{display:flex;align-items:center;justify-content:flex-end;gap:12px;height:56px;padding:0 14px;background:rgba(30,30,32,.94);border-top:1px solid rgba(255,255,255,.07);font-family:Inter,"Segoe UI",sans-serif;font-size:12px;color:#eee}
.s-clock img{width:18px;height:18px;padding:6px;box-sizing:content-box;background:rgba(255,255,255,.1);border-radius:4px}
.s-clock span{text-align:right;line-height:1.3}
.s-nd .big{font-family:var(--cond);font-weight:900;font-style:italic;font-size:60px;line-height:.82;text-transform:uppercase}
.s-nd .big span{display:block;color:transparent;-webkit-text-stroke:1.5px var(--ink-2)}
.s-fin{margin-top:22px;display:flex;align-items:center;gap:22px}

/* Rago Route */
.s-route{display:grid;grid-template-columns:1fr 560px;gap:60px;align-items:center;padding:56px 56px 56px 60px;background:radial-gradient(120% 120% at 100% 0%,rgba(255,59,48,.14),transparent 55%),var(--bg-2)}
.s-route .s-h2{font-size:72px}
.s-route ul{display:grid;gap:10px;margin-top:24px}
.s-map{position:relative;height:400px}
.s-map svg{position:absolute;left:0;top:10px;width:100%;height:360px;overflow:visible}
.s-map .end{position:absolute;display:flex;flex-direction:column;align-items:center;gap:8px}
.s-map .end i{width:20px;height:20px;background:var(--ink);transform:skewX(var(--skew))}
.s-map .end b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;text-transform:uppercase}
.s-map .cap{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);white-space:nowrap;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.s-map .cap b{color:var(--red)}
.s-map .ill{position:absolute;right:0;top:0}

/* comment ça marche */
.s-how{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:56px;border-top:1px solid var(--line-2)}
.s-how div{padding:28px 28px 0 0;border-right:1px solid var(--line);margin-right:28px}
.s-how div:last-child{border-right:0;margin-right:0}
.s-how b.n{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:110px;line-height:.78;color:var(--red)}
.s-how h3{margin-top:18px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:.9;text-transform:uppercase}
.s-how p{margin-top:10px;font-size:14.5px;line-height:1.5;color:var(--ink-2);padding-right:10px}

/* avis */
.s-revs{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:56px}
.s-rv{padding:26px 26px 24px;display:flex;flex-direction:column}
.s-rv .st{display:flex;gap:3px;color:var(--red)}
.s-rv .st i{width:16px;height:16px;background:var(--red);clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
.s-rv q{display:block;margin-top:16px;font-size:16px;line-height:1.55;color:var(--ink)}
.s-rv q::before,.s-rv q::after{content:""}
.s-rv .who{display:flex;align-items:center;gap:12px;margin-top:auto;padding-top:22px}
.s-rv .who i{width:38px;height:38px;display:grid;place-items:center;background:var(--bg-4);font-family:var(--cond);font-weight:900;font-style:italic;font-size:18px;font-style:normal}
.s-rv .who b{display:block;font-family:var(--cond);font-weight:800;font-size:16px;letter-spacing:.04em;text-transform:uppercase}
.s-rv .who span{font-size:12.5px;color:var(--ink-3)}
.s-mock{position:absolute;right:0;top:-40px;padding:6px 10px;border:1.5px dashed #FFB020;color:#FFB020;font-size:12px;font-weight:600;transform:rotate(1.5deg)}

/* formules */
.s-bill{display:inline-flex;align-items:center;gap:4px;padding:4px;background:var(--bg-2);border:1px solid var(--line-2)}
.s-bill span{position:relative;height:38px;padding:0 20px;display:inline-flex;align-items:center;gap:8px;font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);isolation:isolate}
.s-bill span.on{color:var(--red-ink)}
.s-bill span.on::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--red);transform:skewX(var(--skew))}
.s-bill em{font-style:normal;font-size:12px;opacity:.75;white-space:nowrap}
.s-plans{display:grid;grid-template-columns:1fr 1.18fr 1fr;gap:14px;margin-top:30px;align-items:stretch}
.s-pl{padding:30px 30px 28px;display:flex;flex-direction:column}
.s-pl.rec{border:1.5px solid var(--red);background:radial-gradient(120% 60% at 100% 0%,rgba(255,59,48,.14),transparent 60%),var(--bg-2);box-shadow:0 40px 80px -40px rgba(255,59,48,.35)}
.s-pl .hd{display:flex;align-items:center;justify-content:space-between}
.s-pl h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;line-height:.9;text-transform:uppercase}
.s-pl .sub{margin-top:6px;font-size:14.5px;color:var(--ink-2)}
.s-pl .pr{margin-top:24px;display:flex;align-items:baseline;gap:8px}
.s-pl .pr b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:80px;line-height:.8}
.s-pl .pr span{font-family:var(--cond);font-weight:800;font-size:18px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.s-pl .bil{margin-top:8px;font-size:13.5px;color:var(--ink-3);min-height:20px}
.s-pl ul{display:grid;gap:10px;margin:24px 0 26px;padding-top:22px;border-top:1px solid var(--line)}
.s-pl ul .s-ck{font-size:14px}
.s-pl ul .s-ck.lk svg{color:var(--ink-3)}
.s-pl ul .s-ck b{color:var(--ink);font-weight:600}
.s-pl .cta{margin-top:auto}
.s-pl .cta .btn{width:100%}
.s-pl .fine{margin-top:12px;font-size:12px;line-height:1.5;color:var(--ink-3)}
.s-pl .fine a{color:var(--ink-2);border-bottom:1px solid var(--red)}
.s-addon{display:flex;align-items:flex-start;gap:12px;margin:-8px 0 22px;padding:14px;background:var(--bg-3);border:1px solid var(--line-2)}
.s-addon .cb{width:18px;height:18px;flex:none;margin-top:2px;box-shadow:inset 0 0 0 1.5px var(--ink-3);transform:skewX(var(--skew))}
.s-addon b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;text-transform:uppercase}
.s-addon b em{font-style:normal;color:var(--red);margin-left:6px}
.s-addon p{margin-top:4px;font-size:12.5px;line-height:1.45;color:var(--ink-3)}
.s-pl.life{opacity:1}
.s-pl.life .soon{height:54px;display:grid;place-items:center;font-family:var(--cond);font-weight:800;font-size:17px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);border:1.5px dashed var(--line-2)}
.s-ronly{display:flex;align-items:center;gap:20px;margin-top:14px;padding:20px 26px;background:var(--bg-2);border:1px solid var(--line)}
.s-ronly p{flex:1;font-size:14.5px;color:var(--ink-2)}
.s-ronly p b{color:var(--ink);font-weight:600}
.s-cmp{margin-top:14px;padding:6px 0 0}
.s-cmp table{width:100%;border-collapse:collapse}
.s-cmp th{height:62px;padding:0 26px;text-align:left;font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;text-transform:uppercase}
.s-cmp th.c{width:240px;text-align:center}
.s-cmp th.p{color:var(--red)}
.s-cmp td{height:46px;padding:0 26px;border-top:1px solid var(--line);font-size:14.5px;color:var(--ink-2)}
.s-cmp td.c{text-align:center;color:var(--ink)}
.s-cmp td.p{background:rgba(255,59,48,.05)}
.s-cmp td svg{width:16px;height:16px;vertical-align:middle}
.s-cmp .y svg{color:var(--red);stroke-width:2.8}
.s-cmp .lk svg{color:var(--ink-3)}
.s-cmp .no{display:inline-block;width:12px;height:2px;background:var(--ink-3);vertical-align:middle}
.s-cmp .tx{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.04em;text-transform:uppercase}

/* FAQ */
.s-faq{display:grid;grid-template-columns:380px 1fr;gap:60px;align-items:start}
.s-faq .s-h2{font-size:80px}
.s-q{border-top:1px solid var(--line-2)}
.s-q:last-child{border-bottom:1px solid var(--line-2)}
.s-q .qh{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:62px;font-family:var(--cond);font-weight:800;font-size:21px;letter-spacing:.02em;text-transform:uppercase}
.s-q .pm{position:relative;width:16px;height:16px;flex:none}
.s-q .pm::before,.s-q .pm::after{content:"";position:absolute;left:0;top:7px;width:16px;height:2px;background:var(--ink-2)}
.s-q .pm::after{transform:rotate(90deg)}
.s-q.open .qh{color:var(--ink)}
.s-q.open .pm::before{background:var(--red)}
.s-q.open .pm::after{display:none}
.s-q .a{padding:0 60px 24px 0;font-size:15.5px;line-height:1.6;color:var(--ink-2)}

/* communauté, affiliation, partenaires */
.s-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.s-dc{display:flex;flex-direction:column;align-items:flex-start;padding:40px 40px 36px;background:radial-gradient(110% 110% at 0% 0%,rgba(88,101,242,.16),transparent 55%),var(--bg-2)}
.s-dc .s-h2,.s-af .s-h2{font-size:58px}
.s-dc ul,.s-af ol{display:grid;gap:10px;margin:22px 0 28px}
.s-af{padding:40px 40px 36px}
.s-chan{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:32px;width:100%}
.s-chan span{height:34px;padding:0 14px;display:inline-flex;align-items:center;background:rgba(255,255,255,.04);border:1px solid var(--line);font-size:14px;color:var(--ink-2)}
html.round .s-chan span{border-radius:9px}
.s-stuck{margin-top:34px;padding:26px}
.s-stuck h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:28px;line-height:.9;text-transform:uppercase}
.s-stuck p{margin:10px 0 20px;font-size:15px;line-height:1.5;color:var(--ink-2)}
.s-af ol{counter-reset:a}
.s-af ol li{display:flex;align-items:center;gap:14px;font-size:15px;color:var(--ink-2)}
.s-af ol li b{width:34px;height:34px;flex:none;display:grid;place-items:center;font-family:var(--cond);font-weight:900;font-style:italic;font-size:20px;color:var(--red-ink);background:var(--red);transform:skewX(var(--skew))}
.s-af .fr{display:flex;align-items:center;gap:14px;margin-bottom:26px}
.s-af .fr .s-seg{flex:1;margin:0}
.s-af .fr .s-seg i{height:18px}
.s-af .fr span{font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.s-pts{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:40px}
.s-pt{display:flex;align-items:center;gap:16px;padding:18px}
.s-pt img{width:64px;height:64px;flex:none;display:block}
.s-pt b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:20px;line-height:.95;text-transform:uppercase}
.s-pt span{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.s-pt span svg{width:12px;height:12px}

/* dernier appel et pied de page */
.s-final{position:relative;margin-top:120px;padding-bottom:110px;overflow:hidden;background:var(--red);color:var(--red-ink)}
.s-final .s-dots{inset:0;background:radial-gradient(circle,rgba(0,0,0,.16) 1.2px,transparent 1.6px) 0 0/9px 9px;-webkit-mask:linear-gradient(90deg,transparent 30%,#000)}
.s-final .in{position:relative;width:1200px;margin:0 auto;padding-top:92px}
.s-final .s-eb{color:rgba(10,10,11,.7)}
.s-final h2{margin-top:16px;max-width:900px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:110px;line-height:.82;text-transform:uppercase;letter-spacing:-.01em}
.s-final p{margin-top:22px;font-size:18px;color:rgba(10,10,11,.75)}
.s-final .s-acts .btn::before{background:var(--bg);border-color:var(--bg)}
.s-final .s-acts .btn{color:var(--ink)}
.s-final .s-acts .btn.gh::before{background:transparent;border:2px solid var(--bg)}
.s-final .s-acts .btn.gh{color:var(--bg)}
.s-final .big{position:absolute;right:-40px;bottom:-50px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:400px;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(10,10,11,.25);white-space:nowrap}
.s-foot{padding:60px 0 50px;border-top:1px solid var(--line)}
.s-foot .row{display:flex;align-items:flex-start;gap:60px}
.s-foot .cols{display:flex;gap:70px;margin-left:auto}
.s-foot .cols div{display:grid;gap:12px;align-content:start}
.s-foot .cols b{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.s-foot .cols a{font-size:14.5px;color:var(--ink-2)}
.s-foot .legal{margin-top:50px;padding:24px 300px 0 0;border-top:1px solid var(--line);font-size:12.5px;line-height:1.6;color:var(--ink-3)}
.s-foot .motto{margin-top:16px;font-family:var(--cond);font-weight:800;font-style:italic;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}

html.round .s-card,html.round .s-chip,html.round .s-bill,html.round .s-ronly{border-radius:22px}
html.round .s-m,html.round .s-srch,html.round .s-toast,html.round .s-srv div,html.round .s-po div,html.round .s-play,html.round .s-tkt,html.round .s-file,html.round .s-upd,html.round .s-addon,html.round .s-covers div{border-radius:12px}
html.round .s-tag{border-radius:7px}
html.round .s-shot img.sc{border-radius:18px}
html.round .s-shot::before{border-radius:22px}
html.round .s-shot .pill{border-radius:999px}
html.round .s-chip{border-radius:999px}
html.round .s-rv .who i{border-radius:10px}
html.round .s-pt img{border-radius:14px}
html.round .s-pl.life .soon{border-radius:12px}
html.round .s-clock{border-radius:0 0 12px 12px}
html.round .s-b.ig .vis{border-radius:22px 0 0 22px}
'''

ICON_MAP = [('network', 'network'), ('latency', 'latency'), ('graphics', 'gpu'), ('windows', 'windows'), ('hitreg', 'hitreg'),
            ('minecraft', 'minecraft'), ('rbw', 'rbw'), ('games', 'gamemode'), ('expert', 'expert'), ('restore', 'restore')]
MODS = {'network': ('Network', 'Ping, stability and hit registration.'), 'latency': ('Latency', 'Timers, priorities, CPU, memory and power.'),
        'gpu': ('Graphics card', 'NVIDIA, AMD and Intel, each with its own settings.'), 'windows': ('Windows', 'What runs for nothing in the background.'),
        'hitreg': ('Hitreg', 'The advanced suite so your hits land.'), 'minecraft': ('Minecraft', 'OptiFine, javaw priority and game traffic.'),
        'rbw': ('RBW Mod', 'Ready for a Ranked BedWars screenshare.'), 'gamemode': ('Game mode', 'Turn on before playing, off after.'),
        'expert': ('Expert mode', 'Kernel, boot and security settings. Powerful, use knowingly.'), 'restore': ('Restore', 'Always a way back.')}

FAQ = [
    ("Can I get banned for using Rago?", "Rago doesn't modify Minecraft or any other game and injects nothing into them: the in-game bar is a separate window over the game, and FPS are read from Windows. Rago changes Windows and network settings, the same ones you could change by hand. Some servers screenshare players and check Windows logs. A few Advanced tweaks change Windows services and settings that staff look at, and the ones that matter most say so. Turn on RBW Mod and restart your PC before a screenshare: it brings those services back."),
    ("Will it lower my ping?", ''), ("What's the difference between Free and Premium?", ''), ("Which games does it work with?", ''),
    ("Does it work on laptops?", ''), ("Does it work on Mac or Linux?", ''), ("How do I get the Premium role on Discord?", ''),
    ("I'm subscribed. Can I switch to Lifetime?", ''), ("Can I use my license on more than one PC?", ''), ("What if I don't like a change?", ''),
    ("Windows says “Windows protected your PC”. Is it safe?", ''), ("How do I uninstall Rago?", ''), ("My antivirus flagged Rago. Why?", ''),
    ("How does the affiliate program work?", ''),
]

Y, L, N = 'y', 'l', 'n'
CMP = [
    ('Tweaks unlocked', '73 of 218', 'All 218'), ('In-game bar: live FPS, ping, CPU, GPU and RAM', Y, Y), ('In-game bar: switch tweaks mid-match', L, Y),
    ('Network test', Y, Y), ('Packet Optimizer', L, Y), ('Presets: Minecraft PvP, Max FPS, Low latency, Laptop, Privacy and 15 games', L, Y),
    ('Game library', 'Launch games', 'Optimize and play'), ('Clean RAM, cleanup and driver check', Y, Y), ('Tweaks on at the same time', 'Up to 30', 'No limit'),
    ('Remove preinstalled apps', Y, Y), ('Rago Route, the anti-lag tunnel for Minecraft (beta)', L, '+$3/month or +$17.99/year'),
    ('Network, hitreg and most latency and graphics card tweaks', L, Y), ('Minecraft, Expert mode, RBW Mod Off and Game mode On', L, Y),
    ('Share and import presets', Y, Y), ('Restore point and undo for your tweaks', Y, Y), ('New tweaks from future versions', L, Y),
    ('Premium role on Discord', N, Y), ('Free trial', N, '3 days, card required'), ('How you pay', 'Free', 'Monthly or yearly'), ('License', 'Not needed', '1 PC per license'),
]

PARTNERS = [('Pika Ranked Bedwars', 'pika-ranked-bedwars'), ('Ranked Bedwars', 'ranked-bedwars'),
            ('Ranked Bedwars [SEASON 8]', 'ranked-bedwars-season-8'), ('Axora Ranked Bedwars', 'axora-ranked-bedwars')]

REVIEWS = [  # exemples pour la maquette : les vrais avis arrivent du serveur
    (5, 'My knockback feels the same every fight now, no more random spikes on Bedwars. The in-game bar is the best part.', 'Example player', 'Premium, 3 weeks'),
    (5, "Ran the network test, saw the jitter, turned on the Network preset. Hits finally land where I click.", 'Example player', 'Premium, 2 months'),
    (4, 'The free tweaks already cleaned up my laptop. Clear app, every tweak says what it does.', 'Example player', 'Free'),
]


def ck(t, lock=False):
    return f'<li class="s-ck{" lk" if lock else ""}"><i data-i="{"lock" if lock else "check"}"></i><span>{t}</span></li>'


def pi(key, state='on'):
    return PI[key][state]


def nav(active=None, cta='Try 3 days free'):
    links = ['Why Rago', 'Features', "What's new", 'Rago Route', 'Tweaks', 'Reviews', 'Pricing', 'FAQ']
    return ('<header class="s-nav"><a class="s-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b></a><nav>'
            + ''.join(f'<a{" class=on" if l == active else ""}>{l}</a>' for l in links)
            + f'</nav><div class="r"><a>Sign in</a><span class="btn red">{cta}</span></div></header>')


def hero():
    tick = ' '.join(f'<span>{t}</span><em>//</em>' for t in
                    ['Minecraft PvP', 'Valorant', 'CS2', 'Fortnite', 'Apex Legends', '218 tweaks', '20 presets', 'Windows 10 and 11', 'Minecraft PvP', 'Valorant'])
    return f'''<section class="s-hero">
  <span class="s-dots"></span><span class="echo">rago</span>
  <div class="s-hl">
    <span class="s-chip"><span class="s-tag red">new</span>Try Premium free for 3 days</span>
    <p class="s-eb" style="margin-top:34px">Minecraft PvP optimizer <b>//</b> for Windows</p>
    <h1 class="s-h1"><span>every</span><span>millisecond</span><span class="br">counts.</span></h1>
    <p class="s-lead">Steadier ping, smoother frames, less input lag. Rago tunes Windows, your network and Minecraft, and puts your settings back when you turn a tweak off.</p>
    <div class="s-acts"><span class="btn red xl"><i data-i="zap"></i>try premium free</span><span class="btn xl"><i data-i="download"></i>download free</span></div>
    <ul class="s-trust"><li class="s-ck"><i data-i="check"></i>Free to start</li><li class="s-ck"><i data-i="check"></i>Restore point offered</li><li class="s-ck"><i data-i="check"></i>Windows 10 and 11</li></ul>
  </div>
  <div class="s-shot"><img class="sc" src="img/site/shot-dashboard.png" alt="">
    <div class="pill"><img src="img/rago-app-dark-32.svg" alt=""><b>240</b><small>fps</small><i></i><b>18</b><small>ms</small></div></div>
  <div class="s-tick"><div>{tick}</div></div>
</section>'''


def why():
    steps = [('01', 'the journey', 'Every hit takes a trip.', 'Your click goes through your mouse, your PC, your network, then the server. The server checks hits on a fixed beat, 20 times a second.'),
             ('02', 'input lag', 'Your click leaves faster.', 'Mouse acceleration makes your aim inconsistent. USB power saving and input queues add delay before your PC even sees the click. Rago turns them off.'),
             ('03', 'frame time', 'Your frames stop stuttering.', 'CPU power states and core parking cause uneven frames. Rago keeps the CPU awake so each frame takes the same time.'),
             ('04', 'ping jitter', 'Your timing gets consistent.', "The distance to the server doesn't change. What changes is how much your timing jumps around, so more hits land in the beat they were meant for.")]
    st = ''.join(f'<div class="s-card s-step"><b class="n">{n}</b><p class="k">{k}</p><h3>{h}</h3><p>{p}</p></div>' for n, k, h, p in steps)
    return f'''<section class="s-sec" id="why"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">why rago <b>//</b> the server decides</p><h2 class="s-h2">why your hits<br>don't register</h2></div>
  <p class="s-lead">The server decides. <b>Your timing decides what it sees.</b> Here is what happens between your click and the server.</p></div>
  <div class="s-steps">{st}</div>
  <div class="s-card s-hit">
    <div class="top"><h3>what delays your hit</h3><span class="s-tag">illustration</span></div>
    <div class="s-ticks"><span>server checks hits 20 times a second</span></div>
    <div class="row"><b>before</b><div class="s-track"><i class="a" style="width:19%"></i><i class="b" style="width:17%"></i><i class="c" style="width:21%"></i><i class="d" style="width:43%"></i></div></div>
    <div class="row w"><b>with rago</b><div class="s-track"><i class="a" style="width:10%"></i><i class="b" style="width:12%"></i><i class="c" style="width:8%"></i><i class="d" style="width:43%"></i></div></div>
    <div class="s-leg">
      <div><i style="background:var(--red)"></i><div><b>input lag</b><span>Your mouse and PC</span><em>shorter</em></div></div>
      <div><i style="background:repeating-linear-gradient(-60deg,var(--red) 0 4px,rgba(255,59,48,.35) 4px 8px)"></i><div><b>frame time</b><span>Your CPU and GPU</span><em>steadier</em></div></div>
      <div><i style="background:rgba(255,59,48,.35);box-shadow:inset 0 0 0 1.5px var(--red)"></i><div><b>ping jitter</b><span>Your connection</span><em>steadier</em></div></div>
      <div><i style="background:var(--bg-4)"></i><div><b>distance to the server</b><span>The road itself</span><em class="no">rago can't change this</em></div></div>
    </div>
    <p class="s-note">An illustration of where delay comes from, not a measurement.</p>
  </div>
</div></section>'''


def features():
    mods = ''.join(f'<div class="s-m{" on" if k == "latency" else ""}">{pi(ik, "on")}<div><b>{MODS[k][0]}</b><span>{MODS[k][1]}</span></div></div>'
                   for ik, k in ICON_MAP)
    chips = ''.join(f'<span{" class=on" if c == "Minecraft PvP" else ""}>{c}</span>' for c in ['Minecraft PvP', 'Max FPS', 'Low latency', 'Valorant', 'Fortnite', 'CS2', 'Laptop'])
    return f'''<section class="s-sec" id="features"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">inside the app <b>//</b> 218 tweaks</p><h2 class="s-h2">nearly 220 tweaks.<br>one clear app.</h2></div>
  <p class="s-lead">Pick a section to see what it changes. <b>Every tweak says what it does</b>, and what it costs, before it runs.</p></div>
  <div class="s-feat">
    <div class="s-card s-mods"><div class="t"><h3>ten sections</h3><span class="s-tag">free and premium</span></div><div class="s-mg">{mods}</div><div class="s-split"><div class="bar"><i style="width:33.5%"></i></div><div class="lg"><span><b>73</b>free tweaks, up to 30 on at once</span><span><b>218</b>with Premium, no limit</span></div></div></div>
    <div class="s-fcol">
      <div class="s-card s-fc"><h3>find any tweak</h3><p>Press Ctrl+K and type.</p>
        <div class="s-srch"><div class="in"><i data-i="search"></i>disable<kbd>ctrl k</kbd></div>
        <div class="r on"><span>Disable mouse acceleration</span><em>latency</em></div><div class="r"><span>Disable Game DVR</span><em>windows</em></div><div class="r"><span>Disable NIC power saving</span><em>network</em></div></div></div>
      <div class="s-card s-fc"><h3>start from a preset</h3><p>One click selects a tested set: 20 presets, 15 of them made for a game.</p><div class="s-chips">{chips}</div></div>
      <div class="s-card s-fc"><h3>always a way back</h3><p>Turn a tweak off and your settings go back the way they were. A restore point is offered before advanced tweaks.</p>
        <div class="s-toast"><i data-i="check"></i><div><b>Restore point created</b><span>Restore Windows with System Restore.</span></div></div></div>
    </div>
  </div>
  <p class="s-more"><a class="s-link">all 218 tweaks, explained one by one <i data-i="arrow"></i></a></p>
</div></section>'''


def new():
    covers = ''.join(f'<div{" class=on" if g == "minecraft" else ""}><img src="img/site/games/{g}.webp" alt=""><b>{n}</b></div>'
                     for g, n in [('minecraft', 'Minecraft'), ('valorant', 'Valorant'), ('cs2', 'CS2'), ('fortnite', 'Fortnite')])
    seg = ''.join(f'<i{" class=on" if i < 12 else ""}></i>' for i in range(20))
    return f'''<section class="s-sec" id="new"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">new in version 1.2 <b>//</b> in game and around it</p><h2 class="s-h2">now rago<br>plays with you.</h2></div>
  <p class="s-lead">An in-game bar, the Packet Optimizer, your game library, a network test and cleanup tools. <b>Your tweaks work exactly as before.</b></p></div>
  <div class="s-bento">
    <div class="s-card s-b c6 ig"><div class="vis"><img src="img/site/shot-ingame.png" alt=""></div>
      <div><span class="s-tag red">alt+x</span><h3 style="margin-top:16px">the in-game bar</h3>
      <p>Press <kbd>Alt+X</kbd> in game. FPS, ping, CPU, GPU and RAM show over your game, with 21 tweaks you can switch mid-match. Esc takes you straight back.</p>
      <p>Ping is measured to the server of your match, in Minecraft, Valorant, CS2, Fortnite and more, and FPS and ping can stay pinned on screen.</p>
      <div class="tags"><span class="s-tag">free <b style="color:var(--ink);margin-left:4px">live fps, ping and usage</b></span><span class="s-tag">premium <b style="color:var(--ink);margin-left:4px">switch tweaks in game</b></span></div></div></div>
    <div class="s-card s-b c3"><div class="vis"><div class="s-ping"><div class="big">17<small>ms</small></div><div class="kv"><span>jitter<b>1.2 ms</b></span><span>packet loss<b>0 %</b></span></div></div>
      <div class="s-srv"><div class="on"><span>Frankfurt, Central Europe</span><b>17 ms</b></div><div><span>Minemen Club, Europe</span><b>21 ms</b></div><div><span>Hypixel, North America</span><b>96 ms</b></div></div></div>
      <h3>network test</h3><p>Ping, jitter and packet loss to Hypixel, Minemen Club, game server regions or any server you type. Nothing on your PC is changed.</p><div class="tags"><span class="s-tag">free</span></div></div>
    <div class="s-card s-b c3 s-ram"><div class="vis"><div class="big">58<small>% memory in use</small></div><div class="s-seg">{seg}</div><p class="ok"><i data-i="check"></i>2.1 GB of cache cleared</p></div>
      <h3>clean ram</h3><p>One click empties the memory Windows keeps on standby, from the Dashboard or the in-game bar. Your game and anti-cheat are never touched.</p><div class="tags"><span class="s-tag">free</span></div></div>
    <div class="s-card s-b c2"><div class="vis"><div class="s-covers">{covers}</div><div class="s-play"><span>Preset: Minecraft PvP, 12 tweaks</span><span class="s-tag red"><i data-i="play"></i>play</span></div></div>
      <h3>your game library</h3><p>Rago finds your games in Steam, Epic Games, Riot, Battle.net, the EA app, Ubisoft Connect, the Xbox app, Roblox and Minecraft launchers like Lunar, Badlion and Feather.</p><div class="tags"><span class="s-tag">free</span><span class="s-tag">premium optimize and play</span></div></div>
    <div class="s-card s-b c2"><div class="vis"><div class="s-tkt"><div class="l"><small>share a preset, 14 tweaks on<em><i data-i="check"></i>copied</em></small><b>RAGO1-K7QX-2M9P-VD4T</b></div></div><div class="s-file"><i data-i="filetext"></i>pvp-setup.rago</div></div>
      <h3>share your presets</h3><p>Turn your setup into a code or a .rago file. A friend sees what changes on their PC before importing it.</p><div class="tags"><span class="s-tag">free</span></div></div>
    <div class="s-card s-b c2"><div class="vis"><div class="s-po"><div><span>Network card</span><b>Cable</b></div><div><span>Processor and Windows</span><b>16 threads</b></div><div><span>Line quality</span><b>18 ms, 0 of 40 lost</b></div><div class="rec"><span>Recommended</span><b>hitreg</b></div></div></div>
      <h3>packet optimizer</h3><p>Changes how Windows sends, receives and re-sends your packets, for fewer stalls in hitreg and knockback.</p><div class="tags"><span class="s-tag red">premium</span></div></div>
    <div class="s-card s-b c2 s-cl"><div class="vis"><div class="big">3.9<small>gb</small></div><div style="margin-top:12px"><div class="ln"><span>Temporary files</span><b>1.2 GB</b></div><div class="ln"><span>Windows Update downloads</span><b>1.1 GB</b></div><div class="ln"><span>Shader cache</span><b>860 MB</b></div></div></div>
      <h3>tools</h3><p>Free up space, check how old your drivers are, and remove the apps Windows installs on its own.</p><div class="tags"><span class="s-tag">free</span></div></div>
    <div class="s-card s-b c2"><div class="vis"><div class="s-upd"><div class="t"><b>update</b><span>ready to install</span></div><span class="btn red sm" style="height:34px;padding:0 14px;font-size:14px">restart</span></div></div>
      <h3>automatic updates</h3><p>New versions download in the background and install when you close the app, or right away with Restart. Never during a run.</p><div class="tags"><span class="s-tag">every plan</span></div></div>
    <div class="s-card s-b c2"><div class="vis"><div class="s-desk"><span class="tip">Rago Optimizer</span><div class="s-clock"><i data-i="chev" class="up"></i><img src="img/rago-app-dark-32.svg" alt=""><span>21:42<br>19/10/2026</span></div></div></div>
      <h3>ready in the background</h3><p>Close the window and Rago stays by the clock, ready for the shortcut. Turn on Start with Windows and it's there when you sign in.</p><div class="tags"><span class="s-tag">every plan</span></div></div>
  </div>
  <div class="s-fin"><span class="btn red lg"><i data-i="download"></i>download free</span><a class="s-link"><i data-i="chat"></i>talk about 1.2 on discord</a><span class="s-note" style="margin-left:auto">Illustrations of Rago Optimizer 1.2. The numbers are examples, not measurements.</span></div>
</div></section>'''


def route():
    # deux routes de Paris à Hypixel ; un paquet perdu sur la route 1 passe par la route 2
    pk = lambda pts, c: ''.join(f'<rect x="{x-7}" y="{y-7}" width="14" height="14" fill="{c}" transform="rotate(-12 {x} {y})"/>' for x, y in pts)
    cond = 'font-family="Barlow Condensed" font-weight="800" font-size="14" letter-spacing="1.6" text-anchor="middle"'
    big = 'font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="26"'
    svg = f'''<svg viewBox="0 0 560 360"><path d="M100 190 C 190 70, 370 70, 460 190" fill="none" stroke="#ECE9E2" stroke-width="3" stroke-dasharray="10 8"/>
      <path d="M100 190 C 190 310, 370 310, 460 190" fill="none" stroke="#FF3B30" stroke-width="5"/>{pk([(163, 132), (220, 108)], "#ECE9E2")}{pk([(200, 266), (280, 280), (378, 258)], "#FF3B30")}
      <g transform="translate(280 100)"><circle r="17" fill="#0A0A0B" stroke="#FF3B30" stroke-width="2.5"/><path d="M-6 -6 6 6M6 -6-6 6" stroke="#FF3B30" stroke-width="3"/></g>
      <rect x="91" y="181" width="18" height="18" fill="#ECE9E2"/><rect x="451" y="181" width="18" height="18" fill="#FF3B30"/>
      <text x="84" y="199" text-anchor="end" fill="#ECE9E2" {big}>PARIS</text><text x="476" y="199" fill="#ECE9E2" {big}>HYPIXEL</text>
      <text x="280" y="64" fill="#A1A1AA" {cond}>ROAD 1</text>
      <text x="280" y="318" fill="#FF3B30" {cond}>ROAD 2</text></svg>'''
    return f'''<section class="s-sec" id="route"><div class="sw5"><div class="s-card s-route">
  <div><p class="s-eb">rago route <b>//</b> new premium option, in beta</p><h2 class="s-h2">your pc is tuned.<br>now rago takes<br>the road.</h2>
  <p class="s-lead">A ping spike mid-fight, a freeze right before a clutch, a Wi-Fi drop that kicks you from the match: often it isn't your PC, it's the road to the server. Rago Route sends every packet on two roads and quickly rebuilds or resends what's lost, so your game waits less.</p>
  <ul>{ck('Two roads for every packet')}{ck("Lost packets rebuilt or sent again, fast")}{ck('Your connection held open through a short cut')}</ul>
  <div class="s-acts"><span class="btn red lg">discover rago route<i data-i="arrow"></i></span><a class="s-link"><i data-i="chat"></i>get notified on discord</a></div></div>
  <div class="s-map">{svg}
    <span class="s-tag ill">illustration</span><p class="cap">lost on road 1 <b>//</b> delivered by road 2</p></div>
</div></div></section>'''


def how():
    st = [('Download free', 'Windows 10 and 11. No account needed.'), ('Try the free tweaks', '73 tweaks open, up to 30 on at once. The rest show a lock.'),
          ('Try Premium free', '3 days free with Stripe. Cancel anytime before day 3 and pay nothing.'), ('Sign in and unlock', 'With Google, Discord or email. All 218 tweaks, no limit.')]
    cells = ''.join(f'<div><b class="n">{i}</b><h3>{h}</h3><p>{p}</p></div>' for i, (h, p) in enumerate(st, 1))
    return f'''<section class="s-sec" id="how"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">how it works <b>//</b> four steps</p><h2 class="s-h2">four steps to<br>your next match.</h2></div></div>
  <div class="s-how">{cells}</div></div></section>'''


def reviews():
    cards = ''
    for n, q, who, sub in REVIEWS:
        stars = ''.join('<i></i>' if i < n else '<i style="background:var(--bg-4)"></i>' for i in range(5))
        cards += f'<div class="s-card s-rv"><div class="st">{stars}</div><q>{q}</q><div class="who"><i>E</i><div><b>{who}</b><span>{sub}</span></div></div></div>'
    return f'''<section class="s-sec" id="reviews"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">reviews <b>//</b> from signed-in players</p><h2 class="s-h2">players feel<br>the difference.</h2></div>
  <p class="s-lead">Left by players, in Rago Optimizer or from their account. Results depend on your PC and connection.</p></div>
  <div style="position:relative"><span class="s-mock">maquette : avis d'exemple, les vrais arrivent du serveur</span><div class="s-revs">{cards}</div></div>
  <p class="s-more"><a class="s-link">see all reviews <i data-i="arrow"></i></a></p></div></section>'''


def cell(v, prem=False):
    if v == Y:
        return '<span class="y"><i data-i="check"></i></span>'
    if v == L:
        return '<span class="lk"><i data-i="lock"></i></span>'
    if v == N:
        return '<span class="no"></span>'
    return f'<span class="tx">{v}</span>'


def plans():
    rows = ''.join(f'<tr><td>{a}</td><td class="c">{cell(b)}</td><td class="c p">{cell(c, True)}</td></tr>' for a, b, c in CMP)
    free = ''.join([ck('In-game bar: live FPS, ping, CPU, GPU and RAM'), ck('Network test to Hypixel, Minemen Club and game regions'), ck('Clean RAM in one click, cleanup and driver check'),
                    ck('Game library and preset sharing'), ck('<b>73 tweaks open</b>, up to 30 on at once'), ck('Remove preinstalled apps in Tools'),
                    ck('Network and hitreg tweaks, presets and Packet Optimizer locked', True)])
    prem = ''.join([ck('<b>All 218 tweaks</b>, with RBW Mod, Game mode and Expert mode'), ck('Packet Optimizer for hitreg and knockback, tuned to your line'),
                    ck('<b>20 presets</b>, 15 made for a game: Valorant, Fortnite, CS2…'), ck('Optimize and play: your preset applied, then your game starts'),
                    ck('21 tweaks to switch mid-match from the in-game bar'), ck('No limit on the tweaks you keep on'), ck('Every new tweak and preset from future versions'),
                    ck('The Premium role on Discord')])
    life = ''.join([ck('<b>Everything in Premium</b>, with nothing to renew'), ck('Every future version: new tweaks, presets and features'),
                    ck('Already subscribed? Switch from your account page'), ck('The Premium role on Discord')])
    return f'''<section class="s-sec" id="plans"><div class="sw5">
  <div class="s-head"><div><p class="s-eb">pricing <b>//</b> start free</p><h2 class="s-h2">start free. unlock<br>everything with premium.</h2></div>
  <div class="s-bill"><span>monthly</span><span class="on">yearly <em>6 months free</em></span></div></div>
  <div class="s-plans">
    <div class="s-card s-pl"><div class="hd"><h3>free</h3></div><p class="sub">Watch, test and clean your PC.</p>
      <div class="pr"><b>$0</b><span>forever</span></div><p class="bil">No license needed</p><ul>{free}</ul>
      <div class="cta"><span class="btn lg"><i data-i="download"></i>download free</span><p class="fine">Windows 10 and 11</p></div></div>
    <div class="s-card s-pl rec"><div class="hd"><h3>premium</h3><span class="s-tag red">recommended</span></div><p class="sub">Every optimization, for every game.</p>
      <div class="pr"><b>$2.50</b><span>/ month</span></div><p class="bil">Billed $29.99 yearly. 6 months free.</p><ul>{prem}<li class="s-ck" style="color:var(--ink-3)"><i data-i="info" style="color:var(--ink-3)"></i>One license, one PC.</li></ul>
      <div class="s-addon"><i class="cb"></i><div><b>add rago route<em>+$17.99/year</em></b><p>The anti-lag tunnel for Minecraft, in beta: two roads for every packet. Included in the free trial. <a style="color:var(--ink-2);border-bottom:1px solid var(--red)">What it does</a></p></div></div>
      <div class="cta"><span class="btn red lg"><i data-i="zap"></i>start 3-day free trial</span>
      <p class="fine">Card required. Free for 3 days, then the monthly plan at $5.99 a month, charged automatically on day 3 unless you cancel before. Cancel in two clicks from your account. One trial per person.</p>
      <p class="fine"><a>Skip the trial and buy now</a> &nbsp; Secure checkout with Stripe. Cancel anytime. No refunds: try it free first.</p></div></div>
    <div class="s-card s-pl life"><div class="hd"><h3>lifetime</h3><span class="s-tag">coming soon</span></div><p class="sub">Premium for good, paid once.</p>
      <div class="pr"><b>$59.99</b><span>once</span></div><p class="bil">One-time payment. No renewals.</p><ul>{life}</ul>
      <div class="cta"><div class="soon">coming soon</div><p class="fine">One-time payment. No refunds.</p></div></div>
  </div>
  <div class="s-ronly"><i data-i="globe" style="width:20px;height:20px;color:var(--red)"></i><p><b>Already Premium?</b> Add only Rago Route, the anti-lag tunnel for Minecraft (beta): $3 a month or $17.99 a year on top of your Premium, its own subscription, cancel anytime.</p><a class="s-link">see what it does</a><span class="btn">add rago route</span></div>
  <div class="s-card s-cmp"><table><thead><tr><th>what you get</th><th class="c">free</th><th class="c p">premium</th></tr></thead><tbody>{rows}</tbody></table></div>
</div></section>'''


def faq():
    qs = ''
    for i, (q, a) in enumerate(FAQ):
        op = i == 0
        qs += f'<div class="s-q{" open" if op else ""}"><div class="qh">{q}<span class="pm"></span></div>' + (f'<p class="a">{a}</p>' if op else '') + '</div>'
    return f'''<section class="s-sec" id="faq"><div class="sw5"><div class="s-faq">
  <div><p class="s-eb">faq <b>//</b> 14 answers</p><h2 class="s-h2">before<br>you buy.</h2><div class="s-card s-stuck"><h3>still stuck?</h3><p>Open a support ticket on the Discord. The staff answers.</p><span class="btn red"><i data-i="chat"></i>open a ticket</span></div></div>
  <div>{qs}</div></div></div></section>'''


def community():
    fr = ''.join('<i></i>' for _ in range(3))
    pts = ''.join(f'<div class="s-card s-pt"><img src="img/site/partners/{f}.webp" alt=""><div><b>{n}</b><span><i data-i="external"></i>join on discord</span></div></div>' for n, f in PARTNERS)
    return f'''<section class="s-sec" id="community"><div class="sw5">
  <div class="s-two">
    <div class="s-card s-dc"><p class="s-eb">community <b>//</b> discord</p><h2 class="s-h2">join the<br>rago discord.</h2>
      <p class="s-lead" style="font-size:15.5px">Get help, share your presets with other players and hear about new versions first.</p>
      <ul>{ck('Support tickets, answered by our staff')}{ck('The Premium channel, after purchase')}{ck('Update notes as soon as a version ships')}</ul>
      <span class="btn red lg"><i data-i="chat"></i>join our discord</span>
      <div class="s-chan"><span>#support</span><span>#presets</span><span>#updates</span><span>#premium</span></div></div>
    <div class="s-card s-af"><p class="s-eb">affiliate program <b>//</b> up to 3 friends</p><h2 class="s-h2">bring 3 players.<br>get 6 months.</h2>
      <p class="s-lead" style="font-size:15.5px">Get your own code and share it. Your friends get 5% off their first Premium payment with it. 3 friends who activate the app give you 6 months of Premium.</p>
      <ol><li><b>1</b>Join and get your code</li><li><b>2</b>Friends get 5% off with your code</li><li><b>3</b>3 paying friends, 6 months of Premium</li></ol>
      <div class="fr"><div class="s-seg">{fr}</div><span>0 / 3 friends</span></div>
      <span class="btn lg">join the affiliate program</span></div>
  </div>
  <div class="s-head" style="margin-top:110px"><div><p class="s-eb">partners <b>//</b> minecraft pvp communities</p><h2 class="s-h2" style="font-size:64px">our partner servers.</h2></div><a class="s-link" style="margin-bottom:10px">see all partners <i data-i="arrow"></i></a></div>
  <div class="s-pts">{pts}</div>
</div></section>'''


def final():
    return '''<section class="s-final"><span class="s-dots"></span><span class="big">gg</span><div class="in">
  <p class="s-eb">your next match</p><h2>tune your pc once. feel it on the first combo.</h2><p>Start free, or try Premium free for 3 days.</p>
  <div class="s-acts"><span class="btn xl"><i data-i="zap"></i>try premium free</span><span class="btn xl gh"><i data-i="download"></i>download free</span></div></div></section>
''' + footer()


def footer():
    return '''<footer class="s-foot"><div class="sw5"><div class="row"><div><a class="s-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b></a><p class="motto">every millisecond counts.</p></div>
  <div class="cols"><div><b>product</b><a>Features</a><a>Tweaks</a><a>Rago Route</a><a>Pricing</a><a>FAQ</a></div><div><b>community</b><a>Discord</a><a>Partners</a><a>Affiliate program</a><a>Reviews</a></div><div><b>account</b><a>Sign in</a><a>Create account</a></div><div><b>legal</b><a>Terms</a><a>Privacy</a><a>Cancellation</a></div></div></div>
  <p class="legal">Rago Optimizer changes Windows settings. Results depend on your hardware and connection. A restore point is offered before advanced tweaks. Minecraft is a trademark of Mojang Studios; Rago Optimizer isn't affiliated with Mojang or Microsoft. © 2026 Rago Optimizer, by KALISO and RAGO.</p></div></footer>'''


def home():
    body = nav() + hero() + why() + features() + new() + route() + how() + reviews() + plans() + faq() + community() + final()
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="rago5.css">
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="round.css">
<link rel="stylesheet" href="site5.css">
<script>for (const c of ['round','poster']) if (location.hash.includes(c)) document.documentElement.classList.add(c);</script>
<title>Rago Optimizer, home</title>
</head>
<body><div class="win site">
{body}
</div>
<script src="icons.js"></script>
</body></html>
'''


if __name__ == '__main__':
    (OUT / 'site5.css').write_text(CSS)
    (OUT / 'site-home.html').write_text(home())
    print('wrote site5.css, site-home.html')
