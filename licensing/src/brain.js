// The brain (/admin/cerveau, 2026-11-10): the project's Obsidian vault (docs/vault) drawn as a living graph of
// notes and links, with a reader for every note and every file of the repository. Asked by Sofiene on 10/11:
// « une vision graphique du cerveau comme obsidian avec un schéma ou on voir les connexcion neuronale on pourra
// aussi ouvrir n'importe quel fichier et le lire ». Behind ADMIN_KEY like the rest of /admin: Abel uses the same
// key (Sofiene's choice, 10/11). Page: brain-views.js; drawing and reading in the browser: public/cerveau.js.
//
// Where the vault comes from. Railway builds licensing/ alone, so docs/vault is not in the image: the server reads
// the repository from GitHub. The head commit of CERVEAU_BRANCH (staging by default, where vault changes land
// first) is read from git's smart-HTTP ref list (no REST API quota), and the tarball of that commit is downloaded
// only when the commit changes, at most once a minute and only while someone looks. While the repository is
// private (now and then in November, for good from the 1st of December), CERVEAU_GITHUB_TOKEN (a read-only
// "Contents" token) is needed.
// Locally (npm run local, tests) the working copy is read from disk instead (CERVEAU_DIR, or the repo around us).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

export const BRAIN_VERSION = 1; // bumped when the data sent to the page changes shape (part of its ETag)
const VAULT = 'docs/vault/'; // the Rago vault; other brains have their own folder (brains below)
// The brains the page can switch between (Sofiene, 12/11: « je veux pouvoir switch de cerveau […] je dois pouvoir
// sélectionner le cerveau et il charge »): the Rago vault, and the vault of the new RAGO-OS project, kept in its own
// repository (kaliso-dev/RAGO-OS-, created by Sofiene on 12/11). Without a repository, a brain is read from
// CERVEAU_REPO / CERVEAU_BRANCH (and from the working copy when the server runs from one).
// CERVEAUX replaces this list: "id|Nom|dossier|dépôt|branche;…" (dépôt and branche optional).
export const DEFAULT_BRAINS = [
  { id: 'rago', name: 'Rago Optimizer', dir: 'docs/vault/' },
  { id: 'rago-os', name: 'RAGO-OS', dir: 'docs/vault/', repo: 'kaliso-dev/RAGO-OS-', branch: 'main' },
];
export function parseBrains(text) {
  const out = [];
  for (const part of String(text || '').split(/[;\n]/)) {
    const [id, name, dir, repo, branch] = part.split('|').map((x) => (x || '').trim());
    if (!/^[a-z0-9-]{1,40}$/.test(id || '') || !name || !dir || dir.includes('..')) continue;
    if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) continue;
    if (branch && !/^[\w./-]{1,100}$/.test(branch)) continue;
    if (!out.some((b) => b.id === id)) out.push({ id, name, dir: `${dir.replace(/^\/+|\/+$/g, '')}/`, ...(repo ? { repo } : {}), ...(branch ? { branch } : {}) });
  }
  return out.length ? out : DEFAULT_BRAINS.map((b) => ({ ...b }));
}
const isNote = (p, dir) => p.startsWith(dir) && p.endsWith('.md') && !p.includes('/.obsidian/') && !p.includes('/.trash/');
const CHECK_EVERY = 60 * 1000; // how often the branch head is looked at, while the page is used
const MAX_TARBALL = 120 * 1024 * 1024;
const MAX_TEXT = 600 * 1024; // bigger files are listed but not kept: the reader links to GitHub for them

export class BrainError extends Error {}

// ---------- reading the repository ----------

/** Files of a tar archive (ustar, with GNU long names and pax headers as GitHub writes them). */
export function untar(buf) {
  const files = [];
  const global = {};
  let off = 0;
  let pax = null;
  let longName = null;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h[0] === 0 && h.every((b) => b === 0)) break;
    const field = (a, n) => {
      const s = h.subarray(a, a + n);
      const z = s.indexOf(0);
      return (z >= 0 ? s.subarray(0, z) : s).toString('utf8');
    };
    const size = parseInt(field(124, 12).trim() || '0', 8) || 0;
    const type = h[156] ? String.fromCharCode(h[156]) : '0';
    const name = field(0, 100);
    const prefix = field(257, 6).startsWith('ustar') ? field(345, 155) : '';
    off += 512;
    const data = buf.subarray(off, off + size);
    off += Math.ceil(size / 512) * 512;
    if (type === 'x' || type === 'g') {
      const kv = paxRecords(data);
      if (type === 'g') Object.assign(global, kv); else pax = kv;
      continue;
    }
    if (type === 'L') { longName = data.toString('utf8').replace(/\0+$/, ''); continue; }
    const path = pax?.path || longName || (prefix ? `${prefix}/${name}` : name);
    pax = null;
    longName = null;
    if (type === '0' || type === '7') files.push({ path, data });
  }
  return { files, comment: global.comment || '' };
}

