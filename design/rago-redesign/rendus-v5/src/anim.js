// Animations des maquettes v5 (21/11/2026). Actives avec #anim dans l'URL.
// Sans #rec, la séquence tourne en boucle ; avec #rec, rien ne bouge seul et l'enregistreur appelle __anim.seek(t).
// Tout dépend du temps t (ms) : chaque image est reproductible.
(function () {
  const H = location.hash;
  if (!/anim/.test(H)) return;
  const REC = /rec/.test(H);
  const root = document.documentElement;
  root.classList.add('anim');
  const poster = root.classList.contains('poster');
  const page = document.body.dataset.page;
  const win = document.querySelector('.win'), main = document.querySelector('.main');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = { out: 'cubic-bezier(.16,1,.3,1)', io: 'cubic-bezier(.65,0,.35,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', lin: 'linear' };
  const A = [], T = [], LAZY = [];
  let D = 10000;

  // entrée : remplit avant et après ; état (après l'entrée) : seulement après son début
  function an(el, kf, start, dur, easing = E.out, o = {}) {
    if (!el) return null;
    const a = el.animate(kf, { duration: dur, delay: start, easing, fill: 'both', ...o });
    a.pause(); A.push(a); return a;
  }
  const st = (el, kf, start, dur, easing = E.out, o = {}) => an(el, kf, start, dur, easing, { fill: 'forwards', ...o });
  const rise = (el, start, dy = 26, dur = 700) => an(el, [{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }], start, dur);
  const pop = (el, start, dur = 500) => an(el, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], start, dur, E.spring);
  const press = (el, at) => st(el, [{ transform: 'none' }, { transform: 'scale(.95)', offset: .35 }, { transform: 'none' }], at, 320);

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const p = (t, s, d) => clamp((t - s) / d);
  const oq = x => 1 - Math.pow(1 - x, 4);
  const io = x => (x < .5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
  const icon = n => `<svg class="i" viewBox="0 0 24 24">${P[n]}</svg>`;
  const mk = (cls, parent, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; parent.appendChild(d); return d; };
  function count(el, from, to, start, dur, fmt = v => Math.round(v)) {
    if (!el) return;
    const node = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    T.push(t => { node.textContent = fmt(from + (to - from) * oq(p(t, start, dur))); });
  }
  // bouton : remplissage de progression, reflet, ondes
  function btnFx(btn, rings = 0) {
    const label = [...btn.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    const bl = document.createElement('span'); bl.className = 'bl'; bl.textContent = label.textContent; label.replaceWith(bl);
    const fx = mk('bfx', btn, '<i class="fill"></i><i class="shine"></i>');
    const rs = Array.from({ length: rings }, () => mk('ring', btn));
    return { bl, fill: $('.fill', fx), shine: $('.shine', fx), rs };
  }
  const shine = (s, at) => st(s, [{ transform: 'translateX(-150%)' }, { transform: 'translateX(350%)' }], at, 900, E.io);

  // pointeur
  const cur = mk('cur', win, '<svg viewBox="0 0 24 24"><path d="M5 3l14 8.2-6.3 1.4 3.9 6.9-2.8 1.6-3.9-6.9L5 19z"/></svg>');
  const rip = mk('rip', win);
  const C = [], SHOW = [], CLICK = [], HOLD = [];
  const center = (el, dx = 0, dy = 0) => () => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 + dx, r.top + r.height / 2 + dy]; };
  const pt = (x, y) => () => [x, y];
  T.push(t => {
    if (!C.length) return;
    let vis = 0;
    SHOW.forEach(([a, b]) => { if (t >= a && t <= b) vis = Math.min(1, (t - a) / 220, (b - t) / 220); });
    cur.style.opacity = vis;
    let x, y;
    if (t <= C[0].t) [x, y] = C[0].at();
    else if (t >= C[C.length - 1].t) [x, y] = C[C.length - 1].at();
    else for (let i = 0; i < C.length - 1; i++) {
      const a = C[i], b = C[i + 1];
      if (t >= a.t && t <= b.t) {
        const k = io(p(t, a.t, b.t - a.t)), [ax, ay] = a.at(), [bx, by] = b.at();
        x = ax + (bx - ax) * k; y = ay + (by - ay) * k;
        if (Math.hypot(bx - ax, by - ay) > 40) y -= Math.sin(k * Math.PI) * 26;
        break;
      }
    }
    let sc = 1;
    HOLD.forEach(([a, b]) => { if (t >= a && t <= b) sc = .88; });
    CLICK.forEach(c => { const q = p(t, c, 240); if (q > 0 && q < 1) sc = Math.min(sc, 1 - .2 * Math.sin(q * Math.PI)); });
    cur.style.transform = `translate(${x}px,${y}px) scale(${sc})`;
    let r = null; CLICK.forEach(c => { if (t >= c && t < c + 650) r = c; });
    if (r !== null && vis > 0) { const q = (t - r) / 650; rip.style.opacity = (1 - q) * .85; rip.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${.3 + oq(q) * 1.5})`; }
    else rip.style.opacity = 0;
  });

  // ouverture : le logo sur un aplat rouge qui part en biais
  function intro() {
    const s = mk('stg', win, '<div class="stg-r"><div class="stg-in"><div class="stg-logo"></div><span class="stg-m">every millisecond counts.</span></div></div>');
    $('.stg-logo', s).innerHTML = $('.side .logo').innerHTML;
    an($('.stg-logo', s), [{ opacity: 0, transform: 'translateX(-40px)' }, { opacity: 1, transform: 'none', offset: .55 }, { opacity: 1, offset: .85 }, { opacity: 0, transform: 'translateX(30px)' }], 0, 640);
    an($('.stg-m', s), [{ opacity: 0 }, { opacity: 1, offset: .5 }, { opacity: 1, offset: .8 }, { opacity: 0 }], 120, 520, E.lin);
    an($('.stg-r', s), [{ transform: 'translateX(0) skewX(-12deg)' }, { transform: 'translateX(118%) skewX(-12deg)' }], 560, 640, E.io);
  }
  // en-tête commun : menu, barre du haut, titre d'affiche, coup de pinceau
  function head(t0) {
    an($('.side'), [{ transform: 'translateX(-40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], t0 - 100, 700);
    $$('.side .logo, .side .grp, .side > a, .side .pc, .side .foot a, .side .motto').forEach((el, i) =>
      an(el, [{ opacity: 0, transform: 'translateX(-16px)' }, { opacity: 1, transform: 'none' }], t0 + i * 22, 460));
    $$('.topbar > *').forEach((el, i) => an(el, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], t0 + 120 + i * 60, 500));
    an($('.kick'), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], t0 + 200, 700, E.io);
    const ti = $('.title');
    an(ti, [{ opacity: 0, transform: 'translateX(-90px) scale(1.05)', filter: 'blur(12px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], t0 + 260, 720);
    an(ti, [{ transform: 'translate(-50px,26px)', opacity: 0 }, { transform: 'none', opacity: 1 }], t0 + 440, 900, E.out, { pseudoElement: '::before' });
    if (poster) an(ti, [{ clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)' }], t0 + 600, 560, E.io, { pseudoElement: '::after' });
    $$('.head .acts .btn').forEach((el, i) => an(el, [{ opacity: 0, transform: 'translateX(44px)' }, { opacity: 1, transform: 'none' }], t0 + 540 + i * 90, 620));
  }
  // défilement de la page dans la fenêtre
  function scrollTo(target, start, dur, top = 90) {
    LAZY.push(() => {
      const S = clamp(target.getBoundingClientRect().top - top, 0, main.offsetHeight - win.clientHeight);
      st(main, [{ transform: 'none' }, { transform: `translateY(${-S}px)` }], start, dur, E.io);
    });
  }

  /* ---------- Games ---------- */
  if (page === 'games') {
    intro(); head(650);
    const hero = $('.hero'), art = $('.hero .art');
    rise(hero, 950, 36, 800);
    if (poster) an(hero, [{ transform: 'translateX(-102%)' }, { transform: 'none' }], 1050, 650, E.out, { pseudoElement: '::before' });
    an(art, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], 1150, 800, E.io);
    an(art, [{ transform: 'scale(1.14)' }, { transform: 'scale(1)' }], 1150, 1800);
    $$('.hero .r1 > *').forEach((el, i) => pop(el, 1450 + i * 80));
    an($('.gname'), [{ clipPath: 'inset(-20% 0 100% 0)', transform: 'translateY(46px)' }, { clipPath: 'inset(-20% 0 -20% 0)', transform: 'none' }], 1450, 760);
    $$('.score > div').forEach((el, i) => rise(el, 1650 + i * 80, 18, 550));
    count($('.score > div:nth-child(1) .sub'), 0, 21, 1700, 900, v => `${Math.round(v)} tweaks`);
    count($('.score > div:nth-child(4) b'), 50, 100, 1850, 1000);
    $$('.go > *').forEach((el, i) => rise(el, 1900 + i * 90, 22, 600));
    rise($('.bar'), 2050, 20, 600);
    $$('.lib .gcard').forEach((el, i) => { rise(el, 2150 + i * 70, 60, 800); an($('.cv', el), [{ transform: 'scale(1.18)' }, { transform: 'none' }], 2150 + i * 70, 1300); });

    const lol = $$('.lib .gcard')[1], btn = $('.go .btn.red');
    const b = btnFx(btn, 4);
    shine(b.shine, 2900);
    // survol de League of Legends
    const lift = [{ transform: 'none', borderColor: 'rgba(255,255,255,.07)', boxShadow: '0 0 0 rgba(0,0,0,0)' }, { transform: 'translateY(-6px)', borderColor: 'rgba(255,255,255,.24)', boxShadow: '0 22px 44px -14px rgba(0,0,0,.9)' }];
    st(lol, lift, 4000, 360); st(lol, [...lift].reverse(), 4950, 360);
    st($('.cv', lol), [{ transform: 'none' }, { transform: 'scale(1.07)' }], 4000, 700); st($('.cv', lol), [{ transform: 'scale(1.07)' }, { transform: 'none' }], 4950, 450);
    // optimiser et jouer
    SHOW.push([3200, 8750]);
    C.push({ t: 3200, at: pt(1250, 990) }, { t: 4000, at: center($('.cv', lol)) }, { t: 4900, at: center($('.cv', lol), 14, 8) },
      { t: 5650, at: center(btn, -30, 6) }, { t: 8500, at: center(btn, -30, 6) }, { t: 8750, at: center(btn, 40, 60) });
    shine(b.shine, 5500);
    CLICK.push(5900); press(btn, 5900);
    st(btn, [{ backgroundColor: '#FF3B30' }, { backgroundColor: '#C9221A' }], 6000, 200, E.lin, { pseudoElement: '::before' });
    st(b.fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 6050, 2300, 'cubic-bezier(.45,.05,.4,1)');
    st(btn, [{ backgroundColor: '#C9221A' }, { backgroundColor: '#FF3B30' }], 8350, 250, E.lin, { pseudoElement: '::before' });
    st(b.fill, [{ opacity: 1 }, { opacity: 0 }], 8350, 300, E.lin);
    b.rs.forEach((r, i) => st(r, [{ opacity: .9, transform: 'skewX(-12deg) scale(1)' }, { opacity: 0, transform: 'skewX(-12deg) scale(1.22,2.1)' }], 6150 + i * 560, 1100));
    const names = ['per-game advanced priority', 'multimedia scheduler (MMCSS)', 'Win32 priority separation', 'system responsiveness 0%', 'disable MMCSS lazy mode', 'priority optimization', 'system latency', 'input driver priority', "disable Nagle's algorithm", 'remove network throttling', 'DNS resolution priority', 'driver latency', 'mouse optimization', 'keyboard optimization', 'input queue size', 'Windows Game Mode', 'disable Game DVR', 'fullscreen optimization', 'disable Power Throttling', 'disable core parking', 'disable USB suspend'];
    const playIc = $('svg', btn), spin = document.createElement('i'); spin.className = 'spin'; btn.insertBefore(spin, b.bl);
    const sub = $('.go .sub'), subT = sub.innerHTML, chip = $('.hero .r1 .chip.red'), chipT = chip.lastChild.textContent;
    T.push(t => {
      const run = t >= 6050 && t < 8350;
      playIc.style.display = run ? 'none' : ''; spin.style.display = run ? 'inline-block' : 'none'; spin.style.transform = `rotate(${t * .7}deg)`;
      if (t < 6050) { b.bl.textContent = 'optimize and play'; sub.innerHTML = subT; }
      else if (run) { const n = Math.min(21, Math.floor(p(t, 6050, 2300) * 21) + 1); b.bl.textContent = `optimizing ${n}/21`; sub.innerHTML = `<span class="tk">${icon('check')}${names[n - 1]}</span>`; }
      else { b.bl.textContent = 'launching valorant'; sub.innerHTML = '21 tweaks on. Back to normal when you quit.'; }
      chip.lastChild.textContent = t >= 8400 ? 'in game' : chipT;
    });
    st($('.hero .r1 .chip.red .dot'), [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.9)', opacity: .35 }, { transform: 'scale(1)', opacity: 1 }], 8400, 700, 'ease-in-out', { iterations: 3 });
    // fermeture : "gl hf"
    const o = mk('stg out', win, '<div class="stg-r"><div class="stg-in"><b>gl hf</b><span>valorant is starting with 21 tweaks on</span></div></div>');
    an($('.stg-r', o), [{ transform: 'translateX(-125%) skewX(-12deg)' }, { transform: 'translateX(0) skewX(-12deg)' }], 8850, 650, E.io);
    an($('.stg-in b', o), [{ opacity: 0, transform: 'translateX(-70px)' }, { opacity: 1, transform: 'none' }], 9250, 650);
    an($('.stg-in span', o), [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], 9450, 550);
    D = 10800;
  }

  /* ---------- Dashboard ---------- */
  if (page === 'dashboard') {
    intro(); head(650);
    const free = $('.free'), num = $('.free .num'), nb = $('.free .num b');
    rise(free, 950, 36, 800); rise($('.live'), 1050, 36, 800);
    ['::before', '::after'].forEach(pe => an(num, [{ transform: 'translateX(112%) skewX(-12deg)' }, { transform: 'skewX(-12deg)' }], 1100, 760, E.out, { pseudoElement: pe }));
    an(nb, [{ opacity: 0, transform: 'scale(1.6)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], 1350, 650);
    count(nb, 0, 30, 1350, 900);
    rise($('.free .num span'), 1650, 14, 500); rise($('.free .num small'), 1750, 14, 500);
    $$('.free .txt > *').forEach((el, i) => rise(el, 1150 + i * 90, 18, 600));
    $$('.free .tw span').forEach((el, i) => pop(el, 1500 + i * 50, 450));
    // usage en direct : les valeurs montent, puis vivent
    const meters = $$('.meter'), base = [14, 71, 41];
    meters.forEach((m, i) => rise(m, 1250 + i * 110, 16, 600));
    const segs = meters.map(m => $$('.seg i', m)), vals = meters.map(m => $('.v', m));
    T.push(t => meters.forEach((m, i) => {
      let v = base[i] * oq(p(t, 1500 + i * 140, 900));
      if (t > 2400) { const s = t / 1000, w = clamp((t - 2400) / 800); v = base[i] + [3 * Math.sin(s * 2.1) + 2 * Math.sin(s * 5.3 + 1), 5 * Math.sin(s * 1.4 + .5) + 3 * Math.sin(s * 3.7), .7 * Math.sin(s * .8)][i] * w; }
      const n = Math.round(v); vals[i].firstChild.textContent = n;
      const f = Math.round(n / 100 * segs[i].length);
      segs[i].forEach((s, j) => { s.className = j < f ? (m.classList.contains('hot') ? 'f' : 'm') : ''; });
    }));
    rise($('.pc'), 1300, 30, 700); rise($('.status'), 1400, 30, 700);
    $$('.specs > div').forEach((el, i) => rise(el, 1500 + i * 70, 14, 500));
    $$('.st').forEach((el, i) => { an(el, [{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 1, transform: 'none' }], 1550 + i * 80, 500); an($('.ic', el), [{ transform: 'scale(0) rotate(-40deg)' }, { transform: 'none' }], 1650 + i * 80, 560, E.spring); });

    // appliquer les optimisations gratuites
    const fb = $('.free .go .btn'), b = btnFx(fb, 3), tags = $$('.free .tw span');
    shine(b.shine, 2700);
    SHOW.push([3000, 6150], [7750, 9700]);
    CLICK.push(3950, 8600);
    C.push({ t: 3000, at: pt(760, 990) }, { t: 3800, at: center(fb, -40, 6) }, { t: 6150, at: center(fb, -40, 6) });
    press(fb, 3950);
    st(fb, [{ backgroundColor: '#FF3B30' }, { backgroundColor: '#C9221A' }], 4050, 200, E.lin, { pseudoElement: '::before' });
    st(b.fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 4100, 1500, 'cubic-bezier(.45,.05,.4,1)');
    st(b.fill, [{ opacity: 1 }, { opacity: 0 }], 5650, 250, E.lin);
    st(fb, [{ backgroundColor: '#C9221A', boxShadow: '0 0 28px rgba(255,59,48,.25)' }, { backgroundColor: '#17171A', boxShadow: '0 0 0 rgba(255,59,48,0)' }], 5650, 300, E.lin, { pseudoElement: '::before' });
    st(fb, [{ color: '#0A0A0B' }, { color: '#F5F5F6' }], 5650, 300, E.lin);
    b.rs.forEach((r, i) => st(r, [{ opacity: .9, transform: 'skewX(-12deg) scale(1)' }, { opacity: 0, transform: 'skewX(-12deg) scale(1.15,2)' }], 4150 + i * 500, 1000));
    tags.forEach((tg, i) => {
      const at = 4150 + i * 200;
      st(tg, [{ color: '#A1A1AA' }, { color: '#0A0A0B' }], at, 160, E.lin);
      st(tg, [{ backgroundColor: 'rgba(255,59,48,0)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.13)' }, { backgroundColor: '#FF3B30', boxShadow: 'inset 0 0 0 1px #FF3B30' }], at, 160, E.lin, { pseudoElement: '::before' });
      st(tg, [{ transform: 'none' }, { transform: 'scale(1.14)', offset: .4 }, { transform: 'none' }], at, 340);
    });
    st(nb, [{ transform: 'none' }, { transform: 'scale(1.12)', offset: .4 }, { transform: 'none' }], 5650, 600, E.spring);
    const zap = $('svg', fb), small = $('.free .num small');
    T.push(t => {
      const k = Math.round(oq(p(t, 4100, 1500)) * 21);
      if (t < 4100) { b.bl.textContent = 'apply free optimizations'; }
      else if (t < 5650) b.bl.textContent = `applying ${Math.max(1, k)}/21`;
      else b.bl.textContent = 'already applied';
      zap.innerHTML = t >= 5650 ? P.check : P.zap;
      small.textContent = t < 5650 ? `${9 + k} already on, ${21 - k} left to apply` : 'all 30 on, each one can be undone';
    });
    count($('.side .pc b'), 21, 42, 4100, 1500, v => `${Math.round(v)} tweaks `);
    count($('.st:nth-of-type(4) .val'), 21, 42, 4100, 1500, v => `${Math.round(v)} `);
    // descente vers les presets par jeu, puis sélection de Counter-Strike 2
    scrollTo($('.bar'), 6300, 1300);
    rise($('.bar'), 6550, 24, 700);
    $$('.gp').forEach((el, i) => { rise(el, 6650 + i * 70, 50, 800); an($('.cv', el), [{ transform: 'scale(1.16)' }, { transform: 'none' }], 6650 + i * 70, 1300); });
    rise($('.more'), 7300, 20, 600);
    const gps = $$('.gp'), val = gps[0], cs = gps[1], vSel = $('.sel', val).innerHTML, cSel = $('.sel', cs).innerHTML;
    C.push({ t: 7750, at: pt(820, 1000) }, { t: 8450, at: center($('.sel', cs), -4, 2) }, { t: 9700, at: center($('.sel', cs), 30, 40) });
    press($('.sel', cs), 8600);
    st(cs, [{ boxShadow: '0 0 0 1px #FF3B30, 0 0 0 rgba(255,59,48,0)' }, { boxShadow: '0 0 0 1px #FF3B30, 0 0 70px rgba(255,59,48,.6)', offset: .3 }, { boxShadow: '0 0 0 1px #FF3B30, 0 0 34px rgba(255,59,48,.16)' }], 8650, 900);
    st($('.cv', cs), [{ transform: 'none' }, { transform: 'scale(1.06)', offset: .3 }, { transform: 'none' }], 8650, 700);
    T.push(t => {
      const on = t >= 8650;
      cs.classList.toggle('on', on); val.classList.toggle('on', !on);
      $('.sel', cs).innerHTML = on ? vSel : cSel; $('.sel', val).innerHTML = on ? cSel : vSel;
    });
    D = 10200;
  }

  /* ---------- Display ---------- */
  if (page === 'display') {
    intro(); head(650);
    const gt = $$('.tabs')[0];
    $$('span', gt).forEach((el, i) => an(el, [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], 950 + i * 45, 450));
    rise(gt.nextElementSibling, 1150, 10, 500);
    const vs = $('.vs'), hb = $('.half.before'), ha = $('.half.after'), badge = $('.badge');
    rise(vs, 1000, 30, 700);
    an(hb, [{ transform: 'translateX(-90px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 1100, 950);
    an(ha, [{ transform: 'translateX(90px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 1100, 950);
    an(badge, [{ opacity: 0, transform: 'scale(2.6) rotate(-14deg)' }, { opacity: 1, transform: 'none' }], 1750, 560, E.spring);
    rise($('.side-l'), 1850, 26, 600); rise($('.side-r'), 1950, 26, 600); pop($('.vs .lb'), 2150, 450);
    // la saturation monte de 50 % (Windows) à 100 % (Valorant)
    an($('.half.after .vp'), [{ filter: 'saturate(.55) brightness(.9)' }, { filter: 'saturate(1.45) contrast(1.06) brightness(1.03)' }], 2050, 1400, E.io);
    rise($('.col'), 1150, 30, 700);
    const big = $('.big b'), ss = $$('.satbar .seg i');
    count(big, 50, 100, 2050, 1400);
    T.push(t => { const v = 50 + 50 * oq(p(t, 2050, 1400)), f = Math.round(v / 100 * ss.length); ss.forEach((s, j) => { s.className = j < f ? 'f' : ''; }); });
    rise($('.drv'), 1500, 14, 500);
    $$('.mini').forEach((el, i) => rise(el, 1600 + i * 80, 12, 500));
    rise($('.res'), 1350, 30, 700);
    $$('.tile').forEach((el, i) => rise(el, 1550 + i * 50, 16, 500));
    // glisser pour comparer
    if (poster) {
      const dx = t => {
        if (t < 3900) return 0;
        if (t < 4800) return -190 * io(p(t, 3900, 900));
        if (t < 5950) return -190 + 400 * io(p(t, 4850, 1050));
        return 210 - 210 * io(p(t, 6000, 650));
      };
      T.push(t => { const d = dx(t); vs.style.setProperty('--xl', (299 + d) + 'px'); badge.style.left = `calc(50% + ${d}px)`; });
      st(badge, [{ transform: 'none' }, { transform: 'scale(1.14)' }], 3800, 220); st(badge, [{ transform: 'scale(1.14)' }, { transform: 'none' }], 6700, 300, E.spring);
      SHOW.push([3300, 7000]); HOLD.push([3800, 6700]);
      C.push({ t: 3300, at: pt(1050, 990) }, { t: 3750, at: center(badge, 6, 10) }, { t: 6800, at: center(badge, 6, 10) }, { t: 7000, at: center(badge, 60, 80) });
    }
    // descente vers les joueurs pro, import des réglages de kaajak
    scrollTo($('.pros'), 7000, 1200, 70);
    $$('.pcard').forEach((el, i) => { rise(el, 7450 + i * 90, 40, 750); an($('.ph', el), [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], 7550 + i * 90, 700, E.io); });
    const pcs = $$('.pcard'), tz = pcs[0], kj = pcs[1], tzB = $('.btn', tz), kjB = $('.btn', kj), tzH = tzB.innerHTML, kjH = kjB.innerHTML;
    SHOW.push([8250, 10100]); CLICK.push(9000);
    C.push({ t: 8250, at: pt(900, 990) }, { t: 8850, at: center(kjB, -6, 3) }, { t: 10100, at: center(kjB, 40, 50) });
    press(kjB, 9000);
    st(kj, [{ boxShadow: '0 0 0 rgba(255,59,48,0)' }, { boxShadow: '0 0 60px rgba(255,59,48,.45)', offset: .3 }, { boxShadow: '0 0 0 rgba(255,59,48,0)' }], 9050, 900);
    T.push(t => {
      const on = t >= 9050;
      kj.classList.toggle('on', on); tz.classList.toggle('on', !on);
      kjB.className = on ? 'btn red' : 'btn'; kjB.innerHTML = on ? tzH : kjH;
      tzB.className = on ? 'btn' : 'btn red'; tzB.innerHTML = on ? kjH : tzH;
    });
    D = 10500;
  }

  /* ---------- Network ---------- */
  // choisir un profil et deux réglages (hachurés, en attente), voir le détail au survol, appliquer depuis la barre du bas
  if (page === 'network') {
    // état de départ : rien en attente, pas de survol figé
    $$('.ptr').forEach(el => el.remove());
    const hov = $('.tw.hov'); hov.classList.remove('hov');
    const ping2 = $$('.prof')[1].querySelectorAll('.o')[1], pingOff = $$('.prof')[1].querySelector('.o.off');
    ping2.classList.remove('pend'); pingOff.classList.add('now');
    const tiles = $$('.tw'), dca = tiles[6], msi = tiles[8], dcaSw = $('.sw', dca), msiSw = $('.sw', msi);
    [dca, msi, dcaSw, msiSw].forEach(el => el.classList.remove('pend'));

    intro(); head(650);
    // ping en direct : le bloc rouge arrive, la valeur se pose, la courbe défile
    const pg = $('.ping'), pb = $('.ping .pv b'), pbN = pb.firstChild;
    ['::before', '::after'].forEach(pe => an(pg, [{ transform: 'translateX(112%) skewX(-12deg)' }, { transform: 'skewX(-12deg)' }], 1000, 760, E.out, { pseudoElement: pe }));
    an(pb, [{ opacity: 0, transform: 'scale(1.6)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], 1250, 650);
    rise($('.ping .pv span'), 1500, 12, 500);
    const bars = $$('.spark i'), hs = bars.map(b => +b.style.getPropertyValue('--h'));
    bars.forEach((b, i) => an(b, [{ transform: 'skewX(-12deg) scaleY(0)' }, { transform: 'skewX(-12deg) scaleY(1)' }], 1400 + i * 26, 520));
    const live = [18, 17, 18, 19, 18, 18, 17, 18, 19, 18, 18, 17, 18];
    T.push(t => {
      pbN.textContent = t < 2350 ? Math.round(64 + (18 - 64) * oq(p(t, 1250, 1100))) : live[Math.floor((t - 2350) / 900) % live.length];
      const k = t < 2600 ? 0 : Math.floor((t - 2600) / 380);
      bars.forEach((b, i) => { const j = (i + k) % hs.length; b.style.setProperty('--h', hs[j]); b.classList.toggle('pk', hs[j] > .9); });
    });
    // onglets, titres sur papier, cartes de profils, grille des réglages
    $$('.bar .tabs span').forEach((el, i) => an(el, [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], 1000 + i * 50, 450));
    an($('.bar > .btn'), [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], 1150, 560);
    $$('.tape').forEach((el, i) => an(el, [{ clipPath: 'inset(-30% 100% -30% -10%)' }, { clipPath: 'inset(-30% -10% -30% -10%)' }], 1150 + i * 380, 520, E.io));
    $$('.prof').forEach((el, i) => { rise(el, 1250 + i * 80, 40, 750); $$('.o', el).forEach((o, j) => pop(o, 1450 + i * 80 + j * 35, 420)); });
    $$('.settings .sh .cnt, .settings .sh .btn').forEach((el, i) => rise(el, 1650 + i * 80, 14, 500));
    tiles.forEach((el, i) => rise(el, 1700 + (Math.floor(i / 3) + i % 3) * 60, 24, 600));

    // la barre pour appliquer monte du bas
    const ap = $('.ap'), apB = $('.ap > b'), apL = $('.ap .lb'), apBtn = $('.ap .btn'), clr = $('.ap .clr');
    an(ap, [{ transform: 'translateY(150%)', opacity: 0 }, { transform: 'none', opacity: 1 }], 4200, 600);
    const b = btnFx(apBtn, 2);
    b.fill.style.background = '#C9221A';
    const zapIc = $('svg', apBtn);

    // pointeur : ping 2, msi mode, direct cache access, survol de tcp/ip tuning, appliquer
    SHOW.push([3500, 10900]);
    CLICK.push(4100, 5400, 6100, 8550);
    C.push({ t: 3500, at: pt(980, 1010) }, { t: 4000, at: center(ping2, 4, 4) }, { t: 4450, at: center(ping2, 10, 8) },
      { t: 5300, at: center(msiSw, -2, 2) }, { t: 5550, at: center(msiSw, 4, 6) },
      { t: 6000, at: center(dcaSw, -2, 2) }, { t: 6250, at: center(dcaSw, 4, 6) },
      { t: 6800, at: center($('.nm', hov), 34, 4) }, { t: 7850, at: center($('.nm', hov), 38, 6) },
      { t: 8450, at: center(apBtn, -14, 4) }, { t: 10350, at: center(apBtn, -14, 4) }, { t: 10900, at: center(apBtn, 60, 90) });
    press(ping2, 4100); press(msi, 5400); press(dca, 6100); press(apBtn, 8550);
    st(main, [{ transform: 'none' }, { transform: 'translateY(-200px)' }], 4550, 950, E.io);
    [[msiSw, 5450], [dcaSw, 6150]].forEach(([sw, at]) => st(sw, [{ left: '4px' }, { left: '26px' }], at, 240, E.out, { pseudoElement: '::after' }));
    [5450, 6150].forEach(at => st(apB, [{ transform: 'none' }, { transform: 'scale(1.4)', offset: .35 }, { transform: 'none' }], at, 420, E.spring));
    // détail au survol
    const popEl = $('.pop', hov);
    an(popEl, [{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], 6900, 280);
    st(popEl, [{ opacity: 1 }, { opacity: 0 }], 7900, 200, E.lin);

    // appliquer : le bouton se remplit, chaque réglage passe des hachures au rouge plein
    shine(b.shine, 7600);
    st(b.fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 8650, 1400, 'cubic-bezier(.45,.05,.4,1)');
    st(b.fill, [{ opacity: 1 }, { opacity: 0 }], 10050, 250, E.lin);
    b.rs.forEach((r, i) => st(r, [{ opacity: .9, transform: 'skewX(-12deg) scale(1)' }, { opacity: 0, transform: 'skewX(-12deg) scale(1.2,1.9)' }], 8700 + i * 500, 1000));
    const DONE = [8950, 9400, 9850];
    [ping2, msi, dca].forEach((el, i) => st(el, [{ transform: 'none' }, { transform: 'scale(1.06)', offset: .35 }, { transform: 'none' }], DONE[i], 420, E.spring));
    st(apB, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], 10100, 500, E.spring);
    const tabEm = $('.bar .tabs span.on em'), cnt = $('.settings .sh .cnt').firstChild, pcB = $('.side .pc b').firstChild, rotIc = P.rotate;
    T.push(t => {
      const sel = [t >= 4150, t >= 5450, t >= 6150], done = DONE.map(d => t >= d);
      const n = sel.filter(Boolean).length, r = (t >= 4150) + (t >= 5450);
      ping2.classList.toggle('pend', sel[0] && !done[0]); ping2.classList.toggle('on', done[0]); pingOff.classList.toggle('now', !sel[0]);
      [[msi, msiSw, 1], [dca, dcaSw, 2]].forEach(([tl, sw, i]) => {
        tl.classList.toggle('pend', sel[i] && !done[i]); sw.classList.toggle('pend', sel[i] && !done[i]);
        tl.classList.toggle('on', done[i]); sw.classList.toggle('on', done[i]);
      });
      hov.classList.toggle('hov', t >= 6750 && t < 7950);
      tabEm.textContent = t < 10100 && n ? n : ''; tabEm.style.display = t < 10100 && n ? '' : 'none';
      cnt.textContent = 5 + done[1] + done[2];
      pcB.textContent = `${21 + done.filter(Boolean).length} tweaks `;
      const fin = t >= 10100, run = t >= 8650 && !fin;
      apB.innerHTML = fin ? `<svg class="i" viewBox="0 0 24 24" style="width:44px;height:44px;stroke-width:3.4">${P.check}</svg>` : Math.max(1, n);
      apL.innerHTML = fin ? `applied<small>${icon('rotate')}restart to finish</small>` : `${n > 1 ? 'changes' : 'change'}<small>${icon('rotate')}${r} need${r > 1 ? '' : 's'} a restart</small>`;
      clr.style.visibility = run || fin ? 'hidden' : '';
      b.bl.textContent = fin ? 'restart now' : run ? `applying ${Math.min(3, done.filter(Boolean).length + 1)}/3` : 'apply';
      zapIc.innerHTML = fin ? rotIc : P.zap;
    });
    D = 11600;
  }

  let ready = false;
  function seek(t) {
    if (!ready) { ready = true; LAZY.forEach(f => f()); }
    A.forEach(a => { a.currentTime = t; });
    T.forEach(f => f(t));
  }
  window.__anim = { get duration() { return D; }, seek };
  if (!REC) document.fonts.ready.then(() => { const t0 = performance.now(); (function loop() { seek((performance.now() - t0) % (D + 1200)); requestAnimationFrame(loop); })(); });
})();
