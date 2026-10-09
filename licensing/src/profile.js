// Public profile of an account: the name shown with its review and its profile photo.
// Photos are re-encoded here (256 × 256 WebP, metadata dropped) and kept in Supabase Storage, in a private
// bucket served through /avatars/<file>. The database only keeps the object's name (users.avatar_key).
import { randomBytes } from 'node:crypto';

/** Largest upload accepted, before re-encoding (a phone photo fits). */
export const AVATAR_MAX_UPLOAD = 5 * 1024 * 1024;
export const AVATAR_SIZE = 256;
// A 40-megapixel picture at most: a tiny file that decodes to a huge image is refused before it fills memory.
const MAX_PIXELS = 40_000_000;
export const AVATAR_FILE = /^[A-Za-z0-9_-]{20,40}\.webp$/;

export class ProfileError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ---------- public name ----------

export const NAME_MIN = 2;
export const NAME_MAX = 32;
const NAME = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} _.'-]*$/u;

/** The name as stored, or a ProfileError: 2 to 32 letters, digits, spaces and _ . ' -, no email or link. */
export function cleanName(raw) {
  const name = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) throw new ProfileError('invalid_name', `Use ${NAME_MIN} to ${NAME_MAX} characters for your public name.`);
  if (!NAME.test(name) || /https?|www\.|\.(com|net|org|gg|io|fr)\b/i.test(name)) {
    throw new ProfileError('invalid_name', "Use letters, numbers, spaces and _ . ' - for your public name. No email or link.");
  }
  return name;
}

export async function setName(db, userId, name) {
  await db.run('UPDATE users SET display_name = ? WHERE id = ?', [cleanName(name), userId]);
}

// ---------- photo ----------

/** Image formats accepted, recognized by their first bytes (the file name and the declared type don't count). */
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (/^GIF8[79]a$/.test(buf.subarray(0, 6).toString('latin1'))) return 'gif';
  return null;
}

// Loaded on the first photo: if the image library can't load on the server, only photo uploads fail (503), not the server.
let sharpLib = null;
const loadSharp = async () => (sharpLib ??= (await import('sharp')).default);

const BAD_IMAGE = "This file isn't a picture we can use. Upload a JPG, PNG, WebP or GIF.";

/**
 * Checks and shrinks an uploaded picture: JPG, PNG, WebP or GIF (first frame), 5 MB at most.
 * Returns a 256 × 256 WebP (center crop, turned upright, no EXIF or location data), usually under 20 KB.
 */
export async function processAvatar(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input ?? []);
  if (!buf.length) throw new ProfileError('invalid_image', 'Choose a picture first.');
  if (buf.length > AVATAR_MAX_UPLOAD) throw new ProfileError('image_too_large', 'This picture is over 5 MB. Choose a smaller one.');
  const kind = sniff(buf);
  if (!kind) throw new ProfileError('invalid_image', BAD_IMAGE);
  const sharp = await loadSharp();
  try {
    const img = sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: 'error', animated: false });
    const meta = await img.metadata();
    if (meta.format !== kind && !(kind === 'jpeg' && meta.format === 'jpg')) throw new ProfileError('invalid_image', BAD_IMAGE);
    if (!meta.width || !meta.height) throw new ProfileError('invalid_image', BAD_IMAGE);
    return await img
      .rotate() // EXIF orientation, then the EXIF block is dropped (sharp keeps no metadata unless asked)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
  } catch (err) {
    if (err instanceof ProfileError) throw err;
    if (/pixel limit/i.test(err.message)) throw new ProfileError('image_too_large', 'This picture is too big. Choose one under 40 megapixels.');
    throw new ProfileError('invalid_image', BAD_IMAGE);
  }
}

export const newAvatarFile = () => `${randomBytes(18).toString('base64url')}.webp`;

/** The public address of a photo: served by this server, cached for a year (a new photo gets a new name). */
export const avatarUrl = (cfg, key) => (key ? `${cfg.publicUrl}/avatars/${key}` : null);

/**
 * Where photos live. Supabase Storage when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (the private
 * bucket AVATAR_BUCKET, "avatars" by default, created on the first upload), else memory (development: lost on restart).
 */
