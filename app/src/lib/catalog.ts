import raw from "../data/catalog.json";
import type { SystemInfo } from "./api";

export type Lang = "fr" | "en";
export type I18n = { fr: string; en: string };
export type Risk = "safe" | "advanced";

export interface Variant {
  id: string;
  label: I18n;
  /** sélection automatique d'après le PC : "ram:16", "cpu:intel", "os:11" */
  auto?: string;
  /** remet Windows comme avant : ouverte en gratuit */
  revert?: boolean;
}

export interface Tweak {
  id: string;
  name: I18n;
  desc: I18n;
  risk: Risk;
  reboot: boolean;
  kind: "tweak" | "action";
  variants?: Variant[];
  defaultVariant?: string;
  requires: string[];
  confirm?: I18n;
  native?: string;
  legacy: string[];
  lines: number;
  optifine?: Record<string, Record<string, string>>;
}

export interface Section {
  id: string;
  name: I18n;
  requires?: string;
  tweaks: (Tweak | { ref: string })[];
}

export interface Module {
  id: string;
  icon: string;
  name: I18n;
  tagline: I18n;
  sections: Section[];
}

export interface Preset {
  id: string;
  name: I18n;
  desc: I18n;
  /** "id" ou "id:variante" */
  tweaks: string[];
}

interface Catalog {
  version: number;
  modules: Module[];
  presets: Preset[];
}

export const catalog = raw as unknown as Catalog;

export const tweaks: Map<string, Tweak> = new Map();
export const tweakModule: Map<string, string> = new Map();
for (const m of catalog.modules) {
  for (const s of m.sections) {
    for (const t of s.tweaks) {
      if ("ref" in t) continue;
      tweaks.set(t.id, t);
      tweakModule.set(t.id, m.id);
    }
  }
}

export function sectionTweaks(s: Section): Tweak[] {
  return s.tweaks.map((t) => ("ref" in t ? tweaks.get(t.ref)! : t)).filter(Boolean);
}

export const totalTweaks = tweaks.size;

/** Variante choisie par défaut : d'après le PC si possible, sinon celle du catalogue. */
export function autoVariant(t: Tweak, sys: SystemInfo | null): string | undefined {
  if (!t.variants?.length) return undefined;
  if (sys) {
    for (const v of t.variants) {
      if (!v.auto) continue;
      const [k, val] = v.auto.split(":");
      if (k === "ram" && String(sys.ramTier) === val) return v.id;
      if (k === "cpu" && sys.cpuVendor === val) return v.id;
      if (k === "os" && (sys.isWin11 ? "11" : "10") === val) return v.id;
    }
  }
  return t.defaultVariant ?? t.variants[0].id;
}

export type Availability = { ok: boolean; warn?: string; block?: string };

/** Ce qui empêche ou complique un réglage sur ce PC. Les textes sont des clés i18n. */
export function availability(t: Tweak, sys: SystemInfo | null): Availability {
  if (!sys) return { ok: true };
  for (const r of t.requires) {
    if (r.startsWith("gpu:")) {
      const vendor = r.slice(4);
      if (!sys.gpus.some((g) => g.vendor === vendor)) return { ok: false, block: `noGpu.${vendor}` };
    }
    if (r.startsWith("cpu:") && sys.cpuVendor !== r.slice(4)) return { ok: false, block: `noCpu.${r.slice(4)}` };
    if (r.startsWith("res:")) {
      const file = r.slice(4);
      if (!sys.resources.includes(file)) {
        if (file === "smartctl.exe") continue; // le réglage marche sans, en partie
        return { ok: false, block: "missingRes" };
      }
    }
  }
  if (t.requires.includes("wmic") && !sys.hasWmic) return { ok: true, warn: "needsWmic" };
  return { ok: true };
}

export function searchTweaks(q: string, lang: Lang): Tweak[] {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out: Tweak[] = [];
  for (const t of tweaks.values()) {
    const hay = norm(`${t.name[lang]} ${t.desc[lang]} ${t.name.en} ${t.id}`);
    if (terms.every((w) => hay.includes(w))) out.push(t);
  }
  return out.slice(0, 40);
}
