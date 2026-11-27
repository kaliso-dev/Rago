// Éclats rouges façon affiche (MSI, VCT) : <div data-shards="n" data-ox="0.8" data-oy="0.3" data-seed="3"></div>
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
document.querySelectorAll('[data-shards]').forEach(el => {
  const n = +el.dataset.shards, r = rng(+(el.dataset.seed || 7));
  const W = el.clientWidth, H = el.clientHeight;
  const ox = W * +(el.dataset.ox || .5), oy = H * +(el.dataset.oy || .5);
  const spread = +(el.dataset.spread || 1);
  let h = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;overflow:visible"><defs>
  <linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#5E0810"/><stop offset=".45" stop-color="#FF3B30"/><stop offset="1" stop-color="#FF8A6A"/></linearGradient>
  <filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#gl)">`;
  for (let i = 0; i < n; i++) {
    // angles autour de la jambe du R (48°) et de son opposé
    const dir = +(el.dataset.dir || 180), base = dir + (r() - .5) * 2 * (+(el.dataset.fan || 40));
    const a = base * Math.PI / 180, len = (.25 + r() * .75) * W * +(el.dataset.len || .7);
    const start = r() * 60, w = 2 + r() * +(el.dataset.w || 12);
    const pts = [], steps = 6;
    const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    for (let k = 0; k <= steps; k++) { const t = k / steps, d = start + len * t, ww = w * (1 - t) * (.6 + r() * .8); pts.push([ox + ux * d + px * ww, oy + uy * d + py * ww]); }
    for (let k = steps; k >= 0; k--) { const t = k / steps, d = start + len * t + (r() - .5) * 18, ww = w * (1 - t) * (.3 + r() * .6); pts.push([ox + ux * d - px * ww, oy + uy * d - py * ww]); }
    const op = (.55 + r() * .45).toFixed(2);
    h += `<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${r() < .12 ? '#D8D5D0' : 'url(#sg)'}" opacity="${op}" transform="rotate(0)"/>`;
  }
  el.insertAdjacentHTML('beforeend', h + '</g></svg>');
});
