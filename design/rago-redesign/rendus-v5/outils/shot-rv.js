// node shot-rv.js <scénario> <out> : recherche (search), invitation à l'avis (prompt, prompt-up), petits messages (toasts),
// fenêtre d'avis (rv-signin, rv-write, rv-thanks)
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
  if (scen.startsWith('prompt') || scen === 'toasts' || scen.startsWith('rv-')) ls['rago.reviewPrompt2'] = { usedMs: 1e9, nextAtMs: 0, snoozeUntil: 0, dismissals: 0, done: false, reviewed: false };
  if (scen === 'prompt-up') ls['rago.selection'] = ['lat_directx'];
  if (scen === 'toasts') ls['rago.demoRepair'] = '1';
  if (scen === 'rv-signin') delete ls['rago.demoLicense'];
  if (process.env.LS) Object.assign(ls, JSON.parse(fs.readFileSync(process.env.LS, 'utf8')));
  await p.addInitScript(([l, ls]) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [process.env.L || 'en', ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  const go = (re) => p.evaluate((re) => { const a = [...document.querySelectorAll('.side a')].find(x => new RegExp(re, 'i').test(x.textContent)); a && a.click(); }, re);
  if (scen === 'prompt-up') { await go('^\\s*latency'); await p.waitForTimeout(800); }
  if (scen === 'search') { await p.keyboard.press('Control+k'); await p.waitForTimeout(500); await p.keyboard.type(process.env.Q || 'priority'); await p.waitForTimeout(300); }
  if (scen === 'toasts') {
    await go('settings|paramètres'); await p.waitForTimeout(700);
    await p.locator('button').filter({ hasText: /sign out|se déconnecter/i }).first().click(); await p.waitForTimeout(600);
    await p.click('.w5 .mf .btn.red'); await p.waitForTimeout(2500);
  }
  if (scen.startsWith('rv-')) { await p.click('.rvp .btn.red'); await p.waitForTimeout(900); }
  if (scen === 'rv-signin') await p.keyboard.type('player@example.com');
  if (scen === 'rv-write' || scen === 'rv-thanks') {
    await p.locator('.st4.big button').nth(4).click();
    await p.fill('.in3.ta textarea', 'Ping went from spiky to flat on Hypixel. The network test alone is worth it.');
    await p.fill('.pnm input', 'Player');
    if (scen === 'rv-write') await p.focus('.in3.ta textarea');
  }
  if (scen === 'rv-thanks') { await p.click('.w5 .mf .btn.red'); await p.waitForTimeout(1500); }
  await p.waitForTimeout(700);
  if (process.env.CLICK) { await p.click(process.env.CLICK); await p.waitForTimeout(+(process.env.WAIT || 700)); }
  if (!process.env.KEEP) await p.mouse.move(1, 1);
  await p.waitForTimeout(300);
  if (process.env.MEAS) console.log(JSON.stringify(await p.evaluate((sel) => [...document.querySelectorAll(sel)].slice(0, 6).map((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10, c.fontSize, c.lineHeight]; }), process.env.MEAS)));
  await p.screenshot({ path: out });
  console.log(errs.slice(0, 6).join('\n'));
  await b.close();
})();
