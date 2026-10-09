import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Star, TriangleAlert } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";
import { api } from "../lib/api";
import { useAccount } from "../lib/account";
import { COMMENT_MAX, NAME_MAX, type AccountError } from "../lib/accountApi";
import { useAccountText } from "../lib/accountText";
import { ACCOUNT_URL } from "./LicenseGate";
import { Avatar } from "./Avatar";
import { Modal } from "./Modal";
import { Button } from "./ui";

/** Connexion au compte (si besoin), puis l'avis : une note de 1 à 5 étoiles et un commentaire, tous deux obligatoires. */
export function ReviewDialog() {
  const { dialog, closeDialog, via } = useAccount();
  const [thanks, setThanks] = useState(false);
  const open = dialog !== null;
  const close = (saved = false) => {
    closeDialog(saved);
    // la fenêtre se ferme avant de revenir au formulaire
    setTimeout(() => setThanks(false), 250);
  };
  const step = thanks ? "thanks" : !via ? "signin" : dialog?.kind === "review" ? "form" : null;
  // connecté depuis « Se connecter » du profil : rien d'autre à faire
  useEffect(() => {
    if (open && step === null) closeDialog();
  }, [open, step, closeDialog]);
  return (
    <Modal open={open} onClose={() => close(thanks)} className="review-dialog">
      {step === "signin" && <SignIn />}
      {step === "form" && <ReviewForm onCancel={() => close(false)} onSaved={() => setThanks(true)} />}
      {step === "thanks" && <Thanks onClose={() => close(true)} />}
    </Modal>
  );
}

function ErrorBox({ error }: { error: AccountError | null }) {
  const { errorText } = useAccountText();
  return (
    <AnimatePresence>
      {error && (
        <motion.div className="gate-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
          <TriangleAlert size={14} />
          <span>{errorText(error)}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SignIn() {
  const { signIn } = useAccount();
  const { at } = useAccountText();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AccountError | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const err = await signIn(email, password);
        setBusy(false);
        if (err) setError(err);
        else setPassword("");
      }}
    >
      <h2 className="modal-title">{at("review.signInTitle")}</h2>
      <p className="modal-lead">{at("review.signInLead")}</p>
      <div className="review-fields">
        <label className="field">
          <span>{at("review.email")}</span>
          <input className="input" type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>{at("review.password")}</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      </div>
      <ErrorBox error={error} />
      <div className="modal-actions">
        <button type="button" className="link push-left" onClick={() => void api.openUrl(`${ACCOUNT_URL}/signup`)}>
          {at("review.create")} <ArrowRight size={12} />
        </button>
        <button type="button" className="link" onClick={() => void api.openUrl(`${ACCOUNT_URL}/forgot`)}>
          {at("review.forgot")}
        </button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? at("review.signingIn") : at("review.signIn")}
        </Button>
      </div>
    </form>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { at } = useAccountText();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const key = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(5, value + 1));
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(1, value - 1));
    else return;
    e.preventDefault();
  };
  return (
    <div className="review-stars" role="radiogroup" aria-label={at("review.rating")} onMouseLeave={() => setHover(0)} onKeyDown={key}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={at("review.stars", { n })}
          // une seule étoile dans l'ordre de tabulation, les flèches changent la note
          tabIndex={n === (value || 1) ? 0 : -1}
          className={n <= shown ? "on" : undefined}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star size={26} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { review, profile, saveReview } = useAccount();
  const { at } = useAccountText();
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [name, setName] = useState(profile?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AccountError | null>(null);
  const ready = rating >= 1 && comment.trim().length > 0 && name.trim().length >= 2;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready) {
          // le bouton reste cliquable : on dit ce qui manque
          setError({ code: rating < 1 ? "invalid_rating" : !comment.trim() ? "empty_comment" : "name_required", message: null });
          return;
        }
        setBusy(true);
        setError(null);
        const err = await saveReview(rating, comment, name.trim() === (profile?.name ?? "") ? null : name);
        setBusy(false);
        if (err) setError(err);
        else onSaved();
      }}
    >
      <h2 className="modal-title">{review ? at("review.editTitle") : at("review.title")}</h2>
      <p className="modal-lead">{at("review.lead")}</p>
      <div className="review-fields">
        <Stars value={rating} onChange={setRating} />
        <label className="field">
          <span className="review-label">
            {at("review.comment")}
            <span className={`rg-metric${comment.length > COMMENT_MAX ? " over" : ""}`}>
              {comment.length}/{COMMENT_MAX}
            </span>
          </span>
          <textarea
            className="input review-text"
            rows={4}
            maxLength={COMMENT_MAX}
            placeholder={at("review.placeholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus={!!review}
          />
        </label>
        <label className="field">
          <span>{at("review.name")}</span>
          <div className="review-name">
            <Avatar photo={profile?.photo} name={name || profile?.email} size={34} />
            <input className="input" maxLength={NAME_MAX} autoComplete="nickname" spellCheck={false} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <span className="muted small">{at("review.nameHint")}</span>
        </label>
      </div>
      <ErrorBox error={error} />
      <div className="modal-actions">
        <Button variant="ghost" onClick={onCancel}>
          {at("review.cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? at("review.posting") : review ? at("review.update") : at("review.post")}
        </Button>
      </div>
    </form>
  );
}

function Thanks({ onClose }: { onClose: () => void }) {
  const { at } = useAccountText();
  const { review } = useAccount();
  return (
    <div className="review-thanks">
      <motion.span className="gate-check" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>
        <Check size={24} strokeWidth={2.5} />
      </motion.span>
      <h2 className="modal-title">{at("review.thanks")}</h2>
      <p className="modal-lead">{review?.hidden ? at("profile.hidden") : at("review.thanksLead")}</p>
      <div className="modal-actions">
        <Button variant="primary" autoFocus onClick={onClose}>
          {at("review.close")}
        </Button>
      </div>
    </div>
  );
}
