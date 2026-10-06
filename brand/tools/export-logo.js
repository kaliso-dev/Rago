// Exporte toutes les déclinaisons raster depuis les SVG de brand/logo/ (SVG injecté inline : pas de file:// qui rend une image cassée).
// Usage : NODE_PATH=/opt/node22/lib/node_modules node brand/tools/export-logo.js   (puis ImageMagick construit les .ico et .bmp, voir README)
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
const font = "font-family:Geist,'Segoe UI',Arial,sans-serif;color:#F5F5F6";
const html = [
  ['installer/sidebar.png', 164, 314, `<div style="width:164px;height:314px;background:radial-gradient(120% 60% at 85% 0%,rgba(255,59,48,.26),transparent 60%),#0A0A0B;${font};position:relative;overflow:hidden">
    <div style="position:absolute;left:22px;top:30px">${markInline(48)}</div>
    <div style="position:absolute;left:22px;top:98px;font-size:20px;font-weight:700;letter-spacing:-.02em;line-height:1.1">Rago<br><span style="font-weight:400">Optimizer</span></div>
    <div style="position:absolute;left:22px;bottom:28px;font-size:11px;color:#A1A1AA">Every millisecond counts.</div></div>`],
  ['installer/header.png', 150, 57, `<div style="width:150px;height:57px;background:#FFFFFF;display:flex;align-items:center;justify-content:flex-end;padding-right:14px;box-sizing:border-box">
    <div style="width:36px;height:36px;border-radius:10px;background:#0A0A0B;display:flex;align-items:center;justify-content:center">${markInline(22)}</div></div>`],
  ['web/og-image.png', 1200, 630, `<div style="width:1200px;height:630px;background:radial-gradient(70% 70% at 85% 0%,rgba(255,59,48,.22),transparent 60%),#0A0A0B;display:flex;align-items:center;justify-content:center">${sized(load('rago-wordmark-white.svg'), 780, Math.round(780 * 180 / 1124))}</div>`],
];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
  const p = await b.newPage();
  for (const j of jobs) {
    await p.setViewportSize({ width: j.w, height: j.h });
    await p.setContent(`<html><body style="margin:0;background:transparent">${sized(load(j.src), j.w, j.h)}</body></html>`);
    await p.screenshot({ path: D + j.out, omitBackground: true, clip: { x: 0, y: 0, width: j.w, height: j.h } });
  }
  for (const [out, w, h, body] of html) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;700&display=swap" rel="stylesheet"></head><body style="margin:0">${body}</body></html>`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: D + out, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await b.close();
})();
