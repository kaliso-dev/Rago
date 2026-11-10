// The brain (/admin/cerveau, brain.js): markdown of the vault, graph data, reading the repository from GitHub or
// from disk, and the admin routes that serve them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync, gunzipSync } from 'node:zlib';
import Stripe from 'stripe';

import { BrainError, buildVault, createBrain, frontMatter, plain, renderMarkdown, slug, untar } from '../src/brain.js';
import { loadConfig } from '../src/config.js';
import { ensureKeys, openMemoryDb } from '../src/db.js';
import { loadKeys } from '../src/tokens.js';
import { createApp } from '../src/app.js';

const quiet = { info() {}, warn() {}, error() {} };

// ---------- a small tar writer, like the archives GitHub sends ----------
function entry(name, data, type = '0') {
  const body = Buffer.from(data);
  const h = Buffer.alloc(512);
  h.write(name.slice(0, 100), 0, 'utf8');
  h.write('0000644\0', 100); h.write('0000000\0', 108); h.write('0000000\0', 116);
  h.write(`${body.length.toString(8).padStart(11, '0')}\0`, 124);
  h.write('00000000000\0', 136);
  h.write('        ', 148);
  h.write(type, 156);
  h.write('ustar\0', 257); h.write('00', 263);
  let sum = 0;
  for (const b of h) sum += b;
  h.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return Buffer.concat([h, body, Buffer.alloc((512 - (body.length % 512)) % 512)]);
}
function paxBody(records) {
  return Object.entries(records).map(([k, v]) => {
    const rest = ` ${k}=${v}\n`;
    const n = Buffer.byteLength(rest);
    let len = n + String(n).length;
    if (String(len).length !== String(n).length) len = n + String(len).length;
    return `${len}${rest}`;
  }).join('');
}
function tarball(files, sha) {
  const parts = [entry('pax_global_header', paxBody({ comment: sha }), 'g')];
  for (const [path, text] of Object.entries(files)) {
    const full = `kaliso-dev-rago-${sha.slice(0, 7)}/${path}`;
    if (full.length > 100) parts.push(entry('././@PaxHeader', paxBody({ path: full }), 'x'));
    parts.push(entry(full, text));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

test('markdown: everything typed is escaped, only our own HTML comes out', () => {
  const html = renderMarkdown('# Titre <script>alert(1)</script>\n\nUn <img src=x onerror=alert(1)> et [lien](javascript:alert(1)) et **gras**.\n\n```js\nconst a = "<b>";\n```', {});
  assert.doesNotMatch(html, /<script|<img|href="javascript/i);
  assert.match(html, /<h1 id="titre-script-alert-1-script">Titre &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/h1>/);
  assert.match(html, /<strong>gras<\/strong>/);
  assert.match(html, /<pre class="code" data-lang="js"><code>const a = &quot;&lt;b&gt;&quot;;<\/code><\/pre>/);
  // Outside links open in a new tab, without access to the admin page.
  assert.match(renderMarkdown('Voir https://rago-optimizer.com.', {}), /<a class="ext" href="https:\/\/rago-optimizer.com" target="_blank" rel="noopener noreferrer">/);
});

test('markdown: tables with [[Note\\|alias]], lists, tasks, callouts, front matter', () => {
  const ctx = { wiki: (t, a) => `<a data-note="${t}">${a || t}</a>`, ids: new Set(), headings: [] };
  const table = renderMarkdown('| Note | Où |\n|---|:-:|\n| [[Projet\\|le projet]] | `a|b` |', ctx);
  assert.match(table, /<td><a data-note="Projet">le projet<\/a><\/td><td class="al-c"><code>a\|b<\/code><\/td>/);
  const lists = renderMarkdown('- un\n  - deux\n- [x] fait\n- [ ] à faire\n\n1. premier\n2. second', ctx);
  assert.match(lists, /<ul><li>un<ul><li>deux<\/li><\/ul><\/li><li class="li-task"><span class="task done"/);
  assert.match(lists, /<ol><li>premier<\/li><li>second<\/li><\/ol>/);
  assert.match(renderMarkdown('> [!warning] Attention\n> Texte', ctx), /<div class="callout co-warning"><p class="co-t">Attention<\/p><p>Texte<\/p><\/div>/);
  const fm = frontMatter('---\ntype: code\ntags: [app, rust]\nliens:\n  - a\n  - b\n---\n# Corps');
  assert.deepEqual(fm.data, { type: 'code', tags: ['app', 'rust'], liens: ['a', 'b'] });
  assert.equal(fm.body, '# Corps');
  assert.equal(plain('**Voir** [[Projet|le projet]] et `code`'), 'Voir le projet et code');
  assert.equal(slug('État actuel (10/11)'), 'etat-actuel-10-11');
  // Two headings with the same text get two anchors.
  const ids = new Set();
  assert.match(renderMarkdown('## Suite\n## Suite', { ids }), /id="suite"[\s\S]*id="suite-2"/);
});

test('graph: links by name or path, backlinks, broken links, files cited in the notes', () => {
  const files = new Map([
    ['app/src-tauri/src/route.rs', { size: 10, kind: 'txt' }],
    ['licensing/src/admin.js', { size: 10, kind: 'txt' }],
    ['site/admin.js', { size: 10, kind: 'txt' }],
  ]);
  const notes = [
    { path: 'docs/vault/Projet.md', text: '---\ntags: [index]\n---\n# Projet\nVoir [[Technique/Proxy|le proxy]], [[Absente]] et [Journal](Journal.md).\nLe fichier `route.rs`, `licensing/src/admin.js`, `admin.js` (deux fichiers : trop vague) et `docs/vault/Journal.md`.' },
    { path: 'docs/vault/Journal.md', text: '# Journal\n[[Projet#Projet]]' },
    { path: 'docs/vault/Technique/Proxy.md', text: '---\nfichier: app/src-tauri/src/route.rs\n---\nRetour à [[projet]].' },
    { path: 'README.md', text: 'pas une note' },
  ];
  const v = buildVault(notes, files, { repo: 'kaliso-dev/rago', branch: 'staging', sha: 'abc', source: 'github' });
  assert.deepEqual(v.notes.map((n) => n.id), ['Journal', 'Projet', 'Technique/Proxy']);
  const projet = v.notes.find((n) => n.id === 'Projet');
  assert.deepEqual(projet.out.sort(), ['Journal', 'Technique/Proxy']);
  assert.deepEqual(projet.bad, ['Absente']);
  assert.deepEqual(projet.tags, ['index']);
  assert.deepEqual(projet.code.sort(), ['app/src-tauri/src/route.rs', 'licensing/src/admin.js']);
  assert.match(projet.h, /<a class="wl" href="#n=Technique%2FProxy" data-note="Technique\/Proxy">le proxy<\/a>/);
  assert.match(projet.h, /<a class="wl ghost" href="#" data-ghost="Absente"/);
  assert.match(projet.h, /<code class="cf" data-file="app\/src-tauri\/src\/route.rs"/);
  assert.match(projet.h, /<code>admin.js<\/code>/);
  assert.match(projet.h, /data-note="Journal"><code>docs\/vault\/Journal.md<\/code><\/a>/);
  assert.equal(projet.ctx.Journal.startsWith('Voir le proxy'), true);
  assert.equal(v.notes.find((n) => n.id === 'Technique/Proxy').g, 'Technique');
  assert.deepEqual(v.notes.find((n) => n.id === 'Technique/Proxy').code, ['app/src-tauri/src/route.rs']);
  assert.deepEqual(v.ghosts, [{ name: 'Absente', from: ['Projet'] }]);
  assert.deepEqual(v.stats, { notes: 3, links: 4, broken: 1, words: v.stats.words, codeRefs: 2, files: 3 });
  assert.deepEqual(v.groups.sort((a, b) => a.id.localeCompare(b.id)), [{ id: '', count: 2 }, { id: 'Technique', count: 1 }]);
});

test('untar: GitHub archives with long names (pax) and the commit in the global header', () => {
  const sha = 'a'.repeat(40);
  const long = `docs/vault/${'Très long dossier/'.repeat(6)}Note.md`;
  const { files, comment } = untar(gunzipSync(tarball({ 'README.md': 'bonjour', [long]: '# Note' }, sha)));
  assert.equal(comment, sha);
  assert.deepEqual(files.map((f) => [f.path, f.data.toString()]), [
    [`kaliso-dev-rago-aaaaaaa/README.md`, 'bonjour'],
    [`kaliso-dev-rago-aaaaaaa/${long}`, '# Note'],
  ]);
});

test('brain from GitHub: branch head without the API, archive once per commit, clear errors', async () => {
  let sha = '1'.repeat(40);
  const repoFiles = {
    'docs/vault/Projet.md': '# Projet\n[[Journal]] et `licensing/src/app.js`.',
    'docs/vault/Journal.md': '# Journal',
    'licensing/src/app.js': 'export const a = 1;\n',
    'brand/logo.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0]),
    'README.md': '# Rago\nVoir [le projet](docs/vault/Projet.md) et [le serveur](licensing/src/app.js).',
  };
  const calls = [];
  let status = 200;
  const fetchImpl = async (url, opts = {}) => {
    calls.push([url, opts.headers?.authorization || '']);
    if (status !== 200) return new Response('no', { status });
    if (url.endsWith('/info/refs?service=git-upload-pack')) {
      return new Response(`001e# service=git-upload-pack\n0000015b${sha} HEAD\0multi_ack\n003f${sha} refs/heads/staging\n003f${'9'.repeat(40)} refs/heads/claude/rago\n0000`);
    }
    if (url.includes('/tar.gz/') || url.includes('/tarball/')) return new Response(tarball(repoFiles, sha));
    return new Response('?', { status: 404 });
  };
  const brain = createBrain(loadConfig({ CERVEAU_SOURCE: 'github' }), { fetchImpl, log: quiet });
  assert.equal(brain.source, 'github');
  const s = await brain.read();
  assert.equal(s.data.sha, sha);
  assert.equal(s.data.branch, 'staging');
  assert.deepEqual(s.data.notes.map((n) => n.id), ['Journal', 'Projet']);
  assert.deepEqual(s.data.files.map((f) => [f.p, f.k]), [['brand/logo.png', 'bin'], ['docs/vault/Journal.md', 'txt'], ['docs/vault/Projet.md', 'txt'], ['licensing/src/app.js', 'txt'], ['README.md', 'txt']].sort((a, b) => a[0].localeCompare(b[0])));
  assert.deepEqual(calls.map((c) => c[0]), ['https://github.com/kaliso-dev/rago.git/info/refs?service=git-upload-pack', `https://codeload.github.com/kaliso-dev/rago/tar.gz/${sha}`]);
  assert.equal(JSON.parse(gunzipSync(s.gzip)).stats.notes, 2);

  // Files: only the ones of the archive; markdown outside the vault is shown read, with links that open in the page.
  assert.deepEqual(await brain.file('licensing/src/app.js'), { p: 'licensing/src/app.js', s: 20, k: 'txt', lang: 'js', text: 'export const a = 1;\n' });
  assert.deepEqual(await brain.file('brand/logo.png'), { p: 'brand/logo.png', s: 7, k: 'bin', lang: 'png' });
  assert.equal(await brain.file('../../etc/passwd'), null);
  assert.equal(await brain.file('licensing/.env'), null);
  const readme = await brain.file('README.md');
  assert.match(readme.html, /<a class="wl" href="#n=Projet" data-note="Projet">le projet<\/a>/);
  assert.match(readme.html, /<a class="fl" href="#f=licensing%2Fsrc%2Fapp.js" data-file="licensing\/src\/app.js">le serveur<\/a>/);

  // Within the minute: nothing asked. Fresh, same commit: only the branch head. New commit: the new archive.
  await brain.read();
  assert.equal(calls.length, 2);
  await brain.read({ fresh: true });
  assert.equal(calls.length, 3);
  sha = '2'.repeat(40);
  repoFiles['docs/vault/Nouvelle.md'] = '# Nouvelle';
  const s2 = await brain.read({ fresh: true });
  assert.equal(s2.data.sha, sha);
  assert.equal(s2.data.stats.notes, 3);
  assert.notEqual(s2.etag, s.etag);

  // GitHub down: the last build stays, with the reason; a private repository without a token says what to do.
  status = 500;
  const s3 = await brain.read({ fresh: true });
  assert.equal(s3.data.sha, sha);
  assert.match(brain.error(), /GitHub a répondu 500/);
  status = 404;
  const lost = createBrain(loadConfig({ CERVEAU_SOURCE: 'github' }), { fetchImpl, log: quiet });
  await assert.rejects(lost.read(), (err) => err instanceof BrainError && /CERVEAU_GITHUB_TOKEN/.test(err.message));

  // With a token (private repository): sent to GitHub, through the API for the archive.
  status = 200;
  calls.length = 0;
  const priv = createBrain(loadConfig({ CERVEAU_SOURCE: 'github', CERVEAU_GITHUB_TOKEN: 'github_pat_test' }), { fetchImpl, log: quiet });
  await priv.read();
  assert.equal(calls[0][1], `Basic ${Buffer.from('x-access-token:github_pat_test').toString('base64')}`);
  assert.deepEqual(calls[1], [`https://api.github.com/repos/kaliso-dev/rago/tarball/${sha}`, 'Bearer github_pat_test']);
  // A branch that doesn't exist.
  const nobranch = createBrain(loadConfig({ CERVEAU_SOURCE: 'github', CERVEAU_BRANCH: 'nope' }), { fetchImpl, log: quiet });
  await assert.rejects(nobranch.read(), /La branche nope n’existe pas/);
});

test('brain from this working copy: the whole vault reads without a broken page', async () => {
  const brain = createBrain(loadConfig({}), { log: quiet });
  assert.equal(brain.source, 'disk');
  const { data } = await brain.read();
  assert.ok(data.notes.length > 50, `${data.notes.length} notes`);
  for (const id of ['Projet', 'État actuel', 'Règles de travail', 'Décisions']) assert.ok(data.notes.some((n) => n.id === id), id);
  assert.ok(data.files.some((f) => f.p === 'licensing/src/brain.js'));
  assert.ok(!data.files.some((f) => /(^|\/)\.env$/.test(f.p)));
  const f = await brain.file('licensing/package.json');
  assert.equal(JSON.parse(f.text).name, 'rago-licensing');
  assert.equal(await brain.file('licensing/../../etc/passwd'), null);
});

test('/admin/cerveau: behind the admin key, page without inline code, data revalidated with its ETag', async () => {
  const KEY = 'admin-key-0123456789abcdef';
  const cfg = loadConfig({ PUBLIC_URL: 'http://localhost', ADMIN_KEY: KEY });
  const db = await openMemoryDb();
  await ensureKeys(db, cfg);
  const fetchImpl = async () => new Response('offline', { status: 503 });
  const mailer = { purchase: async () => {}, passwordReset: async () => {}, signupCode: async () => {}, subscriptionCanceled: async () => {} };
  const app = createApp({ cfg, db, keys: loadKeys(cfg.signingKeyPem), stripe: new Stripe('sk_test_fake'), mailer, log: quiet, fetchImpl });

  // Signed out: back to the key form, nothing of the vault.
  for (const path of ['/admin/cerveau', '/admin/cerveau/donnees.json', '/admin/cerveau/fichier?chemin=README.md']) {
    const res = await app.request(path);
    assert.equal(res.status, 303, path);
    assert.equal(res.headers.get('location'), '/admin');
  }
  const login = await app.request('/admin/login', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/x-www-form-urlencoded' }, body: `key=${KEY}` });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const get = (path, headers = {}) => app.request(path, { headers: { cookie, ...headers } });

  const page = await get('/admin/cerveau');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<canvas id="cv-canvas"/);
  assert.match(html, /data-src="\/admin\/cerveau\/donnees.json"/);
  assert.doesNotMatch(html, /<script>|<script(?![^>]*\bsrc=)[^>]*>|\sstyle="|\son[a-z]+="/i);
  assert.match(page.headers.get('content-security-policy') || '', /script-src 'self'/);
  // The admin menu leads to it.
  assert.match(await (await get('/admin/site')).text(), /href="\/admin\/cerveau"[^>]*>[\s\S]*?Cerveau/);

  const res = await get('/admin/cerveau/donnees.json', { 'accept-encoding': 'gzip' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-encoding'), 'gzip');
  assert.equal(res.headers.get('cache-control'), 'private, no-cache');
  const etag = res.headers.get('etag');
  const data = JSON.parse(gunzipSync(Buffer.from(await res.arrayBuffer())));
  assert.equal(data.source, 'disk');
  assert.ok(data.notes.some((n) => n.id === 'Projet'));
  assert.equal((await get('/admin/cerveau/donnees.json', { 'if-none-match': etag })).status, 304);
  const plainRes = await get('/admin/cerveau/donnees.json');
  assert.equal(plainRes.headers.get('content-encoding'), null);
  assert.equal((await plainRes.json()).stats.notes, data.stats.notes);

  const file = await get(`/admin/cerveau/fichier?chemin=${encodeURIComponent('licensing/src/brain.js')}`);
  assert.equal(file.status, 200);
  assert.match((await file.json()).text, /export function createBrain/);
  assert.equal((await get('/admin/cerveau/fichier?chemin=/etc/passwd')).status, 404);
  assert.equal((await get('/admin/cerveau/fichier')).status, 404);
  await db.close?.();
});
