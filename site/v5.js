/* Rago Optimizer, design v5 "Match day": the motion shared by every page (Sofiene, 22/11/2026: "il faut que ça bouge,
   qu'il y ait des animations au scroll"). Loaded with `defer` after v5.css; build.py adds ?v=<hash>.
   Everything here is extra: with JavaScript off, or with "reduce motion" on, the pages show as they are.
   It only uses the `translate`, `scale`, `rotate`, `opacity` and `clip-path` properties, so the pages' own `transform`
   (hovers, the .rv reveal of the home page) keeps working. */
(() => {
  "use strict";
  const doc = document.documentElement;
  /* --k: how big this screen is next to the 1440-wide mockups, the height counted against 1000 so that a section fits one
     screen with the header (titles, hero and illustrations follow it; v5.css) */
  const fitK = () => doc.style.setProperty("--k", Math.max(.78, Math.min(1.45, innerWidth / 1440, innerHeight / 1000)).toFixed(3));
  fitK(); addEventListener("resize", fitK, { passive: true });
  if (document.querySelector("main.x")) return; // site v6: its own motion, below
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
    batch.forEach((el, i) => { el.style.setProperty("--d", Math.min(i, 8) * 70 + "ms"); el.classList.add("mo-in"); }); // not "in": .s-final .in is a layout class
    batch = [];
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target); batch.push(e.target);
    clearTimeout(flushT); flushT = setTimeout(flush, 16);
  }), { rootMargin: "0px 0px -7% 0px" });
  const prep = el => {
    if (seen.has(el) || el.closest("[hidden], .dlg, .menu, .sheet, #toast, .toast, dialog")) return;
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
  /* "Now Rago plays with you" (home): on a computer screen the section stays put and its cards slide sideways */
  const hs = document.querySelector("#new"), hsWrap = hs && hs.querySelector(":scope > .sw5"), hsTrack = hs && hs.querySelector(".s-bento");
  let hsDist = 0, hsBar = null;
  if (hsTrack) {
    const bw = document.createElement("div"); bw.className = "hs-bar"; bw.setAttribute("aria-hidden", "true"); bw.innerHTML = "<i></i>";
    hsTrack.after(bw); hsBar = bw.firstChild;
    const setup = () => {
      const on = innerWidth >= 1081 && innerHeight >= 640;
      hs.classList.toggle("hs-on", on);
      if (!on) { hs.style.height = ""; hsTrack.style.translate = ""; hsDist = 0; return; }
      hsDist = Math.max(0, hsTrack.scrollWidth - hsWrap.clientWidth);
      hs.style.height = (innerHeight + hsDist) + "px";
    };
    setup(); addEventListener("resize", setup, { passive: true }); addEventListener("load", setup);
  }
  let lastY = scrollY, vel = 0, last = performance.now();
  const frame = now => {
    const dt = Math.min(64, now - last); last = now;
    const y = scrollY, dy = y - lastY; lastY = y;
    vel += (Math.abs(dy) / Math.max(dt, 1) - vel) * .12;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    bar.style.scale = (y / max).toFixed(4) + " 1";
    if (shot && y < innerHeight * 1.5) shot.style.translate = `0 ${(y * .12).toFixed(1)}px`;
    bigs.forEach(b => { const r = b.parentElement.getBoundingClientRect(); const p = 1 - (r.top + r.height) / (innerHeight + r.height); b.style.translate = `${((p - .5) * -260).toFixed(1)}px 0`; });
    if (hsDist) { const p = Math.max(0, Math.min(1, -hs.getBoundingClientRect().top / hsDist)); hsTrack.style.translate = `${(-p * hsDist).toFixed(1)}px 0`; hsBar.style.scale = `${p.toFixed(4)} 1`; }
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

/* Site v6 (23/11/2026), pages whose <main> has the class "x": the motion of the new design, written for Rago from the
   structure of the reference site Sofiene chose (loader with a counter, titles that appear letter by letter, header that hides
   while scrolling down, round menu button with the reading progress, smooth wheel scrolling, banners that scroll forever,
   a bubble that follows the mouse over some cards, grain over the whole page). The page itself (src/page.html) adds its
   pinned sections on top, with X.pin and X.split.
   With "reduce motion" on: no loader, no smooth scrolling, everything shows as it is; the menu and the header still work. */
(() => {
  "use strict";
  const main = document.querySelector("main.x");
  if (!main) return;
  const doc = document.documentElement, $ = (q, r = document) => r.querySelector(q), $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const X = window.X = { reduce, fine, clamp, $, $$ };
  doc.classList.add("x-on");
  if (reduce) doc.classList.add("x-still");

  /* ---------- 1. Letters: split a text into words and letters, read once by screen readers ---------- */
  X.split = (el, cls = "x-ch") => {
    if (!el || el.dataset.split) return el ? $$("." + cls, el) : [];
    el.dataset.split = "1";
    const label = el.textContent.replace(/\s+/g, " ").trim();
    const vis = document.createElement("span"); vis.className = "x-vis"; vis.setAttribute("aria-hidden", "true");
    const walk = (node, into) => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { into.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "x-w";
            Array.from(part).forEach(c => { const s = document.createElement("span"); s.className = cls; s.textContent = c; w.appendChild(s); });
            into.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          if (n.nodeName === "BR" || n.matches("img, svg, .x-keep")) { into.appendChild(n.cloneNode(true)); return; }
          const c = n.cloneNode(false); c.removeAttribute("id"); into.appendChild(c); walk(n, c);
        }
      });
    };
    walk(el, vis);
    const sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = label;
    el.textContent = ""; el.append(sr, vis);
    return $$("." + cls, el);
  };
  /* the spread of a letter reveal: 15 ms a letter, at most 1.2 s for the whole text */
  X.spread = n => Math.min(.015 * n, 1.2);
  X.stagger = (els, prop = "--d") => { const n = els.length, a = X.spread(n); els.forEach((e, i) => e.style.setProperty(prop, (n > 1 ? i / (n - 1) * a : 0).toFixed(3) + "s")); };
  /* run fn once el is above `at` (0..1 of the screen height) */
  X.when = (el, fn, at = .85) => {
    if (!el) return;
    if (!("IntersectionObserver" in window)) return fn();
    const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { o.disconnect(); fn(); } }, { rootMargin: `0px 0px -${Math.round((1 - at) * 100)}% 0px` });
    o.observe(el);
  };

  /* ---------- 2. Reveals on scroll ---------- */
  const reveal = () => {
    if (reduce) return;
    // titles and texts marked data-x="chars": their letters fade in one after the other
    $$('[data-x="chars"]').forEach(el => {
      if (el.closest("[data-x-own]")) return;
      const ch = X.split(el); X.stagger(ch); el.classList.add("x-pre");
      X.when(el, () => el.classList.add("x-go"), el.dataset.at ? +el.dataset.at : .85);
    });
    // blocks marked data-x="up": rise and fade in, one after the other when several arrive together
    let batch = [], t = 0;
    const flush = () => { batch.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left); batch.forEach((el, i) => { el.style.setProperty("--d", (Math.min(i, 6) * .09).toFixed(2) + "s"); el.classList.add("x-go"); }); batch = []; };
    $$('[data-x="up"], [data-x="pop"], .x-btn[data-x="btn"]').forEach(el => {
      if (el.closest("[data-x-own]")) return;
      el.classList.add("x-pre");
      X.when(el, () => { batch.push(el); clearTimeout(t); t = setTimeout(flush, 16); }, el.matches(".x-btn") ? .78 : .9);
    });
    // lists: their items rise one after the other
    $$('[data-x="list"]').forEach(el => {
      const li = $$(":scope > *", el); li.forEach((e, i) => e.style.setProperty("--d", (i * .06).toFixed(2) + "s")); el.classList.add("x-pre");
      X.when(el, () => el.classList.add("x-go"), .95);
    });
  };

  /* ---------- 3. Buttons: the label rolls up, the fill rises from the bottom ---------- */
  $$(".x-btn, .x-hd-cta").forEach(b => {
    const l = b.querySelector(".x-bl");
    if (l && !l.querySelector(".x-bt")) { const t = l.innerHTML; l.innerHTML = `<span class="x-bt">${t}</span><span class="x-bt" aria-hidden="true">${t}</span>`; }
  });

  /* ---------- 4. Header: hides while scrolling down, comes back up ---------- */
  const hd = $(".x-hd");
  let lastY = scrollY;
  const header = () => {
    if (!hd) return;
    const y = scrollY, d = y - lastY;
    if (y <= 40) { hd.classList.add("x-top"); hd.classList.remove("x-hide"); }
    else { hd.classList.remove("x-top"); if (!reduce && d > 4 && !doc.classList.contains("x-nav-open")) hd.classList.add("x-hide"); else if (d < -4) hd.classList.remove("x-hide"); }
    // over a light section (data-light), the header turns dark
    const light = $$("[data-light]").some(s => { const r = s.getBoundingClientRect(); return r.top < 60 && r.bottom > 20; });
    hd.classList.toggle("x-on-light", light);
    lastY = y;
  };

  /* ---------- 5. Menu: round button at the bottom left, its ring shows how far the page is read ---------- */
  const nav = $(".x-nav"), navBtn = nav && $(".x-nav-b", nav), panel = nav && $(".x-nav-p", nav), ring = nav && $(".x-nav-pr", nav);
  const RING = 2 * Math.PI * 25;
  let links = [];
  if (nav) {
    links = $$("a[href^='#']", panel).map(a => ({ a, el: document.querySelector(a.getAttribute("href")) })).filter(l => l.el);
    ring.style.strokeDasharray = RING; ring.style.strokeDashoffset = RING;
    let back = null;
    const set = open => {
      nav.classList.toggle("x-open", open); doc.classList.toggle("x-nav-open", open);
      panel.hidden = false; panel.setAttribute("aria-hidden", !open); panel.inert = !open;
      navBtn.setAttribute("aria-expanded", open); navBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) {
        back = document.activeElement;
        if (!reduce) $$(".x-nav-l > li", panel).forEach((li, i) => li.animate([{ transform: "translateY(12px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, delay: 260 + i * 40, easing: "cubic-bezier(.25,.46,.45,.94)", fill: "backwards" }));
      } else if (nav.contains(document.activeElement)) back && back.focus && back.focus({ preventScroll: true });
    };
    X.navOpen = () => nav.classList.contains("x-open");
    X.navSet = set;
    panel.inert = true;
    navBtn.addEventListener("click", () => set(!nav.classList.contains("x-open")));
    $$("a", panel).forEach(a => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("x-open")) { set(false); navBtn.focus(); } });
    document.addEventListener("pointerdown", e => { if (nav.classList.contains("x-open") && !nav.contains(e.target)) set(false); });
  }
  const navTrack = () => {
    if (!nav) return;
    const max = doc.scrollHeight - innerHeight, p = max > 0 ? clamp(scrollY / max) : 0;
    ring.style.strokeDashoffset = (RING * (1 - p)).toFixed(2);
    let cur = links[0];
    links.forEach(l => { if (!l.el.hidden && l.el.getBoundingClientRect().top <= innerHeight * .35) cur = l; });
    links.forEach(l => l.a.classList.toggle("x-act", l === cur));
  };

  /* ---------- 6. Smooth wheel scrolling (the page glides to where the wheel sends it) ---------- */
  let sTarget = scrollY, sCur = scrollY, sRun = false, sAnim = null;
  const maxY = () => doc.scrollHeight - innerHeight;
  const scrollable = el => {
    for (let n = el; n && n !== document.body && n !== doc; n = n.parentElement) {
      if (n.matches && n.matches(".dlg, [data-native-scroll]")) return true;
      const s = getComputedStyle(n); if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) return true;
    }
    return false;
  };
  if (!reduce && fine) {
    doc.classList.add("x-smooth");
    addEventListener("wheel", e => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY) || doc.classList.contains("x-lock") || scrollable(e.target)) return;
      e.preventDefault();
      if (!sRun) sTarget = sCur = scrollY;
      sAnim = null;
      sTarget = clamp(sTarget + e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1), 0, maxY());
      sRun = true;
    }, { passive: false });
    addEventListener("scroll", () => { if (!sRun) sTarget = sCur = scrollY; }, { passive: true });
    addEventListener("keydown", () => { sRun = false; sAnim = null; });
  }
  const ease3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  X.scrollTo = (y, dur = 1.4) => {
    y = clamp(y, 0, maxY());
    if (reduce) { scrollTo(0, y); return; }
    doc.classList.add("x-smooth");
    sAnim = { from: scrollY, to: y, t0: performance.now(), dur: dur * 1000 }; sRun = true; sCur = scrollY;
  };
  /* links to a section of the page glide there */
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute("href"); if (id.length < 2) return;
    const el = document.querySelector(id); if (!el) return;
    e.preventDefault();
    const top = id === "#home" || id === "#top" ? 0 : el.getBoundingClientRect().top + scrollY - (+a.dataset.offset || 0);
    X.scrollTo(top, Math.min(2.2, .9 + Math.abs(top - scrollY) / 6000));
    history.replaceState(null, "", id === "#home" ? location.pathname + location.search : id);
  });
  const smooth = (now, dt) => {
    if (!sRun) return;
    if (sAnim) {
      const k = clamp((now - sAnim.t0) / sAnim.dur); sCur = sAnim.from + (sAnim.to - sAnim.from) * ease3(k);
      if (k >= 1) { sRun = false; sAnim = null; sTarget = sCur; }
    } else {
      sCur += (sTarget - sCur) * (1 - Math.exp(-dt / 105));
      if (Math.abs(sTarget - sCur) < .5) { sCur = sTarget; sRun = false; }
    }
    scrollTo(0, sCur);
  };

  /* ---------- 7. Banners that scroll forever: .x-mq > .x-mq-in, data-speed (px/s), data-boost (with the scroll) ---------- */
  const mqs = [];
  X.marquee = el => {
    if (el.dataset.mq || reduce) return;
    const inner = $(".x-mq-in", el); if (!inner) return;
    el.dataset.mq = "1";
    // enough copies to cover the strip twice over, however few items it has
    const parts = [inner], n = Math.max(1, Math.ceil((el.clientWidth || innerWidth) / Math.max(1, inner.scrollWidth)));
    for (let k = 0; k < n; k++) { const copy = inner.cloneNode(true); copy.setAttribute("aria-hidden", "true"); $$("a, button", copy).forEach(a => a.tabIndex = -1); $$("[id]", copy).forEach(a => a.removeAttribute("id")); el.appendChild(copy); parts.push(copy); }
    const m = { el, parts, speed: +el.dataset.speed || 60, dir: el.dataset.dir === "right" ? 1 : -1, boost: +el.dataset.boost || 0, x: 0, v: 0, on: false, hold: false };
    if (m.dir === 1) m.x = -inner.scrollWidth;
    if (el.dataset.hover !== undefined && fine) { el.addEventListener("mouseenter", () => m.hold = true); el.addEventListener("mouseleave", () => m.hold = false); }
    new IntersectionObserver(([e]) => m.on = e.isIntersecting).observe(el);
    mqs.push(m);
  };
  let vScroll = 0, prevY = scrollY;
  const marquees = dt => {
    const s = dt / 1000, vy = clamp((scrollY - prevY) / Math.max(s, .001), -4000, 4000); prevY = scrollY;
    vScroll += (vy - vScroll) * (1 - Math.exp(-s / .38));
    mqs.forEach(m => {
      if (!m.on || m.hold) return;
      const w = m.parts[0].scrollWidth; if (!w) return;
      const extra = m.boost ? clamp(Math.abs(vScroll) * m.boost, 0, 3600) : 0;
      m.x += (m.speed + extra) * m.dir * Math.min(s, .05);
      m.x = ((m.x % w) + w) % w - w;
      m.parts.forEach(p => p.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0)`);
    });
  };

  /* ---------- 8. A bubble that follows the mouse over cards marked data-cur="text" ---------- */
  let cur = null, curEl = null, cx = 0, cy = 0, bx = 0, by = 0, curOn = false;
  if (fine && $$("[data-cur]").length) {
    cur = document.createElement("span"); cur.className = "x-cur"; cur.setAttribute("aria-hidden", "true"); document.body.appendChild(cur);
    const show = (el, x, y) => {
      if (!curOn) { bx = x; by = y; }
      curEl = el; curOn = true; cur.dataset.face = el.dataset.face || "";
      const ic = el.dataset.curI; cur.textContent = "";
      if (ic) { const NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg"), u = document.createElementNS(NS, "use"); s.setAttribute("class", "i"); s.setAttribute("aria-hidden", "true"); u.setAttribute("href", "#" + ic); s.appendChild(u); cur.appendChild(s); }
      else cur.textContent = el.dataset.cur;
      cur.toggleAttribute("data-icon", !!ic); cur.classList.add("x-in");
    };
    const hide = () => { curEl = null; curOn = false; cur.classList.remove("x-in"); };
    addEventListener("pointermove", e => { cx = e.clientX; cy = e.clientY; const el = e.target.closest && e.target.closest("[data-cur]"); if (el && el !== curEl) show(el, cx, cy); else if (!el && curEl) hide(); }, { passive: true });
    document.addEventListener("pointerleave", hide);
    addEventListener("scroll", () => { if (!curOn) return; const el = document.elementFromPoint(cx, cy); const c = el && el.closest("[data-cur]"); if (!c) hide(); else if (c !== curEl) show(c, cx, cy); }, { passive: true });
    $$("[data-cur]").forEach(el => el.addEventListener("click", e => { if (e.target.closest("a, button, label, input")) return; const a = el.querySelector("[data-cur-go]"); a && a.click(); }));
  }
  const cursor = dt => { if (!cur || !curOn) return; const k = 1 - Math.exp(-dt / 90); bx += (cx - bx) * k; by += (cy - by) * k; cur.style.transform = `translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0) translate(-50%,-50%)`; };

  /* ---------- 9. Scroll rail on the right edge, shown while the page moves, can be dragged ---------- */
  let rail = null, thumb = null, railT = 0, thumbH = 48;
  if (fine) {
    rail = document.createElement("div"); rail.className = "x-rail"; rail.setAttribute("aria-hidden", "true");
    rail.innerHTML = '<i class="x-rail-t"></i><i class="x-rail-h"></i>'; document.body.appendChild(rail); thumb = rail.lastChild;
    let drag = false, off = 0;
    const toY = y => { const r = rail.getBoundingClientRect(); return clamp((y - r.top - off) / (r.height - thumbH)) * maxY(); };
    rail.addEventListener("pointerdown", e => { const tr = thumb.getBoundingClientRect(); off = e.clientY >= tr.top && e.clientY <= tr.bottom ? e.clientY - tr.top : thumbH / 2; drag = true; rail.setPointerCapture(e.pointerId); rail.classList.add("x-drag", "x-live"); sRun = false; scrollTo(0, toY(e.clientY)); e.preventDefault(); });
    rail.addEventListener("pointermove", e => drag && scrollTo(0, toY(e.clientY)));
    const up = () => { drag = false; rail.classList.remove("x-drag"); };
    rail.addEventListener("pointerup", up); rail.addEventListener("pointercancel", up);
    addEventListener("scroll", () => { rail.classList.add("x-live"); clearTimeout(railT); railT = setTimeout(() => rail.classList.remove("x-live"), 1100); }, { passive: true });
  }
  const railDraw = () => {
    if (!rail) return;
    const h = rail.clientHeight; thumbH = Math.max(48, Math.round(h * innerHeight / doc.scrollHeight));
    thumb.style.height = thumbH + "px"; thumb.style.transform = `translateY(${((h - thumbH) * clamp(scrollY / Math.max(1, maxY()))).toFixed(1)}px)`;
  };

  /* ---------- 10. Grain over the whole page, moving a little with the scroll ---------- */
  let grain = null;
  if (!reduce) {
    const cv = document.createElement("canvas"); cv.className = "x-grain"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv);
    const ctx = cv.getContext("2d"), tile = document.createElement("canvas"); tile.width = tile.height = 220;
    const tc = tile.getContext("2d"), img = tc.createImageData(220, 220), px = img.data;
    let seed = (Math.random() * 4294967296) >>> 0, w = 0, h = 0, last = 0, drift = scrollY;
    const fill = () => { for (let i = 0; i < px.length; i += 4) { seed = (1664525 * seed + 1013904223) >>> 0; const v = (seed / 4294967296 * 255) | 0; px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = (v * .35) | 0; } tc.putImageData(img, 0, 0); };
    const size = () => { const r = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; cv.width = w * r; cv.height = h * r; ctx.setTransform(r, 0, 0, r, 0, 0); };
    size(); fill(); addEventListener("resize", size, { passive: true });
    grain = now => {
      drift += (scrollY - drift) * .028;
      if (now - last > 70) { fill(); last = now; }
      const ox = (drift * .008 + now * .0019) % 220, oy = (drift * .007 + now * .0016) % 220;
      ctx.clearRect(0, 0, w, h); ctx.globalAlpha = .2;
      for (let y = -220; y < h + 220; y += 220) for (let x = -220; x < w + 220; x += 220) ctx.drawImage(tile, x - ox, y - oy, 220, 220);
      ctx.globalAlpha = 1;
    };
  }

  /* ---------- 11. Pinned sections: the section stays on screen while the page scrolls `len` pixels, fn(progress 0..1) ---------- */
  const pins = [];
  X.pin = (sec, { len, scrub = .5, update, when = () => true }) => {
    const p = { sec, len, scrub, update, when, raw: 0, cur: 0, on: false, d: 0 };
    const setup = () => {
      p.on = !reduce && when();
      sec.classList.toggle("x-pinned", p.on);
      if (!p.on) { sec.style.height = ""; p.d = 0; update(1, p); return; }
      p.d = Math.max(1, len()); sec.style.height = (innerHeight + p.d) + "px";
      p.raw = p.cur = clamp(-sec.getBoundingClientRect().top / p.d); update(p.cur, p);
    };
    p.setup = setup; pins.push(p); setup();
    return p;
  };
  let rw = innerWidth, rh = innerHeight, rT = 0;
  addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { if (innerWidth === rw && Math.abs(innerHeight - rh) < 120 && !fine) return; rw = innerWidth; rh = innerHeight; pins.forEach(p => p.setup()); }, 150); });
  addEventListener("load", () => pins.forEach(p => p.setup()));
  const pinTick = dt => pins.forEach(p => {
    if (!p.on) return;
    const r = p.sec.getBoundingClientRect();
    if (r.bottom < -innerHeight * .5 || r.top > innerHeight * 1.5) { if (p.cur !== (r.top > 0 ? 0 : 1)) { p.cur = p.raw = r.top > 0 ? 0 : 1; p.update(p.cur, p); } return; }
    p.raw = clamp(-r.top / p.d);
    const k = p.scrub ? 1 - Math.exp(-dt / (p.scrub * 1000 / 3)) : 1;
    const n = p.cur + (p.raw - p.cur) * k;
    if (Math.abs(n - p.cur) > 1e-5 || p.first !== true) { p.cur = Math.abs(p.raw - n) < 1e-4 ? p.raw : n; p.first = true; p.update(p.cur, p); }
  });
  /* scrubbed effects without a pin: fn(progress) while el crosses the screen from `a` to `b` (fractions of the screen height for its top) */
  const scrubs = [];
  X.scrub = (el, a, b, fn, scrub = .3) => { const s = { el, a, b, fn, scrub, cur: -1 }; scrubs.push(s); return s; };
  const scrubTick = dt => scrubs.forEach(s => {
    const r = s.el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) { const v = r.top > 0 ? 0 : 1; if (s.cur !== v) { s.cur = v; s.fn(v); } return; }
    const raw = clamp((innerHeight * s.a - r.top) / (innerHeight * (s.a - s.b)));
    const n = s.cur < 0 ? raw : s.cur + (raw - s.cur) * (1 - Math.exp(-dt / (s.scrub * 1000 / 3)));
    if (Math.abs(n - s.cur) > 1e-5) { s.cur = n; s.fn(n); }
  });
  /* other per-frame work of the page */
  const ticks = [];
  X.tick = fn => ticks.push(fn);

  /* ---------- 12. The loader, then the hero comes in ---------- */
  const ld = $(".x-ld");
  const done = () => { doc.classList.remove("has-ld", "x-ld-ready", "x-ld-fill", "x-ld-out"); ld && ld.remove(); document.dispatchEvent(new CustomEvent("x:loaded")); };
  const loader = () => {
    if (!ld || reduce || !doc.classList.contains("has-ld")) { done(); return; }
    clearTimeout(window.__xLdSafe);
    const gap = $(".x-ld-g", ld), cnt = $(".x-ld-n b", ld), shots = $$(".x-ld-sh", ld), cssMs = (n, d) => { const v = getComputedStyle(ld).getPropertyValue(n).trim(); return v.endsWith("ms") ? parseFloat(v) : v.endsWith("s") ? parseFloat(v) * 1000 : d; };
    const out3 = t => 1 - Math.pow(1 - t, 3);
    let val = 0, loaded = false, ending = false, finished = false, t0 = 0;
    const set = v => { val = v; cnt.textContent = Math.round(v); gap.style.setProperty("--gap", (v / 100 * Math.max(92, Math.min(innerWidth * .3, 420))).toFixed(1) + "px"); };
    const finish = () => {
      if (ending || finished) return; ending = true;
      const from = val, s0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - s0) / 420); set(from + (100 - from) * out3(k));
        if (k < 1) return requestAnimationFrame(step);
        finished = true;
        const r = gap.getBoundingClientRect(), sx = (innerWidth + innerHeight * .22) / Math.max(r.width, 1) * 1.06, sy = innerHeight / Math.max(r.height, 1) * 1.06; // the gap is skewed: wide enough to cover the corners
        doc.classList.add("x-ld-fill");
        setTimeout(() => { gap.style.transform = `scale(${sx.toFixed(3)},${sy.toFixed(3)})`; setTimeout(() => { doc.classList.add("x-ld-out"); document.dispatchEvent(new CustomEvent("x:lift")); setTimeout(done, cssMs("--lift", 620)); }, cssMs("--fill", 520)); }, cssMs("--hide", 180));
      };
      requestAnimationFrame(step);
    };
    const count = now => { if (ending) return; const k = Math.min(1, (now - t0) / 1100); set(Math.max(val, 92 * out3(k))); if (k >= 1 && loaded) finish(); else requestAnimationFrame(count); };
    set(0);
    const word = () => { requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.add("x-ld-ready"))); setTimeout(() => { t0 = performance.now(); requestAnimationFrame(count); }, 420); };
    if (shots.length) {
      const k = (shots[0].getBoundingClientRect().width || 230) / 230;   // the deck leans the same way whatever the cover's size
      shots.forEach((s, i) => {
        const a = (i % 2 ? 1 : -1);
        s.style.setProperty("--x", (a * k * (6 + Math.random() * 14)).toFixed(0) + "px"); s.style.setProperty("--y", (k * (Math.random() * 2 - 1) * 14).toFixed(0) + "px");
        s.style.setProperty("--r", ((Math.random() * 2 - 1) * 7).toFixed(1) + "deg"); s.style.setProperty("--or", (a * (8 + Math.random() * 6)).toFixed(1) + "deg");
        s.style.zIndex = i + 1; setTimeout(() => s.classList.add("x-in"), 150 * i);
      });
      setTimeout(() => {
        shots.slice().reverse().forEach((s, i) => setTimeout(() => s.classList.add("x-out"), 52 * i));
        setTimeout(word, 52 * (shots.length - 1) + 720 * .7);
      }, 150 * (shots.length - 1) + 170);
    } else word();
    if (document.readyState === "complete") loaded = true; else addEventListener("load", () => loaded = true, { once: true });
    setTimeout(() => { loaded = true; finish(); }, 9000);
  };

  /* ---------- the one loop ---------- */
  let lt = performance.now();
  const frame = now => {
    const dt = Math.min(64, now - lt); lt = now;
    smooth(now, dt); header(); navTrack(); railDraw(); marquees(dt); cursor(dt); pinTick(dt); scrubTick(dt);
    ticks.forEach(f => f(now, dt));
    if (grain && !document.hidden) grain(now);
    requestAnimationFrame(frame);
  };

  X.start = () => {
    $$(".x-mq").forEach(X.marquee);
    reveal();
    requestAnimationFrame(frame);
    loader();
  };
  // the page sets up its own sections first (it runs before this file: it's inline), then calls X.start through x:ready
  if (window.__xPage) window.__xPage(X);
  X.start();
})();
