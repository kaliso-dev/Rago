import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fenêtres ouvertes, de la plus ancienne à celle du dessus, par rang d'affichage (toujours plus haut que celles déjà
 * ouvertes) : Échap ne ferme que celle du dessus. */
const stack: number[] = [];

export function Modal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  // dernier onClose reçu : la fenêtre n'est pas réinscrite à chaque rendu (elle repasserait au-dessus de celle
  // ouverte après elle)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // la dernière ouverte s'affiche au-dessus, quelle que soit sa place dans la page (Ctrl+K sur la fenêtre Premium)
  const [rank, setRank] = useState(0);
  useEffect(() => {
    if (!open) return;
    const mine = (stack[stack.length - 1] ?? 0) + 1;
    stack.push(mine);
    setRank(mine);
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === mine) {
        e.stopImmediatePropagation();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      const i = stack.lastIndexOf(mine);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="scrim" style={rank ? { zIndex: 50 + rank } : undefined} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`modal${className ? ` ${className}` : ""}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
