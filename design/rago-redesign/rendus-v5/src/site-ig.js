// Barre en jeu animée de l'accueil (22/11/2026). Sans #anim : image fixe (barre ouverte). #anim : boucle. #anim#rec : __anim.seek(t) pour l'enregistreur.
(function () {
  const st = document.getElementById('igst'); if (!st) return;
  const $ = (q, r = st) => r.querySelector(q), $$ = (q, r = st) => [...r.querySelectorAll(q)];
  const sc = $('.igscene'), v = $('video'), bar = $('.igp'), keys = $('.igk'), kb = $$('.igk kbd'), pill = $('.igpill'), fd = $('.igfd'), cl = $('.igcl');
  const tile = $$('.igtile b'), pm = $$('.igpill .m b');
  const ANIM = ['Configure C-states', 'Enable Turbo Boost', 'Rago Low Latency power plan'];
  const rows = ANIM.map(n => $$('.igr').find(r => r.querySelector('b').textContent === n));
  const vis = st.parentElement;
  const fit = () => { const k = Math.max(vis.clientWidth / 1100, vis.clientHeight / 636); st.style.setProperty('--k', k); };
  fit(); addEventListener('resize', fit);
  const D = 10000, CLIP = 2900;
  const cl01 = (x) => Math.max(0, Math.min(1, x)), pr = (t, a, d) => cl01((t - a) / d);
  const out = (x) => 1 - Math.pow(1 - x, 3), back = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const set = (b, n) => { if (b) b.firstChild.nodeValue = String(n); };
  const rnd = (i, a) => { const x = Math.sin(i * 12.9898 + a * 78.233) * 43758.5453; return x - Math.floor(x); };
  function render(t) {
    // scène : floue et sombre pendant que la barre est ouverte
    const open = out(pr(t, 3400, 420)) * (1 - out(pr(t, 8700, 380)));
    sc.style.filter = `blur(${(5 * open).toFixed(2)}px) brightness(${(1 - .45 * open).toFixed(3)})`;
    sc.style.transform = `scale(${(1 + .03 * open).toFixed(4)})`;
    // barre
    const bi = pr(t, 3400, 560), bo = out(pr(t, 8700, 320));
    const y = -28 * (1 - back(bi)) - 22 * bo, s = .97 + .03 * back(bi);
    bar.style.opacity = (cl01(bi * 2.2) * (1 - bo)).toFixed(3);
    bar.style.transform = `translateX(-50%) translateY(${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
    bar.style.visibility = t < 3400 || t > 9050 ? 'hidden' : 'visible';
    // touches : visibles autour de chaque pression
    const kv = Math.max(out(pr(t, 2000, 300)) * (1 - out(pr(t, 3700, 250))), out(pr(t, 7900, 300)) * (1 - out(pr(t, 9150, 260))));
    keys.style.opacity = kv.toFixed(3); keys.style.transform = `translateY(${(10 * (1 - kv)).toFixed(2)}px)`;
    const dn = (a) => [t >= a && t < a + 480, t >= a + 160 && t < a + 480];
    const d1 = dn(3000), d2 = dn(8400);
    kb.forEach((k, i) => k.classList.toggle('dn', d1[i] || d2[i]));
    // trois tweaks passent sur on
    [4600, 5200, 5800].forEach((a, i) => { const r = rows[i]; if (!r) return; const on = t >= a; r.classList.toggle('on', on); r.querySelector('.sw').classList.toggle('on', on); r.classList.toggle('fl', t >= a - 150 && t < a + 450); });
    // Clean : la RAM descend
    const cp = t >= 6500 && t < 6800; cl.style.transform = cp ? 'scale(.95)' : ''; cl.style.boxShadow = cp ? 'inset 0 0 0 1.5px rgba(255,59,48,.8)' : '';
    set(tile[4], Math.round(61 - 14 * out(pr(t, 6650, 900))));
    // FPS, ping, CPU, GPU bougent un peu toutes les 0,8 s
    const k = Math.floor(t / 800);
    const fps = 240 + Math.round((rnd(k, 1) * 2 - 1) * 4), ping = 24 + Math.round((rnd(k, 2) * 2 - 1) * 1);
    set(tile[0], fps); set(tile[1], ping); set(tile[2], 17 + Math.round((rnd(k, 3) * 2 - 1) * 3)); set(tile[3], 6 + Math.round((rnd(k, 4) * 2 - 1) * 2));
    if (pm.length > 1) { set(pm[0], fps); set(pm[1], ping); }
    // pastille épinglée après la fermeture
    const pi = out(pr(t, 8900, 420));
    pill.style.opacity = pi.toFixed(3); pill.style.transform = `translateY(${(-8 * (1 - pi)).toFixed(2)}px)`;
    // fondu au noir entre deux tours
    fd.style.opacity = Math.max(1 - pr(t, 0, 300), pr(t, 9700, 300)).toFixed(3);
  }
  const H = location.hash;
  if (!/anim/.test(H)) { render(6300); fd.style.opacity = 0; return; }
  if (/rec/.test(H)) {
    window.__anim = { duration: D, seek: (t) => { render(t); const ct = Math.min(t, CLIP) / 1000; if (Math.abs(v.currentTime - ct) < 1e-3) return Promise.resolve(); return new Promise(r => { const done = () => requestAnimationFrame(() => r()); v.addEventListener('seeked', done, { once: true }); v.currentTime = ct; }); } };
    return;
  }
  let t0 = performance.now(), lap = -1;
  const tick = (now) => { const t = (now - t0) % D, l = Math.floor((now - t0) / D); if (l !== lap) { lap = l; v.currentTime = 0; v.play().catch(() => {}); } render(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();
