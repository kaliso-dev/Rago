// Petites briques des maquettes v5 qui réagissent au clic : onglets (.tabs).
import type { ReactNode } from "react";

export type TabItem<T extends string> = { id: T; label: ReactNode; n?: number; title?: string; disabled?: boolean };

/** Onglets des maquettes (.tabs > span, .on pour l'actif, <em> pour le compte, .k pour l'étiquette devant). */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  ariaLabel,
}: {
  items: TabItem<T>[];
  value: T | null;
  onChange: (id: T) => void;
  label?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={`tabs${className ? ` ${className}` : ""}`} role="tablist" aria-label={ariaLabel}>
      {label != null && <span className="k">{label}</span>}
      {items.map((it) => {
        const on = it.id === value;
        const go = () => !it.disabled && onChange(it.id);
        return (
          <span
            key={it.id}
            role="tab"
            aria-selected={on}
            aria-disabled={it.disabled || undefined}
            tabIndex={it.disabled ? -1 : 0}
            title={it.title}
            className={[on ? "on" : "", it.disabled ? "dis" : ""].filter(Boolean).join(" ") || undefined}
            onClick={go}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go())}
          >
            {it.label}
            {it.n != null && <em>{it.n}</em>}
          </span>
        );
      })}
    </div>
  );
}
