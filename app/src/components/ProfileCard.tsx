import { useRef, useState } from "react";
import { shrinkPhoto, useAccount } from "../lib/account";
import { asAccountError, NAME_MAX, type AccountError } from "../lib/accountApi";
import { useAccountText } from "../lib/accountText";
import { I } from "../s5/I";

/** Réglages → Profil : la photo et le nom public affichés avec l'avis, et l'avis lui-même.
 * Écran v5 (maquettes app-settings*.html) : bloc « profile » en lignes .sr ; déconnecté, l'avatar éteint .av.off. */
export function ProfileSection() {
  const { via, profile, review, status, setPhoto, removePhoto, setName, deleteReview, openReview, openSignIn, signOut } = useAccount();
  const { at, errorText } = useAccountText();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "photo" | "name" | "review">(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<AccountError | null>(null);
  const [name, setNameDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const shownName = name ?? profile?.name ?? "";

  const run = async (kind: "photo" | "name" | "review", fn: () => Promise<AccountError | null>) => {
    setBusy(kind);
    setError(null);
    setSaved(false);
    try {
      const err = await fn();
      if (err) setError(err);
      else if (kind === "name") {
        setNameDraft(null);
        setSaved(true);
      } else if (kind === "review") setAsking(false);
    } catch (e) {
      setError(asAccountError(e));
    } finally {
      setBusy(null);
    }
  };

  const head = (
    <div className="sh">
      <h2 className="h2 tape">{at("profile.title")}</h2>
      {via === "account" && profile && (
        <button type="button" className="fold" onClick={() => void signOut()}>
          {at("profile.signOut")}
          <I n="external" />
        </button>
      )}
    </div>
  );

  if (!via || !profile) {
    return (
      <section>
        {head}
        <div className="panel sp">
          <div className="who">
            <span className="av big2 off">
              <I n="user" />
            </span>
            <div className="l">
              <span>{status === "offline" ? errorText({ code: "network", message: null }) : at("profile.signedOut")}</span>
            </div>
            <button type="button" className="btn sm" onClick={openSignIn}>
              {at("profile.signIn")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const initial = [...(profile.name || profile.email).trim()][0] ?? "?";
  const changed = name !== null && name.trim() !== (profile.name ?? "");
  return (
    <section>
      {head}
      <div className="panel sp">
        <div className="who">
          <span className="av big2" aria-hidden="true">
            {profile.photo ? <img src={profile.photo} alt="" draggable={false} /> : initial}
          </span>
          <div className="l">
            <b>{profile.name || at("profile.noName")}</b>
            <span>{at("profile.photoHint")}</span>
          </div>
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void run("photo", async () => setPhoto(await shrinkPhoto(f)));
            }}
          />
          <span className="acts">
            {profile.photo && (
              <button type="button" className="ic" disabled={busy !== null} aria-label={at("profile.removePhoto")} title={at("profile.removePhoto")} onClick={() => void run("photo", removePhoto)}>
                <I n="trash" />
              </button>
            )}
            <button type="button" className="btn sm" disabled={busy !== null} onClick={() => file.current?.click()}>
              {busy === "photo" ? at("profile.uploading") : profile.photo ? at("profile.changePhoto") : at("profile.addPhoto")}
            </button>
          </span>
        </div>

        <form
          className="sr"
          onSubmit={(e) => {
            e.preventDefault();
            if (changed) void run("name", () => setName(shownName));
          }}
        >
          <div className="l">
            <b>
              <label htmlFor="profile-name">{at("profile.name")}</label>
            </b>
          </div>
          <span className="in2">
            <input
              id="profile-name"
              maxLength={NAME_MAX}
              autoComplete="nickname"
              spellCheck={false}
              value={shownName}
              placeholder={at("profile.noName")}
              onChange={(e) => {
                setNameDraft(e.target.value);
                setSaved(false);
              }}
            />
            <button type="submit" className={`sv${changed ? " on" : ""}`} disabled={busy !== null || !changed}>
              {saved ? at("profile.saved").replace(/\.$/, "") : at("profile.save")}
            </button>
          </span>
        </form>

        {error && (
          <div className="sr">
            <div className="l">
              <span className="bad" role="alert">
                {errorText(error)}
              </span>
            </div>
          </div>
        )}

        <div className="sr rv">
          <div className="l">
            <b>{at("profile.review")}</b>
            {review ? (
              <>
                <span className="stars" role="img" aria-label={at("review.stars", { n: review.rating })}>
                  {"★".repeat(review.rating)}
                  {review.rating < 5 && <i>{"★".repeat(5 - review.rating)}</i>}
                </span>
                {review.comment && <span className="cm">"{review.comment}"</span>}
                {review.hidden && <span>{at("profile.hidden")}</span>}
              </>
            ) : (
              <span>{at("profile.noReview")}</span>
            )}
          </div>
          <button type="button" className="lnk" disabled={busy === "review"} onClick={() => openReview(false)}>
            {review ? at("profile.editReview") : at("profile.leaveReview")}
          </button>
          {/* hors de la maquette : supprimer l'avis, une icône dans le coin qui ne prend pas de place à la ligne */}
          {review && !asking && (
            <button type="button" className="ic del" disabled={busy !== null} aria-label={at("profile.deleteReview")} title={at("profile.deleteReview")} onClick={() => setAsking(true)}>
              <I n="trash" />
            </button>
          )}
        </div>
        {review && asking && (
          <div className="sr" role="group" aria-label={at("profile.deleteReview")}>
            <div className="l">
              <span>{at("profile.deleteAsk")}</span>
            </div>
            <span className="acts">
              <button type="button" className="btn sm" disabled={busy === "review"} onClick={() => setAsking(false)} autoFocus>
                {at("profile.deleteNo")}
              </button>
              <button type="button" className="btn sm red" disabled={busy === "review"} onClick={() => void run("review", deleteReview)}>
                {busy === "review" ? at("profile.deleting") : at("profile.deleteYes")}
              </button>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
