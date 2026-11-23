import type { Lang } from "../lib/catalog";

/** « 2 days ago », « il y a 2 jours » : temps écoulé depuis `ts`, à l'unité la plus parlante.
 * `short` : heures et minutes abrégées comme les maquettes (« 2 h ago », « il y a 2 h »). */
export function ago(lang: Lang, ts: number, short = false): string {
  const rtf = new Intl.RelativeTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { numeric: "auto" });
  const s = Math.round((ts - Date.now()) / 1000);
  const a = Math.abs(s);
  const abbr = (n: number, unit: "h" | "min") => (lang === "fr" ? `il y a ${n} ${unit}` : `${n} ${unit} ago`);
  if (a < 60) return rtf.format(0, "minute");
  if (a < 3600) return short && s < 0 ? abbr(Math.round(a / 60), "min") : rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return short && s < 0 ? abbr(Math.round(a / 3600), "h") : rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 7) return rtf.format(Math.round(s / 86400), "day");
  if (a < 86400 * 30) return rtf.format(Math.round(s / (86400 * 7)), "week");
  if (a < 86400 * 365) return rtf.format(Math.round(s / (86400 * 30)), "month");
  return rtf.format(Math.round(s / (86400 * 365)), "year");
}

/** Date courte des maquettes : « nov 19 », « 19 nov. ». */
export function shortDate(lang: Lang, ts: number): string {
  return new Date(ts).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" });
}

/** Nom court d'un jeu à l'écran : sans « Tom Clancy's » ni ™ ®. */
export const displayName = (name: string) => name.replace(/^Tom Clancy's\s+/i, "").replace(/[™®]/g, "").trim();
