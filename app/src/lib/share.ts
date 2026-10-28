// Code de preset partagé (RAG-44, page « Partage et support ») : la liste des réglages allumés et de leurs variantes,
// compressée, sans rien sur le PC ni le joueur. Le code se colle sur Discord ou s'enregistre dans un fichier .rago ;
// aucun serveur n'est interrogé.
//
// RAGO2_ (1.2.0) : lettres et chiffres seulement après le préfixe. Le RAGO1- d'avant (base64url) se cassait une fois
// collé sur Discord : un double-clic n'en prenait qu'un morceau (le « - » coupe le mot), et Discord efface les « __ »
// qu'il prend pour du souligné. Les deux formats se lisent.

/** Preset partagé : nom facultatif et entrées "id" ou "id:variante" (format des presets du catalogue). */
export interface SharedPreset {
  n?: string;
  t: string[];
}

const PREFIX = "RAGO2_";
/** Au-delà, ce n'est plus un preset de Rago Optimizer (le catalogue entier tient en moins de 8 Ko). */
const MAX_JSON = 64 * 1024;
const MAX_ENTRIES = 600;
export const MAX_NAME = 40;
const ENTRY = /^[a-z0-9_]{1,64}(:[a-z0-9_]{1,64})?$/i;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, limit = Infinity): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await out.read();
    if (done) break;
    size += value.length;
    // archive piégée qui gonfle sans fin : on arrête de lire
    if (size > limit) {
      void out.cancel();
      throw new Error("too_large");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.length;
  }
  return all;
}

/** Codes RAGO1- d'avant la 1.2.0, encore lus. */
const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** 62^8 tient dans un nombre JavaScript exact : la conversion avance par paquets de 8 caractères. */
const CHUNK = 8;
const BASE = 62n ** BigInt(CHUNK);
/** Corps d'un code bien plus long que le catalogue entier : pas un preset, et la conversion ralentirait. */
const MAX_CODE = 16_000;

/** Octets → lettres et chiffres. Un octet 1 devant garde les zéros du début dans le nombre. */
const toB62 = (bytes: Uint8Array) => {
  let n = BigInt("0x01" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
  const parts: string[] = [];
  while (n > 0n) {
    let chunk = Number(n % BASE);
    n /= BASE;
    let s = "";
    for (let i = 0; i < CHUNK; i++) {
      s = B62[chunk % 62] + s;
      chunk = Math.floor(chunk / 62);
    }
    parts.unshift(s);
  }
  return parts.join("").replace(/^0+/, "");
};

const fromB62 = (s: string) => {
  let n = 0n;
  for (let i = 0, end = s.length % CHUNK || CHUNK; i < s.length; i = end, end += CHUNK) {
    let chunk = 0;
    for (const c of s.slice(i, end)) chunk = chunk * 62 + B62.indexOf(c);
    n = n * BASE + BigInt(chunk);
  }
  const hex = n.toString(16);
  const all = Uint8Array.from((hex.length % 2 ? "0" + hex : hex).match(/../g) ?? [], (h) => parseInt(h, 16));
  if (all[0] !== 1) throw new Error("format");
  return all.subarray(1);
};

export async function encodePreset(p: SharedPreset): Promise<string> {
  const json = JSON.stringify({ v: 2, ...(p.n?.trim() ? { n: p.n.trim().slice(0, MAX_NAME) } : {}), t: p.t });
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw"));
  return PREFIX + toB62(packed);
}

/** Erreur lisible pour l'interface : "empty", "format" (pas un code Rago Optimizer), "broken" (un code, mais incomplet
 * ou abîmé) ou "newer" (version plus récente). */
export class ShareError extends Error {}

/** Un code dans le texte collé : seul, entre `accents graves`, dans une phrase (« voici mon preset : RAGO2_… »), ou
 * avec le nom et l'heure du message Discord copiés autour. */
const CODE = /RAGO(\d+)([-_])([A-Za-z0-9_-]+)/gi;

async function read(version: string, sep: string, body: string): Promise<SharedPreset> {
  if (version !== "1" && version !== "2") throw new ShareError("newer");
  // RAGO2_ : lettres et chiffres, ce qui suit (un tiret, un « _ ») n'en fait pas partie
  const data = version === "2" ? /^[A-Za-z0-9]+/.exec(body)?.[0] : body;
  if (!data || sep !== (version === "2" ? "_" : "-") || data.length > MAX_CODE) throw new ShareError("broken");
  let d: { v?: unknown; n?: unknown; t?: unknown };
  try {
    const raw = await pipe(version === "2" ? fromB62(data) : fromB64url(data), new DecompressionStream("deflate-raw"), MAX_JSON);
    d = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new ShareError("broken");
  }
  if (typeof d !== "object" || d === null || !Array.isArray(d.t)) throw new ShareError("broken");
  if (typeof d.v === "number" && d.v > 2) throw new ShareError("newer");
  const t = [...new Set(d.t.filter((e): e is string => typeof e === "string" && ENTRY.test(e)))].slice(0, MAX_ENTRIES);
  if (!t.length) throw new ShareError("broken");
  const n = typeof d.n === "string" ? d.n.replace(/[\u0000-\u001f]/g, "").trim().slice(0, MAX_NAME) : "";
  return n ? { n, t } : { t };
}

export async function decodePreset(text: string): Promise<SharedPreset> {
  // caractères invisibles que certaines messageries glissent dans les longs mots
  const plain = text.replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, "");
  if (!plain.trim()) throw new ShareError("empty");
  // d'abord tel quel, puis sans espaces ni retours à la ligne (code coupé en deux lignes)
  let why = "format";
  for (const candidate of [plain, plain.replace(/\s+/g, "")]) {
    for (const m of candidate.matchAll(CODE)) {
      try {
        return await read(m[1], m[2], m[3]);
      } catch (e) {
        // une version plus récente l'emporte sur un code abîmé : il faut d'abord mettre l'app à jour
        if (why !== "newer") why = e instanceof ShareError ? e.message : "broken";
      }
    }
  }
  throw new ShareError(why);
}

/** Nom de fichier proposé pour un preset : lettres, chiffres et tirets. */
export function presetFileName(name: string | undefined): string {
  const base = (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return `${base || "rago-preset"}.rago`;
}
