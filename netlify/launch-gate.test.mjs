// node --test netlify/launch-gate.test.mjs   (the edge function only uses web APIs, so Node runs it as Netlify's Deno would)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import launchGate, { COOKIE, passFor } from "./edge-functions/launch-gate/launch-gate.js";

const KEY = "team-preview-key-0123456789";
const SITE = "<html>the real site</html>";
let vars = {};
globalThis.Netlify = { env: { get: (k) => vars[k] } };
const context = { next: async () => new Response(SITE, { headers: { "content-type": "text/html" } }) };
const get = (path, { host = "rago-optimizer.com", cookie, ctx = context, method } = {}) =>
  launchGate(new Request(`https://${host}${path}`, { method, headers: cookie ? { cookie } : {} }), ctx);

test("before the launch: countdown everywhere, nothing from the site", async () => {
  vars = { PREVIEW_KEY: KEY, LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString() };
  for (const path of ["/", "/index.html", "/terms.html", "/sitemap.xml", "/buy", "/acces/wrong-key-0123456789"]) {
    const res = await get(path);
    const html = await res.text();
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.match(html, /Every millisecond <em>counts\.<\/em>/, path);
    assert.doesNotMatch(html, /real site/, path);
    assert.equal(res.headers.get("set-cookie"), null, path);
  }
  // the countdown's own files go through, the share images included
  for (const path of ["/fonts/Geist-Variable.woff2", "/favicon.svg", "/rago-wordmark.svg", "/og-image.png", "/og-launch.png", "/robots.txt"]) assert.equal(await (await get(path)).text(), SITE);
});

test("before the launch: link previews get the site's share tags, and nothing else from the site", async () => {
  vars = { PREVIEW_KEY: KEY, LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString() };
  const page = `<!doctype html><html><head><title>Rago Optimizer</title>
<meta name="description" content="site description">
<meta property="og:title" content="Rago Optimizer: Minecraft PvP optimizer for Windows">
<meta property="og:image" content="https://rago-optimizer.com/og-image.png?v=153045a26b">
<meta name="twitter:card" content="summary_large_image">
</head><body>the real site</body></html>`;
  // the site arrives in pieces, as from the network
  const chunks = page.match(/[\s\S]{1,40}/g);
  const ctx = { next: async () => new Response(new ReadableStream({
    pull(c) { chunks.length ? c.enqueue(new TextEncoder().encode(chunks.shift())) : c.close(); },
  }), { headers: { "content-type": "text/html; charset=utf-8" } }) };
  const res = await get("/?v=2", { ctx });
  const html = await res.text();
  assert.equal(res.headers.get("x-robots-tag"), "noindex");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /Every millisecond <em>counts\.<\/em>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/rago-optimizer\.com\/og-image\.png\?v=153045a26b">/);
  assert.match(html, /<meta property="og:title" content="Rago Optimizer: Minecraft PvP optimizer for Windows">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.doesNotMatch(html, /og-launch|real site|site description/);
  // a HEAD request doesn't read the site
  let read = false;
  await get("/", { method: "HEAD", ctx: { next: async () => { read = true; return new Response(page); } } });
  assert.equal(read, false);
});

test("before the launch: without the site's tags, link previews get the countdown's own image", async () => {
  vars = { PREVIEW_KEY: KEY, LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString() };
  const res = await get("/");
  const html = await res.text();
  assert.equal(res.headers.get("x-robots-tag"), "noindex");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/rago-optimizer\.com\/og-launch\.png">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/rago-optimizer\.com\/">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  // a deploy preview points at its own copy of the image
  assert.match(await (await get("/", { host: "deploy-preview-12--rago-optimiser.netlify.app" })).text(),
    /content="https:\/\/deploy-preview-12--rago-optimiser\.netlify\.app\/og-launch\.png"/);
});

test("the default launch is Saturday, October 10, 2026, 3:00 PM Paris time", async () => {
  vars = { PREVIEW_KEY: KEY };
  const html = await (await get("/")).text();
  assert.match(html, /Saturday, October 10 at 3:00 PM/);
  assert.match(html, /const launch = 1791637200000,/); // 2026-10-10T13:00:00Z
});

test("the team link sets a cookie that opens the site, and /acces/sortir removes it", async () => {
  vars = { PREVIEW_KEY: KEY, LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString() };
  const res = await get(`/acces/${KEY}`);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/");
  const set = res.headers.get("set-cookie");
  assert.match(set, /HttpOnly; Secure; SameSite=Lax; Domain=rago-optimizer.com$/);
  const pass = set.match(new RegExp(`^${COOKIE}=([^;]+)`))[1];
  // same value as the account server computes (licensing/src/app.js)
  assert.equal(pass, createHmac("sha256", KEY).update("rago-preview-v1").digest("base64url"));
  assert.equal(await (await get("/", { cookie: `other=1; ${COOKIE}=${pass}` })).text(), SITE);
  assert.equal(await (await get("/terms.html", { cookie: `${COOKIE}=${pass}` })).text(), SITE);
  assert.doesNotMatch(await (await get("/", { cookie: `${COOKIE}=${pass}x` })).text(), /real site/);

  // "/accès/" (as typed in French) works too
  assert.match((await get(`/acc%C3%A8s/${KEY}`)).headers.get("set-cookie"), new RegExp(`^${COOKIE}=${pass};`));
  assert.match((await get(`/acces/${KEY}/`)).headers.get("set-cookie"), new RegExp(`^${COOKIE}=${pass};`));

  const out = await get("/acces/sortir", { cookie: `${COOKIE}=${pass}` });
  assert.match(out.headers.get("set-cookie"), new RegExp(`^${COOKIE}=; Path=/; Max-Age=0;`));
  // deploy previews: host-only cookie
  assert.doesNotMatch((await get(`/acces/${KEY}`, { host: "deploy-preview-2--rago-optimiser.netlify.app" })).headers.get("set-cookie"), /Domain/);
  // a changed key invalidates the old cookies
  vars.PREVIEW_KEY = `${KEY}-new`;
  assert.doesNotMatch(await (await get("/", { cookie: `${COOKIE}=${pass}` })).text(), /real site/);
});

test("no PREVIEW_KEY, or one too short: nobody gets in", async () => {
  for (const key of [undefined, "short"]) {
    vars = { PREVIEW_KEY: key, LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString() };
    const res = await get(`/acces/${key}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("set-cookie"), null);
    const pass = await passFor(key || "x");
    assert.doesNotMatch(await (await get("/", { cookie: `${COOKIE}=${pass}` })).text(), /real site/);
  }
});

test("after the launch: the site for everyone, with nothing added by the gate (no noindex)", async () => {
  vars = { LAUNCH_AT: new Date(Date.now() - 1000).toISOString() };
  for (const path of ["/", "/terms.html", "/og-image.png", "/sitemap.xml"]) {
    const res = await get(path);
    assert.equal(await res.text(), SITE, path);
    assert.equal(res.headers.get("x-robots-tag"), null, path);
  }
});

test("the old Netlify address redirects to the domain", async () => {
  vars = { PREVIEW_KEY: KEY };
  const res = await get("/pricing?x=1", { host: "rago-optimiser.netlify.app" });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "https://rago-optimizer.com/pricing?x=1");
});
