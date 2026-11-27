const { chromium } = require('playwright');
(async () => {
  const [,, name, hash, sel] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`file:///mnt/project-files/rago-redesign/rendus-v5/src/${name}.html#${hash}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const r = await p.$$eval(sel, els => els.map(e => { const r = e.getBoundingClientRect(); return Math.round(r.top + scrollY) + ':' + Math.round(r.height); }));
  console.log(r.join(' ')); await b.close();
})();
