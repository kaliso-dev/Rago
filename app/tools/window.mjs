// npm run window: the app's interface on a Mac (or any computer), in a window the size of the Windows app.
// Vite serves the interface in web demo mode (tweaks, PC info and sign-in are simulated, nothing touches the system)
// and a Chromium browser (Chrome, Edge, Brave) opens it without its address bar: same engine as WebView2, which
// draws the app on Windows, so the result is the closest to what players see. Edits show up live. Ctrl+C stops it.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const conf = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
const { width, height } = conf.app.windows[0];

const server = await createServer({ root, configFile: join(root, "vite.config.ts") });
await server.listen();
server.printUrls();
const url = server.resolvedUrls?.local[0] ?? "http://localhost:1420/";

const mac = ["Google Chrome", "Microsoft Edge", "Brave Browser", "Chromium"].flatMap((app) =>
  [`/Applications/${app}.app`, join(homedir(), `Applications/${app}.app`)].map((dir) => `${dir}/Contents/MacOS/${app}`),
);
const win = ["Google/Chrome/Application/chrome.exe", "Microsoft/Edge/Application/msedge.exe"].flatMap((exe) =>
  [process.env["PROGRAMFILES"], process.env["PROGRAMFILES(X86)"], process.env["LOCALAPPDATA"]].filter(Boolean).map((dir) => join(dir, exe)),
);
const linux = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
const browser = [process.env.CHROME_PATH, ...(process.platform === "darwin" ? mac : process.platform === "win32" ? win : linux)].find(
  (p) => p && existsSync(p),
);

if (!browser) {
  console.log(`\n  No Chrome, Edge or Brave found: open ${url} in one of them (Safari works too, with small differences).\n`);
} else {
  // Its own browser profile: the window opens at the right size even when the browser is already running,
  // and the demo's state (Premium or free, applied tweaks) is kept from one launch to the next.
  const profile = join(tmpdir(), "rago-optimizer-window");
  // On a Mac the window keeps its title bar (about 28 px) above the app's own bar.
  const extra = process.platform === "darwin" ? 28 : 0;
  spawn(browser, [`--app=${url}`, `--window-size=${width},${height + extra}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check"], {
    stdio: "ignore",
    detached: true,
  }).unref();
  console.log(`\n  Rago Optimizer window: ${width} × ${height}, like on Windows (${browser.split("/").pop()}).`);
  console.log(`  Sign in with any email and a 4+ character password for Premium; an email starting with "free" stays on the free plan.\n`);
}
