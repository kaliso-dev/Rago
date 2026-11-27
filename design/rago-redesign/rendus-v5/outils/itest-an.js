// node itest-an.js : test d'interaction de la page Analyse (arrêt, repartir de zéro, appliquer gratuit, premium)
const { chromium } = require('playwright');
const fs = require('fs');
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
async function open(b, ls) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(([ls]) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); localStorage.setItem('rago.lang', '"en"'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { const a = [...document.querySelectorAll('.side a')].find(x => /analy/i.test(x.textContent)); a && a.click(); });
  await p.waitForTimeout(700);
  return { p, errs };
}
(async () => {
  const b = await chromium.launch();
  const out = [];
  { // arrêt
    const { p, errs } = await open(b, load('ls-an-start.json'));
    await p.click('.gb .btn.red'); await p.waitForTimeout(1500);
    const running = await p.locator('.steps li.now').count();
    await p.click('.gb .btn'); await p.waitForTimeout(800);
    const back = await p.locator('.gb .btn.red').innerText();
    await p.waitForTimeout(4000);
    const still = await p.locator('.steps li.now').count();
    const res = await p.locator('.groups').count();
    out.push(['stop', { running, back, nowAfter: still, results: res, errs }]);
    await p.close();
  }
  { // résultats gratuit : premium, appliquer, repartir de zéro
    const { p, errs } = await open(b, load('ls-an-results.json'));
    await p.click('.acts .row .btn:not(.red)'); await p.waitForTimeout(700);
    const up = await p.evaluate(() => { const m = document.querySelector('[role=dialog], .modal, .ov'); return m ? m.className + ' | ' + m.textContent.slice(0, 120) : null; });
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await p.click('.acts .row .btn.red'); await p.waitForTimeout(900);
    const ap = await p.evaluate(() => { const m = document.querySelector('[role=dialog], .modal, .ov'); return m ? m.className + ' | ' + m.textContent.slice(0, 160) : null; });
    const bar = await p.evaluate(() => document.querySelector('.apply')?.textContent.slice(0, 120) ?? null);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await p.click('.mfoot button:last-child'); await p.waitForTimeout(700);
    const start = await p.locator('.gb .btn.red').count();
    out.push(['results', { upsell: up, apply: ap, bar, startAfterReset: start, errs }]);
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
