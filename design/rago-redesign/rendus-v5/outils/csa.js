// node csa.js <selecteur> : styles calculés dans l'app (page Analyse), env LS, L, RUN comme shot-an.js
const { chromium } = require('playwright');
(async () => {
  const [,, sel] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const ls = process.env.LS ? JSON.parse(require('fs').readFileSync(process.env.LS, 'utf8')) : {};
  await p.addInitScript(([l, ls]) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [process.env.L || 'en', ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const a = [...document.querySelectorAll('.side a')].find(x => /analy/i.test(x.textContent)); a && a.click(); });
  await p.waitForTimeout(900);
  if (process.env.RUN) { await p.click('.gb .btn.red'); await p.waitForTimeout(+process.env.RUN); }
  const r = await p.evaluate((sel) => [...document.querySelectorAll(sel)].slice(0, 3).map((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, margin: c.margin, font: c.fontSize + ' ' + c.fontWeight + ' ' + c.letterSpacing + ' ' + c.fontFamily.slice(0,30), color: c.color, pad: c.padding, maxw: c.maxWidth, lh: c.lineHeight, ff: c.fontFamily.slice(0,20), disp: c.display }; }), sel);
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
