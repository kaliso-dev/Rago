// node shot-ups.js <scénario> <out> : fenêtre Premium dans la démo en gratuit (plan, tweak, preset, analysis, sent, slots)
// et connexion (g-signin, g-error, g-other, g-confirm, g-success, g-browser)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [,, scen, out] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const base = JSON.parse(fs.readFileSync(__dirname + '/ls-mouse.json', 'utf8'));
  const ls = { ...base, 'rago.selection': [], 'rago.pendingUndo': [] };
  delete ls['rago.demoLicense'];
  if (process.env.LS) Object.assign(ls, JSON.parse(fs.readFileSync(process.env.LS, 'utf8')));
  await p.addInitScript(([l, ls]) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [process.env.L || 'en', ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  const go = (re) => p.evaluate((re) => { const a = [...document.querySelectorAll('.side a')].find(x => new RegExp(re, 'i').test(x.textContent)); a && a.click(); }, re);
  if (scen === 'tweak' || scen.startsWith('g-')) { await go('^\\s*latency'); await p.waitForTimeout(800); await p.locator('.lk').first().click(); }
  if (scen === 'preset') { await go('^\\s*dashboard|^\\s*tableau'); await p.waitForTimeout(800); await p.locator('.plist .pr .btn').first().click(); }
  if (scen === 'plan' || scen === 'sent') {
    await go('^\\s*windows'); await p.waitForTimeout(700);
    await p.locator('.tw').filter({ hasText: /ghost devices|périphériques fantômes/i }).first().locator('button.run').click();
    await p.waitForTimeout(500); await p.click('.mdl .mf .btn.red');
    await p.waitForSelector('.runw.fin', { timeout: 60000 }); await p.waitForTimeout(400);
    await p.click('.runw .up2.prem');
  }
  if (scen === 'analysis') {
    await go('^\\s*analy'); await p.waitForTimeout(800);
    await p.locator('.gb .btn.red').first().click();
    await p.waitForSelector('.split, .okbar', { timeout: 90000 }); await p.waitForTimeout(600);
    await p.locator('.acts button').filter({ hasText: /premium/i }).first().click();
  }
  if (scen === 'slots') { await go('^\\s*windows'); await p.waitForTimeout(900); await p.locator('.nm').filter({ hasText: /clean up the taskbar|alléger la barre/i }).first().click(); }
  await p.waitForTimeout(900);
  if (scen === 'sent') { await p.click('.w5 .cta'); await p.waitForTimeout(900); }
  if (scen.startsWith('g-')) {
    await p.locator('.w5 .uln .lnk').last().click(); await p.waitForTimeout(800);
    const fill = async (e, pw) => { await p.fill('#gate-email', e); await p.fill('#gate-password', pw); await p.click('.w5 .cta'); await p.waitForTimeout(1500); };
    if (scen === 'g-error') await fill('player@example.com', 'abc');
    if (scen === 'g-other') await fill('other@example.com', 'password123');
    if (scen === 'g-confirm' || scen === 'g-success') await fill('player@example.com', 'password123');
    if (scen === 'g-success') { await p.click('.w5 .cta'); await p.waitForTimeout(1800); }
    if (scen === 'g-browser') { await p.locator('.w5 .oa .btn').first().click(); await p.waitForTimeout(1200); }
  }
  if (process.env.CLICK) { await p.click(process.env.CLICK); await p.waitForTimeout(+(process.env.WAIT || 700)); }
  await p.mouse.move(1, 1);
  await p.waitForTimeout(300);
  if (process.env.MEAS) console.log(JSON.stringify(await p.evaluate((sel) => [...document.querySelectorAll(sel)].slice(0, 6).map((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10, c.fontSize, c.lineHeight]; }), process.env.MEAS)));
  await p.screenshot({ path: out });
  console.log(errs.slice(0, 6).join('\n'));
  await b.close();
})();
