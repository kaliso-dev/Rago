import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { useAccount } from "../lib/account";
import { useAccountText } from "../lib/accountText";
import { useStore } from "../lib/store";
import { I } from "../s5/I";
import { NO_APPLY_BAR } from "./ApplyBar";

/** Étoile pleine des maquettes d'avis (`.st4`), aussi dans la fenêtre d'avis. */
export const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

/** Invitation discrète à laisser un avis, en bas à droite (maquette app-review-prompt ; voir lib/account.tsx pour quand
 * elle apparaît). `.w5.flt` couvre la fenêtre sans prendre les clics : seule l'invitation les prend. Sa hauteur
 * (`--rvp-h` sur la racine) place les petits messages au-dessus d'elle et laisse la page défiler sous elle (s5/app.css). */
export function ReviewPrompt() {
  const { showPrompt, dismissPrompt, openReview } = useAccount();
  const { at } = useAccountText();
  // même règle que la barre « Appliquer » (ApplyBar) : elle est visible, l'invitation se place au-dessus ; le Packet
  // Optimizer a toujours la sienne
  const { page, selection, pendingUndo, applied, run } = useStore();
  const barUp = !run && (page === "netopt" || (!NO_APPLY_BAR.has(page) && selection.length + pendingUndo.filter((id) => applied.has(id)).length > 0));
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!showPrompt || !el) return;
    const root = document.documentElement.style;
    const ro = new ResizeObserver(() => root.setProperty("--rvp-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [showPrompt]);
  return (
    <div className={`w5 flt${barUp ? " up" : ""}`}>
      <AnimatePresence>
        {showPrompt && (
          <motion.aside
            ref={ref}
            className="rvp"
            aria-label={at("prompt.title")}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" className="cx" aria-label={at("prompt.close")} onClick={dismissPrompt}>
              <I n="x" />
            </button>
            <span className="st4" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} className="on">
                  <svg viewBox="0 0 24 24">
                    <path d={STAR} />
                  </svg>
                </i>
              ))}
            </span>
            <b>{at("prompt.title")}</b>
            <p>{at("prompt.text")}</p>
            <div className="ra2">
              <button type="button" className="btn sm red" onClick={() => openReview(true)}>
                {at("prompt.go")}
              </button>
              <button type="button" className="btn sm gh2" onClick={dismissPrompt}>
                {at("prompt.later")}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