function paxRecords(data) {
  const kv = {};
  let i = 0;
  while (i < data.length) {
    const sp = data.indexOf(0x20, i);
    if (sp < 0) break;
    const len = parseInt(data.subarray(i, sp).toString('ascii'), 10);
    if (!len) break;
    const rec = data.subarray(sp + 1, i + len - 1).toString('utf8');
    const eq = rec.indexOf('=');
    if (eq > 0) kv[rec.slice(0, eq)] = rec.slice(eq + 1);
    i += len;
  }
  return kv;
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0);
const extOf = (p) => {
  const base = p.slice(p.lastIndexOf('/') + 1).toLowerCase();
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1) : base;
};

/** The repository folder around this server when it runs from a working copy (local, tests), else null. */
export function localRepo(dir) {
  const candidates = dir ? [dir] : [fileURLToPath(new URL('../..', import.meta.url))];
  for (const root of candidates) if (root && existsSync(join(root, VAULT))) return root;
  return null;
}

function git(root, args) {
  try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
}

function walk(root, rel = '') {
  const out = [];
  for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (['.git', 'node_modules', 'target', 'dist', '.obsidian', '.trash'].includes(e.name)) continue;
      out.push(...walk(root, p));
    } else if (e.isFile() && !/^\.env(?!\.example)/.test(e.name)) out.push(p);
  }
  return out;
}

