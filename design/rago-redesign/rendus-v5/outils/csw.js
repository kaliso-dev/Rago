// node csw.js <maquette> <selecteur> : positions dans une maquette de fenêtre
const { chromium } = require('playwright');
(async () => {
  const [,, name, sel] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`file:///mnt/project-files/rago-redesign/rendus-v5/src/${name}.html`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.documentElement.classList.add('round', 'poster')); await p.waitForTimeout(500);
  console.log(JSON.stringify(await p.evaluate((sel) => [...document.querySelectorAll(sel)].slice(0, 6).map((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10, c.fontSize, c.lineHeight, c.margin, c.padding]; }), sel)));
  await b.close();
})();
