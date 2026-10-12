import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useStore } from "../lib/store";

/** Petit message en bas à droite quand le moteur a remis les réglages Premium (fin de Premium, déconnexion). */
export function ResetToast() {
  const { t, resetAt, setResetAt } = useStore();

  useEffect(() => {
    if (resetAt == null) return;
    const id = setTimeout(() => setResetAt(null), 4500);
    return () => clearTimeout(id);
  }, [resetAt, setResetAt]);

  return (
    <AnimatePresence>
      {resetAt != null && (
        <motion.div
          key={resetAt}
          className="reset-toast"
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <Check size={14} />
          <span>{t("reset.done")}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
