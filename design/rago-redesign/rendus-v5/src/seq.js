// Petits outils de timeline : chaque maquette animée expose window.__seq = {duration, seek(t)} et calcule son état à l'instant t.
window.E = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const k = (t, a, b) => clamp((t - a) / (b - a));
  const bez = (x1, y1, x2, y2) => { const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 10; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; t = clamp(t); } return Y(t); }; };
  const out = bez(.16, 1, .3, 1), outQ = bez(.25, .8, .35, 1), inOut = bez(.45, 0, .2, 1), slam = bez(.55, 0, .9, .45);
  const shake = (t, a, dur, amp) => { const x = (t - a) / dur; return x < 0 || x > 1 ? 0 : Math.sin(x * Math.PI * 5) * amp * (1 - x); };
  const lerp = (a, b, x) => a + (b - a) * x;
  return { clamp, k, bez, out, outQ, inOut, slam, shake, lerp };
})();
