// Generates the Ed25519 key pair that signs license tokens.
// The private key goes in LICENSE_SIGNING_KEY (server), the public key ships inside Rago Hub.
import { generateKeyPairSync, randomBytes } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const priv = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pub = publicKey.export({ type: 'spki', format: 'pem' });
console.log('# Server env (keep secret)');
console.log(`LICENSE_SIGNING_KEY=${Buffer.from(priv).toString('base64')}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`);
console.log('\n# Public key to embed in Rago Hub');
console.log(pub);
