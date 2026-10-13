import { AnimatePresence, motion } from "motion/react";
import { Check, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useStore } from "../lib/store";

const enter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
};

/** Petits messages en bas à droite, qui ne bloquent rien et partent d'eux-mêmes :
 * - le moteur a remis les réglages Premium (fin de Premium, déconnexion) ; ceux qui n'ont pas pu être remis sont dits
 *   aussi, le détail est dans l'historique ;
 * - la réparation du lancement a supprimé une valeur qui peut faire planter Windows (RAG-67) : redémarrer le PC, une
 *   seule fois (« Redémarrer », pas « Arrêter » : avec le démarrage rapide, « Arrêter » ne relit pas la valeur). */
export function ResetToast() {
  const { t, resetDone, setResetDone, repairNotice, setRepairNotice } = useStore();

  useEffect(() => {
    if (resetDone == null) return;
    const id = setTimeout(() => setResetDone(null), resetDone.failed > 0 ? 9000 : 4500);
    return () => clearTimeout(id);
  }, [resetDone, setResetDone]);

  useEffect(() => {
    if (!repairNotice) return;
    const id = setTimeout(() => setRepairNotice(false), 20000);
    return () => clearTimeout(id);
  }, [repairNotice, setRepairNotice]);

  return (
    <div className="toasts">
      <AnimatePresence>
        {repairNotice && (
          <motion.div key="repair" className="reset-toast warn" role="status" {...enter}>
            <RotateCcw size={14} />
            <span>{t("repair.restart")}</span>
          </motion.div>
        )}
        {resetDone != null && (
          <motion.div key={resetDone.at} className={`reset-toast${resetDone.failed > 0 ? " warn" : ""}`} role="status" {...enter}>
            {resetDone.failed > 0 ? <TriangleAlert size={14} /> : <Check size={14} />}
            <span>{resetDone.failed > 0 ? t("reset.failed", { n: resetDone.failed }) : t("reset.done")}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
