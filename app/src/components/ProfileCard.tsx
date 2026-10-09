import { Camera, LogOut, Pencil, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { shrinkPhoto, useAccount } from "../lib/account";
import { asAccountError, NAME_MAX, type AccountError } from "../lib/accountApi";
import { useAccountText } from "../lib/accountText";
import { Avatar } from "./Avatar";
import { Button, Card } from "./ui";

/** Réglages → Profil : la photo et le nom public affichés avec l'avis, et l'avis lui-même. */
export function ProfileCard() {
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

  if (!via || !profile) {
    return (
      <Card title={at("profile.title")}>
        <p className="muted small">{status === "offline" ? errorText({ code: "network", message: null }) : at("profile.signedOut")}</p>
        <div className="setting-actions">
          <Button size="sm" onClick={openSignIn}>
            {at("profile.signIn")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title={at("profile.title")} className="profile-card">
      <div className="profile-head">
        <Avatar photo={profile.photo} name={profile.name || profile.email} size={56} />
        <div className="profile-who">
          <div>{profile.name || <span className="muted">{at("profile.noName")}</span>}</div>
          <div className="muted small">{profile.email}</div>
        </div>
        <div className="profile-photo-actions">
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
          <Button size="sm" icon={<Camera size={13} />} disabled={busy !== null} onClick={() => file.current?.click()}>
            {busy === "photo" ? at("profile.uploading") : profile.photo ? at("profile.changePhoto") : at("profile.addPhoto")}
          </Button>
          {profile.photo && (
            <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} disabled={busy !== null} aria-label={at("profile.removePhoto")} title={at("profile.removePhoto")} onClick={() => void run("photo", removePhoto)} />
          )}
        </div>
      </div>
      <p className="muted small profile-hint">{at("profile.photoHint")}</p>

      <form
        className="setting profile-name"
        onSubmit={(e) => {
          e.preventDefault();
          void run("name", () => setName(shownName));
        }}
      >
        <label htmlFor="profile-name">{at("profile.name")}</label>
        <div className="profile-name-edit">
          <input
            id="profile-name"
            className="input"
            maxLength={NAME_MAX}
            autoComplete="nickname"
            spellCheck={false}
            value={shownName}
            onChange={(e) => {
              setNameDraft(e.target.value);
              setSaved(false);
            }}
          />
          <Button size="sm" type="submit" disabled={busy !== null || name === null || name.trim() === (profile.name ?? "")}>
            {saved ? at("profile.saved") : at("profile.save")}
          </Button>
        </div>
      </form>

      {error && (
        <p className="profile-error small" role="alert">
          {errorText(error)}
        </p>
      )}

      <div className="setting profile-review">
        <div>
          <div>{at("profile.review")}</div>
          {review ? (
            <>
              <span className="profile-stars" role="img" aria-label={at("review.stars", { n: review.rating })}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={12} className={n <= review.rating ? "on" : undefined} />
                ))}
              </span>
              <p className="profile-comment small">{review.comment}</p>
              {review.hidden && <p className="muted small">{at("profile.hidden")}</p>}
            </>
          ) : (
            <div className="muted small">{at("profile.noReview")}</div>
          )}
        </div>
        <div className="profile-review-actions">
          <Button size="sm" variant={review ? "secondary" : "primary"} icon={review ? <Pencil size={13} /> : <Star size={13} />} disabled={busy === "review"} onClick={() => openReview(false)}>
            {review ? at("profile.editReview") : at("profile.leaveReview")}
          </Button>
          {review && !asking && (
            <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} disabled={busy !== null} onClick={() => setAsking(true)}>
              {at("profile.deleteReview")}
            </Button>
          )}
        </div>
      </div>
      {review && asking && (
        <div className="profile-delete" role="group" aria-label={at("profile.deleteReview")}>
          <span className="small">{at("profile.deleteAsk")}</span>
          <div className="profile-delete-actions">
            <Button size="sm" variant="ghost" disabled={busy === "review"} onClick={() => setAsking(false)} autoFocus>
              {at("profile.deleteNo")}
            </Button>
            <Button size="sm" variant="primary" disabled={busy === "review"} onClick={() => void run("review", deleteReview)}>
              {busy === "review" ? at("profile.deleting") : at("profile.deleteYes")}
            </Button>
          </div>
        </div>
      )}

      {via === "account" && (
        <div className="setting-actions">
          <Button size="sm" variant="ghost" icon={<LogOut size={13} />} onClick={() => void signOut()}>
            {at("profile.signOut")}
          </Button>
        </div>
      )}
    </Card>
  );
}
