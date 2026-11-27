// node itest-share.js : parcours de la page Partage dans la démo (Premium, gratuit, erreurs, vide), captures des états
const { chromium } = require('playwright');
const fs = require('fs');
const SP = __dirname;
const FRIEND = 'ping_main,net_nagle,net_throttle,pri_game,pri_mmcss,kbm_1to1,kbm_accel,cpu_intel,gpu_amd,net_adapter,net_registry,net_offload,net_msi,net_affinity,pri_thread,pri_irq8,pri_dwm,kbm_csrss,kbm_repeat,sys_csrss,lat_directx,net_ipv6,net_dca,cpu_parking'.split(',');
async function open(b, lsFile, lang = 'en') {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  const ls = lsFile ? JSON.parse(fs.readFileSync(SP + '/' + lsFile, 'utf8')) : {};
  await p.addInitScript(([l, ls]) => { localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [lang, ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const a = [...document.querySelectorAll('.side a')].find((x) => /settings|paramètres/i.test(x.textContent)); a && a.click(); });
  await p.waitForTimeout(700);
  await p.click('button.sr.lk2');
  await p.waitForTimeout(700);
  return p;
}
const code = (p, ids, n) => p.evaluate(async ([ids, n]) => (await import('/src/lib/share.ts')).encodePreset({ n, t: ids }), [ids, n]);
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  // 1. Premium : copier, ajouter, garder
  let p = await open(b, 'ls-share.json');
  ok(await p.textContent('.ping .pv b') === '21', 'en-tête : 21 réglages');
  await p.fill('#share-name', 'Bedwars, low ping');
  await p.waitForTimeout(300);
  ok((await p.textContent('.tkh b')) === 'Bedwars, low ping', 'nom sur le ticket');
  await p.click('.tkr .btn');
  await p.waitForTimeout(300);
  ok(/copied/i.test(await p.textContent('.tkr .btn')) && !(await p.getAttribute('.tkr .btn', 'class')).includes('red'), 'copié : bouton neutre');
  await p.fill('#share-code', await code(p, FRIEND, "Kev's bridge preset"));
  await p.press('#share-code', 'Enter');
  await p.waitForTimeout(400);
  ok(await p.locator('.segb i').count() === 24, 'aperçu : 24 segments');
  ok(await p.locator('.segb i.u').count() === 2, '2 indisponibles (Intel, AMD)');
  await p.click('.pva .btn.red');
  await p.waitForTimeout(300);
  ok(/added to your selection/.test(await p.textContent('.pva .ok3')), 'ajoutés : message');
  await p.fill('#share-keep-name', "Kev's bridge");
  await p.click('.kr .btn');
  await p.waitForTimeout(300);
  ok(await p.locator('.keep2.done').count() === 1, 'gardé dans Mes presets');
  await p.screenshot({ path: SP + '/shots/st-added.png', clip: { x: 276, y: 380, width: 540, height: 520 } });
  await p.click('.keep2.done .btn');
  await p.waitForTimeout(500);
  ok(await p.locator('.modal, [role=dialog]').count() > 0, 'modifier : fenêtre du preset');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  // rapport : vide, création, ouverture, défilement
  while (await p.locator('.cr[aria-checked=true]').count()) await p.locator('.cr[aria-checked=true]').first().click();
  ok(await p.locator('.shrow.end .btn.dis2:disabled').count() === 1, 'rien coché : bouton grisé');
  await p.screenshot({ path: SP + '/shots/st-none.png', clip: { x: 846, y: 140, width: 560, height: 420 } });
  await p.locator('.cr').first().press('Space');
  await p.click('.shrow.end .btn.red');
  await p.waitForTimeout(150);
  ok(await p.locator('.shrow.end .btn svg.spin').count() === 1, 'création : icône qui tourne');
  await p.waitForTimeout(1000);
  await p.click('.rfile .lnk');
  await p.waitForTimeout(300);
  ok(await p.locator('pre.txt2 .sec').count() >= 1, 'texte : titres en évidence');
  console.log(p.errs.join('\n'));
  await p.close();
  // 2. gratuit : Premium verrouillé
  p = await open(b, 'ls-settings-free.json');
  ok(await p.locator('.emp2').count() === 1, 'gratuit sans réglage : écran vide');
  await p.fill('#share-code', await code(p, FRIEND.slice(0, 18), 'Valorant ranked'));
  await p.click('.pst .btn');
  await p.waitForTimeout(400);
  ok(await p.locator('.segb i.l').count() > 0 && await p.locator('.pva .btn.gh2').count() === 1, 'gratuit : réservés à Premium et bouton Premium');
  await p.screenshot({ path: SP + '/shots/st-free.png', clip: { x: 276, y: 140, width: 540, height: 760 } });
  // erreurs
  await p.fill('#share-code', 'yo check my settings lol');
  await p.click('.pst .btn');
  await p.waitForTimeout(300);
  ok(/isn't a Rago/.test(await p.textContent('.err2')) && await p.locator('.in3.code.bad').count() === 1, 'pas un code');
  const c = await code(p, FRIEND, 'x');
  await p.fill('#share-code', c.slice(0, 40));
  await p.click('.pst .btn');
  await p.waitForTimeout(300);
  ok(/incomplete|isn't a Rago/.test(await p.textContent('.err2')), 'code abîmé : ' + (await p.textContent('.err2')));
  await p.screenshot({ path: SP + '/shots/st-err.png', clip: { x: 276, y: 380, width: 540, height: 260 } });
  console.log(p.errs.join('\n'));
  await p.close();
  // 3. français
  p = await open(b, 'ls-share.json', 'fr');
  await p.fill('#share-code', await code(p, FRIEND, "Preset de Kev"));
  await p.click('.pst .btn');
  await p.waitForTimeout(400);
  await p.click('.shrow.end .btn.red');
  await p.waitForTimeout(1100);
  await p.screenshot({ path: SP + '/shots/st-fr.png' });
  console.log(p.errs.join('\n'));
  await b.close();
})();
