// node shot-igm.js <out> [x y w h] [page] : maquette de la barre en jeu (rendus-v5), découpée à la fenêtre de l'app
const { chromium } = require('playwright');
(async () => {
  const [,, out, x = 302, y = 18, w = 836, h = 656, page = 'app-ingame.html'] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await p.goto('file:///mnt/project-files/rago-redesign/rendus-v5/src/' + page + '#round', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  if (process.env.MEAS) console.log(await p.evaluate(process.env.MEAS));
  await p.screenshot({ path: out, clip: { x: +x, y: +y, width: +w, height: +h } });
  await b.close();
})();
