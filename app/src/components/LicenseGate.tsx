import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Lock, Monitor, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { api, asLicenseError, type LicenseError } from "../lib/api";
import { totalTweaks } from "../lib/catalog";
import { formatDate, translate, type Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Pulse, Wordmark } from "./Logo";
import { Button } from "./ui";

// Une variable de CI non renseignée arrive vide, d'où || plutôt que ??.
const trim = (u: string | undefined) => (u ?? "").trim().replace(/\/+$/, "");
const origin = (u: string) => {
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
};
/** Serveur de comptes (/forgot, /signup…) : origine de RAGO_API_BASE, passée au build en VITE_ACCOUNT_URL. */
export const ACCOUNT_URL: string = origin(trim(import.meta.env.VITE_ACCOUNT_URL)) || "http://localhost:8787";
/** Site de vente (VITE_SITE_URL). Vide : le serveur de comptes, dont la racine redirige vers le site en gardant #pricing. */
export const SITE_URL: string = trim(import.meta.env.VITE_SITE_URL) || ACCOUNT_URL;
/** Invitation permanente du Discord de Rago (la même que sur le site). */
export const DISCORD_URL = "https://discord.gg/cbCxCBx8vJ";
/** Support (VITE_SUPPORT_URL, sinon le Discord de Rago, où se trouvent les tickets). */
export const SUPPORT_URL: string = trim(import.meta.env.VITE_SUPPORT_URL) || DISCORD_URL;

type Step =
  | { kind: "signin" }
  | { kind: "confirm"; email: string; keyHint: string | null }
  | { kind: "success" }
  /** connexion avec Google ou Discord dans le navigateur (1.3.0) : on attend la confirmation sur la page du compte */
  | { kind: "browser"; linkId: string; pollToken: string; code: string };

const GOOGLE = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
  </svg>
);
const DISCORD = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path fill="#5865F2" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.6 19.6 0 0 0-4.9 1.5C.6 9.1-.3 13.6.2 18a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.7 19.7 0 0 0 6-3c.5-5.1-.8-9.6-3.5-13.6zM8 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4zm8 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4z" />
  </svg>
);

const ease = [0.16, 1, 0.3, 1] as const;

