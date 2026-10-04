const MARK = "M4 3H15L20 8V11.5L16.8 14.7L21 21H15.6L12.1 15.5H9.4V21H4ZM9.4 7.6V11.1H14.6V7.6Z";
const PIXEL = "M19.6 1.6H22.4V4.4H19.6Z";

export function Mark({ size = 20, blink = false }: { size?: number; blink?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={MARK} fill="var(--rg-text-1)" />
      <path d={PIXEL} fill="var(--rg-red-500)" className={blink ? "pixel-blink" : undefined} />
    </svg>
  );
}

export function Wordmark({ height = 14 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 1.6 79.8 19.4" aria-label="Rago">
      <g fill="var(--rg-text-1)">
        <path d="M0 3H11L16 8V11.5L12.8 14.7L17 21H11.6L8.1 15.5H5.4V21H0ZM5.4 7.6V11.1H10.6V7.6Z" />
        <path d="M19.6 21V8L24.6 3H31.6L36.6 8V21H31.2V16.4H25V21ZM25 8.4V11H31.2V8.4Z" />
        <path d="M39.2 8L44.2 3H56.2V8.4H44.6V15.6H50.8V14.4H48.2V10.2H56.2V21H44.2L39.2 16Z" />
        <path d="M63.8 3H70.8L75.8 8V16L70.8 21H63.8L58.8 16V8ZM64.2 8.4V15.6H70.4V8.4Z" />
      </g>
      <path d="M77 1.6h2.8v2.8h-2.8z" fill="var(--rg-red-500)" />
    </svg>
  );
}

/** Signature « Pulse » : des ondes carrées partent du pixel rouge du logo. */
export function Pulse({ size = 160, active = true }: { size?: number; active?: boolean }) {
  // centre du pixel dans le repère 24×24 : (21, 3)
  const cx = (21 / 24) * 100;
  const cy = (3 / 24) * 100;
  return (
    <div className="pulse" style={{ width: size, height: size }}>
      {active &&
        [0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="pulse-wave"
            style={{ left: `${cx}%`, top: `${cy}%`, animationDelay: `${i * 400}ms` }}
          />
        ))}
      <Mark size={size} blink={active} />
    </div>
  );
}
