// Briques des maquettes v5 (23/11/2026) : l'app reprend le HTML et le CSS des maquettes tels quels (rendus-v5/src).
// <I n="search" /> remplace <i data-i="search"></i> des maquettes : icône imprimée (formes pleines, couche décalée,
// penchée) ou au trait pour les signes d'interface, avec les couleurs que icons.js choisit selon le fond.
import { useId, useLayoutEffect, useRef, type CSSProperties } from "react";
import { BIG_ICONS, ICON_ALIAS, ICON_FILTERS, LINE_ICONS, LINE_ONLY, LOGO_R, PRINT_ICONS } from "./iconData";

// couleur calculée : « rgb(161, 161, 170) », ou « color(srgb 0.63 0.63 0.67) » quand elle vient d'un color-mix()
const rgb = (c: string) => {
  const v = (c.match(/[\d.]+/g) || []).map(Number);
  return c.startsWith("color(") ? v.map((x, i) => (i < 3 ? x * 255 : x)) : v;
};
const lum = (c: number[]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const sat = (c: number[]) => {
  const mx = Math.max(c[0], c[1], c[2]);
  const mn = Math.min(c[0], c[1], c[2]);
  return mx ? (mx - mn) / mx : 0;
};
const isRed = (c: number[]) => c[0] > 170 && c[1] < 120 && c[2] < 120;
const bgOf = (n: Element | null) => {
  for (; n && n.nodeType === 1; n = n.parentElement) {
    const b = rgb(getComputedStyle(n).backgroundColor);
    if (b.length >= 3 && (b.length === 3 || b[3] > 0.5)) return b;
  }
  return [10, 10, 11];
};

/** Couleurs d'une icône imprimée, comme icons.js : papier sur rouge en temps normal, encre sur un fond rouge ou un texte
 * sombre, couleur d'état (vert, ambre) en dos ; une icône de plus de 26 px prend les filtres fins. */
function paint(s: SVGSVGElement) {
  s.style.removeProperty("--pf");
  s.style.removeProperty("--pb");
  const cs = getComputedStyle(s);
  const big = s.getBoundingClientRect().width > 26;
  s.querySelectorAll("use").forEach((u) => u.setAttribute("filter", u.classList.contains("pb") ? (big ? "url(#rgh-back)" : "url(#rgh-back-s)") : big ? "url(#rgh-face)" : "url(#rgh-face-s)"));
  if (cs.getPropertyValue("--pf").trim() || cs.getPropertyValue("--pb").trim()) return;
  const c = rgb(cs.color);
  const bg = bgOf(s.parentElement);
  let f = "#ECE9E2";
  let b = "#FF3B30";
  if (lum(c) < 0.2 || isRed(bg)) {
    f = "#0A0A0B";
    b = "#C9221A";
  } else if (lum(bg) > 0.6) f = "#0A0A0B";
  else if (sat(c) > 0.4 && !isRed(c)) b = `rgb(${c[0]},${c[1]},${c[2]})`;
  s.style.setProperty("--pf", f);
  s.style.setProperty("--pb", b);
}

type IProps = { n: string; className?: string; style?: CSSProperties; /** forcer l'icône au trait */ line?: boolean; title?: string };

export function I({ n, className, style, line, title }: IProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const k = ICON_ALIAS[n] ?? n;
  const printed = !line && !LINE_ONLY.has(n) ? PRINT_ICONS[k] : undefined;
  useLayoutEffect(() => {
    if (printed && ref.current) paint(ref.current);
  });
  if (!printed)
    return <svg className={`i${className ? ` ${className}` : ""}`} viewBox="0 0 24 24" style={style} aria-hidden={!title} role={title ? "img" : undefined} dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : "") + (LINE_ICONS[n] ?? "") }} />;
  const [sh, cu] = printed;
  return (
    <svg
      ref={ref}
      className={`i pi${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      overflow="visible"
      aria-hidden="true"
      style={style}
      dangerouslySetInnerHTML={{
        __html:
          `<defs><mask id="pim${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/>${cu}</mask>` +
          `<g id="pig${id}" mask="url(#pim${id})">${sh}</g></defs><g transform="translate(2.55 0) skewX(-12)">` +
          `<use href="#pig${id}" class="pb" transform="translate(1.3 1.5)" filter="url(#rgh-back-s)"/><use href="#pig${id}" class="pf" filter="url(#rgh-face-s)"/></g>`,
      }}
    />
  );
}

/** Filtres des icônes imprimées, posés une fois en haut de l'app. */
export function IconDefs() {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<defs>${ICON_FILTERS}</defs>` }} />;
}

/** Grande icône imprimée des écrans vides et des erreurs (data-big des maquettes : games, offline, alert, library). */
export function BigIcon({ n, className }: { n: string; className?: string }) {
  return <span className={className ?? "ico"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: BIG_ICONS[n] ?? "" }} />;
}

/** Texte des maquettes avec des mots en gras : « **Steam** » devient <b>Steam</b>. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))}
    </>
  );
}

/** Le R de Rago (data-logo des maquettes). */
export function LogoR({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 164 180" aria-hidden="true">
      <path d={LOGO_R} />
    </svg>
  );
}

/** Barre à segments (.seg) : `full` segments pleins sur `count`, en rouge (f) ou en gris (m). */
export function Seg({ value, total, count, kind = "f", className }: { value: number; total: number; count: number; kind?: "f" | "m"; className?: string }) {
  const full = total > 0 ? Math.round((Math.max(0, Math.min(value, total)) / total) * count) : 0;
  return (
    <div className={`seg${className ? ` ${className}` : ""}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i < full ? kind : undefined} />
      ))}
    </div>
  );
}
