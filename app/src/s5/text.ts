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

/** Jour, mois (et année) des maquettes : « 12 Nov », « 10 Sep 2021 », « 12 nov. ». En anglais, le mois court américain
 * (« Sep » : en-GB écrit « Sept ») après le jour, comme les maquettes. */
export function dayMonth(lang: Lang, ts: number, year = false): string {
  const d = new Date(ts);
  if (lang === "fr") return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${d.getDate()} ${month}${year ? ` ${d.getFullYear()}` : ""}`;
}

/** Heure sur 24 h : « 21:04 ». */
export function clock(lang: Lang, ts: number): string {
  return new Date(ts).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Date et heure de l'historique : « Today 21:14 », « Yesterday 18:02 », « 20 Nov 22:41 ». */
export function dayTime(lang: Lang, ts: number, today: string, yesterday: string): string {
  const d = new Date(ts);
  const now = new Date();
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day = d.toDateString() === now.toDateString() ? today : d.toDateString() === y.toDateString() ? yesterday : dayMonth(lang, ts);
  return `${day} ${clock(lang, ts)}`;
}
