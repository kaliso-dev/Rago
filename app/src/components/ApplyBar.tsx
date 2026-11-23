// Barre pour appliquer (.apply > .ap des maquettes v5 app-module-*.html) : le nombre de changements, ceux qui
// demandent un redémarrage, « clear » et « apply ». Droite et arrondie, sans déchirure (demande de Sofiene du 22/11).
import { AnimatePresence, motion } from "motion/react";
import { needsReboot, retired, tweaks } from "../lib/catalog";
import { undoVariant, useStore } from "../lib/store";
import { I } from "../s5/I";

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
      return tw ? needsReboot(tw, undoVariant(id, applied.get(id))) : !!retired.get(id)?.reboot;
    }).length;
  return (
    <div className="apply">
      <AnimatePresence>
        {n > 0 && !run && (
          <motion.div
            className="ap"
            role="region"
            aria-label={t("apply.changes", { n })}
            title={undo.length ? t("apply.split", { a: selection.length, u: undo.length }) : undefined}
            initial={{ y: 110, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 110, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <motion.b key={n} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {n}
            </motion.b>
            <span className="lb">
              {t("apply.changes", { n }).replace(/^\d+\s/, "")}
              <small>
                <I n="rotate" />
                {reboot ? t("apply.reboot", { n: reboot }) : t("s5.mod.noRestartNeeded")}
              </small>
            </span>
            <button type="button" className="clr" onClick={() => unselectMany([...selection, ...undo])}>
              {t("apply.clear")}
            </button>
            <button type="button" className="btn" onClick={() => requestApply()}>
              <I n="zap" />
              {t("apply.go")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
