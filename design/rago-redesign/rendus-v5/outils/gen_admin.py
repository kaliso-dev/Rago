# Lot 6 : admin interne (account.rago-optimizer.com/admin), interface en français.
# Textes repris de licensing/src/admin-views.js, admin.js, billing.js, discord.js, community.js, brain-views.js (22/11/2026).
# Chiffres, e-mails, clés et villes = exemples de maquette. Seuls les prix (5,99 $US/mois, 29,99 $US/an) sont les vrais.
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import gen_site as G
from print_admin import picon, DEFS
from gen_route import page

OUT = G.OUT

CSS = r'''
/* icônes imprimées (print_admin.py) : taille par défaut, puis couleurs selon le contexte */
svg.pi{width:16px;height:16px;flex:none;overflow:visible}
:root{--warn:#FFC53D}
.win.adm{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:900px;font-variant-numeric:tabular-nums}
.win.adm::after{right:0;width:560px;height:360px}
.num{font-variant-numeric:tabular-nums}
.dim{color:var(--ink-3)}
.mut{color:var(--ink-2)}
.small{font-size:12.5px}
.nw{white-space:nowrap}

/* ---------- barre latérale ---------- */
.ad-side{position:relative;z-index:3;display:flex;flex-direction:column;padding:24px 14px 18px;background:var(--bg-2);border-right:1px solid var(--line)}
.ad-logo{display:flex;align-items:center;gap:10px;padding:0 8px 22px}
.ad-logo img{width:34px;height:34px}
.ad-logo b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:1;text-transform:uppercase}
.ad-logo span{margin-left:2px;padding:3px 7px 2px;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--red-ink);background:var(--red);transform:skewX(var(--skew))}
.ad-q{display:flex;align-items:center;gap:9px;height:38px;margin:0 2px 8px;padding:0 12px;background:var(--bg-3);border:1px solid var(--line-2);font-size:13px;color:var(--ink-3)}
.ad-q kbd{margin-left:auto;font-family:var(--cond);font-weight:700;font-size:12px;color:var(--ink-3);border:1px solid var(--line-2);padding:0 6px}
.ad-side .grp{font-family:var(--cond);font-weight:700;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);padding:16px 12px 6px}
.ad-side nav a{position:relative;display:flex;align-items:center;gap:11px;height:36px;padding:0 12px;color:var(--ink-2);font-family:var(--cond);font-weight:900;font-style:italic;font-size:17.5px;letter-spacing:.01em;text-transform:uppercase}
.ad-side nav a svg{width:16px;height:16px}
.ad-side nav a.on{color:var(--ink);background:linear-gradient(90deg,rgba(255,59,48,.13),rgba(255,59,48,0) 85%)}
.ad-side nav a.on svg{color:var(--red)}
.ad-side nav a.on::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;background:var(--red);border-radius:3px}
.ad-side nav a em{margin-left:auto;font-style:normal;font-family:var(--cond);font-weight:700;font-size:13px;letter-spacing:.04em;color:var(--ink-3)}
.ad-side nav a em.al{min-width:20px;height:20px;display:grid;place-items:center;padding:0 6px;background:var(--red);color:var(--red-ink);font-weight:800}
.ad-side nav a i.dot{margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--warn)}
.ad-sfoot{margin-top:auto;padding:14px 6px 0;border-top:1px solid var(--line)}
.ad-sfoot .env{display:flex;flex-wrap:wrap;gap:6px}
.ad-sfoot .lk{display:flex;gap:16px;margin-top:14px;padding:0 4px}
.ad-sfoot .lk a{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ink-2)}
.ad-sfoot .lk svg{width:14px;height:14px}

/* ---------- contenu ---------- */
.ad-main{position:relative;z-index:1;min-width:0;padding:34px 44px 56px}
.ad-head{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-bottom:26px}
.ad-head h1{margin-top:12px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:76px;line-height:.86;text-transform:uppercase;letter-spacing:-.008em}
.ad-head .sub{margin-top:14px;max-width:720px;font-size:15px;line-height:1.55;color:var(--ink-2)}
.ad-head .acts{display:flex;align-items:center;gap:10px;flex:none}
.ad-crumbs{display:flex;align-items:center;gap:8px;font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.ad-crumbs a{color:var(--ink-2)}
.ad-crumbs svg{width:13px;height:13px}
.ad-stamp{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-3)}
.ad-stamp i{width:7px;height:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px rgba(61,220,151,.15)}
.btn.sm{height:34px;padding:0 15px;font-size:13.5px;gap:7px}
.btn.sm svg{width:14px;height:14px}
.btn.xs{height:28px;padding:0 11px;font-size:12.5px;gap:6px}
.btn.xs svg{width:13px;height:13px}
.btn.dg{color:#FF6B61}
.btn.dg::before{background:rgba(255,59,48,.08);border-color:rgba(255,59,48,.45)}
.btn.gh::before{background:transparent;border-color:transparent}
.btn.gh{color:var(--ink-2)}
html.round .btn.xs::before{border-radius:8px}

.ad-g{display:grid;gap:16px;margin-top:16px}
.ad-g.g21{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
.ad-g.g12{grid-template-columns:minmax(0,1fr) minmax(0,1.55fr)}
.ad-g.g2{grid-template-columns:1fr 1fr}
.ad-g.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.ad-g.g4{grid-template-columns:repeat(4,1fr)}
.ad-col{display:grid;gap:16px;align-content:start}
.ad-card{position:relative;background:var(--bg-2);border:1px solid var(--line);overflow:hidden}
html.round .ad-card{border-radius:20px}
.ad-ch{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:18px 22px 0}
.ad-ch h2{display:flex;align-items:center;gap:10px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;line-height:1;text-transform:uppercase}
.ad-ch h2 svg{width:17px;height:17px;color:var(--red)}
.ad-ch .r{margin-left:auto;display:flex;align-items:center;gap:8px}
.ad-ch p{flex-basis:100%;margin-top:2px;font-size:13px;line-height:1.5;color:var(--ink-3)}
.ad-cb{padding:16px 22px 22px}
.ad-cb.fl{padding:14px 0 0}
.ad-cf{display:flex;align-items:center;gap:10px;padding:14px 22px;border-top:1px solid var(--line)}
.ad-more{display:inline-flex;align-items:center;gap:5px;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.ad-more svg{width:13px;height:13px;color:var(--red)}
.ad-hint{font-size:13px;line-height:1.5;color:var(--ink-3)}
.ad-hint a{color:var(--ink-2);text-decoration:underline;text-underline-offset:3px}

/* pastilles d'état */
.pl{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 8px;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap;background:var(--bg-4);color:var(--ink-2)}
.pl i{width:6px;height:6px;border-radius:50%;background:currentColor}
.pl.ok{background:rgba(61,220,151,.12);color:var(--ok)}
.pl.warn{background:rgba(255,197,61,.12);color:var(--warn)}
.pl.err{background:rgba(255,59,48,.15);color:#FF6B61}
.pl.info{background:rgba(245,245,246,.1);color:var(--ink)}
.pl.vio{background:rgba(180,156,255,.13);color:#B49CFF}
.pl.line{background:none;box-shadow:inset 0 0 0 1px var(--line-2);color:var(--ink-2)}
.pl.line i{display:none}
html.round .pl{border-radius:7px}

/* chiffres clés */
.ad-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.ad-kpi{position:relative;padding:20px 22px 18px;background:var(--bg-2);border:1px solid var(--line);overflow:hidden;min-height:150px}
html.round .ad-kpi{border-radius:20px}
.ad-kpi .l{display:flex;align-items:center;gap:8px;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.ad-kpi .l svg{width:15px;height:15px;color:var(--red)}
.ad-kpi .v{margin-top:12px;white-space:nowrap;font-family:var(--cond);font-weight:900;font-style:italic;font-size:48px;line-height:.9;letter-spacing:-.01em}
.ad-kpi .v small{font-size:24px;color:var(--ink-2);margin-left:5px;letter-spacing:0}
.ad-kpi .s{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px;font-size:13px;color:var(--ink-2)}
.ad-kpi .also{margin-top:4px;font-size:12.5px;color:var(--ink-3)}
.ad-kpi .sp{position:absolute;left:0;bottom:0;width:100%;height:44px}
.ad-kpi.hasp{padding-bottom:52px}
.dl{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.04em;background:rgba(61,220,151,.12);color:var(--ok)}
.dl svg{width:12px;height:12px}
.dl.down{background:rgba(255,59,48,.14);color:#FF6B61}
.dl.flat{background:var(--bg-4);color:var(--ink-2)}
html.round .dl{border-radius:6px}

/* graphique en barres */
.ad-chart{display:grid;grid-template-columns:52px 1fr;gap:10px;height:250px}
.ad-chart .y{display:flex;flex-direction:column;justify-content:space-between;padding-bottom:26px;font-size:12px;color:var(--ink-3);text-align:right}
.ad-chart .pl0{position:relative;display:flex;flex-direction:column}
.ad-chart ol{position:relative;flex:1;display:flex;align-items:flex-end;gap:4px;list-style:none;border-bottom:1px solid var(--line-2);
  background:linear-gradient(var(--line),var(--line)) 0 0/100% 1px no-repeat,linear-gradient(var(--line),var(--line)) 0 50%/100% 1px no-repeat}
.ad-chart ol.few{gap:14px}
.ad-chart li{position:relative;flex:1;height:100%;display:flex;align-items:flex-end}
.ad-chart li .f{display:block;width:100%;background:var(--red);opacity:.88;border-radius:3px 3px 0 0}
.ad-chart li.zero .f{height:2px!important;background:var(--bg-4);opacity:1}
.ad-chart li.now .f{opacity:1;background:repeating-linear-gradient(-55deg,var(--red) 0 5px,#C9221A 5px 9px)}
.ad-chart li.hi .f{opacity:1;box-shadow:0 0 0 2px var(--bg-2),0 0 0 3px var(--red)}
.ad-chart li .x{position:absolute;left:50%;top:100%;margin-top:8px;transform:translateX(-50%);font-size:11.5px;color:var(--ink-3);white-space:nowrap}
.ad-chart li.now .x{color:var(--ink);font-weight:600}
.ad-chart .tip{position:absolute;z-index:3;top:0;left:calc(100% + 12px);padding:9px 12px;background:var(--bg-4);border:1px solid var(--line-2);white-space:nowrap;box-shadow:0 12px 30px rgba(0,0,0,.45)}
html.round .ad-chart .tip{border-radius:10px}
.ad-chart .tip b{display:block;font-size:13px;font-weight:600}
.ad-chart .tip span{font-size:12.5px;color:var(--ink-2)}

/* liste "à traiter" */
.ad-todo{list-style:none}
.ad-todo li{display:grid;grid-template-columns:34px 1fr auto;gap:14px;align-items:center;padding:14px 22px;border-top:1px solid var(--line)}
.ad-todo li:first-child{border-top:0}
.ad-todo .tg{width:34px;height:34px;display:grid;place-items:center;background:rgba(255,59,48,.14);color:#FF6B61}
.ad-todo .tg.warn{background:rgba(255,197,61,.12);color:var(--warn)}
.ad-todo .tg.info{background:var(--bg-4);color:var(--ink-2)}
.ad-todo .tg.ok{background:rgba(61,220,151,.12);color:var(--ok)}
.ad-todo .tg svg{width:16px;height:16px}
html.round .ad-todo .tg{border-radius:10px}
.ad-todo p{font-size:14px;font-weight:600;line-height:1.35}
.ad-todo p span{display:block;margin-top:3px;font-size:12.5px;font-weight:400;line-height:1.45;color:var(--ink-3)}
.ad-good{display:flex;align-items:center;gap:14px;padding:6px 22px 22px;font-size:14px;color:var(--ink-2)}

/* faits */
.ad-facts{display:grid;grid-template-columns:repeat(6,1fr)}
.ad-facts div{padding:18px 22px 22px;border-left:1px solid var(--line)}
.ad-facts div:first-child{border-left:0}
.ad-facts dt{font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.ad-facts dd{margin-top:8px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:38px;line-height:.9}
.ad-facts dd small{display:block;margin-top:8px;font-family:var(--body);font-style:normal;font-weight:400;font-size:12.5px;line-height:1.45;color:var(--ink-3)}
.ad-facts.f5{grid-template-columns:repeat(5,1fr)}
.ad-facts.wide{grid-template-columns:1.45fr 1.45fr 1fr 1fr 1fr 1fr}
.ad-facts dd .u{font-size:.5em;margin-left:4px;color:var(--ink-2)}
.ad-facts dd{white-space:nowrap}
.ad-facts dd small{white-space:normal}

/* tableaux */
.ad-t{width:100%;border-collapse:collapse;font-size:14px}
.ad-t th,.ad-t td{padding:12px 16px;text-align:left;vertical-align:middle}
.ad-t th:first-child,.ad-t td:first-child{padding-left:22px}
.ad-t th:last-child,.ad-t td:last-child{padding-right:22px}
.ad-t thead th{padding-top:6px;padding-bottom:10px;font-family:var(--cond);font-weight:700;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);border-bottom:1px solid var(--line)}
.ad-t tbody tr{border-top:1px solid var(--line)}
.ad-t tbody tr:first-child{border-top:0}
.ad-t tbody th{font-weight:500}
.ad-t .r{text-align:right}
.ad-t .w1{width:1%;white-space:nowrap}
.ad-t a{color:var(--ink)}
.ad-t .conv{display:block;font-size:12px;color:var(--ink-3)}
.ad-t.cp td,.ad-t.cp th{padding-top:10px;padding-bottom:10px}
.ad-t tr.hl{background:rgba(255,255,255,.025)}
.ad-t tr.day th{padding-top:18px;padding-bottom:8px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;letter-spacing:.01em;text-transform:uppercase;color:var(--ink);background:rgba(255,255,255,.015)}
.ad-t tr.day th em{font-style:normal;margin-left:8px;font-family:var(--cond);font-weight:700;font-size:12.5px;letter-spacing:.12em;color:var(--ink-3)}
.ad-t .wr{max-width:380px;line-height:1.45}
.ad-pager{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 22px;border-top:1px solid var(--line);font-size:13px;color:var(--ink-3)}
.ad-pager .row{display:flex;align-items:center;gap:12px}

.ad-who{display:flex;align-items:center;gap:12px;min-width:0}
.ad-who b{display:block;font-weight:600;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ad-who > span > span{display:block;font-size:12.5px;color:var(--ink-3)}
.av{flex:none;width:32px;height:32px;display:grid;place-items:center;border-radius:50%;font-family:var(--cond);font-weight:900;font-style:italic;font-size:17px;line-height:1;color:var(--red-ink)}
.av.s24{width:24px;height:24px;font-size:13px}
.av.s64{width:72px;height:72px;font-size:40px}
.av.c0{background:var(--red)}.av.c1{background:var(--ink)}.av.c2{background:var(--bg-4);color:var(--ink)}
.av.c3{background:#5AB8FF}.av.c4{background:var(--warn)}.av.c5{background:#B49CFF}

/* fil d'activité */
.ad-feed{list-style:none}
.ad-feed li{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:14px;align-items:baseline;padding:11px 22px;border-top:1px solid var(--line);font-size:13.5px;line-height:1.45}
.ad-feed li:first-child{border-top:0}
.ad-feed li.u{grid-template-columns:24px minmax(0,1fr) auto;align-items:center}
.ad-feed .d{width:8px;height:8px;border-radius:2px;transform:skewX(var(--skew)) translateY(-1px)}
.ad-feed p{min-width:0}
.ad-feed p a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--line-2);text-underline-offset:3px}
.ad-feed .m{display:block;font-size:12px;color:var(--ink-3)}
.ad-feed time{font-size:12.5px;color:var(--ink-3);white-space:nowrap}
.ad-feed .rw{display:flex;align-items:center;gap:10px}
.e-admin{background:var(--red)}.e-license{background:var(--ok)}.e-user{background:#5AB8FF}.e-sub{background:var(--warn)}.e-aff{background:#B49CFF}.e-device{background:var(--ink-3)}

/* services */
.ad-svc{list-style:none;display:grid}
.ad-svc.two{grid-template-columns:1fr 1fr}
.ad-svc li{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:14px;align-items:start;padding:14px 22px;border-top:1px solid var(--line)}
.ad-svc.two li:nth-child(2n){border-left:1px solid var(--line)}
.ad-svc.two li:nth-child(-n+2){border-top:0}
.ad-svc.cp li{align-items:center;padding:10px 22px}
.ad-svc.cp li:first-child{border-top:0}
.ad-svc .st{width:10px;height:10px;margin-top:5px;transform:skewX(var(--skew));background:var(--ok)}
.ad-svc.cp .st{margin-top:0}
.ad-svc .st.warn{background:var(--warn)}.ad-svc .st.error{background:var(--red)}.ad-svc .st.off{background:var(--ink-3)}
.ad-svc small{display:block;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.ad-svc b{display:block;margin-top:2px;font-weight:600;font-size:14px}
.ad-svc.cp b{margin:0;font-weight:500;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ad-svc p{margin-top:4px;font-size:13px;line-height:1.5;color:var(--ink-2)}
.ad-svc .dur{font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.04em;color:var(--ink-3)}
.ad-checks{list-style:none;display:grid}
.ad-checks.two{grid-template-columns:1fr 1fr}
.ad-checks li{display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:start;padding:13px 22px;border-top:1px solid var(--line)}
.ad-checks.two li:nth-child(2n){border-left:1px solid var(--line)}
.ad-checks.two li:nth-child(-n+2),.ad-checks li:first-child{border-top:0}
.ad-checks .pl{justify-self:start;margin-top:1px}
.ad-checks b{font-weight:600;font-size:14px}
.ad-checks p{margin-top:2px;font-size:13px;line-height:1.5;color:var(--ink-2);overflow-wrap:anywhere}

/* répartition */
.ad-split{display:flex;gap:3px;height:14px;margin-bottom:16px}
.ad-split span{height:100%;transform:skewX(var(--skew))}
.k1{background:var(--red)}.k2{background:#FF8A82}.k3{background:var(--ink)}.k4{background:#B49CFF}.k5{background:var(--ink-3)}
.ad-key{list-style:none;display:grid}
.ad-key li{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-top:1px solid var(--line);font-size:14px}
.ad-key li:first-child{border-top:0}
.ad-key li > span:first-child{display:flex;align-items:center;gap:10px;color:var(--ink-2)}
.ad-key li i{width:10px;height:10px;transform:skewX(var(--skew))}
.ad-key b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:20px}
.ad-key em{min-width:44px;margin-left:12px;font-style:normal;text-align:right;font-size:12.5px;color:var(--ink-3)}
.ad-lines{display:grid;margin-top:14px}
.ad-lines div{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px dashed var(--line-2);font-size:14px}
.ad-lines dt{color:var(--ink-2)}
.ad-lines dd{font-weight:600}
.ad-lines.big dd{font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px}
.ad-lines.tight{margin-top:0}
.ad-lines.tight div:first-child{border-top:0}

/* formulaires */
.ad-f{display:grid;gap:16px}
.ad-fld{display:grid;gap:7px}
.ad-fld > label,.ad-lbl{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.ad-in{display:flex;align-items:center;min-height:42px;padding:0 14px;background:var(--bg-3);border:1px solid var(--line-2);font-size:14px;color:var(--ink)}
.ad-in.ph{color:var(--ink-3)}
.ad-in.ta{align-items:flex-start;min-height:104px;padding:11px 14px;line-height:1.6}
.ad-in.code{font-family:var(--cond);font-weight:800;font-size:17px;letter-spacing:.12em;text-transform:uppercase}
.ad-in.sm{min-height:34px;padding:0 11px;font-size:13px}
.ad-in.sel{justify-content:space-between;gap:10px}
.ad-in.sel svg{width:14px;height:14px;color:var(--ink-3)}
.ad-in.focus{border-color:var(--red);box-shadow:0 0 0 3px rgba(255,59,48,.15)}
html.round .ad-in{border-radius:11px}
html.round .ad-in.sm{border-radius:9px}
.ad-inl{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.ad-pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ad-sw{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 16px;background:var(--bg-3);border:1px solid var(--line)}
html.round .ad-sw{border-radius:14px}
.ad-sw b{display:block;font-weight:600;font-size:14px;color:var(--ink)}
.ad-sw span{display:block;margin-top:2px;font-size:12.5px;color:var(--ink-3)}

/* alertes, liens secrets, toasts */
.ad-alert{display:flex;gap:12px;align-items:flex-start;padding:13px 16px;font-size:14px;line-height:1.5;background:rgba(255,59,48,.1);border:1px solid rgba(255,59,48,.35);color:#FFB3AD}
.ad-alert svg{width:16px;height:16px;margin-top:2px;flex:none;color:#FF6B61}
.ad-alert.warn{background:rgba(255,197,61,.08);border-color:rgba(255,197,61,.3);color:#FFE2A0}
.ad-alert.warn svg{color:var(--warn)}
.ad-alert.info{background:var(--bg-3);border-color:var(--line-2);color:var(--ink-2)}
.ad-alert.info svg{color:var(--ink-2)}
html.round .ad-alert{border-radius:14px}
.ad-secret{padding:16px 18px;background:rgba(61,220,151,.06);border:1px solid rgba(61,220,151,.3)}
html.round .ad-secret{border-radius:16px}
.ad-secret > b{font-size:14px;font-weight:600}
.ad-secret .row{display:flex;align-items:center;gap:10px;margin-top:10px}
.ad-secret code{flex:1;min-width:0;padding:10px 12px;background:var(--bg);border:1px solid var(--line-2);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html.round .ad-secret code{border-radius:9px}
.ad-secret p{margin-top:8px;font-size:12.5px;color:var(--ink-3)}
.ad-toast{display:flex;align-items:flex-start;gap:12px;width:100%;max-width:440px;padding:14px 14px 14px 16px;background:var(--bg-4);border:1px solid var(--line-2);box-shadow:0 18px 40px rgba(0,0,0,.5);font-size:14px;line-height:1.5}
html.round .ad-toast{border-radius:14px}
.ad-toast > svg{width:16px;height:16px;margin-top:2px;flex:none;color:var(--ok)}
.ad-toast p{flex:1}
.ad-toast .x{width:16px;height:16px;color:var(--ink-3)}
.ad-env{display:flex;align-items:center;gap:10px;margin-bottom:22px;padding:11px 16px;background:rgba(255,197,61,.08);border:1px solid rgba(255,197,61,.28);font-size:13.5px;line-height:1.5;color:#FFE2A0}
.ad-env svg{width:15px;height:15px;flex:none;color:var(--warn)}
html.round .ad-env{border-radius:12px}
.ad-empty{display:grid;justify-items:center;gap:8px;padding:44px 24px 46px;text-align:center}
.ad-empty .ic{width:52px;height:52px;display:grid;place-items:center;margin-bottom:6px;background:var(--bg-3);border:1px solid var(--line-2);color:var(--ink-2)}
.ad-empty .ic svg{width:22px;height:22px}
html.round .ad-empty .ic{border-radius:16px}
.ad-empty b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;text-transform:uppercase}
.ad-empty p{max-width:420px;font-size:14px;line-height:1.5;color:var(--ink-2)}
.ad-empty.sm{padding:26px 20px}
.ad-empty.sm b{font-size:20px}

/* filtres */
.ad-tool{display:flex;align-items:center;gap:10px;padding:18px 22px 0}
.ad-tool .ad-in{flex:1;gap:10px;color:var(--ink-3)}
.ad-tool .ad-in svg{width:16px;height:16px}
.ad-tool .ad-in.sel{flex:none;width:250px;color:var(--ink)}
.ad-chips{display:flex;flex-wrap:wrap;gap:6px;padding:14px 22px 16px}
.ad-chips span{position:relative;display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 14px;isolation:isolate;font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.ad-chips span::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bg-3);border:1px solid var(--line-2);transform:skewX(var(--skew))}
html.round .ad-chips span::before{border-radius:10px}
.ad-chips span em{font-style:normal;color:var(--ink-3)}
.ad-chips span.on{color:var(--red-ink)}
.ad-chips span.on::before{background:var(--red);border-color:var(--red)}
.ad-chips span.on em{color:rgba(10,10,11,.6)}
.ad-chips.bare{padding:0}
.ad-seg{display:flex;gap:4px}

/* fiche joueur */
.ad-uh{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:22px;align-items:center;margin:14px 0 22px}
.ad-uh h1{display:flex;align-items:center;gap:12px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:54px;line-height:.9;text-transform:uppercase;letter-spacing:-.005em}
.ad-uh h1 svg{width:18px;height:18px;color:var(--ink-3)}
.ad-uh .row{display:flex;gap:6px;margin-top:12px}
.ad-uh .fl{display:flex;flex-wrap:wrap;gap:18px;margin-top:12px;font-size:13px;color:var(--ink-2)}
.ad-uh .fl span{display:flex;align-items:center;gap:7px}
.ad-uh .fl svg{width:14px;height:14px;color:var(--ink-3)}
.ad-uh .acts{display:flex;gap:8px}
.ad-lic{border:1px solid var(--line-2);background:var(--bg-3)}
html.round .ad-lic{border-radius:16px}
.ad-lic + .ad-lic{margin-top:12px}
.ad-lic.off{opacity:.62}
.ad-lic .h{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line)}
.ad-lic .h .row{display:flex;align-items:center;gap:10px}
.ad-lic .b{padding:4px 16px 14px}
.ad-kv{display:grid;grid-template-columns:1fr 1fr}
.ad-kv div{padding:10px 0;border-top:1px dashed var(--line-2)}
.ad-kv div:nth-child(-n+2){border-top:0}
.ad-kv div.w{grid-column:1/-1}
.ad-kv div.w + div{border-top:1px dashed var(--line-2)}
.ad-kv dt{font-family:var(--cond);font-weight:700;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.ad-kv dd{margin-top:3px;font-size:14px;line-height:1.45}
.ad-kv dd a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--line-2);text-underline-offset:3px}
.ad-kv.t div{padding:8px 0}
.ad-key-l{display:flex;align-items:center;gap:8px;font-family:var(--cond);font-weight:800;font-size:18px;letter-spacing:.08em}
.ad-key-l svg{width:14px;height:14px;color:var(--ink-3)}
.ad-pc{display:flex;gap:12px;align-items:flex-start;margin-top:6px;padding:12px 14px;background:var(--bg-2);border:1px solid var(--line)}
html.round .ad-pc{border-radius:12px}
.ad-pc > svg{width:18px;height:18px;margin-top:1px;color:var(--ink-2)}
.ad-pc b{display:block;font-size:14px;font-weight:600}
.ad-pc span{display:block;margin-top:2px;font-size:12.5px;line-height:1.45;color:var(--ink-3)}
.ad-lic .a{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--line)}
.ad-act{padding:16px 22px;border-top:1px solid var(--line)}
.ad-act:first-child{border-top:0}
.ad-act h3{font-family:var(--cond);font-weight:900;font-style:italic;font-size:19px;text-transform:uppercase}
.ad-act p{margin:4px 0 12px;font-size:13px;line-height:1.5;color:var(--ink-3)}
.ad-stars{font-size:16px;letter-spacing:2px;color:var(--red)}
.ad-stars s{text-decoration:none;color:var(--bg-4)}
.ad-quote{margin-top:10px;padding-left:14px;border-left:3px solid var(--red);font-size:14.5px;line-height:1.55;color:var(--ink)}
.ad-sep{height:1px;margin:16px 0;background:var(--line)}
.ad-card.danger{border-color:rgba(255,59,48,.35)}
.ad-card.danger .ad-ch h2{color:#FF6B61}
.ad-zone{display:flex;align-items:center;gap:24px;justify-content:space-between}
.ad-zone .ad-hint{max-width:560px}
.ad-more-box{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:var(--ink-2)}
.ad-more-box svg{width:13px;height:13px}

/* pop-up du site */
.ad-ed{display:grid;grid-template-columns:minmax(0,1fr) 380px}
.ad-ed > .m{padding:18px 22px 22px}
.ad-ed > .s{padding:18px 22px 22px;border-left:1px solid var(--line);background:rgba(255,255,255,.012)}
.ad-meter{height:8px;margin:12px 0 18px;background:var(--bg-4)}
.ad-meter span{display:block;height:100%;background:var(--red)}
html.round .ad-meter,html.round .ad-meter span{border-radius:4px}
.ad-pop{position:relative;padding:24px 24px 22px;background:var(--bg);border:1px solid var(--line-2);overflow:hidden;text-align:center}
html.round .ad-pop{border-radius:18px}
.ad-pop::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(255,255,255,.07) 1.1px,transparent 1.5px) 0 0/9px 9px;-webkit-mask:linear-gradient(200deg,#000,transparent 60%)}
.ad-pop > *{position:relative}
.ad-pop .x{position:absolute;right:14px;top:14px;width:16px;height:16px;color:var(--ink-3)}
.ad-pop .eb{font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-2)}
.ad-pop .t{margin-top:10px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:44px;line-height:.88;text-transform:uppercase}
.ad-pop .t span{color:var(--red)}
.ad-pop .tx{margin:12px auto 0;max-width:280px;font-size:13.5px;line-height:1.5;color:var(--ink-2)}
.ad-pop .cd{display:inline-block;margin-top:16px;padding:10px 22px;font-family:var(--cond);font-weight:900;font-size:24px;letter-spacing:.14em;border:2px dashed var(--red);color:var(--ink)}
html.round .ad-pop .cd{border-radius:10px}
.ad-pop .lf{margin-top:12px;font-family:var(--cond);font-weight:800;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.ad-pop .lf b{color:var(--red)}
.ad-line{display:grid;grid-template-columns:200px 160px 260px auto;gap:14px;align-items:end}

/* tests réseau */
.ad-t.net th,.ad-t.net td{padding-left:10px;padding-right:10px}
.ad-t.net td.p{font-family:var(--cond);font-weight:800;font-size:16px;text-align:center}
.ad-t.net thead th.r{text-align:center}
.p-1{color:var(--ok)}.p-2{color:#C6E86B}.p-3{color:var(--warn)}.p-4{color:#FF6B61}
.ad-t.net td.p span{display:inline-block;min-width:42px;padding:3px 0;background:currentColor}
.ad-t.net td.p span b{color:var(--red-ink);font-weight:800}
.ad-t.net td.p.p-1 span{background:rgba(61,220,151,.14)}.ad-t.net td.p.p-2 span{background:rgba(198,232,107,.13)}
.ad-t.net td.p.p-3 span{background:rgba(255,197,61,.13)}.ad-t.net td.p.p-4 span{background:rgba(255,59,48,.15)}
.ad-t.net td.p span b{color:inherit}
html.round .ad-t.net td.p span{border-radius:7px}
.ad-t.net td.loss span{box-shadow:inset 0 -2px 0 currentColor}
.ad-scale{display:flex;align-items:center;gap:14px;font-size:12.5px;color:var(--ink-3)}
.ad-scale span{display:flex;align-items:center;gap:6px}
.ad-scale i{width:10px;height:10px;background:currentColor;transform:skewX(var(--skew))}
.ad-scale .u{color:var(--ink-2);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}

/* introuvable */
.ad-nf{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch;min-height:440px}
.ad-nf .l{padding:40px 44px}
.ad-nf .big{font-family:var(--cond);font-weight:900;font-style:italic;font-size:200px;line-height:.78;color:transparent;-webkit-text-stroke:2px var(--red)}
.ad-nf h2{margin-top:26px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:50px;line-height:.88;text-transform:uppercase}
.ad-nf p{margin-top:14px;max-width:420px;font-size:15px;line-height:1.55;color:var(--ink-2)}
.ad-nf .acts{display:flex;gap:10px;margin-top:28px}
.ad-nf .r{position:relative;border-left:1px solid var(--line);background:radial-gradient(circle,rgba(255,255,255,.06) 1.1px,transparent 1.5px) 0 0/9px 9px}
.ad-nf .r .row{position:absolute;left:44px;right:44px;display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--bg-3);border:1px solid var(--line-2)}
html.round .ad-nf .r .row{border-radius:14px}
.ad-nf .r .row div > *{display:block}
.ad-nf .r .row b{font-size:14px;font-weight:600}
.ad-nf .r .row span{font-size:12.5px;color:var(--ink-3)}
.ad-nf .r .row.miss{border-style:dashed;border-color:rgba(255,59,48,.55);background:rgba(255,59,48,.05)}
.ad-nf .r .row.miss b{color:#FF6B61}

/* icônes imprimées : tailles et couleurs par contexte */
.ad-side nav a svg.pi{width:19px;height:19px}
.ad-ch h2 svg.pi{width:19px;height:19px}
.ad-kpi .l svg.pi{width:17px;height:17px}
.ad-todo .tg svg.pi{width:18px;height:18px}
.ad-empty .ic svg.pi{width:28px;height:28px}
.btn.sm svg.pi{width:15px;height:15px}
.btn.red svg.pi,.cv-tabs span.on svg.pi,.ad-chips .on svg.pi{--pf:#0A0A0B;--pb:#C9221A}
.ad-alert.warn svg.pi,.ad-todo .tg.warn svg.pi,.ad-env svg.pi{--pb:var(--warn)}
.ad-alert.ok svg.pi,.ad-toast svg.pi{--pb:#3DDC97}
.ad-alert.info svg.pi{--pb:#5A5A63}
'''

