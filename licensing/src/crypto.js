import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
export const newId = (prefix) => `${prefix}_${randomBytes(12).toString('base64url')}`;

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize('NFKC'), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scryptAsync(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return timingSafeEqual(expected, actual);
}

// A password hash to compare against when the email is unknown, so timing doesn't reveal accounts.
export const DUMMY_HASH = await hashPassword(randomToken());

// Signed values for cookies: "<value>.<hmac>"
export function signValue(value, secret) {
  return `${value}.${createHmac('sha256', secret).update(value).digest('base64url')}`;
}
export function unsignValue(signed, secret) {
  if (!signed) return null;
  const i = signed.lastIndexOf('.');
  if (i < 1) return null;
  const value = signed.slice(0, i);
  return safeEqual(signValue(value, secret), signed) ? value : null;
}

// License keys: RAGO-XXXXX-XXXXX-XXXXX-XXXXX in Crockford base32 (no I, L, O, U), 100 bits of entropy.
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function newLicenseKey() {
  const bytes = randomBytes(20);
  let out = '';
  for (let i = 0; i < 20; i++) out += B32[bytes[i] & 31];
  return `RAGO-${out.slice(0, 5)}-${out.slice(5, 10)}-${out.slice(10, 15)}-${out.slice(15, 20)}`;
}
export const maskLicenseKey = (key) => `${key.slice(0, 10)}-•••••-•••••-${key.slice(-5)}`;