export function createAvatarStore(cfg, { fetchImpl = fetch, log = console } = {}) {
  const bucket = cfg.avatarBucket || 'avatars';
  const cache = new Map(); // file -> Buffer, the most recent photos served
  const remember = (file, bytes) => {
    cache.delete(file);
    cache.set(file, bytes);
    if (cache.size > 400) cache.delete(cache.keys().next().value);
  };

  if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) {
    const mem = new Map();
    return {
      kind: 'memory',
      async put(file, bytes) { mem.set(file, Buffer.from(bytes)); },
      async get(file) { return mem.get(file) ?? null; },
      async remove(file) { mem.delete(file); cache.delete(file); },
    };
  }

  const auth = () => ({
    apikey: cfg.supabaseServiceKey,
    ...(cfg.supabaseServiceKey.startsWith('eyJ') ? { Authorization: `Bearer ${cfg.supabaseServiceKey}` } : {}),
  });
  const base = `${cfg.supabaseUrl}/storage/v1`;
  const missingBucket = (status, body) => (status === 404 || status === 400) && /bucket not found/i.test(body);

  async function createBucket() {
    const res = await fetchImpl(`${base}/bucket`, {
      method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 1024 * 1024, allowed_mime_types: ['image/webp'] }),
    });
    const body = await res.text();
    if (!res.ok && !/already exists|duplicate/i.test(body)) throw new Error(`Supabase refused to create the bucket "${bucket}" (HTTP ${res.status}): ${body.slice(0, 200)}`);
    log.info?.(`[avatars] bucket "${bucket}" ready in Supabase Storage`);
  }

  async function upload(file, bytes) {
    return fetchImpl(`${base}/object/${bucket}/${file}`, {
      method: 'POST', headers: { ...auth(), 'Content-Type': 'image/webp', 'Cache-Control': 'max-age=31536000', 'x-upsert': 'true' }, body: bytes,
    });
  }

  return {
    kind: 'supabase',
    async put(file, bytes) {
      let res = await upload(file, bytes);
      if (!res.ok) {
        const body = await res.text();
        if (!missingBucket(res.status, body)) throw new Error(`Supabase refused the photo (HTTP ${res.status}): ${body.slice(0, 200)}`);
        await createBucket();
        res = await upload(file, bytes);
        if (!res.ok) throw new Error(`Supabase refused the photo (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
      }
      remember(file, Buffer.from(bytes));
    },
    async get(file) {
      if (cache.has(file)) {
        const hit = cache.get(file);
        remember(file, hit);
        return hit;
      }
      const res = await fetchImpl(`${base}/object/authenticated/${bucket}/${file}`, { headers: auth() });
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`Supabase photo read failed (HTTP ${res.status})`);
      const bytes = Buffer.from(await res.arrayBuffer());
      remember(file, bytes);
      return bytes;
    },
    async remove(file) {
      cache.delete(file);
      const res = await fetchImpl(`${base}/object/${bucket}/${file}`, { method: 'DELETE', headers: auth() });
      if (!res.ok && res.status !== 404 && res.status !== 400) log.error(`[avatars] old photo ${file} not deleted (HTTP ${res.status})`);
    },
  };
}

/**
 * Stores a new photo for the account, then deletes the one it replaces. Returns the new file name.
 * The database points to the new photo before the old one is deleted, so a profile never shows a missing picture.
 */
export async function replaceAvatar(db, store, userId, upload) {
  const bytes = await processAvatar(upload);
  const file = newAvatarFile();
  await store.put(file, bytes);
  const old = await swapAvatar(db, userId, file);
  if (old) await store.remove(old);
  return file;
}

export async function removeAvatar(db, store, userId) {
  const old = await swapAvatar(db, userId, null);
  if (old) await store.remove(old);
}

/** Points the account to `file` (or to no photo) and returns the photo it had. */
function swapAvatar(db, userId, file) {
  return db.tx(async (t) => {
    const row = await t.get('SELECT avatar_key FROM users WHERE id = ? FOR UPDATE', [userId]);
    await t.run('UPDATE users SET avatar_key = ?, avatar_updated_at = ? WHERE id = ?', [file, Date.now(), userId]);
    return row?.avatar_key ?? null;
  });
}

/** What the app and the account pages show about an account. */
export const profileOf = (cfg, user) => ({ email: user.email, name: user.display_name || null, avatar_url: avatarUrl(cfg, user.avatar_key) });