LOGIN_CSS = r'''
.win.adm.lg{display:block;height:900px}
.ad-login{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 460px;gap:56px;align-items:center;height:900px;padding:0 120px}
.ad-login > .s-dots{left:0;top:0;width:820px;height:620px;-webkit-mask:linear-gradient(140deg,#000 0,transparent 62%)}
.ad-login .tl{position:relative}
.ad-login .ad-logo{padding:0}
.ad-login h1{margin-top:34px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:132px;line-height:.82;text-transform:uppercase;letter-spacing:-.012em}
.ad-login h1 .br{position:relative;display:inline-block;isolation:isolate}
.ad-login h1 .br::after{content:"";position:absolute;z-index:-1;left:-24px;right:-54px;top:30%;height:76%;background:url(img/fx/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.ad-login .lede{margin-top:28px;max-width:560px;font-size:18px;line-height:1.55;color:var(--ink-2)}
.ad-login .lede code{padding:1px 7px;background:var(--bg-4);font-family:var(--cond);font-weight:800;font-size:17px;letter-spacing:.06em;color:var(--ink)}
.ad-login .rows{display:flex;flex-wrap:wrap;gap:8px;margin-top:30px}
.ad-login .rows span{display:flex;align-items:center;gap:8px;height:34px;padding:0 13px;background:var(--bg-2);border:1px solid var(--line);font-family:var(--cond);font-weight:800;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.ad-login .rows svg{width:14px;height:14px;color:var(--red)}
html.round .ad-login .rows span{border-radius:10px}
.ad-lc{position:relative;padding:36px 36px 30px}
.ad-lc h2{font-family:var(--cond);font-weight:900;font-style:italic;font-size:40px;line-height:.9;text-transform:uppercase}
.ad-lc > p{margin-top:12px;font-size:14.5px;line-height:1.55;color:var(--ink-2)}
.ad-lc .ad-f{margin-top:26px}
.ad-lc .pw{display:flex;align-items:center;justify-content:space-between;min-height:52px;font-size:20px;letter-spacing:.3em;color:var(--ink)}
.ad-lc .pw em{font-style:normal;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.ad-lc .btn.red{width:100%;height:54px;font-size:18px}
.ad-lc .ft{display:flex;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid var(--line);font-size:13px;line-height:1.5;color:var(--ink-3)}
.ad-lc .ft svg{width:15px;height:15px;flex:none;margin-top:1px;color:var(--ink-3)}
'''

