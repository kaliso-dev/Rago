// The file explorer brains of /admin/cerveau (Rago Design, 27/11, brain-files.js): tree from the GitHub API (simulated
// here), each file streamed only when asked, size limit, bounded cache, safe content types, clear errors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Stripe from 'stripe';

import { CACHE_ITEM, contentType, createExplorer, fileKind, lru, MAX_FILE } from '../src/brain-files.js';
import { parseBrains } from '../src/brain.js';
import { loadConfig } from '../src/config.js';
import { ensureKeys, openMemoryDb } from '../src/db.js';
import { loadKeys } from '../src/tokens.js';
import { createApp } from '../src/app.js';

const quiet = { info() {}, warn() {}, error() {} };
const sha = (n) => String(n).repeat(40).slice(0, 40);

/** A fake GitHub API for kaliso-dev/rago-design: the tree, and blobs by sha. Counts every call. */
function fakeGithub({ token = 'tok', files }) {
  const calls = [];
  const blobs = new Map(files.map((f) => [createHash('sha1').update(f.path).digest('hex'), f]));
  const tree = [...blobs].map(([s, f]) => ({ path: f.path, type: 'blob', sha: s, size: f.size ?? f.data.length }));
  tree.push({ path: 'maquettes', type: 'tree', sha: sha('f') });
  const fetchImpl = async (url, opts = {}) => {
    const u = String(url);
    calls.push(u);
    if (!u.includes('kaliso-dev/rago-design')) return new Response('offline', { status: 503 });
    if (opts.headers?.authorization !== `Bearer ${token}`) return new Response('{"message":"Not Found"}', { status: 404 });
    if (u.includes('/git/trees/main?recursive=1')) return Response.json({ sha: sha('e'), truncated: false, tree });
    const m = /\/git\/blobs\/([0-9a-f]{40})$/.exec(u);
    if (m && blobs.has(m[1])) {
      assert.equal(opts.headers.accept, 'application/vnd.github.raw');
      const f = blobs.get(m[1]);
      // Sent in several chunks, as GitHub does.
      const data = Buffer.from(f.data);
      return new Response(new ReadableStream({
        start(ctrl) { for (let i = 0; i < data.length; i += 65536) ctrl.enqueue(new Uint8Array(data.subarray(i, i + 65536))); ctrl.close(); },
      }));
    }
    return new Response('{"message":"Not Found"}', { status: 404 });
  };
  return { fetchImpl, calls, blobs };
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 7)]);
const FILES = [
  { path: 'maquettes/accueil.png', data: PNG },
  { path: 'maquettes/logo.svg', data: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' },
  { path: 'scripts/build_css.py', data: 'print("rago")\n' },
  { path: 'maquettes/page.html', data: '<script>alert(1)</script>' },
  { path: 'kit/police.woff2', data: Buffer.alloc(64, 1) },
  { path: 'maquettes/geante.png', data: Buffer.alloc(16), size: MAX_FILE + 1 },
  { path: '.env', data: 'SECRET=1' },
];

test('explorer: lru bounded by bytes, safe content types', () => {
  const c = lru(10);
  c.set('a', Buffer.alloc(4)); c.set('b', Buffer.alloc(4));
  c.get('a'); // a is now the most recent
  c.set('c', Buffer.alloc(4));
  assert.equal(c.get('b'), undefined);
  assert.ok(c.get('a') && c.get('c'));
  assert.equal(c.bytes, 8);
  c.set('big', Buffer.alloc(11)); // bigger than the whole cache: not kept
  assert.equal(c.get('big'), undefined);
  assert.equal(contentType('a/b.png'), 'image/png');
  assert.equal(contentType('a/b.svg'), 'image/svg+xml');
  assert.equal(contentType('a/b.py'), 'text/plain; charset=utf-8');
  assert.equal(contentType('a/b.html'), 'text/plain; charset=utf-8');
  assert.equal(contentType('a/b.exe'), 'application/octet-stream');
  assert.deepEqual(['x.webp', 'x.md', 'x.zip'].map(fileKind), ['img', 'txt', 'bin']);
  // CERVEAUX can declare a file explorer too ("fichiers" as 6th field, "/" = the whole repository).
  assert.deepEqual(parseBrains('d|Design|/|kaliso-dev/rago-design|main|fichiers;r|Rago|docs/vault'), [
    { id: 'd', name: 'Design', dir: '', repo: 'kaliso-dev/rago-design', branch: 'main', kind: 'files' },
    { id: 'r', name: 'Rago', dir: 'docs/vault/' },
  ]);
});

test('explorer: tree without contents, files fetched one by one, streamed, small ones cached', async () => {
  const big = Buffer.alloc(CACHE_ITEM + 10, 3);
  const gh = fakeGithub({ files: [...FILES, { path: 'maquettes/grande.png', data: big }] });
  const x = createExplorer({ repo: 'kaliso-dev/rago-design', branch: 'main', token: 'tok' }, { fetchImpl: gh.fetchImpl, log: quiet });
  const t = await x.tree();
  assert.equal(gh.calls.length, 1);
  assert.ok(gh.calls[0].startsWith('https://api.github.com/repos/kaliso-dev/rago-design/git/trees/main?recursive=1'));
  assert.ok(!t.files.some((f) => f.p === '.env'), 'never a .env');
  assert.ok(!t.files.some((f) => f.p === 'maquettes'), 'folders are not files');
  assert.equal(t.files.find((f) => f.p === 'maquettes/accueil.png').k, 'img');
  assert.equal(await x.open('../../etc/passwd'), null);

  const read = async (p) => { const { body } = await x.open(p); return Buffer.from(await new Response(body).arrayBuffer()); };
  assert.deepEqual(await read('maquettes/accueil.png'), PNG);
  assert.equal(gh.calls.length, 2);
  assert.deepEqual(await read('maquettes/accueil.png'), PNG); // from the cache
  assert.equal(gh.calls.length, 2);
  assert.equal((await read('maquettes/grande.png')).length, big.length); // too big for the cache: streamed each time
  await read('maquettes/grande.png');
  assert.equal(gh.calls.length, 4);
  assert.ok(x.cache.bytes < 1024 * 1024);
  // Above MAX_FILE: nothing downloaded.
  const huge = await x.open('maquettes/geante.png');
  assert.equal(huge.body, null);
  assert.equal(gh.calls.length, 4);
});

test('explorer: without a token or without access, the message says to add rago-design to the token', async () => {
  for (const token of ['', 'autre-jeton']) {
    const gh = fakeGithub({ files: FILES });
    const x = createExplorer({ repo: 'kaliso-dev/rago-design', branch: 'main', token }, { fetchImpl: gh.fetchImpl, log: quiet });
    await assert.rejects(x.tree(), /^Error: Ajoute rago-design au jeton CERVEAU_GITHUB_TOKEN/);
  }
  const down = createExplorer({ repo: 'kaliso-dev/rago-design', branch: 'main', token: 'tok' }, { fetchImpl: async () => { throw new Error('ECONNRESET'); }, log: quiet });
  await assert.rejects(down.tree(), /GitHub ne répond pas/);
});

test('/admin/cerveau?c=rago-design: explorer page, tree and files behind the admin key, safe headers, other brains intact', async () => {
  const KEY = 'admin-key-0123456789abcdef';
  const cfg = loadConfig({ PUBLIC_URL: 'http://localhost', ADMIN_KEY: KEY, CERVEAU_GITHUB_TOKEN: 'tok' });
  const db = await openMemoryDb();
  await ensureKeys(db, cfg);
  const gh = fakeGithub({ files: FILES });
  const mailer = { purchase: async () => {}, passwordReset: async () => {}, signupCode: async () => {}, subscriptionCanceled: async () => {} };
  const app = createApp({ cfg, db, keys: loadKeys(cfg.signingKeyPem), stripe: new Stripe('sk_test_fake'), mailer, log: quiet, fetchImpl: gh.fetchImpl });

  const png = `/admin/cerveau/brut?c=rago-design&chemin=${encodeURIComponent('maquettes/accueil.png')}`;
  for (const path of ['/admin/cerveau?c=rago-design', '/admin/cerveau/arbre.json?c=rago-design', png]) {
    const res = await app.request(path);
    assert.equal(res.status, 303, path);
    assert.equal(res.headers.get('location'), '/admin');
  }
  assert.equal(gh.calls.length, 0, 'nothing asked to GitHub before the key');
  const login = await app.request('/admin/login', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/x-www-form-urlencoded' }, body: `key=${KEY}` });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const get = (path, headers = {}) => app.request(path, { headers: { cookie, ...headers } });

  // The page: the explorer, not the graph; the switcher lists the five brains.
  const page = await get('/admin/cerveau?c=rago-design');
  const html = await page.text();
  assert.match(html, /id="dx" data-tree="\/admin\/cerveau\/arbre.json\?c=rago-design" data-raw="\/admin\/cerveau\/brut\?c=rago-design"/);
  assert.doesNotMatch(html, /cv-canvas/);
  assert.match(html, /<b>Rago Design<\/b>[\s\S]*href="\/admin\/cerveau\?c=rago-design" aria-current="page"><span>Rago Design<\/span><small>kaliso-dev\/rago-design<\/small>/);
  for (const n of ['Rago Optimizer', 'RAGO-OS', 'Rago Client', 'Serveur Minecraft Rago']) assert.match(html, new RegExp(`<span>${n}</span>`));
  assert.doesNotMatch(html, /<script>|<script(?![^>]*\bsrc=)[^>]*>|\sstyle="|\son[a-z]+="/i);
  assert.match(page.headers.get('set-cookie'), /rago_cerveau=rago-design/);

  // The tree.
  const tree = await get('/admin/cerveau/arbre.json?c=rago-design');
  assert.equal(tree.status, 200);
  const t = await tree.json();
  assert.equal(t.repo, 'kaliso-dev/rago-design');
  assert.equal(t.maxFile, MAX_FILE);
  assert.equal(t.files.length, FILES.length - 1);
  assert.equal((await get('/admin/cerveau/arbre.json?c=rago-design', { 'if-none-match': tree.headers.get('etag') })).status, 304);
  const blob = (p) => t.files.find((f) => f.p === p).b;

  // An image: its type, a CSP that runs nothing, kept a year by the browser when the address names its blob.
  const img = await get(`${png}&v=${blob('maquettes/accueil.png')}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal(img.headers.get('cache-control'), 'private, max-age=31536000, immutable');
  assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
  assert.match(img.headers.get('content-security-policy'), /default-src 'none'.*sandbox/);
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);
  assert.equal((await get(png, { 'if-none-match': img.headers.get('etag') })).status, 304);
  assert.equal((await get(png)).headers.get('cache-control'), 'private, max-age=60');

  const svg = await get(`/admin/cerveau/brut?c=rago-design&chemin=${encodeURIComponent('maquettes/logo.svg')}`);
  assert.equal(svg.headers.get('content-type'), 'image/svg+xml');
  assert.match(svg.headers.get('content-security-policy'), /sandbox/);
  const page2 = await get(`/admin/cerveau/brut?c=rago-design&chemin=${encodeURIComponent('maquettes/page.html')}`);
  assert.equal(page2.headers.get('content-type'), 'text/plain; charset=utf-8', 'html shown as text, never run');
  const py = await get(`/admin/cerveau/brut?c=rago-design&chemin=${encodeURIComponent('scripts/build_css.py')}`);
  assert.equal(await py.text(), 'print("rago")\n');
  const font = await get(`/admin/cerveau/brut?c=rago-design&chemin=${encodeURIComponent('kit/police.woff2')}`);
  assert.equal(font.headers.get('content-type'), 'application/octet-stream');
  assert.match(font.headers.get('content-disposition'), /^attachment/);

  const huge = await get(`/admin/cerveau/brut?c=rago-design&chemin=${encodeURIComponent('maquettes/geante.png')}`);
  assert.equal(huge.status, 413);
  assert.match((await huge.json()).error, /GitHub/);
  assert.equal((await get('/admin/cerveau/brut?c=rago-design&chemin=.env')).status, 404);
  assert.equal((await get('/admin/cerveau/brut?c=rago-design&chemin=/etc/passwd')).status, 404);
  assert.ok(!gh.calls.some((u) => u.includes('tarball') || u.includes('codeload')), 'never the whole repository');

  // The other brains are untouched: the graph page, and the graph routes refuse the explorer.
  assert.match(await (await get('/admin/cerveau?c=rago')).text(), /<canvas id="cv-canvas"/);
  assert.equal((await get('/admin/cerveau/arbre.json?c=rago')).status, 404);
  assert.equal((await get('/admin/cerveau/donnees.json?c=rago-design')).status, 503);
  assert.equal((await get('/admin/cerveau/fichier?c=rago-design&chemin=README.md')).status, 503);
  const vault = await (await get('/admin/cerveau/donnees.json?c=rago')).json();
  assert.ok(vault.notes.some((n) => n.id === 'Projet'));
  assert.deepEqual(vault.brains.map((b) => b.id), ['rago', 'rago-os', 'rago-client', 'rago-minecraft', 'rago-design']);
  await db.close?.();
});

test('/admin/cerveau?c=rago-design without CERVEAU_GITHUB_TOKEN: the tree says what to do', async () => {
  const KEY = 'admin-key-0123456789abcdef';
  const cfg = loadConfig({ PUBLIC_URL: 'http://localhost', ADMIN_KEY: KEY });
  const db = await openMemoryDb();
  await ensureKeys(db, cfg);
  const gh = fakeGithub({ files: FILES });
  const mailer = { purchase: async () => {}, passwordReset: async () => {}, signupCode: async () => {}, subscriptionCanceled: async () => {} };
  const app = createApp({ cfg, db, keys: loadKeys(cfg.signingKeyPem), stripe: new Stripe('sk_test_fake'), mailer, log: quiet, fetchImpl: gh.fetchImpl });
  const login = await app.request('/admin/login', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/x-www-form-urlencoded' }, body: `key=${KEY}` });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const res = await app.request('/admin/cerveau/arbre.json?c=rago-design', { headers: { cookie } });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /^Ajoute rago-design au jeton CERVEAU_GITHUB_TOKEN/);
  await db.close?.();
});
