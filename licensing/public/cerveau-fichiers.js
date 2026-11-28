// Rago — le Cerveau, explorateur de fichiers (« Rago Design », 27/11/2026). The tree of a repository (from
// /admin/cerveau/arbre.json, no file content) on the left; a gallery of the open folder (thumbnails = the images
// themselves, lazy-loaded) and a viewer for one file. Each file comes from /admin/cerveau/brut only when it is shown.
// Strict CSP: no inline style, no eval; everything typed is escaped.
(() => {
  'use strict';
  const root = document.getElementById('dx');
  if (!root) return;

  const $ = (s, r = document) => r.querySelector(s);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const base = (p) => p.slice(p.lastIndexOf('/') + 1);
  const parent = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
  const extOf = (p) => { const b = base(p).toLowerCase(); const d = b.lastIndexOf('.'); return d >= 0 ? b.slice(d + 1) : ''; };
  const fmtNum = (n) => new Intl.NumberFormat('fr-FR').format(n);
  const fmtSize = (b) => (b < 1024 ? `${b} o` : b < 1048576 ? `${(b / 1024).toFixed(b < 10240 ? 1 : 0).replace('.', ',')} Ko` : `${(b / 1048576).toFixed(1).replace('.', ',')} Mo`);
  function ago(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 45) return 'à l’instant';
    if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
    return `il y a ${Math.round(s / 3600)} h`;
  }
  const ic = (d) => `<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const I = {
    dir: ic('M2.5 4a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z'),
    img: ic('M2.5 3.5h11v9h-11zM2.5 10.5l3-3 3 3 2-2 3 3M10.5 6.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z'),
    txt: ic('M4 2.5h5.5l2.5 2.5v8.5H4zM6 7h4M6 9.5h4M6 12h2.5'),
    bin: ic('M4 2.5h5.5l2.5 2.5v8.5H4zM9.5 2.5V5H12'),
    chev: ic('M6 4l4 4-4 4'),
    left: ic('M10 3.5L5.5 8 10 12.5'),
    right: ic('M6 3.5L10.5 8 6 12.5'),
    x: ic('M4 4l8 8M12 4l-8 8'),
    down: ic('M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10'),
    ext: ic('M9 2.5h4.5V7M13.5 2.5L7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3'),
  };
  const THUMB_MAX = 4 * 1024 * 1024; // bigger images get a tile without preview in the gallery (opened on click)
  const TEXT_MAX = 2 * 1024 * 1024; // bigger text files: download or GitHub

  const TREE = root.dataset.tree;
  const RAW = root.dataset.raw;
  const REPO = root.dataset.repo;
  const join = (url, q) => `${url}${url.includes('?') ? '&' : '?'}${q}`;
  const rawUrl = (f) => join(RAW, `chemin=${encodeURIComponent(f.p)}&v=${f.b}`);
  const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');
  let T = null; // the tree from arbre.json
  let etag = '';
  let byPath = new Map();
  let dirs = new Map(); // folder path -> { path, name, dirs: Set, files: [] , n, bytes }
  let maxFile = 25 * 1024 * 1024;
  const ghUrl = (p, folder) => (REPO ? `https://github.com/${REPO}/${folder ? 'tree' : 'blob'}/${encodeURIComponent(T?.branch || 'main')}${p ? `/${encPath(p)}` : ''}` : '#');

  const body = $('#dx-body');
  const crumbs = $('#dx-crumbs');
  const treeEl = $('#dx-tree');
  const syncEl = $('#dx-sync');
  const filter = $('#dx-filter');
  const gh = $('#dx-gh');
  const nav = $('#cv-nav');
  let mode = 'grid';
  try { mode = localStorage.getItem('rago.cerveau.fichiers.mode') === 'list' ? 'list' : 'grid'; } catch { /* private window */ }
  const opened = new Set(['']);

  // The brain menu (<details>): closes on a click outside it or on Échap (same as the graph page).
  const brainsMenu = document.getElementById('cv-brains');
  if (brainsMenu) {
    document.addEventListener('click', (e) => { if (brainsMenu.open && !brainsMenu.contains(e.target)) brainsMenu.open = false; });
    brainsMenu.addEventListener('keydown', (e) => { if (e.key === 'Escape' && brainsMenu.open) { e.stopPropagation(); brainsMenu.open = false; } });
  }

  // ---------- data ----------
  function index() {
    byPath = new Map(T.files.map((f) => [f.p, f]));
    dirs = new Map();
    const dirOf = (path) => {
      if (dirs.has(path)) return dirs.get(path);
      const d = { path, name: base(path) || root.dataset.name, dirs: new Set(), files: [], n: 0, bytes: 0 };
      dirs.set(path, d);
      if (path) dirOf(parent(path)).dirs.add(path);
      return d;
    };
    dirOf('');
    for (const f of T.files) {
      dirOf(parent(f.p)).files.push(f);
      for (let p = parent(f.p); ; p = parent(p)) { const d = dirs.get(p); d.n++; d.bytes += f.s; if (!p) break; }
    }
  }
  async function load(fresh) {
    const btn = $('#dx-refresh');
    btn.classList.add('spin');
    try {
      const res = await fetch(join(TREE, fresh ? 'frais=1' : ''), { headers: etag && !fresh ? { 'if-none-match': etag } : {}, credentials: 'same-origin' });
      if (res.status === 304) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      etag = res.headers.get('etag') || '';
      T = data;
      maxFile = data.maxFile || maxFile;
      index();
      renderTree();
      route();
      const stale = res.headers.get('x-cerveau-erreur');
      syncEl.innerHTML = `<b>${esc(T.branch)}@${esc(T.sha.slice(0, 7))}</b> · ${fmtNum(T.files.length)} fichiers · ${fmtSize(dirs.get('').bytes)}<br>lu ${esc(ago(T.at))}`
        + (T.truncated ? '<br><span class="err">Arborescence tronquée par GitHub (trop de fichiers).</span>' : '')
        + (stale ? `<br><span class="err">${esc(decodeURIComponent(stale))}</span>` : '');
    } catch (err) {
      if (!T) {
        body.innerHTML = `<div class="dx-msg" role="alert"><p>Impossible de lire « ${esc(root.dataset.name)} »</p><small class="err">${esc(err.message)}</small>`
          + '<button type="button" class="dx-btn" data-retry>Réessayer</button></div>';
        syncEl.innerHTML = `<span class="err">${esc(err.message)}</span>`;
      } else syncEl.insertAdjacentHTML('beforeend', `<br><span class="err">${esc(err.message)}</span>`);
    } finally {
      btn.classList.remove('spin');
    }
  }

  // ---------- tree (left) ----------
  const kindIcon = (f) => I[f.k] || I.bin;
  function renderTree() {
    const q = norm(filter.value.trim());
    if (q) {
      const hits = T.files.filter((f) => norm(f.p).includes(q));
      treeEl.innerHTML = `<p class="cv-h">Résultats<span>${fmtNum(hits.length)}</span></p><ul class="cv-tree">${hits.slice(0, 400).map((f) => fileRow(f, true)).join('')}</ul>`
        + (hits.length > 400 ? '<p class="dx-more">Affine le filtre pour voir les autres.</p>' : '');
    } else {
      treeEl.innerHTML = `<p class="cv-h">Dépôt<span>${fmtNum(T.files.length)}</span></p><ul class="cv-tree">${dirItems('')}</ul>`;
    }
    markCurrent();
  }
  function fileRow(f, full) {
    return `<li><button type="button" class="cv-row" data-file="${esc(f.p)}" title="${esc(f.p)} · ${fmtSize(f.s)}">${kindIcon(f)}<span class="lbl">${esc(full ? f.p : base(f.p))}</span></button></li>`;
  }
  const sortedDirs = (d) => [...d.dirs].sort((a, b) => base(a).localeCompare(base(b), 'fr'));
  const sortedFiles = (d) => d.files.slice().sort((a, b) => base(a.p).localeCompare(base(b.p), 'fr', { numeric: true }));
  function dirItems(path) {
    const d = dirs.get(path);
    let out = '';
    for (const sub of sortedDirs(d)) {
      const x = dirs.get(sub);
      const open = opened.has(sub);
      out += `<li><button type="button" class="cv-row dir" data-dir="${esc(sub)}" aria-expanded="${open}">${I.chev.replace('class="ic"', 'class="ic chev"')}<span class="lbl">${esc(x.name)}</span><span class="n">${x.n}</span></button>`
        + `<ul class="cv-tree"${open ? '' : ' hidden'}>${open ? dirItems(sub) : ''}</ul></li>`;
    }
    for (const f of sortedFiles(d)) out += fileRow(f, false);
    return out;
  }
  function markCurrent() {
    const h = state();
    for (const b of treeEl.querySelectorAll('[aria-current]')) b.removeAttribute('aria-current');
    const sel = h.f ? `[data-file="${CSS.escape(h.f)}"]` : h.d ? `[data-dir="${CSS.escape(h.d)}"]` : null;
    const el = sel && treeEl.querySelector(sel);
    if (el) el.setAttribute('aria-current', 'true');
  }
  function expandTo(path) {
    let changed = false;
    for (let p = path; p; p = parent(p)) if (!opened.has(p)) { opened.add(p); changed = true; }
    if (changed && !filter.value.trim()) renderTree();
  }
  treeEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.dir != null) {
      const p = b.dataset.dir;
      const open = b.getAttribute('aria-expanded') !== 'true';
      if (open) opened.add(p); else opened.delete(p);
      b.setAttribute('aria-expanded', String(open));
      const ul = b.nextElementSibling;
      if (open && !ul.innerHTML) ul.innerHTML = dirItems(p);
      ul.hidden = !open;
      go({ d: p });
    } else if (b.dataset.file) {
      go({ f: b.dataset.file });
      if (nav) nav.checked = false;
    }
  });
  let filterTimer = 0;
  filter.addEventListener('input', () => { clearTimeout(filterTimer); filterTimer = setTimeout(() => { renderTree(); if (!state().f) route(); }, 120); });

  // ---------- address: #d=<folder> or #f=<file> ----------
  function state() {
    const h = new URLSearchParams(location.hash.slice(1));
    return { d: h.get('d') || '', f: h.get('f') || '' };
  }
  function go(s) {
    const h = s.f ? `#f=${encodeURIComponent(s.f)}` : s.d ? `#d=${encodeURIComponent(s.d)}` : '#';
    if (location.hash !== h && !(h === '#' && !location.hash)) history.pushState(null, '', h === '#' ? location.pathname + location.search : h);
    route();
  }
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);

  function route() {
    if (!T) return;
    const s = state();
    if (s.f && byPath.has(s.f)) { expandTo(parent(s.f)); showFile(byPath.get(s.f)); } else showDir(dirs.has(s.d) ? s.d : '');
    markCurrent();
  }

  function renderCrumbs(path, file) {
    const parts = path ? path.split('/') : [];
    let acc = '';
    let out = `<button type="button" data-go="">${esc(root.dataset.name)}</button>`;
    for (const p of parts) { acc = acc ? `${acc}/${p}` : p; out += `${I.chev}<button type="button" data-go="${esc(acc)}">${esc(p)}</button>`; }
    if (file) out += `${I.chev}<span aria-current="page">${esc(base(file.p))}</span>`;
    crumbs.innerHTML = out;
  }
  crumbs.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go({ d: b.dataset.go }); });

  // ---------- gallery of a folder ----------
  let current = null; // { kind: 'dir'|'file', ... }
  function listing(path) {
    const q = norm(filter.value.trim());
    if (q) return { subs: [], files: T.files.filter((f) => norm(f.p).includes(q)).slice(0, 400) };
    const d = dirs.get(path);
    return { subs: sortedDirs(d).map((p) => dirs.get(p)), files: sortedFiles(d) };
  }
  function tile(f) {
    const inner = f.k === 'img' && f.s <= THUMB_MAX
      ? `<img src="${esc(rawUrl(f))}" alt="" loading="lazy" decoding="async">`
      : `<span class="dx-ph">${kindIcon(f)}<b>${esc(extOf(f.p) || 'fichier')}</b>${f.k === 'img' ? `<small>${fmtSize(f.s)}, aperçu au clic</small>` : ''}</span>`;
    return `<li><button type="button" class="dx-tile" data-file="${esc(f.p)}" title="${esc(f.p)}"><span class="dx-thumb">${inner}</span><span class="dx-cap"><span>${esc(base(f.p))}</span><small>${fmtSize(f.s)}</small></span></button></li>`;
  }
  function showDir(path) {
    current = { kind: 'dir', path };
    renderCrumbs(path);
    gh.href = ghUrl(path, true);
    const { subs, files } = listing(path);
    const q = filter.value.trim();
    let out = '';
    if (mode === 'grid') {
      out += `<ul class="dx-grid">${subs.map((d) => `<li><button type="button" class="dx-tile dx-dir" data-dir="${esc(d.path)}"><span class="dx-thumb">${I.dir}</span><span class="dx-cap"><span>${esc(d.name)}</span><small>${fmtNum(d.n)} fichiers · ${fmtSize(d.bytes)}</small></span></button></li>`).join('')}`
        + `${files.map(tile).join('')}</ul>`;
    } else {
      const row = (attr, icon, name, size, kind) => `<tr><td><button type="button" class="dx-lrow" ${attr}>${icon}<span>${esc(name)}</span></button></td><td>${size}</td><td>${kind}</td></tr>`;
      out += `<div class="tbl dx-table"><table><thead><tr><th>Nom</th><th>Taille</th><th>Type</th></tr></thead><tbody>${
        subs.map((d) => row(`data-dir="${esc(d.path)}"`, I.dir, d.name, `${fmtNum(d.n)} fichiers`, 'dossier')).join('')
      }${files.map((f) => row(`data-file="${esc(f.p)}"`, kindIcon(f), q ? f.p : base(f.p), fmtSize(f.s), esc(extOf(f.p) || '—'))).join('')}</tbody></table></div>`;
    }
    if (!subs.length && !files.length) out = `<p class="dx-empty">${q ? 'Aucun fichier ne correspond au filtre.' : 'Dossier vide.'}</p>`;
    body.innerHTML = `<div class="dx-scroll">${out}</div>`;
    for (const img of body.querySelectorAll('.dx-thumb img')) img.addEventListener('error', () => { img.replaceWith(Object.assign(document.createElement('span'), { className: 'dx-ph', textContent: 'Aperçu impossible' })); }, { once: true });
  }
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dir],[data-file],[data-retry],[data-nav],[data-zoom]');
    if (!b) return;
    if (b.dataset.retry != null) { body.innerHTML = '<div class="dx-msg"><p>Lecture…</p></div>'; load(true); return; }
    if (b.dataset.nav) { step(Number(b.dataset.nav)); return; }
    if (b.dataset.zoom != null) { b.classList.toggle('real'); return; }
    if (b.dataset.dir != null) go({ d: b.dataset.dir }); else go({ f: b.dataset.file });
  });
  for (const b of root.querySelectorAll('[data-mode]')) {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    b.addEventListener('click', () => {
      mode = b.dataset.mode;
      for (const x of root.querySelectorAll('[data-mode]')) x.setAttribute('aria-pressed', String(x === b));
      try { localStorage.setItem('rago.cerveau.fichiers.mode', mode); } catch { /* private window */ }
      if (current?.kind === 'dir') showDir(current.path); else go({ d: current ? parent(current.file.p) : '' });
    });
  }

  // ---------- one file ----------
  let textAbort = null;
  function siblings(f) { return sortedFiles(dirs.get(parent(f.p))); }
  function step(dir) {
    if (current?.kind !== 'file') return;
    const list = siblings(current.file);
    const i = list.indexOf(current.file);
    const next = list[(i + dir + list.length) % list.length];
    if (next && next !== current.file) go({ f: next.p });
  }
  function showFile(f) {
    current = { kind: 'file', file: f };
    renderCrumbs(parent(f.p), f);
    gh.href = ghUrl(f.p, false);
    textAbort?.abort();
    const list = siblings(f);
    const pos = list.indexOf(f);
    const tooBig = f.s > maxFile;
    const head = `<div class="dx-fbar"><button type="button" class="cv-ibtn" data-dir="${esc(parent(f.p))}" aria-label="Retour au dossier (Échap)" title="Retour au dossier (Échap)">${I.x}</button>`
      + `<div class="dx-fname"><b>${esc(base(f.p))}</b><small>${fmtSize(f.s)} · ${pos + 1} / ${list.length}</small></div>`
      + (list.length > 1 ? `<button type="button" class="cv-ibtn" data-nav="-1" aria-label="Fichier précédent (←)">${I.left}</button><button type="button" class="cv-ibtn" data-nav="1" aria-label="Fichier suivant (→)">${I.right}</button>` : '')
      + (tooBig ? '' : `<a class="cv-ibtn" href="${esc(rawUrl(f))}" download="${esc(base(f.p))}" title="Télécharger">${I.down}</a>`)
      + '</div>';
    let view;
    if (tooBig) {
      view = `<div class="dx-msg"><p>Fichier trop gros pour être ouvert ici (${fmtSize(f.s)}, plus de ${Math.round(maxFile / 1048576)} Mo).</p><a class="dx-btn" href="${esc(ghUrl(f.p, false))}" target="_blank" rel="noopener noreferrer">${I.ext}Ouvrir sur GitHub</a></div>`;
    } else if (f.k === 'img') {
      view = `<button type="button" class="dx-img" data-zoom title="Clic : taille réelle / ajusté"><img src="${esc(rawUrl(f))}" alt="${esc(base(f.p))}" decoding="async"></button>`;
    } else if (f.k === 'txt' && f.s <= TEXT_MAX) {
      view = '<div class="dx-text"><p class="dx-empty">Lecture…</p></div>';
    } else {
      view = `<div class="dx-msg"><p>${f.k === 'txt' ? 'Fichier texte trop long pour l’aperçu' : 'Pas d’aperçu pour ce type de fichier'} (${esc(extOf(f.p) || 'sans extension')}, ${fmtSize(f.s)}).</p>`
        + `<div class="dx-btns"><a class="dx-btn" href="${esc(rawUrl(f))}" download="${esc(base(f.p))}">${I.down}Télécharger</a><a class="dx-btn" href="${esc(ghUrl(f.p, false))}" target="_blank" rel="noopener noreferrer">${I.ext}GitHub</a></div></div>`;
    }
    body.innerHTML = `<div class="dx-file">${head}<div class="dx-view">${view}</div></div>`;
    const img = body.querySelector('.dx-img img');
    if (img) img.addEventListener('error', () => { body.querySelector('.dx-view').innerHTML = `<div class="dx-msg"><p>Image impossible à charger.</p><a class="dx-btn" href="${esc(ghUrl(f.p, false))}" target="_blank" rel="noopener noreferrer">${I.ext}Ouvrir sur GitHub</a></div>`; }, { once: true });
    if (f.k === 'txt' && f.s <= TEXT_MAX && !tooBig) loadText(f);
  }
  async function loadText(f) {
    const ctrl = new AbortController();
    textAbort = ctrl;
    const box = body.querySelector('.dx-text');
    try {
      const res = await fetch(rawUrl(f), { signal: ctrl.signal, credentials: 'same-origin' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`);
      const text = await res.text();
      if (ctrl.signal.aborted) return;
      const lines = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
      box.innerHTML = `<pre class="cv-code dx-code" data-lang="${esc(extOf(f.p))}"><code>${lines.map((l) => `<span class="l">${esc(l) || ' '}</span>`).join('')}</code></pre>`;
    } catch (err) {
      if (err.name !== 'AbortError') box.innerHTML = `<p class="dx-empty err">${esc(err.message)}</p>`;
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (current?.kind !== 'file') return;
    if (e.key === 'Escape') go({ d: parent(current.file.p) });
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });
  $('#dx-refresh').addEventListener('click', () => load(true));
  load(false);
})();
