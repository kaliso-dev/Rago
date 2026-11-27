// node shot-an.js <out> [full] : page Analyze my PC de la démo ; env LS (état), L (langue), RUN=ms (lance l'analyse et attend)
const { chromium } = require('playwright');
(async () => {
  const [,, out, full] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ls = process.env.LS ? JSON.parse(require('fs').readFileSync(process.env.LS, 'utf8')) : {};
  await p.addInitScript(([l, ls]) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [process.env.L || 'en', ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const a = [...document.querySelectorAll('.side a')].find(x => /analy/i.test(x.textContent)); a && a.click(); });
  await p.waitForTimeout(900);
  if (process.env.RUN) { await p.click('.gb .btn.red'); await p.waitForTimeout(+process.env.RUN); }
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