BRAIN_CSS = r'''
.win.adm.cv{display:grid;grid-template-columns:288px minmax(0,1fr);height:900px;min-height:0}
.win.adm.cv::after{display:none}
.cv-side{display:flex;flex-direction:column;gap:10px;padding:20px 12px 12px;background:var(--bg-2);border-right:1px solid var(--line);min-height:0}
.cv-brand{display:flex;align-items:center;gap:10px;padding:0 6px 6px}
.cv-brand img{width:32px;height:32px}
.cv-brand div{flex:1;line-height:1}
.cv-brand b{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;text-transform:uppercase}
.cv-brand small{display:block;margin-top:3px;font-family:var(--cond);font-weight:800;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.cv-brand .bk{width:32px;height:32px;display:grid;place-items:center;color:var(--ink-2);border:1px solid var(--line-2)}
html.round .cv-brand .bk{border-radius:9px}
.cv-brand .bk svg{width:15px;height:15px}
.cv-box{display:flex;align-items:center;gap:9px;height:38px;padding:0 11px;white-space:nowrap;background:var(--bg-3);border:1px solid var(--line-2);font-size:13px;color:var(--ink-3)}
html.round .cv-box{border-radius:11px}
.cv-box svg{width:15px;height:15px}
.cv-box b{flex:1;font-family:var(--cond);font-weight:900;font-style:italic;font-size:17px;text-transform:uppercase;color:var(--ink)}
.cv-box .lb{font-family:var(--cond);font-weight:800;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.cv-box kbd{margin-left:auto;font-family:var(--cond);font-weight:700;font-size:11.5px;color:var(--ink-3);border:1px solid var(--line-2);padding:0 6px}
.cv-box.fl{background:none;border-color:var(--line);height:34px}
.cv-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cv-tabs span{position:relative;display:flex;align-items:center;justify-content:center;gap:7px;height:32px;isolation:isolate;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.cv-tabs span::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bg-3);border:1px solid var(--line);transform:skewX(var(--skew))}
html.round .cv-tabs span::before{border-radius:9px}
.cv-tabs span.on{color:var(--red-ink)}
.cv-tabs span.on::before{background:var(--red);border-color:var(--red)}
.cv-tabs svg{width:14px;height:14px}
.cv-tree{flex:1;min-height:0;overflow:hidden;padding:2px 2px 0}
.cv-h{display:flex;justify-content:space-between;margin:8px 8px 6px;font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.cv-row{display:flex;align-items:center;gap:9px;height:29px;padding:0 8px;font-size:13px;color:var(--ink-2)}
html.round .cv-row{border-radius:8px}
.cv-row.dir{color:var(--ink);font-weight:600}
.cv-row.on{background:var(--bg-4);color:var(--ink)}
.cv-row .ch{width:12px;height:12px;color:var(--ink-3)}
.cv-row .ch.o{transform:rotate(90deg)}
.cv-row .dt{width:8px;height:8px;flex:none;transform:skewX(var(--skew));background:var(--c)}
.cv-row .n{margin-left:auto;font-family:var(--cond);font-weight:700;font-size:12px;color:var(--ink-3)}
.cv-sub{margin-left:14px;padding-left:8px;border-left:1px solid var(--line)}
.cv-foot{display:flex;align-items:center;gap:8px;padding:10px 6px 0;border-top:1px solid var(--line);font-size:12px;color:var(--ink-3)}
.cv-foot b{color:var(--ink-2);font-weight:600}
.cv-foot svg{margin-left:auto;width:15px;height:15px;color:var(--ink-2)}
.cv-stage{position:relative;overflow:hidden;background:radial-gradient(1200px 800px at 55% 45%,#0d0d10 0%,#070708 55%,#050506 100%)}
.cv-stage img.g{position:absolute;left:0;top:0;width:1152px;height:900px}
.cv-hud{position:absolute;top:16px;display:flex;align-items:center;gap:6px}
.cv-hud.l{left:18px}
.cv-hud.r{right:calc(560px + 16px)}
.cv-chip{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 11px;background:rgba(10,10,11,.8);border:1px solid var(--line-2);font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
html.round .cv-chip{border-radius:9px}
.cv-chip b{color:var(--ink)}
.cv-chip.warn{color:var(--warn);border-color:rgba(255,197,61,.3)}
.cv-ib{width:36px;height:36px;display:grid;place-items:center;background:rgba(17,17,19,.85);border:1px solid var(--line-2);color:var(--ink-2)}
.cv-ib svg{width:16px;height:16px}
.cv-ib.on{background:rgba(255,59,48,.16);border-color:rgba(255,59,48,.45);color:var(--ink)}
.cv-ib.w{width:auto;padding:0 12px;gap:7px;display:flex;align-items:center;font-family:var(--cond);font-weight:800;font-size:13.5px;letter-spacing:.08em;text-transform:uppercase}
html.round .cv-ib{border-radius:10px}
.cv-tip{position:absolute;padding:10px 12px;max-width:260px;background:rgba(17,17,19,.96);border:1px solid var(--line-2);box-shadow:0 14px 34px rgba(0,0,0,.5);font-size:12.5px;line-height:1.45;color:var(--ink-2)}
html.round .cv-tip{border-radius:12px}
.cv-tip b{display:block;font-size:13.5px;color:var(--ink)}
.cv-tip span{display:block;font-family:var(--cond);font-weight:800;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.cv-hint{position:absolute;left:calc((100% - 560px)/2);bottom:18px;transform:translateX(-50%);padding:7px 14px;background:rgba(10,10,11,.8);border:1px solid var(--line);font-size:12px;color:var(--ink-3);white-space:nowrap}
html.round .cv-hint{border-radius:99px}
.cv-reader{position:absolute;top:0;right:0;bottom:0;width:560px;display:flex;flex-direction:column;background:rgba(13,13,15,.98);border-left:1px solid var(--line-2);box-shadow:-24px 0 60px rgba(0,0,0,.45)}
.cv-rbar{display:flex;align-items:center;gap:6px;height:56px;padding:0 12px;border-bottom:1px solid var(--line);flex:none}
.cv-rbar .cr{flex:1;display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-3)}
.cv-rbar .cr b{color:var(--ink-2);font-weight:600}
.cv-rbar .cr svg{width:12px;height:12px}
.cv-doc{flex:1;overflow:hidden;padding:24px 34px;font-size:14.5px;line-height:1.66;color:#D9D9DE}
.cv-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.cv-tag{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border:1px solid var(--line-2);font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
html.round .cv-tag{border-radius:7px}
.cv-tag i{width:7px;height:7px;transform:skewX(var(--skew));background:var(--c)}
.cv-tag.t{color:var(--ink-3)}
.cv-doc h1{font-family:var(--cond);font-weight:900;font-style:italic;font-size:44px;line-height:.9;text-transform:uppercase;color:var(--ink);margin-bottom:16px}
.cv-doc h1 code{font-size:14px;vertical-align:8px;font-style:normal;text-transform:none;font-weight:500}
.cv-doc h2{margin:22px 0 8px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:24px;text-transform:uppercase;color:var(--ink)}
.cv-doc p{margin-bottom:10px}
.cv-doc ul{margin:0 0 10px 18px}
.cv-doc li{margin:3px 0}
.cv-doc li::marker{color:var(--red)}
.cv-doc strong{color:var(--ink);font-weight:600}
.cv-doc a{color:#FF8A82;border-bottom:1px solid rgba(255,138,130,.3)}
.cv-doc code{padding:1px 5px;border:1px solid var(--line);background:var(--bg-3);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:#E6E6EA}
html.round .cv-doc code{border-radius:6px}
.cv-doc blockquote{margin:0 0 14px;padding:10px 14px;border-left:3px solid var(--red);background:rgba(255,59,48,.06);color:var(--ink-2)}
html.round .cv-doc blockquote{border-radius:0 10px 10px 0}
.cv-toc{margin-bottom:18px;padding:12px 16px;border:1px solid var(--line);background:rgba(255,255,255,.015)}
html.round .cv-toc{border-radius:14px}
.cv-toc p{font-family:var(--cond);font-weight:800;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.cv-toc ol{margin-top:6px;columns:2;column-gap:20px;list-style:none;font-size:13px}
.cv-toc li{padding:2px 0;color:var(--ink-2)}
'''


