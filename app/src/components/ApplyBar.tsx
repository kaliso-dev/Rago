import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { needsReboot, retired, tweaks } from "../lib/catalog";
import { useStore } from "../lib/store";
import { Button } from "./ui";

export function ApplyBar() {
  const { t, selection, pendingUndo, unselectMany, requestApply, run, variantOf, applied } = useStore();
  const undo = pendingUndo.filter((id) => applied.has(id));
  const n = selection.length + undo.length;
  const reboot =
    selection.filter((id) => {
      const tw = tweaks.get(id);
      return tw && needsReboot(tw, variantOf(tw));
    }).length +
    undo.filter((id) => {
      const tw = tweaks.get(id);
      return tw ? needsReboot(tw, applied.get(id)?.variant ?? null) : !!retired.get(id)?.reboot;
    }).length;
  return (
    <div className="applybar-wrap">
      <AnimatePresence>
        {n > 0 && !run && (
          <motion.div
            className="applybar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <div className="applybar-info">
              <motion.span
                key={n}
                className="applybar-count rg-metric"
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                {n}
              </motion.span>
              <div>
                <div className="applybar-label">
                  {(undo.length ? t("apply.changes", { n }) : t("apply.count", { n })).replace(/^\d+\s/, "")}
                </div>
                {(undo.length > 0 || reboot > 0) && (
                  <div className="applybar-sub">
                    {undo.length > 0 && t("apply.split", { a: selection.length, u: undo.length })}
                    {undo.length > 0 && reboot > 0 && " · "}
                    {reboot > 0 && t("apply.reboot", { n: reboot })}
                  </div>
                )}
              </div>
            </div>
            <div className="applybar-actions">
              <Button variant="ghost" onClick={() => unselectMany([...selection, ...undo])}>
                {t("apply.clear")}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => requestApply()}
              >
                {undo.length ? t("apply.goChanges", { n }) : t("apply.goN", { n })}
                <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
