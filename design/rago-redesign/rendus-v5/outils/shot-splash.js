// node shot-splash.js <outdir> [ms…] : écran de démarrage de l'app aux instants donnés (horloge de la page figée),
// et la maquette (perso/src/splash.html) aux instants correspondants de sa propre timeline. env L (langue), M=1 maquette
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [,, out, ...ts] = process.argv;
  const times = ts.length ? ts.map(Number) : [0, 300, 700, 1000, 1400, 1800, 2100];
  const b = await chromium.launch();
  const base = JSON.parse(fs.readFileSync(__dirname + '/ls-mouse.json', 'utf8'));
  for (const t of times) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    if (process.env.M) {
      await p.setViewportSize({ width: 720, height: 460 });
      await p.goto('file:///mnt/project-files/rago-redesign/rendus-v5/perso/src/splash.html', { waitUntil: 'networkidle' });
      await p.addScriptTag({ path: '/mnt/project-files/rago-redesign/rendus-v5/src/seq.js' }).catch(() => {});
      await p.waitForTimeout(800);
      await p.evaluate((t) => window.__seq.seek(t), t);
    } else {
      await p.clock.install();
      await p.addInitScript(([l, ls]) => { localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [process.env.L || 'en', base]);
      await p.goto('http://localhost:1420/', { waitUntil: 'domcontentloaded' });
      await p.clock.runFor(10);
      await p.waitForSelector('.spl5');
      await p.evaluate(() => document.fonts.ready);
      await p.clock.runFor(t);
    }
    await p.waitForTimeout(100);
    await p.screenshot({ path: `${out}/${process.env.M ? 'm' : 'a'}-${t}.png` });
    await p.close();
  }
  await b.close();
})();
