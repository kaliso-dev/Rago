// node itest-ig.js : vérifie la barre en jeu (overlay.html) dans la démo
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  let ok = 0, ko = 0;
  const check = (name, cond, extra = '') => { if (cond) ok++; else { ko++; console.log('ÉCHEC', name, extra); } };
  const base = JSON.parse(fs.readFileSync(__dirname + '/ls-mouse.json', 'utf8'));
  const open = async (q, { lang = 'en', free = false, size = [836, 656] } = {}) => {
    const p = await b.newPage({ viewport: { width: size[0], height: size[1] } });
    p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
    const ls = { ...base, 'rago.demoApplied': '[]' };
    if (free) delete ls['rago.demoLicense'];
    await p.addInitScript(([l, ls]) => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [lang, ls]);
    await p.goto('http://localhost:1420/overlay.html?' + q, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1800);
    return p;
  };
  const box = (p, s) => p.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && [r.x, r.y, r.width, r.height].map(Math.round); }, s);

  // barre ouverte, Premium
  let p = await open('');
  check('barre 780 × 600 en haut, au centre', JSON.stringify(await box(p, '.igp')) === '[28,0,780,600]', JSON.stringify(await box(p, '.igp')));
  check('5 mesures et Nettoyer', (await p.locator('.igtile').count()) === 5 && (await p.locator('button.igcl').count()) === 1);
  check('deux colonnes', (await p.locator('.igb:not(.one) > .igcol').count()) === 2);
  check('points de la partie', (await p.locator('.igck p.ok').count()) === 2 && (await p.locator('.igck p.wr').count()) > 0);
  check('pas de badge Premium', (await p.locator('.igpr').count()) === 0);
  check('pied : 2 touches', (await p.locator('.igf kbd').allTextContents()).join('|') === 'Alt+X|Esc', (await p.locator('.igf kbd').allTextContents()).join('|'));
  // réglages conseillés
  const n0 = await p.locator('.igtr').count();
  check('3 réglages conseillés', n0 === 3, n0);
  const left0 = await p.textContent('.igth em');
  await p.click('.igth');
  check('replié', (await p.locator('.igtp.shut').count()) === 1 && (await p.locator('.igtr').count()) === 0);
  await p.click('.igth');
  check('déplié', (await p.locator('.igtp.shut').count()) === 0 && (await p.locator('.igtr').count()) === 3);
  await p.click('.igtf button:has-text("more")');
  check('tous les réglages', (await p.locator('.igtr').count()) > 3);
  const first = await p.textContent('.igtr .l1 b');
  await p.click('.igtr .igcb');
  await p.waitForTimeout(400);
  check('coché : retiré de la liste', (await p.textContent('.igtr .l1 b')) !== first && (await p.textContent('.igth em')) !== left0, await p.textContent('.igth em'));
  const sd = p.locator('.igtf button:has-text("show done")');
  check('lien « show done (1) »', (await sd.count()) === 1 && /\(1\)/.test(await sd.textContent()), await sd.count());
  await sd.click();
  check('fait : coché et grisé', (await p.locator('.igtr.done .igcb.on').count()) === 1);
  await p.click('.igtr.done .igcb');
  await p.waitForTimeout(400);
  check('décoché', (await p.locator('.igtr.done').count()) === 0);
  // réglage en direct
  const row = p.locator('.igr').nth(1);
  const wasOn = await row.evaluate((e) => e.classList.contains('on'));
  await row.click();
  await p.waitForTimeout(150);
  check('chargement sur la ligne', (await p.locator('.igr .ld.spin').count()) === 1);
  check('autres interrupteurs grisés', (await p.locator('.igr .sw.dis').count()) > 5 && (await p.locator('.igr:disabled').count()) > 5);
  await p.waitForFunction(() => !document.querySelector('.igr .ld'), null, { timeout: 15000 });
  check('réglage basculé', (await row.evaluate((e) => e.classList.contains('on'))) !== wasOn);
  // nettoyer
  await p.click('button.igcl');
  await p.waitForTimeout(100);
  check('nettoyage en cours', (await p.locator('.igcl.busy svg.spin').count()) === 1);
  await p.waitForSelector('.ignote', { timeout: 8000 });
  check('message après nettoyage', /cleared|empty/i.test(await p.textContent('.ignote')), await p.textContent('.ignote'));
  check('pas d\'erreur', !p.errs.length, p.errs.join('\n'));
  await p.close();

  // gratuit
  p = await open('', { free: true });
  check('badge Premium', (await p.locator('button.igpr').count()) === 1);
  check('liste verrouillée', (await p.locator('.igl.locked').count()) === 1 && (await p.locator('.igr:disabled').count()) === (await p.locator('.igr').count()));
  await p.close();

  // sans partie : une colonne, réglages sur deux colonnes
  p = await open('game=nogame');
  // (la démo garde une partie en cours sur overlay.html : jeu inconnu = pas de réglages conseillés)
  check('jeu sans conseils : pas de bloc', (await p.locator('.igtp').count()) === 0);
  await p.close();

  // français, mode passif
  p = await open('passive', { lang: 'fr' });
  check('FR passif : touches', (await p.locator('.igf kbd').allTextContents()).join('|') === 'Alt+X|Échap', (await p.locator('.igf kbd').allTextContents()).join('|'));
  check('FR titre', (await p.textContent('.igt .igo')) === 'Barre en jeu');
  await p.close();

  // pastille, rappel
  p = await open('pill', { size: [236, 44] });
  check('pastille 236 × 44', JSON.stringify(await box(p, '.igpill')) === '[0,0,236,44]', JSON.stringify(await box(p, '.igpill')));
  check('pastille : fps et ms', (await p.locator('.igpill small').allTextContents()).join('|') === 'fps|ms');
  await p.close();
  p = await open('pill&nudge&game=lol', { size: [440, 44], lang: 'fr' });
  const w = (await box(p, '.igpill'))[2];
  check('rappel tient dans 440', w <= 440, w);
  check('rappel : texte', /conseils pour League of Legends/.test(await p.textContent('.igpill .tx')));
  await p.close();
  // petit écran : la barre rétrécit, la liste défile
  p = await open('', { size: [836, 480] });
  const sc = await p.evaluate(() => { const e = document.querySelectorAll('.igsc')[1]; return [e.scrollHeight > e.clientHeight, getComputedStyle(e).overflowY]; });
  check('petit écran : liste qui défile', sc[0] && sc[1] === 'auto', JSON.stringify(sc));
  check('petit écran : pied visible', (await box(p, '.igf'))[1] + (await box(p, '.igf'))[3] <= 480 - 56 + 1, JSON.stringify(await box(p, '.igf')));
  await p.close();
  console.log(`${ok} réussis, ${ko} échoués`);
  await b.close();
})();
