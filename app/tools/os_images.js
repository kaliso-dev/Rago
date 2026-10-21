// Fabrique le fond d'écran et l'écran de verrouillage de Rago OS (4K) à partir de os_images.html :
// NODE_PATH=$(npm root -g) node tools/os_images.js (Playwright et Chromium nécessaires).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 3840, height: 2160 } });
  for (const kind of ['wallpaper', 'lockscreen']) {
    await p.goto('file://' + __dirname + '/os_images.html?kind=' + kind);
    await p.waitForTimeout(300);
    await p.screenshot({ path: require('path').join(__dirname, '../src-tauri/resources/os', kind + '.jpg'), type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
