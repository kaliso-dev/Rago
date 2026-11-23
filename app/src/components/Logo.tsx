import { MARK, MARK_BOX } from "./logoPaths";

// boîte carrée centrée sur la marque, pour l'aligner comme une icône
const PAD = (MARK_BOX.h - MARK_BOX.w) / 2;
const SQUARE = `${-PAD} 0 ${MARK_BOX.h} ${MARK_BOX.h}`;

/** Le R de Rago, rouge plein (charte v5, 22/11/2026 : plus de R blanc ni imprimé). `ink` : R noir, sur la transition rouge. */
export function Mark({ size = 20, ink = false }: { size?: number; ink?: boolean }) {
  return (
    <svg width={size} height={size} viewBox={SQUARE} aria-hidden="true">
      <path d={MARK} fill={ink ? "var(--rg-ink-1)" : "var(--rg-red-500)"} />
    </svg>
  );
}

/** Icône de l'app : le R rouge sur une tuile blanche (marque/logo/rago-app-icon.svg). */
export function AppIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden="true" className="app-icon">
      <rect width="256" height="256" rx="56" fill="#FFFFFF" />
      <path d={MARK} fill="#FF3B30" transform="translate(62.40 56.00) scale(0.8)" />
    </svg>
  );
}
