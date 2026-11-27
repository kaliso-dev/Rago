const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, name, scale, outDir, hash, out] = process.argv;
  const src = `file:///mnt/project-files/rago-redesign/rendus-${process.env.V||"v1"}/src/${name}.html${hash ? '#' + hash : ''}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: +scale });
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(src, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const el = await page.$('.win') || await page.$('body');
  await el.screenshot({ path: path.join(outDir, `${out || name}${scale === '1' ? '-1x' : ''}.png`) });
  await browser.close();
})();
