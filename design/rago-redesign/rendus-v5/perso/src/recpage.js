// node recpage.js <page> <hash> <outDir> <x,y,w,h> [fps] [dpr] [stills] : maquette de l'app (rendus-v5/src) qui expose __seq
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [,, name, hash, out, clip, fps = '60', dpr = '1.5', still = ''] = process.argv;
let [x, y, width, height] = clip.startsWith('.') ? [] : clip.split(',').map(Number);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: +(process.env.VH || 900) }, deviceScaleFactor: +dpr });
  pg.on('pageerror', e => console.log('pageerror', e.message));
  await pg.goto(`file:///mnt/project-files/rago-redesign/rendus-v5/src/${name}.html#${hash}`, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(400);
  if (clip.startsWith('.')) { const r = await pg.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }, clip); const pad = 24; [x, y, width, height] = [Math.round(r[0] - pad), Math.round(r[1] - pad), Math.round(r[2] + 2 * pad), Math.round(r[3] + 2 * pad)]; console.log('clip', x, y, width, height); }
  const D = await pg.evaluate(() => { __seq.seek(0); return __seq.duration; }); fs.mkdirSync(out, { recursive: true });
  const shot = async (t, file) => { await pg.evaluate(t => __seq.seek(t), t); await pg.screenshot({ path: path.join(out, file), clip: { x, y, width, height } }); };
  if (still) for (const t of still.split(',')) await shot(+t, `s${t}.png`);
  else { const n = Math.round(D / 1000 * +fps); for (let i = 0; i <= n; i++) await shot(i * 1000 / +fps, `f${String(i).padStart(5, '0')}.png`); console.log('frames', n + 1); }
  await b.close();
})();
