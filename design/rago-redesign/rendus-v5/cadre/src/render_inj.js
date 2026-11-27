// Comme render.js, mais injecte frame.css et un bout de HTML/JS avant la capture. Usage :
// node render_inj.js <page> <scale> <outDir> <hash> <out> <snippet.js> [height]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const [,, name, scale, outDir, hash, out, snip, h] = process.argv;
  const src = `file:///mnt/project-files/rago-redesign/rendus-v5/src/${name}.html${hash ? '#' + hash : ''}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: +scale });
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(src, { waitUntil: 'networkidle' });
  await page.addStyleTag({ path: '/mnt/project-files/rago-redesign/rendus-v5/src/frame.css' });
  await page.evaluate(fs.readFileSync(snip, 'utf8'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const el = await page.$('.win');
  const box = await el.boundingBox();
  const height = h ? Math.min(+h, box.height) : box.height;
  await page.screenshot({ path: path.join(outDir, `${out}${scale === '1' ? '-1x' : ''}.png`), clip: { x: box.x, y: box.y, width: box.width, height }, fullPage: true });
  await browser.close();
})();
