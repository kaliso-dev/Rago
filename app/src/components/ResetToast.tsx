import { AnimatePresence, motion } from "motion/react";
import { Check, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useStore } from "../lib/store";

/** Petit message en bas à droite quand le moteur a remis les réglages Premium (fin de Premium, déconnexion). Ceux qui
 * n'ont pas pu être remis sont dits aussi : le détail est dans l'historique. */
export function ResetToast() {
  const { t, resetDone, setResetDone } = useStore();

  useEffect(() => {
    if (resetDone == null) return;
    const id = setTimeout(() => setResetDone(null), resetDone.failed > 0 ? 9000 : 4500);
    return () => clearTimeout(id);
  }, [resetDone, setResetDone]);

  return (
    <AnimatePresence>
      {resetDone != null && (
        <motion.div
          key={resetDone.at}
          className={`reset-toast${resetDone.failed > 0 ? " warn" : ""}`}
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          {resetDone.failed > 0 ? <TriangleAlert size={14} /> : <Check size={14} />}
          <span>{resetDone.failed > 0 ? t("reset.failed", { n: resetDone.failed }) : t("reset.done")}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
