// Rago — le Cerveau (/admin/cerveau), 2026-11-10. Draws the vault as a living graph (force simulation with a
// Barnes-Hut tree, canvas 2D, eased camera, pulses that travel along the links) and reads any note or file of the
// repository. Data: /admin/cerveau/donnees.json (brain.js). No library, strict CSP: no inline style, no eval.
(() => {
  'use strict';
  const root = document.getElementById('cv');
  if (!root) return;

  // ---------- small helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const base = (p) => p.slice(p.lastIndexOf('/') + 1);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = () => matchMedia('(max-width: 900px)').matches;
  const fmtNum = (n) => new Intl.NumberFormat('fr-FR').format(n);
  const fmtSize = (b) => (b < 1024 ? `${b} o` : b < 1048576 ? `${(b / 1024).toFixed(b < 10240 ? 1 : 0).replace('.', ',')} Ko` : `${(b / 1048576).toFixed(1).replace('.', ',')} Mo`);
  function ago(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 45) return 'à l’instant';
    if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
    return `il y a ${Math.round(s / 86400)} j`;
  }
  let toastTimer = 0;
  function toast(text) {
    let t = $('.cv-toast');
    if (!t) { t = document.createElement('div'); t.className = 'cv-toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 3200);
  }

  // ---------- preferences (this browser only) ----------
  const PREF_KEY = 'rago.cerveau.v1';
  const DEFAULTS = {
    opts: { code: false, tags: false, ghosts: true, orphans: true, labels: true, influx: !reduceMotion },
    forces: { center: 0.5, repel: 1, link: 1, dist: 1 },
    hidden: [], open: {}, rw: 0, tab: 'files', depth: 1, local: false,
  };
  const prefs = (() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      return { ...DEFAULTS, ...p, opts: { ...DEFAULTS.opts, ...p.opts }, forces: { ...DEFAULTS.forces, ...p.forces }, open: { ...p.open } };
    } catch { return structuredClone(DEFAULTS); }
  })();
  let saveTimer = 0;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* private window */ } }, 250); };

  // ---------- colours ----------
  const GROUPS = {
    '': ['Pilotage', '#FF5E55'], Technique: ['Technique', '#5AB8FF'], 'Fonctionnalités': ['Fonctionnalités', '#3DDC97'],
    Code: ['Code', '#2DD4BF'], Tweaks: ['Tweaks', '#B69CFF'], Versions: ['Versions', '#FF8A82'], Marketing: ['Marketing', '#FFD60A'],
    Design: ['Design', '#F0A6CA'], Suivi: ['Suivi', '#A1A1AA'], Projets: ['Projets', '#F5F5F6'], Historique: ['Historique', '#E879F9'],
  };
  const FILE_COLORS = { app: '#2a9d8f', licensing: '#3b82c4', site: '#c99a2e', proxy: '#9b6fd6', docs: '#6b7280', brand: '#c76b8f', '.github': '#6b7280', netlify: '#c99a2e' };
  function hashColor(s) {
    let h = 0;
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `hsl(${h % 360} 62% 66%)`;
  }
  const groupName = (g) => (GROUPS[g] ? GROUPS[g][0] : g);
  const groupColor = (g) => (GROUPS[g] ? GROUPS[g][1] : hashColor(g));
  const fileColor = (p) => FILE_COLORS[p.split('/')[0]] || '#5f6b7a';

  // ---------- data ----------
  const SRC = root.dataset.src;
  const FILE_SRC = root.dataset.file;
  let D = null; // what /donnees.json returned
  let etag = '';
  let staleError = '';
  const notesById = new Map();
  const filesByPath = new Map();
  const backlinks = new Map(); // note id -> [ids that link to it]
  const citedBy = new Map(); // file path -> [note ids]

  async function fetchData(fresh) {
    const res = await fetch(`${SRC}${fresh ? '?frais=1' : ''}`, { credentials: 'same-origin', cache: fresh ? 'no-cache' : 'default', headers: { accept: 'application/json' } });
    if (res.redirected || !(res.headers.get('content-type') || '').includes('json')) throw Object.assign(new Error('Ta session admin a expiré : reconnecte-toi.'), { login: true });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
    staleError = decodeURIComponent(res.headers.get('x-cerveau-erreur') || '');
    return { data: body, etag: res.headers.get('etag') || String(body.sha) + body.at };
  }

  function index(data) {
    notesById.clear(); filesByPath.clear(); backlinks.clear(); citedBy.clear();
    for (const n of data.notes) notesById.set(n.id, n);
    for (const f of data.files) filesByPath.set(f.p, f);
    for (const n of data.notes) {
      for (const t of n.out) { if (!backlinks.has(t)) backlinks.set(t, []); backlinks.get(t).push(n.id); }
      for (const p of n.code) { if (!citedBy.has(p)) citedBy.set(p, []); citedBy.get(p).push(n.id); }
    }
  }

  // ---------- graph model ----------
  const G = { nodes: [], links: [], byKey: new Map(), vis: [], vlinks: [] };
  let selected = null;
  let hover = null;
  let focusSet = new Set();

  function buildGraph(data, previous) {
    const nodes = [];
    const links = [];
    const byKey = new Map();
    const pairs = new Set();
    const add = (key, kind, props) => {
      let n = byKey.get(key);
      if (n) return n;
      const old = previous?.get(key);
      n = { key, kind, x: old ? old.x : NaN, y: old ? old.y : NaN, vx: 0, vy: 0, fx: null, fy: null, a: old ? old.a : 0, hl: 1, la: 0, hs: 1,
        deg: 0, ndeg: 0, adj: [], vis: false, match: true, ...props };
      byKey.set(key, n);
      nodes.push(n);
      return n;
    };
    const link = (a, b, kind) => {
      if (!a || !b || a === b) return;
      const k = a.key < b.key ? `${a.key}|${b.key}` : `${b.key}|${a.key}`;
      if (pairs.has(k)) return;
      pairs.add(k);
      const l = { s: a, t: b, kind, a: 0, vis: false, str: 1, bias: 0.5 };
      links.push(l);
      a.adj.push(l); b.adj.push(l);
      if (kind === 'note') { a.ndeg++; b.ndeg++; }
      a.deg++; b.deg++;
    };
    for (const n of data.notes) add(`n:${n.id}`, 'note', { id: n.id, label: n.t, group: n.g, note: n });
    for (const n of data.notes) {
      const from = byKey.get(`n:${n.id}`);
      for (const t of n.out) link(from, byKey.get(`n:${t}`), 'note');
      for (const p of n.code) {
        if (p.startsWith('docs/vault/')) continue;
        link(from, add(`f:${p}`, 'file', { path: p, label: base(p), group: '@file' }), 'code');
      }
      for (const t of n.tags) link(from, add(`t:${t}`, 'tag', { label: `#${t}`, group: '@tag' }), 'tag');
    }
    for (const g of data.ghosts) {
      const ghost = add(`g:${g.name}`, 'ghost', { label: g.name, group: '@ghost' });
      for (const f of g.from) link(byKey.get(`n:${f}`), ghost, 'ghost');
    }
    for (const n of nodes) {
      n.color = n.kind === 'note' ? groupColor(n.group) : n.kind === 'file' ? fileColor(n.path) : n.kind === 'tag' ? '#8b8b96' : '#55555e';
      n.r = n.kind === 'note' ? Math.min(19, 3.4 + Math.sqrt(n.ndeg) * 1.35) : n.kind === 'file' ? 2.8 : n.kind === 'tag' ? 3.2 : 2.6;
      n.q = n.kind === 'note' ? 1 + Math.min(n.ndeg, 40) * 0.035 : 0.45;
    }
    G.nodes = nodes; G.links = links; G.byKey = byKey;
    if (selected) selected = byKey.get(selected.key) || null;
    if (hover) hover = byKey.get(hover.key) || null;
    placeNew();
  }

  // New nodes start next to a placed neighbour, or on a spiral split by group so the first layout settles fast.
  function placeNew() {
    const groups = [...new Set(G.nodes.map((n) => n.group))];
    const placed = G.nodes.filter((n) => Number.isFinite(n.x));
    const fresh = G.nodes.filter((n) => !Number.isFinite(n.x));
    const firstTime = !placed.length;
    fresh.forEach((n, i) => {
      const nb = n.adj.map((l) => (l.s === n ? l.t : l.s)).find((m) => Number.isFinite(m.x));
      if (nb && !firstTime) {
        const a = Math.random() * Math.PI * 2;
        n.x = nb.x + Math.cos(a) * 30; n.y = nb.y + Math.sin(a) * 30;
        return;
      }
      const gi = groups.indexOf(n.group);
      const sector = (gi / Math.max(1, groups.length)) * Math.PI * 2;
      const r = 14 * Math.sqrt(i + 1);
      const a = sector + i * 2.39996;
      n.x = Math.cos(a) * r * 0.6 + Math.cos(sector) * 60;
      n.y = Math.sin(a) * r * 0.6 + Math.sin(sector) * 60;
    });
  }

  function computeVisible() {
    const o = prefs.opts;
    const hidden = new Set(prefs.hidden);
    for (const n of G.nodes) n.base = n.kind === 'note' ? !hidden.has(n.group) : n.kind === 'file' ? o.code : n.kind === 'tag' ? o.tags : o.ghosts;
    // A file, tag or broken link only shows next to a note that shows.
    for (const n of G.nodes) if (n.kind !== 'note' && n.base) n.base = n.adj.some((l) => (l.s === n ? l.t : l.s).base && (l.s === n ? l.t : l.s).kind === 'note');
    if (!o.orphans) for (const n of G.nodes) if (n.kind === 'note' && n.base) n.base = n.adj.some((l) => (l.s === n ? l.t : l.s).base);
    let keep = null;
    if (prefs.local && selected && selected.base) {
      keep = new Set([selected]);
      let ring = [selected];
      for (let d = 0; d < prefs.depth; d++) {
        const next = [];
        for (const n of ring) for (const l of n.adj) {
          const m = l.s === n ? l.t : l.s;
          if (m.base && !keep.has(m)) { keep.add(m); next.push(m); }
        }
        ring = next;
      }
    }
    G.vis = [];
    for (const n of G.nodes) { n.vis = n.base && (!keep || keep.has(n)); if (n.vis) G.vis.push(n); n.vdeg = 0; }
    G.vlinks = [];
    for (const l of G.links) { l.vis = l.s.vis && l.t.vis; if (l.vis) { G.vlinks.push(l); l.s.vdeg++; l.t.vdeg++; } }
    for (const l of G.vlinks) {
      l.str = 1 / Math.min(l.s.vdeg, l.t.vdeg);
      l.bias = l.s.vdeg / (l.s.vdeg + l.t.vdeg);
      l.len = l.kind === 'note' ? 1 : 0.55;
    }
    updateFocus();
    reheat(0.6);
    renderStats();
  }

  // ---------- simulation (d3-force's model: links, many-body with Barnes-Hut, centring, collisions) ----------
  const sim = { alpha: 1, target: 0, decay: 1 - Math.pow(0.001, 1 / 320), min: 0.004, vdecay: 0.4 };
  const reheat = (a = 0.5) => { sim.alpha = Math.max(sim.alpha, a); wake(); };

  function tick() {
    sim.alpha += (sim.target - sim.alpha) * sim.decay;
    const A = sim.alpha;
    const F = prefs.forces;
    const nodes = G.vis;
    if (!nodes.length) return;
    const L = 52 * F.dist;
    for (const l of G.vlinks) {
      const s = l.s; const t = l.t;
      let dx = t.x + t.vx - s.x - s.vx;
      let dy = t.y + t.vy - s.y - s.vy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-3;
      const k = ((d - L * l.len) / d) * A * F.link * l.str;
      dx *= k; dy *= k;
      t.vx -= dx * l.bias; t.vy -= dy * l.bias;
      s.vx += dx * (1 - l.bias); s.vy += dy * (1 - l.bias);
    }
    manyBody(nodes, A, -34 * F.repel);
    const cs = 0.03 * F.center * A;
    for (const n of nodes) { n.vx -= n.x * cs; n.vy -= n.y * cs; }
    collide(nodes);
    const keep = 1 - sim.vdecay;
    for (const n of nodes) {
      if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = 0; n.vy = 0; continue; }
      n.vx *= keep; n.vy *= keep;
      n.x += n.vx; n.y += n.vy;
    }
  }

  function cell(x, y, s) { return { x, y, s, kids: null, pts: [], m: 0, cx: 0, cy: 0 }; }
  function insert(c, n, depth) {
    for (;;) {
      if (!c.kids) {
        if (!c.pts.length || depth > 22) { c.pts.push(n); return; }
        const old = c.pts;
        c.pts = [];
        c.kids = [null, null, null, null];
        for (const o of old) insert(kidFor(c, o), o, depth + 1);
      }
      c = kidFor(c, n);
      depth++;
    }
  }
  function kidFor(c, n) {
    const h = c.s / 2;
    const i = (n.x >= c.x + h ? 1 : 0) | (n.y >= c.y + h ? 2 : 0);
    return c.kids[i] || (c.kids[i] = cell(c.x + (i & 1 ? h : 0), c.y + (i & 2 ? h : 0), h));
  }
  function mass(c, strength) {
    let m = 0; let wx = 0; let wy = 0; let w = 0;
    if (c.kids) {
      for (const k of c.kids) if (k) { mass(k, strength); m += k.m; const a = Math.abs(k.m); wx += k.cx * a; wy += k.cy * a; w += a; }
    } else {
      for (const p of c.pts) { const q = strength * p.q; m += q; const a = Math.abs(q); wx += p.x * a; wy += p.y * a; w += a; }
    }
    c.m = m; c.cx = w ? wx / w : c.x; c.cy = w ? wy / w : c.y;
  }
  function manyBody(nodes, alpha, strength) {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const n of nodes) { if (n.x < x0) x0 = n.x; if (n.y < y0) y0 = n.y; if (n.x > x1) x1 = n.x; if (n.y > y1) y1 = n.y; }
    const rootCell = cell(x0, y0, Math.max(x1 - x0, y1 - y0) + 1);
    for (const n of nodes) insert(rootCell, n, 0);
    mass(rootCell, strength);
    const theta2 = 0.81;
    const stack = [];
    for (const n of nodes) {
      stack.length = 0;
      stack.push(rootCell);
      while (stack.length) {
        const c = stack.pop();
        if (!c.m) continue;
        const dx = c.cx - n.x; const dy = c.cy - n.y;
        let l = dx * dx + dy * dy;
        if (c.kids) {
          if ((c.s * c.s) / theta2 < l) {
            if (l < 1) l = Math.sqrt(l);
            const f = (c.m * alpha) / l;
            n.vx += dx * f; n.vy += dy * f;
          } else for (const k of c.kids) if (k) stack.push(k);
          continue;
        }
        for (const p of c.pts) {
          if (p === n) continue;
          let px = p.x - n.x; let py = p.y - n.y;
          let pl = px * px + py * py;
          if (pl === 0) { px = (Math.random() - 0.5) * 1e-2; py = (Math.random() - 0.5) * 1e-2; pl = px * px + py * py; }
          if (pl < 1) pl = Math.sqrt(pl);
          const f = (strength * p.q * alpha) / pl;
          n.vx += px * f; n.vy += py * f;
        }
      }
    }
  }
  function collide(nodes) {
    const size = 44;
    const grid = new Map();
    for (const n of nodes) {
      const k = (Math.floor(n.x / size) + 32768) * 65536 + (Math.floor(n.y / size) + 32768);
      const b = grid.get(k);
      if (b) b.push(n); else grid.set(k, [n]);
    }
    for (const n of nodes) {
      const gx = Math.floor(n.x / size); const gy = Math.floor(n.y / size);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const b = grid.get((gx + i + 32768) * 65536 + (gy + j + 32768));
        if (!b) continue;
        for (const m of b) {
          if (m === n || m.key < n.key) continue;
          const dx = m.x - n.x; const dy = m.y - n.y;
          const rr = n.r + m.r + 4;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          const d = Math.sqrt(d2);
          const f = ((rr - d) / d) * 0.35;
          n.vx -= dx * f; n.vy -= dy * f; m.vx += dx * f; m.vy += dy * f;
        }
      }
    }
  }

  // ---------- canvas and camera ----------
  const stage = $('#cv-stage');
  const cvs = $('#cv-canvas');
  const ctx = cvs.getContext('2d');
  let W = 0; let H = 0; let DPR = 1;
  const cam = { x: 0, y: 0, k: 0.6, ox: 0 };
  const tgt = { x: 0, y: 0, k: 0.6, ox: 0 };
  const inertia = { x: 0, y: 0 };
  let autoFitUntil = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cvs.width = Math.max(1, Math.round(W * DPR));
    cvs.height = Math.max(1, Math.round(H * DPR));
    tgt.ox = viewOffset();
    wake();
  }
  new ResizeObserver(resize).observe(stage);

  const reader = $('#cv-reader');
  const readerOpen = () => !reader.hidden;
  // When the reader covers the right of the graph, the graph's centre moves into the part still visible.
  function viewOffset() {
    if (!readerOpen() || narrow() || reader.classList.contains('wide')) return 0;
    return -Math.min(reader.getBoundingClientRect().width, W * 0.7) / 2;
  }
  const toWorld = (sx, sy) => ({ x: (sx - W / 2 - cam.ox) / cam.k + cam.x, y: (sy - H / 2) / cam.k + cam.y });
  const toScreen = (x, y) => ({ x: (x - cam.x) * cam.k + W / 2 + cam.ox, y: (y - cam.y) * cam.k + H / 2 });

  function zoomAt(sx, sy, k) {
    k = clamp(k, 0.06, 7);
    const wx = (sx - W / 2 - tgt.ox) / tgt.k + tgt.x;
    const wy = (sy - H / 2) / tgt.k + tgt.y;
    tgt.x = wx - (sx - W / 2 - tgt.ox) / k;
    tgt.y = wy - (sy - H / 2) / k;
    tgt.k = k;
    wake();
  }
  function bounds(nodes) {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const n of nodes) { if (n.x - n.r < x0) x0 = n.x - n.r; if (n.y - n.r < y0) y0 = n.y - n.r; if (n.x + n.r > x1) x1 = n.x + n.r; if (n.y + n.r > y1) y1 = n.y + n.r; }
    return { x0, y0, x1, y1 };
  }
  function fit(nodes = G.vis, { maxK = 1.6 } = {}) {
    if (!nodes.length) return;
    const b = bounds(nodes);
    const visW = W + 2 * Math.min(0, tgt.ox);
    const pad = narrow() ? 40 : 80;
    tgt.k = clamp(Math.min((visW - pad) / Math.max(40, b.x1 - b.x0), (H - pad - 40) / Math.max(40, b.y1 - b.y0)), 0.06, maxK);
    tgt.x = (b.x0 + b.x1) / 2;
    tgt.y = (b.y0 + b.y1) / 2 - 10 / tgt.k;
    wake();
  }
  function centerOn(n, k) {
    if (!n) return;
    tgt.x = n.x; tgt.y = n.y;
    if (k) tgt.k = k;
    wake();
  }
  function inView(n, margin = 60) {
    const p = toScreen(n.x, n.y);
    const right = W + 2 * Math.min(0, tgt.ox);
    return p.x > margin && p.x < right - margin && p.y > margin && p.y < H - margin;
  }

  // ---------- animation loop ----------
  let running = false;
  let last = 0;
  let idleFrames = 0;
  const parts = [];
  let emitFocus = 0;
  let emitAmbient = 0;
  function wake() {
    idleFrames = 0;
    if (running || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  function frame(now) {
    const dt = Math.min(64, now - last || 16);
    last = now;
    let busy = false;
    if (sim.alpha > sim.min || sim.target > 0) { tick(); busy = true; }
    if (autoFitUntil && now < autoFitUntil) fit(); else autoFitUntil = 0;
    busy = stepCamera(dt) || busy;
    busy = stepAnim(dt) || busy;
    busy = stepParticles(dt) || busy;
    draw(now);
    if (busy || prefs.opts.influx) idleFrames = 0; else idleFrames++;
    if (idleFrames > 30 || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
  }

  function stepCamera(dt) {
    const e = reduceMotion ? 1 : 1 - Math.exp(-dt / 105);
    if (inertia.x || inertia.y) {
      tgt.x += (inertia.x * dt) / cam.k; tgt.y += (inertia.y * dt) / cam.k;
      cam.x += (inertia.x * dt) / cam.k; cam.y += (inertia.y * dt) / cam.k;
      const decay = Math.pow(0.9, dt / 16);
      inertia.x *= decay; inertia.y *= decay;
      if (Math.abs(inertia.x) < 0.01 && Math.abs(inertia.y) < 0.01) { inertia.x = 0; inertia.y = 0; }
    }
    const dx = tgt.x - cam.x; const dy = tgt.y - cam.y; const dk = Math.log(tgt.k / cam.k); const dox = tgt.ox - cam.ox;
    cam.x += dx * e; cam.y += dy * e; cam.k *= Math.exp(dk * e); cam.ox += dox * e;
    return Math.abs(dx) * cam.k > 0.2 || Math.abs(dy) * cam.k > 0.2 || Math.abs(dk) > 0.001 || Math.abs(dox) > 0.3 || !!(inertia.x || inertia.y);
  }

  // How much a label wants to show (zoom, focus); draw() then keeps only the ones that have room (n.room).
  function labelWant(n) {
    if (n === hover || n === selected) return 1;
    if (hover && focusSet.has(n)) return 1;
    if (filterQ && n.match) return 1;
    if (!prefs.opts.labels) return 0;
    if (n.kind !== 'note' && cam.k < 1.4) return 0;
    return clamp((n.r * cam.k - 3.4) / 2.6, 0, 1);
  }
  function labelTarget(n) {
    if (n === hover || n === selected) return 1;
    return n.room ? labelWant(n) : 0;
  }
  function stepAnim(dt) {
    const ea = reduceMotion ? 1 : 1 - Math.exp(-dt / 170);
    const eh = reduceMotion ? 1 : 1 - Math.exp(-dt / 120);
    let moving = false;
    for (const n of G.nodes) {
      const ta = n.vis ? 1 : 0;
      if (n.a !== ta) { n.a += (ta - n.a) * ea; if (Math.abs(ta - n.a) < 0.004) n.a = ta; moving = true; }
      const th = hover ? (focusSet.has(n) ? 1 : 0.13) : filterQ ? (n.match ? 1 : 0.12) : 1;
      if (n.hl !== th) { n.hl += (th - n.hl) * eh; if (Math.abs(th - n.hl) < 0.004) n.hl = th; moving = true; }
      const tl = n.a > 0.05 ? labelTarget(n) : 0;
      if (n.la !== tl) { n.la += (tl - n.la) * eh; if (Math.abs(tl - n.la) < 0.01) n.la = tl; moving = true; }
      const ts = n === hover ? 1.35 : 1;
      if (n.hs !== ts) { n.hs += (ts - n.hs) * eh; if (Math.abs(ts - n.hs) < 0.004) n.hs = ts; moving = true; }
    }
    for (const l of G.links) {
      const ta = l.vis ? 1 : 0;
      if (l.a !== ta) { l.a += (ta - l.a) * ea; if (Math.abs(ta - l.a) < 0.004) l.a = ta; moving = true; }
    }
    return moving;
  }

  // Pulses ("l'influx") travel from the node in focus along its links, and now and then along any link.
  function emit(l, from, strength) {
    if (parts.length > 140) return;
    parts.push({ l, dir: l.s === from ? 1 : -1, t: 0, dur: 520 + Math.random() * 520, col: from.color, a: strength });
  }
  function stepParticles(dt) {
    const focus = hover || selected;
    if (prefs.opts.influx && !reduceMotion) {
      if (focus && focus.vis) {
        emitFocus += dt;
        const live = focus.adj.filter((l) => l.vis);
        while (emitFocus > 70 && live.length) { emitFocus -= 70; if (Math.random() < 0.55) emit(live[(Math.random() * live.length) | 0], focus, hover ? 1 : 0.85); }
        if (!live.length) emitFocus = 0;
      }
      emitAmbient += dt;
      while (emitAmbient > 110) {
        emitAmbient -= 110;
        if (G.vlinks.length && parts.length < 70) {
          const l = G.vlinks[(Math.random() * G.vlinks.length) | 0];
          emit(l, Math.random() < 0.5 ? l.s : l.t, 0.42);
        }
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt / p.dur;
      if (p.t >= 1 || !p.l.vis) parts.splice(i, 1);
    }
    return parts.length > 0;
  }

  // Soft glow, drawn once per colour and stamped under nodes in focus.
  const glows = new Map();
  function glow(color) {
    let g = glows.get(color);
    if (g) return g;
    g = document.createElement('canvas');
    g.width = g.height = 64;
    const c = g.getContext('2d');
    const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, color);
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = 0.55;
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
    glows.set(color, g);
    return g;
  }

  const EDGE = '#c4c4d0';
  const buckets = Array.from({ length: 21 }, () => []);
  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!G.nodes.length) return;
    const k = cam.k;
    const ox = W / 2 + cam.ox - cam.x * k;
    const oy = H / 2 - cam.y * k;
    const wx0 = -ox / k - 40; const wy0 = -oy / k - 40; const wx1 = (W - ox) / k + 40; const wy1 = (H - oy) / k + 40;
    const seen = (n) => n.x > wx0 && n.x < wx1 && n.y > wy0 && n.y < wy1;
    ctx.setTransform(DPR * k, 0, 0, DPR * k, DPR * ox, DPR * oy);
    const focus = hover || selected;

    // links, grouped by opacity so most of them go in a handful of strokes
    for (const b of buckets) b.length = 0;
    const edgeBase = clamp(0.1 + 0.08 / Math.max(0.35, k), 0.1, 0.26);
    for (const l of G.links) {
      if (l.a < 0.01 || (focus && (l.s === focus || l.t === focus))) continue;
      if (!seen(l.s) && !seen(l.t)) continue;
      const al = l.a * edgeBase * Math.min(l.s.hl, l.t.hl) * (l.kind === 'note' ? 1 : 0.7);
      buckets[Math.min(20, Math.round(al * 40))].push(l);
    }
    ctx.lineWidth = 1 / k;
    ctx.strokeStyle = EDGE;
    for (let i = 1; i < buckets.length; i++) {
      const b = buckets[i];
      if (!b.length) continue;
      ctx.globalAlpha = i / 40;
      ctx.beginPath();
      for (const l of b) { ctx.moveTo(l.s.x, l.s.y); ctx.lineTo(l.t.x, l.t.y); }
      ctx.stroke();
    }
    if (focus && focus.a > 0.01) {
      ctx.lineWidth = 1.4 / k;
      ctx.strokeStyle = focus.color;
      for (const l of focus.adj) {
        if (l.a < 0.01) continue;
        ctx.globalAlpha = 0.62 * l.a * (hover ? 1 : 0.85);
        ctx.beginPath(); ctx.moveTo(l.s.x, l.s.y); ctx.lineTo(l.t.x, l.t.y); ctx.stroke();
      }
    }

    // pulses
    for (const p of parts) {
      const s = p.l.s; const t = p.l.t;
      const fade = Math.sin(Math.PI * p.t) * p.a * p.l.a * Math.min(s.hl, t.hl) ** 0.5;
      if (fade < 0.02) continue;
      ctx.fillStyle = p.col;
      for (let i = 0; i < 4; i++) {
        const tt = clamp(p.t - i * 0.05, 0, 1);
        const u = p.dir > 0 ? tt : 1 - tt;
        const x = s.x + (t.x - s.x) * u; const y = s.y + (t.y - s.y) * u;
        ctx.globalAlpha = fade * (1 - i / 4);
        ctx.beginPath(); ctx.arc(x, y, (2.1 - i * 0.38) / Math.sqrt(k), 0, Math.PI * 2); ctx.fill();
      }
    }

    // nodes
    for (const n of G.nodes) {
      if (n.a < 0.01 || !seen(n)) continue;
      const al = n.a * n.hl;
      const r = n.r * (0.35 + 0.65 * n.a) * n.hs;
      const lit = n === focus || (focus && focusSet.has(n) && hover);
      if (lit || n === selected) {
        const g = glow(n.color);
        const R = r * (n === focus ? 4.6 : 3.4);
        ctx.globalAlpha = al * (n === focus ? 0.9 : 0.5);
        ctx.drawImage(g, n.x - R, n.y - R, R * 2, R * 2);
      }
      ctx.globalAlpha = al;
      if (n.kind === 'ghost') {
        ctx.strokeStyle = '#7c7c86';
        ctx.lineWidth = 1.2 / k;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
        continue;
      }
      ctx.fillStyle = n.color;
      ctx.beginPath();
      if (n.kind === 'file') ctx.rect(n.x - r, n.y - r, r * 2, r * 2);
      else if (n.kind === 'tag') { ctx.moveTo(n.x, n.y - r * 1.2); ctx.lineTo(n.x + r * 1.2, n.y); ctx.lineTo(n.x, n.y + r * 1.2); ctx.lineTo(n.x - r * 1.2, n.y); ctx.closePath(); }
      else ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (selected && selected.a > 0.01) {
      const n = selected;
      const r = n.r * n.hs;
      ctx.globalAlpha = n.a;
      ctx.strokeStyle = '#F5F5F6';
      ctx.lineWidth = 1.6 / k;
      ctx.beginPath(); ctx.arc(n.x, n.y, r + 3.2 / k, 0, Math.PI * 2); ctx.stroke();
      if (!reduceMotion) {
        const ph = ((now % 2200) / 2200);
        ctx.globalAlpha = n.a * (1 - ph) * 0.55;
        ctx.strokeStyle = n.color;
        ctx.beginPath(); ctx.arc(n.x, n.y, r + (3 + ph * 22) / k, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // labels, in screen pixels so they stay sharp at any zoom. The most important first (focus, then the most linked
    // notes); a label that would cover one already placed waits, and fades out instead of piling up.
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = 'rgba(6,6,7,.9)';
    const cand = [];
    for (const n of G.nodes) {
      n.room = false;
      if (n.a < 0.05 || !seen(n)) continue;
      n.want = n.hl > 0.5 || n === selected ? labelWant(n) : 0;
      if (n.want > 0 || n.la > 0.02) cand.push(n);
    }
    cand.sort((a, b) => labelRank(b) - labelRank(a));
    placed.length = 0;
    for (const n of cand) {
      if (!n.text) { n.text = n.label.length > 38 ? `${n.label.slice(0, 36)}…` : n.label; n.tw = 0; }
      if (!n.tw) n.tw = ctx.measureText(n.text).width;
      const sx = n.x * k + ox; const sy = n.y * k + oy + n.r * n.hs * k + 4;
      if (n.want > 0) {
        const box = [sx - n.tw / 2 - 3, sy - 1, sx + n.tw / 2 + 3, sy + 15];
        let free = true;
        for (const b of placed) if (box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]) { free = false; break; }
        if (free || n === hover || n === selected) { n.room = true; placed.push(box); }
      }
      const al = n.la * n.a * Math.max(n.hl, n === selected ? 1 : 0);
      if (al < 0.03) continue;
      ctx.globalAlpha = al;
      ctx.strokeText(n.text, sx, sy);
      ctx.fillStyle = n === hover || n === selected ? '#FFFFFF' : n.kind === 'note' ? '#D4D4DA' : '#9a9aa4';
      ctx.fillText(n.text, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
  const LABEL_FONT = '500 11.5px Geist, "Segoe UI", system-ui, sans-serif';
  const placed = [];
  // Focus first, then labels already showing (so they don't flicker), then the biggest notes.
  const labelRank = (n) => (n === hover || n === selected ? 1e6 : 0) + (hover && focusSet.has(n) ? 1e5 : 0) + (filterQ && n.match ? 1e4 : 0)
    + (n.la > 0.5 ? 400 : 0) + (n.kind === 'note' ? 200 : 0) + n.r * 10 + (n.ndeg || 0) * 0.01;
  document.fonts?.ready.then(() => { for (const n of G.nodes) n.tw = 0; wake(); });

  // ---------- pointer: hover, drag, pan, zoom ----------
  const tip = $('#cv-tip');
  const pointers = new Map();
  let drag = null; // { node?, startX, startY, moved, lastX, lastY, lastT, vx, vy }
  let pinch = null;
  let lastTap = 0;

  function pick(sx, sy) {
    let best = null; let bestD = Infinity;
    for (const n of G.nodes) {
      if (n.a < 0.5) continue;
      const p = toScreen(n.x, n.y);
      const d = Math.hypot(p.x - sx, p.y - sy);
      const reach = Math.max(n.r * n.hs * cam.k, 5) + 4;
      if (d < reach && d - (n.kind === 'note' ? 2 : 0) < bestD) { best = n; bestD = d; }
    }
    return best;
  }
  function setHover(n, sx, sy) {
    if (n !== hover) {
      hover = n;
      updateFocus();
      cvs.classList.toggle('hover', !!n);
      wake();
    }
    if (n && sx != null && !narrow()) {
      tip.innerHTML = tipHtml(n);
      tip.hidden = false;
      const tw = tip.offsetWidth; const th = tip.offsetHeight;
      tip.style.left = `${Math.min(sx, W - tw - 24)}px`;
      tip.style.top = `${Math.min(sy, H - th - 24)}px`;
    } else tip.hidden = true;
  }
  function tipHtml(n) {
    if (n.kind === 'note') {
      const back = (backlinks.get(n.id) || []).length;
      return `<b>${esc(n.label)}</b><span>${esc(groupName(n.group))}${n.note.d && n.note.d !== n.group ? ` · ${esc(n.note.d)}` : ''}</span><p>${n.note.out.length} lien${n.note.out.length > 1 ? 's' : ''} · cité ${back} fois · ${fmtNum(n.note.w)} mots</p>`;
    }
    if (n.kind === 'file') { const f = filesByPath.get(n.path); return `<b>${esc(n.label)}</b><span>${esc(n.path)}</span><p>Fichier du dépôt${f ? ` · ${fmtSize(f.s)}` : ''} · cité par ${(citedBy.get(n.path) || []).length} note(s)</p>`; }
    if (n.kind === 'tag') return `<b>${esc(n.label)}</b><span>Tag</span>`;
    return `<b>${esc(n.label)}</b><span>Lien cassé</span><p>Note citée mais introuvable dans le vault.</p>`;
  }
  function updateFocus() {
    const f = hover || selected;
    focusSet = new Set();
    if (f) { focusSet.add(f); for (const l of f.adj) if (l.vis) focusSet.add(l.s === f ? l.t : l.s); }
  }

  cvs.addEventListener('pointerdown', (e) => {
    cvs.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    inertia.x = inertia.y = 0;
    autoFitUntil = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, k: tgt.k };
      if (drag?.node) { drag.node.fx = drag.node.fy = null; sim.target = 0; }
      drag = null;
      return;
    }
    const n = pick(e.offsetX, e.offsetY);
    drag = { node: n, startX: e.offsetX, startY: e.offsetY, lastX: e.offsetX, lastY: e.offsetY, lastT: performance.now(), vx: 0, vy: 0, moved: false };
    if (n) { n.fx = n.x; n.fy = n.y; }
    else cvs.classList.add('drag');
    tip.hidden = true;
  });
  cvs.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
      tgt.x -= (mx - pinch.mx) / tgt.k; tgt.y -= (my - pinch.my) / tgt.k;
      pinch.mx = mx; pinch.my = my;
      zoomAt(mx, my, (pinch.k * d) / pinch.d);
      cam.x = tgt.x; cam.y = tgt.y; cam.k = tgt.k;
      return;
    }
    if (!drag) {
      if (e.pointerType === 'mouse') setHover(pick(e.offsetX, e.offsetY), e.offsetX, e.offsetY);
      return;
    }
    const dx = e.offsetX - drag.lastX; const dy = e.offsetY - drag.lastY;
    if (Math.hypot(e.offsetX - drag.startX, e.offsetY - drag.startY) > 4) drag.moved = true;
    const t = performance.now();
    const dtm = Math.max(1, t - drag.lastT);
    drag.vx = drag.vx * 0.6 + (dx / dtm) * 0.4; drag.vy = drag.vy * 0.6 + (dy / dtm) * 0.4;
    drag.lastX = e.offsetX; drag.lastY = e.offsetY; drag.lastT = t;
    if (drag.node) {
      if (drag.moved) {
        const w = toWorld(e.offsetX, e.offsetY);
        drag.node.fx = w.x; drag.node.fy = w.y;
        sim.target = 0.28;
        reheat(0.28);
        if (hover !== drag.node) setHover(drag.node);
      }
    } else if (drag.moved) {
      cam.x -= dx / cam.k; cam.y -= dy / cam.k; tgt.x = cam.x; tgt.y = cam.y;
      wake();
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
    if (!drag) return;
    cvs.classList.remove('drag');
    const d = drag;
    drag = null;
    if (d.node) {
      d.node.fx = null; d.node.fy = null;
      sim.target = 0;
      if (!d.moved && e.type === 'pointerup') { openNode(d.node); if (e.pointerType !== 'mouse') setHover(null); }
    } else if (!d.moved && e.type === 'pointerup') {
      const t = performance.now();
      if (t - lastTap < 320) zoomAt(e.offsetX, e.offsetY, tgt.k * 1.8);
      lastTap = t;
      if (e.pointerType !== 'mouse') setHover(null);
    } else if (d.moved && !reduceMotion && performance.now() - d.lastT < 80) {
      inertia.x = -d.vx * 0.9; inertia.y = -d.vy * 0.9;
      wake();
    }
  };
  cvs.addEventListener('pointerup', endPointer);
  cvs.addEventListener('pointercancel', endPointer);
  cvs.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag) setHover(null); });
  cvs.addEventListener('wheel', (e) => {
    e.preventDefault();
    autoFitUntil = 0;
    const scale = e.deltaMode === 1 ? 0.05 : e.deltaMode === 2 ? 1 : e.ctrlKey ? 0.012 : 0.0018;
    zoomAt(e.offsetX, e.offsetY, tgt.k * Math.exp(-e.deltaY * scale));
  }, { passive: false });
  cvs.addEventListener('dblclick', (e) => {
    const n = pick(e.offsetX, e.offsetY);
    if (n) centerOn(n, Math.max(tgt.k, 1.6));
  });

  // ---------- HUD ----------
  const statsEl = $('#cv-stats');
  function renderStats() {
    if (!D) return;
    const vn = G.vis.filter((n) => n.kind === 'note').length;
    const s = D.stats;
    statsEl.innerHTML = `<span class="cv-chip"><b>${fmtNum(vn)}</b> notes${vn !== s.notes ? ` sur ${fmtNum(s.notes)}` : ''}</span>`
      + `<span class="cv-chip"><b>${fmtNum(G.vlinks.length)}</b> liens</span>`
      + (s.broken ? `<span class="cv-chip warn"><b>${fmtNum(s.broken)}</b> liens cassés</span>` : '');
  }
  const localSeg = $('#cv-local');
  const localBtn = $('[data-local]');
  const depthBtn = $('[data-depth]');
  function syncLocal() {
    localSeg.hidden = !selected;
    localBtn.setAttribute('aria-pressed', String(!!prefs.local));
    depthBtn.textContent = String(prefs.depth);
  }
  localBtn.addEventListener('click', () => { prefs.local = !prefs.local; save(); syncLocal(); computeVisible(); setTimeout(() => fit(G.vis, { maxK: 2 }), 380); });
  depthBtn.addEventListener('click', () => { prefs.depth = prefs.depth % 3 + 1; save(); syncLocal(); if (prefs.local) { computeVisible(); setTimeout(() => fit(G.vis, { maxK: 2 }), 380); } });
  $('[data-fit]').addEventListener('click', () => fit());
  $('[data-zoom=in]').addEventListener('click', () => zoomAt(W / 2 + tgt.ox, H / 2, tgt.k * 1.45));
  $('[data-zoom=out]').addEventListener('click', () => zoomAt(W / 2 + tgt.ox, H / 2, tgt.k / 1.45));

  // ---------- explorer and display panel ----------
  const navT = $('#cv-nav');
  const panelFiles = $('#panel-files');
  const panelView = $('#panel-view');
  const tabs = { files: $('#tab-files'), view: $('#tab-view') };
  function showTab(name) {
    prefs.tab = name; save();
    tabs.files.setAttribute('aria-selected', String(name === 'files'));
    tabs.view.setAttribute('aria-selected', String(name === 'view'));
    panelFiles.hidden = name !== 'files';
    panelView.hidden = name !== 'view';
  }
  tabs.files.addEventListener('click', () => showTab('files'));
  tabs.view.addEventListener('click', () => showTab('view'));

  const CHEV = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function treeOf(paths) {
    const rootDir = { name: '', path: '', dirs: new Map(), items: [] };
    for (const [p, item] of paths) {
      const parts = p.split('/');
      let d = rootDir;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!d.dirs.has(key)) d.dirs.set(key, { name: key, path: d.path ? `${d.path}/${key}` : key, dirs: new Map(), items: [] });
        d = d.dirs.get(key);
      }
      d.items.push(item);
    }
    const count = (d) => (d.n = d.items.length + [...d.dirs.values()].reduce((a, x) => a + count(x), 0));
    count(rootDir);
    return rootDir;
  }
  let vaultTree = null;
  let repoTree = null;
  function renderFiles() {
    vaultTree = treeOf(D.notes.map((n) => [n.id, n]));
    repoTree = treeOf(D.files.map((f) => [f.p, f]));
    panelFiles.innerHTML = `<p class="cv-h">Vault<span>${fmtNum(D.notes.length)}</span></p><ul class="cv-tree" data-tree="v"></ul>`
      + `<p class="cv-h">Dépôt<span>${fmtNum(D.files.length)}</span></p><ul class="cv-tree" data-tree="r"></ul>`;
    fillDir(panelFiles.querySelector('[data-tree=v]'), vaultTree, 'v');
    fillDir(panelFiles.querySelector('[data-tree=r]'), repoTree, 'r');
    markCurrent();
  }
  function fillDir(ul, dir, kind) {
    const dirs = [...dir.dirs.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const items = dir.items.slice().sort((a, b) => (kind === 'v' ? a.t.localeCompare(b.t, 'fr') : base(a.p).localeCompare(base(b.p), 'fr')));
    let out = '';
    for (const d of dirs) {
      const key = `${kind}:${d.path}`;
      const open = !!prefs.open[key];
      const col = kind === 'v' ? groupColor(d.path.split('/')[0]) : null;
      out += `<li><button type="button" class="cv-row dir" data-dir="${esc(key)}" aria-expanded="${open}">${CHEV}${col ? `<i class="dot" data-c="${esc(col)}"></i>` : ''}<span class="lbl">${esc(d.name)}</span><span class="n">${d.n}</span></button>`
        + `<ul class="cv-tree"${open ? '' : ' hidden'} data-sub="${esc(key)}"></ul></li>`;
    }
    for (const it of items) {
      if (kind === 'v') out += `<li><button type="button" class="cv-row" data-note="${esc(it.id)}" title="${esc(it.id)}"><i class="dot" data-c="${esc(groupColor(it.g))}"></i><span class="lbl">${esc(it.t)}</span></button></li>`;
      else out += `<li><button type="button" class="cv-row${it.k === 'txt' ? '' : ' dim'}" data-file="${esc(it.p)}" title="${esc(it.p)} · ${fmtSize(it.s)}"><i class="sq" data-c="${esc(fileColor(it.p))}"></i><span class="lbl">${esc(base(it.p))}</span></button></li>`;
    }
    ul.innerHTML = out;
    ul.dataset.filled = '1';
    paint(ul);
    for (const d of dirs) if (prefs.open[`${kind}:${d.path}`]) fillDir(ul.querySelector(`[data-sub="${CSS.escape(`${kind}:${d.path}`)}"]`), d, kind);
  }
  // Colours are data-c attributes turned into a CSS variable (no inline style in the markup: strict CSP).
  function paint(rootEl) { for (const e of rootEl.querySelectorAll('[data-c]')) { e.style.setProperty('--c', e.dataset.c); e.removeAttribute('data-c'); } }
  function dirNode(key) {
    const [kind, path] = [key.slice(0, 1), key.slice(2)];
    let d = kind === 'v' ? vaultTree : repoTree;
    for (const part of path.split('/')) d = d?.dirs.get(part);
    return d;
  }
  function toggleDir(btn, force) {
    const key = btn.dataset.dir;
    const open = force ?? btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    const ul = btn.nextElementSibling;
    if (open && !ul.dataset.filled) fillDir(ul, dirNode(key), key[0]);
    ul.hidden = !open;
    if (open) prefs.open[key] = 1; else delete prefs.open[key];
    save();
  }
  panelFiles.addEventListener('click', (e) => {
    const b = e.target.closest('.cv-row');
    if (!b) return;
    if (b.dataset.dir) toggleDir(b);
    else if (b.dataset.note) { go('n', b.dataset.note); if (narrow()) navT.checked = false; }
    else if (b.dataset.file) { go('f', b.dataset.file); if (narrow()) navT.checked = false; }
  });
  function reveal(kind, path) {
    // Opens the folders above an item so it can be marked in the tree.
    const parts = path.split('/');
    let key = '';
    for (let i = 0; i < parts.length - 1; i++) {
      key = key ? `${key}/${parts[i]}` : parts[i];
      const btn = panelFiles.querySelector(`[data-dir="${CSS.escape(`${kind}:${key}`)}"]`);
      if (btn && btn.getAttribute('aria-expanded') !== 'true') toggleDir(btn, true);
    }
  }
  function markCurrent() {
    for (const b of panelFiles.querySelectorAll('[aria-current]')) b.removeAttribute('aria-current');
    if (!current) return;
    const kind = current.type === 'note' ? 'v' : 'r';
    const id = current.type === 'note' ? current.id : current.path;
    reveal(kind, id);
    const row = panelFiles.querySelector(current.type === 'note' ? `[data-note="${CSS.escape(id)}"]` : `[data-file="${CSS.escape(id)}"]`);
    if (row) { row.setAttribute('aria-current', 'true'); if (!panelFiles.hidden) row.scrollIntoView({ block: 'nearest' }); }
  }

  const OPTS = [
    ['code', 'Fichiers de code', 'Les fichiers du dépôt cités par les notes'],
    ['tags', 'Tags', 'Les tags des en-têtes des notes'],
    ['ghosts', 'Liens cassés', 'Les notes citées qui n’existent pas'],
    ['orphans', 'Notes isolées', 'Les notes sans aucun lien'],
    ['labels', 'Noms des notes', 'Selon le zoom'],
    ['influx', 'Influx', 'Les impulsions qui parcourent les liens'],
  ];
  const FORCES = [['center', 'Attraction au centre', 0, 1.5, 0.05], ['repel', 'Répulsion', 0.2, 3, 0.05], ['link', 'Force des liens', 0.1, 2, 0.05], ['dist', 'Longueur des liens', 0.3, 3, 0.05]];
  function renderView() {
    const groups = D.groups.slice().sort((a, b) => (a.id === '' ? -1 : b.id === '' ? 1 : b.count - a.count));
    const fileCount = new Set(D.notes.flatMap((n) => n.code)).size;
    const counts = { code: fileCount, tags: new Set(D.notes.flatMap((n) => n.tags)).size, ghosts: D.ghosts.length };
    panelView.innerHTML = `<p class="cv-h">Groupes</p><div class="cv-groups">${groups.map((g) => `<label class="cv-switch" data-c="${esc(groupColor(g.id))}"><i class="dot" data-c="${esc(groupColor(g.id))}"></i><span class="lbl">${esc(groupName(g.id))}</span><span class="n">${g.count}</span><input type="checkbox" data-group="${esc(g.id)}" ${prefs.hidden.includes(g.id) ? '' : 'checked'} aria-label="Afficher ${esc(groupName(g.id))}"></label>`).join('')}</div>`
      + `<p class="cv-h">Afficher</p><div class="cv-groups">${OPTS.map(([k, label, sub]) => `<label class="cv-switch"><span class="lbl">${label}${counts[k] != null ? ` <span class="n">${counts[k]}</span>` : ''}<small>${sub}</small></span><input type="checkbox" data-opt="${k}" ${prefs.opts[k] ? 'checked' : ''}></label>`).join('')}</div>`
      + `<p class="cv-h">Forces<button type="button" class="cv-linkbtn" data-reset>Par défaut</button></p>${FORCES.map(([k, label, min, max, step]) => `<label class="cv-range"><span>${label}</span><output data-out="${k}">${prefs.forces[k].toFixed(2)}</output><input type="range" min="${min}" max="${max}" step="${step}" value="${prefs.forces[k]}" data-force="${k}"></label>`).join('')}`
      + `<p class="cv-h">Le vault en chiffres</p><div class="cv-statgrid"><div><b>${fmtNum(D.stats.notes)}</b><span>notes</span></div><div><b>${fmtNum(D.stats.links)}</b><span>liens entre notes</span></div>`
      + `<div><b>${fmtNum(D.stats.words)}</b><span>mots</span></div><div><b>${fmtNum(D.stats.codeRefs)}</b><span>fichiers de code cités</span></div>`
      + `${D.stats.broken ? `<button type="button" class="warnbox" data-broken><b>${fmtNum(D.stats.broken)}</b><span>liens cassés : voir</span></button>` : `<div><b>0</b><span>lien cassé</span></div>`}<div><b>${fmtNum(D.stats.files)}</b><span>fichiers du dépôt</span></div></div><ul class="cv-broken" id="cv-broken" hidden></ul>`;
    paint(panelView);
  }
  panelView.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.group != null) {
      const g = t.dataset.group;
      prefs.hidden = t.checked ? prefs.hidden.filter((x) => x !== g) : [...new Set([...prefs.hidden, g])];
      save(); computeVisible();
    } else if (t.dataset.opt) {
      prefs.opts[t.dataset.opt] = t.checked; save();
      if (['code', 'tags', 'ghosts', 'orphans'].includes(t.dataset.opt)) computeVisible();
      wake();
    }
  });
  panelView.addEventListener('input', (e) => {
    const k = e.target.dataset.force;
    if (!k) return;
    prefs.forces[k] = Number(e.target.value);
    panelView.querySelector(`[data-out=${k}]`).textContent = prefs.forces[k].toFixed(2);
    save(); reheat(0.45);
  });
  panelView.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset]')) { prefs.forces = { ...DEFAULTS.forces }; save(); renderView(); reheat(0.6); }
    if (e.target.closest('[data-broken]')) {
      const ul = $('#cv-broken');
      ul.hidden = !ul.hidden;
      ul.innerHTML = D.ghosts.map((g) => `<li><b>[[${esc(g.name)}]]</b><span>dans ${g.from.map((f) => `<a href="#n=${encodeURIComponent(f)}">${esc(notesById.get(f)?.t || f)}</a>`).join(', ')}</span></li>`).join('');
    }
  });

  // ---------- filter (dims what doesn't match) ----------
  const filterIn = $('#cv-filter');
  let filterQ = '';
  filterIn.addEventListener('input', () => {
    filterQ = norm(filterIn.value.trim());
    const words = filterQ.split(/\s+/).filter(Boolean);
    for (const n of G.nodes) {
      const hay = n.kind === 'note' ? `${norm(n.label)} ${norm(n.id)} ${n.note.tags.join(' ')}` : norm(n.path || n.label);
      n.match = !words.length || words.every((w) => hay.includes(w));
    }
    for (const b of panelFiles.querySelectorAll('[data-note]')) {
      const n = notesById.get(b.dataset.note);
      b.classList.toggle('dim', !!filterQ && !G.byKey.get(`n:${n.id}`)?.match);
    }
    wake();
  });

  // ---------- reader ----------
  const doc = $('#cv-doc');
  const scroller = $('#cv-scroll');
  const crumbs = $('#cv-crumbs');
  const ractions = $('#cv-ractions');
  let current = null; // { type: 'note', id } | { type: 'file', path }
  const ICON = {
    gh: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5L7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.8 9.2a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 0 0-4-4l-.9.9M9.2 6.8a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 0 0 4 4l.9-.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wide: '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6V3.5a1 1 0 0 1 1-1H6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const ghUrl = (path) => (D?.repo ? `https://github.com/${D.repo}/blob/${D.source === 'github' ? D.sha || D.branch : D.branch}/${path.split('/').map(encodeURIComponent).join('/')}` : '');

  function showReader() {
    if (reader.hidden) {
      reader.hidden = false;
      root.classList.add('reading');
      if (prefs.rw && !narrow()) root.style.setProperty('--rw', `${prefs.rw}px`);
    }
    tgt.ox = viewOffset();
    wake();
  }
  function hideReader() {
    reader.hidden = true;
    root.classList.remove('reading');
    current = null;
    selected = null;
    updateFocus(); syncLocal(); markCurrent();
    if (prefs.local) computeVisible();
    tgt.ox = viewOffset();
    wake();
  }
  function setCrumbs(parts, title) {
    crumbs.innerHTML = `${parts.map((p) => `<span>${esc(p)}</span><i>/</i>`).join('')}<b>${esc(title)}</b>`;
  }
  function setActions(path, extra = '') {
    const gh = ghUrl(path);
    ractions.innerHTML = `${extra}<button type="button" class="cv-ibtn" data-copy aria-label="Copier le lien" title="Copier le lien">${ICON.link}</button>`
      + `${gh ? `<a class="cv-ibtn" href="${esc(gh)}" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir sur GitHub" title="Ouvrir sur GitHub">${ICON.gh}</a>` : ''}`
      + `<button type="button" class="cv-ibtn" data-wide aria-pressed="${reader.classList.contains('wide')}" aria-label="Lecture en grand" title="Lecture en grand">${ICON.wide}</button>`;
  }

  function selectNode(n, { center = false } = {}) {
    selected = n || null;
    updateFocus(); syncLocal();
    if (prefs.local) { computeVisible(); if (n) setTimeout(() => fit(G.vis, { maxK: 2 }), 380); }
    if (n && center && (!inView(n) || cam.k < 0.25)) centerOn(n, Math.max(tgt.k, 0.7));
    wake();
  }
  function openNode(n) {
    if (n.kind === 'note') go('n', n.id);
    else if (n.kind === 'file') go('f', n.path);
    else if (n.kind === 'ghost') toast(`La note « ${n.label} » n’existe pas : lien cassé dans ${(n.adj.map((l) => (l.s === n ? l.t : l.s).label)).join(', ')}.`);
    else if (n.kind === 'tag') { filterIn.value = n.label.slice(1); filterIn.dispatchEvent(new Event('input')); }
  }

  function noteHtml(n) {
    const fm = n.fm || {};
    let body = n.h;
    let title = esc(n.t);
    const h1 = /^<h1 id="[^"]*">([\s\S]*?)<\/h1>\n?/.exec(body);
    if (h1) { title = h1[1]; body = body.slice(h1[0].length); }
    const chips = [`<span class="cv-tag" data-c="${esc(groupColor(n.g))}"><i class="dot" data-c="${esc(groupColor(n.g))}"></i>${esc(groupName(n.g))}</span>`];
    if (fm.type) chips.push(`<span class="cv-tag t">${esc(fm.type)}</span>`);
    if (fm.maj) chips.push(`<span class="cv-tag t">mise à jour ${esc(String(fm.maj).split('-').reverse().join('/'))}</span>`);
    if (fm.version_app) chips.push(`<span class="cv-tag t">app ${esc(fm.version_app)}</span>`);
    if (typeof fm.fichier === 'string' && filesByPath.has(fm.fichier)) chips.push(`<button type="button" class="cv-tag code" data-file="${esc(fm.fichier)}">${esc(fm.fichier)}</button>`);
    if (fm.lignes) chips.push(`<span class="cv-tag t">${esc(fm.lignes)} lignes</span>`);
    for (const t of n.tags) chips.push(`<span class="cv-tag t">#${esc(t)}</span>`);
    const toc = n.hd.filter((h) => h[0] > 1);
    const tocHtml = toc.length >= 4 ? `<details class="cv-toc"><summary>Sommaire · ${toc.length} parties</summary><ol>${toc.map(([lv, text, id]) => `<li class="l${lv}"><a href="#" data-h="${esc(id)}">${esc(text)}</a></li>`).join('')}</ol></details>` : '';
    const item = (id, sub) => {
      const m = notesById.get(id);
      return m ? `<li><a href="#n=${encodeURIComponent(id)}" data-note="${esc(id)}"><b><i class="dot" data-c="${esc(groupColor(m.g))}"></i>${esc(m.t)}</b><span>${esc(sub ?? (m.d || groupName(m.g)))}</span></a></li>` : '';
    };
    const back = (backlinks.get(n.id) || []).slice().sort((a, b) => a.localeCompare(b, 'fr'));
    const rel = [
      back.length ? `<h2>Mentionnée dans · ${back.length}</h2><ul>${back.map((id) => item(id, notesById.get(id)?.ctx?.[n.id] || notesById.get(id)?.d)).join('')}</ul>` : '<h2>Mentionnée dans</h2><p class="cv-empty">Aucune note ne pointe vers celle-ci.</p>',
      n.out.length ? `<h2>Liens sortants · ${n.out.length}</h2><ul>${n.out.map((id) => item(id)).join('')}</ul>` : '',
      n.code.length ? `<h2>Fichiers cités · ${n.code.length}</h2><div class="chips">${n.code.map((p) => `<button type="button" class="cv-tag code" data-file="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : '',
      n.bad.length ? `<h2>Liens cassés · ${n.bad.length}</h2><div class="chips">${n.bad.map((b) => `<span class="cv-tag t">[[${esc(b)}]]</span>`).join('')}</div>` : '',
    ].join('');
    return `<h1>${title}</h1><div class="cv-meta">${chips.join('')}</div>${tocHtml}${body}<section class="cv-rel">${rel}</section>`;
  }

  function openNote(id, h) {
    const n = notesById.get(id);
    if (!n) { toast('Cette note n’existe plus dans le vault.'); return; }
    const same = current?.type === 'note' && current.id === id;
    current = { type: 'note', id };
    reader.querySelector('.cv-doc').classList.remove('file');
    setCrumbs(n.d ? n.d.split('/') : [groupName(n.g)], n.t);
    setActions(`docs/vault/${n.id}.md`);
    doc.innerHTML = noteHtml(n);
    paint(doc);
    highlightBlocks(doc);
    showReader();
    if (h) requestAnimationFrame(() => scrollToHeading(h));
    else if (!same) scroller.scrollTop = 0;
    selectNode(G.byKey.get(`n:${id}`), { center: true });
    markCurrent();
    document.title = `${n.t} · Cerveau`;
  }
  function scrollToHeading(id) {
    const t = doc.querySelector(`[id="${CSS.escape(id)}"]`);
    if (!t) return;
    t.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
  }

  const fileCache = new Map();
  async function openFile(path) {
    const f = filesByPath.get(path);
    current = { type: 'file', path };
    const parts = path.split('/');
    setCrumbs(parts.slice(0, -1), parts[parts.length - 1]);
    setActions(path);
    reader.querySelector('.cv-doc').classList.add('file');
    showReader();
    scroller.scrollTop = 0;
    selectNode(G.byKey.get(`f:${path}`) || null, { center: true });
    markCurrent();
    document.title = `${parts[parts.length - 1]} · Cerveau`;
    if (!f) { doc.innerHTML = `<div class="cv-empty"><b>Fichier introuvable</b>${esc(path)} n’est pas dans le dépôt lu.</div>`; return; }
    const head = (lines) => `<div class="cv-filehead"><h1>${esc(parts[parts.length - 1])}</h1><p>${esc(path)} · ${fmtSize(f.s)}${lines ? ` · ${fmtNum(lines)} lignes` : ''}</p></div>`;
    const cited = (citedBy.get(path) || []);
    const citedHtml = cited.length ? `<section class="cv-rel"><h2>Cité dans · ${cited.length}</h2><ul>${cited.map((id) => { const m = notesById.get(id); return m ? `<li><a href="#n=${encodeURIComponent(id)}" data-note="${esc(id)}"><b><i class="dot" data-c="${esc(groupColor(m.g))}"></i>${esc(m.t)}</b><span>${esc(m.d || groupName(m.g))}</span></a></li>` : ''; }).join('')}</ul></section>` : '';
    if (f.k !== 'txt') {
      const gh = ghUrl(path);
      doc.innerHTML = `${head(0)}<div class="cv-empty"><b>${f.k === 'bin' ? 'Fichier binaire' : 'Fichier trop gros pour le lecteur'}</b>${gh ? `<a href="${esc(gh)}" target="_blank" rel="noopener noreferrer">Ouvrir sur GitHub</a>` : ''}</div>${citedHtml}`;
      paint(doc);
      return;
    }
    doc.innerHTML = `${head(0)}<div class="cv-empty">Chargement…</div>`;
    let data = fileCache.get(`${etag}|${path}`);
    if (!data) {
      try {
        const res = await fetch(`${FILE_SRC}?chemin=${encodeURIComponent(path)}`, { credentials: 'same-origin', headers: { accept: 'application/json' } });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
        fileCache.set(`${etag}|${path}`, data);
      } catch (err) {
        if (current?.path === path) doc.innerHTML = `${head(0)}<div class="cv-empty"><b>Lecture impossible</b>${esc(err.message)}</div>`;
        return;
      }
    }
    if (current?.type !== 'file' || current.path !== path) return;
    const lines = data.text.split('\n').length;
    const code = `<pre class="cv-code"><code>${highlight(data.text, data.lang)}</code></pre>`;
    if (data.html) {
      doc.innerHTML = `${head(lines)}<div class="cv-seg2" role="group" aria-label="Affichage"><button type="button" data-mode="read" aria-pressed="true">Lecture</button><button type="button" data-mode="src" aria-pressed="false">Source</button></div><div data-view="read">${data.html}</div><div data-view="src" hidden>${code}</div>${citedHtml}`;
      highlightBlocks(doc);
    } else doc.innerHTML = `${head(lines)}${code}${citedHtml}`;
    paint(doc);
  }

  // Clicks inside the reader: links to notes and files, table of contents, copy, GitHub, wide mode, markdown source.
  reader.addEventListener('click', (e) => {
    const a = e.target.closest('a, button, code.cf');
    if (!a) return;
    if (a.matches('a.ext') || (a.matches('a.cv-ibtn') && a.target === '_blank')) return;
    if (a.dataset.note) { e.preventDefault(); go('n', a.dataset.note, a.dataset.h); return; }
    if (a.dataset.file) { e.preventDefault(); go('f', a.dataset.file); return; }
    if (a.dataset.ghost != null) { e.preventDefault(); toast(`La note « ${a.dataset.ghost} » n’existe pas encore dans le vault.`); return; }
    if (a.dataset.h) { e.preventDefault(); scrollToHeading(a.dataset.h); return; }
    if (a.dataset.mode) {
      for (const b of doc.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b === a));
      for (const v of doc.querySelectorAll('[data-view]')) v.hidden = v.dataset.view !== a.dataset.mode;
      return;
    }
    if (a.hasAttribute('data-copy')) {
      const url = `${location.origin}${location.pathname}${location.hash}`;
      navigator.clipboard?.writeText(url).then(() => toast('Lien copié.'), () => toast(url));
      return;
    }
    if (a.hasAttribute('data-wide')) {
      reader.classList.toggle('wide');
      a.setAttribute('aria-pressed', String(reader.classList.contains('wide')));
      tgt.ox = viewOffset(); wake();
      return;
    }
    if (a.hasAttribute('data-close')) { go(''); return; }
    if (a.dataset.hist === 'back') { history.back(); }
  });

  // Pointing at a link in the reader lights its note (or file) up in the graph.
  reader.addEventListener('mouseover', (e) => {
    const a = e.target.closest('[data-note], [data-file]');
    if (!a || narrow()) return;
    const n = G.byKey.get(a.dataset.note ? `n:${a.dataset.note}` : `f:${a.dataset.file}`);
    if (n && n.vis) setHover(n);
  });
  reader.addEventListener('mouseout', (e) => {
    const a = e.target.closest('[data-note], [data-file]');
    if (a && hover && !a.contains(e.relatedTarget)) setHover(null);
  });

  // Reader width, dragged from its left edge (kept for next time).
  const handle = $('#cv-resize');
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('on');
    const move = (ev) => {
      const r = root.getBoundingClientRect();
      const w = clamp(r.right - ev.clientX, 360, r.width - 380);
      prefs.rw = Math.round(w);
      root.style.setProperty('--rw', `${prefs.rw}px`);
      tgt.ox = viewOffset(); wake();
    };
    const up = () => { handle.classList.remove('on'); handle.removeEventListener('pointermove', move); save(); };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up, { once: true });
  });

  // ---------- syntax colours (light: comments, strings, numbers, keywords, calls) ----------
  const KW = {
    js: 'async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield null undefined true false as type interface enum implements readonly keyof',
    rs: 'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while Some None Ok Err',
    py: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self',
    sh: 'if then else elif fi for while do done case esac in function return local export set unset echo exit readonly source sudo',
    ps: 'begin break catch class continue data default do dynamicparam else elseif end exit filter finally for foreach from function if in param process return switch throw trap try until using var while $true $false $null',
    bat: 'echo set if else goto call exit not exist defined errorlevel for do in reg add delete query setlocal endlocal pause rem cls start',
    sql: 'select from where insert into values update set delete create table index if not exists on primary key references default null unique alter add column drop constraint check and or as join left right inner outer group by order having limit offset returning conflict do nothing begin commit text integer bigint boolean jsonb serial',
    css: '@media @font-face @keyframes @supports !important',
    nsh: '!macro !macroend !include !define !insertmacro Function FunctionEnd Section SectionEnd StrCmp Exec ExecWait ReadRegStr WriteRegStr DeleteRegKey Call Goto',
  };
  const LANG = { js: 'js', mjs: 'js', cjs: 'js', ts: 'js', tsx: 'js', jsx: 'js', javascript: 'js', typescript: 'js', json: 'json', rs: 'rs', rust: 'rs', py: 'py', python: 'py',
    sh: 'sh', bash: 'sh', zsh: 'sh', shell: 'sh', ps1: 'ps', psm1: 'ps', powershell: 'ps', bat: 'bat', cmd: 'bat', sql: 'sql', css: 'css', html: 'html', htm: 'html', svg: 'html', xml: 'html',
    toml: 'conf', yml: 'conf', yaml: 'conf', ini: 'conf', nsh: 'nsh', nsi: 'nsh', manifest: 'html', md: 'md', markdown: 'md' };
  const SPEC = {
    js: { c: '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/', s: '`(?:\\\\[\\s\\S]|[^`\\\\])*`|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'' },
    rs: { c: '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/', s: 'r#*"[\\s\\S]*?"#*|b?"(?:\\\\[\\s\\S]|[^"\\\\])*"|b?\'(?:\\\\.|[^\'\\\\\\n])\'' },
    py: { c: '#[^\\n]*', s: '"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|[rbfu]{0,2}"(?:\\\\.|[^"\\\\\\n])*"|[rbfu]{0,2}\'(?:\\\\.|[^\'\\\\\\n])*\'' },
    sh: { c: '#[^\\n]*', s: '"(?:\\\\.|[^"\\\\])*"|\'[^\']*\'', v: '\\$\\{?[\\w@#?*!-]+\\}?' },
    ps: { c: '<#[\\s\\S]*?#>|#[^\\n]*', s: '"(?:`.|[^"`])*"|\'(?:\'\'|[^\'])*\'', v: '\\$[\\w:]+' },
    bat: { c: '(?:^|\\n)\\s*(?:rem\\b|::)[^\\n]*', s: '"[^"\\n]*"', v: '%[\\w~:.,-]*%|!\\w+!|%%\\w' },
    sql: { c: '--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/', s: '\'(?:\'\'|[^\'])*\'' },
    css: { c: '\\/\\*[\\s\\S]*?\\*\\/', s: '"[^"\\n]*"|\'[^\'\\n]*\'', v: '--[\\w-]+|#[0-9a-fA-F]{3,8}\\b' },
    html: { c: '<!--[\\s\\S]*?-->', s: '"[^"]*"|\'[^\']*\'', k: '<\\/?[A-Za-z][\\w:-]*|\\/?>' },
    json: { c: '(?!)', s: '"(?:\\\\.|[^"\\\\])*"(?=\\s*:)', v: '"(?:\\\\.|[^"\\\\])*"' },
    conf: { c: '#[^\\n]*|;[^\\n]*', s: '"(?:\\\\.|[^"\\\\])*"|\'[^\']*\'', k: '^\\s*\\[[^\\]\\n]+\\]|^[\\w.-]+(?=\\s*[=:])' },
    nsh: { c: ';[^\\n]*|#[^\\n]*', s: '"[^"\\n]*"', v: '\\$\\{?[\\w]+\\}?' },
  };
  const reCache = new Map();
  function tokenizer(lang) {
    if (reCache.has(lang)) return reCache.get(lang);
    const s = SPEC[lang];
    const kw = new Set((KW[lang] || '').split(' ').filter(Boolean));
    const ci = lang === 'sql' || lang === 'bat' || lang === 'ps';
    const parts = [`(${s.c})`, `(${s.s})`, `(${s.v || '(?!)'})`, `(${s.k || '(?!)'})`, '(\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[a-zA-Z]*\\b|\\b0x[0-9a-fA-F_]+\\b)', '([@$!]?[A-Za-z_][\\w]*)'];
    const t = { re: new RegExp(parts.join('|'), lang === 'conf' ? 'gm' : 'g'), kw: ci ? new Set([...kw].map((w) => w.toLowerCase())) : kw, ci };
    reCache.set(lang, t);
    return t;
  }
  function highlight(text, ext) {
    const lang = LANG[String(ext || '').toLowerCase()];
    const segs = [];
    if (!lang || lang === 'md' || !SPEC[lang] || text.length > 400000) segs.push(['', text]);
    else {
      const { re, kw, ci } = tokenizer(lang);
      let lastI = 0;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (m[0] === '') { re.lastIndex++; continue; }
        if (m.index > lastI) segs.push(['', text.slice(lastI, m.index)]);
        let cls = '';
        if (m[1] != null) cls = 'c';
        else if (m[2] != null) cls = lang === 'json' ? 'f' : 's';
        else if (m[3] != null) cls = lang === 'json' ? 's' : 'v';
        else if (m[4] != null) cls = 'k';
        else if (m[5] != null) cls = 'n';
        else if (m[6] != null) {
          const w = m[6];
          if (kw.has(ci ? w.toLowerCase() : w)) cls = 'k';
          else if (/^\s*\(/.test(text.slice(re.lastIndex, re.lastIndex + 3)) && lang !== 'bat') cls = 'f';
          else if (/^[A-Z][a-z]/.test(w) && (lang === 'rs' || lang === 'js')) cls = 't';
        }
        segs.push([cls, m[0]]);
        lastI = re.lastIndex;
      }
      if (lastI < text.length) segs.push(['', text.slice(lastI)]);
    }
    // One element per line, spans never cross a line break (block comments, template strings).
    const lines = [];
    let line = '';
    for (const [cls, str] of segs) {
      const pieces = str.split('\n');
      pieces.forEach((p, i) => {
        if (i > 0) { lines.push(line); line = ''; }
        if (p) line += cls ? `<span class="tk-${cls}">${esc(p)}</span>` : esc(p);
      });
    }
    lines.push(line);
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines.map((l) => `<span class="l">${l || ' '}</span>`).join('\n');
  }
  function highlightBlocks(rootEl) {
    for (const pre of rootEl.querySelectorAll('pre.code[data-lang]')) {
      const code = pre.querySelector('code');
      if (!code || code.dataset.done) continue;
      const lang = LANG[pre.dataset.lang];
      if (!lang || !SPEC[lang]) continue;
      code.innerHTML = highlight(code.textContent, pre.dataset.lang).replace(/<span class="l">([\s\S]*?)<\/span>(\n|$)/g, '$1$2');
      code.dataset.done = '1';
    }
  }

  // ---------- search palette (Ctrl+K) ----------
  const pal = $('#cv-palette');
  const q = $('#cv-q');
  const results = $('#cv-results');
  let resultItems = [];
  let sel = 0;
  function openPalette() {
    pal.hidden = false;
    q.value = '';
    q.focus();
    renderResults();
  }
  function closePalette() { pal.hidden = true; }
  const mark = (text, words) => {
    let out = esc(text);
    for (const w of words) {
      if (w.length < 2) continue;
      const nt = norm(text);
      const i = nt.indexOf(w);
      if (i < 0) continue;
      out = `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + w.length))}</mark>${esc(text.slice(i + w.length))}`;
      break;
    }
    return out;
  };
  function snippet(text, words) {
    const nt = norm(text);
    let i = -1;
    for (const w of words) { i = nt.indexOf(w); if (i >= 0) break; }
    if (i < 0) return '';
    const s = Math.max(0, i - 60);
    return `${s ? '…' : ''}${mark(text.slice(s, i + 140), words)}…`;
  }
  function search(raw) {
    const words = norm(raw).split(/\s+/).filter(Boolean);
    if (!words.length) {
      const recent = D.notes.slice().sort((a, b) => String(b.fm.maj || '').localeCompare(String(a.fm.maj || '')) || (backlinks.get(b.id) || []).length - (backlinks.get(a.id) || []).length).slice(0, 12);
      return [{ grp: 'Notes les plus récentes' }, ...recent.map((n) => ({ type: 'n', id: n.id, title: n.t, sub: n.d || groupName(n.g), color: groupColor(n.g) }))];
    }
    const titles = []; const bodies = []; const files = [];
    for (const n of D.notes) {
      const t = norm(n.t);
      const full = n._n || (n._n = norm(n.x));
      let score = 0;
      const joined = words.join(' ');
      if (t === joined) score = 120; else if (t.startsWith(joined)) score = 95; else if (t.includes(joined)) score = 80;
      else if (words.every((w) => t.includes(w))) score = 60;
      if (score) titles.push({ score: score - t.length * 0.05 + (backlinks.get(n.id) || []).length * 0.1, n });
      else if (words.every((w) => full.includes(w))) {
        let hits = 0;
        for (const w of words) { let i = -1; while ((i = full.indexOf(w, i + 1)) >= 0 && hits < 50) hits++; }
        bodies.push({ score: hits, n });
      }
    }
    for (const f of D.files) {
      const p = norm(f.p);
      if (words.every((w) => p.includes(w))) files.push({ score: (norm(base(f.p)).includes(words[words.length - 1]) ? 20 : 0) - p.length * 0.02, f });
    }
    titles.sort((a, b) => b.score - a.score); bodies.sort((a, b) => b.score - a.score); files.sort((a, b) => b.score - a.score);
    const out = [];
    if (titles.length) out.push({ grp: 'Notes' }, ...titles.slice(0, 12).map(({ n }) => ({ type: 'n', id: n.id, title: n.t, titleHtml: mark(n.t, words), sub: n.d || groupName(n.g), color: groupColor(n.g) })));
    if (bodies.length) out.push({ grp: `Dans le texte · ${bodies.length}` }, ...bodies.slice(0, 14).map(({ n }) => ({ type: 'n', id: n.id, title: n.t, sub: n.d || groupName(n.g), color: groupColor(n.g), snip: snippet(n.x, words) })));
    if (files.length) out.push({ grp: `Fichiers du dépôt · ${files.length}` }, ...files.slice(0, 12).map(({ f }) => ({ type: 'f', id: f.p, title: base(f.p), titleHtml: mark(base(f.p), words), sub: f.p, color: fileColor(f.p), file: true })));
    return out;
  }
  function renderResults() {
    const list = search(q.value);
    resultItems = list.filter((x) => x.type);
    sel = 0;
    if (!resultItems.length) { results.innerHTML = '<li class="none">Rien trouvé. Essaie un autre mot.</li>'; return; }
    let idx = 0;
    results.innerHTML = list.map((x) => (x.grp ? `<li class="grp" role="presentation">${esc(x.grp)}</li>`
      : `<li class="it" role="option" id="r-${idx}" data-i="${idx++}" aria-selected="${idx === 1}"><i class="${x.file ? 'sq' : 'dot'}" data-c="${esc(x.color)}"></i><div><b>${x.titleHtml || esc(x.title)}</b><small>${esc(x.sub)}</small>${x.snip ? `<p>${x.snip}</p>` : ''}</div></li>`)).join('');
    paint(results);
  }
  function moveSel(d) {
    if (!resultItems.length) return;
    sel = (sel + d + resultItems.length) % resultItems.length;
    for (const li of results.querySelectorAll('.it')) li.setAttribute('aria-selected', String(Number(li.dataset.i) === sel));
    results.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    const x = resultItems[i];
    if (!x) return;
    closePalette();
    if (narrow()) navT.checked = false;
    go(x.type, x.id);
  }
  q.addEventListener('input', renderResults);
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  });
  results.addEventListener('click', (e) => { const li = e.target.closest('.it'); if (li) choose(Number(li.dataset.i)); });
  results.addEventListener('mousemove', (e) => { const li = e.target.closest('.it'); if (li && Number(li.dataset.i) !== sel) { sel = Number(li.dataset.i); moveSel(0); } });
  pal.addEventListener('click', (e) => { if (e.target === pal) closePalette(); });
  for (const b of document.querySelectorAll('[data-palette]')) b.addEventListener('click', () => { if (D) openPalette(); });

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (D) (pal.hidden ? openPalette() : closePalette()); return; }
    if (e.key === 'Escape') {
      if (!pal.hidden) { closePalette(); return; }
      if (typing && e.target === filterIn && filterIn.value) { filterIn.value = ''; filterIn.dispatchEvent(new Event('input')); return; }
      if (navT.checked) { navT.checked = false; return; }
      if (readerOpen()) { go(''); return; }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey) return;
    if (e.key === '/') { e.preventDefault(); if (D) openPalette(); }
    else if (e.key === 'f' || e.key === 'F') fit();
    else if ((e.key === 'l' || e.key === 'L') && selected) localBtn.click();
    else if (e.key === '+' || e.key === '=') zoomAt(W / 2 + tgt.ox, H / 2, tgt.k * 1.3);
    else if (e.key === '-') zoomAt(W / 2 + tgt.ox, H / 2, tgt.k / 1.3);
    else if (e.altKey && e.key === 'ArrowLeft') history.back();
  });

  // ---------- navigation: the address keeps the open note (#n=…) or file (#f=…), so links and Back work ----------
  function go(type, id, h) {
    const hash = type ? `#${type}=${encodeURIComponent(id)}${h ? `&h=${encodeURIComponent(h)}` : ''}` : '';
    if (location.hash === hash || (!hash && !location.hash)) { route(); return; }
    if (hash) location.hash = hash;
    else { history.pushState(null, '', location.pathname + location.search); route(); }
  }
  function route() {
    if (!D) return;
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.get('n')) openNote(p.get('n'), p.get('h'));
    else if (p.get('f')) openFile(p.get('f'));
    else if (readerOpen()) hideReader();
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', () => { if (!location.hash) route(); });
  // For the browser tests only (?debug=1): where a note is on screen.
  if (/[?&]debug=1\b/.test(location.search)) {
    window.__cv = { screenOf: (t) => { const n = G.nodes.find((m) => m.label === t); if (!n) return null; const p = toScreen(n.x, n.y); const r = stage.getBoundingClientRect(); return { x: p.x + r.left, y: p.y + r.top }; },
      alpha: () => sim.alpha, k: () => cam.k };
  }

  // ---------- loading, sync status, live refresh ----------
  const loading = $('#cv-loading');
  const syncEl = $('#cv-sync');
  const refreshBtn = $('#cv-refresh');
  function renderSync() {
    if (!D) return;
    const where = D.source === 'disk' ? `copie locale · <b>${esc(D.branch)}</b>` : `<b>${esc(D.branch)}</b> · ${esc(String(D.sha).slice(0, 7))}`;
    syncEl.innerHTML = `${where} · lu ${ago(D.at)}${staleError ? `<br><span class="err">${esc(staleError)}</span>` : ''}`;
    syncEl.title = D.source === 'github' ? `${D.repo}@${D.sha}` : D.branch;
  }
  setInterval(renderSync, 30000);

  function apply(data, newTag) {
    const first = !D;
    D = data;
    etag = newTag;
    index(D);
    buildGraph(D, first ? null : G.byKey);
    computeVisible();
    renderFiles();
    renderView();
    renderSync();
    syncLocal();
    if (first) {
      sim.alpha = 1;
      tgt.k = cam.k = narrow() ? 0.35 : 0.5;
      autoFitUntil = performance.now() + 2600;
      loading.classList.add('out');
      setTimeout(() => { loading.hidden = true; }, 600);
      const hint = $('#cv-hint');
      hint.hidden = false;
      setTimeout(() => hint.classList.add('out'), 6000);
      setTimeout(() => { hint.hidden = true; }, 6800);
      route();
    } else if (current) {
      const keepScroll = scroller.scrollTop;
      if (current.type === 'note' && notesById.has(current.id)) { openNote(current.id); scroller.scrollTop = keepScroll; } else if (current.type === 'note') hideReader();
    }
    wake();
  }

  async function load({ fresh = false, quiet = false } = {}) {
    if (fresh) refreshBtn.classList.add('spin');
    try {
      const { data, etag: tag } = await fetchData(fresh);
      if (tag !== etag) {
        const before = D?.stats.notes;
        apply(data, tag);
        if (before != null) toast(`Vault mis à jour : ${fmtNum(data.stats.notes)} notes (${data.stats.notes - before >= 0 ? '+' : ''}${data.stats.notes - before}).`);
      } else if (fresh) toast('Le vault est déjà à jour.');
      renderSync();
    } catch (err) {
      if (!D) {
        loading.querySelector('p').textContent = 'Le vault n’a pas pu être lu.';
        loading.querySelector('small').innerHTML = `<span class="err">${esc(err.message)}</span>`;
        if (!loading.querySelector('button')) {
          const b = document.createElement('button');
          b.className = 'cv-ibtn';
          b.type = 'button';
          b.textContent = err.login ? 'Se reconnecter' : 'Réessayer';
          b.addEventListener('click', () => { if (err.login) location.href = '/admin'; else { b.remove(); loading.querySelector('p').textContent = 'Lecture du vault…'; loading.querySelector('small').textContent = ''; load({ fresh: true }); } });
          loading.append(b);
        }
      } else if (!quiet) toast(err.message);
      if (err.login && D) toast(err.message);
    } finally {
      refreshBtn.classList.remove('spin');
    }
  }
  refreshBtn.addEventListener('click', () => load({ fresh: true }));
  // The vault changes several times a day: look again every two minutes while the page is visible.
  setInterval(() => { if (!document.hidden && D) load({ quiet: true }); }, 120000);

  showTab(prefs.tab === 'view' ? 'view' : 'files');
  loading.querySelector('small').textContent = 'Le vault est lu sur GitHub : la première fois peut prendre quelques secondes.';
  load();
})();
