import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { Mark } from "./Logo";

const ease = [0.16, 1, 0.3, 1] as const;
/** Durée de l'animation avant que l'app apparaisse. */
const SHOW_MS = 1450;
const SEGS = 28;

/** Écran de démarrage (charte v5, maquette perso/demarrage.jpg) : RAGO en grand, « Optimizer » sur un ruban de papier,
 * la jauge à segments se remplit, puis un aplat rouge penché passe (le R y est noir) et découvre l'app.
 * En mouvement réduit (réglage de l'app ou de Windows), MotionConfig ne garde que les fondus. */
export function Splash({ onDone }: { onDone: () => void }) {
  const p = useMotionValue(0);
  const pct = useTransform(p, (v) => Math.round(v));
  const [filled, setFilled] = useState(0);
  const [wipe, setWipe] = useState(false);

  useEffect(() => {
    const ctl = animate(p, 100, { duration: (SHOW_MS - 350) / 1000, ease: [0.65, 0, 0.35, 1] });
    const un = p.on("change", (v) => setFilled(Math.round((v / 100) * SEGS)));
    const w = window.setTimeout(() => setWipe(true), SHOW_MS - 300);
    const timer = window.setTimeout(onDone, SHOW_MS);
    return () => {
      ctl.stop();
      un();
      window.clearTimeout(w);
      window.clearTimeout(timer);
    };
  }, [onDone, p]);

  return (
    <motion.div className="splash" aria-hidden="true" exit={{ opacity: 0, transition: { delay: 0.25, duration: 0.3, ease } }}>
      <motion.div className="splash-card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease }}>
        <div className="splash-center">
          <motion.div className="splash-logo" initial={{ opacity: 0, x: -24, filter: "blur(10px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} transition={{ duration: 0.7, ease }}>
            <Mark size={150} />
            <b>ago</b>
          </motion.div>
          <motion.div className="splash-tape" initial={{ opacity: 0, rotate: -6, scale: 0.9 }} animate={{ opacity: 1, rotate: -1.4, scale: 1 }} transition={{ delay: 0.3, duration: 0.45, ease }}>
            optimizer
          </motion.div>
        </div>
        <div className="splash-foot">
          <span>{filled >= SEGS ? "Ready" : "Loading"}</span>
          <b>
            <motion.span>{pct}</motion.span>
            <small>%</small>
          </b>
        </div>
        <div className="splash-segs">
          {Array.from({ length: SEGS }, (_, i) => (
            <i key={i} className={i < filled ? "f" : undefined} />
          ))}
        </div>
      </motion.div>
      {/* transition en aplat rouge : le R y est noir (décision du 22/11) */}
      <motion.div
        className="splash-wipe"
        initial={{ x: "-130%" }}
        animate={{ x: wipe ? "0%" : "-130%" }}
        exit={{ x: "130%", transition: { duration: 0.45, ease: [0.65, 0, 0.35, 1] } }}
        transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
      >
        <div className="splash-wipe-in">
          <Mark size={96} ink />
          <b>ago</b>
        </div>
      </motion.div>
    </motion.div>
  );
}
