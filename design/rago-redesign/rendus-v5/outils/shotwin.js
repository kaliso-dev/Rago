// node shotwin.js <outdir> <maquette>... : captures des maquettes de fenêtres (une seule page de navigateur)
const { chromium } = require('playwright');
(async () => {
  const [,, out, ...names] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const name of names) {
    await p.goto(`file:///mnt/project-files/rago-redesign/rendus-v5/src/${name}.html`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.documentElement.classList.add('round', 'poster'));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${name}.png` });
  }
  await b.close();
})();
