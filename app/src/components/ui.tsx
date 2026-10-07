import { Lock } from "lucide-react";
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
    <button type="button" className={`btn btn-${variant} btn-${size}${className ? ` ${className}` : ""}`} {...rest}>
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
