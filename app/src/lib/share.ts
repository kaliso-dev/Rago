// Code de preset partagé (RAG-44, page « Partage et support ») : la liste des réglages allumés et de leurs variantes,
// compressée, sans rien sur le PC ni le joueur. Le code se colle sur Discord ou s'enregistre dans un fichier .rago ;
// aucun serveur n'est interrogé.

/** Preset partagé : nom facultatif et entrées "id" ou "id:variante" (format des presets du catalogue). */
export interface SharedPreset {
  n?: string;
  t: string[];
}

const PREFIX = "RAGO1-";
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

const toB64url = (bytes: Uint8Array) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

export async function encodePreset(p: SharedPreset): Promise<string> {
  const json = JSON.stringify({ v: 1, ...(p.n?.trim() ? { n: p.n.trim().slice(0, MAX_NAME) } : {}), t: p.t });
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw"));
  return PREFIX + toB64url(packed);
}

/** Erreur lisible pour l'interface : "empty", "format" (pas un code Rago Optimizer) ou "newer" (version plus récente). */
export class ShareError extends Error {}

export async function decodePreset(code: string): Promise<SharedPreset> {
  // collé depuis Discord : espaces, retours à la ligne, ou le code entre `accents graves`
  const clean = code.replace(/[\s`"']/g, "");
  if (!clean) throw new ShareError("empty");
  const m = /^RAGO(\d+)-([A-Za-z0-9_-]+)$/i.exec(clean);
  if (!m) throw new ShareError("format");
  if (m[1] !== "1") throw new ShareError("newer");
  let data: unknown;
  try {
    const raw = await pipe(fromB64url(m[2]), new DecompressionStream("deflate-raw"), MAX_JSON);
    data = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new ShareError("format");
  }
  const d = data as { v?: unknown; n?: unknown; t?: unknown };
  if (typeof d !== "object" || d === null || !Array.isArray(d.t)) throw new ShareError("format");
  if (typeof d.v === "number" && d.v > 1) throw new ShareError("newer");
  const t = [...new Set(d.t.filter((e): e is string => typeof e === "string" && ENTRY.test(e)))].slice(0, MAX_ENTRIES);
  if (!t.length) throw new ShareError("format");
  const n = typeof d.n === "string" ? d.n.replace(/[\u0000-\u001f]/g, "").trim().slice(0, MAX_NAME) : "";
  return n ? { n, t } : { t };
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
