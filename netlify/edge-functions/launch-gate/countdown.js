// The page every visitor sees before the launch. Self-contained: inline styles and script, plus the logo,
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
<link rel="preload" href="/fonts/GeistMono-Variable.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:"Geist";src:url("/fonts/Geist-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Geist Mono";src:url("/fonts/GeistMono-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
:root{--ink-1:#0A0A0B;--ink-2:#111113;--t1:#F5F5F6;--t2:#A1A1AA;--t3:#7C7C86;--l1:rgba(255,255,255,.06);--red:#FF3B30;--ease:cubic-bezier(.16,1,.3,1);--sans:"Geist","Segoe UI Variable","Segoe UI",system-ui,sans-serif;--mono:"Geist Mono","Cascadia Mono",ui-monospace,Consolas,monospace}
*{box-sizing:border-box;margin:0}
html{background:var(--ink-1);color-scheme:dark}
body{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;padding:0 16px;color:var(--t1);font:400 15px/1.6 var(--sans);-webkit-font-smoothing:antialiased;background:radial-gradient(900px 520px at 50% -12%,rgba(255,59,48,.16),transparent 62%),var(--ink-1)}
header{display:flex;justify-content:center;padding:32px 0 0}
header img{display:block;height:22px;width:auto}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;max-width:720px;margin:0 auto;padding:48px 0 56px;text-align:center}
.mark{position:relative;width:64px;height:64px;margin-bottom:44px}
.mark img{position:relative;display:block;width:100%;height:100%}
.mark i{position:absolute;inset:0;border-radius:50%;border:1.5px solid var(--red);opacity:0;animation:pulse 1600ms var(--ease) infinite}
.mark i:nth-child(2){animation-delay:533ms}.mark i:nth-child(3){animation-delay:1066ms}
@keyframes pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2);opacity:0}}
.over{margin-bottom:18px;color:var(--t3);font:500 11px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase}
h1{font-weight:600;font-size:clamp(36px,8.5vw,64px);line-height:1.02;letter-spacing:-.035em}
h1 em{font-style:normal;color:var(--red)}
.sub{max-width:560px;margin-top:20px;color:var(--t2);font-size:clamp(15px,2.4vw,17px)}
.sub strong{color:var(--t1);font-weight:500}
.clock{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(8px,2vw,16px);width:100%;max-width:620px;margin-top:44px}
.unit{padding:clamp(16px,3.6vw,28px) 4px clamp(14px,3vw,22px);background:var(--ink-2);border:1px solid var(--l1);border-radius:24px;box-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 8px 24px -8px rgba(0,0,0,.6)}
.num{display:block;font:500 clamp(30px,8.5vw,60px)/1 var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.lbl{display:block;margin-top:12px;color:var(--t3);font:500 10.5px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase}
.local{min-height:20px;margin-top:28px;color:var(--t3);font:400 13px/1.5 var(--mono)}
footer{padding:0 0 28px;color:var(--t3);font-size:12.5px;text-align:center}
@media (max-width:420px){.unit{border-radius:16px}.lbl{font-size:9.5px;letter-spacing:.08em}}
@media (prefers-reduced-motion:reduce){.mark i{animation:none}}
</style>
</head>
<body>
<header><img src="/rago-wordmark.svg" alt="Rago Optimizer" width="137" height="22"></header>
<main>
  <div class="mark" aria-hidden="true"><i></i><i></i><i></i><img src="/favicon.svg" alt=""></div>
  <p class="over">Launching ${esc(day)}</p>
  <h1>Every millisecond <em>counts.</em></h1>
  <p class="sub">Rago Optimizer opens on <strong>${esc(when)}</strong>, Paris time.</p>
  <div class="clock" role="timer" aria-label="Time left before the launch">
${units.map(([id, label, n]) => `    <div class="unit"><span class="num" id="${id}">${pad(n)}</span><span class="lbl">${label}</span></div>`).join("\n")}
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
