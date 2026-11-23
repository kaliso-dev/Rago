// Images des jeux embarquées dans l'app (l'interface n'a pas d'accès réseau) : assets/s5/games/<sorte>/<jeu>.jpg
//   wide  : vignette paysage (tableau de bord), cover : cover verticale 2:3 (choix du preset),
//   hero  : grande illustration (lanceur), play : capture en jeu (aperçu de Display).
// Un jeu sans image embarquée garde l'image officielle que le moteur télécharge (api.gameArt).
import type { Game } from "../lib/api";

export type ArtKind = "wide" | "cover" | "hero" | "play";
const files = import.meta.glob("../assets/s5/games/*/*.{jpg,png,webp}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const ART: Record<string, Partial<Record<ArtKind, string>>> = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/games\/(\w+)\/([\w-]+)\.\w+$/);
  if (!m) continue;
  (ART[m[2]] ??= {})[m[1] as ArtKind] = url;
}

/** Clé d'un jeu dans les images embarquées (valorant, cs2, fortnite…), d'après son id ou son nom. */
export function gameKey(g: Pick<Game, "id" | "name" | "kind">): string | null {
  const s = `${g.id} ${g.name}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/valorant/, "valorant"],
    [/steam:730\b|counter-strike/, "cs2"],
    [/fortnite/, "fortnite"],
    [/apex/, "apex"],
    [/league of legends|riot:league/, "lol"],
    [/rainbow six|siege/, "r6"],
    [/overwatch/, "overwatch"],
    [/rocket league/, "rl"],
    [/pubg|battlegrounds/, "pubg"],
    [/marvel rivals/, "rivals"],
    [/the finals/, "finals"],
    [/tarkov/, "tarkov"],
    [/roblox/, "roblox"],
    [/grand theft auto|gta/, "gta"],
    [/bedrock/, "bedrock"],
  ];
  for (const [re, k] of rules) if (re.test(s)) return k;
  return g.kind === "minecraft" || /minecraft|lunar|badlion|feather/.test(s) ? "minecraft" : null;
}

/** Image embarquée d'un jeu, ou null. */
export function coverOf(g: Pick<Game, "id" | "name" | "kind">, kind: ArtKind): string | null {
  const k = gameKey(g);
  return (k && ART[k]?.[kind]) || null;
}

/** Image embarquée par clé de jeu (presets du catalogue : « game_valorant » → valorant). */
export function artByKey(key: string, kind: ArtKind): string | null {
  return ART[key]?.[kind] ?? null;
}

// Photos des joueurs pros (Display) : assets/s5/pros/<id de data/pros.json>.webp, 280 × 430.
const pros = import.meta.glob("../assets/s5/pros/*.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const PROS: Record<string, string> = {};
for (const [path, url] of Object.entries(pros)) {
  const m = path.match(/pros\/([\w-]+)\.webp$/);
  if (m) PROS[m[1]] = url;
}

/** Photo d'un pro, ou null (ses initiales sur fond rayé). */
export const proPhoto = (id: string): string | null => PROS[id] ?? null;
