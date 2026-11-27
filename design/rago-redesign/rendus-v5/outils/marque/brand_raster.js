// Rastérise les SVG du kit logo (fond transparent). Usage : node brand_raster.js jobs.json
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch({ args: ['--disable-lcd-text', '--font-render-hinting=none'] });
  const p = await b.newPage();
  for (const j of jobs) {
    await p.setViewportSize({ width: j.w, height: j.h });
    await p.setContent(`<html><body style="margin:0;background:transparent">${j.svg}</body></html>`);
    await p.screenshot({ path: j.out, omitBackground: true, clip: { x: 0, y: 0, width: j.w, height: j.h } });
  }
  await b.close();
})();
