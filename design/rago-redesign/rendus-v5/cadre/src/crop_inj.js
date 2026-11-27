// Rend une page avec un bout injecté et capture une zone autour d'éléments. Usage :
// node crop_inj.js <page> <hash> <snippet.js> <out.png> <selTop> <selBottom> <x0> <x1> <padTop> <padBottom>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [,, name, hash, snip, out, sTop, sBot, x0, x1, pt, pb] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(`file:///mnt/project-files/rago-redesign/rendus-v5/src/${name}.html#${hash}`, { waitUntil: 'networkidle' });
  await p.addStyleTag({ path: '/mnt/project-files/rago-redesign/rendus-v5/src/frame.css' });
  await p.evaluate(fs.readFileSync(snip, 'utf8'));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const r = await p.evaluate(([a, c]) => [document.querySelector(a).getBoundingClientRect().top, document.querySelector(c).getBoundingClientRect().bottom], [sTop, sBot]);
  const y = r[0] - +pt, h = r[1] + +pb - y;
  await p.screenshot({ path: out, clip: { x: +x0, y, width: +x1 - +x0, height: h }, fullPage: true });
  await b.close();
})();
