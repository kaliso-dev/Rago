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
const get = (path, { host = "rago-optimizer.com", cookie } = {}) =>
  launchGate(new Request(`https://${host}${path}`, { headers: cookie ? { cookie } : {} }), context);

test("before the launch: countdown everywhere, nothing from the site", async () => {
  vars = { PREVIEW_KEY: KEY, LAUNCH_AT: new Date(Date.now() + 3600e3).toISOString() };
  for (const path of ["/", "/index.html", "/terms.html", "/og-image.png", "/sitemap.xml", "/buy", "/acces/wrong-key-0123456789"]) {
    const res = await get(path);
    const html = await res.text();
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.match(html, /Every millisecond <em>counts\.<\/em>/, path);
    assert.doesNotMatch(html, /real site/, path);
    assert.equal(res.headers.get("set-cookie"), null, path);
  }
  // the countdown's own files go through
  for (const path of ["/fonts/Geist-Variable.woff2", "/favicon.svg", "/rago-wordmark.svg"]) assert.equal(await (await get(path)).text(), SITE);
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

test("after the launch: the site for everyone", async () => {
  vars = { LAUNCH_AT: new Date(Date.now() - 1000).toISOString() };
  assert.equal(await (await get("/")).text(), SITE);
  assert.equal(await (await get("/terms.html")).text(), SITE);
});

test("the old Netlify address redirects to the domain", async () => {
  vars = { PREVIEW_KEY: KEY };
  const res = await get("/pricing?x=1", { host: "rago-optimiser.netlify.app" });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "https://rago-optimizer.com/pricing?x=1");
});
