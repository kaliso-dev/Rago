// node shot-share.js <out> [full] : page Partage de la démo, avec un nom, l'aperçu du code d'un ami et le rapport ouvert
// env : LS (état), L (langue), FRIEND=0 (sans import), REPORT=0 (sans rapport), SCROLL (px)
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
  await p.evaluate(() => { const a=[...document.querySelectorAll('.side a')].find(x => /settings|paramètres/i.test(x.textContent)); a && a.click(); });
  await p.waitForTimeout(900);
  await p.click('button.sr.lk2');
  await p.waitForTimeout(900);
  if (process.env.NAME !== '0') await p.fill('#share-name', process.env.NAME || 'Bedwars, low ping');
  if (process.env.FRIEND !== '0') {
    const ids = (process.env.FRIEND_IDS || 'ping_main,net_nagle,net_throttle,pri_game,pri_mmcss,kbm_1to1,kbm_accel,cpu_intel,gpu_amd,net_adapter,net_registry,net_offload,net_msi,net_affinity,pri_thread,pri_irq8,pri_dwm,kbm_csrss,kbm_repeat,sys_csrss,lat_directx,net_ipv6,net_dca,cpu_parking').split(',');
    const code = await p.evaluate(async ([ids, n]) => (await import('/src/lib/share.ts')).encodePreset({ n, t: ids }), [ids, process.env.FNAME || "Kev's bridge preset"]);
    await p.fill('#share-code', process.env.CODE || code);
    await p.click('.pst .btn');
    await p.waitForTimeout(500);
    for (const sel of (process.env.CLICKS || '').split(';;').filter(Boolean)) { await p.click(sel); await p.waitForTimeout(500); }
  }
  if (process.env.REPORT !== '0') {
    await p.click('.shrow.end .btn.red');
    await p.waitForTimeout(1200);
    if (process.env.OPEN !== '0') { await p.click('.rfile .lnk'); await p.waitForTimeout(400); }
  }
  await p.mouse.move(1, 1);
  if (process.env.SCROLL) { await p.evaluate((y) => document.querySelector('.main').scrollTo(0, +y), process.env.SCROLL); await p.waitForTimeout(300); }
  if (full === 'full') {
    const h = await p.evaluate(() => document.querySelector('.main').scrollHeight + 86);
    await p.setViewportSize({ width: 1440, height: Math.max(900, h) });
    await p.waitForTimeout(600);
  }
  await p.screenshot({ path: out });
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
