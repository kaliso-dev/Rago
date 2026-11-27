// Capture les deux images de l'installeur (1x et 2x) et les tailles de l'icône. Usage : node shoot_installer.js
const { chromium } = require('playwright');
const S = '/mnt/project-files/rago-redesign/rendus-v5/src', C = '/mnt/project-files/rago-redesign/charte/icone-app';
(async () => {
  const b = await chromium.launch();
  for (const sc of [1, 2]) {
    const p = await b.newPage({ viewport: { width: 600, height: 400 }, deviceScaleFactor: sc });
    await p.goto(`file://${S}/inst-art.html`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    const suf = sc === 1 ? '' : '@2x';
    await (await p.$('#side')).screenshot({ path: `${S}/img/installer/sidebar${suf}.png` });
    await (await p.$('#head')).screenshot({ path: `${S}/img/installer/header${suf}.png` });
    await p.close();
  }
  const sizes = { 16: 16, 20: 24, 24: 24, 32: 32, 40: 48, 48: 48, 64: 64, 128: 128, 256: 256 };
  for (const [s, src] of Object.entries(sizes)) {
    const p = await b.newPage({ viewport: { width: +s, height: +s }, deviceScaleFactor: 1 });
    const tmp = `${__dirname}/ico-tmp.html`;
    require('fs').writeFileSync(tmp, `<html><body style="margin:0;background:transparent"><img src="file://${C}/rago-app-dark-${src}.svg" width="${s}" height="${s}" style="display:block"></body></html>`);
    await p.goto('file://' + tmp, { waitUntil: 'load' });
    await p.waitForTimeout(150);
    await p.screenshot({ path: `${S}/img/installer/ico-${s}.png`, omitBackground: true, clip: { x: 0, y: 0, width: +s, height: +s } });
    await p.close();
  }
  await b.close();
})();
