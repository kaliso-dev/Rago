const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', woff2: 'font/woff2', svg: 'image/svg+xml', png: 'image/png' };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.route('http://cv.local/**', (r) => {
    const u = new URL(r.request().url());
    const f = path.join(DIR, decodeURIComponent(u.pathname));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream' } });
  });
  p.on('console', (m) => console.log('console', m.text()));
  p.on('pageerror', (e) => console.log('err', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('rago.cerveau.v1', JSON.stringify({ rw: 560 })); } catch {} });
  await p.goto('http://cv.local/index.html#n=' + encodeURIComponent('Technique/Cerveau du vault'));
  await p.waitForTimeout(+process.argv[2] || 9000);
  await p.screenshot({ path: 'real-full.png' });
  const data = await p.evaluate(() => document.getElementById('cv-canvas').toDataURL('image/png'));
  fs.writeFileSync('toile.png', Buffer.from(data.split(',')[1], 'base64'));
  const r = await p.evaluate(() => { const c = document.getElementById('cv-canvas').getBoundingClientRect(); return [c.left, c.top, c.width, c.height]; });
  console.log('canvas', r);
  await b.close();
})();
