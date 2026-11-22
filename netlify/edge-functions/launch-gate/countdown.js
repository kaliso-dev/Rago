// The page every visitor sees before the launch (design v5, 22/11/2026). Self-contained: inline styles and script, plus the logo,
// icons, fonts and share images that launch-gate.js lets through. It says nothing about the product beyond its name.
// Link previews (Discord, WhatsApp, X...) get the site's own share tags (share, read by launch-gate.js), so a link
// shared now already shows the site's image and keeps the right preview after the launch. og-launch.png is the fallback.
// When the clock reaches zero the page reloads, and the gate then serves the site.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (n) => String(n).padStart(2, "0");

// origin: the address the page was asked on (the domain, or a deploy preview), for the fallback share image URL.
// share: the site's og: and twitter: tags, or "" when they couldn't be read.
export function countdownPage({ launchAt, now, origin = "https://rago-optimizer.com", share = "" }) {
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(launchAt);
  const day = when.split(",")[0];
  const left = Math.max(0, Math.floor((launchAt - now) / 1000));
  const units = [
    ["d", "Days", Math.floor(left / 86400)],
    ["h", "Hours", Math.floor((left % 86400) / 3600)],
    ["m", "Minutes", Math.floor((left % 3600) / 60)],
    ["s", "Seconds", left % 60],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A0A0B">
<meta name="robots" content="noindex">
<title>Rago Optimizer opens ${esc(day)}</title>
<meta name="description" content="Rago Optimizer opens on ${esc(when)}, Paris time.">
${share ? `${share}\n` : `<meta property="og:site_name" content="Rago Optimizer">
<meta property="og:title" content="Rago Optimizer opens ${esc(day)}">
<meta property="og:description" content="Every millisecond counts. Opens on ${esc(when)}, Paris time.">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(origin)}/">
<meta property="og:image" content="${esc(origin)}/og-launch.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Rago Optimizer. Every millisecond counts.">
<meta name="twitter:card" content="summary_large_image">
`}<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/BarlowCondensed-900-italic.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:"Barlow";src:url("/fonts/Barlow-400.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Barlow";src:url("/fonts/Barlow-600.woff2") format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Barlow Condensed";src:url("/fonts/BarlowCondensed-800.woff2") format("woff2");font-weight:800;font-display:swap}
@font-face{font-family:"Barlow Condensed";src:url("/fonts/BarlowCondensed-900-italic.woff2") format("woff2");font-weight:900;font-style:italic;font-display:swap}
:root{--bg:#0A0A0B;--bg-2:#141416;--ink:#F5F5F6;--ink-2:#A1A1AA;--ink-3:#7C7C86;--line-2:rgba(255,255,255,.10);--red:#FF3B30;--red-ink:#0A0A0B;--skew:-12deg;--cond:"Barlow Condensed","Arial Narrow",sans-serif;--body:"Barlow","Segoe UI",system-ui,sans-serif}
*{box-sizing:border-box;margin:0}
html{background:var(--bg);color-scheme:dark}
body{position:relative;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:0 16px;color:var(--ink);font:400 16px/1.55 var(--body);-webkit-font-smoothing:antialiased;background:var(--bg);text-align:center;overflow-x:hidden}
.dots{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.07) 1.1px,transparent 1.5px) 0 0/9px 9px;-webkit-mask:radial-gradient(60% 70% at 50% 40%,transparent 30%,#000 100%);mask:radial-gradient(60% 70% at 50% 40%,transparent 30%,#000 100%)}
header{position:relative;padding-top:34px}
.logo{display:flex;align-items:center;gap:10px}
.logo img{display:block;width:34px;height:34px}
.logo b{font-family:var(--cond);font-weight:900;font-style:italic;font-size:30px;line-height:1;text-transform:uppercase}
main{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;max-width:880px;padding:56px 0 40px}
.mark{position:relative;width:84px;height:84px;margin-bottom:58px}
.mark img{position:relative;display:block;width:100%;height:100%}
.mark i{position:absolute;inset:0;border:1.5px solid var(--red);border-radius:24px;opacity:0;animation:pulse 2400ms cubic-bezier(.16,1,.3,1) infinite}
.mark i:nth-child(2){animation-delay:1200ms}
@keyframes pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.9);opacity:0}}
.over{font-family:var(--cond);font-weight:800;font-size:15px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
h1{margin-top:18px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:clamp(54px,11vw,112px);line-height:.82;text-transform:uppercase;letter-spacing:-.012em}
h1 em{position:relative;display:inline-block;font-style:inherit;isolation:isolate}
h1 em::after{content:"";position:absolute;z-index:-1;left:-6%;right:-12%;top:30%;height:74%;background:url(/img/v5/brush.svg) center/100% 100% no-repeat;transform:rotate(-2deg)}
.sub{max-width:600px;margin-top:28px;font-size:clamp(16px,2.4vw,18px);color:var(--ink-2)}
.sub strong{color:var(--ink);font-weight:600}
.clock{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(8px,1.6vw,14px);width:100%;max-width:760px;margin-top:46px}
.unit{position:relative;padding:clamp(16px,3vw,24px) 0 clamp(12px,2.4vw,18px);isolation:isolate}
.unit::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bg-2);border:1px solid var(--line-2);border-radius:18px;transform:skewX(var(--skew))}
.num{display:block;font-family:var(--cond);font-weight:900;font-style:italic;font-size:clamp(46px,10vw,104px);line-height:.8;font-variant-numeric:tabular-nums}
.lbl{display:block;margin-top:12px;font-family:var(--cond);font-weight:800;font-size:clamp(11px,1.6vw,13.5px);letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.unit.s{color:var(--red-ink)}
.unit.s::before{background:var(--red);border-color:var(--red)}
.unit.s .lbl{color:rgba(10,10,11,.65)}
.local{min-height:21px;margin-top:30px;font-size:14px;color:var(--ink-3)}
footer{position:relative;padding:0 0 28px;color:var(--ink-3);font-size:13px}
@media (max-width:420px){.unit::before{border-radius:12px}.lbl{letter-spacing:.1em}.mark{margin-bottom:44px}}
@media (prefers-reduced-motion:reduce){.mark i{animation:none;opacity:.3;transform:scale(1.35)}}
</style>
</head>
<body>
<span class="dots" aria-hidden="true"></span>
<header><span class="logo" role="img" aria-label="Rago Optimizer"><img src="/img/v5/rago-icon.svg" alt="" width="34" height="34"><b aria-hidden="true">rago</b></span></header>
<main>
  <div class="mark" aria-hidden="true"><i></i><i></i><img src="/img/v5/rago-icon.svg" alt=""></div>
  <p class="over">Launching ${esc(day)}</p>
  <h1>Every millisecond <em>counts.</em></h1>
  <p class="sub">Rago Optimizer opens on <strong>${esc(when)}</strong>, Paris time.</p>
  <div class="clock" role="timer" aria-label="Time left before the launch">
${units.map(([id, label, n]) => `    <div class="unit${id === "s" ? " s" : ""}"><span class="num" id="${id}">${pad(n)}</span><span class="lbl">${label}</span></div>`).join("\n")}
  </div>
  <p class="local" id="local"></p>
</main>
<footer>&copy; ${new Date(launchAt).getUTCFullYear()} Rago Optimizer</footer>
<script>
(() => {
  const launch = ${Number(launchAt)}, skew = ${Number(now)} - Date.now();
  const $ = (id) => document.getElementById(id), pad = (n) => String(n).padStart(2, "0");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz && tz !== "Europe/Paris") {
    $("local").textContent = "That's " + new Intl.DateTimeFormat("en-US", { weekday: "long", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(launch) + " where you are.";
  }
  let timer;
  function tick() {
    clearTimeout(timer);
    const left = launch - (Date.now() + skew);
    if (left <= 0) {
      for (const id of ["d", "h", "m", "s"]) $(id).textContent = "00";
      $("local").textContent = "Opening now…";
      timer = setTimeout(() => location.reload(), 1000 + Math.random() * 2000);
      return;
    }
    const s = Math.floor(left / 1000);
    $("d").textContent = pad(Math.floor(s / 86400));
    $("h").textContent = pad(Math.floor((s % 86400) / 3600));
    $("m").textContent = pad(Math.floor((s % 3600) / 60));
    $("s").textContent = pad(s % 60);
    timer = setTimeout(tick, (left % 1000 || 1000) + 5);
  }
  tick();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
})();
</script>
</body>
</html>
`;
}
