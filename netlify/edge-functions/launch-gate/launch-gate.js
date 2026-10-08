// Pre-launch gate for the whole site (declared in netlify.toml).
// Until LAUNCH_AT, every visitor gets the countdown from countdown.js instead of the site: nothing from the
// site is sent, not even its HTML. The site is served after the launch, or to the team once they've opened
// /acces/<PREVIEW_KEY> (Netlify variable), which sets a cookie. /acces/sortir removes it.
// The account server (licensing/) checks the same cookie, with the same PREVIEW_KEY and LAUNCH_AT.
import { countdownPage } from "./countdown.js";

export const DEFAULT_LAUNCH = "2026-10-10T13:00:00Z"; // Saturday, October 10, 2026, 3:00 PM Paris time
export const COOKIE = "rago_preview";
const COOKIE_MAX_AGE = 30 * 86400;
const MIN_KEY_LENGTH = 16; // a shorter PREVIEW_KEY is ignored: nobody gets past the countdown
const DOMAIN = "rago-optimizer.com";
const OLD_HOST = "rago-optimiser.netlify.app";
// The countdown's own files (logo, icons, fonts). Everything else waits for the launch.
const PUBLIC_FILES = new Set([
  "/favicon.svg", "/favicon.ico", "/favicon-32.png", "/apple-touch-icon.png", "/rago-wordmark.svg", "/robots.txt",
  "/fonts/Geist-Variable.woff2", "/fonts/GeistMono-Variable.woff2",
]);
const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const env = (name) => (globalThis.Netlify?.env.get(name) ?? "").trim();

export function launchTime() {
  const t = Date.parse(env("LAUNCH_AT") || DEFAULT_LAUNCH);
  return Number.isNaN(t) ? Date.parse(DEFAULT_LAUNCH) : t;
}

const enc = new TextEncoder();
const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Cookie value: HMAC-SHA256(PREVIEW_KEY, "rago-preview-v1"), base64url. Same as previewPass() in licensing/src/app.js.
export async function passFor(key) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode("rago-preview-v1"))));
}

function sameString(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const sha256 = async (s) => base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));

function readCookie(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// On rago-optimizer.com the cookie also covers account.rago-optimizer.com (signup and checkout before the launch).
function passCookie(host, value, maxAge) {
  const domain = host === DOMAIN || host.endsWith(`.${DOMAIN}`) ? `; Domain=${DOMAIN}` : "";
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax${domain}`;
}

const redirect = (location, status, setCookie) => new Response(null, {
  status,
  headers: { Location: location, "Cache-Control": "no-store", ...(setCookie ? { "Set-Cookie": setCookie } : {}) },
});

export default async function launchGate(request, context) {
  const url = new URL(request.url);
  // Same rule as netlify.toml, applied here so the old address never shows anything itself.
  if (url.hostname === OLD_HOST) return redirect(`https://${DOMAIN}${url.pathname}${url.search}`, 301);

  const launchAt = launchTime();
  const now = Date.now();
  if (now >= launchAt || PUBLIC_FILES.has(url.pathname)) return context.next();

  const key = env("PREVIEW_KEY");
  const enabled = key.length >= MIN_KEY_LENGTH;
  if (url.pathname.startsWith("/acces/")) {
    let given = "";
    try { given = decodeURIComponent(url.pathname.slice("/acces/".length)); } catch { /* malformed: countdown */ }
    if (given === "sortir") return redirect("/", 302, passCookie(url.hostname, "", 0));
    if (enabled && sameString(await sha256(given), await sha256(key))) {
      return redirect("/", 302, passCookie(url.hostname, await passFor(key), COOKIE_MAX_AGE));
    }
  } else if (enabled && sameString(readCookie(request, COOKIE), await passFor(key))) {
    return context.next();
  }

  return new Response(request.method === "HEAD" ? null : countdownPage({ launchAt, now }), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      ...SECURITY_HEADERS,
    },
  });
}
