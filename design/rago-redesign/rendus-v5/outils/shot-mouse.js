// node shot-mouse.js <out> [full] : page Souris de l'app avec une mesure simulée (998 Hz, 20/20 avec 1 rebond), comme la maquette
const { chromium } = require('playwright');
(async () => {
  const [,, out, full] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ls = process.env.LS ? JSON.parse(require('fs').readFileSync(process.env.LS, 'utf8')) : {};
  await p.addInitScript(([l, ls]) => { try { localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch {} }, [process.env.L || 'en', ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await p.evaluate(() => { const a=[...document.querySelectorAll('.side a')].find(x => ['mouse','souris'].includes(x.querySelector('.t')?.textContent.trim().toLowerCase())); a && a.click(); });
  await p.waitForTimeout(1200);
  if (!process.env.NOSIM) {
    await p.evaluate(() => {
      // 400 écarts autour de 1 ms (souris à 1000 Hz), 3 % hors du rythme, plus long écart 1,42 ms
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const g = [];
      for (let i = 0; i < 400; i++) g.push(1 + (rnd() - 0.5) * 0.15);
      const odd = { 359: 1.42, 383: 1.19, 120: 1.3, 200: 1.28, 50: 1.35, 260: 0.6, 280: 0.62, 90: 0.65, 150: 0.7, 310: 0.66, 20: 0.7, 230: 1.31 };
      for (const [k, v] of Object.entries(odd)) g[+k] = v;
      const avg = g.reduce((a, b) => a + b, 0) / g.length; const fix = 1.002 * g.length - (avg * g.length - g[0]); g[0] = fix;
      const el = document.querySelector('.zone'); const type = 'onpointerrawupdate' in el ? 'pointerrawupdate' : 'pointermove';
      let t = 5000;
      const fire = (ts) => { const e = new PointerEvent(type, { pointerType: 'mouse', bubbles: true }); Object.defineProperty(e, 'timeStamp', { value: ts }); el.dispatchEvent(e); };
      fire(t); for (const x of g) { t += x; fire(t); }
    });
    await p.waitForTimeout(500);
    const presses = []; let t = 20000;
    for (let i = 0; i < 20; i++) { t += 300; presses.push(t); if (i === 13) presses.push(t + 6); }
    for (const ts of presses) {
      await p.evaluate((ts) => { const el = document.querySelector('.pad'); const e = new PointerEvent('pointerdown', { pointerType: 'mouse', button: 0, bubbles: true }); Object.defineProperty(e, 'timeStamp', { value: ts }); el.dispatchEvent(e); }, ts);
      await p.waitForTimeout(20);
    }
    await p.waitForTimeout(600);
  }
  await p.mouse.move(1, 1);
  if (full === 'full') {
    const h = await p.evaluate(() => document.querySelector('.main').scrollHeight + 86);
    await p.setViewportSize({ width: 1440, height: Math.max(900, h) });
    await p.waitForTimeout(600);
  }
  await p.screenshot({ path: out });
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
