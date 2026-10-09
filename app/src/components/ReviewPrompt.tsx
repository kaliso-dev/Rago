import { AnimatePresence, motion } from "motion/react";
import { Star, X } from "lucide-react";
import { useAccount } from "../lib/account";
import { useAccountText } from "../lib/accountText";
import { useStore } from "../lib/store";
import { Button } from "./ui";

/** Invitation discrète à laisser un avis, en bas à droite (voir lib/account.tsx pour quand elle apparaît). */
export function ReviewPrompt() {
  const { showPrompt, dismissPrompt, openReview } = useAccount();
  const { at } = useAccountText();
  // même règle que la barre « Appliquer » (ApplyBar) : elle est visible, l'invitation se place au-dessus
  const { selection, pendingUndo, applied, run } = useStore();
  const barUp = !run && selection.length + pendingUndo.filter((id) => applied.has(id)).length > 0;
  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.aside
          className={`review-prompt${barUp ? " above-bar" : ""}`}
          role="complementary"
          aria-label={at("prompt.title")}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <button type="button" className="review-prompt-close" aria-label={at("prompt.close")} onClick={dismissPrompt}>
            <X size={14} />
          </button>
          <span className="review-prompt-stars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={13} />
            ))}
          </span>
          <strong>{at("prompt.title")}</strong>
          <p>{at("prompt.text")}</p>
          <div className="review-prompt-actions">
            <Button size="sm" variant="primary" onClick={() => openReview(true)}>
              {at("prompt.go")}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissPrompt}>
              {at("prompt.later")}
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