# ---------- petites briques ----------
def I(n, big=False):
    """Icône imprimée comme dans l'app ; flèches, chevrons et croix restent au trait."""
    return picon(n, big) or f'<i data-i="{n}"></i>'


def pl(kind, text):
    return f'<span class="pl {kind}"><i></i>{text}</span>'


PREM = {'month': ('ok', 'Mensuel'), 'year': ('ok', 'Annuel'), 'life': ('info', 'À vie'), 'gift': ('vio', 'Offert'),
        'cancel': ('warn', 'Mensuel · résilié'), 'cancely': ('warn', 'Annuel · résilié'), 'free': ('off', 'Gratuit'),
        'refund': ('off', 'Gratuit · remboursée'), 'ended': ('off', 'Gratuit · abonnement terminé'), 'ban': ('err', 'Banni')}


def prem(k):
    return pl(*PREM[k])


def av(email, size=''):
    hue = sum(ord(c) * (i + 1) for i, c in enumerate(email)) % 6
    return f'<span class="av c{hue}{" " + size if size else ""}">{email[0].upper()}</span>'


def who(email, sub=''):
    return f'<span class="ad-who">{av(email)}<span><b>{email}</b>{f"<span>{sub}</span>" if sub else ""}</span></span>'


def card(title, icon, body, actions='', sub='', flush=False, foot='', cls=''):
    head = ''
    if title:
        head = (f'<div class="ad-ch"><h2>{I(icon)}{title}</h2>{f"<div class=r>{actions}</div>" if actions else ""}'
                f'{f"<p>{sub}</p>" if sub else ""}</div>')
    f = f'<div class="ad-cf">{foot}</div>' if foot else ''
    return f'<section class="ad-card{" " + cls if cls else ""}">{head}<div class="ad-cb{" fl" if flush else ""}">{body}</div>{f}</section>'


def more(text):
    return f'<a class="ad-more">{text}{I("right")}</a>'


def btn(label, icon='', kind=''):
    return f'<span class="btn sm{" " + kind if kind else ""}">{I(icon) if icon else ""}{label}</span>'


def xbtn(label, icon='', kind=''):
    return f'<span class="btn xs{" " + kind if kind else ""}">{I(icon) if icon else ""}{label}</span>'


def nxt(label):
    return f'<span class="btn xs">{label}{I("right")}</span>'


def stamp(t):
    return f'<span class="ad-stamp"><i></i>{t}</span>'


def delta(p, title=''):
    if p == 'new':
        return f'<span class="dl">{I("upright")}nouveau</span>'
    cls = 'up' if p > 0 else 'down' if p < 0 else 'flat'
    ic = I('upright') if p > 0 else (I('trenddown') if p < 0 else '')
    return f'<span class="dl {cls}">{ic}{"+" if p > 0 else ""}{p} %</span>'


def fr(n, dec=0):
    s = f'{n:,.{dec}f}'.replace(',', ' ').replace('.', ',')
    return s


def usd(cents):
    return f'{fr(cents / 100, 2)} $US'


def big(cents):
    return f'{fr(cents / 100, 2)}<small>$US</small>'


def kpi(label, icon, value, sub='', also='', spark=''):
    sp = f'<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none">{spark}</svg>' if spark else ''
    return (f'<div class="ad-kpi{" hasp" if spark else ""}"><p class="l">{I(icon)}{label}</p><p class="v">{value}</p>'
            f'{f"<p class=also>+ {also}</p>" if also else ""}{f"<p class=s>{sub}</p>" if sub else ""}{sp}</div>')


def facts(items, cls=''):
    return (f'<dl class="ad-facts{" " + cls if cls else ""}">' + ''.join(f'<div><dt>{a}</dt><dd>{b}{f"<small>{c}</small>" if c else ""}</dd></div>' for a, b, c in items) + '</dl>')


def lines(items, cls=''):
    return f'<dl class="ad-lines{" " + cls if cls else ""}">' + ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in items) + '</dl>'


def kv(items, cls=''):
    return f'<dl class="ad-kv{" " + cls if cls else ""}">' + ''.join(f'<div{" class=w" if len(x) > 2 and x[2] else ""}><dt>{x[0]}</dt><dd>{x[1]}</dd></div>' for x in items) + '</dl>'


def alert(msg, kind='err'):
    ic = {'err': 'alert', 'warn': 'alert', 'info': 'info', 'ok': 'check'}[kind]
    return f'<div class="ad-alert {kind}">{I(ic)}<div>{msg}</div></div>'


def empty(text, icon='inbox', title='', small=False):
    return f'<div class="ad-empty{" sm" if small else ""}"><span class="ic">{I(icon, True)}</span>{f"<b>{title}</b>" if title else ""}<p>{text}</p></div>'


def secret(label, url):
    return (f'<div class="ad-secret"><b>{label}</b><div class="row"><code>{url}</code>{btn("Copier", "copy")}</div>'
            '<p>Affiché une seule fois : il n’est gardé nulle part en clair.</p></div>')


def toast(msg):
    return f'<div class="ad-toast">{I("check")}<p>{msg}</p><span class="x">{I("x")}</span></div>'


def table(head, rows, cls=''):
    th = ''.join(f'<th{f" class={c}" if c else ""}>{h}</th>' for h, c in head)
    return f'<table class="ad-t{" " + cls if cls else ""}"><thead><tr>{th}</tr></thead><tbody>{"".join(rows)}</tbody></table>'


def fld(label, inner, hint=''):
    return f'<div class="ad-fld"><label>{label}</label>{inner}{f"<p class=ad-hint>{hint}</p>" if hint else ""}</div>'


def inp(val, cls='', ph=False):
    return f'<span class="ad-in{" " + cls if cls else ""}{" ph" if ph else ""}">{val}</span>'


def sel(val, cls=''):
    return f'<span class="ad-in sel{" " + cls if cls else ""}">{val}{I("chev")}</span>'


# ---------- la coque ----------
NAV = [('Pilotage', [('accueil', 'Vue d’ensemble', 'grid'), ('ventes', 'Ventes', 'bars')]),
       ('Joueurs', [('joueurs', 'Joueurs', 'users'), ('achats', 'Offrir et achats', 'gift')]),
       ('Produit', [('site', 'Site et promos', 'globe'), ('reseau', 'Tests réseau', 'wifi')]),
       ('Système', [('services', 'Services', 'activity'), ('journal', 'Journal', 'list')]),
       ('Projet', [('cerveau', 'Cerveau', 'brain')])]


def side(current, prod=True):
    out = ('<aside class="ad-side"><a class="ad-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b><span>admin</span></a>'
           f'<div class="ad-q">{I("search")}Chercher un joueur<kbd>/</kbd></div><nav>')
    for grp, items in NAV:
        out += f'<p class="grp">{grp}</p>'
        for k, label, icon in items:
            badge = ''
            if k == 'joueurs':
                badge = '<em>1 284</em>'
            if k == 'achats':
                badge = '<em class="al">2</em>'
            if k == 'services':
                badge = '<i class="dot"></i>'
            out += f'<a{" class=on" if k == current else ""}>{I(icon)}<span>{label}</span>{badge}</a>'
    env = (pl('ok', 'Production') + pl('ok', 'Stripe live')) if prod else (pl('warn', 'Test · staging') + pl('warn', 'Stripe test'))
    out += (f'</nav><div class="ad-sfoot"><div class="env">{env}</div>'
            f'<div class="lk"><a>{I("external")}Voir le site</a><a>{I("logout")}Quitter</a></div></div></aside>')
    return out


def head(kicker, title, sub='', acts='', crumbs=None):
    cr = ''
    if crumbs:
        cr = '<nav class="ad-crumbs">' + I('right').join(f'<a>{c}</a>' if i < len(crumbs) - 1 else f'<span>{c}</span>' for i, c in enumerate(crumbs)) + '</nav>'
    eb = f'<p class="s-eb">{kicker}</p>' if kicker else ''
    return (f'<header class="ad-head"><div>{cr}{eb}<h1>{title}</h1>{f"<p class=sub>{sub}</p>" if sub else ""}</div>'
            f'{f"<div class=acts>{acts}</div>" if acts else ""}</header>')


def shell(current, body, prod=True, extra=''):
    return f'{side(current, prod)}<main class="ad-main">{extra}{body}</main>'


def wrap(name, title, body, css=''):
    html = page(title, body, CSS + css).replace('<div class="win site">', f'<div class="win adm{name}">')
    html = html.replace('<div class="win adm', DEFS + '<div class="win adm', 1)
    return html.replace('<html lang="en">', '<html lang="fr">')


# ---------- données de maquette ----------
random.seed(7)
DAYS = []  # 30 jours, du 24/10 au 22/11, en cents
for i in range(30):
    d = 24 + i if i < 8 else i - 7          # 24..31 oct puis 1..22 nov
    month = 'oct' if i < 8 else 'nov'
    base = 7400 - i * 40 + random.randint(-2300, 2600)
    if month == 'nov' and d in (10, 11, 12):  # renouvellements des abonnés du lancement (10/10)
        base += {10: 17800, 11: 9100, 12: 4300}[d]
    if month == 'nov' and d in (14, 15):      # week-end, vidéo d'un créateur
        base += 3800
    DAYS.append((d, month, max(0, base)))
DAYS[-1] = (22, 'nov', 5391)                 # aujourd'hui, à 15 h 50
TODAY = DAYS[-1][2]
MONTH = sum(v for d, m, v in DAYS if m == 'nov')
OCT = 301876
TOTAL = OCT + MONTH
WEEK = sum(v for d, m, v in DAYS[-7:])


def daychart(hi=None, tip=None):
    top = 30000
    bars = ''
    for i, (d, m, v) in enumerate(DAYS):
        now = i == len(DAYS) - 1
        h = max(1, round(v / top * 100)) if v else 0
        x = 'Auj.' if now else (f'{d:02d}/{11 if m == "nov" else 10}' if (len(DAYS) - 1 - i) % 7 == 0 else '')
        cls = ' now' if now else (' hi' if i == hi else '')
        t = ''
        if i == hi and tip:
            t = f'<span class="tip"><b>{tip}</b><span>{usd(v)} · {round(v / 640)} paiements</span></span>'
        bars += f'<li class="{cls.strip()}"><span class="f" style="height:{h}%"></span>{t}{f"<span class=x>{x}</span>" if x else ""}</li>'
    return f'<div class="ad-chart"><div class="y"><span>300 $US</span><span>150 $US</span><span>0</span></div><div class="pl0"><ol>{bars}</ol></div></div>'


def monthchart():
    names = ['déc', 'janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov']
    vals = [0] * 10 + [OCT, MONTH]
    top = 400000
    bars = ''
    for i, (n, v) in enumerate(zip(names, vals)):
        h = round(v / top * 100) if v else 0
        cls = 'now' if i == 11 else ('zero' if not v else '')
        bars += f'<li class="{cls}"><span class="f" style="height:{h}%"></span><span class="x">{n}</span></li>'
    return f'<div class="ad-chart"><div class="y"><span>4 k$US</span><span>2 k$US</span><span>0</span></div><div class="pl0"><ol class="few">{bars}</ol></div></div>'


def spark():
    vals = [v for _, _, v in DAYS]
    mx = max(vals)
    pts = [f'{i / (len(vals) - 1) * 100:.2f} {30 - v / mx * 24 - 3:.2f}' for i, v in enumerate(vals)]
    line = 'M' + 'L'.join(pts)
    return (f'<defs><linearGradient id="spf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF3B30" stop-opacity=".28"/>'
            f'<stop offset="1" stop-color="#FF3B30" stop-opacity="0"/></linearGradient></defs>'
            f'<path d="{line}L100 30L0 30Z" fill="url(#spf)"/><path d="{line}" fill="none" stroke="#FF3B30" stroke-width="1.6" vector-effect="non-scaling-stroke"/>')


SALES = [  # client, type, état, montant, date, conv
    ('kenzo@example.com', 'Abonnement', ('ok', 'Payé'), 599, '22/11 15:41', ''),
    ('lena.k@example.com', 'Abonnement', ('ok', 'Payé'), 2999, '22/11 14:58', ''),
    ('m.dubois@example.com', 'Abonnement', ('ok', 'Payé'), 599, '22/11 13:12', ''),
    ('bastien.rbw@example.com', 'Abonnement', ('err', 'Échoué'), 599, '22/11 12:40', ''),
    ('nathan.fr@example.com', 'Abonnement', ('ok', 'Payé'), 599, '22/11 11:07', '5,53 €'),
    ('ines.mc@example.com', 'Abonnement', ('ok', 'Payé'), 2999, '22/11 09:26', ''),
    ('rayan.k@example.com', 'Abonnement', ('ok', 'Payé'), 599, '22/11 08:03', ''),
    ('tom.bridge@example.com', 'Abonnement', ('off', 'Remboursé'), 599, '21/11 22:51', ''),
    ('noa.pvp@example.com', 'Abonnement', ('ok', 'Payé'), 2999, '21/11 21:34', ''),
    ('sacha.v@example.com', 'Abonnement', ('warn', 'Remb. 3,00 $US'), 599, '21/11 19:02', ''),
    ('lucas.bw@example.com', 'Abonnement', ('err', 'Litige'), 599, '21/11 17:45', ''),
    ('eva.m@example.com', 'Abonnement', ('ok', 'Payé'), 599, '21/11 16:20', ''),
]


def sales_rows(rows, compact=False, stripe=False):
    out = []
    for e, t, st, amt, dt, conv in rows:
        cells = f'<th><a>{e}</a></th>'
        if not compact:
            cells += f'<td class="mut">{t}</td>'
        cells += f'<td>{pl(*st)}</td><td class="r num">{usd(amt)}{f"<span class=conv>{conv}</span>" if conv else ""}</td><td class="r num mut nw">{dt}</td>'
        if stripe:
            cells += f'<td class="w1">{xbtn("Stripe", "external", "gh")}</td>'
        out.append(f'<tr>{cells}</tr>')
    head = [('Client', '')] + ([] if compact else [('Type', '')]) + [('État', ''), ('Montant', 'r'), ('Date', 'r')] + ([('', 'w1')] if stripe else [])
    return table(head, out, 'cp' if compact else '')


