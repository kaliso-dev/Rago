// Clip du menu : on clique d'un onglet à l'autre, le nom glisse, barre et voile rouges suivent (--p calculé image par image).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const out = process.argv[2], FPS = 60, DPR = 2, CLIP = { x: 0, y: 0, width: 244, height: 600 };
function bez(x1, y1, x2, y2) { // courbe CSS cubic-bezier
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => { let t = x; for (let i = 0; i < 8; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; t = Math.min(1, Math.max(0, t)); } return Y(t); };
}
const ON = bez(.16, 1, .3, 1), OFF = bez(0, 0, .58, 1), MOVE = bez(.45, 0, .2, 1);
const CLICKS = [[1000, 'network'], [2500, 'hitreg'], [3950, 'game mode'], [5500, 'dashboard']];
const D = 6700;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR });
  pg.on('pageerror', e => console.log('pageerror', e.message));
  await pg.goto('file:///mnt/project-files/rago-redesign/rendus-v5/src/app-dashboard-v2-pi.html#round-poster', { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const items = await pg.evaluate(() => {
    const s = document.createElement('style'); s.textContent = '.side a{transition:none!important}'; document.head.appendChild(s);
    document.body.insertAdjacentHTML('beforeend', '<div id="cur" style="position:fixed;left:0;top:0;z-index:99;pointer-events:none;width:0;height:0">'
      + '<i style="position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:2px solid rgba(236,233,226,.7);opacity:0"></i>'
      + '<svg width="22" height="26" viewBox="0 0 22 26" style="position:absolute;left:-2px;top:-2px;transform-origin:2px 2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))"><path d="M2 2V21L7 16.5L10.5 24L14 22.5L10.6 15.2H17Z" fill="#ECE9E2" stroke="#0A0A0B" stroke-width="1.6" stroke-linejoin="round"/></svg></div>');
    const m = {}; document.querySelectorAll('.side a').forEach(a => { const t = a.querySelector('.t')?.textContent; if (t) { a.classList.remove('on'); const r = a.getBoundingClientRect(); m[t] = { x: r.x, y: r.y + r.height / 2 }; } });
    return m;
  });
  // positions du curseur : un peu à droite du début du nom
  const tgt = n => ({ x: items[n].x + 158, y: items[n].y + 4 });
  const path_ = [{ t: 0, ...{ x: 196, y: 372 } }];
  CLICKS.forEach(([tc, n]) => { path_.push({ t: tc - 120, ...tgt(n), from: tc - 760 }); });
  function cursorAt(t) {
    let p = path_[0];
    for (let i = 1; i < path_.length; i++) { const k = path_[i], prev = p;
      if (t < k.from) return prev; if (t < k.t) { const e = MOVE((t - k.from) / (k.t - k.from)); return { x: prev.x + (k.x - prev.x) * e, y: prev.y + (k.y - prev.y) * e }; } p = k; }
    return p;
  }
  function pOf(name, t) { // valeur de --p pour un onglet
    let v = name === 'dashboard' ? 1 : 0, cur = name === 'dashboard';
    for (const [tc, n] of CLICKS) { if (t < tc) break; const want = n === name; if (want === cur) continue;
      const dt = t - tc, dur = want ? 320 : 220, e = (want ? ON : OFF)(Math.min(1, dt / dur)); v = want ? e : 1 - e; cur = want; }
    return v;
  }
  function press(t) { for (const [tc] of CLICKS) { const d = t - (tc - 90); if (d >= 0 && d < 420) return d; } return -1; }
  fs.mkdirSync(out, { recursive: true });
  const n = Math.round(D / 1000 * FPS);
  for (let i = 0; i <= n; i++) {
    const t = i * 1000 / FPS, c = cursorAt(t), pr = press(t);
    const ps = Object.fromEntries(Object.keys(items).map(k => [k, pOf(k, t)]));
    await pg.evaluate(({ c, pr, ps }) => {
      document.querySelectorAll('.side a').forEach(a => { const k = a.querySelector('.t')?.textContent; if (k in ps) a.style.setProperty('--p', ps[k].toFixed(4)); });
      const cur = document.getElementById('cur'); cur.style.transform = `translate(${c.x}px,${c.y}px)`;
      const sv = cur.querySelector('svg'), ring = cur.querySelector('i');
      const sc = pr < 0 ? 1 : pr < 90 ? 1 - .14 * pr / 90 : pr < 220 ? .86 + .14 * (pr - 90) / 130 : 1;
      sv.style.transform = `scale(${sc})`;
      const rp = pr < 90 ? -1 : (pr - 90) / 330;
      ring.style.opacity = rp < 0 || rp > 1 ? 0 : (1 - rp) * .8; ring.style.transform = `scale(${.4 + rp * 1.1})`;
    }, { c, pr, ps });
    await pg.screenshot({ path: path.join(out, `f${String(i).padStart(5, '0')}.png`), clip: CLIP });
  }
  console.log('frames', n + 1); await b.close();
})();
