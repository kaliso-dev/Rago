// node fullshot.js <html> <out.png> [dpr] [selector] : capture pleine page d'une planche
const { chromium } = require('playwright');
(async () => { const [,, f, out, dpr = '2', sel = '.bd'] = process.argv;
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: +dpr });
  pg.on('pageerror', e => console.log('pageerror', e.message));
  await pg.goto('file://' + require('path').resolve(f), { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  await (await pg.$(sel)).screenshot({ path: out }); await b.close(); })();
