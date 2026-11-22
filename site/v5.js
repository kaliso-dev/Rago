/* Rago Optimizer, design v5 "Match day": the motion shared by every page (Sofiene, 22/11/2026: "il faut que ça bouge,
   qu'il y ait des animations au scroll"). Loaded with `defer` after v5.css; build.py adds ?v=<hash>.
   Everything here is extra: with JavaScript off, or with "reduce motion" on, the pages show as they are.
   It only uses the `translate`, `scale`, `rotate`, `opacity` and `clip-path` properties, so the pages' own `transform`
   (hovers, the .rv reveal of the home page) keeps working. */
(() => {
  "use strict";
  const doc = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  doc.classList.add("mo");
  const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* 1. Titles: each line rises out of a mask, the red brush wipes in behind the last word */
  const HEADS = "h1, .s-h2, .s-final h2, .final h2, .r5-hero h1, .sm-hero h1, .lg-hero h1, .nf h1";
  const splitLines = h => {
    if (h.dataset.mo) return; h.dataset.mo = "h";
    const kids = Array.from(h.childNodes);
    const blockKids = kids.filter(n => n.nodeType === 1 && getComputedStyle(n).display === "block");
    let lines;
    if (blockKids.length && blockKids.length === kids.filter(n => n.nodeType === 1 || n.textContent.trim()).length) lines = blockKids.map(n => [n]);
    else { lines = [[]]; kids.forEach(n => n.nodeName === "BR" ? lines.push([]) : lines[lines.length - 1].push(n)); }
    h.textContent = "";
    lines.forEach((nodes, i) => {
      if (!nodes.some(n => n.nodeType === 1 || n.textContent.trim())) return;
      const ln = document.createElement("span"); ln.className = "mo-ln"; ln.style.setProperty("--i", i);
      const inner = document.createElement("span"); inner.className = "mo-li";
      nodes.forEach(n => inner.appendChild(n)); ln.appendChild(inner); h.appendChild(ln);
    });
    h.classList.add("mo-h");
  };

  /* 2. Blocks that come in one after the other when they reach the screen */
  const ITEMS = [
    ".s-eb", ".s-lead", ".s-head > p", ".s-head .s-link", ".s-card", ".s-how > li", ".s-acts", ".s-fin", ".s-more",
    ".rv", ".pt-c", ".sm-rv:not(.sk)", ".r5-f", ".r5-t", ".r5-g", ".pc", ".grp-h", ".band", ".final p", ".final .acts",
    ".lg-hero p", ".lg-toc", ".lg-glance > *", ".lg-sec", ".s-q", ".faq > *", ".nums > *", ".steps > *"
  ].join(",");
  const seen = new WeakSet();
  let batch = [], flushT = 0;
  const flush = () => {
    batch.sort((a, b) => { const r = a.getBoundingClientRect(), s = b.getBoundingClientRect(); return r.top - s.top || r.left - s.left; });
    batch.forEach((el, i) => { el.style.setProperty("--d", Math.min(i, 8) * 70 + "ms"); el.classList.add("in"); });
    batch = [];
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target); batch.push(e.target);
    clearTimeout(flushT); flushT = setTimeout(flush, 16);
  }), { rootMargin: "0px 0px -7% 0px" });
  const prep = el => {
    if (seen.has(el) || el.closest("[hidden], .dlg, .menu, .sheet, #toast, .s-toast, .toast, dialog")) return;
    if (el.parentElement && el.parentElement.closest(".s-card, .pt-c, .sm-rv, .pc, .r5-f, .r5-t, .r5-g")) return; // the card moves, not its parts
    seen.add(el);
    if (el.matches(".rv")) { el.classList.remove("pre"); if (el.querySelector(ITEMS + "," + HEADS)) return; } // its parts move instead
    if (el.matches(HEADS)) splitLines(el); else el.classList.add("mo-b");
    if (el.querySelector(":scope > .vis, :scope > .s-dcv")) el.classList.add("mo-v");
    io.observe(el);
  };
  const scan = (root = document) => { $$(HEADS, root).forEach(prep); $$(ITEMS, root).forEach(prep); };
  scan();
  /* blocks the pages fill later (reviews, FAQ, partners, unhidden sections) join in */
  new MutationObserver(ms => ms.forEach(m => {
    if (m.type === "attributes") { if (!m.target.hidden) scan(m.target); return; }
    m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches(HEADS + "," + ITEMS) ? prep(n) : scan(n)));
  })).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

  /* 3. Numbers count up the first time they show (only plain numbers written in the HTML) */
  const COUNT = ".s-shot .pill b, .s-shot .pill small b, .bx b.big, .bx .big b, [data-count]";
  $$(COUNT).forEach(el => {
    const t = el.firstChild; if (!t || t.nodeType !== 3) return;
    const m = t.textContent.match(/^(\s*)(\d+(?:\.\d+)?)(.*)$/s); if (!m) return;
    const end = parseFloat(m[2]), dec = (m[2].split(".")[1] || "").length;
    const o = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; o.disconnect();
      const t0 = performance.now(), D = 1100;
      const step = now => { const k = Math.min(1, (now - t0) / D), v = end * (1 - Math.pow(1 - k, 3)); t.textContent = m[1] + v.toFixed(dec) + m[3]; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: .6 });
    o.observe(el);
  });

  /* 4. Red bars that scroll forever (hero ticker), faster while the page scrolls */
  const tracks = $$(".s-tick > div").map(row => {
    const w = row.scrollWidth; row.innerHTML += row.innerHTML; row.classList.add("mo-run");
    return { row, w, x: 0 };
  });

  /* 5. Scroll-linked: progress line, hero parallax, final "RAGO" drift, ticker speed */
  const bar = document.createElement("i"); bar.className = "mo-bar"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar);
  const shot = document.querySelector(".s-shot img.sc, .r5-hero .vis, .hero .shot");
  const bigs = $$(".s-final .big, .final .big");
  let lastY = scrollY, vel = 0, last = performance.now();
  const frame = now => {
    const dt = Math.min(64, now - last); last = now;
    const y = scrollY, dy = y - lastY; lastY = y;
    vel += (Math.abs(dy) / Math.max(dt, 1) - vel) * .12;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    bar.style.scale = (y / max).toFixed(4) + " 1";
    if (shot && y < innerHeight * 1.5) shot.style.translate = `0 ${(y * .12).toFixed(1)}px`;
    bigs.forEach(b => { const r = b.parentElement.getBoundingClientRect(); const p = 1 - (r.top + r.height) / (innerHeight + r.height); b.style.translate = `${((p - .5) * -260).toFixed(1)}px 0`; });
    tracks.forEach(t => { t.x -= (0.045 + Math.min(vel, 6) * .35) * dt; if (-t.x >= t.w) t.x += t.w; t.row.style.translate = `${t.x.toFixed(1)}px 0`; });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* 6. Pointer: a red glow follows the mouse on cards, big buttons lean toward it */
  if (fine) {
    addEventListener("pointermove", e => {
      const c = e.target.closest && e.target.closest(".s-card, .pt-c, .r5-f, .pc");
      if (c && c.dataset.glow === undefined) c.dataset.glow = getComputedStyle(c).backgroundImage === "none" ? "1" : "";
      if (c && c.dataset.glow) { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%"); c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%"); c.classList.add("mo-hot"); }
    }, { passive: true });
    document.addEventListener("pointerout", e => { const c = e.target.closest && e.target.closest(".mo-hot"); if (c && !c.contains(e.relatedTarget)) c.classList.remove("mo-hot"); });
    $$(".btn.lg, .btn.xl").forEach(b => {
      b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); b.style.translate = `${((e.clientX - r.left - r.width / 2) * .18).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * .3).toFixed(1)}px`; });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    });
  }
})();
