// node shot-win.js <scénario> <out> : une fenêtre de l'app dans la démo, comme sa maquette
// scénarios : apply, single, undo, undoall, warn, run, done, failed, reboot, cancel, canceled, signout
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
  if (scen === 'apply') ls['rago.selection'] = ['pri_game', 'pri_w32', 'pri_irq8', 'pri_policy'];
  if (scen === 'warn') { ls['rago.selection'] = ['win_bluetooth', 'dbl_onedrive_off']; ls['rago.pendingUndo'] = ['kbm_accel']; }
  if (scen === 'undo') { ls['rago.demoApplied'] = [...base['rago.demoApplied'], ['pri_policy', { id: 'pri_policy', variant: null, ts: 1795209612046, ok: true, backup: true, drift: false }], ['pri_irq8', { id: 'pri_irq8', variant: null, ts: 1795209612046, ok: true, backup: true, drift: false }]]; ls['rago.pendingUndo'] = ['pri_policy', 'pri_irq8']; }
  const RUNIDS = ["ping_main", "net_nagle", "net_throttle", "net_powersave", "net_dns", "net_msi", "lat_general", "lat_directx", "sys_priority", "pri_game", "pri_mmcss", "pri_sysresp", "pri_thread", "pri_w32", "pri_irq8", "kbm_accel", "kbm_1to1", "in_queue", "nv_preemption", "win_gamemode", "pow_ultimate"];
  if (['run', 'done', 'failed', 'reboot'].includes(scen)) { ls['rago.demoApplied'] = []; ls['rago.selection'] = RUNIDS; }
  if (scen === 'failed') ls['rago.demoRestoreFail'] = '1';
  if (process.env.FREE) delete ls['rago.demoLicense'];
  if (process.env.LS) Object.assign(ls, JSON.parse(fs.readFileSync(process.env.LS, 'utf8')));
  await p.addInitScript(([l, ls]) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [process.env.L || 'en', ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  const go = (re) => p.evaluate((re) => { const a = [...document.querySelectorAll('.side a')].find(x => new RegExp(re, 'i').test(x.textContent)); a && a.click(); }, re);
  if (['apply', 'undo', 'run', 'done', 'failed', 'reboot'].includes(scen)) { await go('^\\s*latency'); await p.waitForTimeout(700); }
  if (scen === 'warn') { await go('^\\s*windows'); await p.waitForTimeout(700); }
  if (['apply', 'undo', 'warn', 'run', 'done', 'failed', 'reboot'].includes(scen)) { await p.click('.win .ap .btn'); }
  if (['run', 'done', 'failed', 'reboot'].includes(scen)) {
    await p.waitForTimeout(600); await p.click('.mdl .mf .btn.red');
    if (scen === 'run') await p.waitForTimeout(+(process.env.RUNWAIT || 7000));
    else await p.waitForSelector('.runw.fin', { timeout: 60000 });
    await p.waitForTimeout(400);
  }
  if (scen === 'single') { await go('^\\s*windows'); await p.waitForTimeout(700); await p.locator('.tw').filter({ hasText: /ghost devices/i }).first().locator('button.run').click(); }
  if (scen === 'undoall') { await go('^\\s*dashboard'); await p.waitForTimeout(700); await p.locator('button').filter({ hasText: /undo all/i }).first().click(); }
  if (['cancel', 'canceled', 'signout'].includes(scen)) { await go('settings|paramètres'); await p.waitForTimeout(700); }
  if (scen === 'signout') await p.locator('button').filter({ hasText: /sign out|se déconnecter/i }).first().click();
  if (scen === 'cancel' || scen === 'canceled') await p.locator('button').filter({ hasText: /cancel subscription|cancel premium|^cancel$|résilier/i }).first().click();
  await p.waitForTimeout(700);
  if (process.env.CLICK) { await p.click(process.env.CLICK); await p.waitForTimeout(+(process.env.WAIT || 700)); }
  await p.mouse.move(1, 1);
  await p.waitForTimeout(300);
  if (process.env.MEAS) console.log(JSON.stringify(await p.evaluate((sel) => [...document.querySelectorAll(sel)].slice(0, 6).map((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10, c.fontSize, c.lineHeight, c.margin, c.padding]; }), process.env.MEAS)));
  await p.screenshot({ path: out });
  console.log(errs.slice(0, 6).join('\n'));
  await b.close();
})();
