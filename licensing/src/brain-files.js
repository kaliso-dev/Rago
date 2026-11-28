// The file explorer brains of /admin/cerveau (27/11/2026): « Rago Design », the private repository
// kaliso-dev/rago-design (v5 mock-ups, brand kit, CSS scripts: ~135 images, close to or above 100 MB). A vault brain
// downloads the whole tarball of its repository (brain.js, MAX_TARBALL); this one never does. Asked by Sofiene on
// 27/11: see these images in the brain without any risk for the server.
//
// - The tree comes from the GitHub API (git/trees/<branch>?recursive=1): paths, sizes and blob shas, no content.
//   Read at most once a minute, and only while someone looks.
// - A file is downloaded only when it is opened (or its thumbnail scrolls into view), by its blob sha
//   (git/blobs/<sha>, raw media type), and streamed to the browser chunk by chunk: the server never holds a whole
//   big file. Above MAX_FILE (25 MB) it is not served at all (the page links to GitHub).
// - A bounded LRU cache keeps small files (≤ CACHE_ITEM) up to CACHE_TOTAL bytes in all; at most MAX_ACTIVE
//   downloads run at once (the others wait their turn).
// - A blob sha names its content for good: the browser keeps the file a year (immutable) when the address carries it.
// - Content-Type from a short list (images, text); everything else is sent as a download. Text (scripts, html, svg
//   source…) is never sent as something the browser would run; SVG images get a sandboxed CSP (app.js).
import { BrainError } from './brain.js';

export const MAX_FILE = 25 * 1024 * 1024;
export const CACHE_TOTAL = 50 * 1024 * 1024;
export const CACHE_ITEM = 8 * 1024 * 1024;
const MAX_ACTIVE = 6;
const CHECK_EVERY = 60 * 1000;
const MAX_TREE = 20 * 1024 * 1024; // GitHub stops a recursive tree at 7 MB (then "truncated")

export const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon' };
export const TEXT_EXT = new Set(['py', 'md', 'txt', 'json', 'css', 'scss', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'html', 'htm', 'csv', 'yml', 'yaml',
  'toml', 'sh', 'ps1', 'bat', 'xml', 'ini', 'cfg', 'env.example', 'gitignore', 'gitattributes', 'log', 'sql', 'rs']);
const extOf = (p) => {
  const b = p.slice(p.lastIndexOf('/') + 1).toLowerCase();
  const d = b.lastIndexOf('.');
  return d >= 0 ? b.slice(d + 1) : b;
};
/** What the page does with a file: 'img' (shown), 'txt' (shown as text), 'bin' (download / GitHub). */
export const fileKind = (p) => (IMAGE_TYPES[extOf(p)] ? 'img' : TEXT_EXT.has(extOf(p)) ? 'txt' : 'bin');
export function contentType(p) {
  const e = extOf(p);
  if (IMAGE_TYPES[e]) return IMAGE_TYPES[e];
  if (TEXT_EXT.has(e)) return 'text/plain; charset=utf-8'; // html, svg source, scripts: shown, never run
  return 'application/octet-stream';
}

/** A small LRU of Buffers bounded by their total size. */
export function lru(maxBytes) {
  const map = new Map();
  let bytes = 0;
  return {
    get(k) { const v = map.get(k); if (v) { map.delete(k); map.set(k, v); } return v; },
    set(k, v) {
      if (v.length > maxBytes) return;
      if (map.has(k)) { bytes -= map.get(k).length; map.delete(k); }
      map.set(k, v);
      bytes += v.length;
      for (const [old, buf] of map) { if (bytes <= maxBytes) break; map.delete(old); bytes -= buf.length; }
    },
    get bytes() { return bytes; },
    get size() { return map.size; },
  };
}

/**
 * createExplorer({ repo, branch, dir, token }, { fetchImpl, log })
 *   tree({ fresh }) -> { repo, branch, sha, truncated, at, files: [{ p, s, b, k }] }   (throws BrainError)
 *   open(path) -> { file, body: Buffer | ReadableStream } | null   (throws BrainError; file.s > MAX_FILE: no body)
 */
