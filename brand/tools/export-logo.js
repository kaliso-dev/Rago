// Exporte toutes les déclinaisons raster depuis les SVG de brand/logo/ (SVG injecté inline : pas de file:// qui rend une image cassée).
// Usage : node brand/tools/export-logo.js (playwright requis)   (puis les commandes ImageMagick de la section « Régénérer les fichiers du logo » du README)
const { chromium } = require('playwright');
const fs = require('fs');
const D = __dirname + '/../logo/';
const load = f => fs.readFileSync(D + f, 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
const sized = (s, w, h) => s.replace('<svg ', `<svg width="${w}" height="${h}" style="display:block" `);
const RED = '#FF3B30';
const markInline = h => sized(load('rago-mark.svg'), Math.round(h * 164 / 180), h);
const jobs = [];
for (const s of [16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024]) jobs.push({ src: s <= 32 ? 'rago-favicon.svg' : 'rago-app-icon.svg', out: `png/rago-icon-${s}.png`, w: s, h: s });
jobs.push({ src: 'rago-mark.svg', out: 'png/rago-mark-512.png', w: 466, h: 512 },
  { src: 'rago-mark-white.svg', out: 'png/rago-mark-white-512.png', w: 466, h: 512 },
  { src: 'rago-wordmark-white.svg', out: 'png/rago-wordmark-white-1200.png', w: 1200, h: Math.round(1200 * 180 / 1124) },
  { src: 'rago-wordmark-ink.svg', out: 'png/rago-wordmark-ink-1200.png', w: 1200, h: Math.round(1200 * 180 / 1124) },
  { src: 'rago-app-tile.svg', out: 'web/apple-touch-icon.png', w: 180, h: 180 },
  { src: 'rago-app-tile.svg', out: 'png/rago-tile-512.png', w: 512, h: 512 },
  { src: 'rago-favicon.svg', out: 'web/favicon-32.png', w: 32, h: 32 });
// Geist est embarqué (tools/fonts, licence OFL) : aucune dépendance réseau ni police système.
const b64 = f => fs.readFileSync(__dirname + '/fonts/' + f).toString('base64');
const FACES = `@font-face{font-family:Geist;src:url(data:font/woff2;base64,${b64('Geist-Variable.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:'Geist Mono';src:url(data:font/woff2;base64,${b64('GeistMono-Variable.woff2')}) format('woff2');font-weight:100 900}`;
const font = "font-family:Geist,sans-serif;color:#F5F5F6;-webkit-font-smoothing:antialiased";
const mono = "font-family:'Geist Mono',monospace";
// nombre de réglages annoncé, comme l'app et le site : les jumeaux (même script, champ `twin`) comptent une fois
const catalog = JSON.parse(fs.readFileSync(__dirname + '/../../app/src/data/catalog.json', 'utf8'));
const TOTAL = new Set(catalog.modules.flatMap(m => m.sections.flatMap(s => s.tweaks.filter(t => t.id).map(t => t.twin || t.id)))).size;
// ligne de réglage de l'image de partage : vrais réglages Safe du catalogue, allumés comme dans l'aperçu du site
const toggle = `<span style="flex:none;width:46px;height:26px;border-radius:999px;background:#FF3B30;position:relative"><i style="position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:999px;background:#0A0A0B"></i></span>`;
const row = (name, section) => `<div style="display:flex;align-items:center;gap:16px;padding:15px 18px;border-radius:16px;background:#17171A">
        <div style="flex:1"><div style="font-size:20px;line-height:1.2">${name}</div><div style="${mono};font-size:13px;letter-spacing:.1em;color:#7C7C86;margin-top:6px">${section}</div></div>${toggle}</div>`;
const ring = (size, opacity) => `<i style="position:absolute;left:50%;top:50%;width:${size}px;height:${size}px;margin:-${size / 2}px 0 0 -${size / 2}px;border-radius:50%;border:2px solid rgba(255,59,48,${opacity})"></i>`;
const html = [
  ['installer/sidebar.png', 164, 314, `<div style="width:164px;height:314px;background:radial-gradient(120% 60% at 85% 0%,rgba(255,59,48,.26),transparent 60%),#0A0A0B;${font};position:relative;overflow:hidden">
    <div style="position:absolute;left:22px;top:30px">${markInline(48)}</div>
    <div style="position:absolute;left:22px;top:98px;font-size:20px;font-weight:700;letter-spacing:-.02em;line-height:1.1">Rago<br><span style="font-weight:400">Optimizer</span></div>
    <div style="position:absolute;left:22px;bottom:28px;font-size:11px;color:#A1A1AA">Every millisecond counts.</div></div>`],
  ['installer/header.png', 150, 57, `<div style="width:150px;height:57px;background:#FFFFFF;display:flex;align-items:center;justify-content:flex-end;padding-right:14px;box-sizing:border-box">
    <div style="width:36px;height:36px;border-radius:10px;background:#0A0A0B;display:flex;align-items:center;justify-content:center">${markInline(22)}</div></div>`],
  // Image de partage du site (Open Graph, 1200 × 630) : nom, promesse, chiffres vrais. Lisible réduite à 400 px (Discord).
  ['web/og-image.png', 1200, 630, `<div style="width:1200px;height:630px;box-sizing:border-box;padding:72px 0 76px 80px;background:radial-gradient(55% 80% at 100% 0%,rgba(255,59,48,.24),transparent 65%),radial-gradient(45% 60% at 78% 115%,rgba(255,59,48,.10),transparent 70%),#0A0A0B;${font};position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between">
    <div>${sized(load('rago-wordmark-white.svg'), 360, Math.round(360 * 180 / 1124))}</div>
    <div style="max-width:590px">
      <div style="font-size:70px;font-weight:700;letter-spacing:-.04em;line-height:1">Every millisecond <span style="color:#FF3B30">counts.</span></div>
      <div style="margin-top:26px;font-size:26px;color:#A1A1AA;line-height:1.38;white-space:nowrap">The Windows optimizer for Minecraft PvP.<br>Less input lag, smoother frames, steadier ping.</div>
    </div>
    <div style="display:flex;gap:12px;${mono};font-size:22px">
      <span style="padding:11px 20px;border-radius:999px;background:#FF3B30;color:#0A0A0B;font-weight:600">${TOTAL} tweaks</span>
      <span style="padding:11px 20px;border-radius:999px;border:1px solid rgba(255,255,255,.16);color:#F5F5F6">Free to start</span>
    </div>
    <div style="position:absolute;right:60px;top:118px;width:450px;box-sizing:border-box;border-radius:32px;background:#111113;border:1px solid rgba(255,255,255,.10);box-shadow:0 40px 80px -20px rgba(0,0,0,.8);padding:24px;display:flex;flex-direction:column;gap:10px">
      <div style="${mono};font-size:13px;letter-spacing:.12em;color:#7C7C86;display:flex;align-items:center;gap:10px;padding:2px 4px 6px">3 TWEAKS SELECTED<i style="width:8px;height:8px;border-radius:999px;background:#FF3B30"></i></div>
      ${row('Disable mouse acceleration', 'LATENCY')}${row('Disable Game DVR', 'WINDOWS')}${row('Disable NIC power saving', 'NETWORK')}
      <div style="margin-top:8px;height:58px;border-radius:999px;background:#FF3B30;color:#0A0A0B;font-weight:600;font-size:21px;display:flex;align-items:center;justify-content:center">Apply 3 tweaks</div>
    </div></div>`],
  // Image de partage du compte à rebours (netlify/edge-functions/launch-gate/) : rien sur le produit au-delà du nom, comme la page.
  ['web/og-launch.png', 1200, 630, `<div style="width:1200px;height:630px;box-sizing:border-box;background:radial-gradient(60% 75% at 50% -10%,rgba(255,59,48,.22),transparent 65%),#0A0A0B;${font};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden">
    <div style="position:relative;width:120px;height:132px;margin-bottom:84px">${ring(200, .5)}${ring(250, .26)}${ring(300, .12)}<div style="position:relative">${markInline(132)}</div></div>
    <div style="font-size:76px;font-weight:700;letter-spacing:-.04em;line-height:1">Rago Optimizer</div>
    <div style="margin-top:22px;font-size:34px;color:#A1A1AA;letter-spacing:-.01em">Every millisecond <span style="color:#FF3B30">counts.</span></div>
  </div>`],
];
// node tools/export-logo.js og-image og-launch : seulement les fichiers dont le nom contient un des mots donnés
const only = process.argv.slice(2);
const want = (out) => !only.length || only.some((o) => out.includes(o));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ['--disable-lcd-text', '--font-render-hinting=none'] });
  const p = await b.newPage();
  for (const j of jobs.filter((j) => want(j.out))) {
    await p.setViewportSize({ width: j.w, height: j.h });
    await p.setContent(`<html><body style="margin:0;background:transparent">${sized(load(j.src), j.w, j.h)}</body></html>`);
    await p.screenshot({ path: D + j.out, omitBackground: true, clip: { x: 0, y: 0, width: j.w, height: j.h } });
  }
  for (const [out, w, h, body] of html.filter(([out]) => want(out))) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><head><style>${FACES}</style></head><body style="margin:0">${body}</body></html>`);
    await p.evaluate(async () => { await document.fonts.load('700 20px Geist'); await document.fonts.load('400 20px Geist'); await document.fonts.load('500 20px "Geist Mono"'); await document.fonts.ready; });
    const ok = await p.evaluate(() => document.fonts.check('700 20px Geist') && document.fonts.check('500 20px "Geist Mono"'));
    if (!ok) throw new Error('Geist non chargé pour ' + out);
    await p.screenshot({ path: D + out, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await b.close();
})();
