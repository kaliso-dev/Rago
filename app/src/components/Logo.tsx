import { MARK, MARK_BOX, WORDMARK_TEXT, WORDMARK_VIEWBOX } from "./logoPaths";

// boîte carrée centrée sur la marque, pour l'aligner comme une icône
const PAD = (MARK_BOX.h - MARK_BOX.w) / 2;
const SQUARE = `${-PAD} 0 ${MARK_BOX.h} ${MARK_BOX.h}`;

export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={SQUARE} aria-hidden="true">
      <path d={MARK} fill="var(--rg-red-500)" />
    </svg>
  );
}

/** Icône de navigation : la marque en couleur du texte, un peu en retrait comme les icônes au trait. */
export function MarkIcon({ size = 16 }: { size?: number | string }) {
  const pad = MARK_BOX.h * 0.14;
  return (
    <svg width={size} height={size} viewBox={`${-PAD - pad} ${-pad} ${MARK_BOX.h + 2 * pad} ${MARK_BOX.h + 2 * pad}`} aria-hidden="true">
      <path d={MARK} fill="currentColor" />
    </svg>
  );
}

/** `mark={false}` : le texte seul, quand la marque est déjà affichée à côté. */
export function Wordmark({ height = 14, mark = true }: { height?: number; mark?: boolean }) {
  const [x, y, w, h] = WORDMARK_VIEWBOX.split(" ").map(Number);
  // le texte commence après la marque (164 de large) et son espace
  const viewBox = mark ? WORDMARK_VIEWBOX : `${x + 210} ${y} ${w - 210} ${h}`;
  return (
    <svg height={height} viewBox={viewBox} aria-label="Rago Optimizer">
      {mark && <path d={MARK} fill="var(--rg-red-500)" />}
      <g fill="var(--rg-text-1)">
        {WORDMARK_TEXT.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** Signature « Pulse » : des ondes partent du coin haut droit de la marque. */
export function Pulse({ size = 160, active = true }: { size?: number; active?: boolean }) {
  const cx = ((PAD + 160) / MARK_BOX.h) * 100;
  const cy = 2;
  return (
    <div className="pulse" style={{ width: size, height: size }}>
      {active &&
        [0, 1, 2, 3].map((i) => (
          <span key={i} className="pulse-wave" style={{ left: `${cx}%`, top: `${cy}%`, animationDelay: `${i * 400}ms` }} />
        ))}
      <Mark size={size} />
    </div>
  );
}