SERVICES = [
    ('ok', 'Railway', 'Serveur de comptes', 'Environnement « production », commit 4f1c9e2 (branche prod). En ligne depuis 3 j, Node 22.11.0, 182 Mo de mémoire. 1 avertissement au démarrage.', 'warn', 14),
    ('ok', 'Railway', 'Ancienne adresse rago-production.up.railway.app', 'Répond (les apps 1.1.7 et avant l’utilisent encore).', 'ok', 61),
    ('ok', 'Supabase', 'Base de données', 'Répond en 38 ms, 64 Mo utilisés (500 Mo dans l’offre gratuite).', 'ok', 38),
    ('ok', 'Supabase', 'Stockage (installateur, photos)', 'Le bouton Télécharger sert RagoOptimizer-Setup-1.3.0.exe (Supabase). Photos de profil : bucket « avatars ».', 'ok', 112),
    ('ok', 'Supabase', 'Mise à jour automatique de l’app', 'Version 1.3.0 (Rago Optimizer 1.3.0), envoyée à 100 % des apps.', 'ok', 96),
    ('ok', 'Netlify', 'Site rago-optimizer.com', 'Répond 200.', 'ok', 74),
    ('ok', 'Stripe', 'Paiements (mode live)', 'Clé, Compte, Prix mensuel, Prix annuel, Prix Lifetime, Webhook, Secret du webhook : OK.', 'ok', 288),
    ('ok', 'Resend', 'E-mails', 'rago-optimizer.com : vérifié.', 'ok', 143),
    ('ok', 'Discord', 'Rôle Pro', 'Bot, serveur et rôle OK.', 'ok', 201),
    ('ok', 'Discord', 'Bot communauté', 'Connecté.', 'ok', None),
    ('ok', 'DB-IP', 'Villes des tests réseau', 'Base DB-IP de novembre 2026.', 'ok', None),
]


def services(compact=False):
    out = ''
    for _, g, label, text, lv, ms in SERVICES:
        if compact:
            out += f'<li><span class="st {lv}"></span><b>{g} · {label}</b><span class="dur"></span></li>'
        else:
            out += (f'<li><span class="st {lv}"></span><div><small>{g}</small><b>{label}</b><p>{text}</p></div>'
                    f'{f"<span class=dur>{ms} ms</span>" if ms is not None else "<span></span>"}</li>')
    return f'<ul class="ad-svc{" cp" if compact else " two"}">{out}</ul>'


EVENTS = [  # heure, type, libellé, e-mail, détail
    ('15:41', 'e-license', 'Achat', 'kenzo@example.com', 'offre : Mensuel · montant : 5,99 $US'),
    ('15:22', 'e-device', 'PC activé', 'kenzo@example.com', 'PC : DESKTOP-K3NZ0'),
    ('15:04', 'e-admin', 'Temps Premium offert (admin)', 'mika@example.com', 'mois : 1 · note : créateur'),
    ('14:58', 'e-license', 'Achat', 'lena.k@example.com', 'offre : Annuel · montant : 29,99 $US'),
    ('14:31', 'e-user', 'Compte créé', 'lena.k@example.com', ''),
    ('13:47', 'e-sub', 'Résilié depuis l’app', 'sam.rbw@example.com', ''),
    ('13:12', 'e-license', 'Achat', 'm.dubois@example.com', 'offre : Mensuel · montant : 5,99 $US'),
    ('12:40', 'e-device', 'Activation refusée (autre PC)', 'bastien.rbw@example.com', 'PC : LAPTOP-BASTI'),
    ('11:56', 'e-user', 'Connexion Google/Discord liée', 'noa.pvp@example.com', 'Discord'),
    ('11:03', 'e-admin', 'Connexion à l’admin', '', 'IP : 92.184.••.••'),
]


def feed(rows, user=True):
    out = ''
    for t, k, label, email, detail in rows:
        u = f' · <a>{email}</a>' if (user and email) else ''
        out += f'<li><span class="d {k}"></span><p>{label}{u}{f"<span class=m>{detail}</span>" if detail else ""}</p><time>{t}</time></li>'
    return f'<ul class="ad-feed">{out}</ul>'


EVENTS_MORE = [
    ('10:48', 'e-license', 'Temps Premium ajouté', 'alex@example.com', 'jours : 14 · source : Discord'),
    ('09:26', 'e-license', 'Achat', 'ines.mc@example.com', 'offre : Annuel · montant : 29,99 $US'),
    ('08:03', 'e-license', 'Achat', 'rayan.k@example.com', 'offre : Mensuel · montant : 5,99 $US'),
]


# ---------- les pages ----------
def p_login(error=None):
    body = f'''<div class="ad-login"><span class="s-dots"></span>
<div class="tl"><a class="ad-logo"><img src="img/rago-app-dark-64.svg" alt=""><b>rago</b><span>admin</span></a>
<h1>tableau<br>de <span class="br">bord.</span></h1>
<p class="lede">Entre la clé <code>ADMIN_KEY</code> (variables Railway) pour ouvrir l’admin : joueurs, ventes, services, tests réseau et site.</p>
<div class="rows"><span>{I("users")}joueurs</span><span>{I("bars")}ventes</span><span>{I("activity")}services</span><span>{I("wifi")}tests réseau</span><span>{I("globe")}site</span><span>{I("brain")}cerveau</span></div></div>
<div class="s-card ad-lc"><h2>accès réservé.</h2><p>La même clé ouvre tout l’admin, Cerveau compris.</p>
<div class="ad-f">{alert(error) if error else ""}
{fld("Clé admin", f'<span class="ad-in pw{" focus" if not error else ""}">••••••••••••••••••••••<em>Afficher</em></span>')}
<span class="btn red">Entrer{I("arrow")}</span></div>
<p class="ft">{I("shield")}<span>Accès réservé. Chaque connexion, et chaque mauvaise clé, est notée dans le journal.</span></p></div></div>'''
    return body


def p_overview():
    todo = [
        ('warn', 'gift', '2 achats payés sans compte', 'Le joueur n’a pas encore créé son compte : renvoie-lui un lien.', 'Voir'),
        ('warn', 'card', '3 paiements ratés cette semaine', 'Carte refusée ou 3-D Secure abandonné.', 'Voir'),
        ('warn', 'clock', '1 abonnement impayé', 'Stripe réessaie la carte ; Premium reste tant que l’abonnement n’est pas arrêté.', 'Stripe'),
        ('info', 'info', '1 avertissement au démarrage', 'Variables Railway à vérifier.', 'Voir'),
    ]
    todo_html = '<ul class="ad-todo">' + ''.join(f'<li><span class="tg {k}">{I(i)}</span><p>{t}<span>{x}</span></p>{xbtn(a, "external" if a == "Stripe" else "")}</li>' for k, i, t, x, a in todo) + '</ul>'
    users = [('lena.k@example.com', 'month', 'il y a 1 h'), ('jules.b@example.com', 'free', 'il y a 2 h'), ('rayan.k@example.com', 'month', 'il y a 4 h'),
             ('chloe.g@example.com', 'free', 'il y a 5 h'), ('adam.pvp@example.com', 'free', 'il y a 7 h')]
    ulist = '<ul class="ad-feed">' + ''.join(f'<li class="u">{av(e, "s24")}<p><a>{e}</a></p><span class="rw">{prem(k)}<time>{t}</time></span></li>' for e, k, t in users) + '</ul>'
    mix = (f'<div class="ad-split"><span class="k1" style="width:66%"></span><span class="k2" style="width:15%"></span><span class="k4" style="width:19%"></span></div>'
           '<ul class="ad-key">'
           '<li><span><i class="k1"></i>Mensuels</span><span><b>139</b><em>66 %</em></span></li>'
           '<li><span><i class="k2"></i>Annuels</span><span><b>32</b><em>15 %</em></span></li>'
           '<li><span><i class="k3"></i>À vie (achetés)</span><span><b>0</b><em>0 %</em></span></li>'
           '<li><span><i class="k4"></i>Offerts</span><span><b>41</b><em>19 %</em></span></li></ul>'
           + lines([('Essais gratuits en cours', '23'), ('Résiliés (Premium jusqu’à la fin)', '17'), ('Comptes avec Premium', '17 %')]))
    body = (head('pilotage <b>//</b> dimanche 22 novembre', 'vue d’ensemble.', 'Tout Rago au même endroit : ventes Stripe, joueurs, services et activité.',
                 stamp('Ventes lues il y a 3 min') + btn('Actualiser', 'refresh'))
            + '<div class="ad-kpis">'
            + kpi('Encaissé aujourd’hui', 'card', big(TODAY), f'9 paiements {delta(12)}')
            + kpi('Ce mois-ci', 'bars', big(MONTH), f'296 paiements {delta(41)}', spark=spark())
            + kpi('Revenu mensuel récurrent', 'refresh', big(91258), '171 abonnements actifs · 23 en essai')
            + kpi('Joueurs Premium', 'users', '212', f'sur 1 284 comptes <span class="dl">{I("upright")}+96 en 7 j</span>')
            + '</div>'
            + '<div class="ad-g g21">'
            + card('Ventes des 30 derniers jours', 'bars', daychart(hi=17, tip='mardi 10 novembre'), more('Détail'),
                   f'Encaissé par jour (heure de Paris), remboursements déduits. Depuis le début : {usd(TOTAL)}, soit {usd(round(TOTAL * 0.9426))} reçus après frais. En USD, paiements en EUR convertis par Stripe.')
            + card('À traiter', 'inbox', todo_html, flush=True)
            + '</div>'
            + '<div class="ad-g">' + card('Joueurs et communauté', 'users', facts([
                ('Comptes', '1 284', '+18 en 24 h · +412 en 30 j'), ('PC actifs (7 j)', '486', '203 aujourd’hui · 642 activés'),
                ('Discord liés', '318', '164 avec le rôle Pro'), ('Avis', '64', 'moyenne 4,8 / 5 · 2 masqués'),
                ('Tests réseau (7 j)', '2 917', '391 PC'), ('Bannis', '3', 'plus de connexion ni Premium')]), more('Tous les joueurs'), flush=True) + '</div>'
            + '<div class="ad-g g21">'
            + card('Derniers paiements', 'card', sales_rows(SALES[:7], compact=True), more('Tous'), flush=True)
            + card('Premium', 'star', mix, more('Voir'))
            + '</div>'
            + '<div class="ad-g g21">'
            + card('Activité récente', 'list', feed(EVENTS + EVENTS_MORE), more('Journal complet'), flush=True)
            + '<div class="ad-col">' + card('Services', 'activity', services(True), more('Détail'), flush=True)
            + card('Derniers inscrits', 'user', ulist, more('Tous'), flush=True) + '</div>'
            + '</div>')
    return shell('accueil', body)


def p_sales():
    renew = [('23/11/2026', 'dans 1 j', 'Mensuel'), ('23/11/2026', 'dans 1 j', 'Mensuel'), ('24/11/2026', 'dans 2 j', 'Annuel'),
             ('25/11/2026', 'dans 3 j', 'Mensuel'), ('26/11/2026', 'dans 4 j', 'Mensuel'), ('28/11/2026', 'dans 6 j', 'Mensuel')]
    rrows = [f'<tr><th><a>{d}</a> <span class="dim small">{a}</span></th><td class="mut">{o}</td><td class="w1">{xbtn("Stripe", "external", "gh")}</td></tr>' for d, a, o in renew]
    subs = ('<section class="ad-card" style="margin-top:16px"><div class="ad-ch"><h2>' + I('refresh') + 'Abonnements</h2><div class="r">'
            + f'<a class="ad-more">Stripe{I("external")}</a></div></div><div class="ad-cb fl">'
            + facts([('Revenu mensuel récurrent', '912,58<span class="u">$US</span>', 'abonnements actifs non résiliés, ramenés au mois'), ('Sur un an', '10 950,96<span class="u">$US</span>', 'revenu mensuel × 12'),
                     ('Actifs', '171', '139 mensuels · 32 annuels dans la base'), ('En essai', '23', ''), ('Impayés', '1', 'Stripe réessaie la carte'),
                     ('Résiliés', '17', 'Premium jusqu’à la fin de la période')], 'wide')
            + '</div><div class="ad-ch" style="padding-top:20px;border-top:1px solid var(--line);margin-top:4px"><p style="margin:0;font-family:var(--cond);font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)">Renouvellements des 7 prochains jours</p></div>'
            + '<div class="ad-cb fl">' + table([('Quand', ''), ('Offre', ''), ('', 'w1')], rrows, 'cp') + '</div></section>')
    pay = ('<section class="ad-card" style="margin-top:16px"><div class="ad-ch"><h2>' + I('card') + 'Paiements</h2></div>'
           + '<div class="ad-chips"><span class="on">Tous</span><span>Payés</span><span>Remboursés</span><span>Échoués</span><span>Litiges</span></div>'
           + sales_rows(SALES, stripe=True)
           + f'<div class="ad-pager"><span>1–12 sur 612</span><span class="row"><span>Page 1 / 51</span>{nxt("Plus anciens")}</span></div></section>')
    received = lines([('Aujourd’hui', usd(round(TODAY * .941))), ('Ce mois-ci', usd(round(MONTH * .9426))), ('Depuis le début', usd(round(TOTAL * .9426))),
                      ('Frais Stripe (total)', f'<span class="mut">{usd(round(TOTAL * .0574))}</span>'), ('Part des frais', '<span class="mut">5,7 %</span>')], 'big tight')
    kinds = ('<div class="ad-split"><span class="k1" style="width:100%"></span></div><ul class="ad-key">'
             f'<li><span><i class="k1"></i>Abonnements</span><span><b>{usd(TOTAL)}</b><em style="min-width:90px">612 paiements</em></span></li>'
             '<li><span><i class="k3"></i>Paiements uniques (à vie)</span><span><b>0,00 $US</b><em style="min-width:90px">0 paiement</em></span></li></ul>'
             + lines([('Panier moyen', '7,95 $US'), ('Remboursé', '23,96 $US'), ('Paiements ratés (7 jours)', '<a style="color:var(--ink);text-decoration:underline">3</a>')]))
    body = (head('pilotage <b>//</b> stripe en direct', 'ventes.', 'Encaissé dans Stripe (mode live), remboursements déduits, avant frais. Jours et mois en heure de Paris.',
                 stamp('Lu dans Stripe il y a 3 min') + btn('Actualiser', 'refresh') + btn('Stripe', 'external'))
            + '<div class="ad-kpis">'
            + kpi('Aujourd’hui', 'card', big(TODAY), f'9 paiements {delta(12)}')
            + kpi('7 derniers jours', 'bars', big(WEEK), f'71 paiements {delta(-8)}')
            + kpi('Ce mois-ci', 'bars', big(MONTH), f'296 paiements {delta(41)}', spark=spark())
            + kpi('Depuis le début', 'stack', big(TOTAL), '612 paiements · 23,96 $US remboursés')
            + '</div><div class="ad-g g2">'
            + card('30 derniers jours', 'bars', daychart(), sub=f'Hier : {usd(DAYS[-2][2])} ({round(DAYS[-2][2] / 640)} paiements). En USD, paiements en EUR convertis par Stripe.')
            + card('12 derniers mois', 'bars', monthchart(), sub=f'Mois dernier : {usd(OCT)} (316 paiements). En USD, paiements en EUR convertis par Stripe.')
            + '</div><div class="ad-g g2">'
            + card('Reçu sur le compte Stripe', 'download', received, sub='Après les frais Stripe, dans la devise du compte.')
            + card('Par type', 'stack', kinds, sub='Abonnements et paiements uniques, depuis le début.')
            + '</div>' + subs + pay)
    return shell('ventes', body)