export function LicenseGate({ embedded = false, onDone }: { embedded?: boolean; onDone?: () => void }) {
  const { t, license, activated, activatedAt, lang, setLang, sys } = useStore();
  const [email, setEmail] = useState(license?.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "signin" });
  const [error, setError] = useState<LicenseError | null>(
    license?.state === "expired" ? { code: "expired", message: null, buyUrl: null } : null,
  );

  // en anglais, le message du serveur (voix de la marque) s'affiche tel quel
  const errorText = (e: LicenseError) => {
    if (e.code === "expired") return t("license.state.expired");
    if (lang === "en" && e.message) return e.message;
    const key = `license.err.${e.code}` as Key;
    const txt = translate(lang, key);
    return txt === key ? (e.message ?? t("license.err.server_error")) : txt;
  };

  // l'écran de succès reste affiché jusqu'au clic : c'est la confirmation d'activation que voit le joueur
  const done = (st: Awaited<ReturnType<typeof api.licenseActivate>>, fresh: boolean) => {
    activated(st, fresh);
    setStep({ kind: "success" });
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const err = asLicenseError(e);
      setError(err);
      if (err.code === "invalid_token") setStep({ kind: "signin" });
    } finally {
      setBusy(false);
    }
  };

  const signIn = () =>
    run(async () => {
      const r = await api.licenseLogin(email.trim(), password);
      setPassword("");
      if (r.kind === "active") done(r.status, false);
      else setStep({ kind: "confirm", email: r.email, keyHint: r.keyHint });
    });

  const activate = () => run(async () => done(await api.licenseActivate(), true));

  /** Google ou Discord : le navigateur s'ouvre sur la page du compte, l'app attend la confirmation. */
  const browserSignIn = (provider: "google" | "discord") =>
    run(async () => {
      const link = await api.licenseLinkStart(provider);
      setStep({ kind: "browser", ...link });
    });

  // toutes les 2 s, tant que la page du compte n'est pas confirmée (10 minutes au plus, le serveur dit link_expired)
  const linkId = step.kind === "browser" ? step.linkId : null;
  const pollToken = step.kind === "browser" ? step.pollToken : null;
  useEffect(() => {
    if (!linkId || !pollToken) return;
    let live = true;
    const tick = async () => {
      try {
        const r = await api.licenseLinkPoll(linkId, pollToken);
        if (!live) return;
        if (!r) return void (timer = window.setTimeout(tick, 2000));
        if (r.kind === "active") done(r.status, false);
        else setStep({ kind: "confirm", email: r.email, keyHint: r.keyHint });
      } catch (e) {
        if (!live) return;
        const err = asLicenseError(e);
        // coupure passagère : on réessaie ; le reste revient à l'écran de connexion avec le message
        if (err.code === "network" || err.code === "rate_limited") return void (timer = window.setTimeout(tick, 4000));
        setError(err);
        setStep({ kind: "signin" });
      }
    };
    let timer = window.setTimeout(tick, 2000);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId, pollToken]);

  const errorBox = (
    <AnimatePresence>
      {error && (
        <motion.div className="gate-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
          <TriangleAlert size={14} />
          <span>
            {errorText(error)}
            {error.buyUrl && (
              <button type="button" className="link gate-buy" onClick={() => api.openUrl(error.buyUrl!)}>
                {t("license.buy")} <ArrowRight size={12} />
              </button>
            )}
            {error.code === "bound_to_other_device" && (
              <button type="button" className="link gate-buy" onClick={() => api.openUrl(`${ACCOUNT_URL}/account`)}>
                {t("account.manage")} <ArrowRight size={12} />
              </button>
            )}
            {SUPPORT_URL && (error.code === "revoked" || error.code === "invalid_request" || error.code === "bound_to_other_device") && (
              <button type="button" className="link gate-buy" onClick={() => api.openUrl(SUPPORT_URL)}>
                {t("account.help")} <ArrowRight size={12} />
              </button>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const card = (
      <motion.div className="gate-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease }}>
        <div className="gate-brand">
          <Pulse size={40} active={busy || step.kind === "success"} />
          <Wordmark height={26} mark={false} />
          <span className="gate-premium rg-overline">Premium</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {step.kind === "success" && (
            <motion.div key="ok" className="gate-success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <motion.span
                className="gate-check"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.08 }}
              >
                <Check size={26} strokeWidth={2.5} />
              </motion.span>
              <h1>{t("license.success")}</h1>
              <p className="gate-lead">{t("license.successLead", { total: totalTweaks })}</p>
              <div className="gate-device">
                <Monitor size={16} />
                <div>
                  <div>{t("license.successDevice", { device: sys?.hostname ?? license?.deviceName ?? "", date: formatDate(lang, activatedAt ?? Date.now()) })}</div>
                  {license?.keyHint && <div className="muted small rg-metric">{license.keyHint}</div>}
                </div>
              </div>
              <Button variant="primary" size="lg" className="gate-submit" autoFocus onClick={() => onDone?.()}>
                {t("license.continue")} <ArrowRight size={16} />
              </Button>
            </motion.div>
          )}

          {step.kind === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.24, ease }}>
              <h1>{t("license.confirmTitle")}</h1>
              <p className="gate-lead">{t("license.confirmLead", { device: sys?.hostname ?? license?.deviceName ?? "" })}</p>
              <div className="gate-device">
                <Monitor size={16} />
                <div>
                  <div>{sys?.hostname ?? license?.deviceName}</div>
                  <div className="muted small">{sys?.osName}</div>
                </div>
              </div>
              <dl className="gate-facts rg-metric">
                <div>
                  <dt>{t("license.email")}</dt>
                  <dd>{step.email}</dd>
                </div>
                {step.keyHint && (
                  <div>
                    <dt>{t("account.key")}</dt>
                    <dd>{step.keyHint}</dd>
                  </div>
                )}
              </dl>
              {errorBox}
              <Button variant="primary" size="lg" className="gate-submit" disabled={busy} onClick={() => void activate()}>
                {busy ? t("license.activating") : t("license.activate")}
                {!busy && <Lock size={15} />}
              </Button>
              <div className="gate-links">
                <button type="button" className="link" onClick={() => setStep({ kind: "signin" })}>
                  {t("license.back")}
                </button>
              </div>
            </motion.div>
          )}

          {step.kind === "browser" && (
            <motion.div key="browser" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.24, ease }}>
              <h1>{t("license.browserTitle")}</h1>
              <p className="gate-lead">{t("license.browserLead")}</p>
              <p className="gate-code rg-metric" aria-label={t("license.browserCode")}>
                {step.code}
              </p>
              <p className="muted small">{t("license.browserWait")}</p>
              <div className="gate-links">
                <button type="button" className="link" onClick={() => setStep({ kind: "signin" })}>
                  {t("license.back")}
                </button>
              </div>
            </motion.div>
          )}

          {step.kind === "signin" && (
            <motion.form
              key="form"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.24, ease }}
              onSubmit={(e) => {
                e.preventDefault();
                void signIn();
              }}
            >
              <h1>{t("license.title")}</h1>
              <p className="gate-lead">{t("license.lead")}</p>
              <div className="gate-oauth">
                <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={() => void browserSignIn("google")}>
                  {GOOGLE} {t("license.google")}
                </Button>
                <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={() => void browserSignIn("discord")}>
                  {DISCORD} {t("license.discord")}
                </Button>
              </div>
              <p className="gate-or muted small">{t("license.orEmail")}</p>
              <label className="field">
                <span>{t("license.email")}</span>
                <input id="gate-email" className="input" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="field">
                <span>{t("license.password")}</span>
                <input id="gate-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              {errorBox}
              <Button type="submit" variant="primary" size="lg" className="gate-submit" disabled={busy || !email || !password}>
                {busy ? t("license.signingIn") : t("license.signIn")}
                {!busy && <ArrowRight size={16} />}
              </Button>
              <p className="gate-lock">
                <Lock size={12} /> {t("license.lock")}
              </p>
              <div className="gate-links">
                <button type="button" className="link" onClick={() => api.openUrl(`${SITE_URL}/#pricing`)}>
                  {t("license.create")}
                </button>
                <button type="button" className="link" onClick={() => api.openUrl(`${ACCOUNT_URL}/forgot`)}>
                  {t("license.forgot")}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
  );
  if (embedded) return card;
  return (
    <div className="gate" data-tauri-drag-region>
      {card}
      <button type="button" className="gate-lang link" onClick={() => setLang(lang === "en" ? "fr" : "en")}>
        {lang === "en" ? "Français" : "English"}
      </button>
    </div>
  );
}
