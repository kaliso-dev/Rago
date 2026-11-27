const { chromium } = require('playwright');
(async () => {
  const [,, name, hash, sels] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`file:///mnt/project-files/rago-redesign/rendus-v5/src/${name}.html#${hash}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate((sels) => sels.split(',').map(s => { const e = document.querySelector(s); if (!e) return s + ' none'; const r = e.getBoundingClientRect(); return `${s} ${Math.round(r.top + scrollY)} ${Math.round(r.height)}`; }), sels);
  console.log(r.join('\n')); await b.close();
})();
