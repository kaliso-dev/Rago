import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useStore } from "../lib/store";
import { I } from "../s5/I";

const enter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
};

/** Petits messages en bas à droite (maquette app-toasts), qui ne bloquent rien et partent d'eux-mêmes :
 * - le moteur a remis les réglages Premium (fin de Premium, déconnexion) ; ceux qui n'ont pas pu être remis sont dits
 *   aussi, le détail est dans l'historique ;
 * - la réparation du lancement a supprimé une valeur qui peut faire planter Windows (RAG-67) : redémarrer le PC, une
 *   seule fois (« Redémarrer », pas « Arrêter » : avec le démarrage rapide, « Arrêter » ne relit pas la valeur).
 * Ils passent au-dessus des fenêtres ouvertes, et au-dessus de l'invitation à laisser un avis (s5/app.css). */
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
    <div className="w5 flt tz">
      <div className="tst" role="status">
        <AnimatePresence>
          {repairNotice && (
            <motion.div key="repair" className="ts2 warn" {...enter}>
              <I n="rotate" />
              <span>{t("repair.restart")}</span>
            </motion.div>
          )}
          {resetDone != null && (
            <motion.div key={resetDone.at} className={`ts2${resetDone.failed > 0 ? " warn" : ""}`} {...enter}>
              <I n={resetDone.failed > 0 ? "alert" : "check"} />
              <span>{resetDone.failed > 0 ? t("reset.failed", { n: resetDone.failed }) : t("reset.done")}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
