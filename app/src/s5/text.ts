import type { Lang } from "../lib/catalog";

/** « 2 days ago », « il y a 2 jours » : temps écoulé depuis `ts`, à l'unité la plus parlante. */
export function ago(lang: Lang, ts: number): string {
  const rtf = new Intl.RelativeTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { numeric: "auto" });
  const s = Math.round((ts - Date.now()) / 1000);
  const a = Math.abs(s);
  if (a < 60) return rtf.format(0, "minute");
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  if (a < 86400 * 365) return rtf.format(Math.round(s / (86400 * 30)), "month");
  return rtf.format(Math.round(s / (86400 * 365)), "year");
}

/** Date courte des maquettes : « nov 19 », « 19 nov. ». */
export function shortDate(lang: Lang, ts: number): string {
  return new Date(ts).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" });
}
