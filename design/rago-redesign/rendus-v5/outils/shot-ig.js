// node shot-ig.js <état> <out> : barre en jeu (overlay.html) dans une page de la taille de sa fenêtre.
// états : panel, free, pill, estimate, nudge, passive ; env L (langue), Q (paramètres en plus), W/H (taille), MOCK=1 (maquette)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [,, st, out] = process.argv;
  const b = await chromium.launch();
  const size = { panel: [836, 656], free: [836, 656], passive: [836, 656], pill: [236, 44], estimate: [236, 44], nudge: [480, 44] }[st];
  const W = +(process.env.W || size[0]), H = +(process.env.H || size[1]);
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const base = JSON.parse(fs.readFileSync(__dirname + '/ls-mouse.json', 'utf8'));
  const ls = { ...base };
  if (st === 'free') delete ls['rago.demoLicense'];
  await p.addInitScript(([l, ls]) => { localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [process.env.L || 'en', ls]);
  const q = { panel: '', free: '', passive: 'passive', pill: 'pill', estimate: 'pill&estimate', nudge: 'pill&nudge' }[st];
  await p.goto(`http://localhost:1420/overlay.html?${q}${process.env.Q ? '&' + process.env.Q : ''}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  if (process.env.CLICK) { await p.click(process.env.CLICK); await p.waitForTimeout(+(process.env.WAIT || 700)); }
  if (process.env.MEAS) console.log(await p.evaluate(process.env.MEAS));
  await p.screenshot({ path: out, omitBackground: true });
  if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
