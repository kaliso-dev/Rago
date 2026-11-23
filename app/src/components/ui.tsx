import { Lock } from "./ri";
import { motion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch${checked ? " on" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <motion.span className="switch-thumb" layout transition={{ type: "spring", stiffness: 700, damping: 38 }} />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  layoutId,
  disabled,
}: {
  value: T;
  options: { id: T; label: string; hint?: string; locked?: boolean }[];
  onChange: (v: T) => void;
  layoutId: string;
  disabled?: boolean;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          disabled={disabled}
          className={[o.id === value ? "active" : "", o.locked ? "locked" : ""].join(" ").trim() || undefined}
          onClick={(e) => {
            e.stopPropagation();
            onChange(o.id);
          }}
        >
          {o.id === value && (
            <motion.span layoutId={layoutId} className="segmented-pill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
          )}
          <span className="segmented-label">
            {o.locked && <Lock size={10} aria-hidden />}
            {o.label}
            {o.hint && <span className="segmented-hint">{o.hint}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "warn" | "red" | "ok" | "info"; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
};

export function Button({ variant = "secondary", size = "md", icon, children, className, ...rest }: BtnProps) {
  return (
    <button type="button" className={`obtn btn-${variant} btn-${size}${className ? ` ${className}` : ""}`} {...rest}>
      {icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`card${className ? ` ${className}` : ""}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h3 className="rg-overline">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/** Jauge à segments penchés (charte v5) : `n` sur `total`, en `count` segments. */
export function Segments({ n, total, count = 24, className }: { n: number; total: number; count?: number; className?: string }) {
  const full = total > 0 ? Math.round((Math.min(n, total) / total) * count) : 0;
  return (
    <div className={`segs${className ? ` ${className}` : ""}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i < full ? "f" : undefined} />
      ))}
    </div>
  );
}

/** Bloc rouge au bord déchiré, en haut à droite d'une page : le chiffre en direct (« 21 ON / OF 212 »). */
export function HeadNumber({ value, label, sub, n, total }: { value: ReactNode; label: ReactNode; sub?: ReactNode; n?: number; total?: number }) {
  return (
    <div className="head-side head-num">
      <div className="head-num-v">
        <b>{value}</b>
        <span>
          {label}
          {sub && <small>{sub}</small>}
        </span>
      </div>
      {total != null && <Segments n={n ?? 0} total={total} count={28} className="on-red" />}
    </div>
  );
}
