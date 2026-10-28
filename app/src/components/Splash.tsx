import { motion } from "motion/react";
import { useEffect } from "react";
import { Mark, Wordmark } from "./Logo";

const ease = [0.16, 1, 0.3, 1] as const;
/** Durée de l'animation avant que l'app apparaisse. */
const SHOW_MS = 1450;

/** Animation de lancement : la marque sort du flou avec son onde, le nom suit, puis l'écran s'efface sur l'app. En
 * mouvement réduit (réglage de l'app ou de Windows), MotionConfig ne garde que les fondus. */
export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div className="splash" aria-hidden="true" exit={{ opacity: 0, transition: { duration: 0.5, ease } }}>
      <motion.div
        className="splash-glow"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease }}
      />
      <motion.div className="splash-center" exit={{ scale: 1.06, filter: "blur(6px)", transition: { duration: 0.5, ease } }}>
        <motion.div
          className="splash-mark"
          initial={{ opacity: 0, scale: 0.78, filter: "blur(14px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="splash-wave" style={{ animationDelay: `${250 + i * 320}ms` }} />
          ))}
          <Mark size={76} />
        </motion.div>
        <motion.div
          className="splash-word"
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.32, duration: 0.7, ease }}
        >
          <Wordmark height={20} mark={false} />
        </motion.div>
        <div className="splash-bar">
          <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.2, duration: 1.15, ease: [0.65, 0, 0.35, 1] }} />
        </div>
      </motion.div>
    </motion.div>
  );
}
