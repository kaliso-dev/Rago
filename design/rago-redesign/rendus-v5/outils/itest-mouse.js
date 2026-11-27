// node itest-mouse.js : interactions de la page Souris (états avant mesure, clics en cours, sans rebond, sensibilité, français)
const { chromium } = require('playwright');
const SP = __dirname;
(async () => {
  const b = await chromium.launch();
  const run = async (lang, fn) => {
    const p = await b.newPage({ viewport: { width: 1440, height: 1220 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const ls = JSON.parse(require('fs').readFileSync(SP + '/ls-mouse.json', 'utf8'));
    await p.addInitScript(([l, ls]) => { localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [lang, ls]);
    await p.goto('http://localhost:1420/', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
    await p.evaluate(() => { const a=[...document.querySelectorAll('.side a')].find(x => ['mouse','souris'].includes(x.querySelector('.t')?.textContent.trim().toLowerCase())); a.click(); });
    await p.waitForTimeout(1000);
    await fn(p); console.log(lang, 'errors:', errs.slice(0, 5).join(' | ') || 'none'); await p.close();
  };
  const press = (p, ts) => p.evaluate((ts) => { const el = document.querySelector('.pad'); const e = new PointerEvent('pointerdown', { pointerType: 'mouse', button: 0, bubbles: true }); Object.defineProperty(e, 'timeStamp', { value: ts }); el.dispatchEvent(e); }, ts);
  await run('en', async (p) => {
    await p.screenshot({ path: SP + '/it-mouse-empty.png' });
    // 3 clics : lien « start again » dans le titre
    for (let i = 0; i < 3; i++) { await press(p, 1000 + i * 300); await p.waitForTimeout(30); }
    console.log('in progress:', await p.locator('.pc2').innerText(), '| lnk:', await p.locator('.sh button.lnk').count());
    await p.locator('.mgrid > section').nth(1).screenshot({ path: SP + '/it-mouse-clicking.png' });
    await p.click('.sh button.lnk'); await p.waitForTimeout(200);
    console.log('after reset:', (await p.locator('.pc2').innerText()).replace(/\n/g, ''));
    // 20 clics sans rebond
    for (let i = 0; i < 20; i++) { await press(p, 5000 + i * 300); await p.waitForTimeout(20); }
    console.log('done no bounce:', await p.locator('.mgrid > section').nth(1).locator('.vt2').innerText(), '|', await p.locator('.alert2.ok p').innerText());
    await p.locator('.mgrid > section').nth(1).screenshot({ path: SP + '/it-mouse-clean.png' });
    // un 21e clic ne compte plus
    await press(p, 20000); await p.waitForTimeout(50);
    console.log('extra click ignored:', (await p.locator('.pc2').innerText()).replace(/\n/g, ''));
    // sensibilité : 1600 dpi, 0.5, CS2 -> Valorant
    await p.fill('.inp label:nth-child(1) input', '1600'); await p.fill('.inp label:nth-child(2) input', '0.5');
    await p.selectOption('.inp select', 'cs2'); await p.selectOption('.conv select', 'valorant');
    console.log('sens:', (await p.locator('.out').innerText()).replace(/\n/g, ' '), '| conv:', await p.locator('.conv b').innerText());
    await p.fill('.inp label:nth-child(1) input', ''); 
    console.log('empty dpi:', (await p.locator('.out').innerText()).replace(/\n/g, ' '), '|', await p.locator('.conv b').innerText());
    await p.fill('.inp label:nth-child(1) input', '800');
    await p.hover('.pad'); await p.waitForTimeout(200);
    await p.locator('.mgrid > section').nth(3).screenshot({ path: SP + '/it-mouse-sens.png' });
    // lien vers Latence
    await p.click('.li2.one button.lnk'); await p.waitForTimeout(900);
    console.log('goTo latency:', await p.evaluate(() => document.querySelector('.side a.on .t, .side a.is-on .t, .side a[aria-current] .t')?.textContent));
  });
  await run('fr', async (p) => {
    await p.screenshot({ path: SP + '/it-mouse-fr.png', fullPage: false });
  });
  await b.close();
})();
