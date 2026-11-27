// Display : glisser la ligne, bandes noires, curseurs, autres jeux
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript((l) => { try { localStorage.setItem('rago.lang', JSON.stringify(l)); } catch {} }, process.env.L || 'en');
  await p.goto('http://localhost:1420/' + (process.env.Q || ''), { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const a=[...document.querySelectorAll('.side a')].find(x => /display|affichage/i.test(x.querySelector('.t')?.textContent)); a && a.click(); });
  await p.waitForTimeout(1200);
  const vs = await p.locator('.vs').boundingBox();
  // glisser la ligne vers la gauche
  await p.mouse.move(vs.x + vs.width * 0.5, vs.y + 200); await p.mouse.down();
  await p.mouse.move(vs.x + vs.width * 0.2, vs.y + 200, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(300);
  await p.screenshot({ path: out + '-drag.png', clip: { x: vs.x - 10, y: vs.y - 10, width: vs.width + 400, height: vs.height + 20 } });
  // bandes noires, luminosité à fond, gamma plus haut
  await p.click('.opts .tabs span:nth-of-type(2)'); await p.waitForTimeout(300);
  const seg = await p.locator('.mini .seg').first().boundingBox();
  await p.mouse.click(seg.x + seg.width * 0.98, seg.y + seg.height / 2);
  const g = await p.locator('.mini .seg').nth(2).boundingBox();
  await p.mouse.click(g.x + g.width * 0.8, g.y + g.height / 2);
  const s = await p.locator('.satbar .seg').boundingBox();
  await p.mouse.click(s.x + s.width * 0.1, s.y + s.height / 2);
  await p.waitForTimeout(400);
  await p.screenshot({ path: out + '-bars.png', clip: { x: vs.x - 10, y: vs.y - 10, width: vs.width + 400, height: vs.height + 20 } });
  console.log('mini', await p.$$eval('.mini em', (e) => e.map((x) => x.textContent)), 'sat', await p.$eval('.big b', (e) => e.textContent));
  // CS2, puis Apex (pas de pros), puis +4
  await p.click('.bar .tabs span:has-text("counter-strike 2")'); await p.waitForTimeout(500);
  await p.screenshot({ path: out + '-cs2.png', fullPage: false });
  await p.click('.bar .tabs span:has-text("+")'); await p.waitForTimeout(300);
  await p.click('.bar .tabs span:has-text("rainbow six siege")'); await p.waitForTimeout(500);
  await p.setViewportSize({ width: 1440, height: 1400 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: out + '-r6.png' });
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
