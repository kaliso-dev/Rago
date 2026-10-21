// Catalogue de Rago OS (data/os.json, fabriqué par tools/build_os_catalog.py) : le même fichier que lit le moteur.
import data from "../data/os.json";
import type { Lang } from "./catalog";

type Text = Record<Lang, string>;

export interface OsTweak {
  id: string;
  category: string;
  /** profils qui le cochent ; vide : seulement à la main (réglages avancés) */
  profiles: string[];
  reboot: "none" | "explorer" | "restart";
  /** build minimale de Windows (26100 : Windows 11 24H2) */
  minBuild?: number;
  warn?: Text;
  source?: string;
  name: Text;
  desc: Text;
}
export interface OsCategory {
  id: string;
  icon: string;
  name: Text;
  lead: Text;
}
export interface OsProfile {
  id: string;
  icon: string;
  name: Text;
  lead: Text;
}
export interface OsFeature {
  id: string;
  default: boolean;
  name: Text;
  desc: Text;
}

export const osCatalog = data as unknown as { categories: OsCategory[]; profiles: OsProfile[]; features: OsFeature[]; tweaks: OsTweak[] };
export const osTweaks = new Map(osCatalog.tweaks.map((t) => [t.id, t]));

/** Même règle que catalog.rs : build inconnue (0, simulateur) = tout est proposé. */
export const runsOn = (t: OsTweak, build: number) => !t.minBuild || !build || build >= t.minBuild;

export function profileSelection(profile: string, build: number): string[] {
  return osCatalog.tweaks.filter((t) => t.profiles.includes(profile) && runsOn(t, build)).map((t) => t.id);
}

/** Profil dont la sélection est exactement celle-ci, sinon null (« Personnalisé »). */
export function matchingProfile(selection: string[], build: number): string | null {
  const set = new Set(selection);
  for (const p of osCatalog.profiles) {
    const ids = profileSelection(p.id, build);
    if (ids.length === set.size && ids.every((id) => set.has(id))) return p.id;
  }
  return null;
}

export const featureDefaults = (): Record<string, boolean> => Object.fromEntries(osCatalog.features.map((f) => [f.id, f.default]));
