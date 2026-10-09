// Renders index.html in headless Chromium and prints the HTML that the page's JS writes into its empty containers,
// so build.py can bake it in for visitors and crawlers without JavaScript. The JS rewrites the same containers on load.
// Usage: node prerender.js path/to/index.html   (needs the playwright package; build.py skips this step without it)
const { chromium } = require("playwright");
const path = require("path");
const IDS = ["side", "tl1", "tl2", "mq", "cmp", "xtabs", "xpanel"];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await p.route(/^https?:/, r => r.abort()); // offline: nothing but the local file
  await p.goto("file://" + path.resolve(process.argv[2]));
  await p.waitForTimeout(300);
  const out = await p.evaluate(ids => Object.fromEntries(ids.map(i => {
    const el = document.getElementById(i).cloneNode(true);
    // without JS the preview rows can't be toggled: don't announce or focus them as switches
    el.querySelectorAll(".tw").forEach(r => { r.removeAttribute("role"); r.removeAttribute("aria-checked"); r.removeAttribute("tabindex"); });
    return [i, el.innerHTML];
  })), IDS);
  await b.close();
  process.stdout.write(JSON.stringify(out));
})().catch(e => { console.error(e.message); process.exit(1); });