PLAYERS = [  # e-mail, nom, premium, jusqu'au, inscrit, vu, discord
    ('kenzo@example.com', 'Kenzo', 'month', '22/12/2026', 'il y a 2 h', 'il y a 4 min', '@kenzo.pvp'),
    ('lena.k@example.com', 'Lena', 'year', '22/11/2027', 'il y a 1 h', 'il y a 12 min', '–'),
    ('alex@example.com', 'Alex', 'month', '14/12/2026', 'il y a 39 j', 'il y a 26 min', '@alexpvp'),
    ('sam.rbw@example.com', 'Sam', 'cancel', '03/12/2026', 'il y a 40 j', 'il y a 1 h', '@samrbw'),
    ('mika@example.com', 'Mika', 'gift', '22/12/2026', 'il y a 21 j', 'il y a 2 h', '@mikamc'),
    ('hugo.lunar@example.com', 'Hugo', 'life', 'à vie', 'il y a 43 j', 'il y a 3 h', '@hugolunar'),
    ('noa.pvp@example.com', 'Noa', 'year', '09/11/2027', 'il y a 13 j', 'il y a 5 h', '@noa'),
    ('jules.b@example.com', '', 'free', '–', 'il y a 2 h', 'il y a 2 h', '–'),
    ('tom.bridge@example.com', 'Tom', 'refund', '–', 'il y a 6 j', 'il y a 1 j', '–'),
    ('ines.mc@example.com', 'Inès', 'year', '22/11/2027', 'il y a 41 j', 'il y a 1 j', '@ines'),
    ('yanis@example.com', '', 'ban', '–', 'il y a 18 j', 'il y a 9 j', '@yns'),
    ('liam.hypixel@example.com', 'Liam', 'free', '–', 'il y a 27 j', 'il y a 11 j', '–'),
]


def p_players():
    rows = [f'<tr><th>{who(e, n)}</th><td>{prem(p)}</td><td class="num mut">{u}</td><td class="mut">{i}</td><td class="mut">{v}</td><td class="mut">{d}</td></tr>'
            for e, n, p, u, i, v, d in PLAYERS]
    chips = [('Tous', '1 284', True), ('Premium', '212', False), ('Abonnés', '171', False), ('En essai', '23', False), ('Résiliés', '17', False),
             ('À vie', '6', False), ('Offerts', '35', False), ('Gratuits', '1 069', False), ('Bannis', '3', False)]
    body = (head('joueurs <b>//</b> 1 284 comptes', 'joueurs.', 'Cherche par e-mail, nom public, clé de licence, client ou abonnement Stripe (cus_…, sub_…), pseudo ou identifiant Discord.',
                 btn('Exporter (CSV)', 'download') + btn('Offrir Premium', 'gift', 'red'))
            + '<section class="ad-card"><div class="ad-tool">' + f'<span class="ad-in">{I("search")}E-mail, nom, clé, cus_…, sub_…, Discord</span>'
            + sel('Vus récemment dans l’app') + btn('Chercher') + '</div>'
            + '<div class="ad-chips">' + ''.join(f'<span{" class=on" if o else ""}>{l}<em>{n}</em></span>' for l, n, o in chips) + '</div>'
            + table([('Joueur', ''), ('Premium', ''), ('Jusqu’au', ''), ('Inscrit', ''), ('Vu dans l’app', ''), ('Discord', '')], rows)
            + f'<div class="ad-pager"><span>1–12 sur 1 284</span><span class="row"><span>Page 1 / 107</span>{nxt("Suivants")}</span></div></section>')
    return shell('joueurs', body)


def p_player():
    lic = f'''<article class="ad-lic"><div class="h"><div class="row">{prem("month")}<span class="dim small">Stripe · 14/10/2026</span></div><span class="small mut">Prochain paiement 14/12/2026</span></div>
<div class="b">{kv([("Clé de licence", f'<span class="ad-key-l">RAGO-7K2QF-H8D3N-P5WTA-M4XZ9{I("copy")}</span>', True), ("Offre", 'Mensuel <span class="dim">· 5,99 $US</span>'),
     ("Payé / offert jusqu’au", "14/12/2026"), ("État", "Active"), ("Stripe", "<a>cus_R4kT9mQwZ2</a><br><a>sub_1QdX7hKp3</a>"), ("Code d’affilié utilisé", '<span class="num">K7RMQ2</span>')])}
<div class="ad-pc">{I("pc")}<div><b>DESKTOP-ALEX</b><span>Windows 11 · app 1.3.0 · vu il y a 26 min · activé le 14/10/2026 · IP 92.184.••.••</span></div></div></div>
<div class="a">{xbtn("Libérer le PC", "pc")}{xbtn("Résilier en fin de période")}{xbtn("Arrêter tout de suite", "", "dg")}<div class="ad-inl" style="flex-basis:100%"><span class="ad-in sm ph" style="flex:1">Raison (facultatif)</span>{xbtn("Révoquer", "", "dg")}</div></div></article>
<article class="ad-lic off"><div class="h"><div class="row">{prem("ended")}<span class="dim small">Offerte par l’équipe · 10/10/2026</span></div></div>
<div class="b">{kv([("Clé de licence", '<span class="ad-key-l">RAGO-3MWQ8-•••••-•••••-T7KD2</span>', True), ("Offre", "Offert"), ("Payé / offert jusqu’au", "17/10/2026"), ("État", "Révoquée (remplacée par un autre achat)")])}</div>
<div class="a">{xbtn("Rétablir")}</div></article>
<p class="ad-more-box">{I("right")}Rattacher un achat payé avec un autre e-mail</p>'''
    hist = [('15:12', 'e-device', 'Téléchargement', '', 'app 1.3.0'), ('hier', 'e-sub', 'Repris depuis l’app', '', ''), ('20/11', 'e-sub', 'Résilié depuis l’app', '', ''),
            ('02/11', 'e-license', 'Temps Premium ajouté', '', 'mois : 1 · source : Discord'), ('14/10', 'e-device', 'PC activé', '', 'PC : DESKTOP-ALEX'), ('14/10', 'e-license', 'Achat', '', 'offre : Mensuel · montant : 5,99 $US'),
            ('14/10', 'e-user', 'Connexion Google/Discord liée', '', 'Discord'), ('14/10', 'e-user', 'Compte créé', '', '')]
    access = (f'<div class="ad-act"><h3>Offrir du temps Premium</h3><p>S’ajoute à la date actuelle. Pour un abonné Stripe, ses prochains paiements sont décalés d’autant.</p>'
              f'<div class="ad-inl"><span class="ad-in sm" style="width:64px">7</span>{sel("jours", "sm")}{xbtn("Offrir", "", "red")}</div></div>'
              f'<div class="ad-act"><h3>Premium à vie</h3><p>Licence offerte, sans paiement. Remplace un temps offert ; pas un abonnement en cours.</p>'
              f'<div class="ad-inl"><span class="ad-in sm ph" style="flex:1">Note (facultatif)</span>{xbtn("Offrir à vie")}</div></div>'
              f'<div class="ad-act"><h3>Mot de passe</h3><p>Un lien d’une heure, à envoyer à ce joueur seulement, quand l’e-mail n’arrive pas.</p>{xbtn("Créer un lien", "link")}</div>'
              f'<div class="ad-act"><h3>Bannir</h3><p>Plus de connexion au site ni à l’app, sessions fermées, licence coupée, abonnement Stripe arrêté (sans remboursement), rôle Discord retiré.</p>'
              f'<div class="ad-inl"><span class="ad-in sm ph" style="flex:1">Raison</span>{xbtn("Bannir", "ban", "dg")}</div></div>')
    trials = (lines([('Essai gratuit', '<span class="num small">14/10/2026</span>')], 'tight')
              + '<p class="ad-hint" style="margin-top:10px">2 PC vus dans l’app avec ce compte, dernier il y a 26 min.</p>')
    discord = (kv([('Compte', '@alexpvp<br><span class="dim num">934215870331209758</span>'), ('Rôle Pro', 'Donné'), ('Lié le', '14/10/2026'), ('Vérifié', 'il y a 2 h')], 't')
               + '<p class="ad-hint" style="margin:8px 0 14px">VIP le 02/11/2026 (Premium jusqu’au 02/12/2026)</p>'
               + f'<div class="ad-inl">{xbtn("Remettre le rôle à jour", "refresh")}{xbtn("Délier")}</div>')
    aff = (kv([('Code', '<span class="num">K7RMQ2</span>'), ('Filleuls comptés', '2'), ('Prochaine récompense', '2 / 3'), ('Récompenses', '0 × 6 mois')], 't')
           + f'<div class="ad-inl" style="margin-top:12px">{xbtn("Recalculer", "refresh")}</div>')
    review = (f'<div style="display:flex;justify-content:space-between;align-items:center"><span class="ad-stars">★★★★★</span>{pl("ok", "Affiché sur le site")}</div>'
              '<p class="ad-quote">“Ping went from spiky to flat on Hypixel. The network test alone is worth it.”</p>'
              f'<p class="ad-hint" style="margin-top:8px">18/11/2026 · app 1.3.0</p><div class="ad-inl" style="margin-top:12px">{xbtn("Masquer l’avis")}</div>'
              f'<div class="ad-sep"></div><div class="ad-inl"><span class="ad-in sm" style="flex:1">Alex</span>{xbtn("Changer")}</div><div class="ad-inl" style="margin-top:10px">{xbtn("Retirer la photo", "image")}</div>')
    uh = (f'<nav class="ad-crumbs"><a>Joueurs</a>{I("right")}<span>alex@example.com</span></nav>'
          f'<section class="ad-uh">{av("alex@example.com", "s64")}<div><h1>alex@example.com{I("copy")}</h1>'
          f'<div class="row">{prem("month")}{pl("line", "Alex")}{pl("line", "@alexpvp")}</div>'
          f'<div class="fl"><span>{I("user")}Inscrit le 14/10/2026</span><span>{I("key")}Connexion : mot de passe, Discord</span><span>{I("clock")}2 sessions site · 1 app</span></div></div>'
          f'<div class="acts">{btn("Stripe", "external")}{btn("Écrire", "mail")}</div></section>')
    body = (uh + '<div class="ad-g g21" style="margin-top:0">'
            + '<div class="ad-col">' + card('Premium', 'star', lic, sub='2 licences sur ce compte, la plus récente en premier.') + card('Essais et PC', 'pc', trials) + '</div>'
            + '<div class="ad-col">' + card('Gérer l’accès', 'shield', access, flush=True) + card('Historique', 'list', feed(hist, False), flush=True) + '</div>'
            + '</div><div class="ad-g g3">' + card('Discord', 'chat', discord) + card('Affiliation', 'link', aff) + card('Avis et profil', 'user', review) + '</div>'
            + '<div class="ad-g">' + card('Supprimer le compte', 'trash',
                f'<div class="ad-zone"><p class="ad-hint">Arrête l’abonnement Stripe, efface le compte, le PC, les sessions, la photo et l’avis. Les licences restent, sans nom, pour la comptabilité. Irréversible (RGPD).</p>'
                f'<div class="ad-inl"><span class="ad-in sm ph" style="width:260px">Recopie alex@example.com</span>{xbtn("Supprimer définitivement", "trash", "dg")}</div></div>', cls='danger') + '</div>')
    return shell('joueurs', body)


def p_purchases():
    res = ('<ul class="ad-todo">'
           f'<li><span class="tg ok">{I("check")}</span><p>clara.v@example.com<span>Premium jusqu’au 22/12/2026</span></p><div class="ad-secret" style="padding:0;border:0;background:none"><div class="row" style="margin:0;width:470px"><code>https://account.rago-optimizer.com/claim/8f3c1d…e21a</code>{xbtn("", "copy")}</div></div></li>'
           f'<li><span class="tg ok">{I("check")}</span><p><a style="color:var(--ink);text-decoration:underline">mika@example.com</a><span>Premium jusqu’au 22/12/2026</span></p><span></span></li>'
           f'<li><span class="tg info">{I("info")}</span><p><a style="color:var(--ink);text-decoration:underline">hugo.lunar@example.com</a><span>déjà Premium (À vie), rien donné</span></p><span></span></li>'
           '</ul>')
    form = ('<div class="ad-f">'
            + fld('E-mails', '<span class="ad-in ta">clara.v@example.com, mika@example.com<br>hugo.lunar@example.com</span>')
            + f'<div class="ad-fld"><span class="ad-lbl">Durée</span><div class="ad-inl"><span class="ad-in" style="width:84px">1</span>{sel("mois")}</div></div>'
            + fld('Note', inp('facultatif : créateur, concours…', ph=True))
            + f'<div>{btn("Offrir", "gift", "red")}</div>'
            + '<p class="ad-hint">Un e-mail qui a déjà Premium, ou une licence qui l’attend, n’est pas touché. Pour ajouter du temps à un joueur Premium, ouvre sa fiche.</p></div>')
    rows = [f'<tr><th>{e}<br><span class="dim small num">{i}</span>{f"<br><span class=dim small>{x}</span>" if x else ""}</th><td class="nw">{o}<br><span class="dim small">{m}</span></td><td class="mut">{s}</td><td class="r num mut">{d}</td><td class="w1">{xbtn("Nouveau lien", "link")}</td></tr>'
            for e, i, x, o, m, s, d in [('theo.m@example.com', 'lic_9QwX2rTk4m', '', 'Mensuel', '5,99 $US', 'Stripe', '21/11/2026'),
                                         ('clara.v@example.com', 'lic_3NdP8vLs1c', '', 'Offert', '', 'Offerte par l’équipe', '22/11/2026'),
                                         ('jade.r@example.com', 'lic_7HkM2bYe6t', '', 'Annuel', '29,99 $US', 'Stripe', '19/11/2026')]]
    body = (head('joueurs <b>//</b> cadeaux et achats en attente', 'offrir et achats.', 'Offre Premium à un ou plusieurs e-mails, avec ou sans compte. Retrouve les achats payés dont le joueur n’a pas encore créé son compte.')
            + card('Résultat', 'check', res, sub='Les liens (création du compte) sont affichés une seule fois.', flush=True)
            + '<div class="ad-g g12">' + card('Offrir Premium', 'gift', form)
            + card('Pas encore sur un compte', 'inbox', table([('E-mail', ''), ('Offre', ''), ('Source', ''), ('Date', 'r'), ('', 'w1')], rows),
                   sub='Achats et cadeaux payés ou offerts, en attente que le joueur crée son compte.', flush=True) + '</div>')
    return shell('achats', body)