/** Working copy on disk: tracked and new (not ignored) files; contents read when asked. */
function readDisk(root) {
  const listed = git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
  const paths = listed ? listed.split('\0').filter(Boolean) : walk(root);
  const files = new Map();
  for (const p of paths) {
    if (/(^|\/)\.env(?!\.example)[^/]*$/.test(p)) continue; // never a local .env, even if someone forgot to ignore it
    let st;
    try { st = statSync(join(root, p)); } catch { continue; }
    if (!st.isFile()) continue;
    files.set(p, { size: st.size, mtime: st.mtimeMs });
  }
  const sha = (git(root, ['rev-parse', 'HEAD']) || '').trim();
  const branch = (git(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || '').trim();
  return { files, sha, branch };
}

// ---------- markdown (the subset the vault uses: Obsidian flavour) ----------

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function slug(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/`|\*|_|\[\[|\]\]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

/** Front matter between the first two `---` lines: `key: value`, `key: [a, b]` and `key:` followed by `- a` lines. */
export function frontMatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
  if (!m) return { data: {}, body: src, lines: 0 };
  const data = {};
  let last = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && last) { (Array.isArray(data[last]) ? data[last] : (data[last] = [])).push(unquote(item[1])); continue; }
    const kv = /^([^\s:#][^:]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    last = kv[1].trim();
    const v = kv[2].trim();
    data[last] = /^\[.*\]$/.test(v) ? v.slice(1, -1).split(',').map((x) => unquote(x.trim())).filter(Boolean) : v === '' ? '' : unquote(v);
  }
  return { data, body: src.slice(m[0].length), lines: m[0].split('\n').length - 1 };
}
const unquote = (v) => String(v).replace(/^(["'])(.*)\1$/, '$2');

/** Plain text of a line of markdown, for search and for the context of a link. */
export function plain(md) {
  return String(md)
    .replace(/!?\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g, (_, t, h, a) => a || (h ? `${t} › ${h}` : t))
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`+([^`]*)`+/g, '$1')
    .replace(/(\*\*|__|~~|==)/g, '')
    .replace(/(^|\s)[*_](\S[^*_]*?)[*_](?=\s|$|[.,;:!?)])/g, '$1$2')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const isTableStart = (lines, i) => lines[i].includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-');
const indentOf = (s) => s.replace(/\t/g, '    ').match(/^ */)[0].length;

/** Splits a table row on `|`, keeping pipes inside `code` and escaped `\|` (used by [[Note\|alias]] in tables). */
function cells(row) {
  let s = row.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out = [];
  let cur = '';
  let tick = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if (ch === '`') tick = !tick;
    if (ch === '|' && !tick) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Markdown to HTML. ctx: { wiki(target, alias, embed) -> html, code(text) -> html, link(textHtml, href) -> html,
 * ids: Set of heading ids already used, headings: [] filled with { level, text, id }, line: (raw) => void }.
 * Everything typed in a note is escaped: the only HTML that comes out is the one written here.
 */
export function renderMarkdown(src, ctx) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  return blocks(lines, ctx);
}

function blocks(lines, ctx) {
  const out = [];
  let i = 0;
  const startsBlock = (k) => FENCE.test(lines[k]) || HEADING.test(lines[k]) || HR.test(lines[k]) || QUOTE.test(lines[k]) || LIST.test(lines[k]) || isTableStart(lines, k);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    let m = FENCE.exec(line);
    if (m) {
      const [, pad, fence, lang] = m;
      const body = [];
      i++;
      while (i < lines.length && !(lines[i].trim().startsWith(fence[0].repeat(fence.length)) && lines[i].trim().replace(new RegExp(`^\\${fence[0]}+`), '').trim() === '')) {
        body.push(lines[i].startsWith(pad) ? lines[i].slice(pad.length) : lines[i]);
        i++;
      }
      i++;
      out.push(`<pre class="code"${lang ? ` data-lang="${esc(lang.toLowerCase())}"` : ''}><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    m = HEADING.exec(line);
    if (m) {
      const level = m[1].length;
      const text = m[2];
      let id = slug(plain(text));
      if (ctx.ids) { let n = 2; const base = id; while (ctx.ids.has(id)) id = `${base}-${n++}`; ctx.ids.add(id); }
      ctx.headings?.push({ level, text: plain(text), id });
      ctx.line?.(text);
      out.push(`<h${level} id="${esc(id)}">${inline(text, ctx)}</h${level}>`);
      i++;
      continue;
    }
    if (HR.test(line)) { out.push('<hr>'); i++; continue; }
    if (QUOTE.test(line)) {
      const body = [];
      while (i < lines.length && QUOTE.test(lines[i])) { body.push(lines[i].replace(/^\s{0,3}>\s?/, '')); i++; }
      const call = /^\[!([\w-]+)\]([+-]?)\s*(.*)$/.exec(body[0] || '');
      if (call) {
        const kind = call[1].toLowerCase();
        const title = call[3] || kind.charAt(0).toUpperCase() + kind.slice(1);
        out.push(`<div class="callout co-${esc(kind)}"><p class="co-t">${inline(title, ctx)}</p>${blocks(body.slice(1), ctx)}</div>`);
      } else out.push(`<blockquote>${blocks(body, ctx)}</blockquote>`);
      continue;
    }
    if (isTableStart(lines, i)) {
      const head = cells(lines[i]);
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'c' : /^-+:$/.test(c) ? 'r' : ''));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) { rows.push(cells(lines[i])); i++; }
      const td = (tag, c, k) => `<${tag}${align[k] ? ` class="al-${align[k]}"` : ''}>${(ctx.line?.(c), inline(c, ctx))}</${tag}>`;
      out.push(`<div class="tbl"><table><thead><tr>${head.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${
        rows.map((r) => `<tr>${head.map((_, k) => td('td', r[k] ?? '', k)).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (LIST.test(line)) {
      const block = [];
      const base = indentOf(line);
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          // A blank line ends the list unless the next line is still part of it (an item or indented text).
          const next = lines[i + 1];
          if (next != null && next.trim() && (LIST.test(next) && indentOf(next) >= base || indentOf(next) > base)) { block.push(''); i++; continue; }
          break;
        }
        if (block.length && !LIST.test(l) && indentOf(l) <= base && startsBlock(i)) break;
        if (block.length && !LIST.test(l) && indentOf(l) <= base && !lines[i - 1].trim()) break;
        block.push(l);
        i++;
      }
      out.push(list(block, ctx));
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !(para.length && startsBlock(i))) { para.push(lines[i].trim()); i++; }
    if (!para.length) { para.push(line.trim()); i++; }
    out.push(`<p>${para.map((p) => (ctx.line?.(p), inline(p, ctx))).join('<br>')}</p>`);
  }
  return out.join('\n');
}

function list(lines, ctx) {
  // Items with their indentation; text lines that aren't items belong to the item above.
  const items = [];
  for (const l of lines) {
    const m = LIST.exec(l);
    if (m) items.push({ indent: indentOf(m[1]), ordered: /\d/.test(m[2]), start: parseInt(m[2], 10) || 1, body: [m[4]], kids: [] });
    else if (items.length) items[items.length - 1].body.push(l.replace(/^\s{0,8}/, ''));
  }
  const root = { indent: -1, kids: [] };
  const stack = [root];
  for (const it of items) {
    while (stack.length > 1 && it.indent <= stack[stack.length - 1].indent) stack.pop();
    stack[stack.length - 1].kids.push(it);
    stack.push(it);
  }
  const render = (kids) => {
    const groups = [];
    for (const k of kids) {
      const g = groups[groups.length - 1];
      if (g && g.ordered === k.ordered) g.items.push(k); else groups.push({ ordered: k.ordered, start: k.start, items: [k] });
    }
    return groups.map((g) => {
      const tag = g.ordered ? 'ol' : 'ul';
      const lis = g.items.map((k) => {
        let first = k.body[0] || '';
        let task = '';
        const t = /^\[([ xX])\]\s+(.*)$/.exec(first);
        if (t) { task = t[1] === ' ' ? 'todo' : 'done'; first = t[2]; }
        const rest = k.body.slice(1);
        ctx.line?.(first);
        const inner = rest.some((r) => r.trim())
          ? `${inline(first, ctx)}${blocks(rest, ctx).replace(/^<p>([\s\S]*)<\/p>$/, '<br>$1')}`
          : inline(first, ctx);
        const box = task ? `<span class="task ${task}" aria-label="${task === 'done' ? 'Fait' : 'À faire'}"></span>` : '';
        return `<li${task ? ' class="li-task"' : ''}>${box}${inner}${k.kids.length ? render(k.kids) : ''}</li>`;
      }).join('');
      return `<${tag}${g.ordered && g.start !== 1 ? ` start="${g.start}"` : ''}>${lis}</${tag}>`;
    }).join('');
  };
  return render(root.kids);
}

const SAFE_URL = /^(https?:\/\/|mailto:)/i;

export function inline(src, ctx) {
  const kept = [];
  const keep = (html) => `\u0000${kept.push(html) - 1}\u0000`;
  let s = String(src);
  s = s.replace(/(`+)(.+?)\1(?!`)/g, (_, __, code) => keep(ctx.code ? ctx.code(code.trim()) : `<code>${esc(code.trim())}</code>`));
  s = s.replace(/(!?)\[\[([^[\]\n]+?)\]\]/g, (_, bang, inner) => {
    const [target, alias] = inner.split(/\\?\|/);
    return keep(ctx.wiki ? ctx.wiki(target.trim(), alias?.trim() || '', !!bang) : esc(alias || target));
  });
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, href) => keep(SAFE_URL.test(href)
    ? `<a class="ext" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(alt || 'image')}</a>` : esc(alt)));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, text, href) => keep(ctx.link
    ? ctx.link(inline(text, { ...ctx, line: null }), href)
    : SAFE_URL.test(href) ? `<a class="ext" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inline(text, ctx)}</a>` : inline(text, ctx)));
  s = s.replace(/<(https?:\/\/[^>\s]+)>/g, (_, url) => keep(`<a class="ext" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`));
  s = s.replace(/(^|[\s(«])(https?:\/\/[^\s<>()«»"]+[^\s<>()«»".,;:!?'])/g, (_, pre, url) => `${pre}${keep(`<a class="ext" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`)}`);
  s = esc(s)
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
    .replace(/(^|[^\w*])\*(?=[^\s*])([^*]*?[^\s*])\*(?![\w*])/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_(?=[^\s_])([^_]*?[^\s_])_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
    .replace(/==(?=\S)([\s\S]*?\S)==/g, '<mark>$1</mark>');
  // Kept pieces may hold other kept pieces (a link around code): restore until none is left.
  for (let k = 0; k < 3 && s.includes('\u0000'); k++) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => kept[Number(n)]);
  return s;
}

// ---------- the vault as a graph ----------

const groupOf = (id) => (id.includes('/') ? id.slice(0, id.indexOf('/')) : '');

/**
 * Builds what the page needs from the vault's notes and the repository's file list.
 * notes: [{ path (from the repo root), text }]; files: Map(path -> { size, kind }).
 */
export function buildVault(notesIn, files, meta = {}) {
  const VAULT = meta.vault || DEFAULT_BRAINS[0].dir;
  const notes = notesIn.filter((n) => n.path.startsWith(VAULT) && n.path.endsWith('.md'))
    .map((n) => ({ path: n.path, text: n.text, id: n.path.slice(VAULT.length, -3) }))
    .sort((a, b) => a.id.localeCompare(b.id, 'fr'));
  const byId = new Map(notes.map((n) => [n.id.toLowerCase(), n]));
  const byName = new Map();
  for (const n of notes) {
    const k = posix.basename(n.id).toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(n);
  }
  const resolveNote = (raw, fromDir = '') => {
    let t = String(raw).replace(/\\/g, '/').replace(/\.md$/i, '').replace(/^\.\//, '').trim();
    if (!t) return null;
    if (t.includes('/')) {
      const rel = fromDir ? posix.normalize(`${fromDir}/${t}`) : t;
      return byId.get(rel.toLowerCase()) || byId.get(t.toLowerCase())
        || notes.find((n) => n.id.toLowerCase().endsWith(`/${t.toLowerCase()}`)) || null;
    }
    const list = byName.get(t.toLowerCase());
    return list ? list.slice().sort((a, b) => a.id.length - b.id.length)[0] : null;
  };

  // Repo files by name, to turn `route.rs` or `src/app.js` written in a note into a link to the file.
  const fileNames = new Map();
  for (const p of files.keys()) {
    const k = posix.basename(p).toLowerCase();
    fileNames.set(k, fileNames.has(k) ? null : p); // null: the name exists twice, too vague
  }
  const resolveFile = (raw) => {
    let t = String(raw).trim().replace(/^\.\//, '').replace(/:(\d+)(-\d+)?$/, '').replace(/[),.;]+$/, '');
    if (!t || t.length > 200 || /\s/.test(t) || !/[./]/.test(t)) return null;
    if (files.has(t)) return t;
    if (t.startsWith('/')) t = t.slice(1);
    if (files.has(t)) return t;
    if (t.includes('/')) {
      const hits = [];
      for (const p of files.keys()) if (p.endsWith(`/${t}`)) { hits.push(p); if (hits.length > 1) break; }
      return hits.length === 1 ? hits[0] : null;
    }
    return /\.[a-z0-9]{1,6}$/i.test(t) ? fileNames.get(t.toLowerCase()) || null : null;
  };

  const ghosts = new Map(); // unresolved link target -> notes that point to it
  const out = [];
  for (const n of notes) {
    const fm = frontMatter(n.text);
    const dir = posix.dirname(n.id) === '.' ? '' : posix.dirname(n.id);
    const links = new Map(); // id -> number of links
    const context = {}; // id -> the line where the first link to it is
    const code = new Set();
    const broken = new Set();
    let current = '';
    const ctx = {
      ids: new Set(),
      headings: [],
      line: (raw) => { current = raw; },
      wiki: (target, alias, embed) => {
        const [name, ...anchor] = target.split('#');
        const h = anchor.join('#').replace(/^\^/, '');
        const label = alias || (h ? `${name || posix.basename(n.id)} › ${h}` : name);
        const hit = name ? resolveNote(name, dir) : n;
        if (!hit) {
          broken.add(name);
          if (!ghosts.has(name)) ghosts.set(name, new Set());
          ghosts.get(name).add(n.id);
          return `<a class="wl ghost" href="#" data-ghost="${esc(name)}" title="Cette note n’existe pas">${esc(label)}</a>`;
        }
        if (hit !== n) {
          links.set(hit.id, (links.get(hit.id) || 0) + 1);
          if (!context[hit.id]) context[hit.id] = plain(current).slice(0, 260);
        }
        return `<a class="wl${embed ? ' embed' : ''}" href="#n=${encodeURIComponent(hit.id)}${h ? `&h=${encodeURIComponent(slug(h))}` : ''}" data-note="${esc(hit.id)}"${h ? ` data-h="${esc(slug(h))}"` : ''}>${esc(label)}</a>`;
      },
      code: (text) => {
        // `docs/vault/Projet.md` (the folder of this brain) or `Rago_OS_Pro_Build_Bible.md` (a note's file name)
        const t = text.trim().replace(/^\.\//, '');
        const note = !/\.md$/i.test(t) ? null : t.toLowerCase().startsWith(VAULT.toLowerCase()) ? resolveNote(t.slice(VAULT.length, -3))
          : !t.includes('/') && !/\s/.test(t) ? resolveNote(t.slice(0, -3)) : null;
        if (note) {
          if (note !== n) { links.set(note.id, (links.get(note.id) || 0) + 1); if (!context[note.id]) context[note.id] = plain(current).slice(0, 260); }
          return `<a class="wl" href="#n=${encodeURIComponent(note.id)}" data-note="${esc(note.id)}"><code>${esc(text)}</code></a>`;
        }
        const p = resolveFile(text);
        if (!p) return `<code>${esc(text)}</code>`;
        code.add(p);
        return `<code class="cf" data-file="${esc(p)}" title="Ouvrir ${esc(p)}">${esc(text)}</code>`;
      },
      link: (html, href) => {
        if (SAFE_URL.test(href)) return `<a class="ext" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
        let clean = '';
        try { clean = decodeURIComponent(href.split('#')[0] || ''); } catch { return html; }
        const note = clean && /\.md$/i.test(clean) ? resolveNote(clean, dir) : null;
        if (note) {
          if (note !== n) { links.set(note.id, (links.get(note.id) || 0) + 1); if (!context[note.id]) context[note.id] = plain(current).slice(0, 260); }
          return `<a class="wl" href="#n=${encodeURIComponent(note.id)}" data-note="${esc(note.id)}">${html}</a>`;
        }
        const p = clean && resolveFile(posix.normalize(posix.join(VAULT, posix.dirname(n.id), clean))) || resolveFile(clean);
        if (p) { code.add(p); return `<a class="fl" href="#f=${encodeURIComponent(p)}" data-file="${esc(p)}">${html}</a>`; }
        return html;
      },
    };
    const html = renderMarkdown(fm.body, ctx);
    if (typeof fm.data.fichier === 'string') { const p = resolveFile(fm.data.fichier); if (p) code.add(p); }
    const tags = [].concat(fm.data.tags || []).map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean);
    const text = plain(fm.body);
    const firstH1 = ctx.headings.find((h) => h.level === 1);
    out.push({
      id: n.id,
      t: posix.basename(n.id),
      g: groupOf(n.id),
      d: dir,
      fm: fm.data,
      tags,
      h: html,
      x: text,
      hd: ctx.headings.filter((h) => h.level <= 3).map(({ level, text: tx, id }) => [level, tx, id]),
      h1: !!firstH1,
      out: [...links.keys()],
      ctx: context,
      code: [...code],
      bad: [...broken],
      w: text ? text.split(' ').length : 0,
      s: Buffer.byteLength(n.text),
    });
  }

  const linkCount = out.reduce((a, n) => a + n.out.length, 0);
  const groups = {};
  for (const n of out) groups[n.g] = (groups[n.g] || 0) + 1;
  return {
    v: BRAIN_VERSION,
    brain: meta.brain || '',
    brains: meta.brains || [],
    vault: VAULT,
    repo: meta.repo || '',
    branch: meta.branch || '',
    sha: meta.sha || '',
    source: meta.source || '',
    at: meta.at || Date.now(),
    notes: out,
    ghosts: [...ghosts].map(([name, from]) => ({ name, from: [...from] })),
    files: [...files].map(([p, f]) => ({ p, s: f.size, k: f.kind })).sort((a, b) => a.p.localeCompare(b.p)),
    groups: Object.entries(groups).map(([id, count]) => ({ id, count })),
    stats: {
      notes: out.length,
      links: linkCount,
      broken: out.reduce((a, n) => a + n.bad.length, 0),
      words: out.reduce((a, n) => a + n.w, 0),
      codeRefs: new Set(out.flatMap((n) => n.code)).size,
      files: files.size,
    },
  };
}

// ---------- the brain: one snapshot per repository, each brain built from the snapshot of its repository ----------

/**
 * createBrain(cfg, { fetchImpl, log }) -> { brains, pick(id), read({ fresh, id }) -> state, file(path, id) -> {...}, error(id) }
 * cfg.brains: [{ id, name, dir, repo?, branch? }]. Each repository@branch is read once (GitHub, or the working copy
 * for the main repository when the server runs from one) and shared by the brains it holds; a brain is built from
 * it the first time it is asked, and again only when the snapshot changes.
 * state: { data (what buildVault returned), json, gzip, etag } or throws BrainError when nothing could be read.
 */
export function createBrain(cfg, { fetchImpl = fetch, log = console } = {}) {
  const mainRepo = cfg.brainRepo || 'kaliso-dev/rago';
  const mainBranch = cfg.brainBranch || 'staging';
  const token = cfg.brainToken || '';
  const root = cfg.brainSource === 'github' ? null : localRepo(cfg.brainDir);
  const brains = (cfg.brains?.length ? cfg.brains : DEFAULT_BRAINS).map((b) => {
    const repo = b.repo || mainRepo;
    const branch = b.branch || (b.repo ? 'main' : mainBranch);
    return { ...b, repo, branch, key: `${repo.toLowerCase()}@${branch}`, local: !b.repo || repo.toLowerCase() === mainRepo.toLowerCase() };
  });
  const list = brains.map(({ id, name, repo }) => ({ id, name, repo }));
  const pick = (id) => brains.find((b) => b.id === id) || brains[0];
  const sources = new Map();
  for (const b of brains) {
    if (!sources.has(b.key)) {
      const dirs = brains.filter((x) => x.key === b.key).map((x) => x.dir);
      sources.set(b.key, makeSource({ repo: b.repo, branch: b.branch, root: b.local && b.branch === mainBranch ? root : null, dirs }));
    }
  }
  const builds = new Map(); // brain id -> { data, json, gzip, etag, sig }

  function makeSource({ repo, branch, root: disk, dirs }) {
    const anyNote = (p) => dirs.some((d) => isNote(p, d));
    const src = { repo, branch, disk, snap: null, pending: null, lastError: null };
    const kindOf = (p, size, buf) => (size > MAX_TEXT ? 'big' : BINARY_EXT.has(extOf(p)) || (buf && isBinary(buf)) ? 'bin' : 'txt');

    function loadDisk() {
      const { files: listed, sha, branch: here } = readDisk(disk);
      const md = [...listed.keys()].filter(anyNote);
      const sig = createHash('sha1').update(md.map((p) => `${p}:${listed.get(p).mtime}:${listed.get(p).size}`).join('|') + sha).digest('hex');
      if (src.snap && src.snap.sig === sig) { src.snap.checkedAt = Date.now(); return src.snap; }
      const files = new Map();
      for (const [p, f] of listed) files.set(p, { size: f.size, kind: kindOf(p, f.size) });
      src.snap = { sha, branch: here || 'local', source: 'disk', files, contents: null, notes: null, checkedAt: Date.now(), sig, at: Date.now() };
      return src.snap;
    }

    const authHeader = token ? { authorization: `Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}` } : {};
    async function headSha() {
      let res;
      try {
        res = await fetchImpl(`https://github.com/${repo}.git/info/refs?service=git-upload-pack`, {
          headers: { 'user-agent': 'rago-licensing', ...authHeader }, signal: AbortSignal.timeout(15000) });
      } catch (err) {
        throw new BrainError(`GitHub ne répond pas (${err.message}).`);
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        throw new BrainError(token
          ? `GitHub refuse l’accès au dépôt ${repo} avec CERVEAU_GITHUB_TOKEN (${res.status}) : le jeton a expiré ou n’a pas le droit « Contents : lecture » sur ce dépôt.`
          : `Le dépôt ${repo} n’est pas lisible sans jeton (${res.status}) : il est sans doute privé. Ajoute CERVEAU_GITHUB_TOKEN dans Railway (jeton GitHub en lecture seule, droit « Contents » sur ce dépôt).`);
      }
      if (!res.ok) throw new BrainError(`GitHub a répondu ${res.status} en lisant les branches de ${repo}.`);
      const text = await res.text();
      const ref = `refs/heads/${branch}`;
      const m = new RegExp(`([0-9a-f]{40}) ${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\n|\\0)`).exec(text);
      if (!m) throw new BrainError(`La branche ${branch} n’existe pas dans ${repo}.`);
      return m[1];
    }
    async function download(sha) {
      const url = token ? `https://api.github.com/repos/${repo}/tarball/${sha}` : `https://codeload.github.com/${repo}/tar.gz/${sha}`;
      const headers = { 'user-agent': 'rago-licensing', ...(token ? { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } : {}) };
      let res;
      try { res = await fetchImpl(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(90000) }); } catch (err) {
        throw new BrainError(`Téléchargement du dépôt ${repo} impossible (${err.message}).`);
      }
      if (!res.ok) throw new BrainError(`GitHub a répondu ${res.status} en envoyant le dépôt ${repo}.`);
      const gz = Buffer.from(await res.arrayBuffer());
      if (gz.length > MAX_TARBALL) throw new BrainError('Le dépôt est trop gros pour être lu ici.');
      const tar = gunzipSync(gz, { maxOutputLength: 4 * MAX_TARBALL });
      return untar(tar).files;
    }
    async function loadGithub(sha) {
      const entries = await download(sha);
      const files = new Map();
      const contents = new Map();
      const notes = new Map(); // every note of the brains of this repository, whatever its size
      for (const e of entries) {
        const p = e.path.slice(e.path.indexOf('/') + 1); // GitHub puts everything in <owner>-<repo>-<sha>/
        if (!p) continue;
        const kind = kindOf(p, e.data.length, e.data);
        files.set(p, { size: e.data.length, kind });
        if (kind === 'txt') contents.set(p, e.data.toString('utf8'));
        if (anyNote(p)) notes.set(p, e.data.toString('utf8'));
      }
      src.snap = { sha, branch, source: 'github', files, contents, notes, checkedAt: Date.now(), sig: sha, at: Date.now() };
      log.info?.(`[cerveau] ${repo} ${branch}@${sha.slice(0, 7)} : ${notes.size} notes, ${files.size} fichiers.`);
      return src.snap;
    }
    async function refresh(force) {
      if (disk) return loadDisk();
      if (!force && src.snap && Date.now() - src.snap.checkedAt < CHECK_EVERY) return src.snap;
      const sha = await headSha();
      if (src.snap && src.snap.sha === sha) { src.snap.checkedAt = Date.now(); return src.snap; }
      return loadGithub(sha);
    }
    src.run = (force) => {
      if (!src.pending) {
        src.pending = Promise.resolve().then(() => refresh(force))
          .then((s) => { src.lastError = null; return s; })
          .catch((err) => {
            src.lastError = err instanceof BrainError ? err.message : `Lecture du vault impossible : ${err.message}`;
            if (!(err instanceof BrainError)) log.error?.(`[cerveau] ${err.stack || err.message}`);
            if (src.snap) { src.snap.checkedAt = Date.now(); return src.snap; }
            throw new BrainError(src.lastError);
          })
          .finally(() => { src.pending = null; });
      }
      return src.pending;
    };
    /** Waits only when there is no snapshot yet (or when fresh is asked); otherwise refreshes behind. */
    src.get = async (fresh) => {
      if (!src.snap || fresh) return src.run(fresh);
      if (disk || Date.now() - src.snap.checkedAt >= CHECK_EVERY) src.run(false).catch(() => {});
      return src.snap;
    };
    return src;
  }

  /** The build of one brain from the snapshot of its repository (kept until the snapshot changes). */
  function build(b, s) {
    const have = builds.get(b.id);
    if (have && have.sig === s.sig) return have;
    const src = sources.get(b.key);
    const paths = [...s.files.keys()].filter((p) => isNote(p, b.dir));
    const notes = paths.map((p) => ({ path: p, text: s.notes ? s.notes.get(p) ?? '' : readFileSync(join(src.disk, p), 'utf8') }));
    const built = buildVault(notes, s.files, { repo: b.repo, branch: s.branch, sha: s.sha, source: s.source, at: s.at, vault: b.dir, brain: b.id, brains: list });
    const json = JSON.stringify(built);
    const state = { data: built, json, gzip: gzipSync(json), etag: `"brain-${BRAIN_VERSION}-${b.id}-${createHash('sha256').update(json).digest('base64url').slice(0, 20)}"`, sig: s.sig };
    builds.set(b.id, state);
    return state;
  }

  const main = sources.get(brains[0].key);
  return {
    source: main.disk ? 'disk' : 'github',
    repo: brains[0].repo,
    branch: brains[0].branch,
    brains: list,
    pick: (id) => { const { key, local, ...b } = pick(id); return b; },
    /** The current build of a brain (the first one when id is unknown). */
    async read({ fresh = false, id } = {}) {
      const b = pick(id);
      const s = await sources.get(b.key).get(fresh);
      const state = build(b, s);
      if (!state.data.notes.length) {
        throw new BrainError(`Le cerveau « ${b.name} » est vide : aucune note .md dans ${b.dir} de ${b.repo} (branche ${s.branch}).`);
      }
      return state;
    },
    /** Why the last reading of this brain's repository failed (the last build stays shown), or null. */
    error: (id) => sources.get(pick(id).key).lastError,
    /** One file of the brain's repository, for the reader. Only paths of the file list: nothing else on disk is reachable. */
    async file(path, id) {
      const b = pick(id);
      const src = sources.get(b.key);
      const s = await src.get(false);
      const f = s.files.get(path);
      if (!f) return null;
      const out = { p: path, s: f.size, k: f.kind, lang: extOf(path) };
      if (f.kind !== 'txt') return out;
      let text = s.contents ? s.contents.get(path) : null;
      if (!s.contents) {
        let buf;
        try { buf = readFileSync(join(src.disk, path)); } catch { return null; }
        if (isBinary(buf)) return { ...out, k: 'bin' };
        text = buf.toString('utf8');
      }
      if (text == null) return { ...out, k: 'big' };
      out.text = text;
      if (out.lang === 'md') out.html = renderFileMarkdown(text, path, { files: s.files, notes: build(b, s).data.notes, vault: b.dir });
      return out;
    },
  };
}

