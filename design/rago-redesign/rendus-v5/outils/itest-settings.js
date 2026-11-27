// node itest-settings.js : interactions de la page Paramètres (résiliation, reprise, langue, nom, avis, raccourci, interrupteurs)
const { chromium } = require('playwright');
const SP = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ls = JSON.parse(require('fs').readFileSync(SP + '/ls-settings.json', 'utf8'));
  await p.addInitScript(([ls]) => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.setItem('rago.lang', '"en"'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } }, [ls]);
  await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const a=[...document.querySelectorAll('.side a')].find(x => x.querySelector('.t')?.textContent.trim().toLowerCase()==='settings'); a.click(); });
  await p.waitForTimeout(1200);
  const txt = (sel) => p.locator(sel).first().innerText().then(s => s.replace(/\s+/g, ' ').trim());
  console.log('head:', await txt('.ping.sig.plan'));
  // résiliation
  await p.click('.sr button.lnk:has-text("cancel subscription")'); await p.waitForTimeout(500);
  console.log('modal:', await txt('.modal h2'));
  await p.click('.modal button:has-text("Cancel subscription")'); await p.waitForTimeout(1200);
  console.log('done modal:', await txt('.modal h2'));
  await p.click('.modal button:has-text("Close")'); await p.waitForTimeout(500);
  console.log('canceled row:', await txt('.sr.cxl'), '| head:', await txt('.ping.sig.plan'));
  await p.mouse.move(1, 1); await p.screenshot({ path: SP + '/a-setc.png' });
  await p.click('.sr.cxl button.btn'); await p.waitForTimeout(900);
  console.log('resumed:', await p.locator('.sr.cxl').count() === 0, '| head:', await txt('.ping.sig.plan'));
  // nom public
  await p.fill('#profile-name', 'Zyrox'); console.log('save enabled:', await p.locator('button.sv').isEnabled());
  await p.click('button.sv'); await p.waitForTimeout(900);
  console.log('name saved:', await txt('.who .l b'), '|', await txt('button.sv'));
  // avis : supprimer puis garder
  await p.click('button.ic.del'); await p.waitForTimeout(200);
  console.log('ask:', await txt('.sr[role=group]'));
  await p.click('.sr[role=group] button:has-text("Keep it")'); await p.waitForTimeout(200);
  console.log('kept:', await p.locator('.sr[role=group]').count() === 0);
  // raccourci
  await p.click('.sr:has(.kb) button.lnk:has-text("change")'); await p.waitForTimeout(200);
  console.log('recording:', await txt('.kb'));
  await p.keyboard.press('Control+Shift+KeyR'); await p.waitForTimeout(500);
  console.log('shortcut:', await txt('.kb'), '| reset shown:', await p.locator('.sr:has(.kb) button.lnk.dim').count());
  await p.click('.sr:has(.kb) button.lnk.dim'); await p.waitForTimeout(500);
  console.log('after reset:', await txt('.kb'));
  // interrupteurs
  const sw = p.locator('.sr:has-text("FPS and ping on screen") button.sw');
  await sw.click(); await p.waitForTimeout(400); console.log('pin off:', await sw.getAttribute('aria-checked'));
  const gpu = p.locator('.sr.dis button.sw'); console.log('gpu disabled:', await gpu.isDisabled());
  const trim = p.locator('.sr:has-text("trims background apps") button.sw'); await trim.click(); await p.waitForTimeout(200); console.log('trim:', await trim.getAttribute('aria-checked'));
  // animations au clavier, puis langue
  await p.focus('.seg2[aria-label=Animations] span.on'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  console.log('motion:', await txt('.seg2[aria-label=Animations] span.on'));
  await p.click('.seg2 span:has-text("français")'); await p.waitForTimeout(600);
  console.log('fr title:', await txt('.pg-settings .title'), '| kick:', await txt('.pg-settings .kick'));
  await p.screenshot({ path: SP + '/a-set-fr.png', fullPage: false });
  // partage
  await p.click('button.sr.lk2'); await p.waitForTimeout(800);
  console.log('share page:', await p.locator('.side a.on .t').first().innerText().catch(() => '?'), await p.evaluate(() => !!document.querySelector('.pg-settings')));
  console.log('errors:', errs.slice(0, 5).join(' | ') || 'none');
  await b.close();
})();
