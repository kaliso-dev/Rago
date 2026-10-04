// Compact JWTs signed with Ed25519 (alg "EdDSA"), verifiable offline by Rago Hub with the public key.
import { createPrivateKey, createPublicKey, createHash, sign, verify } from 'node:crypto';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

export function loadKeys(privatePem) {
  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(privateKey);
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const kid = createHash('sha256').update(publicPem).digest('base64url').slice(0, 16);
  return { privateKey, publicKey, publicPem, kid };
}

export function signToken(payload, keys) {
  const head = b64({ alg: 'EdDSA', typ: 'JWT', kid: keys.kid });
  const body = b64(payload);
  const sig = sign(null, Buffer.from(`${head}.${body}`), keys.privateKey).toString('base64url');
  return `${head}.${body}.${sig}`;
}

/** Returns the payload, or null when the signature, type or expiry is wrong. */
export function verifyToken(token, keys, { typ, allowExpired = false, now = Date.now() } = {}) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(head, 'base64url'));
    payload = JSON.parse(Buffer.from(body, 'base64url'));
  } catch {
    return null;
  }
  if (header.alg !== 'EdDSA') return null;
  if (!verify(null, Buffer.from(`${head}.${body}`), keys.publicKey, Buffer.from(sig, 'base64url'))) return null;
  if (typ && payload.typ !== typ) return null;
  if (!allowExpired && !(payload.exp * 1000 > now)) return null;
  return payload;
}
