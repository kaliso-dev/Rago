// node itest-splash.js : écran de démarrage en temps réel (durées, messages, sortie, mouvement réduit, français)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  let ok = 0, ko = 0;
  const check = (n, c, x = '') => { if (c) ok++; else { ko++; console.log('ÉCHEC', n, x); } };
  const base = JSON.parse(fs.readFileSync(__dirname + '/ls-mouse.json', 'utf8'));
  const run = async (lang, extra = {}) => {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.addInitScript(([l, ls]) => { localStorage.clear(); localStorage.setItem('rago.lang', JSON.stringify(l)); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, [lang, { ...base, ...extra }]);
    // relevé dans la page : messages vus, instant de « Ready », instant où l'écran disparaît
    await p.addInitScript(() => {
      const t0 = performance.now(); window.__log = { msgs: [], ready: null, gone: null, wipe: null, seen: null };
      const tick = () => {
        const s = document.querySelector('.spl5'); const now = performance.now() - t0;
        if (s && window.__log.seen == null && document.querySelector('.spl5 .logo g g')?.style.opacity > 0) window.__log.seen = now;
        const m = document.querySelector('.spl5 .msg')?.textContent;
        if (m && window.__log.msgs.at(-1) !== m) window.__log.msgs.push(m);
        if (document.querySelector('.spl5 .msg.rd') && window.__log.ready == null) window.__log.ready = now;
        if (document.querySelector('.spl5.off') && window.__log.wipe == null) window.__log.wipe = now;
        if (!s && window.__log.seen != null && window.__log.gone == null) window.__log.gone = now;
        if (window.__log.gone == null) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await p.goto('http://localhost:1420/', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__log.gone != null, null, { timeout: 8000 });
    const log = await p.evaluate(() => window.__log);
    await p.close();
    return { log, errs };
  };
  let { log, errs } = await run('en');
  console.log(JSON.stringify(log));
  check('4 messages anglais', log.msgs.join('|') === 'Checking Windows|Reading drivers and games|Testing your connection|Ready', log.msgs.join('|'));
  check('Ready vers 1,8 s après le départ', log.ready - log.seen > 1600 && log.ready - log.seen < 2000, log.ready - log.seen);
  check('aplat couvrant vers 2,3 s', log.wipe - log.seen > 2100 && log.wipe - log.seen < 2500, log.wipe - log.seen);
  check('app découverte avant 3,1 s', log.gone - log.seen < 3100, log.gone - log.seen);
  check('pas d\'erreur', !errs.length, errs.join('\n'));
  ({ log, errs } = await run('fr'));
  check('messages français', log.msgs.join('|') === 'Vérification de Windows|Lecture des pilotes et des jeux|Test de ta connexion|Prêt', log.msgs.join('|'));
  ({ log, errs } = await run('en', { 'rago.motion': '"reduced"' }));
  console.log(JSON.stringify(log));
  check('réduit : pas d\'aplat', log.wipe == null);
  check('réduit : Ready puis fondu', log.ready != null && log.gone - log.seen < 2900, log.gone - log.seen);
  check('réduit : pas d\'erreur', !errs.length, errs.join('\n'));
  console.log(`${ok} réussis, ${ko} échoués`);
  await b.close();
})();