def p_site():
    form = ('<div class="ad-f">'
            + '<label class="ad-sw"><span><b>Afficher la pop-up sur le site</b><span>Masquée d’elle-même quand le code est épuisé.</span></span><span class="sw on"></span></label>'
            + fld('Code', inp('RAGO15', 'code'), 'Un code qui n’existe pas encore est créé dans Stripe, réservé aux nouveaux clients, sur le premier paiement.')
            + '<div class="ad-pair">' + fld('Réduction (%)', inp('15')) + fld('Nombre de clients', inp('200')) + '</div>'
            + '<p class="ad-hint">Stripe ne change pas la réduction ni le nombre de clients d’un code existant : pour une autre offre, tape un nouveau code.</p>'
            + fld('Petit titre', inp('Welcome offer')) + fld('Titre', inp('Get {percent}% off now!'))
            + fld('Texte', '<span class="ad-in ta" style="min-height:76px">Use this code on your first Premium payment, monthly or yearly.</span>',
                  'En anglais, comme le site. {percent} devient la réduction, {code} le code, {total} le nombre de clients et {left} les places restantes.')
            + f'<div>{btn("Enregistrer", "", "red")}</div></div>')
    side = (kv([('Code', '<span class="num">RAGO15</span>'), ('Réduction', '15 % sur le premier paiement, nouveaux clients'), ('Utilisations', '128 sur 200'), ('Restantes', '72')], 't')
            + '<div class="ad-meter"><span style="width:64%"></span></div>'
            + f'<div class="ad-pop"><span class="x">{I("x")}</span><p class="eb">Welcome offer</p><p class="t">Get <span>15%</span> off now!</p>'
            '<p class="tx">Use this code on your first Premium payment, monthly or yearly.</p><p class="cd">RAGO15</p>'
            '<p class="lf">Limited to the first 200 players · <b>72 left</b></p></div>'
            '<p class="ad-hint" style="margin-top:10px">Aperçu de la pop-up, comme sur le site.</p>')
    popup = card('Pop-up de réduction', 'tag', f'<div class="ad-ed"><div class="m">{form}</div><aside class="s">{side}</aside></div>', pl('ok', 'Affichée sur le site'), flush=True)
    promo = card('Créer un code promo', 'tag',
                 '<div class="ad-line">' + fld('Code', inp('RAGO15', 'code', ph=True)) + fld('Réduction (%)', inp('15', ph=True)) + fld('S’applique', sel('au premier paiement'))
                 + f'<div>{btn("Créer dans Stripe", "", "red")}</div></div>',
                 sub='Réservé aux nouveaux clients, dans le mode de la clé Stripe (live). Pour la pop-up, tape plutôt le code dans le formulaire au-dessus.')
    revs = [('alex@example.com', 'Alex', 5, 'Ping went from spiky to flat on Hypixel. The network test alone is worth it.', '18/11/2026', True),
            ('ines.mc@example.com', 'Inès', 5, 'Easy to set up and the in-game bar is clean. FPS on Lunar went up right away.', '16/11/2026', True),
            ('noa.pvp@example.com', 'Noa', 4, 'Hit registration feels better in RBW. Would love more presets.', '12/11/2026', True),
            ('yanis@example.com', 'yns', 1, 'trash, buy my config instead discord.gg/…', '09/11/2026', False),
            ('hugo.lunar@example.com', 'Hugo', 5, 'Restore put everything back when I switched PCs. Support on Discord answered in minutes.', '02/11/2026', True)]
    rrows = [f'<tr><th>{who(n, e)}</th><td><span class="ad-stars">{"★" * r}<s>{"★" * (5 - r)}</s></span></td><td class="wr{"" if ok else " dim"}">{c}</td><td class="r num mut nw">{d}</td><td class="w1">{xbtn("Masquer" if ok else "Afficher")}</td></tr>'
             for e, n, r, c, d, ok in revs]
    reviews = card('Avis', 'star', table([('Joueur', ''), ('Note', ''), ('Avis', ''), ('Date', 'r'), ('Site', 'w1')], rrows), pl('line', '63 affichés sur 64'), flush=True)
    body = (head('produit <b>//</b> ce que voit le site', 'site et promos.', 'La pop-up de réduction du site, les codes promo Stripe (mode live) et les avis affichés sur le site.')
            + popup + '<div class="ad-g">' + promo + reviews + '</div>')
    return shell('site', body)


NET_T = ['Hypixel', 'Minemen', 'Paris', 'Francfort', 'Londres', 'Stockholm', 'Madrid', 'Virginie', 'Internet']
CITIES = [('Paris', 'Île-de-France, FR', 96, 812, [104, 24, 6, 14, 12, 34, 26, 86, 9]),
          ('Lyon', 'Auvergne-Rhône-Alpes, FR', 41, 355, [112, 29, 11, 17, 19, 38, 24, 93, 12]),
          ('Marseille', 'Provence-Alpes-Côte d’Azur, FR', 33, 281, [118, 33, 13, 21, 22, 42, 26, 98, 14]),
          ('Bruxelles', 'Bruxelles-Capitale, BE', 27, 214, [101, 19, 9, 10, 10, 30, 31, 83, 8]),
          ('Lille', 'Hauts-de-France, FR', 22, 188, [106, 22, 8, 12, 11, 33, 30, 88, 10]),
          ('Montréal', 'Québec, CA', 18, 152, [31, 92, 84, 96, 79, 112, 101, 18, 11]),
          ('Genève', 'Genève, CH', 14, 117, [114, 27, 14, 13, 21, 37, 29, 95, 11]),
          ('Casablanca', 'Grand Casablanca, MA', 11, 96, [149, 61, 46, 55, 52, 77, 31, 128, 27]),
          ('Toulouse', 'Occitanie, FR', 10, 84, [117, 35, 16, 24, 23, 44, 19, 99, 15])]
ISPS = [('Orange', 'FR', 118, '1 003', [107, 25, 8, 15, 14, 36, 25, 89, 10]), ('Free', 'FR', 97, 846, [104, 23, 7, 14, 13, 35, 26, 87, 9]),
        ('SFR', 'FR', 54, 467, [113, 31, 12, 19, 18, 40, 28, 94, 13]), ('Bouygues Telecom', 'FR', 38, 322, [110, 28, 10, 17, 16, 38, 27, 91, 12]),
        ('Proximus', 'BE', 21, 171, [101, 19, 9, 10, 10, 30, 31, 83, 8]), ('Vidéotron', 'CA', 12, 104, [30, 93, 85, 97, 80, 113, 102, 18, 10])]


def heat(ms):
    return 'p-1' if ms <= 30 else 'p-2' if ms <= 60 else 'p-3' if ms <= 100 else 'p-4'


def nettable(rows, label, isp=False):
    out = []
    for j, r in enumerate(rows):
        name, place, players, tests, vals = r
        cells = ''.join(f'<td class="p {heat(v)}{" loss" if (j == 7 and k in (0, 7)) else ""}"><span><b>{v}</b></span></td>' for k, v in enumerate(vals))
        out.append(f'<tr><th>{name}<span class="dim small"> · {place}</span></th><td class="r num">{players}</td><td class="r num">{tests}</td>{cells}</tr>')
    return table([(label, ''), ('Joueurs', 'r'), ('Tests', 'r')] + [(t, 'r') for t in NET_T], out, 'net cp')


def p_network():
    scale = (f'<div class="ad-scale"><span class="p-1"><i></i>≤ 30 ms</span><span class="p-2"><i></i>≤ 60 ms</span><span class="p-3"><i></i>≤ 100 ms</span>'
             f'<span class="p-4"><i></i>plus</span><span><span class="u">souligné</span> : plus de 2 % de paquets perdus</span></div>')
    body = (head('produit <b>//</b> test réseau de l’app', 'où jouent les joueurs.', 'Ping médian en ms vers chaque serveur du test réseau de l’app, sur les 30 derniers jours. Survole un chiffre pour le nombre de mesures et les pertes.',
                 '<div class="ad-chips bare"><span class="on">30 jours</span><span>90 jours</span><span>365 jours</span></div>' + btn('Tout exporter (CSV)', 'download'))
            + f'<div style="margin:-6px 0 18px">{pl("ok", "Villes : base DB-IP de novembre 2026")}</div>'
            + '<div class="ad-kpis">' + kpi('Joueurs', 'users', '391', 'PC différents') + kpi('Tests', 'wifi', '3 406', 'dernier il y a 6 min')
            + kpi('Villes', 'globe', '148') + kpi('Avec la ville', 'check', '94 %', 'tests localisés') + '</div>'
            + '<div class="ad-g">' + card('Par ville', 'globe', nettable(CITIES, 'Ville'), scale, flush=True)
            + card('Par fournisseur d’accès', 'wifi', nettable([(n, c, p, t, v) for n, c, p, t, v in ISPS], 'Fournisseur'), flush=True) + '</div>'
            + '<p class="ad-hint" style="margin-top:16px">Villes et fournisseurs : <a>IP Geolocation by DB-IP</a> (CC BY 4.0), déduits de l’adresse IP qui n’est jamais gardée. Tests gardés 12 mois.</p>')
    return shell('reseau', body)


def p_services():
    checks = [('ok', 'Clé', 'Clé live : les paiements sont réels.'), ('ok', 'Compte', 'Paiements activés. Libellé sur le relevé bancaire : RAGO OPTIMIZER.'),
              ('ok', 'Prix mensuel', 'Rago Optimizer Premium · 5,99 $US par mois.'), ('ok', 'Prix annuel', 'Rago Optimizer Premium · 29,99 $US par an.'),
              ('warn', 'Prix Lifetime', 'STRIPE_PRICE_LIFETIME est vide : la carte Lifetime du site affiche « Coming soon » et rien n’est vendu.'),
              ('ok', 'Webhook', 'Destination vers account.rago-optimizer.com, avec les 10 événements.'),
              ('ok', 'Secret du webhook', 'Dernier événement live reçu : invoice.paid, il y a 9 min.')]
    lv = {'ok': ('ok', 'OK'), 'warn': ('warn', 'À vérifier'), 'error': ('err', 'À corriger')}
    ck = lambda items, two=False: f'<ul class="ad-checks{" two" if two else ""}">' + ''.join(f'<li>{pl(*lv[l])}<div><b>{a}</b><p>{t}</p></div></li>' for l, a, t in items) + '</ul>'
    dis = [('ok', 'Bot', 'Connecté en tant que Rago.'), ('ok', 'Adresse de retour', 'https://account.rago-optimizer.com/discord/callback'), ('ok', 'Serveur', 'Rago Optimizer'), ('ok', 'Rôle', '« Pro »')]
    com = [('ok', 'Connexion live', 'Connectée, dernier événement 14:47 UTC.'), ('ok', 'Invitations', '212 liens suivis. Un ami compte après 7 jours sur le serveur.'),
           ('ok', 'VIP / MVP', 'VIP à 10 invitations, MVP à 15 invitations, donnés par le bot Rago.')]
    warn = ck([('warn', '', 'SUPPORT_URL is still the example: the link is hidden until it\'s a real URL.')])
    body = (head('système <b>//</b> vérifiés depuis ce serveur', 'services.', 'Railway, Supabase, Netlify, Stripe, Resend, Discord et DB-IP, interrogés depuis ce serveur avec ses propres variables. Rien à installer.',
                 stamp('Vérifiés il y a 1 min') + btn('Vérifier maintenant', 'refresh'))
            + '<div class="ad-kpis">' + kpi('En marche', 'check', '10') + kpi('À vérifier', 'info', '1') + kpi('En panne', 'alert', '0') + kpi('Éteints', 'clock', '0') + '</div>'
            + '<div class="ad-g">' + card('État des services', 'activity', services(), flush=True)
            + card('Avertissements du démarrage', 'alert', warn, sub='Les mêmes lignes [warn] que dans les logs Railway.', flush=True)
            + card('Paiements Stripe', 'card', ck(checks, True) + '<span></span>', pl('ok', 'Prêt pour le live'), flush=True) + '</div>'
            + '<div class="ad-g g2">' + card('Rôle Pro sur Discord', 'chat', ck(dis), pl('ok', 'Automatique'), flush=True)
            + card('Bot communauté Discord', 'users', ck(com), pl('ok', 'Actif'), flush=True) + '</div>'
            + '<p class="ad-hint" style="margin-top:16px">Pas encore surveillés d’ici : les serveurs Rago Route (Vultr) et la facturation de Railway, Supabase et Netlify (à voir sur leurs sites).</p>')
    return shell('services', body)


