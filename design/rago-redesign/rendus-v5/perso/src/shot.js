// node shot.js <svg|html file> <out.png> <w> <h> [dpr]  : capture d'un fichier à sa taille
const { chromium } = require('playwright');
(async () => { const [,, f, out, w, h, dpr = '1'] = process.argv;
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
  await pg.goto('file://' + require('path').resolve(f)); await pg.waitForTimeout(150);
  await pg.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: +w, height: +h } }); await b.close(); })();