export function createExplorer({ repo, branch = '', dir = '', token = '' }, { fetchImpl = fetch, log = console } = {}) {
  const cache = lru(CACHE_TOTAL);
  const name = repo.split('/')[1] || repo;
  let snap = null;
  let pending = null;
  let lastError = null;
  let active = 0;
  const waiting = [];
  const headers = (accept) => ({ 'user-agent': 'rago-licensing', accept, 'x-github-api-version': '2022-11-28', ...(token ? { authorization: `Bearer ${token}` } : {}) });
  // The message Sofiene sees when the token is missing or does not cover the repository.
  const refused = (status) => new BrainError(`Ajoute ${name} au jeton CERVEAU_GITHUB_TOKEN : ${token
    ? `GitHub refuse l’accès au dépôt ${repo} avec ce jeton (${status}). GitHub → Settings → Developer settings → le jeton → Repository access : ajouter ${name}, droit « Contents : Read-only ».`
    : `le dépôt ${repo} est privé et le serveur n’a pas de jeton (${status}). Mettre CERVEAU_GITHUB_TOKEN dans Railway (jeton GitHub en lecture seule, droit « Contents » sur ce dépôt).`}`);

  async function readTree() {
    const ref = branch || 'HEAD';
    let res;
    try {
      res = await fetchImpl(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`, { headers: headers('application/vnd.github+json'), signal: AbortSignal.timeout(20000) });
    } catch (err) {
      throw new BrainError(`GitHub ne répond pas (${err.message}).`);
    }
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') throw new BrainError('Limite de l’API GitHub atteinte : réessaie dans une heure.');
    if (res.status === 401 || res.status === 403) throw refused(res.status);
    // 404: a private repository the token does not cover looks like no repository at all (or the branch is missing).
    if (res.status === 404) throw refused(token ? `404 ; ou la branche ${ref} n’existe pas` : 404);
    if (res.status === 409) throw new BrainError(`Le dépôt ${repo} est vide.`);
    if (!res.ok) throw new BrainError(`GitHub a répondu ${res.status} en lisant l’arborescence de ${repo}.`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_TREE) throw new BrainError(`L’arborescence de ${repo} est trop grosse pour être lue ici.`);
    const json = JSON.parse(buf.toString('utf8'));
    const files = [];
    for (const e of json.tree || []) {
      if (e.type !== 'blob' || typeof e.path !== 'string' || !/^[0-9a-f]{40}$/.test(e.sha || '')) continue;
      if (dir && !e.path.startsWith(dir)) continue;
      if (/(^|\/)\.env(?!\.example)[^/]*$/.test(e.path)) continue; // never a .env, even one pushed by mistake
      files.push({ p: e.path, s: Number(e.size) || 0, b: e.sha, k: fileKind(e.path) });
    }
    files.sort((a, b) => a.p.localeCompare(b.p, 'fr'));
    snap = { repo, branch: ref, dir, sha: json.sha || '', truncated: !!json.truncated, at: Date.now(), checkedAt: Date.now(), files, byPath: new Map(files.map((f) => [f.p, f])) };
    log.info?.(`[cerveau] ${repo} ${ref} : ${files.length} fichiers (arborescence seule).`);
    return snap;
  }

  function refresh() {
    if (!pending) {
      pending = readTree()
        .then((s) => { lastError = null; return s; })
        .catch((err) => {
          lastError = err instanceof BrainError ? err.message : `Lecture du dépôt impossible : ${err.message}`;
          if (!(err instanceof BrainError)) log.error?.(`[cerveau] ${err.stack || err.message}`);
          if (snap) { snap.checkedAt = Date.now(); return snap; }
          throw new BrainError(lastError);
        })
        .finally(() => { pending = null; });
    }
    return pending;
  }
  async function current(fresh) {
    if (!snap || fresh) return refresh();
    if (Date.now() - snap.checkedAt >= CHECK_EVERY) refresh().catch(() => {});
    return snap;
  }

  const acquire = () => (active < MAX_ACTIVE ? (active++, Promise.resolve()) : new Promise((r) => waiting.push(r)));
  const release = () => { const next = waiting.shift(); if (next) next(); else active--; };

  return {
    repo,
    get error() { return lastError; },
    get cache() { return { bytes: cache.bytes, files: cache.size }; },
    async tree({ fresh = false } = {}) {
      const s = await current(fresh);
      const { byPath, checkedAt, ...out } = s;
      return out;
    },
    /** One file of the tree, by its path: from the cache, or streamed from GitHub. Nothing outside the tree is reachable. */
    async open(path) {
      const s = await current(false);
      const file = s.byPath.get(path);
      if (!file) return null;
      if (file.s > MAX_FILE) return { file, body: null };
      const hit = cache.get(file.b);
      if (hit) return { file, body: hit };
      await acquire();
      let res;
      try {
        res = await fetchImpl(`https://api.github.com/repos/${repo}/git/blobs/${file.b}`, { headers: headers('application/vnd.github.raw'), signal: AbortSignal.timeout(120000) });
      } catch (err) {
        release();
        throw new BrainError(`GitHub ne répond pas (${err.message}).`);
      }
      if (!res.ok || !res.body) {
        release();
        if (res.status === 401 || res.status === 403 || res.status === 404) throw refused(res.status);
        throw new BrainError(`GitHub a répondu ${res.status} en envoyant ${path}.`);
      }
      const reader = res.body.getReader();
      const keep = file.s <= CACHE_ITEM ? [] : null;
      let seen = 0;
      let done = false;
      const finish = () => { if (!done) { done = true; release(); } };
      const body = new ReadableStream({
        async pull(ctrl) {
          let chunk;
          try { chunk = await reader.read(); } catch (err) { finish(); ctrl.error(err); return; }
          if (chunk.done) {
            if (keep && seen === file.s) cache.set(file.b, Buffer.concat(keep));
            finish();
            ctrl.close();
            return;
          }
          seen += chunk.value.length;
          if (seen > MAX_FILE) { finish(); reader.cancel().catch(() => {}); ctrl.error(new Error('fichier plus gros que prévu')); return; }
          keep?.push(Buffer.from(chunk.value));
          ctrl.enqueue(chunk.value);
        },
        cancel(reason) { finish(); return reader.cancel(reason).catch(() => {}); },
      });
      return { file, body };
    },
  };
}
