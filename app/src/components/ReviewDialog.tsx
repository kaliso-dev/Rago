import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type KeyboardEvent } from "react";
import { api } from "../lib/api";
import { useAccount } from "../lib/account";
import { COMMENT_MAX, NAME_MAX, type AccountError } from "../lib/accountApi";
import { useAccountText } from "../lib/accountText";
import { I } from "../s5/I";
import { ACCOUNT_URL } from "./LicenseGate";
import { Modal } from "./Modal";
import { STAR } from "./ReviewPrompt";

/** Connexion au compte (si besoin), puis l'avis : une note de 1 à 5 étoiles et un commentaire, tous deux obligatoires.
 * Maquettes app-review-signin, app-review-write et app-review-thanks. */
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
    <Modal open={open} onClose={() => close(thanks)} v5={step === "form" ? "rv2" : "gate2"}>
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
        <motion.div className="err2" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
          <I n="alert" />
          <span>{errorText(error)}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Photo du compte, ou la première lettre du nom (`.av` des maquettes). */
function Av({ photo, name }: { photo: string | null | undefined; name: string | null | undefined }) {
  return <span className="av" aria-hidden="true">{photo ? <img src={photo} alt="" draggable={false} /> : ([...(name ?? "").trim()][0] ?? "?")}</span>;
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
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        // le bouton reste rouge comme la maquette : un champ vide prend le focus
        const empty = !email.trim() ? "rv-email" : !password ? "rv-password" : null;
        if (empty) return document.getElementById(empty)?.focus();
        setBusy(true);
        setError(null);
        const err = await signIn(email, password);
        setBusy(false);
        if (err) setError(err);
        else setPassword("");
      }}
    >
      <h2 className="h2 tape mt">{at("review.signInTitle")}</h2>
      <p className="ml">{at("review.signInLead")}</p>
      <label className="fl2">
        <span>{at("review.email")}</span>
        <input id="rv-email" className="in3" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="fl2">
        <span>{at("review.password")}</span>
        <input id="rv-password" className="in3" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <ErrorBox error={error} />
      <button type="submit" className="btn red lg cta" disabled={busy}>
        {busy ? at("review.signingIn") : at("review.signIn")}
        <I n={busy ? "loader" : "arrow"} className={busy ? "spin" : undefined} />
      </button>
      <div className="uln">
        <button type="button" className="lnk" onClick={() => void api.openUrl(`${ACCOUNT_URL}/signup`)}>
          {at("review.create")}
        </button>
        <button type="button" className="lnk" onClick={() => void api.openUrl(`${ACCOUNT_URL}/forgot`)}>
          {at("review.forgot")}
        </button>
      </div>
    </form>
  );
}

const star = (
  <svg viewBox="0 0 24 24">
    <path d={STAR} />
  </svg>
);

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
    <span className="st4 big" role="radiogroup" aria-label={at("review.rating")} onMouseLeave={() => setHover(0)} onKeyDown={key}>
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
          {star}
        </button>
      ))}
    </span>
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
      <h2 className="h2 tape mt">{review ? at("review.editTitle") : at("review.title")}</h2>
      <p className="ml">{at("review.lead")}</p>
      <p className="grp">{at("review.rating")}</p>
      <Stars value={rating} onChange={setRating} />
      <div className="fl2">
        <span id="rv-comment">{at("review.comment")}</span>
        <div className="in3 ta">
          <textarea
            aria-labelledby="rv-comment"
            maxLength={COMMENT_MAX}
            placeholder={at("review.placeholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus={!!review}
          />
          <small>
            {comment.length} / {COMMENT_MAX}
          </small>
        </div>
      </div>
      <div className="fl2">
        <span id="rv-name">{at("review.name")}</span>
        <div className="pnm">
          <Av photo={profile?.photo} name={name || profile?.email} />
          <input className="in3" aria-labelledby="rv-name" maxLength={NAME_MAX} autoComplete="nickname" spellCheck={false} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <p className="hint2">{at("review.nameHint")}</p>
      </div>
      <ErrorBox error={error} />
      <div className="mf">
        <button type="button" className="btn gh2" onClick={onCancel}>
          {at("review.cancel")}
        </button>
        <button type="submit" className="btn red" disabled={busy}>
          {busy ? at("review.posting") : review ? at("review.update") : at("review.post")}
        </button>
      </div>
    </form>
  );
}

function Thanks({ onClose }: { onClose: () => void }) {
  const { at, lang } = useAccountText();
  const { review, profile } = useAccount();
  return (
    <>
      <div className="okh">
        {/* la boîte garde l'inclinaison de win.css : l'animation (un transform) ne touche que la coche */}
        <motion.div className="ok4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.08 }}>
          <motion.span style={{ display: "grid" }} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.08 }}>
            <I n="check" />
          </motion.span>
        </motion.div>
        <h2 className="h2 tape mt">{at("review.thanks")}</h2>
      </div>
      <p className="ml">{review?.hidden ? at("profile.hidden") : at("review.thanksLead")}</p>
      {review && (
        <div className="rvq">
          <Av photo={profile?.photo} name={profile?.name || profile?.email} />
          <div>
            <b>{profile?.name || profile?.email}</b>
            <span className="st4" aria-label={at("review.stars", { n: review.rating })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={n <= review.rating ? "on" : undefined}>
                  {star}
                </i>
              ))}
            </span>
            <p>{lang === "fr" ? `« ${review.comment} »` : `"${review.comment}"`}</p>
          </div>
        </div>
      )}
      <div className="mf">
        <button type="button" className="btn" autoFocus onClick={onClose}>
          {at("review.close")}
        </button>
      </div>
    </>
  );
}
