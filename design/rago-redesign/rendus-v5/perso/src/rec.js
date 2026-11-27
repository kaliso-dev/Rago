// node rec.js <html> <outDir> <w> <h> [fps] [dpr] [sel] : enregistre une maquette qui expose __seq, image par image
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [,, f, out, w, h, fps = '60', dpr = '2', still = ''] = process.argv;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
  pg.on('pageerror', e => console.log('pageerror', e.message));
  await pg.goto('file://' + path.resolve(f), { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const D = await pg.evaluate(() => __seq.duration); fs.mkdirSync(out, { recursive: true });
  if (still) { for (const t of still.split(',')) { await pg.evaluate(t => __seq.seek(t), +t); await pg.screenshot({ path: path.join(out, `s${t}.png`) }); } }
  else { const n = Math.round(D / 1000 * +fps); for (let i = 0; i <= n; i++) { await pg.evaluate(t => __seq.seek(t), i * 1000 / +fps); await pg.screenshot({ path: path.join(out, `f${String(i).padStart(5, '0')}.png`) }); } console.log('frames', n + 1); }
  await b.close();
})();