const BINARY_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'woff', 'woff2', 'ttf', 'otf',
  'exe', 'dll', 'zip', 'gz', 'tar', 'pdf', 'pow', 'nip', 'bin', 'mmdb', 'icns']);

/** A markdown file outside the vault (README, guides): links to other files of the repo open in the reader. */
function renderFileMarkdown(text, path, s) {
  const dir = posix.dirname(path);
  const { notes, vault: VAULT } = s;
  const has = (p) => s.files.has(p);
  const ctx = {
    ids: new Set(),
    code: (t) => {
      const p = has(t) ? t : has(posix.normalize(posix.join(dir, t))) ? posix.normalize(posix.join(dir, t)) : null;
      return p ? `<code class="cf" data-file="${esc(p)}" title="Ouvrir ${esc(p)}">${esc(t)}</code>` : `<code>${esc(t)}</code>`;
    },
    wiki: (target, alias) => {
      const n = notes.find((x) => x.t.toLowerCase() === target.split('#')[0].toLowerCase());
      return n ? `<a class="wl" href="#n=${encodeURIComponent(n.id)}" data-note="${esc(n.id)}">${esc(alias || target)}</a>` : esc(alias || target);
    },
    link: (html, href) => {
      if (SAFE_URL.test(href)) return `<a class="ext" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
      let p = '';
      try { p = posix.normalize(posix.join(dir, decodeURIComponent(href.split('#')[0]))); } catch { return html; }
      if (p.startsWith(VAULT) && p.endsWith('.md')) {
        const id = p.slice(VAULT.length, -3);
        return `<a class="wl" href="#n=${encodeURIComponent(id)}" data-note="${esc(id)}">${html}</a>`;
      }
      return has(p) ? `<a class="fl" href="#f=${encodeURIComponent(p)}" data-file="${esc(p)}">${html}</a>` : html;
    },
  };
  return renderMarkdown(frontMatter(text).body, ctx);
}