def p_journal():
    groups = [('Aujourd’hui', '22/11', EVENTS), ('Hier', '21/11', [
        ('23:58', 'e-license', 'Lien de réclamation créé', 'theo.m@example.com', ''),
        ('22:51', 'e-license', 'Licence révoquée', 'tom.bridge@example.com', 'raison : remboursée'),
        ('21:34', 'e-license', 'Achat', 'noa.pvp@example.com', 'offre : Annuel · montant : 29,99 $US'),
        ('19:10', 'e-admin', 'Achat rattaché (admin)', 'jade.r@example.com', 'licences : lic_7HkM2bYe6t'),
        ('18:02', 'e-admin', 'Avis masqué (admin)', 'yanis@example.com', ''),
        ('17:45', 'e-license', 'Achat', 'lucas.bw@example.com', 'offre : Mensuel · montant : 5,99 $US'),
        ('16:31', 'e-device', 'PC libéré', 'ines.mc@example.com', 'PC : DESKTOP-INES')])]
    rows = []
    for g, d, evs in groups:
        rows.append(f'<tr class="day"><th colspan="4">{g}<em>{d}</em></th></tr>')
        for t, k, label, email, detail in evs:
            rows.append(f'<tr><td class="num mut w1">{t}</td><th><span class="ad-inl"><span class="ad-feed"><span class="d {k}" style="display:block"></span></span>{label}</span></th>'
                        f'<td>{f"<a>{email}</a>" if email else "<span class=dim>–</span>"}</td><td class="mut small wr">{detail}</td></tr>')
    chips = ['Tout', 'Actions admin', 'Licences', 'Comptes', 'PC', 'Abonnements', 'Affiliation']
    body = (head('système <b>//</b> gardé 12 mois', 'journal.', 'Tout ce qui arrive aux comptes et aux licences, et chaque action faite ici. Gardé 12 mois.')
            + '<section class="ad-card"><div class="ad-chips">' + ''.join(f'<span{" class=on" if i == 0 else ""}>{c}</span>' for i, c in enumerate(chips)) + '</div>'
            + table([('Heure', 'w1'), ('Événement', ''), ('Joueur', ''), ('Détail', '')], rows)
            + f'<div class="ad-pager"><span>100 événements</span><span class="row">{nxt("Plus anciens")}</span></div></section>')
    return shell('journal', body)


def p_notfound():
    body = (head('', 'introuvable.', '', '', crumbs=['Joueurs', 'Introuvable'])
            + '<section class="ad-card"><div class="ad-nf"><div class="l"><p class="big">404</p><h2>rien à cette adresse.</h2>'
            + '<p>Ce compte n’existe pas (ou plus).</p>'
            + f'<div class="acts">{btn("Retour aux joueurs", "left", "red")}{btn("Chercher un joueur", "search")}</div></div>'
            + '<div class="r">'
            + f'<div class="row" style="top:96px">{av("kenzo@example.com")}<div><b>kenzo@example.com</b><span>Mensuel · vu il y a 4 min</span></div></div>'
            + f'<div class="row miss" style="top:176px"><span class="av c2">?</span><div><b>usr_8Hq2…Zk</b><span>Compte supprimé ou adresse fausse</span></div></div>'
            + f'<div class="row" style="top:256px">{av("lena.k@example.com")}<div><b>lena.k@example.com</b><span>Annuel · vu il y a 12 min</span></div></div>'
            + '</div></div></section>')
    return shell('joueurs', body)


# ---------- le cerveau ----------
# Couleurs des groupes : celles du vrai Cerveau (licensing/public/cerveau.js, GROUPS) ; nombres : le vault de staging.
GROUPS = [('Pilotage', '#FF5E55', 8), ('Technique', '#5AB8FF', 22), ('Fonctionnalités', '#3DDC97', 27), ('Code', '#2DD4BF', 242),
          ('Tweaks', '#B69CFF', 12), ('Versions', '#FF8A82', 7), ('Marketing', '#FFD60A', 16), ('Design', '#F0A6CA', 3),
          ('Suivi', '#A1A1AA', 8), ('Projets', '#F5F5F6', 1), ('Historique', '#E879F9', 10)]


def p_brain():
    # La toile : le vrai Cerveau (public/cerveau.js) lancé sur le vault de staging, note « Cerveau du vault » ouverte,
    # lecteur de 560 px, capturée telle quelle (outils : cvh/build.mjs et cvh/shot.js). Elle ne doit pas changer.
    graph = '<img class="g" src="img/admin/cerveau-toile.png" alt="">'
    tree = [('Code', 242, False, []), ('Design', 3, False, []), ('Fonctionnalités', 27, False, []), ('Historique', 10, False, []),
            ('Marketing', 16, False, []), ('Projets', 1, False, []), ('Suivi', 8, False, []),
            ('Technique', 22, True, ['API du serveur', 'App Windows', 'Architecture', 'Architecture de l’app', 'Architecture du serveur',
                                     'Branches et environnements', 'Cerveau du vault', 'CI GitHub Actions', 'Clés et secrets', 'Connexion Google et Discord'])]
    col = {g: c for g, c, _ in GROUPS}
    t = '<p class="cv-h"><span>Vault</span><span>356 notes</span></p>'
    for g, n, open_, kids in tree:
        t += f'<div class="cv-row dir"><i data-i="right" class="ch{" o" if open_ else ""}"></i><span class="dt" style="--c:{col[g]}"></span>{g}<span class="n">{n}</span></div>'
        if kids:
            t += '<div class="cv-sub">' + ''.join(f'<div class="cv-row{" on" if k == "Cerveau du vault" else ""}"><span class="dt" style="--c:{col[g]}"></span>{k}</div>' for k in kids) + '</div>'
    side = (f'<aside class="cv-side"><div class="cv-brand"><img src="img/rago-app-dark-64.svg" alt=""><div><b>cerveau</b><small>Rago Optimizer</small></div><span class="bk">{I("left")}</span></div>'
            f'<div class="cv-box"><span class="lb">Cerveau</span><b>Rago Optimizer</b>{I("chev")}</div>'
            f'<div class="cv-box">{I("search")}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">Rechercher une note ou un fichier</span><kbd style="margin:0">Ctrl K</kbd></div>'
            f'<div class="cv-box fl">{I("sliders")}Filtrer le graphe</div>'
            f'<div class="cv-tabs"><span class="on">{I("folder")}Fichiers</span><span>{I("sliders")}Affichage</span></div>'
            f'<div class="cv-tree">{t}</div>'
            f'<div class="cv-foot"><span>Vault lu <b>il y a 2 min</b> · staging</span>{I("refresh")}</div></aside>')
    hud = (f'<div class="cv-hud l"><span class="cv-chip"><b>356</b> notes</span></div>'
           f'<div class="cv-hud r"><span class="cv-ib w">{I("graph")}Local</span><span class="cv-ib">1</span><span class="cv-ib">{I("plus")}</span><span class="cv-ib">{I("minus")}</span><span class="cv-ib">{I("fit")}</span></div>')
    reader = ('<section class="cv-reader"><header class="cv-rbar">'
              f'<span class="cv-ib">{I("left")}</span><div class="cr"><span>Technique</span>{I("right")}<b>Cerveau du vault</b></div>'
              f'<span class="cv-ib">{I("link")}</span><span class="cv-ib">{I("maximize")}</span><span class="cv-ib">{I("x")}</span></header>'
              '<article class="cv-doc"><div class="cv-meta"><span class="cv-tag" style="--c:#5AB8FF"><i></i>Technique</span><span class="cv-tag t">technique</span>'
              '<span class="cv-tag t">maj 12/11/2026</span><span class="cv-tag t">#serveur</span><span class="cv-tag t">#admin</span><span class="cv-tag t">#vault</span></div>'
              '<h1>cerveau du vault <code>/admin/cerveau</code></h1>'
              '<p>Le vault Obsidian du projet (<code>docs/vault/</code>), ou celui de RAGO-OS, dessiné comme un cerveau : chaque note est un point, chaque lien entre deux notes un trait, et des impulsions parcourent les liens.</p>'
              '<div class="cv-toc"><p>Sommaire</p><ol><li>Choisir le cerveau</li><li>Accès</li><li>D’où vient le vault</li><li>Ce que montre la page</li><li>Raccourcis</li><li>Code</li></ol></div>'
              '<h2>Choisir le cerveau</h2>'
              '<p>En haut de la colonne de gauche, le <strong>menu déroulant « Cerveau »</strong> affiche le cerveau ouvert ; on le déplie pour choisir entre <a>Rago Optimizer</a> et <strong>RAGO-OS</strong>.</p>'
              '<blockquote>Sofiene, 12/11 : « pour changer de cerveau je veux un menu dépliant ».</blockquote>'
              '<h2>Accès</h2><ul><li>Menu de <code>/admin</code> → section <strong>Projet</strong> → <strong>Cerveau</strong>.</li>'
              '<li>Même clé que le reste de l’admin, <code>ADMIN_KEY</code>.</li><li>Sans cookie admin, les trois adresses du Cerveau renvoient vers <code>/admin</code>.</li></ul>'
              '<h2>Raccourcis</h2><p><code>Ctrl K</code> rechercher · <code>F</code> tout voir · <code>L</code> graphe local · <code>Échap</code> fermer</p></article></section>')
    stage = f'<main class="cv-stage">{graph}{hud}{reader}</main>'
    return side + stage


# ---------- planche des états ----------
def p_states():
    S = lambda t, x: f'<div class="ad-card" style="padding:0"><div class="ad-ch" style="padding-bottom:14px"><h2>{I("info")}{t}</h2></div><div class="ad-cb" style="padding-top:0">{x}</div></div>'
    dialog = ('<div style="padding:22px;background:var(--bg-3);border:1px solid rgba(255,59,48,.4);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.5)">'
              f'<div style="display:flex;gap:14px"><span class="ad-todo"><span class="tg" style="display:grid">{I("alert")}</span></span><div><h3 style="font-family:var(--cond);font-weight:900;font-style:italic;font-size:26px;text-transform:uppercase;line-height:1">Action irréversible ou sensible</h3>'
              '<p style="margin-top:8px;font-size:14px;line-height:1.55;color:var(--ink-2)">Bannir yanis@example.com ? Il ne pourra plus se connecter ni utiliser Premium.</p></div></div>'
              f'<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">{btn("Annuler", "", "gh")}{btn("Bannir", "ban", "red")}</div></div>')
    allgood = f'<div class="ad-good" style="padding:0"><span class="ad-todo"><span class="tg ok" style="display:grid">{I("check")}</span></span><p>Rien à traiter : pas de panne, pas d’achat en attente, pas de paiement raté.</p></div>'
    items = [
        ('Confirmer une action', dialog),
        ('Message après une action', toast('Temps Premium ajouté : ses prochains paiements Stripe sont décalés d’autant.')
         + '<div style="height:10px"></div>' + toast('Licence révoquée : l’app repasse en gratuit à sa prochaine vérification (au plus quelques heures).')),
        ('Lien affiché une fois', secret('Lien pour choisir un nouveau mot de passe (1 heure), à envoyer à ce joueur seulement', 'https://account.rago-optimizer.com/reset/5d1a9c…90bf')),
        ('Serveur de test', '<p class="ad-env" style="margin:0">' + I('info') + '<span>Serveur de test « staging » : Stripe en mode test, ces ventes et abonnements ne sont pas les vrais. Les vrais chiffres sont sur l’admin de production.</span></p>'
         + f'<div style="display:flex;gap:6px;margin-top:14px">{pl("warn", "Test · staging")}{pl("warn", "Stripe test")}</div>'),
        ('Joueur banni', alert('Banni le 13/11/2026 à 18:02 : revente de comptes. Il ne peut plus se connecter ni utiliser Premium.')),
        ('Stripe ne répond pas', alert('Stripe n’a pas répondu (délai dépassé) : chiffres de il y a 12 min.', 'warn')),
        ('Rien à traiter', allgood),
        ('Mauvaise clé admin', alert('Cette clé ne correspond pas à ADMIN_KEY.') + '<div style="height:10px"></div>' + alert('Trop d’essais. Réessaie dans une heure.')),
        ('Recherche sans résultat', empty('Aucun joueur ne correspond à « zak@exemple ».', 'search', 'Aucun résultat', True)),
        ('Rien en attente', empty('Tous les achats sont sur un compte.', 'check', 'Rien en attente', True)),
        ('Pas encore d’avis', empty('Pas encore d’avis : le site cache sa section Avis.', 'star', '', True)),
        ('Service en panne', f'<ul class="ad-svc" style="margin:0 -22px"><li style="border-top:0"><span class="st error"></span><div><small>Resend</small><b>E-mails</b><p>Resend refuse la clé RESEND_API_KEY.</p></div><span class="dur">212 ms</span></li>'
         f'<li><span class="st warn"></span><div><small>Discord</small><b>Rôle Pro</b><p>Bot non configuré : DISCORD_BOT_TOKEN, DISCORD_GUILD_ID.</p></div><span></span></li></ul>'),
    ]
    cards = ''.join(S(t, x) for t, x in items)
    return (f'<main class="bd"><div class="bd-h"><div><p class="s-eb">admin <b>//</b> états</p><h1>messages et cas rares.</h1></div>'
            f'<p>Confirmations, messages après une action, liens affichés une seule fois, serveur de test, erreurs et listes vides.</p></div>'
            f'<div class="bd-g">{cards}</div></main>')


PAGES = {
    'adm-login': ('Connexion admin', lambda: p_login(), ' lg', LOGIN_CSS),
    'adm-login-error': ('Connexion admin', lambda: p_login('Cette clé ne correspond pas à ADMIN_KEY.'), ' lg', LOGIN_CSS),
    'adm-overview': ('Vue d’ensemble', p_overview, '', ''),
    'adm-sales': ('Ventes', p_sales, '', ''),
    'adm-players': ('Joueurs', p_players, '', ''),
    'adm-player': ('alex@example.com', p_player, '', ''),
    'adm-purchases': ('Offrir et achats', p_purchases, '', ''),
    'adm-site': ('Site et promos', p_site, '', ''),
    'adm-network': ('Tests réseau', p_network, '', ''),
    'adm-services': ('Services', p_services, '', ''),
    'adm-journal': ('Journal', p_journal, '', ''),
    'adm-notfound': ('Introuvable', p_notfound, '', ''),
    'adm-brain': ('Cerveau Rago Optimizer', p_brain, ' cv', BRAIN_CSS),
}

if __name__ == '__main__':
    import gen_account as A
    want = sys.argv[1:] or list(PAGES) + ['adm-states']
    for name in want:
        if name == 'adm-states':
            html = page('Admin, états', p_states(), A.CSS + CSS).replace('<html lang="en">', '<html lang="fr">')
            (OUT / 'adm-states.html').write_text(html)
            continue
        title, fn, cls, css = PAGES[name]
        (OUT / f'{name}.html').write_text(wrap(cls, title, fn(), css))
    print('ok', len(want))
