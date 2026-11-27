// node shot.js <page> <out> [full]  : capture de l'app (démo web) à 1440 x 900
const { chromium } = require('playwright');
(async () => {
  const [,, page, out, full] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript((l) => { try { localStorage.setItem('rago.lang', JSON.stringify(l)); } catch {} }, process.env.L || 'en');
  await p.goto('http://localhost:1420/' + (process.env.Q || ''), { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  if (page && page !== 'dashboard') {
    await p.evaluate((id) => { const a=[...document.querySelectorAll('.side a')].find(x => x.querySelector('.t')?.textContent.trim().toLowerCase() === id); a && a.click(); }, page);
    await p.waitForTimeout(1200);
  }
  const click = process.argv[5];
  if (click) { for (const sel of click.split(";;")) { await p.click(sel); await p.waitForTimeout(700); } }
  if (full === "full") {
    const h = await p.evaluate(() => document.querySelector('.main').scrollHeight + 86);
    await p.setViewportSize({ width: 1440, height: Math.max(900, h) });
    await p.waitForTimeout(600);
  }
  await p.screenshot({ path: out });
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
